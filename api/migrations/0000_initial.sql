-- Games table
CREATE TABLE IF NOT EXISTS `games` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_code` text NOT NULL,
	`host_id` text NOT NULL,
	`host_email` text,
	`quest_id` text NOT NULL,
	`quest_data` text NOT NULL,
	`world` text NOT NULL,
	`starting_area` text NOT NULL,
	`status` text NOT NULL DEFAULT 'waiting',
	`current_map_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`current_map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX IF NOT EXISTS `games_invite_code_unique` ON `games` (`invite_code`);
CREATE INDEX IF NOT EXISTS `games_host_id_idx` ON `games` (`host_id`);
CREATE INDEX IF NOT EXISTS `games_host_email_idx` ON `games` (`host_email`);
CREATE INDEX IF NOT EXISTS `games_current_map_id_idx` ON `games` (`current_map_id`);

-- Characters table
CREATE TABLE IF NOT EXISTS `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text,
	`player_email` text,
	`name` text NOT NULL,
	`level` integer NOT NULL,
	`race` text NOT NULL,
	`class` text NOT NULL,
	`description` text,
	`stats` text NOT NULL,
	`skills` text NOT NULL,
	`trait` text NOT NULL,
	`inventory` text NOT NULL,
	`equipped` text NOT NULL,
	`health` integer NOT NULL,
	`max_health` integer NOT NULL,
	`action_points` integer NOT NULL,
	`max_action_points` integer NOT NULL,
	`status_effects` text DEFAULT NULL,
	`prepared_spells` text DEFAULT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `characters_player_id_idx` ON `characters` (`player_id`);
CREATE INDEX IF NOT EXISTS `characters_player_email_idx` ON `characters` (`player_email`);

-- Game players (join table)
CREATE TABLE IF NOT EXISTS `game_players` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`player_id` text,
	`player_email` text,
	`character_id` text NOT NULL,
	`character_name` text NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `game_players_game_id_idx` ON `game_players` (`game_id`);
CREATE INDEX IF NOT EXISTS `game_players_player_id_idx` ON `game_players` (`player_id`);
CREATE INDEX IF NOT EXISTS `game_players_player_email_idx` ON `game_players` (`player_email`);

-- Game states
CREATE TABLE IF NOT EXISTS `game_states` (
	`game_id` text PRIMARY KEY NOT NULL,
	`state_data` text NOT NULL,
	`map_state` text DEFAULT '{}' NOT NULL,
	`log_entries` text DEFAULT '[]' NOT NULL,
	`state_version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Maps table
CREATE TABLE IF NOT EXISTS `maps` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`default_terrain` text NOT NULL,
	`fog_of_war` text NOT NULL,
	`terrain_layers` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`generator_preset` text DEFAULT 'static' NOT NULL,
	`seed` text DEFAULT 'static' NOT NULL,
	`theme` text DEFAULT 'neutral' NOT NULL,
	`biome` text DEFAULT 'temperate' NOT NULL,
	`is_generated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `maps_slug_unique` ON `maps` (`slug`);

-- Map tiles
CREATE TABLE IF NOT EXISTS `map_tiles` (
	`id` text PRIMARY KEY NOT NULL,
	`map_id` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`terrain_type` text NOT NULL,
	`elevation` integer DEFAULT 0 NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`has_fog` integer DEFAULT false NOT NULL,
	`feature_type` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `map_tiles_map_id_idx` ON `map_tiles` (`map_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `map_tiles_map_coordinate_unique` ON `map_tiles` (`map_id`,`x`,`y`);

-- NPCs (definitions)
CREATE TABLE IF NOT EXISTS `npcs` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`alignment` text NOT NULL,
	`disposition` text NOT NULL,
	`description` text,
	`base_health` integer NOT NULL,
	`base_armor_class` integer NOT NULL,
	`challenge_rating` real NOT NULL,
	`archetype` text NOT NULL,
	`default_actions` text NOT NULL,
	`stats` text NOT NULL,
	`abilities` text NOT NULL,
	`loot_table` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `npcs_slug_unique` ON `npcs` (`slug`);

-- Map tokens (for placing characters/NPCs on maps)
CREATE TABLE IF NOT EXISTS `map_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text,
	`map_id` text NOT NULL,
	`character_id` text,
	`npc_id` text,
	`token_type` text NOT NULL,
	`label` text,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`facing` integer DEFAULT 0 NOT NULL,
	`color` text,
	`status` text DEFAULT 'idle' NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`hit_points` integer,
	`max_hit_points` integer,
	`metadata` text DEFAULT NULL,
	'status_effects' text DEFAULT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`npc_id`) REFERENCES `npcs`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS `map_tokens_game_id_idx` ON `map_tokens` (`game_id`);
CREATE INDEX IF NOT EXISTS `map_tokens_map_id_idx` ON `map_tokens` (`map_id`);
CREATE INDEX IF NOT EXISTS `map_tokens_character_id_idx` ON `map_tokens` (`character_id`);
CREATE INDEX IF NOT EXISTS `map_tokens_npc_id_idx` ON `map_tokens` (`npc_id`);

