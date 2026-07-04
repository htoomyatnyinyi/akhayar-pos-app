// services/offline/syncManager.ts
import { store } from "@/services/store/store";
import { remoteApi } from "@/services/api/remoteApi";
// import { localDbApi } from "./localDbApi";
import { localApi } from "@/services/features/offline/localApi";
import { getOfflineDb } from "./db";
import {
  products,
  categories,
  customers,
  stores,
  sessions,
  orders,
  orderItems,
  inventoryMovements,
  syncOutbox,
} from "./schema";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { isOnline, subscribeToOnlineStatus } from "./network";
import {
  getDueOutboxItems,
  getQueuedCount,
  getFailedOutboxItems,
  markOrderSynced,
  markEntitySynced,
  markOutboxSynced,
  markOutboxFailed,
  markOutboxDead,
  retryOutboxItem,
  upsertProducts,
  upsertCategories,
  upsertCustomers,
  upsertStores,
  upsertSessions,
  upsertOrders,
} from "./repository";
import {
  setInitialized,
  setOnline,
  setQueuedCount,
  setFailedCount,
  setSyncComplete,
  setSyncError,
  setSyncing,
  setSyncProgress,
  setSyncDuration,
  incrementSyncedCount,
  incrementFailedCount,
  resetSync,
} from "@/services/features/offline/offlineSlice";
import { migrateOfflineDatabase } from "./migrations";
import type { AppDispatch, RootState } from "@/services/store/store";

// ============================================
// GLOBAL STATE
// ============================================

let syncInFlight = false;
let unsubscribeNetwork: (() => void) | undefined;
let syncInterval: NodeJS.Timeout | undefined;
let syncStartTime: number = 0;

// ============================================
// 1. INITIALIZATION
// ============================================

export async function initializeOfflineSystem(
  dispatch: AppDispatch,
  getState: () => RootState,
) {
  try {
    // 1. Migrate database
    await migrateOfflineDatabase();
    dispatch(setInitialized(true));

    // 2. Get initial queue count
    const count = await getQueuedCount();
    dispatch(setQueuedCount(count));

    const failedCount = await getFailedCount();
    dispatch(setFailedCount(failedCount));

    // 3. Check online status
    const online = await isOnline();
    dispatch(setOnline(online));

    // 4. Subscribe to network changes
    unsubscribeNetwork?.();
    unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
      dispatch(setOnline(nextOnline));
      if (nextOnline) {
        void syncNow(dispatch, getState);
      }
    });

    // 5. Initial sync if online
    if (online) {
      await syncNow(dispatch, getState);
    }

    // 6. Set up periodic sync (every 5 minutes)
    // Ensure syncInterval is typed as a number or null
    let syncInterval: number | null = null;

    if (syncInterval) {
      clearInterval(syncInterval);
    }

    // Prefix with window.
    syncInterval = window.setInterval(
      () => {
        void syncNow(dispatch, getState);
      },
      5 * 60 * 1000,
    );
    // if (syncInterval) {
    //   clearInterval(syncInterval as any);
    // }
    // syncInterval = setInterval(
    //   () => {
    //     void syncNow(dispatch, getState);
    //   },
    //   5 * 60 * 1000,
    // );

    console.log("✅ Offline system initialized");
  } catch (error) {
    console.error("❌ Failed to initialize offline system:", error);
    dispatch(setSyncError("Failed to initialize offline system"));
  }
}

// ============================================
// 2. SYNC NOW (Main Sync Function)
// ============================================

export async function syncNow(
  dispatch: AppDispatch,
  getState: () => RootState,
  options: {
    force?: boolean;
    maxItems?: number;
    silent?: boolean;
  } = {},
) {
  const { force = false, maxItems = 50, silent = false } = options;

  // Prevent concurrent syncs
  if (syncInFlight && !force) {
    if (!silent) console.log("⏳ Sync already in progress, skipping...");
    return { skipped: true, message: "Sync already in progress" };
  }

  // Check online status
  const online = await isOnline();
  if (!online) {
    if (!silent) console.log("📶 Offline mode, skipping sync");
    return { skipped: true, message: "Offline mode" };
  }

  // Start sync
  syncInFlight = true;
  syncStartTime = Date.now();

  dispatch(setSyncing(true));
  dispatch(setSyncError(null as any));
  dispatch(setSyncProgress(0));

  let syncedItems = 0;
  let failedItems = 0;

  try {
    if (!silent) console.log("🔄 Starting sync...");
    dispatch(setSyncProgress(5));

    // ============================================
    // STEP 1: PULL Products
    // ============================================
    if (!silent) console.log("📥 Pulling products...");
    const productResult = await pullProducts(dispatch);
    syncedItems += productResult.synced;
    dispatch(setSyncProgress(20));
    if (!silent) console.log(`✅ Synced ${productResult.synced} products`);

    // ============================================
    // STEP 2: PULL Categories
    // ============================================
    if (!silent) console.log("📥 Pulling categories...");
    const categoryResult = await pullCategories(dispatch);
    syncedItems += categoryResult.synced;
    dispatch(setSyncProgress(30));
    if (!silent) console.log(`✅ Synced ${categoryResult.synced} categories`);

    // ============================================
    // STEP 3: PULL Customers
    // ============================================
    if (!silent) console.log("📥 Pulling customers...");
    const customerResult = await pullCustomers(dispatch);
    syncedItems += customerResult.synced;
    dispatch(setSyncProgress(40));
    if (!silent) console.log(`✅ Synced ${customerResult.synced} customers`);

    // ============================================
    // STEP 4: PULL Stores
    // ============================================
    if (!silent) console.log("📥 Pulling stores...");
    const storeResult = await pullStores(dispatch);
    syncedItems += storeResult.synced;
    dispatch(setSyncProgress(50));
    if (!silent) console.log(`✅ Synced ${storeResult.synced} stores`);

    // ============================================
    // STEP 5: PULL Sessions
    // ============================================
    if (!silent) console.log("📥 Pulling sessions...");
    const sessionResult = await pullSessions(dispatch);
    syncedItems += sessionResult.synced;
    dispatch(setSyncProgress(60));
    if (!silent) console.log(`✅ Synced ${sessionResult.synced} sessions`);

    // ============================================
    // STEP 6: PUSH Outbox Items
    // ============================================
    if (!silent) console.log("📤 Pushing outbox items...");
    const pushResult = await pushOutboxItems(dispatch, maxItems);
    syncedItems += pushResult.synced;
    failedItems += pushResult.failed;
    dispatch(setSyncProgress(80));
    if (!silent)
      console.log(
        `✅ Pushed ${pushResult.synced} items, ${pushResult.failed} failed`,
      );

    // ============================================
    // STEP 7: Update Queue Counts
    // ============================================
    const remainingCount = await getQueuedCount();
    dispatch(setQueuedCount(remainingCount));

    const totalFailed = await getFailedCount();
    dispatch(setFailedCount(totalFailed));

    // ============================================
    // STEP 8: Invalidate RTK Query Cache
    // ============================================
    store.dispatch(
      localApi.util.invalidateTags([
        "LocalProducts",
        "LocalCategories",
        "LocalCustomers",
        "LocalStores",
        "LocalSessions",
        "LocalOrders",
        "LocalInventory",
        "LocalSyncOutbox",
      ]),
    );

    // ============================================
    // STEP 9: Update Stats & Complete
    // ============================================
    const duration = Date.now() - syncStartTime;
    dispatch(setSyncDuration(duration));
    dispatch(incrementSyncedCount(syncedItems));

    if (failedItems > 0) {
      dispatch(incrementFailedCount(failedItems));
      dispatch(
        setSyncError(
          `Sync completed with ${failedItems} failed items. Please check and retry.`,
        ),
      );
      if (!silent) console.warn(`⚠️ ${failedItems} items failed to sync`);
    } else {
      dispatch(setSyncComplete());
      if (!silent) console.log("✅ Sync completed successfully");
    }

    dispatch(setSyncProgress(100));

    return {
      success: true,
      synced: syncedItems,
      failed: failedItems,
      remaining: remainingCount,
      duration,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Offline sync failed";
    dispatch(setSyncError(message));
    console.error("❌ Sync error:", error);
    return { success: false, error: message };
  } finally {
    syncInFlight = false;
    dispatch(setSyncing(false));
  }
}

// ============================================
// 3. PULL FUNCTIONS
// ============================================

async function pullProducts(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    // ✅ Check if we have a token
    if (!token) {
      console.warn("⚠️ No auth token found, skipping product pull");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteProducts.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      console.error("❌ Product pull failed:", error);
      return { synced: 0 };
    }

    // ✅ Handle different response formats
    const products = data?.products || data?.data || data || [];

    if (products.length > 0) {
      await upsertProducts(products);
      return { synced: products.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull products:", error);
    return { synced: 0 };
  }
}

async function pullCategories(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    // ✅ Check if we have a token
    if (!token) {
      console.warn("⚠️ No auth token found, skipping category pull");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteCategories.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      console.error("❌ Category pull failed:", error);
      return { synced: 0 };
    }

    const categories = data?.categories || data?.data || data || [];

    if (categories.length > 0) {
      await upsertCategories(categories);
      return { synced: categories.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull categories:", error);
    return { synced: 0 };
  }
}

async function pullCustomers(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    // ✅ Check if we have a token
    if (!token) {
      console.warn("⚠️ No auth token found, skipping customer pull");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteCustomers.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      console.error("❌ Customer pull failed:", error);
      return { synced: 0 };
    }

    const customers = data?.customers || data?.data || data || [];

    if (customers.length > 0) {
      await upsertCustomers(customers);
      return { synced: customers.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull customers:", error);
    return { synced: 0 };
  }
}

async function pullStores(dispatch: AppDispatch) {
  try {
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteStores.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      console.error("❌ Store pull failed:", error);
      return { synced: 0 };
    }

    const stores = data?.stores || data?.data || data || [];

    if (stores.length > 0) {
      await upsertStores(stores);
      return { synced: stores.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull stores:", error);
    return { synced: 0 };
  }
}

async function pullSessions(dispatch: AppDispatch) {
  try {
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteSessions.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      console.error("❌ Session pull failed:", error);
      return { synced: 0 };
    }

    const sessions = data?.sessions || data?.data || data || [];

    if (sessions.length > 0) {
      await upsertSessions(sessions);
      return { synced: sessions.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull sessions:", error);
    return { synced: 0 };
  }
}

// ============================================
// 4. PUSH FUNCTIONS
// ============================================

async function pushOutboxItems(dispatch: AppDispatch, maxItems: number) {
  const items = await getDueOutboxItems(maxItems);

  if (items.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  // Group items by entity for better processing
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.entity]) acc[item.entity] = [];
      acc[item.entity].push(item);
      return acc;
    },
    {} as Record<string, typeof items>,
  );

  // Process each entity type
  for (const [entity, entityItems] of Object.entries(groupedItems)) {
    for (const item of entityItems) {
      try {
        const result = await processOutboxItem(item);
        if (result.success) {
          synced++;
          dispatch(setSyncProgress(60 + (synced / items.length) * 20));
        } else {
          failed++;
          await markOutboxFailed(
            item.id,
            item.attempts + 1,
            result.error || "Unknown error",
          );
        }
      } catch (error) {
        failed++;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        await markOutboxFailed(item.id, item.attempts + 1, message);
        console.error(
          `❌ Failed to process ${item.entity} ${item.entityId}:`,
          message,
        );
      }
    }
  }

  return { synced, failed };
}

async function processOutboxItem(
  item: any,
): Promise<{ success: boolean; error?: string }> {
  const db = getOfflineDb();

  switch (item.entity) {
    case "orders": {
      try {
        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createRemoteOrder.initiate(item.payload),
        );
        if (error) throw new Error(JSON.stringify(error));

        await db
          .update(orders)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(orders.id, item.entityId));

        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "sessions": {
      try {
        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createRemoteSession.initiate(item.payload),
          // remoteApi.endpoints.getRemoteSessions.initiate(item.payload),
        );
        if (error) throw new Error(JSON.stringify(error));

        await db
          .update(sessions)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(sessions.id, item.entityId));

        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "products": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteProduct.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(products)
            .set({
              remoteId: data.id,
              // tenantId: data.tenantId,
              syncStatus: "synced",
            } as any)
            .where(eq(products.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteProduct.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(products)
            .set({ syncStatus: "synced" })
            .where(eq(products.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteProduct.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(products).where(eq(products.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "inventory_movements": {
      try {
        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createInventoryMovement.initiate(item.payload),
        );
        if (error) throw new Error(JSON.stringify(error));

        await db
          .update(inventoryMovements)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(inventoryMovements.id, item.entityId));

        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    default: {
      // Generic handling
      try {
        await markEntitySynced(item.entity, item.entityId, {});
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  }
}

// ============================================
// 5. HELPER FUNCTIONS
// ============================================

async function getFailedCount(): Promise<number> {
  const db = getOfflineDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["failed", "dead"]));
  return Number(result[0]?.count ?? 0);
}

// ============================================
// 6. RETRY FAILED ITEMS
// ============================================

export async function retryFailedItems(
  dispatch: AppDispatch,
  getState: () => RootState,
  itemIds?: string[],
) {
  const online = await isOnline();
  if (!online) {
    dispatch(setSyncError("Cannot retry: Offline mode"));
    return { error: "Offline mode" };
  }

  try {
    let itemsToRetry: string[] = [];

    if (itemIds && itemIds.length > 0) {
      for (const id of itemIds) {
        await retryOutboxItem(id);
        itemsToRetry.push(id);
      }
    } else {
      const failedItems = await getFailedOutboxItems(100);
      for (const item of failedItems) {
        await retryOutboxItem(item.id);
        itemsToRetry.push(item.id);
      }
    }

    dispatch(resetSync());
    const result = await syncNow(dispatch, getState, { force: true });

    return {
      success: true,
      retried: itemsToRetry.length,
      ...result,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retry items";
    dispatch(setSyncError(message));
    return { error: message };
  }
}

// ============================================
// 7. CLEANUP
// ============================================

export function cleanupOfflineSystem() {
  if (unsubscribeNetwork) {
    unsubscribeNetwork();
    unsubscribeNetwork = undefined;
  }

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = undefined;
  }

  syncInFlight = false;
  console.log("🧹 Offline system cleaned up");
}

// ============================================
// 8. REACT HOOK FOR SYNC (useSync)
// ============================================

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import { getSyncStatus } from "@/services/features/offline/repository";

// import { getSyncStatus } from "@/services/features/offline/repository";
import { getSyncStats, getSyncStatus } from "./repository";
//

export function useSync() {
  const dispatch = useAppDispatch();

  const isOnline = useAppSelector((state) => state.offline.isOnline);
  const isSyncing = useAppSelector((state) => state.offline.isSyncing);
  const syncStatus = useAppSelector((state) => state.offline.syncStatus);
  const syncError = useAppSelector((state) => state.offline.syncError);
  const queueCount = useAppSelector((state) => state.offline.queuedCount);
  const failedCount = useAppSelector((state) => state.offline.failedCount);
  const syncProgress = useAppSelector((state) => state.offline.syncProgress);
  const lastSyncAt = useAppSelector((state) => state.offline.lastSyncAt);
  const syncStats = useAppSelector((state) => state.offline.syncStats);

  const [isLoading, setIsLoading] = useState(false);
  const [detailedStatus, setDetailedStatus] = useState<any>(null);

  const getState = useCallback(() => {
    return { auth: { user: { token: "" } } } as RootState;
  }, []);

  const sync = useCallback(
    async (options?: { force?: boolean; maxItems?: number }) => {
      setIsLoading(true);
      try {
        const result = await syncNow(dispatch, getState, options);
        return result;
      } catch (error) {
        console.error("Sync failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, getState],
  );

  const retry = useCallback(
    async (itemIds?: string[]) => {
      setIsLoading(true);
      try {
        const result = await retryFailedItems(dispatch, getState, itemIds);
        return result;
      } catch (error) {
        console.error("Retry failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, getState],
  );

  const refresh = useCallback(async () => {
    try {
      const count = await getQueuedCount();
      dispatch(setQueuedCount(count));
      const failed = await getFailedCount();
      dispatch(setFailedCount(failed));
      const status = await getSyncStatus();
      setDetailedStatus(status);
      return { queueCount: count, failedCount: failed, status };
    } catch (error) {
      console.error("Refresh failed:", error);
      throw error;
    }
  }, [dispatch]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    // State
    isOnline,
    isSyncing,
    isLoading,
    syncStatus,
    syncError,
    queueCount,
    failedCount,
    syncProgress,
    lastSyncAt,
    syncStats,
    detailedStatus,

    // Actions
    sync,
    retry,
    refresh,
  };
}

export type SyncResult = {
  success?: boolean;
  skipped?: boolean;
  message?: string;
  synced?: number;
  failed?: number;
  remaining?: number;
  duration?: number;
  retried?: number;
  error?: string;
};
