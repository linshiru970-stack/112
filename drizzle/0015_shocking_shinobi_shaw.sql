CREATE TABLE `formal_question_evidence` (
	`user_key` text NOT NULL,
	`question_id` text NOT NULL,
	`unit` text NOT NULL,
	`first_formal_at` text NOT NULL,
	`last_formal_at` text NOT NULL,
	PRIMARY KEY(`user_key`, `question_id`)
);
--> statement-breakpoint
CREATE INDEX `formal_question_evidence_user_unit_idx` ON `formal_question_evidence` (`user_key`,`unit`,`last_formal_at`);