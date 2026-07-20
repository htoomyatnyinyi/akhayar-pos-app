import { db } from "../db";
import { order, orderItem } from "../schema";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export class OrderRepository {
  getPending() {
    throw new Error("Method not implemented.");
  }
  upsertFromServer(so: any) {
    throw new Error("Method not implemented.");
  }
  async createLocal(orderData: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    await db.insert(order).values({
      id,
      tenantId: orderData.tenantId,
      orderNumber: orderData.orderNumber || `ORD-${now}`,
      customerId: orderData.customerId,
      userId: orderData.userId,
      storeId: orderData.storeId,
      subTotal: orderData.subTotal,
      taxAmount: orderData.taxAmount || 0,
      discountAmount: orderData.discountAmount || 0,
      grandTotal: orderData.grandTotal,
      paymentMethod: orderData.paymentMethod,
      paidAmount: orderData.paidAmount,
      changeAmount: orderData.changeAmount,
      status: "PENDING",
      paymentStatus: "PENDING",
      syncStatus: "pending",
      lastModified: now,
    });
    for (const item of orderData.items) {
      await db.insert(orderItem).values({
        id: uuid(),
        orderId: id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        subTotal: item.subTotal,
        syncStatus: "pending",
        lastModified: now,
      });
    }
    return id;
  }

  async getPendingOrders(): Promise<any[]> {
    return await db.select().from(order).where(eq(order.syncStatus, "pending"));
  }

  async markSynced(orderId: string, serverId: string) {
    await db
      .update(order)
      .set({ syncStatus: "synced", serverId })
      .where(eq(order.id, orderId));
  }

  async updateStatus(orderId: string, status: string) {
    await db
      .update(order)
      .set({
        status,
        lastModified: Date.now(),
        syncStatus: "pending",
      })
      .where(eq(order.id, orderId));
  }

  async getOrders(storeId?: string, status?: string): Promise<any[]> {
    let q = db.select().from(order);
    if (storeId) q = q.where(eq(order.storeId, storeId));
    if (status) q = q.where(eq(order.status, status));
    return await q;
  }
}
