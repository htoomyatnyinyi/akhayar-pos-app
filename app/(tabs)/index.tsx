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

export default function POSScreen() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="flex-1 m-2 p-4 bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm active:scale-95 transition-transform"
      onPress={() => handleAddToCart(item)}
    >
      <View className="h-28 bg-slate-700/30 rounded-xl mb-3 items-center justify-center">
        <MaterialIcons name="inventory-2" size={36} color="#64748b" />
      </View>
      <Text
        className="text-slate-200 font-semibold text-base mb-1"
        numberOfLines={1}
      >
        {item.name}
      </Text>
      <Text className="text-slate-400 text-xs mb-3" numberOfLines={1}>
        SKU: {item.sku}
      </Text>
      <View className="flex-row items-center justify-between mt-auto">
        <Text className="text-sky-400 font-bold text-lg">
          ${item.sellingPrice?.toFixed(2) ?? "0.00"}
        </Text>
        <View className="bg-sky-500/20 p-2 rounded-full">
          <MaterialIcons name="add" size={16} color="#38bdf8" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-900 pt-12">
      {/* Header Area */}
      <View className="px-5 py-4">
        <Text className="text-3xl font-black text-white mb-1">
          Point of Sale
        </Text>
        <Text className="text-slate-400 text-sm font-medium">
          Ready for new orders
        </Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-800/80 rounded-2xl mt-6 px-4 py-3 border border-slate-700/50">
          <MaterialIcons name="search" size={24} color="#64748b" />
          <TextInput
            className="flex-1 ml-3 text-slate-200 text-base"
            placeholder="Search products, SKUs..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Filter */}
      <View className="pl-5 mb-2 mt-2 h-12">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 20 }}
        >
          <TouchableOpacity
            className={`mr-3 px-5 py-2.5 rounded-full border ${
              !selectedCategory
                ? "bg-sky-500 border-sky-400"
                : "bg-slate-800 border-slate-700"
            }`}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text
              className={`font-semibold ${
                !selectedCategory ? "text-white" : "text-slate-300"
              }`}
            >
              All Items
            </Text>
          </TouchableOpacity>

          {categoriesData?.map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              className={`mr-3 px-5 py-2.5 rounded-full border ${
                selectedCategory === cat.id
                  ? "bg-sky-500 border-sky-400"
                  : "bg-slate-800 border-slate-700"
              }`}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                className={`font-semibold ${
                  selectedCategory === cat.id ? "text-white" : "text-slate-300"
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <FlatList
        data={productsData || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120 }}
        renderItem={renderProduct}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center mt-24">
            <MaterialIcons name="inbox" size={64} color="#334155" />
            <Text className="text-slate-400 mt-4 text-lg font-medium">
              No products found
            </Text>
            <Text className="text-slate-500 mt-1 text-sm text-center px-10">
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
            className="bg-sky-500 rounded-2xl flex-row items-center justify-between p-4 shadow-lg shadow-sky-500/30"
            activeOpacity={0.9}
          >
            <View className="flex-row items-center">
              <View className="bg-white/20 rounded-full w-10 h-10 items-center justify-center">
                <Text className="text-white font-bold text-lg">
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
    </SafeAreaView>
  );
}
