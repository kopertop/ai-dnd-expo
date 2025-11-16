import {
	CreateGameRequest,
	DMActionRequest,
	ErrorResponse,
	GameSessionResponse,
	GameStateResponse,
	JoinGameRequest,
	MyGamesResponse,
	PlayerActionRequest,
} from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { Quest } from '@/types/quest';

import { API_BASE_URL, buildApiUrl } from '@/services/config/api-base-url';
// Note: Better-auth uses cookies for session management, which are automatically sent with fetch requests

export class MultiplayerClient {
	private baseUrl: string;

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl;
	}

	private buildUrl(path: string): string {
		if (!path.startsWith('/')) {
			throw new Error(`API paths must start with '/'. Received: ${path}`);
		}

		// Use shared builder when relying on global base URL
		if (this.baseUrl === API_BASE_URL) {
			return buildApiUrl(path);
		}

		if (!this.baseUrl) {
			return path;
		}

		const normalizedBase = this.baseUrl.endsWith('/')
			? this.baseUrl.slice(0, -1)
			: this.baseUrl;

		return `${normalizedBase}${path}`;
	}

	/**
	 * Get auth headers
	 * Better-auth uses cookies for session management, which are automatically sent with requests
	 */
	private getAuthHeaders(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
		};
	}

	/**
	 * Create a new game session (host)
	 */
	async createGame(request: CreateGameRequest & { hostCharacter: Character }): Promise<GameSessionResponse> {
		const headers = this.getAuthHeaders();
		const response = await fetch(this.buildUrl('/api/games'), {
			method: 'POST',
			headers,
			credentials: 'include',
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
		const headers = this.getAuthHeaders();
		const response = await fetch(this.buildUrl(`/api/games/${inviteCode}`), {
			method: 'GET',
			headers,
			credentials: 'include',
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
		const headers = this.getAuthHeaders();
		const response = await fetch(
			this.buildUrl(`/api/games/${request.inviteCode}/join`),
			{
				method: 'POST',
				headers,
				credentials: 'include',
				body: JSON.stringify({
					character: request.character,
					playerId: request.playerId,
					playerEmail: request.playerEmail,
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
	async pollGameState(inviteCode: string): Promise<GameSessionResponse> {
		const headers = this.getAuthHeaders();
		const response = await fetch(
			this.buildUrl(`/api/games/${inviteCode}/state`),
			{
				method: 'GET',
				headers,
				credentials: 'include',
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
		const headers = this.getAuthHeaders();
		const response = await fetch(
			this.buildUrl(`/api/games/${inviteCode}/action`),
			{
				method: 'POST',
				headers,
				credentials: 'include',
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
		const headers = this.getAuthHeaders();
		const response = await fetch(
			this.buildUrl(`/api/games/${inviteCode}/dm-action`),
			{
				method: 'POST',
				headers,
				credentials: 'include',
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
		const headers = this.getAuthHeaders();
		const response = await fetch(
			this.buildUrl(`/api/games/${inviteCode}/start`),
			{
				method: 'POST',
				headers,
				credentials: 'include',
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
		const headers = this.getAuthHeaders();
		const response = await fetch(this.buildUrl('/api/quests'), {
			method: 'GET',
			headers,
			credentials: 'include',
		});

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to get quests');
		}

		const data = await response.json();
		return data.quests || [];
	}

	async getMyGames(): Promise<MyGamesResponse> {
		const headers = this.getAuthHeaders();
		const response = await fetch(this.buildUrl('/api/games/me'), {
			method: 'GET',
			headers,
			credentials: 'include',
		});

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to load games');
		}

		return response.json();
	}

	async getMyCharacters(): Promise<Character[]> {
		const headers = this.getAuthHeaders();
		const response = await fetch(this.buildUrl('/api/games/me/characters'), {
			method: 'GET',
			headers,
			credentials: 'include',
		});

		if (!response.ok) {
			const error: ErrorResponse = await response.json();
			throw new Error(error.error || 'Failed to load characters');
		}

		const data = await response.json();
		return data.characters || [];
	}
}

// Singleton instance
export const multiplayerClient = new MultiplayerClient();

