type Env = {
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  FEED_URL?: string;
  FEED_GENERATOR_URI?: string;
  FEED_GENERATOR_DID?: string;
  FEED_SERVICE_DID?: string;
};

type FeedFile = {
  items: { uri: string; indexedAt?: string }[];
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
    return `https://${env.GITHUB_OWNER}.github.io/${env.GITHUB_REPO}/feed.json`;
  }
  throw new Error("GITHUB_OWNER and GITHUB_REPO must be provided");
}

function buildServiceDid(env: Env, baseUrl: string) {
  if (env.FEED_SERVICE_DID) return env.FEED_SERVICE_DID;
  const host = new URL(baseUrl).host;
  return `did:web:${host}`;
}

function paginate<T>(items: T[], limit: number, cursor?: string) {
  const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  const nextCursor = nextOffset < items.length ? String(nextOffset) : undefined;
  return { slice, nextCursor };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = url.origin;

    if (path === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (path === "/.well-known/did.json") {
      const serviceDid = buildServiceDid(env, origin);
      return new Response(
        JSON.stringify({
          id: serviceDid,
          service: [
            {
              id: "#bsky_fg",
              type: "BskyFeedGenerator",
              serviceEndpoint: origin,
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (path === "/xrpc/app.bsky.feed.getFeedSkeleton") {
      let feedUrl: string;
      try {
        feedUrl = resolveFeedUrl(env);
      } catch (err) {
        return buildErrorResponse(String(err), 500);
      }

      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(url.searchParams.get("limit") || "30", 10))
      );
      const cursor = url.searchParams.get("cursor") ?? undefined;

      const upstream = await fetch(feedUrl, {
        headers: { Accept: "application/json" },
      }).catch((err) => buildErrorResponse(`Upstream fetch failed: ${err}`, 502));
      if (upstream instanceof Response && !upstream.ok) {
        return buildErrorResponse(
          `Upstream responded with ${upstream.status}`,
          502
        );
      }

      const json = (await (upstream as Response).json()) as FeedFile;
      const posts = json.items ?? [];
      const { slice, nextCursor } = paginate(posts, limit, cursor);
      return new Response(
        JSON.stringify({
          feed: slice.map((p) => ({ post: p.uri })),
          cursor: nextCursor,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (path === "/xrpc/app.bsky.feed.describeFeedGenerator") {
      const feedGenUri =
        env.FEED_GENERATOR_URI ??
        "at://did:example:feed/app.bsky.feed.generator/selfhost";
      const feedGenDid =
        env.FEED_GENERATOR_DID ?? buildServiceDid(env, origin);
      return new Response(
        JSON.stringify({
          did: feedGenDid,
          feeds: [{ uri: feedGenUri }],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return buildErrorResponse("Not Found", 404);
  },
};
