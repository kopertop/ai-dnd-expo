---
id: doc-1
title: 'Migration Plan: Expo/RN to TanStack Start (Web-first)'
type: other
created_date: '2025-12-18 21:57'
---
# Migration Plan: Expo/RN to TanStack Start (Web-first, SSR Day 1)

This plan migrates the app from Expo/React Native to TanStack Start with SSR on day 1, while keeping the Cloudflare Worker + DB for shared maps, assets, and game coordination. Web is the primary target; Tauri comes after web parity.

## Goals
- Remove Expo and React Native specific code and dependencies.
- Adopt TanStack Start for routing, SSR, and server-side orchestration.
- Retain Cloudflare Worker + DB as the shared data service.
- Preserve a path to desktop (Tauri) after web parity.

## Constraints
- SSR on day 1.
- Auth and session handling via cookies (httpOnly where possible).
- Cloudflare Worker/DB remains the source of truth for shared maps/assets/games.

## Phase 0: Discovery and Inventory
- Inventory all Expo/RN dependencies and platform APIs in use.
- Identify routes, components, hooks, and services that are RN-specific.
- Define the API boundary between TanStack Start server and the Worker/DB.
- Define SSR boundaries, data prefetch points, and cookie handling requirements.

## Phase 1: TanStack Start Scaffolding (Web-first)
- Scaffold TanStack Start app in `tanstack-app`.
- Configure SSR entry points, router layout, and base styles.
- Establish env config and API base URLs for local dev against Worker.
- Add baseline build/test commands for web SSR.

## Phase 2: Backend Integration (Worker + DB)
- Keep Hono/Worker routes for shared maps/assets/games.
- Move or adapt existing `api/` routes into the Worker runtime where appropriate.
- Ensure local dev with Wrangler/Miniflare and clear environment parity.

## Phase 3: Frontend Migration (RN -> Web)
- Map Expo Router routes to TanStack Router routes.
- Replace RN components with web equivalents (HTML/CSS).
- Migrate hooks, stores, and services into `tanstack-app/src`.
- Replace Expo-specific libraries with web/TanStack Start equivalents.

## Phase 4: SSR and Data Fetching
- Convert services to TanStack Query with loader-prefetch + hydration.
- Ensure SSR-safe cookie reads/writes and session validation.
- Verify route-level data dependencies render on server.

## Phase 5: Testing and Parity
- Update unit/integration tests for new structure.
- Add Playwright flows for login, create/join game, and in-game basics.
- Validate SSR behavior and cookie auth end-to-end.

## Phase 6: Tauri (Post-parity)
- Integrate Tauri after web parity is achieved.
- Build a desktop WebGL adapter (replace expo-gl adapter).
- Validate packaging and desktop-specific file access needs.

## Phase 7: Cleanup and Documentation
- Remove Expo/RN directories and config (app/, app.config.ts, babel.config.js, etc.).
- Move `tanstack-app` contents to project root after parity and stabilization.
- Update README and setup docs.
