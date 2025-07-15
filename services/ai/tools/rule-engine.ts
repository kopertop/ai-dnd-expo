export interface Rule {
	id: string;
	name: string;
	category: 'combat' | 'spellcasting' | 'skills' | 'exploration' | 'social';
	description: string;
	mechanics: string;
	examples?: string[];
	relatedRules?: string[];
}

export interface RuleLookupResult {
	rule?: Rule;
	suggestions?: Rule[];
	found: boolean;
}

export class RuleEngine {
	private rules: Map<string, Rule> = new Map();

	constructor() {
		this.initializeRules();
	}

	/**
	 * Look up a rule by name or keyword
	 */
	async lookupRule(query: string): Promise<RuleLookupResult> {
		const normalizedQuery = query.toLowerCase().trim();

		// Direct match
		const directMatch = this.findDirectMatch(normalizedQuery);
		if (directMatch) {
			return { rule: directMatch, found: true };
		}

		// Fuzzy search
		const suggestions = this.findSuggestions(normalizedQuery);

		return {
			suggestions: suggestions.slice(0, 3), // Top 3 suggestions
			found: suggestions.length > 0,
		};
	}

	/**
	 * Get all rules in a category
	 */
	getRulesByCategory(category: Rule['category']): Rule[] {
		return Array.from(this.rules.values()).filter(rule => rule.category === category);
	}

	/**
	 * Find direct rule match
	 */
	private findDirectMatch(query: string): Rule | undefined {
		// Check exact name matches
		for (const rule of this.rules.values()) {
			if (rule.name.toLowerCase() === query) {
				return rule;
			}
		}

		// Check if query is contained in rule name
		for (const rule of this.rules.values()) {
			if (rule.name.toLowerCase().includes(query)) {
				return rule;
			}
		}

		return undefined;
	}

	/**
	 * Find rule suggestions based on keywords
	 */
	private findSuggestions(query: string): Rule[] {
		const suggestions: { rule: Rule; score: number }[] = [];

		for (const rule of this.rules.values()) {
			let score = 0;

			// Name matching
			if (rule.name.toLowerCase().includes(query)) {
				score += 10;
			}

			// Description matching
			if (rule.description.toLowerCase().includes(query)) {
				score += 5;
			}

			// Mechanics matching
			if (rule.mechanics.toLowerCase().includes(query)) {
				score += 3;
			}

			// Keyword matching
			const keywords = query.split(' ');
			for (const keyword of keywords) {
				if (keyword.length > 2) {
					// Skip short words
					if (rule.name.toLowerCase().includes(keyword)) score += 2;
					if (rule.description.toLowerCase().includes(keyword)) score += 1;
				}
			}

			if (score > 0) {
				suggestions.push({ rule, score });
			}
		}

		return suggestions.sort((a, b) => b.score - a.score).map(s => s.rule);
	}

	/**
	 * Initialize D&D 5e rules database
	 */
	private initializeRules(): void {
		const rules: Rule[] = [
			// Combat Rules
			{
				id: 'attack-roll',
				name: 'Attack Roll',
				category: 'combat',
				description:
					'To make an attack roll, roll a d20 and add the appropriate ability modifier.',
				mechanics: '1d20 + ability modifier + proficiency bonus (if proficient)',
				examples: ['Longsword attack: 1d20 + STR modifier + proficiency bonus'],
				relatedRules: ['advantage-disadvantage', 'critical-hit'],
			},
			{
				id: 'advantage-disadvantage',
				name: 'Advantage and Disadvantage',
				category: 'combat',
				description:
					'Roll twice and take the higher (advantage) or lower (disadvantage) result.',
				mechanics: 'Roll 2d20, take the better/worse result',
				examples: [
					'Attacking while hidden grants advantage',
					'Attacking while blinded gives disadvantage',
				],
			},
			{
				id: 'critical-hit',
				name: 'Critical Hit',
				category: 'combat',
				description: 'When you roll a 20 on an attack roll, you score a critical hit.',
				mechanics:
					'Roll damage dice twice and add them together, then add ability modifier',
				examples: ['Critical longsword: 2d8 + STR modifier'],
			},
			{
				id: 'grappling',
				name: 'Grappling',
				category: 'combat',
				description: 'You can grapple a creature to restrain its movement.',
				mechanics: 'Athletics check vs. Athletics or Acrobatics check',
				examples: [
					"Grapple attempt: STR (Athletics) vs target's STR (Athletics) or DEX (Acrobatics)",
				],
			},

			// Skill Rules
			{
				id: 'skill-check',
				name: 'Ability Check',
				category: 'skills',
				description:
					'Roll a d20 and add the relevant ability modifier and proficiency bonus if applicable.',
				mechanics: '1d20 + ability modifier + proficiency bonus (if proficient)',
				examples: [
					'Perception check: 1d20 + WIS modifier + proficiency (if proficient in Perception)',
				],
			},
			{
				id: 'difficulty-class',
				name: 'Difficulty Class (DC)',
				category: 'skills',
				description: 'The target number you need to meet or exceed on an ability check.',
				mechanics:
					'Very Easy: 5, Easy: 10, Medium: 15, Hard: 20, Very Hard: 25, Nearly Impossible: 30',
			},

			// Spellcasting Rules
			{
				id: 'spell-attack',
				name: 'Spell Attack',
				category: 'spellcasting',
				description:
					'Some spells require you to make an attack roll to determine if they hit.',
				mechanics: '1d20 + spellcasting ability modifier + proficiency bonus',
				examples: [
					'Fire Bolt attack: 1d20 + INT modifier + proficiency bonus (for Wizard)',
				],
			},
			{
				id: 'spell-save',
				name: 'Saving Throw',
				category: 'spellcasting',
				description: 'The target rolls a d20 and adds the appropriate ability modifier.',
				mechanics:
					'1d20 + ability modifier. DC = 8 + spellcasting modifier + proficiency bonus',
				examples: ['Fireball Dex save: 1d20 + DEX modifier vs. spell save DC'],
			},
			{
				id: 'concentration',
				name: 'Concentration',
				category: 'spellcasting',
				description: 'Some spells require concentration to maintain their effects.',
				mechanics:
					'Constitution save when taking damage: DC = 10 or half damage dealt, whichever is higher',
				examples: ['Taking 14 damage while concentrating: DC 10 CON save (not DC 7)'],
			},

			// Exploration Rules
			{
				id: 'movement',
				name: 'Movement',
				category: 'exploration',
				description: 'Characters can move up to their speed each turn.',
				mechanics: 'Base speed varies by race. Difficult terrain costs extra movement.',
				examples: [
					'Human base speed: 30 feet',
					'Difficult terrain: 2 feet of movement per 1 foot traveled',
				],
			},
			{
				id: 'stealth',
				name: 'Hiding and Stealth',
				category: 'exploration',
				description: 'You can hide if you are not clearly observed.',
				mechanics: 'Dexterity (Stealth) check vs. passive Perception of observers',
				examples: [
					'Hide behind cover: DEX (Stealth) vs. passive Perception 10 + WIS modifier',
				],
			},
		];

		// Add rules to map
		for (const rule of rules) {
			this.rules.set(rule.id, rule);
		}
	}

	/**
	 * Add a custom rule (for homebrew content)
	 */
	addCustomRule(rule: Rule): void {
		this.rules.set(rule.id, rule);
	}

	/**
	 * Get rule by ID
	 */
	getRule(id: string): Rule | undefined {
		return this.rules.get(id);
	}

	/**
	 * Search rules by multiple criteria
	 */
	searchRules(criteria: { query?: string; category?: Rule['category']; limit?: number }): Rule[] {
		let results = Array.from(this.rules.values());

		// Filter by category
		if (criteria.category) {
			results = results.filter(rule => rule.category === criteria.category);
		}

		// Filter by query
		if (criteria.query) {
			const suggestions = this.findSuggestions(criteria.query.toLowerCase());
			results = results.filter(rule => suggestions.includes(rule));
		}

		// Apply limit
		if (criteria.limit) {
			results = results.slice(0, criteria.limit);
		}

		return results;
	}

	/**
	 * Get random rule (for DM inspiration)
	 */
	getRandomRule(category?: Rule['category']): Rule {
		const rules = category
			? this.getRulesByCategory(category)
			: Array.from(this.rules.values());

		const randomIndex = Math.floor(Math.random() * rules.length);
		return rules[randomIndex];
	}
}
