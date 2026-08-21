CREATE TABLE `story_choices` (
	`user_key` text NOT NULL,
	`unit` text NOT NULL,
	`choice_id` text NOT NULL,
	`chosen_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_key`, `unit`)
);
--> statement-breakpoint
CREATE TABLE `story_evidence_items` (
	`user_key` text NOT NULL,
	`evidence_id` text NOT NULL,
	`unit` text NOT NULL,
	`collected_at` text NOT NULL,
	PRIMARY KEY(`user_key`, `evidence_id`)
);
--> statement-breakpoint
CREATE INDEX `story_evidence_user_unit_idx` ON `story_evidence_items` (`user_key`,`unit`);--> statement-breakpoint
CREATE TABLE `story_profiles` (
	`user_key` text PRIMARY KEY NOT NULL,
	`selected_route` text DEFAULT 'formal' NOT NULL,
	`content_difficulty` text DEFAULT 'standard' NOT NULL,
	`target_unit` text DEFAULT 'U03' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `story_unit_states` (
	`user_key` text NOT NULL,
	`unit` text NOT NULL,
	`status` text DEFAULT 'explored' NOT NULL,
	`visit_count` integer DEFAULT 1 NOT NULL,
	`first_seen_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_key`, `unit`)
);
--> statement-breakpoint
CREATE INDEX `story_unit_states_user_updated_idx` ON `story_unit_states` (`user_key`,`updated_at`);