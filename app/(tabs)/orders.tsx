// ============================================
// FILE: app/(tabs)/orders.tsx
// ============================================

import {
  Card,
  Header,
  Pill,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetLocalOrdersQuery,
  useGetLocalOrderByIdQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type OrderStatus = "PENDING" | "COMPLETED" | "VOIDED" | "CANCELLED";

export default function OrdersScreen() {
  const { currentStoreId } = useAppSelector((state) => state.auth);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "ALL">("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useGetLocalOrdersQuery({
    storeId: currentStoreId || undefined,
    status: filterStatus === "ALL" ? undefined : filterStatus,
  });

  const { data: orderDetail } = useGetLocalOrderByIdQuery(
    selectedOrderId || "",
    { skip: !selectedOrderId },
  );

  const statusColors = {
    PENDING: "amber",
    COMPLETED: "emerald",
    VOIDED: "rose",
    CANCELLED: "rose",
  } as const;

  const statusIcons = {
    PENDING: "pending",
    COMPLETED: "check-circle",
    VOIDED: "cancel",
    CANCELLED: "cancel",
  } as const;

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setSelectedOrderId(item.id)}
    >
      <Card className="mb-3">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-white font-bold text-base">
              #{item.orderNumber || item.id.slice(-6)}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              {new Date(item.createdAt).toLocaleString()}
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              {item.items?.length || 0} items
            </Text>
          </View>
          <View className="items-end">
            <Pill
              label={item.status}
              tone={statusColors[item.status as OrderStatus] || "sky"}
            />
            <Text className="text-emerald-400 font-black text-lg mt-2">
              ${item.grandTotal?.toFixed(2) || "0.00"}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Screen padded={false}>
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="px-5 pt-6 pb-2">
          <Header
            eyebrow="Transactions"
            title="Orders"
            subtitle="View all orders and their details"
            right={
              <TouchableOpacity
                className="bg-sky-500/20 px-3 py-1.5 rounded-full border border-sky-500/30"
                onPress={() => router.push("/pos")}
              >
                <Text className="text-sky-400 text-xs font-bold">+ New</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Status Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          {["ALL", "PENDING", "COMPLETED", "VOIDED", "CANCELLED"].map(
            (status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status as any)}
                className={`px-4 py-2 rounded-full border ${
                  filterStatus === status
                    ? "border-sky-400/40 bg-sky-500/20"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-wider ${
                    filterStatus === status ? "text-sky-300" : "text-slate-400"
                  }`}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        {/* Orders List */}
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          renderItem={renderOrderItem}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#38bdf8"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center mt-20">
              <View className="h-20 w-20 bg-white/5 rounded-full items-center justify-center border border-white/10">
                <MaterialIcons name="receipt-long" size={32} color="#64748b" />
              </View>
              <Text className="text-white mt-4 text-lg font-bold">
                No orders found
              </Text>
              <Text className="text-slate-500 text-sm text-center px-10 mt-2">
                {filterStatus === "ALL"
                  ? "Start taking orders from the POS screen."
                  : `No ${filterStatus} orders yet.`}
              </Text>
            </View>
          }
        />

        {/* Order Detail Modal */}
        <Modal
          visible={!!selectedOrderId}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedOrderId(null)}
        >
          <View className="flex-1 bg-black/80">
            <View className="flex-1 bg-slate-900 rounded-t-3xl mt-12">
              <View className="px-5 pt-5 pb-4">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-white font-bold text-xl">
                    Order Details
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedOrderId(null)}>
                    <MaterialIcons name="close" size={24} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {orderDetail ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Card className="mb-4">
                      <StatRow label="Order ID" value={orderDetail.id} />
                      <StatRow
                        label="Status"
                        value={orderDetail.status}
                        valueColor={
                          orderDetail.status === "COMPLETED"
                            ? "#34d399"
                            : orderDetail.status === "PENDING"
                              ? "#fbbf24"
                              : "#f87171"
                        }
                      />
                      <StatRow
                        label="Date"
                        value={new Date(orderDetail.createdAt).toLocaleString()}
                      />
                      <StatRow
                        label="Payment Method"
                        value={orderDetail.paymentMethod || "CASH"}
                      />
                      <StatRow
                        label="Customer"
                        value={orderDetail.customerId || "Walk-in"}
                      />
                    </Card>

                    <SectionTitle title="Items" />
                    <Card className="mb-4">
                      {orderDetail.items?.map((item: any) => (
                        <View
                          key={item.id}
                          className="flex-row justify-between py-3 border-b border-white/5 last:border-0"
                        >
                          <View className="flex-1">
                            <Text className="text-white font-medium">
                              {item.productName || "Item"}
                            </Text>
                            <Text className="text-slate-400 text-xs">
                              {item.quantity} × ${item.unitPrice?.toFixed(2)}
                            </Text>
                          </View>
                          <Text className="text-white font-bold">
                            ${item.subTotal?.toFixed(2) || "0.00"}
                          </Text>
                        </View>
                      ))}
                    </Card>

                    <SectionTitle title="Summary" />
                    <Card className="mb-4">
                      <StatRow
                        label="Subtotal"
                        value={`$${orderDetail.subTotal?.toFixed(2) || "0.00"}`}
                      />
                      <StatRow
                        label="Tax"
                        value={`$${orderDetail.taxAmount?.toFixed(2) || "0.00"}`}
                      />
                      <StatRow
                        label="Discount"
                        value={`-$${orderDetail.discountAmount?.toFixed(2) || "0.00"}`}
                        valueColor="#fbbf24"
                      />
                      <StatRow
                        label="Total"
                        value={`$${orderDetail.grandTotal?.toFixed(2) || "0.00"}`}
                        valueColor="#34d399"
                        bold
                      />
                    </Card>

                    <TouchableOpacity
                      className="bg-sky-500/20 py-3 rounded-xl border border-sky-500/30 mb-6"
                      onPress={() => {
                        setSelectedOrderId(null);
                        router.push(`/receipt/${orderDetail.id}`);
                      }}
                    >
                      <Text className="text-sky-400 font-bold text-center">
                        View Receipt
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#38bdf8" />
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}
