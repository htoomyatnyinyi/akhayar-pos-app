import { db } from "../db";
import { store } from "../schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export class StoreRepository {
  async createLocal(data: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    await db.insert(store).values({
      id,
      tenantId: data.tenantId,
      code: data.code,
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      taxNumber: data.taxNumber,
      isActive: data.isActive ?? true,
      syncStatus: "pending",
      lastModified: now,
    });
    return id;
  }

  async getStores(): Promise<any[]> {
    return await db.select().from(store).where(eq(store.isDeleted, false));
  }

  async getPending(): Promise<any[]> {
    return await db.select().from(store).where(eq(store.syncStatus, "pending"));
  }

  async markSynced(localId: string, serverId: string) {
    await db
      .update(store)
      .set({ syncStatus: "synced", serverId })
      .where(eq(store.id, localId));
  }

  async upsertFromServer(serverStore: any) {
    const existing = await db
      .select()
      .from(store)
      .where(eq(store.serverId, serverStore.id));
    const now = Date.now();
    if (existing.length > 0) {
      if (serverStore.lastModified > existing[0].lastModified) {
        await db
          .update(store)
          .set({
            code: serverStore.code,
            name: serverStore.name,
            address: serverStore.address,
            phone: serverStore.phone,
            email: serverStore.email,
            taxNumber: serverStore.taxNumber,
            isActive: serverStore.isActive,
            lastModified: now,
            syncStatus: "synced",
          })
          .where(eq(store.id, existing[0].id));
      }
    } else {
      await db.insert(store).values({
        id: uuid(),
        serverId: serverStore.id,
        tenantId: serverStore.tenantId,
        code: serverStore.code,
        name: serverStore.name,
        address: serverStore.address,
        phone: serverStore.phone,
        email: serverStore.email,
        taxNumber: serverStore.taxNumber,
        isActive: serverStore.isActive ?? true,
        syncStatus: "synced",
        lastModified: now,
      });
    }
  }

  async softDelete(id: string) {
    await db
      .update(store)
      .set({
        isDeleted: true,
        isActive: false,
        lastModified: Date.now(),
        syncStatus: "pending",
      })
      .where(eq(store.id, id));
  }
}
