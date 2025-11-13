import {
	CreateGameRequest,
	GameSessionResponse,
	GameStateResponse,
	JoinGameRequest,
	PlayerActionRequest,
	DMActionRequest,
	ErrorResponse,
} from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { Quest } from '@/types/quest';

// Determine API base URL:
// 1. If EXPO_PUBLIC_MULTIPLAYER_API_URL is set, use it (for explicit Worker URL)
// 2. If running in browser on localhost, use http://localhost:8787 (local dev)
// 3. If running in browser on production, use relative URLs (for Cloudflare Pages routing)
// 4. Otherwise (Node/Expo), use localhost for local development
const getApiBaseUrl = (): string => {
	const explicitUrl = process.env.EXPO_PUBLIC_MULTIPLAYER_API_URL;
	if (explicitUrl) {
		return explicitUrl;
	}
	
	// Check if we're in a browser environment
	if (typeof window !== 'undefined') {
		// Check if we're on localhost (local development)
		const isLocalhost = window.location.hostname === 'localhost' || 
		                   window.location.hostname === '127.0.0.1' ||
		                   window.location.hostname === '';
		
		if (isLocalhost) {
			// Local development - use full localhost URL
			return 'http://localhost:8787';
		}
		
		// Production - use relative URLs so Cloudflare Pages routes /api/* to Worker
		return '';
	}
	
	// Node/Expo dev server - use localhost
	return 'http://localhost:8787';
};

const API_BASE_URL = getApiBaseUrl();

export class MultiplayerClient {
	private baseUrl: string;

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl;
	}

	/**
	 * Create a new game session (host)
	 */
	async createGame(request: CreateGameRequest & { hostCharacter: Character }): Promise<GameSessionResponse> {
		const response = await fetch(`${this.baseUrl}/api/games`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to create game');
		}

		return response.json();
	}

	/**
	 * Get game session info by invite code
	 */
	async getGameSession(inviteCode: string): Promise<GameSessionResponse> {
		const response = await fetch(`${this.baseUrl}/api/games/${inviteCode}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to get game session');
		}

		return response.json();
	}

	/**
	 * Join a game with a character
	 */
	async joinGame(request: JoinGameRequest): Promise<GameSessionResponse> {
		const response = await fetch(
			`${this.baseUrl}/api/games/${request.inviteCode}/join`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					character: request.character,
					playerId: request.playerId,
				}),
			},
		);

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to join game');
		}

		return response.json();
	}

	/**
	 * Poll game state (fallback when WebSocket unavailable)
	 */
	async pollGameState(inviteCode: string): Promise<GameStateResponse> {
		const response = await fetch(
			`${this.baseUrl}/api/games/${inviteCode}/state`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to poll game state');
		}

		return response.json();
	}

	/**
	 * Submit a player action
	 */
	async submitPlayerAction(
		inviteCode: string,
		request: PlayerActionRequest & { playerId: string },
	): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/api/games/${inviteCode}/action`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request),
			},
		);

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to submit action');
		}
	}

	/**
	 * Submit a DM action (host only)
	 */
	async submitDMAction(
		inviteCode: string,
		request: DMActionRequest & { hostId: string },
	): Promise<GameStateResponse> {
		const response = await fetch(
			`${this.baseUrl}/api/games/${inviteCode}/dm-action`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request),
			},
		);

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to submit DM action');
		}

		return response.json();
	}

	/**
	 * Start the game (host only)
	 */
	async startGame(
		inviteCode: string,
		hostId: string,
		gameState: MultiplayerGameState,
	): Promise<GameStateResponse> {
		const response = await fetch(
			`${this.baseUrl}/api/games/${inviteCode}/start`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					hostId,
					gameState,
				}),
			},
		);

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to start game');
		}

		return response.json();
	}

	/**
	 * Get available quests
	 */
	async getQuests(): Promise<Quest[]> {
		const response = await fetch(`${this.baseUrl}/api/quests`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to get quests');
		}

		const data = await response.json();
		return data.quests || [];
	}
}

// Singleton instance
export const multiplayerClient = new MultiplayerClient();

