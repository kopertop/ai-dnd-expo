---
id: task-20
title: Add character deletion with ownership enforcement
status: To Do
assignee: []
created_date: '2025-12-04 20:45'
updated_date: '2025-12-05 03:22'
labels:
  - feature
  - character-management
  - auth
dependencies: []
priority: medium
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow players to delete their own characters from the character detail page with a guarded confirmation flow. Backend must ensure only the owning user can delete a character and return clear errors otherwise; UI should handle errors and navigate appropriately after deletion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Character detail page exposes a delete control that opens a confirmation dialog/modal with clear warning text and a secondary verification (e.g., typed name or explicit confirm) before deletion proceeds.
- [ ] #2 Delete API rejects deletion attempts for non-owners with a 403/authorization error; backend checks ownership before removing records.
- [ ] #3 UI handles delete success by removing the character locally and navigating back to the character list/home; non-owner or other errors show inline feedback without breaking the page.
- [ ] #4 Deletion flow includes loading/disabled states to prevent duplicate submissions and maintains optimistic/rollback safety if used.
<!-- AC:END -->
