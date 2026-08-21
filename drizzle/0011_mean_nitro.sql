CREATE TABLE `scenario_answers` (
	`run_id` text NOT NULL,
	`user_key` text NOT NULL,
	`node_id` text NOT NULL,
	`question_id` text NOT NULL,
	`answer_receipt_id` text NOT NULL,
	`correct` integer NOT NULL,
	`support_mode` text DEFAULT 'blade' NOT NULL,
	`listen_count` integer DEFAULT 0 NOT NULL,
	`replay_count` integer DEFAULT 0 NOT NULL,
	`consequence` text DEFAULT '' NOT NULL,
	`answered_at` text NOT NULL,
	PRIMARY KEY(`run_id`, `node_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_answers_user_receipt_idx` ON `scenario_answers` (`user_key`,`answer_receipt_id`);--> statement-breakpoint
CREATE INDEX `scenario_answers_user_node_idx` ON `scenario_answers` (`user_key`,`node_id`,`answered_at`);--> statement-breakpoint
CREATE TABLE `scenario_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`scenario_id` text NOT NULL,
	`companion_id` text NOT NULL,
	`question_ids_json` text DEFAULT '[]' NOT NULL,
	`current_index` integer DEFAULT 0 NOT NULL,
	`clues` integer DEFAULT 0 NOT NULL,
	`setbacks` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`ending` text,
	`process_result` text,
	`reward_json` text DEFAULT '{}' NOT NULL,
	`started_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `scenario_runs_user_status_idx` ON `scenario_runs` (`user_key`,`status`,`updated_at`);