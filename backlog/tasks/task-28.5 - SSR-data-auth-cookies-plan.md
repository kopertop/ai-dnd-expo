---
id: task-28.5
title: SSR data + auth cookies plan
status: Done
assignee:
  - codex
created_date: '2025-12-18 22:01'
updated_date: '2025-12-19 14:09'
labels: []
dependencies: []
parent_task_id: task-28
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define SSR data loading (TanStack Query prefetch/hydration) and cookie-based auth/session handling that works on server and client.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SSR data strategy with prefetch/hydration is documented.
- [x] #2 Cookie auth/session flow is defined for server and client contexts.
- [x] #3 Authenticated vs unauthenticated routes are identified.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Clone start-basic-auth example via `npx gitpick TanStack/router/tree/main/examples/react/start-basic-auth start-basic-auth` and review auth patterns.
- Draft Backlog doc "SSR Data + Cookie Auth Plan" covering TanStack Query SSR prefetch/hydration, cookie handling on server/client, and route auth matrix.
- Incorporate relevant start-basic-auth patterns (cookies/session, server handlers, hooks) where they fit.
- Note assumptions requiring integration/E2E validation.
- Link doc in task notes, check acceptance criteria, commit, and push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SSR/auth plan doc: doc-6 (SSR Data + Cookie Auth Plan (TanStack Start))
<!-- SECTION:NOTES:END -->
