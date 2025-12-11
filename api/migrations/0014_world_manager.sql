-- Create worlds table
CREATE TABLE IF NOT EXISTS `worlds` (
    `id` text PRIMARY KEY NOT NULL,
    `name` text NOT NULL,
    `slug` text NOT NULL,
    `description` text,
    `image_url` text,
    `is_public` integer DEFAULT 0 NOT NULL,
    `created_at` integer NOT NULL,
    `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `worlds_slug_unique` ON `worlds` (`slug`);

-- Seed default worlds (using 0 for timestamps as placeholders)
INSERT OR IGNORE INTO `worlds` (`id`, `name`, `slug`, `description`, `image_url`, `is_public`, `created_at`, `updated_at`)
VALUES
    ('world_faerun', 'Faerûn', 'faerun', 'A continent of magic, diverse cultures, and ancient ruins on the planet Toril.', NULL, 1, 0, 0),
    ('world_eberron', 'Eberron', 'eberron', 'A world of magic and machines, recovering from the Last War.', NULL, 1, 0, 0),
    ('world_underdark', 'Underdark', 'underdark', 'A vast subterranean network of caverns and tunnels beneath the surface.', NULL, 1, 0, 0);

-- Update maps table
ALTER TABLE `maps` ADD COLUMN `background_image_url` text;
ALTER TABLE `maps` ADD COLUMN `grid_columns` integer DEFAULT 0 NOT NULL;
ALTER TABLE `maps` ADD COLUMN `grid_size` integer DEFAULT 64 NOT NULL;
ALTER TABLE `maps` ADD COLUMN `grid_offset_x` integer DEFAULT 0 NOT NULL;
ALTER TABLE `maps` ADD COLUMN `grid_offset_y` integer DEFAULT 0 NOT NULL;
ALTER TABLE `maps` ADD COLUMN `world_id` text;

-- Migrate existing world data
-- Note: existing 'world' column contained the slug or name
UPDATE `maps` SET `world_id` = 'world_faerun' WHERE `world` LIKE '%faerun%';
UPDATE `maps` SET `world_id` = 'world_eberron' WHERE `world` LIKE '%eberron%';
UPDATE `maps` SET `world_id` = 'world_underdark' WHERE `world` LIKE '%underdark%';

-- Add image_url to map_tokens for custom props/minis
ALTER TABLE `map_tokens` ADD COLUMN `image_url` text;
