CREATE TABLE `learning_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`event_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`unit` text,
	`kind` text,
	`answer` text,
	`first_answer` text,
	`correct` integer,
	`confidence` integer,
	`attempt_number` integer,
	`replay_count` integer DEFAULT 0 NOT NULL,
	`skill_tags_json` text DEFAULT '[]' NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`local_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `learning_events_user_created_idx` ON `learning_events` (`user_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `learning_events_entity_idx` ON `learning_events` (`user_key`,`entity_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `learning_schema_meta` (
	`schema_key` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `question_fsrs_states` (
	`user_key` text NOT NULL,
	`question_id` text NOT NULL,
	`card_json` text NOT NULL,
	`last_rating` integer,
	`review_count` integer DEFAULT 0 NOT NULL,
	`next_review_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `question_id`)
);
--> statement-breakpoint
CREATE INDEX `question_fsrs_due_idx` ON `question_fsrs_states` (`user_key`,`next_review_at`);