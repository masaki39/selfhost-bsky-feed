# selfhost-bsky-feed

TypeScript scaffold for a self-hosted Bluesky feed generator. It runs on a scheduled GitHub Action and writes feed JSON you can later publish via Pages/Workers. Uses the official `@atproto/api` `BskyAgent` to search posts.

Docs note: The primary documentation is maintained in Japanese (`doc/README-ja.md`) by the author. This English README is translated from that source via LLM; future updates should edit the Japanese version first, then translate.  
- 日本語: [doc/README-ja.md](doc/README-ja.md)
- English: this file

## For remote users (GitHub Actions only)

1) Set repository Secrets:  
   - `BSKY_APP_HANDLE` (e.g., `yourname.bsky.social`)  
   - `BSKY_APP_PASSWORD`  
   - Optional: `BSKY_SERVICE`, `BSKY_SEARCH_QUERY`, `BSKY_SEARCH_LIMIT`, `BSKY_SEARCH_LANG` (single or comma-separated like `ja,en`)
2) Actions tab → enable workflow runs → manual dispatch or wait for the 5-minute schedule.
3) Outputs are written to `data/feed.json` in the workflow workspace (not committed). Add your own publish step (e.g., commit, Pages, Workers).

Cloudflare Workers publish (optional):
1) Install Wrangler locally (`npm install`) and set secrets in the repo: `CF_API_TOKEN`, `CF_ACCOUNT_ID`.  
2) Deploy manually with `npm run worker:publish` or rely on the provided workflow after feed generation.
3) The provided workflow `.github/workflows/02_publish-worker.yml` injects `GITHUB_OWNER`/`GITHUB_REPO` from GitHub context and sets Worker name to `${{ github.event.repository.name }}-worker`. It runs on manual dispatch or automatically after `01_update-feed.yml` completes successfully.

GitHub Pages to host `data/feed.json` (optional but recommended for the Worker):
1) Enable Pages → Build and deployment: “GitHub Actions”.  
2) Add a deploy step after feed generation to upload `data/feed.json` as a Pages artifact (e.g., `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`).  
3) Worker can consume either the Pages URL or the raw GitHub URL; by default it builds a raw URL from `GITHUB_OWNER`/`GITHUB_REPO` (public repos only).

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

- `.github/workflows/01_update-feed.yml` runs every 5 minutes and can be triggered manually. It builds, runs the feed generator, uploads `data/feed.json` as a Pages artifact, and deploys GitHub Pages.
- `.github/workflows/02_publish-worker.yml` runs manually or after `01_update-feed.yml` succeeds; injects repo context for the Worker and uses GitHub Pages (or raw) URL derived from owner/repo.
- Secrets `BSKY_APP_HANDLE` / `BSKY_APP_PASSWORD` are passed to the job.
- Output is published to GitHub Pages (via Actions). Worker defaults to fetching `https://<owner>.github.io/<repo>/data/feed.json` (public repos).
