import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";
import migrations from "@/services/offline/drizzle/migrations";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

export { migrations, useMigrations };

const expoDb = openDatabaseSync("pos.db", { enableChangeListener: true });

// Enable WAL mode for better performance and foreign key support
expoDb.execSync("PRAGMA journal_mode = WAL;");
expoDb.execSync("PRAGMA foreign_keys = ON;");

export const db = drizzle(expoDb, { schema });

export function createLocalId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

/* 
declare const _default: {
  journal: {
    entries: {
      idx: number;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  migrations: Record<string, any>;
};
export default _default;


// migrations.d.ts
*/

// import { drizzle } from "drizzle-orm/expo-sqlite";
// import { openDatabaseSync } from "expo-sqlite";
// import * as schema from "./schema";

// const expoDb = openDatabaseSync("pos.db");

// // Enable WAL mode for better performance
// expoDb.execSync("PRAGMA journal_mode = WAL;");
// expoDb.execSync("PRAGMA foreign_keys = ON;");

// // Create tables if they don't exist
// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "tenant" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "code" text,
//   "name" text,
//   "email" text,
//   "phone" text,
//   "isActive" integer DEFAULT 1,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "tenant_serverId_unique" ON "tenant" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "store" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "code" text,
//   "name" text,
//   "address" text,
//   "phone" text,
//   "email" text,
//   "taxNumber" text,
//   "isActive" integer DEFAULT 1,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "store_serverId_unique" ON "store" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "category" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "name" text,
//   "slug" text,
//   "description" text,
//   "parentId" text,
//   "sortOrder" integer,
//   "isActive" integer DEFAULT 1,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "category_serverId_unique" ON "category" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "customer" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "code" text,
//   "name" text,
//   "phone" text,
//   "email" text,
//   "address" text,
//   "dateOfBirth" integer,
//   "gender" text,
//   "loyaltyPoints" integer DEFAULT 0,
//   "totalSpent" real DEFAULT 0,
//   "totalOrders" integer DEFAULT 0,
//   "debtAmount" real DEFAULT 0,
//   "creditLimit" real,
//   "tier" text DEFAULT 'BRONZE',
//   "tierValidUntil" integer,
//   "isActive" integer DEFAULT 1,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "customer_serverId_unique" ON "customer" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "product" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "categoryId" text REFERENCES "category"("id"),
//   "brandId" text,
//   "supplierId" text,
//   "sku" text,
//   "barcode" text,
//   "name" text,
//   "description" text,
//   "costPrice" real,
//   "sellingPrice" real,
//   "wholesalePrice" real,
//   "promoPrice" real,
//   "promoStartAt" integer,
//   "promoEndAt" integer,
//   "manufacturingDate" integer,
//   "expiryDate" integer,
//   "bestBeforeDate" integer,
//   "isTaxable" integer DEFAULT 1,
//   "isActive" integer DEFAULT 1,
//   "isReturnable" integer DEFAULT 1,
//   "version" integer DEFAULT 0,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "product_serverId_unique" ON "product" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "productVariant" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "productId" text NOT NULL REFERENCES "product"("id"),
//   "name" text,
//   "sku" text,
//   "barcode" text,
//   "price" real,
//   "costPrice" real,
//   "color" text,
//   "size" text,
//   "weight" real,
//   "isActive" integer DEFAULT 1,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "productVariant_serverId_unique" ON "productVariant" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "inventory" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "storeId" text NOT NULL REFERENCES "store"("id"),
//   "productId" text NOT NULL REFERENCES "product"("id"),
//   "variantId" text REFERENCES "productVariant"("id"),
//   "quantity" integer DEFAULT 0,
//   "reservedQty" integer DEFAULT 0,
//   "reorderPoint" integer DEFAULT 10,
//   "reorderQty" integer DEFAULT 0,
//   "shelfLocation" text,
//   "version" integer DEFAULT 0,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "inventory_serverId_unique" ON "inventory" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "order" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "orderNumber" text,
//   "customerId" text REFERENCES "customer"("id"),
//   "userId" text,
//   "sessionId" text,
//   "storeId" text REFERENCES "store"("id"),
//   "registerId" text,
//   "status" text DEFAULT 'PENDING',
//   "paymentStatus" text DEFAULT 'PENDING',
//   "subTotal" real,
//   "taxAmount" real,
//   "discountAmount" real,
//   "discountPercent" real,
//   "grandTotal" real,
//   "currencyCode" text DEFAULT 'USD',
//   "paymentMethod" text DEFAULT 'CASH',
//   "paidAmount" real,
//   "changeAmount" real,
//   "notes" text,
//   "voidReason" text,
//   "version" integer DEFAULT 0,
//   "completedAt" integer,
//   "cancelledAt" integer,
//   "syncStatus" text DEFAULT 'pending',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "order_serverId_unique" ON "order" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "orderItem" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "orderId" text NOT NULL REFERENCES "order"("id"),
//   "productId" text NOT NULL REFERENCES "product"("id"),
//   "variantId" text REFERENCES "productVariant"("id"),
//   "quantity" integer,
//   "unitPrice" real,
//   "discountPercent" real,
//   "discountAmount" real,
//   "taxAmount" real,
//   "subTotal" real,
//   "isReturned" integer DEFAULT 0,
//   "returnedQuantity" integer DEFAULT 0,
//   "syncStatus" text DEFAULT 'pending',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "orderItem_serverId_unique" ON "orderItem" ("serverId");`,
// );

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "syncState" (
//   "entityType" text PRIMARY KEY NOT NULL,
//   "lastPullAt" integer,
//   "lastPushAt" integer
// );
// `);

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "syncLog" (
//   "id" text PRIMARY KEY NOT NULL,
//   "entityType" text,
//   "entityId" text,
//   "action" text,
//   "payload" text,
//   "status" text DEFAULT 'pending',
//   "error" text,
//   "createdAt" integer,
//   "syncedAt" integer
// );
// `);

// expoDb.execSync(`
// CREATE TABLE IF NOT EXISTS "supplier" (
//   "id" text PRIMARY KEY NOT NULL,
//   "serverId" text,
//   "tenantId" text NOT NULL REFERENCES "tenant"("id"),
//   "code" text,
//   "name" text,
//   "contactName" text,
//   "phone" text,
//   "email" text,
//   "address" text,
//   "taxId" text,
//   "paymentTerms" text,
//   "creditLimit" real,
//   "currentBalance" real DEFAULT 0,
//   "isActive" integer DEFAULT 1,
//   "syncStatus" text DEFAULT 'synced',
//   "lastModified" integer,
//   "isDeleted" integer DEFAULT 0
// );
// `);

// expoDb.execSync(
//   `CREATE UNIQUE INDEX IF NOT EXISTS "supplier_serverId_unique" ON "supplier" ("serverId");`,
// );

// export const db = drizzle(expoDb, { schema });
