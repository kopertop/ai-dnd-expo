CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`invite_code` text NOT NULL,
	`host_id` text NOT NULL,
	`host_email` text,
	`quest_id` text NOT NULL,
	`quest_data` text NOT NULL,
	`world` text NOT NULL,
	`starting_area` text NOT NULL,
	`status` text NOT NULL DEFAULT 'waiting',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_invite_code_unique` ON `games` (`invite_code`);
--> statement-breakpoint
CREATE INDEX `games_host_id_idx` ON `games` (`host_id`);
--> statement-breakpoint
CREATE INDEX `games_host_email_idx` ON `games` (`host_email`);
--> statement-breakpoint
CREATE TABLE `characters` (
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
	`inventory` text NOT NULL,
	`equipped` text NOT NULL,
	`health` integer NOT NULL,
	`max_health` integer NOT NULL,
	`action_points` integer NOT NULL,
	`max_action_points` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `characters_player_id_idx` ON `characters` (`player_id`);
--> statement-breakpoint
CREATE INDEX `characters_player_email_idx` ON `characters` (`player_email`);
--> statement-breakpoint
CREATE TABLE `game_players` (
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
--> statement-breakpoint
CREATE INDEX `game_players_game_id_idx` ON `game_players` (`game_id`);
--> statement-breakpoint
CREATE INDEX `game_players_player_id_idx` ON `game_players` (`player_id`);
--> statement-breakpoint
CREATE INDEX `game_players_player_email_idx` ON `game_players` (`player_email`);
--> statement-breakpoint
CREATE TABLE `game_states` (
	`game_id` text PRIMARY KEY NOT NULL,
	`state_data` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
