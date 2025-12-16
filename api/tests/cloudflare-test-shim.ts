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

		if (normalized.startsWith('delete from uploaded_images')) {
			if (normalized.includes('where id = ?')) {
				const [id] = this.args as [string];
				store.uploadedImages = store.uploadedImages.filter(img => img.id !== id);
			}
			return [] as T[];
		}

		if (normalized.includes('from uploaded_images')) {
			let results = store.uploadedImages;
			let argIndex = 0;

			// Handle get by ID
			if (normalized.includes('where id = ?')) {
				const id = this.args[argIndex++] as string;
				results = results.filter(img => img.id === id);
				return results as unknown as T[];
			}

			// Handle user_id filter
			if (normalized.includes('user_id = ?')) {
				const userId = this.args[argIndex++] as string;
				results = results.filter(img => img.user_id === userId);
			}

			// Handle image_type filter
			if (normalized.includes('image_type = ?')) {
				const imageType = this.args[argIndex++] as string;
				// The query uses (image_type = ? OR image_type = "both")
				// We replicate the logic: match specific type OR both
				results = results.filter(img => img.image_type === imageType || img.image_type === 'both');
			}

			// Handle sorting (mock always sorts by created_at desc)
			results.sort((a, b) => b.created_at - a.created_at);

			// Handle limit/offset if present (last two args)
			// Assuming limit and offset are always provided in the list query
			if (this.args.length >= argIndex + 2) {
				// The arguments might be separated by other params, but DB.ts pushes limit, offset at the end
				// So we take from the end of args
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

	async withSession(_callback: any) {
		return this; // Placeholder
	}

	async dump() {
		return new ArrayBuffer(0);
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

class R2BucketMock {
	async put(_key: string, _value: any, _options?: any) { return null; }
	async get(_key: string) { return null; }
	async delete(_key: string) { return null; }
}

class DurableObjectNamespaceMock {
	idFromName(name: string) { return { toString: () => name }; }
	get(_id: any) { return { fetch: async () => new Response() }; }
}

export const env = {
	DATABASE: new D1DatabaseMock(),
	DB: new D1DatabaseMock(),
	QUESTS: new KvNamespaceMock(),
	AUTH_SESSIONS: new KvNamespaceMock(),
	IMAGES_BUCKET: new R2BucketMock(),
	GameRoom: new DurableObjectNamespaceMock(),
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
