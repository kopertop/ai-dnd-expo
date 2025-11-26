-- Add status_effects column to characters table
-- Status effects are stored as a JSON array of strings

ALTER TABLE `characters` ADD COLUMN `status_effects` text DEFAULT '[]' NOT NULL;

