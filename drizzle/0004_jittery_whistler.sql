CREATE TABLE `companion_interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`companion_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`choice_id` text NOT NULL,
	`player_line` text NOT NULL,
	`reply` text NOT NULL,
	`affinity_delta` integer DEFAULT 0 NOT NULL,
	`local_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `companion_interactions_user_created_idx` ON `companion_interactions` (`user_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `companion_interactions_choice_idx` ON `companion_interactions` (`user_key`,`companion_id`,`topic_id`,`choice_id`);--> statement-breakpoint
CREATE TABLE `companion_states` (
	`user_key` text NOT NULL,
	`companion_id` text NOT NULL,
	`affinity` integer DEFAULT 0 NOT NULL,
	`selected` integer DEFAULT 0 NOT NULL,
	`last_interaction_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `companion_id`)
);
--> statement-breakpoint
CREATE INDEX `companion_states_selected_idx` ON `companion_states` (`user_key`,`selected`);