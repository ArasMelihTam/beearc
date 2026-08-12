CREATE TABLE `transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`from_hive_id` text NOT NULL,
	`to_hive_id` text NOT NULL,
	`item` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`transferred_at` text NOT NULL,
	`notes` text,
	`deleted_at` text,
	FOREIGN KEY (`from_hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `equipment` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `deleted_at` text;