import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { SyncEngine } from "../features/sync/syncEngine";
// import { getToken, getTenantId } from "./secureStorage";
import { getToken, getTenantId } from "@/utils/secureStorage";

const SYNC_TASK = "background-sync";

TaskManager.defineTask(SYNC_TASK, async () => {
  const token = await getToken();
  const tenantId = await getTenantId();
  if (!token || !tenantId) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  const engine = new SyncEngine();
  try {
    await engine.sync(tenantId, token);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background sync failed", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 15, // minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

// import * as BackgroundFetch from "expo-background-fetch";
// import * as TaskManager from "expo-task-manager";
// import { SyncEngine } from "../features/sync/syncEngine";
// import { getToken, getTenantId } from "@/utils/secureStorage";

// const SYNC_TASK = "background-sync";

// TaskManager.defineTask(SYNC_TASK, async () => {
//   const token = await getToken();
//   const tenantId = await getTenantId();
//   if (!token || !tenantId) return BackgroundFetch.BackgroundFetchResult.Failed;

//   const syncEngine = new SyncEngine();
//   try {
//     await syncEngine.sync(tenantId, token);
//     return BackgroundFetch.BackgroundFetchResult.NewData;
//   } catch (error) {
//     console.error("Background sync failed", error);
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// export async function registerBackgroundSync() {
//   await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
//     minimumInterval: 15, // minutes
//     stopOnTerminate: false,
//     startOnBoot: true,
//   });
// }
