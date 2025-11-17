import Database, { Database as BetterSqliteDatabase } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

interface MapSeed {
        id: string;
        slug: string;
        name: string;
        description: string;
        width: number;
        height: number;
        defaultTerrain: Record<string, unknown>;
        fogOfWar: Record<string, unknown>;
        terrainLayers: Record<string, unknown>[];
        metadata?: Record<string, unknown>;
        theme: string;
        biome: string;
}

interface MapTileSeed {
        id: string;
        mapId: string;
        x: number;
        y: number;
        terrainType: string;
        elevation?: number;
        isBlocked?: boolean;
        hasFog?: boolean;
        featureType?: string;
        metadata?: Record<string, unknown>;
}

interface NpcSeed {
        id: string;
        slug: string;
        name: string;
        role: string;
        alignment: string;
        disposition: 'hostile' | 'friendly' | 'vendor' | 'neutral';
        description: string;
        baseHealth: number;
        baseArmorClass: number;
        challengeRating: number;
        archetype: string;
        defaultActions: string[];
        stats: Record<string, unknown>;
        abilities: string[];
        lootTable: string[];
        metadata?: Record<string, unknown>;
}

const MAP_SEEDS: MapSeed[] = [
        {
                id: 'map_town_square',
                slug: 'town_square',
                name: 'Town Square',
                description: 'Central marketplace with merchant stalls and a fountain.',
                width: 24,
                height: 24,
                defaultTerrain: { type: 'cobblestone', elevation: 0 },
                fogOfWar: { enabled: false },
                terrainLayers: [{ type: 'structures', items: ['fountain', 'stalls', 'statue'] }],
                metadata: { biome: 'urban', tags: ['safe', 'trade'] },
                theme: 'urban',
                biome: 'city',
        },
        {
                id: 'map_dungeon_antechamber',
                slug: 'dungeon_antechamber',
                name: 'Dungeon Antechamber',
                description: 'Torch-lit stone room that leads into the depths of a forgotten dungeon.',
                width: 18,
                height: 18,
                defaultTerrain: { type: 'stone', elevation: 0 },
                fogOfWar: { enabled: true },
                terrainLayers: [{ type: 'features', items: ['doorways', 'pillars'] }],
                metadata: { biome: 'underground', tags: ['danger', 'combat'] },
                theme: 'dungeon',
                biome: 'underground',
        },
];

const MAP_TILE_SEEDS: MapTileSeed[] = [
        { id: 'tile_town_square_0_0', mapId: 'map_town_square', x: 0, y: 0, terrainType: 'cobblestone' },
        { id: 'tile_town_square_1_0', mapId: 'map_town_square', x: 1, y: 0, terrainType: 'cobblestone' },
        { id: 'tile_town_square_0_1', mapId: 'map_town_square', x: 0, y: 1, terrainType: 'fountain', isBlocked: true },
        { id: 'tile_town_square_1_1', mapId: 'map_town_square', x: 1, y: 1, terrainType: 'market' },
        { id: 'tile_dungeon_0_0', mapId: 'map_dungeon_antechamber', x: 0, y: 0, terrainType: 'stone' },
        { id: 'tile_dungeon_1_0', mapId: 'map_dungeon_antechamber', x: 1, y: 0, terrainType: 'stone' },
        { id: 'tile_dungeon_0_1', mapId: 'map_dungeon_antechamber', x: 0, y: 1, terrainType: 'pit', isBlocked: true },
        { id: 'tile_dungeon_1_1', mapId: 'map_dungeon_antechamber', x: 1, y: 1, terrainType: 'doorway' },
];

const NPC_SEEDS: NpcSeed[] = [
        {
            id: 'npc_guard_captain',
            slug: 'guard_captain',
            name: 'Town Guard Captain',
            role: 'Sentinel',
            alignment: 'lawful_good',
            disposition: 'friendly',
            description: 'A veteran guard tasked with keeping the peace.',
            baseHealth: 48,
            baseArmorClass: 18,
            challengeRating: 3,
            archetype: 'guardian',
            defaultActions: ['attack', 'defend', 'issue_orders'],
            stats: { strength: 16, dexterity: 12, wisdom: 13 },
            abilities: ['Commanding Presence', 'Shield Wall'],
            lootTable: ['Halberd', 'Guard Insignia'],
            metadata: { tags: ['friendly', 'quest-giver'] },
        },
        {
            id: 'npc_merchant_arcanist',
            slug: 'merchant_arcanist',
            name: 'Arcanist Merchant',
            role: 'Vendor',
            alignment: 'neutral',
            disposition: 'vendor',
            description: 'Travelling mage who barters enchanted items.',
            baseHealth: 32,
            baseArmorClass: 14,
            challengeRating: 2,
            archetype: 'support',
            defaultActions: ['barter', 'cast_minor_spell'],
            stats: { intelligence: 17, charisma: 15 },
            abilities: ['Identify', 'Mystic Shield'],
            lootTable: ['Potion of Healing', 'Scroll of Shield'],
            metadata: { tags: ['vendor', 'support'] },
        },
        {
            id: 'npc_goblin_raider',
            slug: 'goblin_raider',
            name: 'Goblin Raider',
            role: 'Scout',
            alignment: 'chaotic_evil',
            disposition: 'hostile',
            description: 'Sneaky goblin that loves ambushes.',
            baseHealth: 18,
            baseArmorClass: 13,
            challengeRating: 0.5,
            archetype: 'skirmisher',
            defaultActions: ['stab', 'hide'],
            stats: { dexterity: 15, constitution: 12 },
            abilities: ['Pack Tactics'],
            lootTable: ['Rusty Dagger', 'Coin Pouch'],
            metadata: { tags: ['hostile', 'underground'] },
        },
];

function resolveDatabasePath(): string {
        const cliPath = process.argv[2];
        if (cliPath) {
                return path.resolve(cliPath);
        }

        const envPath = process.env.DATABASE_PATH;
        if (envPath) {
                return path.resolve(envPath);
        }

        const defaultPath = path.resolve('.wrangler');
        if (fs.existsSync(defaultPath)) {
                const sqliteFile = findSqliteFile(defaultPath);
                if (sqliteFile) {
                        return sqliteFile;
                }
        }

        throw new Error('Unable to determine database path. Pass it as CLI argument or set DATABASE_PATH.');
}

function findSqliteFile(dir: string): string | undefined {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                        const nested = findSqliteFile(entryPath);
                        if (nested) {
                                return nested;
                        }
                } else if (entry.name.endsWith('.sqlite')) {
                        return entryPath;
                }
        }
        return undefined;
}

function seedMaps(db: BetterSqliteDatabase) {
        const statement = db.prepare(
                `INSERT INTO maps (
                        id, slug, name, description, width, height, default_terrain, fog_of_war,
                        terrain_layers, metadata, generator_preset, seed, theme, biome, is_generated,
                        created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                        slug = excluded.slug,
                        name = excluded.name,
                        description = excluded.description,
                        width = excluded.width,
                        height = excluded.height,
                        default_terrain = excluded.default_terrain,
                        fog_of_war = excluded.fog_of_war,
                        terrain_layers = excluded.terrain_layers,
                        metadata = excluded.metadata,
                        generator_preset = excluded.generator_preset,
                        seed = excluded.seed,
                        theme = excluded.theme,
                        biome = excluded.biome,
                        is_generated = excluded.is_generated,
                        updated_at = excluded.updated_at`,
        );

        const now = Date.now();
        for (const map of MAP_SEEDS) {
                statement.run(
                        map.id,
                        map.slug,
                        map.name,
                        map.description,
                        map.width,
                        map.height,
                        JSON.stringify(map.defaultTerrain),
                        JSON.stringify(map.fogOfWar),
                        JSON.stringify(map.terrainLayers),
                        JSON.stringify(map.metadata ?? {}),
                        'static',
                        map.slug,
                        map.theme,
                        map.biome,
                        0,
                        now,
                        now,
                );
        }
}

function seedTiles(db: BetterSqliteDatabase) {
        const statement = db.prepare(
                `INSERT INTO map_tiles (
                        id, map_id, x, y, terrain_type, elevation, is_blocked, has_fog, feature_type, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                        terrain_type = excluded.terrain_type,
                        elevation = excluded.elevation,
                        is_blocked = excluded.is_blocked,
                        has_fog = excluded.has_fog,
                        feature_type = excluded.feature_type,
                        metadata = excluded.metadata`,
        );

        for (const tile of MAP_TILE_SEEDS) {
                statement.run(
                        tile.id,
                        tile.mapId,
                        tile.x,
                        tile.y,
                        tile.terrainType,
                        tile.elevation ?? 0,
                        tile.isBlocked ? 1 : 0,
                        tile.hasFog ? 1 : 0,
                        tile.featureType ?? null,
                        JSON.stringify(tile.metadata ?? {}),
                );
        }
}

function seedNpcs(db: BetterSqliteDatabase) {
        const statement = db.prepare(
                `INSERT INTO npcs (
                        id, slug, name, role, alignment, disposition, description, base_health, base_armor_class,
                        challenge_rating, archetype, default_actions, stats, abilities, loot_table, metadata,
                        created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                        slug = excluded.slug,
                        name = excluded.name,
                        role = excluded.role,
                        alignment = excluded.alignment,
                        disposition = excluded.disposition,
                        description = excluded.description,
                        base_health = excluded.base_health,
                        base_armor_class = excluded.base_armor_class,
                        challenge_rating = excluded.challenge_rating,
                        archetype = excluded.archetype,
                        default_actions = excluded.default_actions,
                        stats = excluded.stats,
                        abilities = excluded.abilities,
                        loot_table = excluded.loot_table,
                        metadata = excluded.metadata,
                        updated_at = excluded.updated_at`,
        );

        const now = Date.now();
        for (const npc of NPC_SEEDS) {
                statement.run(
                        npc.id,
                        npc.slug,
                        npc.name,
                        npc.role,
                        npc.alignment,
                        npc.disposition,
                        npc.description,
                        npc.baseHealth,
                        npc.baseArmorClass,
                        npc.challengeRating,
                        npc.archetype,
                        JSON.stringify(npc.defaultActions),
                        JSON.stringify(npc.stats),
                        JSON.stringify(npc.abilities),
                        JSON.stringify(npc.lootTable),
                        JSON.stringify(npc.metadata ?? {}),
                        now,
                        now,
                );
        }
}

function main() {
        const databasePath = resolveDatabasePath();
        if (!fs.existsSync(databasePath)) {
                throw new Error(`Database not found at ${databasePath}`);
        }

        const db = new Database(databasePath);
        const transaction = db.transaction(() => {
                seedMaps(db);
                seedTiles(db);
                seedNpcs(db);
        });
        transaction();

        console.log(`Seeded maps and NPCs into ${databasePath}`);
}

main();
