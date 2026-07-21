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
// import { useGetCustomersQuery } from "@/services/features/customers/customersApi";
import { useGetCustomersQuery } from "@/services/features/customers/customerApi";
import { useAppSelector } from "@/services/store/hooks";
import { Ionicons } from "@expo/vector-icons";

export default function CustomersScreen() {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: customers, isLoading, refetch } = useGetCustomersQuery({});

  const filtered =
    customers?.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search),
    ) || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500">
            {item.phone || "No phone"}
          </Text>
          <Text className="text-xs text-gray-400">
            {item.email || "No email"}
          </Text>
        </View>
        <View className="items-end">
          <View
            className={`px-2 py-1 rounded-full bg-${item.tier === "GOLD" ? "yellow" : "gray"}-100`}
          >
            <Text className="text-xs font-semibold">
              {item.tier || "BRONZE"}
            </Text>
          </View>
          <Text className="text-sm text-gray-600 mt-1">
            {item.loyaltyPoints || 0} pts
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Customers</Text>
        <TouchableOpacity className="bg-indigo-600 rounded-lg px-4 py-2 flex-row items-center">
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-semibold ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-lg border border-gray-200 px-4 py-2 mb-4 flex-row items-center">
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          className="flex-1 ml-2 py-2 text-base"
          placeholder="Search customers..."
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
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-400 mt-2">No customers yet</Text>
          </View>
        }
      />
    </View>
  );
}
