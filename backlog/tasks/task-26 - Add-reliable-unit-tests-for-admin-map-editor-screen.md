---
id: task-26
title: Add reliable unit tests for admin map editor screen
status: Done
assignee:
  - cmoyer
created_date: '2025-12-14 16:14'
updated_date: '2025-12-15 14:04'
labels:
  - testing
  - frontend
  - map
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add robust unit tests for the admin Map Editor screen so interactions and save payload shaping are verified without relying on nonexistent selectors, pushing coverage close to 100% for that screen.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Loading state is testable and covered, asserting the loading indicator renders until data fetch completes or fails.
- [x] #2 Toolbar tool switching is covered with selectors that exist in the UI, and active tool state drives the rendered sidebar content accordingly.
- [x] #3 Terrain painting and tile selection behaviors are tested, including toggling/clearing tiles and updating tile properties via inputs/switches.
- [x] #4 Object tool flows are tested end-to-end: upload callback adds an object, coordinates are editable, and removal updates rendered objects.
- [x] #5 Save behavior is tested for both update and create flows, including payload shape for grid/tiles/tokens and user feedback when requests succeed or fail.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- [x] Fix Vitest Cloudflare scheme resolution so API suites load reliably.
- [x] Stub @expo/vector-icons for React Native unit tests to avoid JSX parse errors.
- [x] Re-run `bun run test` and capture coverage for MapEditor and related utilities.
- [x] Add/adjust MapEditorScreen tests to cover loading, tool switching, painting, object flows, and save payloads; address any remaining gaps found in coverage run.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added data-testid hooks across MapEditorScreen (loading indicator, toolbar tools, grid/terrain/object inputs, save) and strengthened react-native/react-native-svg mocks plus toolbar/accessory mocks. Implemented unit tests for load success/error, tool switching, terrain paint/clear with tile properties, object add/edit/remove, and save PATCH/POST payloads. Ran `bun run test tests/unit/app/admin/maps/map-editor-screen.test.tsx` successfully.

Stabilized the broader suite by mocking PartyServer/Cloudflare scheme resolution for API tests, adding vector icon shims and asset mocks for React Native tests, and rerunning `bun run test` and `bun run test:coverage` (all suites passing).

Full suite remains green after recent map/ui test additions; MapEditorScreen coverage and selectors remain stable with added testIDs.
<!-- SECTION:NOTES:END -->
