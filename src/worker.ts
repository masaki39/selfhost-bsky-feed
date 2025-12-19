type Env = {
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  FEED_URL?: string;
  FEED_GENERATOR_URI?: string;
  FEED_GENERATOR_DID?: string;
  FEED_SERVICE_DID?: string;
  FEED_ENDPOINT?: string;
  FEED_RKEY?: string;
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

function buildServiceDid(env: Env, origin: string) {
  if (env.FEED_SERVICE_DID) return env.FEED_SERVICE_DID;
  const endpoint = env.FEED_ENDPOINT ?? origin;
  const hostname = new URL(endpoint).hostname;
  return `did:web:${hostname}`;
}

function buildFeedGeneratorUri(env: Env, serviceDid: string) {
  if (env.FEED_GENERATOR_URI) return env.FEED_GENERATOR_URI;
  const did = env.FEED_GENERATOR_DID ?? serviceDid;
  const rkey = env.FEED_RKEY ?? "selfhost";
  return `at://${did}/app.bsky.feed.generator/${rkey}`;
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
      const serviceId = `${serviceDid}#bsky_fg`;
      return new Response(
        JSON.stringify({
          "@context": ["https://www.w3.org/ns/did/v1"],
          id: serviceDid,
          service: [
            {
              id: serviceId,
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

      const serviceDid = buildServiceDid(env, origin);
      const expectedFeed = buildFeedGeneratorUri(env, serviceDid);
      const feed = url.searchParams.get("feed");
      if (feed !== expectedFeed) {
        return new Response(
          JSON.stringify({
            error: "Invalid feed parameter",
            expected: expectedFeed,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(url.searchParams.get("limit") || "30", 10))
      );
      const cursor = url.searchParams.get("cursor") ?? undefined;

      let upstream: Response;
      try {
        upstream = await fetch(feedUrl, {
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        return buildErrorResponse(`Upstream fetch failed: ${err}`, 502);
      }
      if (!upstream.ok) {
        let snippet = "";
        try {
          const text = await upstream.text();
          snippet = text.slice(0, 200);
        } catch {
          snippet = "";
        }
        const detail = snippet ? `; body: ${snippet}` : "";
        return buildErrorResponse(
          `Upstream responded with ${upstream.status}${detail}`,
          502
        );
      }

      const json = (await upstream.json()) as FeedFile;
      if (!Array.isArray(json.items)) {
        return buildErrorResponse("Upstream schema invalid: items missing", 502);
      }
      const posts = json.items.filter(
        (item) => item && typeof item.uri === "string"
      );
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
      const serviceDid = buildServiceDid(env, origin);
      const feedGenUri = buildFeedGeneratorUri(env, serviceDid);
      const feedGenDid = env.FEED_GENERATOR_DID ?? serviceDid;
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
