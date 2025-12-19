import { mkdir, writeFile } from "fs/promises";
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

async function main() {
  const identifier = process.env.BSKY_APP_HANDLE; // example: yourname.bsky.social
  const password = process.env.BSKY_APP_PASSWORD;
  const service = process.env.BSKY_SERVICE ?? "https://bsky.social";
  const query = process.env.BSKY_SEARCH_QUERY ?? "bluesky";
  const language = parseLanguage(process.env.BSKY_SEARCH_LANG);
  const muteWords = parseMuteWords(process.env.BSKY_MUTE_WORDS);
  const queryParts = splitQueryParts(query);
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
  for (const effectiveQuery of effectiveQueries) {
    if (!effectiveQuery) continue;
    const res = await agent.app.bsky.feed.searchPosts({
      q: effectiveQuery,
      limit: 100,
      lang: language,
      sort: "latest",
    });
    for (const post of res.data.posts ?? []) {
      if (!postsMap.has(post.uri)) {
        postsMap.set(post.uri, post);
      }
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
