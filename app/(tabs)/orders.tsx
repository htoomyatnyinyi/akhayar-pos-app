import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { useGetProductsQuery, useLazyGetProductByBarcodeQuery } from "@/services/features/products/productApi";
import { useGetCustomersQuery } from "@/services/features/customers/customerApi";
import { useGetActiveSessionQuery } from "@/services/features/sessions/sessionApi";
import { useGetStoresQuery } from "@/services/features/stores/storeApi";
import type { Customer } from "@/services/features/customers/customerTypes";
import type { Product } from "@/services/features/products/productTypes";
import type { PaymentBreakdownItem } from "@/services/features/order/orderTypes";

type PaymentMethod = PaymentBreakdownItem["method"];

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "KBZ_PAY", label: "KBZ Pay" },
  { value: "CB_PAY", label: "CB Pay" },
  { value: "WAVE_PAY", label: "Wave Pay" },
];

export default function OrdersScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, currentStoreId } = useAppSelector((state) => state.auth);
  const cart = useAppSelector((state) => state.cart.items);
  const offline = useAppSelector((state) => state.offline);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [paymentBreakdown, setPaymentBreakdown] = useState<
    PaymentBreakdownItem[]
  >([{ method: "CASH", amount: 0 }]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const { data: products = [] } = useGetProductsQuery(
    currentStoreId || undefined,
  );
  const { data: customers = [] } = useGetCustomersQuery();
  const { data: stores = [] } = useGetStoresQuery();
  const { data: activeSession } = useGetActiveSessionQuery(
    { userId: user?.id || "", storeId: currentStoreId || undefined },
    { skip: !user?.id },
  );
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [lookupBarcode] = useLazyGetProductByBarcodeQuery();

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

  const visibleCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    return customers.filter((customer) => {
      if (!term) return true;
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.phone?.toLowerCase().includes(term) ||
        customer.code.toLowerCase().includes(term)
      );
    });
  }, [customers, customerSearch]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxAmount = subtotal * 0.05;
  const discountAmount = 0;
  const grandTotal = subtotal + taxAmount - discountAmount;
  const tenderTotal = paymentBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const changeAmount = Math.max(tenderTotal - grandTotal, 0);
  const dueAmount = Math.max(grandTotal - tenderTotal, 0);
  const paymentMethod =
    paymentBreakdown.length > 1 ? "MIXED_PAYMENT" : paymentBreakdown[0]?.method ?? "CASH";

  const addProduct = (product: Product) => {
    dispatch(
      addToCart({
        id: product.id,
        name: product.name,
        price: Number(product.sellingPrice),
        qty: 1,
      }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    setPaymentBreakdown((current) => {
      if (current.length !== 1) return current;
      if (current[0].amount > 0) return current;
      if (grandTotal <= 0) return current;
      return [{ ...current[0], amount: grandTotal }];
    });
  }, [grandTotal]);

  const handleBarcodeLookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || scanLocked) return;
    setScanLocked(true);
    try {
      const result = await lookupBarcode(trimmed).unwrap();
      if (result.found && result.product) {
        addProduct(result.product);
        setBarcode("");
        setShowScanner(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Not found", result.message || "Product not found.");
      }
    } catch (error: any) {
      Alert.alert("Lookup failed", error?.message || "Unable to scan this barcode.");
    } finally {
      setTimeout(() => setScanLocked(false), 500);
    }
  };

  const startScanner = async () => {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        Alert.alert(
          "Camera access required",
          "Enable camera permission to scan barcodes.",
        );
        return;
      }
    }
    setShowScanner(true);
  };

  const updateTender = (
    index: number,
    patch: Partial<PaymentBreakdownItem>,
  ) => {
    setPaymentBreakdown((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const addTender = () => {
    setPaymentBreakdown((current) => [
      ...current,
      { method: "CARD", amount: 0 },
    ]);
  };

  const removeTender = (index: number) => {
    setPaymentBreakdown((current) =>
      current.length === 1
        ? current
        : current.filter((_, tenderIndex) => tenderIndex !== index),
    );
  };

  const checkout = async () => {
    if (!user?.id) {
      Alert.alert(
        "Sign in required",
        "You must sign in before creating an order.",
      );
      return;
    }
    if (!cart.length) {
      Alert.alert("Empty cart", "Add at least one item before checkout.");
      return;
    }
    if (!activeSession?.id) {
      Alert.alert(
        "No open session",
        "Open a cashier session before taking payments.",
      );
      return;
    }
    if (dueAmount > 0.009) {
      Alert.alert(
        "Payment incomplete",
        "Tender total must match or exceed the order total.",
      );
      return;
    }

    const payload = {
      subTotal: subtotal,
      taxAmount,
      discountAmount,
      grandTotal,
      paymentMethod,
      paidAmount: Math.max(tenderTotal, grandTotal),
      changeAmount,
      paymentStatus: "PAID",
      paymentBreakdown,
      userId: user.id,
      customerId: selectedCustomer?.id,
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
      setPaymentBreakdown([{ method: "CASH", amount: 0 }]);
      setSelectedCustomer(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/receipt/${order.id}`);
    } catch (error: any) {
      dispatch(setCheckoutState({ status: "failed" }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Checkout failed",
        error?.data?.message || "The order could not be saved.",
      );
    }
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <Header
            eyebrow="Point of sale"
            title="New sale"
            subtitle="Search-first checkout with optional barcode scanning, customer selection, and offline-safe order saving."
            right={
              <Pill
                label={offline.isOnline ? "Online" : "Offline"}
                tone={offline.isOnline ? "emerald" : "rose"}
              />
            }
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <MetricCard
                icon="shopping-cart"
                label="Cart total"
                value={`$${grandTotal.toFixed(2)}`}
                delta={`${cart.length} items`}
                tone="emerald"
              />
            </View>
            <View className="flex-1">
              <MetricCard
                icon="sync"
                label="Sync queue"
                value={String(offline.queuedCount)}
                delta={offline.lastError ? "Needs attention" : "Healthy"}
                tone={offline.lastError ? "rose" : "sky"}
              />
            </View>
          </View>

          <Card className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Search products
            </Text>
            <View className="mt-3 flex-row items-center gap-3">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Name, SKU, or barcode"
                placeholderTextColor="#64748b"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
              />
              <Pressable
                onPress={startScanner}
                className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-4"
              >
                <MaterialIcons
                  name="qr-code-scanner"
                  size={20}
                  color="#7dd3fc"
                />
              </Pressable>
            </View>
            <View className="mt-3 flex-row items-center gap-3">
              <TextInput
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Barcode input"
                placeholderTextColor="#64748b"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
              />
              <Pressable
                onPress={() => handleBarcodeLookup(barcode)}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4"
              >
                <MaterialIcons name="add" size={20} color="#86efac" />
              </Pressable>
            </View>
          </Card>

          <SectionTitle title="Customer" action="Optional" />
          <Pressable onPress={() => setShowCustomerPicker(true)}>
            <Card className="mb-4">
              <RowItem
                title={selectedCustomer?.name ?? "Walk-in customer"}
                subtitle={
                  selectedCustomer
                    ? selectedCustomer.phone || selectedCustomer.code
                    : "Tap to search and assign a customer"
                }
                right={selectedCustomer ? "Selected" : "None"}
                icon="groups"
              />
            </Card>
          </Pressable>

          <SectionTitle title="Quick add" action="Tap to add" />
          <View className="mb-4 gap-3">
            {visibleProducts.slice(0, 8).map((item) => (
              <Pressable key={item.id} onPress={() => addProduct(item)}>
                <RowItem
                  title={item.name}
                  subtitle={`${item.sku} • Stock ${item.stockQuantity}`}
                  right={`$${Number(item.sellingPrice).toFixed(2)}`}
                  icon="add-shopping-cart"
                />
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Cart" action="Edit items" />
          <Card className="mb-4">
            {cart.length ? (
              cart.map((item, index) => (
                <View key={item.id}>
                  <View className="flex-row items-center justify-between py-2">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-white">
                        {item.name}
                      </Text>
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
                      <Pressable
                        onPress={() => dispatch(decreaseQty(item.id))}
                        className="h-9 w-9 items-center justify-center rounded-xl bg-white/5"
                      >
                        <MaterialIcons name="remove" size={18} color="#fff" />
                      </Pressable>
                      <Pressable
                        onPress={() => dispatch(addToCart(item))}
                        className="h-9 w-9 items-center justify-center rounded-xl bg-white/5"
                      >
                        <MaterialIcons name="add" size={18} color="#fff" />
                      </Pressable>
                    </View>
                    <Pressable onPress={() => dispatch(removeFromCart(item.id))}>
                      <Text className="text-xs font-bold uppercase tracking-[2px] text-rose-300">
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                  {index < cart.length - 1 ? (
                    <View className="my-3 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-10 text-center text-sm text-slate-400">
                Your cart is empty.
              </Text>
            )}
          </Card>

          <SectionTitle title="Payment split" action="Add tenders" />
          <Card className="mb-4">
            <View className="gap-3">
              {paymentBreakdown.map((tender, index) => (
                <View
                  key={`${tender.method}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[10px] font-bold uppercase tracking-[3px] text-slate-500">
                        Tender {index + 1}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {paymentOptions.map((option) => {
                          const active = tender.method === option.value;
                          return (
                            <Pressable
                              key={option.value}
                              onPress={() =>
                                updateTender(index, { method: option.value })
                              }
                              className={`rounded-full border px-3 py-2 ${active ? "border-sky-400/30 bg-sky-500/15" : "border-white/10 bg-white/5"}`}
                            >
                              <Text
                                className={`text-[10px] font-bold uppercase tracking-[2px] ${active ? "text-sky-200" : "text-slate-300"}`}
                              >
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                    <Pressable onPress={() => removeTender(index)}>
                      <MaterialIcons name="delete" size={18} color="#fca5a5" />
                    </Pressable>
                  </View>
                  <View className="mt-3 flex-row items-center gap-2">
                    <TextInput
                      value={String(tender.amount || "")}
                      onChangeText={(value) =>
                        updateTender(index, {
                          amount: Number(value.replace(/[^\d.]/g, "")) || 0,
                        })
                      }
                      placeholder="Amount"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#64748b"
                      className="flex-1 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-base text-white"
                    />
                    <Text className="text-xs font-bold uppercase tracking-[2px] text-slate-400">
                      {tender.amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable
              onPress={addTender}
              className="mt-3 flex-row items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-3"
            >
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text className="ml-2 text-sm font-bold text-white">
                Add another payment
              </Text>
            </Pressable>

            <View className="mt-4">
              <StatRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
              <StatRow label="Tax" value={`$${taxAmount.toFixed(2)}`} />
              <StatRow label="Discount" value={`$${discountAmount.toFixed(2)}`} />
              <Divider />
              <StatRow label="Total" value={`$${grandTotal.toFixed(2)}`} />
              <StatRow label="Tendered" value={`$${tenderTotal.toFixed(2)}`} />
              <StatRow label="Due" value={`$${dueAmount.toFixed(2)}`} />
              <StatRow label="Change" value={`$${changeAmount.toFixed(2)}`} />
            </View>
          </Card>

          <SectionTitle title="Checkout" />
          <Card className="mb-4">
            <View className="flex-row gap-3">
              <ActionButton
                title="Clear cart"
                icon="delete"
                accent="rose"
                onPress={() => dispatch(clearCart())}
              />
              <ActionButton
                title={isLoading ? "Processing" : "Checkout"}
                icon="point-of-sale"
                accent="emerald"
                onPress={checkout}
              />
            </View>
            <View className="mt-4">
              <RowItem
                title={storeName}
                subtitle={
                  activeSession ? `Session ${activeSession.id}` : "No open session"
                }
                right={offline.isOnline ? "Live" : "Cached"}
                icon="store"
              />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showCustomerPicker}
        animationType="slide"
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
          <Header
            eyebrow="Customer"
            title="Select customer"
            subtitle="Search or pick a walk-in customer."
            right={
              <Pressable onPress={() => setShowCustomerPicker(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            }
          />
          <TextInput
            value={customerSearch}
            onChangeText={setCustomerSearch}
            placeholder="Search name, phone, or code"
            placeholderTextColor="#64748b"
            className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
          />
          <ScrollView>
            <Pressable
              onPress={() => {
                setSelectedCustomer(null);
                setShowCustomerPicker(false);
              }}
              className="mb-3"
            >
              <RowItem
                title="Walk-in customer"
                subtitle="No customer assigned"
                right="Default"
                icon="person-outline"
              />
            </Pressable>
            {visibleCustomers.map((customer) => (
              <Pressable
                key={customer.id}
                onPress={() => {
                  setSelectedCustomer(customer);
                  setShowCustomerPicker(false);
                }}
                className="mb-3"
              >
                <RowItem
                  title={customer.name}
                  subtitle={`${customer.phone ?? "No phone"} • ${customer.code}`}
                  right={customer.tier}
                  icon="person"
                />
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-4 pt-4">
            <Text className="text-lg font-bold text-white">Scan barcode</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setTorchEnabled((value) => !value)}
                className="rounded-full bg-white/10 p-3"
              >
                <MaterialIcons
                  name={torchEnabled ? "flash-on" : "flash-off"}
                  size={20}
                  color="#fff"
                />
              </Pressable>
              <Pressable onPress={() => setShowScanner(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
          <View className="mt-4 flex-1 overflow-hidden rounded-t-[28px]">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: [
                  "qr",
                  "ean13",
                  "ean8",
                  "code128",
                  "code39",
                  "upc_a",
                  "upc_e",
                ],
              }}
              onBarcodeScanned={(event) => {
                if (scanLocked) return;
                void handleBarcodeLookup(event.data);
              }}
            />

            <View className="absolute inset-0 items-center justify-center">
              <View className="h-64 w-64 rounded-[28px] border-2 border-sky-400/80 bg-transparent">
                <View className="absolute left-[-2px] top-[-2px] h-8 w-8 border-l-4 border-t-4 border-sky-300" />
                <View className="absolute right-[-2px] top-[-2px] h-8 w-8 border-r-4 border-t-4 border-sky-300" />
                <View className="absolute bottom-[-2px] left-[-2px] h-8 w-8 border-b-4 border-l-4 border-sky-300" />
                <View className="absolute bottom-[-2px] right-[-2px] h-8 w-8 border-b-4 border-r-4 border-sky-300" />
              </View>
            </View>

            <View className="absolute bottom-8 left-4 right-4 rounded-[24px] bg-black/70 p-4">
              <Text className="text-sm text-white">
                Align the barcode inside the frame. Toggle flash if the label is
                hard to read.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
