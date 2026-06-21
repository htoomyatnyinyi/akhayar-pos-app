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
} from "./repository";
import {
  setInitialized,
  setOnline,
  setQueuedCount,
  setSyncComplete,
  setSyncError,
  setSyncing,
} from "./offlineSlice";
import { migrateOfflineDatabase } from "./migrations";

let syncInFlight = false;
let unsubscribeNetwork: (() => void) | undefined;

export async function initializeOfflineSystem(dispatch: AppDispatch, getState: () => RootState) {
  await migrateOfflineDatabase();
  dispatch(setInitialized(true));
  dispatch(setQueuedCount(await getQueuedCount()));

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
}

export async function syncNow(dispatch: AppDispatch, getState: () => RootState) {
  if (syncInFlight || !(await isOnline())) return;

  syncInFlight = true;
  dispatch(setSyncing(true));

  try {
    await pushOutbox(getState);
    dispatch(posApi.util.invalidateTags(["Products", "Orders", "Inventory", "Customers", "Sessions", "Categories", "Staff", "Stores"]));
    dispatch(setQueuedCount(await getQueuedCount()));
    dispatch(setSyncComplete());
  } catch (error) {
    dispatch(setSyncError(error instanceof Error ? error.message : "Offline sync failed"));
  } finally {
    syncInFlight = false;
  }
}

async function pushOutbox(getState: () => RootState) {
  const token = getState().auth.user?.token;
  const items = await getDueOutboxItems();

  for (const item of items) {
    // Dead-letter: stop retrying after 10 attempts
    if (item.attempts >= 10) {
      await markOutboxDead(item.id);
      continue;
    }

    try {
      const response = await fetch(`${POS_API_URL}${item.endpoint}`, {
        method: item.method,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        // Don't send body for DELETE requests
        ...(item.method !== "DELETE" ? { body: JSON.stringify(item.payload) } : {}),
      });

      const data = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(data?.message ?? `Sync request failed with ${response.status}`);
      }

      if (item.entity === "orders") {
        await markOrderSynced(item.entityId, data);
      } else {
        await markEntitySynced(item.entity, item.entityId, data ?? {});
      }

      await markOutboxSynced(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sync queued item";
      const attempts = item.attempts + 1;
      await markOutboxFailed(item.id, attempts, message);

      if (item.entity === "orders") {
        await markOrderSyncFailed(item.entityId, message);
      } else {
        await markEntitySyncFailed(item.entity, item.entityId, message);
      }
    }
  }
}
