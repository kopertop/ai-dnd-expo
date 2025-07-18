import { localAIProvider } from './providers/local-ai-provider';

/**
 * D&D-specific AI service that uses local Gemma3 models
 * This service provides AI functionality for D&D gameplay including:
 * - Dungeon Master responses
 * - NPC dialogue
 * - Character companion interactions
 * - Rule explanations
 */
export class DnDAIService {
	private readonly defaultModelId = 'gemma-3-2b-instruct';
	private isInitialized = false;

	/**
	 * Initialize the D&D AI service
	 */
	async initialize() {
		if (this.isInitialized) return;

		console.log('🎲 Initializing D&D AI Service...');
		
		try {
			await localAIProvider.initialize();
			this.isInitialized = true;
			console.log('✅ D&D AI Service initialized successfully');
		} catch (error) {
			console.error('❌ Failed to initialize D&D AI Service:', error);
			throw error;
		}
	}

	/**
	 * Generate Dungeon Master response
	 * @param playerMessage - The player's message
	 * @param context - Game context including character info, location, etc.
	 */
	async generateDMResponse(
		playerMessage: string,
		context: {
			characterName?: string;
			characterClass?: string;
			characterRace?: string;
			currentLocation?: string;
			gameHistory?: string[];
			companions?: string[];
		} = {},
	): Promise<string> {
		await this.initialize();

		const systemPrompt = this.buildDMSystemPrompt(context);
		const messages = [
			{ role: 'system' as const, content: systemPrompt },
			{ role: 'user' as const, content: playerMessage },
		];

		return localAIProvider.generateText(this.defaultModelId, messages, {
			temperature: 0.8,
			maxTokens: 300,
		});
	}

	/**
	 * Generate streaming Dungeon Master response
	 * @param playerMessage - The player's message
	 * @param context - Game context
	 */
	async generateDMResponseStream(
		playerMessage: string,
		context: {
			characterName?: string;
			characterClass?: string;
			characterRace?: string;
			currentLocation?: string;
			gameHistory?: string[];
			companions?: string[];
		} = {},
	) {
		await this.initialize();

		const systemPrompt = this.buildDMSystemPrompt(context);
		const messages = [
			{ role: 'system' as const, content: systemPrompt },
			{ role: 'user' as const, content: playerMessage },
		];

		return localAIProvider.generateStream(this.defaultModelId, messages, {
			temperature: 0.8,
			maxTokens: 300,
		});
	}

	/**
	 * Generate NPC dialogue
	 * @param npcName - The NPC's name
	 * @param npcType - The type of NPC (shopkeeper, guard, etc.)
	 * @param playerMessage - What the player said
	 * @param context - Additional context
	 */
	async generateNPCDialogue(
		npcName: string,
		npcType: string,
		playerMessage: string,
		context: {
			location?: string;
			relationship?: string;
			mood?: string;
		} = {},
	): Promise<string> {
		await this.initialize();

		const systemPrompt = `You are ${npcName}, a ${npcType} in a D&D fantasy setting. 
${context.location ? `You are currently in ${context.location}. ` : ''}
${context.relationship ? `Your relationship with the player is: ${context.relationship}. ` : ''}
${context.mood ? `Your current mood is: ${context.mood}. ` : ''}
Respond in character with dialogue that fits your role. Keep responses concise (2-3 sentences max).`;

		const messages = [
			{ role: 'system' as const, content: systemPrompt },
			{ role: 'user' as const, content: playerMessage },
		];

		return localAIProvider.generateText(this.defaultModelId, messages, {
			temperature: 0.9,
			maxTokens: 150,
		});
	}

	/**
	 * Generate companion response
	 * @param companionName - The companion's name
	 * @param companionClass - The companion's class
	 * @param situation - The current situation
	 * @param playerMessage - What the player said
	 */
	async generateCompanionResponse(
		companionName: string,
		companionClass: string,
		situation: string,
		playerMessage: string,
	): Promise<string> {
		await this.initialize();

		const systemPrompt = `You are ${companionName}, a ${companionClass} companion in a D&D adventure. 
Current situation: ${situation}
You are loyal to the player and want to help them succeed. Respond as a helpful companion would, offering advice or support. Keep responses brief and in character.`;

		const messages = [
			{ role: 'system' as const, content: systemPrompt },
			{ role: 'user' as const, content: playerMessage },
		];

		return localAIProvider.generateText(this.defaultModelId, messages, {
			temperature: 0.7,
			maxTokens: 100,
		});
	}

	/**
	 * Explain D&D rules
	 * @param question - The player's question about rules
	 */
	async explainRules(question: string): Promise<string> {
		await this.initialize();

		const systemPrompt = `You are a helpful D&D 5e rules advisor. Explain D&D rules clearly and concisely. 
If you're not sure about a specific rule, say so and suggest checking the official rulebooks. 
Keep explanations beginner-friendly but accurate.`;

		const messages = [
			{ role: 'system' as const, content: systemPrompt },
			{ role: 'user' as const, content: question },
		];

		return localAIProvider.generateText(this.defaultModelId, messages, {
			temperature: 0.3,
			maxTokens: 200,
		});
	}

	/**
	 * Download and prepare a model for D&D use
	 * @param modelId - The model ID to download
	 * @param onProgress - Progress callback
	 */
	async downloadModel(
		modelId: string = this.defaultModelId,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		console.log(`🎲 Downloading D&D AI model: ${modelId}`);
		
		await localAIProvider.downloadModel(modelId, onProgress);
		await localAIProvider.prepareModel(modelId);
		
		console.log(`✅ D&D AI model ready: ${modelId}`);
	}

	/**
	 * Get available models for D&D
	 */
	async getAvailableModels(): Promise<string[]> {
		return localAIProvider.getAvailableModels();
	}

	/**
	 * Check if the service is ready for use
	 */
	isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Build the system prompt for the Dungeon Master
	 */
	private buildDMSystemPrompt(context: {
		characterName?: string;
		characterClass?: string;
		characterRace?: string;
		currentLocation?: string;
		gameHistory?: string[];
		companions?: string[];
	}): string {
		let prompt = `You are an experienced Dungeon Master running a D&D 5e campaign. You create engaging, immersive experiences while being fair and fun.

Guidelines:
- Keep responses concise (2-4 sentences)
- Ask for dice rolls when appropriate
- Describe scenes vividly but briefly
- Encourage player creativity
- Be encouraging and supportive
- Follow D&D 5e rules

`;

		if (context.characterName) {
			prompt += `Player Character: ${context.characterName}`;
			if (context.characterRace) prompt += ` (${context.characterRace}`;
			if (context.characterClass) prompt += ` ${context.characterClass}`;
			if (context.characterRace || context.characterClass) prompt += ')';
			prompt += '\n';
		}

		if (context.currentLocation) {
			prompt += `Current Location: ${context.currentLocation}\n`;
		}

		if (context.companions && context.companions.length > 0) {
			prompt += `Companions: ${context.companions.join(', ')}\n`;
		}

		if (context.gameHistory && context.gameHistory.length > 0) {
			prompt += `Recent Events: ${context.gameHistory.slice(-3).join('; ')}\n`;
		}

		return prompt;
	}
}

// Global instance
export const dndAIService = new DnDAIService();