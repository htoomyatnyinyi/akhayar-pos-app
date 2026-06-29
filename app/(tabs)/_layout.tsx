import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { OfflineSyncStatus } from "@/components/offline-sync-status";
import { HapticTab } from "@/components/haptic-tab";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

export default function TabLayout() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const showManagement = role === "ADMIN" || role === "MANAGER";

  return (
    <View className="flex-1 ">
      {/* style={{ flex: 1 }} */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarShowLabel: false,
          tabBarActiveTintColor: "#7dd3fc",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: {
            backgroundColor: "#0f172a",
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.08)",
            height: Platform.OS === "ios" ? 90 : 70,
            paddingBottom: Platform.OS === "ios" ? 28 : 12,
            paddingTop: 10,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="home-filled"
                size={22}
                color={focused ? "#7dd3fc" : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="receipt-long"
                size={22}
                color={focused ? "#86efac" : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Inventory",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="inventory-2"
                size={22}
                color={focused ? "#fbbf24" : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="dashboard"
                size={22}
                color={focused ? "#c084fc" : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="sync"
          options={{
            title: "Sync",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="sync"
                size={22}
                color={focused ? "#34d399" : color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="test-repo"
          options={{
            title: "TestRepo",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="storage"
                size={22}
                color={focused ? "#34d399" : color}
              />
            ),
          }}
        />

        {/* Always render the Screen, but use href to hide/show it */}
        <Tabs.Screen
          name="manage"
          options={{
            title: "Manage",
            href: showManagement ? "/manage" : null, // 👈 This is the clean Expo Router way!
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons
                name="admin-panel-settings"
                size={22}
                color={focused ? "#fbbf24" : color}
              />
            ),
          }}
        />
      </Tabs>

      {/* Absolute positioning wrapper around this component is completely fine here */}
      {/* <OfflineSyncStatus /> */}
    </View>
  );
}
// import { MaterialIcons } from "@expo/vector-icons";
// import { Tabs } from "expo-router";
// import { Platform, View } from "react-native";
// import { OfflineSyncStatus } from "@/components/offline-sync-status";
// import { HapticTab } from "@/components/haptic-tab";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// export default function TabLayout() {
//   const role = useAppSelector((state) => state.auth.user?.role);
//   const showManagement = role === "ADMIN" || role === "MANAGER";

//   return (
//     <View className="flex-1 bg-slate-950">
//       <Tabs
//         screenOptions={{
//           headerShown: false,
//           tabBarButton: HapticTab,
//           tabBarShowLabel: false,
//           tabBarActiveTintColor: "#7dd3fc",
//           tabBarInactiveTintColor: "#64748b",
//           tabBarStyle: {
//             backgroundColor: "#0f172a",
//             borderTopWidth: 1,
//             borderTopColor: "rgba(255,255,255,0.08)",
//             height: Platform.OS === "ios" ? 90 : 70,
//             paddingBottom: Platform.OS === "ios" ? 28 : 12,
//             paddingTop: 10,
//           },
//         }}
//       >
//         <Tabs.Screen
//           name="index"
//           options={{
//             title: "Home",
//             tabBarIcon: ({ color, focused }) => (
//               <MaterialIcons name="home-filled" size={22} color={focused ? "#7dd3fc" : color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="orders"
//           options={{
//             title: "Orders",
//             tabBarIcon: ({ color, focused }) => (
//               <MaterialIcons name="receipt-long" size={22} color={focused ? "#86efac" : color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="inventory"
//           options={{
//             title: "Inventory",
//             tabBarIcon: ({ color, focused }) => (
//               <MaterialIcons name="inventory-2" size={22} color={focused ? "#fbbf24" : color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="dashboard"
//           options={{
//             title: "Dashboard",
//             tabBarIcon: ({ color, focused }) => (
//               <MaterialIcons name="dashboard" size={22} color={focused ? "#c084fc" : color} />
//             ),
//           }}
//         />
//         <Tabs.Screen
//           name="sync"
//           options={{
//             title: "Sync",
//             tabBarIcon: ({ color, focused }) => (
//               <MaterialIcons name="sync" size={22} color={focused ? "#34d399" : color} />
//             ),
//           }}
//         />
//         {showManagement ? (
//           <Tabs.Screen
//             name="manage"
//             options={{
//               title: "Manage",
//               tabBarIcon: ({ color, focused }) => (
//                 <MaterialIcons name="admin-panel-settings" size={22} color={focused ? "#fbbf24" : color} />
//               ),
//             }}
//           />
//         ) : null}
//       </Tabs>
//       <OfflineSyncStatus />
//     </View>
//   );
// }
