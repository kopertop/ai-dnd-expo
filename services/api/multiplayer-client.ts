import { apiService, authService } from 'expo-auth-template/frontend';

import { API_BASE_URL } from '@/services/config/api-base-url';
import {
        CharacterListResponse,
        CreateGameRequest,
        DMActionRequest,
        GameSessionResponse,
	GameStateResponse,
	JoinGameRequest,
	MapGenerationRequest,
        MapStateResponse,
        MapStateUpdateRequest,
        MapTerrainMutationRequest,
        MapTokenListResponse,
        MapTokenMutationResponse,
        MapTokenUpsertRequest,
        MovementValidationResponse,
        MyGamesResponse,
        NpcDefinitionListResponse,
        NpcInstanceListResponse,
        NpcInstanceUpdateRequest,
        NpcPlacementRequest,
	PlayerActionRequest,
} from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { Quest } from '@/types/quest';

export class MultiplayerClient {
	private baseUrl: string;

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl || '/api/';
		authService.updateConfig({
			apiBaseUrl: this.baseUrl,
		});
	}

	/**
	 * Create a new game session (host)
	 */
	async createGame(request: CreateGameRequest): Promise<GameSessionResponse> {
		return apiService.fetchApi('/games', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	/**
	 * Get game session info by invite code
	 */
	async getGameSession(inviteCode: string): Promise<GameSessionResponse> {
		return apiService.fetchApi(`/games/${inviteCode}`, {
			method: 'GET',
		});
	}

	/**
	 * Join a game with a character
	 */
	async joinGame(request: JoinGameRequest): Promise<GameSessionResponse> {
		return apiService.fetchApi(
			`/games/${request.inviteCode}/join`,
			{
				method: 'POST',
				body: JSON.stringify({
					character: request.character,
					playerId: request.playerId,
					playerEmail: request.playerEmail,
				}),
			},
		);
	}

	/**
	 * Poll game state (fallback when WebSocket unavailable)
	 */
	async pollGameState(inviteCode: string): Promise<GameSessionResponse> {
		return apiService.fetchApi(
			`/games/${inviteCode}/state`,
			{
				method: 'GET',
			},
		);
	}

	/**
	 * Submit a player action
	 */
	async submitPlayerAction(
		inviteCode: string,
		request: PlayerActionRequest & { playerId: string },
	): Promise<void> {
		return apiService.fetchApi(
			`/games/${inviteCode}/action`,
			{
				method: 'POST',
				body: JSON.stringify(request),
			},
		);
	}

	/**
	 * Submit a DM action (host only)
	 */
	async submitDMAction(
		inviteCode: string,
		request: DMActionRequest & { hostId: string },
	): Promise<GameStateResponse> {
		return apiService.fetchApi(
			`/games/${inviteCode}/dm-action`,
			{
				method: 'POST',
				body: JSON.stringify(request),
			},
		);
	}

	/**
	 * Start the game (host only)
	 */
	async startGame(
		inviteCode: string,
		hostId: string,
		gameState: MultiplayerGameState,
	): Promise<GameStateResponse> {
		return apiService.fetchApi(
			`/games/${inviteCode}/start`,
			{
				method: 'POST',
				body: JSON.stringify({
					hostId,
					gameState,
				}),
			},
		);
	}

	/**
	 * Get available quests
	 */
	async getQuests(): Promise<Quest[]> {
		const response = await apiService.fetchApi('/quests', {
			method: 'GET',
		});
		return response.quests || [];
	}

	async getMyGames(): Promise<MyGamesResponse> {
		return apiService.fetchApi('/games/me', {
			method: 'GET',
		});
	}

	async deleteGame(inviteCode: string): Promise<void> {
		return apiService.fetchApi(`/games/${inviteCode}`, {
			method: 'DELETE',
		});
	}

	async getMyCharacters(): Promise<Character[]> {
		const response = await apiService.fetchApi('/games/me/characters', {
			method: 'GET',
		});
		return response.characters || [];
	}

	async createCharacter(payload: Character): Promise<Character> {
		return apiService.fetchApi('/games/me/characters', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
	}

	async updateCharacter(id: string, payload: Partial<Character>): Promise<Character> {
		return apiService.fetchApi(`/games/me/characters/${id}`, {
			method: 'PUT',
			body: JSON.stringify(payload),
		});
	}

	async deleteCharacter(id: string): Promise<void> {
		return apiService.fetchApi(`/games/me/characters/${id}`, {
			method: 'DELETE',
		});
	}

	async getMapState(inviteCode: string): Promise<MapStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map`, {
			method: 'GET',
		});
	}

	async updateMapState(
		inviteCode: string,
		request: MapStateUpdateRequest,
	): Promise<MapStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map`, {
			method: 'PATCH',
			body: JSON.stringify(request),
		});
	}

	async generateMap(inviteCode: string, request: MapGenerationRequest): Promise<MapStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/generate`, {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async getGameCharacters(inviteCode: string): Promise<CharacterListResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/characters`, {
			method: 'GET',
		});
	}

        async mutateTerrain(
                inviteCode: string,
                request: MapTerrainMutationRequest,
        ): Promise<MapStateResponse> {
                return apiService.fetchApi(`/games/${inviteCode}/map/terrain`, {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async listMapTokens(inviteCode: string): Promise<MapTokenListResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
			method: 'GET',
		});
	}

        async saveMapToken(
                inviteCode: string,
                request: MapTokenUpsertRequest & { id?: string },
        ): Promise<MapTokenMutationResponse> {
                return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
                        method: 'POST',
                        body: JSON.stringify(request),
                });
        }

        async placePlayerToken(
                inviteCode: string,
                request: { characterId: string; x: number; y: number; label?: string; icon?: string },
        ): Promise<MapTokenMutationResponse> {
                return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
                        method: 'POST',
                        body: JSON.stringify({
                                characterId: request.characterId,
                                x: request.x,
                                y: request.y,
                                tokenType: 'player',
                                label: request.label,
                                metadata: request.icon ? { icon: request.icon } : undefined,
                        }),
                });
        }

        async validateMovement(
                inviteCode: string,
                characterId: string,
                fromX: number,
                fromY: number,
                toX: number,
                toY: number,
        ): Promise<MovementValidationResponse> {
                return apiService.fetchApi(`/games/${inviteCode}/map/movement/validate`, {
                        method: 'POST',
                        body: JSON.stringify({ characterId, fromX, fromY, toX, toY }),
                });
        }

	async deleteMapToken(inviteCode: string, tokenId: string): Promise<void> {
		return apiService.fetchApi(`/games/${inviteCode}/map/tokens/${tokenId}`, {
			method: 'DELETE',
		});
	}

	async getNpcDefinitions(inviteCode: string): Promise<NpcDefinitionListResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/npcs`, {
			method: 'GET',
		});
	}

	async getNpcInstances(inviteCode: string): Promise<NpcInstanceListResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/npc-instances`, {
			method: 'GET',
		});
	}

	async updateNpcInstance(
		inviteCode: string,
		tokenId: string,
		request: NpcInstanceUpdateRequest,
	): Promise<void> {
		return apiService.fetchApi(`/games/${inviteCode}/npcs/${tokenId}`, {
			method: 'PATCH',
			body: JSON.stringify(request),
		});
	}
	async placeNpc(inviteCode: string, request: NpcPlacementRequest): Promise<MapTokenMutationResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/npcs`, {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}
}

// Singleton instance
export const multiplayerClient = new MultiplayerClient();

