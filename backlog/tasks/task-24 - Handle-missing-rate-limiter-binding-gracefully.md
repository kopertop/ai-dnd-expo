---
id: task-24
title: Handle missing rate limiter binding gracefully
status: Done
assignee: []
created_date: '2025-12-10 18:13'
updated_date: '2025-12-10 23:26'
labels:
  - bugfix
  - api
  - rate-limiting
dependencies: []
priority: high
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
API rate limiting middleware fails closed when the `API_RATE_LIMITER` binding is absent, returning 500 for every request in local/preview or misconfigured deployments. We need to allow requests to proceed (or return a clear 503/429 only when the binding is present and reports over-limit) and log a warning when the binding is missing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When `API_RATE_LIMITER` is missing in dev/preview, requests proceed without 500s; middleware logs a warning once per boot or per request as appropriate.
- [ ] #2 When the binding exists and over-limit is triggered, the middleware still returns the proper rate-limit response code.
- [ ] #3 Add or update tests to cover missing-binding behavior and existing rate-limit behavior.
<!-- AC:END -->
