CREATE TABLE `apiaries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`notes` text,
	`created_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`hive_id` text NOT NULL,
	`item` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`added_at` text NOT NULL,
	`removed_at` text,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hives` (
	`id` text PRIMARY KEY NOT NULL,
	`apiary_id` text NOT NULL,
	`label` text NOT NULL,
	`hive_type` text NOT NULL,
	`status` text DEFAULT 'healthy' NOT NULL,
	`map_lat` real,
	`map_lng` real,
	`color_tag` text,
	`notes` text,
	`created_at` text NOT NULL,
	`archived_at` text,
	FOREIGN KEY (`apiary_id`) REFERENCES `apiaries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inspection_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`inspection_id` text NOT NULL,
	`file_path` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`hive_id` text NOT NULL,
	`inspected_at` text NOT NULL,
	`queen_seen` integer NOT NULL,
	`eggs_seen` integer NOT NULL,
	`larvae_condition` integer,
	`brood_pattern` integer,
	`honey_stores` integer,
	`pollen_stores` integer,
	`varroa_count` integer,
	`varroa_method` text,
	`temperament` integer,
	`weather_snapshot` text,
	`note_text` text,
	`voice_transcript` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `queens` (
	`id` text PRIMARY KEY NOT NULL,
	`hive_id` text NOT NULL,
	`introduced_at` text NOT NULL,
	`origin` text NOT NULL,
	`mark_color` text,
	`productivity_score` integer,
	`replaced_at` text,
	`notes` text,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `schema_version` (
	`version` integer PRIMARY KEY NOT NULL,
	`applied_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`hive_id` text,
	`apiary_id` text,
	`title` text NOT NULL,
	`details` text,
	`due_at` text NOT NULL,
	`done_at` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`apiary_id`) REFERENCES `apiaries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `treatments` (
	`id` text PRIMARY KEY NOT NULL,
	`hive_id` text NOT NULL,
	`product` text NOT NULL,
	`dose` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	`notes` text,
	FOREIGN KEY (`hive_id`) REFERENCES `hives`(`id`) ON UPDATE no action ON DELETE no action
);
