import type { SpellDefinition } from '@/types/spell';

export type CombatTargetSummary = {
	type?: 'character' | 'npc';
	id: string;
	name: string;
	armorClass?: number;
	remainingHealth?: number;
	maxHealth?: number;
};

export type DiceRollSummary = {
	notation: string;
	rolls: number[];
	modifier: number;
	total: number;
	breakdown: string;
	critical?: boolean;
	natural?: number;
};

export type AttackRollSummary = DiceRollSummary & {
	targetAC: number;
	natural: number;
	critical: boolean;
	fumble: boolean;
};

export type BasicAttackResult = {
	type: 'basic_attack';
	attackStyle: 'melee' | 'ranged';
	target: CombatTargetSummary;
	attackRoll: AttackRollSummary;
	hit: boolean;
	damageRoll?: DiceRollSummary;
	damageDealt?: number;
};

export type SpellCastResult = {
	type: 'spell';
	spellId: string;
	spellName: string;
	attackType: SpellDefinition['attackType'];
	target?: CombatTargetSummary;
	attackRoll?: AttackRollSummary;
	hit?: boolean;
	damageRoll?: DiceRollSummary;
	damageDealt?: number;
	saveDC?: number;
	saveRoll?: DiceRollSummary;
	saveResult?: 'success' | 'fail';
};

export type CharacterActionResult = BasicAttackResult | SpellCastResult;

