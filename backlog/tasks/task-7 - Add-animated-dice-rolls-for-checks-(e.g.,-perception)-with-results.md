---
id: task-7
title: 'Add animated dice rolls for checks (e.g., perception) with results'
status: To Do
assignee: []
created_date: '2025-11-25 01:33'
labels:
  - feature
  - ui
  - dice
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement dice roll UX with animations for checks (perception, etc.). Triggered from relevant actions and shows both animation and numeric result breakdown. Works offline/local without external services.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dice roll UI shows an animation and displays the final roll breakdown (e.g., d20 + modifiers) for checks like perception.
- [ ] #2 Usable from existing roll entry points (e.g., perception check action) and reusable for other checks.
- [ ] #3 Runs locally/offline without external services; deterministic/loggable results for testing.
- [ ] #4 Animation does not block the app; results are accessible in activity/log/history.
<!-- AC:END -->
