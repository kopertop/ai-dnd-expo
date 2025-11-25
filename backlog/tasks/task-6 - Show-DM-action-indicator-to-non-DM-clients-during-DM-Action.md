---
id: task-6
title: Show DM action indicator to non-DM clients during DM Action
status: To Do
assignee: []
created_date: '2025-11-25 01:33'
labels:
  - feature
  - ui
  - dm
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When the DM pauses a turn for a DM Action, surface a clear UI indicator to all non-DM clients that the DM is taking an action and the game is temporarily paused.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When DM Action mode is active (paused turn), non-DM clients see a clear banner/toast/modal indicating “DM is taking an action.”
- [ ] #2 Indicator disappears automatically when the DM resumes/ends the pause.
- [ ] #3 Does not block UI unnecessarily (can be passive) but makes state obvious.
- [ ] #4 Works on mobile and web views.
<!-- AC:END -->
