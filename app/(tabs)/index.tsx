// ============================================
// FILE: app/(tabs)/index.tsx (POS Screen - Fully Updated)
// ============================================

import { Card, Header, Pill, Screen } from "@/components/app-ui";
import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

import {
  addToCart,
  clearCart,
  removeFromCart,
  updateQuantity,
} from "@/services/features/cart/cartSlice";
import {
  useCreateLocalInventoryMovementMutation,
  useCreateLocalOrderMutation,
  useGetActiveSessionQuery,
  useGetLocalBrandsQuery,
  useGetLocalCategoriesQuery,
  useGetLocalCustomersQuery,
  useGetLocalInventoryQuery,
  useGetLocalProductsQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

type PaymentMethod = "CASH" | "CARD" | "DIGITAL";

// Payment method mapping for backend
const paymentMethodMapping: Record<string, string> = {
  CASH: "CASH",
  CARD: "CARD",
  DIGITAL: "WAVE_PAY",
  WAVE_PAY: "WAVE_PAY",
  KBZ_PAY: "KBZ_PAY",
  CB_PAY: "CB_PAY",
};

export default function POSScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
    undefined,
  );
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Cash payment state
  const [cashAmount, setCashAmount] = useState<string>("");
  const [showCashInput, setShowCashInput] = useState(false);
  const [changeAmount, setChangeAmount] = useState<number>(0);

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Queries
  const {
    data: productsData,
    isLoading: isProductsLoading,
    refetch,
  } = useGetLocalProductsQuery({
    search: searchQuery,
    categoryId: selectedCategory,
  });

  const { data: categoriesData } = useGetLocalCategoriesQuery();
  const { data: brandsData } = useGetLocalBrandsQuery();
  const { data: customersData } = useGetLocalCustomersQuery({
    search: customerSearch || undefined,
  });
  const { data: activeSession } = useGetActiveSessionQuery({
    userId: user?.id || "",
  });
  const { data: inventoryData } = useGetLocalInventoryQuery({});

  // Mutations
  const [createOrder, { isLoading: isCreatingOrder }] =
    useCreateLocalOrderMutation();
  const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

  // Filter products by brand
  const filteredProducts = React.useMemo(() => {
    let products = productsData || [];
    if (selectedBrand) {
      products = products.filter((p: any) => p.brandId === selectedBrand);
    }
    return products;
  }, [productsData, selectedBrand]);

  // Cart state
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.qty,
    0,
  );
  const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
  const cartSubtotal = cartTotal;
  const taxAmount = cartTotal * 0.05;
  const discountAmount = 0;
  const grandTotal = cartSubtotal + taxAmount - discountAmount;

  const hasOutOfStockItems = cartItems.some((item) => {
    const inventory = inventoryData?.find(
      (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
    );
    return inventory && inventory.quantity < item.qty;
  });

  // Calculate change when cash amount changes
  const calculateChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const change = numAmount - grandTotal;
    setChangeAmount(change > 0 ? change : 0);
  };

  const handleCashAmountChange = (text: string) => {
    setCashAmount(text);
    calculateChange(text);
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "CASH") {
      setShowCashInput(true);
      setCashAmount("");
      setChangeAmount(0);
    } else {
      setShowCashInput(false);
      setCashAmount("");
      setChangeAmount(0);
    }
  };

  // Handlers
  const handleAddToCart = (product: any) => {
    const inventory = inventoryData?.find(
      (inv: any) => inv.productId === product.id,
    );

    if (inventory && inventory.quantity <= 0) {
      Alert.alert("Out of Stock", `${product.name} is currently out of stock.`);
      return;
    }

    dispatch(
      addToCart({
        id: product.id,
        name: product.name,
        price: product.sellingPrice || product.price || 0,
        qty: 1,
        sku: product.sku,
        barcode: product.barcode,
        stockQuantity: inventory?.quantity || 0,
        brand: product.brand,
        category: product.category,
      }),
    );
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      dispatch(removeFromCart(id));
    } else {
      dispatch(updateQuantity({ id, qty }));
    }
  };

  const handleRemoveItem = (id: string) => {
    dispatch(removeFromCart(id));
  };

  const handleScan = (data: string) => {
    setShowScannerModal(false);
    const product = productsData?.find(
      (p: any) => p.barcode === data || p.sku === data || p.id === data,
    );
    if (product) {
      handleAddToCart(product);
    } else {
      setSearchQuery(data);
    }
  };

  const openCart = () => {
    if (cartCount === 0) {
      Alert.alert("Cart Empty", "Please add items to the cart first.");
      return;
    }
    setShowCartModal(true);
    setCashAmount("");
    setChangeAmount(0);
    setShowCashInput(paymentMethod === "CASH");
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 12,
    }).start();
  };

  const closeCart = () => {
    Animated.spring(slideAnim, {
      toValue: height,
      useNativeDriver: true,
      speed: 12,
    }).start(() => setShowCartModal(false));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Cart Empty", "Please add items to the cart first.");
      return;
    }

    if (hasOutOfStockItems) {
      Alert.alert(
        "Insufficient Stock",
        "Some items in your cart don't have enough stock. Please adjust quantities.",
      );
      return;
    }

    if (!activeSession) {
      Alert.alert(
        "No Active Session",
        "Please open a session before placing an order.",
        [
          {
            text: "Open Session",
            onPress: () => router.push("/(tabs)/sessions"),
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    // Validate cash payment
    if (paymentMethod === "CASH") {
      const cashNum = parseFloat(cashAmount) || 0;
      if (cashNum < grandTotal) {
        Alert.alert(
          "Insufficient Cash",
          `Please enter at least $${grandTotal.toFixed(2)}`,
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Calculate paid amount based on payment method
      let paidAmount = grandTotal;
      let change = 0;

      if (paymentMethod === "CASH") {
        paidAmount = parseFloat(cashAmount) || grandTotal;
        change = paidAmount - grandTotal;
      }

      // Build order payload
      const orderPayload = {
        tenantId: user?.tenantId || "default",
        storeId: activeSession.storeId,
        sessionId: activeSession.id,
        userId: user?.id || "unknown",
        // ✅ FIX: Only include customerId if selected - don't send null
        ...(selectedCustomer?.id ? { customerId: selectedCustomer.id } : {}),
        paymentMethod: paymentMethodMapping[paymentMethod] || "CASH",
        paymentStatus: "PAID",
        subTotal: Number(cartSubtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        changeAmount: Number(change.toFixed(2)),
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: Number(item.qty),
          unitPrice: Number(item.price.toFixed(2)),
          subTotal: Number((item.price * item.qty).toFixed(2)),
          discountAmount: 0,
        })),
      };

      console.log("📤 Creating order:", JSON.stringify(orderPayload, null, 2));

      // Create the order
      const result = await createOrder(orderPayload).unwrap();

      console.log("✅ Order created:", result);

      // Create inventory movements for each item
      for (const item of cartItems) {
        try {
          // await createInventoryMovement({
          //   tenantId: user?.tenantId || "default",
          //   storeId: activeSession.storeId,
          //   productId: item.id,
          //   quantity: Number(item.qty),
          //   type: "SALE",
          //   referenceId: result.id,
          //   referenceType: "ORDER",
          //   reason: `Order #${result.orderNumber || result.id.slice(-6)}`,
          // }).unwrap();

          // When creating inventory movement, use "SALE" which is valid
          await createInventoryMovement({
            tenantId: user?.tenantId || "default",
            storeId: activeSession.storeId,
            productId: item.id,
            quantity: Number(item.qty),
            type: "SALE", // ✅ This maps to MovementType.SALE
            referenceId: result.id,
            referenceType: "ORDER",
            reason: `Order #${result.orderNumber || result.id.slice(-6)}`,
          }).unwrap();
        } catch (movementError) {
          console.error(
            "❌ Failed to create inventory movement:",
            movementError,
          );
          // Don't fail the whole order if inventory movement fails
        }
      }

      dispatch(clearCart());
      setSelectedCustomer(null);
      setCashAmount("");
      setChangeAmount(0);
      closeCart();

      // Navigate to receipt
      router.push(`/receipt/${result.id}`);
      refetch();
    } catch (error: any) {
      console.error("❌ Checkout error:", error);

      let errorMessage = "Failed to create order. Please try again.";
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      Alert.alert("Checkout Failed", errorMessage, [
        {
          text: "Retry",
          onPress: handleCheckout,
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartItem = ({ item }: { item: any }) => {
    const inventory = inventoryData?.find(
      (inv: any) => inv.productId === item.id,
    );
    const maxQty = inventory?.quantity || 0;

    return (
      <View className="flex-row items-center py-3 border-b border-white/5">
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{item.name}</Text>
          {item.brand && (
            <Text className="text-sky-300/60 text-[10px] font-medium">
              {item.brand.name}
            </Text>
          )}
          <Text className="text-slate-400 text-xs">
            SKU: {item.sku || "N/A"}
          </Text>
          <Text className="text-sky-300 font-bold text-sm mt-1">
            ${item.price.toFixed(2)}
          </Text>
          {maxQty > 0 && (
            <Text className="text-slate-500 text-[10px]">
              Available: {maxQty}
            </Text>
          )}
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="bg-white/10 rounded-full w-8 h-8 items-center justify-center"
            onPress={() => handleUpdateQuantity(item.id, item.qty - 1)}
          >
            <MaterialIcons name="remove" size={18} color="#cbd5e1" />
          </TouchableOpacity>

          <Text className="text-white font-bold text-lg w-10 text-center">
            {item.qty}
          </Text>

          <TouchableOpacity
            className={`bg-white/10 rounded-full w-8 h-8 items-center justify-center ${
              item.qty >= maxQty && maxQty > 0 ? "opacity-50" : ""
            }`}
            onPress={() => handleUpdateQuantity(item.id, item.qty + 1)}
            disabled={item.qty >= maxQty && maxQty > 0}
          >
            <MaterialIcons name="add" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="ml-3 bg-red-500/20 p-2 rounded-full"
          onPress={() => handleRemoveItem(item.id)}
        >
          <MaterialIcons name="delete-outline" size={18} color="#f87171" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderProduct = ({ item }: { item: any }) => {
    const inCart = cartItems.find((i) => i.id === item.id);
    const inventory = inventoryData?.find(
      (inv: any) => inv.productId === item.id,
    );
    const isOutOfStock = inventory?.quantity === 0;

    return (
      <TouchableOpacity
        className={`flex-1 m-2 active:scale-95 transition-transform ${
          isOutOfStock ? "opacity-50" : ""
        }`}
        onPress={() => !isOutOfStock && handleAddToCart(item)}
        disabled={isOutOfStock}
      >
        <Card className="flex-1 p-4 bg-slate-900/80">
          {inCart && (
            <View className="absolute top-2 right-2 bg-sky-500 rounded-full w-6 h-6 items-center justify-center z-10">
              <Text className="text-white text-xs font-bold">{inCart.qty}</Text>
            </View>
          )}
          {isOutOfStock && (
            <View className="absolute top-2 left-2 bg-rose-500/80 rounded-full px-2 py-0.5 z-10">
              <Text className="text-white text-[8px] font-bold uppercase">
                Out of Stock
              </Text>
            </View>
          )}
          <View className="h-28 bg-slate-800/50 rounded-xl mb-3 items-center justify-center border border-white/5">
            <MaterialIcons name="inventory-2" size={36} color="#64748b" />
          </View>
          <Text
            className="text-slate-200 font-bold text-base mb-1"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.brand && (
            <Text
              className="text-sky-300/60 text-[9px] font-medium mb-1"
              numberOfLines={1}
            >
              {item.brand.name}
            </Text>
          )}
          <Text
            className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
            numberOfLines={1}
          >
            SKU: {item.sku}
          </Text>
          <View className="flex-row items-center justify-between mt-auto">
            <Text className="text-white font-black text-lg">
              ${(item.sellingPrice || item.price || 0).toFixed(2)}
            </Text>
            {!isOutOfStock && (
              <View className="bg-sky-500/20 p-2 rounded-full border border-sky-500/20">
                <MaterialIcons name="add" size={16} color="#7dd3fc" />
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950 pt-2">
      <Screen padded={false}>
        {/* Header Area */}
        <View className="px-5 pt-4 pb-2">
          <Header
            eyebrow="Point of Sale"
            title="New Order"
            subtitle="Ready to take new orders"
          />

          {/* Search Bar */}
          <View className="flex-row items-center bg-white/5 rounded-full px-1 border border-white/10">
            <MaterialIcons name="search" size={22} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-white text-sm font-medium"
              placeholder="Search products, SKUs..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="bg-white/10 p-1.5 rounded-full"
              >
                <MaterialIcons name="close" size={14} color="#cbd5e1" />
              </TouchableOpacity>
            ) : (
              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setShowFilters(!showFilters)}
                  className="bg-white/10 p-1.5 rounded-full mr-1"
                >
                  <MaterialIcons
                    name="filter-list"
                    size={16}
                    color={showFilters || selectedBrand ? "#38bdf8" : "#94a3b8"}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowScannerModal(true)}
                  className="bg-sky-500/20 p-1.5 rounded-full border border-sky-500/30"
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={16}
                    color="#38bdf8"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Filters - Brand Filter */}
          {showFilters && brandsData && brandsData.length > 0 && (
            <View className="mt-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                <TouchableOpacity
                  className="mr-2"
                  onPress={() => setSelectedBrand(undefined)}
                >
                  <Pill
                    label="All Brands"
                    tone={!selectedBrand ? "sky" : "amber"}
                  />
                </TouchableOpacity>
                {brandsData.map((brand: any) => (
                  <TouchableOpacity
                    key={brand.id}
                    className="mr-2"
                    onPress={() => setSelectedBrand(brand.id)}
                  >
                    <Pill
                      label={brand.name}
                      tone={selectedBrand === brand.id ? "sky" : "amber"}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Session Status */}
          <View className="mt-2 flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                activeSession ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <Text className="text-slate-400 text-xs">
              {activeSession
                ? `Session Active • ${new Date(activeSession.openedAt).toLocaleTimeString()}`
                : "No Active Session"}
            </Text>
          </View>
        </View>

        {/* Categories Filter */}
        <View className="pl-5 mb-2 mt-3 h-10">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <TouchableOpacity
              className="mr-2"
              onPress={() => setSelectedCategory(undefined)}
            >
              <Pill
                label="All Items"
                tone={!selectedCategory ? "sky" : "amber"}
              />
            </TouchableOpacity>

            {categoriesData?.map((cat: any) => (
              <TouchableOpacity
                key={cat.id}
                className="mr-2"
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Pill
                  label={cat.name}
                  tone={selectedCategory === cat.id ? "sky" : "amber"}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 120,
            paddingTop: 8,
          }}
          renderItem={renderProduct}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-24">
              <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
                <MaterialIcons name="inbox" size={32} color="#64748b" />
              </View>
              <Text className="text-white mt-4 text-lg font-bold">
                No products found
              </Text>
              <Text className="text-slate-500 mt-2 text-sm text-center px-10 leading-5">
                Try adjusting your search or sync to pull latest items from the
                server.
              </Text>
            </View>
          }
        />

        {/* Floating Cart Summary */}
        {cartCount > 0 && (
          <View className="absolute bottom-6 left-5 right-5">
            <TouchableOpacity
              className="bg-sky-500 rounded-[24px] flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/20 border border-sky-400"
              activeOpacity={0.9}
              onPress={openCart}
            >
              <View className="flex-row items-center">
                <View className="bg-white/20 rounded-full w-10 h-10 items-center justify-center border border-white/20">
                  <Text className="text-white font-black text-lg">
                    {cartCount}
                  </Text>
                </View>
                <Text className="text-white font-bold text-lg ml-3">
                  View Cart
                </Text>
              </View>
              <Text className="text-white font-black text-xl">
                ${cartTotal.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cart Modal */}
        <Modal
          visible={showCartModal}
          transparent
          animationType="none"
          onRequestClose={closeCart}
        >
          <View className="flex-1 bg-black/70">
            <TouchableOpacity
              className="flex-1"
              activeOpacity={1}
              onPress={closeCart}
            />
            <Animated.View
              style={{
                transform: [{ translateY: slideAnim }],
              }}
              className="bg-slate-900 rounded-t-3xl max-h-[85%] min-h-[50%]"
            >
              <View className="flex-1 px-5 pt-5 pb-4">
                {/* Header */}
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-white font-bold text-xl">
                    Your Cart ({cartCount} items)
                  </Text>
                  <TouchableOpacity onPress={closeCart}>
                    <MaterialIcons name="close" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                  className="flex-1"
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* Customer Selection */}
                  <TouchableOpacity
                    className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/10"
                    onPress={() => setShowCustomerSelect(!showCustomerSelect)}
                  >
                    <View className="flex-row items-center">
                      <MaterialIcons
                        name="person-outline"
                        size={20}
                        color="#94a3b8"
                      />
                      <Text className="text-white ml-2">
                        {selectedCustomer
                          ? `${selectedCustomer.name} (${selectedCustomer.code})`
                          : "Select Customer"}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showCustomerSelect ? "expand-less" : "expand-more"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {showCustomerSelect && (
                    <View className="bg-white/5 rounded-xl p-3 mb-4 max-h-40">
                      <TextInput
                        className="bg-white/10 rounded-lg p-2 text-white text-sm mb-2"
                        placeholder="Search customers..."
                        placeholderTextColor="#64748b"
                        value={customerSearch}
                        onChangeText={setCustomerSearch}
                      />
                      <FlatList
                        data={customersData || []}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            className="py-2 border-b border-white/5"
                            onPress={() => {
                              setSelectedCustomer(item);
                              setShowCustomerSelect(false);
                              setCustomerSearch("");
                            }}
                          >
                            <Text className="text-white">{item.name}</Text>
                            <Text className="text-slate-400 text-xs">
                              {item.code} • {item.phone || "No phone"}
                            </Text>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          <Text className="text-slate-400 text-center py-2">
                            No customers found
                          </Text>
                        }
                      />
                    </View>
                  )}

                  {/* Cart Items */}
                  <View className="max-h-60 mb-4">
                    <FlatList
                      data={cartItems}
                      keyExtractor={(item) => item.id}
                      renderItem={renderCartItem}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    />
                  </View>

                  {/* Cart Summary */}
                  <View className="pt-4 border-t border-white/10">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-slate-400">Subtotal</Text>
                      <Text className="text-white">
                        ${cartSubtotal.toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-slate-400">Tax (5%)</Text>
                      <Text className="text-white">
                        ${taxAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-slate-400">Discount</Text>
                      <Text className="text-white">
                        -${discountAmount.toFixed(2)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
                      <Text className="text-white font-bold text-lg">
                        Total
                      </Text>
                      <Text className="text-sky-400 font-bold text-lg">
                        ${grandTotal.toFixed(2)}
                      </Text>
                    </View>

                    {/* Payment Method */}
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-4 mb-2">
                      Payment Method
                    </Text>
                    <View className="flex-row gap-2 mb-3">
                      {["CASH", "CARD", "DIGITAL"].map((method) => (
                        <TouchableOpacity
                          key={method}
                          className={`flex-1 py-3 rounded-lg border ${
                            paymentMethod === method
                              ? "bg-sky-500 border-sky-400"
                              : "bg-white/10 border-white/10"
                          }`}
                          onPress={() =>
                            handlePaymentMethodChange(method as PaymentMethod)
                          }
                        >
                          <MaterialIcons
                            name={
                              method === "CASH"
                                ? "attach-money"
                                : method === "CARD"
                                  ? "credit-card"
                                  : "wifi"
                            }
                            size={20}
                            color={
                              paymentMethod === method ? "white" : "#94a3b8"
                            }
                            style={{ textAlign: "center" }}
                          />
                          <Text
                            className={`text-center text-xs font-bold mt-1 ${
                              paymentMethod === method
                                ? "text-white"
                                : "text-slate-400"
                            }`}
                          >
                            {method}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Cash Payment Input */}
                    {showCashInput && (
                      <View className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                        <Text className="text-slate-300 text-sm font-medium mb-2">
                          Cash Received
                        </Text>
                        <View className="flex-row items-center">
                          <Text className="text-emerald-400 text-2xl font-bold mr-2">
                            $
                          </Text>
                          <TextInput
                            className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white text-2xl font-bold"
                            keyboardType="decimal-pad"
                            value={cashAmount}
                            onChangeText={handleCashAmountChange}
                            placeholder="0.00"
                            placeholderTextColor="#64748b"
                            autoFocus
                          />
                        </View>

                        {parseFloat(cashAmount) > 0 && (
                          <View className="mt-3 flex-row justify-between items-center bg-white/5 rounded-lg p-3">
                            <Text className="text-slate-400 text-sm">
                              Change:
                            </Text>
                            <Text
                              className={`text-xl font-bold ${
                                changeAmount >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              ${changeAmount.toFixed(2)}
                            </Text>
                          </View>
                        )}

                        <View className="flex-row gap-2 mt-3">
                          {[20, 50, 100].map((amount) => (
                            <TouchableOpacity
                              key={amount}
                              className="flex-1 bg-white/10 rounded-lg py-2 border border-white/10"
                              onPress={() => {
                                const total = grandTotal + amount;
                                setCashAmount(total.toFixed(2));
                                calculateChange(total.toFixed(2));
                              }}
                            >
                              <Text className="text-white text-center font-bold">
                                +${amount}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            className="flex-1 bg-white/10 rounded-lg py-2 border border-white/10"
                            onPress={() => {
                              setCashAmount(grandTotal.toFixed(2));
                              calculateChange(grandTotal.toFixed(2));
                            }}
                          >
                            <Text className="text-white text-center font-bold">
                              Exact
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {paymentMethod === "CASH" && parseFloat(cashAmount) > 0 && (
                      <View className="mt-3 flex-row justify-between items-center bg-white/5 rounded-lg p-3">
                        <Text className="text-slate-400 text-sm">Payment:</Text>
                        <Text className="text-white font-bold">
                          ${parseFloat(cashAmount).toFixed(2)}
                        </Text>
                      </View>
                    )}

                    {hasOutOfStockItems && (
                      <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
                        <Text className="text-rose-400 text-xs font-medium text-center">
                          ⚠️ Some items exceed available stock
                        </Text>
                      </View>
                    )}

                    {/* Checkout Button */}
                    <TouchableOpacity
                      className={`mt-4 py-4 rounded-xl ${
                        cartItems.length === 0 ||
                        isSubmitting ||
                        hasOutOfStockItems ||
                        (paymentMethod === "CASH" &&
                          parseFloat(cashAmount) < grandTotal)
                          ? "bg-slate-700"
                          : "bg-emerald-500"
                      }`}
                      onPress={handleCheckout}
                      disabled={
                        cartItems.length === 0 ||
                        isSubmitting ||
                        hasOutOfStockItems ||
                        isCreatingOrder ||
                        (paymentMethod === "CASH" &&
                          parseFloat(cashAmount) < grandTotal)
                      }
                    >
                      {isSubmitting || isCreatingOrder ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <View>
                          <Text className="text-white text-center font-bold text-lg">
                            Complete Order
                          </Text>
                          <Text className="text-white/70 text-center text-xs mt-0.5">
                            ${grandTotal.toFixed(2)}
                            {paymentMethod === "CASH" &&
                              parseFloat(cashAmount) > 0 &&
                              ` • Cash: $${parseFloat(cashAmount).toFixed(2)}`}
                            {paymentMethod === "CASH" &&
                              parseFloat(cashAmount) > 0 &&
                              changeAmount > 0 &&
                              ` • Change: $${changeAmount.toFixed(2)}`}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View className="flex-row mt-3 gap-3">
                      <TouchableOpacity
                        className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
                        onPress={() => {
                          Alert.alert(
                            "Clear Cart",
                            "Are you sure you want to clear the cart?",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Clear",
                                style: "destructive",
                                onPress: () => {
                                  dispatch(clearCart());
                                  setCashAmount("");
                                  setChangeAmount(0);
                                },
                              },
                            ],
                          );
                        }}
                      >
                        <Text className="text-red-400 text-center text-sm font-medium">
                          Clear Cart
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
                        onPress={() => {
                          setSelectedCustomer(null);
                          setCashAmount("");
                          setChangeAmount(0);
                          Alert.alert(
                            "Customer Cleared",
                            "Customer has been removed.",
                          );
                        }}
                      >
                        <Text className="text-slate-400 text-center text-sm font-medium">
                          Remove Customer
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </View>
        </Modal>

        <BarcodeScannerModal
          visible={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScan={handleScan}
        />
      </Screen>
    </SafeAreaView>
  );
}

// // ============================================
// // FILE: app/(tabs)/index.tsx (POS Screen - Fully Updated)
// // ============================================

// import { Card, Header, Pill, Screen } from "@/components/app-ui";
// import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";
// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// import {
//   addToCart,
//   clearCart,
//   removeFromCart,
//   updateQuantity,
// } from "@/services/features/cart/cartSlice";
// import {
//   useCreateLocalInventoryMovementMutation,
//   useCreateLocalOrderMutation,
//   useGetActiveSessionQuery,
//   useGetLocalBrandsQuery,
//   useGetLocalCategoriesQuery,
//   useGetLocalCustomersQuery,
//   useGetLocalInventoryQuery,
//   useGetLocalProductsQuery,
// } from "@/services/features/offline/localApi";
// import { MaterialIcons } from "@expo/vector-icons";
// import { router } from "expo-router";
// import React, { useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Animated,
//   Dimensions,
//   FlatList,
//   Modal,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   SafeAreaView,
//   View,
// } from "react-native";

// const { height } = Dimensions.get("window");

// type PaymentMethod = "CASH" | "CARD" | "KPAY";

// export default function POSScreen() {
//   const dispatch = useAppDispatch();
//   const user = useAppSelector((state) => state.auth.user);

//   // State
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showScannerModal, setShowScannerModal] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
//     undefined,
//   );
//   const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
//     undefined,
//   );
//   const [showCartModal, setShowCartModal] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
//   const [showCustomerSelect, setShowCustomerSelect] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
//   const [customerSearch, setCustomerSearch] = useState("");
//   const [showFilters, setShowFilters] = useState(false);

//   // Cash payment state
//   const [cashAmount, setCashAmount] = useState<string>("");
//   const [showCashInput, setShowCashInput] = useState(false);
//   const [changeAmount, setChangeAmount] = useState<number>(0);

//   // Animations
//   const slideAnim = useRef(new Animated.Value(height)).current;

//   // Queries
//   const {
//     data: productsData,
//     isLoading: isProductsLoading,
//     refetch,
//   } = useGetLocalProductsQuery({
//     search: searchQuery,
//     categoryId: selectedCategory,
//   });

//   const { data: categoriesData } = useGetLocalCategoriesQuery();
//   const { data: brandsData } = useGetLocalBrandsQuery();
//   const { data: customersData } = useGetLocalCustomersQuery({
//     search: customerSearch || undefined,
//   });
//   const { data: activeSession } = useGetActiveSessionQuery({
//     userId: user?.id || "",
//   });
//   const { data: inventoryData } = useGetLocalInventoryQuery({});

//   // Mutations
//   const [createOrder, { isLoading: isCreatingOrder }] =
//     useCreateLocalOrderMutation();
//   const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

//   // Filter products by brand
//   const filteredProducts = React.useMemo(() => {
//     let products = productsData || [];
//     if (selectedBrand) {
//       products = products.filter((p: any) => p.brandId === selectedBrand);
//     }
//     return products;
//   }, [productsData, selectedBrand]);

//   // Cart state
//   const cartItems = useAppSelector((state) => state.cart.items);
//   const cartTotal = cartItems.reduce(
//     (total, item) => total + item.price * item.qty,
//     0,
//   );
//   const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
//   const cartSubtotal = cartTotal;
//   const taxAmount = cartTotal * 0.05;
//   const discountAmount = 0;
//   const grandTotal = cartSubtotal + taxAmount - discountAmount;

//   const hasOutOfStockItems = cartItems.some((item) => {
//     const inventory = inventoryData?.find(
//       (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
//     );
//     return inventory && inventory.quantity < item.qty;
//   });

//   // Calculate change when cash amount changes
//   const calculateChange = (amount: string) => {
//     const numAmount = parseFloat(amount) || 0;
//     const change = numAmount - grandTotal;
//     setChangeAmount(change > 0 ? change : 0);
//   };

//   const handleCashAmountChange = (text: string) => {
//     setCashAmount(text);
//     calculateChange(text);
//   };

//   const handlePaymentMethodChange = (method: PaymentMethod) => {
//     setPaymentMethod(method);
//     if (method === "CASH") {
//       setShowCashInput(true);
//       setCashAmount("");
//       setChangeAmount(0);
//     } else {
//       setShowCashInput(false);
//       setCashAmount("");
//       setChangeAmount(0);
//     }
//   };

//   // Handlers
//   const handleAddToCart = (product: any) => {
//     const inventory = inventoryData?.find(
//       (inv: any) => inv.productId === product.id,
//     );

//     if (inventory && inventory.quantity <= 0) {
//       Alert.alert("Out of Stock", `${product.name} is currently out of stock.`);
//       return;
//     }

//     dispatch(
//       addToCart({
//         id: product.id,
//         name: product.name,
//         price: product.sellingPrice || product.price || 0,
//         qty: 1,
//         sku: product.sku,
//         barcode: product.barcode,
//         stockQuantity: inventory?.quantity || 0,
//         brand: product.brand,
//         category: product.category,
//       }),
//     );
//   };

//   const handleUpdateQuantity = (id: string, qty: number) => {
//     if (qty <= 0) {
//       dispatch(removeFromCart(id));
//     } else {
//       dispatch(updateQuantity({ id, qty }));
//     }
//   };

//   const handleRemoveItem = (id: string) => {
//     dispatch(removeFromCart(id));
//   };

//   const handleScan = (data: string) => {
//     setShowScannerModal(false);
//     const product = productsData?.find(
//       (p: any) => p.barcode === data || p.sku === data || p.id === data,
//     );
//     if (product) {
//       handleAddToCart(product);
//     } else {
//       setSearchQuery(data);
//     }
//   };

//   const openCart = () => {
//     if (cartCount === 0) {
//       Alert.alert("Cart Empty", "Please add items to the cart first.");
//       return;
//     }
//     setShowCartModal(true);
//     setCashAmount("");
//     setChangeAmount(0);
//     setShowCashInput(paymentMethod === "CASH");
//     Animated.spring(slideAnim, {
//       toValue: 0,
//       useNativeDriver: true,
//       speed: 12,
//     }).start();
//   };

//   const closeCart = () => {
//     Animated.spring(slideAnim, {
//       toValue: height,
//       useNativeDriver: true,
//       speed: 12,
//     }).start(() => setShowCartModal(false));
//   };

//   const handleCheckout = async () => {
//     if (cartItems.length === 0) {
//       Alert.alert("Cart Empty", "Please add items to the cart first.");
//       return;
//     }

//     if (hasOutOfStockItems) {
//       Alert.alert(
//         "Insufficient Stock",
//         "Some items in your cart don't have enough stock. Please adjust quantities.",
//       );
//       return;
//     }

//     if (!activeSession) {
//       Alert.alert(
//         "No Active Session",
//         "Please open a session before placing an order.",
//         [
//           {
//             text: "Open Session",
//             onPress: () => router.push("/(tabs)/sessions"),
//           },
//           { text: "Cancel", style: "cancel" },
//         ],
//       );
//       return;
//     }

//     // Validate cash payment
//     if (paymentMethod === "CASH") {
//       const cashNum = parseFloat(cashAmount) || 0;
//       if (cashNum < grandTotal) {
//         Alert.alert(
//           "Insufficient Cash",
//           `Please enter at least $${grandTotal.toFixed(2)}`,
//         );
//         return;
//       }
//     }

//     setIsSubmitting(true);

//     try {
//       // Calculate paid amount based on payment method
//       let paidAmount = grandTotal;
//       let change = 0;

//       if (paymentMethod === "CASH") {
//         paidAmount = parseFloat(cashAmount) || grandTotal;
//         change = paidAmount - grandTotal;
//       }

//       // Build order payload with proper string handling
//       const orderPayload = {
//         tenantId: user?.tenantId || "default",
//         storeId: activeSession.storeId,
//         sessionId: activeSession.id,
//         userId: user?.id || "unknown",
//         // ✅ Send empty string instead of null for customerId
//         customerId: selectedCustomer?.id || "",
//         paymentMethod: paymentMethod,
//         paymentStatus: "PAID",
//         subTotal: Number(cartSubtotal.toFixed(2)),
//         taxAmount: Number(taxAmount.toFixed(2)),
//         discountAmount: Number(discountAmount.toFixed(2)),
//         grandTotal: Number(grandTotal.toFixed(2)),
//         paidAmount: Number(paidAmount.toFixed(2)),
//         changeAmount: Number(change.toFixed(2)),
//         registerId: "",
//         items: cartItems.map((item) => ({
//           productId: item.id,
//           quantity: Number(item.qty),
//           unitPrice: Number(item.price.toFixed(2)),
//           subTotal: Number((item.price * item.qty).toFixed(2)),
//           discountAmount: 0,
//         })),
//       };

//       console.log("📤 Creating order:", JSON.stringify(orderPayload, null, 2));

//       // Create the order
//       const result = await createOrder(orderPayload).unwrap();

//       console.log("✅ Order created:", result);

//       // Create inventory movements for each item
//       let movementErrors: any[] = [];
//       for (const item of cartItems) {
//         try {
//           await createInventoryMovement({
//             tenantId: user?.tenantId || "default",
//             storeId: activeSession.storeId,
//             productId: item.id,
//             quantity: Number(item.qty),
//             type: "SALE",
//             referenceId: result.id,
//             referenceType: "ORDER",
//             reason: `Order #${result.orderNumber || result.id.slice(-6)}`,
//           }).unwrap();
//         } catch (movementError) {
//           console.error(
//             `❌ Failed to create inventory movement for ${item.name}:`,
//             movementError,
//           );
//           movementErrors.push({ item: item.name, error: movementError });
//         }
//       }

//       // If all movements failed, show a warning
//       if (
//         movementErrors.length > 0 &&
//         movementErrors.length === cartItems.length
//       ) {
//         Alert.alert(
//           "Order Created with Warning",
//           "Your order was created but inventory could not be updated. Please check your stock levels.",
//           [{ text: "OK" }],
//         );
//       }

//       dispatch(clearCart());
//       setSelectedCustomer(null);
//       setCashAmount("");
//       setChangeAmount(0);
//       closeCart();

//       // Navigate to receipt
//       router.push(`/receipt/${result.id}`);
//       refetch();
//     } catch (error: any) {
//       console.error("❌ Checkout error:", error);

//       let errorMessage = "Failed to create order. Please try again.";
//       if (error?.data?.message) {
//         errorMessage = error.data.message;
//       } else if (error?.message) {
//         errorMessage = error.message;
//       } else if (typeof error === "string") {
//         errorMessage = error;
//       }

//       Alert.alert("Checkout Failed", errorMessage, [
//         {
//           text: "Retry",
//           onPress: handleCheckout,
//         },
//         { text: "Cancel", style: "cancel" },
//       ]);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const renderCartItem = ({ item }: { item: any }) => {
//     const inventory = inventoryData?.find(
//       (inv: any) => inv.productId === item.id,
//     );
//     const maxQty = inventory?.quantity || 0;

//     return (
//       <View className="flex-row items-center py-3 border-b border-white/5">
//         <View className="flex-1">
//           <Text className="text-white font-bold text-base">{item.name}</Text>
//           {item.brand && (
//             <Text className="text-sky-300/60 text-[10px] font-medium">
//               {item.brand.name}
//             </Text>
//           )}
//           <Text className="text-slate-400 text-xs">
//             SKU: {item.sku || "N/A"}
//           </Text>
//           <Text className="text-sky-300 font-bold text-sm mt-1">
//             ${item.price.toFixed(2)}
//           </Text>
//           {maxQty > 0 && (
//             <Text className="text-slate-500 text-[10px]">
//               Available: {maxQty}
//             </Text>
//           )}
//         </View>

//         <View className="flex-row items-center">
//           <TouchableOpacity
//             className="bg-white/10 rounded-full w-8 h-8 items-center justify-center"
//             onPress={() => handleUpdateQuantity(item.id, item.qty - 1)}
//           >
//             <MaterialIcons name="remove" size={18} color="#cbd5e1" />
//           </TouchableOpacity>

//           <Text className="text-white font-bold text-lg w-10 text-center">
//             {item.qty}
//           </Text>

//           <TouchableOpacity
//             className={`bg-white/10 rounded-full w-8 h-8 items-center justify-center ${
//               item.qty >= maxQty && maxQty > 0 ? "opacity-50" : ""
//             }`}
//             onPress={() => handleUpdateQuantity(item.id, item.qty + 1)}
//             disabled={item.qty >= maxQty && maxQty > 0}
//           >
//             <MaterialIcons name="add" size={18} color="#cbd5e1" />
//           </TouchableOpacity>
//         </View>

//         <TouchableOpacity
//           className="ml-3 bg-red-500/20 p-2 rounded-full"
//           onPress={() => handleRemoveItem(item.id)}
//         >
//           <MaterialIcons name="delete-outline" size={18} color="#f87171" />
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   const renderProduct = ({ item }: { item: any }) => {
//     const inCart = cartItems.find((i) => i.id === item.id);
//     const inventory = inventoryData?.find(
//       (inv: any) => inv.productId === item.id,
//     );
//     const isOutOfStock = inventory?.quantity === 0;

//     return (
//       <TouchableOpacity
//         className={`flex-1 m-2 active:scale-95 transition-transform ${
//           isOutOfStock ? "opacity-50" : ""
//         }`}
//         onPress={() => !isOutOfStock && handleAddToCart(item)}
//         disabled={isOutOfStock}
//       >
//         <Card className="flex-1 p-4 bg-slate-900/80">
//           {inCart && (
//             <View className="absolute top-2 right-2 bg-sky-500 rounded-full w-6 h-6 items-center justify-center z-10">
//               <Text className="text-white text-xs font-bold">{inCart.qty}</Text>
//             </View>
//           )}
//           {isOutOfStock && (
//             <View className="absolute top-2 left-2 bg-rose-500/80 rounded-full px-2 py-0.5 z-10">
//               <Text className="text-white text-[8px] font-bold uppercase">
//                 Out of Stock
//               </Text>
//             </View>
//           )}
//           <View className="h-28 bg-slate-800/50 rounded-xl mb-3 items-center justify-center border border-white/5">
//             <MaterialIcons name="inventory-2" size={36} color="#64748b" />
//           </View>
//           <Text
//             className="text-slate-200 font-bold text-base mb-1"
//             numberOfLines={1}
//           >
//             {item.name}
//           </Text>
//           {item.brand && (
//             <Text
//               className="text-sky-300/60 text-[9px] font-medium mb-1"
//               numberOfLines={1}
//             >
//               {item.brand.name}
//             </Text>
//           )}
//           <Text
//             className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
//             numberOfLines={1}
//           >
//             SKU: {item.sku}
//           </Text>
//           <View className="flex-row items-center justify-between mt-auto">
//             <Text className="text-white font-black text-lg">
//               ${(item.sellingPrice || item.price || 0).toFixed(2)}
//             </Text>
//             {!isOutOfStock && (
//               <View className="bg-sky-500/20 p-2 rounded-full border border-sky-500/20">
//                 <MaterialIcons name="add" size={16} color="#7dd3fc" />
//               </View>
//             )}
//           </View>
//         </Card>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <SafeAreaView className="flex-1 bg-slate-950 pt-2">
//       <Screen padded={false}>
//         {/* Header Area */}
//         <View className="px-5 pt-4 pb-2">
//           <Header
//             eyebrow="Point of Sale"
//             title="New Order"
//             subtitle="Ready to take new orders"
//           />

//           {/* Search Bar */}
//           <View className="flex-row items-center bg-white/5 rounded-full px-1 border border-white/10">
//             <MaterialIcons name="search" size={22} color="#94a3b8" />
//             <TextInput
//               className="flex-1 ml-3 text-white text-sm font-medium"
//               placeholder="Search products, SKUs..."
//               placeholderTextColor="#64748b"
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//             />
//             {searchQuery.length > 0 ? (
//               <TouchableOpacity
//                 onPress={() => setSearchQuery("")}
//                 className="bg-white/10 p-1.5 rounded-full"
//               >
//                 <MaterialIcons name="close" size={14} color="#cbd5e1" />
//               </TouchableOpacity>
//             ) : (
//               <View className="flex-row">
//                 <TouchableOpacity
//                   onPress={() => setShowFilters(!showFilters)}
//                   className="bg-white/10 p-1.5 rounded-full mr-1"
//                 >
//                   <MaterialIcons
//                     name="filter-list"
//                     size={16}
//                     color={showFilters || selectedBrand ? "#38bdf8" : "#94a3b8"}
//                   />
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setShowScannerModal(true)}
//                   className="bg-sky-500/20 p-1.5 rounded-full border border-sky-500/30"
//                 >
//                   <MaterialIcons
//                     name="qr-code-scanner"
//                     size={16}
//                     color="#38bdf8"
//                   />
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>

//           {/* Filters - Brand Filter */}
//           {showFilters && brandsData && brandsData.length > 0 && (
//             <View className="mt-3">
//               <ScrollView
//                 horizontal
//                 showsHorizontalScrollIndicator={false}
//                 contentContainerStyle={{ paddingRight: 20 }}
//               >
//                 <TouchableOpacity
//                   className="mr-2"
//                   onPress={() => setSelectedBrand(undefined)}
//                 >
//                   <Pill
//                     label="All Brands"
//                     tone={!selectedBrand ? "sky" : "amber"}
//                   />
//                 </TouchableOpacity>
//                 {brandsData.map((brand: any) => (
//                   <TouchableOpacity
//                     key={brand.id}
//                     className="mr-2"
//                     onPress={() => setSelectedBrand(brand.id)}
//                   >
//                     <Pill
//                       label={brand.name}
//                       tone={selectedBrand === brand.id ? "sky" : "amber"}
//                     />
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//           )}

//           {/* Session Status */}
//           <View className="mt-2 flex-row items-center">
//             <View
//               className={`w-2 h-2 rounded-full mr-2 ${
//                 activeSession ? "bg-emerald-400" : "bg-rose-400"
//               }`}
//             />
//             <Text className="text-slate-400 text-xs">
//               {activeSession
//                 ? `Session Active • ${new Date(activeSession.openedAt).toLocaleTimeString()}`
//                 : "No Active Session"}
//             </Text>
//           </View>
//         </View>

//         {/* Categories Filter */}
//         <View className="pl-5 mb-2 mt-3 h-10">
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{ paddingRight: 20 }}
//           >
//             <TouchableOpacity
//               className="mr-2"
//               onPress={() => setSelectedCategory(undefined)}
//             >
//               <Pill
//                 label="All Items"
//                 tone={!selectedCategory ? "sky" : "amber"}
//               />
//             </TouchableOpacity>

//             {categoriesData?.map((cat: any) => (
//               <TouchableOpacity
//                 key={cat.id}
//                 className="mr-2"
//                 onPress={() => setSelectedCategory(cat.id)}
//               >
//                 <Pill
//                   label={cat.name}
//                   tone={selectedCategory === cat.id ? "sky" : "amber"}
//                 />
//               </TouchableOpacity>
//             ))}
//           </ScrollView>
//         </View>

//         {/* Products Grid */}
//         <FlatList
//           data={filteredProducts}
//           keyExtractor={(item) => item.id}
//           numColumns={2}
//           contentContainerStyle={{
//             paddingHorizontal: 12,
//             paddingBottom: 120,
//             paddingTop: 8,
//           }}
//           renderItem={renderProduct}
//           ListEmptyComponent={
//             <View className="flex-1 items-center justify-center mt-24">
//               <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
//                 <MaterialIcons name="inbox" size={32} color="#64748b" />
//               </View>
//               <Text className="text-white mt-4 text-lg font-bold">
//                 No products found
//               </Text>
//               <Text className="text-slate-500 mt-2 text-sm text-center px-10 leading-5">
//                 Try adjusting your search or sync to pull latest items from the
//                 server.
//               </Text>
//             </View>
//           }
//         />

//         {/* Floating Cart Summary */}
//         {cartCount > 0 && (
//           <View className="absolute bottom-6 left-5 right-5">
//             <TouchableOpacity
//               className="bg-sky-500 rounded-[24px] flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/20 border border-sky-400"
//               activeOpacity={0.9}
//               onPress={openCart}
//             >
//               <View className="flex-row items-center">
//                 <View className="bg-white/20 rounded-full w-10 h-10 items-center justify-center border border-white/20">
//                   <Text className="text-white font-black text-lg">
//                     {cartCount}
//                   </Text>
//                 </View>
//                 <Text className="text-white font-bold text-lg ml-3">
//                   View Cart
//                 </Text>
//               </View>
//               <Text className="text-white font-black text-xl">
//                 ${cartTotal.toFixed(2)}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* Cart Modal */}
//         <Modal
//           visible={showCartModal}
//           transparent
//           animationType="none"
//           onRequestClose={closeCart}
//         >
//           <View className="flex-1 bg-black/70">
//             <TouchableOpacity
//               className="flex-1"
//               activeOpacity={1}
//               onPress={closeCart}
//             />
//             <Animated.View
//               style={{
//                 transform: [{ translateY: slideAnim }],
//               }}
//               className="bg-slate-900 rounded-t-3xl max-h-[85%] min-h-[50%]"
//             >
//               <View className="flex-1 px-5 pt-5 pb-4">
//                 {/* Header */}
//                 <View className="flex-row justify-between items-center mb-4">
//                   <Text className="text-white font-bold text-xl">
//                     Your Cart ({cartCount} items)
//                   </Text>
//                   <TouchableOpacity onPress={closeCart}>
//                     <MaterialIcons name="close" size={24} color="#94a3b8" />
//                   </TouchableOpacity>
//                 </View>

//                 {/* Scrollable Content */}
//                 <ScrollView
//                   className="flex-1"
//                   showsVerticalScrollIndicator={true}
//                   contentContainerStyle={{ paddingBottom: 20 }}
//                 >
//                   {/* Customer Selection */}
//                   <TouchableOpacity
//                     className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/10"
//                     onPress={() => setShowCustomerSelect(!showCustomerSelect)}
//                   >
//                     <View className="flex-row items-center">
//                       <MaterialIcons
//                         name="person-outline"
//                         size={20}
//                         color="#94a3b8"
//                       />
//                       <Text className="text-white ml-2">
//                         {selectedCustomer
//                           ? `${selectedCustomer.name} (${selectedCustomer.code})`
//                           : "Select Customer"}
//                       </Text>
//                     </View>
//                     <MaterialIcons
//                       name={showCustomerSelect ? "expand-less" : "expand-more"}
//                       size={20}
//                       color="#94a3b8"
//                     />
//                   </TouchableOpacity>

//                   {showCustomerSelect && (
//                     <View className="bg-white/5 rounded-xl p-3 mb-4 max-h-40">
//                       <TextInput
//                         className="bg-white/10 rounded-lg p-2 text-white text-sm mb-2"
//                         placeholder="Search customers..."
//                         placeholderTextColor="#64748b"
//                         value={customerSearch}
//                         onChangeText={setCustomerSearch}
//                       />
//                       <FlatList
//                         data={customersData || []}
//                         keyExtractor={(item) => item.id}
//                         renderItem={({ item }) => (
//                           <TouchableOpacity
//                             className="py-2 border-b border-white/5"
//                             onPress={() => {
//                               setSelectedCustomer(item);
//                               setShowCustomerSelect(false);
//                               setCustomerSearch("");
//                             }}
//                           >
//                             <Text className="text-white">{item.name}</Text>
//                             <Text className="text-slate-400 text-xs">
//                               {item.code} • {item.phone || "No phone"}
//                             </Text>
//                           </TouchableOpacity>
//                         )}
//                         ListEmptyComponent={
//                           <Text className="text-slate-400 text-center py-2">
//                             No customers found
//                           </Text>
//                         }
//                       />
//                     </View>
//                   )}

//                   {/* Cart Items */}
//                   <View className="max-h-60 mb-4">
//                     <FlatList
//                       data={cartItems}
//                       keyExtractor={(item) => item.id}
//                       renderItem={renderCartItem}
//                       showsVerticalScrollIndicator={true}
//                       nestedScrollEnabled={true}
//                     />
//                   </View>

//                   {/* Cart Summary */}
//                   <View className="pt-4 border-t border-white/10">
//                     <View className="flex-row justify-between mb-1">
//                       <Text className="text-slate-400">Subtotal</Text>
//                       <Text className="text-white">
//                         ${cartSubtotal.toFixed(2)}
//                       </Text>
//                     </View>
//                     <View className="flex-row justify-between mb-1">
//                       <Text className="text-slate-400">Tax (5%)</Text>
//                       <Text className="text-white">
//                         ${taxAmount.toFixed(2)}
//                       </Text>
//                     </View>
//                     <View className="flex-row justify-between mb-1">
//                       <Text className="text-slate-400">Discount</Text>
//                       <Text className="text-white">
//                         -${discountAmount.toFixed(2)}
//                       </Text>
//                     </View>
//                     <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
//                       <Text className="text-white font-bold text-lg">
//                         Total
//                       </Text>
//                       <Text className="text-sky-400 font-bold text-lg">
//                         ${grandTotal.toFixed(2)}
//                       </Text>
//                     </View>

//                     {/* Payment Method */}
//                     <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-4 mb-2">
//                       Payment Method
//                     </Text>
//                     <View className="flex-row gap-2 mb-3">
//                       {["CASH", "CARD", "DIGITAL"].map((method) => (
//                         <TouchableOpacity
//                           key={method}
//                           className={`flex-1 py-3 rounded-lg border ${
//                             paymentMethod === method
//                               ? "bg-sky-500 border-sky-400"
//                               : "bg-white/10 border-white/10"
//                           }`}
//                           onPress={() =>
//                             handlePaymentMethodChange(method as PaymentMethod)
//                           }
//                         >
//                           <MaterialIcons
//                             name={
//                               method === "CASH"
//                                 ? "attach-money"
//                                 : method === "CARD"
//                                   ? "credit-card"
//                                   : "wifi"
//                             }
//                             size={20}
//                             color={
//                               paymentMethod === method ? "white" : "#94a3b8"
//                             }
//                             style={{ textAlign: "center" }}
//                           />
//                           <Text
//                             className={`text-center text-xs font-bold mt-1 ${
//                               paymentMethod === method
//                                 ? "text-white"
//                                 : "text-slate-400"
//                             }`}
//                           >
//                             {method}
//                           </Text>
//                         </TouchableOpacity>
//                       ))}
//                     </View>

//                     {/* Cash Payment Input */}
//                     {showCashInput && (
//                       <View className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
//                         <Text className="text-slate-300 text-sm font-medium mb-2">
//                           Cash Received
//                         </Text>
//                         <View className="flex-row items-center">
//                           <Text className="text-emerald-400 text-2xl font-bold mr-2">
//                             $
//                           </Text>
//                           <TextInput
//                             className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white text-2xl font-bold"
//                             keyboardType="decimal-pad"
//                             value={cashAmount}
//                             onChangeText={handleCashAmountChange}
//                             placeholder="0.00"
//                             placeholderTextColor="#64748b"
//                             autoFocus
//                           />
//                         </View>

//                         {parseFloat(cashAmount) > 0 && (
//                           <View className="mt-3 flex-row justify-between items-center bg-white/5 rounded-lg p-3">
//                             <Text className="text-slate-400 text-sm">
//                               Change:
//                             </Text>
//                             <Text
//                               className={`text-xl font-bold ${
//                                 changeAmount >= 0
//                                   ? "text-emerald-400"
//                                   : "text-rose-400"
//                               }`}
//                             >
//                               ${changeAmount.toFixed(2)}
//                             </Text>
//                           </View>
//                         )}

//                         <View className="flex-row gap-2 mt-3">
//                           {[20, 50, 100].map((amount) => (
//                             <TouchableOpacity
//                               key={amount}
//                               className="flex-1 bg-white/10 rounded-lg py-2 border border-white/10"
//                               onPress={() => {
//                                 const total = grandTotal + amount;
//                                 setCashAmount(total.toFixed(2));
//                                 calculateChange(total.toFixed(2));
//                               }}
//                             >
//                               <Text className="text-white text-center font-bold">
//                                 +${amount}
//                               </Text>
//                             </TouchableOpacity>
//                           ))}
//                           <TouchableOpacity
//                             className="flex-1 bg-white/10 rounded-lg py-2 border border-white/10"
//                             onPress={() => {
//                               setCashAmount(grandTotal.toFixed(2));
//                               calculateChange(grandTotal.toFixed(2));
//                             }}
//                           >
//                             <Text className="text-white text-center font-bold">
//                               Exact
//                             </Text>
//                           </TouchableOpacity>
//                         </View>
//                       </View>
//                     )}

//                     {paymentMethod === "CASH" && parseFloat(cashAmount) > 0 && (
//                       <View className="mt-3 flex-row justify-between items-center bg-white/5 rounded-lg p-3">
//                         <Text className="text-slate-400 text-sm">Payment:</Text>
//                         <Text className="text-white font-bold">
//                           ${parseFloat(cashAmount).toFixed(2)}
//                         </Text>
//                       </View>
//                     )}

//                     {hasOutOfStockItems && (
//                       <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
//                         <Text className="text-rose-400 text-xs font-medium text-center">
//                           ⚠️ Some items exceed available stock
//                         </Text>
//                       </View>
//                     )}

//                     {/* Checkout Button */}
//                     <TouchableOpacity
//                       className={`mt-4 py-4 rounded-xl ${
//                         cartItems.length === 0 ||
//                         isSubmitting ||
//                         hasOutOfStockItems ||
//                         (paymentMethod === "CASH" &&
//                           parseFloat(cashAmount) < grandTotal)
//                           ? "bg-slate-700"
//                           : "bg-emerald-500"
//                       }`}
//                       onPress={handleCheckout}
//                       disabled={
//                         cartItems.length === 0 ||
//                         isSubmitting ||
//                         hasOutOfStockItems ||
//                         isCreatingOrder ||
//                         (paymentMethod === "CASH" &&
//                           parseFloat(cashAmount) < grandTotal)
//                       }
//                     >
//                       {isSubmitting || isCreatingOrder ? (
//                         <ActivityIndicator color="white" />
//                       ) : (
//                         <View>
//                           <Text className="text-white text-center font-bold text-lg">
//                             Complete Order
//                           </Text>
//                           <Text className="text-white/70 text-center text-xs mt-0.5">
//                             ${grandTotal.toFixed(2)}
//                             {paymentMethod === "CASH" &&
//                               parseFloat(cashAmount) > 0 &&
//                               ` • Cash: $${parseFloat(cashAmount).toFixed(2)}`}
//                             {paymentMethod === "CASH" &&
//                               parseFloat(cashAmount) > 0 &&
//                               changeAmount > 0 &&
//                               ` • Change: $${changeAmount.toFixed(2)}`}
//                           </Text>
//                         </View>
//                       )}
//                     </TouchableOpacity>

//                     <View className="flex-row mt-3 gap-3">
//                       <TouchableOpacity
//                         className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
//                         onPress={() => {
//                           Alert.alert(
//                             "Clear Cart",
//                             "Are you sure you want to clear the cart?",
//                             [
//                               { text: "Cancel", style: "cancel" },
//                               {
//                                 text: "Clear",
//                                 style: "destructive",
//                                 onPress: () => {
//                                   dispatch(clearCart());
//                                   setCashAmount("");
//                                   setChangeAmount(0);
//                                 },
//                               },
//                             ],
//                           );
//                         }}
//                       >
//                         <Text className="text-red-400 text-center text-sm font-medium">
//                           Clear Cart
//                         </Text>
//                       </TouchableOpacity>
//                       <TouchableOpacity
//                         className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
//                         onPress={() => {
//                           setSelectedCustomer(null);
//                           setCashAmount("");
//                           setChangeAmount(0);
//                           Alert.alert(
//                             "Customer Cleared",
//                             "Customer has been removed.",
//                           );
//                         }}
//                       >
//                         <Text className="text-slate-400 text-center text-sm font-medium">
//                           Remove Customer
//                         </Text>
//                       </TouchableOpacity>
//                     </View>
//                   </View>
//                 </ScrollView>
//               </View>
//             </Animated.View>
//           </View>
//         </Modal>

//         <BarcodeScannerModal
//           visible={showScannerModal}
//           onClose={() => setShowScannerModal(false)}
//           onScan={handleScan}
//         />
//       </Screen>
//     </SafeAreaView>
//   );
// }

// // // ============================================
// // // FILE: app/(tabs)/pos.tsx (Upgraded with Cash Handling)
// // // ============================================

// // import { Card, Header, Pill, Screen } from "@/components/app-ui";
// // import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";
// // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// // import {
// //   addToCart,
// //   clearCart,
// //   removeFromCart,
// //   updateQuantity,
// // } from "@/services/features/cart/cartSlice";
// // import {
// //   useCreateLocalInventoryMovementMutation,
// //   useCreateLocalOrderMutation,
// //   useGetActiveSessionQuery,
// //   useGetLocalBrandsQuery,
// //   useGetLocalCategoriesQuery,
// //   useGetLocalCustomersQuery,
// //   useGetLocalInventoryQuery,
// //   useGetLocalProductsQuery,
// // } from "@/services/features/offline/localApi";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import { router } from "expo-router";
// // import React, { useRef, useState } from "react";
// // import {
// //   ActivityIndicator,
// //   Alert,
// //   Animated,
// //   Dimensions,
// //   FlatList,
// //   Modal,
// //   ScrollView,
// //   Text,
// //   TextInput,
// //   TouchableOpacity,
// //   SafeAreaView,
// //   View,
// // } from "react-native";

// // const { height } = Dimensions.get("window");

// // // Payment method types
// // type PaymentMethod = "CASH" | "CARD" | "DIGITAL";

// // export default function POSScreen() {
// //   const dispatch = useAppDispatch();
// //   const user = useAppSelector((state) => state.auth.user);

// //   // State
// //   const [searchQuery, setSearchQuery] = useState("");
// //   const [showScannerModal, setShowScannerModal] = useState(false);
// //   const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
// //     undefined,
// //   );
// //   const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
// //     undefined,
// //   );
// //   const [showCartModal, setShowCartModal] = useState(false);
// //   const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
// //   const [showCustomerSelect, setShowCustomerSelect] = useState(false);
// //   const [isSubmitting, setIsSubmitting] = useState(false);
// //   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
// //   const [customerSearch, setCustomerSearch] = useState("");
// //   const [showFilters, setShowFilters] = useState(false);

// //   // ✅ Cash payment state
// //   const [cashAmount, setCashAmount] = useState<string>("");
// //   const [showCashInput, setShowCashInput] = useState(false);
// //   const [changeAmount, setChangeAmount] = useState<number>(0);

// //   // Animations
// //   const slideAnim = useRef(new Animated.Value(height)).current;

// //   // Queries
// //   const {
// //     data: productsData,
// //     isLoading: isProductsLoading,
// //     refetch,
// //   } = useGetLocalProductsQuery({
// //     search: searchQuery,
// //     categoryId: selectedCategory,
// //   });

// //   const { data: categoriesData } = useGetLocalCategoriesQuery();
// //   const { data: brandsData } = useGetLocalBrandsQuery();
// //   const { data: customersData } = useGetLocalCustomersQuery({
// //     search: customerSearch || undefined,
// //   });
// //   const { data: activeSession } = useGetActiveSessionQuery({
// //     userId: user?.id || "",
// //   });
// //   const { data: inventoryData } = useGetLocalInventoryQuery({});

// //   // Mutations
// //   const [createOrder, { isLoading: isCreatingOrder }] =
// //     useCreateLocalOrderMutation();
// //   const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

// //   // Filter products by brand
// //   const filteredProducts = React.useMemo(() => {
// //     let products = productsData || [];
// //     if (selectedBrand) {
// //       products = products.filter((p: any) => p.brandId === selectedBrand);
// //     }
// //     return products;
// //   }, [productsData, selectedBrand]);

// //   // Cart state
// //   const cartItems = useAppSelector((state) => state.cart.items);
// //   const cartTotal = cartItems.reduce(
// //     (total, item) => total + item.price * item.qty,
// //     0,
// //   );
// //   const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
// //   const cartSubtotal = cartTotal;
// //   const taxAmount = cartTotal * 0.05;
// //   const discountAmount = 0;
// //   const grandTotal = cartSubtotal + taxAmount - discountAmount;

// //   const hasOutOfStockItems = cartItems.some((item) => {
// //     const inventory = inventoryData?.find(
// //       (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
// //     );
// //     return inventory && inventory.quantity < item.qty;
// //   });

// //   // ✅ Calculate change when cash amount changes
// //   const calculateChange = (amount: string) => {
// //     const numAmount = parseFloat(amount) || 0;
// //     const change = numAmount - grandTotal;
// //     setChangeAmount(change > 0 ? change : 0);
// //   };

// //   const handleCashAmountChange = (text: string) => {
// //     setCashAmount(text);
// //     calculateChange(text);
// //   };

// //   const handlePaymentMethodChange = (method: PaymentMethod) => {
// //     setPaymentMethod(method);
// //     if (method === "CASH") {
// //       setShowCashInput(true);
// //       setCashAmount("");
// //       setChangeAmount(0);
// //     } else {
// //       setShowCashInput(false);
// //       setCashAmount("");
// //       setChangeAmount(0);
// //     }
// //   };

// //   // Handlers
// //   const handleAddToCart = (product: any) => {
// //     const inventory = inventoryData?.find(
// //       (inv: any) => inv.productId === product.id,
// //     );

// //     if (inventory && inventory.quantity <= 0) {
// //       Alert.alert("Out of Stock", `${product.name} is currently out of stock.`);
// //       return;
// //     }

// //     dispatch(
// //       addToCart({
// //         id: product.id,
// //         name: product.name,
// //         price: product.sellingPrice || product.price || 0,
// //         qty: 1,
// //         sku: product.sku,
// //         barcode: product.barcode,
// //         stockQuantity: inventory?.quantity || 0,
// //         brand: product.brand,
// //         category: product.category,
// //       }),
// //     );
// //   };

// //   const handleUpdateQuantity = (id: string, qty: number) => {
// //     if (qty <= 0) {
// //       dispatch(removeFromCart(id));
// //     } else {
// //       dispatch(updateQuantity({ id, qty }));
// //     }
// //   };

// //   const handleRemoveItem = (id: string) => {
// //     dispatch(removeFromCart(id));
// //   };

// //   const handleScan = (data: string) => {
// //     setShowScannerModal(false);
// //     const product = productsData?.find(
// //       (p: any) => p.barcode === data || p.sku === data || p.id === data,
// //     );
// //     if (product) {
// //       handleAddToCart(product);
// //     } else {
// //       setSearchQuery(data);
// //     }
// //   };

// //   const openCart = () => {
// //     if (cartCount === 0) {
// //       Alert.alert("Cart Empty", "Please add items to the cart first.");
// //       return;
// //     }
// //     setShowCartModal(true);
// //     // Reset cash input when opening cart
// //     setCashAmount("");
// //     setChangeAmount(0);
// //     setShowCashInput(paymentMethod === "CASH");
// //     Animated.spring(slideAnim, {
// //       toValue: 0,
// //       useNativeDriver: true,
// //       speed: 12,
// //     }).start();
// //   };

// //   const closeCart = () => {
// //     Animated.spring(slideAnim, {
// //       toValue: height,
// //       useNativeDriver: true,
// //       speed: 12,
// //     }).start(() => setShowCartModal(false));
// //   };

// //   const handleCheckout = async () => {
// //     if (cartItems.length === 0) {
// //       Alert.alert("Cart Empty", "Please add items to the cart first.");
// //       return;
// //     }

// //     if (hasOutOfStockItems) {
// //       Alert.alert(
// //         "Insufficient Stock",
// //         "Some items in your cart don't have enough stock. Please adjust quantities.",
// //       );
// //       return;
// //     }

// //     if (!activeSession) {
// //       Alert.alert(
// //         "No Active Session",
// //         "Please open a session before placing an order.",
// //         [
// //           {
// //             text: "Open Session",
// //             onPress: () => router.push("/(tabs)/sessions"),
// //           },
// //           { text: "Cancel", style: "cancel" },
// //         ],
// //       );
// //       return;
// //     }

// //     // ✅ Validate cash payment
// //     if (paymentMethod === "CASH") {
// //       const cashNum = parseFloat(cashAmount) || 0;
// //       if (cashNum < grandTotal) {
// //         Alert.alert(
// //           "Insufficient Cash",
// //           `Please enter at least $${grandTotal.toFixed(2)}`,
// //         );
// //         return;
// //       }
// //     }

// //     setIsSubmitting(true);

// //     try {
// //       // Calculate paid amount based on payment method
// //       let paidAmount = grandTotal;
// //       let change = 0;

// //       if (paymentMethod === "CASH") {
// //         paidAmount = parseFloat(cashAmount) || grandTotal;
// //         change = paidAmount - grandTotal;
// //       }

// //       // // Build order payload
// //       // const orderPayload = {
// //       //   tenantId: user?.tenantId || "default",
// //       //   storeId: activeSession.storeId,
// //       //   sessionId: activeSession.id,
// //       //   userId: user?.id || "unknown",
// //       //   customerId: selectedCustomer?.id || null,
// //       //   paymentMethod: paymentMethod,
// //       //   paymentStatus: "PAID",
// //       //   subTotal: Number(cartSubtotal.toFixed(2)),
// //       //   taxAmount: Number(taxAmount.toFixed(2)),
// //       //   discountAmount: Number(discountAmount.toFixed(2)),
// //       //   grandTotal: Number(grandTotal.toFixed(2)),
// //       //   paidAmount: Number(paidAmount.toFixed(2)),
// //       //   changeAmount: Number(change.toFixed(2)),
// //       //   items: cartItems.map((item) => ({
// //       //     productId: item.id,
// //       //     quantity: Number(item.qty),
// //       //     unitPrice: Number(item.price.toFixed(2)),
// //       //     subTotal: Number((item.price * item.qty).toFixed(2)),
// //       //     discountAmount: 0,
// //       //   })),
// //       // };
// //       // ============================================
// //       // FILE: app/(tabs)/pos.tsx - handleCheckout
// //       // ============================================

// //       // Build order payload with proper null handling
// //       const orderPayload = {
// //         tenantId: user?.tenantId || "default",
// //         storeId: activeSession.storeId,
// //         sessionId: activeSession.id,
// //         userId: user?.id || "unknown",
// //         // ✅ FIX: Send null instead of empty string for customerId
// //         customerId: selectedCustomer?.id || null,
// //         paymentMethod: paymentMethod,
// //         paymentStatus: "PAID",
// //         subTotal: Number(cartSubtotal.toFixed(2)),
// //         taxAmount: Number(taxAmount.toFixed(2)),
// //         discountAmount: Number(discountAmount.toFixed(2)),
// //         grandTotal: Number(grandTotal.toFixed(2)),
// //         paidAmount: Number(grandTotal.toFixed(2)),
// //         changeAmount: 0,
// //         items: cartItems.map((item) => ({
// //           productId: item.id,
// //           quantity: Number(item.qty),
// //           unitPrice: Number(item.price.toFixed(2)),
// //           subTotal: Number((item.price * item.qty).toFixed(2)),
// //           discountAmount: 0,
// //           // ✅ FIX: Don't send variantId if not needed
// //           variantId: null,
// //         })),
// //       };

// //       console.log("📤 Order payload:", JSON.stringify(orderPayload, null, 2));

// //       // Create the order
// //       const result = await createOrder(orderPayload).unwrap();

// //       console.log("✅ Order created:", result);

// //       // Create inventory movements for each item
// //       for (const item of cartItems) {
// //         try {
// //           await createInventoryMovement({
// //             tenantId: user?.tenantId || "default",
// //             storeId: activeSession.storeId,
// //             productId: item.id,
// //             quantity: Number(item.qty),
// //             type: "SALE",
// //             referenceId: result.id,
// //             referenceType: "ORDER",
// //             reason: `Order #${result.orderNumber || result.id.slice(-6)}`,
// //           }).unwrap();
// //         } catch (movementError) {
// //           console.error(
// //             "❌ Failed to create inventory movement:",
// //             movementError,
// //           );
// //           // Don't fail the whole order if inventory movement fails
// //         }
// //       }

// //       dispatch(clearCart());
// //       setSelectedCustomer(null);
// //       setCashAmount("");
// //       setChangeAmount(0);
// //       closeCart();

// //       // Navigate to receipt
// //       router.push(`/receipt/${result.id}`);
// //       refetch();
// //     } catch (error: any) {
// //       console.error("❌ Checkout error:", error);

// //       let errorMessage = "Failed to create order. Please try again.";
// //       if (error?.data?.message) {
// //         errorMessage = error.data.message;
// //       } else if (error?.message) {
// //         errorMessage = error.message;
// //       } else if (typeof error === "string") {
// //         errorMessage = error;
// //       }

// //       Alert.alert("Checkout Failed", errorMessage, [
// //         {
// //           text: "Retry",
// //           onPress: handleCheckout,
// //         },
// //         { text: "Cancel", style: "cancel" },
// //       ]);
// //     } finally {
// //       setIsSubmitting(false);
// //     }
// //   };

// //   const renderCartItem = ({ item }: { item: any }) => {
// //     const inventory = inventoryData?.find(
// //       (inv: any) => inv.productId === item.id,
// //     );
// //     const maxQty = inventory?.quantity || 0;

// //     return (
// //       <View className="flex-row items-center py-3 border-b border-white/5">
// //         <View className="flex-1">
// //           <Text className="text-white font-bold text-base">{item.name}</Text>
// //           {item.brand && (
// //             <Text className="text-sky-300/60 text-[10px] font-medium">
// //               {item.brand.name}
// //             </Text>
// //           )}
// //           <Text className="text-slate-400 text-xs">
// //             SKU: {item.sku || "N/A"}
// //           </Text>
// //           <Text className="text-sky-300 font-bold text-sm mt-1">
// //             ${item.price.toFixed(2)}
// //           </Text>
// //           {maxQty > 0 && (
// //             <Text className="text-slate-500 text-[10px]">
// //               Available: {maxQty}
// //             </Text>
// //           )}
// //         </View>

// //         <View className="flex-row items-center">
// //           <TouchableOpacity
// //             className="bg-white/10 rounded-full w-8 h-8 items-center justify-center"
// //             onPress={() => handleUpdateQuantity(item.id, item.qty - 1)}
// //           >
// //             <MaterialIcons name="remove" size={18} color="#cbd5e1" />
// //           </TouchableOpacity>

// //           <Text className="text-white font-bold text-lg w-10 text-center">
// //             {item.qty}
// //           </Text>

// //           <TouchableOpacity
// //             className={`bg-white/10 rounded-full w-8 h-8 items-center justify-center ${
// //               item.qty >= maxQty && maxQty > 0 ? "opacity-50" : ""
// //             }`}
// //             onPress={() => handleUpdateQuantity(item.id, item.qty + 1)}
// //             disabled={item.qty >= maxQty && maxQty > 0}
// //           >
// //             <MaterialIcons name="add" size={18} color="#cbd5e1" />
// //           </TouchableOpacity>
// //         </View>

// //         <TouchableOpacity
// //           className="ml-3 bg-red-500/20 p-2 rounded-full"
// //           onPress={() => handleRemoveItem(item.id)}
// //         >
// //           <MaterialIcons name="delete-outline" size={18} color="#f87171" />
// //         </TouchableOpacity>
// //       </View>
// //     );
// //   };

// //   const renderProduct = ({ item }: { item: any }) => {
// //     const inCart = cartItems.find((i) => i.id === item.id);
// //     const inventory = inventoryData?.find(
// //       (inv: any) => inv.productId === item.id,
// //     );
// //     const isOutOfStock = inventory?.quantity === 0;

// //     return (
// //       <TouchableOpacity
// //         className={`flex-1 m-2 active:scale-95 transition-transform ${
// //           isOutOfStock ? "opacity-50" : ""
// //         }`}
// //         onPress={() => !isOutOfStock && handleAddToCart(item)}
// //         disabled={isOutOfStock}
// //       >
// //         <Card className="flex-1 p-4 bg-slate-900/80">
// //           {inCart && (
// //             <View className="absolute top-2 right-2 bg-sky-500 rounded-full w-6 h-6 items-center justify-center z-10">
// //               <Text className="text-white text-xs font-bold">{inCart.qty}</Text>
// //             </View>
// //           )}
// //           {isOutOfStock && (
// //             <View className="absolute top-2 left-2 bg-rose-500/80 rounded-full px-2 py-0.5 z-10">
// //               <Text className="text-white text-[8px] font-bold uppercase">
// //                 Out of Stock
// //               </Text>
// //             </View>
// //           )}
// //           <View className="h-28 bg-slate-800/50 rounded-xl mb-3 items-center justify-center border border-white/5">
// //             <MaterialIcons name="inventory-2" size={36} color="#64748b" />
// //           </View>
// //           <Text
// //             className="text-slate-200 font-bold text-base mb-1"
// //             numberOfLines={1}
// //           >
// //             {item.name}
// //           </Text>
// //           {item.brand && (
// //             <Text
// //               className="text-sky-300/60 text-[9px] font-medium mb-1"
// //               numberOfLines={1}
// //             >
// //               {item.brand.name}
// //             </Text>
// //           )}
// //           <Text
// //             className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
// //             numberOfLines={1}
// //           >
// //             SKU: {item.sku}
// //           </Text>
// //           <View className="flex-row items-center justify-between mt-auto">
// //             <Text className="text-white font-black text-lg">
// //               ${(item.sellingPrice || item.price || 0).toFixed(2)}
// //             </Text>
// //             {!isOutOfStock && (
// //               <View className="bg-sky-500/20 p-2 rounded-full border border-sky-500/20">
// //                 <MaterialIcons name="add" size={16} color="#7dd3fc" />
// //               </View>
// //             )}
// //           </View>
// //         </Card>
// //       </TouchableOpacity>
// //     );
// //   };

// //   return (
// //     <SafeAreaView className="flex-1 bg-slate-950 pt-2">
// //       <Screen padded={false}>
// //         {/* Header Area */}
// //         <View className="px-5 pt-4 pb-2">
// //           <Header
// //             eyebrow="Point of Sale"
// //             title="New Order"
// //             subtitle="Ready to take new orders"
// //           />

// //           {/* Search Bar */}
// //           <View className="flex-row items-center bg-white/5 rounded-full px-1 border border-white/10">
// //             <MaterialIcons name="search" size={22} color="#94a3b8" />
// //             <TextInput
// //               className="flex-1 ml-3 text-white text-sm font-medium"
// //               placeholder="Search products, SKUs..."
// //               placeholderTextColor="#64748b"
// //               value={searchQuery}
// //               onChangeText={setSearchQuery}
// //             />
// //             {searchQuery.length > 0 ? (
// //               <TouchableOpacity
// //                 onPress={() => setSearchQuery("")}
// //                 className="bg-white/10 p-1.5 rounded-full"
// //               >
// //                 <MaterialIcons name="close" size={14} color="#cbd5e1" />
// //               </TouchableOpacity>
// //             ) : (
// //               <View className="flex-row">
// //                 <TouchableOpacity
// //                   onPress={() => setShowFilters(!showFilters)}
// //                   className="bg-white/10 p-1.5 rounded-full mr-1"
// //                 >
// //                   <MaterialIcons
// //                     name="filter-list"
// //                     size={16}
// //                     color={showFilters || selectedBrand ? "#38bdf8" : "#94a3b8"}
// //                   />
// //                 </TouchableOpacity>
// //                 <TouchableOpacity
// //                   onPress={() => setShowScannerModal(true)}
// //                   className="bg-sky-500/20 p-1.5 rounded-full border border-sky-500/30"
// //                 >
// //                   <MaterialIcons
// //                     name="qr-code-scanner"
// //                     size={16}
// //                     color="#38bdf8"
// //                   />
// //                 </TouchableOpacity>
// //               </View>
// //             )}
// //           </View>

// //           {/* Filters - Brand Filter */}
// //           {showFilters && brandsData && brandsData.length > 0 && (
// //             <View className="mt-3">
// //               <ScrollView
// //                 horizontal
// //                 showsHorizontalScrollIndicator={false}
// //                 contentContainerStyle={{ paddingRight: 20 }}
// //               >
// //                 <TouchableOpacity
// //                   className="mr-2"
// //                   onPress={() => setSelectedBrand(undefined)}
// //                 >
// //                   <Pill
// //                     label="All Brands"
// //                     tone={!selectedBrand ? "sky" : "amber"}
// //                   />
// //                 </TouchableOpacity>
// //                 {brandsData.map((brand: any) => (
// //                   <TouchableOpacity
// //                     key={brand.id}
// //                     className="mr-2"
// //                     onPress={() => setSelectedBrand(brand.id)}
// //                   >
// //                     <Pill
// //                       label={brand.name}
// //                       tone={selectedBrand === brand.id ? "sky" : "amber"}
// //                     />
// //                   </TouchableOpacity>
// //                 ))}
// //               </ScrollView>
// //             </View>
// //           )}

// //           {/* Session Status */}
// //           <View className="mt-2 flex-row items-center">
// //             <View
// //               className={`w-2 h-2 rounded-full mr-2 ${
// //                 activeSession ? "bg-emerald-400" : "bg-rose-400"
// //               }`}
// //             />
// //             <Text className="text-slate-400 text-xs">
// //               {activeSession
// //                 ? `Session Active • ${new Date(activeSession.openedAt).toLocaleTimeString()}`
// //                 : "No Active Session"}
// //             </Text>
// //           </View>
// //         </View>

// //         {/* Categories Filter */}
// //         <View className="pl-5 mb-2 mt-3 h-10">
// //           <ScrollView
// //             horizontal
// //             showsHorizontalScrollIndicator={false}
// //             contentContainerStyle={{ paddingRight: 20 }}
// //           >
// //             <TouchableOpacity
// //               className="mr-2"
// //               onPress={() => setSelectedCategory(undefined)}
// //             >
// //               <Pill
// //                 label="All Items"
// //                 tone={!selectedCategory ? "sky" : "amber"}
// //               />
// //             </TouchableOpacity>

// //             {categoriesData?.map((cat: any) => (
// //               <TouchableOpacity
// //                 key={cat.id}
// //                 className="mr-2"
// //                 onPress={() => setSelectedCategory(cat.id)}
// //               >
// //                 <Pill
// //                   label={cat.name}
// //                   tone={selectedCategory === cat.id ? "sky" : "amber"}
// //                 />
// //               </TouchableOpacity>
// //             ))}
// //           </ScrollView>
// //         </View>

// //         {/* Products Grid */}
// //         <FlatList
// //           data={filteredProducts}
// //           keyExtractor={(item) => item.id}
// //           numColumns={2}
// //           contentContainerStyle={{
// //             paddingHorizontal: 12,
// //             paddingBottom: 120,
// //             paddingTop: 8,
// //           }}
// //           renderItem={renderProduct}
// //           ListEmptyComponent={
// //             <View className="flex-1 items-center justify-center mt-24">
// //               <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
// //                 <MaterialIcons name="inbox" size={32} color="#64748b" />
// //               </View>
// //               <Text className="text-white mt-4 text-lg font-bold">
// //                 No products found
// //               </Text>
// //               <Text className="text-slate-500 mt-2 text-sm text-center px-10 leading-5">
// //                 Try adjusting your search or sync to pull latest items from the
// //                 server.
// //               </Text>
// //             </View>
// //           }
// //         />

// //         {/* Floating Cart Summary */}
// //         {cartCount > 0 && (
// //           <View className="absolute bottom-6 left-5 right-5">
// //             <TouchableOpacity
// //               className="bg-sky-500 rounded-[24px] flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/20 border border-sky-400"
// //               activeOpacity={0.9}
// //               onPress={openCart}
// //             >
// //               <View className="flex-row items-center">
// //                 <View className="bg-white/20 rounded-full w-10 h-10 items-center justify-center border border-white/20">
// //                   <Text className="text-white font-black text-lg">
// //                     {cartCount}
// //                   </Text>
// //                 </View>
// //                 <Text className="text-white font-bold text-lg ml-3">
// //                   View Cart
// //                 </Text>
// //               </View>
// //               <Text className="text-white font-black text-xl">
// //                 ${cartTotal.toFixed(2)}
// //               </Text>
// //             </TouchableOpacity>
// //           </View>
// //         )}

// //         {/* Cart Modal */}
// //         <Modal
// //           visible={showCartModal}
// //           transparent
// //           animationType="none"
// //           onRequestClose={closeCart}
// //         >
// //           <View className="flex-1 bg-black/70">
// //             <TouchableOpacity
// //               className="flex-1"
// //               activeOpacity={1}
// //               onPress={closeCart}
// //             />
// //             <Animated.View
// //               style={{
// //                 transform: [{ translateY: slideAnim }],
// //               }}
// //               className="bg-slate-900 rounded-t-3xl max-h-[85%] min-h-[50%]"
// //             >
// //               <View className="px-5 pt-5 pb-4">
// //                 {/* Header */}
// //                 <View className="flex-row justify-between items-center mb-4">
// //                   <Text className="text-white font-bold text-xl">
// //                     Your Cart ({cartCount} items)
// //                   </Text>
// //                   <TouchableOpacity onPress={closeCart}>
// //                     <MaterialIcons name="close" size={24} color="#94a3b8" />
// //                   </TouchableOpacity>
// //                 </View>

// //                 {/* Customer Selection */}
// //                 <TouchableOpacity
// //                   className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/10"
// //                   onPress={() => setShowCustomerSelect(!showCustomerSelect)}
// //                 >
// //                   <View className="flex-row items-center">
// //                     <MaterialIcons
// //                       name="person-outline"
// //                       size={20}
// //                       color="#94a3b8"
// //                     />
// //                     <Text className="text-white ml-2">
// //                       {selectedCustomer
// //                         ? `${selectedCustomer.name} (${selectedCustomer.code})`
// //                         : "Select Customer"}
// //                     </Text>
// //                   </View>
// //                   <MaterialIcons
// //                     name={showCustomerSelect ? "expand-less" : "expand-more"}
// //                     size={20}
// //                     color="#94a3b8"
// //                   />
// //                 </TouchableOpacity>

// //                 {showCustomerSelect && (
// //                   <View className="bg-white/5 rounded-xl p-3 mb-4 max-h-40">
// //                     <TextInput
// //                       className="bg-white/10 rounded-lg p-2 text-white text-sm mb-2"
// //                       placeholder="Search customers..."
// //                       placeholderTextColor="#64748b"
// //                       value={customerSearch}
// //                       onChangeText={setCustomerSearch}
// //                     />
// //                     <FlatList
// //                       data={customersData || []}
// //                       keyExtractor={(item) => item.id}
// //                       renderItem={({ item }) => (
// //                         <TouchableOpacity
// //                           className="py-2 border-b border-white/5"
// //                           onPress={() => {
// //                             setSelectedCustomer(item);
// //                             setShowCustomerSelect(false);
// //                             setCustomerSearch("");
// //                           }}
// //                         >
// //                           <Text className="text-white">{item.name}</Text>
// //                           <Text className="text-slate-400 text-xs">
// //                             {item.code} • {item.phone || "No phone"}
// //                           </Text>
// //                         </TouchableOpacity>
// //                       )}
// //                       ListEmptyComponent={
// //                         <Text className="text-slate-400 text-center py-2">
// //                           No customers found
// //                         </Text>
// //                       }
// //                     />
// //                   </View>
// //                 )}

// //                 {/* Cart Items */}
// //                 <FlatList
// //                   data={cartItems}
// //                   keyExtractor={(item) => item.id}
// //                   renderItem={renderCartItem}
// //                   className="max-h-60"
// //                   showsVerticalScrollIndicator={false}
// //                 />

// //                 {/* Cart Summary */}
// //                 <View className="mt-4 pt-4 border-t border-white/10">
// //                   <View className="flex-row justify-between mb-1">
// //                     <Text className="text-slate-400">Subtotal</Text>
// //                     <Text className="text-white">
// //                       ${cartSubtotal.toFixed(2)}
// //                     </Text>
// //                   </View>
// //                   <View className="flex-row justify-between mb-1">
// //                     <Text className="text-slate-400">Tax (5%)</Text>
// //                     <Text className="text-white">${taxAmount.toFixed(2)}</Text>
// //                   </View>
// //                   <View className="flex-row justify-between mb-1">
// //                     <Text className="text-slate-400">Discount</Text>
// //                     <Text className="text-white">
// //                       -${discountAmount.toFixed(2)}
// //                     </Text>
// //                   </View>
// //                   <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
// //                     <Text className="text-white font-bold text-lg">Total</Text>
// //                     <Text className="text-sky-400 font-bold text-lg">
// //                       ${grandTotal.toFixed(2)}
// //                     </Text>
// //                   </View>

// //                   {/* ✅ Payment Method Selection */}
// //                   <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-4 mb-2">
// //                     Payment Method
// //                   </Text>
// //                   <View className="flex-row gap-2 mb-3">
// //                     {["CASH", "CARD", "DIGITAL"].map((method) => (
// //                       <TouchableOpacity
// //                         key={method}
// //                         className={`flex-1 py-3 rounded-lg border ${
// //                           paymentMethod === method
// //                             ? "bg-sky-500 border-sky-400"
// //                             : "bg-white/10 border-white/10"
// //                         }`}
// //                         onPress={() =>
// //                           handlePaymentMethodChange(method as PaymentMethod)
// //                         }
// //                       >
// //                         <MaterialIcons
// //                           name={
// //                             method === "CASH"
// //                               ? "attach-money"
// //                               : method === "CARD"
// //                                 ? "credit-card"
// //                                 : "wifi"
// //                           }
// //                           size={20}
// //                           color={paymentMethod === method ? "white" : "#94a3b8"}
// //                           style={{ textAlign: "center" }}
// //                         />
// //                         <Text
// //                           className={`text-center text-xs font-bold mt-1 ${
// //                             paymentMethod === method
// //                               ? "text-white"
// //                               : "text-slate-400"
// //                           }`}
// //                         >
// //                           {method}
// //                         </Text>
// //                       </TouchableOpacity>
// //                     ))}
// //                   </View>

// //                   {/* ✅ Cash Payment Input */}
// //                   {showCashInput && (
// //                     <View className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
// //                       <Text className="text-slate-300 text-sm font-medium mb-2">
// //                         Cash Received
// //                       </Text>
// //                       <View className="flex-row items-center">
// //                         <Text className="text-emerald-400 text-2xl font-bold mr-2">
// //                           $
// //                         </Text>
// //                         <TextInput
// //                           className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white text-2xl font-bold"
// //                           keyboardType="decimal-pad"
// //                           value={cashAmount}
// //                           onChangeText={handleCashAmountChange}
// //                           placeholder="0.00"
// //                           placeholderTextColor="#64748b"
// //                           autoFocus
// //                         />
// //                       </View>

// //                       {/* Change Display */}
// //                       {parseFloat(cashAmount) > 0 && (
// //                         <View className="mt-3 flex-row justify-between items-center bg-white/5 rounded-lg p-3">
// //                           <Text className="text-slate-400 text-sm">
// //                             Change:
// //                           </Text>
// //                           <Text
// //                             className={`text-xl font-bold ${
// //                               changeAmount >= 0
// //                                 ? "text-emerald-400"
// //                                 : "text-rose-400"
// //                             }`}
// //                           >
// //                             ${changeAmount.toFixed(2)}
// //                           </Text>
// //                         </View>
// //                       )}

// //                       {/* Quick Amount Buttons */}
// //                       <View className="flex-row gap-2 mt-3">
// //                         {[20, 50, 100].map((amount) => (
// //                           <TouchableOpacity
// //                             key={amount}
// //                             className="flex-1 bg-white/10 rounded-lg py-2 border border-white/10"
// //                             onPress={() => {
// //                               const total = grandTotal + amount;
// //                               setCashAmount(total.toFixed(2));
// //                               calculateChange(total.toFixed(2));
// //                             }}
// //                           >
// //                             <Text className="text-white text-center font-bold">
// //                               +${amount}
// //                             </Text>
// //                           </TouchableOpacity>
// //                         ))}
// //                         <TouchableOpacity
// //                           className="flex-1 bg-white/10 rounded-lg py-2 border border-white/10"
// //                           onPress={() => {
// //                             setCashAmount(grandTotal.toFixed(2));
// //                             calculateChange(grandTotal.toFixed(2));
// //                           }}
// //                         >
// //                           <Text className="text-white text-center font-bold">
// //                             Exact
// //                           </Text>
// //                         </TouchableOpacity>
// //                       </View>
// //                     </View>
// //                   )}

// //                   {/* Payment Status */}
// //                   {paymentMethod === "CASH" && parseFloat(cashAmount) > 0 && (
// //                     <View className="mt-3 flex-row justify-between items-center bg-white/5 rounded-lg p-3">
// //                       <Text className="text-slate-400 text-sm">Payment:</Text>
// //                       <Text className="text-white font-bold">
// //                         ${parseFloat(cashAmount).toFixed(2)}
// //                       </Text>
// //                     </View>
// //                   )}

// //                   {hasOutOfStockItems && (
// //                     <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
// //                       <Text className="text-rose-400 text-xs font-medium text-center">
// //                         ⚠️ Some items exceed available stock
// //                       </Text>
// //                     </View>
// //                   )}

// //                   {/* Checkout Button */}
// //                   <TouchableOpacity
// //                     className={`mt-4 py-4 rounded-xl ${
// //                       cartItems.length === 0 ||
// //                       isSubmitting ||
// //                       hasOutOfStockItems ||
// //                       (paymentMethod === "CASH" &&
// //                         parseFloat(cashAmount) < grandTotal)
// //                         ? "bg-slate-700"
// //                         : "bg-emerald-500"
// //                     }`}
// //                     onPress={handleCheckout}
// //                     disabled={
// //                       cartItems.length === 0 ||
// //                       isSubmitting ||
// //                       hasOutOfStockItems ||
// //                       isCreatingOrder ||
// //                       (paymentMethod === "CASH" &&
// //                         parseFloat(cashAmount) < grandTotal)
// //                     }
// //                   >
// //                     {isSubmitting || isCreatingOrder ? (
// //                       <ActivityIndicator color="white" />
// //                     ) : (
// //                       <View>
// //                         <Text className="text-white text-center font-bold text-lg">
// //                           Complete Order
// //                         </Text>
// //                         <Text className="text-white/70 text-center text-xs mt-0.5">
// //                           ${grandTotal.toFixed(2)}
// //                           {paymentMethod === "CASH" &&
// //                             parseFloat(cashAmount) > 0 &&
// //                             ` • Cash: $${parseFloat(cashAmount).toFixed(2)}`}
// //                           {paymentMethod === "CASH" &&
// //                             parseFloat(cashAmount) > 0 &&
// //                             changeAmount > 0 &&
// //                             ` • Change: $${changeAmount.toFixed(2)}`}
// //                         </Text>
// //                       </View>
// //                     )}
// //                   </TouchableOpacity>

// //                   <View className="flex-row mt-3 gap-3">
// //                     <TouchableOpacity
// //                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
// //                       onPress={() => {
// //                         Alert.alert(
// //                           "Clear Cart",
// //                           "Are you sure you want to clear the cart?",
// //                           [
// //                             { text: "Cancel", style: "cancel" },
// //                             {
// //                               text: "Clear",
// //                               style: "destructive",
// //                               onPress: () => {
// //                                 dispatch(clearCart());
// //                                 setCashAmount("");
// //                                 setChangeAmount(0);
// //                               },
// //                             },
// //                           ],
// //                         );
// //                       }}
// //                     >
// //                       <Text className="text-red-400 text-center text-sm font-medium">
// //                         Clear Cart
// //                       </Text>
// //                     </TouchableOpacity>
// //                     <TouchableOpacity
// //                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
// //                       onPress={() => {
// //                         setSelectedCustomer(null);
// //                         setCashAmount("");
// //                         setChangeAmount(0);
// //                         Alert.alert(
// //                           "Customer Cleared",
// //                           "Customer has been removed.",
// //                         );
// //                       }}
// //                     >
// //                       <Text className="text-slate-400 text-center text-sm font-medium">
// //                         Remove Customer
// //                       </Text>
// //                     </TouchableOpacity>
// //                   </View>
// //                 </View>
// //               </View>
// //             </Animated.View>
// //           </View>
// //         </Modal>

// //         <BarcodeScannerModal
// //           visible={showScannerModal}
// //           onClose={() => setShowScannerModal(false)}
// //           onScan={handleScan}
// //         />
// //       </Screen>
// //     </SafeAreaView>
// //   );
// // }

// // // // ============================================
// // // // FILE: app/(tabs)/pos.tsx (Fixed)
// // // // ============================================

// // // import { Card, Header, Pill, Screen } from "@/components/app-ui";
// // // import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";
// // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// // // import {
// // //   addToCart,
// // //   clearCart,
// // //   removeFromCart,
// // //   updateQuantity,
// // // } from "@/services/features/cart/cartSlice";
// // // import {
// // //   useCreateLocalInventoryMovementMutation,
// // //   useCreateLocalOrderMutation,
// // //   useGetActiveSessionQuery,
// // //   useGetLocalBrandsQuery,
// // //   useGetLocalCategoriesQuery,
// // //   useGetLocalCustomersQuery,
// // //   useGetLocalInventoryQuery,
// // //   useGetLocalProductsQuery,
// // // } from "@/services/features/offline/localApi";
// // // import { MaterialIcons } from "@expo/vector-icons";
// // // import { router } from "expo-router";
// // // import React, { useRef, useState } from "react";
// // // import {
// // //   ActivityIndicator,
// // //   Alert,
// // //   Animated,
// // //   Dimensions,
// // //   FlatList,
// // //   Modal,
// // //   ScrollView,
// // //   Text,
// // //   TextInput,
// // //   TouchableOpacity,
// // //   SafeAreaView,
// // //   View,
// // // } from "react-native";

// // // const { height } = Dimensions.get("window");

// // // export default function POSScreen() {
// // //   const dispatch = useAppDispatch();
// // //   const user = useAppSelector((state) => state.auth.user);

// // //   // State
// // //   const [searchQuery, setSearchQuery] = useState("");
// // //   const [showScannerModal, setShowScannerModal] = useState(false);
// // //   const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
// // //     undefined,
// // //   );
// // //   const [selectedBrand, setSelectedBrand] = useState<string | undefined>(
// // //     undefined,
// // //   );
// // //   const [showCartModal, setShowCartModal] = useState(false);
// // //   const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
// // //   const [showCustomerSelect, setShowCustomerSelect] = useState(false);
// // //   const [isSubmitting, setIsSubmitting] = useState(false);
// // //   const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
// // //   const [customerSearch, setCustomerSearch] = useState("");
// // //   const [showFilters, setShowFilters] = useState(false);

// // //   // Animations
// // //   const slideAnim = useRef(new Animated.Value(height)).current;

// // //   // Queries
// // //   const {
// // //     data: productsData,
// // //     isLoading: isProductsLoading,
// // //     refetch,
// // //   } = useGetLocalProductsQuery({
// // //     search: searchQuery,
// // //     categoryId: selectedCategory,
// // //   });

// // //   const { data: categoriesData } = useGetLocalCategoriesQuery();
// // //   const { data: brandsData } = useGetLocalBrandsQuery();
// // //   const { data: customersData } = useGetLocalCustomersQuery({
// // //     search: customerSearch || undefined,
// // //   });
// // //   const { data: activeSession } = useGetActiveSessionQuery({
// // //     userId: user?.id || "",
// // //   });
// // //   const { data: inventoryData } = useGetLocalInventoryQuery({});

// // //   // Mutations
// // //   const [createOrder, { isLoading: isCreatingOrder }] =
// // //     useCreateLocalOrderMutation();
// // //   const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

// // //   // Filter products by brand
// // //   const filteredProducts = React.useMemo(() => {
// // //     let products = productsData || [];
// // //     if (selectedBrand) {
// // //       products = products.filter((p: any) => p.brandId === selectedBrand);
// // //     }
// // //     return products;
// // //   }, [productsData, selectedBrand]);

// // //   // Cart state
// // //   const cartItems = useAppSelector((state) => state.cart.items);
// // //   const cartTotal = cartItems.reduce(
// // //     (total, item) => total + item.price * item.qty,
// // //     0,
// // //   );
// // //   const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
// // //   const cartSubtotal = cartTotal;
// // //   const taxAmount = cartTotal * 0.05;
// // //   const discountAmount = 0;
// // //   const grandTotal = cartSubtotal + taxAmount - discountAmount;

// // //   const hasOutOfStockItems = cartItems.some((item) => {
// // //     const inventory = inventoryData?.find(
// // //       (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
// // //     );
// // //     return inventory && inventory.quantity < item.qty;
// // //   });

// // //   // Handlers
// // //   const handleAddToCart = (product: any) => {
// // //     const inventory = inventoryData?.find(
// // //       (inv: any) => inv.productId === product.id,
// // //     );

// // //     if (inventory && inventory.quantity <= 0) {
// // //       Alert.alert("Out of Stock", `${product.name} is currently out of stock.`);
// // //       return;
// // //     }

// // //     dispatch(
// // //       addToCart({
// // //         id: product.id,
// // //         name: product.name,
// // //         price: product.sellingPrice || product.price || 0,
// // //         qty: 1,
// // //         sku: product.sku,
// // //         barcode: product.barcode,
// // //         stockQuantity: inventory?.quantity || 0,
// // //         brand: product.brand,
// // //         category: product.category,
// // //       }),
// // //     );
// // //   };

// // //   const handleUpdateQuantity = (id: string, qty: number) => {
// // //     if (qty <= 0) {
// // //       dispatch(removeFromCart(id));
// // //     } else {
// // //       dispatch(updateQuantity({ id, qty }));
// // //     }
// // //   };

// // //   const handleRemoveItem = (id: string) => {
// // //     dispatch(removeFromCart(id));
// // //   };

// // //   const handleScan = (data: string) => {
// // //     setShowScannerModal(false);
// // //     const product = productsData?.find(
// // //       (p: any) => p.barcode === data || p.sku === data || p.id === data,
// // //     );
// // //     if (product) {
// // //       handleAddToCart(product);
// // //     } else {
// // //       setSearchQuery(data);
// // //     }
// // //   };

// // //   const openCart = () => {
// // //     if (cartCount === 0) {
// // //       Alert.alert("Cart Empty", "Please add items to the cart first.");
// // //       return;
// // //     }
// // //     setShowCartModal(true);
// // //     Animated.spring(slideAnim, {
// // //       toValue: 0,
// // //       useNativeDriver: true,
// // //       speed: 12,
// // //     }).start();
// // //   };

// // //   const closeCart = () => {
// // //     Animated.spring(slideAnim, {
// // //       toValue: height,
// // //       useNativeDriver: true,
// // //       speed: 12,
// // //     }).start(() => setShowCartModal(false));
// // //   };

// // //   const handleCheckout = async () => {
// // //     if (cartItems.length === 0) {
// // //       Alert.alert("Cart Empty", "Please add items to the cart first.");
// // //       return;
// // //     }

// // //     if (hasOutOfStockItems) {
// // //       Alert.alert(
// // //         "Insufficient Stock",
// // //         "Some items in your cart don't have enough stock. Please adjust quantities.",
// // //       );
// // //       return;
// // //     }

// // //     if (!activeSession) {
// // //       Alert.alert(
// // //         "No Active Session",
// // //         "Please open a session before placing an order.",
// // //         [
// // //           {
// // //             text: "Open Session",
// // //             onPress: () => router.push("/(tabs)/sessions"),
// // //           },
// // //           { text: "Cancel", style: "cancel" },
// // //         ],
// // //       );
// // //       return;
// // //     }

// // //     setIsSubmitting(true);

// // //     try {
// // //       // Log what we're sending for debugging
// // //       console.log("📤 Creating order with payload:", {
// // //         tenantId: user?.tenantId,
// // //         storeId: activeSession.storeId,
// // //         sessionId: activeSession.id,
// // //         userId: user?.id,
// // //         customerId: selectedCustomer?.id,
// // //         paymentMethod: paymentMethod,
// // //         paymentStatus: "PAID",
// // //         subTotal: cartSubtotal,
// // //         taxAmount: taxAmount,
// // //         discountAmount: discountAmount,
// // //         grandTotal: grandTotal,
// // //         paidAmount: grandTotal,
// // //         changeAmount: 0,
// // //         itemsCount: cartItems.length,
// // //       });

// // //       // Build order payload with proper structure
// // //       const orderPayload = {
// // //         tenantId: user?.tenantId || "default",
// // //         storeId: activeSession.storeId,
// // //         sessionId: activeSession.id,
// // //         userId: user?.id || "unknown",
// // //         customerId: selectedCustomer?.id || null,
// // //         paymentMethod: paymentMethod,
// // //         paymentStatus: "PAID",
// // //         subTotal: Number(cartSubtotal.toFixed(2)),
// // //         taxAmount: Number(taxAmount.toFixed(2)),
// // //         discountAmount: Number(discountAmount.toFixed(2)),
// // //         grandTotal: Number(grandTotal.toFixed(2)),
// // //         paidAmount: Number(grandTotal.toFixed(2)),
// // //         changeAmount: 0,
// // //         items: cartItems.map((item) => ({
// // //           productId: item.id,
// // //           quantity: Number(item.qty),
// // //           unitPrice: Number(item.price.toFixed(2)),
// // //           subTotal: Number((item.price * item.qty).toFixed(2)),
// // //           discountAmount: 0,
// // //         })),
// // //       };

// // //       console.log("📤 Order payload:", JSON.stringify(orderPayload, null, 2));

// // //       // Create the order
// // //       const result = await createOrder(orderPayload).unwrap();

// // //       console.log("✅ Order created:", result);

// // //       // Create inventory movements for each item
// // //       for (const item of cartItems) {
// // //         try {
// // //           await createInventoryMovement({
// // //             tenantId: user?.tenantId || "default",
// // //             storeId: activeSession.storeId,
// // //             productId: item.id,
// // //             quantity: Number(item.qty),
// // //             type: "OUT",
// // //             referenceId: result.id,
// // //             referenceType: "ORDER",
// // //             reason: `Order #${result.orderNumber || result.id.slice(-6)}`,
// // //           }).unwrap();
// // //         } catch (movementError) {
// // //           console.error(
// // //             "❌ Failed to create inventory movement:",
// // //             movementError,
// // //           );
// // //           // Don't fail the whole order if inventory movement fails
// // //         }
// // //       }

// // //       dispatch(clearCart());
// // //       setSelectedCustomer(null);
// // //       closeCart();

// // //       // Navigate to receipt
// // //       router.push(`/receipt/${result.id}`);
// // //       refetch();
// // //     } catch (error: any) {
// // //       console.error("❌ Checkout error:", error);

// // //       // Show detailed error message
// // //       let errorMessage = "Failed to create order. Please try again.";
// // //       if (error?.data?.message) {
// // //         errorMessage = error.data.message;
// // //       } else if (error?.message) {
// // //         errorMessage = error.message;
// // //       } else if (typeof error === "string") {
// // //         errorMessage = error;
// // //       }

// // //       Alert.alert("Checkout Failed", errorMessage, [
// // //         {
// // //           text: "Retry",
// // //           onPress: () => {
// // //             // Retry the checkout
// // //             handleCheckout();
// // //           },
// // //         },
// // //         { text: "Cancel", style: "cancel" },
// // //       ]);
// // //     } finally {
// // //       setIsSubmitting(false);
// // //     }
// // //   };

// // //   const renderCartItem = ({ item }: { item: any }) => {
// // //     const inventory = inventoryData?.find(
// // //       (inv: any) => inv.productId === item.id,
// // //     );
// // //     const maxQty = inventory?.quantity || 0;

// // //     return (
// // //       <View className="flex-row items-center py-3 border-b border-white/5">
// // //         <View className="flex-1">
// // //           <Text className="text-white font-bold text-base">{item.name}</Text>
// // //           {item.brand && (
// // //             <Text className="text-sky-300/60 text-[10px] font-medium">
// // //               {item.brand.name}
// // //             </Text>
// // //           )}
// // //           <Text className="text-slate-400 text-xs">
// // //             SKU: {item.sku || "N/A"}
// // //           </Text>
// // //           <Text className="text-sky-300 font-bold text-sm mt-1">
// // //             ${item.price.toFixed(2)}
// // //           </Text>
// // //           {maxQty > 0 && (
// // //             <Text className="text-slate-500 text-[10px]">
// // //               Available: {maxQty}
// // //             </Text>
// // //           )}
// // //         </View>

// // //         <View className="flex-row items-center">
// // //           <TouchableOpacity
// // //             className="bg-white/10 rounded-full w-8 h-8 items-center justify-center"
// // //             onPress={() => handleUpdateQuantity(item.id, item.qty - 1)}
// // //           >
// // //             <MaterialIcons name="remove" size={18} color="#cbd5e1" />
// // //           </TouchableOpacity>

// // //           <Text className="text-white font-bold text-lg w-10 text-center">
// // //             {item.qty}
// // //           </Text>

// // //           <TouchableOpacity
// // //             className={`bg-white/10 rounded-full w-8 h-8 items-center justify-center ${
// // //               item.qty >= maxQty && maxQty > 0 ? "opacity-50" : ""
// // //             }`}
// // //             onPress={() => handleUpdateQuantity(item.id, item.qty + 1)}
// // //             disabled={item.qty >= maxQty && maxQty > 0}
// // //           >
// // //             <MaterialIcons name="add" size={18} color="#cbd5e1" />
// // //           </TouchableOpacity>
// // //         </View>

// // //         <TouchableOpacity
// // //           className="ml-3 bg-red-500/20 p-2 rounded-full"
// // //           onPress={() => handleRemoveItem(item.id)}
// // //         >
// // //           <MaterialIcons name="delete-outline" size={18} color="#f87171" />
// // //         </TouchableOpacity>
// // //       </View>
// // //     );
// // //   };

// // //   const renderProduct = ({ item }: { item: any }) => {
// // //     const inCart = cartItems.find((i) => i.id === item.id);
// // //     const inventory = inventoryData?.find(
// // //       (inv: any) => inv.productId === item.id,
// // //     );
// // //     const isOutOfStock = inventory?.quantity === 0;

// // //     return (
// // //       <TouchableOpacity
// // //         className={`flex-1 m-2 active:scale-95 transition-transform ${
// // //           isOutOfStock ? "opacity-50" : ""
// // //         }`}
// // //         onPress={() => !isOutOfStock && handleAddToCart(item)}
// // //         disabled={isOutOfStock}
// // //       >
// // //         <Card className="flex-1 p-4 bg-slate-900/80">
// // //           {inCart && (
// // //             <View className="absolute top-2 right-2 bg-sky-500 rounded-full w-6 h-6 items-center justify-center z-10">
// // //               <Text className="text-white text-xs font-bold">{inCart.qty}</Text>
// // //             </View>
// // //           )}
// // //           {isOutOfStock && (
// // //             <View className="absolute top-2 left-2 bg-rose-500/80 rounded-full px-2 py-0.5 z-10">
// // //               <Text className="text-white text-[8px] font-bold uppercase">
// // //                 Out of Stock
// // //               </Text>
// // //             </View>
// // //           )}
// // //           <View className="h-28 bg-slate-800/50 rounded-xl mb-3 items-center justify-center border border-white/5">
// // //             <MaterialIcons name="inventory-2" size={36} color="#64748b" />
// // //           </View>
// // //           <Text
// // //             className="text-slate-200 font-bold text-base mb-1"
// // //             numberOfLines={1}
// // //           >
// // //             {item.name}
// // //           </Text>
// // //           {item.brand && (
// // //             <Text
// // //               className="text-sky-300/60 text-[9px] font-medium mb-1"
// // //               numberOfLines={1}
// // //             >
// // //               {item.brand.name}
// // //             </Text>
// // //           )}
// // //           <Text
// // //             className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
// // //             numberOfLines={1}
// // //           >
// // //             SKU: {item.sku}
// // //           </Text>
// // //           <View className="flex-row items-center justify-between mt-auto">
// // //             <Text className="text-white font-black text-lg">
// // //               ${(item.sellingPrice || item.price || 0).toFixed(2)}
// // //             </Text>
// // //             {!isOutOfStock && (
// // //               <View className="bg-sky-500/20 p-2 rounded-full border border-sky-500/20">
// // //                 <MaterialIcons name="add" size={16} color="#7dd3fc" />
// // //               </View>
// // //             )}
// // //           </View>
// // //         </Card>
// // //       </TouchableOpacity>
// // //     );
// // //   };

// // //   return (
// // //     <SafeAreaView className="flex-1 bg-slate-950 pt-2">
// // //       <Screen padded={false}>
// // //         {/* Header Area */}
// // //         <View className="px-5 pt-4 pb-2">
// // //           <Header
// // //             eyebrow="Point of Sale"
// // //             title="New Order"
// // //             subtitle="Ready to take new orders"
// // //           />

// // //           {/* Search Bar */}
// // //           <View className="flex-row items-center bg-white/5 rounded-full px-1 border border-white/10">
// // //             <MaterialIcons name="search" size={22} color="#94a3b8" />
// // //             <TextInput
// // //               className="flex-1 ml-3 text-white text-sm font-medium"
// // //               placeholder="Search products, SKUs..."
// // //               placeholderTextColor="#64748b"
// // //               value={searchQuery}
// // //               onChangeText={setSearchQuery}
// // //             />
// // //             {searchQuery.length > 0 ? (
// // //               <TouchableOpacity
// // //                 onPress={() => setSearchQuery("")}
// // //                 className="bg-white/10 p-1.5 rounded-full"
// // //               >
// // //                 <MaterialIcons name="close" size={14} color="#cbd5e1" />
// // //               </TouchableOpacity>
// // //             ) : (
// // //               <View className="flex-row">
// // //                 <TouchableOpacity
// // //                   onPress={() => setShowFilters(!showFilters)}
// // //                   className="bg-white/10 p-1.5 rounded-full mr-1"
// // //                 >
// // //                   <MaterialIcons
// // //                     name="filter-list"
// // //                     size={16}
// // //                     color={showFilters || selectedBrand ? "#38bdf8" : "#94a3b8"}
// // //                   />
// // //                 </TouchableOpacity>
// // //                 <TouchableOpacity
// // //                   onPress={() => setShowScannerModal(true)}
// // //                   className="bg-sky-500/20 p-1.5 rounded-full border border-sky-500/30"
// // //                 >
// // //                   <MaterialIcons
// // //                     name="qr-code-scanner"
// // //                     size={16}
// // //                     color="#38bdf8"
// // //                   />
// // //                 </TouchableOpacity>
// // //               </View>
// // //             )}
// // //           </View>

// // //           {/* Filters - Brand Filter */}
// // //           {showFilters && brandsData && brandsData.length > 0 && (
// // //             <View className="mt-3">
// // //               <ScrollView
// // //                 horizontal
// // //                 showsHorizontalScrollIndicator={false}
// // //                 contentContainerStyle={{ paddingRight: 20 }}
// // //               >
// // //                 <TouchableOpacity
// // //                   className="mr-2"
// // //                   onPress={() => setSelectedBrand(undefined)}
// // //                 >
// // //                   <Pill
// // //                     label="All Brands"
// // //                     tone={!selectedBrand ? "sky" : "amber"}
// // //                   />
// // //                 </TouchableOpacity>
// // //                 {brandsData.map((brand: any) => (
// // //                   <TouchableOpacity
// // //                     key={brand.id}
// // //                     className="mr-2"
// // //                     onPress={() => setSelectedBrand(brand.id)}
// // //                   >
// // //                     <Pill
// // //                       label={brand.name}
// // //                       tone={selectedBrand === brand.id ? "sky" : "amber"}
// // //                     />
// // //                   </TouchableOpacity>
// // //                 ))}
// // //               </ScrollView>
// // //             </View>
// // //           )}

// // //           {/* Session Status */}
// // //           <View className="mt-2 flex-row items-center">
// // //             <View
// // //               className={`w-2 h-2 rounded-full mr-2 ${
// // //                 activeSession ? "bg-emerald-400" : "bg-rose-400"
// // //               }`}
// // //             />
// // //             <Text className="text-slate-400 text-xs">
// // //               {activeSession
// // //                 ? `Session Active • ${new Date(activeSession.openedAt).toLocaleTimeString()}`
// // //                 : "No Active Session"}
// // //             </Text>
// // //           </View>
// // //         </View>

// // //         {/* Categories Filter */}
// // //         <View className="pl-5 mb-2 mt-3 h-10">
// // //           <ScrollView
// // //             horizontal
// // //             showsHorizontalScrollIndicator={false}
// // //             contentContainerStyle={{ paddingRight: 20 }}
// // //           >
// // //             <TouchableOpacity
// // //               className="mr-2"
// // //               onPress={() => setSelectedCategory(undefined)}
// // //             >
// // //               <Pill
// // //                 label="All Items"
// // //                 tone={!selectedCategory ? "sky" : "amber"}
// // //               />
// // //             </TouchableOpacity>

// // //             {categoriesData?.map((cat: any) => (
// // //               <TouchableOpacity
// // //                 key={cat.id}
// // //                 className="mr-2"
// // //                 onPress={() => setSelectedCategory(cat.id)}
// // //               >
// // //                 <Pill
// // //                   label={cat.name}
// // //                   tone={selectedCategory === cat.id ? "sky" : "amber"}
// // //                 />
// // //               </TouchableOpacity>
// // //             ))}
// // //           </ScrollView>
// // //         </View>

// // //         {/* Products Grid */}
// // //         <FlatList
// // //           data={filteredProducts}
// // //           keyExtractor={(item) => item.id}
// // //           numColumns={2}
// // //           contentContainerStyle={{
// // //             paddingHorizontal: 12,
// // //             paddingBottom: 120,
// // //             paddingTop: 8,
// // //           }}
// // //           renderItem={renderProduct}
// // //           ListEmptyComponent={
// // //             <View className="flex-1 items-center justify-center mt-24">
// // //               <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
// // //                 <MaterialIcons name="inbox" size={32} color="#64748b" />
// // //               </View>
// // //               <Text className="text-white mt-4 text-lg font-bold">
// // //                 No products found
// // //               </Text>
// // //               <Text className="text-slate-500 mt-2 text-sm text-center px-10 leading-5">
// // //                 Try adjusting your search or sync to pull latest items from the
// // //                 server.
// // //               </Text>
// // //             </View>
// // //           }
// // //         />

// // //         {/* Floating Cart Summary */}
// // //         {cartCount > 0 && (
// // //           <View className="absolute bottom-6 left-5 right-5">
// // //             <TouchableOpacity
// // //               className="bg-sky-500 rounded-[24px] flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/20 border border-sky-400"
// // //               activeOpacity={0.9}
// // //               onPress={openCart}
// // //             >
// // //               <View className="flex-row items-center">
// // //                 <View className="bg-white/20 rounded-full w-10 h-10 items-center justify-center border border-white/20">
// // //                   <Text className="text-white font-black text-lg">
// // //                     {cartCount}
// // //                   </Text>
// // //                 </View>
// // //                 <Text className="text-white font-bold text-lg ml-3">
// // //                   View Cart
// // //                 </Text>
// // //               </View>
// // //               <Text className="text-white font-black text-xl">
// // //                 ${cartTotal.toFixed(2)}
// // //               </Text>
// // //             </TouchableOpacity>
// // //           </View>
// // //         )}

// // //         {/* Cart Modal */}
// // //         <Modal
// // //           visible={showCartModal}
// // //           transparent
// // //           animationType="none"
// // //           onRequestClose={closeCart}
// // //         >
// // //           <View className="flex-1 bg-black/70">
// // //             <TouchableOpacity
// // //               className="flex-1"
// // //               activeOpacity={1}
// // //               onPress={closeCart}
// // //             />
// // //             <Animated.View
// // //               style={{
// // //                 transform: [{ translateY: slideAnim }],
// // //               }}
// // //               className="bg-slate-900 rounded-t-3xl max-h-[85%] min-h-[50%]"
// // //             >
// // //               <View className="px-5 pt-5 pb-4">
// // //                 {/* Header */}
// // //                 <View className="flex-row justify-between items-center mb-4">
// // //                   <Text className="text-white font-bold text-xl">
// // //                     Your Cart ({cartCount} items)
// // //                   </Text>
// // //                   <TouchableOpacity onPress={closeCart}>
// // //                     <MaterialIcons name="close" size={24} color="#94a3b8" />
// // //                   </TouchableOpacity>
// // //                 </View>

// // //                 {/* Customer Selection */}
// // //                 <TouchableOpacity
// // //                   className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/10"
// // //                   onPress={() => setShowCustomerSelect(!showCustomerSelect)}
// // //                 >
// // //                   <View className="flex-row items-center">
// // //                     <MaterialIcons
// // //                       name="person-outline"
// // //                       size={20}
// // //                       color="#94a3b8"
// // //                     />
// // //                     <Text className="text-white ml-2">
// // //                       {selectedCustomer
// // //                         ? `${selectedCustomer.name} (${selectedCustomer.code})`
// // //                         : "Select Customer"}
// // //                     </Text>
// // //                   </View>
// // //                   <MaterialIcons
// // //                     name={showCustomerSelect ? "expand-less" : "expand-more"}
// // //                     size={20}
// // //                     color="#94a3b8"
// // //                   />
// // //                 </TouchableOpacity>

// // //                 {showCustomerSelect && (
// // //                   <View className="bg-white/5 rounded-xl p-3 mb-4 max-h-40">
// // //                     <TextInput
// // //                       className="bg-white/10 rounded-lg p-2 text-white text-sm mb-2"
// // //                       placeholder="Search customers..."
// // //                       placeholderTextColor="#64748b"
// // //                       value={customerSearch}
// // //                       onChangeText={setCustomerSearch}
// // //                     />
// // //                     <FlatList
// // //                       data={customersData || []}
// // //                       keyExtractor={(item) => item.id}
// // //                       renderItem={({ item }) => (
// // //                         <TouchableOpacity
// // //                           className="py-2 border-b border-white/5"
// // //                           onPress={() => {
// // //                             setSelectedCustomer(item);
// // //                             setShowCustomerSelect(false);
// // //                             setCustomerSearch("");
// // //                           }}
// // //                         >
// // //                           <Text className="text-white">{item.name}</Text>
// // //                           <Text className="text-slate-400 text-xs">
// // //                             {item.code} • {item.phone || "No phone"}
// // //                           </Text>
// // //                         </TouchableOpacity>
// // //                       )}
// // //                       ListEmptyComponent={
// // //                         <Text className="text-slate-400 text-center py-2">
// // //                           No customers found
// // //                         </Text>
// // //                       }
// // //                     />
// // //                   </View>
// // //                 )}

// // //                 {/* Cart Items */}
// // //                 <FlatList
// // //                   data={cartItems}
// // //                   keyExtractor={(item) => item.id}
// // //                   renderItem={renderCartItem}
// // //                   className="max-h-60"
// // //                   showsVerticalScrollIndicator={false}
// // //                 />

// // //                 {/* Cart Summary */}
// // //                 <View className="mt-4 pt-4 border-t border-white/10">
// // //                   <View className="flex-row justify-between mb-1">
// // //                     <Text className="text-slate-400">Subtotal</Text>
// // //                     <Text className="text-white">
// // //                       ${cartSubtotal.toFixed(2)}
// // //                     </Text>
// // //                   </View>
// // //                   <View className="flex-row justify-between mb-1">
// // //                     <Text className="text-slate-400">Tax (5%)</Text>
// // //                     <Text className="text-white">${taxAmount.toFixed(2)}</Text>
// // //                   </View>
// // //                   <View className="flex-row justify-between mb-1">
// // //                     <Text className="text-slate-400">Discount</Text>
// // //                     <Text className="text-white">
// // //                       -${discountAmount.toFixed(2)}
// // //                     </Text>
// // //                   </View>
// // //                   <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
// // //                     <Text className="text-white font-bold text-lg">Total</Text>
// // //                     <Text className="text-sky-400 font-bold text-lg">
// // //                       ${grandTotal.toFixed(2)}
// // //                     </Text>
// // //                   </View>

// // //                   {/* Payment Method */}
// // //                   <View className="flex-row mt-4 gap-2">
// // //                     {["CASH", "CARD", "DIGITAL"].map((method) => (
// // //                       <TouchableOpacity
// // //                         key={method}
// // //                         className={`flex-1 py-2 rounded-lg ${
// // //                           paymentMethod === method
// // //                             ? "bg-sky-500"
// // //                             : "bg-white/10"
// // //                         }`}
// // //                         onPress={() => setPaymentMethod(method)}
// // //                       >
// // //                         <Text
// // //                           className={`text-center text-sm font-bold ${
// // //                             paymentMethod === method
// // //                               ? "text-white"
// // //                               : "text-slate-400"
// // //                           }`}
// // //                         >
// // //                           {method}
// // //                         </Text>
// // //                       </TouchableOpacity>
// // //                     ))}
// // //                   </View>

// // //                   {hasOutOfStockItems && (
// // //                     <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
// // //                       <Text className="text-rose-400 text-xs font-medium text-center">
// // //                         ⚠️ Some items exceed available stock
// // //                       </Text>
// // //                     </View>
// // //                   )}

// // //                   <TouchableOpacity
// // //                     className={`mt-4 py-4 rounded-xl ${
// // //                       cartItems.length === 0 ||
// // //                       isSubmitting ||
// // //                       hasOutOfStockItems
// // //                         ? "bg-slate-700"
// // //                         : "bg-emerald-500"
// // //                     }`}
// // //                     onPress={handleCheckout}
// // //                     disabled={
// // //                       cartItems.length === 0 ||
// // //                       isSubmitting ||
// // //                       hasOutOfStockItems ||
// // //                       isCreatingOrder
// // //                     }
// // //                   >
// // //                     {isSubmitting || isCreatingOrder ? (
// // //                       <ActivityIndicator color="white" />
// // //                     ) : (
// // //                       <Text className="text-white text-center font-bold text-lg">
// // //                         Complete Order • ${grandTotal.toFixed(2)}
// // //                       </Text>
// // //                     )}
// // //                   </TouchableOpacity>

// // //                   <View className="flex-row mt-3 gap-3">
// // //                     <TouchableOpacity
// // //                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
// // //                       onPress={() => {
// // //                         Alert.alert(
// // //                           "Clear Cart",
// // //                           "Are you sure you want to clear the cart?",
// // //                           [
// // //                             { text: "Cancel", style: "cancel" },
// // //                             {
// // //                               text: "Clear",
// // //                               style: "destructive",
// // //                               onPress: () => dispatch(clearCart()),
// // //                             },
// // //                           ],
// // //                         );
// // //                       }}
// // //                     >
// // //                       <Text className="text-red-400 text-center text-sm font-medium">
// // //                         Clear Cart
// // //                       </Text>
// // //                     </TouchableOpacity>
// // //                     <TouchableOpacity
// // //                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
// // //                       onPress={() => {
// // //                         setSelectedCustomer(null);
// // //                         Alert.alert(
// // //                           "Customer Cleared",
// // //                           "Customer has been removed.",
// // //                         );
// // //                       }}
// // //                     >
// // //                       <Text className="text-slate-400 text-center text-sm font-medium">
// // //                         Remove Customer
// // //                       </Text>
// // //                     </TouchableOpacity>
// // //                   </View>
// // //                 </View>
// // //               </View>
// // //             </Animated.View>
// // //           </View>
// // //         </Modal>

// // //         <BarcodeScannerModal
// // //           visible={showScannerModal}
// // //           onClose={() => setShowScannerModal(false)}
// // //           onScan={handleScan}
// // //         />
// // //       </Screen>
// // //     </SafeAreaView>
// // //   );
// // // }

// // // // import { Card, Header, Pill, Screen } from "@/components/app-ui";
// // // // import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";
// // // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

// // // // import {
// // // //   addToCart,
// // // //   clearCart,
// // // //   removeFromCart,
// // // //   updateQuantity,
// // // // } from "@/services/features/cart/cartSlice";
// // // // import {
// // // //   useCreateLocalInventoryMovementMutation,
// // // //   useCreateLocalOrderMutation,
// // // //   useGetActiveSessionQuery,
// // // //   useGetLocalBrandsQuery,
// // // //   useGetLocalCategoriesQuery,
// // // //   useGetLocalCustomersQuery,
// // // //   useGetLocalInventoryQuery,
// // // //   useGetLocalProductsQuery,
// // // // } from "@/services/features/offline/localApi";
// // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // import { router } from "expo-router";
// // // // import React, { useRef, useState } from "react";
// // // // import {
// // // //   ActivityIndicator,
// // // //   Alert,
// // // //   Animated,
// // // //   Dimensions,
// // // //   FlatList,
// // // //   Modal,
// // // //   ScrollView,
// // // //   Text,
// // // //   TextInput,
// // // //   TouchableOpacity,
// // // //   SafeAreaView,
// // // //   View,
// // // // } from "react-native";
// // // // // import { SafeAreaView } from "react-native-safe-area-context";

// // // // const { height } = Dimensions.get("window");

// // // // export default function POSScreen() {
// // // //   const dispatch = useAppDispatch();
// // // //   const user = useAppSelector((state) => state.auth.user);

// // // //   // State
// // // //   const [searchQuery, setSearchQuery] = useState("");
// // // //   const [showScannerModal, setShowScannerModal] = useState(false);
// // // //   const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
// // // //     undefined,
// // // //   );
// // // //   const [selectedBrand, setSelectedBrand] = useState<string | undefined>( // ✅ ADDED
// // // //     undefined,
// // // //   );
// // // //   const [showCartModal, setShowCartModal] = useState(false);
// // // //   const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
// // // //   const [showCustomerSelect, setShowCustomerSelect] = useState(false);
// // // //   const [isSubmitting, setIsSubmitting] = useState(false);
// // // //   const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
// // // //   const [customerSearch, setCustomerSearch] = useState("");
// // // //   const [showFilters, setShowFilters] = useState(false); // ✅ ADDED

// // // //   // Animations
// // // //   const slideAnim = useRef(new Animated.Value(height)).current;

// // // //   // Queries
// // // //   const {
// // // //     data: productsData,
// // // //     isLoading: isProductsLoading,
// // // //     refetch,
// // // //   } = useGetLocalProductsQuery({
// // // //     search: searchQuery,
// // // //     categoryId: selectedCategory,
// // // //   });

// // // //   const { data: categoriesData } = useGetLocalCategoriesQuery();
// // // //   const { data: brandsData } = useGetLocalBrandsQuery(); // ✅ ADDED
// // // //   const { data: customersData } = useGetLocalCustomersQuery({
// // // //     search: customerSearch || undefined,
// // // //   });
// // // //   const { data: activeSession } = useGetActiveSessionQuery({
// // // //     userId: user?.id || "",
// // // //   });
// // // //   const { data: inventoryData } = useGetLocalInventoryQuery({});

// // // //   // Mutations
// // // //   const [createOrder] = useCreateLocalOrderMutation();
// // // //   const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

// // // //   // Filter products by brand
// // // //   const filteredProducts = React.useMemo(() => {
// // // //     let products = productsData || [];
// // // //     if (selectedBrand) {
// // // //       products = products.filter((p: any) => p.brandId === selectedBrand);
// // // //     }
// // // //     return products;
// // // //   }, [productsData, selectedBrand]);

// // // //   // Cart state
// // // //   const cartItems = useAppSelector((state) => state.cart.items);
// // // //   const cartTotal = cartItems.reduce(
// // // //     (total, item) => total + item.price * item.qty,
// // // //     0,
// // // //   );
// // // //   const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
// // // //   const cartSubtotal = cartTotal;
// // // //   const taxAmount = cartTotal * 0.05;
// // // //   const discountAmount = 0;
// // // //   const grandTotal = cartSubtotal + taxAmount - discountAmount;

// // // //   const hasOutOfStockItems = cartItems.some((item) => {
// // // //     const inventory = inventoryData?.find(
// // // //       (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
// // // //     );
// // // //     return inventory && inventory.quantity < item.qty;
// // // //   });

// // // //   // Handlers
// // // //   const handleAddToCart = (product: any) => {
// // // //     const inventory = inventoryData?.find(
// // // //       (inv: any) => inv.productId === product.id,
// // // //     );

// // // //     if (inventory && inventory.quantity <= 0) {
// // // //       Alert.alert("Out of Stock", `${product.name} is currently out of stock.`);
// // // //       return;
// // // //     }

// // // //     dispatch(
// // // //       addToCart({
// // // //         id: product.id,
// // // //         name: product.name,
// // // //         price: product.sellingPrice,
// // // //         qty: 1,
// // // //         sku: product.sku,
// // // //         barcode: product.barcode,
// // // //         stockQuantity: inventory?.quantity || 0,
// // // //         brand: product.brand, // ✅ ADDED
// // // //         category: product.category, // ✅ ADDED
// // // //       }),
// // // //     );
// // // //   };

// // // //   const handleUpdateQuantity = (id: string, qty: number) => {
// // // //     if (qty <= 0) {
// // // //       dispatch(removeFromCart(id));
// // // //     } else {
// // // //       dispatch(updateQuantity({ id, qty }));
// // // //     }
// // // //   };

// // // //   const handleRemoveItem = (id: string) => {
// // // //     dispatch(removeFromCart(id));
// // // //   };

// // // //   const handleScan = (data: string) => {
// // // //     setShowScannerModal(false);
// // // //     const product = productsData?.find(
// // // //       (p: any) => p.barcode === data || p.sku === data || p.id === data,
// // // //     );
// // // //     if (product) {
// // // //       handleAddToCart(product);
// // // //     } else {
// // // //       setSearchQuery(data);
// // // //     }
// // // //   };

// // // //   const openCart = () => {
// // // //     if (cartCount === 0) {
// // // //       Alert.alert("Cart Empty", "Please add items to the cart first.");
// // // //       return;
// // // //     }
// // // //     setShowCartModal(true);
// // // //     Animated.spring(slideAnim, {
// // // //       toValue: 0,
// // // //       useNativeDriver: true,
// // // //       speed: 12,
// // // //     }).start();
// // // //   };

// // // //   const closeCart = () => {
// // // //     Animated.spring(slideAnim, {
// // // //       toValue: height,
// // // //       useNativeDriver: true,
// // // //       speed: 12,
// // // //     }).start(() => setShowCartModal(false));
// // // //   };

// // // //   const handleCheckout = async () => {
// // // //     if (cartItems.length === 0) {
// // // //       Alert.alert("Cart Empty", "Please add items to the cart first.");
// // // //       return;
// // // //     }

// // // //     if (hasOutOfStockItems) {
// // // //       Alert.alert(
// // // //         "Insufficient Stock",
// // // //         "Some items in your cart don't have enough stock. Please adjust quantities.",
// // // //       );
// // // //       return;
// // // //     }

// // // //     if (!activeSession) {
// // // //       Alert.alert(
// // // //         "No Active Session",
// // // //         "Please open a session before placing an order.",
// // // //         [
// // // //           {
// // // //             text: "Open Session",
// // // //             onPress: () => router.push("/(tabs)/sessions"),
// // // //           },
// // // //           { text: "Cancel", style: "cancel" },
// // // //         ],
// // // //       );
// // // //       return;
// // // //     }

// // // //     setIsSubmitting(true);

// // // //     try {
// // // //       const orderPayload = {
// // // //         tenantId: user?.tenantId,
// // // //         storeId: activeSession.storeId,
// // // //         sessionId: activeSession.id,
// // // //         userId: user?.id,
// // // //         customerId: selectedCustomer?.id,
// // // //         paymentMethod: paymentMethod,
// // // //         paymentStatus: "PAID",
// // // //         subTotal: cartSubtotal,
// // // //         taxAmount: taxAmount,
// // // //         discountAmount: discountAmount,
// // // //         grandTotal: grandTotal,
// // // //         paidAmount: grandTotal,
// // // //         changeAmount: 0,
// // // //         items: cartItems.map((item) => ({
// // // //           productId: item.id,
// // // //           quantity: item.qty,
// // // //           unitPrice: item.price,
// // // //           subTotal: item.price * item.qty,
// // // //           discountAmount: 0,
// // // //         })),
// // // //       };

// // // //       const result = await createOrder(orderPayload).unwrap();

// // // //       for (const item of cartItems) {
// // // //         await createInventoryMovement({
// // // //           tenantId: user?.tenantId,
// // // //           storeId: activeSession.storeId,
// // // //           productId: item.id,
// // // //           quantity: item.qty,
// // // //           type: "OUT",
// // // //           referenceId: result.id,
// // // //           referenceType: "ORDER",
// // // //           reason: `Order #${result.orderNumber || result.id}`,
// // // //         }).unwrap();
// // // //       }

// // // //       dispatch(clearCart());
// // // //       setSelectedCustomer(null);
// // // //       closeCart();

// // // //       router.push(`/receipt/${result.id}`);
// // // //       refetch();
// // // //     } catch (error: any) {
// // // //       Alert.alert(
// // // //         "Checkout Failed",
// // // //         error?.data?.message || "Failed to create order. Please try again.",
// // // //       );
// // // //     } finally {
// // // //       setIsSubmitting(false);
// // // //     }
// // // //   };

// // // //   const renderCartItem = ({ item }: { item: any }) => {
// // // //     const inventory = inventoryData?.find(
// // // //       (inv: any) => inv.productId === item.id,
// // // //     );
// // // //     const maxQty = inventory?.quantity || 0;

// // // //     return (
// // // //       <View className="flex-row items-center py-3 border-b border-white/5">
// // // //         <View className="flex-1">
// // // //           <Text className="text-white font-bold text-base">{item.name}</Text>
// // // //           {item.brand && (
// // // //             <Text className="text-sky-300/60 text-[10px] font-medium">
// // // //               {item.brand.name}
// // // //             </Text>
// // // //           )}
// // // //           <Text className="text-slate-400 text-xs">
// // // //             SKU: {item.sku || "N/A"}
// // // //           </Text>
// // // //           <Text className="text-sky-300 font-bold text-sm mt-1">
// // // //             ${item.price.toFixed(2)}
// // // //           </Text>
// // // //           {maxQty > 0 && (
// // // //             <Text className="text-slate-500 text-[10px]">
// // // //               Available: {maxQty}
// // // //             </Text>
// // // //           )}
// // // //         </View>

// // // //         <View className="flex-row items-center">
// // // //           <TouchableOpacity
// // // //             className="bg-white/10 rounded-full w-8 h-8 items-center justify-center"
// // // //             onPress={() => handleUpdateQuantity(item.id, item.qty - 1)}
// // // //           >
// // // //             <MaterialIcons name="remove" size={18} color="#cbd5e1" />
// // // //           </TouchableOpacity>

// // // //           <Text className="text-white font-bold text-lg w-10 text-center">
// // // //             {item.qty}
// // // //           </Text>

// // // //           <TouchableOpacity
// // // //             className={`bg-white/10 rounded-full w-8 h-8 items-center justify-center ${
// // // //               item.qty >= maxQty && maxQty > 0 ? "opacity-50" : ""
// // // //             }`}
// // // //             onPress={() => handleUpdateQuantity(item.id, item.qty + 1)}
// // // //             disabled={item.qty >= maxQty && maxQty > 0}
// // // //           >
// // // //             <MaterialIcons name="add" size={18} color="#cbd5e1" />
// // // //           </TouchableOpacity>
// // // //         </View>

// // // //         <TouchableOpacity
// // // //           className="ml-3 bg-red-500/20 p-2 rounded-full"
// // // //           onPress={() => handleRemoveItem(item.id)}
// // // //         >
// // // //           <MaterialIcons name="delete-outline" size={18} color="#f87171" />
// // // //         </TouchableOpacity>
// // // //       </View>
// // // //     );
// // // //   };

// // // //   const renderProduct = ({ item }: { item: any }) => {
// // // //     const inCart = cartItems.find((i) => i.id === item.id);
// // // //     const inventory = inventoryData?.find(
// // // //       (inv: any) => inv.productId === item.id,
// // // //     );
// // // //     const isOutOfStock = inventory?.quantity === 0;

// // // //     return (
// // // //       <TouchableOpacity
// // // //         className={`flex-1 m-2 active:scale-95 transition-transform ${
// // // //           isOutOfStock ? "opacity-50" : ""
// // // //         }`}
// // // //         onPress={() => !isOutOfStock && handleAddToCart(item)}
// // // //         disabled={isOutOfStock}
// // // //       >
// // // //         <Card className="flex-1 p-4 bg-slate-900/80">
// // // //           {inCart && (
// // // //             <View className="absolute top-2 right-2 bg-sky-500 rounded-full w-6 h-6 items-center justify-center z-10">
// // // //               <Text className="text-white text-xs font-bold">{inCart.qty}</Text>
// // // //             </View>
// // // //           )}
// // // //           {isOutOfStock && (
// // // //             <View className="absolute top-2 left-2 bg-rose-500/80 rounded-full px-2 py-0.5 z-10">
// // // //               <Text className="text-white text-[8px] font-bold uppercase">
// // // //                 Out of Stock
// // // //               </Text>
// // // //             </View>
// // // //           )}
// // // //           <View className="h-28 bg-slate-800/50 rounded-xl mb-3 items-center justify-center border border-white/5">
// // // //             <MaterialIcons name="inventory-2" size={36} color="#64748b" />
// // // //           </View>
// // // //           <Text
// // // //             className="text-slate-200 font-bold text-base mb-1"
// // // //             numberOfLines={1}
// // // //           >
// // // //             {item.name}
// // // //           </Text>
// // // //           {item.brand && (
// // // //             <Text
// // // //               className="text-sky-300/60 text-[9px] font-medium mb-1"
// // // //               numberOfLines={1}
// // // //             >
// // // //               {item.brand.name}
// // // //             </Text>
// // // //           )}
// // // //           <Text
// // // //             className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
// // // //             numberOfLines={1}
// // // //           >
// // // //             SKU: {item.sku}
// // // //           </Text>
// // // //           <View className="flex-row items-center justify-between mt-auto">
// // // //             <Text className="text-white font-black text-lg">
// // // //               ${item.sellingPrice?.toFixed(2) ?? "0.00"}
// // // //             </Text>
// // // //             {!isOutOfStock && (
// // // //               <View className="bg-sky-500/20 p-2 rounded-full border border-sky-500/20">
// // // //                 <MaterialIcons name="add" size={16} color="#7dd3fc" />
// // // //               </View>
// // // //             )}
// // // //           </View>
// // // //         </Card>
// // // //       </TouchableOpacity>
// // // //     );
// // // //   };

// // // //   return (
// // // //     <SafeAreaView className="flex-1 bg-slate-950 pt-2">
// // // //       <Screen padded={false}>
// // // //         {/* Header Area */}
// // // //         <View className="px-5 pt-4 pb-2">
// // // //           <Header
// // // //             eyebrow="Point of Sale"
// // // //             title="New Order"
// // // //             subtitle="Ready to take new orders"
// // // //           />

// // // //           {/* Search Bar */}
// // // //           <View className="flex-row items-center bg-white/5 rounded-full px-1 border border-white/10">
// // // //             <MaterialIcons name="search" size={22} color="#94a3b8" />
// // // //             <TextInput
// // // //               className="flex-1 ml-3 text-white text-sm font-medium"
// // // //               placeholder="Search products, SKUs..."
// // // //               placeholderTextColor="#64748b"
// // // //               value={searchQuery}
// // // //               onChangeText={setSearchQuery}
// // // //             />
// // // //             {searchQuery.length > 0 ? (
// // // //               <TouchableOpacity
// // // //                 onPress={() => setSearchQuery("")}
// // // //                 className="bg-white/10 p-1.5 rounded-full"
// // // //               >
// // // //                 <MaterialIcons name="close" size={14} color="#cbd5e1" />
// // // //               </TouchableOpacity>
// // // //             ) : (
// // // //               <View className="flex-row">
// // // //                 <TouchableOpacity
// // // //                   onPress={() => setShowFilters(!showFilters)}
// // // //                   className="bg-white/10 p-1.5 rounded-full mr-1"
// // // //                 >
// // // //                   <MaterialIcons
// // // //                     name="filter-list"
// // // //                     size={16}
// // // //                     color={showFilters || selectedBrand ? "#38bdf8" : "#94a3b8"}
// // // //                   />
// // // //                 </TouchableOpacity>
// // // //                 <TouchableOpacity
// // // //                   onPress={() => setShowScannerModal(true)}
// // // //                   className="bg-sky-500/20 p-1.5 rounded-full border border-sky-500/30"
// // // //                 >
// // // //                   <MaterialIcons
// // // //                     name="qr-code-scanner"
// // // //                     size={16}
// // // //                     color="#38bdf8"
// // // //                   />
// // // //                 </TouchableOpacity>
// // // //               </View>
// // // //             )}
// // // //           </View>

// // // //           {/* Filters - Brand Filter */}
// // // //           {showFilters && brandsData && brandsData.length > 0 && (
// // // //             <View className="mt-3">
// // // //               <ScrollView
// // // //                 horizontal
// // // //                 showsHorizontalScrollIndicator={false}
// // // //                 contentContainerStyle={{ paddingRight: 20 }}
// // // //               >
// // // //                 <TouchableOpacity
// // // //                   className="mr-2"
// // // //                   onPress={() => setSelectedBrand(undefined)}
// // // //                 >
// // // //                   <Pill
// // // //                     label="All Brands"
// // // //                     tone={!selectedBrand ? "sky" : "amber"}
// // // //                   />
// // // //                 </TouchableOpacity>
// // // //                 {brandsData.map((brand: any) => (
// // // //                   <TouchableOpacity
// // // //                     key={brand.id}
// // // //                     className="mr-2"
// // // //                     onPress={() => setSelectedBrand(brand.id)}
// // // //                   >
// // // //                     <Pill
// // // //                       label={brand.name}
// // // //                       tone={selectedBrand === brand.id ? "sky" : "amber"}
// // // //                     />
// // // //                   </TouchableOpacity>
// // // //                 ))}
// // // //               </ScrollView>
// // // //             </View>
// // // //           )}

// // // //           {/* Session Status */}
// // // //           <View className="mt-2 flex-row items-center">
// // // //             <View
// // // //               className={`w-2 h-2 rounded-full mr-2 ${
// // // //                 activeSession ? "bg-emerald-400" : "bg-rose-400"
// // // //               }`}
// // // //             />
// // // //             <Text className="text-slate-400 text-xs">
// // // //               {activeSession
// // // //                 ? `Session Active • ${new Date(activeSession.openedAt).toLocaleTimeString()}`
// // // //                 : "No Active Session"}
// // // //             </Text>
// // // //           </View>
// // // //         </View>

// // // //         {/* Categories Filter */}
// // // //         <View className="pl-5 mb-2 mt-3 h-10">
// // // //           <ScrollView
// // // //             horizontal
// // // //             showsHorizontalScrollIndicator={false}
// // // //             contentContainerStyle={{ paddingRight: 20 }}
// // // //           >
// // // //             <TouchableOpacity
// // // //               className="mr-2"
// // // //               onPress={() => setSelectedCategory(undefined)}
// // // //             >
// // // //               <Pill
// // // //                 label="All Items"
// // // //                 tone={!selectedCategory ? "sky" : "amber"}
// // // //               />
// // // //             </TouchableOpacity>

// // // //             {categoriesData?.map((cat: any) => (
// // // //               <TouchableOpacity
// // // //                 key={cat.id}
// // // //                 className="mr-2"
// // // //                 onPress={() => setSelectedCategory(cat.id)}
// // // //               >
// // // //                 <Pill
// // // //                   label={cat.name}
// // // //                   tone={selectedCategory === cat.id ? "sky" : "amber"}
// // // //                 />
// // // //               </TouchableOpacity>
// // // //             ))}
// // // //           </ScrollView>
// // // //         </View>

// // // //         {/* Products Grid */}
// // // //         <FlatList
// // // //           data={filteredProducts}
// // // //           keyExtractor={(item) => item.id}
// // // //           numColumns={2}
// // // //           contentContainerStyle={{
// // // //             paddingHorizontal: 12,
// // // //             paddingBottom: 120,
// // // //             paddingTop: 8,
// // // //           }}
// // // //           renderItem={renderProduct}
// // // //           ListEmptyComponent={
// // // //             <View className="flex-1 items-center justify-center mt-24">
// // // //               <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
// // // //                 <MaterialIcons name="inbox" size={32} color="#64748b" />
// // // //               </View>
// // // //               <Text className="text-white mt-4 text-lg font-bold">
// // // //                 No products found
// // // //               </Text>
// // // //               <Text className="text-slate-500 mt-2 text-sm text-center px-10 leading-5">
// // // //                 Try adjusting your search or sync to pull latest items from the
// // // //                 server.
// // // //               </Text>
// // // //             </View>
// // // //           }
// // // //         />

// // // //         {/* Rest of the component remains the same... */}
// // // //         {/* Floating Cart Summary */}
// // // //         {cartCount > 0 && (
// // // //           <View className="absolute bottom-6 left-5 right-5">
// // // //             <TouchableOpacity
// // // //               className="bg-sky-500 rounded-[24px] flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/20 border border-sky-400"
// // // //               activeOpacity={0.9}
// // // //               onPress={openCart}
// // // //             >
// // // //               <View className="flex-row items-center">
// // // //                 <View className="bg-white/20 rounded-full w-10 h-10 items-center justify-center border border-white/20">
// // // //                   <Text className="text-white font-black text-lg">
// // // //                     {cartCount}
// // // //                   </Text>
// // // //                 </View>
// // // //                 <Text className="text-white font-bold text-lg ml-3">
// // // //                   View Cart
// // // //                 </Text>
// // // //               </View>
// // // //               <Text className="text-white font-black text-xl">
// // // //                 ${cartTotal.toFixed(2)}
// // // //               </Text>
// // // //             </TouchableOpacity>
// // // //           </View>
// // // //         )}

// // // //         {/* Cart Modal - Update to show brand */}
// // // //         <Modal
// // // //           visible={showCartModal}
// // // //           transparent
// // // //           animationType="none"
// // // //           onRequestClose={closeCart}
// // // //         >
// // // //           <View className="flex-1 bg-black/70">
// // // //             <TouchableOpacity
// // // //               className="flex-1"
// // // //               activeOpacity={1}
// // // //               onPress={closeCart}
// // // //             />
// // // //             <Animated.View
// // // //               style={{
// // // //                 transform: [{ translateY: slideAnim }],
// // // //               }}
// // // //               className="bg-slate-900 rounded-t-3xl max-h-[85%] min-h-[50%]"
// // // //             >
// // // //               <View className="px-5 pt-5 pb-4">
// // // //                 {/* Header */}
// // // //                 <View className="flex-row justify-between items-center mb-4">
// // // //                   <Text className="text-white font-bold text-xl">
// // // //                     Your Cart ({cartCount} items)
// // // //                   </Text>
// // // //                   <TouchableOpacity onPress={closeCart}>
// // // //                     <MaterialIcons name="close" size={24} color="#94a3b8" />
// // // //                   </TouchableOpacity>
// // // //                 </View>

// // // //                 {/* Customer Selection */}
// // // //                 <TouchableOpacity
// // // //                   className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/10"
// // // //                   onPress={() => setShowCustomerSelect(!showCustomerSelect)}
// // // //                 >
// // // //                   <View className="flex-row items-center">
// // // //                     <MaterialIcons
// // // //                       name="person-outline"
// // // //                       size={20}
// // // //                       color="#94a3b8"
// // // //                     />
// // // //                     <Text className="text-white ml-2">
// // // //                       {selectedCustomer
// // // //                         ? `${selectedCustomer.name} (${selectedCustomer.code})`
// // // //                         : "Select Customer"}
// // // //                     </Text>
// // // //                   </View>
// // // //                   <MaterialIcons
// // // //                     name={showCustomerSelect ? "expand-less" : "expand-more"}
// // // //                     size={20}
// // // //                     color="#94a3b8"
// // // //                   />
// // // //                 </TouchableOpacity>

// // // //                 {showCustomerSelect && (
// // // //                   <View className="bg-white/5 rounded-xl p-3 mb-4 max-h-40">
// // // //                     <TextInput
// // // //                       className="bg-white/10 rounded-lg p-2 text-white text-sm mb-2"
// // // //                       placeholder="Search customers..."
// // // //                       placeholderTextColor="#64748b"
// // // //                       value={customerSearch}
// // // //                       onChangeText={setCustomerSearch}
// // // //                     />
// // // //                     <FlatList
// // // //                       data={customersData || []}
// // // //                       keyExtractor={(item) => item.id}
// // // //                       renderItem={({ item }) => (
// // // //                         <TouchableOpacity
// // // //                           className="py-2 border-b border-white/5"
// // // //                           onPress={() => {
// // // //                             setSelectedCustomer(item);
// // // //                             setShowCustomerSelect(false);
// // // //                             setCustomerSearch("");
// // // //                           }}
// // // //                         >
// // // //                           <Text className="text-white">{item.name}</Text>
// // // //                           <Text className="text-slate-400 text-xs">
// // // //                             {item.code} • {item.phone || "No phone"}
// // // //                           </Text>
// // // //                         </TouchableOpacity>
// // // //                       )}
// // // //                       ListEmptyComponent={
// // // //                         <Text className="text-slate-400 text-center py-2">
// // // //                           No customers found
// // // //                         </Text>
// // // //                       }
// // // //                     />
// // // //                   </View>
// // // //                 )}

// // // //                 {/* Cart Items with Brand */}
// // // //                 <FlatList
// // // //                   data={cartItems}
// // // //                   keyExtractor={(item) => item.id}
// // // //                   renderItem={renderCartItem}
// // // //                   className="max-h-60"
// // // //                   showsVerticalScrollIndicator={false}
// // // //                 />

// // // //                 {/* Cart Summary */}
// // // //                 <View className="mt-4 pt-4 border-t border-white/10">
// // // //                   <View className="flex-row justify-between mb-1">
// // // //                     <Text className="text-slate-400">Subtotal</Text>
// // // //                     <Text className="text-white">
// // // //                       ${cartSubtotal.toFixed(2)}
// // // //                     </Text>
// // // //                   </View>
// // // //                   <View className="flex-row justify-between mb-1">
// // // //                     <Text className="text-slate-400">Tax (5%)</Text>
// // // //                     <Text className="text-white">${taxAmount.toFixed(2)}</Text>
// // // //                   </View>
// // // //                   <View className="flex-row justify-between mb-1">
// // // //                     <Text className="text-slate-400">Discount</Text>
// // // //                     <Text className="text-white">
// // // //                       -${discountAmount.toFixed(2)}
// // // //                     </Text>
// // // //                   </View>
// // // //                   <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
// // // //                     <Text className="text-white font-bold text-lg">Total</Text>
// // // //                     <Text className="text-sky-400 font-bold text-lg">
// // // //                       ${grandTotal.toFixed(2)}
// // // //                     </Text>
// // // //                   </View>

// // // //                   {/* Payment Method */}
// // // //                   <View className="flex-row mt-4 gap-2">
// // // //                     {["CASH", "CARD", "DIGITAL"].map((method) => (
// // // //                       <TouchableOpacity
// // // //                         key={method}
// // // //                         className={`flex-1 py-2 rounded-lg ${
// // // //                           paymentMethod === method
// // // //                             ? "bg-sky-500"
// // // //                             : "bg-white/10"
// // // //                         }`}
// // // //                         onPress={() => setPaymentMethod(method)}
// // // //                       >
// // // //                         <Text
// // // //                           className={`text-center text-sm font-bold ${
// // // //                             paymentMethod === method
// // // //                               ? "text-white"
// // // //                               : "text-slate-400"
// // // //                           }`}
// // // //                         >
// // // //                           {method}
// // // //                         </Text>
// // // //                       </TouchableOpacity>
// // // //                     ))}
// // // //                   </View>

// // // //                   {hasOutOfStockItems && (
// // // //                     <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
// // // //                       <Text className="text-rose-400 text-xs font-medium text-center">
// // // //                         ⚠️ Some items exceed available stock
// // // //                       </Text>
// // // //                     </View>
// // // //                   )}

// // // //                   <TouchableOpacity
// // // //                     className={`mt-4 py-4 rounded-xl ${
// // // //                       cartItems.length === 0 ||
// // // //                       isSubmitting ||
// // // //                       hasOutOfStockItems
// // // //                         ? "bg-slate-700"
// // // //                         : "bg-emerald-500"
// // // //                     }`}
// // // //                     onPress={handleCheckout}
// // // //                     disabled={
// // // //                       cartItems.length === 0 ||
// // // //                       isSubmitting ||
// // // //                       hasOutOfStockItems
// // // //                     }
// // // //                   >
// // // //                     {isSubmitting ? (
// // // //                       <ActivityIndicator color="white" />
// // // //                     ) : (
// // // //                       <Text className="text-white text-center font-bold text-lg">
// // // //                         Complete Order • ${grandTotal.toFixed(2)}
// // // //                       </Text>
// // // //                     )}
// // // //                   </TouchableOpacity>

// // // //                   <View className="flex-row mt-3 gap-3">
// // // //                     <TouchableOpacity
// // // //                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
// // // //                       onPress={() => {
// // // //                         Alert.alert(
// // // //                           "Clear Cart",
// // // //                           "Are you sure you want to clear the cart?",
// // // //                           [
// // // //                             { text: "Cancel", style: "cancel" },
// // // //                             {
// // // //                               text: "Clear",
// // // //                               style: "destructive",
// // // //                               onPress: () => dispatch(clearCart()),
// // // //                             },
// // // //                           ],
// // // //                         );
// // // //                       }}
// // // //                     >
// // // //                       <Text className="text-red-400 text-center text-sm font-medium">
// // // //                         Clear Cart
// // // //                       </Text>
// // // //                     </TouchableOpacity>
// // // //                     <TouchableOpacity
// // // //                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
// // // //                       onPress={() => {
// // // //                         setSelectedCustomer(null);
// // // //                         Alert.alert(
// // // //                           "Customer Cleared",
// // // //                           "Customer has been removed.",
// // // //                         );
// // // //                       }}
// // // //                     >
// // // //                       <Text className="text-slate-400 text-center text-sm font-medium">
// // // //                         Remove Customer
// // // //                       </Text>
// // // //                     </TouchableOpacity>
// // // //                   </View>
// // // //                 </View>
// // // //               </View>
// // // //             </Animated.View>
// // // //           </View>
// // // //         </Modal>

// // // //         <BarcodeScannerModal
// // // //           visible={showScannerModal}
// // // //           onClose={() => setShowScannerModal(false)}
// // // //           onScan={handleScan}
// // // //         />
// // // //       </Screen>
// // // //     </SafeAreaView>
// // // //   );
// // // // }
