/**
 * Gemma3 Tokenizer for Local AI D&D Platform
 *
 * Handles tokenization and detokenization for Gemma3 models with D&D-specific
 * prompt formatting and special token handling.
 *
 * Requirements: 2.1, 2.2
 */

export interface TokenizerConfig {
	vocabSize: number;
	bosToken: string;
	eosToken: string;
	unkToken: string;
	padToken: string;
	specialTokens: Record<string, number>;
	maxSequenceLength: number;
}

export interface TokenizationResult {
	inputIds: number[];
	attentionMask: number[];
	positionIds?: number[];
	tokenCount: number;
}

export interface DetokenizationResult {
	text: string;
	specialTokensFound: string[];
	truncated: boolean;
}

export interface DnDPromptContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
	systemPrompt?: string;
}

/**
 * Gemma3 Tokenizer for D&D applications
 * Handles tokenization with D&D-specific prompt formatting
 */
export class Gemma3Tokenizer {
	private config: TokenizerConfig;
	private vocabMap: Map<string, number> = new Map();
	private reverseVocabMap: Map<number, string> = new Map();
	private isInitialized = false;

	constructor(config?: Partial<TokenizerConfig>) {
		this.config = {
			vocabSize: 32000,
			bosToken: '<bos>',
			eosToken: '<eos>',
			unkToken: '<unk>',
			padToken: '<pad>',
			specialTokens: {
				'<bos>': 1,
				'<eos>': 2,
				'<unk>': 3,
				'<pad>': 0,
				'<start_of_turn>': 106,
				'<end_of_turn>': 107,
				'<start_of_dm>': 108, // Custom D&D token
				'<end_of_dm>': 109, // Custom D&D token
			},
			maxSequenceLength: 2048,
			...config,
		};
	}

	/**
	 * Initialize tokenizer with vocabulary
	 * In a real implementation, this would load from a tokenizer.json file
	 */
	async initialize(): Promise<void> {
		try {
			console.log('🔤 Initializing Gemma3 tokenizer...');

			// Initialize special tokens
			for (const [token, id] of Object.entries(this.config.specialTokens)) {
				this.vocabMap.set(token, id);
				this.reverseVocabMap.set(id, token);
			}

			// In a real implementation, we would load the full vocabulary
			// For now, we'll create a basic vocabulary for common words
			await this.initializeBasicVocabulary();

			this.isInitialized = true;
			console.log('✅ Gemma3 tokenizer initialized');
		} catch (error) {
			console.error('❌ Failed to initialize tokenizer:', error);
			throw new Error(`Tokenizer initialization failed: ${error}`);
		}
	}

	/**
	 * Compatibility helper for tests - marks vocab as loaded.
	 */
	async loadVocab(): Promise<boolean> {
		await this.initialize();
		return true;
	}

	/**
	 * Tokenize text with D&D-specific formatting
	 * Requirement 2.1: D&D-specific prompt formatting
	 */
	async tokenize(text: string, context?: DnDPromptContext): Promise<TokenizationResult> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			// Format text with D&D context if provided
			const formattedText = context ? this.formatDnDPrompt(text, context) : text;

			// Basic tokenization (in a real implementation, this would use SentencePiece)
			const tokens = this.basicTokenize(formattedText);

			// Add special tokens
			const inputIds = [
				this.config.specialTokens['<bos>'],
				...tokens,
				this.config.specialTokens['<eos>'],
			];

			// Create attention mask (1 for real tokens, 0 for padding)
			const attentionMask = new Array(inputIds.length).fill(1);

			// Create position IDs
			const positionIds = Array.from({ length: inputIds.length }, (_, i) => i);

			// Truncate if too long
			if (inputIds.length > this.config.maxSequenceLength) {
				inputIds.splice(this.config.maxSequenceLength);
				attentionMask.splice(this.config.maxSequenceLength);
				positionIds.splice(this.config.maxSequenceLength);

				// Ensure we end with EOS token
				inputIds[inputIds.length - 1] = this.config.specialTokens['<eos>'];
			}

			return {
				inputIds,
				attentionMask,
				positionIds,
				tokenCount: inputIds.length,
			};
		} catch (error) {
			console.error('❌ Tokenization failed:', error);
			throw new Error(`Tokenization failed: ${error}`);
		}
	}

	/**
	 * Detokenize token IDs back to text
	 * Requirement 2.2: Proper output handling
	 */
	async detokenize(tokenIds: number[]): Promise<DetokenizationResult> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			const tokens: string[] = [];
			const specialTokensFound: string[] = [];
			const truncated = false;

			for (const tokenId of tokenIds) {
				const token = this.reverseVocabMap.get(tokenId);

				if (token) {
					// Check if it's a special token
					if (Object.values(this.config.specialTokens).includes(tokenId)) {
						specialTokensFound.push(token);

						// Skip certain special tokens in output
						if (!['<bos>', '<eos>', '<pad>'].includes(token)) {
							tokens.push(token);
						}
					} else {
						tokens.push(token);
					}
				} else {
					// Unknown token, use UNK
					tokens.push(this.config.unkToken);
				}
			}

			// Join tokens and clean up
			let text = tokens.join(' ');
			text = this.postProcessText(text);

			return {
				text,
				specialTokensFound,
				truncated,
			};
		} catch (error) {
			console.error('❌ Detokenization failed:', error);
			throw new Error(`Detokenization failed: ${error}`);
		}
	}

	/**
	 * Format D&D-specific prompt with context
	 * Requirement 2.1: D&D-specific prompt formatting
	 */
	private formatDnDPrompt(userInput: string, context: DnDPromptContext): string {
		const systemPrompt = context.systemPrompt || this.getDefaultDnDSystemPrompt();

		let prompt = `${systemPrompt}\n\n`;

		// Add character context
		prompt += '<start_of_turn>user\n';
		prompt += `Character: ${context.playerName} (${context.playerRace} ${context.playerClass})\n`;
		prompt += `Location: ${context.currentScene}\n`;

		// Add recent game history for context
		if (context.gameHistory.length > 0) {
			const recentHistory = context.gameHistory.slice(-3).join(' ');
			prompt += `Recent events: ${recentHistory}\n`;
		}

		prompt += `Action: ${userInput}\n`;
		prompt += '<end_of_turn>\n';

		// Start DM response
		prompt += '<start_of_turn>model\n<start_of_dm>\n';

		return prompt;
	}

	/**
	 * Get default D&D system prompt for Gemma3
	 */
	private getDefaultDnDSystemPrompt(): string {
		return `You are an experienced Dungeon Master running a D&D 5e campaign. Your role is to:

1. Create engaging, immersive narratives that respond to player actions
2. Follow D&D 5e rules accurately for combat, skill checks, and magic
3. Generate appropriate dice roll commands using [ROLL:XdY+Z] format
4. Maintain story consistency and character development
5. Keep responses concise (1-3 sentences) but descriptive
6. Create challenging but fair encounters
7. Encourage creative problem-solving

Response format:
- Describe the scene and consequences of the player's action
- Include dice rolls when appropriate: [ROLL:1d20+modifier]
- Use character updates when needed: [UPDATE:HP-5] or [UPDATE:XP+100]
- End with a question or prompt for the next action

Always stay in character as the DM and maintain the fantasy atmosphere.`;
	}

	/**
	 * Basic tokenization (simplified version)
	 * In a real implementation, this would use SentencePiece or similar
	 */
	private basicTokenize(text: string): number[] {
		// Simple word-based tokenization for demonstration
		// Real implementation would use subword tokenization
		const words = text
			.toLowerCase()
			.replace(/[^\w\s<>]/g, ' ')
			.split(/\s+/)
			.filter(word => word.length > 0);

		const tokens: number[] = [];

		for (const word of words) {
			// Check if it's a special token
			if (this.vocabMap.has(word)) {
				tokens.push(this.vocabMap.get(word)!);
			} else {
				// Simple hash-based token ID generation (not production-ready)
				const tokenId = (this.simpleHash(word) % (this.config.vocabSize - 1000)) + 1000;
				tokens.push(tokenId);
			}
		}

		return tokens;
	}

	/**
	 * Initialize basic vocabulary for common words
	 */
	private async initializeBasicVocabulary(): Promise<void> {
		// Common D&D and English words
		const commonWords = [
			'the',
			'a',
			'an',
			'and',
			'or',
			'but',
			'in',
			'on',
			'at',
			'to',
			'for',
			'of',
			'with',
			'by',
			'you',
			'your',
			'i',
			'me',
			'my',
			'we',
			'us',
			'our',
			'they',
			'them',
			'their',
			'he',
			'him',
			'his',
			'she',
			'her',
			'attack',
			'hit',
			'damage',
			'roll',
			'dice',
			'check',
			'save',
			'spell',
			'cast',
			'move',
			'go',
			'look',
			'search',
			'sword',
			'shield',
			'armor',
			'bow',
			'arrow',
			'magic',
			'potion',
			'gold',
			'treasure',
			'door',
			'room',
			'dungeon',
			'dragon',
			'goblin',
			'orc',
			'skeleton',
			'zombie',
			'wizard',
			'fighter',
			'rogue',
			'cleric',
			'barbarian',
			'strength',
			'dexterity',
			'constitution',
			'intelligence',
			'wisdom',
			'charisma',
			'hp',
			'health',
			'mana',
		];

		let tokenId = 100; // Start after special tokens
		for (const word of commonWords) {
			if (!this.vocabMap.has(word)) {
				this.vocabMap.set(word, tokenId);
				this.reverseVocabMap.set(tokenId, word);
				tokenId++;
			}
		}
	}

	/**
	 * Simple hash function for generating token IDs
	 */
	private simpleHash(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Post-process detokenized text
	 */
	private postProcessText(text: string): string {
		return text
			.replace(/\s+/g, ' ') // Normalize whitespace
			.replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
			.replace(/\(\s+/g, '(') // Remove space after opening parenthesis
			.replace(/\s+\)/g, ')') // Remove space before closing parenthesis
			.trim();
	}

	/**
	 * Get tokenizer configuration
	 */
	getConfig(): TokenizerConfig {
		return { ...this.config };
	}

	/**
	 * Check if tokenizer is ready
	 */
	isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Get vocabulary size
	 */
	getVocabSize(): number {
		return this.config.vocabSize;
	}

	/**
	 * Simple encode helper used by tests (delegates to tokenize).
	 */
	async encode(text: string, context?: DnDPromptContext): Promise<number[]> {
		const result = await this.tokenize(text, context);
		return result.inputIds;
	}

	/**
	 * Simple decode helper used by tests (delegates to detokenize).
	 */
	async decode(tokenIds: number[]): Promise<string> {
		const result = await this.detokenize(tokenIds);
		return result.text;
	}

	/**
	 * Get special token ID
	 */
	getSpecialTokenId(token: string): number | undefined {
		return this.config.specialTokens[token];
	}

	/**
	 * Encode special D&D commands in text
	 */
	encodeDnDCommands(text: string): string {
		// Replace D&D tool commands with special tokens for better model understanding
		return text
			.replace(/\[ROLL:([^\]]+)\]/g, '<roll>$1</roll>')
			.replace(/\[UPDATE:([^\]]+)\]/g, '<update>$1</update>')
			.replace(/\[DAMAGE:([^\]]+)\]/g, '<damage>$1</damage>')
			.replace(/\[HEAL:([^\]]+)\]/g, '<heal>$1</heal>');
	}

	/**
	 * Decode special D&D commands from text
	 */
	decodeDnDCommands(text: string): string {
		// Convert special tokens back to D&D tool commands
		return text
			.replace(/<roll>([^<]+)<\/roll>/g, '[ROLL:$1]')
			.replace(/<update>([^<]+)<\/update>/g, '[UPDATE:$1]')
			.replace(/<damage>([^<]+)<\/damage>/g, '[DAMAGE:$1]')
			.replace(/<heal>([^<]+)<\/heal>/g, '[HEAL:$1]');
	}
}

/**
 * Utility functions for Gemma3 tokenization
 */
export const Gemma3TokenizerUtils = {
	/**
	 * Estimate token count for text (rough approximation)
	 */
	estimateTokenCount(text: string): number {
		// Rough estimation: ~4 characters per token for English text
		return Math.ceil(text.length / 4);
	},

	/**
	 * Truncate text to fit within token limit
	 */
	truncateToTokenLimit(text: string, maxTokens: number): string {
		const estimatedTokens = Gemma3TokenizerUtils.estimateTokenCount(text);

		if (estimatedTokens <= maxTokens) {
			return text;
		}

		// Rough truncation based on character count
		const maxChars = maxTokens * 4;
		return text.substring(0, maxChars - 3) + '...';
	},

	/**
	 * Validate D&D prompt format
	 */
	validateDnDPrompt(prompt: string): {
		valid: boolean;
		issues: string[];
		suggestions: string[];
	} {
		const issues: string[] = [];
		const suggestions: string[] = [];

		// Check for required D&D context
		if (!prompt.includes('Character:')) {
			issues.push('Missing character information');
			suggestions.push('Include character name, race, and class');
		}

		if (!prompt.includes('Location:') && !prompt.includes('Scene:')) {
			issues.push('Missing location/scene context');
			suggestions.push('Include current location or scene description');
		}

		// Check prompt length
		if (prompt.length < 50) {
			issues.push('Prompt too short for meaningful context');
			suggestions.push('Provide more detail about the action or situation');
		}

		if (prompt.length > 2000) {
			issues.push('Prompt too long, may exceed token limits');
			suggestions.push('Condense the prompt to focus on key information');
		}

		return {
			valid: issues.length === 0,
			issues,
			suggestions,
		};
	},

	/**
	 * Extract D&D commands from tokenized output
	 */
	extractDnDCommands(text: string): Array<{
		type: 'roll' | 'update' | 'damage' | 'heal' | 'status';
		params: string;
		position: number;
	}> {
		const commands: Array<{
			type: 'roll' | 'update' | 'damage' | 'heal' | 'status';
			params: string;
			position: number;
		}> = [];

		const patterns = [
			{ type: 'roll' as const, regex: /\[ROLL:([^\]]+)\]/g },
			{ type: 'update' as const, regex: /\[UPDATE:([^\]]+)\]/g },
			{ type: 'damage' as const, regex: /\[DAMAGE:([^\]]+)\]/g },
			{ type: 'heal' as const, regex: /\[HEAL:([^\]]+)\]/g },
			{ type: 'status' as const, regex: /\[STATUS:([^\]]+)\]/g },
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.regex.exec(text)) !== null) {
				commands.push({
					type: pattern.type,
					params: match[1],
					position: match.index,
				});
			}
		}

		// Sort by position in text
		return commands.sort((a, b) => a.position - b.position);
	},
};

/**
 * Default tokenizer configuration for Gemma3
 */
export const DefaultGemma3TokenizerConfig: TokenizerConfig = {
	vocabSize: 32000,
	bosToken: '<bos>',
	eosToken: '<eos>',
	unkToken: '<unk>',
	padToken: '<pad>',
	specialTokens: {
		'<bos>': 1,
		'<eos>': 2,
		'<unk>': 3,
		'<pad>': 0,
		'<start_of_turn>': 106,
		'<end_of_turn>': 107,
		'<start_of_dm>': 108,
		'<end_of_dm>': 109,
	},
	maxSequenceLength: 2048,
};
