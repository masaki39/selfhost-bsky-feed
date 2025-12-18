# selfhost-bsky-feed

TypeScript scaffold for a self-hosted Bluesky feed generator. It runs on a scheduled GitHub Action and writes feed JSON you can later publish via Pages/Workers. Uses the official `@atproto/api` `BskyAgent` to search posts.

## For remote users (GitHub Actions only)

1) Set repository Secrets:  
   - `BSKY_APP_HANDLE` (e.g., `yourname.bsky.social`)  
   - `BSKY_APP_PASSWORD`  
   - Optional: `BSKY_SERVICE`, `BSKY_SEARCH_QUERY`, `BSKY_SEARCH_LIMIT`, `BSKY_SEARCH_LANG` (single or comma-separated like `ja,en`)
2) Ensure Actions has the needed permissions: `contents: read/write`, `pages: write`, `id-token: write` (already set in the workflows).
2) Actions tab → enable workflow runs → manual dispatch or wait for the 5-minute schedule.
3) `01_update-feed.yml` builds and writes `data/feed.json`, then publishes it to GitHub Pages. The Pages site exposes the file at `https://<owner>.github.io/<repo>/feed.json` (no `/data` prefix because the artifact root is `./data`).

Cloudflare Workers publish (optional):
1) Set repo Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.  
2) Deploy manually with `npm run worker:publish` or rely on `02_publish-worker.yml` after feed generation.  
3) `.github/workflows/02_publish-worker.yml` injects `GITHUB_OWNER` / `GITHUB_REPO` into Wrangler and sets the Worker name to `${{ github.event.repository.name }}` prefixed with `w-`. It runs on manual dispatch or automatically after `01_update-feed.yml` completes successfully.

## For developers (local)

```bash
npm install
npm run start
```

`npm run start` compiles TypeScript then writes `data/feed.json` with the search results.

Environment variables read by the script (set them locally via `.env` or as GitHub secrets):

- `BSKY_APP_HANDLE` (例: `yourname.bsky.social`)
- `BSKY_APP_PASSWORD`
- `BSKY_SERVICE` (optional, default `https://bsky.social`)
- `BSKY_SEARCH_QUERY` (optional, default `bluesky`)
- `BSKY_SEARCH_LIMIT` (optional, default `25`, max `100`)
- `BSKY_SEARCH_LANG` (optional, ISO code like `ja` or `en`, or comma-separated list `ja,en`; defaults to all languages if unset)
- `GITHUB_OWNER` / `GITHUB_REPO` (Worker only; used to build a raw GitHub URL; provided by the publish workflow from GitHub context)
  - Builds `https://<owner>.github.io/<repo>/feed.json` for the Worker
- `FEED_URL` (Worker override; use this if the feed JSON is hosted elsewhere)
- `FEED_GENERATOR_URI` / `FEED_GENERATOR_DID` (Worker describe endpoint; optional)

`.env` の例:

```
BSKY_APP_HANDLE=your.handle
BSKY_APP_PASSWORD=xxxx-xxxx-xxxx
BSKY_SEARCH_QUERY=bluesky
BSKY_SEARCH_LANG=ja
# またはカンマ区切りで複数指定
# BSKY_SEARCH_LANG=ja,en
# Worker の describe 用（任意）
# FEED_GENERATOR_URI=at://did:example:feed/app.bsky.feed.generator/selfhost
# FEED_GENERATOR_DID=did:example:feed
```

## GitHub Actions

- `.github/workflows/01_update-feed.yml`: runs every 5 minutes or manually; builds, runs the feed generator, uploads `data/feed.json` as a Pages artifact, and deploys GitHub Pages.
- `.github/workflows/02_publish-worker.yml`: runs manually or after `01_update-feed.yml` succeeds; injects repo context for the Worker and fetches `https://<owner>.github.io/<repo>/data/feed.json`.
- Secrets `BSKY_APP_HANDLE` / `BSKY_APP_PASSWORD` are passed to the job. Worker uses Pages output.
