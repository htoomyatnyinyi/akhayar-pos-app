// components/SyncStatus.tsx
import React from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
// import { useSync } from "@/services/offline/syncManager";
import { useSync } from "@/services/offline/syncManager";
import { Card, Pill } from "@/components/app-ui";

export function SyncStatus() {
  const {
    isOnline,
    isSyncing,
    syncStatus,
    syncError,
    queueCount,
    sync,
    retry,
    clear,
    getStatus,
  } = useSync();

  const [status, setStatus] = React.useState<any>(null);

  React.useEffect(() => {
    const loadStatus = async () => {
      const data = await getStatus();
      setStatus(data);
    };
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-400"}`}
          />
          <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
            {isOnline ? "Online" : "Offline"}
          </Text>
          {isSyncing && <ActivityIndicator size="small" color="#34d399" />}
        </View>

        <View className="flex-row items-center gap-2">
          {queueCount > 0 && (
            <Pill
              label={`📤 ${queueCount} pending`}
              tone={isOnline ? "amber" : "rose"}
            />
          )}
          {syncStatus === "error" && <Pill label="⚠️ Error" tone="rose" />}
          {syncStatus === "complete" && (
            <Pill label="✅ Synced" tone="emerald" />
          )}
        </View>
      </View>

      {syncError && (
        <Text className="mt-2 text-xs text-rose-400">{syncError}</Text>
      )}

      {queueCount > 0 && isOnline && (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => sync({ force: true })}
            className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-2 border border-emerald-400/30"
          >
            <Text className="text-center text-xs font-bold text-emerald-200">
              Sync Now
            </Text>
          </Pressable>
          <Pressable
            onPress={() => retry()}
            className="flex-1 rounded-lg bg-sky-500/20 px-3 py-2 border border-sky-400/30"
          >
            <Text className="text-center text-xs font-bold text-sky-200">
              Retry Failed
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (queueCount > 0) {
                // Show confirmation dialog
                Alert.alert(
                  "Clear Queue",
                  "This will remove all pending sync items. Are you sure?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear", style: "destructive", onPress: clear },
                  ],
                );
              }
            }}
            className="rounded-lg bg-rose-500/20 px-3 py-2 border border-rose-400/30"
          >
            <Text className="text-center text-xs font-bold text-rose-200">
              Clear
            </Text>
          </Pressable>
        </View>
      )}

      {status && status.failedCount > 0 && (
        <View className="mt-2 rounded-lg bg-rose-500/10 p-2">
          <Text className="text-xs text-rose-400">
            {status.failedCount} items failed. Tap "Retry Failed" to retry.
          </Text>
        </View>
      )}

      {status && status.totalPending > 0 && (
        <Text className="mt-2 text-xs text-slate-400">
          Total pending: {status.totalPending} items
          {status.failedCount > 0 && ` (${status.failedCount} failed)`}
        </Text>
      )}
    </Card>
  );
}
