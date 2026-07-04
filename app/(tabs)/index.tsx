import { Button, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { router } from "expo-router";
import { useGetLocalCategoriesQuery } from "@/services/features/offline/localApi";
import { useGetLocalOrdersQuery } from "@/services/features/offline/localApi";
import { useGetLocalProductsQuery } from "@/services/features/offline/localApi";
import { useSelector } from "react-redux";
import { RootState } from "@/services/store/store";
import { syncNow } from "@/services/offline/syncManager";

export default function index() {
  const { user } = useSelector((state: RootState) => state.auth);
  console.log("user", user);
  const { data } = useGetLocalCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: orders } = useGetLocalOrdersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: products } = useGetLocalProductsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  console.log("orders", orders);
  console.log("categories", data);
  console.log("products", products);
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Welcome to POS App</Text>
      <Text className="text-lg font-medium">Choose an action to continue</Text>
      <TouchableOpacity className="mt-4 bg-blue-500 px-4 py-2 rounded-lg">
        <Text className="text-white font-medium">Start Selling</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-4 bg-blue-500 px-4 py-2 rounded-lg">
        <Text
          className="text-white font-medium"
          onPress={() => router.push("/(tabs)/dashboard")}
        >
          Start Selling
        </Text>
      </TouchableOpacity>
      {user && (
        <Button title="Sync Now" onPress={() => syncNow(dispatch, getState)} />
      )}
      {products && (
        <TouchableOpacity
          className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
          onPress={() => router.push("/(tabs)/inventory")}
        >
          <Text className="text-white font-medium">View Products</Text>
        </TouchableOpacity>
      )}
      {products?.map((product) => (
        <Text className="text-white font-medium" key={product.id}>
          {product.name}
        </Text>
      ))}
      {orders && <Text>{orders.length} orders</Text>}
    </View>
  );
}
