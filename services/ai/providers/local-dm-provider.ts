/**
 * Local DM Provider for AI D&D Platform
 *
 * Integrates with Cactus React Native for on-device Gemma3 inference
 * Implements requirements from local-dm-agent spec
 */

import { CactusLM } from 'cactus-react-native';
import { Platform } from 'react-native';

import { DnDSystemPrompts } from './cactus-provider';

export interface LocalDMConfig {
	modelPath: string;
	contextSize?: number;
	maxTokens?: number;
	temperature?: number;
	enableResourceMonitoring?: boolean;
	powerSavingMode?: boolean;
}

export interface LocalDMResponse {
	text: string;
	confidence: number;
	processingTime: number;
	resourceUsage: {
		memoryMB: number;
		cpuPercent: number;
		batteryLevel?: number;
	};
	toolCommands: Array<{ type: string; params: string }>;
}

export interface LocalDMContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
	worldState?: any;
}

export class LocalDMProvider {
	private lm: any = null;
	private config: LocalDMConfig;
	private isInitialized = false;
	private isLoading = false;
	private resourceMonitor: NodeJS.Timeout | null = null;
	private lastResourceCheck = { memory: 0, cpu: 0, battery: 100 };

	constructor(config: LocalDMConfig) {
		this.config = {
			contextSize: 2048,
			maxTokens: 150,
			temperature: 0.7,
			enableResourceMonitoring: true,
			powerSavingMode: false,
			...config,
		};
	}

	/**
	 * Initialize the local Gemma3 model
	 * Requirement 1: Initialize local model with progress tracking
	 */
	async initialize(progressCallback?: (progress: { status: string; progress?: number }) => void): Promise<boolean> {
		if (this.isInitialized) return true;
		if (this.isLoading) return false;

		this.isLoading = true;

		try {
			progressCallback?.({ status: 'Checking device compatibility...' });

			// Check device compatibility
			if (!this.isDeviceCompatible()) {
				throw new Error('Device not compatible with local AI model');
			}

			progressCallback?.({ status: 'Loading Gemma3 model...', progress: 0 });

			// Initialize Cactus LM with your provided code sample
			const { lm, error } = await CactusLM.init({
				model: this.config.modelPath,
				n_ctx: this.config.contextSize,
			});

			if (error) {
				throw new Error(`Failed to initialize model: ${error}`);
			}

			this.lm = lm;
			progressCallback?.({ status: 'Model loaded successfully!', progress: 100 });

			// Start resource monitoring if enabled
			if (this.config.enableResourceMonitoring) {
				this.startResourceMonitoring();
			}

			this.isInitialized = true;
			console.log('🤖 Local DM Agent initialized successfully');
			return true;

		} catch (error) {
			console.error('❌ Failed to initialize local DM:', error);
			progressCallback?.({ status: `Error: ${error.message}` });
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Generate D&D response using local Gemma3 model
	 * Requirement 2: Generate contextually appropriate responses
	 */
	async generateDnDResponse(
		prompt: string,
		context: LocalDMContext,
		timeoutMs: number = 10000
	): Promise<LocalDMResponse> {
		if (!this.isInitialized || !this.lm) {
			throw new Error('Local DM not initialized');
		}

		const startTime = Date.now();

		try {
			// Check resource constraints before processing
			await this.checkResourceConstraints();

			// Build D&D-specific messages using your code sample format
			const messages = [
				{
					role: 'system',
					content: this.buildSystemPrompt(context),
				},
				{
					role: 'user',
					content: this.buildUserPrompt(prompt, context),
				},
			];

			// Set parameters based on power saving mode
			const params = {
				n_predict: this.config.powerSavingMode ?
					Math.min(this.config.maxTokens || 100, 75) :
					this.config.maxTokens || 150,
				temperature: this.config.powerSavingMode ?
					0.6 :
					this.config.temperature || 0.7,
				top_p: 0.9,
				stop: ['[END]', '\n\nPlayer:', '\n\nDM:', 'Human:', 'Assistant:'],
			};

			// Generate response with timeout using your code sample
			const response = await Promise.race([
				this.lm.completion(messages, params),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Response timeout')), timeoutMs)
				),
			]);

			const processingTime = Date.now() - startTime;
			const processedResponse = this.processResponse(response);

			return {
				text: processedResponse.text,
				confidence: this.calculateConfidence(processedResponse.text, processingTime),
				processingTime,
				resourceUsage: this.getResourceUsage(),
				toolCommands: processedResponse.toolCommands,
			};

		} catch (error) {
			console.error('Local DM generation error:', error);
			throw error;
		}
	}

	/**
	 * Check if device is compatible with local AI
	 * Requirement 1: Handle device limitations gracefully
	 */
	private isDeviceCompatible(): boolean {
		// Only support iOS/iPadOS as per requirements
		if (Platform.OS !== 'ios') {
			return false;
		}

		// Check available memory (simplified check)
		// In production, you'd use native modules to check actual memory
		return true;
	}

	/**
	 * Monitor device resources during AI processing
	 * Requirement 3: Efficient resource management
	 */
	private startResourceMonitoring(): void {
		this.resourceMonitor = setInterval(() => {
			this.checkResourceUsage();
		}, 5000); // Check every 5 seconds
	}

	/**
	 * Check resource constraints before processing
	 * Requirement 3: Monitor CPU usage and battery
	 */
	private async checkResourceConstraints(): Promise<void> {
		const resources = this.getResourceUsage();

		// Enable power saving mode if battery is low
		if (resources.batteryLevel && resources.batteryLevel < 20) {
			if (!this.config.powerSavingMode) {
				console.log('🔋 Low battery detected, enabling power saving mode');
				this.config.powerSavingMode = true;
			}
		}

		// Pause if CPU usage is too high
		if (resources.cpuPercent > 80) {
			console.log('⚡ High CPU usage, pausing briefly...');
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	/**
	 * Get current resource usage
	 * Requirement 3: Resource monitoring
	 */
	private getResourceUsage(): { memoryMB: number; cpuPercent: number; batteryLevel?: number } {
		// In production, you'd use native modules to get actual metrics
		// For now, return mock data that simulates realistic usage
		return {
			memoryMB: Math.random() * 500 + 200, // 200-700MB
			cpuPercent: Math.random() * 30 + 10, // 10-40%
			batteryLevel: Math.random() * 100, // 0-100%
		};
	}

	/**
	 * Check resource usage and adjust behavior
	 * Requirement 3: Battery and performance optimization
	 */
	private checkResourceUsage(): void {
		const resources = this.getResourceUsage();
		this.lastResourceCheck = resources;

		// Auto-enable power saving if resources are constrained
		if (resources.batteryLevel && resources.batteryLevel < 20 && !this.config.powerSavingMode) {
			this.config.powerSavingMode = true;
			console.log('🔋 Auto-enabled power saving mode');
		}

		// Log resource usage for monitoring
		console.log(`📊 Resources: ${resources.memoryMB.toFixed(0)}MB RAM, ${resources.cpuPercent.toFixed(0)}% CPU, ${resources.batteryLevel?.toFixed(0)}% Battery`);
	}

	/**
	 * Build system prompt for D&D context
	 * Requirement 2: Maintain D&D 5e rule consistency
	 */
	private buildSystemPrompt(context: LocalDMContext): string {
		return `${DnDSystemPrompts.DUNGEON_MASTER}

Current Game Context:
- Player: ${context.playerName} (${context.playerRace} ${context.playerClass})
- Scene: ${context.currentScene}
- Recent Events: ${context.gameHistory.slice(-3).join('. ')}

Remember to:
- Keep responses under 3 sentences for mobile gameplay
- Include dice rolls using [ROLL:XdY+Z] format when appropriate
- Maintain story consistency with the established context
- Follow D&D 5e rules accurately`;
	}

	/**
	 * Build user prompt with context
	 */
	private buildUserPrompt(prompt: string, context: LocalDMContext): string {
		return `Player Action: ${prompt}

Please respond as the Dungeon Master, considering the current scene (${context.currentScene}) and the player's character (${context.playerName}, ${context.playerRace} ${context.playerClass}).`;
	}

	/**
	 * Process and clean up model response
	 * Requirement 6: Filter inappropriate content
	 */
	private processResponse(rawResponse: any): { text: string; toolCommands: Array<{ type: string; params: string }> } {
		let text = typeof rawResponse === 'string' ? rawResponse : rawResponse.text || '';

		// Clean up common artifacts
		text = text.trim();
		text = text.replace(/^(DM|Dungeon Master):\s*/i, '');
		text = text.replace(/^(Assistant|AI):\s*/i, '');
		text = text.replace(/^\*.*?\*\s*/, ''); // Remove action descriptions

		// Extract tool commands
		const toolCommands = this.extractToolCommands(text);
		text = this.removeToolCommands(text);

		// Basic content filtering
		text = this.filterContent(text);

		// Ensure response isn't too long for mobile
		if (text.length > 300) {
			text = text.substring(0, 297) + '...';
		}

		return { text, toolCommands };
	}

	/**
	 * Extract D&D tool commands
	 */
	private extractToolCommands(text: string): Array<{ type: string; params: string }> {
		const commands: Array<{ type: string; params: string }> = [];
		const regex = /\[(\w+):([^\]]+)\]/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			commands.push({
				type: match[1].toLowerCase(),
				params: match[2],
			});
		}

		return commands;
	}

	/**
	 * Remove tool commands from display text
	 */
	private removeToolCommands(text: string): string {
		return text.replace(/\[(\w+):([^\]]+)\]/g, '').trim();
	}

	/**
	 * Basic content filtering
	 * Requirement 6: Filter inappropriate content
	 */
	private filterContent(text: string): string {
		// Basic filtering - in production you'd want more sophisticated filtering
		const inappropriatePatterns = [
			/\b(explicit|inappropriate|content)\b/gi,
			// Add more patterns as needed
		];

		let filtered = text;
		inappropriatePatterns.forEach(pattern => {
			filtered = filtered.replace(pattern, '[filtered]');
		});

		return filtered;
	}

	/**
	 * Calculate response confidence based on various factors
	 */
	private calculateConfidence(text: string, processingTime: number): number {
		let confidence = 0.8; // Base confidence

		// Adjust based on response length (too short or too long reduces confidence)
		if (text.length < 20) confidence -= 0.2;
		if (text.length > 250) confidence -= 0.1;

		// Adjust based on processing time (very fast or very slow reduces confidence)
		if (processingTime < 500) confidence -= 0.1; // Too fast might be cached/simple
		if (processingTime > 8000) confidence -= 0.2; // Too slow might indicate issues

		// Adjust based on resource usage
		if (this.config.powerSavingMode) confidence -= 0.1;

		return Math.max(0.3, Math.min(0.95, confidence));
	}

	/**
	 * Pause model processing to conserve battery
	 * Requirement 3: Battery conservation
	 */
	async pauseForBattery(): Promise<void> {
		console.log('⏸️ Pausing local DM for battery conservation');
		// In production, you might unload the model temporarily
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	/**
	 * Check if model is ready for inference
	 */
	isReady(): boolean {
		return this.isInitialized && !!this.lm;
	}

	/**
	 * Get current status of the local DM
	 */
	getStatus(): {
		initialized: boolean;
		loading: boolean;
		powerSaving: boolean;
		resourceUsage: { memoryMB: number; cpuPercent: number; batteryLevel?: number };
	} {
		return {
			initialized: this.isInitialized,
			loading: this.isLoading,
			powerSaving: this.config.powerSavingMode || false,
			resourceUsage: this.lastResourceCheck,
		};
	}

	/**
	 * Cleanup resources
	 * Requirement 5: Complete data removal
	 */
	async cleanup(): Promise<void> {
		if (this.resourceMonitor) {
			clearInterval(this.resourceMonitor);
			this.resourceMonitor = null;
		}

		if (this.lm) {
			// In production, you'd properly dispose of the model
			this.lm = null;
		}

		this.isInitialized = false;
		console.log('🧹 Local DM resources cleaned up');
	}

	/**
	 * Enable/disable power saving mode
	 * Requirement 3: Power management
	 */
	setPowerSavingMode(enabled: boolean): void {
		this.config.powerSavingMode = enabled;
		console.log(`🔋 Power saving mode ${enabled ? 'enabled' : 'disabled'}`);
	}
}

/**
 * Default configuration for local DM
 */
export const DefaultLocalDMConfig: LocalDMConfig = {
	modelPath: '/path/to/gemma-3-2b-instruct.gguf', // Update with actual model path
	contextSize: 2048,
	maxTokens: 150,
	temperature: 0.7,
	enableResourceMonitoring: true,
	powerSavingMode: false,
};

/**
 * Model configurations for different device capabilities
 */
export const LocalDMModelConfigs = {
	PERFORMANCE: {
		...DefaultLocalDMConfig,
		maxTokens: 100,
		temperature: 0.6,
		contextSize: 1024,
	},
	QUALITY: {
		...DefaultLocalDMConfig,
		maxTokens: 200,
		temperature: 0.8,
		contextSize: 4096,
	},
	POWER_SAVING: {
		...DefaultLocalDMConfig,
		maxTokens: 75,
		temperature: 0.5,
		contextSize: 512,
		powerSavingMode: true,
	},
};
