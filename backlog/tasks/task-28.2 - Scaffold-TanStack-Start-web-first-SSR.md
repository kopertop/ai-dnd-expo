---
id: task-28.2
title: Scaffold TanStack Start (web-first SSR)
status: Done
assignee:
  - codex
created_date: '2025-12-18 22:00'
updated_date: '2025-12-19 13:44'
labels: []
dependencies: []
parent_task_id: task-28
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the TanStack Start app scaffold focused on web SSR as the primary target, with baseline routing, server entry, and configuration needed to run locally against existing services.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 TanStack Start app scaffold exists and boots in SSR mode locally.
- [x] #2 Baseline routing/layout renders in SSR with a placeholder route.
- [x] #3 Env/config placeholders for API base URL are defined for local dev.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Scaffold `tanstack-app` using `npx gitpick TanStack/router/tree/main/examples/react/start-basic-react-query tanstack-app` (TanStack Start + React Query SSR example).
- Install deps in `tanstack-app` with bun.
- Confirm baseline route/layout; add a minimal placeholder route if needed.
- Add `tanstack-app/.env.example` with `VITE_API_BASE_URL` pointing to local Worker (default 8787).
- Verify SSR build via `bun run build`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Cloned tanstack-app from TanStack/router example with-trpc-react-query. It uses TanStack Router + Express SSR (not TanStack Start). Need confirmation whether to keep this scaffold or switch to a TanStack Start template and port tRPC/React Query.

Scaffolded tanstack-app from TanStack Start start-basic-react-query. Added tanstack-app/.env.example with VITE_API_BASE_URL (localhost:8787). Verified SSR build via `bun run build`.
<!-- SECTION:NOTES:END -->
