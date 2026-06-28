import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { eq, sql, and, lt } from "drizzle-orm";
import { getOfflineDb } from "@/services/offline/db";
import { orders, products, sessions } from "@/services/offline/schema";
import {
  ActionButton,
  Card,
  Divider,
  Header,
  MetricCard,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
  SmallLabel,
  StatRow,
} from "@/components/app-ui";

export default function HomeScreen() {
  const router = useRouter();

  const [stats, setStats] = useState({
    todaySales: 0,
    openOrders: 0,
    lowStock: 0,
    activeSessions: 0,
  });

  const [shiftSnapshot, setShiftSnapshot] = useState({
    grossSales: 0,
    discounts: 0,
    refunds: 0,
    netSales: 0,
  });

  const [recentActivities, setRecentActivities] = useState<
    Array<{
      title: string;
      subtitle: string;
      right: string;
      icon: "receipt" | "local-shipping" | "warning";
    }>
  >([]);

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        try {
          const db = getOfflineDb();

          // Today's Date
          const today = new Date().toISOString().split("T")[0];

          // Today's Sales
          const salesResult = await db
            .select({ total: sql<number>`sum(${orders.grandTotal})` })
            .from(orders)
            .where(
              and(
                eq(orders.status, "COMPLETED"),
                sql`date(${orders.createdAt}) = ${today}`,
              ),
            );
          const todaySales = salesResult[0]?.total || 0;

          // Open Orders
          const openOrdersResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(orders)
            .where(eq(orders.status, "PENDING"));
          const openOrders = openOrdersResult[0]?.count || 0;

          // Low Stock Items
          const lowStockResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(lt(products.stockQuantity, 10));
          const lowStock = lowStockResult[0]?.count || 0;

          // Active Sessions
          const sessionsResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(sessions)
            .where(eq(sessions.status, "OPEN"));
          const activeSessions = sessionsResult[0]?.count || 0;

          setStats({
            todaySales,
            openOrders,
            lowStock,
            activeSessions,
          });

          // Shift snapshot
          const shiftSalesResult = await db
            .select({
              grossSales: sql<number>`sum(${orders.subTotal})`,
              discounts: sql<number>`sum(${orders.discountAmount})`,
              netSales: sql<number>`sum(${orders.grandTotal})`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.status, "COMPLETED"),
                sql`date(${orders.createdAt}) = ${today}`,
              ),
            );

          setShiftSnapshot({
            grossSales: shiftSalesResult[0]?.grossSales || 0,
            discounts: shiftSalesResult[0]?.discounts || 0,
            refunds: 0,
            netSales: shiftSalesResult[0]?.netSales || 0,
          });

          // Recent open orders as activities
          const recentOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.status, "PENDING"))
            .orderBy(sql`${orders.createdAt} desc`)
            .limit(3);

          const activitiesMap = recentOrders.map((o) => ({
            title: `Order ${o.orderNumber || o.id.slice(-4)}`,
            subtitle: `Pending - ${new Date(o.createdAt).toLocaleTimeString()}`,
            right: `$${o.grandTotal.toFixed(2)}`,
            icon: "receipt" as const,
          }));

          setRecentActivities(activitiesMap);
        } catch (e) {
          console.error("Failed to load stats", e);
        }
      };

      loadStats();
    }, []),
  );

  const quickStats = [
    {
      label: "Today's Sales",
      value: `$${stats.todaySales.toFixed(2)}`,
      delta: "Today",
      tone: "emerald" as const,
      icon: "point-of-sale" as const,
    },
    {
      label: "Open Orders",
      value: stats.openOrders.toString(),
      delta: "Need attention",
      tone: "amber" as const,
      icon: "receipt-long" as const,
    },
    {
      label: "Low Stock Items",
      value: stats.lowStock.toString(),
      delta: "< 10 in stock",
      tone: "rose" as const,
      icon: "inventory" as const,
    },
    {
      label: "Active Sessions",
      value: stats.activeSessions.toString(),
      delta: "Open shifts",
      tone: "sky" as const,
      icon: "store" as const,
    },
  ];

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Header
            eyebrow="Operations"
            title="Front Counter"
            subtitle="Fast access to selling, inventory, and daily control without the clutter."
            right={<Pill label="Live" tone="emerald" />}
          />

          <View className="mb-4">
            <Card>
              <View className="flex-row items-center justify-between">
                <SmallLabel label="Store" value="Wyl Mart / Branch 01" />
                <Pill label="Open 08:00 - 22:00" tone="sky" />
              </View>
              <Divider />
              <View className="flex-row gap-3">
                <SmallLabel label="Cashier" value="Aung" />
                <SmallLabel label="Register" value="POS-02" />
              </View>
            </Card>
          </View>

          <View className="mb-4 flex-row gap-3">
            <ActionButton
              title="New Sale"
              icon="add-shopping-cart"
              accent="emerald"
              onPress={() => router.push("/orders")}
            />
            <ActionButton
              title="Receive Stock"
              icon="inventory-2"
              accent="amber"
              onPress={() => router.push("/inventory")}
            />
          </View>
          <View className="mb-4 flex-row gap-3">
            <ActionButton
              title="Reports"
              icon="assessment"
              accent="sky"
              onPress={() => router.push("/dashboard")}
            />
            <ActionButton title="Customers" icon="groups" accent="rose" />
          </View>

          <SectionTitle title="Today at a glance" action="Updated just now" />
          <View className="mb-4 flex-row flex-wrap gap-3">
            {quickStats.map((item) => (
              <View key={item.label} className="w-[48.5%]">
                <MetricCard {...item} />
              </View>
            ))}
          </View>

          {recentActivities.length > 0 && (
            <>
              <SectionTitle title="What needs attention" action="View all" />
              <Card className="mb-4">
                {recentActivities.map((item, index) => (
                  <View key={item.title}>
                    <RowItem {...item} />
                    {index < recentActivities.length - 1 ? (
                      <View className="my-3 h-px bg-white/8" />
                    ) : null}
                  </View>
                ))}
              </Card>
            </>
          )}

          <SectionTitle title="Shift snapshot" />
          <Card className="mb-6">
            <StatRow
              label="Gross sales"
              value={`$${shiftSnapshot.grossSales.toFixed(2)}`}
            />
            <StatRow
              label="Discounts"
              value={`$${shiftSnapshot.discounts.toFixed(2)}`}
            />
            <StatRow
              label="Refunds"
              value={`$${shiftSnapshot.refunds.toFixed(2)}`}
            />
            <Divider />
            <StatRow
              label="Net sales"
              value={`$${shiftSnapshot.netSales.toFixed(2)}`}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
