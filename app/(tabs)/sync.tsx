// app/(tabs)/sync.tsx
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Screen,
  Header,
  Pill,
  Card,
  RowItem,
  SectionTitle,
  StatRow,
  Divider,
} from "@/components/app-ui";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { syncNow, voidOrder } from "@/services/offline/syncManager";
import { store } from "@/services/store/store";
import { getOutboxItems, retryOutboxItem } from "@/services/offline/repository";
import { logout } from "@/services/features/auth/authSlice";
import { router } from "expo-router";

type OutboxRow = Awaited<ReturnType<typeof getOutboxItems>>[number];

export default function SyncScreen() {
  const dispatch = useAppDispatch();
  const offline = useAppSelector((state) => state.offline);
  const [items, setItems] = useState<OutboxRow[]>([]);

  const load = async () => {
    const rows = await getOutboxItems(100);
    setItems(rows);
  };

  useEffect(() => {
    void load();
  }, [offline.queuedCount, offline.syncError, offline.isSyncing]);

  const failed = useMemo(
    () =>
      items.filter(
        (item) => item.status === "failed" || item.status === "dead",
      ),
    [items],
  );

  const refresh = async () => {
    await syncNow(dispatch, store.getState);
    await load();
  };

  const retryOne = async (id: string) => {
    await retryOutboxItem(id);
    await refresh();
  };

  const retryAll = async () => {
    const failedItems = items.filter(
      (item) => item.status === "failed" || item.status === "dead",
    );
    for (const item of failedItems) {
      await retryOutboxItem(item.id);
    }
    await refresh();
  };

  const handleVoidOrder = async (orderId: string) => {
    Alert.alert(
      "Void Order",
      "Are you sure you want to void this order? This will remove it from the sync queue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Void",
          style: "destructive",
          onPress: async () => {
            const result = await voidOrder(orderId);
            if (result.success) {
              Alert.alert("Success", "Order voided successfully");
              await refresh();
            } else {
              Alert.alert("Error", "Failed to void order");
            }
          },
        },
      ],
    );
  };

  const handleSignout = async () => {
    dispatch(logout());
    router.replace("/(auth)/login");
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <Header
            eyebrow="Synchronization"
            title="Offline queue"
            subtitle="Review queued actions, inspect failures, and trigger a manual sync when needed."
            right={
              <Pill
                label={offline.isOnline ? "Connected" : "Offline"}
                tone={offline.isOnline ? "emerald" : "rose"}
              />
            }
          />

          <View className="mb-4 mt-4 flex-row gap-3">
            <Pressable
              onPress={handleSignout}
              className="flex-1 rounded-full bg-rose-500/20 px-3 py-2 border border-rose-400/30"
            >
              <Text className="text-center text-xs font-bold uppercase tracking-[2px] text-rose-200">
                Sign Out
              </Text>
            </Pressable>
            <Pressable
              onPress={refresh}
              className="flex-1 rounded-full bg-sky-500/20 px-3 py-2 border border-sky-400/30"
            >
              <Text className="text-center text-xs font-bold uppercase tracking-[2px] text-sky-200">
                Refresh
              </Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Card>
                <StatRow label="Queued" value={String(offline.queuedCount)} />
                <StatRow label="Failed" value={String(failed.length)} />
              </Card>
            </View>

            <View className="flex-1">
              <Card>
                <StatRow
                  label="Mode"
                  value={
                    offline.isOnline ? "Online + offline" : "Offline first"
                  }
                />
                <StatRow
                  label="Status"
                  value={offline.isSyncing ? "Syncing" : "Idle"}
                />
              </Card>
            </View>
          </View>

          <Card className="mb-4">
            <View className="flex-row gap-3">
              <Pressable
                onPress={refresh}
                className="flex-1 flex-row items-center justify-center rounded-2xl bg-emerald-500/20 px-4 py-4 border border-emerald-400/30"
              >
                <MaterialIcons name="sync" size={20} color="#6ee7b7" />
                <Text className="ml-2 text-base font-bold text-emerald-200">
                  Sync Now
                </Text>
              </Pressable>
              {failed.length > 0 && (
                <Pressable
                  onPress={retryAll}
                  className="flex-1 flex-row items-center justify-center rounded-2xl bg-amber-500/20 px-4 py-4 border border-amber-400/30"
                >
                  <MaterialIcons name="refresh" size={20} color="#fcd34d" />
                  <Text className="ml-2 text-base font-bold text-amber-200">
                    Retry All
                  </Text>
                </Pressable>
              )}
            </View>
            {offline.syncError ? (
              <>
                <Divider />
                <Text className="text-xs font-bold uppercase tracking-[3px] text-amber-300">
                  Last error
                </Text>
                <Text className="mt-2 text-sm text-slate-300">
                  {offline.syncError}
                </Text>
              </>
            ) : null}
          </Card>

          <SectionTitle title="Failed items" action="Retryable" />
          <Card className="mb-4">
            {failed.length ? (
              failed.map((item, index) => (
                <View key={item.id}>
                  <RowItem
                    title={`${item.entity} • ${item.operation}`}
                    subtitle={`${item.method} ${item.endpoint}`}
                    right={`${item.attempts} attempts`}
                    icon="error-outline"
                  />
                  <Text className="mt-2 text-xs text-rose-300">
                    {item.lastError ?? "Unknown error"}
                  </Text>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-[10px] font-bold uppercase tracking-[3px] text-slate-500">
                      Next {new Date(item.nextAttemptAt).toLocaleString()}
                    </Text>
                    <View className="flex-row gap-2">
                      {item.entity === "orders" && (
                        <Pressable
                          onPress={() => handleVoidOrder(item.entityId)}
                          className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2"
                        >
                          <Text className="text-xs font-bold uppercase tracking-[2px] text-rose-200">
                            Void
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => retryOne(item.id)}
                        className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2"
                      >
                        <Text className="text-xs font-bold uppercase tracking-[2px] text-sky-200">
                          Retry now
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {index < failed.length - 1 ? (
                    <View className="my-4 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-8 text-center text-sm text-slate-400">
                No failed actions right now.
              </Text>
            )}
          </Card>

          <SectionTitle title="All queued actions" />
          <Card>
            {items.length ? (
              items.map((item, index) => (
                <View key={item.id}>
                  <RowItem
                    title={`${item.entity} • ${item.status}`}
                    subtitle={`${item.operation} • ${item.attempts} attempts`}
                    right={item.method}
                    icon={
                      item.status === "dead"
                        ? "block"
                        : item.status === "failed"
                          ? "warning"
                          : "schedule"
                    }
                  />
                  {index < items.length - 1 ? (
                    <View className="my-3 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-8 text-center text-sm text-slate-400">
                Queue is empty.
              </Text>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
// // app/(tabs)/sync.tsx
// import { useEffect, useMemo, useState } from "react";
// import { Pressable, ScrollView, Text, View } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { MaterialIcons } from "@expo/vector-icons";
// import {
//   Screen,
//   Header,
//   Pill,
//   Card,
//   RowItem,
//   SectionTitle,
//   StatRow,
//   Divider,
// } from "@/components/app-ui";
// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import { syncNow } from "@/services/offline/syncManager";
// import { store } from "@/services/store/store";
// import { getOutboxItems, retryOutboxItem } from "@/services/offline/repository";
// import { logout, setStore } from "@/services/features/auth/authSlice";
// import { router } from "expo-router";

// type OutboxRow = Awaited<ReturnType<typeof getOutboxItems>>[number];

// export default function SyncScreen() {
//   const dispatch = useAppDispatch();
//   const offline = useAppSelector((state) => state.offline);
//   const [items, setItems] = useState<OutboxRow[]>([]);

//   const load = async () => {
//     const rows = await getOutboxItems(100);
//     setItems(rows);
//   };

//   useEffect(() => {
//     void load();
//   }, [offline.queuedCount, offline.syncError, offline.isSyncing]);

//   const failed = useMemo(
//     () =>
//       items.filter(
//         (item) => item.status === "failed" || item.status === "dead",
//       ),
//     [items],
//   );

//   const refresh = async () => {
//     await syncNow(dispatch, store.getState);
//     await load();
//   };

//   const retryOne = async (id: string) => {
//     await retryOutboxItem(id);
//     await refresh();
//   };

//   const retryAll = async () => {
//     const failedItems = items.filter(
//       (item) => item.status === "failed" || item.status === "dead",
//     );
//     for (const item of failedItems) {
//       await retryOutboxItem(item.id);
//     }
//     await refresh();
//   };

//   const handleSignout = async () => {
//     dispatch(logout());
//     router.replace("/(auth)/login");
//   };

//   return (
//     <Screen>
//       <SafeAreaView className="flex-1">
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 28 }}
//         >
//           <Header
//             eyebrow="Synchronization"
//             title="Offline queue"
//             subtitle="Review queued actions, inspect failures, and trigger a manual sync when needed."
//             right={
//               <Pill
//                 label={offline.isOnline ? "Connected" : "Offline"}
//                 tone={offline.isOnline ? "emerald" : "rose"}
//               />
//             }
//           />

//           <View className="mb-4 mt-4 flex-row gap-3">
//             <Pressable
//               onPress={handleSignout}
//               className="flex-1 rounded-full bg-rose-500/20 px-3 py-2 border border-rose-400/30"
//             >
//               <Text className="text-center text-xs font-bold uppercase tracking-[2px] text-rose-200">
//                 Sign Out
//               </Text>
//             </Pressable>
//             <Pressable
//               onPress={refresh}
//               className="flex-1 rounded-full bg-sky-500/20 px-3 py-2 border border-sky-400/30"
//             >
//               <Text className="text-center text-xs font-bold uppercase tracking-[2px] text-sky-200">
//                 Refresh
//               </Text>
//             </Pressable>
//           </View>

//           <View className="mb-4 flex-row gap-3">
//             <View className="flex-1">
//               <Card>
//                 <StatRow label="Queued" value={String(offline.queuedCount)} />
//                 <StatRow label="Failed" value={String(failed.length)} />
//               </Card>
//             </View>

//             <View className="flex-1">
//               <Card>
//                 <StatRow
//                   label="Mode"
//                   value={
//                     offline.isOnline ? "Online + offline" : "Offline first"
//                   }
//                 />
//                 <StatRow
//                   label="Status"
//                   value={offline.isSyncing ? "Syncing" : "Idle"}
//                 />
//               </Card>
//             </View>
//           </View>

//           <Card className="mb-4">
//             <View className="flex-row gap-3">
//               <Pressable
//                 onPress={refresh}
//                 className="flex-1 flex-row items-center justify-center rounded-2xl bg-emerald-500/20 px-4 py-4 border border-emerald-400/30"
//               >
//                 <MaterialIcons name="sync" size={20} color="#6ee7b7" />
//                 <Text className="ml-2 text-base font-bold text-emerald-200">
//                   Sync Now
//                 </Text>
//               </Pressable>
//               {failed.length > 0 && (
//                 <Pressable
//                   onPress={retryAll}
//                   className="flex-1 flex-row items-center justify-center rounded-2xl bg-amber-500/20 px-4 py-4 border border-amber-400/30"
//                 >
//                   <MaterialIcons name="refresh" size={20} color="#fcd34d" />
//                   <Text className="ml-2 text-base font-bold text-amber-200">
//                     Retry All
//                   </Text>
//                 </Pressable>
//               )}
//             </View>
//             {offline.syncError ? (
//               <>
//                 <Divider />
//                 <Text className="text-xs font-bold uppercase tracking-[3px] text-amber-300">
//                   Last error
//                 </Text>
//                 <Text className="mt-2 text-sm text-slate-300">
//                   {offline.syncError}
//                 </Text>
//               </>
//             ) : null}
//           </Card>

//           <SectionTitle title="Failed items" action="Retryable" />
//           <Card className="mb-4">
//             {failed.length ? (
//               failed.map((item, index) => (
//                 <View key={item.id}>
//                   <RowItem
//                     title={`${item.entity} • ${item.operation}`}
//                     subtitle={`${item.method} ${item.endpoint}`}
//                     right={`${item.attempts} attempts`}
//                     icon="error-outline"
//                   />
//                   <Text className="mt-2 text-xs text-rose-300">
//                     {item.lastError ?? "Unknown error"}
//                   </Text>
//                   <View className="mt-3 flex-row items-center justify-between">
//                     <Text className="text-[10px] font-bold uppercase tracking-[3px] text-slate-500">
//                       Next {new Date(item.nextAttemptAt).toLocaleString()}
//                     </Text>
//                     <Pressable
//                       onPress={() => retryOne(item.id)}
//                       className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2"
//                     >
//                       <Text className="text-xs font-bold uppercase tracking-[2px] text-sky-200">
//                         Retry now
//                       </Text>
//                     </Pressable>
//                   </View>
//                   {index < failed.length - 1 ? (
//                     <View className="my-4 h-px bg-white/8" />
//                   ) : null}
//                 </View>
//               ))
//             ) : (
//               <Text className="py-8 text-center text-sm text-slate-400">
//                 No failed actions right now.
//               </Text>
//             )}
//           </Card>

//           <SectionTitle title="All queued actions" />
//           <Card>
//             {items.length ? (
//               items.map((item, index) => (
//                 <View key={item.id}>
//                   <RowItem
//                     title={`${item.entity} • ${item.status}`}
//                     subtitle={`${item.operation} • ${item.attempts} attempts`}
//                     right={item.method}
//                     icon={
//                       item.status === "dead"
//                         ? "block"
//                         : item.status === "failed"
//                           ? "warning"
//                           : "schedule"
//                     }
//                   />
//                   {index < items.length - 1 ? (
//                     <View className="my-3 h-px bg-white/8" />
//                   ) : null}
//                 </View>
//               ))
//             ) : (
//               <Text className="py-8 text-center text-sm text-slate-400">
//                 Queue is empty.
//               </Text>
//             )}
//           </Card>
//         </ScrollView>
//       </SafeAreaView>
//     </Screen>
//   );
// }

// // import { useEffect, useMemo, useState } from "react";
// // import { Pressable, ScrollView, Text, View } from "react-native";
// // import { SafeAreaView } from "react-native-safe-area-context";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import {
// //   Screen,
// //   Header,
// //   Pill,
// //   Card,
// //   RowItem,
// //   SectionTitle,
// //   StatRow,
// //   Divider,
// // } from "@/components/app-ui";
// // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // import { syncNow } from "@/services/offline/syncManager";
// // import { store } from "@/services/store/store";
// // import { getOutboxItems, retryOutboxItem } from "@/services/offline/repository";
// // import { logout, setStore } from "@/services/features/auth/authSlice";
// // import { router } from "expo-router";

// // type OutboxRow = Awaited<ReturnType<typeof getOutboxItems>>[number];

// // export default function SyncScreen() {
// //   const dispatch = useAppDispatch();
// //   const offline = useAppSelector((state) => state.offline);
// //   const [items, setItems] = useState<OutboxRow[]>([]);

// //   const load = async () => {
// //     const rows = await getOutboxItems(100);
// //     setItems(rows);
// //   };

// //   useEffect(() => {
// //     void load();
// //   }, [offline.queuedCount, offline.syncError, offline.isSyncing]);
// //   // useEffect(() => {
// //   //   void load();
// //   // }, [offline.queuedCount, offline.lastError, offline.isSyncing]);

// //   const failed = useMemo(
// //     () =>
// //       items.filter(
// //         (item) => item.status === "failed" || item.status === "dead",
// //       ),
// //     [items],
// //   );

// //   const refresh = async () => {
// //     await syncNow(dispatch, store.getState);
// //     await load();
// //   };

// //   const retryOne = async (id: string) => {
// //     await retryOutboxItem(id);
// //     await refresh();
// //   };

// //   const handleSignout = async () => {
// //     dispatch(logout());
// //     router.replace("/(auth)/login");
// //   };

// //   return (
// //     <Screen>
// //       <SafeAreaView className="flex-1">
// //         <ScrollView
// //           showsVerticalScrollIndicator={false}
// //           contentContainerStyle={{ paddingBottom: 28 }}
// //         >
// //           <Header
// //             eyebrow="Synchronization"
// //             title="Offline queue"
// //             subtitle="Review queued actions, inspect failures, and trigger a manual sync when needed."
// //             right={
// //               <Pill
// //                 label={offline.isOnline ? "Connected" : "Offline"}
// //                 tone={offline.isOnline ? "emerald" : "rose"}
// //               />
// //             }
// //           />

// //           <View className="mb-4 mt-4 flex-1 ">
// //             <Pressable
// //               onPress={handleSignout}
// //               className="w-full rounded-full bg-rose-500 px-3 py-2"
// //             >
// //               <Text className="text-xs font-bold uppercase tracking-[2px] text-white ">
// //                 Signout
// //               </Text>
// //             </Pressable>
// //           </View>

// //           <View className="mb-4 flex-row gap-3">
// //             <View className="flex-1">
// //               <Card>
// //                 <StatRow label="Queued" value={String(offline.queuedCount)} />
// //                 <StatRow label="Failed" value={String(failed.length)} />
// //               </Card>
// //             </View>

// //             <View className="flex-1">
// //               <Card>
// //                 <StatRow
// //                   label="Mode"
// //                   value={
// //                     offline.isOnline ? "Online + offline" : "Offline first"
// //                   }
// //                 />
// //                 <StatRow
// //                   label="Status"
// //                   value={offline.isSyncing ? "Syncing" : "Idle"}
// //                 />
// //               </Card>
// //             </View>
// //           </View>

// //           <Card className="mb-4">
// //             <Pressable
// //               onPress={refresh}
// //               className="flex-row items-center justify-center rounded-2xl  bg-blue-950 px-4 py-4"
// //             >
// //               <MaterialIcons name="sync" size={20} color="#fff" />
// //               <Text className="ml-2 text-base font-bold text-white">
// //                 Run manual sync
// //               </Text>
// //             </Pressable>
// //             {offline.syncError ? (
// //               <>
// //                 <Divider />
// //                 <Text className="text-xs font-bold uppercase tracking-[3px] text-amber-300">
// //                   Last error
// //                 </Text>
// //                 <Text className="mt-2 text-sm text-slate-300">
// //                   {offline.syncError}
// //                 </Text>
// //               </>
// //             ) : null}
// //           </Card>

// //           <SectionTitle title="Failed items" action="Retryable" />
// //           <Card className="mb-4">
// //             {failed.length ? (
// //               failed.map((item, index) => (
// //                 <View key={item.id}>
// //                   <RowItem
// //                     title={`${item.entity} • ${item.operation}`}
// //                     subtitle={`${item.method} ${item.endpoint}`}
// //                     right={`${item.attempts} attempts`}
// //                     icon="error-outline"
// //                   />
// //                   <Text className="mt-2 text-xs text-rose-300">
// //                     {item.lastError ?? "Unknown error"}
// //                   </Text>
// //                   <View className="mt-3 flex-row items-center justify-between">
// //                     <Text className="text-[10px] font-bold uppercase tracking-[3px] text-slate-500">
// //                       Next {new Date(item.nextAttemptAt).toLocaleString()}
// //                     </Text>
// //                     <Pressable
// //                       onPress={() => retryOne(item.id)}
// //                       className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2"
// //                     >
// //                       <Text className="text-xs font-bold uppercase tracking-[2px] text-sky-200">
// //                         Retry now
// //                       </Text>
// //                     </Pressable>
// //                   </View>
// //                   {index < failed.length - 1 ? (
// //                     <View className="my-4 h-px bg-white/8" />
// //                   ) : null}
// //                 </View>
// //               ))
// //             ) : (
// //               <Text className="py-8 text-center text-sm text-slate-400">
// //                 No failed actions right now.
// //               </Text>
// //             )}
// //           </Card>

// //           <SectionTitle title="All queued actions" />
// //           <Card>
// //             {items.length ? (
// //               items.map((item, index) => (
// //                 <View key={item.id}>
// //                   <RowItem
// //                     title={`${item.entity} • ${item.status}`}
// //                     subtitle={`${item.operation} • ${item.attempts} attempts`}
// //                     right={item.method}
// //                     icon={
// //                       item.status === "dead"
// //                         ? "block"
// //                         : item.status === "failed"
// //                           ? "warning"
// //                           : "schedule"
// //                     }
// //                   />
// //                   {index < items.length - 1 ? (
// //                     <View className="my-3 h-px bg-white/8" />
// //                   ) : null}
// //                 </View>
// //               ))
// //             ) : (
// //               <Text className="py-8 text-center text-sm text-slate-400">
// //                 Queue is empty.
// //               </Text>
// //             )}
// //           </Card>
// //         </ScrollView>
// //       </SafeAreaView>
// //     </Screen>
// //   );
// // }
