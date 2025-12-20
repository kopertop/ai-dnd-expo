---
id: task-31
title: Migrate tanstack-app into core project and make `bun run start` launch it
status: In Progress
assignee:
  - codex
created_date: '2025-12-19 23:56'
updated_date: '2025-12-20 00:46'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fold the TanStack Start app into the main project so local startup uses the TanStack app instead of the Expo Router entry. Remove the Expo app/runtime and delete the `tanstack-app` directory once migration steps are complete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `bun run start` launches the TanStack app without requiring separate commands
- [x] #2 TanStack app code lives under the core project (no separate `tanstack-app` build needed)
- [x] #3 Typecheck/build expectations are updated for the new structure
- [x] #4 Documentation or README updated to reflect the new startup flow

- [x] #5 Expo app/runtime is removed and scripts/dependencies reflect TanStack Start as the only app
- [ ] #6 `tanstack-app` directory is removed after migration with files merged into the core project
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Inventory TanStack Start config/assets and map them to root equivalents (package.json scripts, Vite config, tsconfig, router, public assets).
- Move/copy TanStack app source/config into the root project and update root scripts so `bun run start` launches TanStack Start directly; keep `tanstack-app` directory for now per task-29 dependency.
- Align root TypeScript/lint/build targets to the new layout; remove Expo runtime scripts/configs and update dependencies to TanStack Start.
- Update docs/README for the new startup flow; note that deleting `tanstack-app` will happen after task-29 completes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Copied TanStack Start app into root `src/` and `public/`, added root `vite.config.ts` and `postcss.config.mjs`, and updated root scripts so `bun run start`/`dev:web` run Vite/TanStack Start.

Reworked `package.json`, `tsconfig.json`, and `eslint.config.ts` for the TanStack Start layout; removed Expo runtime scripts/deps and adjusted lint/typecheck scopes. `bun run check` now passes.

Per user request, `tanstack-app/` directory is retained for now; removal deferred until task-29 completion.

Renamed Vite config to `vite.config.mts` to load the ESM-only TanStack Start plugin. `bun run start` now loads config but fails to bind port `::1:3000` due to sandbox EPERM; should run locally to confirm server starts.

Fixed TanStack Start session secret handling: require 32+ chars in production, use a longer dev fallback and warn if too short. Added SESSION_SECRET to `.env.example`/README. `bun run check` passes.

Set root package to ESM (`type: module`), converted Node scripts and babel config to ESM, and renamed Vite config back to `vite.config.ts` so no `.mts` is required. `bun run check` still passes.

Exposed Google client ID to the TanStack Start client by adding `envPrefix` in `vite.config.ts` and checking `import.meta.env.GOOGLE_CLIENT_ID` in login routes. Updated `.env.example`/README to include `VITE_GOOGLE_CLIENT_ID`. `bun run check` passes.

Updated root `start` script to run both API and web dev servers so auth callbacks can reach the backend; README now uses `bun run start` for local dev. `bun run check` passes.
<!-- SECTION:NOTES:END -->
