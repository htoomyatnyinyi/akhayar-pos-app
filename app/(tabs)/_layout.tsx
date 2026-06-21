import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { OfflineSyncStatus } from "@/components/offline-sync-status";
import { HapticTab } from "@/components/haptic-tab";

export default function TabLayout() {
  return (
    <View className="flex-1 bg-slate-950">
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
              <MaterialIcons name="home-filled" size={22} color={focused ? "#7dd3fc" : color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name="receipt-long" size={22} color={focused ? "#86efac" : color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Inventory",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name="inventory-2" size={22} color={focused ? "#fbbf24" : color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, focused }) => (
              <MaterialIcons name="dashboard" size={22} color={focused ? "#c084fc" : color} />
            ),
          }}
        />
      </Tabs>
      <OfflineSyncStatus />
    </View>
  );
}

