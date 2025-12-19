const fs = require("fs");
const path = require("path");

const feedPath = process.argv[2] || path.join("data", "feed.json");
const limitArg = process.argv[3];
const limit = limitArg ? Number.parseInt(limitArg, 10) : 10;
const count = Number.isNaN(limit) || limit <= 0 ? 10 : limit;

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

async function fetchPosts(uris) {
  const params = new URLSearchParams();
  for (const uri of uris) {
    params.append("uris", uri);
  }
  const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`getPosts failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.posts || [];
}

async function main() {
  const json = readJson(feedPath);
  if (!Array.isArray(json.items)) {
    throw new Error("feed.json missing items array");
  }
  const uris = json.items
    .map((item) => item && item.uri)
    .filter((uri) => typeof uri === "string")
    .slice(0, count);

  if (uris.length === 0) {
    console.log("No URIs to inspect.");
    return;
  }

  const posts = await fetchPosts(uris);
  for (const post of posts) {
    const author = post.author?.handle || post.author?.did || "unknown";
    const text = post.record?.text || "";
    const createdAt = post.record?.createdAt || "";
    console.log(`@${author} ${createdAt}`);
    console.log(text);
    console.log("---");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
