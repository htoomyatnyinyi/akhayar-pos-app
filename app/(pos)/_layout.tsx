import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "@/services/store/hooks";

export default function PosLayout() {
  const isPlatform = useAppSelector((state) => state.auth.isPlatform);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "POS",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />

      {isPlatform && (
        <Tabs.Screen
          name="customer"
          options={{
            title: "Customers",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens — accessible via navigation but not shown in tabs */}
      <Tabs.Screen
        name="checkout"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Checkout",
          headerTintColor: "#6366F1",
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Products",
          headerTintColor: "#6366F1",
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          href: null,
          headerShown: true,
          headerTitle: "Sync",
          headerTintColor: "#6366F1",
        }}
      />
    </Tabs>
  );
}
