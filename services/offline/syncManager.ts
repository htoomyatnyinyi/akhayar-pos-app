// services/offline/syncManager.ts
import { posApi, POS_API_URL } from "@/services/api/posApi";
import type { AppDispatch, RootState } from "@/services/store/store";
import { isOnline, subscribeToOnlineStatus } from "./network";
import {
  getDueOutboxItems,
  getQueuedCount,
  markOrderSyncFailed,
  markOrderSynced,
  markEntitySyncFailed,
  markEntitySynced,
  markOutboxDead,
  markOutboxFailed,
  markOutboxSynced,
  getFailedOutboxItems,
  getOutboxItems,
  retryOutboxItem,
  upsertProducts,
} from "./repository";
import {
  setInitialized,
  setOnline,
  setQueuedCount,
  setSyncComplete,
  setSyncError,
  setSyncing,
  setSyncProgress,
} from "./offlineSlice";
import { migrateOfflineDatabase } from "./migrations";
import { getOfflineDb } from "./db";
import { sessions, syncOutbox } from "./schema";
import { eq, and } from "drizzle-orm";

// ============================================
// GLOBAL STATE
// ============================================

let syncInFlight = false;
let unsubscribeNetwork: (() => void) | undefined;
let syncInterval: NodeJS.Timeout | undefined;

// ============================================
// 1. INITIALIZATION
// ============================================

export async function initializeOfflineSystem(
  dispatch: AppDispatch,
  getState: () => RootState,
) {
  try {
    await migrateOfflineDatabase();
    dispatch(setInitialized(true));

    const count = await getQueuedCount();
    dispatch(setQueuedCount(count));

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
// 2. SYNC NOW (Main Sync Function)
// ============================================

export async function syncNow(
  dispatch: AppDispatch,
  getState: () => RootState,
  options: {
    force?: boolean;
    maxItems?: number;
  } = {},
) {
  const { force = false, maxItems = 50 } = options;

  if (syncInFlight && !force) {
    console.log("⏳ Sync already in progress, skipping...");
    return { skipped: true, message: "Sync already in progress" };
  }

  const online = await isOnline();
  if (!online) {
    console.log("📶 Offline mode, skipping sync");
    return { skipped: true, message: "Offline mode" };
  }

  syncInFlight = true;
  dispatch(setSyncing(true));
  dispatch(setSyncError(null));
  dispatch(setSyncProgress(0));

  try {
    console.log("🔄 Starting sync...");
    dispatch(setSyncProgress(10));

    // ✅ STEP 1: Sync products first (to update stock)
    console.log("📤 Syncing products...");
    const productResult = await syncProducts(getState);
    dispatch(setSyncProgress(20));
    console.log(`✅ Synced ${productResult.synced} products`);

    // ✅ STEP 2: Sync sessions
    console.log("📤 Syncing sessions...");
    const sessionResult = await syncSessions(getState);
    dispatch(setSyncProgress(30));
    console.log(`✅ Synced ${sessionResult.synced} sessions`);

    // ✅ STEP 3: Fix order session IDs
    console.log("🔧 Fixing order session IDs...");
    await fixOrderSessionIds();
    dispatch(setSyncProgress(40));

    // ✅ STEP 4: Sync orders (with stock check)
    console.log("📤 Syncing orders...");
    const orderResult = await syncOrders(getState, maxItems);
    dispatch(setSyncProgress(60));
    console.log(`✅ Synced ${orderResult.synced} orders`);

    // ✅ STEP 5: Sync other items
    console.log("📤 Syncing other items...");
    const otherResult = await syncOtherItems(getState, maxItems);
    dispatch(setSyncProgress(80));
    console.log(`✅ Synced ${otherResult.synced} other items`);

    // ✅ STEP 6: Invalidate RTK Query cache
    dispatch(
      posApi.util.invalidateTags([
        "Products",
        "Orders",
        "Inventory",
        "Customers",
        "Sessions",
        "Categories",
        "Staff",
        "Stores",
      ]),
    );

    const remainingCount = await getQueuedCount();
    dispatch(setQueuedCount(remainingCount));

    const failedItems = await getFailedOutboxItems(1);
    if (failedItems.length > 0) {
      dispatch(
        setSyncError(
          `Sync completed with ${failedItems.length} failed items. Please check and retry.`,
        ),
      );
      console.warn(`⚠️ ${failedItems.length} items failed to sync`);
    } else {
      dispatch(setSyncComplete());
      console.log("✅ Sync completed successfully");
    }

    dispatch(setSyncProgress(100));

    return {
      success: true,
      products: productResult.synced,
      sessions: sessionResult.synced,
      orders: orderResult.synced,
      others: otherResult.synced,
      remaining: remainingCount,
      failed: failedItems.length,
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
// 3. SYNC PRODUCTS (Update Stock First)
// ============================================

// async function syncProducts(
//   getState: () => RootState,
// ): Promise<{ synced: number }> {
//   try {
//     const state = getState();
//     const token = state.auth.user?.token;

//     const url = `${POS_API_URL}/api/tenant/products`;
//     const headers: HeadersInit = {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     };

//     const response = await fetch(url, {
//       method: "GET",
//       headers,
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP ${response.status}`);
//     }

//     const data = await response.json();
//     const products = data?.data || data || [];

//     if (products.length > 0) {
//       await upsertProducts(products);
//       console.log(`✅ Synced ${products.length} products`);
//       return { synced: products.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to sync products:", error);
//     return { synced: 0 };
//   }
// }

// services/offline/syncManager.ts

async function syncProducts(
  getState: () => RootState,
): Promise<{ synced: number }> {
  try {
    const state = getState();
    const token = state.auth.user?.token;

    // ✅ URL ကို တိုက်ရိုက်သတ်မှတ်ပါ
    const baseUrl = POS_API_URL.replace(/\/api$/, ""); // Remove trailing /api if exists
    const url = `${baseUrl}/api/tenant/products`;

    console.log(`🔄 Fetching products from: ${url}`);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`❌ Products API error: ${response.status}`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const products = data?.data || data || [];

    if (products.length > 0) {
      await upsertProducts(products);
      console.log(`✅ Synced ${products.length} products`);
      return { synced: products.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to sync products:", error);
    return { synced: 0 };
  }
}
// ============================================
// 4. SYNC SESSIONS (Priority)
// ============================================

async function syncSessions(
  getState: () => RootState,
): Promise<{ synced: number }> {
  const state = getState();
  const token = state.auth.user?.token;

  const items = await getDueOutboxItems(100);
  const sessionItems = items.filter((item) => item.entity === "sessions");

  if (sessionItems.length === 0) {
    return { synced: 0 };
  }

  let synced = 0;

  for (const item of sessionItems) {
    try {
      console.log(`🔄 Syncing session ${item.entityId}...`);

      const url = `${POS_API_URL}${item.endpoint}`;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = JSON.stringify(item.payload);

      const response = await fetch(url, {
        method: item.method,
        headers,
        body,
      });

      const data = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      await markEntitySynced(item.entity, item.entityId, data ?? {});
      await markOutboxSynced(item.id);
      synced++;
      console.log(
        `✅ Session ${item.entityId} synced (Remote ID: ${data?.id || "unknown"})`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Session sync failed";
      await markOutboxFailed(item.id, item.attempts + 1, message);
      console.error(`❌ Failed to sync session ${item.entityId}:`, message);
    }
  }

  return { synced };
}

// ============================================
// 5. FIX ORDER SESSION IDS
// ============================================

async function fixOrderSessionIds() {
  try {
    const db = getOfflineDb();

    const pendingOrders = await db
      .select()
      .from(syncOutbox)
      .where(
        and(
          eq(syncOutbox.entity, "orders"),
          eq(syncOutbox.status, "pending"),
          eq(syncOutbox.operation, "create"),
        ),
      );

    let fixedCount = 0;

    for (const item of pendingOrders) {
      let payload = item.payload;

      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          continue;
        }
      }

      if (payload?.sessionId) {
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, payload.sessionId))
          .limit(1);

        if (session) {
          if (session.remoteId) {
            payload.sessionId = session.remoteId;
            await updateOutboxPayload(item.id, payload);
            fixedCount++;
            console.log(
              `✅ Updated order ${item.entityId} with remote session ID: ${session.remoteId}`,
            );
          } else {
            console.warn(
              `⚠️ Session ${payload.sessionId} not synced. Removing from order ${item.entityId}`,
            );
            delete payload.sessionId;
            await updateOutboxPayload(item.id, payload);
            fixedCount++;
          }
        } else {
          console.warn(
            `⚠️ Session ${payload.sessionId} not found locally. Removing from order ${item.entityId}`,
          );
          delete payload.sessionId;
          await updateOutboxPayload(item.id, payload);
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      console.log(`✅ Fixed ${fixedCount} order session IDs`);
    }

    return { fixed: fixedCount };
  } catch (error) {
    console.error("❌ Failed to fix order session IDs:", error);
    return { fixed: 0 };
  }
}

// ============================================
// 6. CHECK STOCK AVAILABILITY
// ============================================

async function checkStockAvailability(
  items: any[],
  token?: string,
): Promise<{ available: boolean; errors: string[]; adjustedItems?: any[] }> {
  try {
    const errors: string[] = [];
    const adjustedItems = [];
    const productIds = items.map((item) => item.productId).filter(Boolean);

    if (productIds.length === 0) {
      return { available: true, errors: [] };
    }

    // Get current stock from server
    const url = `${POS_API_URL}/api/tenant/inventory`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.warn("⚠️ Cannot check stock, proceeding with sync");
      return { available: true, errors: [] };
    }

    const data = await response.json();
    const inventory = data?.data || data || [];

    // Check each item
    for (const item of items) {
      const product = inventory.find(
        (p: any) => p.productId === item.productId,
      );
      const availableStock = product?.quantity || 0;

      if (item.quantity > availableStock) {
        errors.push(
          `Product ${item.productId}: Requested ${item.quantity}, Available ${availableStock}`,
        );

        adjustedItems.push({
          ...item,
          quantity: Math.min(item.quantity, availableStock),
          subTotal: Math.min(item.quantity, availableStock) * item.unitPrice,
        });
      } else {
        adjustedItems.push(item);
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️ Stock issues found:`, errors);
      return {
        available: false,
        errors,
        adjustedItems,
      };
    }

    return { available: true, errors: [] };
  } catch (error) {
    console.warn("⚠️ Stock check failed, proceeding with sync:", error);
    return { available: true, errors: [] };
  }
}

// ============================================
// 7. SYNC ORDERS (WITH STOCK CHECK)
// ============================================

async function syncOrders(
  getState: () => RootState,
  maxItems: number,
): Promise<{ synced: number }> {
  const state = getState();
  const token = state.auth.user?.token;

  const items = await getDueOutboxItems(maxItems);
  const orderItems = items.filter((item) => item.entity === "orders");

  if (orderItems.length === 0) {
    return { synced: 0 };
  }

  let synced = 0;

  for (const item of orderItems) {
    try {
      // Parse payload
      let payload = item.payload;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          await markOutboxFailed(
            item.id,
            item.attempts + 1,
            "Invalid JSON payload",
          );
          await markOrderSyncFailed(item.entityId, "Invalid JSON payload");
          continue;
        }
      }

      if (typeof payload !== "object" || payload === null) {
        await markOutboxFailed(
          item.id,
          item.attempts + 1,
          "Payload must be an object",
        );
        await markOrderSyncFailed(item.entityId, "Payload must be an object");
        continue;
      }

      // Clean payload
      const cleanPayload = {
        ...payload,
        subTotal: Number(payload.subTotal) || 0,
        taxAmount: Number(payload.taxAmount) || 0,
        discountAmount: Number(payload.discountAmount) || 0,
        grandTotal: Number(payload.grandTotal) || 0,
        paidAmount: Number(payload.paidAmount) || 0,
        changeAmount: Number(payload.changeAmount) || 0,
        items: (payload.items || []).map((item: any) => ({
          ...item,
          productId: item.productId || "",
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          subTotal: Number(item.subTotal) || 0,
          discountAmount: Number(item.discountAmount) || 0,
        })),
      };

      // ✅ CHECK STOCK BEFORE SYNCING
      const stockCheckResult = await checkStockAvailability(
        cleanPayload.items,
        token,
      );

      if (!stockCheckResult.available) {
        console.warn(
          `⚠️ Insufficient stock for order ${item.entityId}:`,
          stockCheckResult.errors,
        );

        // Try to reduce quantities
        if (stockCheckResult.adjustedItems) {
          const adjustedTotal = stockCheckResult.adjustedItems.reduce(
            (sum, it) => sum + it.subTotal,
            0,
          );

          cleanPayload.items = stockCheckResult.adjustedItems;
          cleanPayload.subTotal = adjustedTotal;
          cleanPayload.grandTotal = adjustedTotal;
          cleanPayload.paidAmount = adjustedTotal;

          // Update outbox with adjusted quantities
          await updateOutboxPayload(item.id, cleanPayload);
          console.log(`✅ Adjusted quantities for order ${item.entityId}`);

          // Continue with sync using adjusted quantities
        } else {
          // Skip this order
          const errorMessage = `Insufficient stock: ${stockCheckResult.errors.join(", ")}`;
          await markOutboxFailed(item.id, item.attempts + 1, errorMessage);
          await markOrderSyncFailed(item.entityId, errorMessage);
          continue;
        }
      }

      // Fix session ID
      if (cleanPayload.sessionId) {
        const db = getOfflineDb();
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, cleanPayload.sessionId))
          .limit(1);

        if (session?.remoteId) {
          cleanPayload.sessionId = session.remoteId;
        } else {
          delete cleanPayload.sessionId;
        }
      }

      // Update outbox if changed
      if (JSON.stringify(cleanPayload) !== JSON.stringify(payload)) {
        await updateOutboxPayload(item.id, cleanPayload);
      }

      console.log(`🔄 Syncing order ${item.entityId}...`);

      const url = `${POS_API_URL}${item.endpoint}`;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const body = JSON.stringify(cleanPayload);

      const response = await fetch(url, {
        method: item.method,
        headers,
        body,
      });

      const responseText = await response.text();
      let data;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText || "Empty response" };
      }

      if (!response.ok) {
        if (data?.message?.includes("Insufficient stock")) {
          console.warn(
            `⚠️ Stock error for order ${item.entityId}:`,
            data.message,
          );
          // Try to sync products first
          await syncProducts(getState);
          // Retry the order
          await retryOutboxItem(item.id);
          console.log(
            `🔄 Retrying order ${item.entityId} after stock update...`,
          );
          continue;
        }

        if (
          data?.message?.includes("session is closed") ||
          data?.message?.includes("session is invalid")
        ) {
          delete cleanPayload.sessionId;
          await updateOutboxPayload(item.id, cleanPayload);
          await retryOutboxItem(item.id);
          continue;
        }

        throw new Error(
          data?.message || `HTTP ${response.status}: ${responseText}`,
        );
      }

      await markOrderSynced(item.entityId, data);
      await markOutboxSynced(item.id);
      synced++;
      console.log(`✅ Order ${item.entityId} synced!`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Order sync failed";
      await markOutboxFailed(item.id, item.attempts + 1, message);
      await markOrderSyncFailed(item.entityId, message);
      console.error(`❌ Failed to sync order ${item.entityId}:`, message);
    }
  }

  return { synced };
}

// ============================================
// 8. SYNC OTHER ITEMS
// ============================================

async function syncOtherItems(
  getState: () => RootState,
  maxItems: number,
): Promise<{ synced: number }> {
  const state = getState();
  const token = state.auth.user?.token;

  const items = await getDueOutboxItems(maxItems);
  const otherItems = items.filter(
    (item) =>
      item.entity !== "sessions" &&
      item.entity !== "orders" &&
      item.entity !== "products",
  );

  if (otherItems.length === 0) {
    return { synced: 0 };
  }

  let synced = 0;

  for (const item of otherItems) {
    try {
      console.log(
        `🔄 Syncing ${item.entity} ${item.operation} (${item.entityId})...`,
      );

      const url = `${POS_API_URL}${item.endpoint}`;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body =
        item.method !== "DELETE" ? JSON.stringify(item.payload) : undefined;

      const response = await fetch(url, {
        method: item.method,
        headers,
        body,
      });

      const data = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      await markEntitySynced(item.entity, item.entityId, data ?? {});
      await markOutboxSynced(item.id);
      synced++;
      console.log(`✅ ${item.entity} ${item.entityId} synced`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await markOutboxFailed(item.id, item.attempts + 1, message);
      await markEntitySyncFailed(item.entity, item.entityId, message);
      console.error(
        `❌ Failed to sync ${item.entity} ${item.entityId}:`,
        message,
      );
    }
  }

  return { synced };
}

// ============================================
// 9. HELPER: UPDATE OUTBOX PAYLOAD
// ============================================

async function updateOutboxPayload(itemId: string, payload: any) {
  try {
    const db = getOfflineDb();
    await db
      .update(syncOutbox)
      .set({
        payload: JSON.stringify(payload),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(syncOutbox.id, itemId));
  } catch (error) {
    console.error("Failed to update outbox payload:", error);
  }
}

// ============================================
// 10. RETRY FAILED ITEMS
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
// 11. CLEAR SYNC QUEUE
// ============================================

export async function clearSyncQueue(dispatch: AppDispatch) {
  try {
    const items = await getOutboxItems(1000);
    for (const item of items) {
      await markOutboxSynced(item.id);
    }

    const count = await getQueuedCount();
    dispatch(setQueuedCount(count));
    dispatch(setSyncComplete());

    return { cleared: items.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear queue";
    dispatch(setSyncError(message));
    return { error: message };
  }
}

// ============================================
// 12. GET SYNC STATUS
// ============================================

export async function getSyncStatus() {
  const online = await isOnline();
  const queueCount = await getQueuedCount();
  const failedItems = await getFailedOutboxItems(100);
  const allItems = await getOutboxItems(100);

  return {
    isOnline: online,
    queueCount,
    failedCount: failedItems.length,
    totalPending: allItems.length,
    items: allItems.map((item) => ({
      id: item.id,
      entity: item.entity,
      operation: item.operation,
      status: item.status,
      attempts: item.attempts,
      lastError: item.lastError,
      createdAt: item.createdAt,
    })),
    failedItems: failedItems.map((item) => ({
      id: item.id,
      entity: item.entity,
      operation: item.operation,
      attempts: item.attempts,
      lastError: item.lastError,
    })),
  };
}

// ============================================
// 13. CLEANUP
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
// 14. VOID ORDER WITH INSUFFICIENT STOCK
// ============================================

export async function voidOrder(orderId: string) {
  try {
    const db = getOfflineDb();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      console.log(`❌ Order ${orderId} not found`);
      return { success: false, error: "Order not found" };
    }

    await db
      .update(orders)
      .set({
        status: "VOIDED",
        syncStatus: "synced",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    await db.delete(syncOutbox).where(eq(syncOutbox.entityId, orderId));

    console.log(`✅ Order ${orderId} voided successfully`);
    return { success: true, orderId };
  } catch (error) {
    console.error(`❌ Failed to void order ${orderId}:`, error);
    return { success: false, error };
  }
}

// ============================================
// 15. REACT HOOK FOR SYNC (useSync)
// ============================================

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

export function useSync() {
  const dispatch = useAppDispatch();

  const isOnline = useAppSelector((state) => state.offline.isOnline);
  const isSyncing = useAppSelector((state) => state.offline.isSyncing);
  const syncStatus = useAppSelector((state) => state.offline.syncStatus);
  const syncError = useAppSelector((state) => state.offline.syncError);
  const queueCount = useAppSelector((state) => state.offline.queuedCount);
  const syncProgress = useAppSelector((state) => state.offline.syncProgress);

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

  const clear = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await clearSyncQueue(dispatch);
      return result;
    } catch (error) {
      console.error("Clear failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const getStatus = useCallback(async () => {
    try {
      const status = await getSyncStatus();
      setDetailedStatus(status);
      return status;
    } catch (error) {
      console.error("Get status failed:", error);
      throw error;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const count = await getQueuedCount();
      dispatch(setQueuedCount(count));
      const status = await getSyncStatus();
      setDetailedStatus(status);
      return { queueCount: count, status };
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
    syncProgress,
    detailedStatus,
    sync,
    retry,
    clear,
    getStatus,
    refresh,
    voidOrder,
  };
}

export type SyncResult = {
  success?: boolean;
  skipped?: boolean;
  message?: string;
  products?: number;
  sessions?: number;
  orders?: number;
  others?: number;
  pushed?: number;
  remaining?: number;
  failed?: number;
  retried?: number;
  cleared?: number;
  error?: string;
};

export type SyncStatus = {
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
  }>;
};
// // services/offline/syncManager.ts
// import { posApi, POS_API_URL } from "@/services/api/posApi";
// import type { AppDispatch, RootState } from "@/services/store/store";
// import { isOnline, subscribeToOnlineStatus } from "./network";
// import {
//   getDueOutboxItems,
//   getQueuedCount,
//   markOrderSyncFailed,
//   markOrderSynced,
//   markEntitySyncFailed,
//   markEntitySynced,
//   markOutboxDead,
//   markOutboxFailed,
//   markOutboxSynced,
//   getFailedOutboxItems,
//   getOutboxItems,
//   retryOutboxItem,
// } from "./repository";
// import {
//   setInitialized,
//   setOnline,
//   setQueuedCount,
//   setSyncComplete,
//   setSyncError,
//   setSyncing,
//   setSyncProgress,
// } from "./offlineSlice";
// import { migrateOfflineDatabase } from "./migrations";
// import { getOfflineDb } from "./db";
// import { sessions, syncOutbox } from "./schema";
// import { eq, and } from "drizzle-orm";

// // ============================================
// // GLOBAL STATE
// // ============================================

// let syncInFlight = false;
// let unsubscribeNetwork: (() => void) | undefined;
// let syncInterval: NodeJS.Timeout | undefined;

// // ============================================
// // 1. INITIALIZATION
// // ============================================

// export async function initializeOfflineSystem(
//   dispatch: AppDispatch,
//   getState: () => RootState,
// ) {
//   try {
//     await migrateOfflineDatabase();
//     dispatch(setInitialized(true));

//     const count = await getQueuedCount();
//     dispatch(setQueuedCount(count));

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
// // 2. SYNC NOW (Main Sync Function)
// // ============================================

// export async function syncNow(
//   dispatch: AppDispatch,
//   getState: () => RootState,
//   options: {
//     force?: boolean;
//     maxItems?: number;
//   } = {},
// ) {
//   const { force = false, maxItems = 50 } = options;

//   if (syncInFlight && !force) {
//     console.log("⏳ Sync already in progress, skipping...");
//     return { skipped: true, message: "Sync already in progress" };
//   }

//   const online = await isOnline();
//   if (!online) {
//     console.log("📶 Offline mode, skipping sync");
//     return { skipped: true, message: "Offline mode" };
//   }

//   syncInFlight = true;
//   dispatch(setSyncing(true));
//   dispatch(setSyncError(null));
//   dispatch(setSyncProgress(0));

//   try {
//     console.log("🔄 Starting sync...");
//     dispatch(setSyncProgress(10));

//     console.log("📤 Syncing sessions...");
//     const sessionResult = await syncSessions(getState);
//     dispatch(setSyncProgress(30));
//     console.log(`✅ Synced ${sessionResult.synced} sessions`);

//     console.log("🔧 Fixing order session IDs...");
//     await fixOrderSessionIds();
//     dispatch(setSyncProgress(40));

//     console.log("📤 Syncing orders...");
//     const orderResult = await syncOrders(getState, maxItems);
//     dispatch(setSyncProgress(60));
//     console.log(`✅ Synced ${orderResult.synced} orders`);

//     console.log("📤 Syncing other items...");
//     const otherResult = await syncOtherItems(getState, maxItems);
//     dispatch(setSyncProgress(80));
//     console.log(`✅ Synced ${otherResult.synced} other items`);

//     dispatch(
//       posApi.util.invalidateTags([
//         "Products",
//         "Orders",
//         "Inventory",
//         "Customers",
//         "Sessions",
//         "Categories",
//         "Staff",
//         "Stores",
//       ]),
//     );

//     const remainingCount = await getQueuedCount();
//     dispatch(setQueuedCount(remainingCount));

//     const failedItems = await getFailedOutboxItems(1);
//     if (failedItems.length > 0) {
//       dispatch(
//         setSyncError(
//           `Sync completed with ${failedItems.length} failed items. Please check and retry.`,
//         ),
//       );
//       console.warn(`⚠️ ${failedItems.length} items failed to sync`);
//     } else {
//       dispatch(setSyncComplete());
//       console.log("✅ Sync completed successfully");
//     }

//     dispatch(setSyncProgress(100));

//     return {
//       success: true,
//       sessions: sessionResult.synced,
//       orders: orderResult.synced,
//       others: otherResult.synced,
//       remaining: remainingCount,
//       failed: failedItems.length,
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
// // 3. SYNC SESSIONS (Priority)
// // ============================================

// async function syncSessions(
//   getState: () => RootState,
// ): Promise<{ synced: number }> {
//   const state = getState();
//   const token = state.auth.user?.token;

//   const items = await getDueOutboxItems(100);
//   const sessionItems = items.filter((item) => item.entity === "sessions");

//   if (sessionItems.length === 0) {
//     return { synced: 0 };
//   }

//   let synced = 0;

//   for (const item of sessionItems) {
//     try {
//       console.log(`🔄 Syncing session ${item.entityId}...`);

//       const url = `${POS_API_URL}${item.endpoint}`;
//       const headers: HeadersInit = {
//         "Content-Type": "application/json",
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       };
//       const body = JSON.stringify(item.payload);

//       const response = await fetch(url, {
//         method: item.method,
//         headers,
//         body,
//       });

//       const data = await response.json().catch(() => undefined);

//       if (!response.ok) {
//         throw new Error(data?.message || `HTTP ${response.status}`);
//       }

//       await markEntitySynced(item.entity, item.entityId, data ?? {});
//       await markOutboxSynced(item.id);
//       synced++;
//       console.log(
//         `✅ Session ${item.entityId} synced (Remote ID: ${data?.id || "unknown"})`,
//       );
//     } catch (error) {
//       const message =
//         error instanceof Error ? error.message : "Session sync failed";
//       await markOutboxFailed(item.id, item.attempts + 1, message);
//       console.error(`❌ Failed to sync session ${item.entityId}:`, message);
//     }
//   }

//   return { synced };
// }

// // ============================================
// // 4. FIX ORDER SESSION IDS
// // ============================================

// async function fixOrderSessionIds() {
//   try {
//     const db = getOfflineDb();

//     const pendingOrders = await db
//       .select()
//       .from(syncOutbox)
//       .where(
//         and(
//           eq(syncOutbox.entity, "orders"),
//           eq(syncOutbox.status, "pending"),
//           eq(syncOutbox.operation, "create"),
//         ),
//       );

//     let fixedCount = 0;

//     for (const item of pendingOrders) {
//       let payload = item.payload;

//       // Parse if string
//       if (typeof payload === "string") {
//         try {
//           payload = JSON.parse(payload);
//         } catch {
//           continue;
//         }
//       }

//       if (payload?.sessionId) {
//         const [session] = await db
//           .select()
//           .from(sessions)
//           .where(eq(sessions.id, payload.sessionId))
//           .limit(1);

//         if (session) {
//           if (session.remoteId) {
//             payload.sessionId = session.remoteId;
//             await updateOutboxPayload(item.id, payload);
//             fixedCount++;
//             console.log(
//               `✅ Updated order ${item.entityId} with remote session ID: ${session.remoteId}`,
//             );
//           } else {
//             console.warn(
//               `⚠️ Session ${payload.sessionId} not synced. Removing from order ${item.entityId}`,
//             );
//             delete payload.sessionId;
//             await updateOutboxPayload(item.id, payload);
//             fixedCount++;
//           }
//         } else {
//           console.warn(
//             `⚠️ Session ${payload.sessionId} not found locally. Removing from order ${item.entityId}`,
//           );
//           delete payload.sessionId;
//           await updateOutboxPayload(item.id, payload);
//           fixedCount++;
//         }
//       }
//     }

//     if (fixedCount > 0) {
//       console.log(`✅ Fixed ${fixedCount} order session IDs`);
//     }

//     return { fixed: fixedCount };
//   } catch (error) {
//     console.error("❌ Failed to fix order session IDs:", error);
//     return { fixed: 0 };
//   }
// }

// // ============================================
// // 5. SYNC ORDERS (FIXED)
// // ============================================

// // async function syncOrders(
// //   getState: () => RootState,
// //   maxItems: number,
// // ): Promise<{ synced: number }> {
// //   const state = getState();
// //   const token = state.auth.user?.token;

// //   const items = await getDueOutboxItems(maxItems);
// //   const orderItems = items.filter((item) => item.entity === "orders");

// //   if (orderItems.length === 0) {
// //     return { synced: 0 };
// //   }

// //   let synced = 0;

// //   for (const item of orderItems) {
// //     try {
// //       // ✅ STEP 1: Parse payload if string
// //       let payload = item.payload;
// //       if (typeof payload === "string") {
// //         try {
// //           payload = JSON.parse(payload);
// //           console.log(
// //             `📝 Parsed stringified payload for order ${item.entityId}`,
// //           );
// //         } catch (parseError) {
// //           console.error(`❌ Failed to parse payload:`, parseError);
// //           await markOutboxFailed(
// //             item.id,
// //             item.attempts + 1,
// //             "Invalid JSON payload",
// //           );
// //           await markOrderSyncFailed(item.entityId, "Invalid JSON payload");
// //           continue;
// //         }
// //       }

// //       // ✅ STEP 2: Validate payload
// //       if (typeof payload !== "object" || payload === null) {
// //         console.error(`❌ Invalid payload type for order ${item.entityId}`);
// //         await markOutboxFailed(
// //           item.id,
// //           item.attempts + 1,
// //           "Payload must be an object",
// //         );
// //         await markOrderSyncFailed(item.entityId, "Payload must be an object");
// //         continue;
// //       }

// //       // ✅ STEP 3: Clean payload
// //       const cleanPayload = {
// //         ...payload,
// //         subTotal: Number(payload.subTotal) || 0,
// //         taxAmount: Number(payload.taxAmount) || 0,
// //         discountAmount: Number(payload.discountAmount) || 0,
// //         grandTotal: Number(payload.grandTotal) || 0,
// //         paidAmount: Number(payload.paidAmount) || 0,
// //         changeAmount: Number(payload.changeAmount) || 0,
// //         items: (payload.items || []).map((item: any) => ({
// //           ...item,
// //           productId: item.productId || "",
// //           quantity: Number(item.quantity) || 0,
// //           unitPrice: Number(item.unitPrice) || 0,
// //           subTotal: Number(item.subTotal) || 0,
// //           discountAmount: Number(item.discountAmount) || 0,
// //         })),
// //       };

// //       // ✅ STEP 4: Fix session ID
// //       if (cleanPayload.sessionId) {
// //         const db = getOfflineDb();
// //         const [session] = await db
// //           .select()
// //           .from(sessions)
// //           .where(eq(sessions.id, cleanPayload.sessionId))
// //           .limit(1);

// //         if (session?.remoteId) {
// //           cleanPayload.sessionId = session.remoteId;
// //           console.log(`✅ Using remote session ID: ${session.remoteId}`);
// //         } else {
// //           console.warn(`⚠️ Session not synced, removing from order`);
// //           delete cleanPayload.sessionId;
// //         }
// //       }

// //       // ✅ STEP 5: Update outbox if changed
// //       if (JSON.stringify(cleanPayload) !== JSON.stringify(payload)) {
// //         await updateOutboxPayload(item.id, cleanPayload);
// //         console.log(`✅ Updated order payload with cleaned data`);
// //       }

// //       console.log(`🔄 Syncing order ${item.entityId}...`);

// //       const url = `${POS_API_URL}${item.endpoint}`;
// //       const headers: HeadersInit = {
// //         "Content-Type": "application/json",
// //         ...(token ? { Authorization: `Bearer ${token}` } : {}),
// //       };

// //       // ✅ STEP 6: Stringify ONCE
// //       const body = JSON.stringify(cleanPayload);

// //       const response = await fetch(url, {
// //         method: item.method,
// //         headers,
// //         body,
// //       });

// //       const responseText = await response.text();
// //       let data;

// //       try {
// //         data = responseText ? JSON.parse(responseText) : {};
// //       } catch {
// //         data = { message: responseText || "Empty response" };
// //       }

// //       if (!response.ok) {
// //         if (
// //           data?.message?.includes("session is closed") ||
// //           data?.message?.includes("session is invalid")
// //         ) {
// //           console.warn(`⚠️ Session error, removing session and retrying...`);
// //           delete cleanPayload.sessionId;
// //           await updateOutboxPayload(item.id, cleanPayload);
// //           await retryOutboxItem(item.id);
// //           continue;
// //         }

// //         throw new Error(
// //           data?.message || `HTTP ${response.status}: ${responseText}`,
// //         );
// //       }

// //       await markOrderSynced(item.entityId, data);
// //       await markOutboxSynced(item.id);
// //       synced++;
// //       console.log(`✅ Order ${item.entityId} synced!`);
// //     } catch (error) {
// //       const message =
// //         error instanceof Error ? error.message : "Order sync failed";
// //       await markOutboxFailed(item.id, item.attempts + 1, message);
// //       await markOrderSyncFailed(item.entityId, message);
// //       console.error(`❌ Failed to sync order ${item.entityId}:`, message);
// //     }
// //   }

// //   return { synced };
// // }

// // services/offline/syncManager.ts - syncOrders function ကို update လုပ်ပါ

// async function syncOrders(
//   getState: () => RootState,
//   maxItems: number,
// ): Promise<{ synced: number }> {
//   const state = getState();
//   const token = state.auth.user?.token;

//   const items = await getDueOutboxItems(maxItems);
//   const orderItems = items.filter((item) => item.entity === "orders");

//   if (orderItems.length === 0) {
//     return { synced: 0 };
//   }

//   let synced = 0;

//   for (const item of orderItems) {
//     try {
//       // Parse payload
//       let payload = item.payload;
//       if (typeof payload === "string") {
//         try {
//           payload = JSON.parse(payload);
//         } catch {
//           await markOutboxFailed(
//             item.id,
//             item.attempts + 1,
//             "Invalid JSON payload",
//           );
//           await markOrderSyncFailed(item.entityId, "Invalid JSON payload");
//           continue;
//         }
//       }

//       // Clean payload
//       const cleanPayload = {
//         ...payload,
//         subTotal: Number(payload.subTotal) || 0,
//         taxAmount: Number(payload.taxAmount) || 0,
//         discountAmount: Number(payload.discountAmount) || 0,
//         grandTotal: Number(payload.grandTotal) || 0,
//         paidAmount: Number(payload.paidAmount) || 0,
//         changeAmount: Number(payload.changeAmount) || 0,
//         items: (payload.items || []).map((item: any) => ({
//           ...item,
//           productId: item.productId || "",
//           quantity: Number(item.quantity) || 0,
//           unitPrice: Number(item.unitPrice) || 0,
//           subTotal: Number(item.subTotal) || 0,
//           discountAmount: Number(item.discountAmount) || 0,
//         })),
//       };

//       // ✅ NEW: Check stock availability before syncing
//       const stockCheckResult = await checkStockAvailability(
//         cleanPayload.items,
//         token,
//       );

//       if (!stockCheckResult.available) {
//         console.warn(
//           `⚠️ Insufficient stock for order ${item.entityId}:`,
//           stockCheckResult.errors,
//         );

//         // ✅ Option 1: Skip the order (mark as failed)
//         const errorMessage = `Insufficient stock: ${stockCheckResult.errors.join(", ")}`;
//         await markOutboxFailed(item.id, item.attempts + 1, errorMessage);
//         await markOrderSyncFailed(item.entityId, errorMessage);

//         // ✅ Option 2: Reduce quantities to available stock
//         // const adjustedItems = stockCheckResult.adjustedItems;
//         // if (adjustedItems && adjustedItems.length > 0) {
//         //   cleanPayload.items = adjustedItems;
//         //   await updateOutboxPayload(item.id, cleanPayload);
//         //   console.log(`✅ Adjusted quantities for order ${item.entityId}`);
//         //   // Continue with sync...
//         // }

//         continue;
//       }

//       // Fix session ID
//       if (cleanPayload.sessionId) {
//         const db = getOfflineDb();
//         const [session] = await db
//           .select()
//           .from(sessions)
//           .where(eq(sessions.id, cleanPayload.sessionId))
//           .limit(1);

//         if (session?.remoteId) {
//           cleanPayload.sessionId = session.remoteId;
//         } else {
//           delete cleanPayload.sessionId;
//         }
//       }

//       // Update outbox if changed
//       if (JSON.stringify(cleanPayload) !== JSON.stringify(payload)) {
//         await updateOutboxPayload(item.id, cleanPayload);
//       }

//       console.log(`🔄 Syncing order ${item.entityId}...`);

//       const url = `${POS_API_URL}${item.endpoint}`;
//       const headers: HeadersInit = {
//         "Content-Type": "application/json",
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       };

//       const body = JSON.stringify(cleanPayload);

//       const response = await fetch(url, {
//         method: item.method,
//         headers,
//         body,
//       });

//       const responseText = await response.text();
//       let data;

//       try {
//         data = responseText ? JSON.parse(responseText) : {};
//       } catch {
//         data = { message: responseText || "Empty response" };
//       }

//       if (!response.ok) {
//         // ✅ Check if error is stock-related
//         if (data?.message?.includes("Insufficient stock")) {
//           console.warn(
//             `⚠️ Stock error for order ${item.entityId}:`,
//             data.message,
//           );

//           // Try to sync products first to update stock
//           console.log(`🔄 Syncing products to update stock...`);
//           await syncProducts(getState);

//           // Retry the order
//           await retryOutboxItem(item.id);
//           console.log(
//             `🔄 Retrying order ${item.entityId} after stock update...`,
//           );
//           continue;
//         }

//         if (
//           data?.message?.includes("session is closed") ||
//           data?.message?.includes("session is invalid")
//         ) {
//           delete cleanPayload.sessionId;
//           await updateOutboxPayload(item.id, cleanPayload);
//           await retryOutboxItem(item.id);
//           continue;
//         }

//         throw new Error(
//           data?.message || `HTTP ${response.status}: ${responseText}`,
//         );
//       }

//       await markOrderSynced(item.entityId, data);
//       await markOutboxSynced(item.id);
//       synced++;
//       console.log(`✅ Order ${item.entityId} synced!`);
//     } catch (error) {
//       const message =
//         error instanceof Error ? error.message : "Order sync failed";
//       await markOutboxFailed(item.id, item.attempts + 1, message);
//       await markOrderSyncFailed(item.entityId, message);
//       console.error(`❌ Failed to sync order ${item.entityId}:`, message);
//     }
//   }

//   return { synced };
// }

// // ✅ NEW: Check stock availability function
// async function checkStockAvailability(
//   items: any[],
//   token?: string,
// ): Promise<{ available: boolean; errors: string[]; adjustedItems?: any[] }> {
//   try {
//     const errors: string[] = [];
//     const adjustedItems = [];
//     const productIds = items.map((item) => item.productId).filter(Boolean);

//     if (productIds.length === 0) {
//       return { available: true, errors: [] };
//     }

//     // Get current stock from server
//     const url = `${POS_API_URL}/api/tenant/inventory/`;
//     const headers: HeadersInit = {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     };

//     const response = await fetch(url, {
//       method: "GET",
//       headers,
//     });

//     if (!response.ok) {
//       console.warn("⚠️ Cannot check stock, proceeding with sync");
//       return { available: true, errors: [] };
//     }

//     const data = await response.json();
//     const inventory = data?.data || data || [];

//     // Check each item
//     for (const item of items) {
//       const product = inventory.find(
//         (p: any) => p.productId === item.productId,
//       );
//       const availableStock = product?.quantity || 0;

//       if (item.quantity > availableStock) {
//         errors.push(
//           `Product ${item.productId}: Requested ${item.quantity}, Available ${availableStock}`,
//         );

//         // Adjust quantity to available stock
//         adjustedItems.push({
//           ...item,
//           quantity: Math.min(item.quantity, availableStock),
//           subTotal: Math.min(item.quantity, availableStock) * item.unitPrice,
//         });
//       } else {
//         adjustedItems.push(item);
//       }
//     }

//     if (errors.length > 0) {
//       console.warn(`⚠️ Stock issues found:`, errors);
//       return {
//         available: false,
//         errors,
//         adjustedItems,
//       };
//     }

//     return { available: true, errors: [] };
//   } catch (error) {
//     console.warn("⚠️ Stock check failed, proceeding with sync:", error);
//     return { available: true, errors: [] };
//   }
// }

// // ✅ NEW: Sync products to update stock
// async function syncProducts(getState: () => RootState): Promise<number> {
//   try {
//     const state = getState();
//     const token = state.auth.user?.token;

//     const url = `${POS_API_URL}/api/tenant/products/`;
//     const headers: HeadersInit = {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     };

//     const response = await fetch(url, {
//       method: "GET",
//       headers,
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP ${response.status}`);
//     }

//     const data = await response.json();
//     const products = data?.data || data || [];

//     if (products.length > 0) {
//       await upsertProducts(products);
//       console.log(`✅ Synced ${products.length} products`);
//       return products.length;
//     }

//     return 0;
//   } catch (error) {
//     console.error("❌ Failed to sync products:", error);
//     return 0;
//   }
// }
// // ============================================
// // 6. SYNC OTHER ITEMS
// // ============================================

// async function syncOtherItems(
//   getState: () => RootState,
//   maxItems: number,
// ): Promise<{ synced: number }> {
//   const state = getState();
//   const token = state.auth.user?.token;

//   const items = await getDueOutboxItems(maxItems);
//   const otherItems = items.filter(
//     (item) => item.entity !== "sessions" && item.entity !== "orders",
//   );

//   if (otherItems.length === 0) {
//     return { synced: 0 };
//   }

//   let synced = 0;

//   for (const item of otherItems) {
//     try {
//       console.log(
//         `🔄 Syncing ${item.entity} ${item.operation} (${item.entityId})...`,
//       );

//       const url = `${POS_API_URL}${item.endpoint}`;
//       const headers: HeadersInit = {
//         "Content-Type": "application/json",
//         ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       };
//       const body =
//         item.method !== "DELETE" ? JSON.stringify(item.payload) : undefined;

//       const response = await fetch(url, {
//         method: item.method,
//         headers,
//         body,
//       });

//       const data = await response.json().catch(() => undefined);

//       if (!response.ok) {
//         throw new Error(data?.message || `HTTP ${response.status}`);
//       }

//       await markEntitySynced(item.entity, item.entityId, data ?? {});
//       await markOutboxSynced(item.id);
//       synced++;
//       console.log(`✅ ${item.entity} ${item.entityId} synced`);
//     } catch (error) {
//       const message = error instanceof Error ? error.message : "Sync failed";
//       await markOutboxFailed(item.id, item.attempts + 1, message);
//       await markEntitySyncFailed(item.entity, item.entityId, message);
//       console.error(
//         `❌ Failed to sync ${item.entity} ${item.entityId}:`,
//         message,
//       );
//     }
//   }

//   return { synced };
// }

// // ============================================
// // 7. HELPER: UPDATE OUTBOX PAYLOAD
// // ============================================

// async function updateOutboxPayload(itemId: string, payload: any) {
//   try {
//     const db = getOfflineDb();
//     await db
//       .update(syncOutbox)
//       .set({
//         payload: JSON.stringify(payload),
//         updatedAt: new Date().toISOString(),
//       })
//       .where(eq(syncOutbox.id, itemId));
//   } catch (error) {
//     console.error("Failed to update outbox payload:", error);
//   }
// }

// // ============================================
// // 8. RETRY FAILED ITEMS
// // ============================================

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

// // ============================================
// // 9. CLEAR SYNC QUEUE
// // ============================================

// export async function clearSyncQueue(dispatch: AppDispatch) {
//   try {
//     const items = await getOutboxItems(1000);
//     for (const item of items) {
//       await markOutboxSynced(item.id);
//     }

//     const count = await getQueuedCount();
//     dispatch(setQueuedCount(count));
//     dispatch(setSyncComplete());

//     return { cleared: items.length };
//   } catch (error) {
//     const message =
//       error instanceof Error ? error.message : "Failed to clear queue";
//     dispatch(setSyncError(message));
//     return { error: message };
//   }
// }

// // ============================================
// // 10. GET SYNC STATUS
// // ============================================

// export async function getSyncStatus() {
//   const online = await isOnline();
//   const queueCount = await getQueuedCount();
//   const failedItems = await getFailedOutboxItems(100);
//   const allItems = await getOutboxItems(100);

//   return {
//     isOnline: online,
//     queueCount,
//     failedCount: failedItems.length,
//     totalPending: allItems.length,
//     items: allItems.map((item) => ({
//       id: item.id,
//       entity: item.entity,
//       operation: item.operation,
//       status: item.status,
//       attempts: item.attempts,
//       lastError: item.lastError,
//       createdAt: item.createdAt,
//     })),
//     failedItems: failedItems.map((item) => ({
//       id: item.id,
//       entity: item.entity,
//       operation: item.operation,
//       attempts: item.attempts,
//       lastError: item.lastError,
//     })),
//   };
// }

// // ============================================
// // 11. CLEANUP
// // ============================================

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

// // ============================================
// // 12. REACT HOOK FOR SYNC (useSync)
// // ============================================

// import { useEffect, useState, useCallback } from "react";
// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// export function useSync() {
//   const dispatch = useAppDispatch();

//   const isOnline = useAppSelector((state) => state.offline.isOnline);
//   const isSyncing = useAppSelector((state) => state.offline.isSyncing);
//   const syncStatus = useAppSelector((state) => state.offline.syncStatus);
//   const syncError = useAppSelector((state) => state.offline.syncError);
//   const queueCount = useAppSelector((state) => state.offline.queuedCount);
//   const syncProgress = useAppSelector((state) => state.offline.syncProgress);

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

//   const clear = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const result = await clearSyncQueue(dispatch);
//       return result;
//     } catch (error) {
//       console.error("Clear failed:", error);
//       throw error;
//     } finally {
//       setIsLoading(false);
//     }
//   }, [dispatch]);

//   const getStatus = useCallback(async () => {
//     try {
//       const status = await getSyncStatus();
//       setDetailedStatus(status);
//       return status;
//     } catch (error) {
//       console.error("Get status failed:", error);
//       throw error;
//     }
//   }, []);

//   const refresh = useCallback(async () => {
//     try {
//       const count = await getQueuedCount();
//       dispatch(setQueuedCount(count));
//       const status = await getSyncStatus();
//       setDetailedStatus(status);
//       return { queueCount: count, status };
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
//     syncProgress,
//     detailedStatus,
//     sync,
//     retry,
//     clear,
//     getStatus,
//     refresh,
//   };
// }

// export type SyncResult = {
//   success?: boolean;
//   skipped?: boolean;
//   message?: string;
//   sessions?: number;
//   orders?: number;
//   others?: number;
//   pushed?: number;
//   remaining?: number;
//   failed?: number;
//   retried?: number;
//   cleared?: number;
//   error?: string;
// };

// export type SyncStatus = {
//   isOnline: boolean;
//   queueCount: number;
//   failedCount: number;
//   totalPending: number;
//   items: Array<{
//     id: string;
//     entity: string;
//     operation: string;
//     status: string;
//     attempts: number;
//     lastError: string | null;
//     createdAt: string;
//   }>;
//   failedItems: Array<{
//     id: string;
//     entity: string;
//     operation: string;
//     attempts: number;
//     lastError: string | null;
//   }>;
// };

// // // services/offline/syncManager.ts
// // import { posApi, POS_API_URL } from "@/services/api/posApi";
// // import type { AppDispatch, RootState } from "@/services/store/store";
// // import { isOnline, subscribeToOnlineStatus } from "./network";
// // import {
// //   getDueOutboxItems,
// //   getQueuedCount,
// //   markOrderSyncFailed,
// //   markOrderSynced,
// //   markEntitySyncFailed,
// //   markEntitySynced,
// //   markOutboxDead,
// //   markOutboxFailed,
// //   markOutboxSynced,
// //   getFailedOutboxItems,
// //   getOutboxItems,
// //   retryOutboxItem,
// // } from "./repository";
// // import {
// //   setInitialized,
// //   setOnline,
// //   setQueuedCount,
// //   setSyncComplete,
// //   setSyncError,
// //   setSyncing,
// //   setSyncProgress,
// // } from "./offlineSlice";
// // import { migrateOfflineDatabase } from "./migrations";
// // import { getOfflineDb } from "./db";
// // import { sessions, syncOutbox } from "./schema";
// // import { eq, and } from "drizzle-orm";

// // // ============================================
// // // GLOBAL STATE
// // // ============================================

// // let syncInFlight = false;
// // let unsubscribeNetwork: (() => void) | undefined;
// // let syncInterval: NodeJS.Timeout | undefined;

// // // ============================================
// // // 1. INITIALIZATION
// // // ============================================

// // export async function initializeOfflineSystem(
// //   dispatch: AppDispatch,
// //   getState: () => RootState,
// // ) {
// //   try {
// //     // Migrate database
// //     await migrateOfflineDatabase();
// //     dispatch(setInitialized(true));

// //     // Get initial queue count
// //     const count = await getQueuedCount();
// //     dispatch(setQueuedCount(count));

// //     // Check online status using network module
// //     const online = await isOnline();
// //     dispatch(setOnline(online));

// //     // Subscribe to network changes
// //     unsubscribeNetwork?.();
// //     unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
// //       dispatch(setOnline(nextOnline));
// //       if (nextOnline) {
// //         // Auto-sync when coming online
// //         void syncNow(dispatch, getState);
// //       }
// //     });

// //     // Initial sync if online
// //     if (online) {
// //       await syncNow(dispatch, getState);
// //     }

// //     // Start periodic sync (every 5 minutes)
// //     if (syncInterval) {
// //       clearInterval(syncInterval);
// //     }
// //     syncInterval = setInterval(
// //       () => {
// //         void syncNow(dispatch, getState);
// //       },
// //       5 * 60 * 1000,
// //     );

// //     console.log("✅ Offline system initialized");
// //   } catch (error) {
// //     console.error("❌ Failed to initialize offline system:", error);
// //     dispatch(setSyncError("Failed to initialize offline system"));
// //   }
// // }

// // // ============================================
// // // 2. SYNC NOW (Main Sync Function)
// // // ============================================

// // export async function syncNow(
// //   dispatch: AppDispatch,
// //   getState: () => RootState,
// //   options: {
// //     force?: boolean;
// //     maxItems?: number;
// //   } = {},
// // ) {
// //   const { force = false, maxItems = 50 } = options;

// //   // Prevent concurrent syncs
// //   if (syncInFlight && !force) {
// //     console.log("⏳ Sync already in progress, skipping...");
// //     return { skipped: true, message: "Sync already in progress" };
// //   }

// //   // Check online status
// //   const online = await isOnline();
// //   if (!online) {
// //     console.log("📶 Offline mode, skipping sync");
// //     return { skipped: true, message: "Offline mode" };
// //   }

// //   // Start sync
// //   syncInFlight = true;
// //   dispatch(setSyncing(true));
// //   dispatch(setSyncError(null));
// //   dispatch(setSyncProgress(0));

// //   try {
// //     console.log("🔄 Starting sync...");
// //     dispatch(setSyncProgress(10));

// //     // ✅ STEP 1: Sync sessions first (priority)
// //     console.log("📤 Syncing sessions...");
// //     const sessionResult = await syncSessions(getState);
// //     dispatch(setSyncProgress(30));
// //     console.log(`✅ Synced ${sessionResult.synced} sessions`);

// //     // ✅ STEP 2: Fix order session IDs
// //     console.log("🔧 Fixing order session IDs...");
// //     await fixOrderSessionIds();
// //     dispatch(setSyncProgress(40));

// //     // ✅ STEP 3: Sync orders (now with valid session IDs)
// //     console.log("📤 Syncing orders...");
// //     const orderResult = await syncOrders(getState, maxItems);
// //     dispatch(setSyncProgress(60));
// //     console.log(`✅ Synced ${orderResult.synced} orders`);

// //     // ✅ STEP 4: Sync other items
// //     console.log("📤 Syncing other items...");
// //     const otherResult = await syncOtherItems(getState, maxItems);
// //     dispatch(setSyncProgress(80));
// //     console.log(`✅ Synced ${otherResult.synced} other items`);

// //     // ✅ STEP 5: Invalidate RTK Query cache
// //     dispatch(
// //       posApi.util.invalidateTags([
// //         "Products",
// //         "Orders",
// //         "Inventory",
// //         "Customers",
// //         "Sessions",
// //         "Categories",
// //         "Staff",
// //         "Stores",
// //       ]),
// //     );

// //     // ✅ STEP 6: Update queue count
// //     const remainingCount = await getQueuedCount();
// //     dispatch(setQueuedCount(remainingCount));

// //     // ✅ STEP 7: Check for failed items
// //     const failedItems = await getFailedOutboxItems(1);
// //     if (failedItems.length > 0) {
// //       dispatch(
// //         setSyncError(
// //           `Sync completed with ${failedItems.length} failed items. Please check and retry.`,
// //         ),
// //       );
// //       console.warn(`⚠️ ${failedItems.length} items failed to sync`);
// //     } else {
// //       dispatch(setSyncComplete());
// //       console.log("✅ Sync completed successfully");
// //     }

// //     dispatch(setSyncProgress(100));

// //     return {
// //       success: true,
// //       sessions: sessionResult.synced,
// //       orders: orderResult.synced,
// //       others: otherResult.synced,
// //       remaining: remainingCount,
// //       failed: failedItems.length,
// //     };
// //   } catch (error) {
// //     const message =
// //       error instanceof Error ? error.message : "Offline sync failed";
// //     dispatch(setSyncError(message));
// //     console.error("❌ Sync error:", error);
// //     return { success: false, error: message };
// //   } finally {
// //     syncInFlight = false;
// //     dispatch(setSyncing(false));
// //   }
// // }

// // // ============================================
// // // 3. SYNC SESSIONS (Priority)
// // // ============================================

// // async function syncSessions(
// //   getState: () => RootState,
// // ): Promise<{ synced: number }> {
// //   const state = getState();
// //   const token = state.auth.user?.token;

// //   // Get all pending session items
// //   const items = await getDueOutboxItems(100);
// //   const sessionItems = items.filter((item) => item.entity === "sessions");

// //   if (sessionItems.length === 0) {
// //     return { synced: 0 };
// //   }

// //   let synced = 0;

// //   for (const item of sessionItems) {
// //     try {
// //       console.log(`🔄 Syncing session ${item.entityId}...`);

// //       const url = `${POS_API_URL}${item.endpoint}`;
// //       const headers: HeadersInit = {
// //         "Content-Type": "application/json",
// //         ...(token ? { Authorization: `Bearer ${token}` } : {}),
// //       };
// //       const body = JSON.stringify(item.payload);

// //       const response = await fetch(url, {
// //         method: item.method,
// //         headers,
// //         body,
// //       });

// //       const data = await response.json().catch(() => undefined);

// //       if (!response.ok) {
// //         throw new Error(data?.message || `HTTP ${response.status}`);
// //       }

// //       // Mark session as synced with remote ID
// //       await markEntitySynced(item.entity, item.entityId, data ?? {});
// //       await markOutboxSynced(item.id);
// //       synced++;
// //       console.log(
// //         `✅ Session ${item.entityId} synced (Remote ID: ${data?.id || "unknown"})`,
// //       );
// //     } catch (error) {
// //       const message =
// //         error instanceof Error ? error.message : "Session sync failed";
// //       await markOutboxFailed(item.id, item.attempts + 1, message);
// //       console.error(`❌ Failed to sync session ${item.entityId}:`, message);
// //     }
// //   }

// //   return { synced };
// // }

// // // ============================================
// // // 4. FIX ORDER SESSION IDS
// // // ============================================

// // async function fixOrderSessionIds() {
// //   try {
// //     const db = getOfflineDb();

// //     // Get all pending orders with session IDs
// //     const pendingOrders = await db
// //       .select()
// //       .from(syncOutbox)
// //       .where(
// //         and(
// //           eq(syncOutbox.entity, "orders"),
// //           eq(syncOutbox.status, "pending"),
// //           eq(syncOutbox.operation, "create"),
// //         ),
// //       );

// //     let fixedCount = 0;

// //     for (const item of pendingOrders) {
// //       const payload = item.payload as any;

// //       if (payload.sessionId) {
// //         // Check if this session exists in local DB
// //         const [session] = await db
// //           .select()
// //           .from(sessions)
// //           .where(eq(sessions.id, payload.sessionId))
// //           .limit(1);

// //         if (session) {
// //           // If session has remote ID, use it
// //           if (session.remoteId) {
// //             payload.sessionId = session.remoteId;
// //             await updateOutboxPayload(item.id, payload);
// //             fixedCount++;
// //             console.log(
// //               `✅ Updated order ${item.entityId} with remote session ID: ${session.remoteId}`,
// //             );
// //           } else {
// //             // Session not synced yet, remove it from order
// //             console.warn(
// //               `⚠️ Session ${payload.sessionId} not synced. Removing from order ${item.entityId}`,
// //             );
// //             delete payload.sessionId;
// //             await updateOutboxPayload(item.id, payload);
// //             fixedCount++;
// //           }
// //         } else {
// //           // Session doesn't exist locally, remove it
// //           console.warn(
// //             `⚠️ Session ${payload.sessionId} not found locally. Removing from order ${item.entityId}`,
// //           );
// //           delete payload.sessionId;
// //           await updateOutboxPayload(item.id, payload);
// //           fixedCount++;
// //         }
// //       }
// //     }

// //     if (fixedCount > 0) {
// //       console.log(`✅ Fixed ${fixedCount} order session IDs`);
// //     }

// //     return { fixed: fixedCount };
// //   } catch (error) {
// //     console.error("❌ Failed to fix order session IDs:", error);
// //     return { fixed: 0 };
// //   }
// // }

// // // ============================================
// // // 5. SYNC ORDERS
// // // ============================================

// // async function syncOrders(
// //   getState: () => RootState,
// //   maxItems: number,
// // ): Promise<{ synced: number }> {
// //   const state = getState();
// //   const token = state.auth.user?.token;

// //   // Get pending orders (excluding those already processed)
// //   const items = await getDueOutboxItems(maxItems);
// //   const orderItems = items.filter((item) => item.entity === "orders");

// //   if (orderItems.length === 0) {
// //     return { synced: 0 };
// //   }

// //   let synced = 0;

// //   for (const item of orderItems) {
// //     try {
// //       // Double-check session ID before syncing
// //       const payload = item.payload as any;

// //       if (payload.sessionId) {
// //         const db = getOfflineDb();
// //         const [session] = await db
// //           .select()
// //           .from(sessions)
// //           .where(eq(sessions.id, payload.sessionId))
// //           .limit(1);

// //         if (session?.remoteId) {
// //           // Use remote session ID
// //           payload.sessionId = session.remoteId;
// //           await updateOutboxPayload(item.id, payload);
// //           console.log(
// //             `✅ Updated order ${item.entityId} with remote session ID: ${session.remoteId}`,
// //           );
// //         } else {
// //           // Session not synced, remove it
// //           console.warn(
// //             `⚠️ Session ${payload.sessionId} not synced. Removing from order ${item.entityId}`,
// //           );
// //           delete payload.sessionId;
// //           await updateOutboxPayload(item.id, payload);
// //         }
// //       }

// //       console.log(`🔄 Syncing order ${item.entityId}...`);

// //       const url = `${POS_API_URL}${item.endpoint}`;
// //       const headers: HeadersInit = {
// //         "Content-Type": "application/json",
// //         ...(token ? { Authorization: `Bearer ${token}` } : {}),
// //       };

// //       // Use updated payload
// //       const body = JSON.stringify(payload);

// //       const response = await fetch(url, {
// //         method: item.method,
// //         headers,
// //         body,
// //       });

// //       const data = await response.json().catch(() => undefined);

// //       if (!response.ok) {
// //         // Check if error is session-related
// //         if (
// //           data?.message?.includes("session is closed") ||
// //           data?.message?.includes("session is invalid")
// //         ) {
// //           console.warn(
// //             `⚠️ Session error for order ${item.entityId}. Removing session and retrying...`,
// //           );

// //           // Remove session from payload
// //           delete payload.sessionId;
// //           await updateOutboxPayload(item.id, payload);

// //           // Reset attempts to retry
// //           await retryOutboxItem(item.id);

// //           console.log(`🔄 Retrying order ${item.entityId} without session...`);
// //           continue; // Retry with updated payload
// //         }

// //         throw new Error(data?.message || `HTTP ${response.status}`);
// //       }

// //       await markOrderSynced(item.entityId, data);
// //       await markOutboxSynced(item.id);
// //       synced++;
// //       console.log(`✅ Order ${item.entityId} synced`);
// //     } catch (error) {
// //       const message =
// //         error instanceof Error ? error.message : "Order sync failed";
// //       await markOutboxFailed(item.id, item.attempts + 1, message);
// //       await markOrderSyncFailed(item.entityId, message);
// //       console.error(`❌ Failed to sync order ${item.entityId}:`, message);
// //     }
// //   }

// //   return { synced };
// // }

// // // ============================================
// // // 6. SYNC OTHER ITEMS
// // // ============================================

// // async function syncOtherItems(
// //   getState: () => RootState,
// //   maxItems: number,
// // ): Promise<{ synced: number }> {
// //   const state = getState();
// //   const token = state.auth.user?.token;

// //   const items = await getDueOutboxItems(maxItems);
// //   const otherItems = items.filter(
// //     (item) => item.entity !== "sessions" && item.entity !== "orders",
// //   );

// //   if (otherItems.length === 0) {
// //     return { synced: 0 };
// //   }

// //   let synced = 0;

// //   for (const item of otherItems) {
// //     try {
// //       console.log(
// //         `🔄 Syncing ${item.entity} ${item.operation} (${item.entityId})...`,
// //       );

// //       const url = `${POS_API_URL}${item.endpoint}`;
// //       const headers: HeadersInit = {
// //         "Content-Type": "application/json",
// //         ...(token ? { Authorization: `Bearer ${token}` } : {}),
// //       };
// //       const body =
// //         item.method !== "DELETE" ? JSON.stringify(item.payload) : undefined;

// //       const response = await fetch(url, {
// //         method: item.method,
// //         headers,
// //         body,
// //       });

// //       const data = await response.json().catch(() => undefined);

// //       if (!response.ok) {
// //         throw new Error(data?.message || `HTTP ${response.status}`);
// //       }

// //       await markEntitySynced(item.entity, item.entityId, data ?? {});
// //       await markOutboxSynced(item.id);
// //       synced++;
// //       console.log(`✅ ${item.entity} ${item.entityId} synced`);
// //     } catch (error) {
// //       const message = error instanceof Error ? error.message : "Sync failed";
// //       await markOutboxFailed(item.id, item.attempts + 1, message);
// //       await markEntitySyncFailed(item.entity, item.entityId, message);
// //       console.error(
// //         `❌ Failed to sync ${item.entity} ${item.entityId}:`,
// //         message,
// //       );
// //     }
// //   }

// //   return { synced };
// // }

// // // ============================================
// // // 7. HELPER: UPDATE OUTBOX PAYLOAD
// // // ============================================

// // async function updateOutboxPayload(itemId: string, payload: any) {
// //   try {
// //     const db = getOfflineDb();
// //     await db
// //       .update(syncOutbox)
// //       .set({
// //         payload: JSON.stringify(payload),
// //         updatedAt: new Date().toISOString(),
// //       })
// //       .where(eq(syncOutbox.id, itemId));
// //   } catch (error) {
// //     console.error("Failed to update outbox payload:", error);
// //   }
// // }

// // // ============================================
// // // 8. RETRY FAILED ITEMS
// // // ============================================

// // export async function retryFailedItems(
// //   dispatch: AppDispatch,
// //   getState: () => RootState,
// //   itemIds?: string[],
// // ) {
// //   const online = await isOnline();
// //   if (!online) {
// //     dispatch(setSyncError("Cannot retry: Offline mode"));
// //     return { error: "Offline mode" };
// //   }

// //   try {
// //     let itemsToRetry: string[] = [];

// //     if (itemIds && itemIds.length > 0) {
// //       // Retry specific items
// //       for (const id of itemIds) {
// //         await retryOutboxItem(id);
// //         itemsToRetry.push(id);
// //       }
// //     } else {
// //       // Retry all failed items
// //       const failedItems = await getFailedOutboxItems(100);
// //       for (const item of failedItems) {
// //         await retryOutboxItem(item.id);
// //         itemsToRetry.push(item.id);
// //       }
// //     }

// //     // Run sync to process retried items
// //     const result = await syncNow(dispatch, getState, { force: true });

// //     return {
// //       success: true,
// //       retried: itemsToRetry.length,
// //       ...result,
// //     };
// //   } catch (error) {
// //     const message =
// //       error instanceof Error ? error.message : "Failed to retry items";
// //     dispatch(setSyncError(message));
// //     return { error: message };
// //   }
// // }

// // // ============================================
// // // 9. CLEAR SYNC QUEUE
// // // ============================================

// // export async function clearSyncQueue(dispatch: AppDispatch) {
// //   try {
// //     const items = await getOutboxItems(1000);
// //     for (const item of items) {
// //       await markOutboxSynced(item.id);
// //     }

// //     const count = await getQueuedCount();
// //     dispatch(setQueuedCount(count));
// //     dispatch(setSyncComplete());

// //     return { cleared: items.length };
// //   } catch (error) {
// //     const message =
// //       error instanceof Error ? error.message : "Failed to clear queue";
// //     dispatch(setSyncError(message));
// //     return { error: message };
// //   }
// // }

// // // ============================================
// // // 10. GET SYNC STATUS
// // // ============================================

// // export async function getSyncStatus() {
// //   const online = await isOnline();
// //   const queueCount = await getQueuedCount();
// //   const failedItems = await getFailedOutboxItems(100);
// //   const allItems = await getOutboxItems(100);

// //   return {
// //     isOnline: online,
// //     queueCount,
// //     failedCount: failedItems.length,
// //     totalPending: allItems.length,
// //     items: allItems.map((item) => ({
// //       id: item.id,
// //       entity: item.entity,
// //       operation: item.operation,
// //       status: item.status,
// //       attempts: item.attempts,
// //       lastError: item.lastError,
// //       createdAt: item.createdAt,
// //     })),
// //     failedItems: failedItems.map((item) => ({
// //       id: item.id,
// //       entity: item.entity,
// //       operation: item.operation,
// //       attempts: item.attempts,
// //       lastError: item.lastError,
// //     })),
// //   };
// // }

// // // ============================================
// // // 11. CLEANUP
// // // ============================================

// // export function cleanupOfflineSystem() {
// //   if (unsubscribeNetwork) {
// //     unsubscribeNetwork();
// //     unsubscribeNetwork = undefined;
// //   }

// //   if (syncInterval) {
// //     clearInterval(syncInterval);
// //     syncInterval = undefined;
// //   }

// //   syncInFlight = false;
// //   console.log("🧹 Offline system cleaned up");
// // }

// // // ============================================
// // // 12. REACT HOOK FOR SYNC (useSync)
// // // ============================================

// // import { useEffect, useState, useCallback } from "react";
// // // import { useAppDispatch, useAppSelector } from "@/hooks/redux-hooks";
// // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // /**
// //  * useSync Hook
// //  *
// //  * @returns {Object} Sync state and functions
// //  */
// // export function useSync() {
// //   const dispatch = useAppDispatch();

// //   // Redux state
// //   const isOnline = useAppSelector((state) => state.offline.isOnline);
// //   const isSyncing = useAppSelector((state) => state.offline.isSyncing);
// //   const syncStatus = useAppSelector((state) => state.offline.syncStatus);
// //   const syncError = useAppSelector((state) => state.offline.syncError);
// //   const queueCount = useAppSelector((state) => state.offline.queuedCount);
// //   const syncProgress = useAppSelector((state) => state.offline.syncProgress);

// //   // Local state
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [detailedStatus, setDetailedStatus] = useState<any>(null);

// //   // Get current state for thunks
// //   const getState = useCallback(() => {
// //     // This returns the current state - in practice, you'd pass the actual getState
// //     return { auth: { user: { token: "" } } } as RootState;
// //   }, []);

// //   /**
// //    * Trigger sync manually
// //    */
// //   const sync = useCallback(
// //     async (options?: { force?: boolean; maxItems?: number }) => {
// //       setIsLoading(true);
// //       try {
// //         const result = await syncNow(dispatch, getState, options);
// //         return result;
// //       } catch (error) {
// //         console.error("Sync failed:", error);
// //         throw error;
// //       } finally {
// //         setIsLoading(false);
// //       }
// //     },
// //     [dispatch, getState],
// //   );

// //   /**
// //    * Retry failed sync items
// //    */
// //   const retry = useCallback(
// //     async (itemIds?: string[]) => {
// //       setIsLoading(true);
// //       try {
// //         const result = await retryFailedItems(dispatch, getState, itemIds);
// //         return result;
// //       } catch (error) {
// //         console.error("Retry failed:", error);
// //         throw error;
// //       } finally {
// //         setIsLoading(false);
// //       }
// //     },
// //     [dispatch, getState],
// //   );

// //   /**
// //    * Clear all pending sync items
// //    */
// //   const clear = useCallback(async () => {
// //     setIsLoading(true);
// //     try {
// //       const result = await clearSyncQueue(dispatch);
// //       return result;
// //     } catch (error) {
// //       console.error("Clear failed:", error);
// //       throw error;
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   }, [dispatch]);

// //   /**
// //    * Get detailed sync status
// //    */
// //   const getStatus = useCallback(async () => {
// //     try {
// //       const status = await getSyncStatus();
// //       setDetailedStatus(status);
// //       return status;
// //     } catch (error) {
// //       console.error("Get status failed:", error);
// //       throw error;
// //     }
// //   }, []);

// //   /**
// //    * Refresh sync status
// //    */
// //   const refresh = useCallback(async () => {
// //     try {
// //       const count = await getQueuedCount();
// //       dispatch(setQueuedCount(count));
// //       const status = await getSyncStatus();
// //       setDetailedStatus(status);
// //       return { queueCount: count, status };
// //     } catch (error) {
// //       console.error("Refresh failed:", error);
// //       throw error;
// //     }
// //   }, [dispatch]);

// //   // Auto-refresh status periodically
// //   useEffect(() => {
// //     refresh();
// //     const interval = setInterval(refresh, 30000);
// //     return () => clearInterval(interval);
// //   }, [refresh]);

// //   return {
// //     // State
// //     isOnline,
// //     isSyncing,
// //     isLoading,
// //     syncStatus,
// //     syncError,
// //     queueCount,
// //     syncProgress,
// //     detailedStatus,

// //     // Actions
// //     sync,
// //     retry,
// //     clear,
// //     getStatus,
// //     refresh,
// //   };
// // }

// // // ============================================
// // // 13. EXPORT TYPES
// // // ============================================

// // export type SyncResult = {
// //   success?: boolean;
// //   skipped?: boolean;
// //   message?: string;
// //   sessions?: number;
// //   orders?: number;
// //   others?: number;
// //   pushed?: number;
// //   remaining?: number;
// //   failed?: number;
// //   retried?: number;
// //   cleared?: number;
// //   error?: string;
// // };

// // export type SyncStatus = {
// //   isOnline: boolean;
// //   queueCount: number;
// //   failedCount: number;
// //   totalPending: number;
// //   items: Array<{
// //     id: string;
// //     entity: string;
// //     operation: string;
// //     status: string;
// //     attempts: number;
// //     lastError: string | null;
// //     createdAt: string;
// //   }>;
// //   failedItems: Array<{
// //     id: string;
// //     entity: string;
// //     operation: string;
// //     attempts: number;
// //     lastError: string | null;
// //   }>;
// // };

// // //
// // // // services/offline/syncManager.ts
// // // import { posApi, POS_API_URL } from "@/services/api/posApi";
// // // import type { AppDispatch, RootState } from "@/services/store/store";
// // // import { isOnline, subscribeToOnlineStatus } from "./network";
// // // import {
// // //   getDueOutboxItems,
// // //   getQueuedCount,
// // //   markOrderSyncFailed,
// // //   markOrderSynced,
// // //   markEntitySyncFailed,
// // //   markEntitySynced,
// // //   markOutboxDead,
// // //   markOutboxFailed,
// // //   markOutboxSynced,
// // //   getFailedOutboxItems,
// // //   getOutboxItems,
// // //   retryOutboxItem,
// // // } from "./repository";
// // // import {
// // //   setInitialized,
// // //   setOnline,
// // //   setQueuedCount,
// // //   setSyncComplete,
// // //   setSyncError,
// // //   setSyncing,
// // //   setSyncProgress,
// // // } from "./offlineSlice";
// // // import { migrateOfflineDatabase } from "./migrations";

// // // // ============================================
// // // // GLOBAL STATE
// // // // ============================================

// // // let syncInFlight = false;
// // // let unsubscribeNetwork: (() => void) | undefined;
// // // let syncInterval: ReturnType<typeof setInterval> | undefined;

// // // // ============================================
// // // // 1. INITIALIZATION
// // // // ============================================

// // // export async function initializeOfflineSystem(
// // //   dispatch: AppDispatch,
// // //   getState: () => RootState,
// // // ) {
// // //   try {
// // //     // Migrate database
// // //     await migrateOfflineDatabase();
// // //     dispatch(setInitialized(true));

// // //     // Get initial queue count
// // //     const count = await getQueuedCount();
// // //     dispatch(setQueuedCount(count));

// // //     // Check online status using network module
// // //     const online = await isOnline();
// // //     dispatch(setOnline(online));

// // //     // Subscribe to network changes
// // //     unsubscribeNetwork?.();
// // //     unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
// // //       dispatch(setOnline(nextOnline));
// // //       if (nextOnline) {
// // //         // Auto-sync when coming online
// // //         void syncNow(dispatch, getState);
// // //       }
// // //     });

// // //     // Initial sync if online
// // //     if (online) {
// // //       await syncNow(dispatch, getState);
// // //     }

// // //     // Start periodic sync (every 5 minutes)
// // //     if (syncInterval) {
// // //       clearInterval(syncInterval);
// // //     }

// // //     syncInterval = setInterval(
// // //       () => {
// // //         void syncNow(dispatch, getState);
// // //       },
// // //       5 * 60 * 1000,
// // //     );

// // //     console.log("✅ Offline system initialized");
// // //   } catch (error) {
// // //     console.error("❌ Failed to initialize offline system:", error);
// // //     dispatch(setSyncError("Failed to initialize offline system"));
// // //   }
// // // }

// // // // ============================================
// // // // 2. SYNC NOW (Main Sync Function)
// // // // ============================================

// // // export async function syncNow(
// // //   dispatch: AppDispatch,
// // //   getState: () => RootState,
// // //   options: {
// // //     force?: boolean;
// // //     maxItems?: number;
// // //   } = {},
// // // ) {
// // //   const { force = false, maxItems = 50 } = options;

// // //   // Prevent concurrent syncs
// // //   if (syncInFlight && !force) {
// // //     console.log("⏳ Sync already in progress, skipping...");
// // //     return { skipped: true, message: "Sync already in progress" };
// // //   }

// // //   // Check online status using network module
// // //   const online = await isOnline();
// // //   if (!online) {
// // //     console.log("📶 Offline mode, skipping sync");
// // //     return { skipped: true, message: "Offline mode" };
// // //   }

// // //   // Start sync
// // //   syncInFlight = true;
// // //   dispatch(setSyncing(true));
// // //   dispatch(setSyncError(""));
// // //   dispatch(setSyncProgress(0));

// // //   try {
// // //     console.log("🔄 Starting sync...");
// // //     dispatch(setSyncProgress(20));

// // //     // 1. Push pending items to server
// // //     const pushedCount = await pushOutbox(getState, maxItems);
// // //     console.log(`📤 Pushed ${pushedCount} items`);
// // //     dispatch(setSyncProgress(60));

// // //     // 2. Invalidate RTK Query cache to refresh data
// // //     dispatch(
// // //       posApi.util.invalidateTags([
// // //         "Products",
// // //         "Orders",
// // //         "Inventory",
// // //         "Customers",
// // //         "Sessions",
// // //         "Categories",
// // //         "Staff",
// // //         "Stores",
// // //       ]),
// // //     );
// // //     dispatch(setSyncProgress(80));

// // //     // 3. Update queue count
// // //     const remainingCount = await getQueuedCount();
// // //     dispatch(setQueuedCount(remainingCount));

// // //     // 4. Check for failed items
// // //     const failedItems = await getFailedOutboxItems(1);
// // //     if (failedItems.length > 0) {
// // //       dispatch(
// // //         setSyncError(
// // //           `Sync completed with ${failedItems.length} failed items. Please check and retry.`,
// // //         ),
// // //       );
// // //       console.warn(`⚠️ ${failedItems.length} items failed to sync`);
// // //     } else {
// // //       dispatch(setSyncComplete());
// // //       console.log("✅ Sync completed successfully");
// // //     }

// // //     // 5. Update progress
// // //     dispatch(setSyncProgress(100));

// // //     return {
// // //       success: true,
// // //       pushed: pushedCount,
// // //       remaining: remainingCount,
// // //       failed: failedItems.length,
// // //     };
// // //   } catch (error) {
// // //     const message =
// // //       error instanceof Error ? error.message : "Offline sync failed";
// // //     dispatch(setSyncError(message));
// // //     console.error("❌ Sync error:", error);
// // //     return {
// // //       success: false,
// // //       error: message,
// // //     };
// // //   } finally {
// // //     syncInFlight = false;
// // //     dispatch(setSyncing(false));
// // //   }
// // // }

// // // // ============================================
// // // // 3. PUSH OUTBOX (Sync Local Changes to Server)
// // // // ============================================

// // // async function pushOutbox(getState: () => RootState, maxItems: number = 50) {
// // //   const state = getState();
// // //   const token = state.auth.user?.token;
// // //   const items = await getDueOutboxItems(maxItems);

// // //   if (items.length === 0) {
// // //     return 0;
// // //   }

// // //   console.log(`📤 Processing ${items.length} outbox items...`);
// // //   let successCount = 0;

// // //   for (const item of items) {
// // //     try {
// // //       // Check if item is dead (too many attempts)
// // //       if (item.attempts >= 10) {
// // //         await markOutboxDead(item.id);
// // //         console.warn(
// // //           `💀 Item ${item.id} marked as dead (${item.attempts} attempts)`,
// // //         );
// // //         continue;
// // //       }

// // //       console.log(
// // //         `🔄 Syncing ${item.entity} ${item.operation} (${item.entityId})...`,
// // //       );

// // //       // Prepare request
// // //       const url = `${POS_API_URL}${item.endpoint}`;
// // //       const headers: HeadersInit = {
// // //         "Content-Type": "application/json",
// // //         ...(token ? { Authorization: `Bearer ${token}` } : {}),
// // //       };

// // //       // Prepare body (skip for DELETE)
// // //       const body =
// // //         item.method !== "DELETE" ? JSON.stringify(item.payload) : undefined;

// // //       // Make request
// // //       const response = await fetch(url, {
// // //         method: item.method,
// // //         headers,
// // //         body,
// // //       });

// // //       // Parse response
// // //       const data = await response.json().catch(() => undefined);

// // //       // Check response
// // //       if (!response.ok) {
// // //         throw new Error(
// // //           data?.message ||
// // //             data?.error ||
// // //             `HTTP ${response.status}: ${response.statusText}`,
// // //         );
// // //       }

// // //       // Handle successful sync
// // //       if (item.entity === "orders") {
// // //         await markOrderSynced(item.entityId, data);
// // //       } else {
// // //         await markEntitySynced(item.entity, item.entityId, data ?? {});
// // //       }

// // //       await markOutboxSynced(item.id);
// // //       successCount++;

// // //       console.log(`✅ Synced ${item.entity} ${item.entityId}`);
// // //     } catch (error) {
// // //       // Handle sync failure
// // //       const message =
// // //         error instanceof Error ? error.message : "Unknown sync error";
// // //       const attempts = item.attempts + 1;

// // //       console.error(
// // //         `❌ Failed to sync ${item.entity} ${item.entityId}:`,
// // //         message,
// // //       );

// // //       await markOutboxFailed(item.id, attempts, message);

// // //       if (item.entity === "orders") {
// // //         await markOrderSyncFailed(item.entityId, message);
// // //       } else {
// // //         await markEntitySyncFailed(item.entity, item.entityId, message);
// // //       }
// // //     }
// // //   }

// // //   return successCount;
// // // }

// // // // ============================================
// // // // 4. RETRY FAILED ITEMS
// // // // ============================================

// // // export async function retryFailedItems(
// // //   dispatch: AppDispatch,
// // //   getState: () => RootState,
// // //   itemIds?: string[],
// // // ) {
// // //   const online = await isOnline();
// // //   if (!online) {
// // //     dispatch(setSyncError("Cannot retry: Offline mode"));
// // //     return { error: "Offline mode" };
// // //   }

// // //   try {
// // //     let items;
// // //     if (itemIds && itemIds.length > 0) {
// // //       // Retry specific items
// // //       for (const id of itemIds) {
// // //         await retryOutboxItem(id);
// // //       }
// // //       items = itemIds;
// // //     } else {
// // //       // Retry all failed items
// // //       const failedItems = await getFailedOutboxItems(100);
// // //       for (const item of failedItems) {
// // //         await retryOutboxItem(item.id);
// // //       }
// // //       items = failedItems.map((item) => item.id);
// // //     }

// // //     // Run sync to process retried items
// // //     const result = await syncNow(dispatch, getState, { force: true });

// // //     return {
// // //       success: true,
// // //       retried: items.length,
// // //       ...result,
// // //     };
// // //   } catch (error) {
// // //     const message =
// // //       error instanceof Error ? error.message : "Failed to retry items";
// // //     dispatch(setSyncError(message));
// // //     return { error: message };
// // //   }
// // // }

// // // // ============================================
// // // // 5. CLEAR SYNC QUEUE
// // // // ============================================

// // // export async function clearSyncQueue(dispatch: AppDispatch) {
// // //   try {
// // //     const items = await getOutboxItems(1000);
// // //     for (const item of items) {
// // //       await markOutboxSynced(item.id);
// // //     }

// // //     const count = await getQueuedCount();
// // //     dispatch(setQueuedCount(count));
// // //     dispatch(setSyncComplete());

// // //     return { cleared: items.length };
// // //   } catch (error) {
// // //     const message =
// // //       error instanceof Error ? error.message : "Failed to clear queue";
// // //     dispatch(setSyncError(message));
// // //     return { error: message };
// // //   }
// // // }

// // // // ============================================
// // // // 6. GET SYNC STATUS
// // // // ============================================

// // // export async function getSyncStatus() {
// // //   const online = await isOnline();
// // //   const queueCount = await getQueuedCount();
// // //   const failedItems = await getFailedOutboxItems(100);
// // //   const allItems = await getOutboxItems(100);

// // //   return {
// // //     isOnline: online,
// // //     queueCount,
// // //     failedCount: failedItems.length,
// // //     totalPending: allItems.length,
// // //     items: allItems.map((item) => ({
// // //       id: item.id,
// // //       entity: item.entity,
// // //       operation: item.operation,
// // //       status: item.status,
// // //       attempts: item.attempts,
// // //       lastError: item.lastError,
// // //       createdAt: item.createdAt,
// // //     })),
// // //     failedItems: failedItems.map((item) => ({
// // //       id: item.id,
// // //       entity: item.entity,
// // //       operation: item.operation,
// // //       attempts: item.attempts,
// // //       lastError: item.lastError,
// // //     })),
// // //   };
// // // }

// // // // ============================================
// // // // 7. CLEANUP
// // // // ============================================

// // // export function cleanupOfflineSystem() {
// // //   if (unsubscribeNetwork) {
// // //     unsubscribeNetwork();
// // //     unsubscribeNetwork = undefined;
// // //   }

// // //   if (syncInterval) {
// // //     clearInterval(syncInterval);
// // //     syncInterval = undefined;
// // //   }

// // //   syncInFlight = false;
// // //   console.log("🧹 Offline system cleaned up");
// // // }

// // // // ============================================
// // // // 8. REACT HOOK FOR SYNC (useSync)
// // // // ============================================

// // // import { useEffect, useState, useCallback } from "react";
// // // // import { useAppDispatch, useAppSelector } from "@/hooks/redux-hooks";
// // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // // /**
// // //  * useSync Hook
// // //  *
// // //  * @returns {Object} Sync state and functions
// // //  * @returns {boolean} isOnline - Current online status
// // //  * @returns {boolean} isSyncing - Whether sync is in progress
// // //  * @returns {boolean} isLoading - Whether an operation is loading
// // //  * @returns {string} syncStatus - 'idle' | 'syncing' | 'complete' | 'error'
// // //  * @returns {string|null} syncError - Last sync error message
// // //  * @returns {number} queueCount - Number of items in sync queue
// // //  * @returns {Function} sync - Trigger sync manually
// // //  * @returns {Function} retry - Retry failed items
// // //  * @returns {Function} clear - Clear sync queue
// // //  * @returns {Function} getStatus - Get detailed sync status
// // //  * @returns {Function} refresh - Refresh sync status
// // //  */
// // // export function useSync() {
// // //   const dispatch = useAppDispatch();

// // //   // Redux state
// // //   const isOnline = useAppSelector((state: RootState) => state.offline.isOnline);
// // //   const isSyncing = useAppSelector(
// // //     (state: RootState) => state.offline.isSyncing,
// // //   );
// // //   const syncStatus = useAppSelector(
// // //     (state: RootState) => state.offline.syncStatus,
// // //   );
// // //   const syncError = useAppSelector(
// // //     (state: RootState) => state.offline.syncError,
// // //   );
// // //   const queueCount = useAppSelector(
// // //     (state: RootState) => state.offline.queuedCount,
// // //   );
// // //   const syncProgress = useAppSelector(
// // //     (state: RootState) => state.offline.syncProgress,
// // //   );

// // //   // Local state
// // //   const [isLoading, setIsLoading] = useState(false);
// // //   const [detailedStatus, setDetailedStatus] = useState<any>(null);

// // //   // Get current state for thunks
// // //   const getState = useCallback(() => {
// // //     // This is a simplified version - in practice, you'd get the actual state
// // //     return { auth: { user: { token: "" } } } as RootState;
// // //   }, []);

// // //   /**
// // //    * Trigger sync manually
// // //    */
// // //   const sync = useCallback(
// // //     async (options?: { force?: boolean; maxItems?: number }) => {
// // //       setIsLoading(true);
// // //       try {
// // //         const result = await syncNow(dispatch, getState, options);
// // //         return result;
// // //       } catch (error) {
// // //         console.error("Sync failed:", error);
// // //         throw error;
// // //       } finally {
// // //         setIsLoading(false);
// // //       }
// // //     },
// // //     [dispatch, getState],
// // //   );

// // //   /**
// // //    * Retry failed sync items
// // //    */
// // //   const retry = useCallback(
// // //     async (itemIds?: string[]) => {
// // //       setIsLoading(true);
// // //       try {
// // //         const result = await retryFailedItems(dispatch, getState, itemIds);
// // //         return result;
// // //       } catch (error) {
// // //         console.error("Retry failed:", error);
// // //         throw error;
// // //       } finally {
// // //         setIsLoading(false);
// // //       }
// // //     },
// // //     [dispatch, getState],
// // //   );

// // //   /**
// // //    * Clear all pending sync items
// // //    */
// // //   const clear = useCallback(async () => {
// // //     setIsLoading(true);
// // //     try {
// // //       const result = await clearSyncQueue(dispatch);
// // //       return result;
// // //     } catch (error) {
// // //       console.error("Clear failed:", error);
// // //       throw error;
// // //     } finally {
// // //       setIsLoading(false);
// // //     }
// // //   }, [dispatch]);

// // //   /**
// // //    * Get detailed sync status
// // //    */
// // //   const getStatus = useCallback(async () => {
// // //     try {
// // //       const status = await getSyncStatus();
// // //       setDetailedStatus(status);
// // //       return status;
// // //     } catch (error) {
// // //       console.error("Get status failed:", error);
// // //       throw error;
// // //     }
// // //   }, []);

// // //   /**
// // //    * Refresh sync status (get queue count and status)
// // //    */
// // //   const refresh = useCallback(async () => {
// // //     try {
// // //       const count = await getQueuedCount();
// // //       dispatch(setQueuedCount(count));
// // //       const status = await getSyncStatus();
// // //       setDetailedStatus(status);
// // //       return { queueCount: count, status };
// // //     } catch (error) {
// // //       console.error("Refresh failed:", error);
// // //       throw error;
// // //     }
// // //   }, [dispatch]);

// // //   // Auto-refresh status periodically
// // //   useEffect(() => {
// // //     refresh();
// // //     const interval = setInterval(refresh, 30000);
// // //     return () => clearInterval(interval);
// // //   }, []);

// // //   return {
// // //     // State
// // //     isOnline,
// // //     isSyncing,
// // //     isLoading,
// // //     syncStatus,
// // //     syncError,
// // //     queueCount,
// // //     syncProgress,
// // //     detailedStatus,

// // //     // Actions
// // //     sync,
// // //     retry,
// // //     clear,
// // //     getStatus,
// // //     refresh,
// // //   };
// // // }

// // // // ============================================
// // // // 9. EXPORT TYPES
// // // // ============================================

// // // export type SyncResult = {
// // //   success?: boolean;
// // //   skipped?: boolean;
// // //   message?: string;
// // //   pushed?: number;
// // //   remaining?: number;
// // //   failed?: number;
// // //   retried?: number;
// // //   cleared?: number;
// // //   error?: string;
// // // };

// // // export type SyncStatus = {
// // //   isOnline: boolean;
// // //   queueCount: number;
// // //   failedCount: number;
// // //   totalPending: number;
// // //   items: Array<{
// // //     id: string;
// // //     entity: string;
// // //     operation: string;
// // //     status: string;
// // //     attempts: number;
// // //     lastError: string | null;
// // //     createdAt: string;
// // //   }>;
// // //   failedItems: Array<{
// // //     id: string;
// // //     entity: string;
// // //     operation: string;
// // //     attempts: number;
// // //     lastError: string | null;
// // //   }>;
// // // };
// // // // import { posApi, POS_API_URL } from "@/services/api/posApi";
// // // // import type { AppDispatch, RootState } from "@/services/store/store";
// // // // import { isOnline, subscribeToOnlineStatus } from "./network";
// // // // import {
// // // //   getDueOutboxItems,
// // // //   getQueuedCount,
// // // //   markOrderSyncFailed,
// // // //   markOrderSynced,
// // // //   markEntitySyncFailed,
// // // //   markEntitySynced,
// // // //   markOutboxDead,
// // // //   markOutboxFailed,
// // // //   markOutboxSynced,
// // // //   getFailedOutboxItems,
// // // // } from "./repository";
// // // // import {
// // // //   setInitialized,
// // // //   setOnline,
// // // //   setQueuedCount,
// // // //   setSyncComplete,
// // // //   setSyncError,
// // // //   setSyncing,
// // // // } from "./offlineSlice";
// // // // import { migrateOfflineDatabase } from "./migrations";

// // // // let syncInFlight = false;
// // // // let unsubscribeNetwork: (() => void) | undefined;

// // // // export async function initializeOfflineSystem(
// // // //   dispatch: AppDispatch,
// // // //   getState: () => RootState,
// // // // ) {
// // // //   await migrateOfflineDatabase();
// // // //   dispatch(setInitialized(true));
// // // //   dispatch(setQueuedCount(await getQueuedCount()));

// // // //   const online = await isOnline();
// // // //   dispatch(setOnline(online));

// // // //   unsubscribeNetwork?.();
// // // //   unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
// // // //     dispatch(setOnline(nextOnline));
// // // //     if (nextOnline) {
// // // //       void syncNow(dispatch, getState);
// // // //     }
// // // //   });

// // // //   if (online) {
// // // //     await syncNow(dispatch, getState);
// // // //   }
// // // // }

// // // // export async function syncNow(
// // // //   dispatch: AppDispatch,
// // // //   getState: () => RootState,
// // // // ) {
// // // //   if (syncInFlight || !(await isOnline())) return;

// // // //   syncInFlight = true;
// // // //   dispatch(setSyncing(true));

// // // //   try {
// // // //     await pushOutbox(getState);
// // // //     dispatch(
// // // //       posApi.util.invalidateTags([
// // // //         "Products",
// // // //         "Orders",
// // // //         "Inventory",
// // // //         "Customers",
// // // //         "Sessions",
// // // //         "Categories",
// // // //         "Staff",
// // // //         "Stores",
// // // //       ]),
// // // //     );
// // // //     dispatch(setQueuedCount(await getQueuedCount()));
// // // //     const failedItems = await getFailedOutboxItems(1);
// // // //     if (failedItems.length > 0) {
// // // //       dispatch(
// // // //         setSyncError(
// // // //           `Sync has some failures. Please check failed items and try again or contact support.`,
// // // //         ),
// // // //       );
// // // //     } else {
// // // //       dispatch(setSyncComplete());
// // // //     }
// // // //   } catch (error) {
// // // //     dispatch(
// // // //       setSyncError(
// // // //         error instanceof Error ? error.message : "Offline sync failed",
// // // //       ),
// // // //     );
// // // //   } finally {
// // // //     syncInFlight = false;
// // // //   }
// // // // }

// // // // async function pushOutbox(getState: () => RootState) {
// // // //   const token = getState().auth.user?.token;
// // // //   const items = await getDueOutboxItems();

// // // //   for (const item of items) {
// // // //     // Dead-letter: stop retrying after 10 attempts
// // // //     if (item.attempts >= 10) {
// // // //       await markOutboxDead(item.id);
// // // //       continue;
// // // //     }

// // // //     try {
// // // //       const response = await fetch(`${POS_API_URL}${item.endpoint}`, {
// // // //         method: item.method,
// // // //         headers: {
// // // //           "content-type": "application/json",
// // // //           ...(token ? { authorization: `Bearer ${token}` } : {}),
// // // //         },
// // // //         // Don't send body for DELETE requests
// // // //         ...(item.method !== "DELETE"
// // // //           ? { body: JSON.stringify(item.payload) }
// // // //           : {}),
// // // //       });

// // // //       const data = await response.json().catch(() => undefined);

// // // //       if (!response.ok) {
// // // //         throw new Error(
// // // //           data?.message ?? `Sync request failed with ${response.status}`,
// // // //         );
// // // //       }

// // // //       if (item.entity === "orders") {
// // // //         await markOrderSynced(item.entityId, data);
// // // //       } else {
// // // //         await markEntitySynced(item.entity, item.entityId, data ?? {});
// // // //       }

// // // //       await markOutboxSynced(item.id);
// // // //     } catch (error) {
// // // //       const message =
// // // //         error instanceof Error ? error.message : "Unable to sync queued item";
// // // //       const attempts = item.attempts + 1;
// // // //       await markOutboxFailed(item.id, attempts, message);

// // // //       if (item.entity === "orders") {
// // // //         await markOrderSyncFailed(item.entityId, message);
// // // //       } else {
// // // //         await markEntitySyncFailed(item.entity, item.entityId, message);
// // // //       }
// // // //     }
// // // //   }
// // // // }

// // // // // import { posApi, POS_API_URL } from "@/services/api/posApi";
// // // // // import type { AppDispatch, RootState } from "@/services/store/store";
// // // // // import { isOnline, subscribeToOnlineStatus } from "./network";
// // // // // import {
// // // // //   getDueOutboxItems,
// // // // //   getQueuedCount,
// // // // //   markOrderSyncFailed,
// // // // //   markOrderSynced,
// // // // //   markEntitySyncFailed,
// // // // //   markEntitySynced,
// // // // //   markOutboxDead,
// // // // //   markOutboxFailed,
// // // // //   markOutboxSynced,
// // // // // } from "./repository";
// // // // // import {
// // // // //   setInitialized,
// // // // //   setOnline,
// // // // //   setQueuedCount,
// // // // //   setSyncComplete,
// // // // //   setSyncError,
// // // // //   setSyncing,
// // // // // } from "./offlineSlice";
// // // // // import { migrateOfflineDatabase } from "./migrations";

// // // // // let syncInFlight = false;
// // // // // let unsubscribeNetwork: (() => void) | undefined;

// // // // // export async function initializeOfflineSystem(dispatch: AppDispatch, getState: () => RootState) {
// // // // //   await migrateOfflineDatabase();
// // // // //   dispatch(setInitialized(true));
// // // // //   dispatch(setQueuedCount(await getQueuedCount()));

// // // // //   const online = await isOnline();
// // // // //   dispatch(setOnline(online));

// // // // //   unsubscribeNetwork?.();
// // // // //   unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
// // // // //     dispatch(setOnline(nextOnline));
// // // // //     if (nextOnline) {
// // // // //       void syncNow(dispatch, getState);
// // // // //     }
// // // // //   });

// // // // //   if (online) {
// // // // //     await syncNow(dispatch, getState);
// // // // //   }
// // // // // }

// // // // // export async function syncNow(dispatch: AppDispatch, getState: () => RootState) {
// // // // //   if (syncInFlight || !(await isOnline())) return;

// // // // //   syncInFlight = true;
// // // // //   dispatch(setSyncing(true));

// // // // //   try {
// // // // //     await pushOutbox(getState);
// // // // //     dispatch(posApi.util.invalidateTags(["Products", "Orders", "Inventory", "Customers", "Sessions", "Categories", "Staff", "Stores"]));
// // // // //     dispatch(setQueuedCount(await getQueuedCount()));
// // // // //     dispatch(setSyncComplete());
// // // // //   } catch (error) {
// // // // //     dispatch(setSyncError(error instanceof Error ? error.message : "Offline sync failed"));
// // // // //   } finally {
// // // // //     syncInFlight = false;
// // // // //   }
// // // // // }

// // // // // async function pushOutbox(getState: () => RootState) {
// // // // //   const token = getState().auth.user?.token;
// // // // //   const items = await getDueOutboxItems();

// // // // //   for (const item of items) {
// // // // //     // Dead-letter: stop retrying after 10 attempts
// // // // //     if (item.attempts >= 10) {
// // // // //       await markOutboxDead(item.id);
// // // // //       continue;
// // // // //     }

// // // // //     try {
// // // // //       const response = await fetch(`${POS_API_URL}${item.endpoint}`, {
// // // // //         method: item.method,
// // // // //         headers: {
// // // // //           "content-type": "application/json",
// // // // //           ...(token ? { authorization: `Bearer ${token}` } : {}),
// // // // //         },
// // // // //         // Don't send body for DELETE requests
// // // // //         ...(item.method !== "DELETE" ? { body: JSON.stringify(item.payload) } : {}),
// // // // //       });

// // // // //       const data = await response.json().catch(() => undefined);

// // // // //       if (!response.ok) {
// // // // //         throw new Error(data?.message ?? `Sync request failed with ${response.status}`);
// // // // //       }

// // // // //       if (item.entity === "orders") {
// // // // //         await markOrderSynced(item.entityId, data);
// // // // //       } else {
// // // // //         await markEntitySynced(item.entity, item.entityId, data ?? {});
// // // // //       }

// // // // //       await markOutboxSynced(item.id);
// // // // //     } catch (error) {
// // // // //       const message = error instanceof Error ? error.message : "Unable to sync queued item";
// // // // //       const attempts = item.attempts + 1;
// // // // //       await markOutboxFailed(item.id, attempts, message);

// // // // //       if (item.entity === "orders") {
// // // // //         await markOrderSyncFailed(item.entityId, message);
// // // // //       } else {
// // // // //         await markEntitySyncFailed(item.entity, item.entityId, message);
// // // // //       }
// // // // //     }
// // // // //   }
// // // // // }
