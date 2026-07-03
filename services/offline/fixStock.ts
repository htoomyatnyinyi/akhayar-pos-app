// services/offline/fixStock.ts

import { getOfflineDb } from "./db";
import { products } from "./schema";
import { eq } from "drizzle-orm";

export async function updateLocalStock(productId: string, newStock: number) {
  try {
    const db = getOfflineDb();

    // Update local stock
    await db
      .update(products)
      .set({
        stockQuantity: newStock,
        syncStatus: "pending",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(products.id, productId));

    console.log(`✅ Updated stock for product ${productId} to ${newStock}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to update stock:", error);
    return { success: false, error };
  }
}

// Usage:
await updateLocalStock("cmqt1anw8000701s6y6f50jyp", 100);
