import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
} from "react-native";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "@/services/features/products/productApi";
import { useGetCategoriesQuery } from "@/services/features/categories/categoryApi";
import { SafeAreaView } from "react-native-safe-area-context";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import QRCode from "react-native-qrcode-svg";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import BarcodeManager from "@/components/BarcodeManager";
import { BarcodeView } from "@/utils/barcodeUtils";

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

const parseCSV = (text: string): string[][] => {
  let cleanText = text;
  if (cleanText.startsWith("\uFEFF")) {
    cleanText = cleanText.substring(1);
  }
  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push("");
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
};

export default function InventoryScreen() {
  const user = useAppSelector((state: any) => state.auth.user);
  const role = user?.role || "CASHIER";
  const canEdit = role === "ADMIN" || role === "MANAGER";

  const currentStoreId = useAppSelector(
    (state: any) => state.auth.currentStoreId,
  );
  const {
    data: products,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetProductsQuery(currentStoreId || undefined);
  const { data: categories } = useGetCategoriesQuery(
    currentStoreId || undefined,
  );
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const qrRef = React.useRef<any>(null);

  // New features state
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [qrProduct, setQrProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBarcodeManagerVisible, setIsBarcodeManagerVisible] = useState(false);

  // CSV Import States
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    logs: {
      name: string;
      sku: string;
      status: "SUCCESS" | "FAILED";
      error?: string;
    }[];
  } | null>(null);
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setBarcode(editingProduct.barcode || "");
      setDescription(editingProduct.description || "");
      setBrand(editingProduct.brand || "");
      setSellingPrice(editingProduct.sellingPrice.toString());
      setCostPrice(editingProduct.costPrice.toString());
      setStockQuantity(editingProduct.stockQuantity.toString());
      setCategoryId(editingProduct.categoryId);
      setNewCategoryName("");
    } else {
      resetForm();
    }
  }, [editingProduct]);

  useEffect(() => {
    if (!editingProduct && categories && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  const resetForm = () => {
    setName("");
    setSku("");
    setBarcode("");
    setDescription("");
    setBrand("");
    setSellingPrice("");
    setCostPrice("");
    setStockQuantity("");
    setCategoryId(categories?.[0]?.id || "");
    setNewCategoryName("");
  };

  const handleSave = async () => {
    if (!name || !sku || !sellingPrice || !costPrice || !stockQuantity) {
      Alert.alert("Error", "Required fields missing");
      return;
    }

    const finalCategoryId = newCategoryName
      ? undefined
      : categoryId || categories?.[0]?.id;
    if (!finalCategoryId && !newCategoryName) {
      Alert.alert("Error", "Please select a category or create a new one");
      return;
    }

    const payload = {
      name,
      sku,
      barcode: barcode.trim() !== "" ? barcode.trim() : undefined,
      description: description.trim() !== "" ? description.trim() : undefined,
      brand: brand.trim() !== "" ? brand.trim() : undefined,
      sellingPrice: parseFloat(sellingPrice),
      costPrice: parseFloat(costPrice),
      stockQuantity: parseInt(stockQuantity),
      categoryId: finalCategoryId,
      categoryName:
        newCategoryName.trim() !== "" ? newCategoryName.trim() : undefined,
      storeId: currentStoreId || undefined,
    };
    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct.id, data: payload }).unwrap();
      } else {
        await createProduct(payload).unwrap();
      }
      setIsModalVisible(false);
      setEditingProduct(null);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err?.data?.error || err?.message || "Save failed");
    }
  };

  const handleExport = async () => {
    if (!products || products.length === 0) {
      Alert.alert("Export Error", "No products to export.");
      return;
    }
    try {
      const csvHeader =
        "\uFEFFName,SKU,Barcode,Category,Stock,Cost Price,Selling Price,Brand,Description\n";
      const csvRows = products
        .map((p) => {
          const escapeCsvVal = (val: any) => {
            if (val === undefined || val === null) return '""';
            const str = String(val);
            const escaped = str.replace(/"/g, '""');
            return `"${escaped}"`;
          };
          return [
            escapeCsvVal(p.name),
            escapeCsvVal(p.sku),
            escapeCsvVal(p.barcode || ""),
            escapeCsvVal(p.category?.name || ""),
            escapeCsvVal(p.stockQuantity),
            escapeCsvVal(p.costPrice),
            escapeCsvVal(p.sellingPrice),
            escapeCsvVal(p.brand || ""),
            escapeCsvVal(p.description || ""),
          ].join(",");
        })
        .join("\n");

      const csvString = csvHeader + csvRows;
      const fileName = `inventory_export_${Date.now()}.csv`;
      // @ts-ignore
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvString, {
        encoding: "utf8",
      });

      await Sharing.shareAsync(filePath, {
        mimeType: "text/csv",
        dialogTitle: "Save Inventory Export",
        UTI: "public.comma-separated-values-text",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Export Failed", error?.message || String(error));
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/comma-separated-values", "text/csv"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsImporting(true);
      setImportProgress(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const uri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: "utf8",
      });

      const parsed = parseCSV(fileContent);
      if (parsed.length < 2) {
        Alert.alert(
          "Error",
          "The selected file is empty or missing a header row.",
        );
        setIsImporting(false);
        return;
      }

      // Read headers and normalize
      const headers = parsed[0].map((h) => h.trim().toLowerCase());

      const idxName = headers.findIndex((h) => h.includes("name"));
      const idxSku = headers.findIndex((h) => h.includes("sku"));
      const idxCost = headers.findIndex(
        (h) =>
          h.includes("cost") || h.includes("buy") || h.includes("wholesale"),
      );
      const idxSelling = headers.findIndex(
        (h) =>
          h.includes("selling") ||
          h === "price" ||
          (h.includes("price") && !h.includes("cost") && !h.includes("buy")),
      );
      const idxStock = headers.findIndex(
        (h) =>
          h.includes("stock") || h.includes("quantity") || h.includes("qty"),
      );
      const idxBarcode = headers.findIndex((h) => h.includes("barcode"));
      const idxCategory = headers.findIndex(
        (h) =>
          h.includes("category") || h.includes("dept") || h.includes("group"),
      );
      const idxBrand = headers.findIndex((h) => h.includes("brand"));
      const idxDesc = headers.findIndex(
        (h) => h.includes("description") || h.includes("desc"),
      );

      if (idxName === -1 || idxSku === -1) {
        Alert.alert(
          "Import Format Error",
          "Required headers 'Name' and 'SKU' were not found in the CSV. Please ensure your headers match.",
        );
        setIsImporting(false);
        return;
      }

      const rows = parsed
        .slice(1)
        .filter(
          (row) => row.length > 0 && row.some((cell) => cell.trim() !== ""),
        );
      const totalRows = rows.length;

      if (totalRows === 0) {
        Alert.alert("Error", "No valid data rows found in the CSV file.");
        setIsImporting(false);
        return;
      }

      let success = 0;
      let failed = 0;
      const logs: {
        name: string;
        sku: string;
        status: "SUCCESS" | "FAILED";
        error?: string;
      }[] = [];

      for (let i = 0; i < totalRows; i++) {
        const row = rows[i];
        const rowName =
          idxName !== -1 && row[idxName] ? row[idxName].trim() : "";
        const rowSku = idxSku !== -1 && row[idxSku] ? row[idxSku].trim() : "";

        if (!rowName || !rowSku) {
          failed++;
          logs.push({
            name: rowName || "Unknown Item",
            sku: rowSku || "N/A",
            status: "FAILED",
            error: "Missing required Name or SKU value",
          });
          setImportProgress(Math.round(((i + 1) / totalRows) * 100));
          continue;
        }

        const barcode =
          idxBarcode !== -1 && row[idxBarcode]
            ? row[idxBarcode].trim()
            : undefined;
        const brand =
          idxBrand !== -1 && row[idxBrand] ? row[idxBrand].trim() : undefined;
        const description =
          idxDesc !== -1 && row[idxDesc] ? row[idxDesc].trim() : undefined;
        const categoryName =
          idxCategory !== -1 && row[idxCategory]
            ? row[idxCategory].trim()
            : undefined;

        const costPrice =
          idxCost !== -1 && row[idxCost]
            ? parseFloat(row[idxCost].replace(/[^\d.]/g, ""))
            : 0;
        const sellingPrice =
          idxSelling !== -1 && row[idxSelling]
            ? parseFloat(row[idxSelling].replace(/[^\d.]/g, ""))
            : 0;
        const stockQuantity =
          idxStock !== -1 && row[idxStock]
            ? parseInt(row[idxStock].replace(/[^\d]/g, ""), 10)
            : 0;

        if (isNaN(costPrice) || isNaN(sellingPrice) || isNaN(stockQuantity)) {
          failed++;
          logs.push({
            name: rowName,
            sku: rowSku,
            status: "FAILED",
            error: "Prices or Stock must be valid numeric values",
          });
          setImportProgress(Math.round(((i + 1) / totalRows) * 100));
          continue;
        }

        try {
          // Resolve category ID locally if it matches categories from RTK query
          let matchedCatId: string | undefined = undefined;
          if (categoryName && categories) {
            const found = categories.find(
              (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
            );
            if (found) {
              matchedCatId = found.id;
            }
          }

          const payload = {
            name: rowName,
            sku: rowSku,
            barcode: barcode || undefined,
            brand: brand || undefined,
            description: description || undefined,
            costPrice,
            sellingPrice,
            stockQuantity,
            categoryId: matchedCatId,
            categoryName: !matchedCatId ? categoryName : undefined,
            storeId: currentStoreId || undefined,
          };

          await createProduct(payload).unwrap();
          success++;
          logs.push({
            name: rowName,
            sku: rowSku,
            status: "SUCCESS",
          });
        } catch (err: any) {
          failed++;
          logs.push({
            name: rowName,
            sku: rowSku,
            status: "FAILED",
            error:
              err?.data?.error ||
              err?.message ||
              "Internal error during product creation",
          });
        }

        setImportProgress(Math.round(((i + 1) / totalRows) * 100));
      }

      setImportSummary({
        total: totalRows,
        success,
        failed,
        logs,
      });

      setIsImporting(false);
      setIsSummaryVisible(true);
      refetch();
      Haptics.notificationAsync(
        failed === 0
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch (error: any) {
      setIsImporting(false);
      Alert.alert(
        "Import Failed",
        error?.message || "An unexpected error occurred during import.",
      );
    }
  };

  const shareQRCode = () => {
    if (qrRef.current) {
      qrRef.current.toDataURL(async (data: string) => {
        try {
          if (!data) {
            Alert.alert("Error", "QR code data is empty. Please try again.");
            return;
          }
          const safeName = qrProduct.name
            .replace(/[^a-z0-9]/gi, "_")
            .toLowerCase();
          // @ts-ignore
          const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
          const filePath = `${dir}${safeName}_qr.png`;

          await FileSystem.writeAsStringAsync(filePath, data, {
            encoding: "base64",
          });
          await Sharing.shareAsync(filePath, {
            dialogTitle: `Share ${qrProduct.name} QR Code`,
          });
        } catch (err: any) {
          console.error("QR Share Error:", err);
          Alert.alert(
            "Sharing Failed",
            err.message || "Failed to generate or share the image.",
          );
        }
      });
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
      {/* Header */}
      <View className="px-6 py-5 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center z-10">
        <View className="flex-row items-center">
          <View className="w-1.5 h-9 bg-[#38bdf8] rounded-full mr-3.5 shadow-lg shadow-[#38bdf8]/50" />
          <View>
            <Text className="text-2xl font-black text-slate-100 tracking-tight">
              Catalog
            </Text>
            <Text className="text-[9px] font-black text-sky-400 tracking-[3px] uppercase mt-0.5">
              Inventory Control
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => setIsBarcodeManagerVisible(true)}
            className="bg-amber-500/10 px-3.5 py-3 rounded-[16px] border border-amber-500/20"
            activeOpacity={0.7}
          >
            <MaterialIcons name="qr-code-scanner" size={20} color="#f59e0b" />
          </TouchableOpacity>
          {/* <TouchableOpacity
            onPress={handleExport}
            className="bg-[#1f2232] px-3.5 py-3 rounded-[16px] border border-[#2a2e43] flex-row items-center"
            activeOpacity={0.7}
          >
            <MaterialIcons name="file-download" size={20} color="#10b981" />
          </TouchableOpacity>
          {canEdit && (
            <TouchableOpacity
              onPress={handleImport}
              className="bg-[#1f2232] px-3.5 py-3 rounded-[16px] border border-[#2a2e43] flex-row items-center"
              activeOpacity={0.7}
            >
              <MaterialIcons name="file-upload" size={20} color="#38bdf8" />
            </TouchableOpacity>
          )} */}
          {canEdit && (
            <TouchableOpacity
              onPress={() => {
                setEditingProduct(null);
                setIsModalVisible(true);
              }}
              className="bg-indigo-600 px-4 py-3 rounded-[16px] border border-indigo-400/30 shadow-lg shadow-indigo-600/30"
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
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
        <View className="flex-row items-center bg-[#121420] border border-[#2a2e43] rounded-[24px] p-2">
          {/* <Text className="text-slate-500 text-xl mr-3">🔍</Text> */}
          {/* <MaterialCommunityIcons name="magnify" size={24} color="#94a3b8" /> */}
          <MaterialIcons
            name="search"
            size={20}
            color="#9333ea"
            className="ml-3"
          />

          <TextInput
            placeholder="Search catalog by name, SKU, or barcode..."
            placeholderTextColor="#475569"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-slate-100 font-bold text-sm"
          />
          {searchQuery !== "" && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              className="bg-[#1f2232] w-6 h-6 rounded-full items-center justify-center border border-[#2a2e43]"
            >
              <Text className="text-slate-400 font-bold text-xs">×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CATEGORY TABS */}
      {categories && categories.length > 0 && (
        <View className="py-3 bg-[#161925] border-b border-[#1f2232] shadow-md z-0">
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
                className={`font-bold text-xs uppercase tracking-wider ${!selectedCat ? "text-indigo-400" : "text-slate-500"}`}
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
                  className={`font-bold text-xs uppercase tracking-wider ${selectedCat === cat.id ? "text-indigo-400" : "text-slate-500"}`}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
            paddingTop: 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#8b5cf6"
            />
          }
        >
          {filteredProducts?.map((product, idx) => {
            const colors = getProductColors(product.name);
            const emoji = getProductEmoji(product.name);
            const stockPct = Math.min(100, (product.stockQuantity / 100) * 100);
            const isLowStock = product.stockQuantity < 10;

            return (
              <Animated.View
                key={product.id}
                entering={FadeInDown.duration(400)
                  .delay(idx * 40)
                  .springify()}
              >
                <View className="bg-[#1f2232] p-5 rounded-[28px] mb-4 border border-[#2a2e43] shadow-lg">
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => setQrProduct(product)}
                      className={`w-16 h-16 rounded-[20px] items-center justify-center mr-4 border ${colors.bg} ${colors.border}`}
                    >
                      <Text className="text-3xl drop-shadow-md">{emoji}</Text>
                      <View className="absolute bottom-1 bg-[#121420] px-1 py-0.5 rounded border border-[#2a2e43]">
                        <Text className="text-[6.5px] font-black uppercase text-indigo-400 tracking-wider">
                          TAGS
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View className="flex-1">
                      <Text
                        className="text-slate-100 font-extrabold text-lg tracking-tight"
                        numberOfLines={1}
                      >
                        {product.name}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-slate-400 font-black text-[9px] uppercase tracking-[2px] bg-[#121420] px-2 py-1 rounded-md border border-[#2a2e43]">
                          {product.sku}
                        </Text>
                        {product.barcode && (
                          <Text className="text-indigo-400 font-black text-[9px] uppercase tracking-[2px] bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                            ⊟ {product.barcode}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center justify-between mt-3">
                        <Text className="text-indigo-400 font-black text-2xl">
                          ${Number(product.sellingPrice).toFixed(2)}
                        </Text>
                        {canEdit && (
                          <TouchableOpacity
                            onPress={() => {
                              setEditingProduct(product);
                              setIsModalVisible(true);
                            }}
                            className="w-10 h-10 bg-[#121420] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                          >
                            {/* <Text className="text-slate-400">✏️</Text> */}
                            <MaterialIcons
                              name="edit"
                              size={24}
                              color="#9333ea"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Stock Health Meter */}
                  <View className="mt-4 pt-4 border-t border-[#2a2e43]">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px]">
                        Stock Level
                      </Text>
                      <Text
                        className={`font-black text-xs ${isLowStock ? "text-rose-400" : "text-emerald-400"}`}
                      >
                        {product.stockQuantity} Units
                      </Text>
                    </View>
                    <View className="h-2 w-full bg-[#121420] rounded-full overflow-hidden border border-[#2a2e43]">
                      <View
                        className={`h-full rounded-full ${isLowStock ? "bg-rose-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.max(5, stockPct)}%` }}
                      />
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {/* Form Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 bg-[#0b0c10]"
        >
          <View className="px-6 py-6 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center mt-8">
            <Text className="text-2xl font-extrabold text-slate-100 tracking-tight">
              {editingProduct ? "Edit Item" : "New Item"}
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              className="bg-[#1f2232] w-11 h-11 rounded-full items-center justify-center border border-[#2a2e43]"
            >
              {/* <Text className="text-slate-400 font-bold text-2xl">×</Text> */}
              <MaterialIcons name="close" size={24} color="#9333ea" />
            </TouchableOpacity>
          </View>
          <ScrollView
            className="flex-1 px-6 pt-8"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Product Image Section */}
            {/* <View className="bg-[#1f2232] p-4 rounded-[32px] border border-[#2a2e43] shadow-xl mb-8">
              <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">
                Product Image
              </Text>
              <View className="flex-row justify-center items-center">
                {image ? (
                  <>
                    <Image
                      source={{ uri: image }}
                      className="w-32 h-32 rounded-[24px]"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => setImage(null)}
                      className="absolute -top-2 -right-2 bg-rose-500 p-1 rounded-full border-2 border-[#1f2232]"
                    >
                      <Text className="text-white font-bold text-xs">×</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View className="flex-1">
                    <TouchableOpacity
                      onPress={() => setIsScannerVisible(true)}
                      className="bg-[#121420] p-8 rounded-[24px] border border-dashed border-[#2a2e43] items-center justify-center"
                    >
                      <View className="w-16 h-16 bg-[#2a2e43] rounded-full items-center justify-center mb-4">
                        <MaterialIcons name="photo" size={32} color="#9333ea" />
                      </View>
                      <Text className="text-slate-400 font-bold text-sm">
                        Scan / Upload
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View> */}

            {/* Basic Info Section */}
            <View className="bg-[#1f2232] p-6 rounded-[32px] border border-[#2a2e43] shadow-xl mb-8">
              <FormField
                label="Name *"
                value={name}
                onChangeText={setName}
                placeholder="Item name"
              />

              <View className="flex-row gap-4 mt-6">
                <View className="flex-1">
                  <FormField
                    label="SKU *"
                    value={sku}
                    onChangeText={setSku}
                    placeholder="SKU"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-1">
                    Barcode
                  </Text>
                  <View className="flex-row gap-2">
                    <TextInput
                      value={barcode}
                      onChangeText={setBarcode}
                      placeholder="Code"
                      placeholderTextColor="#475569"
                      onSubmitEditing={() => {
                        Haptics.notificationAsync(
                          Haptics.NotificationFeedbackType.Success,
                        );
                      }}
                      className="flex-1 bg-[#121420] px-4 py-4 rounded-[16px] border border-[#2a2e43] font-bold text-slate-100"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setIsModalVisible(false);
                        setTimeout(
                          () => setIsScannerVisible(true),
                          Platform.OS === "ios" ? 400 : 50,
                        );
                      }}
                      className="w-14 bg-indigo-500/10 rounded-[16px] items-center justify-center border border-indigo-500/20 shadow-md"
                    >
                      <MaterialIcons
                        name="barcode-reader"
                        size={20}
                        color="#9333ea"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-4 mt-6">
                <View className="flex-1">
                  <FormField
                    label="Cost Price *"
                    value={costPrice}
                    onChangeText={setCostPrice}
                    keyboard="numeric"
                    placeholder="0.00"
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Selling Price *"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    keyboard="numeric"
                    placeholder="0.00"
                  />
                </View>
              </View>

              <View className="flex-row gap-4 mt-6">
                <View className="flex-1">
                  <FormField
                    label="Stock *"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboard="numeric"
                    placeholder="0"
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Brand"
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="Brand Name"
                  />
                </View>
              </View>

              <View className="mt-6">
                <FormField
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Product description..."
                  multiline={true}
                />
              </View>

              <View className="mt-6 pt-6 border-t border-[#2a2e43]">
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 ml-1">
                  Category Assignment *
                </Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {categories?.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        setCategoryId(cat.id);
                        setNewCategoryName("");
                      }}
                      className={`px-5 py-3 rounded-[16px] border transition-colors ${categoryId === cat.id && !newCategoryName ? "bg-indigo-600/20 border-indigo-500/50" : "bg-[#121420] border-[#2a2e43]"}`}
                    >
                      <Text
                        className={`font-bold text-sm tracking-wide ${categoryId === cat.id && !newCategoryName ? "text-indigo-400" : "text-slate-500"}`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="mt-6">
                  <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-1">
                    Or Create New Category
                  </Text>
                  <TextInput
                    value={newCategoryName}
                    onChangeText={(val) => {
                      setNewCategoryName(val);
                      if (val) setCategoryId("");
                    }}
                    placeholder="Type new category name..."
                    placeholderTextColor="#475569"
                    className="bg-[#121420] px-5 py-4 rounded-[16px] border border-[#2a2e43] font-bold text-slate-100 focus:border-indigo-500/50"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              className="bg-indigo-600 py-6 rounded-[28px] items-center shadow-2xl border border-indigo-400/30 shadow-indigo-600/30"
            >
              <Text className="text-white font-extrabold text-xl tracking-wide">
                Save to Catalog
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={!!qrProduct}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setQrProduct(null)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            className="bg-[#1f2232] w-full max-w-sm rounded-[40px] p-8 items-center border border-[#2a2e43] shadow-2xl"
          >
            <View className="absolute -top-10 bg-indigo-600/20 w-32 h-32 rounded-full blur-3xl -z-10" />
            <View className="w-20 h-20 bg-indigo-500/20 rounded-[24px] items-center justify-center mb-6 border border-indigo-500/30 shadow-lg">
              <Text className="text-4xl drop-shadow-md">
                {getProductEmoji(qrProduct?.name || "")}
              </Text>
            </View>
            <Text className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
              {qrProduct?.name}
            </Text>
            <Text className="text-indigo-400 font-black uppercase tracking-[3px] text-[10px] mb-8">
              SKU: {qrProduct?.sku}
            </Text>

            <View className="w-full bg-[#121420] p-4.5 rounded-[24px] border border-[#2a2e43] mb-4.5 items-center justify-center">
              {qrProduct?.barcode || qrProduct?.sku ? (
                <BarcodeView value={qrProduct.barcode || qrProduct.sku} />
              ) : (
                <View className="items-center py-3 px-2">
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    color="#f59e0b"
                  />
                  <Text className="text-amber-400 font-black text-xs mt-2 text-center">
                    No Barcode Assigned
                  </Text>
                  <Text className="text-slate-500 font-bold text-[8px] text-center mt-1 uppercase tracking-wider">
                    Generate one in edit settings
                  </Text>
                </View>
              )}
            </View>

            <View className="bg-white p-4.5 rounded-[24px] mb-5 shadow-xl border-4 border-[#121420]">
              <QRCode
                value={qrProduct?.barcode || qrProduct?.id || "N/A"}
                size={130}
                getRef={(c) => (qrRef.current = c)}
                color="#0b0c10"
              />
            </View>

            <Text className="text-slate-500 text-[8.5px] font-black tracking-[3px] text-center mb-6 uppercase">
              Barcode & QR Scan Label
            </Text>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setQrProduct(null)}
                className="flex-1 bg-[#121420] p-2 rounded-[24px] items-center border border-[#2a2e43]"
              >
                <Text className="text-slate-400 font-extrabold tracking-wide">
                  Close
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={shareQRCode}
                className="flex-2 bg-indigo-600 p-2 rounded-[24px] items-center shadow-lg border border-indigo-400/30 shadow-indigo-600/30"
              >
                <Text className="text-white font-extrabold text-lg tracking-wide">
                  Share / Print
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* CSV IMPORT LOADING OVERLAY */}
      <Modal transparent visible={isImporting} animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center px-8">
          <View className="bg-[#161925] border border-[#2a2e43] p-8 rounded-[32px] w-full max-w-sm items-center shadow-2xl">
            <ActivityIndicator
              size="large"
              color="#38bdf8"
              className="mb-6 animate-pulse"
            />
            <Text className="text-xl font-extrabold text-white text-center mb-2">
              Importing Catalog...
            </Text>
            <Text className="text-xs text-slate-500 text-center mb-6 uppercase tracking-[2px]">
              Processing Excel CSV File
            </Text>

            {/* Progress Meter */}
            <View className="h-2 w-full bg-[#121420] rounded-full overflow-hidden border border-[#2a2e43] mb-3">
              <View
                className="h-full rounded-full bg-[#38bdf8]"
                style={{ width: `${importProgress}%` }}
              />
            </View>
            <Text className="text-indigo-400 font-black text-xs tracking-wider">
              {importProgress}% Complete
            </Text>
          </View>
        </View>
      </Modal>

      {/* CSV IMPORT SUMMARY MODAL */}
      <Modal transparent visible={isSummaryVisible} animationType="slide">
        <View className="flex-1 bg-black/85 justify-end">
          <Animated.View
            entering={FadeInDown.duration(300)}
            className="bg-[#161925] border-t-2 border-[#2a2e43] rounded-t-[40px] p-6 max-h-[85%] shadow-2xl"
          >
            {/* Header / Stats Badge */}
            <View className="items-center mb-6">
              <View className="w-12 h-1.5 bg-[#2a2e43] rounded-full mb-6" />
              <View
                className={`w-16 h-16 rounded-[24px] items-center justify-center mb-4 border ${importSummary?.failed === 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"}`}
              >
                <MaterialIcons
                  name={importSummary?.failed === 0 ? "verified" : "warning"}
                  size={36}
                  color={importSummary?.failed === 0 ? "#10b981" : "#f59e0b"}
                />
              </View>
              <Text className="text-2xl font-black text-white tracking-tight">
                Import Summary
              </Text>
              <Text className="text-[10px] font-black text-slate-500 tracking-[3px] uppercase mt-1">
                Excel Catalog Sync Complete
              </Text>
            </View>

            {/* Neon Stats Grid */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 bg-[#121420] p-4 rounded-[20px] border border-[#2a2e43] items-center">
                <Text className="text-slate-500 font-black text-[9px] uppercase tracking-[2px] mb-1">
                  Total Rows
                </Text>
                <Text className="text-white font-extrabold text-xl">
                  {importSummary?.total || 0}
                </Text>
              </View>
              <View className="flex-1 bg-[#121420] p-4 rounded-[20px] border border-emerald-500/20 items-center">
                <Text className="text-emerald-500 font-black text-[9px] uppercase tracking-[2px] mb-1">
                  Success
                </Text>
                <Text className="text-emerald-400 font-extrabold text-xl">
                  {importSummary?.success || 0}
                </Text>
              </View>
              <View className="flex-1 bg-[#121420] p-4 rounded-[20px] border border-rose-500/20 items-center">
                <Text className="text-rose-500 font-black text-[9px] uppercase tracking-[2px] mb-1">
                  Failed
                </Text>
                <Text className="text-rose-400 font-extrabold text-xl">
                  {importSummary?.failed || 0}
                </Text>
              </View>
            </View>

            {/* Scrollable detailed feed */}
            <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[2px] mb-3 ml-1">
              Detailed Import Log
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="bg-[#121420] rounded-[24px] border border-[#2a2e43] p-4 mb-6 max-h-[250px]"
            >
              {importSummary?.logs.map((log, index) => (
                <View
                  key={index}
                  className={`flex-row items-center justify-between py-3 ${index < importSummary.logs.length - 1 ? "border-b border-[#1f2232]" : ""}`}
                >
                  <View className="flex-1 pr-4">
                    <Text
                      className="text-slate-200 font-bold text-sm"
                      numberOfLines={1}
                    >
                      {log.name}
                    </Text>
                    <Text className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">
                      SKU: {log.sku}
                    </Text>
                    {log.error && (
                      <Text className="text-rose-400/80 text-[10px] mt-1 italic font-medium leading-relaxed">
                        ⚠ {log.error}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`px-2.5 py-1 rounded-md border ${log.status === "SUCCESS" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}
                  >
                    <Text
                      className={`font-black text-[9px] uppercase tracking-wider ${log.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {log.status === "SUCCESS" ? "Success" : "Failed"}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={() => setIsSummaryVisible(false)}
              className="bg-indigo-600 py-4 rounded-[20px] items-center border border-indigo-400/30 shadow-lg shadow-indigo-600/30 mb-2"
            >
              <Text className="text-white font-extrabold text-base tracking-wide uppercase">
                Got it
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <BarcodeManager
        visible={isBarcodeManagerVisible}
        onClose={() => setIsBarcodeManagerVisible(false)}
        products={products}
        onUpdateProduct={(args) => updateProduct(args).unwrap()}
      />

      <BarcodeScannerModal
        visible={isScannerVisible}
        onClose={() => {
          setIsScannerVisible(false);
          setTimeout(
            () => setIsModalVisible(true),
            Platform.OS === "ios" ? 400 : 50,
          );
        }}
        onScanned={(code) => {
          setBarcode(code);
          setIsScannerVisible(false);
          setTimeout(
            () => setIsModalVisible(true),
            Platform.OS === "ios" ? 400 : 50,
          );
        }}
        title="Catalog Scan"
      />
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  multiline,
}: any) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View>
      <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-1">
        {label}
      </Text>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#475569"
        keyboardType={keyboard || "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`bg-[#121420] px-5 py-4 rounded-[16px] border font-bold text-slate-100 transition-colors ${isFocused ? "border-indigo-500/50 bg-[#161826]" : "border-[#2a2e43]"} ${multiline ? "min-h-[100px]" : ""}`}
        style={multiline ? { textAlignVertical: "top" } : {}}
      />
    </View>
  );
}
