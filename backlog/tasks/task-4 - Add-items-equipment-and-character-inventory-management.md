---
id: task-4
title: 'Add items, equipment, and character inventory management'
status: Done
assignee: []
created_date: '2025-11-25 01:32'
updated_date: '2025-12-10 23:26'
labels:
  - feature
  - inventory
dependencies: []
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce character inventory with items and equipment. Support viewing inventory, equipping/unequipping items, and consuming/using items where applicable. Ensure data syncs with backend and reflects in stats/abilities.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory view shows items and equipment slots for characters; DM can view NPC inventories where applicable.
- [ ] #2 Equip/unequip updates character stats/bonuses and persists to backend.
- [ ] #3 Use/consume items updates inventory counts and triggers effects when applicable.
- [ ] #4 State changes propagate to clients (DM and players) and handle optimistic update or error rollback.
<!-- AC:END -->
