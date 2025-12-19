---
id: task-29.1
title: Auth + account creation with SSR cookie context
status: In Progress
assignee:
  - codex
created_date: '2025-12-19 14:23'
updated_date: '2025-12-19 14:26'
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
- [ ] #1 Login completes and creates a user account when none exists.
- [ ] #2 SSR routes receive authenticated user context on initial render.
- [ ] #3 Logout clears the session and protected routes redirect to login.
<!-- AC:END -->
