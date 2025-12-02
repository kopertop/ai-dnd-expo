import type {
	ActivityLogRow,
	CharacterRow,
	GamePlayerRow,
	GameRow,
	GameStateRow,
	MapRow,
	MapTileRow,
	MapTokenRow,
	NpcRow,
} from '@/shared/workers/db';

interface DataStore {
	games: GameRow[];
	characters: CharacterRow[];
	gamePlayers: GamePlayerRow[];
	gameStates: GameStateRow[];
	maps: MapRow[];
	mapTiles: MapTileRow[];
	mapTokens: MapTokenRow[];
	npcs: NpcRow[];
	activityLogs: ActivityLogRow[];
}

const createDefaultStore = (): DataStore => {
	const now = Date.now();
	return {
		games: [],
		characters: [],
		gamePlayers: [],
		gameStates: [],
		maps: [
			{
				id: 'map-1',
				slug: 'default',
				name: 'Default Map',
				description: null,
				width: 10,
				height: 10,
				default_terrain: JSON.stringify({ type: 'stone' }),
				fog_of_war: JSON.stringify({ enabled: false }),
				terrain_layers: JSON.stringify([]),
				metadata: JSON.stringify({}),
				generator_preset: 'forest',
				seed: '',
				theme: 'default',
				biome: 'forest',
				is_generated: 0,
				created_at: now,
				updated_at: now,
			},
		],
		mapTiles: [],
		mapTokens: [],
		npcs: [
			{
				id: 'npc-1',
				slug: 'guard',
				name: 'Town Guard',
				role: 'Sentinel',
				alignment: 'lawful',
				disposition: 'friendly',
				description: null,
				base_health: 20,
				base_armor_class: 15,
				challenge_rating: 1,
				archetype: 'guardian',
				default_actions: JSON.stringify(['attack']),
				stats: JSON.stringify({ strength: 14 }),
				abilities: JSON.stringify(['Shield']),
				loot_table: JSON.stringify([]),
				metadata: JSON.stringify({ color: '#222' }),
				created_at: now,
				updated_at: now,
			},
		],
		activityLogs: [],
	};
};

let store = createDefaultStore();

export const resetStore = () => {
	store = createDefaultStore();
};

export const getStore = () => store;
