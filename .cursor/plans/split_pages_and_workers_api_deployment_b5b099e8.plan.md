---
name: Split Pages and Workers API Deployment
overview: Refactor the application to split static content (Cloudflare Pages) from API (Workers) into separate deployments, following the workorder-app pattern. This will improve performance for static assets with long cache times while keeping API logic in a dedicated Worker.
todos:
  - id: config-pages
    content: Create Pages configuration in wrangler.toml (remove main/assets, add pages_build_output_dir)
    status: completed
  - id: config-api
    content: Create API Worker configuration in wrangler.api.toml (keep main, add custom domain routes, remove assets)
    status: completed
  - id: remove-static-serving
    content: Remove static asset serving code from api/src/index.ts (catch-all route, getContentType function)
    status: completed
  - id: update-pages-function
    content: Update functions/api/[[path]].ts to use Service Binding (context.env.API_WORKER.fetch) instead of fetch
    status: completed
  - id: setup-rate-limiting
    content: Create rate limit namespace in Cloudflare Dashboard and configure in wrangler.api.toml
    status: pending
  - id: implement-rate-limiting
    content: Add rate limiting middleware to api/src/index.ts with user/IP-based keys
    status: pending
  - id: add-dow-protection
    content: Add request size limits, worker limits configuration, and monitoring setup
    status: pending
  - id: update-scripts
    content: "Update package.json scripts: split deploy into deploy:web and deploy:api, update dev scripts"
    status: completed
  - id: update-cors
    content: Update CORS configuration to allow Pages domain, add environment variables for cross-deployment communication
    status: completed
  - id: test-local
    content: "Test local development: API Worker independently, Pages locally, verify routing works"
    status: completed
  - id: update-docs
    content: Update DEPLOYMENT.md with new deployment process, create migration guide, update README
    status: completed
---

# Split Pages and Workers API Deployment Plan

## Overview

Currently, the application uses a single Cloudflare Worker that serves both static assets (via `ASSETS` binding) and API routes. This is inefficient for large images and static content that should be served with long cache times via Cloudflare Pages.

This plan splits the deployment into:

1. **Cloudflare Pages** - Static content (HTML, JS, CSS, images) with optimal caching
2. **Cloudflare Workers API** - API routes only, deployed separately with custom domain routing

## Reference Architecture

Based on `workorder-app`:

- `wrangler.toml` → Pages deployment (static content)
- `wrangler.api.toml` → Workers API deployment (with custom domain routes)
- Pages uses `_worker.js` or Functions to route `/api/*` to the API Worker

## Current State Analysis

### Current Setup

- **Single Worker** (`wrangler.toml`): Serves both static assets and API
  - `main = "api/src/index.ts"`
  - `[assets]` binding for static files
  - API routes at `/api/*`
  - Static file serving in catch-all route (lines 143-204 of `api/src/index.ts`)

### Issues

- Static assets served through Worker (inefficient)
- No long-term caching for static content
- Worker handles both concerns (violates separation)

## Implementation Plan

### Phase 1: Configuration Files

#### 1.1 Create Pages Configuration (`wrangler.toml`)

- Convert current `wrangler.toml` to Pages config
- Remove `main` and `[assets]` binding
- Add `pages_build_output_dir = "dist"`
- Add Service Binding to API Worker:
  ```toml
  [services]
  binding = "API_WORKER"
  service = "ai-dnd-api"
  ```

- Keep environment-specific configs (production/preview)
- Custom domain: `dnd.coredumped.org`
- Reference: `workorder-app/wrangler.toml`

#### 1.2 Create API Worker Configuration (`wrangler.api.toml`)

- Create new file based on current `wrangler.toml`
- Keep `main = "api/src/index.ts"`
- Remove `[assets]` binding (no static serving)
- Add custom domain route for API (same domain routing):
  ```toml
  [[routes]]
  pattern = "dnd.coredumped.org/api/*"
  custom_domain = true
  ```

- Worker name: `ai-dnd-api` (must match Service Binding in Pages)
- Keep all bindings (D1, KV, R2, Durable Objects)
- Add rate limiting configuration (see Phase 9)
- Reference: `workorder-app/wrangler.api.toml`

#### 1.3 Update Existing `wrangler.api.toml`

- Current file is for tests only
- Rename to `wrangler.api.test.toml` or merge into new structure

### Phase 2: API Worker Refactoring

#### 2.1 Remove Static Asset Serving

- **File**: `api/src/index.ts`
- Remove catch-all static serving route (lines 142-204)
- Remove `getContentType` function (lines 118-140)
- Remove `ASSETS` binding usage
- Keep only API routes and health checks
- Return 404 for non-API routes instead of serving static files

#### 2.2 Update CORS Configuration

- **File**: `api/src/cors.ts`
- Ensure CORS allows requests from Pages domain: `https://dnd.coredumped.org`
- Update `CORS_ORIGINS` to include: `https://dnd.coredumped.org`, `https://*.coredumped.org`
- Allow credentials (cookies) for same-origin requests

### Phase 3: Pages Routing Strategy

Two options for routing `/api/*` to API Worker:

#### Option A: Pages Functions (Recommended for simplicity)

- **File**: `functions/api/[[path]].ts` (already exists!)
- Update to fetch from API Worker using Service Binding or direct fetch
- Use environment variable for API Worker URL
- Handle all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Preserve headers and request body

#### Option B: `_worker.js` (Advanced mode)

- **File**: `dist/_worker.js` (generated during build)
- Create build script to generate `_worker.js` from template
- Route `/api/*` to API Worker
- Serve static assets for all other routes
- More control but requires build-time generation

**Decision**: Use Option A (Pages Functions) since `functions/api/[[path]].ts` already exists and just needs updating.

### Phase 4: Build & Deploy Scripts

#### 4.1 Update `package.json` Scripts

- **Current**: `"deploy": "run-s build:web build:web:* && wrangler deploy"`
- **New**: Split into:
  ```json
  "deploy": "run-s deploy:*",
  "deploy:web": "run-s build:web build:web:* && wrangler pages deploy",
  "deploy:api": "wrangler deploy --config wrangler.api.toml",
  "deploy:all": "run-s deploy:web deploy:api"
  ```


#### 4.2 Update Development Scripts

- **Current**: `"dev": "wrangler dev"`
- **New**:
  ```json
  "dev": "run-p dev:*",
  "dev:api": "wrangler dev --config wrangler.api.toml",
  "dev:web": "expo start --web"
  ```


### Phase 5: Environment Configuration

#### 5.1 API Worker Environment Variables

- Add `PAGES_URL` or `FRONTEND_URL` for CORS
- Keep existing env vars (GOOGLE_CLIENT_ID, etc.)

#### 5.2 Pages Environment Variables

- Add `CF_API_UPSTREAM` (already in `functions/api/[[path]].ts`)
- Set to API Worker URL (custom domain or workers.dev)

#### 5.3 Update `api-base-url.ts`

- **File**: `services/config/api-base-url.ts`
- Ensure production uses relative `/api/` path (already correct)
- Verify local dev still works

### Phase 6: Custom Domain Setup

#### 6.1 API Worker Custom Domain

- Configure in `wrangler.api.toml`:
  ```toml
  [[routes]]
  pattern = "dnd.coredumped.org/api/*"
  custom_domain = true
  ```

- This routes `/api/*` requests directly to the Worker
- Pages Functions will also route `/api/*` via Service Binding (redundant but ensures coverage)

#### 6.2 Pages Custom Domain

- Configure in Cloudflare Dashboard: `dnd.coredumped.org` → Pages project
- Ensure `/api/*` routes are handled by Pages Functions (Service Binding)

#### 6.3 DNS Configuration

- `dnd.coredumped.org` → Cloudflare Pages (A/CNAME records)
- `/api/*` routes handled by Pages Functions → API Worker via Service Binding
- Same domain routing simplifies CORS and cookie handling

### Phase 7: Testing & Validation

#### 7.1 Local Development Testing

- Test API Worker independently: `wrangler dev --config wrangler.api.toml`
- Test Pages locally: `wrangler pages dev dist`
- Test routing: Verify `/api/*` requests reach API Worker

#### 7.2 Integration Testing

- Test full flow: Static assets load, API calls work
- Test CORS: Verify cross-origin requests work
- Test authentication: Verify auth cookies work across deployments

#### 7.3 Performance Testing

- Verify static assets have proper cache headers
- Verify API responses are fast
- Check Cloudflare Analytics for both deployments

### Phase 8: Denial of Wallet (DoW) Protection

#### 8.1 Cloudflare Workers Rate Limiting

- **File**: `wrangler.api.toml`
- Add rate limit namespace configuration:
  ```toml
  [[ratelimits]]
  name = "API_RATE_LIMITER"
  namespace_id = "<namespace-id>"  # Create in Cloudflare Dashboard first
  simple = { limit = 1000, period = 60 }  # 1000 requests per minute per key
  ```

- Create rate limit namespace in Cloudflare Dashboard:

  1. Go to Workers & Pages → Rate Limits
  2. Create new namespace (e.g., "ai-dnd-api-limits")
  3. Copy namespace ID to `wrangler.api.toml`

#### 8.2 Implement Rate Limiting in API Worker

- **File**: `api/src/index.ts`
- Add rate limiting middleware before route handlers:
  ```typescript
  // Rate limiting middleware
  app.use('*', async (c, next) => {
    const rateLimiter = c.env.API_RATE_LIMITER;
    if (rateLimiter) {
      // Use user ID if authenticated, IP as fallback
      const key = c.get('user')?.id || c.req.header('CF-Connecting-IP') || 'anonymous';
      const { success, limit, remaining, reset } = await rateLimiter.limit({ key });
  
      if (!success) {
        return c.json({
          error: 'Rate limit exceeded',
          limit,
          remaining: 0,
          reset: new Date(reset).toISOString()
        }, 429);
      }
  
      // Add rate limit headers
      c.header('X-RateLimit-Limit', limit.toString());
      c.header('X-RateLimit-Remaining', remaining.toString());
      c.header('X-RateLimit-Reset', new Date(reset).toISOString());
    }
    await next();
  });
  ```


#### 8.3 Cloudflare Workers Limits & Billing Protection

- **CPU Time Limits**:
  - Free: 10ms CPU time per request
  - Paid: 50ms CPU time per request (can be increased)
  - Set in `wrangler.api.toml`: `[limits] cpu_ms = 50`

- **Request Limits**:
  - Free: 100,000 requests/day
  - Paid: Unlimited (but billed per request)
  - Monitor in Cloudflare Dashboard → Workers & Pages → Analytics

- **Subrequest Limits**:
  - Free: 50 subrequests per request
  - Paid: 1000 subrequests per request
  - Set in `wrangler.api.toml`: `[limits] subrequests = 1000`

- **Memory Limits**:
  - Free: 128MB per request
  - Paid: 128MB per request (can be increased)
  - Set in `wrangler.api.toml`: `[limits] memory_mb = 128`

#### 8.4 Additional DoW Protection Measures

- **Request Size Limits**: Reject requests > 10MB
  ```typescript
  app.use('*', async (c, next) => {
    const contentLength = c.req.header('Content-Length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return c.json({ error: 'Request too large' }, 413);
    }
    await next();
  });
  ```

- **Path-Based Rate Limits**: Stricter limits for expensive endpoints
  - Image uploads: 10 requests/minute
  - Game creation: 5 requests/minute
  - Use different rate limit keys per endpoint type

- **IP-Based Rate Limiting**: Use Cloudflare's built-in rate limiting
  - Configure in Cloudflare Dashboard → Security → WAF
  - Set rules for suspicious traffic patterns

- **Monitoring & Alerts**:
  - Set up Cloudflare Analytics alerts for:
    - Unusual request volume spikes
    - High error rates
    - CPU time exceeded errors
  - Monitor billing dashboard for unexpected costs

#### 8.5 Worker Configuration Limits

Add to `wrangler.api.toml`:

```toml
[limits]
cpu_ms = 50              # Max CPU time per request (paid plan)
subrequests = 1000       # Max subrequests per request (paid plan)
memory_mb = 128          # Max memory per request
```

### Phase 9: Documentation Updates

#### 8.1 Update `DEPLOYMENT.md`

- Document new deployment process
- Explain Pages vs Workers separation
- Update deployment commands
- Document custom domain setup

#### 8.2 Update README

- Update development setup instructions
- Document new script commands

#### 8.3 Create Migration Guide

- Document breaking changes (if any)
- Step-by-step migration checklist

## File Changes Summary

### New Files

- `wrangler.api.toml` - API Worker configuration (rename/update existing)
- `DEPLOYMENT-SPLIT.md` - Migration documentation

### Modified Files

- `wrangler.toml` - Convert to Pages config, add Service Binding
- `wrangler.api.toml` - Create API Worker config with custom domain, rate limits, limits
- `api/src/index.ts` - Remove static asset serving, add rate limiting middleware
- `functions/api/[[path]].ts` - Update to use Service Binding instead of fetch
- `api/src/cors.ts` - Update CORS origins for `dnd.coredumped.org`
- `package.json` - Update deploy/dev scripts
- `DEPLOYMENT.md` - Update deployment instructions, add DoW protection docs
- `services/config/api-base-url.ts` - Verify configuration

### Removed/Deprecated

- Static asset serving code from `api/src/index.ts`
- `ASSETS` binding from API Worker config

## Key Considerations

### Service Bindings Configuration

- **Service Bindings**: Direct Worker-to-Worker communication (zero latency, selected)
- Configured in `wrangler.toml` Pages config: `[services] binding = "API_WORKER" service = "ai-dnd-api"`
- API Worker name must match: `name = "ai-dnd-api"` in `wrangler.api.toml`
- Accessed in Pages Functions via: `context.env.API_WORKER.fetch()`

### Routing Strategy

- **Same Domain**: Use Pages Functions with Service Bindings to route `/api/*` to API Worker
- **Domain**: `dnd.coredumped.org` for both Pages and API (route-based routing)
- **Decision**: Same domain with route-based routing simplifies CORS and cookie handling

### Cache Headers

- Pages automatically handles static asset caching
- API Worker should set appropriate cache headers for API responses
- Ensure no caching for dynamic API responses

### Authentication

- Auth cookies work across same domain (`dnd.coredumped.org`)
- Verify cookie domain settings (should be `.coredumped.org` or `dnd.coredumped.org`)
- Test auth flow end-to-end

### Denial of Wallet Protection

- **Rate Limiting**: Configured via Cloudflare Rate Limiting API
  - Default: 1000 requests/minute per user/IP
  - Stricter limits for expensive endpoints (image uploads, game creation)
- **Worker Limits**: Set CPU time, memory, and subrequest limits in `wrangler.api.toml`
- **Request Size Limits**: Reject requests > 10MB
- **Monitoring**: Set up Cloudflare Analytics alerts for unusual traffic patterns
- **Billing Protection**: Monitor Cloudflare Dashboard for unexpected costs

## Rollout Strategy

1. **Development**: Test locally with both deployments
2. **Staging**: Deploy to staging environment first
3. **Production**: Deploy Pages first, then API Worker
4. **Monitoring**: Watch for errors, performance issues
5. **Rollback**: Keep old deployment configs for quick rollback

## Success Criteria

- [ ] Static assets served from Pages with proper caching
- [ ] API routes work correctly via Service Binding routing
- [ ] No breaking changes for clients
- [ ] Improved performance for static content
- [ ] Separate deployments can be updated independently
- [ ] Rate limiting configured and tested
- [ ] DoW protection measures in place (rate limits, request size limits, worker limits)
- [ ] Custom domain `dnd.coredumped.org` configured correctly
- [ ] Service Bindings working (zero-latency Worker-to-Worker communication)
- [ ] Documentation is complete and accurate