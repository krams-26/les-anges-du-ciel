CREATE TABLE `academic_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`label` varchar(80) NOT NULL,
	`kind` enum('period','exam','semester','annual') NOT NULL,
	`sequence` int NOT NULL,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_periods_year_code_unique` UNIQUE(`academicYearId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceSessionId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`status` enum('present','absent','late','excused') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_record_unique` UNIQUE(`attendanceSessionId`,`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teachingAssignmentId` int NOT NULL,
	`sessionDate` timestamp NOT NULL,
	`status` enum('draft','submitted') NOT NULL DEFAULT 'draft',
	`submittedByUserId` int,
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_session_unique` UNIQUE(`teachingAssignmentId`,`sessionDate`)
);
--> statement-breakpoint
CREATE TABLE `evaluation_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`sequence` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluation_criteria_id` PRIMARY KEY(`id`),
	CONSTRAINT `evaluation_criteria_year_label_unique` UNIQUE(`academicYearId`,`label`)
);
--> statement-breakpoint
CREATE TABLE `grade_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gradeId` int NOT NULL,
	`previousScore` int NOT NULL,
	`nextScore` int NOT NULL,
	`reason` text NOT NULL,
	`changedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grade_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teachingAssignmentId` int NOT NULL,
	`academicPeriodId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`score` int NOT NULL,
	`maximum` int NOT NULL,
	`status` enum('draft','submitted','validated','corrected') NOT NULL DEFAULT 'draft',
	`enteredByUserId` int,
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `grades_assignment_period_enrollment_unique` UNIQUE(`teachingAssignmentId`,`academicPeriodId`,`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `student_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teachingAssignmentId` int NOT NULL,
	`academicPeriodId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`criterionId` int NOT NULL,
	`level` enum('TB','B','M','INSUFFICIENT') NOT NULL,
	`observation` text,
	`enteredByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_evaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_evaluation_unique` UNIQUE(`teachingAssignmentId`,`academicPeriodId`,`enrollmentId`,`criterionId`)
);
--> statement-breakpoint
CREATE TABLE `teacher_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teachingAssignmentId` int NOT NULL,
	`academicPeriodId` int NOT NULL,
	`courseDelivery` text,
	`plannedProgram` text,
	`completedProgram` text,
	`progressPercentage` int,
	`difficulties` text,
	`classParticipation` enum('TB','B','M','INSUFFICIENT'),
	`generalNotes` text,
	`additionalComments` text,
	`status` enum('draft','submitted','validated') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacher_reports_assignment_period_unique` UNIQUE(`teachingAssignmentId`,`academicPeriodId`)
);
--> statement-breakpoint
CREATE INDEX `academic_periods_year_index` ON `academic_periods` (`academicYearId`);--> statement-breakpoint
CREATE INDEX `attendance_record_enrollment_index` ON `attendance_records` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `attendance_session_assignment_index` ON `attendance_sessions` (`teachingAssignmentId`);--> statement-breakpoint
CREATE INDEX `grade_audits_grade_index` ON `grade_audits` (`gradeId`);--> statement-breakpoint
CREATE INDEX `grades_period_index` ON `grades` (`academicPeriodId`);--> statement-breakpoint
CREATE INDEX `grades_enrollment_index` ON `grades` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `student_evaluations_enrollment_index` ON `student_evaluations` (`enrollmentId`);