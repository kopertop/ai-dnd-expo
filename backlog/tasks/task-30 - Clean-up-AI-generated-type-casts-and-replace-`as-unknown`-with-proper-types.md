---
id: task-30
title: Clean up AI-generated type casts and replace `as unknown` with proper types
status: In Progress
assignee:
  - codex
created_date: '2025-12-19 23:24'
updated_date: '2025-12-20 00:12'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review AI-generated code upgrade to remove sloppy `as unknown` conversions and introduce accurate typings so the codebase remains type-safe and maintainable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All `as unknown` casts introduced by the upgrade are audited and either removed or replaced with accurate types
- [x] #2 Type definitions are added or refined to reflect actual data shapes and usage
- [ ] #3 TypeScript typecheck passes without relying on `as unknown` workarounds
- [ ] #4 No runtime behavior changes aside from improved typing/guarded logic where needed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
- Diff current branch against `main` to list new/modified hunks.
- For each hunk, remove duplicate logic and replace `any`/`unknown` casts with accurate types or safe narrowings.
- Align style with surrounding file conventions; keep existing defensive checks intact.
- Re-scan to ensure no remaining `as any`/`as unknown`/`ts-ignore` workarounds introduced by this branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed new `as unknown` route casts by reverting to string routes in admin maps/worlds screens; typed NotFound props with ReactNode.

Added typed map upsert payload + helpers to normalize JSON fields and dedupe map tile/token processing; replaced `any` tile mapping and extracted default tile property helper.

`bun run check` fails due to missing TanStack Start dependencies/types (`@tanstack/react-router`, `@tanstack/react-start`, `redaxios`, etc.) and related implicit-anys in `tanstack-app/*`. Our changes no longer show type errors in `api/src/routes/maps.ts`.

User clarified that defensive checks are desired; scope focuses on duplicate logic and `any`/`unknown` casts. Typecheck failures currently tied to missing TanStack Start deps; will resolve once migration lands.
<!-- SECTION:NOTES:END -->
