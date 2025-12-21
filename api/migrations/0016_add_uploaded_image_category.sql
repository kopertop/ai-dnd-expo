-- Add category to uploaded_images table
-- Categories: Character, Object, Map, World, Other
ALTER TABLE `uploaded_images` ADD COLUMN `category` text DEFAULT 'Other' NOT NULL;

-- Backfill category from legacy image_type values
UPDATE `uploaded_images`
SET `category` = 'Character'
WHERE `image_type` IN ('character', 'both');

UPDATE `uploaded_images`
SET `category` = 'Object'
WHERE `image_type` = 'npc';

-- Ensure all rows have a valid category value
UPDATE `uploaded_images`
SET `category` = 'Other'
WHERE `category` IS NULL OR `category` = '';

CREATE INDEX IF NOT EXISTS `uploaded_images_category_idx` ON `uploaded_images` (`category`);

