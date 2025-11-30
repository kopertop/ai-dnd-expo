<!-- d51b5ce0-9c01-43fa-ab48-fa0e5ad5ef1e f544e128-d773-442d-a923-8ce9549d08ec -->
# Consolidate NPC Instances into Map Tokens

## Problem Analysis

There are two tables storing overlapping NPC runtime data:

| Field | `map_tokens` | `npc_instances` |
|-------|-------------|-----------------|
| Health | `hit_points`, `max_hit_points` | `current_health`, `max_health` |
| Status Effects | `status_effects` | `status_effects` |
| Name | `label` | `name` |
| Disposition | `status` | `disposition`, `is_friendly` |
| Action Points | `metadata.actionPoints` | `metadata.actionPoints` |
| NPC Reference | `npc_id` | `npc_id` |

**Critical Bug**: Health updates write to `npc_instances.current_health` ([games.ts:1966](api/src/routes/games.ts)) but the UI reads from `map_tokens.hit_points` via `convertTokens` ([schema-adapters.ts:129](utils/schema-adapters.ts)).

## Solution

Remove `npc_instances` entirely and use `map_tokens` as the single source of truth for NPC runtime state.

### Phase 1: Update API Routes to Use map_tokens

Modify [api/src/routes/games.ts](api/src/routes/games.ts):

1. **Remove `saveNpcInstance` calls** when creating NPCs (line ~1737)
2. **Update damage/heal endpoint** (lines 1954-1976) to update `map_tokens.hit_points` instead of `npc_instances.current_health`
3. **Update `resolveAttackTarget`** (line 140) to read health from `map_tokens` instead of `npc_instances`
4. **Update initiative roll endpoint** (line 2489-2503) to read/write from `map_tokens`
5. **Update PATCH npc-instances endpoint** to update `map_tokens` directly
6. **Remove GET npc-instances endpoint** or convert it to read from `map_tokens`

### Phase 2: Update Database Layer

Modify [shared/workers/db.ts](shared/workers/db.ts):

1. Add `updateMapToken` method for partial updates
2. Remove `NpcInstanceRow` interface and related methods:

- `listNpcInstances`
- `getNpcInstanceByToken`
- `saveNpcInstance`
- `deleteNpcInstance`
- `deleteNpcInstanceByToken`

### Phase 3: Update Migration Files

Modify [api/migrations/0000_initial.sql](api/migrations/0000_initial.sql) to remove the `npc_instances` table entirely:

1. Remove the `CREATE TABLE npc_instances` block (lines 170-190)
2. Remove the related indexes (`npc_instances_game_id_idx`, `npc_instances_npc_id_idx`, `npc_instances_token_id_unique`)

The `map_tokens` table already has all needed fields:

- `status` can store disposition values (`hostile`, `friendly`, `vendor`, `neutral`)
- `is_friendly` can be stored in `metadata` JSON or derived from `status`

### Files to Modify

- [api/src/routes/games.ts](api/src/routes/games.ts) - Main route handlers
- [shared/workers/db.ts](shared/workers/db.ts) - Database layer
- [utils/schema-adapters.ts](utils/schema-adapters.ts) - Already reads from map_tokens (no changes needed)
- [types/multiplayer-map.ts](types/multiplayer-map.ts) - Remove `NpcState` if unused

### Migration Strategy

Since this is a simplification, we can:

1. Update all code to use `map_tokens` exclusively
2. Stop writing to `npc_instances`
3. Optionally create a migration to drop the `npc_instances` table later

### To-dos

- [ ] Update games.ts routes to read/write NPC health from map_tokens
- [ ] Add updateMapToken method and remove npc_instances methods from db.ts
- [ ] Remove all saveNpcInstance/getNpcInstanceByToken calls
- [ ] Remove NpcInstanceRow and related unused types