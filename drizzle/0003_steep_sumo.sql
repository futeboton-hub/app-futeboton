CREATE TABLE `registered_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`sportName` varchar(150) NOT NULL,
	`email` varchar(320) NOT NULL,
	`municipality` varchar(255) NOT NULL,
	`birthDate` varchar(10) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`emailVerified` int NOT NULL DEFAULT 0,
	`verificationCode` varchar(10),
	`verificationExpiry` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registered_players_id` PRIMARY KEY(`id`),
	CONSTRAINT `registered_players_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tournamentId` int NOT NULL,
	`registeredPlayerId` int NOT NULL,
	`club` varchar(255) NOT NULL,
	`status` enum('pending_payment','confirmed','waitlist','called_from_waitlist','withdrawn_refund','withdrawn_no_refund','cancelled') NOT NULL DEFAULT 'pending_payment',
	`waitlistPosition` int,
	`paymentProof` text,
	`paymentConfirmedAt` timestamp,
	`calledFromWaitlistAt` timestamp,
	`paymentDeadline` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`maxPlayers` int NOT NULL DEFAULT 64,
	`entryFee` int NOT NULL DEFAULT 0,
	`pixKey` varchar(255),
	`pixHolderName` varchar(255),
	`registrationOpen` int NOT NULL DEFAULT 1,
	`registrationDeadline` timestamp,
	`refundDeadline` timestamp,
	`noRefundDeadline` timestamp,
	`eventDate` timestamp,
	`status` enum('draft','registration','in_progress','finished') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `knockout_matches` MODIFY COLUMN `phase` enum('round_of_16','quarter_finals','semi_finals','third_place','final') NOT NULL;--> statement-breakpoint
ALTER TABLE `knockout_matches` MODIFY COLUMN `decisionMethod` enum('normal','penalties') DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `group_matches` ADD `tournamentId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `knockout_matches` ADD `tournamentId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `knockout_matches` ADD `series` enum('A','B','C','D') NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `tournamentId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `registeredPlayerId` int;--> statement-breakpoint
ALTER TABLE `players` ADD `sportName` varchar(150);--> statement-breakpoint
ALTER TABLE `knockout_matches` DROP COLUMN `homeExtraTime`;--> statement-breakpoint
ALTER TABLE `knockout_matches` DROP COLUMN `awayExtraTime`;