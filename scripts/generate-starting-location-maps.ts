
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

// World-specific themes
const WORLD_THEMES = {
	faerun: { theme: 'medieval', biome: 'temperate', defaultTerrain: 'cobblestone' },
	eberron: { theme: 'industrial', biome: 'urban', defaultTerrain: 'stone' },
	underdark: { theme: 'dark', biome: 'underground', defaultTerrain: 'stone' },
} as const;

// Location-specific descriptions
const LOCATION_DESCRIPTIONS: Record<string, string> = {
	tavern: 'A bustling inn or tavern',
	cave: 'A dark, mysterious cave',
	camp: 'A wilderness encampment',
	palace: 'A royal palace or castle',
	bedroom: 'A private chamber',
	ship: 'A sea or air vessel',
	marketplace: 'A bustling bazaar',
	temple: 'A sacred place of worship',
	dungeon: 'A dangerous dungeon',
	forest: 'A mystical grove',
	tower: 'A wizard\'s tower',
	arena: 'A colosseum for combat',
	library: 'A place of knowledge',
	smithy: 'A smith\'s forge',
	trail: 'A trail between cities',
	farm: 'A rural homestead',
	graveyard: 'A crypt or cemetery',
	portal: 'A magical gate',
};

const WORLD_NAMES: Record<string, string> = {
	faerun: 'Faerûn',
	eberron: 'Eberron',
	underdark: 'Underdark',
};

const LOCATION_NAMES: Record<string, string> = {
	tavern: 'Tavern',
	cave: 'Cave',
	camp: 'Camp',
	palace: 'Palace',
	bedroom: 'Bedroom',
	ship: 'Ship',
	marketplace: 'Marketplace',
	temple: 'Temple',
	dungeon: 'Dungeon',
	forest: 'Forest',
	tower: 'Tower',
	arena: 'Arena',
	library: 'Library',
	smithy: 'Smithy',
	trail: 'Trail',
	farm: 'Farm',
	graveyard: 'Graveyard',
	portal: 'Portal',
};

function generateMapsSQL(): string {
	const lines: string[] = [
		'-- Seed starting location maps for all world × location combinations',
		'INSERT INTO `maps` (',
		'	id, slug, name, description, width, height, default_terrain, fog_of_war, terrain_layers, metadata, generator_preset, seed, theme, biome, world, is_generated, created_at, updated_at',
		')',
		'VALUES',
	];

	const mapEntries: string[] = [];

	for (const world of WORLDS) {
		for (const location of LOCATIONS) {
			const mapId = `map_${world}_${location}`;
			const slug = `${world}_${location}`;
			const desc = LOCATION_DESCRIPTIONS[location];
			const worldName = WORLD_NAMES[world];
			const locName = LOCATION_NAMES[location];
			const name = `${worldName} ${locName}`;
			const fullDesc = `${desc}, adapted for the ${worldName} setting.`;

			// Escape single quotes for SQL (double them)
			const escapedName = name.replace(/'/g, "''");
			const escapedDesc = fullDesc.replace(/'/g, "''");

			const themeData = WORLD_THEMES[world];
			let defaultTerrain = themeData.defaultTerrain;

			// Special handling for underdark - everything should be dark/cave-like
			let fogEnabled = 'false';
			if (world === 'underdark') {
				defaultTerrain = 'stone';
				fogEnabled = 'true';
			}

			mapEntries.push(`	(
		'${mapId}',
		'${slug}',
		'${escapedName}',
		'${escapedDesc}',
		28,
		28,
		'{"type":"${defaultTerrain}","elevation":0}',
		'{"enabled":${fogEnabled}}',
		'[]',
		'{"world":"${world}","location":"${location}","biome":"${themeData.biome}"}',
		'static',
		'static',
		'${themeData.theme}',
		'${themeData.biome}',
		'${world}',
		false,
		CAST(unixepoch('subsecond') * 1000 AS INTEGER),
		CAST(unixepoch('subsecond') * 1000 AS INTEGER)
	)`);
		}
	}

	lines.push(mapEntries.join(',\n'));
	lines.push('ON CONFLICT(id) DO UPDATE SET');
	lines.push('	slug = excluded.slug,');
	lines.push('	name = excluded.name,');
	lines.push('	description = excluded.description,');
	lines.push('	width = excluded.width,');
	lines.push('	height = excluded.height,');
	lines.push('	default_terrain = excluded.default_terrain,');
	lines.push('	fog_of_war = excluded.fog_of_war,');
	lines.push('	terrain_layers = excluded.terrain_layers,');
	lines.push('	metadata = excluded.metadata,');
	lines.push('	generator_preset = excluded.generator_preset,');
	lines.push('	seed = excluded.seed,');
	lines.push('	theme = excluded.theme,');
	lines.push('	biome = excluded.biome,');
	lines.push('	world = excluded.world,');
	lines.push('	is_generated = excluded.is_generated,');
	lines.push('	updated_at = excluded.updated_at;');

	return lines.join('\n');
}

function main() {
	console.log('Map generation disabled - all maps must be built from scratch using the map editor');
	console.log('This script has been disabled to prevent pre-built maps with bad data.');
	// Script disabled - migration file already deleted
	// const outputPath = path.resolve(__dirname, '../api/migrations/0009_seed_starting_location_maps.sql');
	// const sql = generateMapsSQL();
	// fs.writeFileSync(outputPath, sql, 'utf-8');
	// console.log(`Generated migration file: ${outputPath}`);
}

main();
