import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    sellingPrice: number;
    sku: string;
    image?: string;
    isActive?: boolean;
  };
  onAdd: () => void;
  cartQuantity?: number;
}

export function ProductCard({
  product,
  onAdd,
  cartQuantity = 0,
}: ProductCardProps) {
  const isInactive = product.isActive === false;

  return (
    <TouchableOpacity
      onPress={onAdd}
      disabled={isInactive}
      className={`rounded-xl m-1.5 p-3 shadow-sm border flex-1 ${
        isInactive
          ? "bg-gray-100 border-gray-200 opacity-60"
          : "bg-white border-gray-100"
      }`}
      style={{ maxWidth: "47%" }}
    >
      {/* Cart quantity badge */}
      {cartQuantity > 0 && (
        <View className="absolute top-1 left-1 z-10 bg-indigo-600 rounded-full min-w-[24px] h-6 items-center justify-center px-1.5">
          <Text className="text-white text-xs font-bold">{cartQuantity}</Text>
        </View>
      )}

      {/* Inactive badge */}
      {isInactive && (
        <View className="absolute top-1 right-1 z-10 bg-gray-500 rounded-full px-2 py-0.5">
          <Text className="text-white text-[10px] font-bold">INACTIVE</Text>
        </View>
      )}

      <View className="aspect-square bg-gray-50 rounded-lg items-center justify-center mb-2">
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <Ionicons
            name="cube-outline"
            size={36}
            color={isInactive ? "#D1D5DB" : "#9CA3AF"}
          />
        )}
      </View>

      <Text
        className={`text-sm font-semibold ${
          isInactive ? "text-gray-400" : "text-gray-900"
        }`}
        numberOfLines={2}
      >
        {product.name}
      </Text>

      <Text className="text-xs text-gray-400 mt-0.5">{product.sku}</Text>

      <View className="flex-row justify-between items-center mt-2">
        <Text
          className={`text-base font-bold ${
            isInactive ? "text-gray-400" : "text-indigo-600"
          }`}
        >
          ${product.sellingPrice.toFixed(2)}
        </Text>

        {!isInactive && (
          <TouchableOpacity
            onPress={onAdd}
            className={`rounded-full w-8 h-8 items-center justify-center ${
              cartQuantity > 0 ? "bg-indigo-100" : "bg-indigo-600"
            }`}
          >
            <Ionicons
              name="add"
              size={20}
              color={cartQuantity > 0 ? "#6366F1" : "white"}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
