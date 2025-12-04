-- Seed initial maps
INSERT INTO `maps` (
	id, slug, name, description, width, height, default_terrain, fog_of_war, terrain_layers, metadata, generator_preset, seed, theme, biome, is_generated, created_at, updated_at
)
VALUES
	(
		'map_town_square',
		'town_square',
		'Town Square',
		'Central marketplace with merchant stalls and a fountain.',
		24,
		24,
		'{"type":"cobblestone","elevation":0}',
		'{"enabled":false}',
		'[{"type":"structures","items":["fountain","stalls","statue"]}]',
		'{"biome":"urban","tags":["safe","trade"]}',
		'static',
		'static',
		'neutral',
		'temperate',
		false,
		CAST(unixepoch('subsecond') * 1000 AS INTEGER),
		CAST(unixepoch('subsecond') * 1000 AS INTEGER)
	),
	(
		'map_dungeon_antechamber',
		'dungeon_antechamber',
		'Dungeon Antechamber',
		'Torch-lit stone room that leads into the depths of a forgotten dungeon.',
		24,
		24,
		'{"type":"stone","elevation":0}',
		'{"enabled":true}',
		'[{"type":"features","items":["doorways","pillars"]}]',
		'{"biome":"underground","tags":["danger","combat"]}',
		'static',
		'static',
		'neutral',
		'temperate',
		false,
		CAST(unixepoch('subsecond') * 1000 AS INTEGER),
		CAST(unixepoch('subsecond') * 1000 AS INTEGER)
	)
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
	updated_at = excluded.updated_at;

