-- Create uploaded_images table
CREATE TABLE IF NOT EXISTS `uploaded_images` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`r2_key` text NOT NULL,
	`public_url` text NOT NULL,
	`title` text,
	`description` text,
	`image_type` text NOT NULL, -- 'npc', 'character', or 'both'
	`is_public` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `uploaded_images_user_id_idx` ON `uploaded_images` (`user_id`);
CREATE INDEX IF NOT EXISTS `uploaded_images_created_at_idx` ON `uploaded_images` (`created_at`);
