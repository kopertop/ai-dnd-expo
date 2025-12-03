# Partykit Migration Plan

This document captures the plan to migrate the API and backend operations from the current Cloudflare Worker + Hono stack to Partykit backed by our own Cloudflare Worker and R2-hosted SQL database.

## Goals
- Run all real-time and API flows through Partykit rooms while keeping the Worker entrypoint responsible for routing and authentication.
- Persist authoritative data in the R2-backed SQL database layer and expose transactional access to Partykit rooms via worker bindings.
- Maintain compatibility with the Expo client by providing stable REST fallbacks where needed.
- Ship comprehensive end-to-end tests that validate critical multiplayer flows through the new Partykit-powered backend.

## References
- [Partykit Documentation](https://partykit.io/docs) — connection lifecycle, room handlers, and deployment guidance.
- [Cloudflare Workers](https://developers.cloudflare.com/workers) — bindings, environment variables, and routing for the hosted worker.
- [Cloudflare R2](https://developers.cloudflare.com/r2) — storage layer details for SQL-compatible setups.

## Proposed Architecture
- **Worker Entrypoint**: expose `/api/*` routes for REST-style operations and forward websocket upgrades to Partykit rooms. Hono middleware remains for CORS and auth wrapping until Partykit owns the room handshake.
- **Partykit Server**: define room handlers for game sessions (`games/[gameId]`) that coordinate turn order, movement, and quest updates. Rooms load domain services via Worker bindings and issue SQL queries against the R2-backed database abstraction layer.
- **Data Layer**: introduce a thin repository layer that maps existing services (`games`, `maps`, `characters`, `quests`) onto parameterized SQL executed through the R2-backed database binding. Read/write paths should be shared between REST and Partykit handlers to avoid drift.
- **Auth**: reuse `expo-auth-template` tokens by verifying them inside Partykit `onConnect` and propagating the user context into room events.
- **Edge Assets**: continue to serve static assets from the `ASSETS` binding; only socket traffic is upgraded to Partykit.

## Migration Steps
1. Add Partykit server entrypoint (e.g., `api/src/partykit/server.ts`) with room types for `GameRoom`, `MapRoom`, and `QuestRoom`, wiring logging and auth verification hooks.
2. Create a shared data-access module that wraps the R2 SQL binding with query helpers and is consumable from both Hono routes and Partykit rooms.
3. Update REST routes to delegate mutations to the shared repository and publish events to Partykit rooms so connected clients stay in sync.
4. Introduce worker routing that directs websocket upgrade requests to Partykit while retaining existing REST behavior for health/status endpoints.
5. Write end-to-end tests that spin up the Partykit server locally (or via Cloudflare Pages Functions mock) and validate a full flow: user authenticates, joins a game room, moves a token, and observes persisted state in R2.
6. Add deployment notes to `DEPLOYMENT.md` covering Partykit build/deploy commands, bindings for the R2 SQL database, and environment variable expectations.

## Testing Strategy
- **Integration**: mock R2 SQL responses for repository tests to keep deterministic behavior in CI.
- **E2E**: extend Playwright to launch a local Partykit room (via `partykit dev`) and exercise multiplayer actions through the Expo web bundle.
- **Load/Resilience**: add soak tests for room reconnections and state replay from R2 snapshots.

## Open Questions
- Confirm the exact SQL compatibility layer provided by our R2 setup (e.g., D1-compatible, libSQL, or Turso) so that query tooling matches production.
- Decide whether to tunnel REST requests through Partykit or maintain a parallel Hono route set for non-realtime operations.
- Establish versioned event schemas for room broadcasts to avoid breaking older clients during rollout.
