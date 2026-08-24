ALTER TABLE `academic_years` MODIFY COLUMN `status` enum('draft','active','notes_closed','proclaimed','archived') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `enrollments` MODIFY COLUMN `status` enum('pending','active','suspended','closed','transferred','withdrawn','excluded','deceased') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `second_session_candidates` MODIFY COLUMN `status` enum('eligible','registered','exempt','ineligible','absent','completed','withdrawn') NOT NULL DEFAULT 'eligible';--> statement-breakpoint
ALTER TABLE `academic_years` ADD `secondSessionRequired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `deliberationEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `allowIndividualDeliberation` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `notesClosedAt` timestamp;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `proclaimedAt` timestamp;--> statement-breakpoint
ALTER TABLE `academic_years` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `deliberation_decisions` ADD `requiresDeliberation` boolean DEFAULT false NOT NULL;