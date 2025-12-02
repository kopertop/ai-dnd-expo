---
id: task-9
title: Fix failing automated test suite (`bun run test`)
status: Done
assignee: []
created_date: '2025-12-02 01:26'
updated_date: '2025-12-02 01:31'
labels:
  - bug
  - testing
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review and repair all automated tests so that `bun run test` executes successfully without errors or failures. Address flaky or broken tests, update fixtures/mocks, and align implementations as needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 bun run test completes with exit code 0
- [x] #2 All previously failing tests are fixed or updated appropriately (no skipped regressions added)
- [x] #3 Relevant mocks/fixtures updated to match current schema and behaviors
- [x] #4 Document any notable changes or risk areas discovered during test fixes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
`bun run test` was failing before tests could load due to esbuild binary being killed in the sandbox. Added a wasm-based fallback (esbuild-wasm@0.25.6) and set ESBUILD_BINARY_PATH in the test scripts (and config) so Vitest can start without native binaries. All unit tests now pass locally.
<!-- SECTION:NOTES:END -->
