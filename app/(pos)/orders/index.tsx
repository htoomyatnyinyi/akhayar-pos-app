import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
// import { useGetOrdersQuery } from "../../../features/orders/ordersApi";
import { useGetOrdersQuery } from "@/services/features/order/orderApi";
import { useOfflineOrders } from "../../../hooks/useOfflineData";
// import { useAppSelector } from "../../../store/hooks";
import { useAppSelector } from "@/services/store/hooks";
import { Ionicons } from "@expo/vector-icons";

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-500",
  PENDING: "bg-yellow-500",
  PROCESSING: "bg-blue-500",
  CANCELLED: "bg-red-500",
  VOIDED: "bg-gray-500",
  REFUNDED: "bg-red-400",
};

const statusLabels: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  PROCESSING: "Processing",
  CANCELLED: "Cancelled",
  VOIDED: "Voided",
  REFUNDED: "Refunded",
};

export default function OrdersList() {
  const router = useRouter();
  const storeId = useAppSelector((state) => state.auth.selectedStoreId);
  const isOnline = useAppSelector((state) => state.sync.isOnline);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: onlineOrders,
    isLoading,
    refetch,
  } = useGetOrdersQuery({ storeId: storeId || undefined }, { skip: !isOnline });
  const { data: offlineOrders, loading: offlineLoading } = useOfflineOrders(
    storeId || undefined,
  );

  const orders = isOnline ? onlineOrders : offlineOrders;
  const loading = isOnline ? isLoading : offlineLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => router.push(`/orders/${item.id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">
            #{item.orderNumber || item.id.slice(0, 8)}
          </Text>
          <Text className="text-sm text-gray-500">
            {item.customer?.name || "Guest"}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-bold text-gray-900">
            ${(item.grandTotal || 0).toFixed(2)}
          </Text>
          <View
            className={`px-2 py-1 rounded-full mt-1 ${statusColors[item.status] || "bg-gray-400"}`}
          >
            <Text className="text-white text-[10px] font-bold uppercase">
              {statusLabels[item.status] || item.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !orders) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold">Orders</Text>
        <TouchableOpacity
          onPress={() => router.push("/orders/create")}
          className="bg-indigo-600 rounded-lg px-4 py-2 flex-row items-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-semibold ml-1">New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-400 mt-2">No orders yet</Text>
          </View>
        }
        contentContainerClassName={orders?.length === 0 ? "flex-1" : ""}
      />
    </View>
  );
}

// import { View, Text, FlatList, Button, Alert } from "react-native";
// // import { useAppSelector } from "../../../src/app/hooks";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import {
//   useGetOrdersQuery,
//   useCreateOrderMutation,
// } from "@/services/features/order/orderApi";
// import { useOfflineOrders } from "@/hooks/useOfflineData";

// export default function OrdersScreen() {
//   const storeId = useAppSelector((state) => state.auth.selectedStoreId);
//   const isOnline = useAppSelector((state) => state.sync.isOnline);

//   // Online query (skips if offline)
//   const { data: onlineOrders, isLoading } = useGetOrdersQuery(
//     { storeId },
//     { skip: !isOnline },
//   );
//   // Offline data
//   const { data: offlineOrders, loading: offlineLoading } =
//     useOfflineOrders(storeId);

//   const orders = isOnline ? onlineOrders : offlineOrders;
//   const loading = isOnline ? isLoading : offlineLoading;

//   const [createOrder] = useCreateOrderMutation();

//   const handleCreate = () => {
//     // Example payload (you would collect from form)
//     const payload = {
//       storeId,
//       subTotal: 10,
//       grandTotal: 10,
//       paymentMethod: "CASH",
//       paidAmount: 10,
//       changeAmount: 0,
//       items: [
//         { productId: "prod-123", quantity: 1, unitPrice: 10, subTotal: 10 },
//       ],
//     };
//     createOrder(payload)
//       .unwrap()
//       .then(() => Alert.alert("Success", "Order created"))
//       .catch((err) => Alert.alert("Error", err.message));
//   };

//   return (
//     <View className="flex-1 p-4">
//       <Button title="Create Order (Offline)" onPress={handleCreate} />
//       <FlatList
//         data={orders}
//         keyExtractor={(item) => item.id}
//         renderItem={({ item }) => (
//           <View className="border-b p-2">
//             <Text className="font-bold">#{item.orderNumber}</Text>
//             <Text>
//               ${item.grandTotal} - {item.status}
//             </Text>
//           </View>
//         )}
//         refreshing={loading}
//         onRefresh={() => {}}
//         ListEmptyComponent={<Text>No orders</Text>}
//       />
//     </View>
//   );
// }

// // import { View, Text, FlatList, Button, ActivityIndicator } from "react-native";
// // // import {
// // //   useGetOrdersQuery,
// // //   useCreateOrderMutation,
// // // } from "../../../src/features/orders/ordersApi";
// // import {
// //   useGetOrdersQuery,
// //   useCreateOrderMutation,
// // } from "@/services/features/order/orderApi";
// // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // import { useOfflineOrders } from "@/hooks/useOfflineData";

// // export default function OrdersScreen() {
// //   const storeId = useAppSelector((state) => state.auth.selectedStoreId);
// //   const isOnline = useAppSelector((state) => state.sync.isOnline);
// //   const { data: onlineOrders, isLoading } = useGetOrdersQuery(
// //     { storeId: storeId! },
// //     { skip: !isOnline },
// //   );
// //   const { data: offlineOrders, loading: offlineLoading } =
// //     useOfflineOrders(storeId);
// //   const [createOrder] = useCreateOrderMutation();

// //   const orders = isOnline ? onlineOrders : offlineOrders;
// //   const loading = isOnline ? isLoading : offlineLoading;

// //   const handleCreate = () => {
// //     createOrder({
// //       storeId,
// //       items: [{ productId: "123", quantity: 1, unitPrice: 10, subTotal: 10 }],
// //       subTotal: 10,
// //       grandTotal: 10,
// //       paymentMethod: "CASH",
// //       paidAmount: 10,
// //       changeAmount: 0,
// //     });
// //   };

// //   if (loading) return <ActivityIndicator size="large" />;
// //   return (
// //     <View style={{ flex: 1, padding: 20 }}>
// //       <Button title="Create Order" onPress={handleCreate} />
// //       <FlatList
// //         data={orders}
// //         keyExtractor={(item) => item.id}
// //         renderItem={({ item }) => <Text>{item.orderNumber}</Text>}
// //       />
// //     </View>
// //   );
// // }
