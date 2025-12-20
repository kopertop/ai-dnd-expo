---
id: task-29.2
title: Route and layout migration (Expo Router -> TanStack Start)
status: Done
assignee:
  - codex
created_date: '2025-12-19 14:23'
updated_date: '2025-12-20 01:19'
labels: []
dependencies: []
parent_task_id: task-29
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migrate routing and layouts to TanStack Router/Start so all current routes resolve correctly, including pathless groups and dynamic segments.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All existing routes resolve to the expected paths in TanStack Start.
- [x] #2 Pathless layout and tab group behavior matches current navigation.
- [x] #3 Not-found and redirect behavior matches current app expectations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Inventory all Expo routes in `app/` (including dynamic segments, pathless groups, and tab groups) and build a route matrix.
- Compare against current TanStack Start routes in `src/routes` and identify missing/mismatched paths/layouts.
- Implement missing TanStack route files and layout groupings to mirror Expo behavior (pathless groups, tabs, redirects).
- Verify not-found + redirect behavior against Expo expectations.
- Run `bun run check`, run relevant route tests if present, then commit + push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Rebuilt `src/routes` to mirror Expo paths, added tab group layout under `/game/(tabs)`, and removed sample routes.
- Regenerated `src/routeTree.gen.ts` and verified `bun run check` passes.
<!-- SECTION:NOTES:END -->
