CREATE TABLE `supplier` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`code` text,
	`name` text,
	`contactName` text,
	`phone` text,
	`email` text,
	`address` text,
	`taxId` text,
	`paymentTerms` text,
	`creditLimit` real,
	`currentBalance` real DEFAULT 0,
	`isActive` integer DEFAULT true,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_serverId_unique` ON `supplier` (`serverId`);