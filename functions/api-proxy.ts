// Cloudflare Pages Function: proxies /api/* to Worker API
// Upstream base URL is configurable via CF_API_UPSTREAM env var
export const onRequest: any = async (context: any) => {
  const req = context?.request;
  const env = context?.env ?? {};
  const upstreamBase = (env?.CF_API_UPSTREAM as string) ?? "https://my-api.youracct.workers.dev";

  if (!req) {
    return new Response("Bad Request: no request", { status: 400 });
  }

  const url = new URL(req.url);

  // Strip the /api prefix from the path
  const upstreamPath = url.pathname.replace(/^\/api/, "") || "/";
  const upstreamUrl = new URL(upstreamPath + url.search, upstreamBase);

  const isBodyless = req.method === "GET" || req.method === "HEAD";

  const upstreamResp = await fetch(upstreamUrl.toString(), {
    method: req.method,
    headers: req.headers,
    body: isBodyless ? undefined : req.body,
  });

  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    statusText: upstreamResp.statusText,
    headers: upstreamResp.headers,
  });
};
