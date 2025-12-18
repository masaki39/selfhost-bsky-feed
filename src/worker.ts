type Env = {
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
  if (env.GITHUB_OWNER && env.GITHUB_REPO) {
    return `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/main/data/feed.json`;
  }
  throw new Error("GITHUB_OWNER and GITHUB_REPO must be provided");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let feedUrl: string;
    try {
      feedUrl = resolveFeedUrl(env);
    } catch (err) {
      return buildErrorResponse(String(err), 500);
    }

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
