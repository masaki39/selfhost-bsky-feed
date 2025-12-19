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
  query: string;
  languages: string[];
  items: FeedItem[];
};

function toLimit(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

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

async function main() {
  const identifier = process.env.BSKY_APP_HANDLE; // example: yourname.bsky.social
  const password = process.env.BSKY_APP_PASSWORD;
  const service = process.env.BSKY_SERVICE ?? "https://bsky.social";
  const query = process.env.BSKY_SEARCH_QUERY ?? "bluesky";
  const totalLimit = toLimit(process.env.BSKY_SEARCH_LIMIT, 100);
  const language = parseLanguage(process.env.BSKY_SEARCH_LANG);
  const muteWords = parseMuteWords(process.env.BSKY_MUTE_WORDS);
  const effectiveQuery = buildQueryWithMuteWords(query, muteWords);

  if (!identifier || !password) {
    throw new Error(
      "BSKY_APP_HANDLE and BSKY_APP_PASSWORD are required (e.g., handle=yourname.bsky.social)"
    );
  }

  const agent = new AtpAgent({ service });
  await agent.login({ identifier, password });

  const postsMap = new Map<string, AppBskyFeedSearchPosts.OutputSchema["posts"][number]>();
  let remaining = totalLimit;
  let cursor: string | undefined = undefined;
  while (remaining > 0) {
    const res = await agent.app.bsky.feed.searchPosts({
      q: effectiveQuery,
      limit: Math.min(100, remaining),
      lang: language,
      sort: "latest",
      cursor,
    });
    const posts = res.data.posts ?? [];
    let added = 0;
    for (const post of posts) {
      if (!postsMap.has(post.uri)) {
        postsMap.set(post.uri, post);
        added += 1;
      }
    }
    remaining -= added;
    cursor = res.data.cursor;
    if (!cursor || posts.length === 0) {
      break;
    }
  }

  const posts = Array.from(postsMap.values());
  const feed: FeedFile = {
    generatedAt: new Date().toISOString(),
    source: "bsky.searchPosts",
    query: effectiveQuery,
    languages: language ? [language] : [],
    items: posts.map((post) => ({
      uri: post.uri,
      indexedAt: post.indexedAt ?? new Date().toISOString(),
    })),
  };

  await mkdir(path.dirname(FEED_PATH), { recursive: true });
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2), "utf-8");
  console.log(
    `Wrote ${feed.items.length} posts from query "${effectiveQuery}" to ${FEED_PATH} (languages: ${language ?? "all"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
