import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useFocusEffect } from "expo-router";
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
import { useGetProductsQuery } from "@/services/features/products/productApi";
import { getLocalProducts } from "@/services/offline/repository";

export default function InventoryScreen() {
  const { currentStoreId } = useAppSelector((state) => state.auth);
  const isOnline = useAppSelector((state) => state.offline.isOnline);
  const syncStatus = useAppSelector((state) => state.offline.syncStatus);

  // Online data
  const {
    data: onlineProducts = [],
    refetch: refetchProducts,
    isLoading: isOnlineLoading,
  } = useGetProductsQuery(currentStoreId || undefined, { skip: !isOnline });

  // Local data
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  // Load local products once
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const products = await getLocalProducts(currentStoreId || undefined);
        setLocalProducts(products);
      } catch (e) {
        console.error("Failed to load local products", e);
      } finally {
        setIsLoadingLocal(false);
      }
    };

    loadLocal();
  }, [currentStoreId]);

  // Transform data based on online/offline status
  const inventory = useMemo(() => {
    const source =
      isOnline && onlineProducts.length > 0 ? onlineProducts : localProducts;

    return source.map((product: any) => ({
      id: product.id,
      product: {
        name: product.name,
        sku: product.sku || "",
      },
      quantity: product.stockQuantity || 0,
    }));
  }, [isOnline, onlineProducts, localProducts]);

  // Refresh when online status changes
  useEffect(() => {
    if (isOnline && onlineProducts.length > 0) {
      // Data will update via useMemo
    }
  }, [isOnline, onlineProducts]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      // Optionally refresh local data on focus
      const refreshLocal = async () => {
        if (!isOnline) {
          const products = await getLocalProducts(currentStoreId || undefined);
          setLocalProducts(products);
        }
      };

      refreshLocal();
    }, [isOnline, currentStoreId]),
  );

  const lowStockThreshold = 15;

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

  const handleRefresh = async () => {
    if (isOnline) {
      await refetchProducts();
    } else {
      const products = await getLocalProducts(currentStoreId || undefined);
      setLocalProducts(products);
    }
  };

  const isLoading = isOnline ? isOnlineLoading : isLoadingLocal;

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
              <View className="flex-row items-center gap-2">
                <Pill
                  label={`${stats.lowStockCount} low stock`}
                  tone={stats.lowStockCount > 0 ? "rose" : "emerald"}
                />
                <Pressable onPress={handleRefresh}>
                  <Pill
                    label={isOnline ? "🔄" : "📶"}
                    tone={isOnline ? "sky" : "amber"}
                  />
                </Pressable>
              </View>
            }
          />

          {/* Sync Status Card */}
          <Card className="mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-400"}`}
                />
                <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
                  {isOnline ? "Online" : "Offline Mode"}
                </Text>
              </View>
              {syncStatus === "syncing" && (
                <Text className="text-xs text-slate-400">Syncing...</Text>
              )}
              {!isOnline && (
                <Text className="text-xs text-amber-400">⚠️ Offline</Text>
              )}
            </View>
            {!isOnline && (
              <Text className="mt-2 text-sm text-slate-300">
                Viewing cached inventory. {inventory.length} items available.
              </Text>
            )}
          </Card>

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

          <SectionTitle
            title="Needs replenishment"
            action={isOnline ? "Manage" : "Offline"}
          />
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
                All items are well stocked. 🎉
              </Text>
            )}
          </Card>

          <SectionTitle title="Stock operations" />
          <Card>
            <Pressable
              onPress={() => {
                if (isOnline) {
                  Alert.alert("Coming soon", "Receive purchase order UI");
                } else {
                  Alert.alert(
                    "Offline Mode",
                    "You are offline. Purchase orders will sync when online.",
                  );
                }
              }}
            >
              <RowItem
                title="Receive purchase order"
                subtitle={isOnline ? "Log supplier delivery" : "Offline mode"}
                right={isOnline ? "Open" : "📶 Offline"}
                icon="inventory-2"
              />
            </Pressable>
            <View className="my-3 h-px bg-white/8" />
            <Pressable
              onPress={() => {
                if (isOnline) {
                  Alert.alert("Coming soon", "Cycle count UI");
                } else {
                  Alert.alert(
                    "Offline Mode",
                    "Cycle counts can be done offline and sync later.",
                  );
                }
              }}
            >
              <RowItem
                title="Cycle count"
                subtitle={isOnline ? "Audit fast-moving items" : "Offline mode"}
                right={isOnline ? "Start" : "📶 Offline"}
                icon="fact-check"
              />
            </Pressable>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
