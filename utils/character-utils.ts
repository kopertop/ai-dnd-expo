import { getRaceBaseSpeed } from '@/constants/race-speed';
import type { Character as AppCharacter, Character as WorkerCharacter } from '@/types/character';
import type { StatBlock } from '@/types/stats';

type CharacterLike = {
	race?: string;
	stats?: StatBlock;
};

export const getDexModifier = (dexScore: number) => Math.floor((dexScore - 10) / 2);

export const getCharacterSpeed = (character: CharacterLike | AppCharacter | WorkerCharacter) => {
	const baseSpeed = getRaceBaseSpeed(character.race);
	const dexScore = character.stats?.DEX ?? 10;
	const dexModifier = getDexModifier(dexScore);
	return Math.max(1, baseSpeed + dexModifier);
};

