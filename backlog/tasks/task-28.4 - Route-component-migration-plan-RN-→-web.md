---
id: task-28.4
title: Route/component migration plan (RN → web)
status: Done
assignee:
  - codex
created_date: '2025-12-18 22:01'
updated_date: '2025-12-19 13:57'
labels: []
dependencies: []
parent_task_id: task-28
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Map Expo Router routes to TanStack Router routes and outline RN → web component rewrites, including hooks/stores/services that need refactoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Route mapping from Expo Router to TanStack Router is documented.
- [x] #2 RN-only components and UI elements are flagged for rewrite.
- [x] #3 Hooks/stores/services migration list is documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Map Expo Router routes in app/ to TanStack Router paths and document mapping rules.
- Summarize RN-only components/UI elements from doc-3 and group by rewrite complexity.
- List hooks/stores/services needing refactor based on RN/Expo usage.
- Create Backlog doc "Route + Component Migration Map (RN → Web)" noting which assumptions require integration/E2E validation.
- Link doc in task notes, add follow-up test notes for non-unit-testable assumptions, mark acceptance criteria, commit, push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Migration map doc: doc-5 (Route + Component Migration Map (RN to Web))
<!-- SECTION:NOTES:END -->
