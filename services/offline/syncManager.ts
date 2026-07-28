// ============================================
// FILE: services/offline/syncManager.ts
// ============================================

import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { remoteApi } from "@/services/api/remoteApi";
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

// ============================================
// 1. INITIALIZATION
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
        void syncNow(dispatch, getState);
      }
    });

    if (online) {
      await syncNow(dispatch, getState);
    }

    let syncInterval: number | null = null;

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

    // --- PULL Products ---
    if (!silent) console.log("📥 Pulling products...");
    const productResult = await pullProducts(dispatch, tenantId);
    syncedItems += productResult.synced;
    dispatch(setSyncProgress(35));
    if (!silent) console.log(`✅ Synced ${productResult.synced} products`);

    // --- PULL Variants ---
    if (!silent) console.log("📥 Pulling product variants...");
    const variantResult = await pullProductVariants(dispatch, tenantId);
    syncedItems += variantResult.synced;
    dispatch(setSyncProgress(45));
    if (!silent) console.log(`✅ Synced ${variantResult.synced} variants`);

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
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
        return { synced: 0 };
      }
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
      await upsertProducts(productsData, tenantId);
      return { synced: productsData.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull products:", error);
    return { synced: 0 };
  }
}

async function pullProductVariants(dispatch: AppDispatch, tenantId: string) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;
    if (!token) {
      console.warn("⚠️ No auth token found, skipping variant pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteProductVariants) {
      console.warn("⚠️ getRemoteProductVariants endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteProductVariants.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
        return { synced: 0 };
      }
      console.error("❌ Variant pull failed:", error);
      return { synced: 0 };
    }

    const variants = data?.variants || data?.data || data || [];
    if (variants.length > 0) {
      await upsertProductVariants(variants, tenantId);
      return { synced: variants.length };
    }
    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull variants:", error);
    return { synced: 0 };
  }
}

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
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
        return { synced: 0 };
      }
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
      if (error.originalStatus === 404 || error.status === "PARSING_ERROR") {
        return { synced: 0 };
      }
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

async function processOutboxItem(
  item: any,
): Promise<{ success: boolean; error?: string }> {
  const db = getOfflineDb();

  switch (item.entity) {
    case "brands": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteBrand.initiate(item.payload),
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
              ...item.payload,
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
          remoteApi.endpoints.openRemoteSession.initiate(item.payload),
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
            .set({ remoteId: data.id, syncStatus: "synced" })
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

    case "product_variants": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteProductVariant.initiate(
              item.payload,
            ),
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
              ...item.payload,
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

    case "inventory": {
      try {
        if (item.operation === "create" || item.operation === "update") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.upsertRemoteInventory.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(inventory)
            .set({
              remoteId: data.id,
              syncStatus: "synced",
              quantity: data.quantity,
              version: data.version,
            })
            .where(eq(inventory.id, item.entityId));
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
          remoteApi.endpoints.createRemoteInventoryMovement.initiate(
            item.payload,
          ),
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

    case "inventory_counts": {
      try {
        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createRemoteInventoryCount.initiate(item.payload),
        );
        if (error) throw new Error(JSON.stringify(error));
        await db
          .update(inventoryCounts)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(inventoryCounts.id, item.entityId));
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "price_history": {
      try {
        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createRemotePriceHistory.initiate(item.payload),
        );
        if (error) throw new Error(JSON.stringify(error));
        await db
          .update(priceHistory)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(priceHistory.id, item.entityId));
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    default: {
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

  syncInFlight = false;
  console.log("🧹 Offline system cleaned up");
}

// ============================================
// HOOK
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
