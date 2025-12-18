import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { BskyAgent } from "@atproto/api";
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
  return Math.min(parsed, 100);
}

function parseLanguages(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function main() {
  const identifier = process.env.BSKY_APP_HANDLE; // 例: yourname.bsky.social
  const password = process.env.BSKY_APP_PASSWORD;
  const service = process.env.BSKY_SERVICE ?? "https://bsky.social";
  const query = process.env.BSKY_SEARCH_QUERY ?? "bluesky";
  const limit = toLimit(process.env.BSKY_SEARCH_LIMIT, 25);
  const languages = parseLanguages(process.env.BSKY_SEARCH_LANG);

  if (!identifier || !password) {
    throw new Error(
      "BSKY_APP_HANDLE and BSKY_APP_PASSWORD are required (e.g., handle=yourname.bsky.social)"
    );
  }

  const agent = new BskyAgent({ service });
  await agent.login({ identifier, password });

  const postsMap = new Map<string, AppBskyFeedSearchPosts.OutputSchema["posts"][number]>();
  const langTargets = languages.length === 0 ? [undefined] : languages;

  for (const lang of langTargets) {
    const res = await agent.app.bsky.feed.searchPosts({
      q: query,
      limit,
      lang,
    });
    for (const post of res.data.posts ?? []) {
      if (!postsMap.has(post.uri)) {
        postsMap.set(post.uri, post);
      }
    }
  }

  const posts = Array.from(postsMap.values());
  const feed: FeedFile = {
    generatedAt: new Date().toISOString(),
    source: "bsky.searchPosts",
    query,
    languages,
    items: posts.map((post) => ({
      uri: post.uri,
      indexedAt: post.indexedAt ?? new Date().toISOString(),
    })),
  };

  await mkdir(path.dirname(FEED_PATH), { recursive: true });
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2), "utf-8");
  console.log(
    `Wrote ${feed.items.length} posts from query "${query}" to ${FEED_PATH} (languages: ${languages.length ? languages.join(",") : "all"})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
