PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`brand_id` text,
	`sku` text NOT NULL,
	`barcode` text,
	`cost_price` real DEFAULT 0 NOT NULL,
	`selling_price` real DEFAULT 0 NOT NULL,
	`wholesale_price` real DEFAULT 0,
	`promo_price` real,
	`promo_start_at` text,
	`promo_end_at` text,
	`is_taxable` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`is_returnable` integer DEFAULT 1 NOT NULL,
	`expiry_date` text,
	`manufacturing_date` text,
	`best_before_date` text,
	`category_id` text,
	`supplier_id` text,
	`store_id` text,
	`deleted_at` text,
	`version` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "remote_id", "tenant_id", "name", "description", "brand_id", "sku", "barcode", "cost_price", "selling_price", "wholesale_price", "promo_price", "promo_start_at", "promo_end_at", "is_taxable", "is_active", "is_returnable", "expiry_date", "manufacturing_date", "best_before_date", "category_id", "supplier_id", "store_id", "deleted_at", "version", "sync_status", "sync_error", "created_at", "updated_at", "last_synced_at") SELECT "id", "remote_id", "tenant_id", "name", "description", "brand_id", "sku", "barcode", "cost_price", "selling_price", "wholesale_price", "promo_price", "promo_start_at", "promo_end_at", "is_taxable", "is_active", "is_returnable", "expiry_date", "manufacturing_date", "best_before_date", "category_id", "supplier_id", "store_id", "deleted_at", "version", "sync_status", "sync_error", "created_at", "updated_at", "last_synced_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `products_remote_id_unique` ON `products` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_sku_idx` ON `products` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_barcode_idx` ON `products` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `products_store_idx` ON `products` (`store_id`);--> statement-breakpoint
CREATE INDEX `products_tenant_active_idx` ON `products` (`tenant_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `products_expiry_idx` ON `products` (`expiry_date`);--> statement-breakpoint
CREATE INDEX `products_deleted_idx` ON `products` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `products_sku_idx` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_barcode_idx` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_tenant_created_idx` ON `products` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);