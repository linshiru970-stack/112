PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_story_profiles` (
	`user_key` text PRIMARY KEY NOT NULL,
	`selected_route` text DEFAULT 'formal' NOT NULL,
	`content_difficulty` text DEFAULT 'standard' NOT NULL,
	`target_unit` text DEFAULT 'U01' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_story_profiles`("user_key", "selected_route", "content_difficulty", "target_unit", "created_at", "updated_at") SELECT "user_key", "selected_route", "content_difficulty", "target_unit", "created_at", "updated_at" FROM `story_profiles`;--> statement-breakpoint
DROP TABLE `story_profiles`;--> statement-breakpoint
ALTER TABLE `__new_story_profiles` RENAME TO `story_profiles`;--> statement-breakpoint
UPDATE `story_profiles` SET `target_unit` = 'U01', `updated_at` = CURRENT_TIMESTAMP WHERE `target_unit` = 'U03';--> statement-breakpoint
PRAGMA foreign_keys=ON;
