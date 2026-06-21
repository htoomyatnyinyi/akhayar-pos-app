import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  Header,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";

const orders = [
  { title: "ORD-1842", subtitle: "2 items • Cashier Aung", right: "$42.00", icon: "shopping-bag" as const },
  { title: "ORD-1841", subtitle: "6 items • Card payment", right: "$118.50", icon: "credit-card" as const },
  { title: "ORD-1840", subtitle: "Pickup • 14:20", right: "Preparing", icon: "schedule" as const },
  { title: "ORD-1839", subtitle: "Refund approved", right: "-$18.00", icon: "undo" as const },
];

export default function OrdersScreen() {
  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Header
            eyebrow="Sales"
            title="Orders"
            subtitle="Track live transactions, fulfillment, and exceptions in one place."
            right={<Pill label="36 open" tone="amber" />}
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Card>
                <StatRow label="Today" value="128 orders" />
                <StatRow label="Paid" value="112" />
              </Card>
            </View>
            <View className="flex-1">
              <Card>
                <StatRow label="Pending" value="16 orders" />
                <StatRow label="Refunds" value="2" />
              </Card>
            </View>
          </View>

          <SectionTitle title="Recent orders" action="Filter" />
          <Card className="mb-4">
            {orders.map((item, index) => (
              <View key={item.title}>
                <RowItem {...item} />
                {index < orders.length - 1 ? <View className="my-3 h-px bg-white/8" /> : null}
              </View>
            ))}
          </Card>

          <SectionTitle title="Work queue" />
          <Card>
            <RowItem title="Kitchen printer" subtitle="3 tickets waiting" right="Online" icon="print" />
            <View className="my-3 h-px bg-white/8" />
            <RowItem title="Delivery platform" subtitle="2 pickups due in 20 minutes" right="Sync OK" icon="delivery-dining" />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

