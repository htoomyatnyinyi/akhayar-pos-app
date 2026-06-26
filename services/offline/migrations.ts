import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { getOfflineDb } from "./db";
import migrations from "./drizzle/migrations.js";

export async function migrateOfflineDatabase() {
  const db = getOfflineDb();
  try {
    await migrate(db, migrations);
    console.log("Database migrated successfully with Drizzle Kit!");
  } catch (error) {
    console.error("Drizzle migration error:", error);
    throw error;
  }
}
