CREATE TABLE `map_tiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`terrain` text NOT NULL,
	`elevation` integer,
	`is_blocked` integer DEFAULT false NOT NULL,
	`has_fog` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `map_tiles_map_id_idx` ON `map_tiles` (`map_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `map_tiles_coordinate_unique` ON `map_tiles` (`map_id`,`x`,`y`);--> statement-breakpoint
CREATE TABLE `map_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`map_id` text,
	`token_type` text NOT NULL,
	`reference_id` text,
	`label` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`elevation` integer,
	`color` text,
	`icon` text,
	`metadata` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `map_tokens_game_idx` ON `map_tokens` (`game_id`);--> statement-breakpoint
CREATE INDEX `map_tokens_map_idx` ON `map_tokens` (`map_id`);--> statement-breakpoint
CREATE INDEX `map_tokens_reference_idx` ON `map_tokens` (`reference_id`);--> statement-breakpoint
CREATE TABLE `maps` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`grid_size` integer DEFAULT 5 NOT NULL,
	`terrain` text NOT NULL,
	`fog` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maps_slug_unique` ON `maps` (`slug`);--> statement-breakpoint
CREATE TABLE `npcs` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`alignment` text,
	`description` text,
	`stats` text NOT NULL,
	`abilities` text,
	`max_health` integer NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `npcs_slug_unique` ON `npcs` (`slug`);--> statement-breakpoint
CREATE INDEX `npcs_role_idx` ON `npcs` (`role`);--> statement-breakpoint
ALTER TABLE `game_states` ADD `active_map_id` text REFERENCES maps(id);--> statement-breakpoint
ALTER TABLE `game_states` ADD `map_state` text;