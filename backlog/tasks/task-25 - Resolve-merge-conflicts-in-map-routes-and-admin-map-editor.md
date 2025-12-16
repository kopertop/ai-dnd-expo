---
id: task-25
title: Resolve merge conflicts in map routes and admin map editor
status: Done
assignee: []
created_date: '2025-12-13 00:42'
updated_date: '2025-12-16 14:47'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix outstanding merge conflicts in API map routes and admin map editor screen, reconcile imports and save logic, and ensure code compiles.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Resolved remaining merge conflict in tile property editor by merging ThemedView/ScrollView styling with width handling.

Verified API security fixes for images and game join remain staged; ensured worlds route types updated for HonoContext.

Ran `bun run test:api` (full suite) successfully; earlier filter/grep flags unsupported.
<!-- SECTION:NOTES:END -->
