import { BskyAgent } from "@atproto/api";
import { config as loadEnv } from "dotenv";

loadEnv();

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "feed";
}

function getRepoName() {
  const repo = process.env.GITHUB_REPOSITORY ?? process.env.GITHUB_REPO ?? "";
  if (!repo) return undefined;
  const parts = repo.split("/");
  return parts.length > 1 ? parts[1] : parts[0];
}

async function resolveDid(agent: BskyAgent, identifier: string) {
  if (identifier.startsWith("did:")) return identifier;
  const res = await agent.resolveHandle({ handle: identifier });
  return res.data.did;
}

async function main() {
  const identifier = process.env.BSKY_APP_HANDLE;
  const password = process.env.BSKY_APP_PASSWORD;
  const service =
    (process.env.BSKY_SERVICE || "").trim() || "https://bsky.social";

  if (!identifier || !password) {
    throw new Error(
      "BSKY_APP_HANDLE and BSKY_APP_PASSWORD are required (e.g., handle=yourname.bsky.social)"
    );
  }

  const repoName = getRepoName() ?? "feed";
  const rkey = process.env.FEED_RKEY ?? slugify(repoName);
  const displayName = process.env.FEED_DISPLAY_NAME ?? repoName;
  const description = process.env.FEED_DESCRIPTION ?? repoName;
  const feedEndpoint = process.env.FEED_ENDPOINT;

  const agent = new BskyAgent({ service });
  await agent.login({ identifier, password });

  const did = await resolveDid(agent, identifier);
  const record = {
    $type: "app.bsky.feed.generator",
    did,
    displayName,
    description,
    createdAt: new Date().toISOString(),
  };

  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: "app.bsky.feed.generator",
    rkey,
    record,
  });

  const uri = `at://${did}/app.bsky.feed.generator/${rkey}`;
  console.log(`Upserted feed generator: ${uri}`);
  if (feedEndpoint) {
    console.log(`Feed endpoint: ${feedEndpoint}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
