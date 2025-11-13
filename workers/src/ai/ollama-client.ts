import { Character, MultiplayerGameState } from '../types';

export interface OllamaMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface OllamaCompletionParams {
	model?: string;
	temperature?: number;
	top_p?: number;
	num_predict?: number;
	stop?: string[];
}

export interface OllamaResponse {
	message: {
		content: string;
		role: string;
	};
	done: boolean;
}

export class OllamaClient {
	private baseUrl: string;
	private defaultModel: string;
	private timeout: number;

	constructor(config: { baseUrl: string; defaultModel: string; timeout?: number }) {
		this.baseUrl = config.baseUrl;
		this.defaultModel = config.defaultModel || 'llama3.2';
		this.timeout = config.timeout || 30000;
	}

	/**
	 * Generate a completion from messages
	 */
	async completion(
		messages: OllamaMessage[],
		params: OllamaCompletionParams = {},
	): Promise<string> {
		const model = params.model || this.defaultModel;
		const url = `${this.baseUrl}/api/chat`;

		const requestBody = {
			model,
			messages: messages.map(msg => ({
				role: msg.role,
				content: msg.content,
			})),
			stream: false,
			options: {
				temperature: params.temperature ?? 0.7,
				top_p: params.top_p ?? 0.9,
				num_predict: params.num_predict ?? 512,
				stop: params.stop || [],
			},
		};

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
			}

			const data: OllamaResponse = await response.json();
			if (data.message?.content) {
				return data.message.content;
			}
			return '';
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Ollama request timed out after ${this.timeout}ms`);
			}
			throw error;
		}
	}

	/**
	 * Generate DM response with multiplayer context
	 */
	async generateDMResponse(
		prompt: string,
		gameState: MultiplayerGameState,
		params: OllamaCompletionParams = {},
	): Promise<string> {
		const systemPrompt = this.buildSystemPrompt(gameState);
		const messages: OllamaMessage[] = [
			{ role: 'system', content: systemPrompt },
			...this.buildGameHistoryMessages(gameState),
			{ role: 'user', content: prompt },
		];

		return this.completion(messages, params);
	}

	/**
	 * Build system prompt with multiplayer context
	 */
	private buildSystemPrompt(gameState: MultiplayerGameState): string {
		const players = gameState.players
			.map(p => {
				const char = gameState.characters.find(c => c.id === p.characterId);
				return char
					? `${char.name} (${char.race} ${char.class}, Level ${char.level})`
					: p.name;
			})
			.join(', ');

		return `You are a Dungeon Master running a D&D game for multiple players.

Current Players: ${players}

Quest: ${gameState.quest.name}
${gameState.quest.description}

Objectives:
${gameState.quest.objectives.map(obj => `- ${obj.description}${obj.completed ? ' (Completed)' : ''}`).join('\n')}

World: ${gameState.gameWorld}
Location: ${gameState.startingArea}

You should:
- Narrate the story and world events
- Respond to player actions
- Manage NPCs and enemies
- Advance the quest objectives
- Keep the game engaging for all players
- Be creative and adapt to player choices

Respond in character as the Dungeon Master. Keep responses concise but descriptive.`;
	}

	/**
	 * Build game history messages from recent messages
	 */
	private buildGameHistoryMessages(gameState: MultiplayerGameState): OllamaMessage[] {
		const recentMessages = gameState.messages.slice(-10); // Last 10 messages
		return recentMessages.map(msg => ({
			role: msg.type === 'narration' ? 'assistant' : 'user',
			content: `${msg.speaker}: ${msg.content}`,
		}));
	}
}

