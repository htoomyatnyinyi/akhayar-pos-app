// app/(tabs)/inventory.tsx (Quick test)
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { createOfflineProduct } from "@/services/offline/repository";
import { syncNow } from "@/services/offline/syncManager";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";

export default function InventoryScreen() {
  const dispatch = useAppDispatch();
  const isOnline = useAppSelector((state) => state.offline.isOnline);
  const isSyncing = useAppSelector((state) => state.offline.isSyncing);
  const [loading, setLoading] = useState(false);

  const createTestProducts = async () => {
    setLoading(true);
    try {
      const products = [
        {
          name: "Espresso",
          sku: "COF-001",
          sellingPrice: 3.5,
          costPrice: 1.5,
          stockQuantity: 100,
          categoryName: "Beverages",
        },
        {
          name: "Americano",
          sku: "COF-002",
          sellingPrice: 4.0,
          costPrice: 1.8,
          stockQuantity: 80,
          categoryName: "Beverages",
        },
        {
          name: "Cappuccino",
          sku: "COF-003",
          sellingPrice: 4.5,
          costPrice: 2.0,
          stockQuantity: 60,
          categoryName: "Beverages",
        },
        {
          name: "Latte",
          sku: "COF-004",
          sellingPrice: 5.0,
          costPrice: 2.2,
          stockQuantity: 70,
          categoryName: "Beverages",
        },
      ];

      for (const product of products) {
        await createOfflineProduct(product);
      }

      Alert.alert("Success", `${products.length} products created locally!`, [
        {
          text: "Sync Now",
          onPress: async () => {
            await syncNow(dispatch, () => ({}) as any, { force: true });
            Alert.alert("Sync Started", "Products will sync to server");
          },
        },
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error creating products:", error);
      Alert.alert("Error", "Failed to create products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-black p-4">
      <Text className="text-white text-2xl font-bold mb-4">Inventory</Text>

      <View className="bg-white/10 rounded-xl p-4 mb-4">
        <Text className="text-white text-lg font-semibold mb-2">
          Quick Actions
        </Text>
        <Text className="text-gray-400 text-sm mb-4">
          Create test products locally. They will sync to server when online.
        </Text>

        <TouchableOpacity
          className={`bg-sky-500 rounded-xl py-3 px-4 ${loading ? "opacity-70" : ""}`}
          onPress={createTestProducts}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center">
              Create 4 Test Products
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="bg-white/10 rounded-xl p-4">
        <Text className="text-white text-lg font-semibold mb-2">Status</Text>
        <View className="flex-row justify-between">
          <Text className="text-gray-400">Online:</Text>
          <Text className={isOnline ? "text-green-400" : "text-red-400"}>
            {isOnline ? "✅ Yes" : "❌ No"}
          </Text>
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-gray-400">Syncing:</Text>
          <Text className={isSyncing ? "text-yellow-400" : "text-gray-400"}>
            {isSyncing ? "⏳ Yes" : "No"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        className="bg-green-500 rounded-xl py-3 px-4 mt-4"
        onPress={async () => {
          await syncNow(dispatch, () => ({}) as any, { force: true });
          Alert.alert("Sync Started", "Checking for updates...");
        }}
      >
        <Text className="text-white font-bold text-center">Manual Sync</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
