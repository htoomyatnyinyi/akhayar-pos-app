import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useGetProductsQuery } from "@/services/features/products/productApi";
import { useGetCategoriesQuery } from "@/services/features/categories/categoryApi";
import { ProductCard } from "@/components/pos/ProductCard";
import { CategoryPills } from "@/components/pos/CategoryPills";
import { CartBottomSheet } from "@/components/pos/CartBottomSheet";
import { useCart } from "@/hooks/useCart";
import { useAppSelector } from "@/services/store/hooks";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PosHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const storeId = useAppSelector((state) => state.auth.selectedStoreId);

  const {
    data: rawProducts,
    isLoading,
    isFetching,
    refetch,
  } = useGetProductsQuery({
    storeId: storeId || undefined,
    search: search || undefined,
    categoryId: selectedCategory || undefined,
  });

  const { data: rawCategories, isLoading: categoriesLoading } =
    useGetCategoriesQuery({});

  console.log("rawProducts", rawProducts);
  const products = Array.isArray(rawProducts)
    ? rawProducts
    : rawProducts?.data || [];
  const categories = Array.isArray(rawCategories)
    ? rawCategories
    : rawCategories?.data || [];

  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
    clearCart,
  } = useCart();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    router.push("/checkout");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-gray-900">POS</Text>
          <TouchableOpacity
            onPress={() => router.push("/products")}
            className="bg-indigo-50 rounded-full p-2"
          >
            <Ionicons name="grid-outline" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-base text-gray-900"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <CategoryPills
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        isLoading={categoriesLoading}
      />

      {/* Product Grid */}
      {isLoading && products.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-gray-400 mt-3">Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onAdd={() => addToCart(item)}
              cartQuantity={cart.find((c) => c.id === item.id)?.quantity || 0}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={["#6366F1"]}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="cube-outline" size={56} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3 text-base">
                {search
                  ? `No products match "${search}"`
                  : "No products available"}
              </Text>
              {search && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  className="mt-3 px-4 py-2 bg-indigo-50 rounded-lg"
                >
                  <Text className="text-indigo-600 font-medium">
                    Clear search
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Cart Bottom Sheet */}
      <CartBottomSheet
        cart={cart}
        totalItems={totalItems}
        totalPrice={totalPrice}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        onClearCart={clearCart}
      />
    </SafeAreaView>
  );
}
