# selfhost-bsky-feed 日本語ガイド

この日本語版が一次ドキュメントです。ここを筆者が編集し、英語版 (`README.md`) は LLM による翻訳として更新します。今後もこのフローを維持します。
- 日本語: [doc/README-ja.md](doc/README-ja.md)（本書）
- English: [README.md](README.md)

セルフホスト向けの Bluesky フィード JSON 生成リポジトリです。GitHub Actions で定期実行し、`data/feed.json` を出力します。

## リモート利用（GitHub Actionsのみ）
1. リポジトリ Secrets を設定  
   - `BSKY_APP_HANDLE` (例: `yourname.bsky.social`)  
   - `BSKY_APP_PASSWORD`  
   - 任意: `BSKY_SERVICE`, `BSKY_SEARCH_QUERY`, `BSKY_SEARCH_LIMIT`, `BSKY_SEARCH_LANG`（単一またはカンマ区切り: `ja,en`）
2. Actions タブでワークフローを有効化し、手動実行または5分間隔のスケジュールを待つ。
3. 出力はワークスペースの `data/feed.json` に保存（コミットはしない）。必要に応じてコミット/Pages/Workers などの公開処理を追加する。

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
