import { z } from 'zod';

import { CharacterSchema } from './character';
import { GameWorldStateSchema } from './world-map';

export const GameStateSchema = z.object({
	characters: z.array(CharacterSchema),
	playerCharacterId: z.string(),
	gameWorld: z.string(),
	startingArea: z.string(),
	worldState: GameWorldStateSchema.optional(), // World map and player position data
});
export type GameState = z.infer<typeof GameStateSchema>;
