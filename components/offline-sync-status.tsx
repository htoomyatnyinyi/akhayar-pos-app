import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { syncNow } from "@/services/offline/syncManager";
import { store } from "@/services/store/store";

export function OfflineSyncStatus() {
  const dispatch = useAppDispatch();
  const { isOnline, isSyncing, queuedCount, lastError } = useAppSelector((state) => state.offline);

  const label = isSyncing
    ? "Syncing"
    : isOnline
      ? queuedCount > 0
        ? `${queuedCount} queued`
        : "Online"
      : `${queuedCount} offline`;

  return (
    <View className="absolute top-12 right-4 z-50">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync offline changes"
        disabled={!isOnline || isSyncing}
        onPress={() => syncNow(dispatch, store.getState)}
        className={`flex-row items-center gap-2 rounded-full px-3 py-2 border ${
          isOnline ? "bg-[#101827]/95 border-emerald-500/30" : "bg-[#271315]/95 border-rose-500/30"
        }`}
      >
        <MaterialIcons
          name={isOnline ? (queuedCount > 0 ? "sync" : "cloud-done") : "cloud-off"}
          size={16}
          color={isOnline ? "#34d399" : "#fb7185"}
        />
        <Text className="text-[11px] font-bold text-slate-100 uppercase">{label}</Text>
        {lastError ? <View className="w-2 h-2 rounded-full bg-amber-400" /> : null}
      </Pressable>
    </View>
  );
}
