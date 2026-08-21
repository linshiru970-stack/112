CREATE TABLE `custom_practice_sets` (
	`user_key` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`question_ids_json` text DEFAULT '[]' NOT NULL,
	`filters_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `id`)
);
--> statement-breakpoint
CREATE INDEX `custom_practice_sets_user_updated_idx` ON `custom_practice_sets` (`user_key`,`updated_at`);--> statement-breakpoint
CREATE TABLE `learning_backup_imports` (
	`user_key` text NOT NULL,
	`id` text NOT NULL,
	`format_version` integer NOT NULL,
	`restored_tables` integer DEFAULT 0 NOT NULL,
	`restored_rows` integer DEFAULT 0 NOT NULL,
	`summary_json` text DEFAULT '{}' NOT NULL,
	`imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `id`)
);
--> statement-breakpoint
CREATE INDEX `learning_backup_imports_user_date_idx` ON `learning_backup_imports` (`user_key`,`imported_at`);--> statement-breakpoint
CREATE TABLE `learning_bookmarks` (
	`user_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`unit` text,
	`title` text DEFAULT '' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `item_type`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `learning_bookmarks_user_updated_idx` ON `learning_bookmarks` (`user_key`,`updated_at`);--> statement-breakpoint
CREATE INDEX `learning_bookmarks_user_unit_idx` ON `learning_bookmarks` (`user_key`,`unit`,`item_type`);--> statement-breakpoint
CREATE TABLE `learning_notes` (
	`user_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`unit` text,
	`title` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `item_type`, `item_id`)
);
--> statement-breakpoint
CREATE INDEX `learning_notes_user_updated_idx` ON `learning_notes` (`user_key`,`updated_at`);--> statement-breakpoint
CREATE INDEX `learning_notes_user_unit_idx` ON `learning_notes` (`user_key`,`unit`,`item_type`);--> statement-breakpoint
CREATE TABLE `learning_tool_preferences` (
	`user_key` text PRIMARY KEY NOT NULL,
	`speech_accent` text DEFAULT 'en-US' NOT NULL,
	`speech_rate` real DEFAULT 0.9 NOT NULL,
	`report_period` text DEFAULT 'week' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
