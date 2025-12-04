# Frontend API Usage Audit

This document tracks each legacy Worker endpoint that the Expo app currently calls so we know what must exist in the new `api` service.

## Multiplayer endpoints

| Path | Method | Source(s) | Notes |
| --- | --- | --- | --- |
| `/api/games` | `POST` | `services/api/multiplayer-client.ts#createGame` (used by `app/host-game.tsx`) | Initializes a new Durable Object session, persists quest/world metadata, and returns `GameSessionResponse`. |
| `/api/games/:inviteCode` | `GET` | `multiplayerClient.getGameSession` (used by `app/join-game.tsx`, `app/multiplayer-game.tsx`) | Fetches the latest session details before the player joins. |
| `/api/games/:inviteCode/join` | `POST` | `multiplayerClient.joinGame` | Adds a player + character to the session and D1. |
| `/api/games/:inviteCode/state` | `GET` | `multiplayerClient.pollGameState`, `hooks/use-polling-game-state.ts` | Polling fallback when websocket is unavailable; returns `GameSessionResponse` with `gameState`. |
| `/api/games/:inviteCode/action` | `POST` | `multiplayerClient.submitPlayerAction` | Player action channel (dice rolls, etc.). |
| `/api/games/:inviteCode/dm-action` | `POST` | `multiplayerClient.submitDMAction` | DM tool actions; requires host privileges. |
| `/api/games/:inviteCode/start` | `POST` | `multiplayerClient.startGame` | Locks the lobby and seeds the initial `MultiplayerGameState`. |
| `/api/games/:inviteCode/ws` | `GET` (WebSocket upgrade) | `services/api/websocket-client.ts`, `hooks/use-websocket.ts` | Realtime updates, ping/pong, player join/leave events. |

## Quest endpoints

| Path | Method | Source(s) | Notes |
| --- | --- | --- | --- |
| `/api/quests` | `GET` | `multiplayerClient.getQuests` (used by `app/host-game.tsx`, `constants/quests`) | Lists quest metadata stored in KV. |
| `/api/quests/:questId` | `GET` | (not currently used directly in the app, but required for admin tooling) | Fetches a single quest definition. |

## Admin endpoints (future requirement)

The UI does not yet surface admin tools, but parity with the Worker requires:

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/admin/quests` | `POST` | Create/update quests in KV (requires admin user). |
| `/api/admin/games/:gameId` | `DELETE` | Placeholder for removing a game; current Worker implementation returns success without deleting. |

All of these routes rely on better-auth cookies (no legacy headers) and therefore must live behind the new `api` service once migrated.

