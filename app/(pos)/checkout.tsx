import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useCart } from "@/hooks/useCard";
import { useCreateOrderMutation } from "@/services/features/order/orderApi";
import { useAppSelector } from "@/services/store/hooks";
import { Ionicons } from "@expo/vector-icons";

type PaymentMethod = "CASH" | "CARD" | "QR" | "WALLET" | "GIFT_CARD";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "CASH", label: "Cash", icon: "cash-outline" },
  { id: "CARD", label: "Card", icon: "card-outline" },
  { id: "QR", label: "QR Code", icon: "qr-code-outline" },
  { id: "WALLET", label: "Wallet", icon: "wallet-outline" },
  { id: "GIFT_CARD", label: "Gift Card", icon: "gift-outline" },
];

export default function Checkout() {
  const router = useRouter();
  const { cart, totalPrice, customerId, setCustomer, clearCart } = useCart();
  const storeId = useAppSelector((state) => state.auth.selectedStoreId);
  const userId = useAppSelector((state) => state.auth.user?.id);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [receivedAmount, setReceivedAmount] = useState(totalPrice.toString());
  const [isProcessing, setIsProcessing] = useState(false);

  const [createOrder, { isLoading }] = useCreateOrderMutation();

  if (cart.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
        <Text className="text-gray-400 text-lg mt-4">Your cart is empty</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-indigo-600 py-3 px-6 rounded-lg mt-4"
        >
          <Text className="text-white font-bold">Go to POS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "CASH") {
      setReceivedAmount(totalPrice.toString());
    }
  };

  const handleComplete = async () => {
    if (!storeId) {
      Alert.alert("Error", "No store selected.");
      return;
    }

    // Validate cash payment
    if (paymentMethod === "CASH") {
      const received = parseFloat(receivedAmount);
      if (isNaN(received) || received < totalPrice) {
        Alert.alert(
          "Insufficient",
          `Received amount (${receivedAmount}) is less than total (${totalPrice.toFixed(2)})`,
        );
        return;
      }
    }

    const payload = {
      storeId,
      userId,
      customerId: customerId || undefined,
      subTotal: totalPrice,
      taxAmount: 0,
      discountAmount: 0,
      grandTotal: totalPrice,
      paymentMethod,
      paidAmount:
        paymentMethod === "CASH" ? parseFloat(receivedAmount) : totalPrice,
      changeAmount:
        paymentMethod === "CASH" ? parseFloat(receivedAmount) - totalPrice : 0,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        subTotal: item.sellingPrice * item.quantity,
      })),
    };

    setIsProcessing(true);
    try {
      await createOrder(payload).unwrap();
      clearCart();
      Alert.alert("Success", "Order completed!");
      router.replace("/orders");
    } catch (error: any) {
      Alert.alert("Error", error.data?.message || "Failed to create order");
    } finally {
      setIsProcessing(false);
    }
  };

  const change =
    paymentMethod === "CASH" ? parseFloat(receivedAmount) - totalPrice : 0;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <Text className="text-xl font-bold mb-4">Checkout</Text>

        {/* Customer Selection */}
        <TouchableOpacity
          onPress={() => router.push("/customers/search")}
          className="border border-gray-200 rounded-lg p-3 mb-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <Ionicons name="person-outline" size={20} color="#6366F1" />
            <Text className="ml-2">
              {customerId ? `Customer: ${customerId}` : "Select Customer"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Cart Items Summary */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-500">Items</Text>
          {cart.map((item) => (
            <View
              key={item.id}
              className="flex-row justify-between py-1 border-b border-gray-50"
            >
              <Text className="text-gray-700">
                {item.quantity}x {item.name}
              </Text>
              <Text className="text-gray-900">
                ${(item.sellingPrice * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View className="border-t border-gray-200 pt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-500">Subtotal</Text>
            <Text className="text-gray-900">${totalPrice.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-500">Tax</Text>
            <Text className="text-gray-900">$0.00</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-500">Discount</Text>
            <Text className="text-gray-900">$0.00</Text>
          </View>
          <View className="flex-row justify-between border-t border-gray-300 pt-2 mt-1">
            <Text className="text-lg font-bold text-gray-900">Total</Text>
            <Text className="text-lg font-bold text-indigo-600">
              ${totalPrice.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Method Selection */}
      <View className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <Text className="text-sm font-semibold text-gray-500 mb-3">
          Payment Method
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => handlePaymentMethodSelect(method.id)}
              className={`px-4 py-2 rounded-lg flex-row items-center border ${
                paymentMethod === method.id
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <Ionicons
                name={method.icon}
                size={20}
                color={paymentMethod === method.id ? "#6366F1" : "#6B7280"}
              />
              <Text
                className={`ml-2 ${
                  paymentMethod === method.id
                    ? "text-indigo-600 font-semibold"
                    : "text-gray-600"
                }`}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cash Payment Input */}
      {paymentMethod === "CASH" && (
        <View className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Text className="text-sm font-semibold text-gray-500 mb-2">
            Received Amount
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-lg font-bold"
            keyboardType="decimal-pad"
            value={receivedAmount}
            onChangeText={setReceivedAmount}
            placeholder="0.00"
          />
          {change > 0 && (
            <Text className="text-green-600 mt-2 font-semibold">
              Change: ${change.toFixed(2)}
            </Text>
          )}
          {change < 0 && (
            <Text className="text-red-600 mt-2 font-semibold">
              Insufficient: ${Math.abs(change).toFixed(2)}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-3 mt-4 mb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
        >
          <Text className="text-gray-700 font-semibold">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleComplete}
          disabled={isProcessing}
          className="flex-2 bg-indigo-600 py-3 rounded-lg items-center flex-row justify-center"
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-bold ml-2">Complete Sale</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
// import { useCart } from "../../hooks/useCart";
// import { useCreateOrderMutation } from "../../features/orders/ordersApi";
// import { useAppSelector } from "../../store/hooks";

// export default function Checkout() {
//   const cart = useCart();
//   const storeId = useAppSelector((state) => state.auth.selectedStoreId);
//   const [createOrder, { isLoading }] = useCreateOrderMutation();

//   const handleComplete = async () => {
//     const payload = {
//       storeId,
//       subTotal: cart.totalPrice,
//       grandTotal: cart.totalPrice,
//       paymentMethod: "CASH",
//       paidAmount: cart.totalPrice,
//       changeAmount: 0,
//       items: cart.cart.map((item) => ({
//         productId: item.id,
//         quantity: item.quantity,
//         unitPrice: item.sellingPrice,
//         subTotal: item.sellingPrice * item.quantity,
//       })),
//     };
//     try {
//       await createOrder(payload).unwrap();
//       Alert.alert("Success", "Order completed");
//       cart.clearCart();
//       // navigate back
//     } catch (error) {
//       Alert.alert("Error", error.message);
//     }
//   };

//   return (
//     <View className="flex-1 p-4">
//       <Text className="text-2xl font-bold">Checkout</Text>
//       <Text>Total: ${cart.totalPrice.toFixed(2)}</Text>
//       {/* Payment method buttons */}
//       <TouchableOpacity
//         onPress={handleComplete}
//         className="bg-indigo-600 py-3 rounded-lg mt-4"
//         disabled={isLoading}
//       >
//         <Text className="text-white text-center font-bold">
//           {isLoading ? "Processing..." : "Complete Sale"}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }
