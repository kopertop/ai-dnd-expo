-- Add icon columns to characters and npcs to support vector icons or image URLs
ALTER TABLE characters ADD COLUMN icon TEXT;
ALTER TABLE npcs ADD COLUMN icon TEXT;

