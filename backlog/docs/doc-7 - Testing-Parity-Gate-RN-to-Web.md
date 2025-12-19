---
id: doc-7
title: Testing + Parity Gate (RN to Web)
type: other
created_date: '2025-12-19 14:14'
---
# Testing + Parity Gate (RN to Web)

## Parity Checklist (Core User Flows)
- Auth: login/logout, session persistence via cookies, SSR route hydration with user context.
- Join game: enter invite code, game lookup, character selection, join flow.
- Host game: create game, select map, start/stop game.
- Map interactions: view map, move tokens, basic map editor interactions, DM actions.
- Combat/actions: dice roll, basic actions, log updates.
- Assets: upload image, list images, place map assets.
- Chat/DM: message send/receive, activity log updates.

## Test Plan

### Unit Tests
- Config and helpers: API base URL resolution, URL builders, cookie parsing helpers.
- Query option utilities: ensure query keys and data loaders are consistent across SSR/client.
- Non-UI logic in hooks/services (platform-specific branches swapped for web).

### Integration Tests (API)
- Existing `api/tests/*` suite continues to validate Worker endpoints.
- Add SSR server function tests once Start server functions are added (user fetch, auth guard, cookie pass-through).

### E2E (Playwright)
- Auth flow: login, session persistence, logout.
- Join/host game: create/join path and move into active game UI.
- Map interactions: verify key UI flows (move token, DM action, chat).
- Asset flow: upload + render on map.
- SSR validation: initial page load should include SSR content for protected and public routes.

## Cleanup Gate (Before Removing Expo/RN)
- All parity checklist items pass on web SSR.
- Worker API tests green (`bun run test:api`).
- Web unit tests green (`bun run test`).
- Playwright smoke suite green (`bun run test:e2e`).
- Known RN‑specific features documented with web replacements or deferred scope.

## Rollback Criteria
- SSR regressions on core routes.
- Auth cookie handling fails in SSR or client fetch.
- Map/canvas performance regressions beyond acceptable thresholds.
- Asset upload or image rendering failures.

## Assumptions Requiring Integration/E2E Validation
- OAuth cookie settings compatible with SSR and cross-origin dev.
- Map/canvas interactions remain performant on web.
- Voice/tts features have acceptable web fallbacks.
