import { db } from "../db";
import { supplier } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getTenantId } from "@/utils/secureStorage";

export class SupplierRepository {
  async createLocal(data: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    const tenantId = data.tenantId || (await getTenantId());
    await db.insert(supplier).values({
      id,
      tenantId,
      code: data.code || `SUP-${now}`,
      name: data.name,
      contactName: data.contactName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      creditLimit: data.creditLimit,
      currentBalance: data.currentBalance || 0,
      isActive: data.isActive ?? true,
      syncStatus: "pending",
      lastModified: now,
    });
    return id;
  }

  async getSuppliers(): Promise<any[]> {
    return await db
      .select()
      .from(supplier)
      .where(eq(supplier.isDeleted, false));
  }

  async updateLocal(id: string, data: any) {
    const now = Date.now();
    await db
      .update(supplier)
      .set({
        code: data.code,
        name: data.name,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        taxId: data.taxId,
        paymentTerms: data.paymentTerms,
        creditLimit: data.creditLimit,
        currentBalance: data.currentBalance,
        isActive: data.isActive,
        lastModified: now,
        syncStatus: "pending",
      })
      .where(eq(supplier.id, id));
  }

  // async softDelete(id: string) {
  //   await db
  //     .update(supplier)
  //     .set({
  //       isDeleted: true,
  //       isActive: false,
  //       lastModified: Date.now(),
  //       syncStatus: "pending",
  //     })
  //     .where(eq(supplier.id, id));
  // }

  async deleteLocal(id: string) {
    await db.delete(supplier).where(eq(supplier.id, id));
  }

  async getPending(): Promise<any[]> {
    return await db
      .select()
      .from(supplier)
      .where(eq(supplier.syncStatus, "pending"));
  }

  async markSynced(localId: string, serverId: string) {
    await db
      .update(supplier)
      .set({ syncStatus: "synced", serverId })
      .where(eq(supplier.id, localId));
  }

  async upsertFromServer(serverSupplier: any) {
    const existing = await db
      .select()
      .from(supplier)
      .where(eq(supplier.serverId, serverSupplier.id));
    const now = Date.now();
    if (existing.length > 0) {
      if (serverSupplier.lastModified > (existing[0].lastModified || 0)) {
        await db
          .update(supplier)
          .set({
            name: serverSupplier.name,
            contactName: serverSupplier.contactName,
            phone: serverSupplier.phone,
            email: serverSupplier.email,
            address: serverSupplier.address,
            currentBalance: serverSupplier.currentBalance,
            isActive: serverSupplier.isActive,
            lastModified: now,
            syncStatus: "synced",
          })
          .where(eq(supplier.id, existing[0].id));
      }
    } else {
      await db.insert(supplier).values({
        id: uuid(),
        serverId: serverSupplier.id,
        tenantId: serverSupplier.tenantId,
        code: serverSupplier.code,
        name: serverSupplier.name,
        contactName: serverSupplier.contactName,
        phone: serverSupplier.phone,
        email: serverSupplier.email,
        address: serverSupplier.address,
        taxId: serverSupplier.taxId,
        paymentTerms: serverSupplier.paymentTerms,
        creditLimit: serverSupplier.creditLimit,
        currentBalance: serverSupplier.currentBalance || 0,
        isActive: serverSupplier.isActive ?? true,
        syncStatus: "synced",
        lastModified: now,
      });
    }
  }

  async softDelete(id: string) {
    await db
      .update(supplier)
      .set({
        isDeleted: true,
        isActive: false,
        lastModified: Date.now(),
        syncStatus: "pending",
      })
      .where(eq(supplier.id, id));
  }
}
