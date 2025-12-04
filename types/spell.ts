import type { StatKey } from '@/types/stats';

export type SpellResolutionType = 'attack' | 'auto-hit' | 'save' | 'support';

export type DamageType =
	| 'fire'
	| 'radiant'
	| 'force'
	| 'cold'
	| 'lightning'
	| 'acid'
	| 'necrotic'
	| 'poison'
	| 'psychic'
	| 'thunder'
	| 'bludgeoning'
	| 'piercing'
	| 'slashing'
	| 'healing'
	| 'support';

export interface SpellDefinition {
	id: string;
	name: string;
	level: number;
	actionPoints: number;
	description: string;
	classes: string[];
	attackType: SpellResolutionType;
	damageDice?: string;
	damageType?: DamageType;
	range?: number;
	attackAbilityOverride?: StatKey;
	damageAbility?: StatKey | 'spellcasting';
	saveAbility?: StatKey;
	tags?: string[];
}

export type SpellDictionary = Record<string, SpellDefinition>;

