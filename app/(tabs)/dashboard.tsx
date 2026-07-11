// ============================================
// FILE: app/(tabs)/dashboard.tsx
// ============================================

import {
  ActionButton,
  Card,
  Header,
  MetricCard,
  Pill,
  Screen,
  SectionTitle,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetActiveSessionQuery,
  useGetLocalBrandsQuery,
  useGetLocalCategoriesQuery,
  useGetLocalCustomersQuery,
  useGetLocalInventoryQuery,
  useGetLocalOrdersQuery,
  useGetLocalProductsQuery,
  useGetLocalStaffQuery,
  useGetLocalStoresQuery,
  useGetLocalSuppliersQuery,
  useGetLocalInventoryMovementsQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from "react-native";
import { LineChart, PieChart, BarChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get("window");
const chartWidth = width - 40;

type TimeRange =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";
type ChartType = "line" | "bar" | "pie";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export default function DashboardScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: new Date(),
  });
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "orders" | "profit" | "customers"
  >("revenue");

  // ✅ Queries
  const { data: products = [], refetch: refetchProducts } =
    useGetLocalProductsQuery({
      storeId: user?.currentStoreId || undefined,
    });
  const { data: orders = [], refetch: refetchOrders } = useGetLocalOrdersQuery({
    storeId: user?.currentStoreId || undefined,
  });
  const { data: customers = [], refetch: refetchCustomers } =
    useGetLocalCustomersQuery({});
  const { data: inventory = [], refetch: refetchInventory } =
    useGetLocalInventoryQuery({
      storeId: user?.currentStoreId || undefined,
    });
  const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
    storeId: user?.currentStoreId || undefined,
  });
  const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
    {},
  );
  const { data: suppliers = [], refetch: refetchSuppliers } =
    useGetLocalSuppliersQuery({
      storeId: user?.currentStoreId || undefined,
    });
  const { data: categories = [], refetch: refetchCategories } =
    useGetLocalCategoriesQuery({
      storeId: user?.currentStoreId || undefined,
    });
  const { data: brands = [], refetch: refetchBrands } = useGetLocalBrandsQuery(
    {},
  );
  const { data: inventoryMovements = [], refetch: refetchInventoryMovements } =
    useGetLocalInventoryMovementsQuery({
      storeId: user?.currentStoreId || undefined,
    });
  const { data: activeSession } = useGetActiveSessionQuery({
    userId: user?.id || "",
    storeId: user?.currentStoreId || undefined,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProducts(),
      refetchOrders(),
      refetchCustomers(),
      refetchInventory(),
      refetchStaff(),
      refetchStores(),
      refetchSuppliers(),
      refetchCategories(),
      refetchBrands(),
      refetchInventoryMovements(),
    ]);
    setRefreshing(false);
  };

  // ✅ Filter Orders by Date Range
  const getFilteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate = new Date();
    let endDate = new Date();

    switch (timeRange) {
      case "today":
        startDate = today;
        endDate = new Date(today.getTime() + 86400000);
        break;
      case "yesterday":
        startDate = new Date(today.getTime() - 86400000);
        endDate = today;
        break;
      case "week":
        startDate = new Date(today.getTime() - 7 * 86400000);
        endDate = new Date(today.getTime() + 86400000);
        break;
      case "month":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate(),
        );
        endDate = new Date(today.getTime() + 86400000);
        break;
      case "quarter":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate(),
        );
        endDate = new Date(today.getTime() + 86400000);
        break;
      case "year":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        endDate = new Date(today.getTime() + 86400000);
        break;
      case "custom":
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
        break;
      default:
        startDate = new Date(today.getTime() - 7 * 86400000);
        endDate = new Date(today.getTime() + 86400000);
    }

    return orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, timeRange, dateRange]);

  // ✅ Calculate Metrics
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const totalStaff = staff.length;
    const totalStores = stores.length;
    const totalSuppliers = suppliers.length;
    const totalCategories = categories.length;
    const totalBrands = brands.length;

    // Filtered Orders for time range
    const filteredOrders = getFilteredOrders;
    const filteredCount = filteredOrders.length;
    const filteredRevenue = filteredOrders
      .filter((o: any) => o.status === "COMPLETED")
      .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);

    // Profit calculation (assuming 30% profit margin on average)
    const estimatedProfit = filteredRevenue * 0.3;

    // Previous period comparison
    const previousStartDate = new Date(dateRange.startDate);
    previousStartDate.setDate(
      previousStartDate.getDate() -
        (dateRange.endDate.getDate() - dateRange.startDate.getDate()),
    );
    const previousOrders = orders.filter((o: any) => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= previousStartDate && orderDate <= dateRange.startDate;
    });
    const previousRevenue = previousOrders
      .filter((o: any) => o.status === "COMPLETED")
      .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);

    const revenueGrowth =
      previousRevenue > 0
        ? ((filteredRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Inventory stats
    const totalInventory = inventory.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );
    const lowStockItems = inventory.filter(
      (item) => item.quantity <= 10 && item.quantity > 0,
    ).length;
    const outOfStockItems = inventory.filter(
      (item) => item.quantity === 0,
    ).length;

    // Order stats
    const completedOrders = filteredOrders.filter(
      (o: any) => o.status === "COMPLETED",
    ).length;
    const pendingOrders = filteredOrders.filter(
      (o: any) => o.status === "PENDING",
    ).length;
    const cancelledOrders = filteredOrders.filter(
      (o: any) => o.status === "CANCELLED" || o.status === "VOIDED",
    ).length;

    // Average order value
    const avgOrderValue =
      completedOrders > 0 ? filteredRevenue / completedOrders : 0;

    // Daily orders average
    const daysDiff = Math.max(
      1,
      Math.ceil(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
          86400000,
      ),
    );
    const avgDailyOrders = filteredCount / daysDiff;
    const avgDailyRevenue = filteredRevenue / daysDiff;

    // Inventory movement stats
    const stockIn = inventoryMovements
      .filter(
        (m: any) =>
          m.type === "IN" || m.type === "PURCHASE" || m.type === "RETURN_IN",
      )
      .reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
    const stockOut = inventoryMovements
      .filter(
        (m: any) =>
          m.type === "OUT" || m.type === "SALE" || m.type === "RETURN_OUT",
      )
      .reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);

    // Recent orders
    const recentOrders = [...orders]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    // Top products (by sales)
    const productSales: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};
    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const productId = item.productId;
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.productName || `Product ${productId.slice(-6)}`,
              quantity: 0,
              revenue: 0,
            };
          }
          productSales[productId].quantity += item.quantity || 0;
          productSales[productId].revenue +=
            (item.quantity || 0) * (item.unitPrice || 0);
        });
      }
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalStaff,
      totalStores,
      totalSuppliers,
      totalCategories,
      totalBrands,
      totalInventory,
      lowStockItems,
      outOfStockItems,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      filteredCount,
      filteredRevenue,
      estimatedProfit,
      avgOrderValue,
      avgDailyOrders,
      avgDailyRevenue,
      revenueGrowth,
      stockIn,
      stockOut,
      recentOrders,
      topProducts,
    };
  }, [
    products,
    orders,
    customers,
    inventory,
    staff,
    stores,
    suppliers,
    categories,
    brands,
    inventoryMovements,
    getFilteredOrders,
    dateRange,
  ]);

  // ✅ Chart Data
  const chartData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const data = days.map(() => Math.floor(Math.random() * 20) + 5);

    // Daily orders for the selected period
    const dailyData = days.map((day, index) => {
      const date = new Date(dateRange.startDate);
      date.setDate(date.getDate() + index);
      const dayOrders = getFilteredOrders.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return (
          orderDate.getDate() === date.getDate() &&
          orderDate.getMonth() === date.getMonth() &&
          orderDate.getFullYear() === date.getFullYear()
        );
      });
      return {
        day,
        count: dayOrders.length,
        revenue: dayOrders.reduce(
          (sum: number, o: any) => sum + (o.grandTotal || 0),
          0,
        ),
      };
    });

    let chartLabels: string[] = [];
    let chartValues: number[] = [];
    let chartColors: string[] = [];

    switch (selectedMetric) {
      case "revenue":
        chartLabels = dailyData.map((d) => d.day);
        chartValues = dailyData.map((d) => d.revenue);
        chartColors = dailyData.map(() => "#38bdf8");
        break;
      case "orders":
        chartLabels = dailyData.map((d) => d.day);
        chartValues = dailyData.map((d) => d.count);
        chartColors = dailyData.map(() => "#34d399");
        break;
      case "profit":
        chartLabels = dailyData.map((d) => d.day);
        chartValues = dailyData.map((d) => d.revenue * 0.3);
        chartColors = dailyData.map(() => "#fbbf24");
        break;
      case "customers":
        // Customer growth over time
        const customerGrowth = days.map((day, index) => {
          const date = new Date(dateRange.startDate);
          date.setDate(date.getDate() + index);
          const dayCustomers = customers.filter((c: any) => {
            const createdDate = new Date(c.createdAt);
            return createdDate <= date;
          });
          return dayCustomers.length;
        });
        chartLabels = days;
        chartValues = customerGrowth;
        chartColors = days.map(() => "#a78bfa");
        break;
    }

    return {
      labels: chartLabels,
      datasets: [{ data: chartValues, color: () => "#38bdf8" }],
      colors: chartColors,
      dailyData,
    };
  }, [getFilteredOrders, selectedMetric, customers, dateRange]);

  // ✅ Category Chart Data
  const categoryChartData = useMemo(() => {
    const topCategories = categories.slice(0, 5);
    const colors = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];
    return topCategories.map((cat, index) => ({
      name: cat.name || `Category ${index + 1}`,
      count: products.filter((p) => p.categoryId === cat.id).length,
      color: colors[index % colors.length],
      legendFontColor: "#94a3b8",
      legendFontSize: 12,
    }));
  }, [categories, products]);

  // ✅ Date Range Display
  const getDateRangeDisplay = () => {
    switch (timeRange) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "quarter":
        return "This Quarter";
      case "year":
        return "This Year";
      case "custom":
        return `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`;
      default:
        return "Custom Range";
    }
  };

  if (Object.values(metrics).every((v) => v === 0 || v === null)) {
    return (
      <Screen>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <View className="h-24 w-24 bg-white/5 rounded-full items-center justify-center border border-white/10">
            <MaterialIcons name="dashboard" size={40} color="#64748b" />
          </View>
          <Text className="text-white mt-4 text-xl font-bold">No Data Yet</Text>
          <Text className="text-slate-400 mt-2 text-center text-sm">
            Start by adding products, customers, and creating orders.
          </Text>
          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity
              className="bg-sky-500 px-6 py-3 rounded-xl"
              onPress={() => router.push("/(tabs)/pos")}
            >
              <Text className="text-white font-bold">Go to POS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-white/10 px-6 py-3 rounded-xl border border-white/10"
              onPress={onRefresh}
            >
              <Text className="text-slate-300 font-bold">Refresh</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="px-5 pt-6 pb-2">
            <Header
              eyebrow={`Welcome${user?.name ? `, ${user.name}` : ""}`}
              title="Business Dashboard"
              subtitle={`${activeSession ? "🟢 Session Active" : "🔴 No Active Session"} • ${getDateRangeDisplay()}`}
              right={
                <TouchableOpacity
                  className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10 flex-row items-center"
                  onPress={onRefresh}
                >
                  <MaterialIcons name="refresh" size={16} color="#94a3b8" />
                  <Text className="text-slate-400 text-xs ml-1">Sync</Text>
                </TouchableOpacity>
              }
            />
          </View>

          {/* ✅ Date Range Selector */}
          <View className="px-5 mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6 }}
            >
              {(
                [
                  "today",
                  "yesterday",
                  "week",
                  "month",
                  "quarter",
                  "year",
                  "custom",
                ] as TimeRange[]
              ).map((range) => (
                <TouchableOpacity
                  key={range}
                  onPress={() => {
                    setTimeRange(range);
                    if (range === "custom") {
                      setShowDatePicker(true);
                    }
                  }}
                  className={`px-3 py-2 rounded-full border ${
                    timeRange === range
                      ? "bg-sky-500/20 border-sky-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      timeRange === range ? "text-sky-400" : "text-slate-400"
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ✅ Quick Stats */}
          <View className="px-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              <MetricCard
                icon="receipt-long"
                label="Orders"
                value={String(metrics.filteredCount)}
                tone="sky"
                delta={
                  metrics.completedOrders > 0
                    ? `${metrics.completedOrders} completed`
                    : "No orders"
                }
              />
              <MetricCard
                icon="attach-money"
                label="Revenue"
                value={`$${metrics.filteredRevenue.toFixed(2)}`}
                tone="emerald"
                delta={`${metrics.revenueGrowth > 0 ? "↑" : "↓"} ${Math.abs(metrics.revenueGrowth).toFixed(1)}%`}
              />
              <MetricCard
                icon="trending-up"
                label="Profit"
                value={`$${metrics.estimatedProfit.toFixed(2)}`}
                tone="amber"
                delta="Est. 30% margin"
              />
              <MetricCard
                icon="people"
                label="Customers"
                value={String(metrics.totalCustomers)}
                tone="rose"
                delta={`${metrics.totalCustomers > 0 ? "Active" : "No customers"}`}
              />
              <MetricCard
                icon="inventory"
                label="Products"
                value={String(metrics.totalProducts)}
                tone="purple"
                delta={`${metrics.lowStockItems} low stock`}
              />
              <MetricCard
                icon="store"
                label="Stores"
                value={String(metrics.totalStores)}
                tone="amber"
              />
            </ScrollView>
          </View>

          {/* ✅ Key Metrics Grid */}
          <View className="px-5 mt-4">
            <SectionTitle title="Key Metrics" />
            <View className="flex-row flex-wrap gap-3">
              <View className="w-[48%] bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                  Avg Order Value
                </Text>
                <Text className="text-white text-lg font-bold">
                  ${metrics.avgOrderValue.toFixed(2)}
                </Text>
              </View>
              <View className="w-[48%] bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                  Daily Orders
                </Text>
                <Text className="text-white text-lg font-bold">
                  {metrics.avgDailyOrders.toFixed(1)}
                </Text>
              </View>
              <View className="w-[48%] bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                  Daily Revenue
                </Text>
                <Text className="text-white text-lg font-bold">
                  ${metrics.avgDailyRevenue.toFixed(2)}
                </Text>
              </View>
              <View className="w-[48%] bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                  Stock Movement
                </Text>
                <Text className="text-white text-lg font-bold">
                  +{metrics.stockIn} / -{metrics.stockOut}
                </Text>
              </View>
            </View>
          </View>

          {/* ✅ Chart Controls */}
          <View className="px-5 mt-4">
            <SectionTitle
              title="Analytics"
              action={
                <View className="flex-row gap-2">
                  {(["revenue", "orders", "profit", "customers"] as const).map(
                    (metric) => (
                      <TouchableOpacity
                        key={metric}
                        onPress={() => setSelectedMetric(metric)}
                        className={`px-2 py-1 rounded-full ${
                          selectedMetric === metric
                            ? "bg-sky-500/20 border border-sky-500/30"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-medium ${
                            selectedMetric === metric
                              ? "text-sky-400"
                              : "text-slate-400"
                          }`}
                        >
                          {metric.charAt(0).toUpperCase() + metric.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              }
            />
          </View>

          {/* ✅ Chart */}
          <View className="px-5 mt-2">
            <Card className="p-0 overflow-hidden">
              <LineChart
                data={chartData}
                width={chartWidth}
                height={200}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: "#0f172a",
                  backgroundGradientTo: "#0f172a",
                  decimalPlaces:
                    selectedMetric === "orders" ||
                    selectedMetric === "customers"
                      ? 0
                      : 2,
                  color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(148, 163, 184, ${opacity})`,
                  style: { borderRadius: 0 },
                  propsForDots: {
                    r: "4",
                    strokeWidth: "2",
                    stroke: "#38bdf8",
                  },
                }}
                bezier
                style={{ borderRadius: 0, marginLeft: -20 }}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </Card>
          </View>

          {/* ✅ Category Distribution */}
          {categoryChartData.length > 0 && (
            <View className="px-5 mt-4">
              <SectionTitle title="Category Distribution" />
              <Card className="items-center py-4">
                <PieChart
                  data={categoryChartData}
                  width={chartWidth}
                  height={180}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  }}
                  accessor="count"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  absolute
                />
              </Card>
            </View>
          )}

          {/* ✅ Top Products */}
          {metrics.topProducts.length > 0 && (
            <View className="px-5 mt-4">
              <SectionTitle title="Top Products" />
              {metrics.topProducts.map((product: any, index: number) => (
                <View
                  key={index}
                  className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-sky-500/20 items-center justify-center mr-3">
                      <Text className="text-sky-400 font-bold text-sm">
                        {index + 1}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white font-semibold">
                        {product.name}
                      </Text>
                      <Text className="text-slate-400 text-xs">
                        {product.quantity} units sold
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sky-400 font-bold">
                    ${product.revenue.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ✅ Recent Orders */}
          <View className="px-5 mt-4">
            <SectionTitle
              title="Recent Orders"
              action={
                <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
                  <Text className="text-sky-400 text-xs font-medium">
                    View All
                  </Text>
                </TouchableOpacity>
              }
            />
            {metrics.recentOrders.length > 0 ? (
              metrics.recentOrders.map((order: any, index: number) => (
                <TouchableOpacity
                  key={order.id}
                  className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10"
                  onPress={() => router.push(`/receipt/${order.id}`)}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white font-semibold">
                        #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                      </Text>
                      <Text className="text-slate-400 text-xs">
                        {new Date(order.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sky-400 font-bold">
                        ${(order.grandTotal || 0).toFixed(2)}
                      </Text>
                      <Pill
                        label={order.status || "PENDING"}
                        tone={
                          order.status === "COMPLETED"
                            ? "emerald"
                            : order.status === "PENDING"
                              ? "amber"
                              : "rose"
                        }
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Card>
                <Text className="text-slate-400 text-center py-4">
                  No recent orders
                </Text>
              </Card>
            )}
          </View>

          {/* ✅ Inventory Status */}
          <View className="px-5 mt-4">
            <SectionTitle title="Inventory Health" />
            <View className="flex-row gap-3">
              <View className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
                <Text className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">
                  Total Stock
                </Text>
                <Text className="text-white text-lg font-bold">
                  {metrics.totalInventory}
                </Text>
              </View>
              <View className="flex-1 bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                <Text className="text-amber-400 text-[10px] font-medium uppercase tracking-wider">
                  Low Stock
                </Text>
                <Text className="text-amber-400 text-lg font-bold">
                  {metrics.lowStockItems}
                </Text>
              </View>
              <View className="flex-1 bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">
                <Text className="text-rose-400 text-[10px] font-medium uppercase tracking-wider">
                  Out of Stock
                </Text>
                <Text className="text-rose-400 text-lg font-bold">
                  {metrics.outOfStockItems}
                </Text>
              </View>
            </View>
          </View>

          {/* ✅ Quick Actions */}
          <View className="px-5 mt-4">
            <SectionTitle title="Quick Actions" />
            <View className="flex-row flex-wrap gap-3">
              <TouchableOpacity
                className="flex-1 min-w-[30%] bg-sky-500/10 rounded-xl p-3 border border-sky-500/20 items-center"
                onPress={() => router.push("/(tabs)/pos")}
              >
                <MaterialIcons
                  name="add-shopping-cart"
                  size={20}
                  color="#38bdf8"
                />
                <Text className="text-sky-400 text-[10px] font-medium mt-1">
                  New Order
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 min-w-[30%] bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 items-center"
                onPress={() => router.push("/(tabs)/manage")}
              >
                <MaterialIcons name="settings" size={20} color="#34d399" />
                <Text className="text-emerald-400 text-[10px] font-medium mt-1">
                  Manage
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 min-w-[30%] bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 items-center"
                onPress={() => router.push("/sync")}
              >
                <MaterialIcons name="sync" size={20} color="#fbbf24" />
                <Text className="text-amber-400 text-[10px] font-medium mt-1">
                  Sync
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 min-w-[30%] bg-purple-500/10 rounded-xl p-3 border border-purple-500/20 items-center"
                onPress={() => router.push("/(tabs)/inventory")}
              >
                <MaterialIcons name="inventory" size={20} color="#a78bfa" />
                <Text className="text-purple-400 text-[10px] font-medium mt-1">
                  Inventory
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 min-w-[30%] bg-rose-500/10 rounded-xl p-3 border border-rose-500/20 items-center"
                onPress={() => router.push("/(tabs)/manage")}
              >
                <MaterialIcons name="people" size={20} color="#f87171" />
                <Text className="text-rose-400 text-[10px] font-medium mt-1">
                  Customers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 min-w-[30%] bg-sky-500/10 rounded-xl p-3 border border-sky-500/20 items-center"
                onPress={() => router.push("/sync")}
              >
                <MaterialIcons name="cloud-upload" size={20} color="#38bdf8" />
                <Text className="text-sky-400 text-[10px] font-medium mt-1">
                  Sync Status
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ✅ System Status */}
          <View className="px-5 mt-4">
            <SectionTitle title="System Status" />
            <Card>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-slate-400 text-sm">Session</Text>
                <Pill
                  label={activeSession ? "Active" : "Inactive"}
                  tone={activeSession ? "emerald" : "rose"}
                />
              </View>
              <View className="flex-row items-center justify-between py-2 border-t border-white/5">
                <Text className="text-slate-400 text-sm">Store</Text>
                <Text className="text-white text-sm">
                  {user?.currentStoreId
                    ? stores.find((s: any) => s.id === user.currentStoreId)
                        ?.name || "Unknown"
                    : "Not selected"}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2 border-t border-white/5">
                <Text className="text-slate-400 text-sm">Staff</Text>
                <Text className="text-white text-sm">{metrics.totalStaff}</Text>
              </View>
              <View className="flex-row items-center justify-between py-2 border-t border-white/5">
                <Text className="text-slate-400 text-sm">Suppliers</Text>
                <Text className="text-white text-sm">
                  {metrics.totalSuppliers}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2 border-t border-white/5">
                <Text className="text-slate-400 text-sm">Brands</Text>
                <Text className="text-white text-sm">
                  {metrics.totalBrands}
                </Text>
              </View>
            </Card>
          </View>

          {/* ✅ Version Info */}
          <View className="px-5 mt-6">
            <Text className="text-slate-600 text-xs text-center">
              POS & ERP System v2.0 • {new Date().toLocaleDateString()}
            </Text>
          </View>
        </ScrollView>

        {/* ✅ Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 bg-black/70 justify-center px-6">
            <View className="bg-slate-900 rounded-3xl p-6">
              <Text className="text-white text-lg font-bold mb-4">
                Select Date Range
              </Text>

              <Text className="text-slate-400 text-sm mb-2">Start Date</Text>
              <DateTimePicker
                value={dateRange.startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDateRange({ ...dateRange, startDate: selectedDate });
                  }
                }}
                style={{ backgroundColor: "#1e293b", borderRadius: 12 }}
              />

              <Text className="text-slate-400 text-sm mt-4 mb-2">End Date</Text>
              <DateTimePicker
                value={dateRange.endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDateRange({ ...dateRange, endDate: selectedDate });
                  }
                }}
                style={{ backgroundColor: "#1e293b", borderRadius: 12 }}
              />

              <View className="flex-row gap-3 mt-6">
                <ActionButton
                  title="Cancel"
                  icon="close"
                  accent="rose"
                  onPress={() => setShowDatePicker(false)}
                />
                <ActionButton
                  title="Apply"
                  icon="check"
                  accent="emerald"
                  onPress={() => {
                    setTimeRange("custom");
                    setShowDatePicker(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

// import {
//   ActionButton,
//   Card,
//   Header,
//   MetricCard,
//   Pill,
//   Screen,
//   SectionTitle,
// } from "@/components/app-ui";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import {
//   useGetActiveSessionQuery,
//   useGetLocalBrandsQuery,
//   useGetLocalCategoriesQuery,
//   useGetLocalCustomersQuery,
//   useGetLocalInventoryQuery,
//   useGetLocalOrdersQuery,
//   useGetLocalProductsQuery,
//   useGetLocalStaffQuery,
//   useGetLocalStoresQuery,
//   useGetLocalSuppliersQuery,
// } from "@/services/features/offline/localApi";
// import { MaterialIcons } from "@expo/vector-icons";
// import { router } from "expo-router";
// import React, { useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Dimensions,
//   RefreshControl,
//   ScrollView,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { LineChart, PieChart } from "react-native-chart-kit";
// import { SafeAreaView } from "react-native-safe-area-context";

// const { width } = Dimensions.get("window");
// const chartWidth = width - 40;

// type TimeRange = "today" | "week" | "month" | "year";

// export default function DashboardScreen() {
//   const user = useAppSelector((state) => state.auth.user);
//   const [timeRange, setTimeRange] = useState<TimeRange>("week");
//   const [refreshing, setRefreshing] = useState(false);

//   // ✅ Queries
//   const { data: products = [], refetch: refetchProducts } =
//     useGetLocalProductsQuery({
//       storeId: user?.currentStoreId || undefined,
//     });
//   const { data: orders = [], refetch: refetchOrders } = useGetLocalOrdersQuery({
//     storeId: user?.currentStoreId || undefined,
//   });
//   const { data: customers = [], refetch: refetchCustomers } =
//     useGetLocalCustomersQuery({});
//   const { data: inventory = [], refetch: refetchInventory } =
//     useGetLocalInventoryQuery({
//       storeId: user?.currentStoreId || undefined,
//     });
//   const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
//     storeId: user?.currentStoreId || undefined,
//   });
//   const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
//     {},
//   );
//   const { data: suppliers = [], refetch: refetchSuppliers } =
//     useGetLocalSuppliersQuery({
//       storeId: user?.currentStoreId || undefined,
//     });
//   const { data: categories = [], refetch: refetchCategories } =
//     useGetLocalCategoriesQuery({
//       storeId: user?.currentStoreId || undefined,
//     });
//   const { data: brands = [], refetch: refetchBrands } = useGetLocalBrandsQuery(
//     {},
//   );
//   const { data: activeSession } = useGetActiveSessionQuery({
//     userId: user?.id || "",
//     storeId: user?.currentStoreId || undefined,
//   });

//   const onRefresh = async () => {
//     setRefreshing(true);
//     await Promise.all([
//       refetchProducts(),
//       refetchOrders(),
//       refetchCustomers(),
//       refetchInventory(),
//       refetchStaff(),
//       refetchStores(),
//       refetchSuppliers(),
//       refetchCategories(),
//       refetchBrands(),
//     ]);
//     setRefreshing(false);
//   };

//   // ✅ Calculate Metrics
//   const metrics = useMemo(() => {
//     const totalProducts = products.length;
//     const totalOrders = orders.length;
//     const totalCustomers = customers.length;
//     const totalStaff = staff.length;
//     const totalStores = stores.length;
//     const totalSuppliers = suppliers.length;
//     const totalCategories = categories.length;
//     const totalBrands = brands.length;

//     // Inventory stats
//     const totalInventory = inventory.reduce(
//       (sum, item) => sum + (item.quantity || 0),
//       0,
//     );
//     const lowStockItems = inventory.filter(
//       (item) => item.quantity <= 10 && item.quantity > 0,
//     ).length;
//     const outOfStockItems = inventory.filter(
//       (item) => item.quantity === 0,
//     ).length;

//     // Order stats
//     const completedOrders = orders.filter(
//       (o) => o.status === "COMPLETED",
//     ).length;
//     const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
//     const totalRevenue = orders
//       .filter((o) => o.status === "COMPLETED")
//       .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

//     // Recent activity
//     const recentOrders = [...orders]
//       .sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
//       )
//       .slice(0, 5);

//     return {
//       totalProducts,
//       totalOrders,
//       totalCustomers,
//       totalStaff,
//       totalStores,
//       totalSuppliers,
//       totalCategories,
//       totalBrands,
//       totalInventory,
//       lowStockItems,
//       outOfStockItems,
//       completedOrders,
//       pendingOrders,
//       totalRevenue,
//       recentOrders,
//     };
//   }, [
//     products,
//     orders,
//     customers,
//     inventory,
//     staff,
//     stores,
//     suppliers,
//     categories,
//     brands,
//   ]);

//   // ✅ Chart Data
//   const orderChartData = useMemo(() => {
//     const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
//     const data = days.map(() => Math.floor(Math.random() * 20) + 5);
//     return {
//       labels: days,
//       datasets: [{ data, color: () => "#38bdf8" }],
//     };
//   }, []);

//   const categoryChartData = useMemo(() => {
//     const topCategories = categories.slice(0, 5);
//     const colors = ["#38bdf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];
//     return topCategories.map((cat, index) => ({
//       name: cat.name || `Category ${index + 1}`,
//       count: products.filter((p) => p.categoryId === cat.id).length,
//       color: colors[index % colors.length],
//       legendFontColor: "#94a3b8",
//       legendFontSize: 12,
//     }));
//   }, [categories, products]);

//   if (Object.values(metrics).every((v) => v === 0)) {
//     return (
//       <Screen>
//         <SafeAreaView className="flex-1 items-center justify-center px-6">
//           <View className="h-24 w-24 bg-white/5 rounded-full items-center justify-center border border-white/10">
//             <MaterialIcons name="dashboard" size={40} color="#64748b" />
//           </View>
//           <Text className="text-white mt-4 text-xl font-bold">No Data Yet</Text>
//           <Text className="text-slate-400 mt-2 text-center text-sm">
//             Start by adding products, customers, and creating orders. Your
//             dashboard will populate with insights.
//           </Text>
//           <View className="flex-row gap-3 mt-6">
//             <TouchableOpacity
//               className="bg-sky-500 px-6 py-3 rounded-xl"
//               onPress={() => router.push("/(tabs)/index")}
//             >
//               <Text className="text-white font-bold">Go to POS</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               className="bg-white/10 px-6 py-3 rounded-xl border border-white/10"
//               onPress={onRefresh}
//             >
//               <Text className="text-slate-300 font-bold">Refresh</Text>
//             </TouchableOpacity>
//           </View>
//         </SafeAreaView>
//       </Screen>
//     );
//   }

//   return (
//     <Screen>
//       <SafeAreaView className="flex-1 bg-slate-950">
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 28 }}
//           refreshControl={
//             <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//           }
//         >
//           <View className="px-5 pt-6 pb-2">
//             <Header
//               eyebrow={`Welcome${user?.name ? `, ${user.name}` : ""}`}
//               title="Dashboard"
//               subtitle={`${activeSession ? "🟢 Session Active" : "🔴 No Active Session"}`}
//               right={
//                 <TouchableOpacity
//                   className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10 flex-row items-center"
//                   onPress={onRefresh}
//                 >
//                   <MaterialIcons name="refresh" size={16} color="#94a3b8" />
//                   <Text className="text-slate-400 text-xs ml-1">Sync</Text>
//                 </TouchableOpacity>
//               }
//             />
//           </View>

//           {/* ✅ Quick Stats */}
//           <View className="px-5">
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
//             >
//               <MetricCard
//                 icon="receipt-long"
//                 label="Orders"
//                 value={String(metrics.totalOrders)}
//                 tone="sky"
//                 delta={`${metrics.completedOrders} completed`}
//               />
//               <MetricCard
//                 icon="attach-money"
//                 label="Revenue"
//                 value={`$${metrics.totalRevenue.toFixed(2)}`}
//                 tone="emerald"
//               />
//               <MetricCard
//                 icon="people"
//                 label="Customers"
//                 value={String(metrics.totalCustomers)}
//                 tone="rose"
//               />
//               <MetricCard
//                 icon="inventory"
//                 label="Products"
//                 value={String(metrics.totalProducts)}
//                 tone="amber"
//               />
//               <MetricCard
//                 icon="store"
//                 label="Stores"
//                 value={String(metrics.totalStores)}
//                 tone="purple"
//               />
//             </ScrollView>
//           </View>

//           {/* ✅ Inventory Status */}
//           <View className="px-5 mt-4">
//             <SectionTitle title="Inventory Status" />
//             <View className="flex-row gap-3">
//               <View className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10">
//                 <Text className="text-slate-400 text-xs font-medium uppercase tracking-wider">
//                   Total Items
//                 </Text>
//                 <Text className="text-white text-2xl font-bold mt-1">
//                   {metrics.totalInventory}
//                 </Text>
//               </View>
//               <View className="flex-1 bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
//                 <Text className="text-amber-400 text-xs font-medium uppercase tracking-wider">
//                   Low Stock
//                 </Text>
//                 <Text className="text-amber-400 text-2xl font-bold mt-1">
//                   {metrics.lowStockItems}
//                 </Text>
//               </View>
//               <View className="flex-1 bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
//                 <Text className="text-rose-400 text-xs font-medium uppercase tracking-wider">
//                   Out of Stock
//                 </Text>
//                 <Text className="text-rose-400 text-2xl font-bold mt-1">
//                   {metrics.outOfStockItems}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           {/* ✅ Order Stats */}
//           <View className="px-5 mt-4">
//             <SectionTitle title="Order Status" />
//             <View className="flex-row gap-3">
//               <View className="flex-1 bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
//                 <Text className="text-emerald-400 text-xs font-medium uppercase tracking-wider">
//                   Completed
//                 </Text>
//                 <Text className="text-emerald-400 text-2xl font-bold mt-1">
//                   {metrics.completedOrders}
//                 </Text>
//               </View>
//               <View className="flex-1 bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
//                 <Text className="text-amber-400 text-xs font-medium uppercase tracking-wider">
//                   Pending
//                 </Text>
//                 <Text className="text-amber-400 text-2xl font-bold mt-1">
//                   {metrics.pendingOrders}
//                 </Text>
//               </View>
//               <View className="flex-1 bg-sky-500/10 rounded-xl p-4 border border-sky-500/20">
//                 <Text className="text-sky-400 text-xs font-medium uppercase tracking-wider">
//                   Total
//                 </Text>
//                 <Text className="text-sky-400 text-2xl font-bold mt-1">
//                   {metrics.totalOrders}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           {/* ✅ Chart: Orders Overview */}
//           <View className="px-5 mt-4">
//             <SectionTitle
//               title="Orders Overview"
//               action={
//                 <View className="flex-row gap-2">
//                   {(["today", "week", "month", "year"] as TimeRange[]).map(
//                     (range) => (
//                       <TouchableOpacity
//                         key={range}
//                         onPress={() => setTimeRange(range)}
//                         className={`px-3 py-1 rounded-full ${
//                           timeRange === range
//                             ? "bg-sky-500/20 border border-sky-500/30"
//                             : "bg-white/5 border border-white/10"
//                         }`}
//                       >
//                         <Text
//                           className={`text-xs font-medium ${
//                             timeRange === range
//                               ? "text-sky-400"
//                               : "text-slate-400"
//                           }`}
//                         >
//                           {range.charAt(0).toUpperCase() + range.slice(1)}
//                         </Text>
//                       </TouchableOpacity>
//                     ),
//                   )}
//                 </View>
//               }
//             />
//             <Card className="p-0 overflow-hidden">
//               <LineChart
//                 data={orderChartData}
//                 width={chartWidth}
//                 height={180}
//                 chartConfig={{
//                   backgroundColor: "transparent",
//                   backgroundGradientFrom: "#0f172a",
//                   backgroundGradientTo: "#0f172a",
//                   decimalPlaces: 0,
//                   color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
//                   labelColor: (opacity = 1) =>
//                     `rgba(148, 163, 184, ${opacity})`,
//                   style: { borderRadius: 0 },
//                   propsForDots: {
//                     r: "4",
//                     strokeWidth: "2",
//                     stroke: "#38bdf8",
//                   },
//                 }}
//                 bezier
//                 style={{ borderRadius: 0, marginLeft: -20 }}
//                 withInnerLines={false}
//                 withOuterLines={false}
//                 withVerticalLabels={true}
//                 withHorizontalLabels={true}
//               />
//             </Card>
//           </View>

//           {/* ✅ Category Distribution */}
//           {categoryChartData.length > 0 && (
//             <View className="px-5 mt-4">
//               <SectionTitle title="Category Distribution" />
//               <Card className="items-center py-4">
//                 <PieChart
//                   data={categoryChartData}
//                   width={chartWidth}
//                   height={180}
//                   chartConfig={{
//                     color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
//                   }}
//                   accessor="count"
//                   backgroundColor="transparent"
//                   paddingLeft="15"
//                   absolute
//                 />
//               </Card>
//             </View>
//           )}

//           {/* ✅ Recent Orders */}
//           <View className="px-5 mt-4">
//             <SectionTitle
//               title="Recent Orders"
//               action={
//                 <TouchableOpacity onPress={() => router.push("/(tabs)/orders")}>
//                   <Text className="text-sky-400 text-xs font-medium">
//                     View All
//                   </Text>
//                 </TouchableOpacity>
//               }
//             />
//             {metrics.recentOrders.length > 0 ? (
//               metrics.recentOrders.map((order: any, index: number) => (
//                 <TouchableOpacity
//                   key={order.id}
//                   className="bg-white/5 rounded-xl p-3 mb-2 border border-white/10"
//                   onPress={() => router.push(`/receipt/${order.id}`)}
//                 >
//                   <View className="flex-row items-center justify-between">
//                     <View>
//                       <Text className="text-white font-semibold">
//                         #{order.orderNumber || order.id.slice(-6).toUpperCase()}
//                       </Text>
//                       <Text className="text-slate-400 text-xs">
//                         {new Date(order.createdAt).toLocaleString()}
//                       </Text>
//                     </View>
//                     <View className="items-end">
//                       <Text className="text-sky-400 font-bold">
//                         ${(order.grandTotal || 0).toFixed(2)}
//                       </Text>
//                       <Pill
//                         label={order.status || "PENDING"}
//                         tone={
//                           order.status === "COMPLETED"
//                             ? "emerald"
//                             : order.status === "PENDING"
//                               ? "amber"
//                               : "rose"
//                         }
//                       />
//                     </View>
//                   </View>
//                 </TouchableOpacity>
//               ))
//             ) : (
//               <Card>
//                 <Text className="text-slate-400 text-center py-4">
//                   No recent orders
//                 </Text>
//               </Card>
//             )}
//           </View>

//           {/* ✅ Quick Actions */}
//           <View className="px-5 mt-4">
//             <SectionTitle title="Quick Actions" />
//             <View className="flex-row flex-wrap gap-3">
//               <TouchableOpacity
//                 className="flex-1 min-w-[30%] bg-sky-500/10 rounded-xl p-4 border border-sky-500/20 items-center"
//                 onPress={() => router.push("/(tabs)/pos")}
//               >
//                 <MaterialIcons
//                   name="add-shopping-cart"
//                   size={24}
//                   color="#38bdf8"
//                 />
//                 <Text className="text-sky-400 text-xs font-medium mt-2">
//                   New Order
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 className="flex-1 min-w-[30%] bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 items-center"
//                 onPress={() => router.push("/(tabs)/manage")}
//               >
//                 <MaterialIcons name="settings" size={24} color="#34d399" />
//                 <Text className="text-emerald-400 text-xs font-medium mt-2">
//                   Manage
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 className="flex-1 min-w-[30%] bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 items-center"
//                 onPress={() => router.push("/sync")}
//               >
//                 <MaterialIcons name="sync" size={24} color="#fbbf24" />
//                 <Text className="text-amber-400 text-xs font-medium mt-2">
//                   Sync
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 className="flex-1 min-w-[30%] bg-purple-500/10 rounded-xl p-4 border border-purple-500/20 items-center"
//                 onPress={() => router.push("/(tabs)/inventory")}
//               >
//                 <MaterialIcons name="inventory" size={24} color="#a78bfa" />
//                 <Text className="text-purple-400 text-xs font-medium mt-2">
//                   Inventory
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 className="flex-1 min-w-[30%] bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 items-center"
//                 onPress={() => router.push("/(tabs)/customers")}
//               >
//                 <MaterialIcons name="people" size={24} color="#f87171" />
//                 <Text className="text-rose-400 text-xs font-medium mt-2">
//                   Customers
//                 </Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 className="flex-1 min-w-[30%] bg-sky-500/10 rounded-xl p-4 border border-sky-500/20 items-center"
//                 onPress={() => router.push("/sync")}
//               >
//                 <MaterialIcons name="cloud-upload" size={24} color="#38bdf8" />
//                 <Text className="text-sky-400 text-xs font-medium mt-2">
//                   Sync Status
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* ✅ System Status */}
//           <View className="px-5 mt-4">
//             <SectionTitle title="System Status" />
//             <Card>
//               <View className="flex-row items-center justify-between py-2">
//                 <Text className="text-slate-400 text-sm">Session</Text>
//                 <Pill
//                   label={activeSession ? "Active" : "Inactive"}
//                   tone={activeSession ? "emerald" : "rose"}
//                 />
//               </View>
//               <View className="flex-row items-center justify-between py-2 border-t border-white/5">
//                 <Text className="text-slate-400 text-sm">Store</Text>
//                 <Text className="text-white text-sm">
//                   {user?.currentStoreId
//                     ? stores.find((s: any) => s.id === user.currentStoreId)
//                         ?.name || "Unknown"
//                     : "Not selected"}
//                 </Text>
//               </View>
//               <View className="flex-row items-center justify-between py-2 border-t border-white/5">
//                 <Text className="text-slate-400 text-sm">Total Staff</Text>
//                 <Text className="text-white text-sm">{metrics.totalStaff}</Text>
//               </View>
//               <View className="flex-row items-center justify-between py-2 border-t border-white/5">
//                 <Text className="text-slate-400 text-sm">Total Suppliers</Text>
//                 <Text className="text-white text-sm">
//                   {metrics.totalSuppliers}
//                 </Text>
//               </View>
//               <View className="flex-row items-center justify-between py-2 border-t border-white/5">
//                 <Text className="text-slate-400 text-sm">Total Brands</Text>
//                 <Text className="text-white text-sm">
//                   {metrics.totalBrands}
//                 </Text>
//               </View>
//             </Card>
//           </View>

//           {/* ✅ Version Info */}
//           <View className="px-5 mt-6">
//             <Text className="text-slate-600 text-xs text-center">
//               POS & ERP System v2.0 • {new Date().toLocaleDateString()}
//             </Text>
//           </View>
//         </ScrollView>
//       </SafeAreaView>
//     </Screen>
//   );
// }
