import { db } from "../db";
import { order, orderItem } from "../schema";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getTenantId } from "@/utils/secureStorage";

export class OrderRepository {
  async getPending(): Promise<any[]> {
    return await db.select().from(order).where(eq(order.syncStatus, "pending"));
  }

  async upsertFromServer(serverOrder: any) {
    const existing = await db
      .select()
      .from(order)
      .where(eq(order.serverId, serverOrder.id));
    
    const now = Date.now();

    let localOrderId = serverOrder.id;

    if (existing.length > 0) {
      localOrderId = existing[0].id;
      if (serverOrder.lastModified > existing[0].lastModified) {
        await db
          .update(order)
          .set({
            orderNumber: serverOrder.orderNumber,
            customerId: serverOrder.customerId,
            userId: serverOrder.userId,
            sessionId: serverOrder.sessionId,
            storeId: serverOrder.storeId,
            registerId: serverOrder.registerId,
            status: serverOrder.status,
            paymentStatus: serverOrder.paymentStatus,
            subTotal: serverOrder.subTotal,
            taxAmount: serverOrder.taxAmount,
            discountAmount: serverOrder.discountAmount,
            discountPercent: serverOrder.discountPercent,
            grandTotal: serverOrder.grandTotal,
            currencyCode: serverOrder.currencyCode,
            paymentMethod: serverOrder.paymentMethod,
            paidAmount: serverOrder.paidAmount,
            changeAmount: serverOrder.changeAmount,
            notes: serverOrder.notes,
            voidReason: serverOrder.voidReason,
            completedAt: serverOrder.completedAt,
            cancelledAt: serverOrder.cancelledAt,
            syncStatus: "synced",
            lastModified: now,
          })
          .where(eq(order.id, localOrderId));
      }
    } else {
      localOrderId = uuid();
      await db.insert(order).values({
        id: localOrderId,
        serverId: serverOrder.id,
        tenantId: serverOrder.tenantId,
        orderNumber: serverOrder.orderNumber,
        customerId: serverOrder.customerId,
        userId: serverOrder.userId,
        sessionId: serverOrder.sessionId,
        storeId: serverOrder.storeId,
        registerId: serverOrder.registerId,
        status: serverOrder.status,
        paymentStatus: serverOrder.paymentStatus,
        subTotal: serverOrder.subTotal,
        taxAmount: serverOrder.taxAmount,
        discountAmount: serverOrder.discountAmount,
        discountPercent: serverOrder.discountPercent,
        grandTotal: serverOrder.grandTotal,
        currencyCode: serverOrder.currencyCode,
        paymentMethod: serverOrder.paymentMethod,
        paidAmount: serverOrder.paidAmount,
        changeAmount: serverOrder.changeAmount,
        notes: serverOrder.notes,
        voidReason: serverOrder.voidReason,
        completedAt: serverOrder.completedAt,
        cancelledAt: serverOrder.cancelledAt,
        syncStatus: "synced",
        lastModified: now,
      });
    }

    if (serverOrder.items && Array.isArray(serverOrder.items)) {
      for (const item of serverOrder.items) {
        const existingItem = await db
          .select()
          .from(orderItem)
          .where(eq(orderItem.serverId, item.id));

        if (existingItem.length > 0) {
          await db
            .update(orderItem)
            .set({
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxAmount: item.taxAmount,
              subTotal: item.subTotal,
              isReturned: item.isReturned,
              returnedQuantity: item.returnedQuantity,
              syncStatus: "synced",
              lastModified: now,
            })
            .where(eq(orderItem.id, existingItem[0].id));
        } else {
          await db.insert(orderItem).values({
            id: uuid(),
            serverId: item.id,
            orderId: localOrderId,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxAmount: item.taxAmount,
            subTotal: item.subTotal,
            isReturned: item.isReturned,
            returnedQuantity: item.returnedQuantity,
            syncStatus: "synced",
            lastModified: now,
          });
        }
      }
    }
  }
  async createLocal(orderData: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    const tenantId = orderData.tenantId || (await getTenantId());
    await db.insert(order).values({
      id,
      tenantId,
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
