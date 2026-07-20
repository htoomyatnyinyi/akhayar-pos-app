import { db } from "../db";
import { inventory } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export class InventoryRepository {
  async createLocal(data: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    await db.insert(inventory).values({
      id,
      tenantId: data.tenantId,
      storeId: data.storeId,
      productId: data.productId,
      variantId: data.variantId || null,
      quantity: data.quantity || 0,
      reservedQty: data.reservedQty || 0,
      reorderPoint: data.reorderPoint || 10,
      reorderQty: data.reorderQty || 0,
      shelfLocation: data.shelfLocation,
      syncStatus: "pending",
      lastModified: now,
    });
    return id;
  }

  async adjustStock(
    storeId: string,
    productId: string,
    delta: number,
    variantId?: string,
  ) {
    const now = Date.now();
    const existing = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.storeId, storeId),
          eq(inventory.productId, productId),
          variantId
            ? eq(inventory.variantId, variantId)
            : eq(inventory.variantId, ""),
        ),
      );
    if (existing.length > 0) {
      const newQty = existing[0].quantity + delta;
      await db
        .update(inventory)
        .set({
          quantity: newQty,
          lastModified: now,
          syncStatus: "pending",
          version: existing[0].version + 1,
        })
        .where(eq(inventory.id, existing[0].id));
    } else {
      await this.createLocal({
        tenantId: existing[0]?.tenantId || "",
        storeId,
        productId,
        variantId,
        quantity: delta,
      });
    }
  }

  async getPending(): Promise<any[]> {
    return await db
      .select()
      .from(inventory)
      .where(eq(inventory.syncStatus, "pending"));
  }

  async markSynced(localId: string, serverId: string) {
    await db
      .update(inventory)
      .set({ syncStatus: "synced", serverId })
      .where(eq(inventory.id, localId));
  }

  async upsertFromServer(serverInventory: any) {
    const existing = await db
      .select()
      .from(inventory)
      .where(eq(inventory.serverId, serverInventory.id));
    const now = Date.now();
    if (existing.length > 0) {
      if (serverInventory.lastModified > existing[0].lastModified) {
        await db
          .update(inventory)
          .set({
            quantity: serverInventory.quantity,
            reservedQty: serverInventory.reservedQty,
            reorderPoint: serverInventory.reorderPoint,
            reorderQty: serverInventory.reorderQty,
            shelfLocation: serverInventory.shelfLocation,
            lastModified: now,
            syncStatus: "synced",
            version: existing[0].version + 1,
          })
          .where(eq(inventory.id, existing[0].id));
      }
    } else {
      await db.insert(inventory).values({
        id: uuid(),
        serverId: serverInventory.id,
        tenantId: serverInventory.tenantId,
        storeId: serverInventory.storeId,
        productId: serverInventory.productId,
        variantId: serverInventory.variantId || null,
        quantity: serverInventory.quantity || 0,
        reservedQty: serverInventory.reservedQty || 0,
        reorderPoint: serverInventory.reorderPoint || 10,
        reorderQty: serverInventory.reorderQty || 0,
        shelfLocation: serverInventory.shelfLocation,
        syncStatus: "synced",
        lastModified: now,
        version: 0,
      });
    }
  }
}
