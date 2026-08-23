CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`module` varchar(80) NOT NULL,
	`resourceType` varchar(80),
	`resourceId` int,
	`beforeState` text,
	`afterState` text,
	`reason` text,
	`outcome` enum('success','failure') NOT NULL DEFAULT 'success',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollment_financial_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`expectedAmount` int NOT NULL DEFAULT 0,
	`paidAmount` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'CDF',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollment_financial_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_account_enrollment_unique` UNIQUE(`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `guardian_communication_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianId` int NOT NULL,
	`appNotifications` boolean NOT NULL DEFAULT true,
	`sms` boolean NOT NULL DEFAULT true,
	`whatsapp` boolean NOT NULL DEFAULT false,
	`email` boolean NOT NULL DEFAULT false,
	`results` boolean NOT NULL DEFAULT true,
	`attendance` boolean NOT NULL DEFAULT true,
	`finance` boolean NOT NULL DEFAULT true,
	`general` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardian_communication_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_preferences_guardian_unique` UNIQUE(`guardianId`)
);
--> statement-breakpoint
CREATE TABLE `guardian_user_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`linkedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `guardian_user_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_user_unique` UNIQUE(`guardianId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `student_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'CDF',
	`reference` varchar(80) NOT NULL,
	`status` enum('pending','verified','cancelled','failed') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`recordedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_payment_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('school','results','finance','attendance','communication','administration') NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`resourceType` varchar(80),
	`resourceId` int,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','parent') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `audit_events_actor_index` ON `audit_events` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `audit_events_module_index` ON `audit_events` (`module`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guardian_user_user_index` ON `guardian_user_links` (`userId`);--> statement-breakpoint
CREATE INDEX `student_payments_enrollment_index` ON `student_payments` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_index` ON `user_notifications` (`userId`,`readAt`);