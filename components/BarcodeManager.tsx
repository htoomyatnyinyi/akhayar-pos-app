import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import { Product } from "@/services/features/products/productTypes";
import {
  generateUniqueEAN13,
  generateLabelSheetHtml,
} from "@/utils/barcodeUtils";

interface BarcodeManagerProps {
  visible: boolean;
  onClose: () => void;
  products: Product[] | undefined;
  onUpdateProduct: (args: {
    id: string;
    data: Partial<Product>;
  }) => Promise<any>;
}

export default function BarcodeManager({
  visible,
  onClose,
  products,
  onUpdateProduct,
}: BarcodeManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<
    Record<string, number>
  >({});
  const [activeTab, setActiveTab] = useState<"overview" | "print">("overview");

  const allProducts = products || [];
  const withBarcode = useMemo(
    () => allProducts.filter((p) => p.barcode && p.barcode.trim() !== ""),
    [allProducts],
  );
  const withoutBarcode = useMemo(
    () => allProducts.filter((p) => !p.barcode || p.barcode.trim() === ""),
    [allProducts],
  );
  const coveragePct =
    allProducts.length > 0
      ? Math.round((withBarcode.length / allProducts.length) * 100)
      : 0;

  // Build a set of existing barcodes for collision detection
  const existingBarcodes = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => {
      if (p.barcode && p.barcode.trim() !== "") {
        set.add(p.barcode.trim());
      }
    });
    return set;
  }, [allProducts]);

  const handleAutoGenerateAll = async () => {
    if (withoutBarcode.length === 0) {
      Alert.alert("All Set", "Every product already has a barcode assigned.");
      return;
    }
    Alert.alert(
      "Auto-Generate Barcodes",
      `This will generate unique EAN-13 barcodes for ${withoutBarcode.length} products. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: async () => {
            setIsGenerating(true);
            let success = 0;
            // Clone the set so we can track newly assigned barcodes within this batch
            const usedBarcodes = new Set(existingBarcodes);
            for (const product of withoutBarcode) {
              try {
                const newBarcode = generateUniqueEAN13(usedBarcodes);
                await onUpdateProduct({
                  id: product.id,
                  data: { barcode: newBarcode },
                });
                usedBarcodes.add(newBarcode);
                success++;
              } catch {
                /* skip failures */
              }
            }
            setIsGenerating(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Complete",
              `Successfully generated barcodes for ${success}/${withoutBarcode.length} products.`,
            );
          },
        },
      ],
    );
  };

  const handleGenerateSingle = async (product: Product) => {
    try {
      const newBarcode = generateUniqueEAN13(existingBarcodes);
      await onUpdateProduct({
        id: product.id,
        data: { barcode: newBarcode },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to assign barcode.");
    }
  };

  const togglePrintSelection = (productId: string) => {
    setSelectedForPrint((prev) => {
      const copy = { ...prev };
      if (copy[productId]) delete copy[productId];
      else copy[productId] = 2; // default 2 labels
      return copy;
    });
  };

  const updateLabelQty = (productId: string, delta: number) => {
    setSelectedForPrint((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const handlePrintLabels = async () => {
    const entries = Object.entries(selectedForPrint);
    if (entries.length === 0) {
      Alert.alert("No Items", "Select products to print labels for.");
      return;
    }
    setIsPrinting(true);
    try {
      const items = entries
        .map(([id, qty]) => {
          const product = allProducts.find((p) => p.id === id);
          return product ? { product, qty } : null;
        })
        .filter(Boolean) as { product: Product; qty: number }[];

      const html = generateLabelSheetHtml(items);
      await Print.printAsync({ html });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Print Error", "Failed to generate label sheet.");
    }
    setIsPrinting(false);
  };

  const selectAllForPrint = () => {
    const all: Record<string, number> = {};
    withBarcode.forEach((p) => {
      all[p.id] = 2;
    });
    setSelectedForPrint(all);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#0b0c10]">
        {/* Header */}
        <View className="px-6 py-6 pt-10 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-1.5 h-8 bg-[#f59e0b] rounded-full mr-3" />
            <Text className="text-xl font-extrabold text-slate-100 tracking-tight">
              Barcode Manager
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="bg-[#1f2232] w-10 h-10 rounded-full items-center justify-center border border-[#2a2e43]"
          >
            <MaterialIcons name="close" size={20} color="#9333ea" />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View className="flex-row px-6 pt-4 pb-2 gap-3">
          <TouchableOpacity
            onPress={() => setActiveTab("overview")}
            className={`flex-1 py-3 rounded-[16px] border items-center ${activeTab === "overview" ? "bg-amber-500/20 border-amber-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
          >
            <Text
              className={`font-bold text-sm ${activeTab === "overview" ? "text-amber-400" : "text-slate-400"}`}
            >
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("print")}
            className={`flex-1 py-3 rounded-[16px] border items-center ${activeTab === "print" ? "bg-amber-500/20 border-amber-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
          >
            <Text
              className={`font-bold text-sm ${activeTab === "print" ? "text-amber-400" : "text-slate-400"}`}
            >
              Print Labels
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "overview" ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {/* Coverage Card */}
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="bg-[#161925] p-6 rounded-[28px] border border-[#2a2e43] mb-6"
            >
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-4">
                Barcode Coverage
              </Text>
              <View className="flex-row items-end justify-between mb-4">
                <Text className="text-5xl font-extrabold text-slate-100">
                  {coveragePct}%
                </Text>
                <Text className="text-slate-400 font-bold text-xs mb-2">
                  {withBarcode.length}/{allProducts.length} items
                </Text>
              </View>
              {/* Progress Bar */}
              <View className="h-3 bg-[#121420] rounded-full border border-[#2a2e43] overflow-hidden">
                <View
                  className={`h-full rounded-full ${coveragePct === 100 ? "bg-emerald-500" : coveragePct >= 70 ? "bg-amber-500" : "bg-rose-500"}`}
                  style={{ width: `${coveragePct}%` }}
                />
              </View>
            </Animated.View>

            {/* Quick Stats */}
            <View className="flex-row gap-4 mb-6">
              <Animated.View
                entering={FadeInDown.duration(400).delay(100)}
                className="flex-1 bg-[#161925] p-5 rounded-[24px] border border-emerald-500/20"
              >
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
                <Text className="text-2xl font-extrabold text-emerald-400 mt-2">
                  {withBarcode.length}
                </Text>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                  Assigned
                </Text>
              </Animated.View>
              <Animated.View
                entering={FadeInDown.duration(400).delay(200)}
                className="flex-1 bg-[#161925] p-5 rounded-[24px] border border-rose-500/20"
              >
                <MaterialIcons name="error" size={24} color="#f43f5e" />
                <Text className="text-2xl font-extrabold text-rose-400 mt-2">
                  {withoutBarcode.length}
                </Text>
                <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                  Missing
                </Text>
              </Animated.View>
            </View>

            {/* Auto-Generate Button */}
            {withoutBarcode.length > 0 && (
              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <TouchableOpacity
                  onPress={handleAutoGenerateAll}
                  disabled={isGenerating}
                  className={`py-5 rounded-[24px] items-center border mb-6 ${isGenerating ? "bg-amber-600/30 border-amber-500/20" : "bg-amber-600 border-amber-400/30"}`}
                >
                  {isGenerating ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator color="#fff" size="small" />
                      <Text className="text-white font-black text-base ml-3">
                        Generating...
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <MaterialIcons
                        name="auto-fix-high"
                        size={20}
                        color="#fff"
                      />
                      <Text className="text-white font-black text-base ml-2">
                        Auto-Generate All ({withoutBarcode.length})
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Missing Barcode List */}
            {withoutBarcode.length > 0 && (
              <View>
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-3 ml-1">
                  Items Without Barcodes
                </Text>
                {withoutBarcode.map((product, idx) => (
                  <Animated.View
                    key={product.id}
                    entering={FadeInDown.duration(300).delay(100 + idx * 50)}
                    className="bg-[#1f2232] p-4 rounded-[20px] border border-[#2a2e43] mb-3 flex-row items-center"
                  >
                    <View className="w-10 h-10 bg-rose-500/10 rounded-[14px] items-center justify-center border border-rose-500/20 mr-3">
                      <MaterialIcons
                        name="qr-code-2"
                        size={20}
                        color="#f43f5e"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-bold text-sm">
                        {product.name}
                      </Text>
                      <Text className="text-slate-500 text-xs font-bold">
                        SKU: {product.sku}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleGenerateSingle(product)}
                      className="bg-amber-500/20 px-4 py-2 rounded-[14px] border border-amber-500/30"
                    >
                      <Text className="text-amber-400 font-black text-xs">
                        Generate
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}

            {withoutBarcode.length === 0 && (
              <Animated.View
                entering={FadeInDown.duration(400)}
                className="items-center py-12 opacity-60"
              >
                <MaterialIcons name="verified" size={48} color="#10b981" />
                <Text className="text-emerald-400 font-bold text-lg mt-3">
                  All Products Covered
                </Text>
                <Text className="text-slate-500 font-medium text-xs mt-1">
                  Every item in your catalog has a barcode.
                </Text>
              </Animated.View>
            )}
          </ScrollView>
        ) : (
          /* PRINT LABELS TAB */
          <View className="flex-1">
            {/* Actions Bar */}
            <View className="flex-row px-6 py-3 gap-3">
              <TouchableOpacity
                onPress={selectAllForPrint}
                className="flex-1 bg-[#1f2232] py-3 rounded-[14px] border border-[#2a2e43] items-center"
              >
                <Text className="text-slate-300 font-bold text-xs">
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedForPrint({})}
                className="flex-1 bg-[#1f2232] py-3 rounded-[14px] border border-[#2a2e43] items-center"
              >
                <Text className="text-slate-300 font-bold text-xs">Clear</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={withBarcode}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
              renderItem={({ item: product }) => {
                const isSelected = !!selectedForPrint[product.id];
                const qty = selectedForPrint[product.id] || 0;
                return (
                  <TouchableOpacity
                    onPress={() => togglePrintSelection(product.id)}
                    activeOpacity={0.7}
                    className={`p-4 rounded-[20px] border mb-3 flex-row items-center ${isSelected ? "bg-amber-500/10 border-amber-500/30" : "bg-[#1f2232] border-[#2a2e43]"}`}
                  >
                    <View
                      className={`w-6 h-6 rounded-lg items-center justify-center mr-3 border ${isSelected ? "bg-amber-500 border-amber-400" : "bg-[#121420] border-[#2a2e43]"}`}
                    >
                      {isSelected && (
                        <MaterialIcons name="check" size={16} color="#fff" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-bold text-sm">
                        {product.name}
                      </Text>
                      <Text className="text-slate-500 text-[10px] font-bold tracking-wider mt-0.5">
                        {product.barcode}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="flex-row items-center bg-[#121420] rounded-[12px] border border-[#2a2e43] p-1">
                        <TouchableOpacity
                          onPress={() => updateLabelQty(product.id, -1)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Text className="text-slate-300 font-black">−</Text>
                        </TouchableOpacity>
                        <Text className="px-2 text-slate-100 font-black text-sm">
                          {qty}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateLabelQty(product.id, 1)}
                          className="w-8 h-8 items-center justify-center"
                        >
                          <Text className="text-slate-300 font-black">+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="items-center py-16 opacity-50">
                  <MaterialIcons
                    name="print-disabled"
                    size={48}
                    color="#64748b"
                  />
                  <Text className="text-slate-400 font-bold mt-3">
                    No barcoded products
                  </Text>
                  <Text className="text-slate-500 text-xs mt-1">
                    Generate barcodes first in the Overview tab.
                  </Text>
                </View>
              }
            />

            {/* Print FAB */}
            {Object.keys(selectedForPrint).length > 0 && (
              <View className="absolute bottom-8 left-6 right-6">
                <TouchableOpacity
                  onPress={handlePrintLabels}
                  disabled={isPrinting}
                  className={`py-5 rounded-[24px] items-center border shadow-2xl ${isPrinting ? "bg-amber-600/50 border-amber-500/20" : "bg-amber-600 border-amber-400/30"}`}
                >
                  {isPrinting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View className="flex-row items-center">
                      <MaterialIcons name="print" size={20} color="#fff" />
                      <Text className="text-white font-black text-base ml-2">
                        Print {Object.keys(selectedForPrint).length} Labels
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
