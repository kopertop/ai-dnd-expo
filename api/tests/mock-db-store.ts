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
	UploadedImageRow,
} from '@/db';

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
	uploadedImages: UploadedImageRow[];
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
				world: null,
				world_id: null,
				background_image_url: null,
				cover_image_url: null,
				grid_columns: 10,
				grid_size: 64,
				grid_offset_x: 0,
				grid_offset_y: 0,
				default_terrain: JSON.stringify({ type: 'stone' }),
				fog_of_war: JSON.stringify({ enabled: false }),
				terrain_layers: JSON.stringify([]),
				metadata: JSON.stringify({}),
				generator_preset: 'forest',
				seed: '',
				theme: 'default',
				biome: 'forest',
				is_generated: 0,
				world_id: null,
				background_image_url: null,
				cover_image_url: null,
				grid_columns: 10,
				grid_size: 64,
				grid_offset_x: 0,
				grid_offset_y: 0,
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
				icon: null,
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
		uploadedImages: [],
	};
};

let store = createDefaultStore();

export const resetStore = () => {
	store = createDefaultStore();
};

export const getStore = () => store;
