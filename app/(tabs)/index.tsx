import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  useGetProductsQuery,
  useLazyGetProductByBarcodeQuery,
} from "@/services/features/products/productApi";
import { useGetCategoriesQuery } from "@/services/features/categories/categoryApi";
import { useCreateOrderMutation } from "@/services/features/order/orderApi";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
} from "@/services/features/customers/customerApi";
import { useGetActiveSessionQuery } from "@/services/features/sessions/sessionApi";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
} from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type CartItem = { id: string; name: string; price: number; quantity: number };

const PAYMENT_METHODS = ["CASH", "KBZ_PAY", "WAVE_PAY", "CARD"];

// Helper for dynamic colors
const getProductColors = (name: string) => {
  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      text: "text-indigo-400",
    },
    {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
    },
    {
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      text: "text-rose-400",
    },
    {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
    },
    {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/20",
      text: "text-cyan-400",
    },
    {
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      text: "text-purple-400",
    },
  ];
  return colors[hash % colors.length];
};

const getProductEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("coffee") || n.includes("latte") || n.includes("espresso"))
    return "☕";
  if (n.includes("tea")) return "🍵";
  if (n.includes("cake") || n.includes("pastry")) return "🍰";
  if (n.includes("burger")) return "🍔";
  if (n.includes("pizza")) return "🍕";
  if (n.includes("juice") || n.includes("drink") || n.includes("cola"))
    return "🥤";
  if (n.includes("salad")) return "🥗";
  if (n.includes("snack") || n.includes("chips")) return "🍟";
  return "📦";
};

export default function CheckoutScreen() {
  const user = useAppSelector((s: any) => s.auth.user);
  const currentStoreId = useAppSelector((s: any) => s.auth.currentStoreId);
  const isContinuousScan = useAppSelector(
    (s: any) => s.settings?.isContinuousScan,
  );

  const { data: products, isLoading } = useGetProductsQuery(
    currentStoreId || undefined,
  );
  const { data: categories } = useGetCategoriesQuery(
    currentStoreId || undefined,
  );
  const { data: customers } = useGetCustomersQuery(currentStoreId || undefined);
  const [createCustomer, { isLoading: isCreatingCustomer }] =
    useCreateCustomerMutation();
  const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
  const [lookupBarcode] = useLazyGetProductByBarcodeQuery();

  const { data: activeSession } = useGetActiveSessionQuery(
    { userId: user?.id || "", storeId: currentStoreId || undefined },
    { skip: !user?.id },
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartVisible, setIsCartVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Advanced Checkout State
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [paidAmount, setPaidAmount] = useState("");
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [lastScannedItem, setLastScannedItem] = useState<any>(null);

  // Bluetooth Physical Scanner Mode State & Auto-Focus
  const [isBluetoothMode, setIsBluetoothMode] = useState(false);
  const [bluetoothInputText, setBluetoothInputText] = useState("");
  const bluetoothInputRef = useRef<TextInput>(null);

  // Phase 1 Upgrades State
  const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">(
    "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  useEffect(() => {
    let interval: any;
    if (isBluetoothMode) {
      bluetoothInputRef.current?.focus();
      // Continuously keep hidden text input focused to catch keyboard wedge input
      interval = setInterval(() => {
        bluetoothInputRef.current?.focus();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBluetoothMode]);

  const handleBluetoothScanSubmit = () => {
    if (bluetoothInputText.trim()) {
      handleBarcodeScan(bluetoothInputText.trim(), "BluetoothHID");
      setBluetoothInputText("");
    }
  };

  const addToCart = (product: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.sellingPrice),
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const totalAmount = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const parsedDiscount = Number(discountValue) || 0;
  const discountAmount =
    discountType === "PERCENTAGE"
      ? (totalAmount * parsedDiscount) / 100
      : parsedDiscount;
  const grandTotal = Math.max(0, totalAmount - discountAmount);

  const changeAmount =
    Number(paidAmount) > grandTotal ? Number(paidAmount) - grandTotal : 0;

  const handleBarcodeScan = async (
    barcode: string,
    type: string,
    continuous?: boolean,
  ) => {
    if (!continuous) setIsScannerVisible(false);

    try {
      const cleanBarcode = barcode.trim();
      const result = await lookupBarcode(cleanBarcode).unwrap();

      if (result.found && result.product) {
        if (continuous) {
          addToCart(result.product);
          setLastScannedItem({
            name: result.product.name,
            price: result.product.sellingPrice,
          });
          setTimeout(() => setLastScannedItem(null), 100);
        } else {
          setTimeout(() => {
            setScannedProduct(result.product);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 300);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Not Found",
          `No product found with barcode: ${cleanBarcode}`,
        );
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Scan Error", "Could not reach the server.");
    }
  };

  const handleCharge = async () => {
    if (!cart.length) return;

    if (!user?.id) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to process transactions.",
      );
      return;
    }

    if (!activeSession) {
      Alert.alert(
        "Shift Not Started",
        "Please go to the Admin tab and 'Start Shift' before processing sales.",
      );
      return;
    }

    try {
      await createOrder({
        subTotal: totalAmount,
        discountAmount: discountAmount,
        grandTotal: grandTotal,
        paymentMethod: paymentMethod as any,
        paidAmount: Number(paidAmount) || grandTotal,
        changeAmount: changeAmount,
        userId: user.id,
        sessionId: activeSession.id,
        storeId: currentStoreId || undefined,
        customerId: selectedCustomerId || undefined,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price,
          subTotal: i.price * i.quantity,
        })),
      }).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart([]);
      setIsCartVisible(false);
      setSelectedCustomerId(null);
      setPaidAmount("");
      setDiscountValue("");
      // Alert.alert("Success", "Transaction completed successfully!");
    } catch (err: any) {
      Alert.alert("Error", "Failed to process transaction.");
    }
  };
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert("Validation Error", "Customer name is required.");
      return;
    }
    try {
      const newCustomer = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      }).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCustomerModalVisible(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setSelectedCustomerId(newCustomer.id);
    } catch (err) {
      Alert.alert("Error", "Failed to create customer.");
    }
  };

  const filteredProducts = products?.filter((p) => {
    const matchesCategory = !selectedCat || p.categoryId === selectedCat;
    const matchesSearch =
      !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0c10" }}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View
        style={{
          backgroundColor: "#161925",
          borderBottomWidth: 1,
          borderBottomColor: "#1f2232",
        }}
        className="px-6 py-5 flex-row justify-between items-center z-10"
      >
        <View className="flex-row items-center">
          <View className="w-1.5 h-9 bg-[#10b981] rounded-full mr-3.5 shadow-lg shadow-[#10b981]/50" />
          <View>
            <Text className="text-2xl font-black text-slate-100 tracking-tight">
              mini_POS
            </Text>
            <Text className="text-[9px] font-black text-emerald-400 tracking-[2px] uppercase mt-0.5">
              Smart Sales Terminal
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsBluetoothMode(!isBluetoothMode);
            }}
            className={`px-3.5 py-2.5 rounded-[16px] border flex-row items-center gap-2 ${
              isBluetoothMode
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-[#1f2232] border-[#2a2e43]"
            }`}
            activeOpacity={0.7}
          >
            <View
              className={`w-2 h-2 rounded-full ${isBluetoothMode ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-600"}`}
            />
            <Text
              className={`font-black text-[9px] uppercase tracking-wider ${isBluetoothMode ? "text-emerald-400" : "text-slate-400"}`}
            >
              {isBluetoothMode ? "BT Active" : "BT Scan"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsScannerVisible(true)}
            className="w-10 h-10 bg-indigo-500/10 rounded-[16px] items-center justify-center border border-indigo-500/30 shadow-lg"
            activeOpacity={0.7}
          >
            <MaterialIcons name="camera-alt" size={18} color="#9333ea" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View
        style={{
          backgroundColor: "#161925",
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View className="flex-row items-center bg-[#121420] border border-[#2a2e43] rounded-3xl p-1 mt-2">
          <MaterialIcons
            name="search"
            size={20}
            color="#9333ea"
            className="ml-3"
          />
          <TextInput
            placeholder="Search items by name, SKU, or barcode..."
            placeholderTextColor="#475569"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                handleBarcodeScan(searchQuery.trim(), "SearchInputScan");
                setSearchQuery("");
              }
            }}
            className="flex-1 text-slate-100 font-bold text-sm"
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="bg-[#1f2232] w-6 h-6 rounded-full items-center justify-center border border-[#2a2e43]"
            >
              <MaterialIcons
                name="close"
                size={20}
                color="#9333ea"
                className="ml-3"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CATEGORY TABS */}
      {categories && categories.length > 0 && (
        <View
          style={{
            backgroundColor: "#161925",
            borderBottomWidth: 1,
            borderBottomColor: "#1f2232",
          }}
          className="py-2 shadow-md z-0"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedCat(null)}
              className={`px-5 py-2.5 rounded-[16px] border transition-colors ${!selectedCat ? "bg-indigo-600/20 border-indigo-500/50" : "bg-[#121420] border-[#222736]"}`}
            >
              <Text
                className={`font-bold text-xs uppercase tracking-widest ${!selectedCat ? "text-indigo-400" : "text-slate-500"}`}
              >
                All Items
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCat(cat.id)}
                className={`px-5 py-2.5 rounded-[16px] border transition-colors ${selectedCat === cat.id ? "bg-indigo-600/20 border-indigo-500/50" : "bg-[#121420] border-[#222736]"}`}
              >
                <Text
                  className={`font-bold text-xs uppercase tracking-widest ${selectedCat === cat.id ? "text-indigo-400" : "text-slate-500"}`}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* PRODUCTS GRID */}
      <View className="px-6 mb-2 mt-4">
        <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px]">
          {filteredProducts?.length || 0} Products available
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-2"
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {!filteredProducts || filteredProducts.length === 0 ? (
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="flex-1 items-center justify-center py-20 opacity-40"
            >
              {/* <Text className="text-6xl mb-4">🔍</Text> */}
              <MaterialIcons name="inventory" size={48} color="#60a5fa" />
              <Text className="text-slate-100 font-bold text-lg">
                No products found
              </Text>
              <Text className="text-slate-500 text-xs mt-1">
                Try selecting another category
              </Text>
            </Animated.View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredProducts.map((product, idx) => {
                const inCart = cart.find((i) => i.id === product.id);
                const colors = getProductColors(product.name);
                const emoji = getProductEmoji(product.name);

                return (
                  <Animated.View
                    key={product.id}
                    entering={FadeInDown.duration(400).delay(idx * 30)}
                    className="w-[48%] mb-4"
                  >
                    <TouchableOpacity
                      onPress={() => addToCart(product)}
                      activeOpacity={0.8}
                      className="bg-[#1f2232] border border-[#2a2e43] p-4 rounded-[28px] shadow-sm relative overflow-hidden"
                    >
                      <View
                        className={`w-full aspect-square rounded-[24px] items-center justify-center mb-4 border ${colors.bg} ${colors.border}`}
                      >
                        <Text className="text-5xl opacity-90 drop-shadow-lg">
                          {emoji}
                        </Text>
                        {inCart && (
                          <View className="absolute -top-1 -right-1 bg-indigo-600 w-8 h-8 rounded-full items-center justify-center shadow-lg border-2 border-[#1f2232]">
                            <Text className="text-white font-black text-xs">
                              {inCart.quantity}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className="font-bold text-slate-100 text-base"
                        numberOfLines={1}
                      >
                        {product.name || "Unnamed Item"}
                      </Text>
                      <View className="flex-row justify-between items-center mt-2">
                        <Text className="text-indigo-400 font-black text-lg">
                          ${Number(product.sellingPrice || 0).toFixed(2)}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <View
                            className={`w-2 h-2 rounded-full ${Number(product.stockQuantity || 0) < 10 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`}
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* BOTTOM ACTION BAR */}
      {totalItems > 0 && (
        <Animated.View
          entering={FadeInUp.duration(400).springify()}
          className="absolute bottom-6 left-6 right-6"
        >
          <TouchableOpacity
            onPress={() => setIsCartVisible(true)}
            activeOpacity={0.9}
            className="bg-indigo-600 p-5 rounded-[32px] flex-row items-center justify-between shadow-2xl border border-indigo-400/30"
          >
            <View className="flex-row items-center gap-4">
              <View className="bg-white/20 w-12 h-12 rounded-[20px] items-center justify-center">
                <Text className="text-white font-black text-lg">
                  {totalItems}
                </Text>
              </View>
              <View>
                <Text className="text-indigo-200 font-black text-[10px] uppercase tracking-[3px]">
                  Active Sale
                </Text>
                <Text className="text-white font-black text-2xl">
                  ${totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
            <View className="bg-white/10 px-6 py-3 rounded-[20px] border border-white/20">
              <Text className="text-white font-black tracking-wide">
                Review
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* CART MODAL */}
      <Modal
        visible={isCartVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCartVisible(false)}
      >
        <View className="flex-1 bg-[#0b0c10]">
          <View className="px-6 py-6 pt-10 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center z-10">
            <Text className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Review Sale
            </Text>
            <TouchableOpacity
              onPress={() => setIsCartVisible(false)}
              className="bg-[#1f2232] w-10 h-10 rounded-full items-center justify-center border border-[#2a2e43]"
            >
              <MaterialIcons
                name="close"
                size={20}
                color="#9333ea"
                // className="ml-3"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* ITEMS LIST */}
            <View className="px-6 pt-6">
              {cart.map((item) => {
                const emoji = getProductEmoji(item.name);
                const colors = getProductColors(item.name);
                return (
                  <Animated.View
                    key={item.id}
                    layout={Layout.springify()}
                    className="bg-[#1f2232] p-4 rounded-[28px] mb-4 border border-[#2a2e43] flex-row items-center shadow-lg"
                  >
                    <View
                      className={`w-14 h-14 rounded-[20px] items-center justify-center mr-4 border ${colors.bg} ${colors.border}`}
                    >
                      <Text className="text-2xl drop-shadow-md">{emoji}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-bold text-lg">
                        {item.name}
                      </Text>
                      <Text className="text-slate-500 font-black text-sm">
                        ${item.price.toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row items-center bg-[#121420] rounded-[20px] p-1 border border-[#2a2e43]">
                      <TouchableOpacity
                        onPress={() => removeFromCart(item.id)}
                        className="w-10 h-10 bg-[#1f2232] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                      >
                        <Text className="text-slate-300 font-black">−</Text>
                      </TouchableOpacity>
                      <Text className="px-4 font-black text-slate-100 text-lg">
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => addToCart({ id: item.id })}
                        className="w-10 h-10 bg-[#1f2232] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                      >
                        <Text className="text-slate-300 font-black">+</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* CUSTOMER SELECTION */}
            <View className="px-6 mt-6">
              <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-2">
                Assign Customer
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedCustomerId(null)}
                  className={`px-5 py-3 rounded-[18px] border transition-colors ${!selectedCustomerId ? "bg-indigo-600/20 border-indigo-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
                >
                  <Text
                    className={`font-bold text-sm tracking-wide ${!selectedCustomerId ? "text-indigo-400" : "text-slate-400"}`}
                  >
                    Guest
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsCustomerModalVisible(true)}
                  className="px-5 py-3 rounded-[18px] border bg-[#1f2232] border-indigo-500/30 flex-row items-center"
                >
                  <MaterialIcons name="add" size={16} color="#818cf8" />
                  <Text className="font-bold text-sm tracking-wide text-indigo-400 ml-1">
                    New
                  </Text>
                </TouchableOpacity>
                {customers?.map((cust) => (
                  <TouchableOpacity
                    key={cust.id}
                    onPress={() => setSelectedCustomerId(cust.id)}
                    className={`px-5 py-3 rounded-[18px] border transition-colors ${selectedCustomerId === cust.id ? "bg-indigo-600/20 border-indigo-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
                  >
                    <Text
                      className={`font-bold text-sm tracking-wide ${selectedCustomerId === cust.id ? "text-indigo-400" : "text-slate-400"}`}
                    >
                      {cust.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {/* DISCOUNT SELECTION */}
            <View className="px-6 mt-8">
              <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-2">
                Discount
              </Text>
              <View className="flex-row items-center gap-3 mb-3">
                <TouchableOpacity
                  onPress={() => setDiscountType("PERCENTAGE")}
                  className={`flex-1 py-3 rounded-[16px] border items-center transition-colors ${discountType === "PERCENTAGE" ? "bg-rose-500/20 border-rose-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
                >
                  <Text
                    className={`font-bold text-sm tracking-wide ${discountType === "PERCENTAGE" ? "text-rose-400" : "text-slate-400"}`}
                  >
                    Percentage (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDiscountType("FLAT")}
                  className={`flex-1 py-3 rounded-[16px] border items-center transition-colors ${discountType === "FLAT" ? "bg-rose-500/20 border-rose-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
                >
                  <Text
                    className={`font-bold text-sm tracking-wide ${discountType === "FLAT" ? "text-rose-400" : "text-slate-400"}`}
                  >
                    Flat Amount ($)
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="bg-[#1f2232] rounded-[16px] border border-[#2a2e43] px-5 py-2 flex-row items-center">
                <Text className="text-slate-400 font-bold mr-2 text-lg">
                  {discountType === "PERCENTAGE" ? "%" : "$"}
                </Text>
                <TextInput
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#475569"
                  className="flex-1 text-white font-bold text-lg h-10"
                />
              </View>
              {discountType === "PERCENTAGE" && (
                <View className="flex-row gap-2 mt-3">
                  {[5, 10, 15, 20].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      onPress={() => setDiscountValue(pct.toString())}
                      className="flex-1 bg-[#121420] py-2 rounded-[12px] border border-[#2a2e43] items-center"
                    >
                      <Text className="text-slate-300 font-bold text-xs">
                        {pct}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* PAYMENT METHOD SELECTION */}
            <View className="px-6 mt-8">
              <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-2">
                Payment Method
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPaymentMethod(method)}
                    className={`px-5 py-3 rounded-[18px] border transition-colors ${paymentMethod === method ? "bg-emerald-500/20 border-emerald-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
                  >
                    <Text
                      className={`font-bold text-sm tracking-wide ${paymentMethod === method ? "text-emerald-400" : "text-slate-400"}`}
                    >
                      {method.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CASH RECEIVED INPUT */}
            {/* {paymentMethod === "CASH" && (
              <Animated.View
                entering={FadeInDown.duration(400)}
                className="px-6 mt-8"
              >
                <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-2">
                  Cash Received
                </Text>
                <View className="bg-[#1f2232] p-6 rounded-[32px] border border-[#2a2e43] shadow-2xl">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Received
                    </Text>
                    <TextInput
                      value={paidAmount}
                      onChangeText={setPaidAmount}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#475569"
                      className="text-white text-4xl font-extrabold text-right min-w-[150px]"
                    />
                  </View>

                  QUICK CASH BUTTONS
                  <View className="flex-row flex-wrap gap-2 mb-6">
                    {[5, 10, 20, 50, 100].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium,
                          );
                          setPaidAmount(amt.toString());
                        }}
                        className="bg-[#121420] px-5 py-3 rounded-[16px] border border-[#2a2e43] shadow-sm"
                      >
                        <Text className="text-slate-300 font-black text-sm">
                          ${amt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        setPaidAmount(totalAmount.toString());
                      }}
                      className="bg-indigo-500/20 px-5 py-3 rounded-[16px] border border-indigo-500/40"
                    >
                      <Text className="text-indigo-400 font-black text-sm">
                        Exact
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View className="pt-5 border-t border-[#2a2e43] flex-row justify-between items-center">
                    <View>
                      <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px]">
                        Change Due
                      </Text>
                      <Text
                        className={`font-black text-3xl mt-1 ${changeAmount > 0 ? "text-emerald-400" : "text-slate-600"}`}
                      >
                        ${changeAmount.toFixed(2)}
                      </Text>
                    </View>
                    {changeAmount > 0 && (
                      <View className="bg-emerald-500/20 p-4 rounded-[20px] border border-emerald-500/30">
                        <Text className="text-2xl drop-shadow-lg">💸</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )} */}
          </ScrollView>

          <View className="bg-[#161925] p-8 pb-12 border-t border-[#1f2232] shadow-2xl">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-[2px]">
                Subtotal
              </Text>
              <Text className="text-lg font-bold text-slate-300">
                ${totalAmount.toFixed(2)}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-rose-400 font-bold text-xs uppercase tracking-[2px]">
                  Discount
                </Text>
                <Text className="text-lg font-bold text-rose-400">
                  -${discountAmount.toFixed(2)}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between items-center mb-6 pt-4 border-t border-[#1f2232]">
              <Text className="text-slate-500 font-black text-sm uppercase tracking-[4px]">
                Grand Total
              </Text>
              <Text className="text-4xl font-extrabold text-slate-100 tracking-tight">
                ${grandTotal.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsCartVisible(false);
                setIsPaymentModalVisible(true);
              }}
              className="py-6 rounded-[28px] items-center shadow-2xl bg-indigo-600 border border-indigo-400/30 shadow-indigo-600/20"
            >
              <Text className="text-white font-extrabold text-xl tracking-wide">
                Proceed to Payment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-[#0b0c10]">
            <View className="px-6 py-6 pt-10 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center z-10">
              <Text className="text-2xl font-extrabold text-slate-100 tracking-tight">
                Finalize Order
              </Text>
              <TouchableOpacity
                onPress={() => setIsPaymentModalVisible(false)}
                className="bg-[#1f2232] w-10 h-10 rounded-full items-center justify-center border border-[#2a2e43]"
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color="#9333ea"
                  // className="ml-3"
                />
                {/*           <View className="pb-8 border-b border-[#2a2e43] flex-row justify-between items-center">
                      <View>
                        <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-1">
                          Change Back
                        </Text>
                        <Text
                          className={`font-black text-4xl ${changeAmount > 0 ? "text-emerald-400" : "text-slate-700"}`}
                        >
                          ${changeAmount.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        className={`w-14 h-14 rounded-[20px] items-center justify-center border ${changeAmount > 0 ? "bg-emerald-500/20 border-emerald-500/30" : "bg-[#121420] border-[#2a2e43]"}`}
                      >
                        <Text className="text-2xl drop-shadow-md">
                          {changeAmount > 0 ? (
                            <MaterialIcons
                              name="attach-money"
                              size={20}
                              color="#9333ea"
                            />
                          ) : (
                            <MaterialIcons
                              name="attach-money"
                              size={20}
                              color="#9333ea"
                            />
                          )}
                        </Text>
                      </View>
                    </View>*/}
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-6 pt-5"
              contentContainerStyle={{ paddingBottom: 150 }}
            >
              <View className="bg-[#1f2232] p-5 rounded-[40px] border border-[#2a2e43] items-center mb-10 shadow-2xl">
                <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[4px] mb-4">
                  Amount Due
                </Text>
                <Text className="text-white text-6xl mb-3 font-extrabold tracking-tight">
                  ${totalAmount.toFixed(2)}
                </Text>

                <Text className="text-slate-500 font-black mt-3 text-[10px] uppercase tracking-[3px] mb-1">
                  Change Back
                </Text>
                <Text
                  className={`font-black text-4xl ${changeAmount > 0 ? "text-emerald-400" : "text-slate-700"}`}
                >
                  ${changeAmount.toFixed(2)}
                </Text>

                <View className="flex-row items-center gap-2 mt-6 bg-[#121420] px-5 py-2.5 rounded-full border border-[#2a2e43]">
                  <Text className="text-indigo-400 font-black text-[10px] uppercase tracking-[3px]">
                    {paymentMethod.replace("_", " ")}
                  </Text>
                </View>
              </View>

              {paymentMethod === "CASH" && (
                <Animated.View
                  entering={FadeInDown.duration(600).springify()}
                  className="mb-10"
                >
                  <View className="bg-[#1f2232] p-5 rounded-[40px] border border-[#2a2e43] shadow-xl">
                    <View className="flex-row items-center justify-between mb-8">
                      <View className="bg-emerald-500/10 w-16 h-16 rounded-[24px] items-center justify-center border border-emerald-500/20">
                        <MaterialIcons
                          name="attach-money"
                          size={20}
                          color="#9333ea"
                        />
                      </View>
                      <View>
                        <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-1">
                          Cash Received
                        </Text>
                        <TextInput
                          autoFocus
                          value={paidAmount}
                          onChangeText={setPaidAmount}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="#475569"
                          className="text-white text-5xl font-extrabold"
                        />
                      </View>
                    </View>

                    <View className="flex-row flex-wrap gap-3 mb-8">
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Heavy,
                          );
                          setPaidAmount(totalAmount.toString());
                        }}
                        className="bg-indigo-500/20 px-8 py-4 rounded-[20px] border border-indigo-500/40"
                      >
                        <Text className="text-indigo-400 font-black text-base tracking-wide">
                          Exact
                        </Text>
                      </TouchableOpacity>
                      {[5, 10, 20, 50, 100].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium,
                            );
                            setPaidAmount(amt.toString());
                          }}
                          className="bg-[#121420] px-6 py-4 rounded-[20px] border border-[#2a2e43] active:bg-[#161826]"
                        >
                          <Text className="text-slate-100 font-black text-base">
                            ${amt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* <View className="pt-8 border-t border-[#2a2e43] flex-row justify-between items-center">
                      <View>
                        <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-1">
                          Change Back
                        </Text>
                        <Text
                          className={`font-black text-4xl ${changeAmount > 0 ? "text-emerald-400" : "text-slate-700"}`}
                        >
                          ${changeAmount.toFixed(2)}
                        </Text>
                      </View>
                      <View
                        className={`w-14 h-14 rounded-[20px] items-center justify-center border ${changeAmount > 0 ? "bg-emerald-500/20 border-emerald-500/30" : "bg-[#121420] border-[#2a2e43]"}`}
                      >
                        <Text className="text-2xl drop-shadow-md">
                          {changeAmount > 0 ? "💰" : "⚖️"}
                        </Text>
                      </View>
                    </View> */}
                  </View>
                </Animated.View>
              )}

              {paymentMethod !== "CASH" && (
                <View className="bg-[#1f2232] p-10 rounded-[40px] border border-[#2a2e43] items-center opacity-70">
                  <Text className="text-slate-400 font-bold text-center tracking-wide">
                    Process digital payment on external terminal
                  </Text>
                </View>
              )}
            </ScrollView>

            <View className="p-8 pb-12 bg-[#161925] border-t border-[#1f2232]">
              <TouchableOpacity
                onPress={() => {
                  if (
                    paymentMethod === "CASH" &&
                    Number(paidAmount) < totalAmount
                  ) {
                    Alert.alert(
                      "Insufficient Payment",
                      "The cash received is less than the total amount due.",
                    );
                    return;
                  }
                  setIsPaymentModalVisible(false);
                  handleCharge();
                }}
                disabled={isCreating}
                className={`py-6 rounded-[32px] items-center shadow-2xl border ${
                  isCreating
                    ? "bg-[#1f2232] border-[#2a2e43]"
                    : paymentMethod === "CASH" &&
                        Number(paidAmount) < totalAmount
                      ? "bg-[#121420] border-[#2a2e43] opacity-60"
                      : "bg-emerald-600 border-emerald-400/30 shadow-emerald-600/20"
                }`}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="items-center">
                    <Text
                      className={`font-extrabold text-xl tracking-wide ${
                        paymentMethod === "CASH" &&
                        Number(paidAmount) < totalAmount
                          ? "text-slate-500"
                          : "text-white"
                      }`}
                    >
                      {Number(paidAmount) < totalAmount &&
                      paymentMethod === "CASH"
                        ? "Insufficient Cash"
                        : "Complete Transaction"}
                    </Text>
                    {changeAmount > 0 && (
                      <Text className="text-emerald-100 font-bold text-[10px] uppercase tracking-[3px] mt-1.5 opacity-80">
                        Return ${changeAmount.toFixed(2)} to customer
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BarcodeScannerModal
        visible={isScannerVisible}
        onClose={() => {
          setIsScannerVisible(false);
          setLastScannedItem(null);
        }}
        onScanned={handleBarcodeScan}
        title="Terminal Scan"
        isContinuousScan={isContinuousScan}
        lastScannedItem={lastScannedItem}
      />

      {/* SCANNED PRODUCT PREVIEW MODAL */}
      <Modal
        visible={!!scannedProduct}
        transparent
        animationType="fade"
        onRequestClose={() => setScannedProduct(null)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            className="bg-[#1f2232] w-full p-8 rounded-[40px] border border-[#2a2e43] shadow-2xl"
          >
            <View className="items-center mb-6">
              <View className="w-24 h-24 bg-indigo-500/20 rounded-[32px] items-center justify-center mb-4 border border-indigo-500/30">
                <Text className="text-5xl drop-shadow-xl">
                  {getProductEmoji(scannedProduct?.name || "")}
                </Text>
              </View>
              <Text className="text-white text-3xl font-extrabold text-center tracking-tight mb-1">
                {scannedProduct?.name}
              </Text>
              <Text className="text-indigo-400 font-bold text-[10px] uppercase tracking-[3px]">
                Code: {scannedProduct?.barcode}
              </Text>
            </View>

            <View className="flex-row justify-between items-center bg-[#121420] p-6 rounded-[28px] border border-[#2a2e43] mb-8">
              <View>
                <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-1">
                  Price
                </Text>
                <Text className="text-white text-3xl font-black">
                  ${Number(scannedProduct?.sellingPrice).toFixed(2)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-1">
                  In Stock
                </Text>
                <Text
                  className={`text-2xl font-black ${scannedProduct?.stockQuantity < 10 ? "text-rose-400" : "text-emerald-400"}`}
                >
                  {scannedProduct?.stockQuantity}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setScannedProduct(null)}
                className="flex-1 bg-[#121420] py-5 rounded-[24px] items-center border border-[#2a2e43]"
              >
                <Text className="text-slate-400 font-black tracking-wide">
                  Dismiss
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  addToCart(scannedProduct);
                  setScannedProduct(null);
                }}
                className="flex-[2] bg-indigo-600 py-5 rounded-[24px] items-center shadow-lg border border-indigo-400/30 shadow-indigo-600/30"
              >
                <Text className="text-white font-black text-lg tracking-wide">
                  Add to Cart
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* QUICK CUSTOMER REGISTRATION MODAL */}
      <Modal
        visible={isCustomerModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsCustomerModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/80 px-4">
          <Animated.View
            entering={FadeInUp.duration(400).springify()}
            className="w-full bg-[#161925] p-6 rounded-[32px] border border-[#2a2e43] shadow-2xl"
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-extrabold text-slate-100 tracking-wide">
                Quick Registration
              </Text>
              <TouchableOpacity
                onPress={() => setIsCustomerModalVisible(false)}
                className="bg-[#1f2232] w-8 h-8 rounded-full items-center justify-center border border-[#2a2e43]"
              >
                <MaterialIcons name="close" size={16} color="#9333ea" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-[2px] mb-2">
                Customer Name <Text className="text-rose-500">*</Text>
              </Text>
              <TextInput
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                placeholder="e.g., John Doe"
                placeholderTextColor="#475569"
                className="bg-[#1f2232] text-white p-4 rounded-[16px] border border-[#2a2e43] font-bold"
              />
            </View>

            <View className="mb-8">
              <Text className="text-slate-500 font-bold text-xs uppercase tracking-[2px] mb-2">
                Phone Number
              </Text>
              <TextInput
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                placeholder="Optional"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                className="bg-[#1f2232] text-white p-4 rounded-[16px] border border-[#2a2e43] font-bold"
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateCustomer}
              disabled={isCreatingCustomer}
              className={`py-4 rounded-[20px] items-center shadow-lg border ${isCreatingCustomer ? "bg-indigo-600/50 border-indigo-500/30" : "bg-indigo-600 border-indigo-400/30"}`}
            >
              {isCreatingCustomer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-black text-lg tracking-wide">
                  Create & Assign
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {isBluetoothMode && (
        <TextInput
          ref={bluetoothInputRef}
          value={bluetoothInputText}
          onChangeText={setBluetoothInputText}
          onSubmitEditing={handleBluetoothScanSubmit}
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
          autoFocus={true}
          showSoftInputOnFocus={false}
        />
      )}
    </SafeAreaView>
  );
}
