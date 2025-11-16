CREATE TABLE `maps` (
        `id` text PRIMARY KEY NOT NULL,
        `name` text NOT NULL,
        `description` text,
        `width` integer NOT NULL,
        `height` integer NOT NULL,
        `terrain` text NOT NULL,
        `fog` text NOT NULL,
        `metadata` text,
        `created_at` integer NOT NULL,
        `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `map_tiles` (
        `id` text PRIMARY KEY NOT NULL,
        `map_id` text NOT NULL,
        `x` integer NOT NULL,
        `y` integer NOT NULL,
        `terrain_type` text NOT NULL,
        `elevation` integer DEFAULT 0,
        `is_obstacle` integer DEFAULT false NOT NULL,
        `has_fog` integer DEFAULT false NOT NULL,
        FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `map_tiles_map_id_idx` ON `map_tiles` (`map_id`);
--> statement-breakpoint
CREATE TABLE `npcs` (
        `id` text PRIMARY KEY NOT NULL,
        `name` text NOT NULL,
        `alignment` text NOT NULL,
        `description` text,
        `stats` text NOT NULL,
        `abilities` text NOT NULL,
        `icon` text,
        `color` text,
        `metadata` text,
        `created_at` integer NOT NULL,
        `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `map_tokens` (
        `id` text PRIMARY KEY NOT NULL,
        `map_id` text NOT NULL,
        `type` text NOT NULL,
        `entity_id` text,
        `label` text NOT NULL,
        `icon` text,
        `color` text,
        `x` integer NOT NULL,
        `y` integer NOT NULL,
        `z_index` integer DEFAULT 0 NOT NULL,
        `metadata` text,
        `created_at` integer NOT NULL,
        `updated_at` integer NOT NULL,
        FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `map_tokens_map_id_idx` ON `map_tokens` (`map_id`);
--> statement-breakpoint
CREATE INDEX `map_tokens_type_idx` ON `map_tokens` (`type`);
