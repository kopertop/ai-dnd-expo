---
id: task-3
title: Add basic attacks (melee and ranged) for players and NPCs
status: Done
assignee: []
created_date: '2025-11-25 01:32'
updated_date: '2025-12-10 23:26'
labels:
  - feature
  - combat
  - attacks
dependencies: []
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement basic attack actions (melee and ranged) accessible from the action menu for players (on their turn) and DM-controlled NPCs. Handle range checks, hit/miss resolution, and turn resource usage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Basic attack actions appear when an enemy is in valid melee/ranged range; out-of-range actions are blocked with feedback.
- [ ] #2 Backend resolves attack, applies damage, and updates turn usage (major action) with state reflected to clients.
- [ ] #3 Ranged vs melee logic accounts for distance thresholds; UI makes the distinction clear.
- [ ] #4 Errors are surfaced when attacks are invalid (e.g., no target, out of range, insufficient actions).
<!-- AC:END -->
