import { View, Text, Button, Alert } from "react-native";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { setSyncing, setLastSync } from "@/services/features/sync/syncSlice";
import { SyncEngine } from "@/services/features/sync/syncEngine";
import { getToken, getTenantId } from "@/utils/secureStorage";

export default function SyncScreen() {
  const dispatch = useAppDispatch();
  const { isSyncing, lastSyncAt, isOnline, pendingItems } = useAppSelector(
    (state) => state.sync,
  );
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const handleManualSync = async () => {
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
      await new SyncEngine().sync(tid, token);
      dispatch(setLastSync(Date.now()));
      Alert.alert("Success", "Sync completed");
    } catch (error: any) {
      Alert.alert("Sync failed", error.message);
    } finally {
      dispatch(setSyncing(false));
    }
  };

  return (
    <View className="flex-1 p-4 items-center justify-center">
      <Text className="text-lg font-bold">Sync Status</Text>
      <Text>Online: {isOnline ? "✅" : "❌"}</Text>
      <Text>Syncing: {isSyncing ? "⏳" : "⏹️"}</Text>
      <Text>Pending items: {pendingItems}</Text>
      <Text>
        Last sync:{" "}
        {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
      </Text>
      <Button
        title={isSyncing ? "Syncing..." : "Sync Now"}
        onPress={handleManualSync}
        disabled={isSyncing || !isOnline}
      />
    </View>
  );
}
