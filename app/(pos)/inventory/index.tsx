import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useGetInventoryQuery } from "@/services/features/inventory/inventoryApi";
import { useAppSelector } from "@/services/store/hooks";
import { Ionicons } from "@expo/vector-icons";

export default function InventoryScreen() {
  const storeId = useAppSelector((state) => state.auth.selectedStoreId);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: inventory,
    isLoading,
    refetch,
  } = useGetInventoryQuery(
    { storeId: storeId || undefined },
    { skip: !storeId },
  );

  const filtered =
    inventory?.filter((item: any) =>
      item.product?.name?.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStockStatus = (quantity: number, reorderPoint: number) => {
    if (quantity <= 0)
      return { label: "Out of Stock", color: "text-red-600 bg-red-100" };
    if (quantity <= reorderPoint)
      return { label: "Low Stock", color: "text-yellow-600 bg-yellow-100" };
    return { label: "In Stock", color: "text-green-600 bg-green-100" };
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = getStockStatus(item.quantity, item.reorderPoint || 10);
    return (
      <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {item.product?.name || "Unknown"}
            </Text>
            <Text className="text-sm text-gray-500">
              SKU: {item.product?.sku || "N/A"}
            </Text>
            <View className="flex-row items-center mt-2">
              <Text className="text-2xl font-bold text-gray-900">
                {item.quantity}
              </Text>
              <Text className="text-sm text-gray-400 ml-1">units</Text>
            </View>
          </View>
          <View className="items-end">
            <View className={`px-3 py-1 rounded-full ${status.color}`}>
              <Text
                className={`text-xs font-semibold ${status.label === "Out of Stock" ? "text-red-700" : ""}`}
              >
                {status.label}
              </Text>
            </View>
            <Text className="text-xs text-gray-400 mt-1">
              Reorder at {item.reorderPoint || 10}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Inventory</Text>
        <TouchableOpacity className="bg-indigo-600 rounded-lg px-4 py-2 flex-row items-center">
          <Ionicons name="sync" size={20} color="white" />
          <Text className="text-white font-semibold ml-1">Sync</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-lg border border-gray-200 px-4 py-2 mb-4 flex-row items-center">
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          className="flex-1 ml-2 py-2 text-base"
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-400 mt-2">
              {search ? "No products match" : "No inventory data"}
            </Text>
          </View>
        }
      />
    </View>
  );
}
