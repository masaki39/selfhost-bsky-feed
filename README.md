# selfhost-bsky-feed

TypeScript scaffold for a self-hosted Bluesky feed generator. It runs on a scheduled GitHub Action and writes feed JSON you can later publish via Pages/Workers. Uses the official `@atproto/api` `BskyAgent` to search posts.

## For remote users (GitHub Actions only)

1) Set repository Secrets:  
   - `BSKY_APP_HANDLE` (e.g., `yourname.bsky.social`)  
   - `BSKY_APP_PASSWORD`  
   - Optional: `BSKY_SERVICE`, `BSKY_SEARCH_QUERY`, `BSKY_SEARCH_LIMIT`, `BSKY_SEARCH_LANG` (single or comma-separated like `ja,en`)
2) Ensure Actions has the needed permissions: `contents: read/write`, `pages: write`, `id-token: write` (already set in the workflows).
2) Actions tab → enable workflow runs → manual dispatch or wait for the 5-minute schedule.
3) `01_update-feed.yml` publishes `data/feed.json` to GitHub Pages automatically.

Cloudflare Workers publish (optional):
1) Set repo Secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`.  
2) Deploy manually with `npm run worker:publish` or rely on `02_publish-worker.yml` after feed generation. (If you prefer, name secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` to match Wrangler vars; the workflow reads those.)
3) `.github/workflows/02_publish-worker.yml` injects `GITHUB_OWNER`/`GITHUB_REPO` from GitHub context and sets Worker name to `${{ github.event.repository.name }}-worker`. It runs on manual dispatch or automatically after `01_update-feed.yml` completes successfully.

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
  - Used to build `https://<owner>.github.io/<repo>/data/feed.json` for the Worker

`.env` の例:

```
BSKY_APP_HANDLE=your.handle
BSKY_APP_PASSWORD=xxxx-xxxx-xxxx
BSKY_SEARCH_QUERY=bluesky
BSKY_SEARCH_LANG=ja
# またはカンマ区切りで複数指定
# BSKY_SEARCH_LANG=ja,en
```

## GitHub Actions

- `.github/workflows/01_update-feed.yml`: runs every 5 minutes or manually; builds, runs the feed generator, uploads `data/feed.json` as a Pages artifact, and deploys GitHub Pages.
- `.github/workflows/02_publish-worker.yml`: runs manually or after `01_update-feed.yml` succeeds; injects repo context for the Worker and fetches `https://<owner>.github.io/<repo>/data/feed.json`.
- Secrets `BSKY_APP_HANDLE` / `BSKY_APP_PASSWORD` are passed to the job. Worker uses Pages output.
