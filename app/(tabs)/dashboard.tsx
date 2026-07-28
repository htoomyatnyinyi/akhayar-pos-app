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
import React, { useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const { user, currentStoreId } = useAppSelector((state) => state.auth);

  // Fetch local data
  const { data: orders = [], refetch: refetchOrders } = useGetLocalOrdersQuery({
    storeId: currentStoreId || undefined,
  });
  const { data: products = [], refetch: refetchProducts } =
    useGetLocalProductsQuery({
      storeId: currentStoreId || undefined,
    });

  // Compute metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum: number, order: any) => sum + (order.grandTotal || 0),
      0,
    );
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (order: any) => new Date(order.createdAt).toDateString() === today,
    );
    const todayRevenue = todayOrders.reduce(
      (sum: number, order: any) => sum + (order.grandTotal || 0),
      0,
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products by quantity sold
    const productSales: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};
    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          if (!productSales[item.productId]) {
            const product = products.find((p: any) => p.id === item.productId);
            productSales[item.productId] = {
              name: product?.name || "Unknown",
              qty: 0,
              revenue: 0,
            };
          }
          productSales[item.productId].qty += item.quantity;
          productSales[item.productId].revenue +=
            item.unitPrice * item.quantity;
        }
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      avgOrderValue,
      topProducts,
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
            subtitle="Real-time store performance"
            right={
              <Pill
                label={currentStoreId ? "Store Active" : "No Store"}
                tone={currentStoreId ? "emerald" : "amber"}
              />
            }
          />
        </View>

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
                value={metrics.todayOrders.toString()}
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
                value={metrics.totalOrders.toString()}
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

          {/* Total Revenue */}
          <Card className="mb-5">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                Total Revenue
              </Text>
              <Text className="text-emerald-400 font-black text-2xl">
                ${metrics.totalRevenue.toFixed(2)}
              </Text>
            </View>
            <View className="h-20 bg-white/5 rounded-xl items-center justify-center border border-white/10">
              <Text className="text-slate-500 text-sm">
                📊 Chart placeholder – integrate your favorite charting lib
              </Text>
            </View>
          </Card>

          {/* Top Products */}
          <SectionTitle title="Top Products" />
          <Card>
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
                    <Text className="text-white ml-2 flex-1" numberOfLines={1}>
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
                No sales data yet
              </Text>
            )}
          </Card>

          {/* Recent Orders */}
          <SectionTitle title="Recent Orders" />
          <Card>
            {orders.slice(0, 5).map((order: any) => (
              <View
                key={order.id}
                className="flex-row items-center justify-between py-3 border-b border-white/5 last:border-0"
              >
                <View>
                  <Text className="text-white font-semibold">
                    #{order.orderNumber || order.id.slice(-6)}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text className="text-emerald-400 font-bold">
                  ${order.grandTotal?.toFixed(2) || "0.00"}
                </Text>
              </View>
            ))}
            {orders.length === 0 && (
              <Text className="text-center text-slate-400 py-6">
                No orders placed yet
              </Text>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
