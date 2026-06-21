import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  addToCart,
  clearCart,
  decreaseQty,
  removeFromCart,
  setCheckoutState,
} from "@/services/features/cart/cartSlice";
import { useCreateOrderMutation } from "@/services/features/order/orderApi";
import { useGetProductsQuery } from "@/services/features/products/productApi";
import { useGetActiveSessionQuery } from "@/services/features/sessions/sessionApi";
import { useGetStoresQuery } from "@/services/features/stores/storeApi";
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
  StatRow,
} from "@/components/app-ui";

export default function OrdersScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, currentStoreId } = useAppSelector((state) => state.auth);
  const cart = useAppSelector((state) => state.cart.items);
  const offline = useAppSelector((state) => state.offline);
  const [search, setSearch] = useState("");

  const { data: products = [] } = useGetProductsQuery(currentStoreId || undefined);
  const { data: stores = [] } = useGetStoresQuery();
  const { data: activeSession } = useGetActiveSessionQuery(
    { userId: user?.id || "", storeId: currentStoreId || undefined },
    { skip: !user?.id },
  );
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  const storeName =
    stores.find((store) => store.id === currentStoreId)?.name ?? "Main Store";

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.barcode ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxAmount = subtotal * 0.05;
  const grandTotal = subtotal + taxAmount;

  const checkout = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "You must sign in before creating an order.");
      return;
    }

    if (!cart.length) {
      Alert.alert("Empty cart", "Add at least one item before checkout.");
      return;
    }

    if (!activeSession?.id) {
      Alert.alert("No open session", "Open a cashier session before taking payments.");
      return;
    }

    const payload = {
      subTotal: subtotal,
      taxAmount,
      discountAmount: 0,
      grandTotal,
      paymentMethod: "CASH" as const,
      paidAmount: grandTotal,
      changeAmount: 0,
      paymentStatus: "PAID",
      userId: user.id,
      customerId: undefined,
      sessionId: activeSession.id,
      storeId: currentStoreId,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.qty,
        unitPrice: item.price,
        discountAmount: 0,
        subTotal: item.price * item.qty,
      })),
    };

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch(setCheckoutState({ status: "pending" }));

    try {
      const order = await createOrder(payload).unwrap();
      dispatch(setCheckoutState({ checkoutId: order.id, status: "synced" }));
      dispatch(clearCart());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Order completed", `Order ${order.id} was saved and queued for sync.`);
    } catch (error: any) {
      dispatch(setCheckoutState({ status: "failed" }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Checkout failed", error?.data?.message || "The order could not be saved.");
    }
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          <Header
            eyebrow="Point of sale"
            title="New sale"
            subtitle="This flow works online and offline. Orders are stored locally first and synced later."
            right={<Pill label={offline.isOnline ? "Online" : "Offline"} tone={offline.isOnline ? "emerald" : "rose"} />}
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <MetricCard icon="shopping-cart" label="Cart total" value={`$${grandTotal.toFixed(2)}`} delta={`${cart.length} items`} tone="emerald" />
            </View>
            <View className="flex-1">
              <MetricCard icon="sync" label="Sync queue" value={String(offline.queuedCount)} delta={offline.lastError ? "Needs attention" : "Healthy"} tone={offline.lastError ? "rose" : "sky"} />
            </View>
          </View>

          <Card className="mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">Search products</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Scan barcode or search by name"
                  placeholderTextColor="#64748b"
                  className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
                />
              </View>
              <Pressable onPress={() => router.push("/sync")} className="mt-7 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-4">
                <MaterialIcons name="sync" size={20} color="#7dd3fc" />
              </Pressable>
            </View>
          </Card>

          <SectionTitle title="Quick add" action="Tap to add" />
          <FlatList
            data={visibleProducts.slice(0, 8)}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  dispatch(
                    addToCart({
                      id: item.id,
                      name: item.name,
                      price: Number(item.sellingPrice),
                      qty: 1,
                    }),
                  )
                }
              >
                <RowItem
                  title={item.name}
                  subtitle={`${item.sku} • Stock ${item.stockQuantity}`}
                  right={`$${Number(item.sellingPrice).toFixed(2)}`}
                  icon="add-shopping-cart"
                />
              </Pressable>
            )}
          />

          <SectionTitle title="Cart" action="Edit items" />
          <Card className="mb-4">
            {cart.length ? (
              cart.map((item, index) => (
                <View key={item.id}>
                  <View className="flex-row items-center justify-between py-2">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-white">{item.name}</Text>
                      <Text className="mt-1 text-xs text-slate-400">
                        ${item.price.toFixed(2)} x {item.qty}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-white">
                      ${(item.price * item.qty).toFixed(2)}
                    </Text>
                  </View>
                  <View className="mt-2 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Pressable onPress={() => dispatch(decreaseQty(item.id))} className="h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                        <MaterialIcons name="remove" size={18} color="#fff" />
                      </Pressable>
                      <Pressable onPress={() => dispatch(addToCart(item))} className="h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                        <MaterialIcons name="add" size={18} color="#fff" />
                      </Pressable>
                    </View>
                    <Pressable onPress={() => dispatch(removeFromCart(item.id))}>
                      <Text className="text-xs font-bold uppercase tracking-[2px] text-rose-300">Remove</Text>
                    </Pressable>
                  </View>
                  {index < cart.length - 1 ? <View className="my-3 h-px bg-white/8" /> : null}
                </View>
              ))
            ) : (
              <Text className="py-10 text-center text-sm text-slate-400">Your cart is empty.</Text>
            )}
          </Card>

          <SectionTitle title="Checkout summary" />
          <Card className="mb-4">
            <StatRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <StatRow label="Tax" value={`$${taxAmount.toFixed(2)}`} />
            <Divider />
            <StatRow label="Total" value={`$${grandTotal.toFixed(2)}`} />
            <View className="mt-4 flex-row gap-3">
              <ActionButton title="Clear cart" icon="delete" accent="rose" onPress={() => dispatch(clearCart())} />
              <ActionButton title={isLoading ? "Processing" : "Checkout"} icon="point-of-sale" accent="emerald" onPress={checkout} />
            </View>
          </Card>

          <SectionTitle title="Session" />
          <Card>
            <RowItem title={storeName} subtitle={activeSession ? `Session ${activeSession.id}` : "No open session"} right={offline.isOnline ? "Live" : "Cached"} icon="store" />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

