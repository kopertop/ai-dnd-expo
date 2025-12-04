/**
 * Games API Routes
 *
 * This file re-exports the modular games router.
 * All route implementations have been split into separate modules:
 * - core.ts - Game lifecycle routes
 * - characters.ts - Character management routes
 * - map.ts - Map and token routes
 * - npcs.ts - NPC management routes
 * - combat.ts - Combat and action routes
 * - turns.ts - Turn management routes
 * - dice.ts - Dice rolling routes
 * - logs.ts - Activity log routes
 * - websocket.ts - WebSocket routes (placeholder)
 *
 * Shared utilities are in:
 * - utils/games-utils.ts - Common helper functions
 * - utils/combat-helpers.ts - Combat-related functions
 * - routes/games/types.ts - Shared type definitions
 */

import games from './games/index';

export default games;
