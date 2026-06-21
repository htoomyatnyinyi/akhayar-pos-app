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

const products = [
  { title: "Fresh Milk 2L", subtitle: "SKU MILK-2001", right: "12 left", icon: "local-drink" as const },
  { title: "Rice 5kg", subtitle: "SKU RICE-5001", right: "48 left", icon: "shopping-bag" as const },
  { title: "Laundry Soap", subtitle: "SKU SOAP-1040", right: "Low", icon: "warning" as const },
  { title: "Cooking Oil 1L", subtitle: "SKU OIL-1022", right: "24 left", icon: "kitchen" as const },
];

export default function InventoryScreen() {
  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Header
            eyebrow="Catalog"
            title="Inventory"
            subtitle="Keep item counts, replenishment, and product visibility easy to scan."
            right={<Pill label="14 low stock" tone="rose" />}
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Card>
                <StatRow label="Active SKUs" value="1,248" />
                <StatRow label="New items" value="24 this week" />
              </Card>
            </View>
            <View className="flex-1">
              <Card>
                <StatRow label="Reorder alerts" value="14 items" />
                <StatRow label="Out of stock" value="3 items" />
              </Card>
            </View>
          </View>

          <SectionTitle title="Needs replenishment" action="Manage" />
          <Card className="mb-4">
            {products.map((item, index) => (
              <View key={item.title}>
                <RowItem {...item} />
                {index < products.length - 1 ? <View className="my-3 h-px bg-white/8" /> : null}
              </View>
            ))}
          </Card>

          <SectionTitle title="Stock operations" />
          <Card>
            <RowItem title="Receive purchase order" subtitle="Log supplier delivery and update counts" right="Open" icon="inventory-2" />
            <View className="my-3 h-px bg-white/8" />
            <RowItem title="Cycle count" subtitle="Audit fast-moving items" right="Start" icon="fact-check" />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

