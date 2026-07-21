import { db } from "../db";
import { staff } from "../schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/utils/secureStorage";
import { v4 as uuid } from "uuid";

export class StaffRepository {
  async getStaff() {
    const tenantId = await getTenantId();
    if (!tenantId) return [];

    return await db.select().from(staff).where(eq(staff.tenantId, tenantId));
  }

  async createLocal(data: any): Promise<string> {
    const tenantId = await getTenantId();
    if (!tenantId) throw new Error("No tenantId found");

    const id = uuid();
    const now = Date.now();

    await db.insert(staff).values({
      id,
      tenantId,
      ...data,
      syncStatus: "pending",
      lastModified: now,
    });

    return id;
  }

  async updateLocal(id: string, data: any) {
    const now = Date.now();
    await db
      .update(staff)
      .set({
        ...data,
        syncStatus: "pending",
        lastModified: now,
      })
      .where(eq(staff.id, id));
  }

  async getPending() {
    return await db.select().from(staff).where(eq(staff.syncStatus, "pending"));
  }

  async markSynced(localId: string, serverId: string) {
    await db
      .update(staff)
      .set({
        serverId,
        syncStatus: "synced",
        lastModified: Date.now(),
      })
      .where(eq(staff.id, localId));
  }

  async upsertFromServer(serverData: any) {
    const tenantId = await getTenantId();
    if (!tenantId) return;

    const existing = await db
      .select()
      .from(staff)
      .where(eq(staff.serverId, serverData.id));

    if (existing.length > 0) {
      if (serverData.lastModified > (existing[0].lastModified || 0)) {
        await db
          .update(staff)
          .set({
            ...serverData,
            serverId: serverData.id,
            tenantId: serverData.tenantId || tenantId,
            syncStatus: "synced",
          })
          .where(eq(staff.serverId, serverData.id));
      }
    } else {
      await db.insert(staff).values({
        ...serverData,
        id: uuid(),
        serverId: serverData.id,
        tenantId: serverData.tenantId || tenantId,
        syncStatus: "synced",
      });
    }
  }

  async deleteLocal(id: string) {
    await db
      .update(staff)
      .set({
        isDeleted: true,
        syncStatus: "pending",
        lastModified: Date.now(),
      })
      .where(eq(staff.id, id));
  }
}
