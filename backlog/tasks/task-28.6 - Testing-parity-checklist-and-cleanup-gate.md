---
id: task-28.6
title: Testing/parity checklist and cleanup gate
status: Done
assignee:
  - codex
created_date: '2025-12-18 22:01'
updated_date: '2025-12-19 14:14'
labels: []
dependencies: []
parent_task_id: task-28
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the test plan and parity checklist needed before removing Expo/RN code, and establish a cleanup gate and rollback criteria.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Parity checklist is documented for core user flows.
- [x] #2 Test plan covers unit/integration and Playwright E2E for SSR web.
- [x] #3 Cleanup gate and rollback criteria are documented.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Draft Backlog doc "Testing + Parity Gate" with parity checklist for core flows, SSR web test plan (unit/integration/Playwright), and cleanup/rollback gates.
- Note assumptions requiring integration/E2E validation.
- Link doc in task notes, check acceptance criteria, commit, push.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Testing/parity doc: doc-7 (Testing + Parity Gate (RN to Web))
<!-- SECTION:NOTES:END -->
