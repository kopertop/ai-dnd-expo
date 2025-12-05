---
id: task-19
title: Revamp character sheet to 5e layout with editable equipment
status: To Do
assignee: []
created_date: '2025-12-04 20:45'
updated_date: '2025-12-05 03:22'
labels:
  - feature
  - ui
  - character-sheet
dependencies: []
priority: high
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Redesign the character detail page to mirror the core layout of the official 5e character sheet while keeping it responsive. Surface key sections (stats, skills, combat block, equipment, features, and personality) with an updated visual hierarchy. Allow editing where appropriate, including equipping and unequipping owned gear directly from the sheet with backend persistence and stat updates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Character detail page reflects the primary sections of the official 5e sheet (abilities, saves/skills, AC/initiative/speed/HP, attacks/spells, equipment/treasure, features/traits/personality) with responsive styling.
- [ ] #2 Editable controls exist where appropriate (e.g., equipment slots, notes/traits sections, possibly hit points) without breaking read-only values; layout holds up on mobile and tablet.
- [ ] #3 Equipment section shows owned items and supports equip/unequip from the sheet; updates persist to the backend and reflect in derived stats/bonuses.
- [ ] #4 Sheet loads with current character data and shows loading/error states; navigation back to My Characters still works.
<!-- AC:END -->
