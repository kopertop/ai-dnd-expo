---
id: task-13
title: Enable DM drag-and-drop token repositioning in DM Action Mode
status: To Do
assignee: []
created_date: '2025-12-02 21:27'
updated_date: '2025-12-03 00:55'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
DMs should be able to drag any token on the battle map to a new, unblocked position while in DM Action Mode. Drops onto blocked/occupied spaces must be rejected gracefully, and movement should resolve the active token via either entityId or token id so NPC turns work. The move needs to sync to the shared session state so all clients reflect the new position immediately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Drag-and-drop is enabled for DMs when DM Action Mode is active, and dragging a token snaps to the intended map coordinate on drop.
- [ ] #2 Dropping on blocked/occupied tiles is prevented: the token remains at its prior position and the DM receives clear feedback (UI affordance or message).
- [ ] #3 Movement resolution uses the active turn token id (supporting both entityId and id lookups) so NPC turns and player tokens can be moved without errors.
- [ ] #4 Successful drops persist and broadcast to other connected clients/spectators; all viewers see the updated token position without a refresh.
- [ ] #5 Outside DM Action Mode, players cannot drag tokens to bypass movement rules; DM-only drag controls are gated appropriately.
- [ ] #6 Automated coverage added: at least one unit/logic test for blocked vs open drop handling and one UI/integration test that verifies DM Action Mode drag-drop updates the token position and rejects blocked tiles.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Audit DM Action Mode gating and current map token interactions (drag/press handlers, blocked/occupancy checks, and how active turn tokens are resolved by entityId vs id) to decide where to attach DM-only drag.
- Implement DM drag/drop: enable DM Action Mode to start a drag on any token, translate the drop target to map coordinates, resolve the active turn token id, and call the movement update while enforcing blocked/occupied-space rejection with user feedback.
- Persist and broadcast the new position through the shared/durable session so all clients update live; ensure token snapshots/turn state remain consistent after manual moves.
- Add automated coverage: unit/logic test for drop handler (blocked vs open, entityId vs token id resolution) and UI/integration test that a DM in Action Mode can drag-drop to an open tile, sees rejection on blocked tiles, and players cannot bypass the gate.
<!-- SECTION:PLAN:END -->
