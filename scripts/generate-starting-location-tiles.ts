
const WORLDS = ['faerun', 'eberron', 'underdark'] as const;
const LOCATIONS = [
	'tavern',
	'cave',
	'camp',
	'palace',
	'bedroom',
	'ship',
	'marketplace',
	'temple',
	'dungeon',
	'forest',
	'tower',
	'arena',
	'library',
	'smithy',
	'trail',
	'farm',
	'graveyard',
	'portal',
] as const;

function generateTilesSQL(): string {
	const lines: string[] = [
		'-- Seed basic map tiles for all starting location maps',
		'-- These tiles provide a basic walkable area in the center of each map',
	];

	// Create a basic walkable area in the center (roughly 20x20 centered)
	const centerStartX = 4;
	const centerEndX = 23;
	const centerStartY = 4;
	const centerEndY = 23;

	// Batch size: insert tiles in chunks to avoid SQLITE_TOOBIG error
	// SQLite has a default limit of ~1MB per statement, so we use smaller batches
	const BATCH_SIZE = 200;

	for (const world of WORLDS) {
		for (const location of LOCATIONS) {
			const mapId = `map_${world}_${location}`;

			// Determine terrain type based on world
			let terrain: string;
			let fog: number;
			if (world === 'underdark') {
				terrain = 'stone';
				fog = 1;
			} else if (world === 'eberron') {
				terrain = 'stone';
				fog = 0;
			} else {
				// faerun
				terrain = 'cobblestone';
				fog = 0;
			}

			// Collect all tiles for this map
			const mapTiles: string[] = [];
			for (let y = centerStartY; y <= centerEndY; y++) {
				for (let x = centerStartX; x <= centerEndX; x++) {
					const tileId = `tile_${world}_${location}_${x}_${y}`;
					mapTiles.push(`	('${tileId}', '${mapId}', ${x}, ${y}, '${terrain}', 0, 0, ${fog}, NULL, '{}')`);
				}
			}

			// Split into batches
			for (let i = 0; i < mapTiles.length; i += BATCH_SIZE) {
				const batch = mapTiles.slice(i, i + BATCH_SIZE);
				lines.push('INSERT INTO `map_tiles` (id, map_id, x, y, terrain_type, elevation, is_blocked, has_fog, feature_type, metadata)');
				lines.push('VALUES');
				lines.push(batch.join(',\n'));
				lines.push('ON CONFLICT(id) DO UPDATE SET');
				lines.push('	terrain_type = excluded.terrain_type,');
				lines.push('	elevation = excluded.elevation,');
				lines.push('	is_blocked = excluded.is_blocked,');
				lines.push('	has_fog = excluded.has_fog,');
				lines.push('	feature_type = excluded.feature_type,');
				lines.push('	metadata = excluded.metadata;');
				lines.push(''); // Empty line between batches
			}
		}
	}

	return lines.join('\n');
}

function main() {
	console.log('Map tile generation disabled - all maps must be built from scratch using the map editor');
	console.log('This script has been disabled to prevent pre-built maps with bad data.');
	// Script disabled - migration file already deleted
	// const outputPath = path.resolve(__dirname, '../api/migrations/0010_seed_starting_location_map_tiles.sql');
	// const sql = generateTilesSQL();
	// fs.writeFileSync(outputPath, sql, 'utf-8');
	// console.log(`Generated migration file: ${outputPath}`);
}

main();
