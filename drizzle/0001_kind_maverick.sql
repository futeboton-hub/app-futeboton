CREATE TABLE `group_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupLetter` enum('A','B','C','D','E','F','G','H') NOT NULL,
	`round` int NOT NULL,
	`homePlayerId` int NOT NULL,
	`awayPlayerId` int NOT NULL,
	`homeScore` int,
	`awayScore` int,
	`played` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knockout_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phase` enum('round_of_16','quarter_finals','semi_finals','final') NOT NULL,
	`matchOrder` int NOT NULL,
	`homePlayerId` int,
	`awayPlayerId` int,
	`homeScore` int,
	`awayScore` int,
	`played` int NOT NULL DEFAULT 0,
	`winnerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knockout_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`municipality` varchar(255) NOT NULL,
	`club` varchar(255) NOT NULL,
	`groupLetter` enum('A','B','C','D','E','F','G','H') NOT NULL,
	`seed` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `players_id` PRIMARY KEY(`id`)
);
