import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
// import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { useAppDispatch, useAppSelector } from "@/services/store/hooks";
// import { logout } from "../../../store/slices/authSlice";
import { logout } from "@/services/features/auth/authSlice";
import { Ionicons } from "@expo/vector-icons";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isPlatform = useAppSelector((state) => state.auth.isPlatform);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      icon: "storefront",
      title: "Stores",
      onPress: () => router.push("/more/stores"),
    },
    {
      icon: "people",
      title: "Staff",
      onPress: () => router.push("/more/staff"),
    },
    {
      icon: "settings-outline",
      title: "Settings",
      onPress: () => router.push("/more/settings"),
    },
    { icon: "sync", title: "Sync", onPress: () => router.push("/more/sync") },
    {
      icon: "document-text-outline",
      title: "Reports",
      onPress: () => router.push("/more/reports"),
    },
    {
      icon: "information-circle-outline",
      title: "About",
      onPress: () => Alert.alert("About", "Oasis POS v1.0.0"),
    },
  ];

  const platformItems: MenuItem[] = [
    {
      icon: "business",
      title: "Tenants",
      onPress: () => router.push("/more/tenants"),
    },
    {
      icon: "server",
      title: "System",
      onPress: () => router.push("/more/system"),
    },
  ];

  const allItems = isPlatform ? [...platformItems, ...menuItems] : menuItems;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Profile Header */}
      <View className="bg-white p-6 border-b border-gray-200">
        <View className="items-center">
          <View className="w-20 h-20 bg-indigo-100 rounded-full items-center justify-center">
            <Text className="text-3xl font-bold text-indigo-600">
              {user?.name?.charAt(0) || "U"}
            </Text>
          </View>
          <Text className="text-xl font-bold mt-3">{user?.name}</Text>
          <Text className="text-gray-500">{user?.email}</Text>
          <View className="mt-2 px-3 py-1 bg-indigo-100 rounded-full">
            <Text className="text-indigo-600 font-semibold text-xs">
              {isPlatform ? "Super Admin" : user?.role || "User"}
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View className="mt-4 px-4">
        {allItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={item.onPress}
            className="bg-white rounded-xl px-4 py-4 mb-2 flex-row items-center shadow-sm border border-gray-100"
          >
            <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center">
              <Ionicons name={item.icon} size={20} color="#6366F1" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-medium text-gray-900">
                {item.title}
              </Text>
              {item.subtitle && (
                <Text className="text-xs text-gray-400">{item.subtitle}</Text>
              )}
            </View>
            {item.badge && (
              <View className="bg-indigo-100 px-2 py-1 rounded-full">
                <Text className="text-indigo-600 text-xs font-semibold">
                  {item.badge}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <View className="px-4 mt-4 mb-8">
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 border border-red-200 rounded-xl py-4 items-center"
        >
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
