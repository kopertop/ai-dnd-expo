-- Auth tables for expo-auth-template
-- This migration creates the users and device_tokens tables required by expo-auth-template

-- Users table (matches expo-auth-template requirements)
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text UNIQUE NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`is_admin` integer DEFAULT 0,
	`organization_id` text,
	`created_at` integer,
	`updated_at` integer
);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

-- Device tokens for persistent authentication (matches expo-auth-template requirements)
CREATE TABLE IF NOT EXISTS `device_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`device_token` text UNIQUE NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text,
	`device_platform` text,
	`user_agent` text,
	`ip_address` text,
	`last_used_at` text,
	`expires_at` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `device_tokens_user_id_idx` ON `device_tokens` (`user_id`);
CREATE INDEX IF NOT EXISTS `device_tokens_last_used_idx` ON `device_tokens` (`last_used_at`);

