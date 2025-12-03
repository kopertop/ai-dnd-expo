---
id: task-13
title: Migrate API and backend to Partykit with Cloudflare Worker + R2 SQL
status: In Review
assignee: []
created_date: '2025-11-26 00:00'
labels:
  - backend
  - realtime
  - partykit
  - cloudflare
  - testing
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move all multiplayer API/backend operations to Partykit running on our own Cloudflare Worker, with the R2-hosted SQL database as the authoritative store. Replace existing durable-object-style flows with Partykit rooms that share repository logic with REST endpoints, and align auth/asset handling with the new worker entrypoint. Ship migration docs and an end-to-end test that exercises the new stack.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Partykit server entrypoint checked in with room handlers for game sessions, maps, and quests, wired to Worker bindings.
- [x] #2 Shared repository layer using the R2 SQL binding powers both REST/Hono routes and Partykit room handlers.
- [x] #3 Worker routing upgrades websocket traffic to Partykit while preserving health/status REST routes.
- [x] #4 End-to-end test covers auth -> join room -> movement/action -> persisted state in R2 via Partykit.
- [x] #5 Deployment guide documents Partykit build/deploy commands, bindings, and environment variables.
<!-- AC:END -->
