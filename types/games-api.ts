
import { Character } from './character';
import { Quest } from './quest';

import type { CharacterRow, MapTokenRow, NpcRow } from '@/shared/workers/db';

/**
 * Request body for creating a new game
 */
export interface CreateGameBody {
	questId?: string;
	quest?: Quest;
	world: string;
	startingArea: string;
	hostId?: string;
	hostEmail?: string;
	hostCharacter?: Character;
	currentMapId?: string;
}

/**
 * Request body for joining a game
 */
export interface JoinGameBody {
	inviteCode: string;
	characterId?: string;
	character?: Character;
	playerId?: string;
	playerEmail?: string;
}

/**
 * Attack target representing a character
 */
export type CharacterAttackTarget = {
	type: 'character';
	row: CharacterRow;
	character: Character;
	armorClass: number;
};

/**
 * Attack target representing an NPC token
 */
export type NpcAttackTarget = {
	type: 'npc';
	token: MapTokenRow;
	npcDefinition?: NpcRow | null;
	armorClass: number;
};

/**
 * Union type for attack targets (character or NPC)
 */
export type AttackTarget = CharacterAttackTarget | NpcAttackTarget;

