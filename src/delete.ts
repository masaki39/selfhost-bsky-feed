import { AtpAgent } from "@atproto/api";
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

async function resolveDid(agent: AtpAgent, identifier: string) {
  if (identifier.startsWith("did:")) return identifier;
  const res = await agent.resolveHandle({ handle: identifier });
  return res.data.did;
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
  const feedGeneratorUriEnv = process.env.FEED_GENERATOR_URI;

  const agent = new AtpAgent({ service });
  await agent.login({ identifier, password });

  const ownerDid = await resolveDid(agent, identifier);
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
    rkey = parsed.rkey;
  }

  await agent.com.atproto.repo.deleteRecord({
    repo: ownerDid,
    collection: "app.bsky.feed.generator",
    rkey,
  });

  console.log(`Deleted feed generator record: ${rkey}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
