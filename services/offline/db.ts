import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import * as schema from "./schema";
// 🌟 'documentsDirectory' ကို သီးသန့် import ထပ်ထုတ်ပေးရန် လိုအပ်ပါသည်
import { Directory, File, documentsDirectory } from "expo-file-system";

const databaseName = "midnightcorner_offline_v2.db";

let sqlite: SQLiteDatabase | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

// Expo SDK 54 API သစ်ကို အမှန်ကန်ဆုံး ပြင်ဆင်ထားသည့် function
/**
 * 1. Cleans up old database files if necessary (Your SDK 54 setup)
 */
async function deleteOldDatabase() {
  try {
    // 💡 Directory.documentsDirectory အစား တိုက်ရိုက် import ထုတ်ထားသည့် documentsDirectory ကို သုံးပါသည်
    if (!documentsDirectory) return;

    const sqliteDir = new Directory(documentsDirectory, "SQLite");
    const dbFile = new File(sqliteDir, databaseName);

    // ဖိုင် တကယ်ရှိမရှိ စစ်ပြီး ဖျက်ထုတ်ပစ်မယ်
    if (dbFile.exists) {
      dbFile.delete();
      console.log(
        "🔥 Old SQLite database deleted successfully using SDK 54 API!",
      );
    }
  } catch (error) {
    console.error("Failed to delete database:", error);
  }
}

export function getSqliteDatabase() {
  if (!sqlite) {
    sqlite = openDatabaseSync(databaseName);
    sqlite.execSync("PRAGMA journal_mode = WAL;");
    sqlite.execSync("PRAGMA foreign_keys = ON;");
  }

  return sqlite;
}

export function getOfflineDb() {
  if (!db) {
    db = drizzle(getSqliteDatabase(), { schema });
  }

  return db;
}
/* deepseed add on */
// 🌟 DeepSeek Add-on: Export direct database instance for easier imports
export const database = getOfflineDb();

// 🌟 DeepSeek Add-on: Export Database type for your repositories/hooks
export type Database = typeof database;

/**
 * 🌟 DeepSeek Add-on: Initialization wrapper
 * You can call this inside your app's root splash screen/loading logic
 */
export async function initializeDatabase() {
  try {
    // Calling this forces the DB to open and apply PRAGMAs right at launch
    getSqliteDatabase();
    console.log("Database initialized successfully with WAL and Foreign Keys.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Clears all data from the offline SQLite database.
 * Useful for sign-out or account switching.
 */
export async function clearOfflineDatabase() {
  try {
    const offlineDb = getOfflineDb();
    
    // Delete in order to avoid foreign key constraint violations
    await offlineDb.delete(schema.orderItems);
    await offlineDb.delete(schema.orders);
    await offlineDb.delete(schema.inventoryCountItems);
    await offlineDb.delete(schema.inventoryCounts);
    await offlineDb.delete(schema.inventoryMovements);
    await offlineDb.delete(schema.sessions);
    await offlineDb.delete(schema.stores);
    await offlineDb.delete(schema.customers);
    await offlineDb.delete(schema.categories);
    await offlineDb.delete(schema.products);
    await offlineDb.delete(schema.syncOutbox);
    await offlineDb.delete(schema.syncState);
    await offlineDb.delete(schema.genericRecords);

    console.log("🔥 Offline database cleared successfully on logout!");
  } catch (error) {
    console.error("❌ Failed to clear offline database:", error);
  }
}
/* old */

// import { drizzle } from "drizzle-orm/expo-sqlite";
// import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
// import * as schema from "./schema";

// const databaseName = "midnightcorner_offline.db";

// let sqlite: SQLiteDatabase | undefined;
// let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

// export function getSqliteDatabase() {
//   if (!sqlite) {
//     sqlite = openDatabaseSync(databaseName);
//     sqlite.execSync("PRAGMA journal_mode = WAL;");
//     sqlite.execSync("PRAGMA foreign_keys = ON;");
//   }

//   return sqlite;
// }

// export function getOfflineDb() {
//   if (!db) {
//     db = drizzle(getSqliteDatabase(), { schema });
//   }

//   return db;
// }
