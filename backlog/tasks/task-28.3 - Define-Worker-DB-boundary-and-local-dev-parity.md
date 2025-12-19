---
id: task-28.3
title: Define Worker/DB boundary and local dev parity
status: Done
assignee:
  - codex
created_date: '2025-12-18 22:01'
updated_date: '2025-12-19 13:50'
labels: []
dependencies: []
parent_task_id: task-28
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the API boundary between TanStack Start and the Cloudflare Worker + DB so shared maps/assets/games remain in the Worker. Document local dev parity expectations and required configs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Worker/DB responsibilities and owned endpoints are documented.
- [x] #2 TanStack Start ↔ Worker API boundary is defined and stable for migration.
- [x] #3 Local dev expectations (wrangler/Miniflare, env vars) are documented.

- [x] #4 Unit tests validate documented boundary assumptions (API base URL defaults, production relative paths, and overrides).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Review api/src/index.ts, api/src/routes/*, api/src/env.d.ts, and wrangler.api.toml to document Worker responsibilities, bindings, and API surface.
- Draft Backlog doc "Worker/DB Boundary + Local Dev Parity" covering ownership (Worker/DB), Start ↔ Worker boundary, and local dev expectations/ports/env vars.
- Add unit tests for services/config/api-base-url.ts to lock boundary assumptions (local dev default, production relative path, explicit override).
- Link doc in task notes, check acceptance criteria, run unit tests, commit, and push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Boundary doc: doc-4 (Worker/DB Boundary + Local Dev Parity)

Unit tests added: tests/unit/services/config/api-base-url.test.ts (covers explicit override, dev default localhost:8787/api, production relative /api). Ran: bun run test:services -- tests/unit/services/config/api-base-url.test.ts
<!-- SECTION:NOTES:END -->
