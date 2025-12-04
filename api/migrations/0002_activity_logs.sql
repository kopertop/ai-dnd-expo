-- Activity logs table for tracking game events
CREATE TABLE IF NOT EXISTS `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`invite_code` text NOT NULL,
	`type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`description` text NOT NULL,
	`actor_id` text,
	`actor_name` text,
	`data` text, -- JSON
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS `activity_logs_game_id_idx` ON `activity_logs` (`game_id`);
CREATE INDEX IF NOT EXISTS `activity_logs_invite_code_idx` ON `activity_logs` (`invite_code`);
CREATE INDEX IF NOT EXISTS `activity_logs_timestamp_idx` ON `activity_logs` (`timestamp`);
CREATE INDEX IF NOT EXISTS `activity_logs_type_idx` ON `activity_logs` (`type`);

