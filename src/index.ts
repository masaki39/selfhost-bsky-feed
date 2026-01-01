import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { AtpAgent } from "@atproto/api";
import type { AppBskyFeedSearchPosts } from "@atproto/api";
import { config as loadEnv } from "dotenv";

loadEnv();

const FEED_PATH = "data/feed.json";

type FeedItem = {
  uri: string;
  indexedAt: string;
};

type FeedFile = {
  generatedAt: string;
  source: string;
  query: string[];
  languages: string[];
  items: FeedItem[];
};

const RETRY_COUNT = 3;
const RETRY_BASE_DELAY_MS = 500;

function parseLanguage(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (raw.includes(",")) {
    throw new Error("BSKY_SEARCH_LANG supports only a single language code");
  }
  const lang = raw.trim();
  return lang.length > 0 ? lang : undefined;
}

function parseMuteWords(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function toQueryToken(word: string): string {
  return /\s/.test(word) ? `"${word}"` : word;
}

function buildQueryWithMuteWords(query: string, muteWords: string[]): string {
  if (muteWords.length === 0) return query;
  const exclusions = muteWords.map((word) => `-${toQueryToken(word)}`).join(" ");
  return `${query} ${exclusions}`.trim();
}

function splitQueryParts(rawQuery: string): string[] {
  const parts = rawQuery
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length > 0) return parts;
  const fallback = rawQuery.trim();
  return fallback ? [fallback] : [];
}

function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeErr = err as {
    status?: number;
    error?: string;
    name?: string;
    code?: string;
  };
  const status = maybeErr.status ?? 0;
  if (status >= 500) return true;
  const code = (maybeErr.code ?? "").toString();
  if (code === "ETIMEDOUT" || code === "ECONNRESET" || code === "EAI_AGAIN") return true;
  const name = (maybeErr.name ?? "").toString();
  const error = (maybeErr.error ?? "").toString();
  return name === "XRPCError" && (error === "InternalServerError" || status === 0);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchPostsWithRetry(
  agent: AtpAgent,
  params: AppBskyFeedSearchPosts.QueryParams,
  attempt = 0
): Promise<AppBskyFeedSearchPosts.OutputSchema> {
  try {
    return await agent.app.bsky.feed.searchPosts(params);
  } catch (err) {
    if (!isRetryableError(err) || attempt >= RETRY_COUNT) {
      throw err;
    }
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
    console.warn(
      `searchPosts failed (attempt ${attempt + 1}/${RETRY_COUNT + 1}); retrying in ${delay}ms`
    );
    await sleep(delay);
    return searchPostsWithRetry(agent, params, attempt + 1);
  }
}

async function loadFallbackFeed(): Promise<FeedFile | null> {
  try {
    const raw = await readFile(FEED_PATH, "utf-8");
    const parsed = JSON.parse(raw) as FeedFile;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function main() {
  const identifier = process.env.BSKY_APP_HANDLE; // example: yourname.bsky.social
  const password = process.env.BSKY_APP_PASSWORD;
  const service = (process.env.BSKY_SERVICE || "").trim() || "https://bsky.social";
  const query = process.env.BSKY_SEARCH_QUERY;
  const language = parseLanguage(process.env.BSKY_SEARCH_LANG);
  const muteWords = parseMuteWords(process.env.BSKY_MUTE_WORDS);
  if (!query) {
    throw new Error("BSKY_SEARCH_QUERY is required");
  }

  const queryParts = splitQueryParts(query);
  if (queryParts.length === 0) {
    throw new Error("BSKY_SEARCH_QUERY must include at least one term");
  }
  const effectiveQueries = queryParts.map((part) =>
    buildQueryWithMuteWords(part, muteWords)
  );
  if (!identifier || !password) {
    throw new Error(
      "BSKY_APP_HANDLE and BSKY_APP_PASSWORD are required (e.g., handle=yourname.bsky.social)"
    );
  }

  const agent = new AtpAgent({ service });
  await agent.login({ identifier, password });

  const postsMap = new Map<string, AppBskyFeedSearchPosts.OutputSchema["posts"][number]>();
  let hadQuerySuccess = false;
  for (const effectiveQuery of effectiveQueries) {
    if (!effectiveQuery) continue;
    try {
      const res = await searchPostsWithRetry(agent, {
        q: effectiveQuery,
        limit: 100,
        lang: language,
        sort: "latest",
      });
      hadQuerySuccess = true;
      for (const post of res.data.posts ?? []) {
        if (!postsMap.has(post.uri)) {
          postsMap.set(post.uri, post);
        }
      }
    } catch (err) {
      console.warn(`searchPosts failed for query "${effectiveQuery}"`, err);
    }
  }

  if (!hadQuerySuccess) {
    const fallback = await loadFallbackFeed();
    if (fallback) {
      console.warn("All queries failed; using previous feed.json as fallback.");
      await mkdir(path.dirname(FEED_PATH), { recursive: true });
      await writeFile(FEED_PATH, JSON.stringify(fallback, null, 2), "utf-8");
      return;
    }
  }

  const posts = Array.from(postsMap.values()).sort((a, b) => {
    const aTime = a.indexedAt ?? "";
    const bTime = b.indexedAt ?? "";
    return bTime.localeCompare(aTime);
  });
  const feed: FeedFile = {
    generatedAt: new Date().toISOString(),
    source: "bsky.searchPosts",
    query: effectiveQueries,
    languages: language ? [language] : [],
    items: posts.map((post) => ({
      uri: post.uri,
      indexedAt: post.indexedAt ?? new Date().toISOString(),
    })),
  };

  await mkdir(path.dirname(FEED_PATH), { recursive: true });
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2), "utf-8");
  console.log(
    `Wrote ${feed.items.length} posts from queries [${effectiveQueries.join(", ")}] to ${FEED_PATH} (languages: ${language ?? "all"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
