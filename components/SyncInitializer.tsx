import { useEffect } from "react";
import { Alert } from "react-native";
import { setSyncing, setLastSync } from "@/services/features/sync/syncSlice";
import { SyncEngine } from "@/services/features/sync/syncEngine";
import { getToken, getTenantId } from "@/utils/secureStorage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { View } from "react-native";

export function SyncInitializer() {
  const dispatch = useAppDispatch();
  const isOnline = useNetworkStatus();

  useEffect(() => {
    const sync = async () => {
      const token = await getToken();
      const tenantId = await getTenantId();
      if (!token || !tenantId) return;
      dispatch(setSyncing(true));
      try {
        const engine = new SyncEngine();
        await engine.sync(tenantId, token);
        dispatch(setLastSync(Date.now()));
      } catch (error) {
        console.error("Sync error", error);
      } finally {
        dispatch(setSyncing(false));
      }
    };
    if (isOnline) sync();
  }, [isOnline]);

  return <View />;
}
// export function SyncInitializer() {
//   const dispatch = useAppDispatch();
//   const isOnline = useNetworkStatus();

//   useEffect(() => {
//     const sync = async () => {
//       const token = await getToken();
//       const tenantId = await getTenantId();
//       if (!token || !tenantId) {
//         console.log("🔴 No token or tenantId, skipping sync");
//         return;
//       }
//       console.log("🔄 Starting background sync...");
//       dispatch(setSyncing(true));
//       try {
//         const engine = new SyncEngine();
//         await engine.sync(tenantId, token);
//         dispatch(setLastSync(Date.now()));
//         console.log("✅ Sync completed");
//       } catch (error: any) {
//         console.error("❌ Sync error:", error);
//         // Optionally show an alert only for manual sync, not background
//         // if (isManual) Alert.alert("Sync failed", error.message);
//       } finally {
//         dispatch(setSyncing(false));
//       }
//     };

//     // Run sync when app starts and when online status changes
//     if (isOnline) {
//       sync();
//     }
//   }, [isOnline, dispatch]);

//   // This component does not render anything
//   return null;
// }
