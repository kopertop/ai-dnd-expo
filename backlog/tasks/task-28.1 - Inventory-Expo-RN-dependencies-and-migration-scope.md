---
id: task-28.1
title: Inventory Expo/RN dependencies and migration scope
status: Done
assignee:
  - codex
created_date: '2025-12-18 22:00'
updated_date: '2025-12-18 22:28'
labels: []
dependencies: []
parent_task_id: task-28
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document all Expo/React Native dependencies, RN-specific components, and platform APIs in use, then classify each as replaceable, removable, or requiring a web-specific rewrite. Capture known blockers and open questions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inventory lists Expo/RN dependencies with replacement/removal decisions.
- [x] #2 RN-specific routes/components/hooks are enumerated with migration notes.
- [x] #3 Known blockers and open questions are documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Scan package.json for expo/react-native deps and classify replace/remove/rewire.
- Search codebase for expo-/react-native imports in app/components/hooks/stores/services/adapters; list RN-only files/routes.
- Create Backlog doc "Expo/RN Inventory" with dependency decisions, RN-specific routes/components/hooks, blockers/questions.
- Link doc in task notes, check acceptance criteria, commit and push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inventory doc: doc-3 (Expo/RN Inventory (Dependencies + RN-specific Usage))
<!-- SECTION:NOTES:END -->
