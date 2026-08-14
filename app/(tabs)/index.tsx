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
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

export default function POSScreen() {
  const dispatch = useAppDispatch();
  const { user, currentStoreId } = useAppSelector((state) => state.auth);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [customerSearch, setCustomerSearch] = useState("");

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
    storeId: currentStoreId || undefined,
  });

  const { data: categoriesData } = useGetLocalCategoriesQuery();
  const { data: customersData } = useGetLocalCustomersQuery({
    search: customerSearch || undefined,
  });
  const { data: activeSession } = useGetActiveSessionQuery({
    userId: user?.id || "",
  });
  const { data: inventoryData } = useGetLocalInventoryQuery({});

  // Mutations
  const [createOrder] = useCreateLocalOrderMutation();
  const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

  // Cart state
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.qty,
    0,
  );
  const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
  const cartSubtotal = cartTotal;
  const taxAmount = cartTotal * 0.05; // 5% tax
  const discountAmount = 0;
  const grandTotal = cartSubtotal + taxAmount - discountAmount;

  // Check if any items are out of stock
  const hasOutOfStockItems = cartItems.some((item) => {
    const inventory = inventoryData?.find(
      (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
    );
    return inventory && inventory.quantity < item.qty;
  });

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
        price: product.sellingPrice,
        qty: 1,
        sku: product.sku,
        barcode: product.barcode,
        stockQuantity: inventory?.quantity || 0,
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
          { text: "Open Session", onPress: () => router.push("/sessions") },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        tenantId: user?.tenantId,
        storeId: activeSession.storeId,
        sessionId: activeSession.id,
        userId: user?.id,
        customerId: selectedCustomer?.id,
        paymentMethod: paymentMethod,
        paymentStatus: "PAID",
        subTotal: cartSubtotal,
        taxAmount: taxAmount,
        discountAmount: discountAmount,
        grandTotal: grandTotal,
        paidAmount: grandTotal,
        changeAmount: 0,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.qty,
          unitPrice: item.price,
          subTotal: item.price * item.qty,
          discountAmount: 0,
        })),
      };

      const result = await createOrder(orderPayload).unwrap();

      for (const item of cartItems) {
        await createInventoryMovement({
          tenantId: user?.tenantId,
          storeId: activeSession.storeId,
          productId: item.id,
          quantity: item.qty,
          type: "OUT",
          referenceId: result.id,
          referenceType: "ORDER",
          reason: `Order #${result.orderNumber || result.id}`,
        }).unwrap();
      }

      dispatch(clearCart());
      setSelectedCustomer(null);
      closeCart();
      router.push(`/receipt/${result.id}`);
      refetch();
    } catch (error: any) {
      Alert.alert(
        "Checkout Failed",
        error?.data?.message || "Failed to create order. Please try again.",
      );
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

  // ✅ Updated renderProduct to show stock quantity
  const renderProduct = ({ item }: { item: any }) => {
    const inCart = cartItems.find((i) => i.id === item.id);
    const inventory = inventoryData?.find(
      (inv: any) => inv.productId === item.id,
    );
    const stockQty = inventory?.quantity ?? 0;
    const isOutOfStock = stockQty === 0;

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
          <Text
            className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
            numberOfLines={1}
          >
            SKU: {item.sku}
          </Text>
          <View className="flex-row items-center justify-between mt-auto">
            <View>
              <Text className="text-white font-black text-lg">
                ${item.sellingPrice?.toFixed(2) ?? "0.00"}
              </Text>
              {/* ✅ Stock label */}
              <Text className="text-slate-400 text-[10px] mt-0.5">
                Stock: {stockQty}
              </Text>
            </View>
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
        <View className="px-5 pt-4 pb-2">
          <Header
            eyebrow="Point of Sale"
            title="New Order"
            subtitle="Ready to take new orders"
          />
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
            )}
          </View>
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

        <FlatList
          data={productsData || []}
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
              style={{ transform: [{ translateY: slideAnim }] }}
              className="bg-slate-900 rounded-t-3xl max-h-[85%] min-h-[50%]"
            >
              <View className="px-5 pt-5 pb-4">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-white font-bold text-xl">
                    Your Cart ({cartCount} items)
                  </Text>
                  <TouchableOpacity onPress={closeCart}>
                    <MaterialIcons name="close" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

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

                <FlatList
                  data={cartItems}
                  keyExtractor={(item) => item.id}
                  renderItem={renderCartItem}
                  className="max-h-60"
                  showsVerticalScrollIndicator={false}
                />

                <View className="mt-4 pt-4 border-t border-white/10">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-slate-400">Subtotal</Text>
                    <Text className="text-white">
                      ${cartSubtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-slate-400">Tax (5%)</Text>
                    <Text className="text-white">${taxAmount.toFixed(2)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-slate-400">Discount</Text>
                    <Text className="text-white">
                      -${discountAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
                    <Text className="text-white font-bold text-lg">Total</Text>
                    <Text className="text-sky-400 font-bold text-lg">
                      ${grandTotal.toFixed(2)}
                    </Text>
                  </View>

                  <View className="flex-row mt-4 gap-2">
                    {["CASH", "CARD", "DIGITAL"].map((method) => (
                      <TouchableOpacity
                        key={method}
                        className={`flex-1 py-2 rounded-lg ${
                          paymentMethod === method
                            ? "bg-sky-500"
                            : "bg-white/10"
                        }`}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Text
                          className={`text-center text-sm font-bold ${
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

                  {hasOutOfStockItems && (
                    <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
                      <Text className="text-rose-400 text-xs font-medium text-center">
                        ⚠️ Some items exceed available stock
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    className={`mt-4 py-4 rounded-xl ${
                      cartItems.length === 0 ||
                      isSubmitting ||
                      hasOutOfStockItems
                        ? "bg-slate-700"
                        : "bg-emerald-500"
                    }`}
                    onPress={handleCheckout}
                    disabled={
                      cartItems.length === 0 ||
                      isSubmitting ||
                      hasOutOfStockItems
                    }
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-center font-bold text-lg">
                        Complete Order • ${grandTotal.toFixed(2)}
                      </Text>
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
                              onPress: () => dispatch(clearCart()),
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
//   SafeAreaView,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";

// const { height } = Dimensions.get("window");

// export default function POSScreen() {
//   const dispatch = useAppDispatch();
//   const user = useAppSelector((state) => state.auth.user);

//   // State
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showScannerModal, setShowScannerModal] = useState(false);
//   const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
//     undefined,
//   );
//   const [showCartModal, setShowCartModal] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
//   const [showCustomerSelect, setShowCustomerSelect] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
//   const [customerSearch, setCustomerSearch] = useState("");

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
//   const { data: customersData } = useGetLocalCustomersQuery({
//     search: customerSearch || undefined,
//   });
//   const { data: activeSession } = useGetActiveSessionQuery({
//     userId: user?.id || "",
//   });
//   const { data: inventoryData } = useGetLocalInventoryQuery({});

//   // Mutations
//   const [createOrder] = useCreateLocalOrderMutation();
//   const [createInventoryMovement] = useCreateLocalInventoryMovementMutation();

//   // Cart state
//   const cartItems = useAppSelector((state) => state.cart.items);
//   const cartTotal = cartItems.reduce(
//     (total, item) => total + item.price * item.qty,
//     0,
//   );
//   const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
//   const cartSubtotal = cartTotal;
//   const taxAmount = cartTotal * 0.05; // 5% tax
//   const discountAmount = 0;
//   const grandTotal = cartSubtotal + taxAmount - discountAmount;

//   // Check if any items are out of stock
//   const hasOutOfStockItems = cartItems.some((item) => {
//     const inventory = inventoryData?.find(
//       (inv: any) => inv.productId === item.id && inv.quantity < item.qty,
//     );
//     return inventory && inventory.quantity < item.qty;
//   });

//   // Handlers
//   const handleAddToCart = (product: any) => {
//     // Check if product has inventory
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
//         price: product.sellingPrice,
//         qty: 1,
//         sku: product.sku,
//         barcode: product.barcode,
//         stockQuantity: inventory?.quantity || 0,
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
//           { text: "Open Session", onPress: () => router.push("/sessions") },
//           // { text: "Open Session", onPress: () => router.push("/sessions") },
//           { text: "Cancel", style: "cancel" },
//         ],
//       );
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const orderPayload = {
//         tenantId: user?.tenantId,
//         storeId: activeSession.storeId,
//         sessionId: activeSession.id,
//         userId: user?.id,
//         customerId: selectedCustomer?.id,
//         paymentMethod: paymentMethod,
//         paymentStatus: "PAID",
//         subTotal: cartSubtotal,
//         taxAmount: taxAmount,
//         discountAmount: discountAmount,
//         grandTotal: grandTotal,
//         paidAmount: grandTotal,
//         changeAmount: 0,
//         items: cartItems.map((item) => ({
//           productId: item.id,
//           quantity: item.qty,
//           unitPrice: item.price,
//           subTotal: item.price * item.qty,
//           discountAmount: 0,
//         })),
//       };

//       const result = await createOrder(orderPayload).unwrap();

//       // Create inventory movements for each item
//       for (const item of cartItems) {
//         await createInventoryMovement({
//           tenantId: user?.tenantId,
//           storeId: activeSession.storeId,
//           productId: item.id,
//           quantity: item.qty,
//           type: "OUT",
//           referenceId: result.id,
//           referenceType: "ORDER",
//           reason: `Order #${result.orderNumber || result.id}`,
//         }).unwrap();
//       }

//       dispatch(clearCart());
//       setSelectedCustomer(null);
//       closeCart();

//       router.push(`/receipt/${result.id}`);
//       refetch();
//     } catch (error: any) {
//       Alert.alert(
//         "Checkout Failed",
//         error?.data?.message || "Failed to create order. Please try again.",
//       );
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
//           <Text
//             className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mb-3"
//             numberOfLines={1}
//           >
//             SKU: {item.sku}
//           </Text>
//           <View className="flex-row items-center justify-between mt-auto">
//             <Text className="text-white font-black text-lg">
//               ${item.sellingPrice?.toFixed(2) ?? "0.00"}
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
//               <TouchableOpacity
//                 onPress={() => setShowScannerModal(true)}
//                 className="bg-sky-500/20 p-1.5 rounded-full border border-sky-500/30"
//               >
//                 <MaterialIcons
//                   name="qr-code-scanner"
//                   size={16}
//                   color="#38bdf8"
//                 />
//               </TouchableOpacity>
//             )}
//           </View>

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
//           data={productsData || []}
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
//               <View className="px-5 pt-5 pb-4">
//                 {/* Header */}
//                 <View className="flex-row justify-between items-center mb-4">
//                   <Text className="text-white font-bold text-xl">
//                     Your Cart ({cartCount} items)
//                   </Text>
//                   <TouchableOpacity onPress={closeCart}>
//                     <MaterialIcons name="close" size={24} color="#94a3b8" />
//                   </TouchableOpacity>
//                 </View>

//                 {/* Customer Selection */}
//                 <TouchableOpacity
//                   className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-4 border border-white/10"
//                   onPress={() => setShowCustomerSelect(!showCustomerSelect)}
//                 >
//                   <View className="flex-row items-center">
//                     <MaterialIcons
//                       name="person-outline"
//                       size={20}
//                       color="#94a3b8"
//                     />
//                     <Text className="text-white ml-2">
//                       {selectedCustomer
//                         ? `${selectedCustomer.name} (${selectedCustomer.code})`
//                         : "Select Customer"}
//                     </Text>
//                   </View>
//                   <MaterialIcons
//                     name={showCustomerSelect ? "expand-less" : "expand-more"}
//                     size={20}
//                     color="#94a3b8"
//                   />
//                 </TouchableOpacity>

//                 {showCustomerSelect && (
//                   <View className="bg-white/5 rounded-xl p-3 mb-4 max-h-40">
//                     <TextInput
//                       className="bg-white/10 rounded-lg p-2 text-white text-sm mb-2"
//                       placeholder="Search customers..."
//                       placeholderTextColor="#64748b"
//                       value={customerSearch}
//                       onChangeText={setCustomerSearch}
//                     />
//                     <FlatList
//                       data={customersData || []}
//                       keyExtractor={(item) => item.id}
//                       renderItem={({ item }) => (
//                         <TouchableOpacity
//                           className="py-2 border-b border-white/5"
//                           onPress={() => {
//                             setSelectedCustomer(item);
//                             setShowCustomerSelect(false);
//                             setCustomerSearch("");
//                           }}
//                         >
//                           <Text className="text-white">{item.name}</Text>
//                           <Text className="text-slate-400 text-xs">
//                             {item.code} • {item.phone || "No phone"}
//                           </Text>
//                         </TouchableOpacity>
//                       )}
//                       ListEmptyComponent={
//                         <Text className="text-slate-400 text-center py-2">
//                           No customers found
//                         </Text>
//                       }
//                     />
//                   </View>
//                 )}

//                 {/* Cart Items */}
//                 <FlatList
//                   data={cartItems}
//                   keyExtractor={(item) => item.id}
//                   renderItem={renderCartItem}
//                   className="max-h-60"
//                   showsVerticalScrollIndicator={false}
//                 />

//                 {/* Cart Summary */}
//                 <View className="mt-4 pt-4 border-t border-white/10">
//                   <View className="flex-row justify-between mb-1">
//                     <Text className="text-slate-400">Subtotal</Text>
//                     <Text className="text-white">
//                       ${cartSubtotal.toFixed(2)}
//                     </Text>
//                   </View>
//                   <View className="flex-row justify-between mb-1">
//                     <Text className="text-slate-400">Tax (5%)</Text>
//                     <Text className="text-white">${taxAmount.toFixed(2)}</Text>
//                   </View>
//                   <View className="flex-row justify-between mb-1">
//                     <Text className="text-slate-400">Discount</Text>
//                     <Text className="text-white">
//                       -${discountAmount.toFixed(2)}
//                     </Text>
//                   </View>
//                   <View className="flex-row justify-between mt-2 pt-2 border-t border-white/20">
//                     <Text className="text-white font-bold text-lg">Total</Text>
//                     <Text className="text-sky-400 font-bold text-lg">
//                       ${grandTotal.toFixed(2)}
//                     </Text>
//                   </View>

//                   {/* Payment Method */}
//                   <View className="flex-row mt-4 gap-2">
//                     {["CASH", "CARD", "DIGITAL"].map((method) => (
//                       <TouchableOpacity
//                         key={method}
//                         className={`flex-1 py-2 rounded-lg ${
//                           paymentMethod === method
//                             ? "bg-sky-500"
//                             : "bg-white/10"
//                         }`}
//                         onPress={() => setPaymentMethod(method)}
//                       >
//                         <Text
//                           className={`text-center text-sm font-bold ${
//                             paymentMethod === method
//                               ? "text-white"
//                               : "text-slate-400"
//                           }`}
//                         >
//                           {method}
//                         </Text>
//                       </TouchableOpacity>
//                     ))}
//                   </View>

//                   {/* Warning for out of stock */}
//                   {hasOutOfStockItems && (
//                     <View className="mt-3 bg-rose-500/20 p-3 rounded-xl border border-rose-500/30">
//                       <Text className="text-rose-400 text-xs font-medium text-center">
//                         ⚠️ Some items exceed available stock
//                       </Text>
//                     </View>
//                   )}

//                   {/* Checkout Button */}
//                   <TouchableOpacity
//                     className={`mt-4 py-4 rounded-xl ${
//                       cartItems.length === 0 ||
//                       isSubmitting ||
//                       hasOutOfStockItems
//                         ? "bg-slate-700"
//                         : "bg-emerald-500"
//                     }`}
//                     onPress={handleCheckout}
//                     disabled={
//                       cartItems.length === 0 ||
//                       isSubmitting ||
//                       hasOutOfStockItems
//                     }
//                   >
//                     {isSubmitting ? (
//                       <ActivityIndicator color="white" />
//                     ) : (
//                       <Text className="text-white text-center font-bold text-lg">
//                         Complete Order • ${grandTotal.toFixed(2)}
//                       </Text>
//                     )}
//                   </TouchableOpacity>

//                   <View className="flex-row mt-3 gap-3">
//                     <TouchableOpacity
//                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
//                       onPress={() => {
//                         Alert.alert(
//                           "Clear Cart",
//                           "Are you sure you want to clear the cart?",
//                           [
//                             { text: "Cancel", style: "cancel" },
//                             {
//                               text: "Clear",
//                               style: "destructive",
//                               onPress: () => dispatch(clearCart()),
//                             },
//                           ],
//                         );
//                       }}
//                     >
//                       <Text className="text-red-400 text-center text-sm font-medium">
//                         Clear Cart
//                       </Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       className="flex-1 py-2 bg-white/5 rounded-xl border border-white/10"
//                       onPress={() => {
//                         setSelectedCustomer(null);
//                         Alert.alert(
//                           "Customer Cleared",
//                           "Customer has been removed.",
//                         );
//                       }}
//                     >
//                       <Text className="text-slate-400 text-center text-sm font-medium">
//                         Remove Customer
//                       </Text>
//                     </TouchableOpacity>
//                   </View>
//                 </View>
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
