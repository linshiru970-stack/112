CREATE TABLE `practice_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`question_id` text NOT NULL,
	`unit` text NOT NULL,
	`kind` text NOT NULL,
	`answer` text NOT NULL,
	`correct` integer NOT NULL,
	`confidence` integer NOT NULL,
	`local_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress_profiles` (
	`user_key` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`last_activity_date` text,
	`streak_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `question_states` (
	`user_key` text NOT NULL,
	`question_id` text NOT NULL,
	`unit` text NOT NULL,
	`kind` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`wrong_count` integer DEFAULT 0 NOT NULL,
	`last_answer` text,
	`last_correct` integer,
	`confidence` integer,
	`interval_days` real DEFAULT 1 NOT NULL,
	`next_review_at` text NOT NULL,
	`last_answered_at` text NOT NULL,
	`latest_output` text,
	PRIMARY KEY(`user_key`, `question_id`)
);
