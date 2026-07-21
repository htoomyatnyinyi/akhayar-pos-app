--> statement-breakpoint
CREATE TABLE `tenant` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`code` text,
	`name` text,
	`email` text,
	`phone` text,
	`isActive` integer DEFAULT true,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false
);


CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`name` text,
	`slug` text,
	`description` text,
	`parentId` text,
	`sortOrder` integer,
	`isActive` integer DEFAULT true,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_serverId_unique` ON `category` (`serverId`);--> statement-breakpoint
CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`code` text,
	`name` text,
	`phone` text,
	`email` text,
	`address` text,
	`dateOfBirth` integer,
	`gender` text,
	`loyaltyPoints` integer DEFAULT 0,
	`totalSpent` real DEFAULT 0,
	`totalOrders` integer DEFAULT 0,
	`debtAmount` real DEFAULT 0,
	`creditLimit` real,
	`tier` text DEFAULT 'BRONZE',
	`tierValidUntil` integer,
	`isActive` integer DEFAULT true,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_serverId_unique` ON `customer` (`serverId`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`storeId` text NOT NULL,
	`productId` text NOT NULL,
	`variantId` text,
	`quantity` integer DEFAULT 0,
	`reservedQty` integer DEFAULT 0,
	`reorderPoint` integer DEFAULT 10,
	`reorderQty` integer DEFAULT 0,
	`shelfLocation` text,
	`version` integer DEFAULT 0,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variantId`) REFERENCES `productVariant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_serverId_unique` ON `inventory` (`serverId`);--> statement-breakpoint
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`orderNumber` text,
	`customerId` text,
	`userId` text,
	`sessionId` text,
	`storeId` text,
	`registerId` text,
	`status` text DEFAULT 'PENDING',
	`paymentStatus` text DEFAULT 'PENDING',
	`subTotal` real,
	`taxAmount` real,
	`discountAmount` real,
	`discountPercent` real,
	`grandTotal` real,
	`currencyCode` text DEFAULT 'USD',
	`paymentMethod` text DEFAULT 'CASH',
	`paidAmount` real,
	`changeAmount` real,
	`notes` text,
	`voidReason` text,
	`version` integer DEFAULT 0,
	`completedAt` integer,
	`cancelledAt` integer,
	`syncStatus` text DEFAULT 'pending',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_serverId_unique` ON `order` (`serverId`);--> statement-breakpoint
CREATE TABLE `orderItem` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`variantId` text,
	`quantity` integer,
	`unitPrice` real,
	`discountPercent` real,
	`discountAmount` real,
	`taxAmount` real,
	`subTotal` real,
	`isReturned` integer DEFAULT false,
	`returnedQuantity` integer DEFAULT 0,
	`syncStatus` text DEFAULT 'pending',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variantId`) REFERENCES `productVariant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orderItem_serverId_unique` ON `orderItem` (`serverId`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`categoryId` text,
	`brandId` text,
	`supplierId` text,
	`sku` text,
	`barcode` text,
	`name` text,
	`description` text,
	`costPrice` real,
	`sellingPrice` real,
	`wholesalePrice` real,
	`promoPrice` real,
	`promoStartAt` integer,
	`promoEndAt` integer,
	`manufacturingDate` integer,
	`expiryDate` integer,
	`bestBeforeDate` integer,
	`isTaxable` integer DEFAULT true,
	`isActive` integer DEFAULT true,
	`isReturnable` integer DEFAULT true,
	`version` integer DEFAULT 0,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_serverId_unique` ON `product` (`serverId`);--> statement-breakpoint
CREATE TABLE `productVariant` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`productId` text NOT NULL,
	`name` text,
	`sku` text,
	`barcode` text,
	`price` real,
	`costPrice` real,
	`color` text,
	`size` text,
	`weight` real,
	`isActive` integer DEFAULT true,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `productVariant_serverId_unique` ON `productVariant` (`serverId`);--> statement-breakpoint
CREATE TABLE `store` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`tenantId` text NOT NULL,
	`code` text,
	`name` text,
	`address` text,
	`phone` text,
	`email` text,
	`taxNumber` text,
	`isActive` integer DEFAULT true,
	`syncStatus` text DEFAULT 'synced',
	`lastModified` integer,
	`isDeleted` integer DEFAULT false,
	FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_serverId_unique` ON `store` (`serverId`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `supplier_serverId_unique` ON `supplier` (`serverId`);--> statement-breakpoint
CREATE TABLE `syncLog` (
	`id` text PRIMARY KEY NOT NULL,
	`entityType` text,
	`entityId` text,
	`action` text,
	`payload` text,
	`status` text DEFAULT 'pending',
	`error` text,
	`createdAt` integer,
	`syncedAt` integer
);
--> statement-breakpoint
CREATE TABLE `syncState` (
	`entityType` text PRIMARY KEY NOT NULL,
	`lastPullAt` integer,
	`lastPushAt` integer
);

--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_serverId_unique` ON `tenant` (`serverId`);