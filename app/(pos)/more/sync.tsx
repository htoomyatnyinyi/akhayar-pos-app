import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAppDispatch, useAppSelector } from "@/services/store/hooks";
import { setSyncing, setLastSync } from "@/services/features/sync/syncSlice";
import { SyncEngine } from "@/services/features/sync/syncEngine";
import { getToken, getTenantId } from "@/utils/secureStorage";

export default function SyncScreen() {
  const dispatch = useAppDispatch();
  const { isSyncing, lastSyncAt, isOnline, pendingItems } = useAppSelector(
    (state) => state.sync,
  );
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "You are not connected to the internet.");
      return;
    }
    const token = await getToken();
    const tid = tenantId || (await getTenantId());
    if (!token || !tid) {
      Alert.alert("Error", "Missing credentials.");
      return;
    }
    dispatch(setSyncing(true));
    try {
      const engine = new SyncEngine();
      await engine.sync(tid, token);
      dispatch(setLastSync(Date.now()));
      Alert.alert("Success", "Sync completed");
    } catch (error) {
      Alert.alert("Sync failed", error.message);
    } finally {
      dispatch(setSyncing(false));
    }
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-2xl font-bold">Sync Status</Text>
      <Text>Online: {isOnline ? "✅" : "❌"}</Text>
      <Text>Syncing: {isSyncing ? "⏳" : "⏹️"}</Text>
      <Text>Pending items: {pendingItems}</Text>
      <Text>
        Last sync:{" "}
        {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
      </Text>
      <TouchableOpacity
        onPress={handleSync}
        disabled={isSyncing || !isOnline}
        className={`bg-indigo-600 py-3 rounded-lg mt-4 ${isSyncing ? "opacity-50" : ""}`}
      >
        <Text className="text-white text-center font-bold">
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
