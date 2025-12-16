---
id: task-27
title: Add unit tests for map UI components
status: Done
assignee:
  - '@cmoyer'
created_date: '2025-12-15 13:33'
updated_date: '2025-12-15 14:04'
labels:
  - testing
  - frontend
  - map
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add robust unit tests and test hooks for map UI components (interactive-map, tile-action-menu, tile-details-modal, and related tab bar/icon UI helpers) to increase coverage and catch regressions in map interactions and common UI scaffolding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Interactive map renders grid, handles tile press/hover, and dispatches selection/highlight callbacks with correct coordinates.
- [x] #2 Tile action menu renders expected actions for terrain/object context and fires callbacks when pressed.
- [x] #3 Tile details modal displays and updates tile state (terrain type, fog/cover, movement flags) via controlled inputs with test hooks.
- [x] #4 UI helper components (accordion, confirm-modal, icon-symbol) are covered with smoke/behavior tests and necessary testIDs/accessibility labels are added if missing.
- [x] #5 Vitest suite runs green with new tests; coverage for components/map and components/ui increases from 0% to measurable coverage.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- [x] Add testIDs to interactive-map, tile-action-menu, tile-details-modal, accordion, and confirm-modal for deterministic queries.
- [x] Extend react-native/test setup mocks (Modal, Switch, useWindowDimensions, PanResponder) and alias react-native to mocks in Vitest config.
- [x] Add unit tests covering interactive-map tile rendering/press/reachable overlays, tile-action-menu actions/empty state, tile-details-modal metadata visibility, and UI helpers (accordion, confirm-modal, icon-symbol, tab-bar background shim).
- [x] Run `bun run test` and `bun run test:coverage` to verify suite passes and map/ui coverage increases.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added test hooks across map UI components and UI helpers. New tests in tests/unit/components/map/ui-map-components.test.tsx validate interactive map tile presses and reachable highlights, tile action menu callbacks/empty state, tile details metadata visibility per host, accordion toggling, confirm modal confirm/cancel, icon-symbol platform fallback, and tab bar background shim. React Native mock now includes Modal, Switch, useWindowDimensions, PanResponder; Vitest aliases react-native to the mock and excludes it from optimizeDeps. Coverage after run: components/map ~58% lines (interactive-map ~43, tile-action-menu 100, tile-details-modal ~99); components/ui ~82% lines (accordion/confirm-modal/icon-symbol/tab-bar background at 100%, iOS shims still 0). All suites pass under `bun run test` and `bun run test:coverage`.
<!-- SECTION:NOTES:END -->
