---
id: task-22
title: Add animated dice roll display for combat results with reroll support
status: Done
assignee: []
created_date: '2025-12-05 14:32'
updated_date: '2025-12-05 18:17'
labels:
  - frontend
  - combat
  - ui
  - dice
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When combat actions (basic_attack, spells, etc.) return roll data, show an in-app dice roll animation in the modal instead of static numbers. The modal should stay open with a close/confirm button; some characters may have a special skill to re-roll critical failures. Implement frontend UI to animate dice, display totals/outcomes, and handle reroll affordance for eligible characters without breaking existing flows.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented animated combat result modal that spins/reveals attack and damage dice, highlights critical hits/fumbles, shows natural d20 values, and surfaces target health plus damage breakdown. Added reroll affordance for characters with reroll_critical_failure/lucky skills by replaying the last action request. Attempted tests: `bun test api/tests/games-dice-dm-roll.spec.ts api/tests/games-basic-attack.spec.ts` (fails locally: missing dependency `cloudflare:test`).
<!-- SECTION:NOTES:END -->
