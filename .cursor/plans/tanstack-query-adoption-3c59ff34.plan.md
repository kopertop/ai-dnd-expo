<!-- 3c59ff34-f012-4dfd-b9b5-d315a5884db1 0bf45b66-2a0a-4f57-95be-9ae379e225b4 -->
# TanStack Query Full Adoption Plan

## Overview

Migrate all API calls from manual `useState`/`useEffect` patterns to TanStack Query using `expo-auth-template`'s query utilities (`useQueryApi`/`useMutationApi`), leveraging the existing `expo-auth-template` integration.

## Key Implementation Details

### Using expo-auth-template Query Utilities

- **`useQueryApi(path, options)`** - Wraps `useQuery` from TanStack Query, automatically handles auth via `apiService`, generates query keys via `queryService.createQueryKey(path)`
- **`useMutationApi(options)`** - Wraps `useMutation` from TanStack Query, accepts `{ path, body, fetchOptions }` as mutation variables, handles auth automatically
- **`QueryProvider`** - Wraps `QueryClientProvider` with sensible defaults, use instead of direct `QueryClientProvider`
- **`queryService.createQueryKey(path)`** - Utility for consistent query key generation (used internally by `useQueryApi`)

## Phase 1: Setup & Infrastructure

### 1.1 QueryProvider Setup

- **File**: `app/_layout.tsx`
- Add `QueryProvider` from `expo-auth-template/frontend` wrapping the app (inside `SessionProvider`)
- Configure via `config` prop:
- `defaultOptions.queries.staleTime`: 30 seconds
- `defaultOptions.queries.cacheTime`: 5 minutes
- `defaultOptions.queries.refetchOnWindowFocus`: false
- `defaultOptions.queries.retry`: 2

### 1.2 Query Key Helpers (Optional)

- **New File**: `services/api/query-keys.ts` (optional)
- Helper functions for invalidation patterns using `queryService.createQueryKey()` from `expo-auth-template/frontend`
- Note: `useQueryApi` auto-generates keys, but helpers useful for invalidation

### 1.3 Custom Hooks Structure

- **New Directory**: `hooks/api/`
- Create hooks wrapping `useQueryApi`/`useMutationApi`:
- `use-game-queries.ts` - game operations
- `use-character-queries.ts` - character CRUD
- `use-map-queries.ts` - map state/tokens
- `use-quest-queries.ts` - quest listing
- `use-npc-queries.ts` - NPC operations
- `use-turn-queries.ts` - turn management

## Phase 2: Convert GET Requests to useQueryApi

### 2.1 Game Queries

Convert to `useQueryApi`:

- `getGameSession(inviteCode)` → `useQueryApi('/games/${inviteCode}')`
- `getMyGames()` → `useQueryApi('/games/me')`
- `getQuests()` → `useQueryApi('/quests')`
- `getActivityLogs(inviteCode, limit, offset)` → `useQueryApi('/games/${inviteCode}/log?limit=${limit}&offset=${offset}')`
- `getCurrentTurn(inviteCode)` → `useQueryApi('/games/${inviteCode}/turn')`

### 2.2 Character Queries

- `getMyCharacters()` → `useQueryApi('/games/me/characters')`
- `getGameCharacters(inviteCode)` → `useQueryApi('/games/${inviteCode}/characters')`

### 2.3 Map Queries

- `getMapState(inviteCode)` → `useQueryApi('/games/${inviteCode}/map')`
- `listMapTokens(inviteCode)` → `useQueryApi('/games/${inviteCode}/map/tokens')`
- `getNpcDefinitions(inviteCode)` → `useQueryApi('/games/${inviteCode}/npcs')`
- `getNpcInstances(inviteCode)` → `useQueryApi('/games/${inviteCode}/npc-instances')`
- `getAllMaps()` → `useQueryApi('/maps')`

### 2.4 Replace Polling Hook

- **File**: `hooks/use-polling-game-state.ts`
- Replace with `useQueryApi('/games/${inviteCode}/state', { refetchInterval: pollInterval })`
- Use `onSuccess` callback for `onGameStateUpdate` support

## Phase 3: Convert Mutations to useMutationApi

### 3.1 Game Mutations

Convert to `useMutationApi`:

- `createGame()` → `useMutationApi({ method: 'POST' })` with `{ path: '/games', body: request }`
- `joinGame()` → `useMutationApi({ method: 'POST' })` with `{ path: '/games/${inviteCode}/join', body: request }`
- `startGame()` → `useMutationApi({ method: 'POST' })` with `{ path: '/games/${inviteCode}/start', body: request }`
- `deleteGame()` → `useMutationApi({ method: 'DELETE' })` with `{ path: '/games/${inviteCode}' }`
- Similar pattern for all mutations

### 3.2 Character Mutations

- All use `useMutationApi` with appropriate `method` and `{ path, body }` variables

### 3.3 Map Mutations

- All use `useMutationApi` with appropriate `method` and `{ path, body }` variables

### 3.4 Turn Mutations

- All use `useMutationApi` with appropriate `method` and `{ path, body }` variables

## Phase 4: Cache Invalidation

### 4.1 Invalidation Patterns

- Use `useQueryClient()` from `@tanstack/react-query` in mutation hooks
- Invalidate using path patterns or `queryService.createQueryKey()`:
- Game mutations → invalidate `/games/${inviteCode}*` patterns
- Character mutations → invalidate character-related queries
- Map mutations → invalidate map-related queries
- Turn mutations → invalidate turn/state queries

### 4.2 Optimistic Updates

- Use `onMutate` and `onError` in `useMutationApi` options for rollback

## Phase 5: Component Migration

### 5.1 High-Priority Components

- `app/index.tsx` - Use `useMyCharacters()` hook
- `app/host-game/[id].tsx` - Replace manual fetching
- `app/host-game/[id]/[mapId].tsx` - Replace map fetching
- `app/multiplayer-game.tsx` - Use polling hook
- `app/join-game.tsx` - Use `useGameSession()` hook

## Phase 6: Backend Considerations

### 6.1 Response Headers (Optional)

- Add `Cache-Control` headers to GET endpoints
- Consider `ETag` support

### 6.2 Error Handling

- Ensure consistent error format: `{ error: string, code?: string }`

## Implementation Order

1. Setup QueryProvider (Phase 1.1)
2. Create query hooks (Phase 1.3, 2, 3)
3. Replace polling (Phase 2.4)
4. Migrate components (Phase 5)
5. Add invalidation (Phase 4)
6. Polish and test

## Files to Create/Modify

### New Files

- `hooks/api/use-game-queries.ts`
- `hooks/api/use-character-queries.ts`
- `hooks/api/use-map-queries.ts`
- `hooks/api/use-turn-queries.ts`
- `hooks/api/use-quest-queries.ts`
- `hooks/api/use-npc-queries.ts`
- `services/api/query-keys.ts` (optional)

### Modified Files

- `app/_layout.tsx` - Add QueryProvider
- `app/index.tsx` - Use hooks
- `app/host-game/[id].tsx` - Use hooks
- `app/host-game/[id]/[mapId].tsx` - Use hooks
- `app/multiplayer-game.tsx` - Use hooks
- `app/join-game.tsx` - Use hooks
- `hooks/use-polling-game-state.ts` - Refactor to useQueryApi

## Important Notes

- **Always use `useQueryApi` and `useMutationApi` from `expo-auth-template/frontend`** - do not use TanStack Query hooks directly
- Auth is handled automatically - no manual token management needed
- Query keys are auto-generated from paths via `queryService.createQueryKey(path)`
- For query params, include them in the path string: `/games/${inviteCode}/log?limit=${limit}&offset=${offset}`
- Mutations accept `{ path, body, fetchOptions }` as variables
- Use `useQueryClient()` from `@tanstack/react-query` for invalidation in mutation hooks
- WebSocket updates should invalidate queries using `queryClient.invalidateQueries()`

### To-dos

- [ ] Add QueryProvider from expo-auth-template/frontend to app/_layout.tsx with appropriate config
- [ ] Create hooks/api/use-game-queries.ts using useQueryApi and useMutationApi
- [ ] Create hooks/api/use-character-queries.ts using useQueryApi and useMutationApi
- [ ] Create hooks/api/use-map-queries.ts using useQueryApi and useMutationApi
- [ ] Create hooks/api/use-turn-queries.ts using useQueryApi and useMutationApi
- [ ] Refactor hooks/use-polling-game-state.ts to use useQueryApi with refetchInterval
- [ ] Migrate app/index.tsx to use useMyCharacters() hook
- [ ] Migrate app/host-game/[id].tsx to use query hooks
- [ ] Migrate app/host-game/[id]/[mapId].tsx to use query hooks
- [ ] Migrate app/multiplayer-game.tsx to use query hooks and polling
- [ ] Migrate app/join-game.tsx to use useGameSession() hook
- [ ] Add proper cache invalidation to all mutations using queryClient.invalidateQueries()