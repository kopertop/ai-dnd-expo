---
id: doc-6
title: SSR Data + Cookie Auth Plan (TanStack Start)
type: other
created_date: '2025-12-19 14:03'
---
# SSR Data + Cookie Auth Plan (TanStack Start)

## Relevant start-basic-auth patterns
- Server-side auth check in `__root` via `beforeLoad` calling a `createServerFn` that reads session/cookies.
- Protected route group (`/_authed`) with `beforeLoad` guard and an auth UI fallback.
- Login/logout implemented as server functions and followed by `router.invalidate()` to refresh route context.

We will reuse these patterns, but rely on the Worker for the authoritative auth cookie.

## SSR Data Strategy (React Query)
- Keep `QueryClient` in router context (`createRootRouteWithContext`), wired with `setupRouterSsrQueryIntegration` (as in `tanstack-app/src/router.tsx`).
- In route `loader`s, call `context.queryClient.ensureQueryData(...)` to prefetch SSR data.
- Use `useSuspenseQuery` in route components with the same query keys for hydration.
- For non-blocking data, use `prefetchQuery` in `loader` and display client fallback as needed.
- Keep query option helpers in `src/utils/*` or `src/services/*` and share between loader + component.

## Cookie Auth Plan (Server + Client)
- Auth cookies are set and validated by the Worker (same as today). TanStack Start does not own auth state.
- On the server, a `createServerFn` (e.g., `fetchUser`) forwards request cookies to `/api/me` on the Worker.
- `__root.beforeLoad` uses `fetchUser` to populate `context.user` for SSR and for client hydration.
- Protected routes use a pathless `/_authed` layout with `beforeLoad` guard (pattern from start-basic-auth).
- Login flow:
  - Client redirects to Worker OAuth flow (or posts to `/api/auth/google/callback`) so cookies are set by the Worker response.
  - After completion, call `router.invalidate()` to refresh `context.user` from SSR function.
- Logout flow:
  - Call Worker logout endpoint (to be defined if not present) and then `router.invalidate()` + redirect to `/login`.
- Client fetches to Worker use `credentials: 'include'` so cookies flow for XHR.

## Route Auth Matrix (Initial)
Public (no auth):
- `/`, `/login`, `/auth/*`, `/join-game`, `/licenses`

Authenticated:
- `/game`, `/game/$inviteCode`, `/host-game/*`, `/characters/*`, `/new-character/*`, `/new-game`, `/party-test`, `/multiplayer-game`, `/sql`

Admin-only:
- `/admin/*`

Note: The authenticated list reflects current behavior and should be confirmed per route usage.

## Assumptions Requiring Integration/E2E Validation
- Worker auth cookie can be read by TanStack Start server in SSR and passed to `/api/me`.
- Cross-origin dev setup (localhost:5173 -> localhost:8787) correctly uses `credentials: 'include'` with CORS.
- OAuth callback flow sets cookies on the correct domain and sameSite settings allow SSR reads.
- Route guard behavior in a pathless layout (`/_authed`) matches expected UX for unauthenticated users.
- Hydration works for protected routes after login/logout and `router.invalidate()`.
