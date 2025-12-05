---
id: task-14
title: Implement Partykit realtime sync on Cloudflare and remove polling
status: To Do
assignee: []
created_date: '2025-12-03 00:57'
updated_date: '2025-12-05 03:22'
labels: []
dependencies: []
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace polling-based sync with Partykit so game/map state broadcasts in real time. Set up a Partykit deployment on our Cloudflare account (account id + API token/config), wire the server to publish session/token/map changes, and update clients to connect and apply updates via websockets. Document Cloudflare setup steps and env vars so deployments and local dev both work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Partykit project is configured for our Cloudflare account (account id, API token/credentials, env vars) with clear setup docs for local dev and production deploys.
- [ ] #2 Server publishes game/session updates (e.g., map state, tokens, turn/initiative changes) via Partykit; clients receive updates in real time without relying on periodic polling.
- [ ] #3 Existing polling loops for the covered data are removed or gated behind a fallback so the app no longer continuously polls when Partykit is available.
- [ ] #4 Cloudflare deploy pipeline/command is documented and validated (deployment succeeds against our account).
- [ ] #5 Automated coverage added: at least one test that a client connected to the Partykit server receives a broadcasted state change and applies it, and one test ensuring we don't double-fetch/poll when realtime is active.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Review current polling-based sync flows (session/map/token/turn updates) and identify where to hook Partykit broadcasts and remove/gate polls.
- Scaffold Partykit project for our Cloudflare account: configure account id/API token, env vars, and deploy script; document setup for local dev and production deployment.
- Implement Partykit server handlers to broadcast session/map/token/turn changes and adjust clients to connect via websocket, applying updates in real time with fallback when realtime is unavailable.
- Remove or gate existing polling loops when realtime is active; add docs and run a deployment against Cloudflare to validate.
- Add automated tests: broadcast-to-client application test and a guard that polling is suppressed when realtime is enabled.
<!-- SECTION:PLAN:END -->
