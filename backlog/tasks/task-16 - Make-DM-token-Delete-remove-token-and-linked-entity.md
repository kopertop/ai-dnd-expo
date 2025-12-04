---
id: task-16
title: Make DM token Delete remove token and linked entity
status: Done
assignee: []
created_date: '2025-12-03 16:31'
updated_date: '2025-12-03 16:44'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable the Delete button in the token detail modal for hosts/DMs so that confirming deletion removes the token and its corresponding NPC/character from the current game session.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Delete button prompts a confirmation before removal.
- [x] #2 On confirm, the token is removed from the game board and active session state.
- [x] #3 Associated NPC/character data for the token is removed from the session (and turn data/lookup) so the entity cannot act.
- [x] #4 Non-host players cannot trigger deletion.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Delete endpoint now removes related entity state/player membership when hosts remove tokens, clearing initiative/turn pointers and map tokens; verified via targeted API test.
<!-- SECTION:NOTES:END -->
