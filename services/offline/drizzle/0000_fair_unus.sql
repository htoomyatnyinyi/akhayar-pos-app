CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`secret` text NOT NULL,
	`permissions` text DEFAULT '[]',
	`last_used_at` text,
	`expires_at` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_remote_id_unique` ON `api_keys` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_idx` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `api_keys_tenant_idx` ON `api_keys` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `api_keys_active_idx` ON `api_keys` (`is_active`);--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`old_data` text,
	`new_data` text,
	`changes` text,
	`ip_address` text,
	`user_agent` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_remote_id_unique` ON `audit_logs` (`remote_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_tenant_idx` ON `audit_logs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_remote_id_unique` ON `brands` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brands_tenant_name_idx` ON `brands` (`tenant_id`,`name`);--> statement-breakpoint
CREATE INDEX `brands_active_idx` ON `brands` (`is_active`);--> statement-breakpoint
CREATE INDEX `brands_tenant_idx` ON `brands` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `cash_registers` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'CLOSED' NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_registers_remote_id_unique` ON `cash_registers` (`remote_id`);--> statement-breakpoint
CREATE INDEX `cash_registers_store_idx` ON `cash_registers` (`store_id`);--> statement-breakpoint
CREATE INDEX `cash_registers_status_idx` ON `cash_registers` (`status`);--> statement-breakpoint
CREATE INDEX `cash_registers_tenant_idx` ON `cash_registers` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`name` text NOT NULL,
	`description` text,
	`slug` text,
	`parent_id` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_remote_id_unique` ON `categories` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_tenant_name_idx` ON `categories` (`tenant_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_tenant_slug_idx` ON `categories` (`tenant_id`,`slug`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `categories_active_idx` ON `categories` (`is_active`);--> statement-breakpoint
CREATE INDEX `categories_store_idx` ON `categories` (`store_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`date_of_birth` text,
	`gender` text,
	`debt_amount` real DEFAULT 0 NOT NULL,
	`loyalty_points` integer DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`total_orders` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'BRONZE' NOT NULL,
	`tier_valid_until` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_remote_id_unique` ON `customers` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_tenant_code_idx` ON `customers` (`tenant_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_tenant_phone_idx` ON `customers` (`tenant_id`,`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_tenant_email_idx` ON `customers` (`tenant_id`,`email`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `customers_active_idx` ON `customers` (`is_active`);--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_categories_remote_id_unique` ON `expense_categories` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `expense_categories_tenant_name_idx` ON `expense_categories` (`tenant_id`,`name`);--> statement-breakpoint
CREATE INDEX `expense_categories_active_idx` ON `expense_categories` (`is_active`);--> statement-breakpoint
CREATE INDEX `expense_categories_tenant_idx` ON `expense_categories` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`category_id` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`receipt_url` text,
	`expense_date` text NOT NULL,
	`created_by_id` text NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_remote_id_unique` ON `expenses` (`remote_id`);--> statement-breakpoint
CREATE INDEX `expenses_tenant_idx` ON `expenses` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `expenses_store_idx` ON `expenses` (`store_id`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`expense_date`);--> statement-breakpoint
CREATE TABLE `generic_records` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`entity` text NOT NULL,
	`data` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE INDEX `generic_entity_idx` ON `generic_records` (`entity`);--> statement-breakpoint
CREATE INDEX `generic_active_idx` ON `generic_records` (`is_active`);--> statement-breakpoint
CREATE TABLE `gift_card_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`gift_card_id` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`reference_id` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_card_transactions_remote_id_unique` ON `gift_card_transactions` (`remote_id`);--> statement-breakpoint
CREATE INDEX `gift_card_transactions_gift_card_idx` ON `gift_card_transactions` (`gift_card_id`);--> statement-breakpoint
CREATE INDEX `gift_card_transactions_tenant_idx` ON `gift_card_transactions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `gift_card_transactions_created_idx` ON `gift_card_transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `gift_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`customer_id` text,
	`card_number` text NOT NULL,
	`pin_code` text,
	`initial_amount` real NOT NULL,
	`current_balance` real NOT NULL,
	`expires_at` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_cards_remote_id_unique` ON `gift_cards` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_cards_card_number_unique` ON `gift_cards` (`card_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_cards_card_number_idx` ON `gift_cards` (`card_number`);--> statement-breakpoint
CREATE INDEX `gift_cards_customer_idx` ON `gift_cards` (`customer_id`);--> statement-breakpoint
CREATE INDEX `gift_cards_status_idx` ON `gift_cards` (`status`);--> statement-breakpoint
CREATE INDEX `gift_cards_tenant_idx` ON `gift_cards` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `gift_cards_expiry_idx` ON `gift_cards` (`expires_at`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`reserved_qty` integer DEFAULT 0 NOT NULL,
	`reorder_point` integer DEFAULT 10 NOT NULL,
	`reorder_qty` integer DEFAULT 0 NOT NULL,
	`shelf_location` text,
	`version` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_remote_id_unique` ON `inventory` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `store_product_variant_idx` ON `inventory` (`store_id`,`product_id`,`variant_id`);--> statement-breakpoint
CREATE INDEX `inventory_store_quantity_idx` ON `inventory` (`store_id`,`quantity`);--> statement-breakpoint
CREATE INDEX `inventory_product_store_idx` ON `inventory` (`product_id`,`store_id`);--> statement-breakpoint
CREATE INDEX `inventory_reorder_idx` ON `inventory` (`reorder_point`,`quantity`);--> statement-breakpoint
CREATE INDEX `inventory_quantity_idx` ON `inventory` (`quantity`);--> statement-breakpoint
CREATE INDEX `inventory_tenant_idx` ON `inventory` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `inventory_count_items` (
	`id` text PRIMARY KEY NOT NULL,
	`count_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`system_quantity` integer NOT NULL,
	`counted_quantity` integer NOT NULL,
	`difference` integer NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`count_id`) REFERENCES `inventory_counts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `count_items_count_idx` ON `inventory_count_items` (`count_id`);--> statement-breakpoint
CREATE INDEX `count_items_product_idx` ON `inventory_count_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `inventory_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`scheduled_date` text,
	`completed_at` text,
	`notes` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_counts_remote_id_unique` ON `inventory_counts` (`remote_id`);--> statement-breakpoint
CREATE INDEX `counts_store_idx` ON `inventory_counts` (`store_id`);--> statement-breakpoint
CREATE INDEX `counts_status_idx` ON `inventory_counts` (`status`);--> statement-breakpoint
CREATE INDEX `counts_scheduled_idx` ON `inventory_counts` (`scheduled_date`);--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`store_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`type` text NOT NULL,
	`reference_id` text NOT NULL,
	`reference_type` text NOT NULL,
	`reason` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_movements_remote_id_unique` ON `inventory_movements` (`remote_id`);--> statement-breakpoint
CREATE INDEX `movements_product_idx` ON `inventory_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `movements_store_idx` ON `inventory_movements` (`store_id`);--> statement-breakpoint
CREATE INDEX `movements_type_idx` ON `inventory_movements` (`type`);--> statement-breakpoint
CREATE INDEX `movements_reference_idx` ON `inventory_movements` (`reference_id`,`reference_type`);--> statement-breakpoint
CREATE INDEX `movements_created_at_idx` ON `inventory_movements` (`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT 0 NOT NULL,
	`read_at` text,
	`metadata` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_remote_id_unique` ON `notifications` (`remote_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_type_idx` ON `notifications` (`type`);--> statement-breakpoint
CREATE INDEX `notifications_tenant_idx` ON `notifications` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `notifications_created_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`product_name` text,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`sub_total` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_product_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `order_items_variant_idx` ON `order_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`register_id` text,
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
	`payment_breakdown` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_remote_id_unique` ON `orders` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_tenant_order_idx` ON `orders` (`tenant_id`,`order_number`);--> statement-breakpoint
CREATE INDEX `orders_store_idx` ON `orders` (`store_id`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_session_idx` ON `orders` (`session_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_payment_status_idx` ON `orders` (`payment_status`);--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`old_price` real NOT NULL,
	`new_price` real NOT NULL,
	`changed_by` text,
	`reason` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_history_remote_id_unique` ON `price_history` (`remote_id`);--> statement-breakpoint
CREATE INDEX `price_history_product_idx` ON `price_history` (`product_id`);--> statement-breakpoint
CREATE INDEX `price_history_variant_idx` ON `price_history` (`variant_id`);--> statement-breakpoint
CREATE INDEX `price_history_tenant_idx` ON `price_history` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `price_history_created_idx` ON `price_history` (`created_at`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`name` text NOT NULL,
	`product_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`price` real NOT NULL,
	`cost_price` real NOT NULL,
	`color` text,
	`size` text,
	`weight` real,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_remote_id_unique` ON `product_variants` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_tenant_sku_idx` ON `product_variants` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_tenant_barcode_idx` ON `product_variants` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `variant_product_name_idx` ON `product_variants` (`product_id`,`name`);--> statement-breakpoint
CREATE INDEX `variant_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `variant_active_idx` ON `product_variants` (`is_active`);--> statement-breakpoint
CREATE INDEX `variant_tenant_idx` ON `product_variants` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `variant_tenant_created_idx` ON `product_variants` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`name` text NOT NULL,
	`description` text,
	`brand` text,
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
	`category_id` text NOT NULL,
	`supplier_id` text,
	`deleted_at` text,
	`version` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_remote_id_unique` ON `products` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_sku_idx` ON `products` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_tenant_barcode_idx` ON `products` (`tenant_id`,`barcode`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_tenant_active_idx` ON `products` (`tenant_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `products_expiry_idx` ON `products` (`expiry_date`);--> statement-breakpoint
CREATE INDEX `products_deleted_idx` ON `products` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `products_sku_idx` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_barcode_idx` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_tenant_created_idx` ON `products` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `products_brand_id_idx` ON `products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `products_store_idx` ON `products` (`store_id`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`discount_type` text NOT NULL,
	`discount_value` real NOT NULL,
	`min_purchase` real,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`usage_limit` integer,
	`per_user_limit` integer,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_remote_id_unique` ON `promotions` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_tenant_code_idx` ON `promotions` (`tenant_id`,`code`);--> statement-breakpoint
CREATE INDEX `promotions_active_idx` ON `promotions` (`is_active`);--> statement-breakpoint
CREATE INDEX `promotions_date_range_idx` ON `promotions` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `promotions_tenant_idx` ON `promotions` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`po_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`unit_cost` real NOT NULL,
	`total_cost` real NOT NULL,
	`received_quantity` integer DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_items_remote_id_unique` ON `purchase_order_items` (`remote_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_po_idx` ON `purchase_order_items` (`po_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_product_idx` ON `purchase_order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_tenant_idx` ON `purchase_order_items` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`po_number` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`order_date` text NOT NULL,
	`expected_date` text,
	`received_date` text,
	`sub_total` real NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`grand_total` real NOT NULL,
	`created_by_id` text NOT NULL,
	`notes` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_remote_id_unique` ON `purchase_orders` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_tenant_po_idx` ON `purchase_orders` (`tenant_id`,`po_number`);--> statement-breakpoint
CREATE INDEX `purchase_orders_supplier_idx` ON `purchase_orders` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_status_idx` ON `purchase_orders` (`status`);--> statement-breakpoint
CREATE INDEX `purchase_orders_tenant_idx` ON `purchase_orders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_order_date_idx` ON `purchase_orders` (`order_date`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`register_id` text,
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
CREATE INDEX `sessions_store_idx` ON `sessions` (`store_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_opened_idx` ON `sessions` (`opened_at`);--> statement-breakpoint
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
CREATE TABLE `stock_transfer_items` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`transfer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`received_quantity` integer,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfer_items_remote_id_unique` ON `stock_transfer_items` (`remote_id`);--> statement-breakpoint
CREATE INDEX `stock_transfer_items_transfer_idx` ON `stock_transfer_items` (`transfer_id`);--> statement-breakpoint
CREATE INDEX `stock_transfer_items_product_idx` ON `stock_transfer_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_transfer_items_tenant_idx` ON `stock_transfer_items` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`transfer_number` text NOT NULL,
	`from_store_id` text NOT NULL,
	`to_store_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`requested_by_id` text NOT NULL,
	`approved_by_id` text,
	`requested_at` text NOT NULL,
	`completed_at` text,
	`notes` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfers_remote_id_unique` ON `stock_transfers` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfers_tenant_transfer_idx` ON `stock_transfers` (`tenant_id`,`transfer_number`);--> statement-breakpoint
CREATE INDEX `stock_transfers_from_store_idx` ON `stock_transfers` (`from_store_id`);--> statement-breakpoint
CREATE INDEX `stock_transfers_to_store_idx` ON `stock_transfers` (`to_store_id`);--> statement-breakpoint
CREATE INDEX `stock_transfers_status_idx` ON `stock_transfers` (`status`);--> statement-breakpoint
CREATE INDEX `stock_transfers_tenant_idx` ON `stock_transfers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `stock_transfers_requested_at_idx` ON `stock_transfers` (`requested_at`);--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`tax_number` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_remote_id_unique` ON `stores` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stores_tenant_code_idx` ON `stores` (`tenant_id`,`code`);--> statement-breakpoint
CREATE INDEX `stores_name_idx` ON `stores` (`name`);--> statement-breakpoint
CREATE INDEX `stores_active_idx` ON `stores` (`is_active`);--> statement-breakpoint
CREATE TABLE `supplier_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`amount` real NOT NULL,
	`payment_method` text NOT NULL,
	`reference_number` text,
	`note` text,
	`paid_at` text NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_payments_remote_id_unique` ON `supplier_payments` (`remote_id`);--> statement-breakpoint
CREATE INDEX `supplier_payments_supplier_idx` ON `supplier_payments` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `supplier_payments_tenant_idx` ON `supplier_payments` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `supplier_payments_paid_at_idx` ON `supplier_payments` (`paid_at`);--> statement-breakpoint
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
CREATE INDEX `suppliers_tenant_idx` ON `suppliers` (`tenant_id`);--> statement-breakpoint
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
CREATE INDEX `outbox_entity_idx` ON `sync_outbox` (`entity`);--> statement-breakpoint
CREATE INDEX `outbox_status_idx` ON `sync_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `outbox_next_attempt_idx` ON `sync_outbox` (`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`entity` text PRIMARY KEY NOT NULL,
	`cursor` text,
	`last_pulled_at` text,
	`last_pushed_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `sync_state_entity_idx` ON `sync_state` (`entity`);--> statement-breakpoint
CREATE TABLE `tax_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`rate` real NOT NULL,
	`is_compound` integer DEFAULT 0 NOT NULL,
	`applies_to` text DEFAULT '[]',
	`valid_from` text NOT NULL,
	`valid_to` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_rates_remote_id_unique` ON `tax_rates` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tax_rates_tenant_name_idx` ON `tax_rates` (`tenant_id`,`name`);--> statement-breakpoint
CREATE INDEX `tax_rates_active_idx` ON `tax_rates` (`is_active`);--> statement-breakpoint
CREATE INDEX `tax_rates_tenant_idx` ON `tax_rates` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `tenant_store_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`setting_key` text NOT NULL,
	`setting_value` text NOT NULL,
	`description` text,
	`updated_by_id` text NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_store_settings_remote_id_unique` ON `tenant_store_settings` (`remote_id`);--> statement-breakpoint
CREATE INDEX `tenant_store_settings_key_idx` ON `tenant_store_settings` (`setting_key`);--> statement-breakpoint
CREATE INDEX `tenant_store_settings_tenant_idx` ON `tenant_store_settings` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `tenant_store_settings_store_idx` ON `tenant_store_settings` (`store_id`);--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	`reference_id` text,
	`description` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_transactions_remote_id_unique` ON `wallet_transactions` (`remote_id`);--> statement-breakpoint
CREATE INDEX `wallet_transactions_wallet_idx` ON `wallet_transactions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `wallet_transactions_tenant_idx` ON `wallet_transactions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `wallet_transactions_created_idx` ON `wallet_transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_remote_id_unique` ON `wallets` (`remote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_customer_id_unique` ON `wallets` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `wallets_customer_idx` ON `wallets` (`customer_id`);--> statement-breakpoint
CREATE INDEX `wallets_tenant_idx` ON `wallets` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`remote_id` text,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`events` text NOT NULL,
	`secret` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_triggered_at` text,
	`last_error` text,
	`sync_status` text DEFAULT 'synced' NOT NULL,
	`sync_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_synced_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhooks_remote_id_unique` ON `webhooks` (`remote_id`);--> statement-breakpoint
CREATE INDEX `webhooks_tenant_idx` ON `webhooks` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `webhooks_active_idx` ON `webhooks` (`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `webhooks_tenant_name_idx` ON `webhooks` (`tenant_id`,`name`);