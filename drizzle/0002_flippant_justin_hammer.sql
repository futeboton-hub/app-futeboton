ALTER TABLE `knockout_matches` ADD `homeExtraTime` int;--> statement-breakpoint
ALTER TABLE `knockout_matches` ADD `awayExtraTime` int;--> statement-breakpoint
ALTER TABLE `knockout_matches` ADD `homePenalties` int;--> statement-breakpoint
ALTER TABLE `knockout_matches` ADD `awayPenalties` int;--> statement-breakpoint
ALTER TABLE `knockout_matches` ADD `decisionMethod` enum('normal','extra_time','penalties') DEFAULT 'normal';