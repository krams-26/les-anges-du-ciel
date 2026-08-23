CREATE TABLE `deliberation_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliberationDecisionId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`previousState` text,
	`nextState` text,
	`reason` text,
	`actorUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliberation_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliberation_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliberationSessionId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`decision` enum('pending','admitted','referred','repeat','withdrawn') NOT NULL DEFAULT 'pending',
	`basis` enum('first_session','second_session','manual') NOT NULL DEFAULT 'first_session',
	`finalAverage` int,
	`rationale` text,
	`status` enum('draft','proposed','validated') NOT NULL DEFAULT 'draft',
	`proposedByUserId` int,
	`proposedAt` timestamp,
	`validatedByUserId` int,
	`validatedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliberation_decisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliberation_decision_unique` UNIQUE(`deliberationSessionId`,`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `deliberation_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`status` enum('draft','open','closed','published') NOT NULL DEFAULT 'draft',
	`openedAt` timestamp,
	`closedAt` timestamp,
	`publishedAt` timestamp,
	`createdByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliberation_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliberation_year_label_unique` UNIQUE(`academicYearId`,`label`)
);
--> statement-breakpoint
CREATE TABLE `second_session_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`classCourseId` int NOT NULL,
	`score` int NOT NULL,
	`maximum` int NOT NULL,
	`status` enum('draft','submitted','validated','corrected') NOT NULL DEFAULT 'draft',
	`enteredByUserId` int,
	`submittedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `second_session_assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `second_session_assessment_unique` UNIQUE(`candidateId`,`classCourseId`)
);
--> statement-breakpoint
CREATE TABLE `second_session_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`secondSessionSettingId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`status` enum('eligible','registered','exempt','ineligible','withdrawn') NOT NULL DEFAULT 'eligible',
	`calculatedAverage` int,
	`eligibilityReason` text,
	`decidedByUserId` int,
	`decidedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `second_session_candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `second_session_candidate_unique` UNIQUE(`secondSessionSettingId`,`enrollmentId`)
);
--> statement-breakpoint
CREATE TABLE `second_session_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`academicYearId` int NOT NULL,
	`eligibilityMode` enum('below_average','unvalidated','manual') NOT NULL DEFAULT 'below_average',
	`thresholdPercent` int NOT NULL DEFAULT 50,
	`registrationDeadline` timestamp,
	`examStartsAt` timestamp,
	`examEndsAt` timestamp,
	`status` enum('draft','open','closed','archived') NOT NULL DEFAULT 'draft',
	`createdByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `second_session_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `second_session_year_unique` UNIQUE(`academicYearId`)
);
--> statement-breakpoint
CREATE INDEX `deliberation_audits_decision_index` ON `deliberation_audits` (`deliberationDecisionId`);--> statement-breakpoint
CREATE INDEX `deliberation_decisions_enrollment_index` ON `deliberation_decisions` (`enrollmentId`);--> statement-breakpoint
CREATE INDEX `deliberation_year_index` ON `deliberation_sessions` (`academicYearId`);--> statement-breakpoint
CREATE INDEX `second_session_assessments_candidate_index` ON `second_session_assessments` (`candidateId`);--> statement-breakpoint
CREATE INDEX `second_session_candidates_enrollment_index` ON `second_session_candidates` (`enrollmentId`);