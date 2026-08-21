CREATE TABLE `game_battle_results` (
	`user_key` text NOT NULL,
	`battle_id` text NOT NULL,
	`mode` text NOT NULL,
	`encounter_id` text NOT NULL,
	`outcome` text NOT NULL,
	`grade` text NOT NULL,
	`gold` integer DEFAULT 0 NOT NULL,
	`reward_json` text DEFAULT '{}' NOT NULL,
	`local_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `battle_id`)
);
--> statement-breakpoint
CREATE INDEX `game_battle_results_user_created_idx` ON `game_battle_results` (`user_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `game_equipment` (
	`user_key` text NOT NULL,
	`slot` text NOT NULL,
	`item_id` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `slot`)
);
--> statement-breakpoint
CREATE TABLE `game_inventory` (
	`user_key` text NOT NULL,
	`item_id` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `item_id`)
);
--> statement-breakpoint
CREATE TABLE `game_profiles` (
	`user_key` text PRIMARY KEY NOT NULL,
	`coins` integer DEFAULT 80 NOT NULL,
	`mastery_marks` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_unlocks` (
	`user_key` text NOT NULL,
	`unlock_id` text NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`unlocked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `unlock_id`)
);
