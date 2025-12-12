---
id: task-23
title: Add DM "Roll Dice" action with broadcast animation
status: Done
assignee: []
created_date: '2025-12-05 14:49'
updated_date: '2025-12-10 23:26'
labels:
  - dm
  - dice
  - frontend
  - backend
  - realtime
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a DM-only action "Roll Dice" that lets the DM choose dice count/type, triggers backend to roll, broadcasts the action so all clients see the roll just like the DM action banner, and renders dice rolling in from the left and stopping at center to reveal final values.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented DM-only dice roll endpoint with host validation, activity log, and broadcast via game state messages. Added frontend DM roll modal/button, dice roll overlay animation, and message-driven display for all clients. Added API tests for DM roll authorization and message attachment.
<!-- SECTION:NOTES:END -->
