import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { POS_API_URL, remoteApi } from "@/services/api/remoteApi";
import { localApi } from "@/services/features/offline/localApi";
import {
  incrementFailedCount,
  incrementSyncedCount,
  resetSync,
  setFailedCount,
  setInitialized,
  setOnline,
  setQueuedCount,
  setSyncComplete,
  setSyncDuration,
  setSyncError,
  setSyncing,
  setSyncProgress,
} from "@/services/features/offline/offlineSlice";
import type { AppDispatch, RootState } from "@/services/store/store";
import { store } from "@/services/store/store";
import { eq, inArray, sql } from "drizzle-orm";
import { useCallback, useEffect, useState } from "react";
import { getOfflineDb, runMigrations } from "./db";
import { isOnline, subscribeToOnlineStatus } from "./network";
import {
  getDueOutboxItems,
  getFailedOutboxItems,
  getQueuedCount,
  getSyncStatus,
  markEntitySynced,
  markOutboxFailed,
  markOutboxSynced,
  retryOutboxItem,
  upsertBrands,
  upsertCategories,
  upsertCustomers,
  upsertInventory,
  upsertPriceHistory,
  upsertProducts,
  upsertProductVariants,
  upsertSessions,
  upsertStores,
  upsertStaff,
  upsertSuppliers,
} from "./repository";

import {
  brands,
  inventory,
  inventoryCounts,
  inventoryMovements,
  orders,
  priceHistory,
  products,
  productVariants,
  sessions,
  syncOutbox,
} from "./schema";

// ============================================
// GLOBAL STATE
// ============================================

let syncInFlight = false;
let unsubscribeNetwork: (() => void) | undefined;
let syncInterval: NodeJS.Timeout | undefined;
let syncStartTime: number = 0;
let lastSyncTime: number = 0;
const MIN_SYNC_INTERVAL = 30000; // 30 seconds

// ============================================
// 1. INITIALIZATION (FIXED)
// ============================================

export async function initializeOfflineSystem(
  dispatch: AppDispatch,
  getState: () => RootState,
) {
  try {
    await runMigrations();
    dispatch(setInitialized(true));

    const count = await getQueuedCount();
    dispatch(setQueuedCount(count));

    const failedCount = await getFailedCount();
    dispatch(setFailedCount(failedCount));

    const online = await isOnline();
    dispatch(setOnline(online));

    unsubscribeNetwork?.();
    unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
      dispatch(setOnline(nextOnline));
      if (nextOnline) {
        // Debounce: avoid multiple syncs on rapid network changes
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          void syncNow(dispatch, getState);
        }, 2000);
      }
    });

    if (online) {
      await syncNow(dispatch, getState);
    }

    // ✅ Fix: Use the global syncInterval – do NOT redeclare it
    if (syncInterval) {
      clearInterval(syncInterval);
    }

    syncInterval = setInterval(
      () => {
        void syncNow(dispatch, getState);
      },
      5 * 60 * 1000,
    );

    console.log("✅ Offline system initialized");
  } catch (error) {
    console.error("❌ Failed to initialize offline system:", error);
    dispatch(setSyncError("Failed to initialize offline system"));
  }
}

let debounceTimeout: NodeJS.Timeout | undefined;

// ============================================
// 2. SYNC NOW
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

  // Cooldown (skip if not forced)
  const now = Date.now();
  if (!force && now - lastSyncTime < MIN_SYNC_INTERVAL) {
    if (!silent) console.log("⏳ Sync cooldown, skipping...");
    return { skipped: true, message: "Cooldown active" };
  }

  if (syncInFlight && !force) {
    if (!silent) console.log("⏳ Sync already in progress, skipping...");
    return { skipped: true, message: "Sync already in progress" };
  }

  const online = await isOnline();
  if (!online) {
    if (!silent) console.log("📶 Offline mode, skipping sync");
    return { skipped: true, message: "Offline mode" };
  }

  syncInFlight = true;
  syncStartTime = Date.now();
  lastSyncTime = now;

  dispatch(setSyncing(true));
  dispatch(setSyncError(null as any));
  dispatch(setSyncProgress(0));

  let syncedItems = 0;
  let failedItems = 0;

  try {
    if (!silent) console.log("🔄 Starting sync...");
    dispatch(setSyncProgress(5));

    const state = store.getState();
    const tenantId = state.auth?.user?.tenantId;
    if (!tenantId) {
      throw new Error("No tenantId found in Redux state. Cannot sync.");
    }

    // --- PULL Stores ---
    if (!silent) console.log("📥 Pulling stores...");
    const storeResult = await pullStores(dispatch, tenantId);
    syncedItems += storeResult.synced;
    dispatch(setSyncProgress(10));
    if (!silent) console.log(`✅ Synced ${storeResult.synced} stores`);

    // --- PULL Brands ---
    if (!silent) console.log("📥 Pulling brands...");
    const brandResult = await pullBrands(dispatch, tenantId);
    syncedItems += brandResult.synced;
    dispatch(setSyncProgress(15));
    if (!silent) console.log(`✅ Synced ${brandResult.synced} brands`);

    // --- PULL Categories ---
    if (!silent) console.log("📥 Pulling categories...");
    const categoryResult = await pullCategories(dispatch, tenantId);
    syncedItems += categoryResult.synced;
    dispatch(setSyncProgress(20));
    if (!silent) console.log(`✅ Synced ${categoryResult.synced} categories`);

    // --- PULL Customers ---
    if (!silent) console.log("📥 Pulling customers...");
    const customerResult = await pullCustomers(dispatch, tenantId);
    syncedItems += customerResult.synced;
    dispatch(setSyncProgress(25));
    if (!silent) console.log(`✅ Synced ${customerResult.synced} customers`);

    // --- PULL Staff --- (NEW)
    if (!silent) console.log("📥 Pulling staff...");
    const staffResult = await pullStaff(dispatch, tenantId);
    syncedItems += staffResult.synced;
    dispatch(setSyncProgress(30));
    if (!silent) console.log(`✅ Synced ${staffResult.synced} staff`);

    // --- PULL Suppliers --- (NEW)
    if (!silent) console.log("📥 Pulling suppliers...");
    const supplierResult = await pullSuppliers(dispatch, tenantId);
    syncedItems += supplierResult.synced;
    dispatch(setSyncProgress(33));
    if (!silent) console.log(`✅ Synced ${supplierResult.synced} suppliers`);

    // --- PULL Products --- (includes variants)
    if (!silent) console.log("📥 Pulling products...");
    const productResult = await pullProducts(dispatch, tenantId);
    syncedItems += productResult.synced;
    dispatch(setSyncProgress(45));
    if (!silent)
      console.log(`✅ Synced ${productResult.synced} products (with variants)`);

    // --- PULL Inventory ---
    if (!silent) console.log("📥 Pulling inventory...");
    const inventoryResult = await pullInventory(dispatch, tenantId);
    syncedItems += inventoryResult.synced;
    dispatch(setSyncProgress(55));
    if (!silent)
      console.log(`✅ Synced ${inventoryResult.synced} inventory items`);

    // --- PULL Sessions ---
    if (!silent) console.log("📥 Pulling sessions...");
    const sessionResult = await pullSessions(dispatch, tenantId);
    syncedItems += sessionResult.synced;
    dispatch(setSyncProgress(65));
    if (!silent) console.log(`✅ Synced ${sessionResult.synced} sessions`);

    // --- PULL Price History ---
    if (!silent) console.log("📥 Pulling price history...");
    const priceHistoryResult = await pullPriceHistory(dispatch, tenantId);
    syncedItems += priceHistoryResult.synced;
    dispatch(setSyncProgress(70));
    if (!silent)
      console.log(`✅ Synced ${priceHistoryResult.synced} price history items`);

    // --- PUSH Outbox ---
    if (!silent) console.log("📤 Pushing outbox items...");
    const pushResult = await pushOutboxItems(dispatch, maxItems);
    syncedItems += pushResult.synced;
    failedItems += pushResult.failed;
    dispatch(setSyncProgress(85));
    if (!silent)
      console.log(
        `✅ Pushed ${pushResult.synced} items, ${pushResult.failed} failed`,
      );

    const remainingCount = await getQueuedCount();
    dispatch(setQueuedCount(remainingCount));

    const totalFailed = await getFailedCount();
    dispatch(setFailedCount(totalFailed));

    store.dispatch(
      localApi.util.invalidateTags([
        "LocalProducts",
        "LocalProductVariants",
        "LocalInventory",
        "LocalCategories",
        "LocalCustomers",
        "LocalStores",
        "LocalBrands",
        "LocalStaff",
        "LocalSuppliers",
        "LocalSessions",
        "LocalOrders",
        "LocalInventoryMovements",
        "LocalPriceHistory",
        "LocalSyncOutbox",
      ]),
    );

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
// PULL FUNCTIONS
// ============================================

async function pullBrands(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping brand pull");
      return { synced: 0 };
    }
    if (!remoteApi.endpoints.getRemoteBrands) {
      console.warn("⚠️ getRemoteBrands endpoint not available");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteBrands.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR")
        return { synced: 0 };
      console.error("❌ Brand pull failed:", error);
      return { synced: 0 };
    }
    const brandsData = data?.brands || data?.data || data || [];
    if (brandsData.length > 0) {
      await upsertBrands(brandsData, tenantId);
      return { synced: brandsData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull brands:", error);
    return { synced: 0 };
  }
}

async function pullStores(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping store pull");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteStores.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      console.error("❌ Store pull failed:", error);
      return { synced: 0 };
    }
    const storesData = data?.stores || data?.data || data || [];
    if (storesData.length > 0) {
      await upsertStores(storesData, tenantId);
      return { synced: storesData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull stores:", error);
    return { synced: 0 };
  }
}

async function pullCategories(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
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
    const categoriesData = data?.categories || data?.data || data || [];
    if (categoriesData.length > 0) {
      await upsertCategories(categoriesData, tenantId);
      return { synced: categoriesData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull categories:", error);
    return { synced: 0 };
  }
}

async function pullCustomers(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
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
    const customersData = data?.customers || data?.data || data || [];
    if (customersData.length > 0) {
      await upsertCustomers(customersData, tenantId);
      return { synced: customersData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull customers:", error);
    return { synced: 0 };
  }
}

// ✅ NEW: Pull Staff
async function pullStaff(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping staff pull");
      return { synced: 0 };
    }
    if (!remoteApi.endpoints.getRemoteStaff) {
      console.warn("⚠️ getRemoteStaff endpoint not available");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteStaff.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR")
        return { synced: 0 };
      console.error("❌ Staff pull failed:", error);
      return { synced: 0 };
    }
    const staffData = data?.staff || data?.data || data || [];
    if (staffData.length > 0) {
      await upsertStaff(staffData, tenantId);
      return { synced: staffData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull staff:", error);
    return { synced: 0 };
  }
}

// ✅ NEW: Pull Suppliers
async function pullSuppliers(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping supplier pull");
      return { synced: 0 };
    }
    if (!remoteApi.endpoints.getRemoteSuppliers) {
      console.warn("⚠️ getRemoteSuppliers endpoint not available");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteSuppliers.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR")
        return { synced: 0 };
      console.error("❌ Supplier pull failed:", error);
      return { synced: 0 };
    }
    const suppliersData = data?.suppliers || data?.data || data || [];
    if (suppliersData.length > 0) {
      await upsertSuppliers(suppliersData, tenantId);
      return { synced: suppliersData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull suppliers:", error);
    return { synced: 0 };
  }
}

async function pullProducts(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
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
    const productsData = data?.products || data?.data || data || [];
    if (productsData.length > 0) {
      // Upsert products first
      await upsertProducts(productsData, tenantId);

      // Extract and upsert variants from product data
      const allVariants = productsData.flatMap((p: any) => p.variants || []);
      if (allVariants.length > 0) {
        const variantsWithTenant = allVariants.map((v: any) => ({
          ...v,
          productId: v.productId || v.product_id,
          tenantId: v.tenantId || tenantId,
        }));
        await upsertProductVariants(variantsWithTenant, tenantId);
        console.log(`✅ Synced ${allVariants.length} variants from products`);
      }

      return { synced: productsData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull products:", error);
    return { synced: 0 };
  }
}

// We no longer need a separate pullProductVariants – it's now inside pullProducts.
// But keep it if you want to keep the code; we can remove the call from syncNow.

async function pullInventory(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping inventory pull");
      return { synced: 0 };
    }
    if (!remoteApi.endpoints.getRemoteInventory) {
      console.warn("⚠️ getRemoteInventory endpoint not available");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteInventory.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR")
        return { synced: 0 };
      console.error("❌ Inventory pull failed:", error);
      return { synced: 0 };
    }
    const inventoryItems = data?.inventory || data?.data || data || [];
    if (inventoryItems.length > 0) {
      await upsertInventory(inventoryItems, tenantId);
      return { synced: inventoryItems.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull inventory:", error);
    return { synced: 0 };
  }
}

async function pullSessions(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping session pull");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteSessions.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      console.error("❌ Session pull failed:", error);
      return { synced: 0 };
    }
    const sessionsData = data?.sessions || data?.data || data || [];
    if (sessionsData.length > 0) {
      await upsertSessions(sessionsData, tenantId);
      return { synced: sessionsData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull sessions:", error);
    return { synced: 0 };
  }
}

async function pullPriceHistory(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping price history pull");
      return { synced: 0 };
    }
    if (!remoteApi.endpoints.getRemotePriceHistory) {
      console.warn("⚠️ getRemotePriceHistory endpoint not available");
      return { synced: 0 };
    }
    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemotePriceHistory.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    if (error) {
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR")
        return { synced: 0 };
      console.error("❌ Price history pull failed:", error);
      return { synced: 0 };
    }
    const priceHistoryData = data?.priceHistory || data?.data || data || [];
    if (priceHistoryData.length > 0) {
      await upsertPriceHistory(priceHistoryData, tenantId);
      return { synced: priceHistoryData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull price history:", error);
    return { synced: 0 };
  }
}

// ============================================
// PUSH FUNCTIONS
// ============================================

async function pushOutboxItems(dispatch: AppDispatch, maxItems: number) {
  const items = await getDueOutboxItems(maxItems);
  if (items.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.entity]) acc[item.entity] = [];
      acc[item.entity].push(item);
      return acc;
    },
    {} as Record<string, typeof items>,
  );

  for (const [entity, entityItems] of Object.entries(groupedItems)) {
    for (const item of entityItems) {
      try {
        const result = await processOutboxItem(item);
        if (result.success) {
          synced++;
          dispatch(setSyncProgress(65 + (synced / items.length) * 20));
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

// Helper to strip null/undefined values (prevents server validation errors)
function stripNulls(obj: any): any {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== null && v !== undefined)
        .map(([k, v]) => [k, typeof v === "object" ? stripNulls(v) : v]),
    );
  }
  return obj;
}

// ============================================
// PROCESS OUTBOX ITEM (FIXED)
// ============================================

async function processOutboxItem(
  item: any,
): Promise<{ success: boolean; error?: string }> {
  const db = getOfflineDb();

  // Clean payload – strip null/undefined
  const payload = stripNulls(item.payload) ?? {};

  switch (item.entity) {
    // ---- Brands ----
    case "brands": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteBrand.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(brands)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(brands.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteBrand.initiate({
              id: item.entityId,
              ...payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(brands)
            .set({ syncStatus: "synced" })
            .where(eq(brands.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteBrand.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(brands).where(eq(brands.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Orders ----
    case "orders": {
      try {
        // Only handle create
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteOrder.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(orders)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(orders.id, item.entityId));
        } else if (item.operation === "updateStatus") {
          // For status updates
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteOrderStatus.initiate({
              id: item.entityId,
              ...payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(orders)
            .set({ syncStatus: "synced" })
            .where(eq(orders.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteOrder.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(orders).where(eq(orders.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Sessions ----
    case "sessions": {
      try {
        let result;
        if (item.operation === "open") {
          result = await store.dispatch(
            remoteApi.endpoints.openRemoteSession.initiate(payload),
          );
        } else if (item.operation === "close") {
          result = await store.dispatch(
            remoteApi.endpoints.closeRemoteSession.initiate({
              id: item.entityId,
              ...payload,
            }),
          );
        } else {
          throw new Error(`Unknown session operation: ${item.operation}`);
        }
        const { data, error } = result;
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

    // ---- Products ----
    case "products": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteProduct.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(products)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(products.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteProduct.initiate({
              id: item.entityId,
              ...payload,
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

    // ---- Product Variants ----
    case "product_variants": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteProductVariant.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(productVariants)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(productVariants.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteProductVariant.initiate({
              id: item.entityId,
              ...payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(productVariants)
            .set({ syncStatus: "synced" })
            .where(eq(productVariants.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteProductVariant.initiate(
              item.entityId,
            ),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(productVariants)
            .where(eq(productVariants.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Inventory (now sends update) ----
    case "inventory": {
      try {
        // This handles stock adjustments via the PUT endpoint
        if (item.operation === "update") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteInventory.initiate({
              id: item.entityId,
              ...payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(inventory)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(inventory.id, item.entityId));
        } else {
          // If not an update, treat as synced to clear it
          await markOutboxSynced(item.id);
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Inventory Movements ----
    case "inventory_movements": {
      try {
        // Only create is supported by the endpoint
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteInventoryMovement.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(inventoryMovements)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(inventoryMovements.id, item.entityId));
        } else {
          // For update/delete, we just mark as synced (or you can implement if needed)
          await markOutboxSynced(item.id);
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Inventory Counts ----
    case "inventory_counts": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteInventoryCount.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(inventoryCounts)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(inventoryCounts.id, item.entityId));
        } else {
          await markOutboxSynced(item.id);
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Price History ----
    case "price_history": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemotePriceHistory.initiate(payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(priceHistory)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(priceHistory.id, item.entityId));
        } else {
          await markOutboxSynced(item.id);
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    // ---- Generic fallback ----
    default: {
      try {
        // Try to use the generic endpoint if available
        if (item.endpoint && item.method) {
          const state = store.getState() as any;
          const token = state.auth?.user?.token;

          if (!token) {
            throw new Error("No authentication token available for sync");
          }

          // Build URL (avoid double /api)
          const baseUrl = POS_API_URL.endsWith("/api")
            ? POS_API_URL.slice(0, -4)
            : POS_API_URL;
          const url = item.endpoint.startsWith("http")
            ? item.endpoint
            : `${baseUrl}${item.endpoint.startsWith("/") ? "" : "/"}${item.endpoint}`;

          const response = await fetch(url, {
            method: item.method,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body:
              item.payload && item.method !== "GET"
                ? JSON.stringify(payload)
                : undefined,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
          }

          const data = await response.json().catch(() => ({}));
          if (data && data.id) {
            await markEntitySynced(item.entity, item.entityId, {
              remoteId: data.id,
            });
          } else {
            await markEntitySynced(item.entity, item.entityId, {});
          }
        } else {
          await markEntitySynced(item.entity, item.entityId, {});
        }

        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  }
}

// ============================================
// HELPERS
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
// RETRY
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
// CLEANUP
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

  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
    debounceTimeout = undefined;
  }

  syncInFlight = false;
  console.log("🧹 Offline system cleaned up");
}

// ============================================
// HOOK (useSync)
// ============================================

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

  // Use the real store's getState
  const getState = useCallback(() => store.getState(), []);

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

// // FILE: services/offline/syncManager.ts

// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import { POS_API_URL, remoteApi } from "@/services/api/remoteApi";
// import { localApi } from "@/services/features/offline/localApi";
// import {
//   incrementFailedCount,
//   incrementSyncedCount,
//   resetSync,
//   setFailedCount,
//   setInitialized,
//   setOnline,
//   setQueuedCount,
//   setSyncComplete,
//   setSyncDuration,
//   setSyncError,
//   setSyncing,
//   setSyncProgress,
// } from "@/services/features/offline/offlineSlice";
// import type { AppDispatch, RootState } from "@/services/store/store";
// import { store } from "@/services/store/store";
// import { eq, inArray, sql } from "drizzle-orm";
// import { useCallback, useEffect, useState } from "react";
// import { getOfflineDb, runMigrations } from "./db";
// import { isOnline, subscribeToOnlineStatus } from "./network";
// import {
//   getDueOutboxItems,
//   getFailedOutboxItems,
//   getQueuedCount,
//   getSyncStatus,
//   markEntitySynced,
//   markOutboxFailed,
//   markOutboxSynced,
//   retryOutboxItem,
//   upsertBrands,
//   upsertCategories,
//   upsertCustomers,
//   upsertInventory,
//   upsertPriceHistory,
//   upsertProducts,
//   upsertProductVariants,
//   upsertSessions,
//   upsertStores,
// } from "./repository";
// import {
//   brands,
//   inventory,
//   inventoryCounts,
//   inventoryMovements,
//   orders,
//   priceHistory,
//   products,
//   productVariants,
//   sessions,
//   syncOutbox,
// } from "./schema";

// // GLOBAL STATE

// let syncInFlight = false;
// let unsubscribeNetwork: (() => void) | undefined;
// let syncInterval: NodeJS.Timeout | undefined;
// let syncStartTime: number = 0;

// // 1. INITIALIZATION

// export async function initializeOfflineSystem(
//   dispatch: AppDispatch,
//   getState: () => RootState,
// ) {
//   try {
//     await runMigrations();
//     dispatch(setInitialized(true));

//     const count = await getQueuedCount();
//     dispatch(setQueuedCount(count));

//     const failedCount = await getFailedCount();
//     dispatch(setFailedCount(failedCount));

//     const online = await isOnline();
//     dispatch(setOnline(online));

//     unsubscribeNetwork?.();
//     unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
//       dispatch(setOnline(nextOnline));
//       if (nextOnline) {
//         void syncNow(dispatch, getState);
//       }
//     });

//     if (online) {
//       await syncNow(dispatch, getState);
//     }

//     let syncInterval: number | null = null;

//     if (syncInterval) {
//       clearInterval(syncInterval);
//     }

//     syncInterval = setInterval(
//       () => {
//         void syncNow(dispatch, getState);
//       },
//       5 * 60 * 1000,
//     );

//     console.log("✅ Offline system initialized");
//   } catch (error) {
//     console.error("❌ Failed to initialize offline system:", error);
//     dispatch(setSyncError("Failed to initialize offline system"));
//   }
// }

// // ============================================
// // 2. SYNC NOW
// // ============================================

// export async function syncNow(
//   dispatch: AppDispatch,
//   getState: () => RootState,
//   options: {
//     force?: boolean;
//     maxItems?: number;
//     silent?: boolean;
//   } = {},
// ) {
//   const { force = false, maxItems = 50, silent = false } = options;

//   if (syncInFlight && !force) {
//     if (!silent) console.log("⏳ Sync already in progress, skipping...");
//     return { skipped: true, message: "Sync already in progress" };
//   }

//   const online = await isOnline();
//   if (!online) {
//     if (!silent) console.log("📶 Offline mode, skipping sync");
//     return { skipped: true, message: "Offline mode" };
//   }

//   syncInFlight = true;
//   syncStartTime = Date.now();

//   dispatch(setSyncing(true));
//   dispatch(setSyncError(null as any));
//   dispatch(setSyncProgress(0));

//   let syncedItems = 0;
//   let failedItems = 0;

//   try {
//     if (!silent) console.log("🔄 Starting sync...");
//     dispatch(setSyncProgress(5));

//     const state = store.getState();
//     const tenantId = state.auth?.user?.tenantId;
//     if (!tenantId) {
//       throw new Error("No tenantId found in Redux state. Cannot sync.");
//     }

//     // --- PULL Stores ---
//     if (!silent) console.log("📥 Pulling stores...");
//     const storeResult = await pullStores(dispatch, tenantId);
//     syncedItems += storeResult.synced;
//     dispatch(setSyncProgress(10));
//     if (!silent) console.log(`✅ Synced ${storeResult.synced} stores`);

//     // --- PULL Brands ---
//     if (!silent) console.log("📥 Pulling brands...");
//     const brandResult = await pullBrands(dispatch, tenantId);
//     syncedItems += brandResult.synced;
//     dispatch(setSyncProgress(15));
//     if (!silent) console.log(`✅ Synced ${brandResult.synced} brands`);

//     // --- PULL Categories ---
//     if (!silent) console.log("📥 Pulling categories...");
//     const categoryResult = await pullCategories(dispatch, tenantId);
//     syncedItems += categoryResult.synced;
//     dispatch(setSyncProgress(20));
//     if (!silent) console.log(`✅ Synced ${categoryResult.synced} categories`);

//     // --- PULL Customers ---
//     if (!silent) console.log("📥 Pulling customers...");
//     const customerResult = await pullCustomers(dispatch, tenantId);
//     syncedItems += customerResult.synced;
//     dispatch(setSyncProgress(25));
//     if (!silent) console.log(`✅ Synced ${customerResult.synced} customers`);

//     // --- PULL Products ---
//     if (!silent) console.log("📥 Pulling products...");
//     const productResult = await pullProducts(dispatch, tenantId);
//     syncedItems += productResult.synced;
//     dispatch(setSyncProgress(35));
//     if (!silent) console.log(`✅ Synced ${productResult.synced} products`);

//     // --- PULL Variants ---
//     if (!silent) console.log("📥 Pulling product variants...");
//     const variantResult = await pullProductVariants(dispatch, tenantId);
//     syncedItems += variantResult.synced;
//     dispatch(setSyncProgress(45));
//     if (!silent) console.log(`✅ Synced ${variantResult.synced} variants`);

//     // --- PULL Inventory ---
//     if (!silent) console.log("📥 Pulling inventory...");
//     const inventoryResult = await pullInventory(dispatch, tenantId);
//     syncedItems += inventoryResult.synced;
//     dispatch(setSyncProgress(55));
//     if (!silent)
//       console.log(`✅ Synced ${inventoryResult.synced} inventory items`);

//     // --- PULL Sessions ---
//     if (!silent) console.log("📥 Pulling sessions...");
//     const sessionResult = await pullSessions(dispatch, tenantId);
//     syncedItems += sessionResult.synced;
//     dispatch(setSyncProgress(65));
//     if (!silent) console.log(`✅ Synced ${sessionResult.synced} sessions`);

//     // --- PULL Price History ---
//     if (!silent) console.log("📥 Pulling price history...");
//     const priceHistoryResult = await pullPriceHistory(dispatch, tenantId);
//     syncedItems += priceHistoryResult.synced;
//     dispatch(setSyncProgress(70));
//     if (!silent)
//       console.log(`✅ Synced ${priceHistoryResult.synced} price history items`);

//     // --- PUSH Outbox ---
//     if (!silent) console.log("📤 Pushing outbox items...");
//     const pushResult = await pushOutboxItems(dispatch, maxItems);
//     syncedItems += pushResult.synced;
//     failedItems += pushResult.failed;
//     dispatch(setSyncProgress(85));
//     if (!silent)
//       console.log(
//         `✅ Pushed ${pushResult.synced} items, ${pushResult.failed} failed`,
//       );

//     const remainingCount = await getQueuedCount();
//     dispatch(setQueuedCount(remainingCount));

//     const totalFailed = await getFailedCount();
//     dispatch(setFailedCount(totalFailed));

//     store.dispatch(
//       localApi.util.invalidateTags([
//         "LocalProducts",
//         "LocalProductVariants",
//         "LocalInventory",
//         "LocalCategories",
//         "LocalCustomers",
//         "LocalStores",
//         "LocalBrands",
//         "LocalSessions",
//         "LocalOrders",
//         "LocalInventoryMovements",
//         "LocalPriceHistory",
//         "LocalSyncOutbox",
//       ]),
//     );

//     const duration = Date.now() - syncStartTime;
//     dispatch(setSyncDuration(duration));
//     dispatch(incrementSyncedCount(syncedItems));

//     if (failedItems > 0) {
//       dispatch(incrementFailedCount(failedItems));
//       dispatch(
//         setSyncError(
//           `Sync completed with ${failedItems} failed items. Please check and retry.`,
//         ),
//       );
//       if (!silent) console.warn(`⚠️ ${failedItems} items failed to sync`);
//     } else {
//       dispatch(setSyncComplete());
//       if (!silent) console.log("✅ Sync completed successfully");
//     }

//     // // Inside syncNow, after each step
//     // console.log(`✅ Synced ${productResult.synced} products`);
//     // console.log(`✅ Synced ${variantResult.synced} variants`);
//     // console.log(`✅ Synced ${inventoryResult.synced} inventory items`);

//     dispatch(setSyncProgress(100));

//     return {
//       success: true,
//       synced: syncedItems,
//       failed: failedItems,
//       remaining: remainingCount,
//       duration,
//     };
//   } catch (error) {
//     const message =
//       error instanceof Error ? error.message : "Offline sync failed";
//     dispatch(setSyncError(message));
//     console.error("❌ Sync error:", error);
//     return { success: false, error: message };
//   } finally {
//     syncInFlight = false;
//     dispatch(setSyncing(false));
//   }
// }

// // ============================================
// // PULL FUNCTIONS
// // ============================================

// async function pullBrands(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping brand pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteBrands) {
//       console.warn("⚠️ getRemoteBrands endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteBrands.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
//         return { synced: 0 };
//       }
//       console.error("❌ Brand pull failed:", error);
//       return { synced: 0 };
//     }

//     const brandsData = data?.brands || data?.data || data || [];
//     if (brandsData.length > 0) {
//       await upsertBrands(brandsData, tenantId);
//       return { synced: brandsData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull brands:", error);
//     return { synced: 0 };
//   }
// }

// async function pullStores(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping store pull");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteStores.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       console.error("❌ Store pull failed:", error);
//       return { synced: 0 };
//     }

//     const storesData = data?.stores || data?.data || data || [];
//     if (storesData.length > 0) {
//       await upsertStores(storesData, tenantId);
//       return { synced: storesData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull stores:", error);
//     return { synced: 0 };
//   }
// }

// async function pullCategories(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping category pull");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteCategories.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       console.error("❌ Category pull failed:", error);
//       return { synced: 0 };
//     }

//     const categoriesData = data?.categories || data?.data || data || [];
//     if (categoriesData.length > 0) {
//       await upsertCategories(categoriesData, tenantId);
//       return { synced: categoriesData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull categories:", error);
//     return { synced: 0 };
//   }
// }

// async function pullCustomers(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping customer pull");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteCustomers.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       console.error("❌ Customer pull failed:", error);
//       return { synced: 0 };
//     }

//     const customersData = data?.customers || data?.data || data || [];
//     if (customersData.length > 0) {
//       await upsertCustomers(customersData, tenantId);
//       return { synced: customersData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull customers:", error);
//     return { synced: 0 };
//   }
// }

// async function pullProducts(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping product pull");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteProducts.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       console.error("❌ Product pull failed:", error);
//       return { synced: 0 };
//     }

//     const productsData = data?.products || data?.data || data || [];

//     if (productsData.length > 0) {
//       await upsertProducts(productsData, tenantId);
//       return { synced: productsData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull products:", error);
//     return { synced: 0 };
//   }
// }

// async function pullProductVariants(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping variant pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteProductVariants) {
//       console.warn("⚠️ getRemoteProductVariants endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteProductVariants.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
//         return { synced: 0 };
//       }
//       console.error("❌ Variant pull failed:", error);
//       return { synced: 0 };
//     }

//     const variants = data?.variants || data?.data || data || [];
//     if (variants.length > 0) {
//       await upsertProductVariants(variants, tenantId);
//       return { synced: variants.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull variants:", error);
//     return { synced: 0 };
//   }
// }

// async function pullInventory(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping inventory pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteInventory) {
//       console.warn("⚠️ getRemoteInventory endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteInventory.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
//         return { synced: 0 };
//       }
//       console.error("❌ Inventory pull failed:", error);
//       return { synced: 0 };
//     }

//     const inventoryItems = data?.inventory || data?.data || data || [];
//     if (inventoryItems.length > 0) {
//       await upsertInventory(inventoryItems, tenantId);
//       return { synced: inventoryItems.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull inventory:", error);
//     return { synced: 0 };
//   }
// }

// async function pullSessions(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping session pull");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteSessions.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       console.error("❌ Session pull failed:", error);
//       return { synced: 0 };
//     }

//     const sessionsData = data?.sessions || data?.data || data || [];
//     if (sessionsData.length > 0) {
//       await upsertSessions(sessionsData, tenantId);
//       return { synced: sessionsData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull sessions:", error);
//     return { synced: 0 };
//   }
// }

// async function pullPriceHistory(dispatch: AppDispatch, tenantId: string) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;
//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping price history pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemotePriceHistory) {
//       console.warn("⚠️ getRemotePriceHistory endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemotePriceHistory.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
//         return { synced: 0 };
//       }
//       console.error("❌ Price history pull failed:", error);
//       return { synced: 0 };
//     }

//     const priceHistoryData = data?.priceHistory || data?.data || data || [];
//     if (priceHistoryData.length > 0) {
//       await upsertPriceHistory(priceHistoryData, tenantId);
//       return { synced: priceHistoryData.length };
//     }
//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull price history:", error);
//     return { synced: 0 };
//   }
// }

// // PUSH FUNCTIONS

// async function pushOutboxItems(dispatch: AppDispatch, maxItems: number) {
//   const items = await getDueOutboxItems(maxItems);
//   if (items.length === 0) {
//     return { synced: 0, failed: 0 };
//   }

//   let synced = 0;
//   let failed = 0;

//   const groupedItems = items.reduce(
//     (acc, item) => {
//       if (!acc[item.entity]) acc[item.entity] = [];
//       acc[item.entity].push(item);
//       return acc;
//     },
//     {} as Record<string, typeof items>,
//   );

//   for (const [entity, entityItems] of Object.entries(groupedItems)) {
//     for (const item of entityItems) {
//       try {
//         const result = await processOutboxItem(item);
//         if (result.success) {
//           synced++;
//           dispatch(setSyncProgress(65 + (synced / items.length) * 20));
//         } else {
//           failed++;
//           await markOutboxFailed(
//             item.id,
//             item.attempts + 1,
//             result.error || "Unknown error",
//           );
//         }
//       } catch (error) {
//         failed++;
//         const message =
//           error instanceof Error ? error.message : "Unknown error";
//         await markOutboxFailed(item.id, item.attempts + 1, message);
//         console.error(
//           `❌ Failed to process ${item.entity} ${item.entityId}:`,
//           message,
//         );
//       }
//     }
//   }

//   return { synced, failed };
// }

// // Strip null/undefined values from payload objects to prevent
// // server validation errors (e.g. variantId: null → 422)
// function stripNulls(obj: any): any {
//   if (obj === null || obj === undefined) return undefined;
//   if (Array.isArray(obj)) return obj.map(stripNulls);
//   if (typeof obj === "object") {
//     return Object.fromEntries(
//       Object.entries(obj)
//         .filter(([_, v]) => v !== null && v !== undefined)
//         .map(([k, v]) => [k, typeof v === "object" ? stripNulls(v) : v]),
//     );
//   }
//   return obj;
// }

// async function processOutboxItem(
//   item: any,
// ): Promise<{ success: boolean; error?: string }> {
//   const db = getOfflineDb();

//   // Clean payload: strip null/undefined values that cause server 422 errors
//   const payload = stripNulls(item.payload) ?? {};

//   switch (item.entity) {
//     case "brands": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteBrand.initiate(payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(brands)
//             .set({
//               remoteId: (data as { id: string }).id,
//               syncStatus: "synced",
//             })
//             .where(eq(brands.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteBrand.initiate({
//               id: item.entityId,
//               ...payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(brands)
//             .set({ syncStatus: "synced" })
//             .where(eq(brands.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteRemoteBrand.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(brands).where(eq(brands.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "orders": {
//       try {
//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemoteOrder.initiate(payload),
//         );
//         if (error) throw new Error(JSON.stringify(error));
//         await db
//           .update(orders)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(orders.id, item.entityId));
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "sessions": {
//       try {
//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.openRemoteSession.initiate(payload),
//         );
//         if (error) throw new Error(JSON.stringify(error));
//         await db
//           .update(sessions)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(sessions.id, item.entityId));
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "products": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteProduct.initiate(payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(products)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(products.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteProduct.initiate({
//               id: item.entityId,
//               ...payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(products)
//             .set({ syncStatus: "synced" })
//             .where(eq(products.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteRemoteProduct.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(products).where(eq(products.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "product_variants": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteProductVariant.initiate(payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(productVariants)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(productVariants.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteProductVariant.initiate({
//               id: item.entityId,
//               ...payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(productVariants)
//             .set({ syncStatus: "synced" })
//             .where(eq(productVariants.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteRemoteProductVariant.initiate(
//               item.entityId,
//             ),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(productVariants)
//             .where(eq(productVariants.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "inventory": {
//       // Legacy or invalid outbox item, inventory updates should go through inventory_movements.
//       // Mark as synced to clear it from the queue and stop blocking sync.
//       await markOutboxSynced(item.id);
//       return { success: true };
//     }

//     case "inventory_movements": {
//       try {
//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemoteInventoryMovement.initiate(payload),
//         );
//         if (error) throw new Error(JSON.stringify(error));
//         await db
//           .update(inventoryMovements)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(inventoryMovements.id, item.entityId));
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "inventory_counts": {
//       try {
//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemoteInventoryCount.initiate(payload),
//         );
//         if (error) throw new Error(JSON.stringify(error));
//         await db
//           .update(inventoryCounts)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(inventoryCounts.id, item.entityId));
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "price_history": {
//       try {
//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemotePriceHistory.initiate(payload),
//         );
//         if (error) throw new Error(JSON.stringify(error));
//         await db
//           .update(priceHistory)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(priceHistory.id, item.entityId));
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     default: {
//       try {
//         if (item.endpoint && item.method) {
//           const state = store.getState() as any;
//           const token = state.auth?.user?.token;

//           if (!token) {
//             throw new Error("No authentication token available for sync");
//           }

//           // Ensure the URL is correctly formed by preventing double "/api"
//           const baseUrl = POS_API_URL.endsWith("/api")
//             ? POS_API_URL.slice(0, -4)
//             : POS_API_URL;
//           const url = item.endpoint.startsWith("http")
//             ? item.endpoint
//             : `${baseUrl}${item.endpoint.startsWith("/") ? "" : "/"}${item.endpoint}`;

//           const response = await fetch(url, {
//             method: item.method,
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//             body:
//               item.payload && item.method !== "GET"
//                 ? JSON.stringify(payload)
//                 : undefined,
//           });

//           if (!response.ok) {
//             const errorText = await response.text();
//             throw new Error(`API Error ${response.status}: ${errorText}`);
//           }

//           const data = await response.json().catch(() => ({}));

//           // Optionally update the generic record's remoteId if returned by the server
//           if (data && data.id) {
//             await markEntitySynced(item.entity, item.entityId, {
//               remoteId: data.id,
//             });
//           } else {
//             await markEntitySynced(item.entity, item.entityId, {});
//           }
//         } else {
//           await markEntitySynced(item.entity, item.entityId, {});
//         }

//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }
//   }
// }

// // HELPERS

// async function getFailedCount(): Promise<number> {
//   const db = getOfflineDb();
//   const result = await db
//     .select({ count: sql<number>`count(*)` })
//     .from(syncOutbox)
//     .where(inArray(syncOutbox.status, ["failed", "dead"]));
//   return Number(result[0]?.count ?? 0);
// }

// // RETRY

// export async function retryFailedItems(
//   dispatch: AppDispatch,
//   getState: () => RootState,
//   itemIds?: string[],
// ) {
//   const online = await isOnline();
//   if (!online) {
//     dispatch(setSyncError("Cannot retry: Offline mode"));
//     return { error: "Offline mode" };
//   }

//   try {
//     let itemsToRetry: string[] = [];

//     if (itemIds && itemIds.length > 0) {
//       for (const id of itemIds) {
//         await retryOutboxItem(id);
//         itemsToRetry.push(id);
//       }
//     } else {
//       const failedItems = await getFailedOutboxItems(100);
//       for (const item of failedItems) {
//         await retryOutboxItem(item.id);
//         itemsToRetry.push(item.id);
//       }
//     }

//     dispatch(resetSync());
//     const result = await syncNow(dispatch, getState, { force: true });

//     return {
//       success: true,
//       retried: itemsToRetry.length,
//       ...result,
//     };
//   } catch (error) {
//     const message =
//       error instanceof Error ? error.message : "Failed to retry items";
//     dispatch(setSyncError(message));
//     return { error: message };
//   }
// }

// // CLEANUP

// export function cleanupOfflineSystem() {
//   if (unsubscribeNetwork) {
//     unsubscribeNetwork();
//     unsubscribeNetwork = undefined;
//   }

//   if (syncInterval) {
//     clearInterval(syncInterval);
//     syncInterval = undefined;
//   }

//   syncInFlight = false;
//   console.log("🧹 Offline system cleaned up");
// }

// // HOOK

// export function useSync() {
//   const dispatch = useAppDispatch();

//   const isOnline = useAppSelector((state) => state.offline.isOnline);
//   const isSyncing = useAppSelector((state) => state.offline.isSyncing);
//   const syncStatus = useAppSelector((state) => state.offline.syncStatus);
//   const syncError = useAppSelector((state) => state.offline.syncError);
//   const queueCount = useAppSelector((state) => state.offline.queuedCount);
//   const failedCount = useAppSelector((state) => state.offline.failedCount);
//   const syncProgress = useAppSelector((state) => state.offline.syncProgress);
//   const lastSyncAt = useAppSelector((state) => state.offline.lastSyncAt);
//   const syncStats = useAppSelector((state) => state.offline.syncStats);

//   const [isLoading, setIsLoading] = useState(false);
//   const [detailedStatus, setDetailedStatus] = useState<any>(null);

//   const getState = useCallback(() => {
//     return { auth: { user: { token: "" } } } as RootState;
//   }, []);

//   const sync = useCallback(
//     async (options?: { force?: boolean; maxItems?: number }) => {
//       setIsLoading(true);
//       try {
//         const result = await syncNow(dispatch, getState, options);
//         return result;
//       } catch (error) {
//         console.error("Sync failed:", error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [dispatch, getState],
//   );

//   const retry = useCallback(
//     async (itemIds?: string[]) => {
//       setIsLoading(true);
//       try {
//         const result = await retryFailedItems(dispatch, getState, itemIds);
//         return result;
//       } catch (error) {
//         console.error("Retry failed:", error);
//         throw error;
//       } finally {
//         setIsLoading(false);
//       }
//     },
//     [dispatch, getState],
//   );

//   const refresh = useCallback(async () => {
//     try {
//       const count = await getQueuedCount();
//       dispatch(setQueuedCount(count));
//       const failed = await getFailedCount();
//       dispatch(setFailedCount(failed));
//       const status = await getSyncStatus();
//       setDetailedStatus(status);
//       return { queueCount: count, failedCount: failed, status };
//     } catch (error) {
//       console.error("Refresh failed:", error);
//       throw error;
//     }
//   }, [dispatch]);

//   useEffect(() => {
//     refresh();
//     const interval = setInterval(refresh, 30000);
//     return () => clearInterval(interval);
//   }, [refresh]);

//   return {
//     isOnline,
//     isSyncing,
//     isLoading,
//     syncStatus,
//     syncError,
//     queueCount,
//     failedCount,
//     syncProgress,
//     lastSyncAt,
//     syncStats,
//     detailedStatus,
//     sync,
//     retry,
//     refresh,
//   };
// }

// export type SyncResult = {
//   success?: boolean;
//   skipped?: boolean;
//   message?: string;
//   synced?: number;
//   failed?: number;
//   remaining?: number;
//   duration?: number;
//   retried?: number;
//   error?: string;
// };
