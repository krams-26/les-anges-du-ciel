ALTER TABLE `teachers` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_user_unique` UNIQUE(`userId`);