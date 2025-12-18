# selfhost-bsky-feed 日本語ガイド

この日本語版が一次ドキュメントです。ここを筆者が編集し、英語版 (`README.md`) は LLM による翻訳として更新します。今後もこのフローを維持します。
- 日本語: [README-ja.md](README-ja.md)（本書）
- English: [../README.md](../README.md)

セルフホスト向けの Bluesky フィード JSON 生成リポジトリです。GitHub Actions で定期実行し、`data/feed.json` を出力します。

## リモート利用（GitHub Actionsのみ）
1. リポジトリ Secrets を設定  
   - `BSKY_APP_HANDLE` (例: `yourname.bsky.social`)  
   - `BSKY_APP_PASSWORD`  
   - 任意: `BSKY_SERVICE`, `BSKY_SEARCH_QUERY`, `BSKY_SEARCH_LIMIT`, `BSKY_SEARCH_LANG`（単一またはカンマ区切り: `ja,en`）
2. Actions タブでワークフローを有効化し、手動実行または5分間隔のスケジュールを待つ。
3. 出力はワークスペースの `data/feed.json` に保存（コミットはしない）。必要に応じてコミット/Pages/Workers などの公開処理を追加する。

Cloudflare Workers への公開（任意）:
1. Wrangler を使える環境で `npm install` を行い、Secrets を設定: `CF_API_TOKEN`, `CF_ACCOUNT_ID`。  
2. `wrangler.toml` の `FEED_URL`（または Worker 変数）に、公開済みの JSON URL（例: GitHub Pages や raw GitHub URL）を指定。  
3. `npm run worker:publish` で手動デプロイ、またはワークフロー内で feed.json 生成後に実行するステップを追加。
4. 付属のワークフロー `.github/workflows/01_publish-worker.yml` は GitHub コンテキストから `GITHUB_OWNER`/`GITHUB_REPO` を注入し、Secrets の `FEED_URL` があれば上書きします。フォークでも手修正なしで動かせます。

## 環境変数
GitHub Secrets または `.env` に設定します（Secrets 推奨）。

```
BSKY_APP_HANDLE=yourname.bsky.social
BSKY_APP_PASSWORD=xxxx-xxxx-xxxx
BSKY_SERVICE=https://bsky.social   # 省略可
BSKY_SEARCH_QUERY=bluesky          # 省略可
BSKY_SEARCH_LIMIT=25               # 省略可、最大100
BSKY_SEARCH_LANG=ja               # 省略可、ISOコード（またはカンマ区切りで複数指定: ja,en）
# 省略時は全言語
# Cloudflare Workers 用:
# FEED_URL を省略した場合、GITHUB_OWNER/GITHUB_REPO から raw GitHub URL を組み立てます（デフォルトはこのリポジトリ）
# 任意で FEED_URL を明示指定しても構いません
```

## 開発者向け（ローカル実行）
1. Node.js 20 以上を用意。
2. `.env` に環境変数を保存。
3. 依存インストールと実行:

```bash
npm install
npm run start
```
`data/feed.json` に検索結果が保存されます。
