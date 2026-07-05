// ============================================
// FILE: components/offline-sync-status.tsx
// ============================================

import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { syncNow } from "@/services/offline/syncManager";
import { store } from "@/services/store/store";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

export function OfflineSyncStatus() {
  const dispatch = useAppDispatch();
  const { isOnline, isSyncing, queuedCount, syncError, lastSyncAt } =
    useAppSelector((state) => state.offline);

  // Animation for smooth enter/exit
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Control visibility state
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor state changes to show/hide the popup
  useEffect(() => {
    // Clear any pending hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    // Show if offline, syncing, or has pending items
    const shouldShow = !isOnline || isSyncing || queuedCount > 0 || syncError;

    if (shouldShow) {
      setIsVisible(true);
      // Animate in
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else if (isVisible && !shouldShow && lastSyncAt) {
      // If online, not syncing, no pending items, and has synced before
      // Keep visible for 3 seconds then hide
      hideTimerRef.current = setTimeout(() => {
        // Animate out
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start(() => {
          setIsVisible(false);
        });
      }, 3000);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isOnline, isSyncing, queuedCount, syncError, lastSyncAt]);

  // If not visible, render nothing
  if (!isVisible) return null;

  // Determine status label and icon
  let statusLabel = "";
  let iconName: keyof typeof MaterialIcons.glyphMap = "cloud-off";
  let iconColor = "#fb7185";
  let bgColor = "bg-rose-950/95 border-rose-500/30";

  if (isSyncing) {
    statusLabel = "Syncing...";
    iconName = "sync";
    iconColor = "#38bdf8";
    bgColor = "bg-sky-950/95 border-sky-500/30";
  } else if (!isOnline) {
    statusLabel = `${queuedCount} offline`;
    iconName = "cloud-off";
    iconColor = "#fb7185";
    bgColor = "bg-rose-950/95 border-rose-500/30";
  } else if (syncError) {
    statusLabel = "Sync Error";
    iconName = "error-outline";
    iconColor = "#fb7185";
    bgColor = "bg-rose-950/95 border-rose-500/30";
  } else if (queuedCount > 0) {
    statusLabel = `${queuedCount} queued`;
    iconName = "sync";
    iconColor = "#fbbf24";
    bgColor = "bg-amber-950/95 border-amber-500/30";
  } else {
    statusLabel = "Online";
    iconName = "cloud-done";
    iconColor = "#34d399";
    bgColor = "bg-emerald-950/95 border-emerald-500/30";
  }

  // Get status message
  let statusMessage = "";
  if (syncError) {
    statusMessage = syncError;
  } else if (isSyncing) {
    statusMessage = "Synchronizing data with server...";
  } else if (!isOnline) {
    statusMessage =
      queuedCount > 0
        ? "Working offline. Changes will sync when online."
        : "You are offline. No pending changes.";
  } else if (queuedCount > 0) {
    statusMessage =
      "Pending changes will be pushed to the server automatically.";
  } else {
    statusMessage = "Everything is synced and up to date.";
  }

  const isPressable = isOnline && !isSyncing && (queuedCount > 0 || syncError);

  return (
    <Animated.View
      className="absolute left-4 right-4 top-3 z-50"
      style={{
        opacity: slideAnim,
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync offline changes"
        disabled={!isPressable}
        onPress={() => {
          if (isPressable) {
            syncNow(dispatch, store.getState);
          }
        }}
        className={`rounded-[20px] border px-4 py-3 ${bgColor}`}
      >
        <View className="flex-row items-start gap-3">
          <View
            className={`h-10 w-10 items-center justify-center rounded-2xl ${isOnline ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
          >
            <MaterialIcons name={iconName} size={20} color={iconColor} />
          </View>

          <View className="flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-[3px] text-slate-400">
              {statusLabel}
            </Text>
            <Text className="mt-1 text-sm text-white">{statusMessage}</Text>
            {lastSyncAt && (
              <Text className="mt-2 text-[11px] text-slate-500">
                Last sync {new Date(lastSyncAt).toLocaleTimeString()}
              </Text>
            )}
          </View>

          {isPressable && (
            <MaterialIcons name="arrow-forward-ios" size={14} color="#94a3b8" />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// import { useState, useEffect } from "react"; // 1. Import hooks
// import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// import { Pressable, Text, View } from "react-native";
// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import { syncNow } from "@/services/offline/syncManager";
// import { store } from "@/services/store/store";

// export function OfflineSyncStatus() {
//   const dispatch = useAppDispatch();
//   const { isOnline, isSyncing, queuedCount, lastError, lastSyncedAt } =
//     useAppSelector((state) => state.offline);

//   // 2. Control visibility state
//   const [isVisible, setIsVisible] = useState(false);

//   // 3. Monitor state changes to show/hide the popup
//   useEffect(() => {
//     if (!isOnline || queuedCount > 0 || isSyncing) {
//       // Show it if they are offline, syncing, or have items queued
//       setIsVisible(true);
//     } else if (isOnline && queuedCount === 0 && lastSyncedAt) {
//       // If they just finished syncing successfully, keep it up for 3 seconds, then hide
//       const timer = setTimeout(() => {
//         setIsVisible(false);
//       }, 3000);

//       return () => clearTimeout(timer);
//     }
//   }, [isOnline, queuedCount, isSyncing, lastSyncedAt]);

//   // 4. If not visible, render nothing
//   if (!isVisible) return null;

//   const label = isSyncing
//     ? "Syncing queue"
//     : isOnline
//       ? queuedCount > 0
//         ? `${queuedCount} queued`
//         : "Online"
//       : `${queuedCount} offline`;

//   return (
//     <View className="absolute left-4 right-4 top-3 z-50">
//       <Pressable
//         accessibilityRole="button"
//         accessibilityLabel="Sync offline changes"
//         disabled={!isOnline || isSyncing}
//         onPress={() => syncNow(dispatch, store.getState)}
//         className={`rounded-[20px] border px-4 py-3 ${
//           isOnline
//             ? "bg-slate-900/95 border-emerald-500/20"
//             : "bg-rose-950/95 border-rose-500/30"
//         }`}
//       >
//         <View className="flex-row items-start gap-3">
//           <View
//             className={`h-10 w-10 items-center justify-center rounded-2xl ${isOnline ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
//           >
//             <MaterialIcons
//               name={
//                 isOnline
//                   ? queuedCount > 0
//                     ? "sync"
//                     : "cloud-done"
//                   : "cloud-off"
//               }
//               size={20}
//               color={isOnline ? "#34d399" : "#fb7185"}
//             />
//           </View>
//           <View className="flex-1">
//             <Text className="text-[11px] font-bold uppercase tracking-[3px] text-slate-400">
//               {label}
//             </Text>
//             <Text className="mt-1 text-sm text-white">
//               {lastError
//                 ? lastError
//                 : isOnline
//                   ? queuedCount > 0
//                     ? "Queued actions will be pushed automatically."
//                     : "Everything is synced."
//                   : "Working offline. Changes are stored locally."}
//             </Text>
//             <Text className="mt-2 text-[11px] text-slate-500">
//               {lastSyncedAt
//                 ? `Last sync ${new Date(lastSyncedAt).toLocaleTimeString()}`
//                 : "No sync yet"}
//             </Text>
//           </View>
//           <MaterialIcons name="arrow-forward-ios" size={14} color="#94a3b8" />
//         </View>
//       </Pressable>
//     </View>
//   );
// }
// // import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// // import { Pressable, Text, View } from "react-native";
// // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // import { syncNow } from "@/services/offline/syncManager";
// // import { store } from "@/services/store/store";

// // export function OfflineSyncStatus() {
// //   const dispatch = useAppDispatch();
// //   const { isOnline, isSyncing, queuedCount, lastError, lastSyncedAt } =
// //     useAppSelector((state) => state.offline);

// //   const label = isSyncing
// //     ? "Syncing queue"
// //     : isOnline
// //       ? queuedCount > 0
// //         ? `${queuedCount} queued`
// //         : "Online"
// //       : `${queuedCount} offline`;

// //   return (
// //     <View className="absolute left-4 right-4 top-3 z-50">
// //       <Pressable
// //         accessibilityRole="button"
// //         accessibilityLabel="Sync offline changes"
// //         disabled={!isOnline || isSyncing}
// //         onPress={() => syncNow(dispatch, store.getState)}
// //         className={`rounded-[20px] border px-4 py-3 ${
// //           isOnline
// //             ? "bg-slate-900/95 border-emerald-500/20"
// //             : "bg-rose-950/95 border-rose-500/30"
// //         }`}
// //       >
// //         <View className="flex-row items-start gap-3">
// //           <View
// //             className={`h-10 w-10 items-center justify-center rounded-2xl ${isOnline ? "bg-emerald-500/10" : "bg-rose-500/10"}`}
// //           >
// //             <MaterialIcons
// //               name={
// //                 isOnline
// //                   ? queuedCount > 0
// //                     ? "sync"
// //                     : "cloud-done"
// //                   : "cloud-off"
// //               }
// //               size={20}
// //               color={isOnline ? "#34d399" : "#fb7185"}
// //             />
// //           </View>
// //           <View className="flex-1">
// //             <Text className="text-[11px] font-bold uppercase tracking-[3px] text-slate-400">
// //               {label}
// //             </Text>
// //             <Text className="mt-1 text-sm text-white">
// //               {lastError
// //                 ? lastError
// //                 : isOnline
// //                   ? queuedCount > 0
// //                     ? "Queued actions will be pushed automatically."
// //                     : "Everything is synced."
// //                   : "Working offline. Changes are stored locally."}
// //             </Text>
// //             <Text className="mt-2 text-[11px] text-slate-500">
// //               {lastSyncedAt
// //                 ? `Last sync ${new Date(lastSyncedAt).toLocaleTimeString()}`
// //                 : "No sync yet"}
// //             </Text>
// //           </View>
// //           <MaterialIcons name="arrow-forward-ios" size={14} color="#94a3b8" />
// //         </View>
// //       </Pressable>
// //     </View>
// //   );
// // }
