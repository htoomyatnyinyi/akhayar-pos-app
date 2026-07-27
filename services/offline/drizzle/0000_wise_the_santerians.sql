CREATE TABLE `accounts` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`parent_id` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`sub_type` text,
	`description` text,
	`is_active` integer DEFAULT true,
	`is_system` integer DEFAULT false,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_server_id_unique` ON `accounts` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_accounts_tenant` ON `accounts` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_accounts_tenant_code` ON `accounts` (`tenant_id`,`code`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
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
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_server_id_unique` ON `audit_logs` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_user_created` ON `audit_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `brands` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_server_id_unique` ON `brands` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_brands_tenant` ON `brands` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_brands_tenant_name` ON `brands` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `cash_registers` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'CLOSED',
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cash_registers_server_id_unique` ON `cash_registers` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_cash_registers_store_status` ON `cash_registers` (`store_id`,`status`);--> statement-breakpoint
CREATE TABLE `categories` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`parent_id` text,
	`is_active` integer DEFAULT true,
	`sort_order` integer DEFAULT 0,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_server_id_unique` ON `categories` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_categories_tenant` ON `categories` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_categories_tenant_slug` ON `categories` (`tenant_id`,`slug`);--> statement-breakpoint
CREATE TABLE `customer_wallets` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`balance` numeric DEFAULT '0',
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_wallets_server_id_unique` ON `customer_wallets` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_wallets_customer_id_unique` ON `customer_wallets` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_wallets_tenant` ON `customer_wallets` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`date_of_birth` integer,
	`gender` text,
	`loyalty_points` integer DEFAULT 0,
	`total_spent` numeric DEFAULT '0',
	`total_orders` integer DEFAULT 0,
	`debt_amount` numeric DEFAULT '0',
	`credit_limit` numeric,
	`tier` text DEFAULT 'BRONZE',
	`tier_valid_until` integer,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_server_id_unique` ON `customers` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_customers_tenant` ON `customers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_customers_phone` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_customers_email` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_customers_tenant_code` ON `customers` (`tenant_id`,`code`);--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_categories_server_id_unique` ON `expense_categories` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_expense_categories_tenant_name` ON `expense_categories` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`category_id` text,
	`amount` numeric NOT NULL,
	`currency_code` text DEFAULT 'USD',
	`description` text,
	`receipt_url` text,
	`expense_date` integer DEFAULT CURRENT_TIMESTAMP,
	`created_by_id` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_server_id_unique` ON `expenses` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_tenant_date` ON `expenses` (`tenant_id`,`expense_date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_store` ON `expenses` (`store_id`);--> statement-breakpoint
CREATE TABLE `gift_card_transactions` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`gift_card_id` text NOT NULL,
	`amount` numeric NOT NULL,
	`type` text NOT NULL,
	`reference_id` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gift_card_id`) REFERENCES `gift_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_card_transactions_server_id_unique` ON `gift_card_transactions` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_gc_txn_card` ON `gift_card_transactions` (`gift_card_id`);--> statement-breakpoint
CREATE INDEX `idx_gc_txn_tenant` ON `gift_card_transactions` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `gift_cards` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`customer_id` text,
	`card_number` text NOT NULL,
	`pin_code` text,
	`initial_amount` numeric NOT NULL,
	`current_balance` numeric NOT NULL,
	`expires_at` integer,
	`status` text DEFAULT 'ACTIVE',
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gift_cards_server_id_unique` ON `gift_cards` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gift_cards_card_number_unique` ON `gift_cards` (`card_number`);--> statement-breakpoint
CREATE INDEX `idx_gift_cards_tenant` ON `gift_cards` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_gift_cards_status_expiry` ON `gift_cards` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`store_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`lot_id` text,
	`quantity` integer DEFAULT 0 NOT NULL,
	`reserved_qty` integer DEFAULT 0,
	`reorder_point` integer DEFAULT 10,
	`reorder_qty` integer DEFAULT 0,
	`shelf_location` text,
	`version` integer DEFAULT 0,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lot_id`) REFERENCES `lots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_server_id_unique` ON `inventory` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_store` ON `inventory` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_inventory_product` ON `inventory` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_inventory_store_product_variant_lot` ON `inventory` (`store_id`,`product_id`,`variant_id`,`lot_id`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`entry_number` text NOT NULL,
	`date` integer DEFAULT CURRENT_TIMESTAMP,
	`description` text,
	`reference` text,
	`entry_type` text DEFAULT 'MANUAL',
	`status` text DEFAULT 'DRAFT',
	`order_id` text,
	`payment_id` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_server_id_unique` ON `journal_entries` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_entry_number_unique` ON `journal_entries` (`entry_number`);--> statement-breakpoint
CREATE INDEX `idx_je_date` ON `journal_entries` (`date`);--> statement-breakpoint
CREATE INDEX `idx_je_tenant_date` ON `journal_entries` (`tenant_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_je_order` ON `journal_entries` (`order_id`);--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`journal_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` numeric NOT NULL,
	`currency_code` text DEFAULT 'USD',
	`exchange_rate` numeric DEFAULT '1',
	`side` text NOT NULL,
	`description` text,
	FOREIGN KEY (`journal_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_lines_server_id_unique` ON `journal_lines` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_journal_lines_journal` ON `journal_lines` (`journal_id`);--> statement-breakpoint
CREATE INDEX `idx_journal_lines_account` ON `journal_lines` (`account_id`);--> statement-breakpoint
CREATE TABLE `lots` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`number` text NOT NULL,
	`serial` text,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`remaining` integer NOT NULL,
	`expiry_date` integer,
	`manufacturing_date` integer,
	`best_before_date` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lots_server_id_unique` ON `lots` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_lots_expiry` ON `lots` (`expiry_date`);--> statement-breakpoint
CREATE INDEX `idx_lots_remaining` ON `lots` (`remaining`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_lots_tenant_number_product_variant` ON `lots` (`tenant_id`,`number`,`product_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`is_read` integer DEFAULT false,
	`read_at` integer,
	`metadata` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_server_id_unique` ON `notifications` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_user_read` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE INDEX `idx_notifications_created` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`unit_price` numeric NOT NULL,
	`discount_percent` numeric DEFAULT '0',
	`discount_amount` numeric DEFAULT '0',
	`tax_amount` numeric DEFAULT '0',
	`sub_total` numeric NOT NULL,
	`is_returned` integer DEFAULT false,
	`returned_quantity` integer DEFAULT 0,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_items_server_id_unique` ON `order_items` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_items_product` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`tenant_id` text NOT NULL,
	`customer_id` text,
	`user_id` text NOT NULL,
	`session_id` text,
	`store_id` text,
	`register_id` text,
	`status` text DEFAULT 'PENDING',
	`payment_status` text DEFAULT 'PENDING',
	`sub_total` numeric NOT NULL,
	`tax_amount` numeric DEFAULT '0',
	`discount_amount` numeric DEFAULT '0',
	`discount_percent` numeric DEFAULT '0',
	`grand_total` numeric NOT NULL,
	`currency_code` text DEFAULT 'USD',
	`payment_method` text DEFAULT 'CASH',
	`paid_amount` numeric DEFAULT '0',
	`change_amount` numeric DEFAULT '0',
	`notes` text,
	`void_reason` text,
	`version` integer DEFAULT 0,
	`completed_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`register_id`) REFERENCES `cash_registers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_server_id_unique` ON `orders` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `idx_orders_tenant` ON `orders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_status_created` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_store` ON `orders` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_session` ON `orders` (`session_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`amount` numeric NOT NULL,
	`currency_code` text DEFAULT 'USD',
	`method` text NOT NULL,
	`reference_number` text,
	`status` text DEFAULT 'PAID',
	`processed_by_id` text,
	`processed_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`processed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_server_id_unique` ON `payments` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_order` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_reference` ON `payments` (`reference_number`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`price` numeric NOT NULL,
	`cost_price` numeric NOT NULL,
	`color` text,
	`size` text,
	`weight` numeric,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_server_id_unique` ON `product_variants` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_variants_product` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_variants_tenant_sku` ON `product_variants` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_variants_product_name` ON `product_variants` (`product_id`,`name`);--> statement-breakpoint
CREATE TABLE `products` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sku` text,
	`barcode` text,
	`category_id` text,
	`brand_id` text,
	`supplier_id` text,
	`cost_price` numeric,
	`selling_price` numeric,
	`wholesale_price` numeric,
	`promo_price` numeric,
	`promo_start_at` integer,
	`promo_end_at` integer,
	`is_taxable` integer DEFAULT true,
	`is_active` integer DEFAULT true,
	`is_returnable` integer DEFAULT true,
	`expiry_date` integer,
	`manufacturing_date` integer,
	`best_before_date` integer,
	`version` integer DEFAULT 0,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_server_id_unique` ON `products` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_products_tenant` ON `products` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_products_barcode` ON `products` (`barcode`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_products_tenant_sku` ON `products` (`tenant_id`,`sku`);--> statement-breakpoint
CREATE TABLE `promotion_categories` (
	`promotion_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`promotion_id`, `category_id`),
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_promo_categories_category` ON `promotion_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `promotion_products` (
	`promotion_id` text NOT NULL,
	`product_id` text NOT NULL,
	PRIMARY KEY(`promotion_id`, `product_id`),
	FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_promo_products_product` ON `promotion_products` (`product_id`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`discount_type` text NOT NULL,
	`discount_value` numeric NOT NULL,
	`min_purchase` numeric,
	`min_quantity` integer,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`usage_limit` integer,
	`used_count` integer DEFAULT 0,
	`per_user_limit` integer,
	`applicable_to` text DEFAULT 'ALL_PRODUCTS',
	`priority` integer DEFAULT 0,
	`stackable` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_server_id_unique` ON `promotions` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `promotions_code_unique` ON `promotions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_promotions_tenant` ON `promotions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_promotions_code` ON `promotions` (`code`);--> statement-breakpoint
CREATE INDEX `idx_promotions_dates` ON `promotions` (`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`po_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`unit_cost` numeric NOT NULL,
	`total_cost` numeric NOT NULL,
	`received_quantity` integer DEFAULT 0,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_order_items_server_id_unique` ON `purchase_order_items` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_po_items_po_product_variant` ON `purchase_order_items` (`po_id`,`product_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`po_number` text NOT NULL,
	`tenant_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT',
	`order_date` integer DEFAULT CURRENT_TIMESTAMP,
	`expected_date` integer,
	`received_date` integer,
	`sub_total` numeric NOT NULL,
	`tax_amount` numeric DEFAULT '0',
	`grand_total` numeric NOT NULL,
	`currency_code` text DEFAULT 'USD',
	`created_by_id` text,
	`notes` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_server_id_unique` ON `purchase_orders` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_po_number_unique` ON `purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `idx_po_tenant` ON `purchase_orders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_po_supplier_status` ON `purchase_orders` (`supplier_id`,`status`);--> statement-breakpoint
CREATE TABLE `return_items` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`return_id` text NOT NULL,
	`order_item_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`refund_amount` numeric NOT NULL,
	`reason` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `return_items_server_id_unique` ON `return_items` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_return_items_return_order_item` ON `return_items` (`return_id`,`order_item_id`);--> statement-breakpoint
CREATE TABLE `returns` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`return_number` text NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` text NOT NULL,
	`customer_id` text,
	`total_amount` numeric NOT NULL,
	`refund_method` text NOT NULL,
	`refund_status` text DEFAULT 'PENDING',
	`reason` text NOT NULL,
	`approved_by_id` text,
	`approved_at` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `returns_server_id_unique` ON `returns` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `returns_return_number_unique` ON `returns` (`return_number`);--> statement-breakpoint
CREATE INDEX `idx_returns_order` ON `returns` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_returns_customer` ON `returns` (`customer_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`register_id` text,
	`store_id` text,
	`status` text DEFAULT 'OPEN',
	`opened_at` integer DEFAULT CURRENT_TIMESTAMP,
	`closed_at` integer,
	`opening_balance` numeric DEFAULT '0',
	`closing_balance` numeric,
	`expected_balance` numeric,
	`discrepancy` numeric,
	`cash_sales` numeric DEFAULT '0',
	`card_sales` numeric DEFAULT '0',
	`digital_sales` numeric DEFAULT '0',
	`notes` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`register_id`) REFERENCES `cash_registers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_server_id_unique` ON `sessions` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_status` ON `sessions` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_store` ON `sessions` (`store_id`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`store_id` text,
	`user_id` text,
	`quantity` integer NOT NULL,
	`previous_stock` integer NOT NULL,
	`new_stock` integer NOT NULL,
	`type` text NOT NULL,
	`reference_id` text,
	`reference_type` text,
	`reason` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_movements_server_id_unique` ON `stock_movements` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_product` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_reference` ON `stock_movements` (`reference_id`,`reference_type`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_store` ON `stock_movements` (`store_id`);--> statement-breakpoint
CREATE INDEX `idx_stock_movements_tenant` ON `stock_movements` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `stock_transfer_items` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`transfer_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`received_quantity` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfer_items_server_id_unique` ON `stock_transfer_items` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_transfer_items_transfer_product_variant` ON `stock_transfer_items` (`transfer_id`,`product_id`,`variant_id`);--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`transfer_number` text NOT NULL,
	`tenant_id` text NOT NULL,
	`from_store_id` text NOT NULL,
	`to_store_id` text NOT NULL,
	`status` text DEFAULT 'PENDING',
	`requested_by_id` text,
	`approved_by_id` text,
	`requested_at` integer DEFAULT CURRENT_TIMESTAMP,
	`completed_at` integer,
	`notes` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfers_server_id_unique` ON `stock_transfers` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stock_transfers_transfer_number_unique` ON `stock_transfers` (`transfer_number`);--> statement-breakpoint
CREATE INDEX `idx_transfers_tenant` ON `stock_transfers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_transfers_status` ON `stock_transfers` (`status`);--> statement-breakpoint
CREATE TABLE `store_settings` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`store_id` text,
	`setting_key` text NOT NULL,
	`setting_value` text NOT NULL,
	`description` text,
	`updated_by_id` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_settings_server_id_unique` ON `store_settings` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_store_settings_store_key` ON `store_settings` (`store_id`,`setting_key`);--> statement-breakpoint
CREATE TABLE `stores` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`tax_number` text,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_server_id_unique` ON `stores` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_stores_tenant` ON `stores` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_stores_tenant_code` ON `stores` (`tenant_id`,`code`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`contact_name` text,
	`phone` text,
	`email` text,
	`address` text,
	`tax_id` text,
	`payment_terms` integer,
	`credit_limit` numeric,
	`current_balance` numeric DEFAULT '0',
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_server_id_unique` ON `suppliers` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_suppliers_tenant` ON `suppliers` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_suppliers_tenant_code` ON `suppliers` (`tenant_id`,`code`);--> statement-breakpoint
CREATE TABLE `tax_rates` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`tax_zone_id` text,
	`name` text NOT NULL,
	`rate` numeric NOT NULL,
	`is_compound` integer DEFAULT false,
	`applies_to` text,
	`valid_from` integer DEFAULT CURRENT_TIMESTAMP,
	`valid_to` integer,
	`is_active` integer DEFAULT true,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_zone_id`) REFERENCES `tax_zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_rates_server_id_unique` ON `tax_rates` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_tax_rates_tenant` ON `tax_rates` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_tax_rates_zone` ON `tax_rates` (`tax_zone_id`);--> statement-breakpoint
CREATE TABLE `tax_rules` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`condition` text NOT NULL,
	`tax_rate_id` text NOT NULL,
	`priority` integer DEFAULT 0,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_rate_id`) REFERENCES `tax_rates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_rules_server_id_unique` ON `tax_rules` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_tax_rules_tenant` ON `tax_rules` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_tax_rules_rate` ON `tax_rules` (`tax_rate_id`);--> statement-breakpoint
CREATE TABLE `tax_zones` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_zones_server_id_unique` ON `tax_zones` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_tax_zones_tenant_name` ON `tax_zones` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`is_active` integer DEFAULT true,
	`currency_code` text DEFAULT 'USD'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_server_id_unique` ON `tenants` (`server_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_code_unique` ON `tenants` (`code`);--> statement-breakpoint
CREATE TABLE `users` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`phone` text,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'CASHIER' NOT NULL,
	`is_active` integer DEFAULT true,
	`last_login_at` integer,
	`last_login_ip` text,
	`two_factor_secret` text,
	`permissions` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_server_id_unique` ON `users` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_users_tenant` ON `users` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `unq_users_tenant_username` ON `users` (`tenant_id`,`username`);--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`server_id` text,
	`sync_status` text DEFAULT 'PENDING',
	`last_synced_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`amount` numeric NOT NULL,
	`type` text NOT NULL,
	`reference_id` text,
	`description` text,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wallet_id`) REFERENCES `customer_wallets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_transactions_server_id_unique` ON `wallet_transactions` (`server_id`);--> statement-breakpoint
CREATE INDEX `idx_wallet_txn_wallet` ON `wallet_transactions` (`wallet_id`);--> statement-breakpoint
CREATE INDEX `idx_wallet_txn_tenant` ON `wallet_transactions` (`tenant_id`);