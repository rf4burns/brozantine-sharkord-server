INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission`, `created_at`) SELECT 1, 'MOVE_MEMBERS', unixepoch() WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 1);
