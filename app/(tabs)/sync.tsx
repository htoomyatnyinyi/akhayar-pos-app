// ============================================
// FILE: app/(main)/sync/index.tsx
// ============================================

import {
  ActionButton,
  Card,
  Divider,
  Header,
  MetricCard,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { logout } from "@/services/features/auth/authSlice";
import { resetOfflineState } from "@/services/features/offline/offlineSlice";
import {
  clearOfflineDatabase,
  getOfflineDbSize,
  resetDatabaseCompletely,
} from "@/services/offline/db";
import {
  getFailedItemsWithDetails,
  getSyncQueueSummary,
  retryOutboxItem,
} from "@/services/offline/repository";
import { useSync } from "@/services/offline/syncManager";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";

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

  const [showFailedItems, setShowFailedItems] = useState(false);
  const [failedItems, setFailedItems] = useState<any[]>([]);
  const [queueSummary, setQueueSummary] = useState<any>(null);
  const [dbSize, setDbSize] = useState<string>("0 KB");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedFailedItem, setSelectedFailedItem] = useState<any>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);

  // Load details on mount
  useEffect(() => {
    loadDetails();
    loadDbSize();
  }, []);

  // Refresh when coming back to screen
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSyncing) {
        loadDetails();
        loadDbSize();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isSyncing]);

  const loadDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const summary = await getSyncQueueSummary();
      setQueueSummary(summary);

      const failed = await getFailedItemsWithDetails(50);
      setFailedItems(failed);
    } catch (error) {
      console.error("Failed to load sync details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const loadDbSize = async () => {
    try {
      const size = await getOfflineDbSize();
      setDbSize(size);
    } catch (error) {
      console.error("Failed to get DB size:", error);
    }
  };

  const handleSyncNow = () => {
    sync({ force: true, silent: false });
  };

  const handleRetryAll = () => {
    Alert.alert(
      "Retry All Failed Items",
      `This will retry ${failedCount} failed items. Are you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retry All",
          onPress: async () => {
            const result = await retry();
            if (result?.success) {
              Alert.alert("Success", `${result.retried || 0} items retried.`);
              await loadDetails();
            } else {
              Alert.alert("Error", result?.error || "Failed to retry items.");
            }
          },
        },
      ],
    );
  };

  const handleRetrySingleItem = async (itemId: string) => {
    setRetryingItemId(itemId);
    try {
      await retryOutboxItem(itemId);
      await loadDetails();
      Alert.alert("Success", "Item has been queued for retry.");
    } catch (error) {
      Alert.alert("Error", "Failed to retry item.");
    } finally {
      setRetryingItemId(null);
    }
  };

  const handleClearDatabase = () => {
    Alert.alert(
      "Clear Offline Database",
      "This will remove all offline data including products, orders, customers, and pending sync items. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Data",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearOfflineDatabase();
              await loadDetails();
              await loadDbSize();
              Alert.alert("Success", "Offline database cleared successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear database.");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? All offline data will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearOfflineDatabase();
              await resetDatabaseCompletely();
              dispatch(resetOfflineState());
              dispatch(logout());
            } catch (error) {
              Alert.alert("Error", "Failed to sign out.");
              setIsClearing(false);
            }
          },
        },
      ],
    );
  };

  const handleItemPress = (item: any) => {
    setSelectedFailedItem(item);
    setShowItemDetail(true);
  };

  const renderFailedItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10"
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-white font-semibold">
              {item.entity} - {item.operation}
            </Text>
            <Pill
              label={item.status === "dead" ? "DEAD" : "FAILED"}
              tone={item.status === "dead" ? "rose" : "amber"}
              className="ml-2"
            />
          </View>
          <Text className="text-slate-400 text-xs mt-1">
            ID: {item.entityId}
          </Text>
          {item.lastError && (
            <Text className="text-rose-400 text-xs mt-1" numberOfLines={2}>
              Error: {item.lastError}
            </Text>
          )}
          <Text className="text-slate-500 text-[10px] mt-1">
            Attempts: {item.attempts} •{" "}
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="bg-sky-500/20 p-2 rounded-full mr-2"
            onPress={() => handleRetrySingleItem(item.id)}
            disabled={retryingItemId === item.id}
          >
            {retryingItemId === item.id ? (
              <ActivityIndicator size="small" color="#38bdf8" />
            ) : (
              <MaterialIcons name="refresh" size={18} color="#38bdf8" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-white/10 p-2 rounded-full"
            onPress={() => handleItemPress(item)}
          >
            <MaterialIcons name="chevron-right" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = () => {
    if (isSyncing) return "#38bdf8";
    if (syncStatus === "failed") return "#f87171";
    if (syncStatus === "complete") return "#34d399";
    return "#94a3b8";
  };

  const getStatusLabel = () => {
    if (isSyncing) return "Syncing...";
    if (syncStatus === "failed") return "Failed";
    if (syncStatus === "complete") return "Complete";
    return "Idle";
  };

  return (
    <Screen padded={false}>
      <View className="px-5 pt-6 pb-4">
        <Header
          eyebrow="System Status"
          title="Synchronization"
          subtitle="Manage offline data and connectivity"
          right={
            <View className="items-end">
              <Pill
                label={isOnline ? "ONLINE" : "OFFLINE"}
                tone={isOnline ? "emerald" : "rose"}
              />
              {isSyncing && (
                <Text className="text-sky-400 text-[10px] font-bold mt-1">
                  SYNCING...
                </Text>
              )}
            </View>
          }
        />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Section */}
        <SectionTitle title="Overview" />

        <View className="flex-row gap-3 mb-5 mt-2">
          <MetricCard
            icon="cloud-upload"
            label="Pending"
            value={queueCount?.toString() ?? "0"}
            tone={queueCount > 0 ? "sky" : "emerald"}
          />
          <MetricCard
            icon="error-outline"
            label="Failed"
            value={failedCount?.toString() ?? "0"}
            tone={failedCount > 0 ? "rose" : "emerald"}
          />
          <MetricCard
            icon="storage"
            label="Database"
            value={dbSize}
            tone="amber"
          />
        </View>

        {/* Sync Progress */}
        {isSyncing && (
          <Card className="mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-300 font-semibold text-xs uppercase tracking-widest">
                Syncing Progress
              </Text>
              <Text className="text-sky-400 font-bold text-xs">
                {Math.round(syncProgress)}%
              </Text>
            </View>
            <View className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <View
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </View>
            <Text className="text-slate-400 text-xs mt-2 text-center">
              {syncStatus === "syncing"
                ? "Synchronizing data..."
                : "Processing..."}
            </Text>
            {syncProgress > 0 && syncProgress < 100 && (
              <View className="mt-2 flex-row justify-center gap-4">
                <Text className="text-slate-500 text-[10px]">
                  ⚡ {Math.round((syncProgress / 100) * 30)}s elapsed
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Error Display */}
        {syncError && (
          <Card className="mb-5 border border-rose-500/30 bg-rose-500/10">
            <View className="flex-row items-start">
              <MaterialIcons name="error-outline" size={20} color="#f87171" />
              <View className="flex-1 ml-2">
                <Text className="text-rose-400 text-sm font-medium">
                  {syncError}
                </Text>
                <TouchableOpacity onPress={handleRetryAll} className="mt-2">
                  <Text className="text-sky-400 text-xs font-semibold">
                    Retry All →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}

        {/* Last Sync Status */}
        <Card className="mb-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: getStatusColor() }}
              />
              <Text className="text-slate-300 font-medium">
                Status: {getStatusLabel()}
              </Text>
            </View>
            {lastSyncAt && (
              <Text className="text-slate-500 text-xs">
                {new Date(lastSyncAt).toLocaleTimeString()}
              </Text>
            )}
          </View>
        </Card>

        {/* Details Section */}
        <SectionTitle
          title="Sync Details"
          action="Refresh"
          onAction={() => {
            refresh();
            loadDetails();
            loadDbSize();
          }}
        />

        <Card className="mb-6">
          <StatRow
            label="Last Synced"
            value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
          />
          <Divider />
          <StatRow
            label="Network Status"
            value={isOnline ? "Connected" : "Disconnected"}
            valueColor={isOnline ? "#34d399" : "#f87171"}
          />
          <Divider />
          <StatRow
            label="Sync Status"
            value={getStatusLabel()}
            valueColor={getStatusColor()}
          />
          <Divider />
          <StatRow
            label="Total Pending"
            value={queueSummary?.pending?.toString() || "0"}
          />
          <Divider />
          <StatRow
            label="Total Failed"
            value={queueSummary?.failed?.toString() || "0"}
            valueColor={queueSummary?.failed > 0 ? "#f87171" : "#34d399"}
          />
          <Divider />
          <StatRow
            label="Total Dead"
            value={queueSummary?.dead?.toString() || "0"}
            valueColor={queueSummary?.dead > 0 ? "#fbbf24" : "#94a3b8"}
          />
          <Divider />
          <StatRow
            label="Total Synced"
            value={queueSummary?.synced?.toString() || "0"}
            valueColor="#34d399"
          />

          {/* Entity Breakdown */}
          {queueSummary?.byEntity && (
            <View className="mt-3 pt-3 border-t border-white/10">
              <Text className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-2">
                Entity Breakdown
              </Text>
              {Object.entries(queueSummary.byEntity)
                .sort((a, b) => (a[1].total > b[1].total ? -1 : 1))
                .map(([entity, data]: [string, any]) => (
                  <View key={entity} className="flex-row justify-between py-1">
                    <Text className="text-slate-300 text-sm capitalize">
                      {entity.replace(/_/g, " ")}
                    </Text>
                    <Text className="text-slate-400 text-sm">
                      {data.pending > 0 && (
                        <Text className="text-sky-400"> {data.pending}p</Text>
                      )}
                      {data.failed > 0 && (
                        <Text className="text-rose-400"> {data.failed}f</Text>
                      )}
                      {data.synced > 0 && (
                        <Text className="text-emerald-400">
                          {" "}
                          {data.synced}s
                        </Text>
                      )}
                      <Text className="text-slate-500"> ({data.total})</Text>
                    </Text>
                  </View>
                ))}
            </View>
          )}
        </Card>

        {/* Failed Items Section */}
        {failedCount > 0 && (
          <>
            <SectionTitle
              title="Failed Items"
              action={
                failedItems.length > 0
                  ? `${failedItems.length} items`
                  : undefined
              }
            />
            <TouchableOpacity
              className="bg-rose-500/10 rounded-xl p-4 mb-4 border border-rose-500/20"
              onPress={() => setShowFailedItems(true)}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <MaterialIcons name="error" size={24} color="#f87171" />
                  <Text className="text-white ml-3 font-semibold">
                    {failedCount} items failed to sync
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
              </View>
              <Text className="text-slate-400 text-xs mt-1">
                Tap to view and retry individual items
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Actions Section */}
        <SectionTitle title="Actions" />

        <View className="flex-row gap-3 mt-2 mb-3">
          <ActionButton
            title={isSyncing ? "Syncing..." : "Sync Now"}
            icon="sync"
            accent={isOnline && !isSyncing ? "sky" : "amber"}
            onPress={isOnline && !isSyncing ? handleSyncNow : undefined}
            disabled={isSyncing || !isOnline || isLoading}
          />

          {failedCount > 0 && (
            <ActionButton
              title="Retry All"
              icon="refresh"
              accent="rose"
              onPress={isOnline && !isSyncing ? handleRetryAll : undefined}
              disabled={isSyncing || !isOnline || isLoading}
            />
          )}
        </View>

        <View className="mt-2">
          <RowItem
            title="Refresh Statistics"
            subtitle="Manually update queue counts"
            icon="update"
            onPress={() => {
              refresh();
              loadDetails();
              loadDbSize();
            }}
          />
          <RowItem
            title="Clear Offline Database"
            subtitle={`Current size: ${dbSize}`}
            icon="delete-sweep"
            accent="rose"
            onPress={handleClearDatabase}
            disabled={isClearing}
          />
          <RowItem
            title="Sign Out"
            subtitle="Clear data and return to login"
            icon="logout"
            accent="rose"
            onPress={handleSignOut}
            disabled={isClearing}
          />
        </View>

        {/* Version Info */}
        <View className="mt-6 items-center">
          <Text className="text-slate-600 text-xs">
            Offline Mode v2.0 • Data stored locally
          </Text>
          {isClearing && (
            <View className="mt-2 flex-row items-center">
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text className="text-slate-400 text-xs ml-2">Clearing...</Text>
            </View>
          )}
          {isLoadingDetails && !isClearing && (
            <ActivityIndicator size="small" color="#38bdf8" className="mt-2" />
          )}
        </View>
      </ScrollView>

      {/* Failed Items Modal */}
      <Modal
        visible={showFailedItems}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFailedItems(false)}
      >
        <View className="flex-1 bg-black/80">
          <View className="flex-1 bg-slate-900 rounded-t-3xl mt-12">
            <View className="px-5 pt-5 pb-4 flex-1">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-xl">
                  Failed Items ({failedItems.length})
                </Text>
                <TouchableOpacity onPress={() => setShowFailedItems(false)}>
                  <MaterialIcons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Action buttons in modal */}
              {failedItems.length > 0 && (
                <View className="flex-row gap-3 mb-4">
                  <ActionButton
                    title="Retry All"
                    icon="refresh"
                    accent="sky"
                    onPress={async () => {
                      const result = await retry();
                      if (result?.success) {
                        Alert.alert("Success", "All items retried.");
                        await loadDetails();
                        setFailedItems(await getFailedItemsWithDetails(50));
                      }
                    }}
                    disabled={isSyncing || !isOnline}
                  />
                  <ActionButton
                    title="Close"
                    icon="close"
                    accent="amber"
                    onPress={() => setShowFailedItems(false)}
                  />
                </View>
              )}

              {isLoadingDetails ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#38bdf8" />
                </View>
              ) : (
                <FlatList
                  data={failedItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderFailedItem}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View className="items-center justify-center py-8">
                      <MaterialIcons
                        name="check-circle"
                        size={48}
                        color="#34d399"
                      />
                      <Text className="text-white mt-3 font-semibold">
                        No failed items
                      </Text>
                      <Text className="text-slate-400 text-sm mt-1">
                        All sync items are in good standing
                      </Text>
                    </View>
                  }
                  contentContainerStyle={{
                    paddingBottom: 20,
                  }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Failed Item Detail Modal */}
      <Modal
        visible={showItemDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowItemDetail(false)}
      >
        <View className="flex-1 bg-black/80">
          <View className="flex-1 bg-slate-900 rounded-t-3xl mt-20">
            <View className="px-5 pt-5 pb-4 flex-1">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-xl">
                  Failed Item Details
                </Text>
                <TouchableOpacity onPress={() => setShowItemDetail(false)}>
                  <MaterialIcons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {selectedFailedItem && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Status */}
                  <Card className="mb-4">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        Status
                      </Text>
                      <Pill
                        label={
                          selectedFailedItem.status === "dead"
                            ? "DEAD"
                            : "FAILED"
                        }
                        tone={
                          selectedFailedItem.status === "dead"
                            ? "rose"
                            : "amber"
                        }
                      />
                    </View>
                  </Card>

                  {/* Entity Info */}
                  <Card className="mb-4">
                    <StatRow label="Entity" value={selectedFailedItem.entity} />
                    <Divider />
                    <StatRow
                      label="Operation"
                      value={selectedFailedItem.operation}
                    />
                    <Divider />
                    <StatRow
                      label="Entity ID"
                      value={selectedFailedItem.entityId}
                    />
                    <Divider />
                    <StatRow
                      label="Attempts"
                      value={String(selectedFailedItem.attempts)}
                    />
                    <Divider />
                    <StatRow
                      label="Created At"
                      value={new Date(
                        selectedFailedItem.createdAt,
                      ).toLocaleString()}
                    />
                    {selectedFailedItem.updatedAt && (
                      <>
                        <Divider />
                        <StatRow
                          label="Last Updated"
                          value={new Date(
                            selectedFailedItem.updatedAt,
                          ).toLocaleString()}
                        />
                      </>
                    )}
                  </Card>

                  {/* Error Message */}
                  {selectedFailedItem.lastError && (
                    <Card className="mb-4 border border-rose-500/30">
                      <Text className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Error Message
                      </Text>
                      <Text className="text-slate-300 text-sm font-mono">
                        {selectedFailedItem.lastError}
                      </Text>
                    </Card>
                  )}

                  {/* Payload */}
                  {selectedFailedItem.payload && (
                    <Card className="mb-4">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Payload
                      </Text>
                      <ScrollView
                        horizontal
                        className="bg-white/5 rounded-lg p-3"
                      >
                        <Text className="text-slate-300 text-[10px] font-mono">
                          {JSON.stringify(selectedFailedItem.payload, null, 2)}
                        </Text>
                      </ScrollView>
                    </Card>
                  )}

                  {/* Entity Data */}
                  {selectedFailedItem.entityData && (
                    <Card className="mb-4">
                      <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                        Entity Data
                      </Text>
                      <ScrollView
                        horizontal
                        className="bg-white/5 rounded-lg p-3"
                      >
                        <Text className="text-slate-300 text-[10px] font-mono">
                          {JSON.stringify(
                            selectedFailedItem.entityData,
                            null,
                            2,
                          )}
                        </Text>
                      </ScrollView>
                    </Card>
                  )}

                  {/* Actions */}
                  <View className="flex-row gap-3 mt-4">
                    <ActionButton
                      title="Retry"
                      icon="refresh"
                      accent="sky"
                      onPress={async () => {
                        await handleRetrySingleItem(selectedFailedItem.id);
                        setShowItemDetail(false);
                      }}
                      disabled={retryingItemId === selectedFailedItem.id}
                    />
                    <ActionButton
                      title="Close"
                      icon="close"
                      accent="amber"
                      onPress={() => setShowItemDetail(false)}
                    />
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// import {
//   ActionButton,
//   Card,
//   Divider,
//   Header,
//   MetricCard,
//   Pill,
//   RowItem,
//   Screen,
//   SectionTitle,
//   StatRow,
// } from "@/components/app-ui";
// import { logout } from "@/services/features/auth/authSlice";
// import { resetOfflineState } from "@/services/features/offline/offlineSlice";
// import {
//   clearOfflineDatabase,
//   getOfflineDbSize,
//   resetDatabaseCompletely,
// } from "@/services/offline/db";
// import {
//   getFailedItemsWithDetails,
//   getSyncQueueSummary,
//   retryOutboxItem,
// } from "@/services/offline/repository";
// import { useSync } from "@/services/offline/syncManager";
// import { MaterialIcons } from "@expo/vector-icons";
// import React, { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Modal,
//   ScrollView,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { useDispatch } from "react-redux";

// export default function SyncScreen() {
//   const dispatch = useDispatch();

//   const {
//     isOnline,
//     isSyncing,
//     isLoading,
//     syncStatus,
//     syncError,
//     queueCount,
//     failedCount,
//     syncProgress,
//     lastSyncAt,
//     sync,
//     retry,
//     refresh,
//   } = useSync();

//   const [showFailedItems, setShowFailedItems] = useState(false);
//   const [failedItems, setFailedItems] = useState<any[]>([]);
//   const [queueSummary, setQueueSummary] = useState<any>(null);
//   const [dbSize, setDbSize] = useState<string>("0 KB");
//   const [isLoadingDetails, setIsLoadingDetails] = useState(false);
//   const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
//   const [isClearing, setIsClearing] = useState(false);

//   // Load details on mount
//   useEffect(() => {
//     loadDetails();
//     loadDbSize();
//   }, []);

//   // Refresh when coming back to screen
//   useEffect(() => {
//     const interval = setInterval(() => {
//       if (!isSyncing) {
//         loadDetails();
//         loadDbSize();
//       }
//     }, 30000);
//     return () => clearInterval(interval);
//   }, [isSyncing]);

//   const loadDetails = async () => {
//     setIsLoadingDetails(true);
//     try {
//       const summary = await getSyncQueueSummary();
//       setQueueSummary(summary);

//       const failed = await getFailedItemsWithDetails(50);
//       setFailedItems(failed);
//     } catch (error) {
//       console.error("Failed to load sync details:", error);
//     } finally {
//       setIsLoadingDetails(false);
//     }
//   };

//   const loadDbSize = async () => {
//     try {
//       const size = await getOfflineDbSize();
//       setDbSize(size);
//     } catch (error) {
//       console.error("Failed to get DB size:", error);
//     }
//   };

//   const handleSyncNow = () => {
//     sync({ force: true, silent: false });
//   };

//   const handleRetryAll = () => {
//     Alert.alert(
//       "Retry All Failed Items",
//       `This will retry ${failedCount} failed items. Are you sure?`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Retry All",
//           onPress: async () => {
//             const result = await retry();
//             if (result?.success) {
//               Alert.alert("Success", `${result.retried || 0} items retried.`);
//               await loadDetails();
//             } else {
//               Alert.alert("Error", result?.error || "Failed to retry items.");
//             }
//           },
//         },
//       ],
//     );
//   };

//   const handleRetrySingleItem = async (itemId: string) => {
//     setRetryingItemId(itemId);
//     try {
//       await retryOutboxItem(itemId);
//       await loadDetails();
//       Alert.alert("Success", "Item has been queued for retry.");
//     } catch (error) {
//       Alert.alert("Error", "Failed to retry item.");
//     } finally {
//       setRetryingItemId(null);
//     }
//   };

//   const handleClearDatabase = () => {
//     Alert.alert(
//       "Clear Offline Database",
//       "This will remove all offline data including products, orders, customers, and pending sync items. This action cannot be undone.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Clear All Data",
//           style: "destructive",
//           onPress: async () => {
//             setIsClearing(true);
//             try {
//               await clearOfflineDatabase();
//               await loadDetails();
//               await loadDbSize();
//               Alert.alert("Success", "Offline database cleared successfully.");
//             } catch (error) {
//               Alert.alert("Error", "Failed to clear database.");
//             } finally {
//               setIsClearing(false);
//             }
//           },
//         },
//       ],
//     );
//   };

//   const handleSignOut = async () => {
//     Alert.alert(
//       "Sign Out",
//       "Are you sure you want to sign out? All offline data will be cleared.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Sign Out",
//           style: "destructive",
//           onPress: async () => {
//             setIsClearing(true);
//             try {
//               await clearOfflineDatabase();
//               await resetDatabaseCompletely();
//               dispatch(resetOfflineState());
//               dispatch(logout());
//             } catch (error) {
//               Alert.alert("Error", "Failed to sign out.");
//               setIsClearing(false);
//             }
//           },
//         },
//       ],
//     );
//   };

//   const renderFailedItem = ({ item }: { item: any }) => (
//     <View className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10">
//       <View className="flex-row justify-between items-start">
//         <View className="flex-1">
//           <Text className="text-white font-semibold">
//             {item.entity} - {item.operation}
//           </Text>
//           <Text className="text-slate-400 text-xs mt-1">
//             ID: {item.entityId}
//           </Text>
//           {item.lastError && (
//             <Text className="text-rose-400 text-xs mt-1" numberOfLines={3}>
//               Error: {item.lastError}
//             </Text>
//           )}
//           <Text className="text-slate-500 text-[10px] mt-1">
//             Attempts: {item.attempts} •{" "}
//             {new Date(item.createdAt).toLocaleString()}
//           </Text>
//           {item.entityData && (
//             <Text className="text-slate-500 text-[9px] mt-0.5">
//               Data: {JSON.stringify(item.entityData).slice(0, 100)}
//               {JSON.stringify(item.entityData).length > 100 ? "..." : ""}
//             </Text>
//           )}
//         </View>
//         <TouchableOpacity
//           className="bg-sky-500/20 p-2 rounded-full ml-2"
//           onPress={() => handleRetrySingleItem(item.id)}
//           disabled={retryingItemId === item.id}
//         >
//           {retryingItemId === item.id ? (
//             <ActivityIndicator size="small" color="#38bdf8" />
//           ) : (
//             <MaterialIcons name="refresh" size={18} color="#38bdf8" />
//           )}
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   const getStatusColor = () => {
//     if (isSyncing) return "#38bdf8";
//     if (syncStatus === "failed") return "#f87171";
//     if (syncStatus === "complete") return "#34d399";
//     return "#94a3b8";
//   };

//   const getStatusLabel = () => {
//     if (isSyncing) return "Syncing...";
//     if (syncStatus === "failed") return "Failed";
//     if (syncStatus === "complete") return "Complete";
//     return "Idle";
//   };

//   return (
//     <Screen padded={false}>
//       <View className="px-5 pt-6 pb-4">
//         <Header
//           eyebrow="System Status"
//           title="Synchronization"
//           subtitle="Manage offline data and connectivity"
//           right={
//             <View className="items-end">
//               <Pill
//                 label={isOnline ? "ONLINE" : "OFFLINE"}
//                 tone={isOnline ? "emerald" : "rose"}
//               />
//               {isSyncing && (
//                 <Text className="text-sky-400 text-[10px] font-bold mt-1">
//                   SYNCING...
//                 </Text>
//               )}
//             </View>
//           }
//         />
//       </View>

//       <ScrollView
//         className="flex-1 px-5"
//         contentContainerStyle={{ paddingBottom: 40 }}
//         showsVerticalScrollIndicator={false}
//       >
//         {/* Status Section */}
//         <SectionTitle title="Overview" />

//         <View className="flex-row gap-3 mb-5 mt-2">
//           <MetricCard
//             icon="cloud-upload"
//             label="Pending"
//             value={queueCount?.toString() ?? "0"}
//             tone={queueCount > 0 ? "sky" : "emerald"}
//           />
//           <MetricCard
//             icon="error-outline"
//             label="Failed"
//             value={failedCount?.toString() ?? "0"}
//             tone={failedCount > 0 ? "rose" : "emerald"}
//           />
//           <MetricCard
//             icon="storage"
//             label="Database"
//             value={dbSize}
//             tone="amber"
//           />
//         </View>

//         {/* Sync Progress */}
//         {isSyncing && (
//           <Card className="mb-5">
//             <View className="flex-row items-center justify-between mb-2">
//               <Text className="text-slate-300 font-semibold text-xs uppercase tracking-widest">
//                 Syncing Progress
//               </Text>
//               <Text className="text-sky-400 font-bold text-xs">
//                 {Math.round(syncProgress)}%
//               </Text>
//             </View>
//             <View className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
//               <View
//                 className="h-full bg-sky-500 rounded-full transition-all duration-300"
//                 style={{ width: `${syncProgress}%` }}
//               />
//             </View>
//             <Text className="text-slate-400 text-xs mt-2 text-center">
//               {syncStatus === "syncing"
//                 ? "Synchronizing data..."
//                 : "Processing..."}
//             </Text>
//             {syncProgress > 0 && syncProgress < 100 && (
//               <View className="mt-2 flex-row justify-center gap-4">
//                 <Text className="text-slate-500 text-[10px]">
//                   ⚡ {Math.round((syncProgress / 100) * 30)}s elapsed
//                 </Text>
//               </View>
//             )}
//           </Card>
//         )}

//         {/* Error Display */}
//         {syncError && (
//           <Card className="mb-5 border border-rose-500/30 bg-rose-500/10">
//             <View className="flex-row items-start">
//               <MaterialIcons name="error-outline" size={20} color="#f87171" />
//               <View className="flex-1 ml-2">
//                 <Text className="text-rose-400 text-sm font-medium">
//                   {syncError}
//                 </Text>
//                 <TouchableOpacity onPress={handleRetryAll} className="mt-2">
//                   <Text className="text-sky-400 text-xs font-semibold">
//                     Retry All →
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </Card>
//         )}

//         {/* Last Sync Status */}
//         <Card className="mb-5">
//           <View className="flex-row items-center justify-between">
//             <View className="flex-row items-center">
//               <View
//                 className="w-2.5 h-2.5 rounded-full mr-2"
//                 style={{ backgroundColor: getStatusColor() }}
//               />
//               <Text className="text-slate-300 font-medium">
//                 Status: {getStatusLabel()}
//               </Text>
//             </View>
//             {lastSyncAt && (
//               <Text className="text-slate-500 text-xs">
//                 {new Date(lastSyncAt).toLocaleTimeString()}
//               </Text>
//             )}
//           </View>
//         </Card>

//         {/* Details Section */}
//         <SectionTitle
//           title="Sync Details"
//           action="Refresh"
//           onAction={() => {
//             refresh();
//             loadDetails();
//             loadDbSize();
//           }}
//         />

//         <Card className="mb-6">
//           <StatRow
//             label="Last Synced"
//             value={lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Never"}
//           />
//           <Divider />
//           <StatRow
//             label="Network Status"
//             value={isOnline ? "Connected" : "Disconnected"}
//             valueColor={isOnline ? "#34d399" : "#f87171"}
//           />
//           <Divider />
//           <StatRow
//             label="Sync Status"
//             value={getStatusLabel()}
//             valueColor={getStatusColor()}
//           />
//           <Divider />
//           <StatRow
//             label="Total Pending"
//             value={queueSummary?.pending?.toString() || "0"}
//           />
//           <Divider />
//           <StatRow
//             label="Total Failed"
//             value={queueSummary?.failed?.toString() || "0"}
//             valueColor={queueSummary?.failed > 0 ? "#f87171" : "#34d399"}
//           />
//           <Divider />
//           <StatRow
//             label="Total Dead"
//             value={queueSummary?.dead?.toString() || "0"}
//             valueColor={queueSummary?.dead > 0 ? "#fbbf24" : "#94a3b8"}
//           />
//           <Divider />
//           <StatRow
//             label="Total Synced"
//             value={queueSummary?.synced?.toString() || "0"}
//             valueColor="#34d399"
//           />

//           {/* Entity Breakdown */}
//           {queueSummary?.byEntity && (
//             <View className="mt-3 pt-3 border-t border-white/10">
//               <Text className="text-slate-400 text-xs uppercase tracking-widest font-semibold mb-2">
//                 Entity Breakdown
//               </Text>
//               {Object.entries(queueSummary.byEntity)
//                 .sort((a, b) => (a[1].total > b[1].total ? -1 : 1))
//                 .map(([entity, data]: [string, any]) => (
//                   <View key={entity} className="flex-row justify-between py-1">
//                     <Text className="text-slate-300 text-sm capitalize">
//                       {entity.replace(/_/g, " ")}
//                     </Text>
//                     <Text className="text-slate-400 text-sm">
//                       {data.pending > 0 && (
//                         <Text className="text-sky-400"> {data.pending}p</Text>
//                       )}
//                       {data.failed > 0 && (
//                         <Text className="text-rose-400"> {data.failed}f</Text>
//                       )}
//                       {data.synced > 0 && (
//                         <Text className="text-emerald-400">
//                           {" "}
//                           {data.synced}s
//                         </Text>
//                       )}
//                       <Text className="text-slate-500"> ({data.total})</Text>
//                     </Text>
//                   </View>
//                 ))}
//             </View>
//           )}
//         </Card>

//         {/* Failed Items Section */}
//         {failedCount > 0 && (
//           <>
//             <SectionTitle
//               title="Failed Items"
//               action={
//                 failedItems.length > 0
//                   ? `${failedItems.length} items`
//                   : undefined
//               }
//             />
//             <TouchableOpacity
//               className="bg-rose-500/10 rounded-xl p-4 mb-4 border border-rose-500/20"
//               onPress={() => setShowFailedItems(true)}
//             >
//               <View className="flex-row justify-between items-center">
//                 <View className="flex-row items-center">
//                   <MaterialIcons name="error" size={24} color="#f87171" />
//                   <Text className="text-white ml-3 font-semibold">
//                     {failedCount} items failed to sync
//                   </Text>
//                 </View>
//                 <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
//               </View>
//               <Text className="text-slate-400 text-xs mt-1">
//                 Tap to view and retry individual items
//               </Text>
//             </TouchableOpacity>
//           </>
//         )}

//         {/* Actions Section */}
//         <SectionTitle title="Actions" />

//         <View className="flex-row gap-3 mt-2 mb-3">
//           <ActionButton
//             title={isSyncing ? "Syncing..." : "Sync Now"}
//             icon="sync"
//             accent={isOnline && !isSyncing ? "sky" : "amber"}
//             onPress={isOnline && !isSyncing ? handleSyncNow : undefined}
//             disabled={isSyncing || !isOnline || isLoading}
//           />

//           {failedCount > 0 && (
//             <ActionButton
//               title="Retry All"
//               icon="refresh"
//               accent="rose"
//               onPress={isOnline && !isSyncing ? handleRetryAll : undefined}
//               disabled={isSyncing || !isOnline || isLoading}
//             />
//           )}
//         </View>

//         <View className="mt-2">
//           <RowItem
//             title="Refresh Statistics"
//             subtitle="Manually update queue counts"
//             icon="update"
//             onPress={() => {
//               refresh();
//               loadDetails();
//               loadDbSize();
//             }}
//           />
//           <RowItem
//             title="Clear Offline Database"
//             subtitle={`Current size: ${dbSize}`}
//             icon="delete-sweep"
//             accent="rose"
//             onPress={handleClearDatabase}
//             disabled={isClearing}
//           />
//           <RowItem
//             title="Sign Out"
//             subtitle="Clear data and return to login"
//             icon="logout"
//             accent="rose"
//             onPress={handleSignOut}
//             disabled={isClearing}
//           />
//         </View>

//         {/* Version Info */}
//         <View className="mt-6 items-center">
//           <Text className="text-slate-600 text-xs">
//             Offline Mode v2.0 • Data stored locally
//           </Text>
//           {isClearing && (
//             <View className="mt-2 flex-row items-center">
//               <ActivityIndicator size="small" color="#38bdf8" />
//               <Text className="text-slate-400 text-xs ml-2">Clearing...</Text>
//             </View>
//           )}
//           {isLoadingDetails && !isClearing && (
//             <ActivityIndicator size="small" color="#38bdf8" className="mt-2" />
//           )}
//         </View>
//       </ScrollView>

//       {/* Failed Items Modal */}
//       <Modal
//         visible={showFailedItems}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowFailedItems(false)}
//       >
//         <View className="flex-1 bg-black/80">
//           <View className="flex-1 bg-slate-900 rounded-t-3xl mt-12">
//             <View className="px-5 pt-5 pb-4 flex-1">
//               <View className="flex-row justify-between items-center mb-4">
//                 <Text className="text-white font-bold text-xl">
//                   Failed Items ({failedItems.length})
//                 </Text>
//                 <TouchableOpacity onPress={() => setShowFailedItems(false)}>
//                   <MaterialIcons name="close" size={24} color="#94a3b8" />
//                 </TouchableOpacity>
//               </View>

//               {/* Action buttons in modal */}
//               {failedItems.length > 0 && (
//                 <View className="flex-row gap-3 mb-4">
//                   <ActionButton
//                     title="Retry All"
//                     icon="refresh"
//                     accent="sky"
//                     onPress={async () => {
//                       const result = await retry();
//                       if (result?.success) {
//                         Alert.alert("Success", "All items retried.");
//                         await loadDetails();
//                         setFailedItems(await getFailedItemsWithDetails(50));
//                       }
//                     }}
//                     disabled={isSyncing || !isOnline}
//                   />
//                   <ActionButton
//                     title="Close"
//                     icon="close"
//                     accent="amber"
//                     onPress={() => setShowFailedItems(false)}
//                   />
//                 </View>
//               )}

//               {isLoadingDetails ? (
//                 <View className="flex-1 items-center justify-center">
//                   <ActivityIndicator size="large" color="#38bdf8" />
//                 </View>
//               ) : (
//                 <FlatList
//                   data={failedItems}
//                   keyExtractor={(item) => item.id}
//                   renderItem={renderFailedItem}
//                   showsVerticalScrollIndicator={false}
//                   ListEmptyComponent={
//                     <View className="items-center justify-center py-8">
//                       <MaterialIcons
//                         name="check-circle"
//                         size={48}
//                         color="#34d399"
//                       />
//                       <Text className="text-white mt-3 font-semibold">
//                         No failed items
//                       </Text>
//                       <Text className="text-slate-400 text-sm mt-1">
//                         All sync items are in good standing
//                       </Text>
//                     </View>
//                   }
//                   contentContainerStyle={{
//                     paddingBottom: 20,
//                   }}
//                 />
//               )}
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </Screen>
//   );
// }
