---
id: task-29
title: Implement TanStack Start migration with full feature parity
status: To Do
assignee: []
created_date: '2025-12-19 14:23'
updated_date: '2025-12-20 00:12'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deliver a full-featured TanStack Start web app (SSR day 1) that matches current Expo app functionality while retaining the Worker/DB backend for shared maps/assets/games. Includes auth/account creation, admin tools, character creation, gameplay, assets, and realtime.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All current application routes are available and functional in the TanStack Start web app.
- [ ] #2 Users can log in and accounts are auto-created on first login.
- [ ] #3 Admin users can create and modify worlds/maps/assets via the web UI.
- [ ] #4 Character creation flow completes end-to-end and persists data.
- [ ] #5 Core gameplay flows (join/host game, map interactions, actions, chat) are functional.
- [ ] #6 Feature parity is validated via the defined test plan/E2E coverage.

- [ ] #7 Expo app is removed/decommissioned and TanStack Start is the primary runtime/entrypoint
<!-- AC:END -->
