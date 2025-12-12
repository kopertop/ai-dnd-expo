---
id: task-12
title: Stabilize test suites and fix failing tests
status: Done
assignee: []
created_date: '2025-12-02 17:59'
updated_date: '2025-12-10 23:26'
labels:
  - tests
  - stability
dependencies: []
priority: high
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review current failing checks and tests, fix underlying issues (code or tests) so both `bun run check` and `bun run test` / `bun run test:api` pass cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run check` completes without errors
- [x] #2 `bun run test` passes all suites locally
- [x] #3 `bun run test:api` passes all API/worker suites locally
- [x] #4 Document any notable test fixes or code changes in task notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed stub simplifications and test harness updates. `bun run check`, `bun run test`, and `bun run test:api` now pass locally. AI service stubs and related hooks were updated to remove ONNX/Gemma reliance. Added vector icon mocks to stabilize frontend tests.
<!-- SECTION:NOTES:END -->
