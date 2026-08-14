import { store } from "@/services/store/store";
import type { AppDispatch } from "@/services/store/store";
import { isOnline } from "./network";

export type SyncEntity =
  | "stores"
  | "brands"
  | "categories"
  | "customers"
  | "staff"
  | "suppliers"
  | "products"
  | "inventory"
  | "sessions"
  | "orders"
  | "priceHistory";

const ENTITY_PULL_MAP: Record<
  SyncEntity,
  (dispatch: AppDispatch, tenantId: string) => Promise<void>
> = {
  stores: async (dispatch, tenantId) => {
    const { pullStoresForRead } = await import("./syncManager");
    await pullStoresForRead(dispatch, tenantId);
  },
  brands: async (dispatch, tenantId) => {
    const { pullBrandsForRead } = await import("./syncManager");
    await pullBrandsForRead(dispatch, tenantId);
  },
  categories: async (dispatch, tenantId) => {
    const { pullCategoriesForRead } = await import("./syncManager");
    await pullCategoriesForRead(dispatch, tenantId);
  },
  customers: async (dispatch, tenantId) => {
    const { pullCustomersForRead } = await import("./syncManager");
    await pullCustomersForRead(dispatch, tenantId);
  },
  staff: async (dispatch, tenantId) => {
    const { pullStaffForRead } = await import("./syncManager");
    await pullStaffForRead(dispatch, tenantId);
  },
  suppliers: async (dispatch, tenantId) => {
    const { pullSuppliersForRead } = await import("./syncManager");
    await pullSuppliersForRead(dispatch, tenantId);
  },
  products: async (dispatch, tenantId) => {
    const { pullProductsForRead } = await import("./syncManager");
    await pullProductsForRead(dispatch, tenantId);
  },
  inventory: async (dispatch, tenantId) => {
    const { pullInventoryForRead } = await import("./syncManager");
    await pullInventoryForRead(dispatch, tenantId);
  },
  sessions: async (dispatch, tenantId) => {
    const { pullSessionsForRead } = await import("./syncManager");
    await pullSessionsForRead(dispatch, tenantId);
  },
  orders: async (dispatch, tenantId) => {
    const { pullOrdersForRead } = await import("./syncManager");
    await pullOrdersForRead(dispatch, tenantId);
  },
  priceHistory: async (dispatch, tenantId) => {
    const { pullPriceHistoryForRead } = await import("./syncManager");
    await pullPriceHistoryForRead(dispatch, tenantId);
  },
};

/** Online-first read: pull fresh data from server when online, then read local cache. */
export async function refreshIfOnline(entities: SyncEntity[]): Promise<void> {
  if (!(await isOnline())) return;

  const tenantId = store.getState().auth?.user?.tenantId;
  if (!tenantId) return;

  const dispatch = store.dispatch;
  for (const entity of entities) {
    try {
      await ENTITY_PULL_MAP[entity](dispatch, tenantId);
    } catch (error) {
      console.warn(`⚠️ Online-first refresh failed for ${entity}:`, error);
    }
  }
}

/** Push pending local changes to server when online. */
export function pushIfOnline(): void {
  void (async () => {
    if (!(await isOnline())) return;
    const { syncNow } = await import("./syncManager");
    await syncNow(store.dispatch, store.getState, { silent: true });
  })();
}
