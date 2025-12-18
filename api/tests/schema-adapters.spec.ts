import { describe, expect, it } from 'vitest';

import type { MapRow, MapTileRow, MapTokenRow, NpcRow } from '@/db';
import { mapStateFromDb, mapStateToDb, npcFromDb } from '@/utils/schema-adapters';

const baseMapRow = (): MapRow => ({
	id: 'map-1',
	slug: 'town-square',
	name: 'Town Square',
	description: 'Starter area',
	width: 2,
	height: 2,
	world: null,
	default_terrain: JSON.stringify({ type: 'cobblestone', elevation: 0 }),
	fog_of_war: JSON.stringify({ enabled: true, revealed: [[0, 1]] }),
	terrain_layers: JSON.stringify([{ type: 'structures', items: ['fountain'] }]),
	metadata: JSON.stringify({ biome: 'urban' }),
	generator_preset: 'forest',
	seed: 'test-seed',
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
	created_at: Date.now(),
	updated_at: Date.now(),
});

const sampleTiles: MapTileRow[] = [
	{
		id: 'tile-1',
		map_id: 'map-1',
		x: 0,
		y: 0,
		terrain_type: 'market',
		elevation: 1,
		movement_cost: 1,
		is_blocked: 0,
		is_difficult: 0,
		has_fog: 0,
		provides_cover: 0,
		cover_type: null,
		feature_type: null,
		metadata: JSON.stringify({}),
	},
	{
		id: 'tile-2',
		map_id: 'map-1',
		x: 1,
		y: 0,
		terrain_type: 'fountain',
		elevation: 0,
		movement_cost: 2,
		is_blocked: 1,
		is_difficult: 1,
		has_fog: 1,
		provides_cover: 0,
		cover_type: null,
		feature_type: null,
		metadata: JSON.stringify({}),
	},
];

const sampleTokens: MapTokenRow[] = [
	{
		id: 'token-1',
		game_id: 'game-1',
		map_id: 'map-1',
		character_id: 'char-1',
		npc_id: null,
		token_type: 'player',
		label: 'Hero',
		image_url: null,
		x: 1,
		y: 1,
		facing: 0,
		color: '#123456',
		status: 'idle',
		is_visible: 1,
		hit_points: null,
		max_hit_points: null,
		status_effects: null,
		metadata: JSON.stringify({ note: 'spawn' }),
		created_at: Date.now(),
		updated_at: Date.now(),
	},
];

describe('schema adapters', () => {
	it('converts database rows into map state', () => {
		const mapRow = baseMapRow();
		const state = mapStateFromDb(mapRow, {
			tiles: sampleTiles,
			tokens: sampleTokens,
		});

		expect(state.id).toBe('map-1');
		expect(state.terrain?.[0]?.[0]).toMatchObject({ terrain: 'market', elevation: 1 });
		expect(state.terrain?.[0]?.[1]).toMatchObject({ terrain: 'fountain', difficult: true });
		expect(state.fog?.[0]?.[0]).toBe(true); // Fog enabled everywhere except revealed cell
		expect(state.fog?.[1]?.[0]).toBe(false);
		expect(state.tokens).toHaveLength(1);
		expect(state.tokens[0]).toMatchObject({
			id: 'token-1',
			type: 'player',
			entityId: 'char-1',
			color: '#123456',
		});
	});

	it('serializes map state back to JSON payloads', () => {
		const mapRow = baseMapRow();
		const state = mapStateFromDb(mapRow, { tiles: sampleTiles });
		const payload = mapStateToDb({
			...state,
			defaultTerrain: 'grass',
			fog: [
				[false, true],
				[true, false],
			],
			metadata: { terrainLayers: ['structures'], biome: 'urban' },
		});

		expect(payload.defaultTerrain).toBe(JSON.stringify({ type: 'grass' }));
		expect(JSON.parse(payload.fogOfWar)).toMatchObject({
			enabled: true,
			grid: [
				[false, true],
				[true, false],
			],
		});
		expect(JSON.parse(payload.metadata)).toMatchObject({ biome: 'urban' });
	});

	it('maps NPC rows into definition objects', () => {
		const npcRow: NpcRow = {
			id: 'npc-1',
			slug: 'guard-captain',
			name: 'Guard Captain',
			role: 'Sentinel',
			alignment: 'lawful_good',
			disposition: 'friendly',
			description: 'Protects the gates',
			base_health: 40,
			base_armor_class: 17,
			challenge_rating: 3,
			archetype: 'guardian',
			default_actions: JSON.stringify(['attack', 'defend']),
			stats: JSON.stringify({ strength: 16 }),
			abilities: JSON.stringify(['Command']),
			loot_table: JSON.stringify(['Halberd']),
			icon: 'MaterialIcons:shield',
			metadata: JSON.stringify({ color: '#a00', icon: 'shield' }),
			created_at: Date.now(),
			updated_at: Date.now(),
		};

		const npc = npcFromDb(npcRow);
		expect(npc).toMatchObject({
			id: 'npc-1',
			name: 'Guard Captain',
			role: 'Sentinel',
			alignment: 'lawful_good',
			maxHealth: 40,
			armorClass: 17,
			color: '#a00',
		});
	});
});
