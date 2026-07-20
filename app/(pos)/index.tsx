import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import { useGetProductsQuery } from "@/services/features/products/productApi";
import { useGetCategoriesQuery } from "@/services/features/categories/categoryApi";

import { ProductCard } from "@/components/pos/ProductCard";
import { CategoryPills } from "@/components/pos/CategoryPills";
import { CartBottomSheet } from "@/components/pos/CartBottomSheet";
import { useCart } from "@/hooks/useCard";
import { useAppSelector } from "@/services/store/hooks";

export default function PosHome() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const storeId = useAppSelector((state) => state.auth.selectedStoreId);

  const { data: products, isLoading } = useGetProductsQuery({
    storeId,
    search,
    categoryId: selectedCategory || undefined,
  });
  const { data: categories } = useGetCategoriesQuery();

  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
  } = useCart();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search Bar */}
      <View className="p-4 bg-white">
        <TextInput
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          className="border border-gray-200 rounded-lg px-4 py-2"
        />
      </View>

      {/* Category Pills */}
      <CategoryPills
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Product Grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerClassName="p-2"
        renderItem={({ item }) => (
          <ProductCard product={item} onAdd={() => addToCart(item)} />
        )}
        refreshing={isLoading}
        onRefresh={() => {}}
      />

      {/* Cart Bottom Sheet */}
      <CartBottomSheet
        cart={cart}
        totalItems={totalItems}
        totalPrice={totalPrice}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={() => {}}
      />
    </View>
  );
}
