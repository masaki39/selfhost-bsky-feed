# selfhost-bsky-feed

GitHub Actions でシンプルなキーワード型フィードをセルフホストします。

[English version](README.md)

## Quick setup

### Step 1: GitHub リポジトリをセットアップ

1. [GitHub のアカウントを作成](https://github.com/join)する
2. このリポジトリ上部の `Fork` → `Create a new fork`
3. フォークしたリポジトリを開く
4. `Settings` → `Actions` → `General` → `Actions permissions` → `Allow all actions and reusable workflows` を選択（フォーク直後は Actions が無効になるため）
5. `Settings` → `Pages` → `Build and deployment` → `Source` → `GitHub Actions` を選択
6. `Settings` → `Secrets and variables` → `Actions` → `Secrets` → `New repository secret` で下記を登録

| Name | 説明 |
| --- | --- |
| `BSKY_APP_HANDLE` | Bluesky のハンドル名（例: `yourname.bsky.social`） |
| `BSKY_APP_PASSWORD` | Bluesky の App Password（[設定ページ](https://bsky.app/settings/app-passwords)） |

7. `Settings` → `Secrets and variables` → `Actions` → `Variables` → `New repository variable` で下記を登録（`BSKY_SEARCH_QUERY` は必須）

| Name | 説明 |
| --- | --- |
| `BSKY_SEARCH_QUERY` | 検索クエリ（必須）。`,` 区切りは OR、スペースは AND、フレーズは `"..."` |
| `BSKY_MUTE_WORDS` | カンマ区切りでミュートワード。`-word` としてクエリに付与 |
| `BSKY_SEARCH_LANG` | 言語コード（単一のみ、例: `ja`） |
| `BSKY_SERVICE` | PDS を指定する場合のみ（例: `https://bsky.social`） |

> [!note]
> `Update Bluesky Feed` が約 10 分おきに検索し、`data/feed.json` を GitHub Pages に公開します。  
> GitHub の cron は厳密ではなく、10 分以上空くこともあります。  
> Pages URL は `https://<owner>.github.io/<repo>/feed.json` です。  
> Bluesky の検索 API は 1 回あたり最大 100 件まで取得します。  
> Bluesky の検索 API は OR 検索がないため、OR 検索（カンマ区切り）は複数回呼び出して結合しています。語が多いと負荷が増えます。
> AND 検索やミュートワードはいくつ設定しても負荷は増えません。

### Step 2: Cloudflare Workers と連携

1. [Cloudflare のアカウントを作成](https://dash.cloudflare.com/sign-up)
2. [API トークンを発行](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)  
   Workers 向けテンプレートを使うと簡単です。
3. GitHub リポジトリに戻る
4. `Settings` → `Secrets and variables` → `Actions` → `Secrets` → `New repository secret` で下記を登録

| Name | 説明 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID |

5. **任意**: フィードの表示名と説明を上書きしたい場合は `Variables` に登録

| Name | 説明 |
| --- | --- |
| `FEED_DISPLAY_NAME` | フィードの表示名 |
| `FEED_DESCRIPTION` | フィードの説明文 |

6. `Actions` タブ → `Create Bluesky Feed` → `Run workflow`

> [!note]
> `Create Bluesky Feed` は Cloudflare Workers をデプロイし、その URL を Bluesky のフィードジェネレーターとして登録します。
> Worker 名・フィードの表示名/説明・RKEY はリポジトリ名から自動生成されます（表示名/説明は Variables で上書き可）。
> `Delete Bluesky Feed` で削除できます。

## 開発者向け

Step 1 の検索ロジックはローカルでテストできます。

```zsh
npm i
```

`.env` を用意してから実行します。

```zsh
npm run start
```

`data/inspect.md` に Markdown で出力します。

```zsh
npm run inspect:feed
```
