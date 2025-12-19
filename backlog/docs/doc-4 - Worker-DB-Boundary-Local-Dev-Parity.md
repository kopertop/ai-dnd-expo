---
id: doc-4
title: Worker/DB Boundary + Local Dev Parity
type: other
created_date: '2025-12-19 13:49'
---
# Worker/DB Boundary + Local Dev Parity

## Worker/DB Responsibilities (Source of Truth)
- Shared game data and coordination: games, maps, tokens, NPCs, quests, and activity logs.
- Auth/session enforcement via expo-auth-template backend and cookie-based sessions.
- Realtime sync: PartyKit-compatible Durable Object (GameRoom) exposed under `/party/*`.
- Asset storage: R2 for images and uploads.
- Rate limiting via `API_RATE_LIMITER` binding.

## Owned Endpoints (Worker)
- Health/status: `/health`, `/status`, `/api/health`, `/api/status`
- Auth: `/api/auth/google/callback`
- Games: `/api/games/*`
- Characters: `/api/characters/*`
- Maps: `/api/maps/*`
- Images: `/api/images/*`
- Quests: `/api/quests/*`
- Worlds: `/api/worlds/*`
- Admin: `/api/admin/*`
- Current user: `/api/me`
- Realtime: `/party/*` (PartyKit in Worker)

## TanStack Start Responsibilities
- SSR web app and client UI (routing, layouts, rendering).
- Data fetching via Worker HTTP endpoints (no direct DB access).
- Cookie-based auth consumption (server + client).

## Boundary Rules
- Worker remains the only component with direct access to D1/KV/R2/DO bindings.
- TanStack Start server must call Worker endpoints via HTTP for all shared data.
- API base URLs should include `/api` since Worker routes are mounted under `/api/*`.
- Realtime usage stays on `/party/*` and uses Worker-hosted DOs.

## Local Dev Parity
- Start the Worker API: `bun run dev:api` (wrangler dev, default port 8787).
- Start TanStack Start app: `bun run dev` from `tanstack-app`.
- Local API base URL: `http://localhost:8787/api/` (set via `VITE_API_BASE_URL`).
- Worker bindings expected locally (wrangler/Miniflare):
  - D1: `DATABASE` (and optional `R2_SQL`)
  - KV: `QUESTS`, `AUTH_SESSIONS`
  - R2: `IMAGES_BUCKET`
  - DO: `GameRoom`
  - Rate limit: `API_RATE_LIMITER`
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`

## Notes
- expo-auth-template currently expects DB binding as `DB`; Worker code aliases `DATABASE` accordingly.
- If `VITE_API_BASE_URL` changes, update SSR client/server fetch helpers together to avoid split origins.
