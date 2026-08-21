CREATE TABLE `boss_run_answers` (
	`run_id` text NOT NULL,
	`user_key` text NOT NULL,
	`question_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`correct` integer NOT NULL,
	`novel_evidence` integer NOT NULL,
	`answered_at` text NOT NULL,
	PRIMARY KEY(`run_id`, `question_id`)
);
--> statement-breakpoint
CREATE INDEX `boss_run_answers_user_run_idx` ON `boss_run_answers` (`user_key`,`run_id`,`answered_at`);--> statement-breakpoint
CREATE TABLE `boss_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`region_id` text NOT NULL,
	`end_unit` text NOT NULL,
	`question_ids_json` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `boss_runs_user_region_idx` ON `boss_runs` (`user_key`,`region_id`,`started_at`);