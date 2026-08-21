CREATE TABLE `channel_notification_overrides` (
	`user_id` integer NOT NULL,
	`channel_id` integer NOT NULL,
	`level` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `channel_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `channel_notification_overrides_user_idx` ON `channel_notification_overrides` (`user_id`);--> statement-breakpoint
CREATE INDEX `channel_notification_overrides_channel_idx` ON `channel_notification_overrides` (`channel_id`);