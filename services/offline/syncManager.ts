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
import { and, eq, inArray, sql } from "drizzle-orm";
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
  upsertCategories,
  upsertCustomers,
  upsertInventory,
  upsertPriceHistory,
  upsertProducts,
  upsertProductVariants,
  upsertSessions,
  upsertStores,
  upsertBrands,
  upsertPromotions,
  upsertTaxRates,
  upsertExpenses,
  upsertExpenseCategories,
  upsertCashRegisters,
  upsertGiftCards,
  upsertWallets,
  upsertSupplierPayments,
  upsertPurchaseOrders,
  upsertStockTransfers,
  upsertWebhooks,
  upsertNotifications,
  upsertTenantStoreSettings,
  upsertSuppliers,
  upsertOrders,
} from "./repository";
import {
  inventory,
  inventoryCounts,
  inventoryMovements,
  orders,
  priceHistory,
  products,
  productVariants,
  sessions,
  syncOutbox,
  brands,
  promotions,
  taxRates,
  expenses,
  expenseCategories,
  cashRegisters,
  giftCards,
  giftCardTransactions,
  wallets,
  walletTransactions,
  supplierPayments,
  purchaseOrders,
  purchaseOrderItems,
  stockTransfers,
  stockTransferItems,
  webhooks,
  apiKeys,
  notifications,
  tenantStoreSettings,
  auditLogs,
  suppliers,
} from "./schema";

// ============================================
// GLOBAL STATE
// ============================================

let syncInFlight = false;
let unsubscribeNetwork: (() => void) | undefined;
let syncInterval: NodeJS.Timeout | undefined;
let syncStartTime: number = 0;

// ============================================
// HELPER: Handle API Errors
// ============================================

function handleApiError(error: any, entityName: string): { synced: 0 } {
  // Network errors (offline, DNS, connection refused)
  if (
    error?.status === "FETCH_ERROR" ||
    error?.error?.message?.includes("Network request failed")
  ) {
    console.log(
      `📶 Network error fetching ${entityName} - skipping (offline or server unreachable)`,
    );
    return { synced: 0 };
  }

  // 404 Not Found - endpoint not implemented yet
  if (error?.status === 404) {
    console.log(`ℹ️ ${entityName} endpoint not available yet (404)`);
    return { synced: 0 };
  }

  // 401/403 - Authentication issues
  if (error?.status === 401 || error?.status === 403) {
    console.warn(`⚠️ Unauthorized to fetch ${entityName}`);
    return { synced: 0 };
  }

  // 422 - Validation errors (usually indicates payload issues)
  if (error?.status === 422) {
    console.warn(
      `⚠️ ${entityName} validation error (422) - check payload structure`,
    );
    return { synced: 0 };
  }

  // PARSING_ERROR - invalid response format
  if (error?.status === "PARSING_ERROR") {
    console.warn(`⚠️ ${entityName} endpoint returned invalid response`);
    return { synced: 0 };
  }

  // Other errors - log as error
  console.error(`❌ ${entityName} pull failed:`, error);
  return { synced: 0 };
}

// ============================================
// HELPER: Clean Order Payload for Server
// ============================================

function cleanOrderPayloadForServer(payload: any): any {
  const clean = { ...payload };

  // ✅ FIX: If customerId is null/undefined/empty, remove it entirely
  // The backend expects string or undefined, NOT null
  if (
    clean.customerId === null ||
    clean.customerId === undefined ||
    clean.customerId === ""
  ) {
    delete clean.customerId;
  }

  // ✅ FIX: If registerId is empty, remove it
  if (
    clean.registerId === null ||
    clean.registerId === undefined ||
    clean.registerId === ""
  ) {
    delete clean.registerId;
  }

  // ✅ FIX: If variantId is empty, remove it
  if (
    clean.variantId === null ||
    clean.variantId === undefined ||
    clean.variantId === ""
  ) {
    delete clean.variantId;
  }

  // Ensure all IDs are strings
  if (clean.userId) clean.userId = String(clean.userId);
  if (clean.storeId) clean.storeId = String(clean.storeId);
  if (clean.sessionId) clean.sessionId = String(clean.sessionId);
  if (clean.tenantId) clean.tenantId = String(clean.tenantId);

  // Clean items - remove empty variantId
  if (clean.items && Array.isArray(clean.items)) {
    clean.items = clean.items.map((item: any) => {
      const cleanedItem: any = {
        productId: String(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subTotal: Number(item.subTotal),
        discountAmount: Number(item.discountAmount || 0),
      };

      // Only add variantId if it has a value
      if (item.variantId && item.variantId !== "") {
        cleanedItem.variantId = String(item.variantId);
      }

      return cleanedItem;
    });
  }

  // Remove any undefined values
  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  });

  return clean;
}

// ============================================
// HELPER: Map Movement Type for Server
// ============================================

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

// ============================================
// HELPER: Clean Inventory Movement Payload for Server
// ============================================

function cleanInventoryMovementPayloadForServer(payload: any): any {
  const clean = { ...payload };

  // Map the type to the correct enum
  if (clean.type) {
    clean.type = mapMovementType(clean.type);
  }

  // Remove variantId if empty or null
  if (
    clean.variantId === null ||
    clean.variantId === undefined ||
    clean.variantId === ""
  ) {
    delete clean.variantId;
  } else {
    clean.variantId = String(clean.variantId);
  }

  // Ensure all IDs are strings
  if (clean.productId) clean.productId = String(clean.productId);
  if (clean.storeId) clean.storeId = String(clean.storeId);
  if (clean.tenantId) clean.tenantId = String(clean.tenantId);
  if (clean.referenceId) clean.referenceId = String(clean.referenceId);
  if (clean.referenceType) clean.referenceType = String(clean.referenceType);

  // Remove undefined values
  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  });

  return clean;
}

// ============================================
// 1. INITIALIZATION
// ============================================

export async function initializeOfflineSystem(
  dispatch: AppDispatch,
  getState: () => RootState,
) {
  try {
    // 1. Migrate database
    await runMigrations();
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

  // Check if user is authenticated
  const state = getState();
  const token = state.auth?.user?.token;
  if (!token) {
    if (!silent) console.log("🔒 No auth token, skipping sync");
    return { skipped: true, message: "Not authenticated" };
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
    dispatch(setSyncProgress(2));

    // ============================================
    // STEP 1: PULL Products
    // ============================================
    if (!silent) console.log("📥 Pulling products...");
    const productResult = await pullProducts(dispatch);
    syncedItems += productResult.synced;
    dispatch(setSyncProgress(8));
    if (!silent) console.log(`✅ Synced ${productResult.synced} products`);

    // ============================================
    // STEP 2: PULL Product Variants
    // ============================================
    if (!silent) console.log("📥 Pulling product variants...");
    const variantResult = await pullProductVariants(dispatch);
    syncedItems += variantResult.synced;
    dispatch(setSyncProgress(12));
    if (!silent) console.log(`✅ Synced ${variantResult.synced} variants`);

    // ============================================
    // STEP 3: PULL Inventory
    // ============================================
    if (!silent) console.log("📥 Pulling inventory...");
    const inventoryResult = await pullInventory(dispatch);
    syncedItems += inventoryResult.synced;
    dispatch(setSyncProgress(18));
    if (!silent)
      console.log(`✅ Synced ${inventoryResult.synced} inventory items`);

    // ============================================
    // STEP 4: PULL Categories
    // ============================================
    if (!silent) console.log("📥 Pulling categories...");
    const categoryResult = await pullCategories(dispatch);
    syncedItems += categoryResult.synced;
    dispatch(setSyncProgress(22));
    if (!silent) console.log(`✅ Synced ${categoryResult.synced} categories`);

    // In syncNow function, add this step after suppliers or before stores:

    // ============================================
    // STEP: PULL Staff
    // ============================================
    if (!silent) console.log("📥 Pulling staff...");
    const staffResult = await pullStaff(dispatch);
    syncedItems += staffResult.synced;
    dispatch(setSyncProgress(35));
    if (!silent) console.log(`✅ Synced ${staffResult.synced} staff`);

    // ============================================
    // STEP 5: PULL Brands
    // ============================================
    if (!silent) console.log("📥 Pulling brands...");
    const brandResult = await pullBrands(dispatch);
    syncedItems += brandResult.synced;
    dispatch(setSyncProgress(26));
    if (!silent) console.log(`✅ Synced ${brandResult.synced} brands`);

    // ============================================
    // STEP 6: PULL Customers
    // ============================================
    if (!silent) console.log("📥 Pulling customers...");
    const customerResult = await pullCustomers(dispatch);
    syncedItems += customerResult.synced;
    dispatch(setSyncProgress(30));
    if (!silent) console.log(`✅ Synced ${customerResult.synced} customers`);

    // ============================================
    // STEP 7: PULL Suppliers
    // ============================================
    if (!silent) console.log("📥 Pulling suppliers...");
    const supplierResult = await pullSuppliers(dispatch);
    syncedItems += supplierResult.synced;
    dispatch(setSyncProgress(34));
    if (!silent) console.log(`✅ Synced ${supplierResult.synced} suppliers`);

    // ============================================
    // STEP 8: PULL Stores
    // ============================================
    if (!silent) console.log("📥 Pulling stores...");
    const storeResult = await pullStores(dispatch);
    syncedItems += storeResult.synced;
    dispatch(setSyncProgress(38));
    if (!silent) console.log(`✅ Synced ${storeResult.synced} stores`);

    // ============================================
    // STEP 9: PULL Sessions
    // ============================================
    if (!silent) console.log("📥 Pulling sessions...");
    const sessionResult = await pullSessions(dispatch);
    syncedItems += sessionResult.synced;
    dispatch(setSyncProgress(42));
    if (!silent) console.log(`✅ Synced ${sessionResult.synced} sessions`);

    // ============================================
    // STEP 10: PULL Orders
    // ============================================
    if (!silent) console.log("📥 Pulling orders...");
    const orderResult = await pullOrders(dispatch);
    syncedItems += orderResult.synced;
    dispatch(setSyncProgress(46));
    if (!silent) console.log(`✅ Synced ${orderResult.synced} orders`);

    // ============================================
    // STEP 11: PULL Price History
    // ============================================
    if (!silent) console.log("📥 Pulling price history...");
    const priceHistoryResult = await pullPriceHistory(dispatch);
    syncedItems += priceHistoryResult.synced;
    dispatch(setSyncProgress(50));
    if (!silent)
      console.log(`✅ Synced ${priceHistoryResult.synced} price history items`);

    // ============================================
    // STEP 12: PULL Promotions
    // ============================================
    if (!silent) console.log("📥 Pulling promotions...");
    const promotionResult = await pullPromotions(dispatch);
    syncedItems += promotionResult.synced;
    dispatch(setSyncProgress(54));
    if (!silent) console.log(`✅ Synced ${promotionResult.synced} promotions`);

    // ============================================
    // STEP 13: PULL Tax Rates
    // ============================================
    if (!silent) console.log("📥 Pulling tax rates...");
    const taxRateResult = await pullTaxRates(dispatch);
    syncedItems += taxRateResult.synced;
    dispatch(setSyncProgress(56));
    if (!silent) console.log(`✅ Synced ${taxRateResult.synced} tax rates`);

    // ============================================
    // STEP 14: PULL Expenses
    // ============================================
    if (!silent) console.log("📥 Pulling expenses...");
    const expenseResult = await pullExpenses(dispatch);
    syncedItems += expenseResult.synced;
    dispatch(setSyncProgress(58));
    if (!silent) console.log(`✅ Synced ${expenseResult.synced} expenses`);

    // ============================================
    // STEP 15: PULL Expense Categories
    // ============================================
    if (!silent) console.log("📥 Pulling expense categories...");
    const expenseCategoryResult = await pullExpenseCategories(dispatch);
    syncedItems += expenseCategoryResult.synced;
    dispatch(setSyncProgress(60));
    if (!silent)
      console.log(
        `✅ Synced ${expenseCategoryResult.synced} expense categories`,
      );

    // ============================================
    // STEP 16: PULL Cash Registers
    // ============================================
    if (!silent) console.log("📥 Pulling cash registers...");
    const cashRegisterResult = await pullCashRegisters(dispatch);
    syncedItems += cashRegisterResult.synced;
    dispatch(setSyncProgress(62));
    if (!silent)
      console.log(`✅ Synced ${cashRegisterResult.synced} cash registers`);

    // ============================================
    // STEP 17: PULL Gift Cards
    // ============================================
    if (!silent) console.log("📥 Pulling gift cards...");
    const giftCardResult = await pullGiftCards(dispatch);
    syncedItems += giftCardResult.synced;
    dispatch(setSyncProgress(64));
    if (!silent) console.log(`✅ Synced ${giftCardResult.synced} gift cards`);

    // ============================================
    // STEP 18: PULL Wallets
    // ============================================
    if (!silent) console.log("📥 Pulling wallets...");
    const walletResult = await pullWallets(dispatch);
    syncedItems += walletResult.synced;
    dispatch(setSyncProgress(66));
    if (!silent) console.log(`✅ Synced ${walletResult.synced} wallets`);

    // ============================================
    // STEP 19: PULL Supplier Payments
    // ============================================
    if (!silent) console.log("📥 Pulling supplier payments...");
    const supplierPaymentResult = await pullSupplierPayments(dispatch);
    syncedItems += supplierPaymentResult.synced;
    dispatch(setSyncProgress(68));
    if (!silent)
      console.log(
        `✅ Synced ${supplierPaymentResult.synced} supplier payments`,
      );

    // ============================================
    // STEP 20: PULL Purchase Orders
    // ============================================
    if (!silent) console.log("📥 Pulling purchase orders...");
    const purchaseOrderResult = await pullPurchaseOrders(dispatch);
    syncedItems += purchaseOrderResult.synced;
    dispatch(setSyncProgress(70));
    if (!silent)
      console.log(`✅ Synced ${purchaseOrderResult.synced} purchase orders`);

    // ============================================
    // STEP 21: PULL Stock Transfers
    // ============================================
    if (!silent) console.log("📥 Pulling stock transfers...");
    const stockTransferResult = await pullStockTransfers(dispatch);
    syncedItems += stockTransferResult.synced;
    dispatch(setSyncProgress(72));
    if (!silent)
      console.log(`✅ Synced ${stockTransferResult.synced} stock transfers`);

    // ============================================
    // STEP 22: PULL Webhooks
    // ============================================
    if (!silent) console.log("📥 Pulling webhooks...");
    const webhookResult = await pullWebhooks(dispatch);
    syncedItems += webhookResult.synced;
    dispatch(setSyncProgress(74));
    if (!silent) console.log(`✅ Synced ${webhookResult.synced} webhooks`);

    // ============================================
    // STEP 23: PULL Notifications
    // ============================================
    if (!silent) console.log("📥 Pulling notifications...");
    const notificationResult = await pullNotifications(dispatch);
    syncedItems += notificationResult.synced;
    dispatch(setSyncProgress(76));
    if (!silent)
      console.log(`✅ Synced ${notificationResult.synced} notifications`);

    // ============================================
    // STEP 24: PULL Tenant Store Settings
    // ============================================
    if (!silent) console.log("📥 Pulling tenant store settings...");
    const tenantStoreSettingResult = await pullTenantStoreSettings(dispatch);
    syncedItems += tenantStoreSettingResult.synced;
    dispatch(setSyncProgress(78));
    if (!silent)
      console.log(
        `✅ Synced ${tenantStoreSettingResult.synced} tenant store settings`,
      );

    // ============================================
    // STEP 25: PUSH Outbox Items
    // ============================================
    if (!silent) console.log("📤 Pushing outbox items...");
    const pushResult = await pushOutboxItems(dispatch, maxItems);
    syncedItems += pushResult.synced;
    failedItems += pushResult.failed;
    dispatch(setSyncProgress(90));
    if (!silent)
      console.log(
        `✅ Pushed ${pushResult.synced} items, ${pushResult.failed} failed`,
      );

    // ============================================
    // STEP 26: Update Queue Counts
    // ============================================
    const remainingCount = await getQueuedCount();
    dispatch(setQueuedCount(remainingCount));

    const totalFailed = await getFailedCount();
    dispatch(setFailedCount(totalFailed));

    // ============================================
    // STEP 27: Invalidate RTK Query Cache
    // ============================================
    store.dispatch(
      localApi.util.invalidateTags([
        "LocalProducts",
        "LocalProductVariants",
        "LocalInventory",
        "LocalCategories",
        "LocalBrands",
        "LocalCustomers",
        "LocalSuppliers",
        "LocalStores",
        "LocalSessions",
        "LocalOrders",
        "LocalInventoryMovements",
        "LocalPriceHistory",
        "LocalPromotions",
        "LocalTaxRates",
        "LocalExpenses",
        "LocalExpenseCategories",
        "LocalCashRegisters",
        "LocalGiftCards",
        "LocalWallets",
        "LocalSupplierPayments",
        "LocalPurchaseOrders",
        "LocalStockTransfers",
        "LocalWebhooks",
        "LocalNotifications",
        "LocalTenantStoreSettings",
        "LocalSyncOutbox",
      ]),
    );

    // ============================================
    // STEP 28: Update Stats & Complete
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

    if (!token) {
      console.warn("⚠️ No auth token found, skipping product pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteProducts) {
      console.warn("⚠️ getRemoteProducts endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteProducts.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Product");
    }

    const productsData = data?.products || data?.data || data || [];

    if (productsData.length > 0) {
      await upsertProducts(productsData);
      return { synced: productsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull products:", error);
    return { synced: 0 };
  }
}

async function pullProductVariants(dispatch: AppDispatch) {
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
      return handleApiError(error, "Product variants");
    }

    const variants = data?.variants || data?.data || data || [];

    if (variants.length > 0) {
      await upsertProductVariants(variants);
      return { synced: variants.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull variants:", error);
    return { synced: 0 };
  }
}

async function pullInventory(dispatch: AppDispatch) {
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
      return handleApiError(error, "Inventory");
    }

    const inventoryItems = data?.inventory || data?.data || data || [];

    if (inventoryItems.length > 0) {
      await upsertInventory(inventoryItems);
      return { synced: inventoryItems.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull inventory:", error);
    return { synced: 0 };
  }
}

async function pullCategories(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping category pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteCategories) {
      console.warn("⚠️ getRemoteCategories endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteCategories.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Category");
    }

    const categoriesData = data?.categories || data?.data || data || [];

    if (categoriesData.length > 0) {
      await upsertCategories(categoriesData);
      return { synced: categoriesData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull categories:", error);
    return { synced: 0 };
  }
}

// by me
// ============================================
// FILE: services/offline/syncManager.ts
// ============================================

// Add this pull function after pullSuppliers or in the appropriate section:

async function pullStaff(dispatch: AppDispatch) {
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
      return handleApiError(error, "Staff");
    }

    const staffData = data?.staff || data?.data || data || [];

    if (staffData.length > 0) {
      await upsertStaff(staffData);
      return { synced: staffData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull staff:", error);
    return { synced: 0 };
  }
}

// Also add upsertStaff function:
export async function upsertStaff(remoteStaff: any[]) {
  if (!remoteStaff.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  for (const staff of remoteStaff) {
    try {
      await db
        .insert(staff)
        .values({
          id: staff.id,
          remoteId: staff.remoteId,
          tenantId: staff.tenantId,
          storeId: staff.storeId,
          username: staff.username,
          email: staff.email,
          name: staff.name,
          role: staff.role || "CASHIER",
          permissions: staff.permissions || [],
          isActive: staff.isActive ?? true,
          syncStatus: "synced",
          syncError: null,
          createdAt: staff.createdAt ?? now,
          updatedAt: staff.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: staff.id,
          set: {
            storeId: sql`excluded.store_id`,
            username: sql`excluded.username`,
            email: sql`excluded.email`,
            name: sql`excluded.name`,
            role: sql`excluded.role`,
            permissions: sql`excluded.permissions`,
            isActive: sql`excluded.is_active`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });
    } catch (error) {
      console.error(`Failed to upsert staff ${staff.id}:`, error);
    }
  }
}

async function pullBrands(dispatch: AppDispatch) {
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
      return handleApiError(error, "Brand");
    }

    const brandsData = data?.brands || data?.data || data || [];

    if (brandsData.length > 0) {
      await upsertBrands(brandsData);
      return { synced: brandsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull brands:", error);
    return { synced: 0 };
  }
}

async function pullCustomers(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping customer pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteCustomers) {
      console.warn("⚠️ getRemoteCustomers endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteCustomers.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Customer");
    }

    const customersData = data?.customers || data?.data || data || [];

    if (customersData.length > 0) {
      await upsertCustomers(customersData);
      return { synced: customersData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull customers:", error);
    return { synced: 0 };
  }
}

async function pullSuppliers(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping supplier pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getSuppliers) {
      console.warn("⚠️ getSuppliers endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getSuppliers.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Supplier");
    }

    const suppliersData = data?.suppliers || data?.data || data || [];

    if (suppliersData.length > 0) {
      await upsertSuppliers(suppliersData);
      return { synced: suppliersData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull suppliers:", error);
    return { synced: 0 };
  }
}

async function pullStores(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping store pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteStores) {
      console.warn("⚠️ getRemoteStores endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteStores.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Store");
    }

    const storesData = data?.stores || data?.data || data || [];

    if (storesData.length > 0) {
      await upsertStores(storesData);
      return { synced: storesData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull stores:", error);
    return { synced: 0 };
  }
}

async function pullSessions(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping session pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteSessions) {
      console.warn("⚠️ getRemoteSessions endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteSessions.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Session");
    }

    const sessionsData = data?.sessions || data?.data || data || [];

    if (sessionsData.length > 0) {
      await upsertSessions(sessionsData);
      return { synced: sessionsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull sessions:", error);
    return { synced: 0 };
  }
}

async function pullOrders(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping order pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getRemoteOrders) {
      console.warn("⚠️ getRemoteOrders endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getRemoteOrders.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Order");
    }

    const ordersData = data?.orders || data?.data || data || [];

    if (ordersData.length > 0) {
      await upsertOrders(ordersData);
      return { synced: ordersData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull orders:", error);
    return { synced: 0 };
  }
}

async function pullPriceHistory(dispatch: AppDispatch) {
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
      return handleApiError(error, "Price history");
    }

    const priceHistoryData = data?.priceHistory || data?.data || data || [];

    if (priceHistoryData.length > 0) {
      await upsertPriceHistory(priceHistoryData);
      return { synced: priceHistoryData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull price history:", error);
    return { synced: 0 };
  }
}

async function pullPromotions(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping promotion pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getPromotions) {
      console.warn("⚠️ getPromotions endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getPromotions.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Promotion");
    }

    const promotionsData = data?.promotions || data?.data || data || [];

    if (promotionsData.length > 0) {
      await upsertPromotions(promotionsData);
      return { synced: promotionsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull promotions:", error);
    return { synced: 0 };
  }
}

async function pullTaxRates(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping tax rate pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getTaxRates) {
      console.warn("⚠️ getTaxRates endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getTaxRates.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Tax rate");
    }

    const taxRatesData = data?.taxRates || data?.data || data || [];

    if (taxRatesData.length > 0) {
      await upsertTaxRates(taxRatesData);
      return { synced: taxRatesData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull tax rates:", error);
    return { synced: 0 };
  }
}

async function pullExpenses(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping expense pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getExpenses) {
      console.warn("⚠️ getExpenses endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getExpenses.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Expense");
    }

    const expensesData = data?.expenses || data?.data || data || [];

    if (expensesData.length > 0) {
      await upsertExpenses(expensesData);
      return { synced: expensesData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull expenses:", error);
    return { synced: 0 };
  }
}

async function pullExpenseCategories(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping expense category pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getExpenseCategories) {
      console.warn("⚠️ getExpenseCategories endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getExpenseCategories.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Expense category");
    }

    const categoriesData = data?.categories || data?.data || data || [];

    if (categoriesData.length > 0) {
      await upsertExpenseCategories(categoriesData);
      return { synced: categoriesData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull expense categories:", error);
    return { synced: 0 };
  }
}

async function pullCashRegisters(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping cash register pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getCashRegisters) {
      console.warn("⚠️ getCashRegisters endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getCashRegisters.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Cash register");
    }

    const registersData = data?.registers || data?.data || data || [];

    if (registersData.length > 0) {
      await upsertCashRegisters(registersData);
      return { synced: registersData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull cash registers:", error);
    return { synced: 0 };
  }
}

async function pullGiftCards(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping gift card pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getGiftCards) {
      console.warn("⚠️ getGiftCards endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getGiftCards.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Gift card");
    }

    const giftCardsData = data?.giftCards || data?.data || data || [];

    if (giftCardsData.length > 0) {
      await upsertGiftCards(giftCardsData);
      return { synced: giftCardsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull gift cards:", error);
    return { synced: 0 };
  }
}

async function pullWallets(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping wallet pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getWallets) {
      console.warn("⚠️ getWallets endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getWallets.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Wallet");
    }

    const walletsData = data?.wallets || data?.data || data || [];

    if (walletsData.length > 0) {
      await upsertWallets(walletsData);
      return { synced: walletsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull wallets:", error);
    return { synced: 0 };
  }
}

async function pullSupplierPayments(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping supplier payment pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getSupplierPayments) {
      console.warn("⚠️ getSupplierPayments endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getSupplierPayments.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Supplier payment");
    }

    const paymentsData = data?.payments || data?.data || data || [];

    if (paymentsData.length > 0) {
      await upsertSupplierPayments(paymentsData);
      return { synced: paymentsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull supplier payments:", error);
    return { synced: 0 };
  }
}

async function pullPurchaseOrders(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping purchase order pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getPurchaseOrders) {
      console.warn("⚠️ getPurchaseOrders endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getPurchaseOrders.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Purchase order");
    }

    const ordersData = data?.purchaseOrders || data?.data || data || [];

    if (ordersData.length > 0) {
      await upsertPurchaseOrders(ordersData);
      return { synced: ordersData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull purchase orders:", error);
    return { synced: 0 };
  }
}

async function pullStockTransfers(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping stock transfer pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getStockTransfers) {
      console.warn("⚠️ getStockTransfers endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getStockTransfers.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Stock transfer");
    }

    const transfersData = data?.transfers || data?.data || data || [];

    if (transfersData.length > 0) {
      await upsertStockTransfers(transfersData);
      return { synced: transfersData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull stock transfers:", error);
    return { synced: 0 };
  }
}

async function pullWebhooks(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping webhook pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getWebhooks) {
      console.warn("⚠️ getWebhooks endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getWebhooks.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Webhook");
    }

    const webhooksData = data?.webhooks || data?.data || data || [];

    if (webhooksData.length > 0) {
      await upsertWebhooks(webhooksData);
      return { synced: webhooksData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull webhooks:", error);
    return { synced: 0 };
  }
}

async function pullNotifications(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn("⚠️ No auth token found, skipping notification pull");
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getNotifications) {
      console.warn("⚠️ getNotifications endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getNotifications.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Notification");
    }

    const notificationsData = data?.notifications || data?.data || data || [];

    if (notificationsData.length > 0) {
      await upsertNotifications(notificationsData);
      return { synced: notificationsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull notifications:", error);
    return { synced: 0 };
  }
}

async function pullTenantStoreSettings(dispatch: AppDispatch) {
  try {
    const state = store.getState();
    const token = state.auth?.user?.token;

    if (!token) {
      console.warn(
        "⚠️ No auth token found, skipping tenant store setting pull",
      );
      return { synced: 0 };
    }

    if (!remoteApi.endpoints.getTenantStoreSettings) {
      console.warn("⚠️ getTenantStoreSettings endpoint not available");
      return { synced: 0 };
    }

    const { data, error } = await store.dispatch(
      remoteApi.endpoints.getTenantStoreSettings.initiate(undefined, {
        forceRefetch: true,
      }),
    );

    if (error) {
      return handleApiError(error, "Tenant store setting");
    }

    const settingsData = data?.settings || data?.data || data || [];

    if (settingsData.length > 0) {
      await upsertTenantStoreSettings(settingsData);
      return { synced: settingsData.length };
    }

    return { synced: 0 };
  } catch (error) {
    console.error("❌ Failed to pull tenant store settings:", error);
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
          dispatch(setSyncProgress(80 + (synced / items.length) * 10));
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
        // ✅ Clean the payload before sending
        const cleanPayload = cleanOrderPayloadForServer(item.payload);

        console.log(`📤 Sending order:`, JSON.stringify(cleanPayload, null, 2));

        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createRemoteOrder.initiate(cleanPayload),
        );

        if (error) {
          console.error(`❌ Order sync failed:`, error);
          throw new Error(JSON.stringify(error));
        }

        await db
          .update(orders)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(orders.id, item.entityId));

        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        console.error(`❌ Failed to sync order ${item.entityId}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }

    case "sessions": {
      try {
        let result;
        if (item.operation === "open") {
          result = await store.dispatch(
            remoteApi.endpoints.openSession.initiate(item.payload),
          );
        } else if (item.operation === "close") {
          result = await store.dispatch(
            remoteApi.endpoints.closeSession.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
        } else {
          result = await store.dispatch(
            remoteApi.endpoints.createRemoteSession.initiate(item.payload),
          );
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
            .set({
              remoteId: data.id,
              syncStatus: "synced",
            } as any)
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
            } as any)
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
        // ✅ Clean and map the payload
        const cleanPayload = cleanInventoryMovementPayloadForServer(
          item.payload,
        );

        console.log(
          `📤 Sending inventory movement:`,
          JSON.stringify(cleanPayload, null, 2),
        );

        const { data, error } = await store.dispatch(
          remoteApi.endpoints.createRemoteInventoryMovement.initiate(
            cleanPayload,
          ),
        );

        if (error) {
          console.error(`❌ Inventory movement sync failed:`, error);
          throw new Error(JSON.stringify(error));
        }

        await db
          .update(inventoryMovements)
          .set({ remoteId: data.id, syncStatus: "synced" })
          .where(eq(inventoryMovements.id, item.entityId));

        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        console.error(
          `❌ Failed to sync inventory movement ${item.entityId}:`,
          error,
        );
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

    case "categories": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteCategory.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(categories)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(categories.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteCategory.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(categories)
            .set({ syncStatus: "synced" })
            .where(eq(categories.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteCategory.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(categories).where(eq(categories.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

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

    case "customers": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteCustomer.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(customers)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(customers.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteCustomer.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(customers)
            .set({ syncStatus: "synced" })
            .where(eq(customers.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteCustomer.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(customers).where(eq(customers.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "suppliers": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createSupplier.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(suppliers)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(suppliers.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateSupplier.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(suppliers)
            .set({ syncStatus: "synced" })
            .where(eq(suppliers.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteSupplier.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(suppliers).where(eq(suppliers.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "stores": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createRemoteStore.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(stores)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(stores.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateRemoteStore.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(stores)
            .set({ syncStatus: "synced" })
            .where(eq(stores.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteRemoteStore.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(stores).where(eq(stores.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "promotions": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createPromotion.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(promotions)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(promotions.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updatePromotion.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(promotions)
            .set({ syncStatus: "synced" })
            .where(eq(promotions.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deletePromotion.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(promotions).where(eq(promotions.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "tax_rates": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createTaxRate.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(taxRates)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(taxRates.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateTaxRate.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(taxRates)
            .set({ syncStatus: "synced" })
            .where(eq(taxRates.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteTaxRate.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(taxRates).where(eq(taxRates.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "expenses": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createExpense.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(expenses)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(expenses.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateExpense.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(expenses)
            .set({ syncStatus: "synced" })
            .where(eq(expenses.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteExpense.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(expenses).where(eq(expenses.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "expense_categories": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createExpenseCategory.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(expenseCategories)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(expenseCategories.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateExpenseCategory.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(expenseCategories)
            .set({ syncStatus: "synced" })
            .where(eq(expenseCategories.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteExpenseCategory.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(expenseCategories)
            .where(eq(expenseCategories.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "purchase_orders": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createPurchaseOrder.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(purchaseOrders)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(purchaseOrders.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updatePurchaseOrder.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(purchaseOrders)
            .set({ syncStatus: "synced" })
            .where(eq(purchaseOrders.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deletePurchaseOrder.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(purchaseOrders)
            .where(eq(purchaseOrders.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "stock_transfers": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createStockTransfer.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(stockTransfers)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(stockTransfers.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateStockTransfer.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(stockTransfers)
            .set({ syncStatus: "synced" })
            .where(eq(stockTransfers.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteStockTransfer.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(stockTransfers)
            .where(eq(stockTransfers.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "gift_cards": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createGiftCard.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(giftCards)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(giftCards.id, item.entityId));
        } else if (item.operation === "reload") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.reloadGiftCard.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(giftCards)
            .set({ syncStatus: "synced" })
            .where(eq(giftCards.id, item.entityId));
        } else if (item.operation === "updateStatus") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateGiftCardStatus.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(giftCards)
            .set({ syncStatus: "synced" })
            .where(eq(giftCards.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateGiftCardStatus.initiate({
              id: item.entityId,
              status: "CANCELLED",
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(giftCards)
            .set({ syncStatus: "synced" })
            .where(eq(giftCards.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "cash_registers": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createCashRegister.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(cashRegisters)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(cashRegisters.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateCashRegister.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(cashRegisters)
            .set({ syncStatus: "synced" })
            .where(eq(cashRegisters.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteCashRegister.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(cashRegisters)
            .where(eq(cashRegisters.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "webhooks": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createWebhook.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(webhooks)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(webhooks.id, item.entityId));
        } else if (item.operation === "update") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.updateWebhook.initiate({
              id: item.entityId,
              ...item.payload,
            }),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(webhooks)
            .set({ syncStatus: "synced" })
            .where(eq(webhooks.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteWebhook.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(webhooks).where(eq(webhooks.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "api_keys": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createTenantApiKey.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(apiKeys)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(apiKeys.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteTenantApiKey.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db.delete(apiKeys).where(eq(apiKeys.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "notifications": {
      try {
        if (item.operation === "create") {
          await db
            .update(notifications)
            .set({ syncStatus: "synced" })
            .where(eq(notifications.id, item.entityId));
        } else if (
          item.operation === "update" ||
          item.operation === "markRead"
        ) {
          const { error } = await store.dispatch(
            remoteApi.endpoints.markNotificationRead.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(notifications)
            .set({ syncStatus: "synced" })
            .where(eq(notifications.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteNotification.initiate(item.entityId),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(notifications)
            .where(eq(notifications.id, item.entityId));
        }
        await markOutboxSynced(item.id);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    case "tenant_store_settings": {
      try {
        if (item.operation === "create") {
          const { data, error } = await store.dispatch(
            remoteApi.endpoints.createTenantStoreSetting.initiate(item.payload),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .update(tenantStoreSettings)
            .set({ remoteId: data.id, syncStatus: "synced" })
            .where(eq(tenantStoreSettings.id, item.entityId));
        } else if (item.operation === "delete") {
          const { error } = await store.dispatch(
            remoteApi.endpoints.deleteTenantStoreSetting.initiate(
              item.entityId,
            ),
          );
          if (error) throw new Error(JSON.stringify(error));
          await db
            .delete(tenantStoreSettings)
            .where(eq(tenantStoreSettings.id, item.entityId));
        }
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
    return store.getState();
  }, []);

  const sync = useCallback(
    async (options?: {
      force?: boolean;
      maxItems?: number;
      silent?: boolean;
    }) => {
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

// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import { remoteApi } from "@/services/api/remoteApi";
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
// import { and, eq, inArray, sql } from "drizzle-orm";
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
//   upsertCategories,
//   upsertCustomers,
//   upsertInventory,
//   upsertPriceHistory,
//   upsertProducts,
//   upsertProductVariants,
//   upsertSessions,
//   upsertStores,
//   upsertBrands,
//   upsertPromotions,
//   upsertTaxRates,
//   upsertExpenses,
//   upsertExpenseCategories,
//   upsertCashRegisters,
//   upsertGiftCards,
//   upsertWallets,
//   upsertSupplierPayments,
//   upsertPurchaseOrders,
//   upsertStockTransfers,
//   upsertWebhooks,
//   upsertNotifications,
//   upsertTenantStoreSettings,
//   upsertSuppliers,
//   upsertOrders,
// } from "./repository";
// import {
//   inventory,
//   inventoryCounts,
//   inventoryMovements,
//   orders,
//   priceHistory,
//   products,
//   productVariants,
//   sessions,
//   syncOutbox,
//   brands,
//   promotions,
//   taxRates,
//   expenses,
//   expenseCategories,
//   cashRegisters,
//   giftCards,
//   giftCardTransactions,
//   wallets,
//   walletTransactions,
//   supplierPayments,
//   purchaseOrders,
//   purchaseOrderItems,
//   stockTransfers,
//   stockTransferItems,
//   webhooks,
//   apiKeys,
//   notifications,
//   tenantStoreSettings,
//   auditLogs,
//   suppliers,
// } from "./schema";

// // ============================================
// // GLOBAL STATE
// // ============================================

// let syncInFlight = false;
// let unsubscribeNetwork: (() => void) | undefined;
// let syncInterval: NodeJS.Timeout | undefined;
// let syncStartTime: number = 0;

// // ============================================
// // HELPER: Handle API Errors
// // ============================================

// function handleApiError(error: any, entityName: string): { synced: 0 } {
//   // Network errors (offline, DNS, connection refused)
//   if (
//     error?.status === "FETCH_ERROR" ||
//     error?.error?.message?.includes("Network request failed")
//   ) {
//     console.log(
//       `📶 Network error fetching ${entityName} - skipping (offline or server unreachable)`,
//     );
//     return { synced: 0 };
//   }

//   // 404 Not Found - endpoint not implemented yet
//   if (error?.status === 404) {
//     console.log(`ℹ️ ${entityName} endpoint not available yet (404)`);
//     return { synced: 0 };
//   }

//   // 401/403 - Authentication issues
//   if (error?.status === 401 || error?.status === 403) {
//     console.warn(`⚠️ Unauthorized to fetch ${entityName}`);
//     return { synced: 0 };
//   }

//   // 422 - Validation errors (usually indicates payload issues)
//   if (error?.status === 422) {
//     console.warn(
//       `⚠️ ${entityName} validation error (422) - check payload structure`,
//     );
//     return { synced: 0 };
//   }

//   // PARSING_ERROR - invalid response format
//   if (error?.status === "PARSING_ERROR") {
//     console.warn(`⚠️ ${entityName} endpoint returned invalid response`);
//     return { synced: 0 };
//   }

//   // Other errors - log as error
//   console.error(`❌ ${entityName} pull failed:`, error);
//   return { synced: 0 };
// }

// // ============================================
// // HELPER: Clean Order Payload for Server
// // ============================================

// function cleanOrderPayloadForServer(payload: any): any {
//   const clean = { ...payload };

//   // ✅ CRITICAL FIX: Convert empty string to null for customerId
//   // Since customerId is optional in the schema (String?), null is allowed
//   if (
//     clean.customerId === "" ||
//     clean.customerId === null ||
//     clean.customerId === undefined
//   ) {
//     clean.customerId = null;
//   }

//   // Remove registerId if empty
//   if (
//     clean.registerId === "" ||
//     clean.registerId === null ||
//     clean.registerId === undefined
//   ) {
//     delete clean.registerId;
//   }

//   // Remove variantId if empty
//   if (
//     clean.variantId === "" ||
//     clean.variantId === null ||
//     clean.variantId === undefined
//   ) {
//     delete clean.variantId;
//   }

//   // Ensure all IDs are strings
//   if (clean.userId) clean.userId = String(clean.userId);
//   if (clean.storeId) clean.storeId = String(clean.storeId);
//   if (clean.sessionId) clean.sessionId = String(clean.sessionId);
//   if (clean.tenantId) clean.tenantId = String(clean.tenantId);

//   // Clean items - remove empty variantId
//   if (clean.items && Array.isArray(clean.items)) {
//     clean.items = clean.items.map((item: any) => {
//       const cleanedItem: any = {
//         productId: String(item.productId),
//         quantity: Number(item.quantity),
//         unitPrice: Number(item.unitPrice),
//         subTotal: Number(item.subTotal),
//         discountAmount: Number(item.discountAmount || 0),
//       };

//       // Only add variantId if it has a value
//       if (item.variantId && item.variantId !== "") {
//         cleanedItem.variantId = String(item.variantId);
//       }

//       return cleanedItem;
//     });
//   }

//   // Remove any undefined values
//   Object.keys(clean).forEach((key) => {
//     if (clean[key] === undefined) {
//       delete clean[key];
//     }
//   });

//   return clean;
// }

// // ============================================
// // HELPER: Map Movement Type for Server
// // ============================================

// function mapMovementType(type: string): string {
//   const mapping: Record<string, string> = {
//     IN: "PURCHASE",
//     OUT: "SALE",
//     SALE: "SALE",
//     PURCHASE: "PURCHASE",
//     RETURN_IN: "RETURN_IN",
//     RETURN_OUT: "RETURN_OUT",
//     ADJUSTMENT: "ADJUSTMENT",
//     DAMAGE: "DAMAGE",
//     EXPIRED: "EXPIRED",
//     TRANSFER_IN: "TRANSFER_IN",
//     TRANSFER_OUT: "TRANSFER_OUT",
//     OPENING_STOCK: "OPENING_STOCK",
//     COUNTING: "COUNTING",
//   };
//   return mapping[type] || "ADJUSTMENT";
// }

// // ============================================
// // HELPER: Clean Inventory Movement Payload for Server
// // ============================================

// function cleanInventoryMovementPayloadForServer(payload: any): any {
//   const clean = { ...payload };

//   // Map the type to the correct enum
//   if (clean.type) {
//     clean.type = mapMovementType(clean.type);
//   }

//   // Remove variantId if empty or null
//   if (
//     clean.variantId === null ||
//     clean.variantId === undefined ||
//     clean.variantId === ""
//   ) {
//     delete clean.variantId;
//   } else {
//     clean.variantId = String(clean.variantId);
//   }

//   // Ensure all IDs are strings
//   if (clean.productId) clean.productId = String(clean.productId);
//   if (clean.storeId) clean.storeId = String(clean.storeId);
//   if (clean.tenantId) clean.tenantId = String(clean.tenantId);
//   if (clean.referenceId) clean.referenceId = String(clean.referenceId);
//   if (clean.referenceType) clean.referenceType = String(clean.referenceType);

//   // Remove undefined values
//   Object.keys(clean).forEach((key) => {
//     if (clean[key] === undefined) {
//       delete clean[key];
//     }
//   });

//   return clean;
// }

// // ============================================
// // 1. INITIALIZATION
// // ============================================

// export async function initializeOfflineSystem(
//   dispatch: AppDispatch,
//   getState: () => RootState,
// ) {
//   try {
//     // 1. Migrate database
//     await runMigrations();
//     dispatch(setInitialized(true));

//     // 2. Get initial queue count
//     const count = await getQueuedCount();
//     dispatch(setQueuedCount(count));

//     const failedCount = await getFailedCount();
//     dispatch(setFailedCount(failedCount));

//     // 3. Check online status
//     const online = await isOnline();
//     dispatch(setOnline(online));

//     // 4. Subscribe to network changes
//     unsubscribeNetwork?.();
//     unsubscribeNetwork = subscribeToOnlineStatus((nextOnline) => {
//       dispatch(setOnline(nextOnline));
//       if (nextOnline) {
//         void syncNow(dispatch, getState);
//       }
//     });

//     // 5. Initial sync if online
//     if (online) {
//       await syncNow(dispatch, getState);
//     }

//     // 6. Set up periodic sync (every 5 minutes)
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
//     silent?: boolean;
//   } = {},
// ) {
//   const { force = false, maxItems = 50, silent = false } = options;

//   // Prevent concurrent syncs
//   if (syncInFlight && !force) {
//     if (!silent) console.log("⏳ Sync already in progress, skipping...");
//     return { skipped: true, message: "Sync already in progress" };
//   }

//   // Check online status
//   const online = await isOnline();
//   if (!online) {
//     if (!silent) console.log("📶 Offline mode, skipping sync");
//     return { skipped: true, message: "Offline mode" };
//   }

//   // Check if user is authenticated
//   const state = getState();
//   const token = state.auth?.user?.token;
//   if (!token) {
//     if (!silent) console.log("🔒 No auth token, skipping sync");
//     return { skipped: true, message: "Not authenticated" };
//   }

//   // Start sync
//   syncInFlight = true;
//   syncStartTime = Date.now();

//   dispatch(setSyncing(true));
//   dispatch(setSyncError(null as any));
//   dispatch(setSyncProgress(0));

//   let syncedItems = 0;
//   let failedItems = 0;

//   try {
//     if (!silent) console.log("🔄 Starting sync...");
//     dispatch(setSyncProgress(2));

//     // ============================================
//     // STEP 1: PULL Products
//     // ============================================
//     if (!silent) console.log("📥 Pulling products...");
//     const productResult = await pullProducts(dispatch);
//     syncedItems += productResult.synced;
//     dispatch(setSyncProgress(8));
//     if (!silent) console.log(`✅ Synced ${productResult.synced} products`);

//     // ============================================
//     // STEP 2: PULL Product Variants
//     // ============================================
//     if (!silent) console.log("📥 Pulling product variants...");
//     const variantResult = await pullProductVariants(dispatch);
//     syncedItems += variantResult.synced;
//     dispatch(setSyncProgress(12));
//     if (!silent) console.log(`✅ Synced ${variantResult.synced} variants`);

//     // ============================================
//     // STEP 3: PULL Inventory
//     // ============================================
//     if (!silent) console.log("📥 Pulling inventory...");
//     const inventoryResult = await pullInventory(dispatch);
//     syncedItems += inventoryResult.synced;
//     dispatch(setSyncProgress(18));
//     if (!silent)
//       console.log(`✅ Synced ${inventoryResult.synced} inventory items`);

//     // ============================================
//     // STEP 4: PULL Categories
//     // ============================================
//     if (!silent) console.log("📥 Pulling categories...");
//     const categoryResult = await pullCategories(dispatch);
//     syncedItems += categoryResult.synced;
//     dispatch(setSyncProgress(22));
//     if (!silent) console.log(`✅ Synced ${categoryResult.synced} categories`);

//     // ============================================
//     // STEP 5: PULL Brands
//     // ============================================
//     if (!silent) console.log("📥 Pulling brands...");
//     const brandResult = await pullBrands(dispatch);
//     syncedItems += brandResult.synced;
//     dispatch(setSyncProgress(26));
//     if (!silent) console.log(`✅ Synced ${brandResult.synced} brands`);

//     // ============================================
//     // STEP 6: PULL Customers
//     // ============================================
//     if (!silent) console.log("📥 Pulling customers...");
//     const customerResult = await pullCustomers(dispatch);
//     syncedItems += customerResult.synced;
//     dispatch(setSyncProgress(30));
//     if (!silent) console.log(`✅ Synced ${customerResult.synced} customers`);

//     // ============================================
//     // STEP 7: PULL Suppliers
//     // ============================================
//     if (!silent) console.log("📥 Pulling suppliers...");
//     const supplierResult = await pullSuppliers(dispatch);
//     syncedItems += supplierResult.synced;
//     dispatch(setSyncProgress(34));
//     if (!silent) console.log(`✅ Synced ${supplierResult.synced} suppliers`);

//     // ============================================
//     // STEP 8: PULL Stores
//     // ============================================
//     if (!silent) console.log("📥 Pulling stores...");
//     const storeResult = await pullStores(dispatch);
//     syncedItems += storeResult.synced;
//     dispatch(setSyncProgress(38));
//     if (!silent) console.log(`✅ Synced ${storeResult.synced} stores`);

//     // ============================================
//     // STEP 9: PULL Sessions
//     // ============================================
//     if (!silent) console.log("📥 Pulling sessions...");
//     const sessionResult = await pullSessions(dispatch);
//     syncedItems += sessionResult.synced;
//     dispatch(setSyncProgress(42));
//     if (!silent) console.log(`✅ Synced ${sessionResult.synced} sessions`);

//     // ============================================
//     // STEP 10: PULL Orders
//     // ============================================
//     if (!silent) console.log("📥 Pulling orders...");
//     const orderResult = await pullOrders(dispatch);
//     syncedItems += orderResult.synced;
//     dispatch(setSyncProgress(46));
//     if (!silent) console.log(`✅ Synced ${orderResult.synced} orders`);

//     // ============================================
//     // STEP 11: PULL Price History
//     // ============================================
//     if (!silent) console.log("📥 Pulling price history...");
//     const priceHistoryResult = await pullPriceHistory(dispatch);
//     syncedItems += priceHistoryResult.synced;
//     dispatch(setSyncProgress(50));
//     if (!silent)
//       console.log(`✅ Synced ${priceHistoryResult.synced} price history items`);

//     // ============================================
//     // STEP 12: PULL Promotions
//     // ============================================
//     if (!silent) console.log("📥 Pulling promotions...");
//     const promotionResult = await pullPromotions(dispatch);
//     syncedItems += promotionResult.synced;
//     dispatch(setSyncProgress(54));
//     if (!silent) console.log(`✅ Synced ${promotionResult.synced} promotions`);

//     // ============================================
//     // STEP 13: PULL Tax Rates
//     // ============================================
//     if (!silent) console.log("📥 Pulling tax rates...");
//     const taxRateResult = await pullTaxRates(dispatch);
//     syncedItems += taxRateResult.synced;
//     dispatch(setSyncProgress(56));
//     if (!silent) console.log(`✅ Synced ${taxRateResult.synced} tax rates`);

//     // ============================================
//     // STEP 14: PULL Expenses
//     // ============================================
//     if (!silent) console.log("📥 Pulling expenses...");
//     const expenseResult = await pullExpenses(dispatch);
//     syncedItems += expenseResult.synced;
//     dispatch(setSyncProgress(58));
//     if (!silent) console.log(`✅ Synced ${expenseResult.synced} expenses`);

//     // ============================================
//     // STEP 15: PULL Expense Categories
//     // ============================================
//     if (!silent) console.log("📥 Pulling expense categories...");
//     const expenseCategoryResult = await pullExpenseCategories(dispatch);
//     syncedItems += expenseCategoryResult.synced;
//     dispatch(setSyncProgress(60));
//     if (!silent)
//       console.log(
//         `✅ Synced ${expenseCategoryResult.synced} expense categories`,
//       );

//     // ============================================
//     // STEP 16: PULL Cash Registers
//     // ============================================
//     if (!silent) console.log("📥 Pulling cash registers...");
//     const cashRegisterResult = await pullCashRegisters(dispatch);
//     syncedItems += cashRegisterResult.synced;
//     dispatch(setSyncProgress(62));
//     if (!silent)
//       console.log(`✅ Synced ${cashRegisterResult.synced} cash registers`);

//     // ============================================
//     // STEP 17: PULL Gift Cards
//     // ============================================
//     if (!silent) console.log("📥 Pulling gift cards...");
//     const giftCardResult = await pullGiftCards(dispatch);
//     syncedItems += giftCardResult.synced;
//     dispatch(setSyncProgress(64));
//     if (!silent) console.log(`✅ Synced ${giftCardResult.synced} gift cards`);

//     // ============================================
//     // STEP 18: PULL Wallets
//     // ============================================
//     if (!silent) console.log("📥 Pulling wallets...");
//     const walletResult = await pullWallets(dispatch);
//     syncedItems += walletResult.synced;
//     dispatch(setSyncProgress(66));
//     if (!silent) console.log(`✅ Synced ${walletResult.synced} wallets`);

//     // ============================================
//     // STEP 19: PULL Supplier Payments
//     // ============================================
//     if (!silent) console.log("📥 Pulling supplier payments...");
//     const supplierPaymentResult = await pullSupplierPayments(dispatch);
//     syncedItems += supplierPaymentResult.synced;
//     dispatch(setSyncProgress(68));
//     if (!silent)
//       console.log(
//         `✅ Synced ${supplierPaymentResult.synced} supplier payments`,
//       );

//     // ============================================
//     // STEP 20: PULL Purchase Orders
//     // ============================================
//     if (!silent) console.log("📥 Pulling purchase orders...");
//     const purchaseOrderResult = await pullPurchaseOrders(dispatch);
//     syncedItems += purchaseOrderResult.synced;
//     dispatch(setSyncProgress(70));
//     if (!silent)
//       console.log(`✅ Synced ${purchaseOrderResult.synced} purchase orders`);

//     // ============================================
//     // STEP 21: PULL Stock Transfers
//     // ============================================
//     if (!silent) console.log("📥 Pulling stock transfers...");
//     const stockTransferResult = await pullStockTransfers(dispatch);
//     syncedItems += stockTransferResult.synced;
//     dispatch(setSyncProgress(72));
//     if (!silent)
//       console.log(`✅ Synced ${stockTransferResult.synced} stock transfers`);

//     // ============================================
//     // STEP 22: PULL Webhooks
//     // ============================================
//     if (!silent) console.log("📥 Pulling webhooks...");
//     const webhookResult = await pullWebhooks(dispatch);
//     syncedItems += webhookResult.synced;
//     dispatch(setSyncProgress(74));
//     if (!silent) console.log(`✅ Synced ${webhookResult.synced} webhooks`);

//     // ============================================
//     // STEP 23: PULL Notifications
//     // ============================================
//     if (!silent) console.log("📥 Pulling notifications...");
//     const notificationResult = await pullNotifications(dispatch);
//     syncedItems += notificationResult.synced;
//     dispatch(setSyncProgress(76));
//     if (!silent)
//       console.log(`✅ Synced ${notificationResult.synced} notifications`);

//     // ============================================
//     // STEP 24: PULL Tenant Store Settings
//     // ============================================
//     if (!silent) console.log("📥 Pulling tenant store settings...");
//     const tenantStoreSettingResult = await pullTenantStoreSettings(dispatch);
//     syncedItems += tenantStoreSettingResult.synced;
//     dispatch(setSyncProgress(78));
//     if (!silent)
//       console.log(
//         `✅ Synced ${tenantStoreSettingResult.synced} tenant store settings`,
//       );

//     // ============================================
//     // STEP 25: PUSH Outbox Items
//     // ============================================
//     if (!silent) console.log("📤 Pushing outbox items...");
//     const pushResult = await pushOutboxItems(dispatch, maxItems);
//     syncedItems += pushResult.synced;
//     failedItems += pushResult.failed;
//     dispatch(setSyncProgress(90));
//     if (!silent)
//       console.log(
//         `✅ Pushed ${pushResult.synced} items, ${pushResult.failed} failed`,
//       );

//     // ============================================
//     // STEP 26: Update Queue Counts
//     // ============================================
//     const remainingCount = await getQueuedCount();
//     dispatch(setQueuedCount(remainingCount));

//     const totalFailed = await getFailedCount();
//     dispatch(setFailedCount(totalFailed));

//     // ============================================
//     // STEP 27: Invalidate RTK Query Cache
//     // ============================================
//     store.dispatch(
//       localApi.util.invalidateTags([
//         "LocalProducts",
//         "LocalProductVariants",
//         "LocalInventory",
//         "LocalCategories",
//         "LocalBrands",
//         "LocalCustomers",
//         "LocalSuppliers",
//         "LocalStores",
//         "LocalSessions",
//         "LocalOrders",
//         "LocalInventoryMovements",
//         "LocalPriceHistory",
//         "LocalPromotions",
//         "LocalTaxRates",
//         "LocalExpenses",
//         "LocalExpenseCategories",
//         "LocalCashRegisters",
//         "LocalGiftCards",
//         "LocalWallets",
//         "LocalSupplierPayments",
//         "LocalPurchaseOrders",
//         "LocalStockTransfers",
//         "LocalWebhooks",
//         "LocalNotifications",
//         "LocalTenantStoreSettings",
//         "LocalSyncOutbox",
//       ]),
//     );

//     // ============================================
//     // STEP 28: Update Stats & Complete
//     // ============================================
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
// // 3. PULL FUNCTIONS
// // ============================================

// async function pullProducts(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping product pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteProducts) {
//       console.warn("⚠️ getRemoteProducts endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteProducts.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Product");
//     }

//     const productsData = data?.products || data?.data || data || [];

//     if (productsData.length > 0) {
//       await upsertProducts(productsData);
//       return { synced: productsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull products:", error);
//     return { synced: 0 };
//   }
// }

// async function pullProductVariants(dispatch: AppDispatch) {
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
//       return handleApiError(error, "Product variants");
//     }

//     const variants = data?.variants || data?.data || data || [];

//     if (variants.length > 0) {
//       await upsertProductVariants(variants);
//       return { synced: variants.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull variants:", error);
//     return { synced: 0 };
//   }
// }

// async function pullInventory(dispatch: AppDispatch) {
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
//       return handleApiError(error, "Inventory");
//     }

//     const inventoryItems = data?.inventory || data?.data || data || [];

//     if (inventoryItems.length > 0) {
//       await upsertInventory(inventoryItems);
//       return { synced: inventoryItems.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull inventory:", error);
//     return { synced: 0 };
//   }
// }

// async function pullCategories(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping category pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteCategories) {
//       console.warn("⚠️ getRemoteCategories endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteCategories.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Category");
//     }

//     const categoriesData = data?.categories || data?.data || data || [];

//     if (categoriesData.length > 0) {
//       await upsertCategories(categoriesData);
//       return { synced: categoriesData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull categories:", error);
//     return { synced: 0 };
//   }
// }

// async function pullBrands(dispatch: AppDispatch) {
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
//       return handleApiError(error, "Brand");
//     }

//     const brandsData = data?.brands || data?.data || data || [];

//     if (brandsData.length > 0) {
//       await upsertBrands(brandsData);
//       return { synced: brandsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull brands:", error);
//     return { synced: 0 };
//   }
// }

// async function pullCustomers(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping customer pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteCustomers) {
//       console.warn("⚠️ getRemoteCustomers endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteCustomers.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Customer");
//     }

//     const customersData = data?.customers || data?.data || data || [];

//     if (customersData.length > 0) {
//       await upsertCustomers(customersData);
//       return { synced: customersData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull customers:", error);
//     return { synced: 0 };
//   }
// }

// async function pullSuppliers(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping supplier pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getSuppliers) {
//       console.warn("⚠️ getSuppliers endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getSuppliers.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Supplier");
//     }

//     const suppliersData = data?.suppliers || data?.data || data || [];

//     if (suppliersData.length > 0) {
//       await upsertSuppliers(suppliersData);
//       return { synced: suppliersData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull suppliers:", error);
//     return { synced: 0 };
//   }
// }

// async function pullStores(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping store pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteStores) {
//       console.warn("⚠️ getRemoteStores endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteStores.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Store");
//     }

//     const storesData = data?.stores || data?.data || data || [];

//     if (storesData.length > 0) {
//       await upsertStores(storesData);
//       return { synced: storesData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull stores:", error);
//     return { synced: 0 };
//   }
// }

// async function pullSessions(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping session pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteSessions) {
//       console.warn("⚠️ getRemoteSessions endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteSessions.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Session");
//     }

//     const sessionsData = data?.sessions || data?.data || data || [];

//     if (sessionsData.length > 0) {
//       await upsertSessions(sessionsData);
//       return { synced: sessionsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull sessions:", error);
//     return { synced: 0 };
//   }
// }

// async function pullOrders(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping order pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getRemoteOrders) {
//       console.warn("⚠️ getRemoteOrders endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getRemoteOrders.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Order");
//     }

//     const ordersData = data?.orders || data?.data || data || [];

//     if (ordersData.length > 0) {
//       await upsertOrders(ordersData);
//       return { synced: ordersData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull orders:", error);
//     return { synced: 0 };
//   }
// }

// async function pullPriceHistory(dispatch: AppDispatch) {
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
//       return handleApiError(error, "Price history");
//     }

//     const priceHistoryData = data?.priceHistory || data?.data || data || [];

//     if (priceHistoryData.length > 0) {
//       await upsertPriceHistory(priceHistoryData);
//       return { synced: priceHistoryData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull price history:", error);
//     return { synced: 0 };
//   }
// }

// async function pullPromotions(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping promotion pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getPromotions) {
//       console.warn("⚠️ getPromotions endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getPromotions.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Promotion");
//     }

//     const promotionsData = data?.promotions || data?.data || data || [];

//     if (promotionsData.length > 0) {
//       await upsertPromotions(promotionsData);
//       return { synced: promotionsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull promotions:", error);
//     return { synced: 0 };
//   }
// }

// async function pullTaxRates(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping tax rate pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getTaxRates) {
//       console.warn("⚠️ getTaxRates endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getTaxRates.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Tax rate");
//     }

//     const taxRatesData = data?.taxRates || data?.data || data || [];

//     if (taxRatesData.length > 0) {
//       await upsertTaxRates(taxRatesData);
//       return { synced: taxRatesData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull tax rates:", error);
//     return { synced: 0 };
//   }
// }

// async function pullExpenses(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping expense pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getExpenses) {
//       console.warn("⚠️ getExpenses endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getExpenses.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Expense");
//     }

//     const expensesData = data?.expenses || data?.data || data || [];

//     if (expensesData.length > 0) {
//       await upsertExpenses(expensesData);
//       return { synced: expensesData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull expenses:", error);
//     return { synced: 0 };
//   }
// }

// async function pullExpenseCategories(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping expense category pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getExpenseCategories) {
//       console.warn("⚠️ getExpenseCategories endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getExpenseCategories.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Expense category");
//     }

//     const categoriesData = data?.categories || data?.data || data || [];

//     if (categoriesData.length > 0) {
//       await upsertExpenseCategories(categoriesData);
//       return { synced: categoriesData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull expense categories:", error);
//     return { synced: 0 };
//   }
// }

// async function pullCashRegisters(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping cash register pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getCashRegisters) {
//       console.warn("⚠️ getCashRegisters endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getCashRegisters.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Cash register");
//     }

//     const registersData = data?.registers || data?.data || data || [];

//     if (registersData.length > 0) {
//       await upsertCashRegisters(registersData);
//       return { synced: registersData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull cash registers:", error);
//     return { synced: 0 };
//   }
// }

// async function pullGiftCards(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping gift card pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getGiftCards) {
//       console.warn("⚠️ getGiftCards endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getGiftCards.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Gift card");
//     }

//     const giftCardsData = data?.giftCards || data?.data || data || [];

//     if (giftCardsData.length > 0) {
//       await upsertGiftCards(giftCardsData);
//       return { synced: giftCardsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull gift cards:", error);
//     return { synced: 0 };
//   }
// }

// async function pullWallets(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping wallet pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getWallets) {
//       console.warn("⚠️ getWallets endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getWallets.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Wallet");
//     }

//     const walletsData = data?.wallets || data?.data || data || [];

//     if (walletsData.length > 0) {
//       await upsertWallets(walletsData);
//       return { synced: walletsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull wallets:", error);
//     return { synced: 0 };
//   }
// }

// async function pullSupplierPayments(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping supplier payment pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getSupplierPayments) {
//       console.warn("⚠️ getSupplierPayments endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getSupplierPayments.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Supplier payment");
//     }

//     const paymentsData = data?.payments || data?.data || data || [];

//     if (paymentsData.length > 0) {
//       await upsertSupplierPayments(paymentsData);
//       return { synced: paymentsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull supplier payments:", error);
//     return { synced: 0 };
//   }
// }

// async function pullPurchaseOrders(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping purchase order pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getPurchaseOrders) {
//       console.warn("⚠️ getPurchaseOrders endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getPurchaseOrders.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Purchase order");
//     }

//     const ordersData = data?.purchaseOrders || data?.data || data || [];

//     if (ordersData.length > 0) {
//       await upsertPurchaseOrders(ordersData);
//       return { synced: ordersData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull purchase orders:", error);
//     return { synced: 0 };
//   }
// }

// async function pullStockTransfers(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping stock transfer pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getStockTransfers) {
//       console.warn("⚠️ getStockTransfers endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getStockTransfers.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Stock transfer");
//     }

//     const transfersData = data?.transfers || data?.data || data || [];

//     if (transfersData.length > 0) {
//       await upsertStockTransfers(transfersData);
//       return { synced: transfersData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull stock transfers:", error);
//     return { synced: 0 };
//   }
// }

// async function pullWebhooks(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping webhook pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getWebhooks) {
//       console.warn("⚠️ getWebhooks endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getWebhooks.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Webhook");
//     }

//     const webhooksData = data?.webhooks || data?.data || data || [];

//     if (webhooksData.length > 0) {
//       await upsertWebhooks(webhooksData);
//       return { synced: webhooksData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull webhooks:", error);
//     return { synced: 0 };
//   }
// }

// async function pullNotifications(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn("⚠️ No auth token found, skipping notification pull");
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getNotifications) {
//       console.warn("⚠️ getNotifications endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getNotifications.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Notification");
//     }

//     const notificationsData = data?.notifications || data?.data || data || [];

//     if (notificationsData.length > 0) {
//       await upsertNotifications(notificationsData);
//       return { synced: notificationsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull notifications:", error);
//     return { synced: 0 };
//   }
// }

// async function pullTenantStoreSettings(dispatch: AppDispatch) {
//   try {
//     const state = store.getState();
//     const token = state.auth?.user?.token;

//     if (!token) {
//       console.warn(
//         "⚠️ No auth token found, skipping tenant store setting pull",
//       );
//       return { synced: 0 };
//     }

//     if (!remoteApi.endpoints.getTenantStoreSettings) {
//       console.warn("⚠️ getTenantStoreSettings endpoint not available");
//       return { synced: 0 };
//     }

//     const { data, error } = await store.dispatch(
//       remoteApi.endpoints.getTenantStoreSettings.initiate(undefined, {
//         forceRefetch: true,
//       }),
//     );

//     if (error) {
//       return handleApiError(error, "Tenant store setting");
//     }

//     const settingsData = data?.settings || data?.data || data || [];

//     if (settingsData.length > 0) {
//       await upsertTenantStoreSettings(settingsData);
//       return { synced: settingsData.length };
//     }

//     return { synced: 0 };
//   } catch (error) {
//     console.error("❌ Failed to pull tenant store settings:", error);
//     return { synced: 0 };
//   }
// }

// // ============================================
// // 4. PUSH FUNCTIONS
// // ============================================

// async function pushOutboxItems(dispatch: AppDispatch, maxItems: number) {
//   const items = await getDueOutboxItems(maxItems);

//   if (items.length === 0) {
//     return { synced: 0, failed: 0 };
//   }

//   let synced = 0;
//   let failed = 0;

//   // Group items by entity for better processing
//   const groupedItems = items.reduce(
//     (acc, item) => {
//       if (!acc[item.entity]) acc[item.entity] = [];
//       acc[item.entity].push(item);
//       return acc;
//     },
//     {} as Record<string, typeof items>,
//   );

//   // Process each entity type
//   for (const [entity, entityItems] of Object.entries(groupedItems)) {
//     for (const item of entityItems) {
//       try {
//         const result = await processOutboxItem(item);
//         if (result.success) {
//           synced++;
//           dispatch(setSyncProgress(80 + (synced / items.length) * 10));
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

// async function processOutboxItem(
//   item: any,
// ): Promise<{ success: boolean; error?: string }> {
//   const db = getOfflineDb();

//   switch (item.entity) {
//     case "orders": {
//       try {
//         // ✅ Clean the payload before sending
//         const cleanPayload = cleanOrderPayloadForServer(item.payload);

//         console.log(`📤 Sending order:`, JSON.stringify(cleanPayload, null, 2));

//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemoteOrder.initiate(cleanPayload),
//         );

//         if (error) {
//           console.error(`❌ Order sync failed:`, error);
//           throw new Error(JSON.stringify(error));
//         }

//         await db
//           .update(orders)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(orders.id, item.entityId));

//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         console.error(`❌ Failed to sync order ${item.entityId}:`, error);
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "sessions": {
//       try {
//         let result;
//         if (item.operation === "open") {
//           result = await store.dispatch(
//             remoteApi.endpoints.openSession.initiate(item.payload),
//           );
//         } else if (item.operation === "close") {
//           result = await store.dispatch(
//             remoteApi.endpoints.closeSession.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//         } else {
//           result = await store.dispatch(
//             remoteApi.endpoints.createRemoteSession.initiate(item.payload),
//           );
//         }

//         const { data, error } = result;
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
//             remoteApi.endpoints.createRemoteProduct.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(products)
//             .set({
//               remoteId: data.id,
//               syncStatus: "synced",
//             } as any)
//             .where(eq(products.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteProduct.initiate({
//               id: item.entityId,
//               ...item.payload,
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
//             remoteApi.endpoints.createRemoteProductVariant.initiate(
//               item.payload,
//             ),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(productVariants)
//             .set({
//               remoteId: data.id,
//               syncStatus: "synced",
//             } as any)
//             .where(eq(productVariants.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteProductVariant.initiate({
//               id: item.entityId,
//               ...item.payload,
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
//       try {
//         if (item.operation === "create" || item.operation === "update") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.upsertRemoteInventory.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(inventory)
//             .set({
//               remoteId: data.id,
//               syncStatus: "synced",
//               quantity: data.quantity,
//               version: data.version,
//             } as any)
//             .where(eq(inventory.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "inventory_movements": {
//       try {
//         // ✅ Clean and map the payload
//         const cleanPayload = cleanInventoryMovementPayloadForServer(
//           item.payload,
//         );

//         console.log(
//           `📤 Sending inventory movement:`,
//           JSON.stringify(cleanPayload, null, 2),
//         );

//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemoteInventoryMovement.initiate(
//             cleanPayload,
//           ),
//         );

//         if (error) {
//           console.error(`❌ Inventory movement sync failed:`, error);
//           throw new Error(JSON.stringify(error));
//         }

//         await db
//           .update(inventoryMovements)
//           .set({ remoteId: data.id, syncStatus: "synced" })
//           .where(eq(inventoryMovements.id, item.entityId));

//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         console.error(
//           `❌ Failed to sync inventory movement ${item.entityId}:`,
//           error,
//         );
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "inventory_counts": {
//       try {
//         const { data, error } = await store.dispatch(
//           remoteApi.endpoints.createRemoteInventoryCount.initiate(item.payload),
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
//           remoteApi.endpoints.createRemotePriceHistory.initiate(item.payload),
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

//     case "categories": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteCategory.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(categories)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(categories.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteCategory.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(categories)
//             .set({ syncStatus: "synced" })
//             .where(eq(categories.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteRemoteCategory.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(categories).where(eq(categories.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "brands": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteBrand.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(brands)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(brands.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteBrand.initiate({
//               id: item.entityId,
//               ...item.payload,
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

//     case "customers": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteCustomer.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(customers)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(customers.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteCustomer.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(customers)
//             .set({ syncStatus: "synced" })
//             .where(eq(customers.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteRemoteCustomer.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(customers).where(eq(customers.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "suppliers": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createSupplier.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(suppliers)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(suppliers.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateSupplier.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(suppliers)
//             .set({ syncStatus: "synced" })
//             .where(eq(suppliers.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteSupplier.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(suppliers).where(eq(suppliers.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "stores": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createRemoteStore.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(stores)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(stores.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateRemoteStore.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(stores)
//             .set({ syncStatus: "synced" })
//             .where(eq(stores.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteRemoteStore.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(stores).where(eq(stores.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "promotions": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createPromotion.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(promotions)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(promotions.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updatePromotion.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(promotions)
//             .set({ syncStatus: "synced" })
//             .where(eq(promotions.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deletePromotion.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(promotions).where(eq(promotions.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "tax_rates": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createTaxRate.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(taxRates)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(taxRates.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateTaxRate.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(taxRates)
//             .set({ syncStatus: "synced" })
//             .where(eq(taxRates.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteTaxRate.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(taxRates).where(eq(taxRates.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "expenses": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createExpense.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(expenses)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(expenses.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateExpense.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(expenses)
//             .set({ syncStatus: "synced" })
//             .where(eq(expenses.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteExpense.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(expenses).where(eq(expenses.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "expense_categories": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createExpenseCategory.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(expenseCategories)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(expenseCategories.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateExpenseCategory.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(expenseCategories)
//             .set({ syncStatus: "synced" })
//             .where(eq(expenseCategories.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteExpenseCategory.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(expenseCategories)
//             .where(eq(expenseCategories.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "purchase_orders": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createPurchaseOrder.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(purchaseOrders)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(purchaseOrders.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updatePurchaseOrder.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(purchaseOrders)
//             .set({ syncStatus: "synced" })
//             .where(eq(purchaseOrders.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deletePurchaseOrder.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(purchaseOrders)
//             .where(eq(purchaseOrders.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "stock_transfers": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createStockTransfer.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(stockTransfers)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(stockTransfers.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateStockTransfer.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(stockTransfers)
//             .set({ syncStatus: "synced" })
//             .where(eq(stockTransfers.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteStockTransfer.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(stockTransfers)
//             .where(eq(stockTransfers.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "gift_cards": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createGiftCard.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(giftCards)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(giftCards.id, item.entityId));
//         } else if (item.operation === "reload") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.reloadGiftCard.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(giftCards)
//             .set({ syncStatus: "synced" })
//             .where(eq(giftCards.id, item.entityId));
//         } else if (item.operation === "updateStatus") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateGiftCardStatus.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(giftCards)
//             .set({ syncStatus: "synced" })
//             .where(eq(giftCards.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateGiftCardStatus.initiate({
//               id: item.entityId,
//               status: "CANCELLED",
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(giftCards)
//             .set({ syncStatus: "synced" })
//             .where(eq(giftCards.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "cash_registers": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createCashRegister.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(cashRegisters)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(cashRegisters.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateCashRegister.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(cashRegisters)
//             .set({ syncStatus: "synced" })
//             .where(eq(cashRegisters.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteCashRegister.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(cashRegisters)
//             .where(eq(cashRegisters.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "webhooks": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createWebhook.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(webhooks)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(webhooks.id, item.entityId));
//         } else if (item.operation === "update") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.updateWebhook.initiate({
//               id: item.entityId,
//               ...item.payload,
//             }),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(webhooks)
//             .set({ syncStatus: "synced" })
//             .where(eq(webhooks.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteWebhook.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(webhooks).where(eq(webhooks.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "api_keys": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createTenantApiKey.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(apiKeys)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(apiKeys.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteTenantApiKey.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db.delete(apiKeys).where(eq(apiKeys.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "notifications": {
//       try {
//         if (item.operation === "create") {
//           await db
//             .update(notifications)
//             .set({ syncStatus: "synced" })
//             .where(eq(notifications.id, item.entityId));
//         } else if (
//           item.operation === "update" ||
//           item.operation === "markRead"
//         ) {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.markNotificationRead.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(notifications)
//             .set({ syncStatus: "synced" })
//             .where(eq(notifications.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteNotification.initiate(item.entityId),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(notifications)
//             .where(eq(notifications.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     case "tenant_store_settings": {
//       try {
//         if (item.operation === "create") {
//           const { data, error } = await store.dispatch(
//             remoteApi.endpoints.createTenantStoreSetting.initiate(item.payload),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .update(tenantStoreSettings)
//             .set({ remoteId: data.id, syncStatus: "synced" })
//             .where(eq(tenantStoreSettings.id, item.entityId));
//         } else if (item.operation === "delete") {
//           const { error } = await store.dispatch(
//             remoteApi.endpoints.deleteTenantStoreSetting.initiate(
//               item.entityId,
//             ),
//           );
//           if (error) throw new Error(JSON.stringify(error));
//           await db
//             .delete(tenantStoreSettings)
//             .where(eq(tenantStoreSettings.id, item.entityId));
//         }
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }

//     default: {
//       try {
//         await markEntitySynced(item.entity, item.entityId, {});
//         await markOutboxSynced(item.id);
//         return { success: true };
//       } catch (error) {
//         return { success: false, error: (error as Error).message };
//       }
//     }
//   }
// }

// // ============================================
// // 5. HELPER FUNCTIONS
// // ============================================

// async function getFailedCount(): Promise<number> {
//   const db = getOfflineDb();
//   const result = await db
//     .select({ count: sql<number>`count(*)` })
//     .from(syncOutbox)
//     .where(inArray(syncOutbox.status, ["failed", "dead"]));
//   return Number(result[0]?.count ?? 0);
// }

// // ============================================
// // 6. RETRY FAILED ITEMS
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

// // ============================================
// // 7. CLEANUP
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
// // 8. REACT HOOK FOR SYNC (useSync)
// // ============================================

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
//     return store.getState();
//   }, []);

//   const sync = useCallback(
//     async (options?: {
//       force?: boolean;
//       maxItems?: number;
//       silent?: boolean;
//     }) => {
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
//     // State
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

//     // Actions
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
