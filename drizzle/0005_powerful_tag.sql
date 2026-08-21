CREATE TABLE `answer_receipts` (
	`user_key` text NOT NULL,
	`request_id` text NOT NULL,
	`question_id` text NOT NULL,
	`response_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_key`, `request_id`)
);
--> statement-breakpoint
CREATE INDEX `answer_receipts_question_idx` ON `answer_receipts` (`user_key`,`question_id`,`created_at`);