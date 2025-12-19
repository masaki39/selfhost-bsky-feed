# selfhost-bsky-feed

TypeScript scaffold for a self-hosted Bluesky feed generator. It runs on a scheduled GitHub Action and writes feed JSON you can later publish via Pages/Workers. Uses the official `@atproto/api` `AtpAgent` to search posts.

## For remote users (GitHub Actions only)

1) Set repository Secrets:  
   - `BSKY_APP_HANDLE` (e.g., `yourname.bsky.social`)  
   - `BSKY_APP_PASSWORD`  
   - Optional: `BSKY_SERVICE`, `BSKY_SEARCH_QUERY`, `BSKY_SEARCH_LIMIT`, `BSKY_SEARCH_LANG`, `BSKY_MUTE_WORDS`
2) Ensure Actions has the needed permissions: `contents: read/write`, `pages: write`, `id-token: write` (already set in the workflows).
2) Actions tab → enable workflow runs → manual dispatch or wait for the 5-minute schedule.
3) `update-feed.yml` builds and writes `data/feed.json`, then publishes it to GitHub Pages. The Pages site exposes the file at `https://<owner>.github.io/<repo>/feed.json` (no `/data` prefix because the artifact root is `./data`).

Cloudflare Workers publish (optional):
1) Set repo Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.  
2) Deploy manually with `npm run worker:publish` or run the `create-feed.yml` workflow.  
3) `.github/workflows/create-feed.yml` injects `GITHUB_OWNER` / `GITHUB_REPO` into Wrangler and sets the Worker name to `${{ github.event.repository.name }}` prefixed with `w-`. It runs on manual dispatch.
4) `.github/workflows/delete-feed.yml` deletes the feed generator record and the Worker when run manually.

## For developers (local)

```bash
npm install
npm run start
```

`npm run start` compiles TypeScript then writes `data/feed.json` with the search results.
To inspect post contents from the local `data/feed.json`, run:

```bash
npm run inspect:feed
```

Environment variables read by the scripts (set them locally via `.env` or as GitHub secrets):

| Name | Required | Default | Used by | Notes |
| --- | --- | --- | --- | --- |
| `BSKY_APP_HANDLE` | Yes | - | `src/index.ts`, `src/register.ts`, `src/delete.ts` | Example: `yourname.bsky.social` |
| `BSKY_APP_PASSWORD` | Yes | - | `src/index.ts`, `src/register.ts`, `src/delete.ts` | App password |
| `BSKY_SERVICE` | No | `https://bsky.social` | `src/index.ts`, `src/register.ts`, `src/delete.ts` | Set for custom PDS |
| `BSKY_SEARCH_QUERY` | No | `bluesky` | `src/index.ts` | Search query |
| `BSKY_SEARCH_LIMIT` | No | `100` | `src/index.ts` | Search limit |
| `BSKY_SEARCH_LANG` | No | - | `src/index.ts` | Single language code |
| `BSKY_MUTE_WORDS` | No | - | `src/index.ts` | Comma-separated, appended to query as `-word` |
| `GITHUB_OWNER` | Worker only | - | `src/worker.ts` | Builds Pages URL |
| `GITHUB_REPO` | Worker only | - | `src/worker.ts` | Builds Pages URL |
| `FEED_URL` | Worker only | - | `src/worker.ts` | Overrides feed JSON URL |
| `FEED_ENDPOINT` | Worker/registry | - | `src/worker.ts`, `src/register.ts` | Used to build `did:web` |
| `FEED_SERVICE_DID` | Worker/registry | - | `src/worker.ts`, `src/register.ts` | Overrides `did:web` |
| `FEED_GENERATOR_URI` | Worker/registry | - | `src/worker.ts`, `src/register.ts`, `src/delete.ts` | `at://.../app.bsky.feed.generator/...` |
| `FEED_GENERATOR_DID` | Worker | - | `src/worker.ts`, `src/register.ts` | Override DID in feed URI |
| `FEED_RKEY` | Worker/registry | `selfhost` or repo slug | `src/worker.ts`, `src/register.ts`, `src/delete.ts` | Feed record key |
| `FEED_DISPLAY_NAME` | Registry only | - | `src/register.ts` | Overrides feed display name |
| `FEED_DESCRIPTION` | Registry only | - | `src/register.ts` | Overrides feed description |

## Naming and derived IDs

| Source | Derived value | Where it is used |
| --- | --- | --- |
| GitHub repo name | Worker name `w-<repo>` | `create-feed.yml` |
| GitHub owner + repo | Pages URL `https://<owner>.github.io/<repo>/feed.json` | `src/worker.ts` |
| `BSKY_APP_HANDLE` | Owner DID | `src/register.ts`, `src/delete.ts` |
| `FEED_RKEY` or repo slug | Feed URI suffix | `src/worker.ts`, `src/register.ts`, `src/delete.ts` |
| `FEED_GENERATOR_URI` | Expected feed URI | `src/worker.ts` (`describe` + `getFeedSkeleton` check) |
| Worker hostname | `did:web:<hostname>` | `src/worker.ts`, `src/register.ts` |

`.env` の例:

```
BSKY_APP_HANDLE=your.handle
BSKY_APP_PASSWORD=xxxx-xxxx-xxxx
BSKY_SEARCH_QUERY=bluesky
BSKY_SEARCH_LANG=ja
# BSKY_MUTE_WORDS=spam,ads,bad phrase
# Worker の describe 用（任意）
# FEED_GENERATOR_URI=at://did:example:feed/app.bsky.feed.generator/selfhost
# FEED_GENERATOR_DID=did:example:feed
```

## GitHub Actions

- `.github/workflows/update-feed.yml`: runs every 5 minutes or manually; builds, runs the feed generator, uploads `data/feed.json` as a Pages artifact, and deploys GitHub Pages.
- `.github/workflows/create-feed.yml`: runs manually; deploys the Worker and then upserts the feed generator record on Bluesky using the same app password.
- `.github/workflows/delete-feed.yml`: runs manually; deletes the feed generator record and the Worker.
- Secrets `BSKY_APP_HANDLE` / `BSKY_APP_PASSWORD` are passed to the job. Worker uses Pages output.
