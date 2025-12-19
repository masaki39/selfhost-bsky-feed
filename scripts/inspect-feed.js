const fs = require("fs");
const path = require("path");

const feedPath = path.join("data", "feed.json");
const limitArg = process.argv[2];
const outputPath = path.join("data", "inspect.md");
const limit = limitArg ? Number.parseInt(limitArg, 10) : undefined;
const count = Number.isNaN(limit ?? NaN) || (limit ?? 0) <= 0 ? undefined : limit;

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

async function fetchPosts(uris) {
  const batchSize = 25;
  const posts = [];
  for (let i = 0; i < uris.length; i += batchSize) {
    const batch = uris.slice(i, i + batchSize);
    const params = new URLSearchParams();
    for (const uri of batch) {
      params.append("uris", uri);
    }
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`getPosts failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    posts.push(...(data.posts || []));
  }
  return posts;
}

function buildPostUrl(post) {
  const uri = typeof post?.uri === "string" ? post.uri : "";
  const author = post?.author?.handle || post?.author?.did || "";
  const parts = uri.split("/");
  const rkey = parts.length > 0 ? parts[parts.length - 1] : "";
  if (!author || !rkey) return "";
  return `https://bsky.app/profile/${author}/post/${rkey}`;
}

function toMarkdown(posts, meta) {
  const lines = [];
  lines.push("# Feed Inspection");
  lines.push("");
  lines.push(`- Source: ${meta.source}`);
  lines.push(`- Count: ${posts.length}`);
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push("");
  posts.forEach((post, index) => {
    const author = post.author?.handle || post.author?.did || "unknown";
    const createdAt = post.record?.createdAt || "";
    const text = post.record?.text || "";
    const url = buildPostUrl(post);
    lines.push(`## ${index + 1}. @${author} ${createdAt}`);
    lines.push("");
    lines.push(`- uri: ${post.uri || ""}`);
    if (url) {
      lines.push(`- url: ${url}`);
    }
    lines.push("");
    if (text) {
      lines.push(
        text
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")
      );
      lines.push("");
    }
  });
  return lines.join("\n");
}

async function main() {
  const json = readJson(feedPath);
  if (!Array.isArray(json.items)) {
    throw new Error("feed.json missing items array");
  }
  const uris = json.items
    .map((item) => item && item.uri)
    .filter((uri) => typeof uri === "string");
  const targetUris = count ? uris.slice(0, count) : uris;

  if (targetUris.length === 0) {
    console.log("No URIs to inspect.");
    return;
  }

  const posts = await fetchPosts(targetUris);
  const markdown = toMarkdown(posts, { source: feedPath });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf8");
  console.log(`Wrote ${posts.length} posts to ${outputPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
