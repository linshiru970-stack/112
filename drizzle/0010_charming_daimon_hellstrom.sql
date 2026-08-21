CREATE TABLE `game_outfits` (
	`user_key` text NOT NULL,
	`companion_id` text NOT NULL,
	`outfit_id` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `companion_id`)
);
