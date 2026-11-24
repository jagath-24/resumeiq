CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`resumeId` int NOT NULL,
	`jobDescriptionId` int NOT NULL,
	`overallScore` int NOT NULL,
	`atsScore` int NOT NULL,
	`keywordMatchPercent` int NOT NULL,
	`result` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_descriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_descriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fileName` varchar(255) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`extractedText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resumes_id` PRIMARY KEY(`id`)
);
