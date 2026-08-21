CREATE TABLE `mock_exam_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`unit` text NOT NULL,
	`source_label` text NOT NULL,
	`completed_questions` integer NOT NULL,
	`listening_correct` integer,
	`reading_correct` integer,
	`duration_minutes` integer,
	`interrupted` integer DEFAULT 0 NOT NULL,
	`local_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mock_exam_records_user_unit_idx` ON `mock_exam_records` (`user_key`,`unit`,`created_at`);--> statement-breakpoint
CREATE TABLE `skill_fsrs_states` (
	`user_key` text NOT NULL,
	`skill_tag` text NOT NULL,
	`card_json` text NOT NULL,
	`last_rating` integer,
	`review_count` integer DEFAULT 0 NOT NULL,
	`distinct_question_count` integer DEFAULT 0 NOT NULL,
	`successful_unseen_count` integer DEFAULT 0 NOT NULL,
	`last_question_id` text,
	`next_review_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `skill_tag`)
);
--> statement-breakpoint
CREATE INDEX `skill_fsrs_due_idx` ON `skill_fsrs_states` (`user_key`,`next_review_at`);