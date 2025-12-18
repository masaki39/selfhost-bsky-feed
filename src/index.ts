import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { BskyAgent } from "@atproto/api";
import type { AppBskyFeedSearchPosts } from "@atproto/api";
import { config as loadEnv } from "dotenv";

loadEnv();

const FEED_PATH = path.join(process.cwd(), "data", "feed.json");

type FeedItem = {
  uri: string;
  indexedAt: string;
};

type FeedFile = {
  generatedAt: string;
  source: string;
  query: string;
  items: FeedItem[];
};

function toLimit(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
}

async function main() {
  const identifier =
    process.env.BSKY_APP_HANDLE ??
    process.env.BSKY_APP_IDENTIFIER ??
    process.env.BSKY_IDENTIFIER;
  const password = process.env.BSKY_APP_PASSWORD;
  const service = process.env.BSKY_SERVICE ?? "https://bsky.social";
  const query = process.env.BSKY_SEARCH_QUERY ?? "bluesky";
  const limit = toLimit(process.env.BSKY_SEARCH_LIMIT, 25);

  if (!identifier || !password) {
    throw new Error(
      "BSKY_APP_HANDLE (or BSKY_APP_IDENTIFIER/BSKY_IDENTIFIER) と BSKY_APP_PASSWORD が必要です"
    );
  }

  const agent = new BskyAgent({ service });
  await agent.login({ identifier, password });

  const res = await agent.app.bsky.feed.searchPosts({ q: query, limit });
  const posts: AppBskyFeedSearchPosts.OutputSchema["posts"] = res.data.posts ?? [];
  const feed: FeedFile = {
    generatedAt: new Date().toISOString(),
    source: "bsky.searchPosts",
    query,
    items: posts.map((post) => ({
      uri: post.uri,
      indexedAt: post.indexedAt ?? new Date().toISOString(),
    })),
  };

  await mkdir(path.dirname(FEED_PATH), { recursive: true });
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2), "utf-8");
  console.log(
    `Wrote ${feed.items.length} posts from query "${query}" to ${FEED_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
