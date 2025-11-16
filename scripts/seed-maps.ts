import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(PROJECT_ROOT, 'api');
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');

const readWranglerDbName = () => {
        const override = process.env.D1_DATABASE_NAME;
        if (override) return override;
        const wranglerPath = path.join(API_DIR, 'wrangler.toml');
        if (!fs.existsSync(wranglerPath)) {
                return 'ai-dnd-db';
        }
        const contents = fs.readFileSync(wranglerPath, 'utf-8');
        const match = contents.match(/database_name\s*=\s*"([^"]+)"/);
        return match?.[1] ?? 'ai-dnd-db';
};

const sqlString = (value: string | number | null | undefined) => {
        if (value === null || value === undefined) {
                return 'NULL';
        }
        if (typeof value === 'number') {
                return value.toString();
        }
        return `'${value.replace(/'/g, "''")}'`;
};

const mapSeeds = [
        {
                id: 'map_town_square',
                slug: 'town-square',
                name: 'Town Square',
                description: 'Bustling market hub with a prominent statue.',
                width: 20,
                height: 20,
                gridSize: 5,
                terrain: JSON.stringify({ theme: 'urban', surface: 'cobblestone' }),
                fog: JSON.stringify({ enabled: false }),
                metadata: JSON.stringify({ biome: 'settlement', difficulty: 'easy' }),
                tiles: [
                        { x: 10, y: 10, terrain: 'plaza', elevation: 0, isBlocked: false },
                        { x: 11, y: 10, terrain: 'plaza', elevation: 0, isBlocked: false },
                        { x: 10, y: 11, terrain: 'market', elevation: 0, isBlocked: false },
                        { x: 12, y: 12, terrain: 'fountain', elevation: 0, isBlocked: true },
                ],
        },
        {
                id: 'map_dungeon_depths',
                slug: 'dungeon-depths',
                name: 'Forgotten Dungeon',
                description: 'Narrow corridors and torch-lit chambers.',
                width: 16,
                height: 16,
                gridSize: 5,
                terrain: JSON.stringify({ theme: 'dungeon', surface: 'stone' }),
                fog: JSON.stringify({ enabled: true }),
                metadata: JSON.stringify({ biome: 'underground', difficulty: 'medium' }),
                tiles: [
                        { x: 2, y: 2, terrain: 'corridor', elevation: 0, isBlocked: false },
                        { x: 3, y: 2, terrain: 'corridor', elevation: 0, isBlocked: false },
                        { x: 4, y: 4, terrain: 'chamber', elevation: -1, isBlocked: false },
                        { x: 5, y: 5, terrain: 'pit', elevation: -3, isBlocked: true },
                ],
        },
];

const npcSeeds = [
        {
                id: 'npc_guard_captain',
                slug: 'guard-captain',
                name: 'Captain Armin',
                role: 'friendly',
                alignment: 'LG',
                description: 'Veteran city watch commander.',
                stats: JSON.stringify({ STR: 14, DEX: 12, CON: 13, INT: 10, WIS: 11, CHA: 12 }),
                abilities: JSON.stringify(['Leadership', 'Shield Wall']),
                maxHealth: 32,
                metadata: JSON.stringify({ archetype: 'guard' }),
        },
        {
                id: 'npc_traveling_merchant',
                slug: 'traveling-merchant',
                name: 'Mira the Wanderer',
                role: 'vendor',
                alignment: 'NG',
                description: 'Sells rare curios and tales.',
                stats: JSON.stringify({ STR: 8, DEX: 12, CON: 10, INT: 14, WIS: 13, CHA: 15 }),
                abilities: JSON.stringify(['Silver Tongue']),
                maxHealth: 18,
                metadata: JSON.stringify({ archetype: 'merchant' }),
        },
        {
                id: 'npc_goblin_raider',
                slug: 'goblin-raider',
                name: 'Goblin Raider',
                role: 'hostile',
                alignment: 'CE',
                description: 'Quick and dangerous ambusher.',
                stats: JSON.stringify({ STR: 8, DEX: 14, CON: 10, INT: 8, WIS: 8, CHA: 6 }),
                abilities: JSON.stringify(['Sneak Attack']),
                maxHealth: 12,
                metadata: JSON.stringify({ archetype: 'goblin' }),
        },
];

const statements: string[] = ['PRAGMA foreign_keys = ON;'];

for (const map of mapSeeds) {
        statements.push(
                `INSERT INTO maps (id, slug, name, description, width, height, grid_size, terrain, fog, metadata, created_at, updated_at)` +
                        ` VALUES (${sqlString(map.id)}, ${sqlString(map.slug)}, ${sqlString(map.name)}, ${sqlString(map.description)}, ${map.width}, ${map.height}, ${map.gridSize}, ${sqlString(map.terrain)}, ${sqlString(map.fog)}, ${sqlString(map.metadata)}, strftime('%s','now')*1000, strftime('%s','now')*1000)` +
                        ` ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, description=excluded.description, width=excluded.width, height=excluded.height, grid_size=excluded.grid_size, terrain=excluded.terrain, fog=excluded.fog, metadata=excluded.metadata, updated_at=excluded.updated_at;`,
        );
        statements.push(`DELETE FROM map_tiles WHERE map_id = ${sqlString(map.id)};`);
        for (const tile of map.tiles) {
                        statements.push(
                                `INSERT INTO map_tiles (map_id, x, y, terrain, elevation, is_blocked, has_fog)` +
                                        ` VALUES (${sqlString(map.id)}, ${tile.x}, ${tile.y}, ${sqlString(tile.terrain)}, ${tile.elevation ?? 0}, ${tile.isBlocked ? 1 : 0}, ${tile.hasFog ? 1 : 0});`,
                        );
        }
}

for (const npc of npcSeeds) {
        statements.push(
                `INSERT INTO npcs (id, slug, name, role, alignment, description, stats, abilities, max_health, metadata, created_at, updated_at)` +
                        ` VALUES (${sqlString(npc.id)}, ${sqlString(npc.slug)}, ${sqlString(npc.name)}, ${sqlString(npc.role)}, ${sqlString(npc.alignment)}, ${sqlString(npc.description)}, ${sqlString(npc.stats)}, ${sqlString(npc.abilities)}, ${npc.maxHealth}, ${sqlString(npc.metadata)}, strftime('%s','now')*1000, strftime('%s','now')*1000)` +
                        ` ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, role=excluded.role, alignment=excluded.alignment, description=excluded.description, stats=excluded.stats, abilities=excluded.abilities, max_health=excluded.max_health, metadata=excluded.metadata, updated_at=excluded.updated_at;`,
        );
}

fs.mkdirSync(TMP_DIR, { recursive: true });
const sqlPath = path.join(TMP_DIR, 'seed-maps.sql');
fs.writeFileSync(sqlPath, statements.join('\n'));
console.log(`Seed SQL written to ${sqlPath}`);

const shouldExecute = process.argv.includes('--execute');
const dbName = readWranglerDbName();

if (shouldExecute) {
        const result = spawnSync('npx', ['wrangler', 'd1', 'execute', dbName, '--local', '--file', sqlPath], {
                cwd: API_DIR,
                stdio: 'inherit',
        });
        if (result.status !== 0) {
                console.error('Failed to seed database');
                process.exit(result.status ?? 1);
        }
        console.log('Seed data applied to database.');
} else {
        console.log('Dry-run complete. Re-run with "--execute" to apply seeds via wrangler.');
}
