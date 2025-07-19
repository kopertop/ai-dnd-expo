/**
 * Response Quality Filter for Local DM Agent
 *
 * Filters inappropriate content, validates response format, and ensures quality
 * Implements response regeneration for failed validations
 *
 * Requirements: 6.3, 2.2
 */

export interface QualityFilterConfig {
	// Content filtering settings
	enableContentFilter: boolean;
	enableProfanityFilter: boolean;
	enableViolenceFilter: boolean;
	enableAdultContentFilter: boolean;

	// Format validation settings
	enableFormatValidation: boolean;
	minResponseLength: number;
	maxResponseLength: number;
	requireToolCommands: boolean;

	// Quality validation settings
	enableQualityValidation: boolean;
	minConfidenceScore: number;
	enableContextRelevance: boolean;
	enableGrammarCheck: boolean;

	// Regeneration settings
	enableRegeneration: boolean;
	maxRegenerationAttempts: number;
	regenerationTimeout: number;
}

export interface QualityValidationResult {
	isValid: boolean;
	confidence: number;
	issues: QualityIssue[];
	suggestions: string[];
	shouldRegenerate: boolean;
	filteredText?: string;
}

export interface QualityIssue {
	type: 'content' | 'format' | 'quality' | 'context';
	severity: 'low' | 'medium' | 'high' | 'critical';
	description: string;
	location?: { start: number; end: number };
	suggestion?: string;
}

export interface GameContext {
	playerCharacter: {
		name: string;
		class: string;
		race: string;
		level: number;
	};
	currentScene: string;
	gameWorld: string;
	recentActions: string[];
	activeQuests: string[];
}

/**
 * Response Quality Filter implementation
 */
export class ResponseQualityFilter {
	private config: QualityFilterConfig;
	private contentFilters: ContentFilter[];
	private formatValidators: FormatValidator[];
	private qualityValidators: QualityValidator[];

	constructor(config: QualityFilterConfig) {
		this.config = config;
		this.contentFilters = this.initializeContentFilters();
		this.formatValidators = this.initializeFormatValidators();
		this.qualityValidators = this.initializeQualityValidators();
	}

	/**
	 * Validate and filter response quality
	 * Requirement 6.3: Content filtering and validation
	 */
	async validateResponse(
		responseText: string,
		context: GameContext,
		confidence: number = 0.8,
	): Promise<QualityValidationResult> {
		const issues: QualityIssue[] = [];
		let filteredText = responseText;
		let shouldRegenerate = false;

		try {
			// Content filtering
			if (this.config.enableContentFilter) {
				const contentResult = await this.filterContent(filteredText, context);
				issues.push(...contentResult.issues);
				filteredText = contentResult.filteredText;

				if (contentResult.issues.some(issue => issue.severity === 'critical')) {
					shouldRegenerate = true;
				}
			}

			// Format validation
			if (this.config.enableFormatValidation) {
				const formatResult = await this.validateFormat(filteredText, context);
				issues.push(...formatResult.issues);

				if (formatResult.issues.some(issue => issue.severity === 'high')) {
					shouldRegenerate = true;
				}
			}

			// Quality validation
			if (this.config.enableQualityValidation) {
				const qualityResult = await this.validateQuality(filteredText, context, confidence);
				issues.push(...qualityResult.issues);

				if (confidence < this.config.minConfidenceScore) {
					shouldRegenerate = true;
				}
			}

			// Generate suggestions for improvement
			const suggestions = this.generateSuggestions(issues, context);

			return {
				isValid:
					!shouldRegenerate && issues.filter(i => i.severity === 'critical').length === 0,
				confidence,
				issues,
				suggestions,
				shouldRegenerate: shouldRegenerate && this.config.enableRegeneration,
				filteredText,
			};
		} catch (error) {
			console.error('❌ Response quality validation failed:', error);

			return {
				isValid: false,
				confidence: 0,
				issues: [
					{
						type: 'quality',
						severity: 'critical',
						description: 'Quality validation system error',
					},
				],
				suggestions: ['Try regenerating the response'],
				shouldRegenerate: true,
				filteredText: responseText,
			};
		}
	}

	/**
	 * Filter inappropriate content
	 */
	private async filterContent(
		text: string,
		context: GameContext,
	): Promise<{
		filteredText: string;
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];
		let filteredText = text;

		for (const filter of this.contentFilters) {
			const result = await filter.filter(filteredText, context);
			issues.push(...result.issues);
			filteredText = result.filteredText;
		}

		return { filteredText, issues };
	}

	/**
	 * Validate response format
	 */
	private async validateFormat(
		text: string,
		context: GameContext,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		for (const validator of this.formatValidators) {
			const result = await validator.validate(text, context);
			issues.push(...result.issues);
		}

		return { issues };
	}

	/**
	 * Validate response quality
	 */
	private async validateQuality(
		text: string,
		context: GameContext,
		confidence: number,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		for (const validator of this.qualityValidators) {
			const result = await validator.validate(text, context, confidence);
			issues.push(...result.issues);
		}

		return { issues };
	}

	/**
	 * Generate improvement suggestions
	 */
	private generateSuggestions(issues: QualityIssue[], context: GameContext): string[] {
		const suggestions: string[] = [];

		// Group issues by type
		const contentIssues = issues.filter(i => i.type === 'content');
		const formatIssues = issues.filter(i => i.type === 'format');
		const qualityIssues = issues.filter(i => i.type === 'quality');
		const contextIssues = issues.filter(i => i.type === 'context');

		if (contentIssues.length > 0) {
			suggestions.push('Ensure content is appropriate for D&D gameplay');
		}

		if (formatIssues.length > 0) {
			suggestions.push('Check response length and format requirements');
		}

		if (qualityIssues.length > 0) {
			suggestions.push('Improve response quality and coherence');
		}

		if (contextIssues.length > 0) {
			suggestions.push(
				`Make response more relevant to ${context.currentScene} in ${context.gameWorld}`,
			);
		}

		return suggestions;
	}

	/**
	 * Initialize content filters
	 */
	private initializeContentFilters(): ContentFilter[] {
		const filters: ContentFilter[] = [];

		if (this.config.enableProfanityFilter) {
			filters.push(new ProfanityFilter());
		}

		if (this.config.enableViolenceFilter) {
			filters.push(new ViolenceFilter());
		}

		if (this.config.enableAdultContentFilter) {
			filters.push(new AdultContentFilter());
		}

		return filters;
	}

	/**
	 * Initialize format validators
	 */
	private initializeFormatValidators(): FormatValidator[] {
		return [
			new LengthValidator(this.config.minResponseLength, this.config.maxResponseLength),
			new StructureValidator(),
			new ToolCommandValidator(this.config.requireToolCommands),
		];
	}

	/**
	 * Initialize quality validators
	 */
	private initializeQualityValidators(): QualityValidator[] {
		const validators: QualityValidator[] = [new CoherenceValidator(), new RelevanceValidator()];

		if (this.config.enableGrammarCheck) {
			validators.push(new GrammarValidator());
		}

		if (this.config.enableContextRelevance) {
			validators.push(new ContextRelevanceValidator());
		}

		return validators;
	}
}

/**
 * Base content filter interface
 */
abstract class ContentFilter {
	abstract filter(
		text: string,
		context: GameContext,
	): Promise<{
		filteredText: string;
		issues: QualityIssue[];
	}>;
}

/**
 * Profanity filter implementation
 */
class ProfanityFilter extends ContentFilter {
	private profanityWords = [
		// Common profanity patterns - would be more comprehensive in production
		/\b(damn|hell|crap)\b/gi,
		/\b[a-z]*shit[a-z]*\b/gi,
		/\b[a-z]*fuck[a-z]*\b/gi,
	];

	async filter(
		text: string,
		context: GameContext,
	): Promise<{
		filteredText: string;
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];
		let filteredText = text;

		for (const pattern of this.profanityWords) {
			const matches = text.match(pattern);
			if (matches) {
				// Replace with D&D appropriate alternatives
				filteredText = filteredText.replace(pattern, match => {
					return '*'.repeat(match.length);
				});

				issues.push({
					type: 'content',
					severity: 'medium',
					description: 'Profanity detected and filtered',
					suggestion: 'Use D&D appropriate language',
				});
			}
		}

		return { filteredText, issues };
	}
}

/**
 * Violence filter for excessive content
 */
class ViolenceFilter extends ContentFilter {
	private excessiveViolencePatterns = [
		/\b(torture|mutilate|dismember|gore|blood bath)\b/gi,
		/\b(brutal[ly]* kill|savage[ly]* murder)\b/gi,
	];

	async filter(
		text: string,
		context: GameContext,
	): Promise<{
		filteredText: string;
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];
		let filteredText = text;

		for (const pattern of this.excessiveViolencePatterns) {
			if (pattern.test(text)) {
				issues.push({
					type: 'content',
					severity: 'high',
					description: 'Excessive violence detected',
					suggestion: 'Use more appropriate combat descriptions for D&D',
				});

				// Replace with milder alternatives
				filteredText = filteredText.replace(pattern, 'defeats');
			}
		}

		return { filteredText, issues };
	}
}

/**
 * Adult content filter
 */
class AdultContentFilter extends ContentFilter {
	private adultContentPatterns = [
		/\b(sexual|erotic|intimate|romantic)\b/gi,
		/\b(seductive|alluring|provocative)\b/gi,
	];

	async filter(
		text: string,
		context: GameContext,
	): Promise<{
		filteredText: string;
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];
		let filteredText = text;

		for (const pattern of this.adultContentPatterns) {
			if (pattern.test(text)) {
				issues.push({
					type: 'content',
					severity: 'critical',
					description: 'Adult content detected',
					suggestion: 'Keep content appropriate for all ages',
				});

				// Remove or replace adult content
				filteredText = filteredText.replace(pattern, 'charming');
			}
		}

		return { filteredText, issues };
	}
}

/**
 * Base format validator interface
 */
abstract class FormatValidator {
	abstract validate(
		text: string,
		context: GameContext,
	): Promise<{
		issues: QualityIssue[];
	}>;
}

/**
 * Response length validator
 */
class LengthValidator extends FormatValidator {
	constructor(
		private minLength: number,
		private maxLength: number,
	) {
		super();
	}

	async validate(
		text: string,
		context: GameContext,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		if (text.length < this.minLength) {
			issues.push({
				type: 'format',
				severity: 'medium',
				description: `Response too short (${text.length} < ${this.minLength} characters)`,
				suggestion: 'Provide more detailed response',
			});
		}

		if (text.length > this.maxLength) {
			issues.push({
				type: 'format',
				severity: 'medium',
				description: `Response too long (${text.length} > ${this.maxLength} characters)`,
				suggestion: 'Make response more concise',
			});
		}

		return { issues };
	}
}

/**
 * Response structure validator
 */
class StructureValidator extends FormatValidator {
	async validate(
		text: string,
		context: GameContext,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		// Check for basic sentence structure
		if (!text.match(/[.!?]$/)) {
			issues.push({
				type: 'format',
				severity: 'low',
				description: 'Response should end with proper punctuation',
				suggestion: 'Add appropriate ending punctuation',
			});
		}

		// Check for paragraph structure for longer responses
		if (text.length > 200 && !text.includes('\n') && text.split('.').length > 3) {
			issues.push({
				type: 'format',
				severity: 'low',
				description: 'Long response should be broken into paragraphs',
				suggestion: 'Add paragraph breaks for readability',
			});
		}

		return { issues };
	}
}

/**
 * Tool command validator
 */
class ToolCommandValidator extends FormatValidator {
	constructor(private requireToolCommands: boolean) {
		super();
	}

	async validate(
		text: string,
		context: GameContext,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		if (this.requireToolCommands) {
			const hasToolCommands = /\[(\w+):([^\]]+)\]/.test(text);

			if (!hasToolCommands) {
				issues.push({
					type: 'format',
					severity: 'medium',
					description: 'Response should include appropriate tool commands',
					suggestion: 'Add dice rolls or character updates as needed',
				});
			}
		}

		// Validate tool command format
		const toolCommandMatches = text.match(/\[(\w+):([^\]]+)\]/g);
		if (toolCommandMatches) {
			for (const match of toolCommandMatches) {
				const [, type, params] = match.match(/\[(\w+):([^\]]+)\]/) || [];

				if (
					!['roll', 'update', 'damage', 'heal', 'status', 'inventory'].includes(
						type?.toLowerCase(),
					)
				) {
					issues.push({
						type: 'format',
						severity: 'medium',
						description: `Unknown tool command type: ${type}`,
						suggestion: 'Use valid tool command types',
					});
				}
			}
		}

		return { issues };
	}
}

/**
 * Base quality validator interface
 */
abstract class QualityValidator {
	abstract validate(
		text: string,
		context: GameContext,
		confidence: number,
	): Promise<{
		issues: QualityIssue[];
	}>;
}

/**
 * Response coherence validator
 */
class CoherenceValidator extends QualityValidator {
	async validate(
		text: string,
		context: GameContext,
		confidence: number,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		// Check for repetitive content
		const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
		const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));

		if (sentences.length > 2 && uniqueSentences.size < sentences.length * 0.8) {
			issues.push({
				type: 'quality',
				severity: 'medium',
				description: 'Response contains repetitive content',
				suggestion: 'Vary sentence structure and content',
			});
		}

		// Check for contradictory statements
		if (this.hasContradictions(text)) {
			issues.push({
				type: 'quality',
				severity: 'high',
				description: 'Response contains contradictory statements',
				suggestion: 'Ensure logical consistency',
			});
		}

		return { issues };
	}

	private hasContradictions(text: string): boolean {
		// Simple contradiction detection
		const lowerText = text.toLowerCase();

		// Check for opposing statements
		const opposingPairs = [
			['yes', 'no'],
			['success', 'fail'],
			['hit', 'miss'],
			['alive', 'dead'],
		];

		for (const [word1, word2] of opposingPairs) {
			if (lowerText.includes(word1) && lowerText.includes(word2)) {
				// Check if they're in close proximity (might indicate contradiction)
				const index1 = lowerText.indexOf(word1);
				const index2 = lowerText.indexOf(word2);
				if (Math.abs(index1 - index2) < 50) {
					return true;
				}
			}
		}

		return false;
	}
}

/**
 * Response relevance validator
 */
class RelevanceValidator extends QualityValidator {
	async validate(
		text: string,
		context: GameContext,
		confidence: number,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		// Check if response mentions character or context
		const lowerText = text.toLowerCase();
		const hasCharacterReference =
			lowerText.includes(context.playerCharacter.name.toLowerCase()) ||
			lowerText.includes(context.playerCharacter.class.toLowerCase()) ||
			lowerText.includes(context.playerCharacter.race.toLowerCase());

		const hasSceneReference =
			lowerText.includes(context.currentScene.toLowerCase()) ||
			lowerText.includes(context.gameWorld.toLowerCase());

		if (!hasCharacterReference && !hasSceneReference) {
			issues.push({
				type: 'context',
				severity: 'medium',
				description: 'Response lacks context relevance',
				suggestion: 'Reference the character, scene, or game world',
			});
		}

		return { issues };
	}
}

/**
 * Grammar validator (basic implementation)
 */
class GrammarValidator extends QualityValidator {
	async validate(
		text: string,
		context: GameContext,
		confidence: number,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		// Basic grammar checks
		if (this.hasBasicGrammarErrors(text)) {
			issues.push({
				type: 'quality',
				severity: 'low',
				description: 'Potential grammar issues detected',
				suggestion: 'Review grammar and sentence structure',
			});
		}

		return { issues };
	}

	private hasBasicGrammarErrors(text: string): boolean {
		// Very basic grammar checks
		const commonErrors = [
			/\bi\s+am\b/gi, // Should be "I am"
			/\byour\s+going\b/gi, // Should be "you're going"
			/\bits\s+a\b/gi, // Check for "it's" vs "its"
		];

		return commonErrors.some(pattern => pattern.test(text));
	}
}

/**
 * Context relevance validator
 */
class ContextRelevanceValidator extends QualityValidator {
	async validate(
		text: string,
		context: GameContext,
		confidence: number,
	): Promise<{
		issues: QualityIssue[];
	}> {
		const issues: QualityIssue[] = [];

		// Check relevance to recent actions
		if (context.recentActions.length > 0) {
			const recentAction = context.recentActions[context.recentActions.length - 1];
			const actionKeywords = recentAction.toLowerCase().split(' ');
			const responseWords = text.toLowerCase().split(' ');

			const relevanceScore =
				actionKeywords.filter(word =>
					responseWords.some(
						respWord => respWord.includes(word) || word.includes(respWord),
					),
				).length / actionKeywords.length;

			if (relevanceScore < 0.2) {
				issues.push({
					type: 'context',
					severity: 'medium',
					description: 'Response not relevant to recent player action',
					suggestion: "Address the player's most recent action",
				});
			}
		}

		return { issues };
	}
}

/**
 * Default quality filter configuration
 */
export const DefaultQualityFilterConfig: QualityFilterConfig = {
	// Content filtering
	enableContentFilter: true,
	enableProfanityFilter: true,
	enableViolenceFilter: true,
	enableAdultContentFilter: true,

	// Format validation
	enableFormatValidation: true,
	minResponseLength: 20,
	maxResponseLength: 500,
	requireToolCommands: false,

	// Quality validation
	enableQualityValidation: true,
	minConfidenceScore: 0.6,
	enableContextRelevance: true,
	enableGrammarCheck: false, // Disabled by default for performance

	// Regeneration
	enableRegeneration: true,
	maxRegenerationAttempts: 2,
	regenerationTimeout: 10000,
};

/**
 * Strict quality filter configuration for family-friendly content
 */
export const StrictQualityFilterConfig: QualityFilterConfig = {
	...DefaultQualityFilterConfig,
	enableViolenceFilter: true,
	enableAdultContentFilter: true,
	minConfidenceScore: 0.8,
	enableGrammarCheck: true,
	maxRegenerationAttempts: 3,
};

/**
 * Performance-optimized quality filter configuration
 */
export const PerformanceQualityFilterConfig: QualityFilterConfig = {
	...DefaultQualityFilterConfig,
	enableGrammarCheck: false,
	enableContextRelevance: false,
	maxRegenerationAttempts: 1,
	regenerationTimeout: 5000,
};
