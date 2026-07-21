import { db } from "../db";
import { product, productVariant, inventory } from "../schema";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getTenantId } from "@/utils/secureStorage";

export class ProductRepository {
  // ── Create local product ──
  async createLocal(productData: any): Promise<string> {
    const now = Date.now();
    const id = uuid();
    const tenantId = productData.tenantId || (await getTenantId());

    await db.insert(product).values({
      id,
      tenantId,
      categoryId: productData.categoryId,
      brandId: productData.brandId,
      supplierId: productData.supplierId,
      sku: productData.sku,
      barcode: productData.barcode,
      name: productData.name,
      description: productData.description,
      costPrice: productData.costPrice,
      sellingPrice: productData.sellingPrice,
      wholesalePrice: productData.wholesalePrice,
      promoPrice: productData.promoPrice,
      promoStartAt: productData.promoStartAt,
      promoEndAt: productData.promoEndAt,
      isTaxable: productData.isTaxable ?? true,
      isActive: productData.isActive ?? true,
      isReturnable: productData.isReturnable ?? true,
      syncStatus: "pending",
      lastModified: now,
    });

    // Insert variants
    if (productData.variants?.length) {
      for (const v of productData.variants) {
        await db.insert(productVariant).values({
          id: uuid(),
          tenantId,
          productId: id,
          name: v.name,
          sku: v.sku || `${productData.sku}-${v.name}`,
          barcode: v.barcode || null,
          price: v.price,
          costPrice: v.costPrice,
          color: v.color,
          size: v.size,
          weight: v.weight,
          isActive: v.isActive ?? true,
          syncStatus: "pending",
          lastModified: now,
        });
      }
    }

    // Create inventory if storeId provided
    if (productData.storeId && productData.initialStock) {
      await db.insert(inventory).values({
        id: uuid(),
        tenantId,
        storeId: productData.storeId,
        productId: id,
        variantId: null,
        quantity: productData.initialStock,
        reservedQty: 0,
        reorderPoint: productData.reorderPoint || 10,
        reorderQty: productData.reorderQty || 0,
        syncStatus: "pending",
        lastModified: now,
      });
    }

    return id;
  }

  // ── Get all products ──
  async getProducts(storeId?: string): Promise<any[]> {
    let q = db.select().from(product).where(eq(product.isDeleted, false));
    if (storeId) {
      // Join with inventory to filter by store
      q = q
        .innerJoin(inventory, eq(inventory.productId, product.id))
        .where(eq(inventory.storeId, storeId));
    }
    return await q;
  }

  // ── Get pending products for sync ──
  async getPending(): Promise<any[]> {
    return await db
      .select()
      .from(product)
      .where(eq(product.syncStatus, "pending"));
  }

  // ── Update local product ──
  async updateLocal(id: string, data: any) {
    const now = Date.now();
    await db
      .update(product)
      .set({
        name: data.name,
        description: data.description,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        wholesalePrice: data.wholesalePrice,
        promoPrice: data.promoPrice,
        promoStartAt: data.promoStartAt,
        promoEndAt: data.promoEndAt,
        isTaxable: data.isTaxable,
        isActive: data.isActive,
        isReturnable: data.isReturnable,
        syncStatus: "pending",
        lastModified: now,
      })
      .where(eq(product.id, id));
  }

  // ── Delete local product ──
  async deleteLocal(id: string) {
    const now = Date.now();
    await db
      .update(product)
      .set({
        isDeleted: true,
        syncStatus: "pending",
        lastModified: now,
      })
      .where(eq(product.id, id));
  }

  // ── Mark as synced ──
  async markSynced(localId: string, serverId: string) {
    await db
      .update(product)
      .set({ syncStatus: "synced", serverId })
      .where(eq(product.id, localId));
    // Also mark variants and inventory
    await db
      .update(productVariant)
      .set({ syncStatus: "synced" })
      .where(eq(productVariant.productId, localId));
    await db
      .update(inventory)
      .set({ syncStatus: "synced" })
      .where(eq(inventory.productId, localId));
  }

  // ── Upsert from server (pull) ──
  async upsertFromServer(serverProduct: any) {
    const existing = await db
      .select()
      .from(product)
      .where(eq(product.serverId, serverProduct.id));

    const now = Date.now();

    if (existing.length > 0) {
      // Update if server is newer
      if (serverProduct.lastModified > existing[0].lastModified) {
        await db
          .update(product)
          .set({
            name: serverProduct.name,
            sellingPrice: serverProduct.sellingPrice,
            costPrice: serverProduct.costPrice,
            // ... map all fields
            lastModified: now,
            syncStatus: "synced",
          })
          .where(eq(product.id, existing[0].id));
      }
    } else {
      // Insert new
      const newId = uuid();
      await db.insert(product).values({
        id: newId,
        serverId: serverProduct.id,
        tenantId: serverProduct.tenantId,
        name: serverProduct.name,
        // ... map all fields
        syncStatus: "synced",
        lastModified: now,
      });
    }
  }

  // ── Check duplicate barcode ──
  async checkDuplicateBarcode(
    barcode: string,
    tenantId: string,
  ): Promise<boolean> {
    const result = await db
      .select()
      .from(product)
      .where(
        and(
          eq(product.barcode, barcode),
          eq(product.tenantId, tenantId),
          eq(product.isDeleted, false),
        ),
      );
    return result.length > 0;
  }
}
