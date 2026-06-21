import { Tabs } from "expo-router";
import { Platform, View, Text } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { OfflineSyncStatus } from "@/components/offline-sync-status";

export default function TabLayout() {
  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: "#8b5cf6", // Neon Indigo
          tabBarInactiveTintColor: "#64748b", // Slate Gray
          tabBarStyle: {
            backgroundColor: "#161925", // Aero Slate
            borderTopWidth: 1,
            borderTopColor: "#1f2232",
            height: Platform.OS === "ios" ? 90 : 70,
            paddingBottom: Platform.OS === "ios" ? 28 : 12,
            paddingTop: 12,
            elevation: 0,
          },
          tabBarShowLabel: false,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Terminal",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`items-center justify-center w-14 h-10 rounded-[14px] transition-colors ${focused ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-transparent border border-transparent"}`}
            >
              {/* <Text className="text-xl mb-0.5" style={{ color: focused ? '#8b5cf6' : '#64748b', opacity: focused ? 1 : 0.7 }}>⌨️</Text> */}
              <MaterialIcons name="keyboard-hide" size={20} color="#9333ea" />
              {focused && (
                <View className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Sales",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`items-center justify-center w-14 h-10 rounded-[14px] transition-colors ${focused ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-transparent border border-transparent"}`}
            >
              {/* <Text className="text-xl mb-0.5" style={{ color: focused ? '#10b981' : '#64748b', opacity: focused ? 1 : 0.7 }}>🧾</Text> */}
              <MaterialIcons name="receipt-long" size={20} color="#10b981" />
              {focused && (
                <View className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`items-center justify-center w-14 h-10 rounded-[14px] transition-colors ${focused ? "bg-amber-500/10 border border-amber-500/20" : "bg-transparent border border-transparent"}`}
            >
              {/* <Text className="text-xl mb-0.5" style={{ color: focused ? '#f59e0b' : '#64748b', opacity: focused ? 1 : 0.7 }}>📦</Text> */}
              <MaterialIcons name="inventory" size={20} color="#f59e0b" />
              {focused && (
                <View className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`items-center justify-center w-14 h-10 rounded-[14px] transition-colors ${focused ? "bg-purple-500/10 border border-purple-500/20" : "bg-transparent border border-transparent"}`}
            >
              {/* <Text className="text-xl mb-0.5" style={{ color: focused ? '#a855f7' : '#64748b', opacity: focused ? 1 : 0.7 }}>📊</Text> */}
              <MaterialIcons name="dashboard" size={20} color="#a855f7" />
              {focused && (
                <View className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </View>
          ),
        }}
      />
      </Tabs>
      <OfflineSyncStatus />
    </View>
  );
}
