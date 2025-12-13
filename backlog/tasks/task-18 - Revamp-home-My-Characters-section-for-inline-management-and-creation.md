---
id: task-18
title: Revamp home My Characters section for inline management and creation
status: Done
assignee: []
created_date: '2025-12-04 20:18'
updated_date: '2025-12-10 23:26'
labels:
  - ui
  - character
  - home
dependencies: []
priority: high
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the home page to present My Characters inline without a separate Manage page: show the list directly, allow adding new characters and opening existing ones from the home sheet. Remove redundant manage button/view and ensure UX supports launching character sheet view.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Working on home page to inline list characters, add new button, and open character sheet view directly. Branch custom-draggable.

Updated home (/app/index.tsx) to remove separate Manage link; My Characters now shows inline list, allows creating via New Character button (routes to /new-character?mode=character), and opens character sheets directly from cards.
<!-- SECTION:NOTES:END -->
