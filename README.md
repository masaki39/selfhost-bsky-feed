# selfhost-bsky-feed

Self-host a simple keyword-based Bluesky feed with GitHub Actions.

[日本語版はこちら](README.ja.md)

## Quick setup

### Step 1: Set up the GitHub repository

1. [Create a GitHub account](https://github.com/join)
2. Click `Fork` → `Create a new fork` at the top of this repo
3. Open your fork
4. `Settings` → `Actions` → `General` → `Actions permissions` → select `Allow all actions and reusable workflows` (Actions are disabled on new forks)
5. `Settings` → `Pages` → `Build and deployment` → `Source` → select `GitHub Actions`
6. `Settings` → `Secrets and variables` → `Actions` → `Secrets` → `New repository secret`, then add:

| Name | Description |
| --- | --- |
| `BSKY_APP_HANDLE` | Bluesky handle (e.g., `yourname.bsky.social`) |
| `BSKY_APP_PASSWORD` | Bluesky App Password ([settings page](https://bsky.app/settings/app-passwords)) |

7. `Settings` → `Secrets and variables` → `Actions` → `Variables` → `New repository variable` ( `BSKY_SEARCH_QUERY` is required ):

| Name | Description |
| --- | --- |
| `BSKY_SEARCH_QUERY` | Search query (required). Comma = OR, space = AND, phrases in `"..."` |
| `BSKY_MUTE_WORDS` | Comma-separated mute words, appended as `-word` |
| `BSKY_SEARCH_LANG` | Language code (single only, e.g., `ja`) |
| `BSKY_SERVICE` | PDS override (e.g., `https://bsky.social`) |

> [!note]
> `Update Bluesky Feed` runs about every 10 minutes and publishes `data/feed.json` to GitHub Pages.  
> GitHub cron is not strict and can slip beyond 10 minutes.  
> The Pages URL is `https://<owner>.github.io/<repo>/feed.json`.  
> The Bluesky search API returns up to 100 posts per request.  
> OR queries (comma-separated) are executed as multiple requests and merged, so many terms increase load.
> AND queries and mute words do not increase request count.

### Step 2: Connect Cloudflare Workers

1. [Create a Cloudflare account](https://dash.cloudflare.com/sign-up)
2. [Create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)  
   The Workers template is the easiest option.
3. Go back to your GitHub repo
4. `Settings` → `Secrets and variables` → `Actions` → `Secrets` → `New repository secret`, then add:

| Name | Description |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

5. **Optional**: override feed display metadata via `Variables`

| Name | Description |
| --- | --- |
| `FEED_DISPLAY_NAME` | Feed display name |
| `FEED_DESCRIPTION` | Feed description |

6. `Actions` tab → `Create Bluesky Feed` → `Run workflow`

> [!note]
> `Create Bluesky Feed` deploys a Cloudflare Worker and registers its URL as a Bluesky feed generator.  
> Worker name, feed display name/description, and RKEY are derived from the repo name (display metadata can be overridden via Variables).  
> Use `Delete Bluesky Feed` to remove it.

## For developers

You can test the Step 1 search logic locally.

```zsh
npm i
```

Create a `.env`, then run:

```zsh
npm run start
```

Output inspection as Markdown to `data/inspect.md`:

```zsh
npm run inspect:feed
```
