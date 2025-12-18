---
id: doc-2
title: 'Migration Decision Log: TanStack Start Web-first'
type: other
created_date: '2025-12-18 21:57'
---
# Migration Decision Log: TanStack Start Web-first

## Decisions
- TanStack Start is the primary app framework; remove Expo/RN-specific code where possible.
- Web-first migration; Tauri deferred until after web parity.
- SSR on day 1 with TanStack Start and TanStack Query hydration.
- Auth/session handled via cookies for all environments.
- Cloudflare Worker + DB remains for shared maps/assets/games and game coordination.

## Open Questions
- Which routes remain in Worker vs moved to Start server?
- How should shared types be structured between Start and Worker?
- What is the minimal set of RN UI rewrites needed for parity?
