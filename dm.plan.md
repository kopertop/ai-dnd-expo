<!-- 35645971-e318-4e52-8d38-6372b636658c 1fdff490-8c3d-46c9-b0ff-c9fc56c4f5f2 -->
# DM Host Engine Completion Plan

## 1. Data & Storage Foundations *(Status: ✅ Completed)*

- **Schema Upgrade:** Extend `api/src/db/auth.schema.ts` + new drizzle migration to cover `games`, `game_players`, `characters`, `maps`, `map_tiles`, `map_tokens`, `npcs`, and `npc_instances`, adding fields for terrain layers, fog masks, and token metadata. Update `shared/workers/db.ts` helpers and regenerate Drizzle types.
- **Seed Data:** Create `scripts/seed-game-content.ts` to insert starter maps (town square, forest clearing, dungeon) and NPC archetypes (guards, merchants, goblins, beasts). Ensure seeds are idempotent and can be re-run locally/in CI.
- **Verification:** Run migrations locally against a fresh D1, execute the seed script, and confirm via `Database.listMaps()` / `.listNpcDefinitions()` that data exists.

## 2. Server-Side Procedural Map Generation *(Status: ✅ Completed)*

- **Generator Module:** Add `shared/workers/map-generator.ts` with deterministic helpers (noise-based terrain, road/river overlays, tree/object scatter). Expose presets for "road", "forest", "dungeon", and allow host-provided seeds.
- **API Surface:** In `api/src/routes/games.ts`, add `/map/generate` POST to invoke the generator on the Durable Object, persist `map_row` + `map_tiles`, and return the new `MapState`.
- **Verification:** Unit-test generator functions (tile counts, determinism) and hit the endpoint to ensure maps persist and reload consistently.

## 3. Durable Session & REST APIs *(Status: ✅ Completed)*

- **Session Payloads:** Expand `shared/workers/session-manager.ts` (Durable Object) to store map state (terrain, fog, tokens), NPC instances, and activity log entries. Add mutations for token drag/drop, fog toggles, and NPC stat updates.
- **REST Endpoints:** In `api/src/routes/games.ts`, add routes for map CRUD (`/:inviteCode/map`, `/map/tokens`, `/map/fog`, `/map/terrain`) and NPC palette management (`/:inviteCode/npcs`, `/npc-instances`). Ensure host auth guards and payload validation via the Zod schemas in `types/api/multiplayer-api.ts`.
- **Verification:** Expand `api/tests/games.test.ts` to cover token placement, fog updates, and NPC CRUD, using vi.spyOn for mocks per house style.

## 4. NPC Archetypes & Customization *(Status: ✅ Completed)*

- **Seeded Palette:** Load the seeded archetypes via a new `Database.listNpcDefinitions()` call, expose through `multiplayerClient.getNpcDefinitions`, and surface alignment/disposition metadata.
- **Ad-Hoc Creation:** Build POST/PUT routes to let DMs create quick NPCs (name, role, alignment, stats) stored in `npc_definitions` with a DM owner flag. Update the host UI to offer "Add Custom NPC" modal using `components/dm-controls-panel.tsx` or a new component.
- **Verification:** Manual QA—create a custom NPC, see it appear in the palette, place it on the map, and confirm it persists after refresh.

## 5. Host View Revamp (Players & NPCs Panel) *(Status: ✅ Completed)*

- **Roster Accuracy:** Update `multiplayerClient.getGameSession` to include character sheets for joined players so `components/player-list.tsx` can render real names/classes instead of "Unknown". Show HP/AP bars and status chips.
- **Unified Sidebar:** In `app/host-game.tsx`, split layout: left column lists players + existing NPC instances with quick actions (damage/heal, focus on map). Reuse `components/character-sheet-view.tsx` for details, add NPC cards with alignment indicators.
- **Verification:** Manual—join lobby with two players, confirm data populates instantly and updates when a player leaves/joins.

## 6. Interactive Map Editing Toolkit *(Status: ✅ Completed)*

- **Palette Controls:** Enhance `components/map/InteractiveMap.tsx` to support tool modes: paint terrain (grass, road, tree, water), place objects (rocks, walls), drop tokens, and toggle fog. Expose callbacks like `onPaintTerrain`, `onToggleFog`, `onDropToken`.
- **State Management:** Add a `useHostMapEditor` hook under `hooks/` to debounce edits, call the new map APIs, and keep optimistic local state while awaiting server confirmation.
- **Verification:** Storybook- or screen-level test (React Testing Library) ensuring tile presses call the correct handlers, plus manual placement of roads/trees within the running host view.

## 7. Player Experience Alignment *(Status: ✅ Completed)*

- **Read-Only Map:** Update `app/multiplayer-game.tsx` to consume the enriched map payload, show live DM edits, and expose a per-player token focus/initiative tracker. Remove the unused real-time chat panel per requirement and replace with activity log + dice history.
- **Character Drawer:** Ensure players can inspect their character stats pulled from `/me/characters`, and highlight their token when selected.
- **Verification:** Manual—join as player, confirm map updates after DM paints terrain or moves NPC, and that chat removal doesn’t regress layout.

## 8. QA & Tooling *(Status: ✅ Completed)*

- **Automated Tests:** Extend Vitest suites for hooks/components (map editor, player list) and API routes. Add snapshot tests for the seeded map JSON to detect accidental generator changes.
- **Manual Checklist:** Document a host-run scenario: create game, generate map, paint terrain, place players/NPCs, start encounter, and verify player client updates. Capture screenshots per user workflow instructions.
- **Regression Guardrails:** Hook up Playwright/E2E script (if feasible) to simulate DM + 1 player covering lobby -> battle setup.

