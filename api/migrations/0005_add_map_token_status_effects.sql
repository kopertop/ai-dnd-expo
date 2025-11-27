-- Add status_effects column to map_tokens table
-- Status effects are stored as a JSON array of strings

ALTER TABLE `map_tokens` ADD COLUMN `status_effects` text DEFAULT '[]' NOT NULL;

