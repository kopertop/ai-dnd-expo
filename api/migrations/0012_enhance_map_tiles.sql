-- Enhance map tiles with more granular properties for tactical gameplay
-- Adds explicit movement cost, blocked vs difficult distinction, and cover mechanics

-- Add movement_cost column (REAL, default 1.0)
-- 1.0 = normal, 2.0 = difficult, 0.5 = easy/road, >= 999.0 = blocked
ALTER TABLE `map_tiles` ADD COLUMN `movement_cost` real DEFAULT 1.0 NOT NULL;

-- Add is_difficult column (INTEGER, default 0)
-- Separate from is_blocked to distinguish impassible vs difficult terrain
ALTER TABLE `map_tiles` ADD COLUMN `is_difficult` integer DEFAULT 0 NOT NULL;

-- Add provides_cover column (INTEGER, default 0)
-- Whether the tile provides cover to entities on/behind it
ALTER TABLE `map_tiles` ADD COLUMN `provides_cover` integer DEFAULT 0 NOT NULL;

-- Add cover_type column (TEXT, nullable)
-- 'half', 'three-quarters', 'full'
ALTER TABLE `map_tiles` ADD COLUMN `cover_type` text;

-- Migrate existing data
-- 1. If is_blocked = 1, set movement_cost = 999.0 (BLOCKED_COST)
UPDATE `map_tiles` SET `movement_cost` = 999.0 WHERE `is_blocked` = 1;

-- 2. Identify difficult terrain from terrain_type and set is_difficult = 1 and movement_cost = 2.0
-- Common difficult terrain types: swamp, marsh, mud, thicket, rubble, ruins
UPDATE `map_tiles`
SET `is_difficult` = 1, `movement_cost` = 2.0
WHERE `is_blocked` = 0
  AND `terrain_type` IN ('swamp', 'marsh', 'mud', 'thicket', 'rubble', 'ruins', 'forest', 'jungle');

-- 3. Identify easy terrain (roads) and set movement_cost = 0.5
UPDATE `map_tiles`
SET `movement_cost` = 0.5
WHERE `is_blocked` = 0
  AND `terrain_type` IN ('road', 'path', 'gravel', 'floor');





