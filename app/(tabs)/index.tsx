import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  useGetLocalProductsQuery,
  useGetLocalCategoriesQuery,
} from "@/services/features/offline/localApi";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { addToCart } from "@/services/features/cart/cartSlice";
import { Screen, Header, Card, Pill } from "@/components/app-ui";
import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";

export default function POSScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined,
  );

  const { data: productsData, isLoading: isProductsLoading } =
    useGetLocalProductsQuery({
      search: searchQuery,
      categoryId: selectedCategory,
    });

  const { data: categoriesData } = useGetLocalCategoriesQuery();

  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.qty,
    0,
  );
  const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);

  const handleAddToCart = (product: any) => {
    dispatch(
      addToCart({
        id: product.id,
        name: product.name,
        price: product.sellingPrice,
        qty: 1,
      }),
    );
  };

  const handleScan = (data: string) => {
    setShowScannerModal(false);
    const product = productsData?.find(
      (p: any) => p.barcode === data || p.sku === data || p.id === data,
    );
    if (product) {
      handleAddToCart(product);
    } else {
      // Could also alert here, but let's just set it as search query if not found directly
      setSearchQuery(data);
    }
  };

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="flex-1 m-2 active:scale-95 transition-transform"
      onPress={() => handleAddToCart(item)}
    >
      <Card className="flex-1 p-4 bg-slate-900/80">
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
          <Text className="text-white font-black text-lg">
            ${item.sellingPrice?.toFixed(2) ?? "0.00"}
          </Text>
          <View className="bg-sky-500/20 p-2 rounded-full border border-sky-500/20">
            <MaterialIcons name="add" size={16} color="#7dd3fc" />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950 pt-12">
      <Screen padded={false}>
        {/* Header Area */}
        <View className="px-5 pt-4 pb-2">
          <Header
            eyebrow="Point of Sale"
            title="New Order"
            subtitle="Ready to take new orders"
          />

          {/* Search Bar */}
          <View className="flex-row items-center bg-white/5 rounded-[20px] mt-2 px-4 py-3 border border-white/10">
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

        {/* Floating Cart Summary */}
        {cartCount > 0 && (
          <View className="absolute bottom-6 left-5 right-5">
            <TouchableOpacity
              className="bg-sky-500 rounded-[24px] flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/20 border border-sky-400"
              activeOpacity={0.9}
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

        <BarcodeScannerModal
          visible={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onScan={handleScan}
        />
      </Screen>
    </SafeAreaView>
  );
}
