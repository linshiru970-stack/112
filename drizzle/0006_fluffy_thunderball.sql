CREATE TABLE `question_fingerprint_evidence` (
	`user_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`question_id` text NOT NULL,
	`family` text NOT NULL,
	`skill_tags_json` text DEFAULT '[]' NOT NULL,
	`first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `fingerprint`)
);
--> statement-breakpoint
CREATE INDEX `question_fingerprint_question_idx` ON `question_fingerprint_evidence` (`user_key`,`question_id`);