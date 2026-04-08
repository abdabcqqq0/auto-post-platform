DROP TABLE `articles`;--> statement-breakpoint
DROP TABLE `chat_messages`;--> statement-breakpoint
DROP TABLE `logs`;--> statement-breakpoint
DROP TABLE `prompt_templates`;--> statement-breakpoint
DROP TABLE `prompt_versions`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
DROP TABLE `titles`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_username_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `passwordHash`;