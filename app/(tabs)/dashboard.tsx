import { ScrollView, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo } from "react";
import {
  Card,
  Header,
  Pill,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { useGetOrdersQuery } from "@/services/features/order/orderApi";

const tasks = [
  "Review shift close for branch 01",
  "Approve 3 low-stock reorder suggestions",
  "Check pending returns before 6 PM",
  "Send daily summary to management",
];

export default function DashboardScreen() {
  const { currentStoreId } = useAppSelector((state) => state.auth);
  const { data: response } = useGetOrdersQuery(currentStoreId || undefined);

  // 1. Safe array extraction depending on your API shape
  const orders = useMemo(() => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (
      response &&
      typeof response === "object" &&
      "orders" in response &&
      Array.isArray(response.orders)
    ) {
      return response.orders;
    }
    return [];
  }, [response]);

  const stats = useMemo(() => {
    let revenue = 0;
    let transactions = orders.length;
    let paymentTotals: Record<string, number> = {};

    // 2. Double check that orders is a valid array before looping
    if (Array.isArray(orders)) {
      orders.forEach((order) => {
        // Safe check to ensure order and grandTotal exist
        if (!order) return;
        const total = Number(order.grandTotal) || 0;

        revenue += total;

        if (order.paymentMethod) {
          paymentTotals[order.paymentMethod] =
            (paymentTotals[order.paymentMethod] || 0) + total;
        }
      });
    }

    const channels = Object.entries(paymentTotals).map(([method, amount]) => {
      const percentage = revenue > 0 ? (amount / revenue) * 100 : 0;
      let tone: "emerald" | "sky" | "amber" | "rose" = "sky";
      if (method === "CASH") tone = "emerald";
      if (method.includes("PAY")) tone = "amber";

      return {
        label: method,
        value: `${percentage.toFixed(0)}%`,
        tone,
      };
    });

    return {
      revenue,
      transactions,
      avgTicket: transactions > 0 ? revenue / transactions : 0,
      channels,
    };
  }, [orders]);

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Header
            eyebrow="Insights"
            title="Dashboard"
            subtitle="A clean view for managers: revenue, channel mix, staffing, and pending tasks."
            right={<Pill label="Management" tone="sky" />}
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Card>
                <StatRow
                  label="Revenue"
                  value={`$${stats.revenue.toFixed(2)}`}
                />
                <StatRow
                  label="Transactions"
                  value={String(stats.transactions)}
                />
              </Card>
            </View>
            <View className="flex-1">
              <Card>
                <StatRow
                  label="Avg ticket"
                  value={`$${stats.avgTicket.toFixed(2)}`}
                />
                <StatRow label="Orders" value={String(stats.transactions)} />
              </Card>
            </View>
          </View>

          <SectionTitle title="Payment mix" />
          <Card className="mb-4">
            {stats.channels.length > 0 ? (
              stats.channels.map((channel) => (
                <View key={channel.label}>
                  <View className="flex-row items-center justify-between py-1">
                    <Pill label={channel.label} tone={channel.tone} />
                    <Pill label={channel.value} tone={channel.tone} />
                  </View>
                </View>
              ))
            ) : (
              <Text className="text-slate-400 py-2 pl-4">
                No payment data available yet.
              </Text>
            )}
          </Card>

          <SectionTitle title="Manager checklist" action="Today" />
          <Card>
            {tasks.map((task, index) => (
              <View key={task}>
                <StatRow
                  label={task}
                  value={index === 0 ? "Priority" : "Pending"}
                />
                {index < tasks.length - 1 ? (
                  <View className="my-2 h-px bg-white/8" />
                ) : null}
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
