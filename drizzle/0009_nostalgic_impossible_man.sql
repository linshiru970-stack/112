CREATE TABLE `game_battle_item_uses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`battle_id` text NOT NULL,
	`use_id` text NOT NULL,
	`item_id` text NOT NULL,
	`turn_index` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_battle_item_uses_user_use_idx` ON `game_battle_item_uses` (`user_key`,`use_id`);--> statement-breakpoint
CREATE INDEX `game_battle_item_uses_battle_idx` ON `game_battle_item_uses` (`user_key`,`battle_id`,`turn_index`,`id`);--> statement-breakpoint
CREATE TABLE `game_battle_receipts` (
	`user_key` text NOT NULL,
	`request_id` text NOT NULL,
	`battle_id` text NOT NULL,
	`claimed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `request_id`)
);
--> statement-breakpoint
CREATE INDEX `game_battle_receipts_battle_idx` ON `game_battle_receipts` (`user_key`,`battle_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `game_daily_quests` (
	`user_key` text NOT NULL,
	`local_date` text NOT NULL,
	`quest_id` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`claimed` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `local_date`, `quest_id`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `game_daily_quests_user_claimed_idx` ON `game_daily_quests` (`user_key`,`claimed`,`updated_at`);--> statement-breakpoint
CREATE TABLE `game_quest_claim_receipts` (
	`user_key` text NOT NULL,
	`local_date` text NOT NULL,
	`quest_id` text NOT NULL,
	`claimed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `local_date`, `quest_id`)
);
