---
id: task-8
title: Fix typecheck/lint failures in bun run check
status: Done
assignee: []
created_date: '2025-12-02 01:09'
updated_date: '2025-12-02 01:19'
labels:
  - bug
  - tech-debt
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Resolve the current TypeScript errors surfaced by `bun run check`, including missing properties on character/companion data, map token schema mismatches, mapState nullability, and icon/type issues in character sheet components.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 bun run check completes without errors
- [x] #2 Updated types align with character/companion and map token schemas (including prepared spells, status effects)
- [x] #3 Nullability for map state responses handled safely in multiplayer game flows
- [x] #4 Character sheet components render without type errors for icons and error text
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Resolved TypeScript failures by adding missing preparedSpells/status_effects fields, guarding null mapState responses, and correcting character sheet inventory rendering for equipped items and error handling. Bumped expo-audio to ~1.0.15 to satisfy expo-doctor; `bun run check` now passes.
<!-- SECTION:NOTES:END -->
