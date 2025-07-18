/**
 * Simplified AI Service Manager for iOS-only D&D Platform
 * 
 * Uses only Apple Intelligence for completely offline gameplay
 * No cloud dependencies, no complex fallback chains
 */

import { AppleAIProvider, DnDContext, DnDResponse } from './apple-ai-provider';

export interface SimpleAIConfig {
	enableCache: boolean;
	cacheSize: number;
	timeout: number;
}

export class SimpleAIManager {
	private appleProvider: AppleAIProvider;
	private config: SimpleAIConfig;
	private responseCache = new Map<string, DnDResponse>();

	constructor(config: SimpleAIConfig = {
		enableCache: true,
		cacheSize: 50,
		timeout: 10000,
	}) {
		this.config = config;
		this.appleProvider = new AppleAIProvider();
	}

	/**
	 * Check if AI is available
	 */
	isAvailable(): boolean {
		return this.appleProvider.isReady();
	}

	/**
	 * Generate D&D response
	 */
	async generateResponse(prompt: string, context: DnDContext): Promise<DnDResponse> {
		if (!this.appleProvider.isReady()) {
			throw new Error('Apple Intelligence not available. This app requires iOS 18.1+ with Apple Intelligence enabled.');
		}

		// Check cache first
		const cacheKey = this.getCacheKey(prompt, context);
		if (this.config.enableCache && this.responseCache.has(cacheKey)) {
			const cached = this.responseCache.get(cacheKey)!;
			return { ...cached, processingTime: 0 }; // Cached response is instant
		}

		try {
			const response = await this.appleProvider.generateDnDResponse(prompt, context);

			// Cache the response
			if (this.config.enableCache) {
				this.cacheResponse(cacheKey, response);
			}

			return response;
		} catch (error) {
			console.error('AI generation failed:', error);
			// Provide a simple fallback response
			return this.getFallbackResponse(prompt, context);
		}
	}

	/**
	 * Generate NPC dialogue
	 */
	async generateNPCDialogue(
		npcName: string,
		npcPersonality: string,
		playerPrompt: string,
		context: DnDContext,
	): Promise<string> {
		if (!this.appleProvider.isReady()) {
			return `${npcName} nods at you but seems distracted.`;
		}

		try {
			return await this.appleProvider.generateNPCDialogue(npcName, npcPersonality, playerPrompt, context);
		} catch (error) {
			console.error('NPC dialogue generation failed:', error);
			return `${npcName} looks at you thoughtfully.`;
		}
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<boolean> {
		return await this.appleProvider.healthCheck();
	}

	/**
	 * Get service status
	 */
	getStatus(): {
		available: boolean;
		cacheSize: number;
		provider: 'apple' | 'fallback';
		} {
		return {
			available: this.appleProvider.isReady(),
			cacheSize: this.responseCache.size,
			provider: this.appleProvider.isReady() ? 'apple' : 'fallback',
		};
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.responseCache.clear();
	}

	/**
	 * Private helper methods
	 */
	private getCacheKey(prompt: string, context: DnDContext): string {
		return `${prompt.substring(0, 30)}_${context.currentScene}_${context.playerClass}`;
	}

	private cacheResponse(key: string, response: DnDResponse): void {
		if (this.responseCache.size >= this.config.cacheSize) {
			// Remove oldest entry
			const firstKey = this.responseCache.keys().next().value;
			if (firstKey) {
				this.responseCache.delete(firstKey);
			}
		}
		this.responseCache.set(key, response);
	}

	private getFallbackResponse(prompt: string, context: DnDContext): DnDResponse {
		const lowercasePrompt = prompt.toLowerCase();

		let text = '';
		let diceRoll: string | undefined;

		if (lowercasePrompt.includes('attack') || lowercasePrompt.includes('fight')) {
			text = 'You swing your weapon at the enemy! Roll for attack.';
			diceRoll = '1d20+5';
		} else if (lowercasePrompt.includes('look') || lowercasePrompt.includes('search')) {
			text = `You carefully examine your surroundings in ${context.currentScene}.`;
			diceRoll = '1d20+3';
		} else if (lowercasePrompt.includes('talk') || lowercasePrompt.includes('speak')) {
			text = `You attempt to communicate. Your words carry the weight of a ${context.playerClass}.`;
		} else {
			text = `The adventure continues, ${context.playerName}. What will you do next?`;
		}

		return {
			text,
			diceRoll,
			processingTime: 0,
		};
	}
}

// Default configuration
export const defaultAIConfig: SimpleAIConfig = {
	enableCache: true,
	cacheSize: 50,
	timeout: 10000,
};