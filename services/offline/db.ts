import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import * as schema from "./schema";
// 🌟 'documentsDirectory' ကို သီးသန့် import ထပ်ထုတ်ပေးရန် လိုအပ်ပါသည်
import { Directory, File, documentsDirectory } from "expo-file-system";

const databaseName = "midnightcorner_offline_v2.db";

let sqlite: SQLiteDatabase | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

// 🌟 Expo SDK 54 API သစ်ကို အမှန်ကန်ဆုံး ပြင်ဆင်ထားသည့် function
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
