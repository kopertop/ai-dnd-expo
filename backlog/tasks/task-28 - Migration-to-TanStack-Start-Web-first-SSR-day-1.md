---
id: task-28
title: 'Migration to TanStack Start (Web-first, SSR day 1)'
status: To Do
assignee: []
created_date: '2025-12-18 21:57'
updated_date: '2025-12-18 21:58'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define and maintain the migration plan to remove Expo/React Native specific code and move the app to TanStack Start with SSR, while retaining the Cloudflare Worker + DB for shared maps/assets and game coordination. Web is the primary target with Tauri deferred until after web parity.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Migration plan document reflects web-first, SSR day 1, and Cloudflare Worker/DB retention.
- [ ] #2 Decision log records agreed constraints (TanStack Start primary, cookies, Tauri later).
- [ ] #3 Task references the plan and decision log documents.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plan doc: doc-1 (Migration Plan: Expo/RN to TanStack Start (Web-first))
Decision log: doc-2 (Migration Decision Log: TanStack Start Web-first)
Key constraints: web-first, SSR day 1, cookies for auth, Cloudflare Worker + DB for shared maps/assets/games, remove RN/Expo-specific code where possible.
<!-- SECTION:NOTES:END -->
