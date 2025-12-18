# selfhost-bsky-feed 日本語ガイド

この日本語版が一次ドキュメントです。ここを筆者が編集し、英語版 (`README.md`) は LLM による翻訳として更新します。今後もこのフローを維持します。
- 日本語: [README-ja.md](.doc/README-ja.md)（本書）
- English: [README.md](README.md)

セルフホスト向けの Bluesky フィード JSON 生成リポジトリです。GitHub Actions で定期実行し、`data/feed.json` を出力します。

## 必要なもの
- Node.js 20 以上
- Bluesky アプリパスワードとハンドル (例: `yourname.bsky.social`)

## 環境変数
`.env` か GitHub Secrets に設定します。

```
BSKY_APP_HANDLE=yourname.bsky.social
BSKY_APP_PASSWORD=xxxx-xxxx-xxxx
BSKY_SERVICE=https://bsky.social   # 省略可
BSKY_SEARCH_QUERY=bluesky          # 省略可
BSKY_SEARCH_LIMIT=25               # 省略可、最大100
```

## ローカル実行
```bash
npm install
npm run start
```
`data/feed.json` に検索結果が保存されます。

## GitHub Actions
- `.github/workflows/update-feed.yml` が 5 分ごとに実行（手動トリガー可）。
- Secrets に `BSKY_APP_HANDLE` / `BSKY_APP_PASSWORD` を登録しておく。
- 現状は生成物をコミットせずワークスペースに残します。Pages/Workers への公開ロジックは別途追加してください。

## カスタマイズのヒント
- 検索クエリ: 環境変数 `BSKY_SEARCH_QUERY` を変更。
- 取得件数: `BSKY_SEARCH_LIMIT` で調整（最大100）。
- サービス URL: `BSKY_SERVICE` を独自 PDS に変更可能。
