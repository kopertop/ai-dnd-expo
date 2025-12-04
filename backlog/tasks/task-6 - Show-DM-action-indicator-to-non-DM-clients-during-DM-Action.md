---
id: task-6
title: Show DM action indicator to non-DM clients during DM Action
status: Done
assignee: []
created_date: '2025-11-25 01:33'
updated_date: '2025-12-02 21:06'
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
- [x] #1 When DM Action mode is active (paused turn), non-DM clients see a clear banner/toast/modal indicating “DM is taking an action.”
- [x] #2 Indicator disappears automatically when the DM resumes/ends the pause.
- [x] #3 Does not block UI unnecessarily (can be passive) but makes state obvious.
- [x] #4 Works on mobile and web views.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented DMActionBanner component and wired into multiplayer map view to show a clear paused/DM-action banner for non-DM clients. Banner hides automatically when pause ends and uses lightweight layout compatible with mobile/web. Added unit test for banner visibility contract.
<!-- SECTION:NOTES:END -->
