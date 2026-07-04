// services/offline/localDbApi.ts
import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { getOfflineDb } from "@/services/offline/db";
import {
  products,
  categories,
  customers,
  stores,
  sessions,
  orders,
  orderItems,
  inventoryMovements,
  inventoryCounts,
  inventoryCountItems,
  syncOutbox,
} from "@/services/offline/schema";
import { eq, desc, and, like, sql, inArray } from "drizzle-orm";

export const localApi = createApi({
  reducerPath: "localApi",
  baseQuery: fakeBaseQuery<{ message: string }>(),
  tagTypes: [
    "LocalProducts",
    "LocalCategories",
    "LocalCustomers",
    "LocalStores",
    "LocalSessions",
    "LocalOrders",
    "LocalInventory",
    "LocalSyncOutbox",
  ],
  endpoints: (builder) => ({
    // ============================================
    // 1. PRODUCTS
    // ============================================
    getLocalProducts: builder.query({
      async queryFn({
        search,
        categoryId,
        storeId,
      }: { search?: string; categoryId?: string; storeId?: string } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(products)
            .where(sql`${products.syncStatus} != 'pending_delete'`)
            .orderBy(desc(products.createdAt));

          if (search) {
            query = query.where(
              sql`${products.name} LIKE ${`%${search}%`} OR ${products.sku} LIKE ${`%${search}%`}`,
            );
          }
          if (categoryId) {
            query = query.where(eq(products.categoryId, categoryId));
          }
          if (storeId) {
            query = query.where(eq(products.storeId, storeId));
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
        pos_app / services / api / localApi.ts;
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

    // ============================================
    // 2. CATEGORIES
    // ============================================
    getLocalCategories: builder.query({
      async queryFn() {
        try {
          const db = getOfflineDb();
          const result = await db
            .select()
            .from(categories)
            .where(sql`${categories.isActive} = 1`)
            .orderBy(categories.sortOrder);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalCategories"],
    }),

    // ============================================
    // 3. CUSTOMERS
    // ============================================
    getLocalCustomers: builder.query({
      async queryFn({ search, tier }: { search?: string; tier?: string } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(customers)
            .where(sql`${customers.isActive} = 1`)
            .orderBy(desc(customers.createdAt));

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

    // ============================================
    // 4. STORES
    // ============================================
    getLocalStores: builder.query({
      async queryFn() {
        try {
          const db = getOfflineDb();
          const result = await db
            .select()
            .from(stores)
            .where(sql`${stores.isActive} = 1`);
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalStores"],
    }),

    // ============================================
    // 5. SESSIONS
    // ============================================
    getLocalSessions: builder.query({
      async queryFn({
        storeId,
        status,
      }: { storeId?: string; status?: string } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(sessions)
            .orderBy(desc(sessions.createdAt));

          if (storeId) {
            query = query.where(eq(sessions.storeId, storeId));
          }
          if (status) {
            query = query.where(eq(sessions.status, status));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalSessions"],
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
            );

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

    // ============================================
    // 6. ORDERS
    // ============================================
    getLocalOrders: builder.query({
      async queryFn({
        storeId,
        status,
        sessionId,
        page,
        limit,
      }: {
        storeId?: string;
        status?: string;
        sessionId?: string;
        page?: number;
        limit?: number;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db.select().from(orders).orderBy(desc(orders.createdAt));

          if (storeId) {
            query = query.where(eq(orders.storeId, storeId));
          }
          if (status) {
            query = query.where(eq(orders.status, status));
          }
          if (sessionId) {
            query = query.where(eq(orders.sessionId, sessionId));
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

    // ============================================
    // 7. INVENTORY
    // ============================================
    getLocalInventory: builder.query({
      async queryFn({
        storeId,
        productId,
      }: { storeId?: string; productId?: string } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(products)
            .where(sql`${products.syncStatus} != 'pending_delete'`);

          if (storeId) {
            query = query.where(eq(products.storeId, storeId));
          }
          if (productId) {
            query = query.where(eq(products.id, productId));
          }

          const result = await query;
          return { data: result };
        } catch (error) {
          return { error: { message: (error as Error).message } };
        }
      },
      providesTags: ["LocalInventory"],
    }),

    getLocalInventoryMovements: builder.query({
      async queryFn({
        storeId,
        type,
        page,
        limit,
      }: {
        storeId?: string;
        type?: string;
        page?: number;
        limit?: number;
      } = {}) {
        try {
          const db = getOfflineDb();
          let query = db
            .select()
            .from(inventoryMovements)
            .orderBy(desc(inventoryMovements.createdAt));

          if (storeId) {
            query = query.where(eq(inventoryMovements.storeId, storeId));
          }
          if (type) {
            query = query.where(eq(inventoryMovements.type, type));
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
      providesTags: ["LocalInventory"],
    }),

    // ============================================
    // 8. SYNC OUTBOX STATUS
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
  }),
});

// UI မှာ သုံးဖို့ Hooks တွေ
export const {
  useGetLocalProductsQuery,
  useGetLocalProductByIdQuery,
  useGetLocalProductByBarcodeQuery,
  useGetLocalCategoriesQuery,
  useGetLocalCustomersQuery,
  useGetLocalCustomerByIdQuery,
  useGetLocalStoresQuery,
  useGetLocalSessionsQuery,
  useGetActiveSessionQuery,
  useGetLocalOrdersQuery,
  useGetLocalOrderByIdQuery,
  useGetLocalInventoryQuery,
  useGetLocalInventoryMovementsQuery,
  useGetPendingSyncItemsQuery,
  useGetFailedSyncItemsQuery,
} = localApi;
