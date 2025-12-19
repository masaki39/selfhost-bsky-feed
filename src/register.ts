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

function buildServiceDid(feedEndpoint?: string) {
  if (!feedEndpoint) return undefined;
  const hostname = new URL(feedEndpoint).hostname;
  return `did:web:${hostname}`;
}

function parseFeedGeneratorUri(value: string) {
  const match = value.match(
    /^at:\/\/([^/]+)\/app\.bsky\.feed\.generator\/([^/]+)$/
  );
  if (!match) return undefined;
  return { did: match[1], rkey: match[2] };
}

async function main() {
  const identifier = process.env.BSKY_APP_HANDLE;
  const password = process.env.BSKY_APP_PASSWORD;
  const service =
    (process.env.BSKY_SERVICE || "").trim() || "https://bsky.social";

  if (!identifier || !password) {
    throw new Error(
      "BSKY_APP_HANDLE and BSKY_APP_PASSWORD are required (e.g., handle=yourname.bsky.social). If your account is on a custom PDS, set BSKY_SERVICE."
    );
  }

  const repoName = getRepoName() ?? "feed";
  let rkey = process.env.FEED_RKEY ?? slugify(repoName);
  const displayName = process.env.FEED_DISPLAY_NAME ?? repoName;
  const description = process.env.FEED_DESCRIPTION ?? repoName;
  const feedEndpoint = process.env.FEED_ENDPOINT;
  const serviceDid =
    process.env.FEED_SERVICE_DID ?? buildServiceDid(feedEndpoint);
  const feedGeneratorUriEnv = process.env.FEED_GENERATOR_URI;

  const agent = new BskyAgent({ service });
  await agent.login({ identifier, password });

  const ownerDid = await resolveDid(agent, identifier);
  if (!serviceDid) {
    throw new Error("FEED_SERVICE_DID or FEED_ENDPOINT is required");
  }
  let feedGeneratorDid = process.env.FEED_GENERATOR_DID ?? ownerDid;
  if (feedGeneratorUriEnv) {
    const parsed = parseFeedGeneratorUri(feedGeneratorUriEnv);
    if (!parsed) {
      throw new Error(
        "FEED_GENERATOR_URI must be at://<did>/app.bsky.feed.generator/<rkey>"
      );
    }
    if (parsed.did !== ownerDid) {
      throw new Error(
        `FEED_GENERATOR_URI did must match owner DID (${ownerDid})`
      );
    }
    feedGeneratorDid = parsed.did;
    rkey = parsed.rkey;
  }
  const feedGeneratorUri =
    feedGeneratorUriEnv ??
    `at://${feedGeneratorDid}/app.bsky.feed.generator/${rkey}`;
  const record = {
    $type: "app.bsky.feed.generator",
    did: serviceDid,
    displayName,
    description,
    createdAt: new Date().toISOString(),
  };

  await agent.com.atproto.repo.putRecord({
    repo: ownerDid,
    collection: "app.bsky.feed.generator",
    rkey,
    record,
  });

  console.log(`Upserted feed generator: ${feedGeneratorUri}`);
  if (feedEndpoint) {
    console.log(`Feed endpoint: ${feedEndpoint}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
