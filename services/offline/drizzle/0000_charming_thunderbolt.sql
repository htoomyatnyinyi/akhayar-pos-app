CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text,
	`store_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`parent_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_remote_id_unique` ON `categories` (`remote_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`date_of_birth` text,
	`gender` text,
	`loyalty_points` integer DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`total_orders` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'BRONZE' NOT NULL,
	`tier_valid_until` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_remote_id_unique` ON `customers` (`remote_id`);--> statement-breakpoint
CREATE TABLE `generic_records` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`entity` text NOT NULL,
	`data` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`sub_total` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text,
	`store_id` text,
	`user_id` text NOT NULL,
	`customer_id` text,
	`session_id` text,
	`order_number` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`payment_status` text DEFAULT 'PENDING' NOT NULL,
	`payment_method` text NOT NULL,
	`sub_total` real NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`grand_total` real NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`change_amount` real DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_remote_id_unique` ON `orders` (`remote_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text,
	`store_id` text,
	`sku` text NOT NULL,
	`barcode` text,
	`name` text NOT NULL,
	`description` text,
	`brand` text,
	`category_id` text,
	`category_name` text,
	`supplier_id` text,
	`cost_price` real DEFAULT 0 NOT NULL,
	`selling_price` real DEFAULT 0 NOT NULL,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`deleted_at` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_sku_idx` ON `products` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_barcode_idx` ON `products` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text,
	`store_id` text,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`opened_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`closed_at` text,
	`opening_balance` real DEFAULT 0 NOT NULL,
	`closing_balance` real,
	`expected_balance` real,
	`discrepancy` real,
	`cash_sales` real DEFAULT 0 NOT NULL,
	`card_sales` real DEFAULT 0 NOT NULL,
	`digital_sales` real DEFAULT 0 NOT NULL,
	`notes` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_remote_id_unique` ON `sessions` (`remote_id`);--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`tax_number` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_remote_id_unique` ON `stores` (`remote_id`);--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`endpoint` text NOT NULL,
	`method` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`entity` text PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_pulled_at` text,
	`last_pushed_at` text,
	`last_error` text
);
