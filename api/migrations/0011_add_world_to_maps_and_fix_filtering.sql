-- Add world field to maps table (nullable for world-agnostic maps)
-- This allows maps to be explicitly associated with a world or be world-agnostic
ALTER TABLE `maps` ADD COLUMN `world` text;

-- Create index for faster world-based filtering
CREATE INDEX IF NOT EXISTS `maps_world_idx` ON `maps` (`world`);

-- Migrate existing world data from metadata to world field
-- Extract world from metadata JSON for maps that have it
UPDATE `maps`
SET `world` = json_extract(metadata, '$.world')
WHERE `world` IS NULL
	AND json_extract(metadata, '$.world') IS NOT NULL
	AND json_extract(metadata, '$.world') != '';

-- For maps with slug pattern {world}_{location}, extract world from slug
UPDATE `maps`
SET `world` = substr(slug, 1, instr(slug || '_', '_') - 1)
WHERE `world` IS NULL
	AND slug LIKE '%\_%' ESCAPE '\'
	AND substr(slug, 1, instr(slug || '_', '_') - 1) IN ('faerun', 'eberron', 'underdark');

-- Note: Maps without a world set (NULL) are considered world-agnostic
-- and can be used with any world
