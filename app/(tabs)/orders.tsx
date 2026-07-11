// ============================================
// FILE: app/(tabs)/orders.tsx
// ============================================

import { Card, Header, MetricCard, Pill, Screen } from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetActiveSessionQuery,
  useGetLocalOrdersQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OrderStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "VOIDED"
  | "REFUNDED";

type FilterType = "all" | OrderStatus;

export default function OrdersScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = useGetLocalOrdersQuery({
    storeId: user?.currentStoreId || undefined,
  });

  const { data: activeSession } = useGetActiveSessionQuery({
    userId: user?.id || "",
    storeId: user?.currentStoreId || undefined,
  });

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!ordersData) return [];
    if (filter === "all") return ordersData;
    return ordersData.filter((order: any) => order.status === filter);
  }, [ordersData, filter]);

  // Statistics
  const stats = useMemo(() => {
    if (!ordersData)
      return { total: 0, completed: 0, pending: 0, cancelled: 0 };

    const total = ordersData.length;
    const completed = ordersData.filter(
      (o: any) => o.status === "COMPLETED",
    ).length;
    const pending = ordersData.filter(
      (o: any) => o.status === "PENDING",
    ).length;
    const cancelled = ordersData.filter(
      (o: any) => o.status === "CANCELLED" || o.status === "VOIDED",
    ).length;

    return { total, completed, pending, cancelled };
  }, [ordersData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "COMPLETED":
        return "emerald";
      case "PENDING":
        return "amber";
      case "CANCELLED":
      case "VOIDED":
        return "rose";
      case "REFUNDED":
        return "purple";
      default:
        return "slate";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "COMPLETED":
        return "check-circle";
      case "PENDING":
        return "hourglass-top";
      case "CANCELLED":
      case "VOIDED":
        return "cancel";
      case "REFUNDED":
        return "receipt-long";
      default:
        return "circle";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const status = item.status as OrderStatus;
    const statusColor = getStatusColor(status);
    const statusIcon = getStatusIcon(status);
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/receipt/${item.id}`)}
      >
        <Card className="mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-base">
                  #{item.orderNumber || item.id.slice(-6).toUpperCase()}
                </Text>
                <Pill label={status} tone={statusColor} className="ml-2" />
              </View>
              <Text className="text-slate-400 text-xs mt-1">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </Text>
            </View>
            <Text className="text-sky-400 font-bold text-lg">
              ${(item.grandTotal || 0).toFixed(2)}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between border-t border-white/5 pt-3">
            <View className="flex-row items-center">
              <MaterialIcons
                name={statusIcon}
                size={16}
                color={status === "COMPLETED" ? "#34d399" : "#94a3b8"}
              />
              <Text className="text-slate-400 text-xs ml-1.5">
                {formatDate(item.createdAt)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <MaterialIcons name="payment" size={14} color="#94a3b8" />
              <Text className="text-slate-400 text-xs ml-1">
                {item.paymentMethod || "CASH"}
              </Text>
            </View>
            {item.customerId && (
              <View className="flex-row items-center">
                <MaterialIcons name="person" size={14} color="#94a3b8" />
                <Text className="text-slate-400 text-xs ml-1">
                  {item.customerId.slice(-6)}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text className="text-slate-400 mt-4 text-sm">Loading orders...</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="px-5 pt-6 pb-4">
          <Header
            eyebrow="Order Management"
            title="Orders"
            subtitle={`${filteredOrders.length} orders found`}
            right={
              <TouchableOpacity
                className="bg-sky-500/20 px-3 py-1.5 rounded-full border border-sky-500/30 flex-row items-center"
                onPress={() => router.push("/(tabs)/pos")}
              >
                <MaterialIcons name="add" size={16} color="#38bdf8" />
                <Text className="text-sky-400 font-bold text-xs ml-1">
                  New Order
                </Text>
              </TouchableOpacity>
            }
          />

          {/* Stats */}
          <View className="flex-row gap-3 mt-4">
            <MetricCard
              icon="receipt-long"
              label="Total"
              value={stats.total.toString()}
              tone="sky"
            />
            <MetricCard
              icon="check-circle"
              label="Completed"
              value={stats.completed.toString()}
              tone="emerald"
            />
            <MetricCard
              icon="hourglass-top"
              label="Pending"
              value={stats.pending.toString()}
              tone="amber"
            />
            <MetricCard
              icon="cancel"
              label="Cancelled"
              value={stats.cancelled.toString()}
              tone="rose"
            />
          </View>
        </View>

        {/* Filters */}
        <View className="px-5 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {[
              "all",
              "COMPLETED",
              "PENDING",
              "CANCELLED",
              "VOIDED",
              "REFUNDED",
            ].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilter(status as FilterType)}
                className={`rounded-full px-4 py-2 border ${
                  filter === status
                    ? "bg-sky-500/20 border-sky-500/40"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-[2px] ${
                    filter === status ? "text-sky-400" : "text-slate-300"
                  }`}
                >
                  {status === "all" ? "All" : status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Orders List */}
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
          }}
          renderItem={renderOrderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-16">
              <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
                <MaterialIcons name="receipt-long" size={32} color="#64748b" />
              </View>
              <Text className="text-white mt-4 text-lg font-bold">
                No orders found
              </Text>
              <Text className="text-slate-500 mt-2 text-sm text-center px-10">
                {filter === "all"
                  ? "Start by creating your first order from the POS screen."
                  : `No ${filter.toLowerCase()} orders found.`}
              </Text>
              <TouchableOpacity
                className="mt-6 bg-sky-500 px-6 py-3 rounded-xl flex-row items-center"
                onPress={() => router.push("/(tabs)/pos")}
              >
                <MaterialIcons
                  name="add-shopping-cart"
                  size={20}
                  color="white"
                />
                <Text className="text-white font-bold ml-2">Create Order</Text>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Active Session Indicator */}
        {activeSession && (
          <View className="absolute bottom-6 left-5 right-5">
            <View className="bg-emerald-500/20 rounded-xl p-3 border border-emerald-500/30 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                <Text className="text-emerald-400 text-xs font-medium">
                  Session Active
                </Text>
              </View>
              <Text className="text-emerald-400/60 text-[10px]">
                {new Date(activeSession.openedAt).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Screen>
  );
}
