CREATE TABLE `vocabulary_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`vocab_id` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vocabulary_states` (
	`user_key` text NOT NULL,
	`vocab_id` text NOT NULL,
	`unit` text NOT NULL,
	`item` text NOT NULL,
	`card_json` text NOT NULL,
	`last_rating` integer,
	`review_count` integer DEFAULT 0 NOT NULL,
	`next_review_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `vocab_id`)
);
