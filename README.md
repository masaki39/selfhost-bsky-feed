# selfhost-bsky-feed

TypeScript scaffold for a self-hosted Bluesky feed generator. It runs on a scheduled GitHub Action and writes feed JSON you can later publish via Pages/Workers. Uses the official `@atproto/api` `BskyAgent` to search posts.

Docs note: The primary documentation is maintained in Japanese (`doc/README-ja.md`) by the author. This English README is translated from that source via LLM; future updates should edit the Japanese version first, then translate.  
- 日本語: [doc/README-ja.md](doc/README-ja.md)
- English: this file

## Development

```bash
npm install
npm run start
```

`npm run start` compiles TypeScript then writes `data/feed.json` with Bluesky検索の結果を保存します。

Environment variables read by the script (set them locally via `.env` or as GitHub secrets):

- `BSKY_APP_HANDLE` (例: `yourname.bsky.social`)
- `BSKY_APP_PASSWORD`
- `BSKY_SERVICE` (optional, default `https://bsky.social`)
- `BSKY_SEARCH_QUERY` (optional, default `bluesky`)
- `BSKY_SEARCH_LIMIT` (optional, default `25`, max `100`)
- `BSKY_SEARCH_LANG` (optional, ISO code like `ja` or `en`, or comma-separated list `ja,en`; defaults to all languages if unset)

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

- `.github/workflows/update-feed.yml` runs every 5 minutes and can be triggered manually.
- Secrets `BSKY_APP_HANDLE` / `BSKY_APP_PASSWORD` are passed to the job.
- Output currently stays in the workflow workspace; add commit/publish logic later to push to Pages or Cloudflare Workers.
