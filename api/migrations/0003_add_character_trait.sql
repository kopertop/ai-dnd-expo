-- Add trait column to characters table
-- This field stores character traits used for avatar colors and other character-specific data
ALTER TABLE `characters` ADD COLUMN `trait` text;

