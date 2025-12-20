---
id: task-29.10
title: Global layout + user menu in TanStack Start shell
status: Done
assignee:
  - '@codex'
created_date: '2025-12-20 01:25'
updated_date: '2025-12-20 01:44'
labels: []
dependencies: []
parent_task_id: task-29
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the main TanStack Start app shell layout (header/navigation) and add the authenticated user menu in the upper-right with logout and optional admin link to match Expo behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Global layout renders a consistent header/nav on authenticated routes.
- [x] #2 Header includes user menu with display name/avatar fallback, admin link when applicable, and logout action.
- [x] #3 Layout respects auth guard behavior and works on mobile/desktop.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added `src/components/app-shell.tsx` with header navigation and user dropdown (admin link + logout) and wired it into `src/routes/__root.tsx`.
- Updated `src/components/route-shell.tsx` to avoid nested `<main>` tags in the new layout.

- Added Admin link to the top nav for admin users in `src/components/app-shell.tsx`.
<!-- SECTION:NOTES:END -->
