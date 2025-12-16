import type { HonoContext } from '../../env';

import type {
	AttackTarget,
	CreateGameBody,
	JoinGameBody,
} from '@/types/games-api';

/**
 * Context type for games routes
 */
export type GamesContext = HonoContext;

/**
 * Options for performing a basic attack
 * Note: This type references the Database class which is API-specific
 */
export type BasicAttackOptions = {
	db: import('../../../../shared/workers/db').Database;
	attacker: import('@/types/character').Character;
	targetId?: string;
	params?: Record<string, unknown>;
};

/**
 * Options for casting a spell
 * Note: This type references the Database class which is API-specific
 */
export type SpellCastOptions = {
	db: import('../../../../shared/workers/db').Database;
	attacker: import('@/types/character').Character;
	spellName?: string;
	targetId?: string;
	params?: Record<string, unknown>;
};

// Re-export shared types for convenience
export type { AttackTarget, CreateGameBody, JoinGameBody };
