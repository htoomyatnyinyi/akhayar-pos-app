import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
} from "react-native";
import { useState, useRef, useEffect } from "react";
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
  onClearCart?: () => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_HEIGHT = 72;
const EXPANDED_HEIGHT = Math.min(SCREEN_HEIGHT * 0.45, 400);

export function CartBottomSheet({
  cart,
  totalItems,
  totalPrice,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onClearCart,
}: CartBottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate when totalItems changes (new item added)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (totalItems > 0) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [totalItems]);

  const toggleExpanded = () => {
    const toExpanded = !isExpanded;
    setIsExpanded(toExpanded);

    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
        useNativeDriver: false,
        friction: 10,
        tension: 40,
      }),
      Animated.timing(fadeAnim, {
        toValue: toExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          height: heightAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl border-t border-gray-200"
    >
      {/* Shadow overlay */}
      <View
        style={{
          position: "absolute",
          top: -4,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: "transparent",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        }}
      />

      {/* Collapsed mini bar — always visible */}
      <TouchableOpacity
        onPress={toggleExpanded}
        activeOpacity={0.9}
        className="px-4 py-3"
      >
        {/* Handle bar */}
        <View className="items-center mb-2">
          <View className="w-10 h-1 bg-gray-300 rounded-full" />
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="bg-indigo-100 rounded-full w-10 h-10 items-center justify-center mr-3">
              <Ionicons name="cart" size={20} color="#6366F1" />
              <View className="absolute -top-1 -right-1 bg-indigo-600 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                <Text className="text-white text-[10px] font-bold">
                  {totalItems}
                </Text>
              </View>
            </View>
            <View>
              <Text className="text-sm font-semibold text-gray-900">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Text>
              <Text className="text-xs text-gray-500">
                Tap to {isExpanded ? "collapse" : "view cart"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Text className="text-xl font-bold text-indigo-600 mr-3">
              ${totalPrice.toFixed(2)}
            </Text>
            <TouchableOpacity
              onPress={onCheckout}
              className="bg-indigo-600 rounded-xl px-4 py-2.5"
            >
              <Text className="text-white font-bold text-sm">Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded cart items */}
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        {isExpanded && (
          <View className="flex-1">
            {/* Cart header with clear button */}
            <View className="flex-row justify-between items-center px-4 pb-2 border-b border-gray-100">
              <Text className="text-sm font-semibold text-gray-500">
                Cart Items
              </Text>
              {onClearCart && (
                <TouchableOpacity
                  onPress={onClearCart}
                  className="flex-row items-center"
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text className="text-red-500 text-xs font-medium ml-1">
                    Clear all
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cart items list */}
            <FlatList
              data={cart}
              keyExtractor={(item) => item.id}
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
              renderItem={({ item }) => (
                <View className="flex-row items-center py-2 border-b border-gray-50">
                  <View className="flex-1 mr-2">
                    <Text
                      className="text-sm font-medium text-gray-900"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      ${item.sellingPrice.toFixed(2)} each
                    </Text>
                  </View>

                  {/* Quantity controls */}
                  <View className="flex-row items-center bg-gray-100 rounded-lg px-1">
                    <TouchableOpacity
                      onPress={() =>
                        onUpdateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-7 h-7 items-center justify-center"
                    >
                      <Ionicons
                        name={
                          item.quantity <= 1
                            ? "trash-outline"
                            : "remove"
                        }
                        size={14}
                        color={item.quantity <= 1 ? "#EF4444" : "#374151"}
                      />
                    </TouchableOpacity>
                    <Text className="text-sm font-bold text-gray-900 mx-2 min-w-[20px] text-center">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        onUpdateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-7 h-7 items-center justify-center"
                    >
                      <Ionicons name="add" size={14} color="#6366F1" />
                    </TouchableOpacity>
                  </View>

                  {/* Line total */}
                  <Text className="text-sm font-bold text-gray-900 ml-3 min-w-[60px] text-right">
                    ${(item.sellingPrice * item.quantity).toFixed(2)}
                  </Text>

                  {/* Remove button */}
                  <TouchableOpacity
                    onPress={() => onRemove(item.id)}
                    className="ml-2 p-1"
                  >
                    <Ionicons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}
