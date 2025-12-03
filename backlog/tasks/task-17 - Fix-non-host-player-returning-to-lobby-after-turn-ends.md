---
id: task-17
title: Fix non-host player returning to lobby after turn ends
status: In Progress
assignee:
  - cmoyer
created_date: '2025-12-03 22:43'
updated_date: '2025-12-03 23:16'
labels:
  - bug
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Players who are not the host get bounced back to the lobby-style view when a turn ends / state refresh occurs during an active game. Investigate the turn change/state sync logic that sets lobby/game screens and update it so non-host players remain on the map during turn transitions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Reproduce cause of non-host player being sent to lobby when a turn ends
- [ ] #2 Update state/turn change handling so active non-host clients stay on the game map during refreshes
- [ ] #3 Verify host and non-host clients transition turns without being forced to lobby in active sessions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fixed roster source dropping players on refresh: game state now merges DB game_players with stored state before responses so late-join/non-host users stay present when turns advance.

WebSocket token now includes email by awaiting authService user/session and falling back to 'unknown' to avoid blank token segments.

Adjusted websocket URL builder to use the API base origin (strips /api path) so clients connect to /party/game-room/* instead of /api/party/…; keeps email-bearing token.

Enabled DM to auto-connect websockets by using hostId when playerId is absent; connection no longer requires characterId.
<!-- SECTION:NOTES:END -->
