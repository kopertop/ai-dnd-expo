import { Hono } from 'hono';

import coreRoutes from './core';
import characterRoutes from './characters';
import mapRoutes from './map';
import npcRoutes from './npcs';
import combatRoutes from './combat';
import turnRoutes from './turns';
import diceRoutes from './dice';
import logRoutes from './logs';
import websocketRoutes from './websocket';
import type { GamesContext } from './types';

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
export type { GamesContext, Variables } from './types';
export type { CreateGameBody, JoinGameBody } from '@/types/games-api';


