CREATE TABLE `access_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(48) NOT NULL,
	`label` varchar(120) NOT NULL,
	`description` text,
	`isSystem` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `access_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_roles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessRoleId` int NOT NULL,
	`resource` varchar(64) NOT NULL,
	`action` varchar(32) NOT NULL,
	`allowed` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permission_unique` UNIQUE(`accessRoleId`,`resource`,`action`)
);
--> statement-breakpoint
CREATE TABLE `user_permission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`resource` varchar(64) NOT NULL,
	`action` varchar(32) NOT NULL,
	`allowed` boolean NOT NULL,
	`changedByUserId` int,
	`reason` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_permission_overrides_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_permission_override_unique` UNIQUE(`userId`,`resource`,`action`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','disabled','invited','blocked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accessRoleId` int;--> statement-breakpoint
CREATE INDEX `role_permissions_role_index` ON `role_permissions` (`accessRoleId`);--> statement-breakpoint
CREATE INDEX `user_permissions_user_index` ON `user_permission_overrides` (`userId`);