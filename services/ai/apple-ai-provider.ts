/**
 * Apple Intelligence Provider for AI D&D Platform
 * 
 * Uses iOS native AI capabilities through @react-native-ai/apple
 * Provides completely offline D&D gameplay with local models
 */

import { foundationModels } from '@react-native-ai/apple';
import type { AppleMessage } from '@react-native-ai/apple/src/NativeAppleLLM';
import { z } from 'zod';

// D&D Response Schema
const DnDResponseSchema = z.object({
	narration: z.string().describe('The DM\'s narrative response to the player\'s action'),
	diceRoll: z.string().optional().describe('Dice roll notation like "1d20+5" if needed'),
	characterUpdate: z.object({
		healthChange: z.number().optional(),
		statusEffect: z.string().optional(),
	}).optional(),
});

export interface DnDContext {
	playerName: string;
	playerClass: string;
	playerRace: string;
	currentScene: string;
	gameHistory: string[];
	playerHealth: number;
	playerLevel: number;
}

export interface DnDResponse {
	text: string;
	diceRoll?: string;
	characterUpdate?: {
		healthChange?: number;
		statusEffect?: string;
	};
	processingTime: number;
}

export class AppleAIProvider {
	private isAvailable: boolean;

	constructor() {
		this.isAvailable = foundationModels.isAvailable();
	}

	/**
	 * Check if Apple Intelligence is available on this device
	 */
	isReady(): boolean {
		return this.isAvailable;
	}

	/**
	 * Generate D&D response using Apple Intelligence
	 */
	async generateDnDResponse(prompt: string, context: DnDContext): Promise<DnDResponse> {
		if (!this.isAvailable) {
			throw new Error('Apple Intelligence not available on this device');
		}

		const startTime = Date.now();

		try {
			const messages: AppleMessage[] = [
				{
					role: 'system',
					content: this.buildSystemPrompt(context),
				},
				{
					role: 'user',
					content: this.buildUserPrompt(prompt, context),
				},
			];

			const result = await foundationModels.generateText(messages, {
				schema: DnDResponseSchema,
			});

			const processingTime = Date.now() - startTime;

			return {
				text: result.narration,
				diceRoll: result.diceRoll,
				characterUpdate: result.characterUpdate,
				processingTime,
			};
		} catch (error) {
			console.error('Apple AI generation failed:', error);
			throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Generate NPC dialogue using Apple Intelligence
	 */
	async generateNPCDialogue(
		npcName: string,
		npcPersonality: string,
		playerPrompt: string,
		context: DnDContext,
	): Promise<string> {
		if (!this.isAvailable) {
			throw new Error('Apple Intelligence not available on this device');
		}

		const systemPrompt = `You are ${npcName}, an NPC in a D&D campaign. 
Your personality: ${npcPersonality}
Current scene: ${context.currentScene}
Stay in character and respond naturally to the player.`;

		const userPrompt = `Player (${context.playerName}, ${context.playerRace} ${context.playerClass}) says: "${playerPrompt}"

Respond as ${npcName}:`;

		try {
			const messages: AppleMessage[] = [
				{
					role: 'system',
					content: systemPrompt,
				},
				{
					role: 'user',
					content: userPrompt,
				},
			];

			const result = await foundationModels.generateText(messages);

			return result;
		} catch (error) {
			console.error('NPC dialogue generation failed:', error);
			return `${npcName} looks at you thoughtfully but seems lost for words.`;
		}
	}

	/**
	 * Build system prompt for D&D gameplay
	 */
	private buildSystemPrompt(context: DnDContext): string {
		return `You are an expert Dungeon Master running a D&D 5e campaign.

RULES:
- Keep responses concise (1-3 sentences)
- Include dice rolls when combat or skill checks are needed
- Use standard D&D 5e mechanics
- Maintain immersive fantasy atmosphere
- Respond to player actions with appropriate consequences

CURRENT GAME STATE:
- Player: ${context.playerName} (Level ${context.playerLevel} ${context.playerRace} ${context.playerClass})
- Health: ${context.playerHealth}/100
- Scene: ${context.currentScene}
- Recent events: ${context.gameHistory.slice(-2).join('. ')}

Respond with appropriate narration and game mechanics.`;
	}

	/**
	 * Build user prompt with context
	 */
	private buildUserPrompt(prompt: string, _context: DnDContext): string {
		return `Player Action: ${prompt}

As the DM, describe what happens next. Include any necessary dice rolls and character updates.`;
	}

	/**
	 * Health check for Apple Intelligence
	 */
	async healthCheck(): Promise<boolean> {
		if (!this.isAvailable) {
			return false;
		}

		try {
			// Simple test generation
			const messages: AppleMessage[] = [
				{
					role: 'system',
					content: 'Respond with "OK"',
				},
				{
					role: 'user',
					content: 'Test',
				},
			];

			await foundationModels.generateText(messages);
			return true;
		} catch {
			return false;
		}
	}
}