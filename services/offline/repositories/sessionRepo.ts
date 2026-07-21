import { db } from "../db";
import { session } from "../schema";
import { eq, and } from "drizzle-orm";
import { getTenantId } from "@/utils/secureStorage";
import { v4 as uuid } from "uuid";

export class SessionRepository {
  async getActiveSession(userId: string, storeId?: string) {
    const tenantId = await getTenantId();
    if (!tenantId) return null;

    let conditions = [eq(session.tenantId, tenantId), eq(session.status, "OPEN"), eq(session.userId, userId)];
    
    if (storeId) {
      conditions.push(eq(session.storeId, storeId));
    }

    const sessions = await db
      .select()
      .from(session)
      .where(and(...conditions));

    return sessions.length > 0 ? sessions[0] : null;
  }

  async createLocal(data: any): Promise<string> {
    const tenantId = await getTenantId();
    if (!tenantId) throw new Error("No tenantId found");

    const id = uuid();
    const now = Date.now();

    await db.insert(session).values({
      id,
      tenantId,
      ...data,
      status: "OPEN",
      openedAt: now,
      syncStatus: "pending",
      lastModified: now,
    });

    return id;
  }

  async updateLocal(id: string, data: any) {
    const now = Date.now();
    await db
      .update(session)
      .set({
        ...data,
        syncStatus: "pending",
        lastModified: now,
      })
      .where(eq(session.id, id));
  }

  async getPending() {
    return await db
      .select()
      .from(session)
      .where(eq(session.syncStatus, "pending"));
  }

  async markSynced(localId: string, serverId: string) {
    await db
      .update(session)
      .set({
        serverId,
        syncStatus: "synced",
        lastModified: Date.now(),
      })
      .where(eq(session.id, localId));
  }

  async upsertFromServer(serverData: any) {
    const tenantId = await getTenantId();
    if (!tenantId) return;

    const existing = await db
      .select()
      .from(session)
      .where(eq(session.serverId, serverData.id));

    if (existing.length > 0) {
      if (serverData.lastModified > (existing[0].lastModified || 0)) {
        await db
          .update(session)
          .set({
            ...serverData,
            serverId: serverData.id,
            tenantId: serverData.tenantId || tenantId,
            syncStatus: "synced",
          })
          .where(eq(session.serverId, serverData.id));
      }
    } else {
      await db.insert(session).values({
        ...serverData,
        id: uuid(),
        serverId: serverData.id,
        tenantId: serverData.tenantId || tenantId,
        syncStatus: "synced",
      });
    }
  }
}
