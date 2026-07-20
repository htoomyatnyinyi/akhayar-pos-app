import { db } from "../db";
import { category } from "../schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export class CategoryRepository {
  async createLocal(data: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    await db.insert(category).values({
      id,
      tenantId: data.tenantId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
      description: data.description,
      parentId: data.parentId,
      sortOrder: data.sortOrder || 0,
      isActive: data.isActive ?? true,
      syncStatus: "pending",
      lastModified: now,
    });
    return id;
  }

  async getCategories(): Promise<any[]> {
    return await db
      .select()
      .from(category)
      .where(eq(category.isDeleted, false));
  }

  async getPending(): Promise<any[]> {
    return await db
      .select()
      .from(category)
      .where(eq(category.syncStatus, "pending"));
  }

  async markSynced(localId: string, serverId: string) {
    await db
      .update(category)
      .set({ syncStatus: "synced", serverId })
      .where(eq(category.id, localId));
  }

  async upsertFromServer(serverCategory: any) {
    const existing = await db
      .select()
      .from(category)
      .where(eq(category.serverId, serverCategory.id));
    const now = Date.now();
    if (existing.length > 0) {
      if (serverCategory.lastModified > existing[0].lastModified) {
        await db
          .update(category)
          .set({
            name: serverCategory.name,
            slug: serverCategory.slug,
            description: serverCategory.description,
            parentId: serverCategory.parentId,
            sortOrder: serverCategory.sortOrder,
            isActive: serverCategory.isActive,
            lastModified: now,
            syncStatus: "synced",
          })
          .where(eq(category.id, existing[0].id));
      }
    } else {
      await db.insert(category).values({
        id: uuid(),
        serverId: serverCategory.id,
        tenantId: serverCategory.tenantId,
        name: serverCategory.name,
        slug: serverCategory.slug,
        description: serverCategory.description,
        parentId: serverCategory.parentId,
        sortOrder: serverCategory.sortOrder,
        isActive: serverCategory.isActive ?? true,
        syncStatus: "synced",
        lastModified: now,
      });
    }
  }
}
