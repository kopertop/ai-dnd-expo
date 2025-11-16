import { execSync } from 'node:child_process';

const sqlEscape = (value: string) => value.replace(/'/g, "''");

const now = Date.now();

const maps = [
        {
                id: 'map-town-square',
                name: 'Town Square',
                description: 'Cozy plaza with a central fountain and vendor stalls.',
                width: 24,
                height: 18,
                terrain: Array.from({ length: 18 }, () => Array.from({ length: 24 }, () => ({ terrain: 'cobblestone' }))),
                fog: Array.from({ length: 18 }, () => Array.from({ length: 24 }, () => false)),
        },
        {
                id: 'map-dungeon-entrance',
                name: 'Dungeon Entrance',
                description: 'Narrow hallways lit by torches that lead into the depths.',
                width: 20,
                height: 20,
                terrain: Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => ({ terrain: 'stone' }))),
                fog: Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => true)),
        },
];

const npcs = [
        {
                id: 'npc-guard',
                name: 'City Guard',
                alignment: 'friendly',
                description: 'Veteran soldier sworn to keep the peace.',
                maxHealth: 16,
                armorClass: 16,
                attack: 'Spear +4 (1d8+2)',
                color: '#2E86AB',
        },
        {
                id: 'npc-merchant',
                name: 'Traveling Merchant',
                alignment: 'vendor',
                description: 'Trades wares from every corner of the realm.',
                maxHealth: 12,
                armorClass: 12,
                attack: 'Dagger +2 (1d4+1)',
                color: '#C47F00',
        },
        {
                id: 'npc-goblin',
                name: 'Goblin Scout',
                alignment: 'hostile',
                description: 'Sneaky creature that loves unfair fights.',
                maxHealth: 7,
                armorClass: 13,
                attack: 'Scimitar +4 (1d6+2)',
                color: '#3A9D23',
        },
];

const commands: string[] = [];

for (const map of maps) {
        const terrainJson = sqlEscape(JSON.stringify(map.terrain));
        const fogJson = sqlEscape(JSON.stringify(map.fog));
        const description = map.description ? `'${sqlEscape(map.description)}'` : 'NULL';
        commands.push(`INSERT INTO maps (id, name, description, width, height, terrain, fog, metadata, created_at, updated_at)
VALUES ('${map.id}', '${sqlEscape(map.name)}', ${description}, ${map.width}, ${map.height}, '${terrainJson}', '${fogJson}', NULL, ${now}, ${now})
ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, width=excluded.width, height=excluded.height, terrain=excluded.terrain, fog=excluded.fog, updated_at=${now}`);
}

for (const npc of npcs) {
        const statsJson = sqlEscape(JSON.stringify({ maxHealth: npc.maxHealth, armorClass: npc.armorClass }));
        const abilitiesJson = sqlEscape(JSON.stringify({ attack: npc.attack }));
        const metadataJson = sqlEscape(JSON.stringify({ color: npc.color }));
        commands.push(`INSERT INTO npcs (id, name, alignment, description, stats, abilities, icon, color, metadata, created_at, updated_at)
VALUES ('${npc.id}', '${sqlEscape(npc.name)}', '${npc.alignment}', '${sqlEscape(npc.description ?? '')}', '${statsJson}', '${abilitiesJson}', NULL, ${npc.color ? `'${sqlEscape(npc.color)}'` : 'NULL'}, '${metadataJson}', ${now}, ${now})
ON CONFLICT(id) DO UPDATE SET name=excluded.name, alignment=excluded.alignment, description=excluded.description, stats=excluded.stats, abilities=excluded.abilities, color=excluded.color, metadata=excluded.metadata, updated_at=${now}`);
}

if (!commands.length) {
        console.log('No seed commands to run.');
        process.exit(0);
}

const databaseName = process.env.D1_DATABASE_NAME || 'DATABASE';
const wranglerBinary = process.env.WRANGLER_BINARY || 'npx wrangler';

const sqlPayload = commands.join(';\n');

console.log(`Seeding ${maps.length} maps and ${npcs.length} NPC archetypes into ${databaseName}...`);

try {
        execSync(`${wranglerBinary} d1 execute ${databaseName} --command "${sqlPayload}"`, {
                stdio: 'inherit',
        });
        console.log('Seed complete.');
} catch (error) {
        console.error('Failed to seed data. Ensure wrangler is installed and configured.');
        throw error;
}
