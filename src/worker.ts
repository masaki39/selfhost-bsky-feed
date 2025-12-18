const DEFAULT_OWNER = "masaki39";
const DEFAULT_REPO = "selfhost-bsky-feed";
const DEFAULT_FEED_URL = `https://raw.githubusercontent.com/${DEFAULT_OWNER}/${DEFAULT_REPO}/main/data/feed.json`;

type Env = {
  FEED_URL?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
};

function buildErrorResponse(message: string, status = 502) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function resolveFeedUrl(env: Env) {
  if (env.FEED_URL) return env.FEED_URL;
  if (env.GITHUB_OWNER && env.GITHUB_REPO) {
    return `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/main/data/feed.json`;
  }
  if (env.GITHUB_REPO) {
    return `https://raw.githubusercontent.com/${DEFAULT_OWNER}/${env.GITHUB_REPO}/main/data/feed.json`;
  }
  if (env.GITHUB_OWNER) {
    return `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${DEFAULT_REPO}/main/data/feed.json`;
  }
  return DEFAULT_FEED_URL;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const feedUrl = resolveFeedUrl(env);

    const { pathname } = new URL(request.url);
    if (pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    const upstream = await fetch(feedUrl, {
      headers: { Accept: "application/json" },
    }).catch((err) => {
      return buildErrorResponse(`Upstream fetch failed: ${err}`, 502);
    });

    if (upstream instanceof Response && !upstream.ok) {
      return buildErrorResponse(
        `Upstream responded with ${upstream.status}`,
        502
      );
    }

    return new Response((upstream as Response).body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
