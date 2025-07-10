import { z } from 'zod';

import { CharacterSchema } from './character';

export const GameStateSchema = z.object({
	characters: z.array(CharacterSchema),
	playerCharacterId: z.string(),
	gameWorld: z.string(),
	startingArea: z.string(),
});
export type GameState = z.infer<typeof GameStateSchema>;
