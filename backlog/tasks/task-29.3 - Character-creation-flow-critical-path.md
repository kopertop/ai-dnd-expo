---
id: task-29.3
title: Character creation flow (critical path)
status: Done
assignee: []
created_date: '2025-12-19 14:23'
updated_date: '2025-12-20 14:58'
labels: []
dependencies: []
parent_task_id: task-29
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the character creation experience in the TanStack Start app with parity to the current flow, including templates and persistence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Users can complete character creation and persist data.
- [x] #2 Created characters appear in the character list and can be selected in game flows.
- [x] #3 Validation and error states behave consistently with the current app.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added web-safe character option data in `src/data/character-options.ts` and server helpers in `src/utils/characters.ts` for listing/creating characters via session auth.
- Implemented TanStack Start character creation flow UI (`src/components/character-creation-flow.tsx`) and wired `/new-character` routes to persist characters and update URLs.
- Updated character list/detail routes to fetch and display created characters with React Query loaders.

- Added asset-backed icons for races/classes/traits/skills in `src/data/character-options.ts`, enforced 4-skill selection limit, and defaulted attribute selection to the standard array in `src/components/character-creation-flow.tsx`.

- Added ability score/modifier summary on the skills step with bonus highlighting, and show ability modifiers on each skill card in `src/components/character-creation-flow.tsx`.

Added random name/background buttons on the Character step using existing generators from `constants/character-names.ts` and `constants/backgrounds.ts`.
<!-- SECTION:NOTES:END -->
