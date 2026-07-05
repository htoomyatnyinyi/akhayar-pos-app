CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`username` text NOT NULL,
	`email` text,
	`name` text NOT NULL,
	`role` text DEFAULT 'CASHIER' NOT NULL,
	`permissions` text DEFAULT '[]',
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_remote_id_unique` ON `staff` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_tenant_username_idx` ON `staff` (`tenant_id`,`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_tenant_email_idx` ON `staff` (`tenant_id`,`email`);--> statement-breakpoint
CREATE INDEX `staff_store_idx` ON `staff` (`store_id`);--> statement-breakpoint
CREATE INDEX `staff_role_idx` ON `staff` (`role`);--> statement-breakpoint
CREATE INDEX `staff_active_idx` ON `staff` (`is_active`);--> statement-breakpoint
CREATE INDEX `staff_tenant_idx` ON `staff` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`phone` text,
	`email` text,
	`address` text,
	`tax_number` text,
	`payment_terms` integer,
	`credit_limit` real,
	`current_balance` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_remote_id_unique` ON `suppliers` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_tenant_code_idx` ON `suppliers` (`tenant_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_tenant_phone_idx` ON `suppliers` (`tenant_id`,`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_tenant_email_idx` ON `suppliers` (`tenant_id`,`email`);--> statement-breakpoint
CREATE INDEX `suppliers_store_idx` ON `suppliers` (`store_id`);--> statement-breakpoint
CREATE INDEX `suppliers_name_idx` ON `suppliers` (`name`);--> statement-breakpoint
CREATE INDEX `suppliers_active_idx` ON `suppliers` (`is_active`);--> statement-breakpoint
CREATE INDEX `suppliers_tenant_idx` ON `suppliers` (`tenant_id`);