import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Unmock the DB module so we test the real class
vi.unmock('@/db');

import { Database } from '@/db';
import type { GameRow, MapRow } from '@/db/types';

describe('Database Unit Tests', () => {
	let db: Database;
	let mockD1: any;
	let mockStmt: any;

	beforeEach(() => {
		mockStmt = {
			bind: vi.fn().mockReturnThis(),
			first: vi.fn(),
			all: vi.fn(),
			run: vi.fn(),
		};

		mockD1 = {
			prepare: vi.fn().mockReturnValue(mockStmt),
			batch: vi.fn(),
			exec: vi.fn(),
		};

		db = new Database(mockD1);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Game Operations', () => {
		it('createGame should insert a new game', async () => {
			const game: Omit<GameRow, 'created_at' | 'updated_at'> = {
				id: 'game-1',
				invite_code: 'CODE',
				host_id: 'host-1',
				host_email: 'host@test.com',
				quest_id: 'quest-1',
				quest_data: '{}',
				world: 'world-1',
				starting_area: 'start',
				status: 'waiting',
				current_map_id: null,
			};

			await db.createGame(game);

			expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO games'));
			expect(mockStmt.bind).toHaveBeenCalledWith(
				game.id,
				game.invite_code,
				game.host_id,
				game.host_email,
				game.quest_id,
				game.quest_data,
				game.world,
				game.starting_area,
				game.status,
				game.current_map_id,
				expect.any(Number),
				expect.any(Number)
			);
			expect(mockStmt.run).toHaveBeenCalled();
		});

		it('getGameByInviteCode should return game if found', async () => {
			const mockGame = { id: 'game-1', invite_code: 'CODE' };
			mockStmt.first.mockResolvedValueOnce(mockGame);

			const result = await db.getGameByInviteCode('CODE');

			expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM games WHERE invite_code = ?'));
			expect(mockStmt.bind).toHaveBeenCalledWith('CODE');
			expect(result).toEqual(mockGame);
		});
	});

	describe('Map Operations', () => {
		it('saveMap should upsert map data', async () => {
			const map: Omit<MapRow, 'created_at' | 'updated_at'> = {
				id: 'map-1',
				slug: 'test-map',
				name: 'Test Map',
				description: 'A test map',
				width: 10,
				height: 10,
				default_terrain: 'stone', // simplified for test
				fog_of_war: '{}',
				terrain_layers: '[]',
				metadata: '{}',
				generator_preset: 'static',
				seed: 'seed',
				theme: 'theme',
				biome: 'biome',
				world: null,
				world_id: null,
				background_image_url: null,
				cover_image_url: null,
				grid_columns: 10,
				grid_size: 64,
				grid_offset_x: 0,
				grid_offset_y: 0,
				is_generated: 0,
			};

			await db.saveMap(map);

			expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO maps'));
			expect(mockStmt.run).toHaveBeenCalled();
		});

		it('replaceMapTiles should batch delete and insert', async () => {
			const mapId = 'map-1';
			const tiles = [
				{ x: 0, y: 0, terrain_type: 'grass' },
				{ x: 0, y: 1, terrain_type: 'water' },
			];

			await db.replaceMapTiles(mapId, tiles);

			expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM map_tiles'));
			expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO map_tiles'));
			expect(mockD1.batch).toHaveBeenCalled();
			const batchCalls = mockD1.batch.mock.calls[0][0];
			expect(batchCalls).toHaveLength(3); // 1 delete + 2 inserts
		});
	});

	describe('Character Operations', () => {
		it('createCharacter should insert character', async () => {
			const char: any = { id: 'char-1', name: 'Hero' }; // simplified
			await db.createCharacter(char);
			expect(mockD1.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO characters'));
			expect(mockStmt.run).toHaveBeenCalled();
		});
	});
});
