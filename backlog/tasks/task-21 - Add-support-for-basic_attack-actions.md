---
id: task-21
title: Add support for "basic_attack" actions
status: To Do
assignee: []
created_date: '2025-12-05 03:22'
updated_date: '2025-12-05 03:22'
labels: []
dependencies: []
priority: medium
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the frontend issues a "basic_attack", the backend needs to validate the attack is possible, and if so run a dice-roll based on the attacking player, using modifiers for the equipped weapon (if available) and strength or dexterity modifiers (depending on the weapon, ranged using dex, melee using str). total calculation should be diceroll + attribute modifier.

Attack rolls should also be a 1d20 to see if it hits (or crits) a 1 automatically misses, a 20 automatically hits AND does maximum damage (i.e. the top dice roll plus modifier, plus any crit modifiers if available).

All roll details should be returned to the frontend to see what was rolled, as well as the final stats (i.e. how much damage happened, if it was a crit hit or crit miss, etc).

Damage should be automatically calculated and then applied, as well as taking the major action away from the attacking character (note that they NEED that major action to even do the action).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Issuing an attack with an available major action should trigger an attack
- [ ] #2 Issuing an attack WITHOUT a major action available should reject the call
- [ ] #3 A 1d20 roll of 1 should be marked a CRITICAL MISS and not do any damage
- [ ] #4 A 1d20 roll of 20 should be marked a CRITICAL HIT and automatically do maximum damage
- [ ] #5 Any roll between a 1 and 20 should calculate agains the target Armor Class (i.e. if the target has an AC of 10, they need above a 10 to hit), including any modifiers (str for meelee, dex for ranged)
<!-- AC:END -->
