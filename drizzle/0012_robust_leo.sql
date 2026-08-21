CREATE TABLE `journey_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`local_date` text NOT NULL,
	`formal_unit` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_step` text DEFAULT 'practice' NOT NULL,
	`step_started_at` text NOT NULL,
	`queue_json` text DEFAULT '[]' NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`battle_state_json` text DEFAULT '{}' NOT NULL,
	`companion_id` text DEFAULT 'rinka' NOT NULL,
	`companion_line` text DEFAULT '' NOT NULL,
	`repair_plan_json` text DEFAULT '{}' NOT NULL,
	`summary_json` text DEFAULT '{}' NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `journey_sessions_user_status_idx` ON `journey_sessions` (`user_key`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `journey_sessions_user_date_idx` ON `journey_sessions` (`user_key`,`local_date`,`updated_at`);