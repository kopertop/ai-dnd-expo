import { apiService, authService } from 'expo-auth-template/frontend';

import { API_BASE_URL } from '@/services/config/api-base-url';
import {
	ActivityLogListResponse,
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
	PlayerPlacementRequest,
} from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import type { CharacterActionResult } from '@/types/combat';
import { MultiplayerGameState } from '@/types/multiplayer-game';
import { NpcDefinition } from '@/types/multiplayer-map';
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
		const response = await apiService.fetchApi('/characters', {
			method: 'GET',
		});
		return response.characters || [];
	}

	async createCharacter(payload: Character): Promise<Character> {
		return apiService.fetchApi('/characters', {
			method: 'POST',
			body: JSON.stringify(payload),
		});
	}

	async updateCharacter(id: string, payload: Partial<Character>): Promise<Character> {
		return apiService.fetchApi(`/characters/${id}`, {
			method: 'PUT',
			body: JSON.stringify(payload),
		});
	}

	async deleteCharacter(id: string): Promise<void> {
		return apiService.fetchApi(`/characters/${id}`, {
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

	async placePlayerToken(inviteCode: string, request: PlayerPlacementRequest): Promise<MapTokenMutationResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
			method: 'POST',
			body: JSON.stringify({
				...request,
				tokenType: 'player',
			}),
		});
	}

	async listMapTokens(inviteCode: string): Promise<MapTokenListResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
			method: 'GET',
		});
	}

	async saveMapToken(
		inviteCode: string,
		request: MapTokenUpsertRequest & { id?: string; overrideValidation?: boolean },
	): Promise<MapTokenMutationResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
			method: 'POST',
			body: JSON.stringify(request),
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

	async getNpcDefinition(inviteCode: string, npcId: string): Promise<NpcDefinition> {
		return apiService.fetchApi(`/games/${inviteCode}/npcs/${npcId}`, {
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

	async validateMovement(
		inviteCode: string,
		request: { characterId: string; fromX: number; fromY: number; toX: number; toY: number },
	): Promise<MovementValidationResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/movement/validate`, {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async updateTurnState(
		inviteCode: string,
		request: { movementUsed?: number; majorActionUsed?: boolean; minorActionUsed?: boolean; actorEntityId?: string },
	): Promise<MultiplayerGameState> {
		return apiService.fetchApi(`/games/${inviteCode}/turn/update`, {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async startTurn(
		inviteCode: string,
		request: { turnType: 'player' | 'npc' | 'dm'; entityId: string },
	): Promise<GameStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/turn/start`, {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}

	async endTurn(inviteCode: string): Promise<GameStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/turn/end`, {
			method: 'POST',
		});
	}

	async getCurrentTurn(inviteCode: string): Promise<{ activeTurn: { type: string; entityId: string; turnNumber: number; startedAt: number } | null }> {
		return apiService.fetchApi(`/games/${inviteCode}/turn`, {
			method: 'GET',
		});
	}

	/**
	 * Get all available maps in the system
	 */
	async getAllMaps(): Promise<{ maps: Array<{ id: string; slug: string; name: string; description: string | null; width: number; height: number }> }> {
		return apiService.fetchApi('/maps', {
			method: 'GET',
		});
	}

	/**
	 * Clone a map
	 */
	async cloneMap(sourceMapId: string, newName: string): Promise<{ map: { id: string; slug: string; name: string; description: string | null; width: number; height: number } }> {
		return apiService.fetchApi('/maps/clone', {
			method: 'POST',
			body: JSON.stringify({ sourceMapId, newName }),
		});
	}

	/**
	 * Switch to a different map for a game
	 */
	async switchMap(inviteCode: string, mapId: string): Promise<MapStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map`, {
			method: 'PATCH',
			body: JSON.stringify({ mapId }),
		});
	}

	/**
	 * Roll initiative for all characters and NPCs
	 */
	async rollInitiative(inviteCode: string): Promise<GameStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/initiative/roll`, {
			method: 'POST',
		});
	}

	/**
	 * Interrupt the current turn (DM action)
	 */
	async interruptTurn(inviteCode: string): Promise<{
		activeTurn: { type: string; entityId: string; turnNumber: number; startedAt: number };
		pausedTurn?: { type: string; entityId: string; turnNumber: number; startedAt: number };
	}> {
		return apiService.fetchApi(`/games/${inviteCode}/turn/interrupt`, {
			method: 'POST',
		});
	}

	/**
	 * Resume a paused turn
	 */
	async resumeTurn(inviteCode: string): Promise<{
		activeTurn: { type: string; entityId: string; turnNumber: number; startedAt: number };
	}> {
		return apiService.fetchApi(`/games/${inviteCode}/turn/resume`, {
			method: 'POST',
		});
	}

	/**
	 * Deal damage to a character
	 */
	async dealDamage(inviteCode: string, characterId: string, amount: number): Promise<{ character: Character | null }> {
		return apiService.fetchApi(`/games/${inviteCode}/characters/${characterId}/damage`, {
			method: 'POST',
			body: JSON.stringify({ amount }),
		});
	}

	/**
	 * Heal a character
	 */
	async healCharacter(inviteCode: string, characterId: string, amount: number): Promise<{ character: Character | null }> {
		return apiService.fetchApi(`/games/${inviteCode}/characters/${characterId}/heal`, {
			method: 'POST',
			body: JSON.stringify({ amount }),
		});
	}

	/**
	 * Skip to next turn (DM only)
	 */
	async nextTurn(inviteCode: string): Promise<GameStateResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/turn/next`, {
			method: 'POST',
		});
	}

	/**
	 * Start a specific character's turn (DM only)
	 */
	async startCharacterTurn(
		inviteCode: string,
		entityId: string,
		turnType: 'player' | 'npc' | 'dm',
	): Promise<GameStateResponse> {
		return this.startTurn(inviteCode, { turnType, entityId });
	}

	/**
	 * Cast a spell for a character
	 */
	async castSpell(
		inviteCode: string,
		characterId: string,
		spellName: string,
		targetId?: string,
	): Promise<{ character: Character | null; actionPerformed: string; actionResult?: CharacterActionResult }> {
		return apiService.fetchApi(`/games/${inviteCode}/characters/${characterId}/actions`, {
			method: 'POST',
			body: JSON.stringify({
				actionType: 'cast_spell',
				spellName,
				targetId,
			}),
		});
	}

	/**
	 * Perform an action for a character
	 */
	async performAction(
		inviteCode: string,
		characterId: string,
		actionType: 'cast_spell' | 'basic_attack' | 'use_item' | 'heal_potion',
		params?: { spellName?: string; targetId?: string; itemId?: string;[key: string]: unknown },
	): Promise<{ character: Character | null; actionPerformed: string; actionResult?: CharacterActionResult }> {
		return apiService.fetchApi(`/games/${inviteCode}/characters/${characterId}/actions`, {
			method: 'POST',
			body: JSON.stringify({
				actionType,
				...(params || {}),
			}),
		});
	}

	/**
	 * Roll dice with notation (e.g., "1d20+3")
	 */
	async rollDice(
		inviteCode: string,
		notation: string,
		options?: { advantage?: boolean; disadvantage?: boolean; purpose?: string },
	): Promise<{
		total: number;
		rolls: number[];
		modifier: number;
		breakdown: string;
		purpose?: string;
	}> {
		return apiService.fetchApi(`/games/${inviteCode}/dice/roll`, {
			method: 'POST',
			body: JSON.stringify({
				notation,
				...options,
			}),
		});
	}

	/**
	 * Roll a perception check for a character
	 */
	async rollPerceptionCheck(
		inviteCode: string,
		characterId: string,
		options?: { dc?: number; passive?: boolean },
	): Promise<{
		characterId: string;
		mode: 'active' | 'passive';
		total: number;
		roll?: number;
		modifier?: number;
		breakdown?: string;
		dc?: number;
		success?: boolean;
	}> {
		return apiService.fetchApi(`/games/${inviteCode}/characters/${characterId}/perception-check`, {
			method: 'POST',
			body: JSON.stringify(options ?? {}),
		});
	}

	/**
	 * Place a map element (fire, water, chest, etc.)
	 */
	async placeMapElement(
		inviteCode: string,
		elementType: string,
		x: number,
		y: number,
	): Promise<MapTokenMutationResponse> {
		return apiService.fetchApi(`/games/${inviteCode}/map/tokens`, {
			method: 'POST',
			body: JSON.stringify({
				tokenType: 'element',
				elementType,
				x,
				y,
			}),
		});
	}

	/**
	 * Stop an active game and return it to waiting status
	 */
	async stopGame(inviteCode: string): Promise<void> {
		return apiService.fetchApi(`/games/${inviteCode}/stop`, {
			method: 'PATCH',
		});
	}

	async getActivityLogs(inviteCode: string, limit: number = 100, offset: number = 0): Promise<ActivityLogListResponse> {
		const queryParams = new URLSearchParams({
			limit: limit.toString(),
			offset: offset.toString(),
		});
		return apiService.fetchApi(`/games/${inviteCode}/log?${queryParams.toString()}`, {
			method: 'GET',
		});
	}

	async createActivityLog(
		inviteCode: string,
		type: string,
		description: string,
		data?: Record<string, unknown>,
	): Promise<{ id: string; success: boolean }> {
		return apiService.fetchApi(`/games/${inviteCode}/log`, {
			method: 'POST',
			body: JSON.stringify({
				type,
				description,
				data,
			}),
		});
	}

	async clearActivityLogs(inviteCode: string): Promise<void> {
		return apiService.fetchApi(`/games/${inviteCode}/log`, {
			method: 'DELETE',
		});
	}
}

// Singleton instance
export const multiplayerClient = new MultiplayerClient();
