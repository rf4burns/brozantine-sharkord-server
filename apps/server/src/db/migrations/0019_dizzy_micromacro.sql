ALTER TABLE `roles` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` ADD `hoist` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `roles_position_idx` ON `roles` (`position`);--> statement-breakpoint
ALTER TABLE `users` ADD `server_muted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `server_deafened` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE roles SET position = id;--> statement-breakpoint
UPDATE roles SET position = 0 WHERE is_default = 1;--> statement-breakpoint
UPDATE roles SET position = (SELECT MAX(id) FROM roles) + 1 WHERE id = 1;--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'MUTE_MEMBERS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'DEAFEN_MEMBERS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'MENTION_EVERYONE', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'CHANGE_NICKNAME', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'MANAGE_NICKNAMES', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'EMBED_LINKS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT id, 'CHANGE_NICKNAME', unixepoch() FROM roles WHERE is_default = 1;--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT id, 'EMBED_LINKS', unixepoch() FROM roles WHERE is_default = 1;
