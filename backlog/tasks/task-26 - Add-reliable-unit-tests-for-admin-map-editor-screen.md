---
id: task-26
title: Add reliable unit tests for admin map editor screen
status: In Progress
assignee:
  - cmoyer
created_date: '2025-12-14 16:14'
updated_date: '2025-12-14 23:32'
labels: []
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
Next steps to finish stabilization and coverage:
- Fix Vitest API runner resolution for `cloudflare:test` by enforcing shim redirect (alias + Module resolver) so API suites load without scheme errors.
- Stub @expo/vector-icons for React Native unit tests (e.g., Collapsible) so Vitest doesn't parse JSX from the library.
- Re-run full `bun run test` to ensure all suites pass; capture coverage numbers for MapEditor and nearby utilities.
- Identify any remaining high-value gaps and add tests if needed to keep coverage high for MapEditor and related hooks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added data-testid hooks across MapEditorScreen (loading indicator, toolbar tools, grid/terrain/object inputs, save) and strengthened react-native/react-native-svg mocks plus toolbar/accessory mocks. Implemented unit tests for load success/error, tool switching, terrain paint/clear with tile properties, object add/edit/remove, and save PATCH/POST payloads. Ran `bun run test tests/unit/app/admin/maps/map-editor-screen.test.tsx` successfully.

Stabilized the broader suite by mocking PartyServer/Cloudflare scheme resolution for API tests, adding vector icon shims and asset mocks for React Native tests, and rerunning `bun run test` and `bun run test:coverage` (all suites passing).
<!-- SECTION:NOTES:END -->
