import {
  Card,
  Header,
  MetricCard,
  Pill,
  Screen,
  SectionTitle,
  ActionButton,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetLocalOrdersQuery,
  useGetLocalProductsQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line as SvgLine,
} from "react-native-svg";

type ChartType = "bar" | "area" | "line";

// ============================================
// Enhanced Bar Chart Component
// ============================================

function EnhancedBarChart({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const maxValue = Math.max(...data, 1);
  const barHeight = 110;
  const todayIndex = data.length - 1;

  return (
    <View className="mt-2">
      <View className="flex-row items-end justify-between h-[130px] px-1">
        {data.map((value, index) => {
          const height = (value / maxValue) * barHeight;
          const isToday = index === todayIndex;
          const color = isToday ? "#38bdf8" : "#475569";
          return (
            <View key={index} className="items-center flex-1">
              {/* Value Label above bar */}
              <Text
                className={`text-[9px] font-bold mb-1.5 ${
                  isToday ? "text-sky-300" : "text-slate-400"
                }`}
                numberOfLines={1}
              >
                ${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value.toFixed(0)}
              </Text>

              <View
                style={{
                  height: Math.max(height, 6),
                  width: 26,
                  backgroundColor: color,
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  opacity: isToday ? 1 : 0.7,
                }}
              />
            </View>
          );
        })}
      </View>
      {/* X-Axis Labels */}
      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
        {labels.map((label, index) => (
          <Text
            key={index}
            className={`text-center flex-1 text-[10px] font-semibold ${
              index === todayIndex ? "text-sky-300 font-bold" : "text-slate-400"
            }`}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ============================================
// Enhanced Area & Line Chart Component
// ============================================

function EnhancedSvgChart({
  data,
  labels,
  variant = "area",
}: {
  data: number[];
  labels: string[];
  variant: "area" | "line";
}) {
  const maxValue = Math.max(...data, 1);
  const width = 320;
  const height = 130;
  const paddingX = 22;
  const paddingTop = 26;
  const paddingBottom = 16;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const todayIndex = data.length - 1;

  // Calculate coordinates for points
  const points = data.map((val, idx) => {
    const x = paddingX + idx * (plotWidth / (data.length - 1 || 1));
    const y = paddingTop + plotHeight - (val / maxValue) * plotHeight;
    return { x, y, val };
  });

  // Construct smooth line path (curved)
  let linePath = "";
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      linePath += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
  }

  // Construct closed area path for gradient
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : "";

  return (
    <View className="mt-2">
      <View className="items-center">
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <Stop offset="80%" stopColor="#38bdf8" stopOpacity="0.05" />
              <Stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#0284c7" />
              <Stop offset="70%" stopColor="#38bdf8" />
              <Stop offset="100%" stopColor="#34d399" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <SvgLine
            x1={paddingX}
            y1={paddingTop}
            x2={width - paddingX}
            y2={paddingTop}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.4"
          />
          <SvgLine
            x1={paddingX}
            y1={paddingTop + plotHeight / 2}
            x2={width - paddingX}
            y2={paddingTop + plotHeight / 2}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.4"
          />
          <SvgLine
            x1={paddingX}
            y1={height - paddingBottom}
            x2={width - paddingX}
            y2={height - paddingBottom}
            stroke="#334155"
            strokeWidth="1"
            strokeOpacity="0.6"
          />

          {/* Area Fill */}
          {variant === "area" && (
            <Path d={areaPath} fill="url(#areaGradient)" />
          )}

          {/* Smooth Line */}
          <Path
            d={linePath}
            fill="none"
            stroke="url(#lineStroke)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Dots on data points */}
          {points.map((p, idx) => {
            const isToday = idx === todayIndex;
            return (
              <React.Fragment key={idx}>
                {isToday && (
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="#38bdf8"
                    fillOpacity="0.25"
                  />
                )}
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={isToday ? "5" : "3.5"}
                  fill={isToday ? "#38bdf8" : "#0f172a"}
                  stroke={isToday ? "#ffffff" : "#38bdf8"}
                  strokeWidth={isToday ? "2" : "1.5"}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Top Value Labels floating over points */}
      <View className="flex-row items-center justify-between px-1 -mt-2">
        {data.map((value, index) => {
          const isToday = index === todayIndex;
          return (
            <Text
              key={index}
              className={`text-[9px] font-bold text-center flex-1 ${
                isToday ? "text-sky-300" : "text-slate-400"
              }`}
            >
              ${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value.toFixed(0)}
            </Text>
          );
        })}
      </View>

      {/* X-Axis Labels */}
      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
        {labels.map((label, index) => (
          <Text
            key={index}
            className={`text-center flex-1 text-[10px] font-semibold ${
              index === todayIndex ? "text-sky-300 font-bold" : "text-slate-400"
            }`}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ============================================
// Main Component
// ============================================

export default function DashboardScreen() {
  const { currentStoreId } = useAppSelector((state) => state.auth);
  const [chartType, setChartType] = useState<ChartType>("area");

  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useGetLocalOrdersQuery(
    { storeId: currentStoreId || undefined },
    { pollingInterval: 10000 }
  );

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
    // Helper to get date strings
    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    const todayOrders = orders.filter((o: any) => new Date(o.createdAt).toDateString() === todayStr);
    const yesterdayOrders = orders.filter((o: any) => new Date(o.createdAt).toDateString() === yesterdayStr);

    const todayRevenue = todayOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
    const yesterdayRevenue = yesterdayOrders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Trend calculations
    const revenueDeltaNum = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : (todayRevenue > 0 ? 100 : 0);
    const revenueDelta = revenueDeltaNum === 0 ? "0%" : `${revenueDeltaNum > 0 ? "+" : ""}${revenueDeltaNum.toFixed(1)}%`;
    const revenueTrendTone = revenueDeltaNum >= 0 ? "emerald" : "rose";

    const ordersDeltaNum = yesterdayOrders.length > 0 ? ((todayOrders.length - yesterdayOrders.length) / yesterdayOrders.length) * 100 : (todayOrders.length > 0 ? 100 : 0);
    const ordersDelta = ordersDeltaNum === 0 ? "0%" : `${ordersDeltaNum > 0 ? "+" : ""}${ordersDeltaNum.toFixed(1)}%`;
    const ordersTrendTone = ordersDeltaNum >= 0 ? "emerald" : "rose";

    // Order status breakdown (Today)
    const statusCounts = todayOrders.reduce(
      (acc: Record<string, number>, order: any) => {
        const status = order.status || "UNKNOWN";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {}
    );

    // Last 7 days revenue for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const dailyRevenue = last7Days.map((d) => {
      const dayStr = d.toDateString();
      return orders
        .filter((o: any) => new Date(o.createdAt).toDateString() === dayStr)
        .reduce((sum: number, o: any) => sum + Number(o.grandTotal || 0), 0);
    });

    // Top products (Today)
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of todayOrders) {
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
          productSales[item.productId].revenue += Number(item.unitPrice || 0) * Number(item.quantity || 0);
        }
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    const maxProductQty = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.qty)) : 1;

    // Recent 5 Orders
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      todayOrders: todayOrders.length,
      yesterdayOrders: yesterdayOrders.length,
      ordersDelta,
      ordersTrendTone,
      
      todayRevenue,
      yesterdayRevenue,
      revenueDelta,
      revenueTrendTone,
      
      avgOrderValue,
      
      pendingOrders: statusCounts["PENDING"] || 0,
      completedOrders: statusCounts["COMPLETED"] || 0,
      voidedOrders: (statusCounts["VOIDED"] || 0) + (statusCounts["CANCELLED"] || 0),
      
      dailyRevenue,
      last7DaysLabels: last7Days.map((d, idx) => idx === 6 ? "Today" : d.toLocaleDateString('en-US', { weekday: 'short' })),
      
      topProducts,
      maxProductQty,
      recentOrders,
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
            subtitle={`Store: ${currentStoreId ? "Active" : "Global"}`}
            right={
              <View className="flex-row items-center gap-2">
                <Pill
                  label={currentStoreId ? "Store View" : "Global View"}
                  tone={currentStoreId ? "emerald" : "sky"}
                />
              </View>
            }
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text className="text-slate-400 mt-4 font-medium">Loading analytics...</Text>
          </View>
        ) : (
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 60 }}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={onRefresh}
                tintColor="#38bdf8"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Actions Row */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              className="mb-6"
              contentContainerStyle={{ gap: 12, paddingRight: 20 }}
            >
              <ActionButton 
                title="New Sale" 
                icon="point-of-sale" 
                accent="sky" 
                onPress={() => router.push("/pos")} 
              />
              <ActionButton 
                title="View Orders" 
                icon="receipt-long" 
                accent="emerald" 
                onPress={() => router.push("/orders")} 
              />
              <ActionButton 
                title="Inventory" 
                icon="inventory" 
                accent="amber" 
                onPress={() => router.push("/inventory")} 
              />
            </ScrollView>

            {/* KPIs Row */}
            <View className="flex-row flex-wrap gap-3 mb-6">
              <View className="w-[48%]">
                <MetricCard
                  icon="attach-money"
                  label="Today's Sales"
                  value={`$${metrics.todayRevenue.toFixed(2)}`}
                  delta={`${metrics.revenueDelta} vs yesterday`}
                  tone={metrics.revenueTrendTone as any}
                />
              </View>
              <View className="w-[48%]">
                <MetricCard
                  icon="receipt-long"
                  label="Today's Orders"
                  value={String(metrics.todayOrders)}
                  delta={`${metrics.ordersDelta} vs yesterday`}
                  tone={metrics.ordersTrendTone as any}
                />
              </View>
            </View>

            {/* Revenue Trend Chart with Graph Type Switcher */}
            <View className="flex-row items-center justify-between mb-2">
              <SectionTitle title="Revenue Trend (7 Days)" />
              <View className="flex-row bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <TouchableOpacity
                  onPress={() => setChartType("area")}
                  className={`px-2.5 py-1 rounded-md flex-row items-center gap-1 ${
                    chartType === "area" ? "bg-sky-500/20 border border-sky-500/30" : ""
                  }`}
                >
                  <MaterialIcons
                    name="show-chart"
                    size={14}
                    color={chartType === "area" ? "#38bdf8" : "#64748b"}
                  />
                  <Text
                    className={`text-[10px] font-bold ${
                      chartType === "area" ? "text-sky-300" : "text-slate-400"
                    }`}
                  >
                    Area
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setChartType("bar")}
                  className={`px-2.5 py-1 rounded-md flex-row items-center gap-1 ${
                    chartType === "bar" ? "bg-sky-500/20 border border-sky-500/30" : ""
                  }`}
                >
                  <MaterialIcons
                    name="bar-chart"
                    size={14}
                    color={chartType === "bar" ? "#38bdf8" : "#64748b"}
                  />
                  <Text
                    className={`text-[10px] font-bold ${
                      chartType === "bar" ? "text-sky-300" : "text-slate-400"
                    }`}
                  >
                    Bar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setChartType("line")}
                  className={`px-2.5 py-1 rounded-md flex-row items-center gap-1 ${
                    chartType === "line" ? "bg-sky-500/20 border border-sky-500/30" : ""
                  }`}
                >
                  <MaterialIcons
                    name="timeline"
                    size={14}
                    color={chartType === "line" ? "#38bdf8" : "#64748b"}
                  />
                  <Text
                    className={`text-[10px] font-bold ${
                      chartType === "line" ? "text-sky-300" : "text-slate-400"
                    }`}
                  >
                    Line
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Card className="mb-6">
              {chartType === "bar" && (
                <EnhancedBarChart
                  data={metrics.dailyRevenue}
                  labels={metrics.last7DaysLabels}
                />
              )}
              {chartType === "area" && (
                <EnhancedSvgChart
                  data={metrics.dailyRevenue}
                  labels={metrics.last7DaysLabels}
                  variant="area"
                />
              )}
              {chartType === "line" && (
                <EnhancedSvgChart
                  data={metrics.dailyRevenue}
                  labels={metrics.last7DaysLabels}
                  variant="line"
                />
              )}
            </Card>

            {/* Status Breakdown (Today) */}
            <SectionTitle title="Today's Order Status" />
            <Card className="mb-6">
              <View className="flex-row justify-between py-2 px-2">
                <View className="items-center flex-1 border-r border-slate-800">
                  <Text className="text-emerald-400 font-black text-2xl">
                    {metrics.completedOrders}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-wider">Completed</Text>
                </View>
                <View className="items-center flex-1 border-r border-slate-800">
                  <Text className="text-amber-400 font-black text-2xl">
                    {metrics.pendingOrders}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-wider">Pending</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-rose-400 font-black text-2xl">
                    {metrics.voidedOrders}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-wider">Voided</Text>
                </View>
              </View>
            </Card>

            {/* Top Selling Products */}
            <SectionTitle title="Top Selling Products (Today)" />
            <Card className="mb-6">
              {metrics.topProducts.length === 0 ? (
                <View className="py-6 items-center">
                  <MaterialIcons name="inventory-2" size={32} color="#334155" />
                  <Text className="text-slate-500 text-sm mt-3 font-medium">No sales recorded today.</Text>
                </View>
              ) : (
                metrics.topProducts.map((p, index) => {
                  const widthPct = (p.qty / metrics.maxProductQty) * 100;
                  return (
                    <View key={index} className="mb-4 last:mb-0">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-white font-semibold text-sm" numberOfLines={1}>{p.name}</Text>
                        <Text className="text-slate-400 text-xs font-bold">{p.qty} units</Text>
                      </View>
                      <View className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <View 
                          className="h-full bg-sky-500 rounded-full" 
                          style={{ width: `${widthPct}%` }}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </Card>

            {/* Recent Orders Snippet */}
            <SectionTitle title="Recent Transactions" />
            <Card className="mb-6">
              {metrics.recentOrders.length === 0 ? (
                <View className="py-6 items-center">
                  <MaterialIcons name="receipt" size={32} color="#334155" />
                  <Text className="text-slate-500 text-sm mt-3 font-medium">No recent transactions.</Text>
                </View>
              ) : (
                <View>
                  {metrics.recentOrders.map((order: any, idx: number) => {
                    const isLast = idx === metrics.recentOrders.length - 1;
                    return (
                      <View 
                        key={order.id} 
                        className={`py-3 flex-row justify-between items-center ${!isLast ? 'border-b border-white/5' : ''}`}
                      >
                        <View>
                          <Text className="text-white font-bold">
                            #{order.orderNumber || order.id.slice(-6)}
                          </Text>
                          <Text className="text-slate-400 text-xs mt-0.5">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-emerald-400 font-bold mb-1">
                            ${order.grandTotal?.toFixed(2) || "0.00"}
                          </Text>
                          <Pill
                            label={order.status}
                            tone={
                              order.status === "COMPLETED" ? "emerald" :
                              order.status === "PENDING" ? "amber" : "rose"
                            }
                          />
                        </View>
                      </View>
                    );
                  })}
                  <TouchableOpacity 
                    className="mt-4 py-3 bg-white/5 rounded-xl border border-white/10 items-center"
                    onPress={() => router.push("/orders")}
                  >
                    <Text className="text-slate-300 font-bold text-xs uppercase tracking-wider">View All Orders</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>

          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
