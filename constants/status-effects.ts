/**
 * D&D 5e Status Effects/Conditions
 * Reference: Player's Handbook, Chapter 9: Combat
 */

export type StatusEffect = 
	| 'blinded'
	| 'charmed'
	| 'deafened'
	| 'exhaustion'
	| 'frightened'
	| 'grappled'
	| 'incapacitated'
	| 'invisible'
	| 'paralyzed'
	| 'petrified'
	| 'poisoned'
	| 'prone'
	| 'restrained'
	| 'stunned'
	| 'unconscious';

export interface StatusEffectDefinition {
	id: StatusEffect;
	name: string;
	description: string;
	icon: string; // Emoji or icon identifier
	color: string; // Hex color for UI
	severity?: 'minor' | 'moderate' | 'severe'; // For visual distinction
}

export const STATUS_EFFECTS: Record<StatusEffect, StatusEffectDefinition> = {
	blinded: {
		id: 'blinded',
		name: 'Blinded',
		description: "A blinded creature can't see and automatically fails any ability check that requires sight.",
		icon: '👁️',
		color: '#1F2937',
		severity: 'moderate',
	},
	charmed: {
		id: 'charmed',
		name: 'Charmed',
		description: "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
		icon: '💝',
		color: '#EC4899',
		severity: 'moderate',
	},
	deafened: {
		id: 'deafened',
		name: 'Deafened',
		description: "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
		icon: '👂',
		color: '#6B7280',
		severity: 'minor',
	},
	exhaustion: {
		id: 'exhaustion',
		name: 'Exhaustion',
		description: 'Some special abilities and environmental hazards, such as starvation and the long-term effects of freezing or scorching temperatures, can lead to a special condition called exhaustion.',
		icon: '😴',
		color: '#92400E',
		severity: 'moderate',
	},
	frightened: {
		id: 'frightened',
		name: 'Frightened',
		description: 'A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight.',
		icon: '😨',
		color: '#7C2D12',
		severity: 'moderate',
	},
	grappled: {
		id: 'grappled',
		name: 'Grappled',
		description: 'A grappled creature speed becomes 0, and it can\'t benefit from any bonus to its speed.',
		icon: '🤝',
		color: '#78350F',
		severity: 'moderate',
	},
	incapacitated: {
		id: 'incapacitated',
		name: 'Incapacitated',
		description: 'An incapacitated creature can\'t take actions or reactions.',
		icon: '🚫',
		color: '#991B1B',
		severity: 'severe',
	},
	invisible: {
		id: 'invisible',
		name: 'Invisible',
		description: 'An invisible creature is impossible to see without the aid of magic or a special sense.',
		icon: '👻',
		color: '#4B5563',
		severity: 'minor',
	},
	paralyzed: {
		id: 'paralyzed',
		name: 'Paralyzed',
		description: 'A paralyzed creature is incapacitated and can\'t move or speak.',
		icon: '🧊',
		color: '#1E40AF',
		severity: 'severe',
	},
	petrified: {
		id: 'petrified',
		name: 'Petrified',
		description: 'A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance.',
		icon: '🗿',
		color: '#374151',
		severity: 'severe',
	},
	poisoned: {
		id: 'poisoned',
		name: 'Poisoned',
		description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
		icon: '☠️',
		color: '#059669',
		severity: 'moderate',
	},
	prone: {
		id: 'prone',
		name: 'Prone',
		description: 'A prone creature\'s only movement option is to crawl, unless it stands up and thereby ends the condition.',
		icon: '⬇️',
		color: '#92400E',
		severity: 'minor',
	},
	restrained: {
		id: 'restrained',
		name: 'Restrained',
		description: 'A restrained creature\'s speed becomes 0, and it can\'t benefit from any bonus to its speed.',
		icon: '🔗',
		color: '#7C2D12',
		severity: 'moderate',
	},
	stunned: {
		id: 'stunned',
		name: 'Stunned',
		description: 'A stunned creature is incapacitated, can\'t move, and can speak only falteringly.',
		icon: '💫',
		color: '#7C3AED',
		severity: 'severe',
	},
	unconscious: {
		id: 'unconscious',
		name: 'Unconscious',
		description: 'An unconscious creature is incapacitated, can\'t move or speak, and is unaware of its surroundings.',
		icon: '😵',
		color: '#DC2626',
		severity: 'severe',
	},
};

export const STATUS_EFFECT_LIST: StatusEffectDefinition[] = Object.values(STATUS_EFFECTS);

/**
 * Get status effect definition by ID
 */
export function getStatusEffect(id: StatusEffect): StatusEffectDefinition {
	return STATUS_EFFECTS[id];
}

/**
 * Check if a string is a valid status effect
 */
export function isValidStatusEffect(value: string): value is StatusEffect {
	return value in STATUS_EFFECTS;
}

