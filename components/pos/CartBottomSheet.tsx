import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CartItem {
  id: string;
  name: string;
  sellingPrice: number;
  quantity: number;
}

interface CartBottomSheetProps {
  cart: CartItem[];
  totalItems: number;
  totalPrice: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export function CartBottomSheet({
  cart,
  totalItems,
  totalPrice,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartBottomSheetProps) {
  if (cart.length === 0) {
    return (
      <View className="bg-white rounded-t-2xl shadow-lg p-4 border-t border-gray-200">
        <Text className="text-center text-gray-400">Cart is empty</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-t-2xl shadow-lg p-4 border-t border-gray-200">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold">
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </Text>
        <Text className="text-2xl font-bold text-indigo-600">
          ${totalPrice.toFixed(2)}
        </Text>
      </View>

      <FlatList
        horizontal
        data={cart}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-gray-50 rounded-lg p-3 mr-2 min-w-[120px] border border-gray-200">
            <Text
              className="text-sm font-semibold text-gray-900"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View className="flex-row items-center justify-between mt-2">
              <TouchableOpacity
                onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
                className="bg-gray-200 rounded-full w-6 h-6 items-center justify-center"
              >
                <Text className="font-bold">-</Text>
              </TouchableOpacity>
              <Text className="font-semibold">{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                className="bg-indigo-200 rounded-full w-6 h-6 items-center justify-center"
              >
                <Text className="font-bold text-indigo-600">+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              className="absolute top-1 right-1"
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        className="mb-3"
      />

      <TouchableOpacity
        onPress={onCheckout}
        className="bg-indigo-600 py-3 rounded-lg"
      >
        <Text className="text-white text-center font-bold text-base">
          Checkout → ${totalPrice.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
