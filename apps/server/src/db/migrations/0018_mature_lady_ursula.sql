PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`type` text NOT NULL,
	`details` text,
	`ip` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_activity_log`("id", "user_id", "type", "details", "ip", "created_at") SELECT "id", "user_id", "type", "details", "ip", "created_at" FROM `activity_log`;--> statement-breakpoint
DROP TABLE `activity_log`;--> statement-breakpoint
ALTER TABLE `__new_activity_log` RENAME TO `activity_log`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `activity_log_user_idx` ON `activity_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_log_type_idx` ON `activity_log` (`type`);--> statement-breakpoint
CREATE INDEX `activity_log_created_idx` ON `activity_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_user_created_idx` ON `activity_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_log_type_created_idx` ON `activity_log` (`type`,`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` text;--> statement-breakpoint
ALTER TABLE `users` ADD `pronouns` text;--> statement-breakpoint
ALTER TABLE `users` ADD `status_message` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferences` text;--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT `role_id`, 'KICK_MEMBERS', unixepoch() FROM `role_permissions` WHERE `permission` = 'MANAGE_USERS';--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT `role_id`, 'BAN_MEMBERS', unixepoch() FROM `role_permissions` WHERE `permission` = 'MANAGE_USERS';--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT `role_id`, 'DELETE_USERS', unixepoch() FROM `role_permissions` WHERE `permission` = 'MANAGE_USERS';--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT `role_id`, 'VIEW_AUDIT_LOG', unixepoch() FROM `role_permissions` WHERE `permission` = 'MANAGE_USERS';--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'KICK_MEMBERS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'BAN_MEMBERS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'DELETE_USERS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'VIEW_AUDIT_LOG', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);