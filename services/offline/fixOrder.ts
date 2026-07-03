// services/offline/fixOrder.ts

import { getOfflineDb } from "./db";
import { syncOutbox } from "./schema";
import { eq } from "drizzle-orm";

export async function adjustOrderQuantities(orderId: string) {
  try {
    const db = getOfflineDb();

    // Get the outbox item
    const [outbox] = await db
      .select()
      .from(syncOutbox)
      .where(eq(syncOutbox.entityId, orderId))
      .limit(1);

    if (!outbox) {
      console.log(`❌ Order ${orderId} not found in outbox`);
      return;
    }

    // Parse payload
    let payload = outbox.payload;
    if (typeof payload === "string") {
      payload = JSON.parse(payload);
    }

    // Set all quantities to 0 (skip the order)
    const adjustedItems = payload.items.map((item: any) => ({
      ...item,
      quantity: 0,
      subTotal: 0,
    }));

    // Update payload
    const newPayload = {
      ...payload,
      items: adjustedItems,
      subTotal: 0,
      grandTotal: 0,
      paidAmount: 0,
    };

    // Update outbox
    await db
      .update(syncOutbox)
      .set({
        payload: JSON.stringify(newPayload),
        status: "pending",
        attempts: 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(syncOutbox.id, outbox.id));

    console.log(`✅ Order ${orderId} quantities adjusted to 0`);
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to adjust order:", error);
    return { success: false, error };
  }
}

// Usage:
await adjustOrderQuantities("ord_mr4s5ila_n8yccf5o");
