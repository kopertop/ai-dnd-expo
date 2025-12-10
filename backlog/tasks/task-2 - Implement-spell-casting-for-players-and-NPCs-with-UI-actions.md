---
id: task-2
title: Implement spell casting for players and NPCs with UI actions
status: To Do
assignee: []
created_date: '2025-11-25 01:32'
updated_date: '2025-12-05 03:22'
labels:
  - feature
  - combat
  - spells
dependencies: []
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enable casting spells from the map/action menu for both player characters and NPCs, including targeting, validation, turn resource updates, and backend integration. Ensure the DM can trigger spell casts on NPC turns and players can cast on their own turns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Spell actions available in the action menu for eligible entities (players on their turn, DM on active turn).
- [ ] #2 Backend call performs spell cast and updates turn usage (major action) and state is reflected on clients.
- [ ] #3 Targeting/validation prevents out-of-range or invalid targets and shows appropriate errors.
- [ ] #4 UI reflects cast results (success/fail) and updates cooldowns/resources if applicable.
<!-- AC:END -->
