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
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <TouchableOpacity
      onPress={onAdd}
      className="bg-white rounded-xl m-2 p-3 shadow-sm border border-gray-100 flex-1"
      style={{ maxWidth: "47%" }}
    >
      <View className="aspect-square bg-gray-50 rounded-lg items-center justify-center mb-2">
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="cube-outline" size={40} color="#9CA3AF" />
        )}
      </View>
      <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
        {product.name}
      </Text>
      <Text className="text-xs text-gray-400 mt-0.5">{product.sku}</Text>
      <View className="flex-row justify-between items-center mt-2">
        <Text className="text-lg font-bold text-indigo-600">
          ${product.sellingPrice.toFixed(2)}
        </Text>
        <TouchableOpacity
          onPress={onAdd}
          className="bg-indigo-600 rounded-full w-8 h-8 items-center justify-center"
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
