import { db } from "../db";
import { inventory } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getTenantId } from "@/utils/secureStorage";

export class InventoryRepository {
  async createLocal(data: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    const tenantId = data.tenantId || (await getTenantId());
    await db.insert(inventory).values({
      id,
      tenantId,
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

  async getInventory(storeId?: string, productId?: string): Promise<any[]> {
    let q = db.select().from(inventory);
    
    // Because we need product details in the UI (e.g., item.product.name)
    // we should join with the product table. But for simplicity, we'll return raw inventory
    // and rely on the UI to either join it or we do a manual join here.
    
    // In index.tsx: item.product?.name
    // So we need to join it.
    const { product } = require("../schema");
    let joinedQ = db
      .select({
        id: inventory.id,
        serverId: inventory.serverId,
        tenantId: inventory.tenantId,
        storeId: inventory.storeId,
        productId: inventory.productId,
        variantId: inventory.variantId,
        quantity: inventory.quantity,
        reservedQty: inventory.reservedQty,
        reorderPoint: inventory.reorderPoint,
        reorderQty: inventory.reorderQty,
        shelfLocation: inventory.shelfLocation,
        syncStatus: inventory.syncStatus,
        lastModified: inventory.lastModified,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
        }
      })
      .from(inventory)
      .leftJoin(product, eq(inventory.productId, product.id))
      .where(eq(inventory.isDeleted, false));

    if (storeId) joinedQ = joinedQ.where(eq(inventory.storeId, storeId));
    if (productId) joinedQ = joinedQ.where(eq(inventory.productId, productId));

    return await joinedQ;
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
