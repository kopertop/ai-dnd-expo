---
id: task-28.3
title: Define Worker/DB boundary and local dev parity
status: To Do
assignee: []
created_date: '2025-12-18 22:01'
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
- [ ] #1 Worker/DB responsibilities and owned endpoints are documented.
- [ ] #2 TanStack Start ↔ Worker API boundary is defined and stable for migration.
- [ ] #3 Local dev expectations (wrangler/Miniflare, env vars) are documented.
<!-- AC:END -->
