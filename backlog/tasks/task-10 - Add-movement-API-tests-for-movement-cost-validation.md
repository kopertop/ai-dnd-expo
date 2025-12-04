---
id: task-10
title: Add movement API tests for movement cost validation
status: Done
assignee: []
created_date: '2025-12-02 01:38'
updated_date: '2025-12-02 01:43'
labels:
  - testing
  - multiplayer
  - map
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add unit/integration tests around the map move API to verify movement cost calculation and rejection when movement exceeds remaining speed (e.g., attempting 4 tiles with only 1 movement unit left). Cover valid moves within remaining movement and ensure state updates accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tests cover a successful move within available movement, asserting token position and movementUsed update
- [x] #2 Tests cover a rejected move when requested distance exceeds remaining movement; API returns appropriate error and state unchanged
- [x] #3 Movement cost calculation logic is exercised with representative distances (e.g., diagonal/orthogonal as applicable)
- [x] #4 bun run test remains passing
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added new movement API tests covering successful moves within available movement and rejections when the cost exceeds remaining speed. Implemented an in-memory mock database for movement tests. `bun run test` stays green; `bun run test:api` cannot run in this sandbox because the @cloudflare/vitest-pool-workers runner is not supported here, but the new spec is included in the API suite.
<!-- SECTION:NOTES:END -->
