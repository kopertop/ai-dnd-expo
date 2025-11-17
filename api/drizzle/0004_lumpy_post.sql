CREATE TABLE `npc_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`npc_id` text NOT NULL,
	`token_id` text NOT NULL,
	`name` text NOT NULL,
	`disposition` text NOT NULL,
	`current_health` integer NOT NULL,
	`max_health` integer NOT NULL,
	`status_effects` text DEFAULT '[]' NOT NULL,
	`is_friendly` integer DEFAULT false NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`npc_id`) REFERENCES `npcs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`token_id`) REFERENCES `map_tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `npc_instances_game_id_idx` ON `npc_instances` (`game_id`);--> statement-breakpoint
CREATE INDEX `npc_instances_npc_id_idx` ON `npc_instances` (`npc_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `npc_instances_token_id_unique` ON `npc_instances` (`token_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_game_states` (
	`game_id` text PRIMARY KEY NOT NULL,
	`state_data` text NOT NULL,
	`map_state` text DEFAULT '{}' NOT NULL,
	`log_entries` text DEFAULT '[]' NOT NULL,
	`state_version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_game_states`("game_id", "state_data", "map_state", "log_entries", "state_version", "updated_at") SELECT "game_id", "state_data", "map_state", "log_entries", "state_version", "updated_at" FROM `game_states`;--> statement-breakpoint
DROP TABLE `game_states`;--> statement-breakpoint
ALTER TABLE `__new_game_states` RENAME TO `game_states`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_map_tiles` (
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
--> statement-breakpoint
INSERT INTO `__new_map_tiles`("id", "map_id", "x", "y", "terrain_type", "elevation", "is_blocked", "has_fog", "feature_type", "metadata") SELECT "id", "map_id", "x", "y", "terrain_type", "elevation", "is_blocked", "has_fog", NULL, "metadata" FROM `map_tiles`;--> statement-breakpoint
DROP TABLE `map_tiles`;--> statement-breakpoint
ALTER TABLE `__new_map_tiles` RENAME TO `map_tiles`;--> statement-breakpoint
CREATE INDEX `map_tiles_map_id_idx` ON `map_tiles` (`map_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `map_tiles_map_coordinate_unique` ON `map_tiles` (`map_id`,`x`,`y`);--> statement-breakpoint
CREATE TABLE `__new_map_tokens` (
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
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`npc_id`) REFERENCES `npcs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_map_tokens`("id", "game_id", "map_id", "character_id", "npc_id", "token_type", "label", "x", "y", "facing", "color", "status", "is_visible", "hit_points", "max_hit_points", "metadata", "created_at", "updated_at") SELECT "id", "game_id", "map_id", "character_id", "npc_id", "token_type", "label", "x", "y", "facing", "color", "status", "is_visible", "hit_points", "max_hit_points", "metadata", "created_at", "updated_at" FROM `map_tokens`;--> statement-breakpoint
DROP TABLE `map_tokens`;--> statement-breakpoint
ALTER TABLE `__new_map_tokens` RENAME TO `map_tokens`;--> statement-breakpoint
CREATE INDEX `map_tokens_game_id_idx` ON `map_tokens` (`game_id`);--> statement-breakpoint
CREATE INDEX `map_tokens_map_id_idx` ON `map_tokens` (`map_id`);--> statement-breakpoint
CREATE INDEX `map_tokens_character_id_idx` ON `map_tokens` (`character_id`);--> statement-breakpoint
CREATE INDEX `map_tokens_npc_id_idx` ON `map_tokens` (`npc_id`);--> statement-breakpoint
ALTER TABLE `maps` ADD `generator_preset` text DEFAULT 'static' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `seed` text DEFAULT 'static' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `theme` text DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `biome` text DEFAULT 'temperate' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `is_generated` integer DEFAULT false NOT NULL;
