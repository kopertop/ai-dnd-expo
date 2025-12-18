import { Hono } from 'hono';

import characterRoutes from './characters';
import combatRoutes from './combat';
import coreRoutes from './core';
import diceRoutes from './dice';
import logRoutes from './logs';
import mapRoutes from './map';
import npcRoutes from './npcs';
import turnRoutes from './turns';
import type { GamesContext } from './types';
import websocketRoutes from './websocket';

/**
 * Main games router
 *
 * Mounts all game-related route modules:
 * - Core game lifecycle routes
 * - Character management routes
 * - Map and token routes
 * - NPC management routes
 * - Combat and action routes
 * - Turn management routes
 * - Dice rolling routes
 * - Activity log routes
 * - WebSocket routes (placeholder)
 */
const games = new Hono<GamesContext>();

// Mount all sub-routes
games.route('/', coreRoutes);
games.route('/', characterRoutes);
games.route('/', mapRoutes);
games.route('/', npcRoutes);
games.route('/', combatRoutes);
games.route('/', turnRoutes);
games.route('/', diceRoutes);
games.route('/', logRoutes);
games.route('/', websocketRoutes);

export default games;

// Re-export types for convenience
export type { CreateGameBody, JoinGameBody } from '@/types/games-api';
export type { GamesContext } from './types';


