import type { CharacterRow, Database, GameRow } from '../../../shared/workers/db';

import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import type { Character } from '@/types/character';
import type { MultiplayerGameState, PlayerInfo } from '@/types/multiplayer-game';
import { MapState } from '@/types/multiplayer-map';
import type { Quest } from '@/types/quest';
import { getCharacterSpeed } from '@/utils/character-utils';
import { mapStateFromDb } from '@/utils/schema-adapters';

interface GameStateData {
	activeTurn?: MultiplayerGameState['activeTurn'];
	initiativeOrder?: MultiplayerGameState['initiativeOrder'];
	pausedTurn?: MultiplayerGameState['pausedTurn'];
	characters?: Character[];
	players?: PlayerInfo[];
	messages?: MultiplayerGameState['messages'];
	activityLog?: MultiplayerGameState['activityLog'];
}

export class GameStateService {
	constructor(private db: Database) {}

	private rollD20(): number {
		return Math.floor(Math.random() * 20) + 1;
	}

	private getDexModifier(dex: number): number {
		return Math.floor((dex - 10) / 2);
	}

	private getEntitySpeed(
		entityId: string,
		type: 'player' | 'npc' | 'dm',
		characters: Character[],
	): number {
		if (type === 'player') {
			const character = characters.find(c => c.id === entityId);
			if (character) {
				return getCharacterSpeed(character);
			}
		}
		return DEFAULT_RACE_SPEED;
	}

	private buildActiveTurn(
		entity: { entityId: string; type: 'player' | 'npc' | 'dm' },
		currentTurnNumber: number,
		characters: Character[],
	): NonNullable<MultiplayerGameState['activeTurn']> {
		return {
			type: entity.type,
			entityId: entity.entityId,
			turnNumber: currentTurnNumber + 1,
			startedAt: Date.now(),
			movementUsed: 0,
			majorActionUsed: false,
			minorActionUsed: false,
			speed: this.getEntitySpeed(entity.entityId, entity.type, characters),
		};
	}

	private resetTurnUsage(
		turn: MultiplayerGameState['activeTurn'],
		characters: Character[],
	): MultiplayerGameState['activeTurn'] {
		if (!turn) {
			return turn;
		}
		return {
			...turn,
			movementUsed: 0,
			majorActionUsed: false,
			minorActionUsed: false,
			speed: turn.speed ?? this.getEntitySpeed(turn.entityId, turn.type, characters),
		};
	}

	private resetActionPointsForEntity(characters: Character[], entityId: string): Character[] {
		return characters.map(char =>
			char.id === entityId
				? {
					...char,
					actionPoints: char.maxActionPoints ?? 3,
				}
				: char,
		);
	}

	private restoreAllCharactersToFull(characters: Character[]): Character[] {
		return characters.map(char => ({
			...char,
			health: char.maxHealth ?? 10,
			actionPoints: char.maxActionPoints ?? 3,
		}));
	}

	/**
	 * Deserialize character from database row
	 */
	private deserializeCharacter(row: CharacterRow): Character {
		return {
			id: row.id,
			level: row.level,
			race: row.race,
			name: row.name,
			class: row.class,
			trait: row.trait || undefined,
			image: undefined,
			description: row.description || undefined,
			stats: JSON.parse(row.stats),
			skills: JSON.parse(row.skills),
			inventory: JSON.parse(row.inventory),
			equipped: JSON.parse(row.equipped),
			health: row.health,
			maxHealth: row.max_health,
			actionPoints: row.action_points,
			maxActionPoints: row.max_action_points,
			statusEffects: JSON.parse(row.status_effects || '[]'),
		};
	}

	/**
	 * Build map state from database
	 */
	private async buildMapState(game: GameRow): Promise<MapState> {
		const mapRow = await this.resolveMapRow(game);
		const [tiles, tokens] = await Promise.all([
			this.db.getMapTiles(mapRow.id),
			this.db.listMapTokensForGame(game.id),
		]);
		return mapStateFromDb(mapRow, { tiles, tokens });
	}

	/**
	 * Resolve map row for game
	 */
	private async resolveMapRow(game: GameRow) {
		if (game.current_map_id) {
			const map = await this.db.getMapById(game.current_map_id);
			if (map) return map;
		}
		// Fallback: create a default map
		const fallback = await this.db.listMaps();
		return fallback[0] || {
			id: 'default',
			slug: 'default',
			name: 'Default Map',
			description: null,
			width: 20,
			height: 20,
			default_terrain: JSON.stringify({ type: 'stone' }),
			fog_of_war: JSON.stringify({ enabled: false, grid: [] }),
			terrain_layers: JSON.stringify([]),
			metadata: JSON.stringify({}),
			generator_preset: 'forest',
			seed: '',
			theme: 'default',
			biome: 'forest',
			is_generated: 0,
			created_at: Date.now(),
			updated_at: Date.now(),
		};
	}

	/**
	 * Build full game state from database
	 */
	async getState(game: GameRow): Promise<MultiplayerGameState> {
		// Get game state from database
		const gameStateRow = await this.db.getGameState(game.id);
		const stateData: GameStateData = gameStateRow?.state_data
			? JSON.parse(gameStateRow.state_data)
			: {};

		// Get players
		const memberships = await this.db.getGamePlayers(game.id);
		const players: PlayerInfo[] = memberships.map(m => ({
			characterId: m.character_id,
			playerId: m.player_id,
			name: m.character_name,
			joinedAt: m.joined_at,
		}));

		// Get characters
		const characterRows = await Promise.all(
			memberships.map(async m => {
				const row = await this.db.getCharacterById(m.character_id);
				return row ? this.deserializeCharacter(row) : null;
			}),
		);
		const characters = characterRows.filter((c): c is Character => Boolean(c));

		// Use characters from state if available (they may have updated health/AP), otherwise use DB
		const finalCharacters = stateData.characters && stateData.characters.length > 0
			? stateData.characters
			: characters;

		// Get map state
		const mapState: MapState = await this.buildMapState(game);

		// Parse quest
		const quest: Quest = JSON.parse(game.quest_data);

		// Build full state
		const gameState: MultiplayerGameState = {
			sessionId: game.id,
			inviteCode: game.invite_code,
			hostId: game.host_id,
			quest,
			players: stateData.players || players,
			characters: finalCharacters,
			playerCharacterId: players[0]?.characterId || '',
			gameWorld: game.world,
			startingArea: game.starting_area,
			status: game.status,
			createdAt: game.created_at,
			lastUpdated: gameStateRow?.updated_at || game.updated_at,
			messages: stateData.messages || [],
			mapState,
			activeTurn: stateData.activeTurn,
			initiativeOrder: stateData.initiativeOrder,
			pausedTurn: stateData.pausedTurn,
			activityLog: stateData.activityLog || [],
		};

		return gameState;
	}

	/**
	 * Save game state to database
	 */
	async saveState(gameId: string, state: MultiplayerGameState): Promise<void> {
		const stateData: GameStateData = {
			activeTurn: state.activeTurn,
			initiativeOrder: state.initiativeOrder,
			pausedTurn: state.pausedTurn,
			characters: state.characters,
			players: state.players,
			messages: state.messages,
			activityLog: state.activityLog,
		};

		await this.db.updateGameState(gameId, {
			state_data: JSON.stringify(stateData),
		});
	}

	/**
	 * Start the game
	 */
	async startGame(game: GameRow, payload?: { gameState?: Partial<MultiplayerGameState> }): Promise<MultiplayerGameState> {
		// Update game status
		await this.db.updateGameStatus(game.id, 'active');

		// Get current state
		let state = await this.getState(game);

		// Merge with payload if provided
		if (payload?.gameState) {
			state = {
				...state,
				...payload.gameState,
				status: 'active',
				lastUpdated: Date.now(),
			};
		} else {
			state = {
				...state,
				status: 'active',
				lastUpdated: Date.now(),
			};
		}

		await this.saveState(game.id, state);
		return state;
	}

	/**
	 * Roll initiative for all characters and NPCs
	 */
	async rollInitiative(
		game: GameRow,
		characters: Array<{ id: string; stats: { DEX: number } }>,
		npcs: Array<{ id: string; stats?: { DEX: number }; entityId: string }>,
	): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		const initiativeEntries: Array<{ entityId: string; initiative: number; type: 'player' | 'npc'; dex: number; roll: number; dexMod: number }> = [];

		// Roll for characters
		for (const char of characters || []) {
			const dex = char.stats?.DEX ?? 10;
			const dexMod = this.getDexModifier(dex);
			const roll = this.rollD20();
			const initiative = roll + dexMod;
			initiativeEntries.push({
				entityId: char.id,
				initiative,
				type: 'player',
				dex,
				roll,
				dexMod,
			});
		}

		// Roll for NPCs
		for (const npc of npcs || []) {
			const dex = npc.stats?.DEX ?? 10;
			const dexMod = this.getDexModifier(dex);
			const roll = this.rollD20();
			const initiative = roll + dexMod;
			initiativeEntries.push({
				entityId: npc.entityId || npc.id,
				initiative,
				type: 'npc',
				dex,
				roll,
				dexMod,
			});
		}

		// Sort by initiative (descending), then by DEX (descending) for ties
		initiativeEntries.sort((a, b) => {
			if (b.initiative !== a.initiative) {
				return b.initiative - a.initiative;
			}
			return b.dex - a.dex;
		});

		const initiativeOrder = initiativeEntries.map(({ entityId, initiative, type, roll, dexMod }) => ({
			entityId,
			initiative,
			type,
			roll,
			dexMod,
		}));

		// Set first entity as active turn
		const firstEntity = initiativeOrder[0];
		let updatedCharacters = state.characters ?? [];

		// Restore ALL characters to full health and action points when starting a new encounter
		updatedCharacters = this.restoreAllCharactersToFull(updatedCharacters);

		const activeTurn = firstEntity
			? this.resetTurnUsage(
				this.buildActiveTurn(firstEntity, state.activeTurn?.turnNumber ?? 0, updatedCharacters),
				updatedCharacters,
			)
			: null;

		// Reset action points for the new turn's character
		if (activeTurn) {
			updatedCharacters = this.resetActionPointsForEntity(updatedCharacters, activeTurn.entityId);
		}

		const updatedState: MultiplayerGameState = {
			...state,
			initiativeOrder,
			activeTurn,
			characters: updatedCharacters,
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Add a single entity to the initiative order (auto-roll initiative)
	 */
	async addToInitiativeOrder(
		game: GameRow,
		entity: { entityId: string; type: 'player' | 'npc'; dex?: number },
	): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		// Check if entity is already in initiative order
		const existingOrder = state.initiativeOrder || [];
		if (existingOrder.some(entry => entry.entityId === entity.entityId)) {
			// Already in initiative order, return state unchanged
			return state;
		}

		// Roll initiative for this entity
		const dex = entity.dex ?? 10;
		const dexMod = this.getDexModifier(dex);
		const roll = this.rollD20();
		const initiative = roll + dexMod;

		// Create new initiative entry
		const newEntry = {
			entityId: entity.entityId,
			initiative,
			type: entity.type,
			roll,
			dexMod,
		};

		// Insert into sorted order (descending by initiative, then by DEX)
		const updatedOrder = [...existingOrder, newEntry].sort((a, b) => {
			if (b.initiative !== a.initiative) {
				return b.initiative - a.initiative;
			}
			// For ties, sort by DEX modifier (descending)
			return (b.dexMod ?? 0) - (a.dexMod ?? 0);
		});

		// Find position of new entry in sorted order
		const newEntryIndex = updatedOrder.findIndex(entry => entry.entityId === entity.entityId);

		// If this is the first entity or it's now at the top, set as active turn
		let activeTurn = state.activeTurn;
		let updatedCharacters = state.characters ?? [];

		if (existingOrder.length === 0 || newEntryIndex === 0) {
			// First entity or new entity is now first - set as active turn
			activeTurn = this.resetTurnUsage(
				this.buildActiveTurn(
					{ entityId: entity.entityId, type: entity.type },
					state.activeTurn?.turnNumber ?? 0,
					updatedCharacters,
				),
				updatedCharacters,
			);

			// Reset action points for the new turn's character
			if (activeTurn && entity.type === 'player') {
				updatedCharacters = this.resetActionPointsForEntity(updatedCharacters, entity.entityId);
			}
		}

		const updatedState: MultiplayerGameState = {
			...state,
			initiativeOrder: updatedOrder,
			activeTurn,
			characters: updatedCharacters,
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Remove an entity from the initiative order
	 */
	async removeFromInitiativeOrder(
		game: GameRow,
		entityId: string,
	): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		const existingOrder = state.initiativeOrder || [];
		const updatedOrder = existingOrder.filter(entry => entry.entityId !== entityId);

		// If removed entity was the active turn, advance to next
		let activeTurn = state.activeTurn;
		const wasActiveTurn = activeTurn?.entityId === entityId;

		if (wasActiveTurn && updatedOrder.length > 0) {
			// Find the index of the removed entity in the original order
			const removedIndex = existingOrder.findIndex(entry => entry.entityId === entityId);

			// After removal, the entity that was at removedIndex+1 is now at removedIndex
			// If removedIndex is beyond the new array length, wrap to 0
			const nextIndex = removedIndex < updatedOrder.length ? removedIndex : 0;
			const nextEntity = updatedOrder[nextIndex];

			if (nextEntity) {
				const characters = state.characters ?? [];
				activeTurn = this.resetTurnUsage(
					this.buildActiveTurn(
						{ entityId: nextEntity.entityId, type: nextEntity.type },
						activeTurn?.turnNumber ?? 0,
						characters,
					),
					characters,
				);

				// Reset action points for the new turn's character
				if (activeTurn && nextEntity.type === 'player') {
					const updatedCharacters = this.resetActionPointsForEntity(characters, nextEntity.entityId);
					const updatedState: MultiplayerGameState = {
						...state,
						initiativeOrder: updatedOrder,
						activeTurn,
						characters: updatedCharacters,
						lastUpdated: Date.now(),
					};
					await this.saveState(game.id, updatedState);
					return updatedState;
				}
			} else {
				// No more entities in order
				activeTurn = null;
			}
		}

		const updatedState: MultiplayerGameState = {
			...state,
			initiativeOrder: updatedOrder,
			activeTurn,
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * End current turn and advance to next
	 */
	async endTurn(game: GameRow): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		if (!state.initiativeOrder || state.initiativeOrder.length === 0) {
			throw new Error('No initiative order set');
		}

		const currentTurn = state.activeTurn;
		if (!currentTurn) {
			throw new Error('No active turn');
		}

		// Find current entity in initiative order
		const currentIndex = state.initiativeOrder.findIndex(
			entry => entry.entityId === currentTurn.entityId,
		);

		if (currentIndex === -1) {
			throw new Error('Current turn entity not found in initiative order');
		}

		// Move to next entity (wrap around if at end)
		const nextIndex = (currentIndex + 1) % state.initiativeOrder.length;
		const nextEntity = state.initiativeOrder[nextIndex];

		const characters = state.characters ?? [];
		const activeTurn = this.buildActiveTurn(
			{ entityId: nextEntity.entityId, type: nextEntity.type },
			currentTurn.turnNumber ?? 0,
			characters,
		);

		// Reset action points for the new turn's character
		const updatedCharacters = this.resetActionPointsForEntity(characters, nextEntity.entityId);

		const updatedState: MultiplayerGameState = {
			...state,
			characters: updatedCharacters,
			activeTurn: this.resetTurnUsage(activeTurn, updatedCharacters),
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Start a specific turn
	 */
	async startTurn(game: GameRow, turnType: 'player' | 'npc' | 'dm', entityId: string): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		const currentTurnNumber = state.activeTurn?.turnNumber ?? 0;
		const characters = state.characters ?? [];

		const activeTurn = this.buildActiveTurn(
			{ entityId, type: turnType },
			currentTurnNumber,
			characters,
		);

		// Reset action points for the character starting their turn
		const updatedCharacters = this.resetActionPointsForEntity(characters, entityId);

		const updatedState: MultiplayerGameState = {
			...state,
			characters: updatedCharacters,
			activeTurn: this.resetTurnUsage(activeTurn, updatedCharacters),
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Update turn state (movement, actions)
	 */
	async updateTurn(
		game: GameRow,
		updates: {
			movementUsed?: number;
			majorActionUsed?: boolean;
			minorActionUsed?: boolean;
			actorEntityId?: string;
		},
	): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		if (!state.activeTurn) {
			throw new Error('No active turn');
		}

		const currentTurn = state.activeTurn;

		if (updates.actorEntityId && updates.actorEntityId !== currentTurn.entityId) {
			throw new Error('Forbidden: Invalid actor');
		}

		const speed = currentTurn.speed ?? DEFAULT_RACE_SPEED;

		let movementUsed = currentTurn.movementUsed ?? 0;
		if (typeof updates.movementUsed === 'number' && Number.isFinite(updates.movementUsed)) {
			movementUsed = Math.min(speed, Math.max(0, updates.movementUsed));
		}

		const majorActionUsed =
			typeof updates.majorActionUsed === 'boolean'
				? updates.majorActionUsed
				: currentTurn.majorActionUsed ?? false;
		const minorActionUsed =
			typeof updates.minorActionUsed === 'boolean'
				? updates.minorActionUsed
				: currentTurn.minorActionUsed ?? false;

		const updatedState: MultiplayerGameState = {
			...state,
			activeTurn: {
				...currentTurn,
				movementUsed,
				majorActionUsed,
				minorActionUsed,
			},
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Interrupt current turn (pause it and switch to DM)
	 */
	async interruptTurn(game: GameRow, hostId: string): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		// Store current turn as paused
		const currentActiveTurn = state.activeTurn;
		const pausedTurn: MultiplayerGameState['pausedTurn'] = currentActiveTurn
			? {
				type: currentActiveTurn.type,
				entityId: currentActiveTurn.entityId,
				turnNumber: currentActiveTurn.turnNumber,
				startedAt: currentActiveTurn.startedAt,
			}
			: undefined;

		// Build new DM turn
		const characters = state.characters ?? [];
		const currentTurnNumber = state.activeTurn?.turnNumber ?? 0;
		const activeTurn = this.buildActiveTurn(
			{ entityId: hostId, type: 'dm' },
			currentTurnNumber,
			characters,
		);

		const updatedState: MultiplayerGameState = {
			...state,
			pausedTurn,
			activeTurn,
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Resume paused turn
	 */
	async resumeTurn(game: GameRow): Promise<MultiplayerGameState> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		// Restore paused turn
		const pausedTurn = state.pausedTurn;
		if (!pausedTurn || !pausedTurn.entityId || !pausedTurn.type) {
			throw new Error('No paused turn to resume');
		}

		// Get characters to properly initialize turn usage fields
		const characters = state.characters ?? [];

		// Restore the paused turn with proper turn usage initialization
		const activeTurn = this.resetTurnUsage(
			{
				type: pausedTurn.type,
				entityId: pausedTurn.entityId,
				turnNumber: pausedTurn.turnNumber,
				startedAt: Date.now(),
				movementUsed: 0,
				majorActionUsed: false,
				minorActionUsed: false,
			},
			characters,
		);

		const updatedState: MultiplayerGameState = {
			...state,
			activeTurn,
			pausedTurn: undefined,
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);
		return updatedState;
	}

	/**
	 * Roll dice
	 */
	rollDice(notation: string, advantage?: boolean, disadvantage?: boolean): {
		notation: string;
		total: number;
		rolls: number[];
		breakdown: string;
	} {
		// Parse dice notation: XdY+Z or XdY-Z
		const notationMatch = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
		if (!notationMatch) {
			throw new Error('Invalid dice notation. Use format like "1d20", "2d6+3", or "1d4-1"');
		}

		const numDice = parseInt(notationMatch[1], 10);
		const dieSize = parseInt(notationMatch[2], 10);
		const modifier = notationMatch[3] ? parseInt(notationMatch[3], 10) : 0;

		if (numDice < 1 || numDice > 100) {
			throw new Error('Number of dice must be between 1 and 100');
		}

		if (dieSize < 2 || dieSize > 100) {
			throw new Error('Die size must be between 2 and 100');
		}

		// Handle advantage/disadvantage (only for d20)
		let rolls: number[];
		if (dieSize === 20 && numDice === 1 && (advantage || disadvantage)) {
			const roll1 = Math.floor(Math.random() * dieSize) + 1;
			const roll2 = Math.floor(Math.random() * dieSize) + 1;
			if (advantage) {
				rolls = [Math.max(roll1, roll2)];
			} else {
				rolls = [Math.min(roll1, roll2)];
			}
		} else {
			rolls = Array.from({ length: numDice }, () => Math.floor(Math.random() * dieSize) + 1);
		}

		const sum = rolls.reduce((a, b) => a + b, 0);
		const total = sum + modifier;

		const breakdown = `${rolls.join(' + ')}${modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''} = ${total}`;

		return {
			notation,
			total,
			rolls,
			breakdown,
		};
	}

	/**
	 * Update character in game state
	 */
	async updateCharacter(game: GameRow, characterId: string, updates: Partial<Character>): Promise<Character> {
		const state = await this.getState(game);
		if (state.status !== 'active') {
			throw new Error('Game not started');
		}

		// Update character in game state
		const updatedCharacters = state.characters.map(c =>
			c.id === characterId ? { ...c, ...updates } : c,
		);

		const updatedState: MultiplayerGameState = {
			...state,
			characters: updatedCharacters,
			lastUpdated: Date.now(),
		};

		await this.saveState(game.id, updatedState);

		const updatedCharacter = updatedCharacters.find(c => c.id === characterId);
		if (!updatedCharacter) {
			throw new Error('Character not found');
		}
		return updatedCharacter;
	}
}

