// ============================================
// FILE: app/(tabs)/dashboard.tsx
// ============================================

import {
  Card,
  Header,
  MetricCard,
  Pill,
  Screen,
  SectionTitle,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetLocalOrdersQuery,
  useGetLocalProductsQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ============================================
// Simple Bar Chart Component
// ============================================

function SimpleBarChart({
  data,
  labels,
  colors = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"],
}: {
  data: number[];
  labels: string[];
  colors?: string[];
}) {
  const maxValue = Math.max(...data, 1);
  const barHeight = 80;

  return (
    <View className="flex-row items-end justify-around h-28 mt-2">
      {data.map((value, index) => {
        const height = (value / maxValue) * barHeight;
        const color = colors[index % colors.length];
        return (
          <View key={index} className="items-center flex-1">
            <View
              style={{
                height: Math.max(height, 4),
                width: 24,
                backgroundColor: color,
                borderRadius: 4,
                minHeight: 4,
              }}
            />
            <Text className="text-slate-400 text-[10px] mt-1" numberOfLines={1}>
              {labels[index]?.slice(0, 4) || ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ============================================
// Main Component
// ============================================

export default function DashboardScreen() {
  const { currentStoreId } = useAppSelector((state) => state.auth);

  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useGetLocalOrdersQuery({
    storeId: currentStoreId || undefined,
  });

  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useGetLocalProductsQuery({
    storeId: currentStoreId || undefined,
  });

  const isLoading = ordersLoading || productsLoading;

  // Compute metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum: number, order: any) => sum + Number(order.grandTotal || 0),
      0,
    );

    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (order: any) => new Date(order.createdAt).toDateString() === today,
    );
    const todayRevenue = todayOrders.reduce(
      (sum: number, order: any) => sum + Number(order.grandTotal || 0),
      0,
    );

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Order status breakdown
    const statusCounts = orders.reduce(
      (acc: Record<string, number>, order: any) => {
        const status = order.status || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {},
    );

    // Last 7 days revenue for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toDateString();
    });

    const dailyRevenue = last7Days.map((day) => {
      return orders
        .filter((o: any) => new Date(o.createdAt).toDateString() === day)
        .reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
    });

    // Top products
    const productSales: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};
    for (const order of orders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (!productSales[item.productId]) {
            const product = products.find((p: any) => p.id === item.productId);
            productSales[item.productId] = {
              name: product?.name || "Unknown",
              qty: 0,
              revenue: 0,
            };
          }
          productSales[item.productId].qty += Number(item.quantity || 0);
          productSales[item.productId].revenue +=
            Number(item.unitPrice || 0) * Number(item.quantity || 0);
        }
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      todayOrders: todayOrders.length, // ✅ ensure it's a number
      todayRevenue,
      avgOrderValue,
      topProducts,
      pendingOrders: statusCounts["PENDING"] || 0,
      completedOrders: statusCounts["COMPLETED"] || 0,
      voidedOrders: statusCounts["VOIDED"] || 0,
      dailyRevenue,
      last7Days: last7Days.map((d) => d.slice(0, 3)),
    };
  }, [orders, products]);

  const onRefresh = () => {
    refetchOrders();
    refetchProducts();
  };

  return (
    <Screen padded={false}>
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="px-5 pt-6 pb-2">
          <Header
            eyebrow="Overview"
            title="Dashboard"
            subtitle={`Store: ${currentStoreId ? "Active" : "All Stores"}`}
            right={
              <View className="flex-row items-center gap-2">
                <Pill
                  label={currentStoreId ? "Store View" : "Global View"}
                  tone={currentStoreId ? "emerald" : "sky"}
                />
                <TouchableOpacity
                  className="bg-sky-500/20 px-3 py-1.5 rounded-full border border-sky-500/30"
                  onPress={() => router.push("(tabs)/pos")}
                >
                  <Text className="text-sky-400 text-xs font-bold">+ New</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text className="text-slate-400 mt-4">Loading dashboard...</Text>
          </View>
        ) : (
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={onRefresh}
                tintColor="#38bdf8"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Metrics Row */}
            <View className="flex-row flex-wrap gap-3 mb-5">
              <View className="w-[48%]">
                <MetricCard
                  icon="receipt-long"
                  label="Today's Orders"
                  value={String(metrics.todayOrders)} // ✅ ensure string
                  tone="sky"
                />
              </View>
              <View className="w-[48%]">
                <MetricCard
                  icon="attach-money"
                  label="Today's Revenue"
                  value={`$${metrics.todayRevenue.toFixed(2)}`}
                  tone="emerald"
                />
              </View>
              <View className="w-[48%]">
                <MetricCard
                  icon="inbox"
                  label="Total Orders"
                  value={String(metrics.totalOrders)} // ✅ ensure string
                  tone="amber"
                />
              </View>
              <View className="w-[48%]">
                <MetricCard
                  icon="trending-up"
                  label="Avg. Order Value"
                  value={`$${metrics.avgOrderValue.toFixed(2)}`}
                  tone="rose"
                />
              </View>
            </View>

            {/* Order Status Breakdown */}
            <SectionTitle title="Order Status" />
            <Card className="mb-5">
              <View className="flex-row justify-around py-2">
                <View className="items-center">
                  <Text className="text-amber-400 font-bold text-xl">
                    {metrics.pendingOrders}
                  </Text>
                  <Text className="text-slate-400 text-xs">Pending</Text>
                </View>
                <View className="items-center">
                  <Text className="text-emerald-400 font-bold text-xl">
                    {metrics.completedOrders}
                  </Text>
                  <Text className="text-slate-400 text-xs">Completed</Text>
                </View>
                <View className="items-center">
                  <Text className="text-rose-400 font-bold text-xl">
                    {metrics.voidedOrders}
                  </Text>
                  <Text className="text-slate-400 text-xs">Voided</Text>
                </View>
              </View>
            </Card>

            {/* Revenue Chart */}
            <SectionTitle title="Revenue (Last 7 Days)" />
            <Card className="mb-5">
              <SimpleBarChart
                data={metrics.dailyRevenue}
                labels={metrics.last7Days}
              />
              <View className="flex-row justify-between mt-2">
                <Text className="text-slate-400 text-[10px]">Low</Text>
                <Text className="text-slate-400 text-[10px]">High</Text>
              </View>
              <Text className="text-slate-500 text-center text-xs mt-3">
                Total: ${metrics.totalRevenue.toFixed(2)}
              </Text>
            </Card>

            {/* Top Products */}
            <SectionTitle title="Top Selling Products" />
            <Card className="mb-5">
              {metrics.topProducts.length > 0 ? (
                metrics.topProducts.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between py-3 border-b border-white/5 last:border-0"
                  >
                    <View className="flex-row items-center flex-1">
                      <Text className="text-slate-400 font-bold w-6">
                        #{index + 1}
                      </Text>
                      <Text
                        className="text-white ml-2 flex-1"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <Text className="text-sky-300 font-semibold">
                        {item.qty} sold
                      </Text>
                      <Text className="text-emerald-400 font-bold">
                        ${item.revenue.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-center text-slate-400 py-6">
                  No sales data yet. Start selling!
                </Text>
              )}
            </Card>

            {/* Recent Orders */}
            <SectionTitle title="Recent Orders" />
            <Card className="mb-5">
              {orders.slice(0, 5).map((order: any) => (
                <TouchableOpacity
                  key={order.id}
                  className="flex-row items-center justify-between py-3 border-b border-white/5 last:border-0"
                  onPress={() => router.push(`/receipt/${order.id}`)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text className="text-white font-semibold">
                      #{order.orderNumber || order.id.slice(-6)}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Pill
                      label={order.status || "UNKNOWN"}
                      tone={
                        order.status === "COMPLETED"
                          ? "emerald"
                          : order.status === "PENDING"
                            ? "amber"
                            : "rose"
                      }
                    />
                    <Text className="text-emerald-400 font-bold">
                      ${Number(order.grandTotal || 0).toFixed(2)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {orders.length === 0 && (
                <Text className="text-center text-slate-400 py-6">
                  No orders placed yet.
                </Text>
              )}
            </Card>

            {/* Quick Actions */}
            <SectionTitle title="Quick Actions" />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-sky-500/10 rounded-xl p-4 border border-sky-500/20 items-center"
                onPress={() => router.push("/pos")}
              >
                <MaterialIcons
                  name="add-shopping-cart"
                  size={24}
                  color="#38bdf8"
                />
                <Text className="text-sky-400 font-bold mt-2">New Sale</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 items-center"
                onPress={() => router.push("/orders")}
              >
                <MaterialIcons name="receipt-long" size={24} color="#34d399" />
                <Text className="text-emerald-400 font-bold mt-2">
                  View Orders
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
