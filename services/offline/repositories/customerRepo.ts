import { db } from "../db";
import { customer } from "../schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getTenantId } from "@/utils/secureStorage";

export class CustomerRepository {
  // ── Create local customer ──
  async createLocal(customerData: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    const tenantId = customerData.tenantId || (await getTenantId());

    await db.insert(customer).values({
      id,
      tenantId,
      code: customerData.code || `CUS-${now}`,
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      address: customerData.address,
      dateOfBirth: customerData.dateOfBirth,
      gender: customerData.gender,
      tier: customerData.tier || "BRONZE",
      loyaltyPoints: customerData.loyaltyPoints || 0,
      totalSpent: customerData.totalSpent || 0,
      totalOrders: customerData.totalOrders || 0,
      debtAmount: customerData.debtAmount || 0,
      creditLimit: customerData.creditLimit,
      isActive: customerData.isActive ?? true,
      syncStatus: "pending",
      lastModified: now,
    });

    return id;
  }

  // ── Get all customers ──
  async getCustomers(): Promise<any[]> {
    return await db
      .select()
      .from(customer)
      .where(eq(customer.isDeleted, false));
  }

  // ── Get pending customers for sync ──
  async getPending(): Promise<any[]> {
    return await db
      .select()
      .from(customer)
      .where(eq(customer.syncStatus, "pending"));
  }

  // ── Mark as synced ──
  async markSynced(localId: string, serverId: string) {
    await db
      .update(customer)
      .set({ syncStatus: "synced", serverId })
      .where(eq(customer.id, localId));
  }

  // ── Upsert from server (pull) ──
  async upsertFromServer(serverCustomer: any) {
    const existing = await db
      .select()
      .from(customer)
      .where(eq(customer.serverId, serverCustomer.id));

    const now = Date.now();

    if (existing.length > 0) {
      // Update if server is newer
      if (serverCustomer.lastModified > existing[0].lastModified) {
        await db
          .update(customer)
          .set({
            name: serverCustomer.name,
            phone: serverCustomer.phone,
            email: serverCustomer.email,
            address: serverCustomer.address,
            tier: serverCustomer.tier,
            loyaltyPoints: serverCustomer.loyaltyPoints,
            totalSpent: serverCustomer.totalSpent,
            totalOrders: serverCustomer.totalOrders,
            debtAmount: serverCustomer.debtAmount,
            creditLimit: serverCustomer.creditLimit,
            isActive: serverCustomer.isActive,
            lastModified: now,
            syncStatus: "synced",
          })
          .where(eq(customer.id, existing[0].id));
      }
    } else {
      // Insert new
      await db.insert(customer).values({
        id: uuid(),
        serverId: serverCustomer.id,
        tenantId: serverCustomer.tenantId,
        code: serverCustomer.code,
        name: serverCustomer.name,
        phone: serverCustomer.phone,
        email: serverCustomer.email,
        address: serverCustomer.address,
        dateOfBirth: serverCustomer.dateOfBirth,
        gender: serverCustomer.gender,
        tier: serverCustomer.tier || "BRONZE",
        loyaltyPoints: serverCustomer.loyaltyPoints || 0,
        totalSpent: serverCustomer.totalSpent || 0,
        totalOrders: serverCustomer.totalOrders || 0,
        debtAmount: serverCustomer.debtAmount || 0,
        creditLimit: serverCustomer.creditLimit,
        isActive: serverCustomer.isActive ?? true,
        syncStatus: "synced",
        lastModified: now,
      });
    }
  }

  // ── Update local customer (with sync) ──
  async updateLocal(id: string, data: any) {
    const now = Date.now();
    await db
      .update(customer)
      .set({
        ...data,
        lastModified: now,
        syncStatus: "pending",
      })
      .where(eq(customer.id, id));
  }

  // ── Soft delete ──
  async softDelete(id: string) {
    const now = Date.now();
    await db
      .update(customer)
      .set({
        isDeleted: true,
        isActive: false,
        lastModified: now,
        syncStatus: "pending",
      })
      .where(eq(customer.id, id));
  }

  // ── Get customer by phone/email (for duplicate check) ──
  async findByPhone(phone: string, tenantId: string): Promise<any | null> {
    const result = await db
      .select()
      .from(customer)
      .where(
        and(
          eq(customer.phone, phone),
          eq(customer.tenantId, tenantId),
          eq(customer.isDeleted, false),
        ),
      );
    return result.length > 0 ? result[0] : null;
  }
}
