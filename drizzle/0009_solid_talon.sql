CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `settings` DROP INDEX `settings_key_unique`;--> statement-breakpoint
ALTER TABLE `articles` ADD `siteId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `siteId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `logs` ADD `siteId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `prompt_templates` ADD `siteId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `siteId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `titles` ADD `siteId` int DEFAULT 1 NOT NULL;