import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useGetLocalInventoryQuery,
  useGetLocalInventoryMovementsQuery,
  useCreateLocalInventoryMovementMutation,
  useAdjustLocalStockMutation,
} from "@/services/features/offline/localApi";
import {
  Screen,
  Header,
  Card,
  MetricCard,
  SectionTitle,
  Pill,
  Divider,
  StatRow,
} from "@/components/app-ui";

type ActiveTab = "stock" | "movements";

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("stock");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Queries
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    refetch: refetchInventory,
  } = useGetLocalInventoryQuery({});

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
    refetch: refetchMovements,
  } = useGetLocalInventoryMovementsQuery({});

  // Mutations
  const [createMovement, { isLoading: isCreatingMovement }] =
    useCreateLocalInventoryMovementMutation();
  const [adjustStock, { isLoading: isAdjusting }] =
    useAdjustLocalStockMutation();

  // Computed values
  const filteredInventory = (inventoryData ?? []).filter((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q)
    );
  });

  const totalProducts = inventoryData?.length ?? 0;
  const lowStockCount =
    inventoryData?.filter((p: any) => p.stockQuantity <= 10).length ?? 0;
  const outOfStockCount =
    inventoryData?.filter((p: any) => p.stockQuantity === 0).length ?? 0;

  // ============================================
  // HANDLERS
  // ============================================

  const handleAdjustStock = useCallback(
    async (newQty: number, reason: string) => {
      if (!selectedProduct) return;
      try {
        await adjustStock({
          productId: selectedProduct.id,
          storeId: selectedProduct.storeId ?? "default",
          newQuantity: newQty,
          reason,
        }).unwrap();
        setShowAdjustModal(false);
        setSelectedProduct(null);
        Alert.alert("Success", "Stock adjusted successfully");
      } catch (err: any) {
        Alert.alert("Error", err?.message ?? "Failed to adjust stock");
      }
    },
    [selectedProduct, adjustStock],
  );

  const handleCreateMovement = useCallback(
    async (payload: {
      productId: string;
      quantity: number;
      type: "IN" | "OUT";
      reason: string;
    }) => {
      try {
        await createMovement({
          storeId: "default",
          productId: payload.productId,
          quantity: payload.quantity,
          type: payload.type,
          referenceId: `manual-${Date.now()}`,
          referenceType: "MANUAL",
          reason: payload.reason,
        }).unwrap();
        setShowMovementModal(false);
        Alert.alert("Success", "Movement recorded successfully");
      } catch (err: any) {
        Alert.alert("Error", err?.message ?? "Failed to create movement");
      }
    },
    [createMovement],
  );

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getStockBadge = (qty: number) => {
    if (qty === 0) return { label: "OUT OF STOCK", tone: "rose" as const };
    if (qty <= 10) return { label: "LOW STOCK", tone: "amber" as const };
    return { label: "IN STOCK", tone: "emerald" as const };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "IN":
        return { name: "arrow-downward" as const, color: "#34d399" };
      case "OUT":
        return { name: "arrow-upward" as const, color: "#f87171" };
      case "ADJUSTMENT":
        return { name: "tune" as const, color: "#fbbf24" };
      case "COUNT":
        return { name: "fact-check" as const, color: "#60a5fa" };
      case "TRANSFER":
        return { name: "swap-horiz" as const, color: "#a78bfa" };
      default:
        return { name: "circle" as const, color: "#94a3b8" };
    }
  };

  const renderStockItem = ({ item }: { item: any }) => {
    const badge = getStockBadge(item.stockQuantity);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSelectedProduct(item);
          setShowAdjustModal(true);
        }}
      >
        <Card className="mb-3">
          <View className="flex-row items-center">
            <View className="h-12 w-12 rounded-2xl bg-white/8 items-center justify-center mr-3 border border-white/5">
              <MaterialIcons name="inventory-2" size={22} color="#94a3b8" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="text-sky-300/80 text-[10px] font-bold uppercase tracking-[2px] mt-0.5">
                {item.sku}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-white font-black text-lg">
                {item.stockQuantity}
              </Text>
              <Pill label={badge.label} tone={badge.tone} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderMovementItem = ({ item }: { item: any }) => {
    const icon = getMovementIcon(item.type);
    return (
      <Card className="mb-3">
        <View className="flex-row items-center">
          <View
            className="h-10 w-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: `${icon.color}20` }}
          >
            <MaterialIcons name={icon.name} size={20} color={icon.color} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold text-sm">
              {item.type} — {item.referenceType}
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              {item.reason ?? "No reason"}
            </Text>
          </View>
          <View className="items-end">
            <Text
              className={`font-black text-base ${
                ["IN", "TRANSFER"].includes(item.type)
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {["IN", "TRANSFER"].includes(item.type) ? "+" : "-"}
              {item.quantity}
            </Text>
            <Text className="text-slate-500 text-[10px] mt-0.5">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen padded={false}>
      <View className="px-5 pt-12 pb-2">
        <Header
          eyebrow="Warehouse"
          title="Inventory"
          subtitle="Track stock levels and movements"
        />
      </View>

      {/* Metrics */}
      <View className="flex-row gap-3 px-5 mb-5">
        <MetricCard
          icon="inventory"
          label="Total"
          value={totalProducts.toString()}
          tone="sky"
        />
        <MetricCard
          icon="warning"
          label="Low Stock"
          value={lowStockCount.toString()}
          tone={lowStockCount > 0 ? "amber" : "emerald"}
        />
        <MetricCard
          icon="remove-shopping-cart"
          label="Out"
          value={outOfStockCount.toString()}
          tone={outOfStockCount > 0 ? "rose" : "emerald"}
        />
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 mb-4">
        <TouchableOpacity className="mr-2" onPress={() => setActiveTab("stock")}>
          <Pill
            label="Stock Levels"
            tone={activeTab === "stock" ? "sky" : "amber"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          className="mr-2"
          onPress={() => setActiveTab("movements")}
        >
          <Pill
            label="Movements"
            tone={activeTab === "movements" ? "sky" : "amber"}
          />
        </TouchableOpacity>
      </View>

      {/* Search (Stock tab only) */}
      {activeTab === "stock" && (
        <View className="px-5 mb-4">
          <View className="flex-row items-center bg-white/5 rounded-[20px] px-4 py-3 border border-white/10">
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput
              className="flex-1 ml-3 text-white text-sm font-medium"
              placeholder="Search by name or SKU..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                className="bg-white/10 p-1 rounded-full"
              >
                <MaterialIcons name="close" size={14} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {activeTab === "stock" ? (
        <FlatList
          data={filteredInventory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          renderItem={renderStockItem}
          ListEmptyComponent={
            <View className="items-center justify-center mt-16">
              <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
                <MaterialIcons name="inventory" size={32} color="#64748b" />
              </View>
              <Text className="text-white mt-4 text-lg font-bold">
                No inventory items
              </Text>
              <Text className="text-slate-500 mt-2 text-sm text-center px-10">
                Sync products from the server or create them locally.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={movementsData ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          renderItem={renderMovementItem}
          ListEmptyComponent={
            <View className="items-center justify-center mt-16">
              <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
                <MaterialIcons name="swap-vert" size={32} color="#64748b" />
              </View>
              <Text className="text-white mt-4 text-lg font-bold">
                No movements yet
              </Text>
              <Text className="text-slate-500 mt-2 text-sm text-center px-10">
                Stock adjustments and movements will appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB — New Movement */}
      <TouchableOpacity
        className="absolute bottom-6 right-5 h-14 w-14 bg-sky-500 rounded-full items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400"
        activeOpacity={0.8}
        onPress={() => setShowMovementModal(true)}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ============================================ */}
      {/* ADJUST STOCK MODAL */}
      {/* ============================================ */}
      <AdjustStockModal
        visible={showAdjustModal}
        product={selectedProduct}
        isLoading={isAdjusting}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleAdjustStock}
      />

      {/* ============================================ */}
      {/* NEW MOVEMENT MODAL */}
      {/* ============================================ */}
      <NewMovementModal
        visible={showMovementModal}
        products={inventoryData ?? []}
        isLoading={isCreatingMovement}
        onClose={() => setShowMovementModal(false)}
        onSubmit={handleCreateMovement}
      />
    </Screen>
  );
}

// ============================================
// ADJUST STOCK MODAL COMPONENT
// ============================================
function AdjustStockModal({
  visible,
  product,
  isLoading,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  product: any;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (qty: number, reason: string) => void;
}) {
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");

  const handleOpen = useCallback(() => {
    setNewQty(product?.stockQuantity?.toString() ?? "0");
    setReason("");
  }, [product]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 rounded-t-[32px] border-t border-white/10 p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white font-black text-xl">
                Adjust Stock
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="bg-white/10 p-2 rounded-full"
              >
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {product && (
              <Card className="mb-5">
                <StatRow label="Product" value={product.name} />
                <Divider />
                <StatRow label="SKU" value={product.sku} />
                <Divider />
                <StatRow
                  label="Current Stock"
                  value={product.stockQuantity?.toString() ?? "0"}
                />
              </Card>
            )}

            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-2 ml-1">
              New Quantity
            </Text>
            <TextInput
              className="bg-white/5 text-white text-lg font-bold rounded-2xl px-4 py-3 border border-white/10 mb-4"
              keyboardType="number-pad"
              value={newQty}
              onChangeText={setNewQty}
              placeholder="0"
              placeholderTextColor="#64748b"
            />

            <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-2 ml-1">
              Reason
            </Text>
            <TextInput
              className="bg-white/5 text-white text-sm rounded-2xl px-4 py-3 border border-white/10 mb-6"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Physical count correction"
              placeholderTextColor="#64748b"
              multiline
            />

            <TouchableOpacity
              className={`bg-sky-500 rounded-2xl py-4 items-center border border-sky-400 ${isLoading ? "opacity-60" : ""}`}
              onPress={() => onSubmit(Number(newQty), reason)}
              disabled={isLoading || !newQty}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  Confirm Adjustment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================
// NEW MOVEMENT MODAL COMPONENT
// ============================================
function NewMovementModal({
  visible,
  products,
  isLoading,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  products: any[];
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    productId: string;
    quantity: number;
    type: "IN" | "OUT";
    reason: string;
  }) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const handleOpen = useCallback(() => {
    setSelectedProductId("");
    setQuantity("");
    setMovementType("IN");
    setReason("");
    setProductSearch("");
  }, []);

  const filteredProducts = products.filter((p: any) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    );
  });

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-900 rounded-t-[32px] border-t border-white/10 p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-white font-black text-xl">
                New Movement
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="bg-white/10 p-2 rounded-full"
              >
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Movement Type */}
              <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                Type
              </Text>
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  className={`flex-1 rounded-2xl py-3 items-center border ${
                    movementType === "IN"
                      ? "bg-emerald-500/20 border-emerald-500/40"
                      : "bg-white/5 border-white/10"
                  }`}
                  onPress={() => setMovementType("IN")}
                >
                  <MaterialIcons
                    name="arrow-downward"
                    size={20}
                    color={movementType === "IN" ? "#34d399" : "#64748b"}
                  />
                  <Text
                    className={`font-bold text-sm mt-1 ${
                      movementType === "IN"
                        ? "text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    Stock In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-2xl py-3 items-center border ${
                    movementType === "OUT"
                      ? "bg-rose-500/20 border-rose-500/40"
                      : "bg-white/5 border-white/10"
                  }`}
                  onPress={() => setMovementType("OUT")}
                >
                  <MaterialIcons
                    name="arrow-upward"
                    size={20}
                    color={movementType === "OUT" ? "#f87171" : "#64748b"}
                  />
                  <Text
                    className={`font-bold text-sm mt-1 ${
                      movementType === "OUT"
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    Stock Out
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Product Search & Selection */}
              <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                Product
              </Text>
              {selectedProduct ? (
                <Card className="mb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white font-bold">
                        {selectedProduct.name}
                      </Text>
                      <Text className="text-sky-300/60 text-xs mt-0.5">
                        {selectedProduct.sku} — Stock:{" "}
                        {selectedProduct.stockQuantity}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedProductId("")}
                      className="bg-white/10 p-1.5 rounded-full"
                    >
                      <MaterialIcons name="close" size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </Card>
              ) : (
                <>
                  <View className="flex-row items-center bg-white/5 rounded-2xl px-4 py-2 border border-white/10 mb-2">
                    <MaterialIcons name="search" size={18} color="#64748b" />
                    <TextInput
                      className="flex-1 ml-2 text-white text-sm"
                      placeholder="Search products..."
                      placeholderTextColor="#64748b"
                      value={productSearch}
                      onChangeText={setProductSearch}
                    />
                  </View>
                  <View className="max-h-40 mb-4">
                    <ScrollView nestedScrollEnabled>
                      {filteredProducts.slice(0, 10).map((p: any) => (
                        <TouchableOpacity
                          key={p.id}
                          className="flex-row items-center py-2.5 px-3 rounded-xl active:bg-white/5"
                          onPress={() => {
                            setSelectedProductId(p.id);
                            setProductSearch("");
                          }}
                        >
                          <MaterialIcons
                            name="inventory-2"
                            size={16}
                            color="#64748b"
                          />
                          <Text className="text-slate-200 font-medium ml-2 flex-1 text-sm">
                            {p.name}
                          </Text>
                          <Text className="text-slate-500 text-xs">
                            Qty: {p.stockQuantity}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {/* Quantity */}
              <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                Quantity
              </Text>
              <TextInput
                className="bg-white/5 text-white text-lg font-bold rounded-2xl px-4 py-3 border border-white/10 mb-4"
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor="#64748b"
              />

              {/* Reason */}
              <Text className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-2 ml-1">
                Reason
              </Text>
              <TextInput
                className="bg-white/5 text-white text-sm rounded-2xl px-4 py-3 border border-white/10 mb-6"
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. New shipment received"
                placeholderTextColor="#64748b"
                multiline
              />

              {/* Submit */}
              <TouchableOpacity
                className={`rounded-2xl py-4 items-center border mb-4 ${
                  movementType === "IN"
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-rose-500 border-rose-400"
                } ${isLoading || !selectedProductId || !quantity ? "opacity-50" : ""}`}
                onPress={() =>
                  onSubmit({
                    productId: selectedProductId,
                    quantity: Number(quantity),
                    type: movementType,
                    reason,
                  })
                }
                disabled={isLoading || !selectedProductId || !quantity}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    {movementType === "IN"
                      ? "Record Stock In"
                      : "Record Stock Out"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
