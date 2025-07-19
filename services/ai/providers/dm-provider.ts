/**
 * DM Provider for AI D&D Platform
 *
 * Integrates with Cactus Compute's LLM for D&D gameplay
 */
import { DMAgent, DMResponse, GameContext, createDMAgent } from '../agents/dm-agent';

import { Character } from '@/types/character';
import { GameState } from '@/types/game';

export interface DMProviderConfig {
	modelUrl?: string;
	contextSize?: number;
	temperature?: number;
	apiKey?: string;
	fallbackMode?: 'local' | 'localfirst' | 'remotefirst' | 'remote';
	timeout?: number;
}

export interface DMProviderResponse {
	text: string;
	confidence: number;
	toolCommands: Array<{ type: string; params: string }>;
	processingTime: number;
	metadata?: {
		modelUsed?: string;
		tokensGenerated?: number;
	};
}

export class DMProvider {
	private agent: DMAgent;
	private config: DMProviderConfig;
	private isReady = false;

	constructor(config: DMProviderConfig) {
		this.config = {
			contextSize: 2048,
			temperature: 0.7,
			timeout: 15000,
			...config,
		};
		this.agent = createDMAgent();
	}

	/**
	 * Initialize the DM provider
	 */
	async initialize(onProgress?: ((progress: number) => void) | undefined): Promise<boolean> {
		try {
			const success = await this.agent.initialize({
				modelUrl: this.config.modelUrl,
				contextSize: this.config.contextSize,
				temperature: this.config.temperature,
				apiKey: this.config.apiKey,
				fallbackMode: this.config.fallbackMode,
			});

			this.isReady = success;
			return success;
		} catch (error) {
			console.error('Failed to initialize DM provider:', error);
			this.isReady = false;
			return false;
		}
	}

	/**
	 * Generate D&D response using DM agent
	 */
	async generateDnDResponse(
		prompt: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentScene: string;
			gameHistory: string[];
		},
		timeout?: number,
	): Promise<DMProviderResponse> {
		if (!this.isReady) {
			throw new Error('DM provider not initialized');
		}

		// Create a timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(
				() => reject(new Error('DM response timed out')),
				timeout || this.config.timeout,
			);
		});

		try {
			// Create a default character with required fields
			const defaultCharacter: Character = {
				name: context.playerName,
				id: `player-${Date.now()}`,
				class: context.playerClass,
				race: context.playerRace,
				level: 1,
				stats: {
					STR: 10,
					DEX: 10,
					CON: 10,
					INT: 10,
					WIS: 10,
					CHA: 10,
				},
				skills: [],
				inventory: [],
				equipped: {},
				health: 10,
				maxHealth: 10,
				actionPoints: 3,
				maxActionPoints: 3,
			};

			// Create game context for the agent
			const gameContext: GameContext = {
				playerCharacter: defaultCharacter,
				gameState: {
					gameWorld: 'Forgotten Realms',
				} as GameState,
				currentScene: context.currentScene,
				currentLocation: context.currentScene,
				recentActions: context.gameHistory.slice(-5),
				conversationHistory: context.gameHistory,
				inCombat: false,
				timeOfDay: 'afternoon',
				weather: 'clear',
				activeQuests: [],
				importantNPCs: [],
				worldState: {},
			};

			// Race the agent response against the timeout
			const response = (await Promise.race([
				this.agent.processPlayerAction(prompt, gameContext),
				timeoutPromise,
			])) as DMResponse;

			return {
				text: response.text,
				confidence: response.confidence,
				toolCommands: response.toolCommands,
				processingTime: response.processingTime,
				metadata: {
					modelUsed: 'Cactus Compute LLM',
				},
			};
		} catch (error) {
			console.error('Error generating DM response:', error);
			throw error;
		}
	}

	/**
	 * Generate narration using DM agent
	 */
	async generateNarration(
		scene: string,
		context: {
			playerName: string;
			playerClass: string;
			playerRace: string;
			currentLocation: string;
		},
	): Promise<string> {
		if (!this.isReady) {
			throw new Error('DM provider not initialized');
		}

		try {
			// Create a default character with required fields
			const defaultCharacter: Character = {
				name: context.playerName,
				id: `player-${Date.now()}`,
				class: context.playerClass,
				race: context.playerRace,
				level: 1,
				stats: {
					STR: 10,
					DEX: 10,
					CON: 10,
					INT: 10,
					WIS: 10,
					CHA: 10,
				},
				skills: [],
				inventory: [],
				equipped: {},
				health: 10,
				maxHealth: 10,
				actionPoints: 3,
				maxActionPoints: 3,
			};

			// Create game context for the agent
			const gameContext: GameContext = {
				playerCharacter: defaultCharacter,
				gameState: {
					gameWorld: 'Forgotten Realms',
				} as GameState,
				currentScene: scene,
				currentLocation: context.currentLocation,
				recentActions: [],
				conversationHistory: [],
				inCombat: false,
				timeOfDay: 'afternoon',
				weather: 'clear',
				activeQuests: [],
				importantNPCs: [],
				worldState: {},
			};

			return await this.agent.generateNarration(scene, gameContext);
		} catch (error) {
			console.error('Error generating DM narration:', error);
			throw error;
		}
	}

	/**
	 * Check if the provider is ready
	 */
	isProviderReady(): boolean {
		return this.isReady;
	}

	/**
	 * Perform a health check
	 */
	async healthCheck(): Promise<boolean> {
		return this.isReady;
	}

	/**
	 * Clean up resources
	 */
	async cleanup(): Promise<void> {
		if (this.isReady) {
			await this.agent.unloadModel();
			this.isReady = false;
		}
	}

	/**
	 * Set performance mode
	 */
	setPerformanceMode(mode: 'performance' | 'balanced' | 'quality'): void {
		if (this.isReady) {
			this.agent.setPerformanceMode(mode);
		}
	}

	/**
	 * Enable or disable battery optimization
	 */
	enableBatteryOptimization(enabled: boolean): void {
		if (this.isReady) {
			this.agent.enableBatteryOptimization(enabled);
		}
	}
}
