import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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

const quickStats = [
  { label: "Today's Sales", value: "$12,480", delta: "+18% vs yesterday", tone: "emerald" as const, icon: "point-of-sale" as const },
  { label: "Open Orders", value: "36", delta: "9 need attention", tone: "amber" as const, icon: "receipt-long" as const },
  { label: "Low Stock Items", value: "14", delta: "3 critical", tone: "rose" as const, icon: "inventory" as const },
  { label: "Active Sessions", value: "5", delta: "2 cashiers on shift", tone: "sky" as const, icon: "store" as const },
];

const activities = [
  { title: "Order #1842", subtitle: "Walk-in - waiting for kitchen", right: "$42.00", icon: "receipt" as const },
  { title: "PO-3321", subtitle: "Supplier delivery expected 2:30 PM", right: "Inbound", icon: "local-shipping" as const },
  { title: "Milk 2L", subtitle: "Stock at 12 units", right: "Low", icon: "warning" as const },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
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
            <ActionButton title="New Sale" icon="add-shopping-cart" accent="emerald" onPress={() => router.push("/orders")} />
            <ActionButton title="Receive Stock" icon="inventory-2" accent="amber" onPress={() => router.push("/inventory")} />
          </View>
          <View className="mb-4 flex-row gap-3">
            <ActionButton title="Reports" icon="assessment" accent="sky" onPress={() => router.push("/dashboard")} />
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

          <SectionTitle title="What needs attention" action="View all" />
          <Card className="mb-4">
            {activities.map((item, index) => (
              <View key={item.title}>
                <RowItem {...item} />
                {index < activities.length - 1 ? <View className="my-3 h-px bg-white/8" /> : null}
              </View>
            ))}
          </Card>

          <SectionTitle title="Shift snapshot" />
          <Card className="mb-6">
            <StatRow label="Gross sales" value="$15,120" />
            <StatRow label="Discounts" value="$640" />
            <StatRow label="Refunds" value="$120" />
            <Divider />
            <StatRow label="Net sales" value="$14,360" />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

