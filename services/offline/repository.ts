// ============================================
// FILE: services/offline/repository.ts
// ============================================

import type {
  Category,
  CreateCategoryPayload,
} from "@/services/features/categories/categoryTypes";
import type {
  CreateCustomerPayload,
  Customer,
} from "@/services/features/customers/customerTypes";
import type {
  CreateCountPayload,
  CreateMovementPayload,
  InventoryItem,
} from "@/services/features/inventory/inventoryTypes";
import type {
  CreateOrderPayload,
  Order,
  OrderItem,
} from "@/services/features/order/orderTypes";
import type { Product } from "@/services/features/products/productTypes";
import type {
  CloseSessionPayload,
  Session,
} from "@/services/features/sessions/sessionTypes";
import type {
  CreateStorePayload,
  Store,
} from "@/services/features/stores/storeTypes";
import { and, desc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { getOfflineDb, getSqliteDatabase } from "./db";
import { createLocalId } from "./ids";
import { isOnline } from "./network";
import {
  apiKeys,
  auditLogs,
  brands,
  cashRegisters,
  categories,
  customers,
  expenseCategories,
  expenses,
  genericRecords,
  giftCardTransactions,
  giftCards,
  inventory,
  inventoryCountItems,
  inventoryCounts,
  inventoryMovements,
  notifications,
  orderItems,
  orders,
  priceHistory,
  productVariants,
  products,
  promotions,
  purchaseOrderItems,
  purchaseOrders,
  sessions,
  staff,
  stockTransferItems,
  stockTransfers,
  stores,
  supplierPayments,
  suppliers,
  syncOutbox,
  syncState,
  taxRates,
  tenantStoreSettings,
  walletTransactions,
  wallets,
  webhooks,
  type LocalCategory,
  type LocalCustomer,
  type LocalInventory,
  type LocalOrder,
  type LocalProduct,
  type LocalProductVariant,
  type LocalSession,
  type LocalStore,
} from "./schema";

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

export function normalizeProduct(
  product: Product & Record<string, any>,
): typeof products.$inferInsert {
  return {
    id: product.id,
    remoteId: product.remoteId || null,
    tenantId: product.tenantId,
    name: product.name,
    description: product.description,
    brand: product.brand,
    brandId: product.brandId,
    sku: product.sku,
    barcode: product.barcode,
    costPrice: Number(product.costPrice ?? 0),
    sellingPrice: Number(product.sellingPrice ?? 0),
    wholesalePrice: Number(product.wholesalePrice ?? 0),
    promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
    promoStartAt: product.promoStartAt,
    promoEndAt: product.promoEndAt,
    isTaxable: product.isTaxable ?? true,
    isActive: product.isActive ?? true,
    isReturnable: product.isReturnable ?? true,
    expiryDate: product.expiryDate,
    manufacturingDate: product.manufacturingDate,
    bestBeforeDate: product.bestBeforeDate,
    categoryId: product.categoryId,
    supplierId: product.supplierId,
    storeId: product.storeId,
    deletedAt: product.deletedAt,
    version: Number(product.version ?? 0),
    syncStatus: "synced",
    syncError: null,
    createdAt: product.createdAt ?? new Date().toISOString(),
    updatedAt: product.updatedAt ?? new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
}

export function normalizeProductVariant(
  variant: any,
): typeof productVariants.$inferInsert {
  return {
    id: variant.id,
    remoteId: variant.remoteId,
    name: variant.name,
    productId: variant.productId,
    tenantId: variant.tenantId,
    sku: variant.sku,
    barcode: variant.barcode,
    price: Number(variant.price ?? 0),
    costPrice: Number(variant.costPrice ?? 0),
    color: variant.color,
    size: variant.size,
    weight: variant.weight ? Number(variant.weight) : null,
    isActive: variant.isActive ?? true,
    syncStatus: "synced",
    syncError: null,
    createdAt: variant.createdAt ?? new Date().toISOString(),
    updatedAt: variant.updatedAt ?? new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
}

export function normalizeInventory(inv: any): typeof inventory.$inferInsert {
  return {
    id: inv.id,
    remoteId: inv.remoteId,
    tenantId: inv.tenantId,
    storeId: inv.storeId,
    productId: inv.productId,
    variantId: inv.variantId,
    quantity: Number(inv.quantity ?? 0),
    reservedQty: Number(inv.reservedQty ?? 0),
    reorderPoint: Number(inv.reorderPoint ?? 10),
    reorderQty: Number(inv.reorderQty ?? 0),
    shelfLocation: inv.shelfLocation,
    version: Number(inv.version ?? 0),
    syncStatus: "synced",
    syncError: null,
    createdAt: inv.createdAt ?? new Date().toISOString(),
    updatedAt: inv.updatedAt ?? new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
}

// ============================================
// UPSERT FUNCTIONS (Pull from Server)
// ============================================

// export async function upsertProducts(remoteProducts: Product[]) {
//   if (!remoteProducts.length) return;

//   const db = getOfflineDb();

//   // Check what columns exist in the products table
//   const tableInfo = await db.all<{ name: string }>(
//     "PRAGMA table_info(products)",
//   );
//   const existingColumns = tableInfo.map((col) => col.name);

//   // Filter the data to only include existing columns
//   const filteredProducts = remoteProducts.map((product) => {
//     const normalized = normalizeProduct(product);
//     const filtered: any = {};
//     for (const key of existingColumns) {
//       if (key in normalized) {
//         filtered[key] = normalized[key as keyof typeof normalized];
//       }
//     }
//     return filtered;
//   });

//   // Insert or update each product individually to handle foreign key issues
//   for (const product of filteredProducts) {
//     try {
//       await db
//         .insert(products)
//         .values(product)
//         .onConflictDoUpdate({
//           target: products.id,
//           set: {
//             sku: sql`excluded.sku`,
//             barcode: sql`excluded.barcode`,
//             name: sql`excluded.name`,
//             description: sql`excluded.description`,
//             brand: sql`excluded.brand`,
//             brandId: sql`excluded.brand_id`,
//             costPrice: sql`excluded.cost_price`,
//             sellingPrice: sql`excluded.selling_price`,
//             wholesalePrice: sql`excluded.wholesale_price`,
//             promoPrice: sql`excluded.promo_price`,
//             promoStartAt: sql`excluded.promo_start_at`,
//             promoEndAt: sql`excluded.promo_end_at`,
//             isTaxable: sql`excluded.is_taxable`,
//             isActive: sql`excluded.is_active`,
//             isReturnable: sql`excluded.is_returnable`,
//             expiryDate: sql`excluded.expiry_date`,
//             manufacturingDate: sql`excluded.manufacturing_date`,
//             bestBeforeDate: sql`excluded.best_before_date`,
//             categoryId: sql`excluded.category_id`,
//             supplierId: sql`excluded.supplier_id`,
//             storeId: sql`excluded.store_id`,
//             deletedAt: sql`excluded.deleted_at`,
//             version: sql`excluded.version`,
//             syncStatus: "synced",
//             syncError: null,
//             updatedAt: sql`excluded.updated_at`,
//             lastSyncedAt: sql`excluded.last_synced_at`,
//           },
//         });
//     } catch (error) {
//       console.error(`Failed to upsert product ${product.id}:`, error);
//     }
//   }
// }

// ============================================
// FILE: services/offline/repository.ts - Fix upsertProducts
// ============================================

export async function upsertProducts(remoteProducts: Product[]) {
  if (!remoteProducts.length) return;

  const db = getOfflineDb();

  // Check what columns exist in the products table
  const tableInfo = await db.all<{ name: string }>(
    "PRAGMA table_info(products)",
  );
  const existingColumns = tableInfo.map((col) => col.name);

  for (const product of remoteProducts) {
    try {
      // Build values object with only existing columns
      const values: any = {
        id: product.id || `prod-${Date.now()}`,
        remoteId: product.remoteId || null,
        tenantId: product.tenantId || "default",
        name: product.name || "Unknown Product",
        sku: product.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
        barcode: product.barcode || null,
        description: product.description || null,
        brand:
          typeof product.brand === "object"
            ? (product.brand as any)?.name
            : product.brand || null,
        costPrice: Number(product.costPrice ?? 0),
        sellingPrice: Number(product.sellingPrice ?? 0),
        wholesalePrice: Number(product.wholesalePrice ?? 0),
        promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
        promoStartAt: product.promoStartAt || null,
        promoEndAt: product.promoEndAt || null,
        isTaxable:
          product.isTaxable === false || product.isTaxable === false
            ? false
            : true,
        isActive:
          product.isActive === false || product.isActive === false
            ? false
            : true,
        isReturnable:
          product.isReturnable === false || product.isReturnable === false
            ? false
            : true,
        expiryDate: product.expiryDate || null,
        manufacturingDate: product.manufacturingDate || null,
        bestBeforeDate: product.bestBeforeDate || null,
        categoryId: product.categoryId || null,
        supplierId: product.supplierId || null,
        deletedAt: product.deletedAt || null,
        version: Number(product.version ?? 0),
        syncStatus: "synced",
        syncError: null,
        createdAt: product.createdAt || new Date().toISOString(),
        updatedAt: product.updatedAt || new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
      };

      // Only add store_id if column exists
      if (existingColumns.includes("store_id")) {
        values.storeId = product.storeId || null;
      }

      // Only add brand_id if column exists
      if (existingColumns.includes("brand_id")) {
        values.brandId = product.brandId || null;
      }

      // Only add storeId if column exists (Drizzle might use different naming)
      if (existingColumns.includes("storeId")) {
        values.storeId = product.storeId || null;
      }

      // Insert or update
      await db
        .insert(products)
        .values(values)
        .onConflictDoUpdate({
          target: products.id,
          set: {
            sku: sql`excluded.sku`,
            barcode: sql`excluded.barcode`,
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            brand: sql`excluded.brand`,
            brandId: sql`excluded.brand_id`,
            costPrice: sql`excluded.cost_price`,
            sellingPrice: sql`excluded.selling_price`,
            wholesalePrice: sql`excluded.wholesale_price`,
            promoPrice: sql`excluded.promo_price`,
            promoStartAt: sql`excluded.promo_start_at`,
            promoEndAt: sql`excluded.promo_end_at`,
            isTaxable: sql`excluded.is_taxable`,
            isActive: sql`excluded.is_active`,
            isReturnable: sql`excluded.is_returnable`,
            expiryDate: sql`excluded.expiry_date`,
            manufacturingDate: sql`excluded.manufacturing_date`,
            bestBeforeDate: sql`excluded.best_before_date`,
            categoryId: sql`excluded.category_id`,
            supplierId: sql`excluded.supplier_id`,
            storeId: sql`excluded.store_id`,
            deletedAt: sql`excluded.deleted_at`,
            version: sql`excluded.version`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: sql`excluded.last_synced_at`,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert product ${product.id}:`, error);
    }
  }
}

export async function upsertProductVariants(remoteVariants: any[]) {
  if (!remoteVariants.length) return;

  const db = getOfflineDb();
  for (const variant of remoteVariants) {
    try {
      await db
        .insert(productVariants)
        .values(normalizeProductVariant(variant))
        .onConflictDoUpdate({
          target: productVariants.id,
          set: {
            sku: sql`excluded.sku`,
            barcode: sql`excluded.barcode`,
            name: sql`excluded.name`,
            price: sql`excluded.price`,
            costPrice: sql`excluded.cost_price`,
            color: sql`excluded.color`,
            size: sql`excluded.size`,
            weight: sql`excluded.weight`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: sql`excluded.last_synced_at`,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert variant ${variant.id}:`, error);
    }
  }
}

// export async function upsertInventory(remoteInventory: any[]) {
//   if (!remoteInventory.length) return;

//   const db = getOfflineDb();
//   for (const inv of remoteInventory) {
//     try {
//       await db
//         .insert(inventory)
//         .values(normalizeInventory(inv))
//         .onConflictDoUpdate({
//           target: inventory.id,
//           set: {
//             tenantId: sql`excluded.tenant_id`,
//             storeId: sql`excluded.store_id`,
//             productId: sql`excluded.product_id`,
//             variantId: sql`excluded.variant_id`,
//             quantity: sql`excluded.quantity`,
//             reservedQty: sql`excluded.reserved_qty`,
//             reorderPoint: sql`excluded.reorder_point`,
//             reorderQty: sql`excluded.reorder_qty`,
//             shelfLocation: sql`excluded.shelf_location`,
//             version: sql`excluded.version`,
//             syncStatus: "synced",
//             syncError: null,
//             updatedAt: sql`excluded.updated_at`,
//             lastSyncedAt: sql`excluded.last_synced_at`,
//           },
//         });
//     } catch (error) {
//       console.error(`Failed to upsert inventory ${inv.id}:`, error);
//     }
//   }
// }

// ============================================
// FILE: services/offline/repository.ts - Fix upsertInventory
// ============================================

export async function upsertInventory(remoteInventory: any[]) {
  if (!remoteInventory.length) return;

  const db = getOfflineDb();

  for (const inv of remoteInventory) {
    try {
      // First check if the product exists
      const productExists = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, inv.productId))
        .limit(1);

      // If product doesn't exist, skip this inventory item
      if (!productExists.length) {
        console.warn(
          `⚠️ Skipping inventory for product ${inv.productId} - product not found`,
        );
        continue;
      }

      await db
        .insert(inventory)
        .values({
          id: inv.id || `inv-${Date.now()}`,
          remoteId: inv.remoteId || null,
          tenantId: inv.tenantId || "default",
          storeId: inv.storeId,
          productId: inv.productId,
          variantId: inv.variantId || null,
          quantity: Number(inv.quantity ?? 0),
          reservedQty: Number(inv.reservedQty ?? 0),
          reorderPoint: Number(inv.reorderPoint ?? 10),
          reorderQty: Number(inv.reorderQty ?? 0),
          shelfLocation: inv.shelfLocation || null,
          version: Number(inv.version ?? 0),
          syncStatus: "synced",
          syncError: null,
          createdAt: inv.createdAt || new Date().toISOString(),
          updatedAt: inv.updatedAt || new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: inventory.id,
          set: {
            tenantId: sql`excluded.tenant_id`,
            storeId: sql`excluded.store_id`,
            productId: sql`excluded.product_id`,
            variantId: sql`excluded.variant_id`,
            quantity: sql`excluded.quantity`,
            reservedQty: sql`excluded.reserved_qty`,
            reorderPoint: sql`excluded.reorder_point`,
            reorderQty: sql`excluded.reorder_qty`,
            shelfLocation: sql`excluded.shelf_location`,
            version: sql`excluded.version`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: sql`excluded.last_synced_at`,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert inventory ${inv.id}:`, error);
    }
  }
}

export async function upsertCategories(remoteCategories: Category[]) {
  if (!remoteCategories.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();

  // Check if store_id column exists
  const tableInfo = await db.all<{ name: string }>(
    "PRAGMA table_info(categories)",
  );
  const hasStoreId = tableInfo.some((col) => col.name === "store_id");

  for (const category of remoteCategories) {
    try {
      const values: any = {
        id: category.id,
        remoteId: category.remoteId,
        tenantId: category.tenantId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        isActive: category.isActive ?? true,
        sortOrder: category.sortOrder ?? 0,
        syncStatus: "synced",
        syncError: null,
        createdAt: category.createdAt ?? now,
        updatedAt: category.updatedAt ?? now,
        lastSyncedAt: now,
      };

      // Only add storeId if the column exists
      if (hasStoreId && category.storeId) {
        values.storeId = category.storeId;
      }

      await db
        .insert(categories)
        .values(values)
        .onConflictDoUpdate({
          target: categories.id,
          set: {
            name: sql`excluded.name`,
            slug: sql`excluded.slug`,
            description: sql`excluded.description`,
            parentId: sql`excluded.parent_id`,
            isActive: sql`excluded.is_active`,
            sortOrder: sql`excluded.sort_order`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert category ${category.id}:`, error);
    }
  }
}

// ============================================
// BRANDS UPSERT
// ============================================

export async function upsertBrands(remoteBrands: any[]) {
  if (!remoteBrands.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const brand of remoteBrands) {
    try {
      await db
        .insert(brands)
        .values({
          id: brand.id,
          remoteId: brand.remoteId,
          tenantId: brand.tenantId,
          name: brand.name,
          description: brand.description,
          isActive: brand.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: brand.createdAt ?? now,
          updatedAt: brand.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: brands.id,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert brand ${brand.id}:`, error);
    }
  }
}

export async function upsertCustomers(remoteCustomers: Customer[]) {
  if (!remoteCustomers.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const customer of remoteCustomers) {
    try {
      await db
        .insert(customers)
        .values({
          id: customer.id,
          remoteId: customer.remoteId,
          tenantId: customer.tenantId,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          dateOfBirth: customer.dateOfBirth,
          gender: customer.gender,
          debtAmount: customer.debtAmount ?? 0,
          loyaltyPoints: customer.loyaltyPoints ?? 0,
          totalSpent: customer.totalSpent ?? 0,
          totalOrders: customer.totalOrders ?? 0,
          tier: customer.tier ?? "BRONZE",
          tierValidUntil: customer.tierValidUntil,
          isActive: customer.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: customer.createdAt ?? now,
          updatedAt: customer.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: customers.id,
          set: {
            code: sql`excluded.code`,
            name: sql`excluded.name`,
            phone: sql`excluded.phone`,
            email: sql`excluded.email`,
            address: sql`excluded.address`,
            dateOfBirth: sql`excluded.date_of_birth`,
            gender: sql`excluded.gender`,
            debtAmount: sql`excluded.debt_amount`,
            loyaltyPoints: sql`excluded.loyalty_points`,
            totalSpent: sql`excluded.total_spent`,
            totalOrders: sql`excluded.total_orders`,
            tier: sql`excluded.tier`,
            tierValidUntil: sql`excluded.tier_valid_until`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert customer ${customer.id}:`, error);
    }
  }
}

export async function upsertStores(remoteStores: Store[]) {
  if (!remoteStores.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const store of remoteStores) {
    try {
      await db
        .insert(stores)
        .values({
          id: store.id,
          remoteId: store.remoteId,
          tenantId: store.tenantId,
          code: store.code,
          name: store.name,
          address: store.address,
          phone: store.phone,
          email: store.email,
          taxNumber: store.taxNumber,
          isActive: store.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: store.createdAt ?? now,
          updatedAt: store.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: stores.id,
          set: {
            code: sql`excluded.code`,
            name: sql`excluded.name`,
            address: sql`excluded.address`,
            phone: sql`excluded.phone`,
            email: sql`excluded.email`,
            taxNumber: sql`excluded.tax_number`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert store ${store.id}:`, error);
    }
  }
}

export async function upsertSuppliers(remoteSuppliers: any[]) {
  if (!remoteSuppliers.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const supplier of remoteSuppliers) {
    try {
      await db
        .insert(suppliers)
        .values({
          id: supplier.id,
          remoteId: supplier.remoteId,
          tenantId: supplier.tenantId,
          storeId: supplier.storeId,
          code: supplier.code,
          name: supplier.name,
          contactName: supplier.contactName,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          taxNumber: supplier.taxNumber,
          paymentTerms: supplier.paymentTerms,
          creditLimit: supplier.creditLimit,
          currentBalance: supplier.currentBalance ?? 0,
          isActive: supplier.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: supplier.createdAt ?? now,
          updatedAt: supplier.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: suppliers.id,
          set: {
            code: sql`excluded.code`,
            name: sql`excluded.name`,
            contactName: sql`excluded.contact_name`,
            phone: sql`excluded.phone`,
            email: sql`excluded.email`,
            address: sql`excluded.address`,
            taxNumber: sql`excluded.tax_number`,
            paymentTerms: sql`excluded.payment_terms`,
            creditLimit: sql`excluded.credit_limit`,
            currentBalance: sql`excluded.current_balance`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert supplier ${supplier.id}:`, error);
    }
  }
}

export async function upsertSessions(remoteSessions: Session[]) {
  if (!remoteSessions.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const session of remoteSessions) {
    try {
      await db
        .insert(sessions)
        .values({
          id: session.id,
          remoteId: session.remoteId,
          tenantId: session.tenantId,
          storeId: session.storeId,
          registerId: session.registerId,
          userId: session.userId,
          status: session.status,
          openedAt: session.openedAt,
          closedAt: session.closedAt,
          openingBalance: session.openingBalance ?? 0,
          closingBalance: session.closingBalance,
          expectedBalance: session.expectedBalance,
          discrepancy: session.discrepancy,
          cashSales: session.cashSales ?? 0,
          cardSales: session.cardSales ?? 0,
          digitalSales: session.digitalSales ?? 0,
          notes: session.notes,
          syncStatus: "synced",
          syncError: null,
          createdAt: session.openedAt ?? now,
          updatedAt: session.closedAt ?? session.openedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: sessions.id,
          set: {
            status: sql`excluded.status`,
            closedAt: sql`excluded.closed_at`,
            closingBalance: sql`excluded.closing_balance`,
            expectedBalance: sql`excluded.expected_balance`,
            discrepancy: sql`excluded.discrepancy`,
            cashSales: sql`excluded.cash_sales`,
            cardSales: sql`excluded.card_sales`,
            digitalSales: sql`excluded.digital_sales`,
            notes: sql`excluded.notes`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert session ${session.id}:`, error);
    }
  }
}

export async function upsertOrders(
  remoteOrders: (Order & Record<string, any>)[],
) {
  if (!remoteOrders.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const order of remoteOrders) {
    try {
      await db
        .insert(orders)
        .values({
          id: order.id,
          remoteId: order.remoteId,
          tenantId: order.tenantId,
          storeId: order.storeId,
          registerId: order.registerId,
          userId: order.userId ?? "",
          customerId: order.customerId,
          sessionId: order.sessionId,
          orderNumber: order.orderNumber,
          status: order.status ?? "COMPLETED",
          paymentStatus: order.paymentStatus ?? "PAID",
          paymentMethod: order.paymentMethod ?? "CASH",
          subTotal: Number(order.subTotal ?? order.grandTotal ?? 0),
          taxAmount: Number(order.taxAmount ?? 0),
          discountAmount: Number(order.discountAmount ?? 0),
          grandTotal: Number(order.grandTotal ?? 0),
          paidAmount: Number(order.paidAmount ?? 0),
          changeAmount: Number(order.changeAmount ?? 0),
          paymentBreakdown: order.paymentBreakdown ?? null,
          syncStatus: "synced",
          syncError: null,
          createdAt: order.createdAt ?? now,
          updatedAt: order.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: orders.id,
          set: {
            status: sql`excluded.status`,
            paymentStatus: sql`excluded.payment_status`,
            grandTotal: sql`excluded.grand_total`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });

      // Insert order items
      if (Array.isArray(order.items)) {
        for (const item of order.items as (OrderItem & Record<string, any>)[]) {
          try {
            await db
              .insert(orderItems)
              .values({
                id: item.id ?? createLocalId("item"),
                orderId: order.id,
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName ?? item.product?.name ?? null,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice ?? item.price ?? 0),
                discountAmount: Number(item.discountAmount ?? 0),
                subTotal: Number(
                  item.subTotal ??
                    item.quantity * Number(item.unitPrice ?? item.price ?? 0),
                ),
                createdAt: item.createdAt ?? now,
              })
              .onConflictDoUpdate({
                target: orderItems.id,
                set: {
                  quantity: sql`excluded.quantity`,
                  unitPrice: sql`excluded.unit_price`,
                  subTotal: sql`excluded.sub_total`,
                },
              });
          } catch (error) {
            console.error(`Failed to upsert order item ${item.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to upsert order ${order.id}:`, error);
    }
  }
}

export async function upsertPriceHistory(remotePriceHistory: any[]) {
  if (!remotePriceHistory.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const ph of remotePriceHistory) {
    try {
      await db
        .insert(priceHistory)
        .values({
          id: ph.id,
          remoteId: ph.remoteId,
          tenantId: ph.tenantId,
          productId: ph.productId,
          variantId: ph.variantId,
          oldPrice: Number(ph.oldPrice ?? 0),
          newPrice: Number(ph.newPrice ?? 0),
          changedBy: ph.changedBy,
          reason: ph.reason,
          syncStatus: "synced",
          syncError: null,
          createdAt: ph.createdAt ?? now,
          updatedAt: ph.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: priceHistory.id,
          set: {
            oldPrice: sql`excluded.old_price`,
            newPrice: sql`excluded.new_price`,
            changedBy: sql`excluded.changed_by`,
            reason: sql`excluded.reason`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert price history ${ph.id}:`, error);
    }
  }
}

// ============================================
// PROMOTIONS UPSERT
// ============================================

export async function upsertPromotions(remotePromotions: any[]) {
  if (!remotePromotions.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const promotion of remotePromotions) {
    try {
      await db
        .insert(promotions)
        .values({
          id: promotion.id,
          remoteId: promotion.remoteId,
          tenantId: promotion.tenantId,
          code: promotion.code,
          name: promotion.name,
          description: promotion.description,
          discountType: promotion.discountType,
          discountValue: Number(promotion.discountValue ?? 0),
          minPurchase: promotion.minPurchase
            ? Number(promotion.minPurchase)
            : null,
          startDate: promotion.startDate,
          endDate: promotion.endDate,
          usageLimit: promotion.usageLimit,
          perUserLimit: promotion.perUserLimit,
          isActive: promotion.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: promotion.createdAt ?? now,
          updatedAt: promotion.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: promotions.id,
          set: {
            code: sql`excluded.code`,
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            discountType: sql`excluded.discount_type`,
            discountValue: sql`excluded.discount_value`,
            minPurchase: sql`excluded.min_purchase`,
            startDate: sql`excluded.start_date`,
            endDate: sql`excluded.end_date`,
            usageLimit: sql`excluded.usage_limit`,
            perUserLimit: sql`excluded.per_user_limit`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert promotion ${promotion.id}:`, error);
    }
  }
}

// ============================================
// TAX RATES UPSERT
// ============================================

export async function upsertTaxRates(remoteTaxRates: any[]) {
  if (!remoteTaxRates.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const taxRate of remoteTaxRates) {
    try {
      await db
        .insert(taxRates)
        .values({
          id: taxRate.id,
          remoteId: taxRate.remoteId,
          tenantId: taxRate.tenantId,
          name: taxRate.name,
          rate: Number(taxRate.rate ?? 0),
          isCompound: taxRate.isCompound ?? false,
          appliesTo: taxRate.appliesTo ?? [],
          validFrom: taxRate.validFrom ?? now,
          validTo: taxRate.validTo,
          isActive: taxRate.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: taxRate.createdAt ?? now,
          updatedAt: taxRate.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: taxRates.id,
          set: {
            name: sql`excluded.name`,
            rate: sql`excluded.rate`,
            isCompound: sql`excluded.is_compound`,
            appliesTo: sql`excluded.applies_to`,
            validFrom: sql`excluded.valid_from`,
            validTo: sql`excluded.valid_to`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert tax rate ${taxRate.id}:`, error);
    }
  }
}

// ============================================
// EXPENSES UPSERT
// ============================================

export async function upsertExpenses(remoteExpenses: any[]) {
  if (!remoteExpenses.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const expense of remoteExpenses) {
    try {
      await db
        .insert(expenses)
        .values({
          id: expense.id,
          remoteId: expense.remoteId,
          tenantId: expense.tenantId,
          storeId: expense.storeId,
          categoryId: expense.categoryId,
          amount: Number(expense.amount ?? 0),
          description: expense.description,
          receiptUrl: expense.receiptUrl,
          expenseDate: expense.expenseDate ?? now,
          createdById: expense.createdById,
          syncStatus: "synced",
          syncError: null,
          createdAt: expense.createdAt ?? now,
          updatedAt: expense.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: expenses.id,
          set: {
            storeId: sql`excluded.store_id`,
            categoryId: sql`excluded.category_id`,
            amount: sql`excluded.amount`,
            description: sql`excluded.description`,
            receiptUrl: sql`excluded.receipt_url`,
            expenseDate: sql`excluded.expense_date`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert expense ${expense.id}:`, error);
    }
  }
}

// ============================================
// EXPENSE CATEGORIES UPSERT
// ============================================

export async function upsertExpenseCategories(remoteExpenseCategories: any[]) {
  if (!remoteExpenseCategories.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const category of remoteExpenseCategories) {
    try {
      await db
        .insert(expenseCategories)
        .values({
          id: category.id,
          remoteId: category.remoteId,
          tenantId: category.tenantId,
          name: category.name,
          description: category.description,
          isActive: category.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: category.createdAt ?? now,
          updatedAt: category.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: expenseCategories.id,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert expense category ${category.id}:`, error);
    }
  }
}

// ============================================
// CASH REGISTERS UPSERT
// ============================================

export async function upsertCashRegisters(remoteCashRegisters: any[]) {
  if (!remoteCashRegisters.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const register of remoteCashRegisters) {
    try {
      await db
        .insert(cashRegisters)
        .values({
          id: register.id,
          remoteId: register.remoteId,
          tenantId: register.tenantId,
          storeId: register.storeId,
          name: register.name,
          status: register.status ?? "CLOSED",
          syncStatus: "synced",
          syncError: null,
          createdAt: register.createdAt ?? now,
          updatedAt: register.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: cashRegisters.id,
          set: {
            storeId: sql`excluded.store_id`,
            name: sql`excluded.name`,
            status: sql`excluded.status`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert cash register ${register.id}:`, error);
    }
  }
}

// ============================================
// GIFT CARDS UPSERT
// ============================================

export async function upsertGiftCards(remoteGiftCards: any[]) {
  if (!remoteGiftCards.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const giftCard of remoteGiftCards) {
    try {
      await db
        .insert(giftCards)
        .values({
          id: giftCard.id,
          remoteId: giftCard.remoteId,
          tenantId: giftCard.tenantId,
          customerId: giftCard.customerId,
          cardNumber: giftCard.cardNumber,
          pinCode: giftCard.pinCode,
          initialAmount: Number(giftCard.initialAmount ?? 0),
          currentBalance: Number(giftCard.currentBalance ?? 0),
          expiresAt: giftCard.expiresAt,
          status: giftCard.status ?? "ACTIVE",
          syncStatus: "synced",
          syncError: null,
          createdAt: giftCard.createdAt ?? now,
          updatedAt: giftCard.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: giftCards.id,
          set: {
            customerId: sql`excluded.customer_id`,
            cardNumber: sql`excluded.card_number`,
            pinCode: sql`excluded.pin_code`,
            initialAmount: sql`excluded.initial_amount`,
            currentBalance: sql`excluded.current_balance`,
            expiresAt: sql`excluded.expires_at`,
            status: sql`excluded.status`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert gift card ${giftCard.id}:`, error);
    }
  }
}

// ============================================
// WALLETS UPSERT
// ============================================

export async function upsertWallets(remoteWallets: any[]) {
  if (!remoteWallets.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const wallet of remoteWallets) {
    try {
      await db
        .insert(wallets)
        .values({
          id: wallet.id,
          remoteId: wallet.remoteId,
          tenantId: wallet.tenantId,
          customerId: wallet.customerId,
          balance: Number(wallet.balance ?? 0),
          syncStatus: "synced",
          syncError: null,
          createdAt: wallet.createdAt ?? now,
          updatedAt: wallet.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: wallets.id,
          set: {
            customerId: sql`excluded.customer_id`,
            balance: sql`excluded.balance`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert wallet ${wallet.id}:`, error);
    }
  }
}

// ============================================
// SUPPLIER PAYMENTS UPSERT
// ============================================

export async function upsertSupplierPayments(remoteSupplierPayments: any[]) {
  if (!remoteSupplierPayments.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const payment of remoteSupplierPayments) {
    try {
      await db
        .insert(supplierPayments)
        .values({
          id: payment.id,
          remoteId: payment.remoteId,
          tenantId: payment.tenantId,
          supplierId: payment.supplierId,
          amount: Number(payment.amount ?? 0),
          paymentMethod: payment.paymentMethod,
          referenceNumber: payment.referenceNumber,
          note: payment.note,
          paidAt: payment.paidAt ?? now,
          syncStatus: "synced",
          syncError: null,
          createdAt: payment.createdAt ?? now,
          updatedAt: payment.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: supplierPayments.id,
          set: {
            supplierId: sql`excluded.supplier_id`,
            amount: sql`excluded.amount`,
            paymentMethod: sql`excluded.payment_method`,
            referenceNumber: sql`excluded.reference_number`,
            note: sql`excluded.note`,
            paidAt: sql`excluded.paid_at`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert supplier payment ${payment.id}:`, error);
    }
  }
}

// ============================================
// PURCHASE ORDERS UPSERT
// ============================================

export async function upsertPurchaseOrders(remotePurchaseOrders: any[]) {
  if (!remotePurchaseOrders.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const po of remotePurchaseOrders) {
    try {
      await db
        .insert(purchaseOrders)
        .values({
          id: po.id,
          remoteId: po.remoteId,
          tenantId: po.tenantId,
          supplierId: po.supplierId,
          poNumber: po.poNumber,
          status: po.status ?? "DRAFT",
          orderDate: po.orderDate ?? now,
          expectedDate: po.expectedDate,
          receivedDate: po.receivedDate,
          subTotal: Number(po.subTotal ?? 0),
          taxAmount: Number(po.taxAmount ?? 0),
          grandTotal: Number(po.grandTotal ?? 0),
          createdById: po.createdById,
          notes: po.notes,
          syncStatus: "synced",
          syncError: null,
          createdAt: po.createdAt ?? now,
          updatedAt: po.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: purchaseOrders.id,
          set: {
            supplierId: sql`excluded.supplier_id`,
            status: sql`excluded.status`,
            expectedDate: sql`excluded.expected_date`,
            receivedDate: sql`excluded.received_date`,
            subTotal: sql`excluded.sub_total`,
            taxAmount: sql`excluded.tax_amount`,
            grandTotal: sql`excluded.grand_total`,
            notes: sql`excluded.notes`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });

      // Insert purchase order items
      if (Array.isArray(po.items)) {
        for (const item of po.items) {
          try {
            await db
              .insert(purchaseOrderItems)
              .values({
                id: item.id ?? createLocalId("poi"),
                remoteId: item.remoteId,
                tenantId: po.tenantId,
                poId: po.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: Number(item.quantity ?? 0),
                unitCost: Number(item.unitCost ?? 0),
                totalCost: Number(item.totalCost ?? 0),
                receivedQuantity: Number(item.receivedQuantity ?? 0),
                syncStatus: "synced",
                syncError: null,
                createdAt: item.createdAt ?? now,
                updatedAt: item.updatedAt ?? now,
                lastSyncedAt: now,
              })
              .onConflictDoUpdate({
                target: purchaseOrderItems.id,
                set: {
                  quantity: sql`excluded.quantity`,
                  unitCost: sql`excluded.unit_cost`,
                  totalCost: sql`excluded.total_cost`,
                  receivedQuantity: sql`excluded.received_quantity`,
                  syncStatus: "synced",
                  syncError: null,
                  updatedAt: sql`excluded.updated_at`,
                  lastSyncedAt: now,
                },
              });
          } catch (error) {
            console.error(
              `Failed to upsert purchase order item ${item.id}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error(`Failed to upsert purchase order ${po.id}:`, error);
    }
  }
}

// ============================================
// STOCK TRANSFERS UPSERT
// ============================================

export async function upsertStockTransfers(remoteStockTransfers: any[]) {
  if (!remoteStockTransfers.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const transfer of remoteStockTransfers) {
    try {
      await db
        .insert(stockTransfers)
        .values({
          id: transfer.id,
          remoteId: transfer.remoteId,
          tenantId: transfer.tenantId,
          transferNumber: transfer.transferNumber,
          fromStoreId: transfer.fromStoreId,
          toStoreId: transfer.toStoreId,
          status: transfer.status ?? "PENDING",
          requestedById: transfer.requestedById,
          approvedById: transfer.approvedById,
          requestedAt: transfer.requestedAt ?? now,
          completedAt: transfer.completedAt,
          notes: transfer.notes,
          syncStatus: "synced",
          syncError: null,
          createdAt: transfer.createdAt ?? now,
          updatedAt: transfer.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: stockTransfers.id,
          set: {
            fromStoreId: sql`excluded.from_store_id`,
            toStoreId: sql`excluded.to_store_id`,
            status: sql`excluded.status`,
            approvedById: sql`excluded.approved_by_id`,
            completedAt: sql`excluded.completed_at`,
            notes: sql`excluded.notes`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });

      // Insert stock transfer items
      if (Array.isArray(transfer.items)) {
        for (const item of transfer.items) {
          try {
            await db
              .insert(stockTransferItems)
              .values({
                id: item.id ?? createLocalId("sti"),
                remoteId: item.remoteId,
                tenantId: transfer.tenantId,
                transferId: transfer.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: Number(item.quantity ?? 0),
                receivedQuantity: item.receivedQuantity
                  ? Number(item.receivedQuantity)
                  : null,
                syncStatus: "synced",
                syncError: null,
                createdAt: item.createdAt ?? now,
                updatedAt: item.updatedAt ?? now,
                lastSyncedAt: now,
              })
              .onConflictDoUpdate({
                target: stockTransferItems.id,
                set: {
                  quantity: sql`excluded.quantity`,
                  receivedQuantity: sql`excluded.received_quantity`,
                  syncStatus: "synced",
                  syncError: null,
                  updatedAt: sql`excluded.updated_at`,
                  lastSyncedAt: now,
                },
              });
          } catch (error) {
            console.error(
              `Failed to upsert stock transfer item ${item.id}:`,
              error,
            );
          }
        }
      }
    } catch (error) {
      console.error(`Failed to upsert stock transfer ${transfer.id}:`, error);
    }
  }
}

// ============================================
// WEBHOOKS UPSERT
// ============================================

export async function upsertWebhooks(remoteWebhooks: any[]) {
  if (!remoteWebhooks.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const webhook of remoteWebhooks) {
    try {
      await db
        .insert(webhooks)
        .values({
          id: webhook.id,
          remoteId: webhook.remoteId,
          tenantId: webhook.tenantId,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events ?? [],
          secret: webhook.secret,
          isActive: webhook.isActive ?? true,
          lastTriggeredAt: webhook.lastTriggeredAt,
          lastError: webhook.lastError,
          syncStatus: "synced",
          syncError: null,
          createdAt: webhook.createdAt ?? now,
          updatedAt: webhook.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: webhooks.id,
          set: {
            name: sql`excluded.name`,
            url: sql`excluded.url`,
            events: sql`excluded.events`,
            secret: sql`excluded.secret`,
            isActive: sql`excluded.is_active`,
            lastTriggeredAt: sql`excluded.last_triggered_at`,
            lastError: sql`excluded.last_error`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert webhook ${webhook.id}:`, error);
    }
  }
}

// ============================================
// NOTIFICATIONS UPSERT
// ============================================

export async function upsertNotifications(remoteNotifications: any[]) {
  if (!remoteNotifications.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const notification of remoteNotifications) {
    try {
      await db
        .insert(notifications)
        .values({
          id: notification.id,
          remoteId: notification.remoteId,
          tenantId: notification.tenantId,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: notification.isRead ?? false,
          readAt: notification.readAt,
          metadata: notification.metadata,
          syncStatus: "synced",
          syncError: null,
          createdAt: notification.createdAt ?? now,
          updatedAt: notification.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: notifications.id,
          set: {
            userId: sql`excluded.user_id`,
            type: sql`excluded.type`,
            title: sql`excluded.title`,
            message: sql`excluded.message`,
            isRead: sql`excluded.is_read`,
            readAt: sql`excluded.read_at`,
            metadata: sql`excluded.metadata`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert notification ${notification.id}:`, error);
    }
  }
}

// ============================================
// TENANT STORE SETTINGS UPSERT
// ============================================

export async function upsertTenantStoreSettings(remoteSettings: any[]) {
  if (!remoteSettings.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const setting of remoteSettings) {
    try {
      await db
        .insert(tenantStoreSettings)
        .values({
          id: setting.id,
          remoteId: setting.remoteId,
          tenantId: setting.tenantId,
          storeId: setting.storeId,
          settingKey: setting.settingKey,
          settingValue: setting.settingValue,
          description: setting.description,
          updatedById: setting.updatedById,
          syncStatus: "synced",
          syncError: null,
          createdAt: setting.createdAt ?? now,
          updatedAt: setting.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: tenantStoreSettings.id,
          set: {
            storeId: sql`excluded.store_id`,
            settingKey: sql`excluded.setting_key`,
            settingValue: sql`excluded.setting_value`,
            description: sql`excluded.description`,
            updatedById: sql`excluded.updated_by_id`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(
        `Failed to upsert tenant store setting ${setting.id}:`,
        error,
      );
    }
  }
}

export async function upsertGenericRecords<T extends { id: string }>(
  entity: string,
  records: T[],
) {
  if (!records.length) return;
  const now = new Date().toISOString();
  const db = getOfflineDb();

  for (const record of records) {
    try {
      await db
        .insert(genericRecords)
        .values({
          id: record.id,
          remoteId: (record as any).remoteId,
          entity,
          data: record,
          isActive: (record as any).isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: (record as any).createdAt ?? now,
          updatedAt: (record as any).updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: genericRecords.id,
          set: {
            data: sql`excluded.data`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert generic record ${record.id}:`, error);
    }
  }
}

// ============================================
// GET LOCAL FUNCTIONS (Read from SQLite)
// ============================================

export async function getLocalProducts(storeId?: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        storeId
          ? or(eq(products.storeId, storeId), sql`${products.storeId} IS NULL`)
          : undefined,
      ),
    );

  return rows.map((row) => toProduct(row));
}

export async function getLocalProductById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return row ? toProduct(row) : undefined;
}

export async function getLocalProductByBarcode(barcode: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.barcode, barcode), eq(products.isActive, true)))
    .limit(1);
  return row ? toProduct(row) : undefined;
}

export async function getLocalProductBySku(sku: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.sku, sku), eq(products.isActive, true)))
    .limit(1);
  return row ? toProduct(row) : undefined;
}

// ============================================
// PRODUCT VARIANT FUNCTIONS
// ============================================

export async function getLocalVariants(productId?: string) {
  const db = getOfflineDb();
  let query = db.select().from(productVariants).$dynamic();

  if (productId) {
    query = query.where(eq(productVariants.productId, productId));
  }

  const rows = await query.where(eq(productVariants.isActive, true));
  return rows.map((row) => toProductVariant(row));
}

export async function getLocalVariantById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, id))
    .limit(1);
  return row ? toProductVariant(row) : undefined;
}

export async function getLocalVariantByBarcode(barcode: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(productVariants)
    .where(
      and(
        eq(productVariants.barcode, barcode),
        eq(productVariants.isActive, true),
      ),
    )
    .limit(1);
  return row ? toProductVariant(row) : undefined;
}

// ============================================
// INVENTORY FUNCTIONS
// ============================================

export async function getLocalInventory(storeId?: string) {
  const db = getOfflineDb();
  let query = db.select().from(inventory).$dynamic();

  const conditions = [];
  if (storeId) {
    conditions.push(eq(inventory.storeId, storeId));
  }
  if (conditions.length) {
    query = query.where(and(...conditions));
  }

  const rows = await query;
  return rows.map((row) => toInventoryItem(row));
}

export async function getLocalInventoryByProduct(
  productId: string,
  storeId?: string,
) {
  const db = getOfflineDb();
  let query = db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .$dynamic();

  if (storeId) {
    query = query.where(eq(inventory.storeId, storeId));
  }

  const rows = await query;
  return rows.map((row) => toInventoryItem(row));
}

export async function getLocalInventoryByVariant(
  variantId: string,
  storeId?: string,
) {
  const db = getOfflineDb();
  let query = db
    .select()
    .from(inventory)
    .where(eq(inventory.variantId, variantId))
    .$dynamic();

  if (storeId) {
    query = query.where(eq(inventory.storeId, storeId));
  }

  const rows = await query;
  return rows.map((row) => toInventoryItem(row));
}

export async function getLocalInventoryItem(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(inventory)
    .where(eq(inventory.id, id))
    .limit(1);
  return row ? toInventoryItem(row) : undefined;
}

// ============================================
// CATEGORY FUNCTIONS
// ============================================

export async function getLocalCategories(storeId?: string | null) {
  const db = getOfflineDb();

  // Check if store_id column exists
  const tableInfo = await db.all<{ name: string }>(
    "PRAGMA table_info(categories)",
  );
  const hasStoreId = tableInfo.some((col) => col.name === "store_id");

  let query = db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .$dynamic();

  if (hasStoreId && storeId) {
    query = query.where(
      or(eq(categories.storeId, storeId), sql`${categories.storeId} IS NULL`),
    );
  }

  const rows = await query;
  return rows.map((row) => toCategory(row));
}

export async function getLocalCategoryById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row ? toCategory(row) : undefined;
}

export async function getLocalCategoryByName(name: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.name, name), eq(categories.isActive, true)))
    .limit(1);
  return row ? toCategory(row) : undefined;
}

// ============================================
// CUSTOMER FUNCTIONS
// ============================================

export async function getLocalCustomers() {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(customers)
    .where(eq(customers.isActive, true));

  return rows.map((row) => toCustomer(row));
}

export async function getLocalCustomerById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return row ? toCustomer(row) : undefined;
}

export async function getLocalCustomerByPhone(phone: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.phone, phone), eq(customers.isActive, true)))
    .limit(1);
  return row ? toCustomer(row) : undefined;
}

export async function getLocalCustomerByCode(code: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.code, code), eq(customers.isActive, true)))
    .limit(1);
  return row ? toCustomer(row) : undefined;
}

// by me staff
// ============================================
// FILE: services/offline/repository.ts
// ============================================

// Add this function after the stores functions or in the appropriate section:

// ============================================
// STAFF FUNCTIONS
// ============================================

export async function getLocalStaff(
  storeId?: string,
  isActive?: boolean,
  role?: string,
) {
  const db = getOfflineDb();
  let query = db.select().from(staff).orderBy(desc(staff.createdAt)).$dynamic();

  if (isActive !== undefined) {
    query = query.where(eq(staff.isActive, isActive));
  }
  if (storeId) {
    query = query.where(eq(staff.storeId, storeId));
  }
  if (role) {
    query = query.where(eq(staff.role, role));
  }

  const rows = await query;
  return rows.map((row) => toStaff(row));
}

export async function getLocalStaffById(id: string) {
  const db = getOfflineDb();
  const [row] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
  return row ? toStaff(row) : undefined;
}

export async function getLocalStaffByUsername(username: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(staff)
    .where(eq(staff.username, username))
    .limit(1);
  return row ? toStaff(row) : undefined;
}

// ============================================
// TO STAFF FUNCTION
// ============================================

function toStaff(staff: any): any {
  return {
    id: staff.id,
    tenantId: staff.tenantId,
    storeId: staff.storeId,
    username: staff.username,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    permissions: staff.permissions || [],
    isActive: staff.isActive,
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  };
}

// ============================================
// CREATE OFFLINE STAFF
// ============================================

export async function createOfflineStaff(payload: any) {
  const now = new Date().toISOString();
  const id = createLocalId("stf");
  const db = getOfflineDb();
  const sqlite = getSqliteDatabase();

  const cleanPayload = {
    ...payload,
    tenantId: payload.tenantId || "default",
    username:
      payload.username || `staff-${Date.now().toString(36).toUpperCase()}`,
    name: payload.name || "Unknown Staff",
    email: payload.email || null,
    role: payload.role || "CASHIER",
    permissions: payload.permissions || [],
    storeId: payload.storeId || null,
    isActive: payload.isActive ?? true,
  };

  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `INSERT INTO staff (
        id, tenant_id, store_id, username, email, name, role, permissions,
        is_active, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanPayload.tenantId,
        cleanPayload.storeId,
        cleanPayload.username,
        cleanPayload.email,
        cleanPayload.name,
        cleanPayload.role,
        JSON.stringify(cleanPayload.permissions),
        cleanPayload.isActive ? 1 : 0,
        "pending",
        now,
        now,
      ],
    );

    // Enqueue sync mutation
    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "staff",
        id,
        "create",
        "/api/tenant/staff",
        "POST",
        JSON.stringify(cleanPayload),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  const [row] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);

  return toStaff(row);
}

// ============================================
// UPDATE OFFLINE STAFF
// ============================================

export async function updateOfflineStaff(id: string, payload: any) {
  const now = new Date().toISOString();
  const db = getOfflineDb();

  await db
    .update(staff)
    .set({
      ...payload,
      updatedAt: now,
      syncStatus: "pending",
    })
    .where(eq(staff.id, id));

  // Enqueue sync mutation
  const sqlite = getSqliteDatabase();
  sqlite.runSync(
    `INSERT INTO sync_outbox (
      id, entity, entity_id, operation, endpoint, method, payload, status,
      attempts, next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      createLocalId("outbox"),
      "staff",
      id,
      "update",
      `/api/tenant/staff/${id}`,
      "PUT",
      JSON.stringify(payload),
      "pending",
      0,
      now,
      now,
      now,
    ],
  );

  const [row] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);

  return toStaff(row);
}

// ============================================
// DELETE OFFLINE STAFF
// ============================================

export async function deleteOfflineStaff(id: string) {
  const now = new Date().toISOString();
  const db = getOfflineDb();

  await db
    .update(staff)
    .set({
      isActive: false,
      syncStatus: "pending",
      updatedAt: now,
    })
    .where(eq(staff.id, id));

  // Enqueue sync mutation
  const sqlite = getSqliteDatabase();
  sqlite.runSync(
    `INSERT INTO sync_outbox (
      id, entity, entity_id, operation, endpoint, method, payload, status,
      attempts, next_attempt_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      createLocalId("outbox"),
      "staff",
      id,
      "delete",
      `/api/tenant/staff/${id}`,
      "DELETE",
      JSON.stringify({}),
      "pending",
      0,
      now,
      now,
      now,
    ],
  );

  return { success: true };
}

// ============================================
// STORE FUNCTIONS
// ============================================

export async function getLocalStores() {
  const db = getOfflineDb();
  const rows = await db.select().from(stores).where(eq(stores.isActive, true));
  return rows.map((row) => toStore(row));
}

export async function getLocalStoreById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);
  return row ? toStore(row) : undefined;
}

export async function getLocalStoreByCode(code: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.code, code), eq(stores.isActive, true)))
    .limit(1);
  return row ? toStore(row) : undefined;
}

// ============================================
// SESSION FUNCTIONS
// ============================================

export async function getLocalSessions(storeId?: string, status?: string) {
  const db = getOfflineDb();
  let query = db.select().from(sessions).$dynamic();

  const conditions = [];
  if (storeId) conditions.push(eq(sessions.storeId, storeId));
  if (status) conditions.push(eq(sessions.status, status));
  if (conditions.length) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(desc(sessions.createdAt));
  return rows.map((row) => toSession(row));
}

export async function getLocalActiveSession(userId: string, storeId?: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, "OPEN"),
        storeId
          ? or(eq(sessions.storeId, storeId), sql`${sessions.storeId} IS NULL`)
          : undefined,
      ),
    )
    .limit(1);

  return row ? toSession(row) : undefined;
}

export async function getLocalSessionById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);
  return row ? toSession(row) : undefined;
}

export async function openOfflineSession(payload: any) {
  const db = getOfflineDb();
  const now = new Date().toISOString();

  const newSession = {
    id: `sess-${Date.now()}`,
    userId: payload.userId,
    tenantId: payload.tenantId || "default",
    storeId: payload.storeId || null,
    registerId: null,
    status: "OPEN" as const,
    openedAt: now,
    closedAt: null,
    openingBalance: Number(payload.openingBalance || 0),
    closingBalance: null,
    expectedBalance: null,
    discrepancy: null,
    cashSales: 0,
    cardSales: 0,
    digitalSales: 0,
    notes: payload.notes || null,
    syncStatus: "pending" as const,
    syncError: null,
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: null,
  };

  await db.insert(sessions).values(newSession);
  return toSession(newSession as any);
}

export async function closeOfflineSession(sessionId: string, data: any) {
  const db = getOfflineDb();
  const now = new Date().toISOString();

  await db
    .update(sessions)
    .set({
      status: "CLOSED",
      closedAt: now,
      closingBalance: Number(data.closingBalance ?? 0),
      expectedBalance: Number(data.expectedBalance ?? 0),
      discrepancy: Number(data.discrepancy ?? 0),
      cashSales: Number(data.cashSales ?? 0),
      cardSales: Number(data.cardSales ?? 0),
      digitalSales: Number(data.digitalSales ?? 0),
      notes: data.notes || null,
      syncStatus: "pending",
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId));

  const [updated] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  return updated ? toSession(updated) : undefined;
}

// ============================================
// ORDER FUNCTIONS
// ============================================

export async function getLocalOrders(storeId?: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(orders)
    .where(storeId ? eq(orders.storeId, storeId) : undefined);

  return Promise.all(rows.map((order) => toOrder(order)));
}

export async function getLocalOrderById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  return row ? toOrder(row) : undefined;
}

export async function getLocalOrdersByCustomer(customerId: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId));

  return Promise.all(rows.map((order) => toOrder(order)));
}

export async function getLocalOrdersBySession(sessionId: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.sessionId, sessionId));

  return Promise.all(rows.map((order) => toOrder(order)));
}

// update by me
// ============================================
// FILE: services/offline/repository.ts
// ============================================

// ... (imports and other code)

// ============================================
// CREATE OFFLINE FUNCTIONS (Push to Server later)
// ============================================

// export async function createOfflineOrder(
//   payload: CreateOrderPayload,
// ): Promise<Order> {
//   const db = getOfflineDb();
//   const sqlite = getSqliteDatabase();
//   const now = new Date().toISOString();
//   const orderId = createLocalId("ord");

//   // Ensure all required fields have proper values
//   const cleanPayload = {
//     ...payload,
//     tenantId: payload.tenantId || "default",
//     subTotal: Number(payload.subTotal) || 0,
//     taxAmount: Number(payload.taxAmount) || 0,
//     discountAmount: Number(payload.discountAmount) || 0,
//     grandTotal: Number(payload.grandTotal) || 0,
//     paidAmount: Number(payload.paidAmount) || 0,
//     changeAmount: Number(payload.changeAmount) || 0,
//     items: (payload.items || []).map((item: any) => ({
//       ...item,
//       productId: item.productId || "unknown",
//       quantity: Number(item.quantity) || 0,
//       unitPrice: Number(item.unitPrice) || 0,
//       subTotal: Number(item.subTotal) || 0,
//       discountAmount: Number(item.discountAmount) || 0,
//     })),
//   };

//   // Validate required fields
//   if (!cleanPayload.userId) {
//     throw new Error("userId is required to create an order");
//   }
//   if (!cleanPayload.storeId) {
//     throw new Error("storeId is required to create an order");
//   }
//   if (!cleanPayload.sessionId) {
//     throw new Error("sessionId is required to create an order");
//   }

//   sqlite.withTransactionSync(() => {
//     // Insert order
//     sqlite.runSync(
//       `INSERT INTO orders (
//         id, tenant_id, store_id, register_id, user_id, customer_id, session_id,
//         status, payment_status, payment_method, sub_total, tax_amount,
//         discount_amount, grand_total, paid_amount, change_amount,
//         payment_breakdown, sync_status, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         orderId,
//         cleanPayload.tenantId,
//         cleanPayload.storeId,
//         cleanPayload.registerId || null,
//         cleanPayload.userId,
//         cleanPayload.customerId || null,
//         cleanPayload.sessionId,
//         "COMPLETED",
//         cleanPayload.paymentStatus || "PAID",
//         cleanPayload.paymentMethod || "CASH",
//         cleanPayload.subTotal,
//         cleanPayload.taxAmount,
//         cleanPayload.discountAmount,
//         cleanPayload.grandTotal,
//         cleanPayload.paidAmount,
//         cleanPayload.changeAmount,
//         JSON.stringify(cleanPayload.paymentBreakdown || []),
//         "pending",
//         now,
//         now,
//       ],
//     );

//     // Insert order items
//     for (const item of cleanPayload.items) {
//       const itemId = createLocalId("item");
//       sqlite.runSync(
//         `INSERT INTO order_items (
//           id, order_id, product_id, variant_id, product_name, quantity, unit_price,
//           discount_amount, sub_total, created_at
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           itemId,
//           orderId,
//           item.productId,
//           item.variantId || null,
//           item.productName || null,
//           item.quantity,
//           item.unitPrice,
//           item.discountAmount || 0,
//           item.subTotal,
//           now,
//         ],
//       );

//       // Update inventory quantity
//       const variantCondition = item.variantId
//         ? `AND variant_id = '${item.variantId}'`
//         : `AND variant_id IS NULL`;

//       sqlite.runSync(
//         `UPDATE inventory SET quantity = MAX(quantity - ?, 0), updated_at = ?
//          WHERE product_id = ? AND store_id = ? ${variantCondition}`,
//         [item.quantity, now, item.productId, cleanPayload.storeId],
//       );
//     }

//     // Enqueue sync mutation
//     sqlite.runSync(
//       `INSERT INTO sync_outbox (
//         id, entity, entity_id, operation, endpoint, method, payload, status,
//         attempts, next_attempt_at, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         createLocalId("outbox"),
//         "orders",
//         orderId,
//         "create",
//         "/api/tenant/orders",
//         "POST",
//         JSON.stringify(cleanPayload),
//         "pending",
//         0,
//         now,
//         now,
//         now,
//       ],
//     );
//   });

//   // Fetch the created order with items
//   const [created] = await db
//     .select()
//     .from(orders)
//     .where(eq(orders.id, orderId))
//     .limit(1);

//   const items = await db
//     .select()
//     .from(orderItems)
//     .where(eq(orderItems.orderId, orderId));

//   return {
//     id: created.id,
//     grandTotal: created.grandTotal,
//     status: created.status as Order["status"],
//     createdAt: created.createdAt,
//     subTotal: created.subTotal,
//     taxAmount: created.taxAmount,
//     discountAmount: created.discountAmount,
//     paidAmount: created.paidAmount,
//     changeAmount: created.changeAmount,
//     paymentMethod: created.paymentMethod as Order["paymentMethod"],
//     paymentStatus: created.paymentStatus as Order["paymentStatus"],
//     paymentBreakdown: parsePaymentBreakdown(
//       created.paymentBreakdown ?? cleanPayload.paymentBreakdown,
//     ),
//     customerId: created.customerId ?? undefined,
//     storeId: created.storeId ?? undefined,
//     userId: created.userId,
//     items: items.map((item) => ({
//       id: item.id,
//       productId: item.productId,
//       variantId: item.variantId ?? undefined,
//       productName: item.productName ?? "",
//       price: item.unitPrice,
//       quantity: item.quantity,
//       product: {
//         name: item.productName ?? "",
//         sellingPrice: String(item.unitPrice),
//       },
//     })),
//   };
// }

// ============================================
// FILE: services/offline/repository.ts
// ============================================

export async function createOfflineOrder(
  payload: CreateOrderPayload,
): Promise<Order> {
  const db = getOfflineDb();
  const sqlite = getSqliteDatabase();
  const now = new Date().toISOString();
  const orderId = createLocalId("ord");

  // ✅ Clean the payload - convert null to empty string for server
  const cleanPayload = {
    ...payload,
    tenantId: payload.tenantId || "default",
    subTotal: Number(payload.subTotal) || 0,
    taxAmount: Number(payload.taxAmount) || 0,
    discountAmount: Number(payload.discountAmount) || 0,
    grandTotal: Number(payload.grandTotal) || 0,
    paidAmount: Number(payload.paidAmount) || 0,
    changeAmount: Number(payload.changeAmount) || 0,
    // ✅ CRITICAL: Convert null to empty string for customerId
    customerId: payload.customerId ? String(payload.customerId) : "",
    userId: payload.userId ? String(payload.userId) : "unknown",
    storeId: payload.storeId ? String(payload.storeId) : "",
    sessionId: payload.sessionId ? String(payload.sessionId) : "",
    registerId: payload.registerId ? String(payload.registerId) : "",
    paymentMethod: payload.paymentMethod || "CASH",
    paymentStatus: payload.paymentStatus || "PAID",
    items: (payload.items || []).map((item: any) => ({
      ...item,
      productId: item.productId ? String(item.productId) : "unknown",
      variantId: item.variantId ? String(item.variantId) : "",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      subTotal: Number(item.subTotal) || 0,
      discountAmount: Number(item.discountAmount) || 0,
    })),
  };

  // Validate required fields
  if (!cleanPayload.userId || cleanPayload.userId === "unknown") {
    throw new Error("userId is required to create an order");
  }
  if (!cleanPayload.storeId) {
    throw new Error("storeId is required to create an order");
  }
  if (!cleanPayload.sessionId) {
    throw new Error("sessionId is required to create an order");
  }

  sqlite.withTransactionSync(() => {
    // Insert order - store null in local DB, but server will get empty string
    sqlite.runSync(
      `INSERT INTO orders (
        id, tenant_id, store_id, register_id, user_id, customer_id, session_id,
        status, payment_status, payment_method, sub_total, tax_amount,
        discount_amount, grand_total, paid_amount, change_amount,
        payment_breakdown, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        cleanPayload.tenantId,
        cleanPayload.storeId,
        cleanPayload.registerId || null,
        cleanPayload.userId,
        cleanPayload.customerId || null, // Keep null in local DB
        cleanPayload.sessionId,
        "COMPLETED",
        cleanPayload.paymentStatus || "PAID",
        cleanPayload.paymentMethod || "CASH",
        cleanPayload.subTotal,
        cleanPayload.taxAmount,
        cleanPayload.discountAmount,
        cleanPayload.grandTotal,
        cleanPayload.paidAmount,
        cleanPayload.changeAmount,
        JSON.stringify(cleanPayload.paymentBreakdown || []),
        "pending",
        now,
        now,
      ],
    );

    // Insert order items
    for (const item of cleanPayload.items) {
      const itemId = createLocalId("item");
      sqlite.runSync(
        `INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_name, quantity, unit_price,
          discount_amount, sub_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          orderId,
          item.productId,
          item.variantId || null,
          item.productName || null,
          item.quantity,
          item.unitPrice,
          item.discountAmount || 0,
          item.subTotal,
          now,
        ],
      );
    }

    // ✅ Build server payload - clean null values
    const serverPayload = {
      ...cleanPayload,
      // Convert null to empty string for server
      customerId: cleanPayload.customerId || "",
      registerId: cleanPayload.registerId || "",
      // Remove undefined values
      ...(cleanPayload.registerId ? {} : { registerId: undefined }),
      // Clean items
      items: cleanPayload.items.map((item: any) => ({
        productId: item.productId,
        variantId: item.variantId || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        subTotal: item.subTotal,
      })),
    };

    // Remove undefined values from server payload
    Object.keys(serverPayload).forEach((key) => {
      if (serverPayload[key] === undefined) {
        delete serverPayload[key];
      }
    });

    // Enqueue sync mutation with cleaned payload
    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "orders",
        orderId,
        "create",
        "/api/tenant/orders",
        "POST",
        JSON.stringify(serverPayload),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  // Fetch and return the order
  const [created] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return {
    id: created.id,
    grandTotal: created.grandTotal,
    status: created.status as Order["status"],
    createdAt: created.createdAt,
    subTotal: created.subTotal,
    taxAmount: created.taxAmount,
    discountAmount: created.discountAmount,
    paidAmount: created.paidAmount,
    changeAmount: created.changeAmount,
    paymentMethod: created.paymentMethod as Order["paymentMethod"],
    paymentStatus: created.paymentStatus as Order["paymentStatus"],
    paymentBreakdown: parsePaymentBreakdown(
      created.paymentBreakdown ?? cleanPayload.paymentBreakdown,
    ),
    customerId: created.customerId ?? undefined,
    storeId: created.storeId ?? undefined,
    userId: created.userId,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      productName: item.productName ?? "",
      price: item.unitPrice,
      quantity: item.quantity,
      product: {
        name: item.productName ?? "",
        sellingPrice: String(item.unitPrice),
      },
    })),
  };
}

// // Make sure this is exported
// export { createOfflineOrder };

// ============================================
// Also fix the createOfflineOrder function in localApi.ts
// ============================================

// ============================================
// INVENTORY MOVEMENT FUNCTIONS
// ============================================

export async function getLocalInventoryMovements(
  storeId?: string,
  type?: string,
  productId?: string,
) {
  const db = getOfflineDb();
  let query = db.select().from(inventoryMovements).$dynamic();

  const conditions = [];
  if (storeId) conditions.push(eq(inventoryMovements.storeId, storeId));
  if (type) conditions.push(eq(inventoryMovements.type, type));
  if (productId) conditions.push(eq(inventoryMovements.productId, productId));
  if (conditions.length) {
    query = query.where(and(...conditions));
  }

  return await query.orderBy(desc(inventoryMovements.createdAt));
}

export async function getLocalInventoryMovementById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.id, id))
    .limit(1);
  return row;
}

// ============================================
// PRICE HISTORY FUNCTIONS
// ============================================

export async function getLocalPriceHistory(
  productId?: string,
  variantId?: string,
) {
  const db = getOfflineDb();
  let query = db.select().from(priceHistory).$dynamic();

  const conditions = [];
  if (productId) conditions.push(eq(priceHistory.productId, productId));
  if (variantId) conditions.push(eq(priceHistory.variantId, variantId));
  if (conditions.length) {
    query = query.where(and(...conditions));
  }

  return await query.orderBy(desc(priceHistory.createdAt));
}

// ============================================
// GENERIC RECORDS FUNCTIONS
// ============================================

export async function getLocalGenericRecords<T>(entity: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(genericRecords)
    .where(
      and(eq(genericRecords.entity, entity), eq(genericRecords.isActive, true)),
    );

  return rows.map((row) => ({
    ...(row.data as T),
    id: row.id,
  }));
}

export async function getLocalGenericRecord<T>(entity: string, id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(genericRecords)
    .where(
      and(
        eq(genericRecords.entity, entity),
        eq(genericRecords.id, id),
        eq(genericRecords.isActive, true),
      ),
    )
    .limit(1);

  return row ? { ...(row.data as T), id: row.id } : undefined;
}

// ============================================
// CREATE OFFLINE FUNCTIONS (Push to Server later)
// ============================================

export async function createOfflineProduct(
  payload: Partial<Product> & {
    categoryName?: string;
    storeId?: string;
    variants?: any[];
  },
) {
  const now = new Date().toISOString();
  const id = createLocalId("prod");

  const db = getOfflineDb();
  const sqlite = getSqliteDatabase();

  let productId = id;

  sqlite.withTransactionSync(() => {
    // Insert product
    sqlite.runSync(
      `INSERT INTO products (
        id, tenant_id, name, sku, barcode, description, brand, brand_id,
        category_id, supplier_id, store_id, cost_price, selling_price, wholesale_price,
        is_active, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        payload.tenantId || null,
        payload.name || "Offline product",
        payload.sku || `LOCAL-${Date.now().toString(36).toUpperCase()}`,
        payload.barcode || null,
        payload.description || null,
        payload.brand || null,
        payload.brandId || null,
        payload.categoryId || null,
        payload.supplierId || null,
        payload.storeId || null,
        Number(payload.costPrice ?? 0),
        Number(payload.sellingPrice ?? 0),
        Number(payload.wholesalePrice ?? 0),
        1,
        "pending",
        now,
        now,
      ],
    );

    // Insert variants if provided
    if (payload.variants && payload.variants.length > 0) {
      for (const variant of payload.variants) {
        const variantId = createLocalId("var");
        sqlite.runSync(
          `INSERT INTO product_variants (
            id, product_id, tenant_id, name, sku, barcode,
            price, cost_price, color, size, weight, is_active,
            sync_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            variantId,
            productId,
            payload.tenantId || null,
            variant.name || "Variant",
            variant.sku || `VAR-${Date.now().toString(36).toUpperCase()}`,
            variant.barcode || null,
            Number(variant.price ?? 0),
            Number(variant.costPrice ?? 0),
            variant.color || null,
            variant.size || null,
            variant.weight ? Number(variant.weight) : null,
            variant.isActive !== undefined ? (variant.isActive ? 1 : 0) : 1,
            "pending",
            now,
            now,
          ],
        );

        // Create inventory for variant if storeId provided
        if (payload.storeId) {
          const invId = createLocalId("inv");
          sqlite.runSync(
            `INSERT INTO inventory (
              id, tenant_id, store_id, product_id, variant_id, quantity,
              sync_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              invId,
              payload.tenantId || null,
              payload.storeId,
              productId,
              variantId,
              Number(variant.initialStock ?? 0),
              "pending",
              now,
              now,
            ],
          );
        }
      }
    }

    // Create product-level inventory if storeId provided and no variants
    if (
      payload.storeId &&
      (!payload.variants || payload.variants.length === 0)
    ) {
      const invId = createLocalId("inv");
      sqlite.runSync(
        `INSERT INTO inventory (
          id, tenant_id, store_id, product_id, quantity,
          sync_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invId,
          payload.tenantId || null,
          payload.storeId,
          productId,
          Number(payload.initialStock ?? 0),
          "pending",
          now,
          now,
        ],
      );
    }

    // Enqueue sync mutation
    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "products",
        productId,
        "create",
        "/api/tenant/products",
        "POST",
        JSON.stringify(payload),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return toProduct(row);
}

//by me
// ============================================
// FILE: services/offline/repository.ts
// ============================================

// ... (other code)

// ============================================
// CREATE OFFLINE INVENTORY MOVEMENT
// ============================================

// export async function createOfflineInventoryMovement(
//   payload: CreateMovementPayload,
// ) {
//   const now = new Date().toISOString();
//   const id = createLocalId("mov");
//   const sqlite = getSqliteDatabase();
//   const db = getOfflineDb();

//   // Clean the payload
//   const cleanPayload = {
//     ...payload,
//     tenantId: payload.tenantId || "default",
//     quantity: Number(payload.quantity) || 0,
//     productId: payload.productId || "unknown",
//     storeId: payload.storeId || "unknown",
//     type: payload.type || "OUT",
//     referenceId: payload.referenceId || `manual-${Date.now()}`,
//     referenceType: payload.referenceType || "MANUAL",
//   };

//   // Validate required fields
//   if (!cleanPayload.productId || cleanPayload.productId === "unknown") {
//     throw new Error("productId is required for inventory movement");
//   }
//   if (!cleanPayload.storeId || cleanPayload.storeId === "unknown") {
//     throw new Error("storeId is required for inventory movement");
//   }

//   sqlite.withTransactionSync(() => {
//     // Insert inventory movement
//     sqlite.runSync(
//       `INSERT INTO inventory_movements (
//         id, tenant_id, store_id, product_id, variant_id, quantity, type,
//         reference_id, reference_type, reason, sync_status, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         id,
//         cleanPayload.tenantId,
//         cleanPayload.storeId,
//         cleanPayload.productId,
//         cleanPayload.variantId || null,
//         cleanPayload.quantity,
//         cleanPayload.type,
//         cleanPayload.referenceId,
//         cleanPayload.referenceType,
//         cleanPayload.reason || null,
//         "pending",
//         now,
//         now,
//       ],
//     );

//     // Update inventory quantity
//     const multiplier = ["IN", "TRANSFER_IN"].includes(cleanPayload.type)
//       ? 1
//       : -1;
//     const newQuantity =
//       multiplier > 0
//         ? `quantity + ${cleanPayload.quantity}`
//         : `MAX(quantity - ${cleanPayload.quantity}, 0)`;

//     const variantCondition = cleanPayload.variantId
//       ? `AND variant_id = '${cleanPayload.variantId}'`
//       : `AND variant_id IS NULL`;

//     sqlite.runSync(
//       `UPDATE inventory SET quantity = ${newQuantity}, updated_at = ?
//        WHERE product_id = ? AND store_id = ? ${variantCondition}`,
//       [now, cleanPayload.productId, cleanPayload.storeId],
//     );

//     // Enqueue sync mutation
//     sqlite.runSync(
//       `INSERT INTO sync_outbox (
//         id, entity, entity_id, operation, endpoint, method, payload, status,
//         attempts, next_attempt_at, created_at, updated_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         createLocalId("outbox"),
//         "inventory_movements",
//         id,
//         "create",
//         "/api/tenant/inventory/movements",
//         "POST",
//         JSON.stringify(cleanPayload),
//         "pending",
//         0,
//         now,
//         now,
//         now,
//       ],
//     );
//   });

//   const [row] = await db
//     .select()
//     .from(inventoryMovements)
//     .where(eq(inventoryMovements.id, id))
//     .limit(1);
//   return row;
// }

// ============================================
// FILE: services/offline/repository.ts
// ============================================

export async function createOfflineInventoryMovement(
  payload: CreateMovementPayload,
) {
  const now = new Date().toISOString();
  const id = createLocalId("mov");
  const sqlite = getSqliteDatabase();
  const db = getOfflineDb();

  // ✅ Clean the payload - convert movement type to valid enum
  const cleanPayload = {
    ...payload,
    tenantId: payload.tenantId || "default",
    quantity: Number(payload.quantity) || 0,
    productId: payload.productId || "unknown",
    storeId: payload.storeId || "unknown",
    // ✅ Map frontend types to backend enum
    type: mapMovementType(payload.type),
    referenceId: payload.referenceId || `manual-${Date.now()}`,
    referenceType: payload.referenceType || "MANUAL",
  };

  // Validate required fields
  if (!cleanPayload.productId || cleanPayload.productId === "unknown") {
    throw new Error("productId is required for inventory movement");
  }
  if (!cleanPayload.storeId || cleanPayload.storeId === "unknown") {
    throw new Error("storeId is required for inventory movement");
  }

  sqlite.withTransactionSync(() => {
    // Insert inventory movement
    sqlite.runSync(
      `INSERT INTO inventory_movements (
        id, tenant_id, store_id, product_id, variant_id, quantity, type,
        reference_id, reference_type, reason, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cleanPayload.tenantId,
        cleanPayload.storeId,
        cleanPayload.productId,
        cleanPayload.variantId || null,
        cleanPayload.quantity,
        cleanPayload.type,
        cleanPayload.referenceId,
        cleanPayload.referenceType,
        cleanPayload.reason || null,
        "pending",
        now,
        now,
      ],
    );

    // Update inventory quantity
    const isIn = [
      "PURCHASE",
      "RETURN_IN",
      "TRANSFER_IN",
      "OPENING_STOCK",
    ].includes(cleanPayload.type);
    const multiplier = isIn ? 1 : -1;
    const newQuantity =
      multiplier > 0
        ? `quantity + ${cleanPayload.quantity}`
        : `MAX(quantity - ${cleanPayload.quantity}, 0)`;

    const variantCondition = cleanPayload.variantId
      ? `AND variant_id = '${cleanPayload.variantId}'`
      : `AND variant_id IS NULL`;

    sqlite.runSync(
      `UPDATE inventory SET quantity = ${newQuantity}, updated_at = ?
       WHERE product_id = ? AND store_id = ? ${variantCondition}`,
      [now, cleanPayload.productId, cleanPayload.storeId],
    );

    // Enqueue sync mutation
    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "inventory_movements",
        id,
        "create",
        "/api/tenant/inventory/movements",
        "POST",
        JSON.stringify({
          ...cleanPayload,
          // Remove any fields that might cause issues
          variantId: cleanPayload.variantId || "",
          type: cleanPayload.type,
        }),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  const [row] = await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.id, id))
    .limit(1);
  return row;
}

// ✅ Helper function to map frontend types to backend enum
function mapMovementType(type: string): string {
  const mapping: Record<string, string> = {
    IN: "PURCHASE",
    OUT: "SALE",
    SALE: "SALE",
    PURCHASE: "PURCHASE",
    RETURN_IN: "RETURN_IN",
    RETURN_OUT: "RETURN_OUT",
    ADJUSTMENT: "ADJUSTMENT",
    DAMAGE: "DAMAGE",
    EXPIRED: "EXPIRED",
    TRANSFER_IN: "TRANSFER_IN",
    TRANSFER_OUT: "TRANSFER_OUT",
    OPENING_STOCK: "OPENING_STOCK",
    COUNTING: "COUNTING",
  };
  return mapping[type] || "ADJUSTMENT";
}

// // ============================================
// // MAKE SURE THIS IS EXPORTED
// // ============================================

// export {
//   createOfflineOrder,
//   createOfflineProduct,
//   createOfflineCategory,
//   createOfflineCustomer,
//   createOfflineStore,
//   createOfflineInventoryMovement, // ✅ Make sure this is exported
//   createOfflineInventoryCount,
//   createOfflineSession,
//   // ... other exports
// };

// ============================================
// HELPER FUNCTIONS (toX conversions)
// ============================================

function parsePaymentBreakdown(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value as Order["paymentBreakdown"];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toProduct(product: LocalProduct): Product {
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode ?? undefined,
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ?? undefined,
    brandId: product.brandId ?? undefined,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    wholesalePrice: product.wholesalePrice ?? 0,
    stockQuantity: 0,
    categoryId: product.categoryId ?? "",
    category: product.categoryId
      ? { id: product.categoryId, name: "" }
      : undefined,
    supplierId: product.supplierId ?? undefined,
    storeId: product.storeId ?? undefined,
    manufacturingDate: product.manufacturingDate ?? undefined,
    expiryDate: product.expiryDate ?? undefined,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function toProductVariant(variant: LocalProductVariant): any {
  return {
    id: variant.id,
    name: variant.name,
    productId: variant.productId,
    tenantId: variant.tenantId,
    sku: variant.sku,
    barcode: variant.barcode ?? undefined,
    price: variant.price,
    costPrice: variant.costPrice,
    color: variant.color ?? undefined,
    size: variant.size ?? undefined,
    weight: variant.weight ?? undefined,
    isActive: variant.isActive,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}

function toInventoryItem(inv: LocalInventory): InventoryItem {
  return {
    id: inv.id,
    productId: inv.productId,
    storeId: inv.storeId,
    variantId: inv.variantId ?? undefined,
    quantity: inv.quantity,
    reservedQty: inv.reservedQty,
    reorderPoint: inv.reorderPoint,
    reorderQty: inv.reorderQty,
    shelfLocation: inv.shelfLocation ?? undefined,
    version: inv.version,
    product: {
      id: "",
      name: "",
      sku: "",
    },
  };
}

async function toOrder(order: LocalOrder): Promise<Order> {
  const db = getOfflineDb();
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return {
    id: order.id,
    grandTotal: order.grandTotal,
    status: order.status as Order["status"],
    createdAt: order.createdAt,
    subTotal: order.subTotal,
    taxAmount: order.taxAmount,
    discountAmount: order.discountAmount,
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    paymentMethod: order.paymentMethod as Order["paymentMethod"],
    paymentStatus: order.paymentStatus as Order["paymentStatus"],
    paymentBreakdown: parsePaymentBreakdown(order.paymentBreakdown),
    customerId: order.customerId ?? undefined,
    storeId: order.storeId ?? undefined,
    userId: order.userId,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      productName: item.productName ?? "",
      price: item.unitPrice,
      quantity: item.quantity,
      product: {
        name: item.productName ?? "",
        sellingPrice: String(item.unitPrice),
      },
    })),
  };
}

function toCategory(category: LocalCategory): Category {
  return {
    id: category.id,
    tenantId: category.tenantId,
    name: category.name,
    slug: category.slug,
    description: category.description ?? undefined,
    parentId: category.parentId ?? undefined,
    storeId: (category as any).storeId ?? undefined,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function toCustomer(customer: LocalCustomer): Customer {
  return {
    id: customer.id,
    tenantId: customer.tenantId,
    code: customer.code,
    name: customer.name,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
    address: customer.address ?? undefined,
    dateOfBirth: customer.dateOfBirth ?? undefined,
    gender: customer.gender ?? undefined,
    debtAmount: customer.debtAmount ?? 0,
    loyaltyPoints: customer.loyaltyPoints,
    totalSpent: customer.totalSpent,
    totalOrders: customer.totalOrders,
    tier: (customer.tier as Customer["tier"]) ?? "BRONZE",
    tierValidUntil: customer.tierValidUntil ?? undefined,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function toStore(store: LocalStore): Store {
  return {
    id: store.id,
    code: store.code,
    name: store.name,
    address: store.address ?? undefined,
    phone: store.phone ?? undefined,
    email: store.email ?? undefined,
    taxNumber: store.taxNumber ?? undefined,
    isActive: store.isActive,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function toSession(session: LocalSession): Session {
  return {
    id: session.id,
    tenantId: session.tenantId,
    userId: session.userId,
    status: session.status as Session["status"],
    openedAt: session.openedAt,
    closedAt: session.closedAt ?? undefined,
    openingBalance: session.openingBalance,
    closingBalance: session.closingBalance ?? undefined,
    expectedBalance: session.expectedBalance ?? undefined,
    discrepancy: session.discrepancy ?? undefined,
    cashSales: session.cashSales,
    cardSales: session.cardSales,
    digitalSales: session.digitalSales,
    notes: session.notes ?? undefined,
  };
}

// ============================================
// SYNC OUTBOX FUNCTIONS
// ============================================

async function enqueueMutation(
  entity: string,
  entityId: string,
  operation: string,
  endpoint: string,
  method: string,
  payload: unknown,
) {
  const now = new Date().toISOString();
  const db = getOfflineDb();
  await db.insert(syncOutbox).values({
    id: createLocalId("outbox"),
    entity,
    entityId,
    operation,
    endpoint,
    method,
    payload,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function enqueueMutations(
  items: Array<{
    entity: string;
    entityId: string;
    operation: string;
    endpoint: string;
    method: string;
    payload: unknown;
  }>,
) {
  if (!items.length) return;

  const now = new Date().toISOString();
  const db = getOfflineDb();

  await db.insert(syncOutbox).values(
    items.map((item) => ({
      id: createLocalId("outbox"),
      ...item,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function getDueOutboxItems(limit = 25) {
  const db = getOfflineDb();
  return db
    .select()
    .from(syncOutbox)
    .where(
      and(
        inArray(syncOutbox.status, ["pending", "failed"]),
        lte(syncOutbox.nextAttemptAt, new Date().toISOString()),
      ),
    )
    .limit(limit);
}

export async function getOutboxItems(limit = 100) {
  const db = getOfflineDb();
  return db
    .select()
    .from(syncOutbox)
    .orderBy(syncOutbox.updatedAt)
    .limit(limit);
}

export async function getFailedOutboxItems(limit = 100) {
  const db = getOfflineDb();
  return db
    .select()
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["failed", "dead"]))
    .orderBy(syncOutbox.updatedAt)
    .limit(limit);
}

export async function retryOutboxItem(id: string) {
  const now = new Date().toISOString();
  const db = getOfflineDb();
  await db
    .update(syncOutbox)
    .set({
      status: "pending",
      nextAttemptAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(eq(syncOutbox.id, id));
}

export async function retryAllFailedOutboxItems() {
  const now = new Date().toISOString();
  const db = getOfflineDb();
  await db
    .update(syncOutbox)
    .set({
      status: "pending",
      nextAttemptAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(inArray(syncOutbox.status, ["failed", "dead"]));
}

export async function markOutboxSynced(id: string) {
  const db = getOfflineDb();
  await db.delete(syncOutbox).where(eq(syncOutbox.id, id));
}

export async function markOutboxFailed(
  id: string,
  attempts: number,
  error: string,
) {
  const delaySeconds = Math.min(300, Math.pow(2, attempts) * 5);
  const nextAttemptAt = new Date(
    Date.now() + delaySeconds * 1000,
  ).toISOString();
  const db = getOfflineDb();

  await db
    .update(syncOutbox)
    .set({
      status: "failed",
      attempts,
      lastError: error,
      nextAttemptAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(syncOutbox.id, id));
}

export async function markOutboxDead(id: string) {
  const db = getOfflineDb();
  await db
    .update(syncOutbox)
    .set({
      status: "dead",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(syncOutbox.id, id));
}

export async function getQueuedCount() {
  const db = getOfflineDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["pending", "failed"]));

  return Number(result[0]?.count ?? 0);
}

export async function getFailedCount() {
  const db = getOfflineDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["failed", "dead"]));

  return Number(result[0]?.count ?? 0);
}

export async function clearSyncedOutboxItems() {
  const db = getOfflineDb();
  const result = await db
    .delete(syncOutbox)
    .where(eq(syncOutbox.status, "synced"))
    .returning();
  return result.length;
}

export async function clearAllOutboxItems() {
  const db = getOfflineDb();
  const result = await db.delete(syncOutbox).returning();
  return result.length;
}

// ============================================
// MARK SYNCED FUNCTIONS
// ============================================

export async function markEntitySynced(
  entity: string,
  localId: string,
  remote: Record<string, any>,
) {
  const now = new Date().toISOString();
  const db = getOfflineDb();

  if (entity === "products") {
    await db
      .update(products)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.sku && { sku: remote.sku }),
        ...(remote.name && { name: remote.name }),
        ...(remote.sellingPrice && { sellingPrice: remote.sellingPrice }),
      })
      .where(eq(products.id, localId));
  } else if (entity === "product_variants") {
    await db
      .update(productVariants)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.sku && { sku: remote.sku }),
        ...(remote.name && { name: remote.name }),
        ...(remote.price && { price: remote.price }),
      })
      .where(eq(productVariants.id, localId));
  } else if (entity === "inventory") {
    await db
      .update(inventory)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.quantity !== undefined && { quantity: remote.quantity }),
      })
      .where(eq(inventory.id, localId));
  } else if (entity === "customers") {
    await db
      .update(customers)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.code && { code: remote.code }),
        ...(remote.name && { name: remote.name }),
      })
      .where(eq(customers.id, localId));
  } else if (entity === "categories") {
    await db
      .update(categories)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.name && { name: remote.name }),
        ...(remote.slug && { slug: remote.slug }),
      })
      .where(eq(categories.id, localId));
  } else if (entity === "stores") {
    await db
      .update(stores)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.code && { code: remote.code }),
        ...(remote.name && { name: remote.name }),
      })
      .where(eq(stores.id, localId));
  } else if (entity === "sessions") {
    await db
      .update(sessions)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.status && { status: remote.status }),
        ...(remote.closedAt && { closedAt: remote.closedAt }),
      })
      .where(eq(sessions.id, localId));
  } else if (entity === "orders") {
    await db
      .update(orders)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.status && { status: remote.status }),
        ...(remote.grandTotal !== undefined && {
          grandTotal: remote.grandTotal,
        }),
      })
      .where(eq(orders.id, localId));
  } else if (entity === "inventory_movements") {
    await db
      .update(inventoryMovements)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(inventoryMovements.id, localId));
  } else if (entity === "inventory_counts") {
    await db
      .update(inventoryCounts)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(inventoryCounts.id, localId));
  } else if (entity === "price_history") {
    await db
      .update(priceHistory)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(priceHistory.id, localId));
  } else {
    await db
      .update(genericRecords)
      .set({
        data: remote.id ? remote : sql`${genericRecords.data}`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(genericRecords.id, localId));
  }
}

export async function markEntitySyncFailed(
  entity: string,
  localId: string,
  error: string,
) {
  const now = new Date().toISOString();
  const db = getOfflineDb();

  const update = {
    syncStatus: "failed",
    syncError: error,
    updatedAt: now,
  };

  if (entity === "products") {
    await db.update(products).set(update).where(eq(products.id, localId));
  } else if (entity === "product_variants") {
    await db
      .update(productVariants)
      .set(update)
      .where(eq(productVariants.id, localId));
  } else if (entity === "inventory") {
    await db.update(inventory).set(update).where(eq(inventory.id, localId));
  } else if (entity === "customers") {
    await db.update(customers).set(update).where(eq(customers.id, localId));
  } else if (entity === "categories") {
    await db.update(categories).set(update).where(eq(categories.id, localId));
  } else if (entity === "stores") {
    await db.update(stores).set(update).where(eq(stores.id, localId));
  } else if (entity === "sessions") {
    await db.update(sessions).set(update).where(eq(sessions.id, localId));
  } else if (entity === "orders") {
    await db.update(orders).set(update).where(eq(orders.id, localId));
  } else if (entity === "inventory_movements") {
    await db
      .update(inventoryMovements)
      .set(update)
      .where(eq(inventoryMovements.id, localId));
  } else if (entity === "inventory_counts") {
    await db
      .update(inventoryCounts)
      .set(update)
      .where(eq(inventoryCounts.id, localId));
  } else if (entity === "price_history") {
    await db
      .update(priceHistory)
      .set(update)
      .where(eq(priceHistory.id, localId));
  } else {
    await db
      .update(genericRecords)
      .set(update)
      .where(eq(genericRecords.id, localId));
  }
}

// ============================================
// CONFLICT RESOLUTION
// ============================================

export async function resolveConflict(
  entity: string,
  localId: string,
  resolution: "local" | "remote",
  remoteData?: Record<string, any>,
) {
  const db = getOfflineDb();
  const now = new Date().toISOString();

  if (resolution === "remote" && remoteData) {
    const table = getTableForEntity(entity);
    if (!table) return;

    await db
      .update(table)
      .set({
        ...remoteData,
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(table.id, localId));

    await db
      .delete(syncOutbox)
      .where(
        and(eq(syncOutbox.entity, entity), eq(syncOutbox.entityId, localId)),
      );
  } else {
    await db
      .update(syncOutbox)
      .set({
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        updatedAt: now,
        lastError: null,
      })
      .where(
        and(eq(syncOutbox.entity, entity), eq(syncOutbox.entityId, localId)),
      );
  }
}

function getTableForEntity(entity: string) {
  switch (entity) {
    case "products":
      return products;
    case "product_variants":
      return productVariants;
    case "inventory":
      return inventory;
    case "categories":
      return categories;
    case "brands":
      return brands;
    case "customers":
      return customers;
    case "suppliers":
      return suppliers;
    case "stores":
      return stores;
    case "sessions":
      return sessions;
    case "orders":
      return orders;
    case "inventory_movements":
      return inventoryMovements;
    case "inventory_counts":
      return inventoryCounts;
    case "price_history":
      return priceHistory;
    default:
      return null;
  }
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

export async function cleanupOldData(daysToKeep = 30) {
  const db = getOfflineDb();
  const cutoff = new Date(
    Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
  ).toISOString();

  const syncedOutbox = await db
    .delete(syncOutbox)
    .where(
      and(eq(syncOutbox.status, "synced"), lte(syncOutbox.createdAt, cutoff)),
    )
    .returning();

  const deletedGeneric = await db
    .delete(genericRecords)
    .where(
      and(
        eq(genericRecords.isActive, false),
        lte(genericRecords.updatedAt, cutoff),
      ),
    )
    .returning();

  const deletedCounts = await db
    .delete(inventoryCounts)
    .where(
      and(
        eq(inventoryCounts.status, "COMPLETED"),
        lte(inventoryCounts.createdAt, cutoff),
      ),
    )
    .returning();

  return {
    outbox: syncedOutbox.length,
    genericRecords: deletedGeneric.length,
    inventoryCounts: deletedCounts.length,
  };
}

// ============================================
// GET SYNC STATUS
// ============================================

export interface SyncStatus {
  isOnline: boolean;
  queueCount: number;
  failedCount: number;
  totalPending: number;
  items: Array<{
    id: string;
    entity: string;
    operation: string;
    status: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }>;
  failedItems: Array<{
    id: string;
    entity: string;
    operation: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }>;
  entityCounts: {
    [entity: string]: {
      pending: number;
      failed: number;
      synced: number;
      total: number;
    };
  };
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = getOfflineDb();
  const online = await isOnline();

  const allItems = await db
    .select()
    .from(syncOutbox)
    .orderBy(syncOutbox.createdAt);

  const pendingItems = allItems.filter(
    (item) => item.status === "pending" || item.status === "failed",
  );

  const failedItems = allItems.filter(
    (item) => item.status === "failed" || item.status === "dead",
  );

  const entityCounts: SyncStatus["entityCounts"] = {};

  for (const item of allItems) {
    if (!entityCounts[item.entity]) {
      entityCounts[item.entity] = {
        pending: 0,
        failed: 0,
        synced: 0,
        total: 0,
      };
    }
    entityCounts[item.entity].total++;

    if (item.status === "pending") {
      entityCounts[item.entity].pending++;
    } else if (item.status === "failed" || item.status === "dead") {
      entityCounts[item.entity].failed++;
    } else if (item.status === "synced") {
      entityCounts[item.entity].synced++;
    }
  }

  return {
    isOnline: online,
    queueCount: pendingItems.length,
    failedCount: failedItems.length,
    totalPending: allItems.filter((item) => item.status === "pending").length,
    items: pendingItems.map((item) => ({
      id: item.id,
      entity: item.entity,
      operation: item.operation,
      status: item.status,
      attempts: item.attempts,
      lastError: item.lastError ?? null,
      createdAt: item.createdAt,
    })),
    failedItems: failedItems.map((item) => ({
      id: item.id,
      entity: item.entity,
      operation: item.operation,
      attempts: item.attempts,
      lastError: item.lastError ?? null,
      createdAt: item.createdAt,
    })),
    entityCounts,
  };
}

// ============================================
// GET SYNC QUEUE SUMMARY
// ============================================

export async function getSyncQueueSummary() {
  const db = getOfflineDb();

  const allItems = await db.select().from(syncOutbox);

  const summary = {
    total: allItems.length,
    pending: 0,
    synced: 0,
    failed: 0,
    dead: 0,
    byEntity: {} as Record<
      string,
      {
        total: number;
        pending: number;
        synced: number;
        failed: number;
        dead: number;
      }
    >,
    oldestPending: null as string | null,
    newestPending: null as string | null,
  };

  for (const item of allItems) {
    if (item.status === "pending") summary.pending++;
    else if (item.status === "synced") summary.synced++;
    else if (item.status === "failed") summary.failed++;
    else if (item.status === "dead") summary.dead++;

    if (!summary.byEntity[item.entity]) {
      summary.byEntity[item.entity] = {
        total: 0,
        pending: 0,
        synced: 0,
        failed: 0,
        dead: 0,
      };
    }
    summary.byEntity[item.entity].total++;
    if (item.status === "pending") summary.byEntity[item.entity].pending++;
    else if (item.status === "synced") summary.byEntity[item.entity].synced++;
    else if (item.status === "failed") summary.byEntity[item.entity].failed++;
    else if (item.status === "dead") summary.byEntity[item.entity].dead++;

    if (item.status === "pending") {
      if (!summary.oldestPending || item.createdAt < summary.oldestPending) {
        summary.oldestPending = item.createdAt;
      }
      if (!summary.newestPending || item.createdAt > summary.newestPending) {
        summary.newestPending = item.createdAt;
      }
    }
  }

  return summary;
}

// ============================================
// GET FAILED ITEMS WITH DETAILS
// ============================================

export async function getFailedItemsWithDetails(limit = 50) {
  const db = getOfflineDb();

  const items = await db
    .select()
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["failed", "dead"]))
    .orderBy(syncOutbox.updatedAt)
    .limit(limit);

  const result = [];
  for (const item of items) {
    let entityData = null;

    switch (item.entity) {
      case "products": {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.entityId))
          .limit(1);
        entityData = product;
        break;
      }
      case "product_variants": {
        const [variant] = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, item.entityId))
          .limit(1);
        entityData = variant;
        break;
      }
      case "inventory": {
        const [inv] = await db
          .select()
          .from(inventory)
          .where(eq(inventory.id, item.entityId))
          .limit(1);
        entityData = inv;
        break;
      }
      case "orders": {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, item.entityId))
          .limit(1);
        entityData = order;
        break;
      }
      case "customers": {
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, item.entityId))
          .limit(1);
        entityData = customer;
        break;
      }
      case "categories": {
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, item.entityId))
          .limit(1);
        entityData = category;
        break;
      }
      case "brands": {
        const [brand] = await db
          .select()
          .from(brands)
          .where(eq(brands.id, item.entityId))
          .limit(1);
        entityData = brand;
        break;
      }
      case "stores": {
        const [store] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, item.entityId))
          .limit(1);
        entityData = store;
        break;
      }
      case "sessions": {
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, item.entityId))
          .limit(1);
        entityData = session;
        break;
      }
      case "price_history": {
        const [ph] = await db
          .select()
          .from(priceHistory)
          .where(eq(priceHistory.id, item.entityId))
          .limit(1);
        entityData = ph;
        break;
      }
    }

    result.push({
      ...item,
      entityData,
    });
  }

  return result;
}
