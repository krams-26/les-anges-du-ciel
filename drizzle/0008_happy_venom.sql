CREATE TABLE `finance_exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`sourceCurrency` varchar(8) NOT NULL DEFAULT 'USD',
	`targetCurrency` varchar(8) NOT NULL DEFAULT 'CDF',
	`cdfPerUnit` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finance_fee_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`section` varchar(80) NOT NULL,
	`expectedAmountCdf` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_fee_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_fee_schedule_year_section_unique` UNIQUE(`academicYearId`,`section`)
);
--> statement-breakpoint
ALTER TABLE `student_payments` MODIFY COLUMN `status` enum('pending','validated','rejected','cancelled','verified','failed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `student_payments` ADD `payerName` varchar(180);--> statement-breakpoint
ALTER TABLE `student_payments` ADD `sourceCurrency` varchar(8) DEFAULT 'CDF' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `sourceAmount` int;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `exchangeRateCdfPerUnit` int;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `amountBefore` int;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `amountAfter` int;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `receiptNumber` varchar(80);--> statement-breakpoint
ALTER TABLE `student_payments` ADD `validatedByUserId` int;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `validatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `rejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `student_payments` ADD `statusReason` text;--> statement-breakpoint
ALTER TABLE `student_payments` ADD CONSTRAINT `student_payment_receipt_unique` UNIQUE(`receiptNumber`);--> statement-breakpoint
CREATE INDEX `finance_exchange_rate_year_index` ON `finance_exchange_rates` (`academicYearId`);--> statement-breakpoint
CREATE INDEX `finance_fee_schedule_year_index` ON `finance_fee_schedules` (`academicYearId`);