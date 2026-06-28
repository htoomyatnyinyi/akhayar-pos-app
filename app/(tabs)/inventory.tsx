import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { eq, sql, and, or } from "drizzle-orm";
import { getOfflineDb } from "@/services/offline/db";
import { products } from "@/services/offline/schema";
import {
  Card,
  Header,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

export default function InventoryScreen() {
  const { currentStoreId } = useAppSelector((state) => state.auth);
  
  const [inventory, setInventory] = useState<Array<{
    id: string;
    product: { name: string; sku: string };
    quantity: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadInventory = async () => {
        setIsLoading(true);
        try {
          const db = getOfflineDb();
          const condition = currentStoreId 
            ? and(eq(products.isActive, true), or(eq(products.storeId, currentStoreId), sql`${products.storeId} IS NULL`)) 
            : eq(products.isActive, true);
            
          const items = await db.select().from(products).where(condition);
          
          setInventory(items.map(item => ({
            id: item.id,
            product: {
              name: item.name,
              sku: item.sku,
            },
            quantity: item.stockQuantity,
          })));
        } catch (e) {
          console.error("Failed to load inventory", e);
        } finally {
          setIsLoading(false);
        }
      };

      loadInventory();
    }, [currentStoreId])
  );

  const lowStockThreshold = 15; // Example threshold

  const stats = useMemo(() => {
    let activeSkus = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach((item) => {
      activeSkus++;
      if (item.quantity <= 0) outOfStockCount++;
      else if (item.quantity <= lowStockThreshold) lowStockCount++;
    });

    return { activeSkus, lowStockCount, outOfStockCount };
  }, [inventory]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(
      (item) => item.quantity > 0 && item.quantity <= lowStockThreshold,
    );
  }, [inventory]);

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Header
            eyebrow="Catalog"
            title="Inventory"
            subtitle="Keep item counts, replenishment, and product visibility easy to scan."
            right={
              <Pill
                label={`${stats.lowStockCount} low stock`}
                tone={stats.lowStockCount > 0 ? "rose" : "emerald"}
              />
            }
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Card>
                <StatRow label="Active SKUs" value={String(stats.activeSkus)} />
                <StatRow
                  label="In stock"
                  value={`${stats.activeSkus - stats.outOfStockCount} items`}
                />
              </Card>
            </View>
            <View className="flex-1">
              <Card>
                <StatRow
                  label="Reorder alerts"
                  value={`${stats.lowStockCount} items`}
                />
                <StatRow
                  label="Out of stock"
                  value={`${stats.outOfStockCount} items`}
                />
              </Card>
            </View>
          </View>

          <SectionTitle title="Needs replenishment" action="Manage" />
          <Card className="mb-4">
            {isLoading ? (
              <Text className="py-8 text-center text-sm text-slate-400">
                Loading...
              </Text>
            ) : lowStockItems.length > 0 ? (
              lowStockItems.map((item, index) => (
                <View key={item.id}>
                  <RowItem
                    title={item.product?.name ?? "Unknown"}
                    subtitle={`SKU ${item.product?.sku ?? ""}`}
                    right={`${item.quantity} left`}
                    icon="warning"
                  />
                  {index < lowStockItems.length - 1 ? (
                    <View className="my-3 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-8 text-center text-sm text-slate-400">
                All items are well stocked.
              </Text>
            )}
          </Card>

          <SectionTitle title="Stock operations" />
          <Card>
            <Pressable
              onPress={() =>
                Alert.alert("Coming soon", "Receive purchase order UI")
              }
            >
              <RowItem
                title="Receive purchase order"
                subtitle="Log supplier delivery and update counts"
                right="Open"
                icon="inventory-2"
              />
            </Pressable>
            <View className="my-3 h-px bg-white/8" />
            <Pressable
              onPress={() => Alert.alert("Coming soon", "Cycle count UI")}
            >
              <RowItem
                title="Cycle count"
                subtitle="Audit fast-moving items"
                right="Start"
                icon="fact-check"
              />
            </Pressable>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
