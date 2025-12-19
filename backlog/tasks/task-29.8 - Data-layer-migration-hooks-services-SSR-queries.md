---
id: task-29.8
title: 'Data layer migration (hooks/services, SSR queries)'
status: To Do
assignee: []
created_date: '2025-12-19 14:23'
labels: []
dependencies: []
parent_task_id: task-29
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Refactor data hooks/services for TanStack Query with SSR loaders and Worker API integration, removing Expo-specific dependencies from the web app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Query hooks/services use Worker endpoints with cookie credentials.
- [ ] #2 SSR loaders prefetch data and hydrate correctly on the client.
- [ ] #3 Expo-specific data dependencies are removed from the web app layer.
<!-- AC:END -->
