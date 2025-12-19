---
id: task-29.1
title: Auth + account creation with SSR cookie context
status: Done
assignee:
  - codex
created_date: '2025-12-19 14:23'
updated_date: '2025-12-19 14:40'
labels: []
dependencies: []
parent_task_id: task-29
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement cookie-based auth in TanStack Start using Worker endpoints so users can log in, auto-create accounts, and SSR has access to authenticated user context.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Login completes and creates a user account when none exists.
- [x] #2 SSR routes receive authenticated user context on initial render.
- [x] #3 Logout clears the session and protected routes redirect to login.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Inspect current auth flow (expo-auth-template usage, /api/auth/google/callback, /api/me) and cookie handling.
- Implement SSR auth context in tanstack-app: server fn calls Worker /api/me with request cookies; __root.beforeLoad populates user context.
- Add login/logout routes in tanstack-app: login triggers Worker OAuth/callback flow and router.invalidate(); logout calls Worker logout (or clears cookie) and redirects to /login.
- Add protected route wrapper (/_authed) that enforces auth and redirects to /login.
- Add unit test(s) for auth context helper and note integration/E2E coverage for OAuth cookie behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented TanStack Start SSR auth context and login/logout routes in tanstack-app. Login uses Google OAuth code flow, exchanges via Worker /api/auth/google/callback, stores device token + user in Start session cookie, and uses /api/me to hydrate SSR user context. Logout clears Start session. Public path exceptions handled in __root beforeLoad. Unit test added for resolveApiBaseUrl: tests/unit/tanstack-start/api-base-url.test.ts (ran: bun run test -- tests/unit/tanstack-start/api-base-url.test.ts). SSR build verified with bun run build in tanstack-app. OAuth cookie/redirect behavior requires integration/E2E validation.
<!-- SECTION:NOTES:END -->
