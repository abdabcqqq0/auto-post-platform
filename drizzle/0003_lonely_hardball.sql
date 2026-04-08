ALTER TABLE `articles` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `keywords` text;--> statement-breakpoint
ALTER TABLE `logs` ADD `operator` varchar(200) DEFAULT '系統' NOT NULL;