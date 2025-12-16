---
id: task-15
title: Add full icon support for characters/NPCs across backend and map UI
status: Done
assignee: []
created_date: '2025-12-03 15:55'
updated_date: '2025-12-10 23:26'
labels: []
dependencies: []
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add ability to set icon (vector name or URL) for characters and NPCs, persist in backend, and display consistently in map tokens and character panels. Include DB migration, API create/update paths, UI controls for DM and players, and ensure map metadata merges characters' icon info so tokens show icons. Allow DM to delete/re-add tokens cleanly. Fix tests accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New DB schema supports icon field for characters and NPCs (migration added)
- [x] #2 API create/update endpoints accept and persist icon for characters and NPCs without breaking existing fields
- [x] #3 DM Controls and player character flows allow setting/changing icon; dropdown/input visible in DM action modal and player edit
- [x] #4 Character list and map tokens render icons when provided (vector names or URLs), falling back to initials otherwise
- [x] #5 Map token metadata merges character icon info from characters array; tokens created/updated retain existing metadata fields
- [x] #6 DM can delete tokens from map to re-add with new icon; operations succeed without errors
- [x] #7 Automated tests updated/added and passing (bun run test, bun run test:api)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented icon fields end-to-end: added DB columns via migration, updated schema adapters, and ensured NPC data include icons.

API create/update routes for characters and NPCs now accept/persist icons; map route merges character icons into token metadata without overwriting existing metadata.

DM/player UIs allow setting/changing icons; DM action modal and player character editor wired to picker.

Character list and map tokens render icons from metadata/icon fields; fallback to initials when unset; DM can delete tokens via token detail modal and re-add.

Tests and checks now pass (`bun run check`, `bun run test`, `bun run test:api`).
<!-- SECTION:NOTES:END -->
