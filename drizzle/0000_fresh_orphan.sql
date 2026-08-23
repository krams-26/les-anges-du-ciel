CREATE TABLE `academic_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`label` varchar(32) NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academic_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_years_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `class_courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classId` int NOT NULL,
	`courseId` int NOT NULL,
	`periodWeight` int NOT NULL,
	`status` enum('configured','inactive') NOT NULL DEFAULT 'configured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `class_courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_course_unique` UNIQUE(`classId`,`courseId`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`section` varchar(80) NOT NULL,
	`level` varchar(32) NOT NULL,
	`name` varchar(80) NOT NULL,
	`status` enum('draft','active','closed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `classes_year_name_unique` UNIQUE(`academicYearId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`section` varchar(80) NOT NULL,
	`levels` varchar(120) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`academicYearId` int NOT NULL,
	`classId` int,
	`enrollmentType` enum('new','re_enrollment','transfer','repeat') NOT NULL,
	`status` enum('pending','active','suspended','closed') NOT NULL DEFAULT 'pending',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollments_student_year_unique` UNIQUE(`studentId`,`academicYearId`)
);
--> statement-breakpoint
CREATE TABLE `guardians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`relationship` enum('father','mother','guardian','other') NOT NULL,
	`phone` varchar(40) NOT NULL,
	`address` text,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`receivesCommunications` boolean NOT NULL DEFAULT true,
	`canViewResults` boolean NOT NULL DEFAULT true,
	`canMakePayments` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardians_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`enrollmentId` int,
	`category` varchar(80) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentCode` varchar(32) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`postName` varchar(120),
	`firstName` varchar(120) NOT NULL,
	`sex` enum('F','M') NOT NULL,
	`birthDate` timestamp,
	`phone` varchar(40),
	`address` text,
	`photoUrl` text,
	`status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_code_unique` UNIQUE(`studentCode`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeCode` varchar(32) NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`phone` varchar(40),
	`email` varchar(320),
	`specialties` text,
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teachers_code_unique` UNIQUE(`employeeCode`)
);
--> statement-breakpoint
CREATE TABLE `teaching_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`classCourseId` int NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teaching_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `teaching_assignments_unique` UNIQUE(`teacherId`,`classCourseId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `class_courses_class_index` ON `class_courses` (`classId`);--> statement-breakpoint
CREATE INDEX `classes_year_index` ON `classes` (`academicYearId`);--> statement-breakpoint
CREATE INDEX `enrollments_class_index` ON `enrollments` (`classId`);--> statement-breakpoint
CREATE INDEX `enrollments_year_index` ON `enrollments` (`academicYearId`);--> statement-breakpoint
CREATE INDEX `guardians_student_index` ON `guardians` (`studentId`);--> statement-breakpoint
CREATE INDEX `student_documents_student_index` ON `student_documents` (`studentId`);--> statement-breakpoint
CREATE INDEX `student_documents_enrollment_index` ON `student_documents` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `students_name_index` ON `students` (`lastName`,`firstName`);--> statement-breakpoint
CREATE INDEX `teachers_name_index` ON `teachers` (`fullName`);--> statement-breakpoint
CREATE INDEX `teaching_assignments_course_index` ON `teaching_assignments` (`classCourseId`);