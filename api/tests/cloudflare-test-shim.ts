import { getStore } from './mock-db-store';

type PreparedResult<T = any> = { results: T[] };

const tableList = [
	{ name: 'games' },
	{ name: 'characters' },
	{ name: 'game_players' },
	{ name: 'game_states' },
	{ name: 'maps' },
	{ name: 'map_tiles' },
	{ name: 'map_tokens' },
	{ name: 'npcs' },
	{ name: 'activity_logs' },
];

class PreparedStatement {
	constructor(private query: string) {}

	private args: unknown[] = [];

	bind(...args: unknown[]) {
		this.args = args;
		return this;
	}

	async first<T>() {
		const results = await this.execute<T>();
		return (results as T[])[0] ?? null;
	}

	async all<T>() {
		const results = await this.execute<T>();
		return { results } as PreparedResult<T>;
	}

	async run() {
		await this.execute();
		return { success: true };
	}

	private async execute<T>() {
		const store = getStore();
		const normalized = this.query.toLowerCase().trim();

		if (normalized.includes('from sqlite_master')) {
			return tableList as unknown as T[];
		}

		if (normalized.includes('from characters') && normalized.includes('where id')) {
			const [characterId] = this.args as [string];
			const character = store.characters.find(c => c.id === characterId);
			if (!character) return [] as T[];
			return [{ trait: character.trait ?? '' }] as unknown as T[];
		}

		if (normalized.includes('count(*) as count') && normalized.includes('from map_tiles')) {
			const [mapId] = this.args as [string];
			const count = store.mapTiles.filter(t => t.map_id === mapId).length;
			return [{ count }] as unknown as T[];
		}

		if (normalized.includes('from map_tiles') && normalized.includes('and x = ?') && normalized.includes('and y = ?')) {
			const [mapId, x, y] = this.args as [string, number, number];
			return store.mapTiles.filter(tile => tile.map_id === mapId && tile.x === x && tile.y === y) as unknown as T[];
		}

		if (normalized.startsWith('insert into npcs')) {
			const [
				id,
				slug,
				name,
				role,
				alignment,
				disposition,
				description,
				icon,
				base_health,
				base_armor_class,
				challenge_rating,
				archetype,
				default_actions,
				stats,
				abilities,
				loot_table,
				metadata,
				created_at,
				updated_at,
			] = this.args as [string, string, string, string, string, string, string | null, string | null, number, number, number, string, string, string, string, string, string, number, number];
			const existingIndex = store.npcs.findIndex(n => n.id === id);
			const npcRow = {
				id,
				slug,
				name,
				role,
				alignment,
				disposition,
				description,
				icon,
				base_health,
				base_armor_class,
				challenge_rating,
				archetype,
				default_actions,
				stats,
				abilities,
				loot_table,
				metadata,
				created_at,
				updated_at,
			};
			if (existingIndex >= 0) {
				store.npcs[existingIndex] = npcRow;
			} else {
				store.npcs.push(npcRow);
			}
			return [] as T[];
		}

		if (normalized.startsWith('insert into uploaded_images')) {
			const [
				id,
				user_id,
				filename,
				r2_key,
				public_url,
				title,
				description,
				image_type,
				is_public,
				created_at,
				updated_at,
			] = this.args as [
				string,
				string,
				string,
				string,
				string,
				string | null,
				string | null,
				'npc' | 'character' | 'both',
				number,
				number,
				number,
			];
			const existingIndex = store.uploadedImages.findIndex(img => img.id === id);
			const imageRow = {
				id,
				user_id,
				filename,
				r2_key,
				public_url,
				title,
				description,
				image_type,
				is_public,
				created_at,
				updated_at,
			};
			if (existingIndex >= 0) {
				store.uploadedImages[existingIndex] = imageRow;
			} else {
				store.uploadedImages.push(imageRow);
			}
			return [] as T[];
		}

		if (normalized.includes('from uploaded_images')) {
			let results = store.uploadedImages;

			// Handle user_id filter
			if (normalized.includes('user_id = ?')) {
				// We need to find which arg corresponds to user_id.
				// In listUploadedImages, the order is params.push(userId) if userId exists.
				// And then limit, offset.
				// But we are in the shim, we receive `this.args`.
				// If user_id is present, it's the first arg.
				// But wait, listUploadedImages uses named parameters? No, `?` placeholders.
				// The implementation in db.ts conditionally adds parameters.

				// If the query has 'user_id = ?', then the first arg is user_id.
				// Unless there are other filters before it?
				// query = 'SELECT * FROM uploaded_images WHERE 1=1'
				// if (userId) query += ' AND user_id = ?'
				// So if user_id check is present, it's the first param.
				const userId = this.args[0] as string;
				results = results.filter(img => img.user_id === userId);
			}

			// Handle sorting (mock always sorts by created_at desc)
			results.sort((a, b) => b.created_at - a.created_at);

			// Handle limit/offset
			// The last two args are typically limit and offset.
			if (this.args.length >= 2) {
				const offset = this.args[this.args.length - 1] as number;
				const limit = this.args[this.args.length - 2] as number;
				results = results.slice(offset, offset + limit);
			}

			return results as unknown as T[];
		}

		return [] as T[];
	}
}

class D1DatabaseMock {
	prepare(query: string) {
		return new PreparedStatement(query);
	}

	async exec(_sql: string) {
		// No-op for migrations and cleanup
		return { success: true };
	}

	async batch(_statements: Array<{ run: () => Promise<unknown> }>) {
		// Execute each statement for completeness
		for (const stmt of _statements) {
			// eslint-disable-next-line no-await-in-loop
			await stmt.run();
		}
		return [];
	}
}

class KvNamespaceMock {
	private store = new Map<string, string>();

	async get(key: string) {
		return this.store.get(key) ?? null;
	}

	async put(key: string, value: string) {
		this.store.set(key, value);
	}

	async delete(key: string) {
		this.store.delete(key);
	}

	async list() {
		return {
			keys: Array.from(this.store.keys()).map(name => ({ name })),
			cursor: null,
		};
	}
}

export const env = {
	DATABASE: new D1DatabaseMock(),
	DB: new D1DatabaseMock(),
	QUESTS: new KvNamespaceMock(),
	AUTH_SESSIONS: new KvNamespaceMock(),
	ASSETS: undefined,
	OLLAMA_BASE_URL: '',
	OLLAMA_MODEL: '',
	ADMIN_EMAILS: '',
	AUTH_SECRET: 'test-secret',
	AUTH_URL: '',
	GOOGLE_CLIENT_ID: '',
	GOOGLE_CLIENT_SECRET: '',
};

export const SELF = undefined;
