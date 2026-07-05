// ============================================
// FILE: services/offline/localApi.ts
// ============================================

import { getOfflineDb } from "@/services/offline/db";
import {
  categories,
  customers,
  inventory,
  inventoryCountItems,
  inventoryCounts,
  inventoryMovements,
  orderItems,
  orders,
  priceHistory,
  products,
  productVariants,
  sessions,
  stores,
  syncOutbox,
} from "@/services/offline/schema";
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { and, desc, eq, sql } from "drizzle-orm";

// ============================================
// TAG TYPES
// ============================================
export type LocalTagTypes =
  | "LocalProducts"
  | "LocalProductVariants"
  | "LocalCategories"
  | "LocalCustomers"
  | "LocalStores"
  | "LocalSessions"
  | "LocalOrders"
  | "LocalInventory"
  | "LocalInventoryMovements"
  | "LocalInventoryCounts"
  | "LocalPriceHistory"
  | "LocalSyncOutbox";

// ============================================
// LOCAL API
// ============================================
export const localApi = createApi({
  reducerPath: "localApi",
  baseQuery: fakeBaseQuery<{ message: string }>(),
  tagTypes: [
    "LocalProducts",
    "LocalProductVariants",
    "LocalCategories",
    "LocalCustomers",
    "LocalStores",
    "LocalSessions",
    "LocalOrders",
    "LocalInventory",
    "LocalInventoryMovements",
    "LocalInventoryCounts",
    "LocalPriceHistory",
    "LocalSyncOutbox",
  ] as const,
  endpoints: (builder) => ({
    // ============================================
    // 1. PRODUCTS
    // ============================================
    getLocalProducts: builder.query({
      async queryFn({
        search,
        categoryId,
        storeId,
        isActive,
      }: {
        search?: string;
        categoryId?: string;
        storeId?: string;
        isActive?: boolean;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(products)
            .where(sql`${products.syncStatus} != 'pending_delete'`)
            .orderBy(desc(products.createdAt))
            .$dynamic();

          if (search) {
            query = query.where(
              sql`${products.name} LIKE ${`%${search}%`} OR ${products.sku} LIKE ${`%${search}%`} OR ${products.barcode} LIKE ${`%${search}%`}`,
            );
          }
          if (categoryId) {
            query = query.where(eq(products.categoryId, categoryId));
          }
          if (storeId) {
            query = query.where(eq(products.storeId, storeId));
          }
          if (isActive !== undefined) {
            query = query.where(eq(products.isActive, isActive));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalProducts"],
    }),

    getLocalProductById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(products)
            .where(eq(products.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalProducts", id }],
    }),

    getLocalProductByBarcode: builder.query({
      async queryFn(barcode: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(products)
            .where(eq(products.barcode, barcode));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalProducts"],
    }),

    getLocalProductBySku: builder.query({
      async queryFn(sku: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(products)
            .where(eq(products.sku, sku));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalProducts"],
    }),

    createLocalProduct: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineProduct } =
            await import("@/services/offline/repository");
          const result = await createOfflineProduct(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: [
        "LocalProducts",
        "LocalProductVariants",
        "LocalInventory",
      ],
    }),

    updateLocalProduct: builder.mutation({
      async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
        try {
          const { updateOfflineProduct } =
            await import("@/services/offline/repository");
          const result = await updateOfflineProduct(id, payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalProducts", id },
        "LocalProducts",
      ],
    }),

    deleteLocalProduct: builder.mutation({
      async queryFn(id: string) {
        try {
          const { deleteOfflineProduct } =
            await import("@/services/offline/repository");
          await deleteOfflineProduct(id);
          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "LocalProducts", id },
        "LocalProducts",
        "LocalInventory",
      ],
    }),

    // ============================================
    // 2. PRODUCT VARIANTS
    // ============================================
    getLocalVariants: builder.query({
      async queryFn(productId?: string) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(productVariants)
            .where(eq(productVariants.isActive, true))
            .$dynamic();

          if (productId) {
            query = query.where(eq(productVariants.productId, productId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalProductVariants"],
    }),

    getLocalVariantById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [
        { type: "LocalProductVariants", id },
      ],
    }),

    getLocalVariantByBarcode: builder.query({
      async queryFn(barcode: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(productVariants)
            .where(eq(productVariants.barcode, barcode));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalProductVariants"],
    }),

    createLocalVariant: builder.mutation({
      async queryFn(payload: any) {
        try {
          const db = getOfflineDb();
          const now = new Date().toISOString();
          const { createLocalId } = await import("@/services/offline/ids");

          const variantId = createLocalId("var");

          await db.insert(productVariants).values({
            id: variantId,
            productId: payload.productId,
            tenantId: payload.tenantId,
            name: payload.name,
            sku: payload.sku,
            barcode: payload.barcode,
            price: payload.price,
            costPrice: payload.costPrice,
            color: payload.color,
            size: payload.size,
            weight: payload.weight,
            isActive: payload.isActive ?? true,
            syncStatus: "pending",
            createdAt: now,
            updatedAt: now,
          });

          return { data: { id: variantId, ...payload } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: [
        "LocalProductVariants",
        "LocalProducts",
        "LocalInventory",
      ],
    }),

    updateLocalVariant: builder.mutation({
      async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
        try {
          const db = getOfflineDb();
          const now = new Date().toISOString();

          await db
            .update(productVariants)
            .set({
              ...payload,
              updatedAt: now,
              syncStatus: "pending",
            })
            .where(eq(productVariants.id, id));

          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalProductVariants", id },
        "LocalProductVariants",
        "LocalProducts",
      ],
    }),

    deleteLocalVariant: builder.mutation({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          await db
            .update(productVariants)
            .set({
              isActive: false,
              syncStatus: "pending",
              updatedAt: new Date().toISOString(),
            })
            .where(eq(productVariants.id, id));
          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "LocalProductVariants", id },
        "LocalProductVariants",
        "LocalInventory",
      ],
    }),

    // ============================================
    // 3. CATEGORIES
    // ============================================
    getLocalCategories: builder.query({
      async queryFn({
        storeId,
        isActive,
      }: { storeId?: string; isActive?: boolean } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(categories)
            .orderBy(categories.sortOrder)
            .$dynamic();

          if (isActive !== undefined) {
            query = query.where(eq(categories.isActive, isActive));
          }
          if (storeId) {
            query = query.where(eq(categories.storeId, storeId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalCategories"],
    }),

    getLocalCategoryById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(categories)
            .where(eq(categories.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalCategories", id }],
    }),

    createLocalCategory: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineCategory } =
            await import("@/services/offline/repository");
          const result = await createOfflineCategory(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalCategories"],
    }),

    updateLocalCategory: builder.mutation({
      async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
        try {
          const { updateOfflineCategory } =
            await import("@/services/offline/repository");
          const result = await updateOfflineCategory(id, payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalCategories", id },
        "LocalCategories",
      ],
    }),

    deleteLocalCategory: builder.mutation({
      async queryFn(id: string) {
        try {
          const { deleteOfflineCategory } =
            await import("@/services/offline/repository");
          await deleteOfflineCategory(id);
          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "LocalCategories", id },
        "LocalCategories",
        "LocalProducts",
      ],
    }),

    // ============================================
    // 4. CUSTOMERS
    // ============================================
    getLocalCustomers: builder.query({
      async queryFn({
        search,
        tier,
        isActive,
      }: {
        search?: string;
        tier?: string;
        isActive?: boolean;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(customers)
            .orderBy(desc(customers.createdAt))
            .$dynamic();

          if (isActive !== undefined) {
            query = query.where(eq(customers.isActive, isActive));
          }
          if (search) {
            query = query.where(
              sql`${customers.name} LIKE ${`%${search}%`} OR ${customers.code} LIKE ${`%${search}%`} OR ${customers.phone} LIKE ${`%${search}%`}`,
            );
          }
          if (tier) {
            query = query.where(eq(customers.tier, tier));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalCustomers"],
    }),

    getLocalCustomerById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalCustomers", id }],
    }),

    getLocalCustomerByPhone: builder.query({
      async queryFn(phone: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(customers)
            .where(eq(customers.phone, phone));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalCustomers"],
    }),

    createLocalCustomer: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineCustomer } =
            await import("@/services/offline/repository");
          const result = await createOfflineCustomer(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalCustomers"],
    }),

    updateLocalCustomer: builder.mutation({
      async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
        try {
          const { updateOfflineCustomer } =
            await import("@/services/offline/repository");
          const result = await updateOfflineCustomer(id, payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalCustomers", id },
        "LocalCustomers",
      ],
    }),

    deleteLocalCustomer: builder.mutation({
      async queryFn(id: string) {
        try {
          const { deleteOfflineCustomer } =
            await import("@/services/offline/repository");
          await deleteOfflineCustomer(id);
          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "LocalCustomers", id },
        "LocalCustomers",
      ],
    }),

    // ============================================
    // 5. STORES
    // ============================================
    getLocalStores: builder.query({
      async queryFn({ isActive }: { isActive?: boolean } = {}) {
        try {
          const db = getOfflineDb();
          let query = db.select().from(stores).$dynamic();

          if (isActive !== undefined) {
            query = query.where(eq(stores.isActive, isActive));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalStores"],
    }),

    getLocalStoreById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(stores)
            .where(eq(stores.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalStores", id }],
    }),

    createLocalStore: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineStore } =
            await import("@/services/offline/repository");
          const result = await createOfflineStore(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalStores"],
    }),

    updateLocalStore: builder.mutation({
      async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
        try {
          const { updateOfflineStore } =
            await import("@/services/offline/repository");
          const result = await updateOfflineStore(id, payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalStores", id },
        "LocalStores",
      ],
    }),

    deleteLocalStore: builder.mutation({
      async queryFn(id: string) {
        try {
          const { deleteOfflineStore } =
            await import("@/services/offline/repository");
          await deleteOfflineStore(id);
          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "LocalStores", id },
        "LocalStores",
        "LocalInventory",
      ],
    }),

    // ============================================
    // 6. SESSIONS
    // ============================================
    getLocalSessions: builder.query({
      async queryFn({
        storeId,
        status,
        userId,
      }: {
        storeId?: string;
        status?: string;
        userId?: string;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(sessions)
            .orderBy(desc(sessions.createdAt))
            .$dynamic();

          if (storeId) {
            query = query.where(eq(sessions.storeId, storeId));
          }
          if (status) {
            query = query.where(eq(sessions.status, status));
          }
          if (userId) {
            query = query.where(eq(sessions.userId, userId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalSessions"],
    }),

    getLocalSessionById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalSessions", id }],
    }),

    getActiveSession: builder.query({
      async queryFn({ userId, storeId }: { userId: string; storeId?: string }) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(sessions)
            .where(
              and(eq(sessions.userId, userId), eq(sessions.status, "OPEN")),
            )
            .$dynamic();

          if (storeId) {
            query = query.where(eq(sessions.storeId, storeId));
          }

          const [result] = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalSessions"],
    }),

    openLocalSession: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { openOfflineSession } =
            await import("@/services/offline/repository");
          const result = await openOfflineSession(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalSessions"],
    }),

    closeLocalSession: builder.mutation({
      async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
        try {
          const { closeOfflineSession } =
            await import("@/services/offline/repository");
          const result = await closeOfflineSession(id, payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalSessions", id },
        "LocalSessions",
      ],
    }),

    // ============================================
    // 7. ORDERS
    // ============================================
    getLocalOrders: builder.query({
      async queryFn({
        storeId,
        status,
        sessionId,
        customerId,
        page,
        limit,
      }: {
        storeId?: string;
        status?: string;
        sessionId?: string;
        customerId?: string;
        page?: number;
        limit?: number;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(orders)
            .orderBy(desc(orders.createdAt))
            .$dynamic();

          if (storeId) {
            query = query.where(eq(orders.storeId, storeId));
          }
          if (status) {
            query = query.where(eq(orders.status, status));
          }
          if (sessionId) {
            query = query.where(eq(orders.sessionId, sessionId));
          }
          if (customerId) {
            query = query.where(eq(orders.customerId, customerId));
          }

          if (page && limit) {
            query = query.limit(limit).offset((page - 1) * limit);
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalOrders"],
    }),

    getLocalOrderById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, id));

          if (!order) {
            return { data: null };
          }

          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, id));

          return { data: { ...order, items } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalOrders", id }],
    }),

    createLocalOrder: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineOrder } =
            await import("@/services/offline/repository");
          const result = await createOfflineOrder(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalOrders", "LocalInventory", "LocalCustomers"],
    }),

    updateLocalOrderStatus: builder.mutation({
      async queryFn({ id, status }: { id: string; status: string }) {
        try {
          const { updateOfflineOrderStatus } =
            await import("@/services/offline/repository");
          const result = await updateOfflineOrderStatus(id, status);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: "LocalOrders", id },
        "LocalOrders",
      ],
    }),

    deleteLocalOrder: builder.mutation({
      async queryFn(id: string) {
        try {
          const { deleteOfflineOrder } =
            await import("@/services/offline/repository");
          await deleteOfflineOrder(id);
          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: "LocalOrders", id },
        "LocalOrders",
        "LocalInventory",
      ],
    }),

    // ============================================
    // 8. INVENTORY
    // ============================================
    getLocalInventory: builder.query({
      async queryFn({
        storeId,
        productId,
        variantId,
      }: {
        storeId?: string;
        productId?: string;
        variantId?: string;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db.select().from(inventory).$dynamic();

          if (storeId) {
            query = query.where(eq(inventory.storeId, storeId));
          }
          if (productId) {
            query = query.where(eq(inventory.productId, productId));
          }
          if (variantId) {
            query = query.where(eq(inventory.variantId, variantId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalInventory"],
    }),

    getLocalInventoryByProduct: builder.query({
      async queryFn({
        productId,
        storeId,
      }: {
        productId: string;
        storeId?: string;
      }) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(inventory)
            .where(eq(inventory.productId, productId))
            .$dynamic();

          if (storeId) {
            query = query.where(eq(inventory.storeId, storeId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalInventory"],
    }),

    getLocalInventoryByVariant: builder.query({
      async queryFn({
        variantId,
        storeId,
      }: {
        variantId: string;
        storeId?: string;
      }) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, variantId))
            .$dynamic();

          if (storeId) {
            query = query.where(eq(inventory.storeId, storeId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalInventory"],
    }),

    getLocalInventoryItem: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [result] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.id, id));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [{ type: "LocalInventory", id }],
    }),

    // ============================================
    // 9. INVENTORY MOVEMENTS
    // ============================================
    getLocalInventoryMovements: builder.query({
      async queryFn({
        storeId,
        type,
        productId,
        variantId,
        page,
        limit,
      }: {
        storeId?: string;
        type?: string;
        productId?: string;
        variantId?: string;
        page?: number;
        limit?: number;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(inventoryMovements)
            .orderBy(desc(inventoryMovements.createdAt))
            .$dynamic();

          if (storeId) {
            query = query.where(eq(inventoryMovements.storeId, storeId));
          }
          if (type) {
            query = query.where(eq(inventoryMovements.type, type));
          }
          if (productId) {
            query = query.where(eq(inventoryMovements.productId, productId));
          }
          if (variantId) {
            query = query.where(eq(inventoryMovements.variantId, variantId));
          }

          if (page && limit) {
            query = query.limit(limit).offset((page - 1) * limit);
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalInventoryMovements"],
    }),

    createLocalInventoryMovement: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineInventoryMovement } =
            await import("@/services/offline/repository");
          const result = await createOfflineInventoryMovement(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: [
        "LocalInventoryMovements",
        "LocalInventory",
        "LocalProducts",
      ],
    }),

    // // ============================================
    // // 9b. ADJUST LOCAL STOCK - UPDATED ✅
    // // ============================================
    // adjustLocalStock: builder.mutation({
    //   async queryFn(payload: {
    //     productId: string;
    //     storeId: string;
    //     variantId?: string;
    //     newQuantity: number;
    //     reason?: string;
    //     tenantId?: string;
    //   }) {
    //     try {
    //       const db = getOfflineDb();
    //       const now = new Date().toISOString();

    //       // ✅ Check if inventory exists for this product/store/variant
    //       let query = db
    //         .select()
    //         .from(inventory)
    //         .where(
    //           and(
    //             eq(inventory.productId, payload.productId),
    //             eq(inventory.storeId, payload.storeId),
    //           ),
    //         )
    //         .$dynamic();

    //       if (payload.variantId) {
    //         query = query.where(eq(inventory.variantId, payload.variantId));
    //       } else {
    //         query = query.where(sql`${inventory.variantId} IS NULL`);
    //       }

    //       const [existingInventory] = await query;

    //       if (!existingInventory) {
    //         return {
    //           error: {
    //             message: `Inventory not found for product ${payload.productId} in store ${payload.storeId}${
    //               payload.variantId ? ` with variant ${payload.variantId}` : ""
    //             }`,
    //           },
    //         };
    //       }

    //       const currentQuantity = existingInventory.quantity;
    //       const diff = payload.newQuantity - currentQuantity;

    //       // ✅ If no change, return early
    //       if (diff === 0) {
    //         return {
    //           data: {
    //             ...existingInventory,
    //             message: "No change in quantity",
    //           },
    //         };
    //       }

    //       // ✅ Update inventory quantity
    //       await db
    //         .update(inventory)
    //         .set({
    //           quantity: payload.newQuantity,
    //           updatedAt: now,
    //           syncStatus: "pending",
    //         })
    //         .where(eq(inventory.id, existingInventory.id));

    //       // ✅ Create inventory movement record
    //       const { createLocalId } = await import("@/services/offline/ids");
    //       const movementId = createLocalId("mov");

    //       const movementType = diff > 0 ? "IN" : "OUT";

    //       await db.insert(inventoryMovements).values({
    //         id: movementId,
    //         tenantId: payload.tenantId || existingInventory.tenantId,
    //         storeId: payload.storeId,
    //         productId: payload.productId,
    //         variantId: payload.variantId || null,
    //         quantity: Math.abs(diff),
    //         type: movementType,
    //         referenceId: `adj-${Date.now()}`,
    //         referenceType: "STOCK_ADJUSTMENT",
    //         reason:
    //           payload.reason ??
    //           `Stock adjusted from ${currentQuantity} to ${payload.newQuantity}`,
    //         syncStatus: "pending",
    //         createdAt: now,
    //         updatedAt: now,
    //         lastSyncedAt: null,
    //       });

    //       // ✅ Get updated inventory
    //       const [updatedInventory] = await db
    //         .select()
    //         .from(inventory)
    //         .where(eq(inventory.id, existingInventory.id));

    //       // ✅ Enqueue sync mutation for inventory
    //       await db.insert(syncOutbox).values({
    //         id: createLocalId("outbox"),
    //         entity: "inventory",
    //         entityId: updatedInventory.id,
    //         operation: "update",
    //         endpoint: `/api/tenant/inventory/${updatedInventory.id}`,
    //         method: "PUT",
    //         payload: {
    //           id: updatedInventory.id,
    //           quantity: updatedInventory.quantity,
    //           version: (updatedInventory.version || 0) + 1,
    //         },
    //         status: "pending",
    //         attempts: 0,
    //         nextAttemptAt: now,
    //         lastError: null,
    //         createdAt: now,
    //         updatedAt: now,
    //       });

    //       // ✅ Enqueue sync mutation for inventory movement
    //       await db.insert(syncOutbox).values({
    //         id: createLocalId("outbox"),
    //         entity: "inventory_movements",
    //         entityId: movementId,
    //         operation: "create",
    //         endpoint: "/api/tenant/inventory/movements",
    //         method: "POST",
    //         payload: {
    //           tenantId: payload.tenantId || existingInventory.tenantId,
    //           storeId: payload.storeId,
    //           productId: payload.productId,
    //           variantId: payload.variantId || null,
    //           quantity: Math.abs(diff),
    //           type: movementType,
    //           referenceId: `adj-${Date.now()}`,
    //           referenceType: "STOCK_ADJUSTMENT",
    //           reason:
    //             payload.reason ??
    //             `Stock adjusted from ${currentQuantity} to ${payload.newQuantity}`,
    //         },
    //         status: "pending",
    //         attempts: 0,
    //         nextAttemptAt: now,
    //         lastError: null,
    //         createdAt: now,
    //         updatedAt: now,
    //       });

    //       return {
    //         data: {
    //           ...updatedInventory,
    //           movement: {
    //             id: movementId,
    //             type: movementType,
    //             quantity: Math.abs(diff),
    //             reason: payload.reason,
    //           },
    //         },
    //       };
    //     } catch (error) {
    //       console.error("❌ Adjust stock failed:", error);
    //       return { error: { message: (error as Error).message } };
    //     }
    //   },
    //   invalidatesTags: [
    //     "LocalInventory",
    //     "LocalInventoryMovements",
    //     "LocalProducts",
    //   ],
    // }),

    // ============================================
    // 9b. ADJUST LOCAL STOCK
    // ============================================
    adjustLocalStock: builder.mutation({
      async queryFn(payload: {
        productId: string;
        storeId: string;
        variantId?: string;
        newQuantity: number;
        reason?: string;
        tenantId?: string;
      }) {
        try {
          const db = getOfflineDb();
          const now = new Date().toISOString();

          // Check if inventory exists
          let query = db
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.productId, payload.productId),
                eq(inventory.storeId, payload.storeId),
              ),
            )
            .$dynamic();

          if (payload.variantId) {
            query = query.where(eq(inventory.variantId, payload.variantId));
          } else {
            query = query.where(sql`${inventory.variantId} IS NULL`);
          }

          const [existingInventory] = await query;

          if (!existingInventory) {
            return {
              error: {
                message: `Inventory not found for product ${payload.productId} in store ${payload.storeId}`,
              },
            };
          }

          const currentQuantity = existingInventory.quantity;
          const diff = payload.newQuantity - currentQuantity;

          if (diff === 0) {
            return {
              data: {
                ...existingInventory,
                message: "No change in quantity",
              },
            };
          }

          // Update inventory
          await db
            .update(inventory)
            .set({
              quantity: payload.newQuantity,
              updatedAt: now,
              syncStatus: "pending",
              version: (existingInventory.version || 0) + 1,
            })
            .where(eq(inventory.id, existingInventory.id));

          // Create movement
          const { createLocalId } = await import("@/services/offline/ids");
          const movementId = createLocalId("mov");
          const movementType = diff > 0 ? "IN" : "OUT";

          await db.insert(inventoryMovements).values({
            id: movementId,
            tenantId: payload.tenantId || existingInventory.tenantId,
            storeId: payload.storeId,
            productId: payload.productId,
            variantId: payload.variantId || null,
            quantity: Math.abs(diff),
            type: movementType,
            referenceId: `adj-${Date.now()}`,
            referenceType: "STOCK_ADJUSTMENT",
            reason:
              payload.reason ??
              `Stock adjusted from ${currentQuantity} to ${payload.newQuantity}`,
            syncStatus: "pending",
            createdAt: now,
            updatedAt: now,
            lastSyncedAt: null,
          });

          // Get updated inventory
          const [updatedInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.id, existingInventory.id));

          // Enqueue sync for inventory update
          await db.insert(syncOutbox).values({
            id: createLocalId("outbox"),
            entity: "inventory",
            entityId: updatedInventory.id,
            operation: "update",
            endpoint: `/api/tenant/inventory/${updatedInventory.id}`,
            method: "PUT",
            payload: {
              id: updatedInventory.id,
              quantity: updatedInventory.quantity,
              version: updatedInventory.version,
            },
            status: "pending",
            attempts: 0,
            nextAttemptAt: now,
            lastError: null,
            createdAt: now,
            updatedAt: now,
          });

          // Enqueue sync for movement
          await db.insert(syncOutbox).values({
            id: createLocalId("outbox"),
            entity: "inventory_movements",
            entityId: movementId,
            operation: "create",
            endpoint: "/api/tenant/inventory/movements",
            method: "POST",
            payload: {
              tenantId: payload.tenantId || existingInventory.tenantId,
              storeId: payload.storeId,
              productId: payload.productId,
              variantId: payload.variantId || null,
              quantity: Math.abs(diff),
              type: movementType,
              referenceId: `adj-${Date.now()}`,
              referenceType: "STOCK_ADJUSTMENT",
              reason:
                payload.reason ??
                `Stock adjusted from ${currentQuantity} to ${payload.newQuantity}`,
            },
            status: "pending",
            attempts: 0,
            nextAttemptAt: now,
            lastError: null,
            createdAt: now,
            updatedAt: now,
          });

          // ✅ Return only the data (not with extra nested objects)
          return {
            data: updatedInventory,
          };
        } catch (error) {
          console.error("❌ Adjust stock failed:", error);
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to adjust stock",
            },
          };
        }
      },
      invalidatesTags: [
        "LocalInventory",
        "LocalInventoryMovements",
        "LocalProducts",
      ],
    }),

    // ============================================
    // 10. INVENTORY COUNTS
    // ============================================
    getLocalInventoryCounts: builder.query({
      async queryFn({
        storeId,
        status,
        page,
        limit,
      }: {
        storeId?: string;
        status?: string;
        page?: number;
        limit?: number;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(inventoryCounts)
            .orderBy(desc(inventoryCounts.createdAt))
            .$dynamic();

          if (storeId) {
            query = query.where(eq(inventoryCounts.storeId, storeId));
          }
          if (status) {
            query = query.where(eq(inventoryCounts.status, status));
          }

          if (page && limit) {
            query = query.limit(limit).offset((page - 1) * limit);
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalInventoryCounts"],
    }),

    getLocalInventoryCountById: builder.query({
      async queryFn(id: string) {
        try {
          const db = getOfflineDb();
          const [count] = await db
            .select()
            .from(inventoryCounts)
            .where(eq(inventoryCounts.id, id));

          if (!count) {
            return { data: null };
          }

          const items = await db
            .select()
            .from(inventoryCountItems)
            .where(eq(inventoryCountItems.countId, id));

          return { data: { ...count, items } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: (result, error, id) => [
        { type: "LocalInventoryCounts", id },
      ],
    }),

    createLocalInventoryCount: builder.mutation({
      async queryFn(payload: any) {
        try {
          const { createOfflineInventoryCount } =
            await import("@/services/offline/repository");
          const result = await createOfflineInventoryCount(payload);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: [
        "LocalInventoryCounts",
        "LocalInventory",
        "LocalProducts",
      ],
    }),

    // ============================================
    // 11. PRICE HISTORY
    // ============================================
    getLocalPriceHistory: builder.query({
      async queryFn({
        productId,
        variantId,
        limit,
      }: {
        productId?: string;
        variantId?: string;
        limit?: number;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(priceHistory)
            .orderBy(desc(priceHistory.createdAt))
            .$dynamic();

          if (productId) {
            query = query.where(eq(priceHistory.productId, productId));
          }
          if (variantId) {
            query = query.where(eq(priceHistory.variantId, variantId));
          }

          if (limit) {
            query = query.limit(limit);
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalPriceHistory"],
    }),

    createLocalPriceHistory: builder.mutation({
      async queryFn(payload: any) {
        try {
          const db = getOfflineDb();
          const now = new Date().toISOString();
          const { createLocalId } = await import("@/services/offline/ids");

          await db.insert(priceHistory).values({
            id: createLocalId("ph"),
            tenantId: payload.tenantId,
            productId: payload.productId,
            variantId: payload.variantId,
            oldPrice: payload.oldPrice,
            newPrice: payload.newPrice,
            changedBy: payload.changedBy,
            reason: payload.reason,
            syncStatus: "pending",
            createdAt: now,
            updatedAt: now,
          });

          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: [
        "LocalPriceHistory",
        "LocalProducts",
        "LocalProductVariants",
      ],
    }),

    // ============================================
    // 12. SYNC OUTBOX STATUS
    // ============================================
    getPendingSyncItems: builder.query({
      async queryFn() {
        try {
          const db = getOfflineDb();
          const result = await db
            .select()
            .from(syncOutbox)
            .where(eq(syncOutbox.status, "pending"))
            .orderBy(syncOutbox.createdAt);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalSyncOutbox"],
    }),

    getFailedSyncItems: builder.query({
      async queryFn() {
        try {
          const db = getOfflineDb();
          const result = await db
            .select()
            .from(syncOutbox)
            .where(eq(syncOutbox.status, "failed"))
            .orderBy(desc(syncOutbox.updatedAt));
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalSyncOutbox"],
    }),

    getSyncQueueSummary: builder.query({
      async queryFn() {
        try {
          const { getSyncQueueSummary } =
            await import("@/services/offline/repository");
          const result = await getSyncQueueSummary();
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalSyncOutbox"],
    }),

    retryFailedSyncItems: builder.mutation({
      async queryFn(itemIds?: string[]) {
        try {
          const { retryAllFailedOutboxItems, retryOutboxItem } =
            await import("@/services/offline/repository");

          if (itemIds && itemIds.length > 0) {
            for (const id of itemIds) {
              await retryOutboxItem(id);
            }
          } else {
            await retryAllFailedOutboxItems();
          }

          return { data: { success: true } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalSyncOutbox"],
    }),

    clearSyncedOutboxItems: builder.mutation({
      async queryFn() {
        try {
          const { clearSyncedOutboxItems } =
            await import("@/services/offline/repository");
          const count = await clearSyncedOutboxItems();
          return { data: { cleared: count } };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      invalidatesTags: ["LocalSyncOutbox"],
    }),
  }),
});

// ============================================
// HOOKS EXPORTS - ALL HOOKS ✅
// ============================================
export const {
  // Products
  useGetLocalProductsQuery,
  useGetLocalProductByIdQuery,
  useGetLocalProductByBarcodeQuery,
  useGetLocalProductBySkuQuery,
  useCreateLocalProductMutation,
  useUpdateLocalProductMutation,
  useDeleteLocalProductMutation,

  // Product Variants
  useGetLocalVariantsQuery,
  useGetLocalVariantByIdQuery,
  useGetLocalVariantByBarcodeQuery,
  useCreateLocalVariantMutation,
  useUpdateLocalVariantMutation,
  useDeleteLocalVariantMutation,

  // Categories
  useGetLocalCategoriesQuery,
  useGetLocalCategoryByIdQuery,
  useCreateLocalCategoryMutation,
  useUpdateLocalCategoryMutation,
  useDeleteLocalCategoryMutation,

  // Customers
  useGetLocalCustomersQuery,
  useGetLocalCustomerByIdQuery,
  useGetLocalCustomerByPhoneQuery,
  useCreateLocalCustomerMutation,
  useUpdateLocalCustomerMutation,
  useDeleteLocalCustomerMutation,

  // Stores
  useGetLocalStoresQuery,
  useGetLocalStoreByIdQuery,
  useCreateLocalStoreMutation,
  useUpdateLocalStoreMutation,
  useDeleteLocalStoreMutation,

  // Sessions
  useGetLocalSessionsQuery,
  useGetLocalSessionByIdQuery,
  useGetActiveSessionQuery,
  useOpenLocalSessionMutation,
  useCloseLocalSessionMutation,

  // Orders
  useGetLocalOrdersQuery,
  useGetLocalOrderByIdQuery,
  useCreateLocalOrderMutation,
  useUpdateLocalOrderStatusMutation,
  useDeleteLocalOrderMutation,

  // Inventory
  useGetLocalInventoryQuery,
  useGetLocalInventoryByProductQuery,
  useGetLocalInventoryByVariantQuery,
  useGetLocalInventoryItemQuery,

  // Inventory Movements
  useGetLocalInventoryMovementsQuery,
  useCreateLocalInventoryMovementMutation,

  // ✅ ADJUST LOCAL STOCK - FIXED!
  useAdjustLocalStockMutation,

  // Inventory Counts
  useGetLocalInventoryCountsQuery,
  useGetLocalInventoryCountByIdQuery,
  useCreateLocalInventoryCountMutation,

  // Price History
  useGetLocalPriceHistoryQuery,
  useCreateLocalPriceHistoryMutation,

  // Sync Outbox
  useGetPendingSyncItemsQuery,
  useGetFailedSyncItemsQuery,
  useGetSyncQueueSummaryQuery,
  useRetryFailedSyncItemsMutation,
  useClearSyncedOutboxItemsMutation,
} = localApi;

// // ============================================
// // FILE: services/offline/localApi.ts
// // ============================================

// import { getOfflineDb } from "@/services/offline/db";
// import {
//   categories,
//   customers,
//   inventory,
//   inventoryCountItems,
//   inventoryCounts,
//   inventoryMovements,
//   orderItems,
//   orders,
//   priceHistory,
//   products,
//   productVariants,
//   sessions,
//   stores,
//   syncOutbox,
// } from "@/services/offline/schema";
// import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
// import { and, desc, eq, sql } from "drizzle-orm";

// // ============================================
// // TAG TYPES
// // ============================================
// export type LocalTagTypes =
//   | "LocalProducts"
//   | "LocalProductVariants"
//   | "LocalCategories"
//   | "LocalCustomers"
//   | "LocalStores"
//   | "LocalSessions"
//   | "LocalOrders"
//   | "LocalInventory"
//   | "LocalInventoryMovements"
//   | "LocalInventoryCounts"
//   | "LocalPriceHistory"
//   | "LocalSyncOutbox";

// // ============================================
// // LOCAL API
// // ============================================
// export const localApi = createApi({
//   reducerPath: "localApi",
//   baseQuery: fakeBaseQuery<{ message: string }>(),
//   tagTypes: [
//     "LocalProducts",
//     "LocalProductVariants",
//     "LocalCategories",
//     "LocalCustomers",
//     "LocalStores",
//     "LocalSessions",
//     "LocalOrders",
//     "LocalInventory",
//     "LocalInventoryMovements",
//     "LocalInventoryCounts",
//     "LocalPriceHistory",
//     "LocalSyncOutbox",
//   ] as const,
//   endpoints: (builder) => ({
//     // ============================================
//     // 1. PRODUCTS
//     // ============================================
//     getLocalProducts: builder.query({
//       async queryFn({
//         search,
//         categoryId,
//         storeId,
//         isActive,
//       }: {
//         search?: string;
//         categoryId?: string;
//         storeId?: string;
//         isActive?: boolean;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(products)
//             .where(sql`${products.syncStatus} != 'pending_delete'`)
//             .orderBy(desc(products.createdAt))
//             .$dynamic();

//           if (search) {
//             query = query.where(
//               sql`${products.name} LIKE ${`%${search}%`} OR ${products.sku} LIKE ${`%${search}%`} OR ${products.barcode} LIKE ${`%${search}%`}`,
//             );
//           }
//           if (categoryId) {
//             query = query.where(eq(products.categoryId, categoryId));
//           }
//           if (storeId) {
//             query = query.where(eq(products.storeId, storeId));
//           }
//           if (isActive !== undefined) {
//             query = query.where(eq(products.isActive, isActive));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalProducts"],
//     }),

//     getLocalProductById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(products)
//             .where(eq(products.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalProducts", id }],
//     }),

//     getLocalProductByBarcode: builder.query({
//       async queryFn(barcode: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(products)
//             .where(eq(products.barcode, barcode));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalProducts"],
//     }),

//     getLocalProductBySku: builder.query({
//       async queryFn(sku: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(products)
//             .where(eq(products.sku, sku));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalProducts"],
//     }),

//     createLocalProduct: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineProduct } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineProduct(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: [
//         "LocalProducts",
//         "LocalProductVariants",
//         "LocalInventory",
//       ],
//     }),

//     updateLocalProduct: builder.mutation({
//       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
//         try {
//           const { updateOfflineProduct } =
//             await import("@/services/offline/repository");
//           const result = await updateOfflineProduct(id, payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalProducts", id },
//         "LocalProducts",
//       ],
//     }),

//     deleteLocalProduct: builder.mutation({
//       async queryFn(id: string) {
//         try {
//           const { deleteOfflineProduct } =
//             await import("@/services/offline/repository");
//           await deleteOfflineProduct(id);
//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, id) => [
//         { type: "LocalProducts", id },
//         "LocalProducts",
//         "LocalInventory",
//       ],
//     }),

//     // ============================================
//     // 2. PRODUCT VARIANTS
//     // ============================================
//     getLocalVariants: builder.query({
//       async queryFn(productId?: string) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(productVariants)
//             .where(eq(productVariants.isActive, true))
//             .$dynamic();

//           if (productId) {
//             query = query.where(eq(productVariants.productId, productId));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalProductVariants"],
//     }),

//     getLocalVariantById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(productVariants)
//             .where(eq(productVariants.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [
//         { type: "LocalProductVariants", id },
//       ],
//     }),

//     getLocalVariantByBarcode: builder.query({
//       async queryFn(barcode: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(productVariants)
//             .where(eq(productVariants.barcode, barcode));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalProductVariants"],
//     }),

//     createLocalVariant: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const db = getOfflineDb();
//           const now = new Date().toISOString();
//           const { createLocalId } = await import("@/services/offline/ids");

//           const variantId = createLocalId("var");

//           await db.insert(productVariants).values({
//             id: variantId,
//             productId: payload.productId,
//             tenantId: payload.tenantId,
//             name: payload.name,
//             sku: payload.sku,
//             barcode: payload.barcode,
//             price: payload.price,
//             costPrice: payload.costPrice,
//             color: payload.color,
//             size: payload.size,
//             weight: payload.weight,
//             isActive: payload.isActive ?? true,
//             syncStatus: "pending",
//             createdAt: now,
//             updatedAt: now,
//           });

//           return { data: { id: variantId, ...payload } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: [
//         "LocalProductVariants",
//         "LocalProducts",
//         "LocalInventory",
//       ],
//     }),

//     updateLocalVariant: builder.mutation({
//       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
//         try {
//           const db = getOfflineDb();
//           const now = new Date().toISOString();

//           await db
//             .update(productVariants)
//             .set({
//               ...payload,
//               updatedAt: now,
//               syncStatus: "pending",
//             })
//             .where(eq(productVariants.id, id));

//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalProductVariants", id },
//         "LocalProductVariants",
//         "LocalProducts",
//       ],
//     }),

//     deleteLocalVariant: builder.mutation({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           await db
//             .update(productVariants)
//             .set({
//               isActive: false,
//               syncStatus: "pending",
//               updatedAt: new Date().toISOString(),
//             })
//             .where(eq(productVariants.id, id));
//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, id) => [
//         { type: "LocalProductVariants", id },
//         "LocalProductVariants",
//         "LocalInventory",
//       ],
//     }),

//     // ============================================
//     // 3. CATEGORIES
//     // ============================================
//     getLocalCategories: builder.query({
//       async queryFn({
//         storeId,
//         isActive,
//       }: { storeId?: string; isActive?: boolean } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(categories)
//             .orderBy(categories.sortOrder)
//             .$dynamic();

//           if (isActive !== undefined) {
//             query = query.where(eq(categories.isActive, isActive));
//           }
//           if (storeId) {
//             query = query.where(eq(categories.storeId, storeId));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalCategories"],
//     }),

//     getLocalCategoryById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(categories)
//             .where(eq(categories.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalCategories", id }],
//     }),

//     createLocalCategory: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineCategory } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineCategory(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalCategories"],
//     }),

//     updateLocalCategory: builder.mutation({
//       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
//         try {
//           const { updateOfflineCategory } =
//             await import("@/services/offline/repository");
//           const result = await updateOfflineCategory(id, payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalCategories", id },
//         "LocalCategories",
//       ],
//     }),

//     deleteLocalCategory: builder.mutation({
//       async queryFn(id: string) {
//         try {
//           const { deleteOfflineCategory } =
//             await import("@/services/offline/repository");
//           await deleteOfflineCategory(id);
//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, id) => [
//         { type: "LocalCategories", id },
//         "LocalCategories",
//         "LocalProducts",
//       ],
//     }),

//     // ============================================
//     // 4. CUSTOMERS
//     // ============================================
//     getLocalCustomers: builder.query({
//       async queryFn({
//         search,
//         tier,
//         isActive,
//       }: {
//         search?: string;
//         tier?: string;
//         isActive?: boolean;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(customers)
//             .orderBy(desc(customers.createdAt))
//             .$dynamic();

//           if (isActive !== undefined) {
//             query = query.where(eq(customers.isActive, isActive));
//           }
//           if (search) {
//             query = query.where(
//               sql`${customers.name} LIKE ${`%${search}%`} OR ${customers.code} LIKE ${`%${search}%`} OR ${customers.phone} LIKE ${`%${search}%`}`,
//             );
//           }
//           if (tier) {
//             query = query.where(eq(customers.tier, tier));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalCustomers"],
//     }),

//     getLocalCustomerById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(customers)
//             .where(eq(customers.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalCustomers", id }],
//     }),

//     getLocalCustomerByPhone: builder.query({
//       async queryFn(phone: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(customers)
//             .where(eq(customers.phone, phone));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalCustomers"],
//     }),

//     createLocalCustomer: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineCustomer } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineCustomer(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalCustomers"],
//     }),

//     updateLocalCustomer: builder.mutation({
//       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
//         try {
//           const { updateOfflineCustomer } =
//             await import("@/services/offline/repository");
//           const result = await updateOfflineCustomer(id, payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalCustomers", id },
//         "LocalCustomers",
//       ],
//     }),

//     deleteLocalCustomer: builder.mutation({
//       async queryFn(id: string) {
//         try {
//           const { deleteOfflineCustomer } =
//             await import("@/services/offline/repository");
//           await deleteOfflineCustomer(id);
//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, id) => [
//         { type: "LocalCustomers", id },
//         "LocalCustomers",
//       ],
//     }),

//     // ============================================
//     // 5. STORES
//     // ============================================
//     getLocalStores: builder.query({
//       async queryFn({ isActive }: { isActive?: boolean } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db.select().from(stores).$dynamic();

//           if (isActive !== undefined) {
//             query = query.where(eq(stores.isActive, isActive));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalStores"],
//     }),

//     getLocalStoreById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(stores)
//             .where(eq(stores.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalStores", id }],
//     }),

//     createLocalStore: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineStore } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineStore(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalStores"],
//     }),

//     updateLocalStore: builder.mutation({
//       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
//         try {
//           const { updateOfflineStore } =
//             await import("@/services/offline/repository");
//           const result = await updateOfflineStore(id, payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalStores", id },
//         "LocalStores",
//       ],
//     }),

//     deleteLocalStore: builder.mutation({
//       async queryFn(id: string) {
//         try {
//           const { deleteOfflineStore } =
//             await import("@/services/offline/repository");
//           await deleteOfflineStore(id);
//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, id) => [
//         { type: "LocalStores", id },
//         "LocalStores",
//         "LocalInventory",
//       ],
//     }),

//     // ============================================
//     // 6. SESSIONS
//     // ============================================
//     getLocalSessions: builder.query({
//       async queryFn({
//         storeId,
//         status,
//         userId,
//       }: {
//         storeId?: string;
//         status?: string;
//         userId?: string;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(sessions)
//             .orderBy(desc(sessions.createdAt))
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(sessions.storeId, storeId));
//           }
//           if (status) {
//             query = query.where(eq(sessions.status, status));
//           }
//           if (userId) {
//             query = query.where(eq(sessions.userId, userId));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalSessions"],
//     }),

//     getLocalSessionById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(sessions)
//             .where(eq(sessions.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalSessions", id }],
//     }),

//     getActiveSession: builder.query({
//       async queryFn({ userId, storeId }: { userId: string; storeId?: string }) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(sessions)
//             .where(
//               and(eq(sessions.userId, userId), eq(sessions.status, "OPEN")),
//             )
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(sessions.storeId, storeId));
//           }

//           const [result] = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalSessions"],
//     }),

//     openLocalSession: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { openOfflineSession } =
//             await import("@/services/offline/repository");
//           const result = await openOfflineSession(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalSessions"],
//     }),

//     closeLocalSession: builder.mutation({
//       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
//         try {
//           const { closeOfflineSession } =
//             await import("@/services/offline/repository");
//           const result = await closeOfflineSession(id, payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalSessions", id },
//         "LocalSessions",
//       ],
//     }),

//     // ============================================
//     // 7. ORDERS
//     // ============================================
//     getLocalOrders: builder.query({
//       async queryFn({
//         storeId,
//         status,
//         sessionId,
//         customerId,
//         page,
//         limit,
//       }: {
//         storeId?: string;
//         status?: string;
//         sessionId?: string;
//         customerId?: string;
//         page?: number;
//         limit?: number;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(orders)
//             .orderBy(desc(orders.createdAt))
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(orders.storeId, storeId));
//           }
//           if (status) {
//             query = query.where(eq(orders.status, status));
//           }
//           if (sessionId) {
//             query = query.where(eq(orders.sessionId, sessionId));
//           }
//           if (customerId) {
//             query = query.where(eq(orders.customerId, customerId));
//           }

//           if (page && limit) {
//             query = query.limit(limit).offset((page - 1) * limit);
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalOrders"],
//     }),

//     getLocalOrderById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [order] = await db
//             .select()
//             .from(orders)
//             .where(eq(orders.id, id));

//           if (!order) {
//             return { data: null };
//           }

//           const items = await db
//             .select()
//             .from(orderItems)
//             .where(eq(orderItems.orderId, id));

//           return { data: { ...order, items } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalOrders", id }],
//     }),

//     createLocalOrder: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineOrder } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineOrder(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalOrders", "LocalInventory", "LocalCustomers"],
//     }),

//     updateLocalOrderStatus: builder.mutation({
//       async queryFn({ id, status }: { id: string; status: string }) {
//         try {
//           const { updateOfflineOrderStatus } =
//             await import("@/services/offline/repository");
//           const result = await updateOfflineOrderStatus(id, status);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, { id }) => [
//         { type: "LocalOrders", id },
//         "LocalOrders",
//       ],
//     }),

//     deleteLocalOrder: builder.mutation({
//       async queryFn(id: string) {
//         try {
//           const { deleteOfflineOrder } =
//             await import("@/services/offline/repository");
//           await deleteOfflineOrder(id);
//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: (result, error, id) => [
//         { type: "LocalOrders", id },
//         "LocalOrders",
//         "LocalInventory",
//       ],
//     }),

//     // ============================================
//     // 8. INVENTORY
//     // ============================================
//     getLocalInventory: builder.query({
//       async queryFn({
//         storeId,
//         productId,
//         variantId,
//       }: {
//         storeId?: string;
//         productId?: string;
//         variantId?: string;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db.select().from(inventory).$dynamic();

//           if (storeId) {
//             query = query.where(eq(inventory.storeId, storeId));
//           }
//           if (productId) {
//             query = query.where(eq(inventory.productId, productId));
//           }
//           if (variantId) {
//             query = query.where(eq(inventory.variantId, variantId));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalInventory"],
//     }),

//     getLocalInventoryByProduct: builder.query({
//       async queryFn({
//         productId,
//         storeId,
//       }: {
//         productId: string;
//         storeId?: string;
//       }) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(inventory)
//             .where(eq(inventory.productId, productId))
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(inventory.storeId, storeId));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalInventory"],
//     }),

//     getLocalInventoryByVariant: builder.query({
//       async queryFn({
//         variantId,
//         storeId,
//       }: {
//         variantId: string;
//         storeId?: string;
//       }) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(inventory)
//             .where(eq(inventory.variantId, variantId))
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(inventory.storeId, storeId));
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalInventory"],
//     }),

//     getLocalInventoryItem: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [result] = await db
//             .select()
//             .from(inventory)
//             .where(eq(inventory.id, id));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [{ type: "LocalInventory", id }],
//     }),

//     // ============================================
//     // 9. INVENTORY MOVEMENTS
//     // ============================================
//     getLocalInventoryMovements: builder.query({
//       async queryFn({
//         storeId,
//         type,
//         productId,
//         variantId,
//         page,
//         limit,
//       }: {
//         storeId?: string;
//         type?: string;
//         productId?: string;
//         variantId?: string;
//         page?: number;
//         limit?: number;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(inventoryMovements)
//             .orderBy(desc(inventoryMovements.createdAt))
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(inventoryMovements.storeId, storeId));
//           }
//           if (type) {
//             query = query.where(eq(inventoryMovements.type, type));
//           }
//           if (productId) {
//             query = query.where(eq(inventoryMovements.productId, productId));
//           }
//           if (variantId) {
//             query = query.where(eq(inventoryMovements.variantId, variantId));
//           }

//           if (page && limit) {
//             query = query.limit(limit).offset((page - 1) * limit);
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalInventoryMovements"],
//     }),

//     createLocalInventoryMovement: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineInventoryMovement } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineInventoryMovement(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: [
//         "LocalInventoryMovements",
//         "LocalInventory",
//         "LocalProducts",
//       ],
//     }),

//     adjustLocalStock: builder.mutation({
//       async queryFn(payload: {
//         productId: string;
//         storeId: string;
//         newQuantity: number;
//         reason?: string;
//       }) {
//         try {
//           const db = getOfflineDb();
//           const now = new Date().toISOString();

//           // Get current stock
//           const [product] = await db
//             .select()
//             .from(products)
//             .where(eq(products.id, payload.productId))
//             .limit(1);

//           if (!product) {
//             return { error: { message: "Product not found" } };
//           }

//           const diff = payload.newQuantity - product.stockQuantity;

//           // Create an adjustment movement
//           const { createOfflineInventoryMovement } =
//             await import("@/services/offline/repository");
//           const movement = await createOfflineInventoryMovement({
//             storeId: payload.storeId,
//             productId: payload.productId,
//             quantity: Math.abs(diff),
//             type: "ADJUSTMENT",
//             referenceId: `adj-${Date.now()}`,
//             referenceType: "STOCK_ADJUSTMENT",
//             reason:
//               payload.reason ??
//               `Stock adjusted from ${product.stockQuantity} to ${payload.newQuantity}`,
//           });

//           return { data: movement };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalInventory", "LocalProducts"],
//     }),

//     // ============================================
//     // 10. INVENTORY COUNTS
//     // ============================================
//     getLocalInventoryCounts: builder.query({
//       async queryFn({
//         storeId,
//         status,
//         page,
//         limit,
//       }: {
//         storeId?: string;
//         status?: string;
//         page?: number;
//         limit?: number;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(inventoryCounts)
//             .orderBy(desc(inventoryCounts.createdAt))
//             .$dynamic();

//           if (storeId) {
//             query = query.where(eq(inventoryCounts.storeId, storeId));
//           }
//           if (status) {
//             query = query.where(eq(inventoryCounts.status, status));
//           }

//           if (page && limit) {
//             query = query.limit(limit).offset((page - 1) * limit);
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalInventoryCounts"],
//     }),

//     getLocalInventoryCountById: builder.query({
//       async queryFn(id: string) {
//         try {
//           const db = getOfflineDb();
//           const [count] = await db
//             .select()
//             .from(inventoryCounts)
//             .where(eq(inventoryCounts.id, id));

//           if (!count) {
//             return { data: null };
//           }

//           const items = await db
//             .select()
//             .from(inventoryCountItems)
//             .where(eq(inventoryCountItems.countId, id));

//           return { data: { ...count, items } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: (result, error, id) => [
//         { type: "LocalInventoryCounts", id },
//       ],
//     }),

//     createLocalInventoryCount: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const { createOfflineInventoryCount } =
//             await import("@/services/offline/repository");
//           const result = await createOfflineInventoryCount(payload);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: [
//         "LocalInventoryCounts",
//         "LocalInventory",
//         "LocalProducts",
//       ],
//     }),

//     // ============================================
//     // 11. PRICE HISTORY
//     // ============================================
//     getLocalPriceHistory: builder.query({
//       async queryFn({
//         productId,
//         variantId,
//         limit,
//       }: {
//         productId?: string;
//         variantId?: string;
//         limit?: number;
//       } = {}) {
//         try {
//           const db = getOfflineDb();
//           let query = db
//             .select()
//             .from(priceHistory)
//             .orderBy(desc(priceHistory.createdAt))
//             .$dynamic();

//           if (productId) {
//             query = query.where(eq(priceHistory.productId, productId));
//           }
//           if (variantId) {
//             query = query.where(eq(priceHistory.variantId, variantId));
//           }

//           if (limit) {
//             query = query.limit(limit);
//           }

//           const result = await query;
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalPriceHistory"],
//     }),

//     createLocalPriceHistory: builder.mutation({
//       async queryFn(payload: any) {
//         try {
//           const db = getOfflineDb();
//           const now = new Date().toISOString();
//           const { createLocalId } = await import("@/services/offline/ids");

//           await db.insert(priceHistory).values({
//             id: createLocalId("ph"),
//             tenantId: payload.tenantId,
//             productId: payload.productId,
//             variantId: payload.variantId,
//             oldPrice: payload.oldPrice,
//             newPrice: payload.newPrice,
//             changedBy: payload.changedBy,
//             reason: payload.reason,
//             syncStatus: "pending",
//             createdAt: now,
//             updatedAt: now,
//           });

//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: [
//         "LocalPriceHistory",
//         "LocalProducts",
//         "LocalProductVariants",
//       ],
//     }),

//     // ============================================
//     // 12. SYNC OUTBOX STATUS
//     // ============================================
//     getPendingSyncItems: builder.query({
//       async queryFn() {
//         try {
//           const db = getOfflineDb();
//           const result = await db
//             .select()
//             .from(syncOutbox)
//             .where(eq(syncOutbox.status, "pending"))
//             .orderBy(syncOutbox.createdAt);
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalSyncOutbox"],
//     }),

//     getFailedSyncItems: builder.query({
//       async queryFn() {
//         try {
//           const db = getOfflineDb();
//           const result = await db
//             .select()
//             .from(syncOutbox)
//             .where(eq(syncOutbox.status, "failed"))
//             .orderBy(desc(syncOutbox.updatedAt));
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalSyncOutbox"],
//     }),

//     getSyncQueueSummary: builder.query({
//       async queryFn() {
//         try {
//           const { getSyncQueueSummary } =
//             await import("@/services/offline/repository");
//           const result = await getSyncQueueSummary();
//           return { data: result };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       providesTags: ["LocalSyncOutbox"],
//     }),

//     retryFailedSyncItems: builder.mutation({
//       async queryFn(itemIds?: string[]) {
//         try {
//           const { retryAllFailedOutboxItems, retryOutboxItem } =
//             await import("@/services/offline/repository");

//           if (itemIds && itemIds.length > 0) {
//             for (const id of itemIds) {
//               await retryOutboxItem(id);
//             }
//           } else {
//             await retryAllFailedOutboxItems();
//           }

//           return { data: { success: true } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalSyncOutbox"],
//     }),

//     clearSyncedOutboxItems: builder.mutation({
//       async queryFn() {
//         try {
//           const { clearSyncedOutboxItems } =
//             await import("@/services/offline/repository");
//           const count = await clearSyncedOutboxItems();
//           return { data: { cleared: count } };
//         } catch (error) {
//           return { error: { message: (error as Error).message } };
//         }
//       },
//       invalidatesTags: ["LocalSyncOutbox"],
//     }),
//   }),
// });

// // ============================================
// // HOOKS EXPORTS
// // ============================================
// export const {
//   // Products
//   useGetLocalProductsQuery,
//   useGetLocalProductByIdQuery,
//   useGetLocalProductByBarcodeQuery,
//   useGetLocalProductBySkuQuery,
//   useCreateLocalProductMutation,
//   useUpdateLocalProductMutation,
//   useDeleteLocalProductMutation,

//   // Product Variants
//   useGetLocalVariantsQuery,
//   useGetLocalVariantByIdQuery,
//   useGetLocalVariantByBarcodeQuery,
//   useCreateLocalVariantMutation,
//   useUpdateLocalVariantMutation,
//   useDeleteLocalVariantMutation,

//   // Categories
//   useGetLocalCategoriesQuery,
//   useGetLocalCategoryByIdQuery,
//   useCreateLocalCategoryMutation,
//   useUpdateLocalCategoryMutation,
//   useDeleteLocalCategoryMutation,

//   // Customers
//   useGetLocalCustomersQuery,
//   useGetLocalCustomerByIdQuery,
//   useGetLocalCustomerByPhoneQuery,
//   useCreateLocalCustomerMutation,
//   useUpdateLocalCustomerMutation,
//   useDeleteLocalCustomerMutation,

//   // Stores
//   useGetLocalStoresQuery,
//   useGetLocalStoreByIdQuery,
//   useCreateLocalStoreMutation,
//   useUpdateLocalStoreMutation,
//   useDeleteLocalStoreMutation,

//   // Sessions
//   useGetLocalSessionsQuery,
//   useGetLocalSessionByIdQuery,
//   useGetActiveSessionQuery,
//   useOpenLocalSessionMutation,
//   useCloseLocalSessionMutation,

//   // Orders
//   useGetLocalOrdersQuery,
//   useGetLocalOrderByIdQuery,
//   useCreateLocalOrderMutation,
//   useUpdateLocalOrderStatusMutation,
//   useDeleteLocalOrderMutation,

//   // Inventory
//   useGetLocalInventoryQuery,
//   useGetLocalInventoryByProductQuery,
//   useGetLocalInventoryByVariantQuery,
//   useGetLocalInventoryItemQuery,

//   // Inventory Movements
//   useGetLocalInventoryMovementsQuery,
//   useCreateLocalInventoryMovementMutation,

//   // Inventory Counts
//   useGetLocalInventoryCountsQuery,
//   useGetLocalInventoryCountByIdQuery,
//   useCreateLocalInventoryCountMutation,

//   // Price History
//   useGetLocalPriceHistoryQuery,
//   useCreateLocalPriceHistoryMutation,

//   // Sync Outbox
//   useGetPendingSyncItemsQuery,
//   useGetFailedSyncItemsQuery,
//   useGetSyncQueueSummaryQuery,
//   useRetryFailedSyncItemsMutation,
//   useClearSyncedOutboxItemsMutation,
//   useAdjustLocalStockMutation,
// } = localApi;

// // // ============================================
// // // FILE: services/offline/localApi.ts
// // // ============================================

// // import { getOfflineDb } from "@/services/offline/db";
// // import {
// //   categories,
// //   customers,
// //   inventory,
// //   inventoryCountItems,
// //   inventoryCounts,
// //   inventoryMovements,
// //   orderItems,
// //   orders,
// //   priceHistory,
// //   products,
// //   productVariants,
// //   sessions,
// //   stores,
// //   syncOutbox,
// // } from "@/services/offline/schema";
// // import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
// // import { and, desc, eq, sql } from "drizzle-orm";

// // // ============================================
// // // TAG TYPES
// // // ============================================
// // export type LocalTagTypes =
// //   | "LocalProducts"
// //   | "LocalProductVariants"
// //   | "LocalCategories"
// //   | "LocalCustomers"
// //   | "LocalStores"
// //   | "LocalSessions"
// //   | "LocalOrders"
// //   | "LocalInventory"
// //   | "LocalInventoryMovements"
// //   | "LocalInventoryCounts"
// //   | "LocalPriceHistory"
// //   | "LocalSyncOutbox";

// // // ============================================
// // // LOCAL API
// // // ============================================
// // export const localApi = createApi({
// //   reducerPath: "localApi",
// //   baseQuery: fakeBaseQuery<{ message: string }>(),
// //   tagTypes: [
// //     "LocalProducts",
// //     "LocalProductVariants",
// //     "LocalCategories",
// //     "LocalCustomers",
// //     "LocalStores",
// //     "LocalSessions",
// //     "LocalOrders",
// //     "LocalInventory",
// //     "LocalInventoryMovements",
// //     "LocalInventoryCounts",
// //     "LocalPriceHistory",
// //     "LocalSyncOutbox",
// //   ] as const,
// //   endpoints: (builder) => ({
// //     // ============================================
// //     // 1. PRODUCTS
// //     // ============================================
// //     getLocalProducts: builder.query({
// //       async queryFn({
// //         search,
// //         categoryId,
// //         storeId,
// //         isActive,
// //       }: {
// //         search?: string;
// //         categoryId?: string;
// //         storeId?: string;
// //         isActive?: boolean;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(products)
// //             .where(sql`${products.syncStatus} != 'pending_delete'`)
// //             .orderBy(desc(products.createdAt))
// //             .$dynamic();

// //           if (search) {
// //             query = query.where(
// //               sql`${products.name} LIKE ${`%${search}%`} OR ${products.sku} LIKE ${`%${search}%`} OR ${products.barcode} LIKE ${`%${search}%`}`,
// //             );
// //           }
// //           if (categoryId) {
// //             query = query.where(eq(products.categoryId, categoryId));
// //           }
// //           if (storeId) {
// //             query = query.where(eq(products.storeId, storeId));
// //           }
// //           if (isActive !== undefined) {
// //             query = query.where(eq(products.isActive, isActive ? 1 : 0));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalProducts"],
// //     }),

// //     getLocalProductById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(products)
// //             .where(eq(products.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalProducts", id }],
// //     }),

// //     getLocalProductByBarcode: builder.query({
// //       async queryFn(barcode: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(products)
// //             .where(eq(products.barcode, barcode));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalProducts"],
// //     }),

// //     getLocalProductBySku: builder.query({
// //       async queryFn(sku: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(products)
// //             .where(eq(products.sku, sku));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalProducts"],
// //     }),

// //     createLocalProduct: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineProduct } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineProduct(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: [
// //         "LocalProducts",
// //         "LocalProductVariants",
// //         "LocalInventory",
// //       ],
// //     }),

// //     updateLocalProduct: builder.mutation({
// //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// //         try {
// //           const { updateOfflineProduct } =
// //             await import("@/services/offline/repository");
// //           const result = await updateOfflineProduct(id, payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalProducts", id },
// //         "LocalProducts",
// //       ],
// //     }),

// //     deleteLocalProduct: builder.mutation({
// //       async queryFn(id: string) {
// //         try {
// //           const { deleteOfflineProduct } =
// //             await import("@/services/offline/repository");
// //           await deleteOfflineProduct(id);
// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, id) => [
// //         { type: "LocalProducts", id },
// //         "LocalProducts",
// //         "LocalInventory",
// //       ],
// //     }),

// //     // ============================================
// //     // 2. PRODUCT VARIANTS
// //     // ============================================
// //     getLocalVariants: builder.query({
// //       async queryFn(productId?: string) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(productVariants)
// //             .where(eq(productVariants.isActive, true))
// //             .$dynamic();

// //           if (productId) {
// //             query = query.where(eq(productVariants.productId, productId));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalProductVariants"],
// //     }),

// //     getLocalVariantById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(productVariants)
// //             .where(eq(productVariants.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [
// //         { type: "LocalProductVariants", id },
// //       ],
// //     }),

// //     getLocalVariantByBarcode: builder.query({
// //       async queryFn(barcode: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(productVariants)
// //             .where(eq(productVariants.barcode, barcode));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalProductVariants"],
// //     }),

// //     createLocalVariant: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const db = getOfflineDb();
// //           const now = new Date().toISOString();
// //           const { createLocalId } = await import("@/services/offline/ids");

// //           const variantId = createLocalId("var");

// //           await db.insert(productVariants).values({
// //             id: variantId,
// //             productId: payload.productId,
// //             tenantId: payload.tenantId,
// //             name: payload.name,
// //             sku: payload.sku,
// //             barcode: payload.barcode,
// //             price: payload.price,
// //             costPrice: payload.costPrice,
// //             color: payload.color,
// //             size: payload.size,
// //             weight: payload.weight,
// //             isActive: payload.isActive ?? true,
// //             syncStatus: "pending",
// //             createdAt: now,
// //             updatedAt: now,
// //           });

// //           return { data: { id: variantId, ...payload } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: [
// //         "LocalProductVariants",
// //         "LocalProducts",
// //         "LocalInventory",
// //       ],
// //     }),

// //     updateLocalVariant: builder.mutation({
// //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// //         try {
// //           const db = getOfflineDb();
// //           const now = new Date().toISOString();

// //           await db
// //             .update(productVariants)
// //             .set({
// //               ...payload,
// //               updatedAt: now,
// //               syncStatus: "pending",
// //             })
// //             .where(eq(productVariants.id, id));

// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalProductVariants", id },
// //         "LocalProductVariants",
// //         "LocalProducts",
// //       ],
// //     }),

// //     deleteLocalVariant: builder.mutation({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           await db
// //             .update(productVariants)
// //             .set({
// //               isActive: 0,
// //               syncStatus: "pending",
// //               updatedAt: new Date().toISOString(),
// //             })
// //             .where(eq(productVariants.id, id));
// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, id) => [
// //         { type: "LocalProductVariants", id },
// //         "LocalProductVariants",
// //         "LocalInventory",
// //       ],
// //     }),

// //     // ============================================
// //     // 3. CATEGORIES
// //     // ============================================
// //     getLocalCategories: builder.query({
// //       async queryFn({
// //         storeId,
// //         isActive,
// //       }: { storeId?: string; isActive?: boolean } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(categories)
// //             .orderBy(categories.sortOrder);

// //           if (isActive !== undefined) {
// //             query = query.where(eq(categories.isActive, isActive ? 1 : 0));
// //           }
// //           if (storeId) {
// //             query = query.where(eq(categories.storeId, storeId));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalCategories"],
// //     }),

// //     getLocalCategoryById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(categories)
// //             .where(eq(categories.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalCategories", id }],
// //     }),

// //     createLocalCategory: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineCategory } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineCategory(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalCategories"],
// //     }),

// //     updateLocalCategory: builder.mutation({
// //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// //         try {
// //           const { updateOfflineCategory } =
// //             await import("@/services/offline/repository");
// //           const result = await updateOfflineCategory(id, payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalCategories", id },
// //         "LocalCategories",
// //       ],
// //     }),

// //     deleteLocalCategory: builder.mutation({
// //       async queryFn(id: string) {
// //         try {
// //           const { deleteOfflineCategory } =
// //             await import("@/services/offline/repository");
// //           await deleteOfflineCategory(id);
// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, id) => [
// //         { type: "LocalCategories", id },
// //         "LocalCategories",
// //         "LocalProducts",
// //       ],
// //     }),

// //     // ============================================
// //     // 4. CUSTOMERS
// //     // ============================================
// //     getLocalCustomers: builder.query({
// //       async queryFn({
// //         search,
// //         tier,
// //         isActive,
// //       }: {
// //         search?: string;
// //         tier?: string;
// //         isActive?: boolean;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(customers)
// //             .orderBy(desc(customers.createdAt));

// //           if (isActive !== undefined) {
// //             query = query.where(eq(customers.isActive, isActive ? 1 : 0));
// //           }
// //           if (search) {
// //             query = query.where(
// //               sql`${customers.name} LIKE ${`%${search}%`} OR ${customers.code} LIKE ${`%${search}%`} OR ${customers.phone} LIKE ${`%${search}%`}`,
// //             );
// //           }
// //           if (tier) {
// //             query = query.where(eq(customers.tier, tier));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalCustomers"],
// //     }),

// //     getLocalCustomerById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(customers)
// //             .where(eq(customers.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalCustomers", id }],
// //     }),

// //     getLocalCustomerByPhone: builder.query({
// //       async queryFn(phone: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(customers)
// //             .where(eq(customers.phone, phone));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalCustomers"],
// //     }),

// //     createLocalCustomer: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineCustomer } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineCustomer(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalCustomers"],
// //     }),

// //     updateLocalCustomer: builder.mutation({
// //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// //         try {
// //           const { updateOfflineCustomer } =
// //             await import("@/services/offline/repository");
// //           const result = await updateOfflineCustomer(id, payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalCustomers", id },
// //         "LocalCustomers",
// //       ],
// //     }),

// //     deleteLocalCustomer: builder.mutation({
// //       async queryFn(id: string) {
// //         try {
// //           const { deleteOfflineCustomer } =
// //             await import("@/services/offline/repository");
// //           await deleteOfflineCustomer(id);
// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, id) => [
// //         { type: "LocalCustomers", id },
// //         "LocalCustomers",
// //       ],
// //     }),

// //     // ============================================
// //     // 5. STORES
// //     // ============================================
// //     getLocalStores: builder.query({
// //       async queryFn({ isActive }: { isActive?: boolean } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db.select().from(stores);

// //           if (isActive !== undefined) {
// //             query = query.where(eq(stores.isActive, isActive ? 1 : 0));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalStores"],
// //     }),

// //     getLocalStoreById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(stores)
// //             .where(eq(stores.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalStores", id }],
// //     }),

// //     createLocalStore: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineStore } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineStore(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalStores"],
// //     }),

// //     updateLocalStore: builder.mutation({
// //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// //         try {
// //           const { updateOfflineStore } =
// //             await import("@/services/offline/repository");
// //           const result = await updateOfflineStore(id, payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalStores", id },
// //         "LocalStores",
// //       ],
// //     }),

// //     deleteLocalStore: builder.mutation({
// //       async queryFn(id: string) {
// //         try {
// //           const { deleteOfflineStore } =
// //             await import("@/services/offline/repository");
// //           await deleteOfflineStore(id);
// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, id) => [
// //         { type: "LocalStores", id },
// //         "LocalStores",
// //         "LocalInventory",
// //       ],
// //     }),

// //     // ============================================
// //     // 6. SESSIONS
// //     // ============================================
// //     getLocalSessions: builder.query({
// //       async queryFn({
// //         storeId,
// //         status,
// //         userId,
// //       }: {
// //         storeId?: string;
// //         status?: string;
// //         userId?: string;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(sessions)
// //             .orderBy(desc(sessions.createdAt));

// //           if (storeId) {
// //             query = query.where(eq(sessions.storeId, storeId));
// //           }
// //           if (status) {
// //             query = query.where(eq(sessions.status, status));
// //           }
// //           if (userId) {
// //             query = query.where(eq(sessions.userId, userId));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalSessions"],
// //     }),

// //     getLocalSessionById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(sessions)
// //             .where(eq(sessions.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalSessions", id }],
// //     }),

// //     getActiveSession: builder.query({
// //       async queryFn({ userId, storeId }: { userId: string; storeId?: string }) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(sessions)
// //             .where(
// //               and(eq(sessions.userId, userId), eq(sessions.status, "OPEN")),
// //             );

// //           if (storeId) {
// //             query = query.where(eq(sessions.storeId, storeId));
// //           }

// //           const [result] = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalSessions"],
// //     }),

// //     openLocalSession: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { openOfflineSession } =
// //             await import("@/services/offline/repository");
// //           const result = await openOfflineSession(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalSessions"],
// //     }),

// //     closeLocalSession: builder.mutation({
// //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// //         try {
// //           const { closeOfflineSession } =
// //             await import("@/services/offline/repository");
// //           const result = await closeOfflineSession(id, payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalSessions", id },
// //         "LocalSessions",
// //       ],
// //     }),

// //     // ============================================
// //     // 7. ORDERS
// //     // ============================================
// //     getLocalOrders: builder.query({
// //       async queryFn({
// //         storeId,
// //         status,
// //         sessionId,
// //         customerId,
// //         page,
// //         limit,
// //       }: {
// //         storeId?: string;
// //         status?: string;
// //         sessionId?: string;
// //         customerId?: string;
// //         page?: number;
// //         limit?: number;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db.select().from(orders).orderBy(desc(orders.createdAt));

// //           if (storeId) {
// //             query = query.where(eq(orders.storeId, storeId));
// //           }
// //           if (status) {
// //             query = query.where(eq(orders.status, status));
// //           }
// //           if (sessionId) {
// //             query = query.where(eq(orders.sessionId, sessionId));
// //           }
// //           if (customerId) {
// //             query = query.where(eq(orders.customerId, customerId));
// //           }

// //           if (page && limit) {
// //             query = query.limit(limit).offset((page - 1) * limit);
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalOrders"],
// //     }),

// //     getLocalOrderById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [order] = await db
// //             .select()
// //             .from(orders)
// //             .where(eq(orders.id, id));

// //           if (!order) {
// //             return { data: null };
// //           }

// //           const items = await db
// //             .select()
// //             .from(orderItems)
// //             .where(eq(orderItems.orderId, id));

// //           return { data: { ...order, items } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalOrders", id }],
// //     }),

// //     createLocalOrder: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineOrder } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineOrder(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalOrders", "LocalInventory", "LocalCustomers"],
// //     }),

// //     updateLocalOrderStatus: builder.mutation({
// //       async queryFn({ id, status }: { id: string; status: string }) {
// //         try {
// //           const { updateOfflineOrderStatus } =
// //             await import("@/services/offline/repository");
// //           const result = await updateOfflineOrderStatus(id, status);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, { id }) => [
// //         { type: "LocalOrders", id },
// //         "LocalOrders",
// //       ],
// //     }),

// //     deleteLocalOrder: builder.mutation({
// //       async queryFn(id: string) {
// //         try {
// //           const { deleteOfflineOrder } =
// //             await import("@/services/offline/repository");
// //           await deleteOfflineOrder(id);
// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: (result, error, id) => [
// //         { type: "LocalOrders", id },
// //         "LocalOrders",
// //         "LocalInventory",
// //       ],
// //     }),

// //     // ============================================
// //     // 8. INVENTORY
// //     // ============================================
// //     getLocalInventory: builder.query({
// //       async queryFn({
// //         storeId,
// //         productId,
// //         variantId,
// //       }: {
// //         storeId?: string;
// //         productId?: string;
// //         variantId?: string;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db.select().from(inventory);

// //           if (storeId) {
// //             query = query.where(eq(inventory.storeId, storeId));
// //           }
// //           if (productId) {
// //             query = query.where(eq(inventory.productId, productId));
// //           }
// //           if (variantId) {
// //             query = query.where(eq(inventory.variantId, variantId));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalInventory"],
// //     }),

// //     getLocalInventoryByProduct: builder.query({
// //       async queryFn({
// //         productId,
// //         storeId,
// //       }: {
// //         productId: string;
// //         storeId?: string;
// //       }) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(inventory)
// //             .where(eq(inventory.productId, productId));

// //           if (storeId) {
// //             query = query.where(eq(inventory.storeId, storeId));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalInventory"],
// //     }),

// //     getLocalInventoryByVariant: builder.query({
// //       async queryFn({
// //         variantId,
// //         storeId,
// //       }: {
// //         variantId: string;
// //         storeId?: string;
// //       }) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(inventory)
// //             .where(eq(inventory.variantId, variantId));

// //           if (storeId) {
// //             query = query.where(eq(inventory.storeId, storeId));
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalInventory"],
// //     }),

// //     getLocalInventoryItem: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [result] = await db
// //             .select()
// //             .from(inventory)
// //             .where(eq(inventory.id, id));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [{ type: "LocalInventory", id }],
// //     }),

// //     // ============================================
// //     // 9. INVENTORY MOVEMENTS
// //     // ============================================
// //     getLocalInventoryMovements: builder.query({
// //       async queryFn({
// //         storeId,
// //         type,
// //         productId,
// //         variantId,
// //         page,
// //         limit,
// //       }: {
// //         storeId?: string;
// //         type?: string;
// //         productId?: string;
// //         variantId?: string;
// //         page?: number;
// //         limit?: number;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(inventoryMovements)
// //             .orderBy(desc(inventoryMovements.createdAt));

// //           if (storeId) {
// //             query = query.where(eq(inventoryMovements.storeId, storeId));
// //           }
// //           if (type) {
// //             query = query.where(eq(inventoryMovements.type, type));
// //           }
// //           if (productId) {
// //             query = query.where(eq(inventoryMovements.productId, productId));
// //           }
// //           if (variantId) {
// //             query = query.where(eq(inventoryMovements.variantId, variantId));
// //           }

// //           if (page && limit) {
// //             query = query.limit(limit).offset((page - 1) * limit);
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalInventoryMovements"],
// //     }),

// //     createLocalInventoryMovement: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineInventoryMovement } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineInventoryMovement(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: [
// //         "LocalInventoryMovements",
// //         "LocalInventory",
// //         "LocalProducts",
// //       ],
// //     }),

// //     // ============================================
// //     // 10. INVENTORY COUNTS
// //     // ============================================
// //     getLocalInventoryCounts: builder.query({
// //       async queryFn({
// //         storeId,
// //         status,
// //         page,
// //         limit,
// //       }: {
// //         storeId?: string;
// //         status?: string;
// //         page?: number;
// //         limit?: number;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(inventoryCounts)
// //             .orderBy(desc(inventoryCounts.createdAt));

// //           if (storeId) {
// //             query = query.where(eq(inventoryCounts.storeId, storeId));
// //           }
// //           if (status) {
// //             query = query.where(eq(inventoryCounts.status, status));
// //           }

// //           if (page && limit) {
// //             query = query.limit(limit).offset((page - 1) * limit);
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalInventoryCounts"],
// //     }),

// //     getLocalInventoryCountById: builder.query({
// //       async queryFn(id: string) {
// //         try {
// //           const db = getOfflineDb();
// //           const [count] = await db
// //             .select()
// //             .from(inventoryCounts)
// //             .where(eq(inventoryCounts.id, id));

// //           if (!count) {
// //             return { data: null };
// //           }

// //           const items = await db
// //             .select()
// //             .from(inventoryCountItems)
// //             .where(eq(inventoryCountItems.countId, id));

// //           return { data: { ...count, items } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: (result, error, id) => [
// //         { type: "LocalInventoryCounts", id },
// //       ],
// //     }),

// //     createLocalInventoryCount: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const { createOfflineInventoryCount } =
// //             await import("@/services/offline/repository");
// //           const result = await createOfflineInventoryCount(payload);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: [
// //         "LocalInventoryCounts",
// //         "LocalInventory",
// //         "LocalProducts",
// //       ],
// //     }),

// //     // ============================================
// //     // 11. PRICE HISTORY
// //     // ============================================
// //     getLocalPriceHistory: builder.query({
// //       async queryFn({
// //         productId,
// //         variantId,
// //         limit,
// //       }: {
// //         productId?: string;
// //         variantId?: string;
// //         limit?: number;
// //       } = {}) {
// //         try {
// //           const db = getOfflineDb();
// //           let query = db
// //             .select()
// //             .from(priceHistory)
// //             .orderBy(desc(priceHistory.createdAt));

// //           if (productId) {
// //             query = query.where(eq(priceHistory.productId, productId));
// //           }
// //           if (variantId) {
// //             query = query.where(eq(priceHistory.variantId, variantId));
// //           }

// //           if (limit) {
// //             query = query.limit(limit);
// //           }

// //           const result = await query;
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalPriceHistory"],
// //     }),

// //     createLocalPriceHistory: builder.mutation({
// //       async queryFn(payload: any) {
// //         try {
// //           const db = getOfflineDb();
// //           const now = new Date().toISOString();
// //           const { createLocalId } = await import("@/services/offline/ids");

// //           await db.insert(priceHistory).values({
// //             id: createLocalId("ph"),
// //             tenantId: payload.tenantId,
// //             productId: payload.productId,
// //             variantId: payload.variantId,
// //             oldPrice: payload.oldPrice,
// //             newPrice: payload.newPrice,
// //             changedBy: payload.changedBy,
// //             reason: payload.reason,
// //             syncStatus: "pending",
// //             createdAt: now,
// //             updatedAt: now,
// //           });

// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: [
// //         "LocalPriceHistory",
// //         "LocalProducts",
// //         "LocalProductVariants",
// //       ],
// //     }),

// //     // ============================================
// //     // 12. SYNC OUTBOX STATUS
// //     // ============================================
// //     getPendingSyncItems: builder.query({
// //       async queryFn() {
// //         try {
// //           const db = getOfflineDb();
// //           const result = await db
// //             .select()
// //             .from(syncOutbox)
// //             .where(eq(syncOutbox.status, "pending"))
// //             .orderBy(syncOutbox.createdAt);
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalSyncOutbox"],
// //     }),

// //     getFailedSyncItems: builder.query({
// //       async queryFn() {
// //         try {
// //           const db = getOfflineDb();
// //           const result = await db
// //             .select()
// //             .from(syncOutbox)
// //             .where(eq(syncOutbox.status, "failed"))
// //             .orderBy(desc(syncOutbox.updatedAt));
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalSyncOutbox"],
// //     }),

// //     getSyncQueueSummary: builder.query({
// //       async queryFn() {
// //         try {
// //           const { getSyncQueueSummary } =
// //             await import("@/services/offline/repository");
// //           const result = await getSyncQueueSummary();
// //           return { data: result };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       providesTags: ["LocalSyncOutbox"],
// //     }),

// //     retryFailedSyncItems: builder.mutation({
// //       async queryFn(itemIds?: string[]) {
// //         try {
// //           const { retryAllFailedOutboxItems, retryOutboxItem } =
// //             await import("@/services/offline/repository");

// //           if (itemIds && itemIds.length > 0) {
// //             for (const id of itemIds) {
// //               await retryOutboxItem(id);
// //             }
// //           } else {
// //             await retryAllFailedOutboxItems();
// //           }

// //           return { data: { success: true } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalSyncOutbox"],
// //     }),

// //     clearSyncedOutboxItems: builder.mutation({
// //       async queryFn() {
// //         try {
// //           const { clearSyncedOutboxItems } =
// //             await import("@/services/offline/repository");
// //           const count = await clearSyncedOutboxItems();
// //           return { data: { cleared: count } };
// //         } catch (error) {
// //           return { error: { message: (error as Error).message } };
// //         }
// //       },
// //       invalidatesTags: ["LocalSyncOutbox"],
// //     }),
// //   }),
// // });

// // // ============================================
// // // HOOKS EXPORTS
// // // ============================================
// // export const {
// //   // Products
// //   useGetLocalProductsQuery,
// //   useGetLocalProductByIdQuery,
// //   useGetLocalProductByBarcodeQuery,
// //   useGetLocalProductBySkuQuery,
// //   useCreateLocalProductMutation,
// //   useUpdateLocalProductMutation,
// //   useDeleteLocalProductMutation,

// //   // Product Variants
// //   useGetLocalVariantsQuery,
// //   useGetLocalVariantByIdQuery,
// //   useGetLocalVariantByBarcodeQuery,
// //   useCreateLocalVariantMutation,
// //   useUpdateLocalVariantMutation,
// //   useDeleteLocalVariantMutation,

// //   // Categories
// //   useGetLocalCategoriesQuery,
// //   useGetLocalCategoryByIdQuery,
// //   useCreateLocalCategoryMutation,
// //   useUpdateLocalCategoryMutation,
// //   useDeleteLocalCategoryMutation,

// //   // Customers
// //   useGetLocalCustomersQuery,
// //   useGetLocalCustomerByIdQuery,
// //   useGetLocalCustomerByPhoneQuery,
// //   useCreateLocalCustomerMutation,
// //   useUpdateLocalCustomerMutation,
// //   useDeleteLocalCustomerMutation,

// //   // Stores
// //   useGetLocalStoresQuery,
// //   useGetLocalStoreByIdQuery,
// //   useCreateLocalStoreMutation,
// //   useUpdateLocalStoreMutation,
// //   useDeleteLocalStoreMutation,

// //   // Sessions
// //   useGetLocalSessionsQuery,
// //   useGetLocalSessionByIdQuery,
// //   useGetActiveSessionQuery,
// //   useOpenLocalSessionMutation,
// //   useCloseLocalSessionMutation,

// //   // Orders
// //   useGetLocalOrdersQuery,
// //   useGetLocalOrderByIdQuery,
// //   useCreateLocalOrderMutation,
// //   useUpdateLocalOrderStatusMutation,
// //   useDeleteLocalOrderMutation,

// //   // Inventory
// //   useGetLocalInventoryQuery,
// //   useGetLocalInventoryByProductQuery,
// //   useGetLocalInventoryByVariantQuery,
// //   useGetLocalInventoryItemQuery,

// //   // Inventory Movements
// //   useGetLocalInventoryMovementsQuery,
// //   useCreateLocalInventoryMovementMutation,

// //   // Inventory Counts
// //   useGetLocalInventoryCountsQuery,
// //   useGetLocalInventoryCountByIdQuery,
// //   useCreateLocalInventoryCountMutation,

// //   // Price History
// //   useGetLocalPriceHistoryQuery,
// //   useCreateLocalPriceHistoryMutation,

// //   // Sync Outbox
// //   useGetPendingSyncItemsQuery,
// //   useGetFailedSyncItemsQuery,
// //   useGetSyncQueueSummaryQuery,
// //   useRetryFailedSyncItemsMutation,
// //   useClearSyncedOutboxItemsMutation,
// // } = localApi;

// // // // ============================================
// // // // FILE: services/offline/localApi.ts
// // // // ============================================

// // // import { getOfflineDb } from "@/services/offline/db";
// // // import {
// // //   categories,
// // //   customers,
// // //   inventory,
// // //   inventoryCountItems,
// // //   inventoryCounts,
// // //   inventoryMovements,
// // //   orderItems,
// // //   orders,
// // //   priceHistory,
// // //   products,
// // //   productVariants,
// // //   sessions,
// // //   stores,
// // //   syncOutbox,
// // // } from "@/services/offline/schema";
// // // import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
// // // import { and, desc, eq, sql } from "drizzle-orm";

// // // // ============================================
// // // // TAG TYPES
// // // // ============================================
// // // export type LocalTagTypes =
// // //   | "LocalProducts"
// // //   | "LocalProductVariants"
// // //   | "LocalCategories"
// // //   | "LocalCustomers"
// // //   | "LocalStores"
// // //   | "LocalSessions"
// // //   | "LocalOrders"
// // //   | "LocalInventory"
// // //   | "LocalInventoryMovements"
// // //   | "LocalInventoryCounts"
// // //   | "LocalPriceHistory"
// // //   | "LocalSyncOutbox";

// // // // ============================================
// // // // LOCAL API
// // // // ============================================
// // // export const localApi = createApi({
// // //   reducerPath: "localApi",
// // //   baseQuery: fakeBaseQuery<{ message: string }>(),
// // //   tagTypes: [
// // //     "LocalProducts",
// // //     "LocalProductVariants",
// // //     "LocalCategories",
// // //     "LocalCustomers",
// // //     "LocalStores",
// // //     "LocalSessions",
// // //     "LocalOrders",
// // //     "LocalInventory",
// // //     "LocalInventoryMovements",
// // //     "LocalInventoryCounts",
// // //     "LocalPriceHistory",
// // //     "LocalSyncOutbox",
// // //   ] as const,
// // //   endpoints: (builder) => ({
// // //     // ============================================
// // //     // 1. PRODUCTS
// // //     // ============================================
// // //     getLocalProducts: builder.query({
// // //       async queryFn({
// // //         search,
// // //         categoryId,
// // //         storeId,
// // //         isActive,
// // //       }: {
// // //         search?: string;
// // //         categoryId?: string;
// // //         storeId?: string;
// // //         isActive?: boolean;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(products)
// // //             .where(sql`${products.syncStatus} != 'pending_delete'`)
// // //             .orderBy(desc(products.createdAt));

// // //           if (search) {
// // //             query = query.where(
// // //               sql`${products.name} LIKE ${`%${search}%`} OR ${products.sku} LIKE ${`%${search}%`} OR ${products.barcode} LIKE ${`%${search}%`}`,
// // //             );
// // //           }
// // //           if (categoryId) {
// // //             query = query.where(eq(products.categoryId, categoryId));
// // //           }
// // //           if (storeId) {
// // //             query = query.where(eq(products.storeId, storeId));
// // //           }
// // //           if (isActive !== undefined) {
// // //             query = query.where(eq(products.isActive, isActive ? 1 : 0));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalProducts"],
// // //     }),

// // //     getLocalProductById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(products)
// // //             .where(eq(products.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalProducts", id }],
// // //     }),

// // //     getLocalProductByBarcode: builder.query({
// // //       async queryFn(barcode: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(products)
// // //             .where(eq(products.barcode, barcode));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalProducts"],
// // //     }),

// // //     getLocalProductBySku: builder.query({
// // //       async queryFn(sku: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(products)
// // //             .where(eq(products.sku, sku));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalProducts"],
// // //     }),

// // //     createLocalProduct: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         name: string;
// // //         sku?: string;
// // //         barcode?: string;
// // //         description?: string;
// // //         brand?: string;
// // //         costPrice: number;
// // //         sellingPrice: number;
// // //         wholesalePrice?: number;
// // //         categoryId?: string;
// // //         categoryName?: string;
// // //         storeId?: string;
// // //         initialStock?: number;
// // //         variants?: Array<{
// // //           name: string;
// // //           sku: string;
// // //           barcode?: string;
// // //           price: number;
// // //           costPrice: number;
// // //           color?: string;
// // //           size?: string;
// // //           weight?: number;
// // //           isActive?: boolean;
// // //           initialStock?: number;
// // //         }>;
// // //       }) {
// // //         try {
// // //           const { createOfflineProduct } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineProduct(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: [
// // //         "LocalProducts",
// // //         "LocalProductVariants",
// // //         "LocalInventory",
// // //       ],
// // //     }),

// // //     updateLocalProduct: builder.mutation({
// // //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// // //         try {
// // //           const { updateOfflineProduct } =
// // //             await import("@/services/offline/repository");
// // //           const result = await updateOfflineProduct(id, payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalProducts", id },
// // //         "LocalProducts",
// // //       ],
// // //     }),

// // //     deleteLocalProduct: builder.mutation({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const { deleteOfflineProduct } =
// // //             await import("@/services/offline/repository");
// // //           await deleteOfflineProduct(id);
// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, id) => [
// // //         { type: "LocalProducts", id },
// // //         "LocalProducts",
// // //         "LocalInventory",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 2. PRODUCT VARIANTS
// // //     // ============================================
// // //     getLocalVariants: builder.query({
// // //       async queryFn(productId?: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(productVariants)
// // //             .where(eq(productVariants.isActive, 1));

// // //           if (productId) {
// // //             query = query.where(eq(productVariants.productId, productId));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalProductVariants"],
// // //     }),

// // //     getLocalVariantById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(productVariants)
// // //             .where(eq(productVariants.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [
// // //         { type: "LocalProductVariants", id },
// // //       ],
// // //     }),

// // //     getLocalVariantByBarcode: builder.query({
// // //       async queryFn(barcode: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(productVariants)
// // //             .where(eq(productVariants.barcode, barcode));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalProductVariants"],
// // //     }),

// // //     createLocalVariant: builder.mutation({
// // //       async queryFn(payload: {
// // //         productId: string;
// // //         tenantId: string;
// // //         name: string;
// // //         sku: string;
// // //         barcode?: string;
// // //         price: number;
// // //         costPrice: number;
// // //         color?: string;
// // //         size?: string;
// // //         weight?: number;
// // //         isActive?: boolean;
// // //         initialStock?: number;
// // //       }) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const now = new Date().toISOString();
// // //           const { createLocalId } = await import("@/services/offline/ids");

// // //           const variantId = createLocalId("var");

// // //           await db.insert(productVariants).values({
// // //             id: variantId,
// // //             productId: payload.productId,
// // //             tenantId: payload.tenantId,
// // //             name: payload.name,
// // //             sku: payload.sku,
// // //             barcode: payload.barcode,
// // //             price: payload.price,
// // //             costPrice: payload.costPrice,
// // //             color: payload.color,
// // //             size: payload.size,
// // //             weight: payload.weight,
// // //             isActive: payload.isActive ?? true,
// // //             syncStatus: "pending",
// // //             createdAt: now,
// // //             updatedAt: now,
// // //           });

// // //           // Create inventory for variant if initialStock provided
// // //           if (payload.initialStock && payload.initialStock > 0) {
// // //             const { createOfflineInventory } =
// // //               await import("@/services/offline/repository");
// // //             // You'll need to pass storeId from context
// // //             // This is a simplified version
// // //           }

// // //           return { data: { id: variantId, ...payload } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: [
// // //         "LocalProductVariants",
// // //         "LocalProducts",
// // //         "LocalInventory",
// // //       ],
// // //     }),

// // //     updateLocalVariant: builder.mutation({
// // //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const now = new Date().toISOString();

// // //           await db
// // //             .update(productVariants)
// // //             .set({
// // //               ...payload,
// // //               updatedAt: now,
// // //               syncStatus: "pending",
// // //             })
// // //             .where(eq(productVariants.id, id));

// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalProductVariants", id },
// // //         "LocalProductVariants",
// // //         "LocalProducts",
// // //       ],
// // //     }),

// // //     deleteLocalVariant: builder.mutation({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           await db
// // //             .update(productVariants)
// // //             .set({
// // //               isActive: 0,
// // //               syncStatus: "pending",
// // //               updatedAt: new Date().toISOString(),
// // //             })
// // //             .where(eq(productVariants.id, id));
// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, id) => [
// // //         { type: "LocalProductVariants", id },
// // //         "LocalProductVariants",
// // //         "LocalInventory",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 3. CATEGORIES
// // //     // ============================================
// // //     getLocalCategories: builder.query({
// // //       async queryFn({
// // //         storeId,
// // //         isActive,
// // //       }: { storeId?: string; isActive?: boolean } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(categories)
// // //             .orderBy(categories.sortOrder);

// // //           if (isActive !== undefined) {
// // //             query = query.where(eq(categories.isActive, isActive ? 1 : 0));
// // //           }
// // //           if (storeId) {
// // //             query = query.where(eq(categories.storeId, storeId));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalCategories"],
// // //     }),

// // //     getLocalCategoryById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(categories)
// // //             .where(eq(categories.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalCategories", id }],
// // //     }),

// // //     createLocalCategory: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         name: string;
// // //         slug?: string;
// // //         description?: string;
// // //         parentId?: string;
// // //         isActive?: boolean;
// // //         sortOrder?: number;
// // //         storeId?: string;
// // //       }) {
// // //         try {
// // //           const { createOfflineCategory } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineCategory(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalCategories"],
// // //     }),

// // //     updateLocalCategory: builder.mutation({
// // //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// // //         try {
// // //           const { updateOfflineCategory } =
// // //             await import("@/services/offline/repository");
// // //           const result = await updateOfflineCategory(id, payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalCategories", id },
// // //         "LocalCategories",
// // //       ],
// // //     }),

// // //     deleteLocalCategory: builder.mutation({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const { deleteOfflineCategory } =
// // //             await import("@/services/offline/repository");
// // //           await deleteOfflineCategory(id);
// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, id) => [
// // //         { type: "LocalCategories", id },
// // //         "LocalCategories",
// // //         "LocalProducts",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 4. CUSTOMERS
// // //     // ============================================
// // //     getLocalCustomers: builder.query({
// // //       async queryFn({
// // //         search,
// // //         tier,
// // //         isActive,
// // //       }: {
// // //         search?: string;
// // //         tier?: string;
// // //         isActive?: boolean;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(customers)
// // //             .orderBy(desc(customers.createdAt));

// // //           if (isActive !== undefined) {
// // //             query = query.where(eq(customers.isActive, isActive ? 1 : 0));
// // //           }
// // //           if (search) {
// // //             query = query.where(
// // //               sql`${customers.name} LIKE ${`%${search}%`} OR ${customers.code} LIKE ${`%${search}%`} OR ${customers.phone} LIKE ${`%${search}%`}`,
// // //             );
// // //           }
// // //           if (tier) {
// // //             query = query.where(eq(customers.tier, tier));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalCustomers"],
// // //     }),

// // //     getLocalCustomerById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(customers)
// // //             .where(eq(customers.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalCustomers", id }],
// // //     }),

// // //     getLocalCustomerByPhone: builder.query({
// // //       async queryFn(phone: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(customers)
// // //             .where(eq(customers.phone, phone));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalCustomers"],
// // //     }),

// // //     createLocalCustomer: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         name: string;
// // //         code?: string;
// // //         phone?: string;
// // //         email?: string;
// // //         address?: string;
// // //         dateOfBirth?: string;
// // //         gender?: string;
// // //       }) {
// // //         try {
// // //           const { createOfflineCustomer } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineCustomer(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalCustomers"],
// // //     }),

// // //     updateLocalCustomer: builder.mutation({
// // //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// // //         try {
// // //           const { updateOfflineCustomer } =
// // //             await import("@/services/offline/repository");
// // //           const result = await updateOfflineCustomer(id, payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalCustomers", id },
// // //         "LocalCustomers",
// // //       ],
// // //     }),

// // //     deleteLocalCustomer: builder.mutation({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const { deleteOfflineCustomer } =
// // //             await import("@/services/offline/repository");
// // //           await deleteOfflineCustomer(id);
// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, id) => [
// // //         { type: "LocalCustomers", id },
// // //         "LocalCustomers",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 5. STORES
// // //     // ============================================
// // //     getLocalStores: builder.query({
// // //       async queryFn({ isActive }: { isActive?: boolean } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db.select().from(stores);

// // //           if (isActive !== undefined) {
// // //             query = query.where(eq(stores.isActive, isActive ? 1 : 0));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalStores"],
// // //     }),

// // //     getLocalStoreById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(stores)
// // //             .where(eq(stores.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalStores", id }],
// // //     }),

// // //     createLocalStore: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         name: string;
// // //         code?: string;
// // //         address?: string;
// // //         phone?: string;
// // //         email?: string;
// // //         taxNumber?: string;
// // //         isActive?: boolean;
// // //       }) {
// // //         try {
// // //           const { createOfflineStore } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineStore(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalStores"],
// // //     }),

// // //     updateLocalStore: builder.mutation({
// // //       async queryFn({ id, ...payload }: { id: string } & Record<string, any>) {
// // //         try {
// // //           const { updateOfflineStore } =
// // //             await import("@/services/offline/repository");
// // //           const result = await updateOfflineStore(id, payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalStores", id },
// // //         "LocalStores",
// // //       ],
// // //     }),

// // //     deleteLocalStore: builder.mutation({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const { deleteOfflineStore } =
// // //             await import("@/services/offline/repository");
// // //           await deleteOfflineStore(id);
// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, id) => [
// // //         { type: "LocalStores", id },
// // //         "LocalStores",
// // //         "LocalInventory",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 6. SESSIONS
// // //     // ============================================
// // //     getLocalSessions: builder.query({
// // //       async queryFn({
// // //         storeId,
// // //         status,
// // //         userId,
// // //       }: {
// // //         storeId?: string;
// // //         status?: string;
// // //         userId?: string;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(sessions)
// // //             .orderBy(desc(sessions.createdAt));

// // //           if (storeId) {
// // //             query = query.where(eq(sessions.storeId, storeId));
// // //           }
// // //           if (status) {
// // //             query = query.where(eq(sessions.status, status));
// // //           }
// // //           if (userId) {
// // //             query = query.where(eq(sessions.userId, userId));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalSessions"],
// // //     }),

// // //     getLocalSessionById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(sessions)
// // //             .where(eq(sessions.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalSessions", id }],
// // //     }),

// // //     getActiveSession: builder.query({
// // //       async queryFn({ userId, storeId }: { userId: string; storeId?: string }) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(sessions)
// // //             .where(
// // //               and(eq(sessions.userId, userId), eq(sessions.status, "OPEN")),
// // //             );

// // //           if (storeId) {
// // //             query = query.where(eq(sessions.storeId, storeId));
// // //           }

// // //           const [result] = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalSessions"],
// // //     }),

// // //     openLocalSession: builder.mutation({
// // //       async queryFn(payload: {
// // //         userId: string;
// // //         openingBalance: number;
// // //         storeId?: string;
// // //         registerId?: string;
// // //         notes?: string;
// // //       }) {
// // //         try {
// // //           const { openOfflineSession } =
// // //             await import("@/services/offline/repository");
// // //           const result = await openOfflineSession(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalSessions"],
// // //     }),

// // //     closeLocalSession: builder.mutation({
// // //       async queryFn({
// // //         id,
// // //         ...payload
// // //       }: {
// // //         id: string;
// // //         closingBalance: number;
// // //         expectedBalance: number;
// // //         discrepancy: number;
// // //         cashSales?: number;
// // //         cardSales?: number;
// // //         digitalSales?: number;
// // //         notes?: string;
// // //       }) {
// // //         try {
// // //           const { closeOfflineSession } =
// // //             await import("@/services/offline/repository");
// // //           const result = await closeOfflineSession(id, payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalSessions", id },
// // //         "LocalSessions",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 7. ORDERS
// // //     // ============================================
// // //     getLocalOrders: builder.query({
// // //       async queryFn({
// // //         storeId,
// // //         status,
// // //         sessionId,
// // //         customerId,
// // //         page,
// // //         limit,
// // //       }: {
// // //         storeId?: string;
// // //         status?: string;
// // //         sessionId?: string;
// // //         customerId?: string;
// // //         page?: number;
// // //         limit?: number;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db.select().from(orders).orderBy(desc(orders.createdAt));

// // //           if (storeId) {
// // //             query = query.where(eq(orders.storeId, storeId));
// // //           }
// // //           if (status) {
// // //             query = query.where(eq(orders.status, status));
// // //           }
// // //           if (sessionId) {
// // //             query = query.where(eq(orders.sessionId, sessionId));
// // //           }
// // //           if (customerId) {
// // //             query = query.where(eq(orders.customerId, customerId));
// // //           }

// // //           if (page && limit) {
// // //             query = query.limit(limit).offset((page - 1) * limit);
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalOrders"],
// // //     }),

// // //     getLocalOrderById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [order] = await db
// // //             .select()
// // //             .from(orders)
// // //             .where(eq(orders.id, id));

// // //           if (!order) {
// // //             return { data: null };
// // //           }

// // //           const items = await db
// // //             .select()
// // //             .from(orderItems)
// // //             .where(eq(orderItems.orderId, id));

// // //           return { data: { ...order, items } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalOrders", id }],
// // //     }),

// // //     createLocalOrder: builder.mutation({
// // //       async queryFn(payload: any) {
// // //         try {
// // //           const { createOfflineOrder } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineOrder(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalOrders", "LocalInventory", "LocalCustomers"],
// // //     }),

// // //     updateLocalOrderStatus: builder.mutation({
// // //       async queryFn({ id, status }: { id: string; status: string }) {
// // //         try {
// // //           const { updateOfflineOrderStatus } =
// // //             await import("@/services/offline/repository");
// // //           const result = await updateOfflineOrderStatus(id, status);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, { id }) => [
// // //         { type: "LocalOrders", id },
// // //         "LocalOrders",
// // //       ],
// // //     }),

// // //     deleteLocalOrder: builder.mutation({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const { deleteOfflineOrder } =
// // //             await import("@/services/offline/repository");
// // //           await deleteOfflineOrder(id);
// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: (result, error, id) => [
// // //         { type: "LocalOrders", id },
// // //         "LocalOrders",
// // //         "LocalInventory",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 8. INVENTORY
// // //     // ============================================
// // //     getLocalInventory: builder.query({
// // //       async queryFn({
// // //         storeId,
// // //         productId,
// // //         variantId,
// // //       }: {
// // //         storeId?: string;
// // //         productId?: string;
// // //         variantId?: string;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db.select().from(inventory);

// // //           if (storeId) {
// // //             query = query.where(eq(inventory.storeId, storeId));
// // //           }
// // //           if (productId) {
// // //             query = query.where(eq(inventory.productId, productId));
// // //           }
// // //           if (variantId) {
// // //             query = query.where(eq(inventory.variantId, variantId));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalInventory"],
// // //     }),

// // //     getLocalInventoryByProduct: builder.query({
// // //       async queryFn({
// // //         productId,
// // //         storeId,
// // //       }: {
// // //         productId: string;
// // //         storeId?: string;
// // //       }) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(inventory)
// // //             .where(eq(inventory.productId, productId));

// // //           if (storeId) {
// // //             query = query.where(eq(inventory.storeId, storeId));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalInventory"],
// // //     }),

// // //     getLocalInventoryByVariant: builder.query({
// // //       async queryFn({
// // //         variantId,
// // //         storeId,
// // //       }: {
// // //         variantId: string;
// // //         storeId?: string;
// // //       }) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(inventory)
// // //             .where(eq(inventory.variantId, variantId));

// // //           if (storeId) {
// // //             query = query.where(eq(inventory.storeId, storeId));
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalInventory"],
// // //     }),

// // //     getLocalInventoryItem: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [result] = await db
// // //             .select()
// // //             .from(inventory)
// // //             .where(eq(inventory.id, id));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [{ type: "LocalInventory", id }],
// // //     }),

// // //     // ============================================
// // //     // 9. INVENTORY MOVEMENTS
// // //     // ============================================
// // //     getLocalInventoryMovements: builder.query({
// // //       async queryFn({
// // //         storeId,
// // //         type,
// // //         productId,
// // //         variantId,
// // //         page,
// // //         limit,
// // //       }: {
// // //         storeId?: string;
// // //         type?: string;
// // //         productId?: string;
// // //         variantId?: string;
// // //         page?: number;
// // //         limit?: number;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(inventoryMovements)
// // //             .orderBy(desc(inventoryMovements.createdAt));

// // //           if (storeId) {
// // //             query = query.where(eq(inventoryMovements.storeId, storeId));
// // //           }
// // //           if (type) {
// // //             query = query.where(eq(inventoryMovements.type, type));
// // //           }
// // //           if (productId) {
// // //             query = query.where(eq(inventoryMovements.productId, productId));
// // //           }
// // //           if (variantId) {
// // //             query = query.where(eq(inventoryMovements.variantId, variantId));
// // //           }

// // //           if (page && limit) {
// // //             query = query.limit(limit).offset((page - 1) * limit);
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalInventoryMovements"],
// // //     }),

// // //     createLocalInventoryMovement: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         storeId: string;
// // //         productId: string;
// // //         variantId?: string;
// // //         quantity: number;
// // //         type:
// // //           | "IN"
// // //           | "OUT"
// // //           | "TRANSFER_IN"
// // //           | "TRANSFER_OUT"
// // //           | "ADJUSTMENT"
// // //           | "COUNT";
// // //         referenceId: string;
// // //         referenceType: string;
// // //         reason?: string;
// // //       }) {
// // //         try {
// // //           const { createOfflineInventoryMovement } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineInventoryMovement(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: [
// // //         "LocalInventoryMovements",
// // //         "LocalInventory",
// // //         "LocalProducts",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 10. INVENTORY COUNTS
// // //     // ============================================
// // //     getLocalInventoryCounts: builder.query({
// // //       async queryFn({
// // //         storeId,
// // //         status,
// // //         page,
// // //         limit,
// // //       }: {
// // //         storeId?: string;
// // //         status?: string;
// // //         page?: number;
// // //         limit?: number;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(inventoryCounts)
// // //             .orderBy(desc(inventoryCounts.createdAt));

// // //           if (storeId) {
// // //             query = query.where(eq(inventoryCounts.storeId, storeId));
// // //           }
// // //           if (status) {
// // //             query = query.where(eq(inventoryCounts.status, status));
// // //           }

// // //           if (page && limit) {
// // //             query = query.limit(limit).offset((page - 1) * limit);
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalInventoryCounts"],
// // //     }),

// // //     getLocalInventoryCountById: builder.query({
// // //       async queryFn(id: string) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const [count] = await db
// // //             .select()
// // //             .from(inventoryCounts)
// // //             .where(eq(inventoryCounts.id, id));

// // //           if (!count) {
// // //             return { data: null };
// // //           }

// // //           const items = await db
// // //             .select()
// // //             .from(inventoryCountItems)
// // //             .where(eq(inventoryCountItems.countId, id));

// // //           return { data: { ...count, items } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: (result, error, id) => [
// // //         { type: "LocalInventoryCounts", id },
// // //       ],
// // //     }),

// // //     createLocalInventoryCount: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         storeId: string;
// // //         scheduledDate?: string;
// // //         items: {
// // //           productId: string;
// // //           variantId?: string;
// // //           systemQuantity: number;
// // //           countedQuantity: number;
// // //           reason?: string;
// // //         }[];
// // //       }) {
// // //         try {
// // //           const { createOfflineInventoryCount } =
// // //             await import("@/services/offline/repository");
// // //           const result = await createOfflineInventoryCount(payload);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: [
// // //         "LocalInventoryCounts",
// // //         "LocalInventory",
// // //         "LocalProducts",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 11. PRICE HISTORY
// // //     // ============================================
// // //     getLocalPriceHistory: builder.query({
// // //       async queryFn({
// // //         productId,
// // //         variantId,
// // //         limit,
// // //       }: {
// // //         productId?: string;
// // //         variantId?: string;
// // //         limit?: number;
// // //       } = {}) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           let query = db
// // //             .select()
// // //             .from(priceHistory)
// // //             .orderBy(desc(priceHistory.createdAt));

// // //           if (productId) {
// // //             query = query.where(eq(priceHistory.productId, productId));
// // //           }
// // //           if (variantId) {
// // //             query = query.where(eq(priceHistory.variantId, variantId));
// // //           }

// // //           if (limit) {
// // //             query = query.limit(limit);
// // //           }

// // //           const result = await query;
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalPriceHistory"],
// // //     }),

// // //     createLocalPriceHistory: builder.mutation({
// // //       async queryFn(payload: {
// // //         tenantId: string;
// // //         productId: string;
// // //         variantId?: string;
// // //         oldPrice: number;
// // //         newPrice: number;
// // //         changedBy?: string;
// // //         reason?: string;
// // //       }) {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const now = new Date().toISOString();
// // //           const { createLocalId } = await import("@/services/offline/ids");

// // //           await db.insert(priceHistory).values({
// // //             id: createLocalId("ph"),
// // //             tenantId: payload.tenantId,
// // //             productId: payload.productId,
// // //             variantId: payload.variantId,
// // //             oldPrice: payload.oldPrice,
// // //             newPrice: payload.newPrice,
// // //             changedBy: payload.changedBy,
// // //             reason: payload.reason,
// // //             syncStatus: "pending",
// // //             createdAt: now,
// // //             updatedAt: now,
// // //           });

// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: [
// // //         "LocalPriceHistory",
// // //         "LocalProducts",
// // //         "LocalProductVariants",
// // //       ],
// // //     }),

// // //     // ============================================
// // //     // 12. SYNC OUTBOX STATUS
// // //     // ============================================
// // //     getPendingSyncItems: builder.query({
// // //       async queryFn() {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const result = await db
// // //             .select()
// // //             .from(syncOutbox)
// // //             .where(eq(syncOutbox.status, "pending"))
// // //             .orderBy(syncOutbox.createdAt);
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalSyncOutbox"],
// // //     }),

// // //     getFailedSyncItems: builder.query({
// // //       async queryFn() {
// // //         try {
// // //           const db = getOfflineDb();
// // //           const result = await db
// // //             .select()
// // //             .from(syncOutbox)
// // //             .where(eq(syncOutbox.status, "failed"))
// // //             .orderBy(desc(syncOutbox.updatedAt));
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalSyncOutbox"],
// // //     }),

// // //     getSyncQueueSummary: builder.query({
// // //       async queryFn() {
// // //         try {
// // //           const { getSyncQueueSummary } =
// // //             await import("@/services/offline/repository");
// // //           const result = await getSyncQueueSummary();
// // //           return { data: result };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       providesTags: ["LocalSyncOutbox"],
// // //     }),

// // //     retryFailedSyncItems: builder.mutation({
// // //       async queryFn(itemIds?: string[]) {
// // //         try {
// // //           const { retryAllFailedOutboxItems, retryOutboxItem } =
// // //             await import("@/services/offline/repository");

// // //           if (itemIds && itemIds.length > 0) {
// // //             for (const id of itemIds) {
// // //               await retryOutboxItem(id);
// // //             }
// // //           } else {
// // //             await retryAllFailedOutboxItems();
// // //           }

// // //           return { data: { success: true } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalSyncOutbox"],
// // //     }),

// // //     clearSyncedOutboxItems: builder.mutation({
// // //       async queryFn() {
// // //         try {
// // //           const { clearSyncedOutboxItems } =
// // //             await import("@/services/offline/repository");
// // //           const count = await clearSyncedOutboxItems();
// // //           return { data: { cleared: count } };
// // //         } catch (error) {
// // //           return { error: { message: (error as Error).message } };
// // //         }
// // //       },
// // //       invalidatesTags: ["LocalSyncOutbox"],
// // //     }),
// // //   }),
// // // });

// // // // ============================================
// // // // HOOKS EXPORTS
// // // // ============================================
// // // export const {
// // //   // Products
// // //   useGetLocalProductsQuery,
// // //   useGetLocalProductByIdQuery,
// // //   useGetLocalProductByBarcodeQuery,
// // //   useGetLocalProductBySkuQuery,
// // //   useCreateLocalProductMutation,
// // //   useUpdateLocalProductMutation,
// // //   useDeleteLocalProductMutation,

// // //   // Product Variants
// // //   useGetLocalVariantsQuery,
// // //   useGetLocalVariantByIdQuery,
// // //   useGetLocalVariantByBarcodeQuery,
// // //   useCreateLocalVariantMutation,
// // //   useUpdateLocalVariantMutation,
// // //   useDeleteLocalVariantMutation,

// // //   // Categories
// // //   useGetLocalCategoriesQuery,
// // //   useGetLocalCategoryByIdQuery,
// // //   useCreateLocalCategoryMutation,
// // //   useUpdateLocalCategoryMutation,
// // //   useDeleteLocalCategoryMutation,

// // //   // Customers
// // //   useGetLocalCustomersQuery,
// // //   useGetLocalCustomerByIdQuery,
// // //   useGetLocalCustomerByPhoneQuery,
// // //   useCreateLocalCustomerMutation,
// // //   useUpdateLocalCustomerMutation,
// // //   useDeleteLocalCustomerMutation,

// // //   // Stores
// // //   useGetLocalStoresQuery,
// // //   useGetLocalStoreByIdQuery,
// // //   useCreateLocalStoreMutation,
// // //   useUpdateLocalStoreMutation,
// // //   useDeleteLocalStoreMutation,

// // //   // Sessions
// // //   useGetLocalSessionsQuery,
// // //   useGetLocalSessionByIdQuery,
// // //   useGetActiveSessionQuery,
// // //   useOpenLocalSessionMutation,
// // //   useCloseLocalSessionMutation,

// // //   // Orders
// // //   useGetLocalOrdersQuery,
// // //   useGetLocalOrderByIdQuery,
// // //   useCreateLocalOrderMutation,
// // //   useUpdateLocalOrderStatusMutation,
// // //   useDeleteLocalOrderMutation,

// // //   // Inventory
// // //   useGetLocalInventoryQuery,
// // //   useGetLocalInventoryByProductQuery,
// // //   useGetLocalInventoryByVariantQuery,
// // //   useGetLocalInventoryItemQuery,

// // //   // Inventory Movements
// // //   useGetLocalInventoryMovementsQuery,
// // //   useCreateLocalInventoryMovementMutation,

// // //   // Inventory Counts
// // //   useGetLocalInventoryCountsQuery,
// // //   useGetLocalInventoryCountByIdQuery,
// // //   useCreateLocalInventoryCountMutation,

// // //   // Price History
// // //   useGetLocalPriceHistoryQuery,
// // //   useCreateLocalPriceHistoryMutation,

// // //   // Sync Outbox
// // //   useGetPendingSyncItemsQuery,
// // //   useGetFailedSyncItemsQuery,
// // //   useGetSyncQueueSummaryQuery,
// // //   useRetryFailedSyncItemsMutation,
// // //   useClearSyncedOutboxItemsMutation,
// // // } = localApi;

// // // // // services/offline/localDbApi.ts
// // // // import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
// // // // import { getOfflineDb } from "@/services/offline/db";
// // // // import {
// // // //   products,
// // // //   categories,
// // // //   customers,
// // // //   stores,
// // // //   sessions,
// // // //   orders,
// // // //   orderItems,
// // // //   inventoryMovements,
// // // //   inventoryCounts,
// // // //   inventoryCountItems,
// // // //   syncOutbox,
// // // // } from "@/services/offline/schema";
// // // // import { eq, desc, and, like, sql, inArray } from "drizzle-orm";

// // // // export const localApi = createApi({
// // // //   reducerPath: "localApi",
// // // //   baseQuery: fakeBaseQuery<{ message: string }>(),
// // // //   tagTypes: [
// // // //     "LocalProducts",
// // // //     "LocalCategories",
// // // //     "LocalCustomers",
// // // //     "LocalStores",
// // // //     "LocalSessions",
// // // //     "LocalOrders",
// // // //     "LocalInventory",
// // // //     "LocalSyncOutbox",
// // // //   ],
// // // //   endpoints: (builder) => ({
// // // //     // ============================================
// // // //     // 1. PRODUCTS
// // // //     // ============================================
// // // //     getLocalProducts: builder.query({
// // // //       async queryFn({
// // // //         search,
// // // //         categoryId,
// // // //         storeId,
// // // //       }: { search?: string; categoryId?: string; storeId?: string } = {}) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db
// // // //             .select()
// // // //             .from(products)
// // // //             .where(sql`${products.syncStatus} != 'pending_delete'`)
// // // //             .orderBy(desc(products.createdAt));

// // // //           if (search) {
// // // //             query = query.where(
// // // //               sql`${products.name} LIKE ${`%${search}%`} OR ${products.sku} LIKE ${`%${search}%`}`,
// // // //             );
// // // //           }
// // // //           if (categoryId) {
// // // //             query = query.where(eq(products.categoryId, categoryId));
// // // //           }
// // // //           if (storeId) {
// // // //             query = query.where(eq(products.storeId, storeId));
// // // //           }

// // // //           const result = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalProducts"],
// // // //     }),

// // // //     getLocalProductById: builder.query({
// // // //       async queryFn(id: string) {
// // // //         pos_app / services / api / localApi.ts;
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const [result] = await db
// // // //             .select()
// // // //             .from(products)
// // // //             .where(eq(products.id, id));
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: (result, error, id) => [{ type: "LocalProducts", id }],
// // // //     }),

// // // //     getLocalProductByBarcode: builder.query({
// // // //       async queryFn(barcode: string) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const [result] = await db
// // // //             .select()
// // // //             .from(products)
// // // //             .where(eq(products.barcode, barcode));
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalProducts"],
// // // //     }),

// // // //     createLocalProduct: builder.mutation({
// // // //       async queryFn(payload: {
// // // //         name: string;
// // // //         sku?: string;
// // // //         costPrice: number;
// // // //         sellingPrice: number;
// // // //         stockQuantity: number;
// // // //         categoryId?: string;
// // // //         storeId?: string;
// // // //       }) {
// // // //         try {
// // // //           const { createOfflineProduct } = await import(
// // // //             "@/services/offline/repository"
// // // //           );
// // // //           const result = await createOfflineProduct(payload);
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       invalidatesTags: ["LocalProducts", "LocalInventory"],
// // // //     }),

// // // //     // ============================================
// // // //     // 2. CATEGORIES
// // // //     // ============================================
// // // //     getLocalCategories: builder.query({
// // // //       async queryFn() {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const result = await db
// // // //             .select()
// // // //             .from(categories)
// // // //             .where(sql`${categories.isActive} = 1`)
// // // //             .orderBy(categories.sortOrder);
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalCategories"],
// // // //     }),

// // // //     // ============================================
// // // //     // 3. CUSTOMERS
// // // //     // ============================================
// // // //     getLocalCustomers: builder.query({
// // // //       async queryFn({ search, tier }: { search?: string; tier?: string } = {}) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db
// // // //             .select()
// // // //             .from(customers)
// // // //             .where(sql`${customers.isActive} = 1`)
// // // //             .orderBy(desc(customers.createdAt));

// // // //           if (search) {
// // // //             query = query.where(
// // // //               sql`${customers.name} LIKE ${`%${search}%`} OR ${customers.code} LIKE ${`%${search}%`} OR ${customers.phone} LIKE ${`%${search}%`}`,
// // // //             );
// // // //           }
// // // //           if (tier) {
// // // //             query = query.where(eq(customers.tier, tier));
// // // //           }

// // // //           const result = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalCustomers"],
// // // //     }),

// // // //     getLocalCustomerById: builder.query({
// // // //       async queryFn(id: string) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const [result] = await db
// // // //             .select()
// // // //             .from(customers)
// // // //             .where(eq(customers.id, id));
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: (result, error, id) => [{ type: "LocalCustomers", id }],
// // // //     }),

// // // //     // ============================================
// // // //     // 4. STORES
// // // //     // ============================================
// // // //     getLocalStores: builder.query({
// // // //       async queryFn() {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const result = await db
// // // //             .select()
// // // //             .from(stores)
// // // //             .where(sql`${stores.isActive} = 1`);
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalStores"],
// // // //     }),

// // // //     // ============================================
// // // //     // 5. SESSIONS
// // // //     // ============================================
// // // //     getLocalSessions: builder.query({
// // // //       async queryFn({
// // // //         storeId,
// // // //         status,
// // // //       }: { storeId?: string; status?: string } = {}) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db
// // // //             .select()
// // // //             .from(sessions)
// // // //             .orderBy(desc(sessions.createdAt));

// // // //           if (storeId) {
// // // //             query = query.where(eq(sessions.storeId, storeId));
// // // //           }
// // // //           if (status) {
// // // //             query = query.where(eq(sessions.status, status));
// // // //           }

// // // //           const result = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalSessions"],
// // // //     }),

// // // //     getActiveSession: builder.query({
// // // //       async queryFn({ userId, storeId }: { userId: string; storeId?: string }) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db
// // // //             .select()
// // // //             .from(sessions)
// // // //             .where(
// // // //               and(eq(sessions.userId, userId), eq(sessions.status, "OPEN")),
// // // //             );

// // // //           if (storeId) {
// // // //             query = query.where(eq(sessions.storeId, storeId));
// // // //           }

// // // //           const [result] = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalSessions"],
// // // //     }),

// // // //     // ============================================
// // // //     // 6. ORDERS
// // // //     // ============================================
// // // //     getLocalOrders: builder.query({
// // // //       async queryFn({
// // // //         storeId,
// // // //         status,
// // // //         sessionId,
// // // //         page,
// // // //         limit,
// // // //       }: {
// // // //         storeId?: string;
// // // //         status?: string;
// // // //         sessionId?: string;
// // // //         page?: number;
// // // //         limit?: number;
// // // //       } = {}) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db.select().from(orders).orderBy(desc(orders.createdAt));

// // // //           if (storeId) {
// // // //             query = query.where(eq(orders.storeId, storeId));
// // // //           }
// // // //           if (status) {
// // // //             query = query.where(eq(orders.status, status));
// // // //           }
// // // //           if (sessionId) {
// // // //             query = query.where(eq(orders.sessionId, sessionId));
// // // //           }

// // // //           if (page && limit) {
// // // //             query = query.limit(limit).offset((page - 1) * limit);
// // // //           }

// // // //           const result = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalOrders"],
// // // //     }),

// // // //     getLocalOrderById: builder.query({
// // // //       async queryFn(id: string) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const [order] = await db
// // // //             .select()
// // // //             .from(orders)
// // // //             .where(eq(orders.id, id));

// // // //           if (!order) {
// // // //             return { data: null };
// // // //           }

// // // //           const items = await db
// // // //             .select()
// // // //             .from(orderItems)
// // // //             .where(eq(orderItems.orderId, id));

// // // //           return { data: { ...order, items } };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: (result, error, id) => [{ type: "LocalOrders", id }],
// // // //     }),

// // // //     // ============================================
// // // //     // 7. INVENTORY
// // // //     // ============================================
// // // //     getLocalInventory: builder.query({
// // // //       async queryFn({
// // // //         storeId,
// // // //         productId,
// // // //       }: { storeId?: string; productId?: string } = {}) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db
// // // //             .select()
// // // //             .from(products)
// // // //             .where(sql`${products.syncStatus} != 'pending_delete'`);

// // // //           if (storeId) {
// // // //             query = query.where(eq(products.storeId, storeId));
// // // //           }
// // // //           if (productId) {
// // // //             query = query.where(eq(products.id, productId));
// // // //           }

// // // //           const result = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalInventory"],
// // // //     }),

// // // //     getLocalInventoryMovements: builder.query({
// // // //       async queryFn({
// // // //         storeId,
// // // //         type,
// // // //         page,
// // // //         limit,
// // // //       }: {
// // // //         storeId?: string;
// // // //         type?: string;
// // // //         page?: number;
// // // //         limit?: number;
// // // //       } = {}) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           let query = db
// // // //             .select()
// // // //             .from(inventoryMovements)
// // // //             .orderBy(desc(inventoryMovements.createdAt));

// // // //           if (storeId) {
// // // //             query = query.where(eq(inventoryMovements.storeId, storeId));
// // // //           }
// // // //           if (type) {
// // // //             query = query.where(eq(inventoryMovements.type, type));
// // // //           }

// // // //           if (page && limit) {
// // // //             query = query.limit(limit).offset((page - 1) * limit);
// // // //           }

// // // //           const result = await query;
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalInventory"],
// // // //     }),

// // // //     // ============================================
// // // //     // 7b. INVENTORY MUTATIONS
// // // //     // ============================================
// // // //     createLocalInventoryMovement: builder.mutation({
// // // //       async queryFn(payload: {
// // // //         storeId: string;
// // // //         productId: string;
// // // //         variantId?: string;
// // // //         quantity: number;
// // // //         type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "COUNT";
// // // //         referenceId: string;
// // // //         referenceType: string;
// // // //         reason?: string;
// // // //       }) {
// // // //         try {
// // // //           const { createOfflineInventoryMovement } = await import(
// // // //             "@/services/offline/repository"
// // // //           );
// // // //           const result = await createOfflineInventoryMovement(payload);
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       invalidatesTags: ["LocalInventory", "LocalProducts"],
// // // //     }),

// // // //     createLocalInventoryCount: builder.mutation({
// // // //       async queryFn(payload: {
// // // //         storeId: string;
// // // //         scheduledDate?: string;
// // // //         items: {
// // // //           productId: string;
// // // //           variantId?: string;
// // // //           systemQuantity: number;
// // // //           countedQuantity: number;
// // // //           reason?: string;
// // // //         }[];
// // // //       }) {
// // // //         try {
// // // //           const { createOfflineInventoryCount } = await import(
// // // //             "@/services/offline/repository"
// // // //           );
// // // //           const result = await createOfflineInventoryCount(payload);
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       invalidatesTags: ["LocalInventory", "LocalProducts"],
// // // //     }),

// // // //     adjustLocalStock: builder.mutation({
// // // //       async queryFn(payload: {
// // // //         productId: string;
// // // //         storeId: string;
// // // //         newQuantity: number;
// // // //         reason?: string;
// // // //       }) {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const now = new Date().toISOString();

// // // //           // Get current stock
// // // //           const [product] = await db
// // // //             .select()
// // // //             .from(products)
// // // //             .where(eq(products.id, payload.productId))
// // // //             .limit(1);

// // // //           if (!product) {
// // // //             return { error: { message: "Product not found" } };
// // // //           }

// // // //           const diff = payload.newQuantity - product.stockQuantity;

// // // //           // Create an adjustment movement
// // // //           const { createOfflineInventoryMovement } = await import(
// // // //             "@/services/offline/repository"
// // // //           );
// // // //           const movement = await createOfflineInventoryMovement({
// // // //             storeId: payload.storeId,
// // // //             productId: payload.productId,
// // // //             quantity: Math.abs(diff),
// // // //             type: "ADJUSTMENT",
// // // //             referenceId: `adj-${Date.now()}`,
// // // //             referenceType: "STOCK_ADJUSTMENT",
// // // //             reason: payload.reason ?? `Stock adjusted from ${product.stockQuantity} to ${payload.newQuantity}`,
// // // //           });

// // // //           return { data: movement };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       invalidatesTags: ["LocalInventory", "LocalProducts"],
// // // //     }),

// // // //     // ============================================
// // // //     // 8. SYNC OUTBOX STATUS
// // // //     // ============================================
// // // //     getPendingSyncItems: builder.query({
// // // //       async queryFn() {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const result = await db
// // // //             .select()
// // // //             .from(syncOutbox)
// // // //             .where(eq(syncOutbox.status, "pending"))
// // // //             .orderBy(syncOutbox.createdAt);
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalSyncOutbox"],
// // // //     }),

// // // //     getFailedSyncItems: builder.query({
// // // //       async queryFn() {
// // // //         try {
// // // //           const db = getOfflineDb();
// // // //           const result = await db
// // // //             .select()
// // // //             .from(syncOutbox)
// // // //             .where(eq(syncOutbox.status, "failed"))
// // // //             .orderBy(desc(syncOutbox.updatedAt));
// // // //           return { data: result };
// // // //         } catch (error) {
// // // //           return { error: { message: (error as Error).message } };
// // // //         }
// // // //       },
// // // //       providesTags: ["LocalSyncOutbox"],
// // // //     }),
// // // //   }),
// // // // });

// // // // // UI မှာ သုံးဖို့ Hooks တွေ
// // // // export const {
// // // //   useGetLocalProductsQuery,
// // // //   useGetLocalProductByIdQuery,
// // // //   useGetLocalProductByBarcodeQuery,
// // // //   useCreateLocalProductMutation,
// // // //   useGetLocalCategoriesQuery,
// // // //   useGetLocalCustomersQuery,
// // // //   useGetLocalCustomerByIdQuery,
// // // //   useGetLocalStoresQuery,
// // // //   useGetLocalSessionsQuery,
// // // //   useGetActiveSessionQuery,
// // // //   useGetLocalOrdersQuery,
// // // //   useGetLocalOrderByIdQuery,
// // // //   useGetLocalInventoryQuery,
// // // //   useGetLocalInventoryMovementsQuery,
// // // //   useCreateLocalInventoryMovementMutation,
// // // //   useCreateLocalInventoryCountMutation,
// // // //   useAdjustLocalStockMutation,
// // // //   useGetPendingSyncItemsQuery,
// // // //   useGetFailedSyncItemsQuery,
// // // // } = localApi;
