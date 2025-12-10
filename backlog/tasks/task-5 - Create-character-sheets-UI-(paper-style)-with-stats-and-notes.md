---
id: task-5
title: Create character sheets UI (paper-style) with stats and notes
status: In Progress
assignee: []
created_date: '2025-11-25 01:33'
updated_date: '2025-12-04 20:22'
labels:
  - feature
  - ui
  - character
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build an in-app character sheet that mimics a paper sheet: ability scores, skills, HP/AC, inventory overview, spells/abilities, notes. Support both player and NPC views (read-only for others where appropriate).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Character sheet presents core attributes (abilities, skills, HP/AC, speed, proficiencies) in a paper-style layout.
- [ ] #2 Displays inventory/equipment summary and spells/abilities relevant to the character.
- [ ] #3 Supports read-only view for other users and DM; owner/DM can edit where permitted.
- [ ] #4 Works on mobile and web layouts with clear typography and section hierarchy.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Starting home page integration of character sheet access; will present characters inline and open sheet UI styled after D&D 5e. Work in branch custom-draggable.

Added D&D-style CharacterSheet5e component and new /characters/[id] screen to render sheets with ability scores, skills, equipment, spells, and inventory for a selected character; home now links directly to this sheet.
<!-- SECTION:NOTES:END -->
