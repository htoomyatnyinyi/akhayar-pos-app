import React from "react";
import { View, ActivityIndicator, ScrollView, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSync } from "@/services/offline/syncManager";
import {
  Screen,
  Header,
  Card,
  MetricCard,
  ActionButton,
  SectionTitle,
  RowItem,
  Pill,
  Divider,
  StatRow,
} from "@/components/app-ui";
// import { userLoggedOut } from "@/services/slices/userSessionSlice";
import { useDispatch } from "react-redux";
import { logout } from "@/services/features/auth/authSlice";

export default function SyncScreen() {
  const dispatch = useDispatch();

  const {
    isOnline,
    isSyncing,
    isLoading,
    syncStatus,
    syncError,
    queueCount,
    failedCount,
    syncProgress,
    lastSyncAt,
    sync,
    retry,
    refresh,
  } = useSync();

  const handleSyncNow = () => {
    sync({ force: true });
  };

  const handleRetry = () => {
    retry();
  };

  const handleSignOut = () => {
    dispatch(logout());
  };

  return (
    <Screen padded={false}>
      <View className="px-5 pt-12 pb-4">
        <Header
          eyebrow="System Status"
          title="Synchronization"
          subtitle="Manage offline data and connectivity"
          right={
            <View className="mt-2">
              <Pill
                label={isOnline ? "ONLINE" : "OFFLINE"}
                tone={isOnline ? "emerald" : "rose"}
              />
              <View className="flex-row items-center gap-3 mt-3">
                <View className="flex-1">
                  <ActionButton
                    title="Sign out"
                    icon="logout"
                    accent="rose"
                    onPress={handleSignOut}
                  />
                </View>
              </View>
            </View>
          }
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <SectionTitle title="Overview" />

        <View className="flex-row gap-3 mb-5 mt-2">
          <MetricCard
            icon="cloud-upload"
            label="Pending"
            value={queueCount?.toString() ?? "0"}
            tone="sky"
          />
          <MetricCard
            icon="error-outline"
            label="Failed"
            value={failedCount?.toString() ?? "0"}
            tone={failedCount > 0 ? "rose" : "emerald"}
          />
        </View>

        <SectionTitle title="Details" action="Refresh" />

        <Card className="mb-6 mt-2">
          <StatRow
            label="Last Synced"
            value={
              lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "Never"
            }
          />
          <Divider />
          <StatRow
            label="Network Connection"
            value={isOnline ? "Connected" : "Disconnected"}
          />
          <Divider />
          <StatRow
            label="Current Status"
            value={
              isSyncing
                ? "Syncing..."
                : syncStatus === "failed"
                  ? "Failed"
                  : "Idle"
            }
          />

          {isSyncing && (
            <View className="mt-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-slate-300 font-semibold text-xs uppercase tracking-widest">
                  Progress
                </Text>
                <Text className="text-sky-400 font-bold text-xs">
                  {Math.round(syncProgress)}%
                </Text>
              </View>
              <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <View
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${syncProgress}%` }}
                />
              </View>
            </View>
          )}

          {syncError && (
            <View className="mt-4 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <Text className="text-rose-400 text-sm font-medium">
                {syncError}
              </Text>
            </View>
          )}
        </Card>

        <SectionTitle title="Actions" />

        <View className="flex-row gap-3 mt-2 mb-3">
          <ActionButton
            title={isSyncing ? "Syncing..." : "Sync Now"}
            icon="sync"
            accent={isOnline && !isSyncing ? "sky" : "amber"}
            onPress={isOnline && !isSyncing ? handleSyncNow : undefined}
          />

          {failedCount > 0 && (
            <ActionButton
              title="Retry Failed"
              icon="refresh"
              accent="rose"
              onPress={isOnline && !isSyncing ? handleRetry : undefined}
            />
          )}
        </View>

        <RowItem
          title="Refresh Statistics"
          subtitle="Manually update queue counts"
          icon="update"
        />
      </ScrollView>
    </Screen>
  );
}
