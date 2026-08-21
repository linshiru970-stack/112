CREATE TABLE `interface_preferences` (
	`user_key` text PRIMARY KEY NOT NULL,
	`interface_mode` text DEFAULT 'simple' NOT NULL,
	`font_scale` text DEFAULT 'standard' NOT NULL,
	`motion_mode` text DEFAULT 'standard' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
