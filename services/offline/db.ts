import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import * as schema from "./schema";

const databaseName = "midnightcorner_offline.db";

let sqlite: SQLiteDatabase | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

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
