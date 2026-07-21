import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

const expoDb = openDatabaseSync("pos.db");

// Enable WAL mode for better performance
expoDb.execSync("PRAGMA journal_mode = WAL;");
expoDb.execSync("PRAGMA foreign_keys = ON;");

// Create tables if they don't exist
expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "tenant" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "code" text,
  "name" text,
  "email" text,
  "phone" text,
  "isActive" integer DEFAULT 1,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "tenant_serverId_unique" ON "tenant" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "store" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "code" text,
  "name" text,
  "address" text,
  "phone" text,
  "email" text,
  "taxNumber" text,
  "isActive" integer DEFAULT 1,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "store_serverId_unique" ON "store" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "category" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "name" text,
  "slug" text,
  "description" text,
  "parentId" text,
  "sortOrder" integer,
  "isActive" integer DEFAULT 1,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "category_serverId_unique" ON "category" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "customer" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "code" text,
  "name" text,
  "phone" text,
  "email" text,
  "address" text,
  "dateOfBirth" integer,
  "gender" text,
  "loyaltyPoints" integer DEFAULT 0,
  "totalSpent" real DEFAULT 0,
  "totalOrders" integer DEFAULT 0,
  "debtAmount" real DEFAULT 0,
  "creditLimit" real,
  "tier" text DEFAULT 'BRONZE',
  "tierValidUntil" integer,
  "isActive" integer DEFAULT 1,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "customer_serverId_unique" ON "customer" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "product" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "categoryId" text REFERENCES "category"("id"),
  "brandId" text,
  "supplierId" text,
  "sku" text,
  "barcode" text,
  "name" text,
  "description" text,
  "costPrice" real,
  "sellingPrice" real,
  "wholesalePrice" real,
  "promoPrice" real,
  "promoStartAt" integer,
  "promoEndAt" integer,
  "manufacturingDate" integer,
  "expiryDate" integer,
  "bestBeforeDate" integer,
  "isTaxable" integer DEFAULT 1,
  "isActive" integer DEFAULT 1,
  "isReturnable" integer DEFAULT 1,
  "version" integer DEFAULT 0,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "product_serverId_unique" ON "product" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "productVariant" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "productId" text NOT NULL REFERENCES "product"("id"),
  "name" text,
  "sku" text,
  "barcode" text,
  "price" real,
  "costPrice" real,
  "color" text,
  "size" text,
  "weight" real,
  "isActive" integer DEFAULT 1,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "productVariant_serverId_unique" ON "productVariant" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "inventory" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "storeId" text NOT NULL REFERENCES "store"("id"),
  "productId" text NOT NULL REFERENCES "product"("id"),
  "variantId" text REFERENCES "productVariant"("id"),
  "quantity" integer DEFAULT 0,
  "reservedQty" integer DEFAULT 0,
  "reorderPoint" integer DEFAULT 10,
  "reorderQty" integer DEFAULT 0,
  "shelfLocation" text,
  "version" integer DEFAULT 0,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "inventory_serverId_unique" ON "inventory" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "order" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "orderNumber" text,
  "customerId" text REFERENCES "customer"("id"),
  "userId" text,
  "sessionId" text,
  "storeId" text REFERENCES "store"("id"),
  "registerId" text,
  "status" text DEFAULT 'PENDING',
  "paymentStatus" text DEFAULT 'PENDING',
  "subTotal" real,
  "taxAmount" real,
  "discountAmount" real,
  "discountPercent" real,
  "grandTotal" real,
  "currencyCode" text DEFAULT 'USD',
  "paymentMethod" text DEFAULT 'CASH',
  "paidAmount" real,
  "changeAmount" real,
  "notes" text,
  "voidReason" text,
  "version" integer DEFAULT 0,
  "completedAt" integer,
  "cancelledAt" integer,
  "syncStatus" text DEFAULT 'pending',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "order_serverId_unique" ON "order" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "orderItem" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "orderId" text NOT NULL REFERENCES "order"("id"),
  "productId" text NOT NULL REFERENCES "product"("id"),
  "variantId" text REFERENCES "productVariant"("id"),
  "quantity" integer,
  "unitPrice" real,
  "discountPercent" real,
  "discountAmount" real,
  "taxAmount" real,
  "subTotal" real,
  "isReturned" integer DEFAULT 0,
  "returnedQuantity" integer DEFAULT 0,
  "syncStatus" text DEFAULT 'pending',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "orderItem_serverId_unique" ON "orderItem" ("serverId");`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "syncState" (
  "entityType" text PRIMARY KEY NOT NULL,
  "lastPullAt" integer,
  "lastPushAt" integer
);
`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "syncLog" (
  "id" text PRIMARY KEY NOT NULL,
  "entityType" text,
  "entityId" text,
  "action" text,
  "payload" text,
  "status" text DEFAULT 'pending',
  "error" text,
  "createdAt" integer,
  "syncedAt" integer
);
`);

expoDb.execSync(`
CREATE TABLE IF NOT EXISTS "supplier" (
  "id" text PRIMARY KEY NOT NULL,
  "serverId" text,
  "tenantId" text NOT NULL REFERENCES "tenant"("id"),
  "code" text,
  "name" text,
  "contactName" text,
  "phone" text,
  "email" text,
  "address" text,
  "taxId" text,
  "paymentTerms" text,
  "creditLimit" real,
  "currentBalance" real DEFAULT 0,
  "isActive" integer DEFAULT 1,
  "syncStatus" text DEFAULT 'synced',
  "lastModified" integer,
  "isDeleted" integer DEFAULT 0
);
`);

expoDb.execSync(`CREATE UNIQUE INDEX IF NOT EXISTS "supplier_serverId_unique" ON "supplier" ("serverId");`);

export const db = drizzle(expoDb, { schema });

// // ============================================
// // FILE: services/offline/db.ts
// // ============================================

// import { drizzle } from "drizzle-orm/expo-sqlite";
// import { migrate } from "drizzle-orm/expo-sqlite/migrator";
// import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
// import migrations from "./drizzle/migrations";
// import * as schema from "./schema";

// const databaseName = "midnightcorner_offline_v2.db";

// let sqlite: SQLiteDatabase | undefined;
// let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

// // ============================================
// // 1. DATABASE INITIALIZATION
// // ============================================

// export function getSqliteDatabase() {
//   if (!sqlite) {
//     sqlite = openDatabaseSync(databaseName);
//     sqlite.execSync("PRAGMA journal_mode = WAL;");
//     sqlite.execSync("PRAGMA foreign_keys = ON;");
//     sqlite.execSync("PRAGMA synchronous = NORMAL;");
//   }
//   return sqlite;
// }

// export function getOfflineDb() {
//   if (!db) {
//     db = drizzle(getSqliteDatabase(), { schema });
//   }
//   return db;
// }

// export const database = getOfflineDb();
// export type Database = typeof database;

// // ============================================
// // 2. MIGRATION FUNCTIONS
// // ============================================

// /**
//  * Run migrations using Drizzle Kit generated migrations
//  */
// export async function runMigrations() {
//   try {
//     const db = getSqliteDatabase();
//     const drizzleDb = drizzle(db);

//     console.log("📦 Running database migrations...");
//     console.log(
//       `📋 Available migrations: ${Object.keys(migrations.migrations).join(", ")}`,
//     );

//     // If the table is missing but the migration journal says it's applied, force a rebuild.
//     try {
//       db.execSync("SELECT 1 FROM tenant_store_settings LIMIT 1;");
//     } catch {
//       console.log(
//         "⚠️ tenant_store_settings is missing. Forcing database rebuild...",
//       );
//       db.execSync("DROP TABLE IF EXISTS __drizzle_migrations;");
//     }

//     await migrate(drizzleDb, migrations);
//     console.log("✅ Database migrations completed successfully!");

//     // ✅ FIX: Ensure staff table has permissions column
//     await ensureStaffTableSchema(db);

//     // ✅ FIX: Ensure products table has store_id and brand_id columns
//     await ensureProductTableSchema(db);
//   } catch (error) {
//     console.error("❌ Failed to run migrations, resetting database...", error);
//     await resetAndMigrate();
//   }
// }

// // ============================================
// // 3. SCHEMA FIX FUNCTIONS
// // ============================================

// /**
//  * Ensure staff table has the correct schema
//  */
// async function ensureStaffTableSchema(db: SQLiteDatabase) {
//   try {
//     // Check if staff table exists
//     const tables = db.getAllSync<{ name: string }>(
//       "SELECT name FROM sqlite_master WHERE type='table' AND name='staff'",
//     );

//     if (tables.length === 0) {
//       console.log("📋 Creating staff table...");
//       db.execSync(`
//         CREATE TABLE staff (
//           id TEXT PRIMARY KEY,
//           remote_id TEXT UNIQUE,
//           tenant_id TEXT NOT NULL,
//           store_id TEXT,
//           username TEXT NOT NULL,
//           email TEXT,
//           name TEXT NOT NULL,
//           role TEXT NOT NULL DEFAULT 'CASHIER',
//           permissions TEXT DEFAULT '[]',
//           is_active INTEGER NOT NULL DEFAULT 1,
//           sync_status TEXT NOT NULL DEFAULT 'synced',
//           sync_error TEXT,
//           created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
//           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
//           last_synced_at TEXT
//         );
//       `);
//       console.log("✅ Created staff table");
//       return;
//     }

//     // Check if permissions column exists
//     const staffColumns = db.getAllSync<{ name: string }>(
//       "PRAGMA table_info(staff)",
//     );
//     const hasPermissions = staffColumns.some(
//       (col) => col.name === "permissions",
//     );

//     if (!hasPermissions) {
//       console.log("📋 Adding permissions column to staff table...");
//       db.execSync(
//         `ALTER TABLE staff ADD COLUMN permissions TEXT DEFAULT '[]';`,
//       );
//       console.log("✅ Added permissions column to staff table");
//     }

//     // Check if remote_id column exists
//     const hasRemoteId = staffColumns.some((col) => col.name === "remote_id");
//     if (!hasRemoteId) {
//       console.log("📋 Adding remote_id column to staff table...");
//       db.execSync(`ALTER TABLE staff ADD COLUMN remote_id TEXT UNIQUE;`);
//       console.log("✅ Added remote_id column to staff table");
//     }

//     // Check if sync_status column exists
//     const hasSyncStatus = staffColumns.some(
//       (col) => col.name === "sync_status",
//     );
//     if (!hasSyncStatus) {
//       console.log("📋 Adding sync_status column to staff table...");
//       db.execSync(
//         `ALTER TABLE staff ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';`,
//       );
//       console.log("✅ Added sync_status column to staff table");
//     }

//     // Check if sync_error column exists
//     const hasSyncError = staffColumns.some((col) => col.name === "sync_error");
//     if (!hasSyncError) {
//       console.log("📋 Adding sync_error column to staff table...");
//       db.execSync(`ALTER TABLE staff ADD COLUMN sync_error TEXT;`);
//       console.log("✅ Added sync_error column to staff table");
//     }

//     // Check if last_synced_at column exists
//     const hasLastSynced = staffColumns.some(
//       (col) => col.name === "last_synced_at",
//     );
//     if (!hasLastSynced) {
//       console.log("📋 Adding last_synced_at column to staff table...");
//       db.execSync(`ALTER TABLE staff ADD COLUMN last_synced_at TEXT;`);
//       console.log("✅ Added last_synced_at column to staff table");
//     }
//   } catch (error) {
//     console.error("❌ Failed to ensure staff table schema:", error);
//   }
// }

// /**
//  * Ensure products table has the correct schema
//  */
// async function ensureProductTableSchema(db: SQLiteDatabase) {
//   try {
//     const productColumns = db.getAllSync<{ name: string }>(
//       "PRAGMA table_info(products)",
//     );

//     // Check if store_id column exists
//     const hasStoreId = productColumns.some((col) => col.name === "store_id");
//     if (!hasStoreId) {
//       console.log("📋 Adding store_id column to products table...");
//       db.execSync(`ALTER TABLE products ADD COLUMN store_id TEXT;`);
//       console.log("✅ Added store_id column to products table");
//     }

//     // Check if brand_id column exists
//     const hasBrandId = productColumns.some((col) => col.name === "brand_id");
//     if (!hasBrandId) {
//       console.log("📋 Adding brand_id column to products table...");
//       db.execSync(`ALTER TABLE products ADD COLUMN brand_id TEXT;`);
//       console.log("✅ Added brand_id column to products table");
//     }
//   } catch (error) {
//     console.error("❌ Failed to ensure product table schema:", error);
//   }
// }

// /**
//  * Reset database and re-run migrations
//  */
// async function resetAndMigrate() {
//   try {
//     const db = getSqliteDatabase();

//     console.log("🗑️ Dropping all tables for clean migration...");

//     // Get all user tables
//     const tables = db
//       .getAllSync<{
//         name: string;
//       }>(
//         "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
//       )
//       .map((r) => r.name);

//     // Disable FK constraints temporarily so we can drop in any order
//     db.execSync("PRAGMA foreign_keys = OFF;");
//     for (const table of tables) {
//       db.execSync(`DROP TABLE IF EXISTS "${table}";`);
//       console.log(`  dropped ${table}`);
//     }
//     db.execSync("PRAGMA foreign_keys = ON;");

//     console.log("✅ All tables dropped. Re-running migrations...");

//     const drizzleDb = drizzle(db);
//     await migrate(drizzleDb, migrations);
//     console.log("✅ Database recreated and migrated successfully!");

//     // Re-apply schema fixes
//     await ensureStaffTableSchema(db);
//     await ensureProductTableSchema(db);
//   } catch (fallbackError) {
//     console.error("❌ Fallback migration failed:", fallbackError);
//     throw fallbackError;
//   }
// }

// // ============================================
// // 4. UTILITY FUNCTIONS
// // ============================================

// /**
//  * Initialize database with migrations
//  */
// export async function initializeDatabase() {
//   try {
//     getSqliteDatabase();
//     await runMigrations();
//     console.log("✅ Database initialized successfully!");
//   } catch (error) {
//     console.error("❌ Failed to initialize database:", error);
//     throw error;
//   }
// }

// /**
//  * Get offline database size
//  */
// export async function getOfflineDbSize(): Promise<string> {
//   try {
//     const db = getOfflineDb();
//     const result = await db.get<{ page_count: number }>("PRAGMA page_count");
//     const pageCount = result?.page_count || 0;
//     const pageSize = 4096;
//     const sizeInBytes = pageCount * pageSize;

//     if (sizeInBytes < 1024) return `${sizeInBytes} B`;
//     if (sizeInBytes < 1024 * 1024)
//       return `${(sizeInBytes / 1024).toFixed(1)} KB`;
//     if (sizeInBytes < 1024 * 1024 * 1024) {
//       return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
//     }
//     return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
//   } catch (error) {
//     console.error("Failed to get DB size:", error);
//     return "Unknown";
//   }
// }

// /**
//  * Clear all data from offline database
//  */
// export async function clearOfflineDatabase() {
//   try {
//     const offlineDb = getOfflineDb();

//     console.log("🗑️ Clearing offline database...");

//     // Delete in order to respect foreign key constraints
//     await offlineDb.delete(schema.orderItems);
//     await offlineDb.delete(schema.inventoryCountItems);
//     await offlineDb.delete(schema.inventoryCounts);
//     await offlineDb.delete(schema.inventoryMovements);
//     await offlineDb.delete(schema.inventory);
//     await offlineDb.delete(schema.productVariants);
//     await offlineDb.delete(schema.orders);
//     await offlineDb.delete(schema.sessions);
//     await offlineDb.delete(schema.stores);
//     await offlineDb.delete(schema.customers);
//     await offlineDb.delete(schema.categories);
//     await offlineDb.delete(schema.products);
//     await offlineDb.delete(schema.priceHistory);
//     await offlineDb.delete(schema.syncOutbox);
//     await offlineDb.delete(schema.syncState);
//     await offlineDb.delete(schema.genericRecords);

//     console.log("🔥 Offline database cleared successfully!");
//   } catch (error) {
//     console.error("❌ Failed to clear offline database:", error);
//     throw error;
//   }
// }

// /**
//  * Reset database connection
//  */
// export function resetDatabaseConnection() {
//   if (sqlite) {
//     try {
//       sqlite.closeSync();
//     } catch (e) {
//       // Already closed or invalid — safe to ignore
//     }
//   }
//   sqlite = undefined;
//   db = undefined;
//   console.log("🔄 Database connection reset");
// }

// /**
//  * Completely reset the database
//  */
// export async function resetDatabaseCompletely() {
//   try {
//     const db = getSqliteDatabase();

//     console.log("🗑️ Dropping all tables...");

//     // Drop all tables in correct order
//     const tablesToDrop = [
//       "order_items",
//       "inventory_count_items",
//       "inventory_counts",
//       "inventory_movements",
//       "inventory",
//       "product_variants",
//       "orders",
//       "sessions",
//       "stores",
//       "customers",
//       "categories",
//       "products",
//       "price_history",
//       "sync_outbox",
//       "sync_state",
//       "generic_records",
//       "__drizzle_migrations",
//     ];

//     for (const table of tablesToDrop) {
//       try {
//         db.execSync(`DROP TABLE IF EXISTS ${table}`);
//         console.log(`✅ Dropped ${table}`);
//       } catch (e) {
//         // Table might not exist, ignore
//       }
//     }

//     console.log("✅ All tables dropped!");
//     console.log("🔄 Please restart the app to run migrations fresh.");

//     return { success: true };
//   } catch (error) {
//     console.error("❌ Failed to reset database:", error);
//     return { success: false, error };
//   }
// }

// /**
//  * Check if database is initialized
//  */
// export function isDatabaseInitialized(): boolean {
//   return !!sqlite && !!db;
// }

// /**
//  * Get database statistics
//  */
// export async function getDatabaseStats(): Promise<Record<string, number>> {
//   try {
//     const offlineDb = getOfflineDb();
//     const tables = await offlineDb.all<{ name: string }>(
//       "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
//     );

//     const stats: Record<string, number> = {};
//     for (const table of tables) {
//       const result = await offlineDb.get<{ count: number }>(
//         `SELECT COUNT(*) as count FROM ${table.name}`,
//       );
//       stats[table.name] = result?.count || 0;
//     }

//     return stats;
//   } catch (error) {
//     console.error("Failed to get database stats:", error);
//     return {};
//   }
// }

// /**
//  * Vacuum database
//  */
// export async function vacuumDatabase() {
//   try {
//     const db = getSqliteDatabase();
//     db.execSync("VACUUM;");
//     console.log("✅ Database vacuumed successfully");
//   } catch (error) {
//     console.error("❌ Failed to vacuum database:", error);
//     throw error;
//   }
// }

// /**
//  * Get count from a specific table
//  */
// export async function getTableCount(tableName: string): Promise<number> {
//   try {
//     const offlineDb = getOfflineDb();
//     const result = await offlineDb.get<{ count: number }>(
//       `SELECT COUNT(*) as count FROM ${tableName}`,
//     );
//     return result?.count || 0;
//   } catch (error) {
//     console.error(`Failed to get count for ${tableName}:`, error);
//     return 0;
//   }
// }

// /**
//  * Check if a table exists
//  */
// export async function tableExists(tableName: string): Promise<boolean> {
//   try {
//     const offlineDb = getOfflineDb();
//     const result = await offlineDb.get<{ count: number }>(
//       `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
//     );
//     return (result?.count || 0) > 0;
//   } catch (error) {
//     console.error(`Failed to check table ${tableName}:`, error);
//     return false;
//   }
// }

// /**
//  * Get all table names
//  */
// export async function getAllTableNames(): Promise<string[]> {
//   try {
//     const offlineDb = getOfflineDb();
//     const tables = await offlineDb.all<{ name: string }>(
//       "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
//     );
//     return tables.map((t) => t.name);
//   } catch (error) {
//     console.error("Failed to get table names:", error);
//     return [];
//   }
// }

// // import { drizzle } from "drizzle-orm/expo-sqlite";
// // import { migrate } from "drizzle-orm/expo-sqlite/migrator";
// // import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
// // import migrations from "./drizzle/migrations";
// // import * as schema from "./schema";

// // const databaseName = "midnightcorner_offline_v2.db";

// // let sqlite: SQLiteDatabase | undefined;
// // let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

// // // ============================================
// // // 1. DATABASE INITIALIZATION
// // // ============================================

// // export function getSqliteDatabase() {
// //   if (!sqlite) {
// //     sqlite = openDatabaseSync(databaseName);
// //     sqlite.execSync("PRAGMA journal_mode = WAL;");
// //     sqlite.execSync("PRAGMA foreign_keys = ON;");
// //     sqlite.execSync("PRAGMA synchronous = NORMAL;");
// //   }
// //   return sqlite;
// // }

// // export function getOfflineDb() {
// //   if (!db) {
// //     db = drizzle(getSqliteDatabase(), { schema });
// //   }
// //   return db;
// // }

// // export const database = getOfflineDb();
// // export type Database = typeof database;

// // // ============================================
// // // 2. MIGRATION FUNCTIONS - FIXED ✅
// // // ============================================

// // /**
// //  * Run migrations using Drizzle Kit generated migrations
// //  */
// // export async function runMigrations() {
// //   try {
// //     const db = getSqliteDatabase();
// //     const drizzleDb = drizzle(db);

// //     console.log("📦 Running database migrations...");
// //     console.log(
// //       `📋 Available migrations: ${Object.keys(migrations.migrations).join(", ")}`,
// //     );

// //     // If the table is missing but the migration journal says it's applied, force a rebuild.
// //     try {
// //       db.execSync("SELECT 1 FROM tenant_store_settings LIMIT 1;");
// //     } catch {
// //       console.log(
// //         "⚠️ tenant_store_settings is missing. Forcing database rebuild...",
// //       );
// //       db.execSync("DROP TABLE IF EXISTS __drizzle_migrations;");
// //     }

// //     await migrate(drizzleDb, migrations);
// //     console.log("✅ Database migrations completed successfully!");
// //     // Fix staff table - add permissions column if missing
// //     try {
// //       const staffColumns = await db.all<{ name: string }>(
// //         "PRAGMA table_info(staff)",
// //       );
// //       const hasPermissions = staffColumns.some(
// //         (col) => col.name === "permissions",
// //       );

// //       if (!hasPermissions) {
// //         await db.exec(
// //           `ALTER TABLE staff ADD COLUMN permissions TEXT DEFAULT '[]';`,
// //         );
// //         console.log("✅ Added permissions column to staff table");
// //       }
// //     } catch (e) {
// //       console.log("ℹ️ Could not modify staff table:", e);
// //     }
// //   } catch (error) {
// //     console.error("❌ Failed to run migrations, resetting database...", error);
// //     try {
// //       // Instead of deleting the file (which fails if the connection is open),
// //       // drop all tables and re-run migrations from scratch.
// //       const db = getSqliteDatabase();

// //       console.log("🗑️ Dropping all tables for clean migration...");

// //       // Get all user tables
// //       const tables = db
// //         .getAllSync<{
// //           name: string;
// //         }>(
// //           "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
// //         )
// //         .map((r) => r.name);

// //       // Disable FK constraints temporarily so we can drop in any order
// //       db.execSync("PRAGMA foreign_keys = OFF;");
// //       for (const table of tables) {
// //         db.execSync(`DROP TABLE IF EXISTS "${table}";`);
// //         console.log(`  dropped ${table}`);
// //       }
// //       db.execSync("PRAGMA foreign_keys = ON;");

// //       console.log("✅ All tables dropped. Re-running migrations...");

// //       const drizzleDb = drizzle(db);
// //       await migrate(drizzleDb, migrations);
// //       console.log("✅ Database recreated and migrated successfully!");
// //     } catch (fallbackError) {
// //       console.error("❌ Fallback migration failed:", fallbackError);
// //       throw fallbackError;
// //     }
// //   }
// // }

// // /**
// //  * Initialize database with migrations
// //  */
// // export async function initializeDatabase() {
// //   try {
// //     getSqliteDatabase();
// //     await runMigrations();
// //     console.log("✅ Database initialized successfully!");
// //   } catch (error) {
// //     console.error("❌ Failed to initialize database:", error);
// //     throw error;
// //   }
// // }

// // // ============================================
// // // 3. UTILITY FUNCTIONS
// // // ============================================

// // export async function getOfflineDbSize(): Promise<string> {
// //   try {
// //     const db = getOfflineDb();
// //     const result = await db.get<{ page_count: number }>("PRAGMA page_count");
// //     const pageCount = result?.page_count || 0;
// //     const pageSize = 4096;
// //     const sizeInBytes = pageCount * pageSize;

// //     if (sizeInBytes < 1024) return `${sizeInBytes} B`;
// //     if (sizeInBytes < 1024 * 1024)
// //       return `${(sizeInBytes / 1024).toFixed(1)} KB`;
// //     if (sizeInBytes < 1024 * 1024 * 1024) {
// //       return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
// //     }
// //     return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
// //   } catch (error) {
// //     console.error("Failed to get DB size:", error);
// //     return "Unknown";
// //   }
// // }

// // export async function clearOfflineDatabase() {
// //   try {
// //     const offlineDb = getOfflineDb();

// //     console.log("🗑️ Clearing offline database...");

// //     await offlineDb.delete(schema.orderItems);
// //     await offlineDb.delete(schema.inventoryCountItems);
// //     await offlineDb.delete(schema.inventoryCounts);
// //     await offlineDb.delete(schema.inventoryMovements);
// //     await offlineDb.delete(schema.inventory);
// //     await offlineDb.delete(schema.productVariants);
// //     await offlineDb.delete(schema.orders);
// //     await offlineDb.delete(schema.sessions);
// //     await offlineDb.delete(schema.stores);
// //     await offlineDb.delete(schema.customers);
// //     await offlineDb.delete(schema.categories);
// //     await offlineDb.delete(schema.products);
// //     await offlineDb.delete(schema.priceHistory);
// //     await offlineDb.delete(schema.syncOutbox);
// //     await offlineDb.delete(schema.syncState);
// //     await offlineDb.delete(schema.genericRecords);

// //     console.log("🔥 Offline database cleared successfully!");
// //   } catch (error) {
// //     console.error("❌ Failed to clear offline database:", error);
// //     throw error;
// //   }
// // }

// // export function resetDatabaseConnection() {
// //   if (sqlite) {
// //     try {
// //       sqlite.closeSync();
// //     } catch (e) {
// //       // Already closed or invalid — safe to ignore
// //     }
// //   }
// //   sqlite = undefined;
// //   db = undefined;
// //   console.log("🔄 Database connection reset");
// // }

// // // Run this once to completely reset the database

// // export async function resetDatabaseCompletely() {
// //   try {
// //     const db = getSqliteDatabase();

// //     console.log("🗑️ Dropping all tables...");

// //     // Drop all tables in correct order
// //     const tablesToDrop = [
// //       "order_items",
// //       "inventory_count_items",
// //       "inventory_counts",
// //       "inventory_movements",
// //       "inventory",
// //       "product_variants",
// //       "orders",
// //       "sessions",
// //       "stores",
// //       "customers",
// //       "categories",
// //       "products",
// //       "price_history",
// //       "sync_outbox",
// //       "sync_state",
// //       "generic_records",
// //       "__drizzle_migrations",
// //     ];

// //     for (const table of tablesToDrop) {
// //       try {
// //         db.execSync(`DROP TABLE IF EXISTS ${table}`);
// //         console.log(`✅ Dropped ${table}`);
// //       } catch (e) {
// //         // Table might not exist, ignore
// //       }
// //     }

// //     console.log("✅ All tables dropped!");
// //     console.log("🔄 Please restart the app to run migrations fresh.");

// //     return { success: true };
// //   } catch (error) {
// //     console.error("❌ Failed to reset database:", error);
// //     return { success: false, error };
// //   }
// // }

// // export function isDatabaseInitialized(): boolean {
// //   return !!sqlite && !!db;
// // }

// // export async function getDatabaseStats(): Promise<Record<string, number>> {
// //   try {
// //     const offlineDb = getOfflineDb();
// //     const tables = await offlineDb.all<{ name: string }>(
// //       "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
// //     );

// //     const stats: Record<string, number> = {};
// //     for (const table of tables) {
// //       const result = await offlineDb.get<{ count: number }>(
// //         `SELECT COUNT(*) as count FROM ${table.name}`,
// //       );
// //       stats[table.name] = result?.count || 0;
// //     }

// //     return stats;
// //   } catch (error) {
// //     console.error("Failed to get database stats:", error);
// //     return {};
// //   }
// // }

// // export async function vacuumDatabase() {
// //   try {
// //     const db = getSqliteDatabase();
// //     db.execSync("VACUUM;");
// //     console.log("✅ Database vacuumed successfully");
// //   } catch (error) {
// //     console.error("❌ Failed to vacuum database:", error);
// //     throw error;
// //   }
// // }

// // export async function getTableCount(tableName: string): Promise<number> {
// //   try {
// //     const offlineDb = getOfflineDb();
// //     const result = await offlineDb.get<{ count: number }>(
// //       `SELECT COUNT(*) as count FROM ${tableName}`,
// //     );
// //     return result?.count || 0;
// //   } catch (error) {
// //     console.error(`Failed to get count for ${tableName}:`, error);
// //     return 0;
// //   }
// // }

// // export async function tableExists(tableName: string): Promise<boolean> {
// //   try {
// //     const offlineDb = getOfflineDb();
// //     const result = await offlineDb.get<{ count: number }>(
// //       `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='${tableName}'`,
// //     );
// //     return (result?.count || 0) > 0;
// //   } catch (error) {
// //     console.error(`Failed to check table ${tableName}:`, error);
// //     return false;
// //   }
// // }

// // export async function getAllTableNames(): Promise<string[]> {
// //   try {
// //     const offlineDb = getOfflineDb();
// //     const tables = await offlineDb.all<{ name: string }>(
// //       "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
// //     );
// //     return tables.map((t) => t.name);
// //   } catch (error) {
// //     console.error("Failed to get table names:", error);
// //     return [];
// //   }
// // }
