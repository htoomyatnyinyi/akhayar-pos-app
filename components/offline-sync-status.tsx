import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { syncNow } from "@/services/offline/syncManager";
import { store } from "@/services/store/store";

export function OfflineSyncStatus() {
  const dispatch = useAppDispatch();
  const { isOnline, isSyncing, queuedCount, lastError, lastSyncedAt } = useAppSelector((state) => state.offline);

  const label = isSyncing
    ? "Syncing queue"
    : isOnline
      ? queuedCount > 0
        ? `${queuedCount} queued`
        : "Online"
      : `${queuedCount} offline`;

  return (
    <View className="absolute left-4 right-4 top-3 z-50">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync offline changes"
        disabled={!isOnline || isSyncing}
        onPress={() => syncNow(dispatch, store.getState)}
        className={`rounded-[20px] border px-4 py-3 ${
          isOnline ? "bg-slate-900/95 border-emerald-500/20" : "bg-rose-950/95 border-rose-500/30"
        }`}
      >
        <View className="flex-row items-start gap-3">
          <View className={`h-10 w-10 items-center justify-center rounded-2xl ${isOnline ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
            <MaterialIcons
              name={isOnline ? (queuedCount > 0 ? "sync" : "cloud-done") : "cloud-off"}
              size={20}
              color={isOnline ? "#34d399" : "#fb7185"}
            />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-[3px] text-slate-400">{label}</Text>
            <Text className="mt-1 text-sm text-white">
              {lastError
                ? lastError
                : isOnline
                  ? queuedCount > 0
                    ? "Queued actions will be pushed automatically."
                    : "Everything is synced."
                  : "Working offline. Changes are stored locally."}
            </Text>
            <Text className="mt-2 text-[11px] text-slate-500">
              {lastSyncedAt ? `Last sync ${new Date(lastSyncedAt).toLocaleTimeString()}` : "No sync yet"}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={14} color="#94a3b8" />
        </View>
      </Pressable>
    </View>
  );
}
