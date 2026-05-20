import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useGetOrdersQuery } from "@/services/features/order/orderApi";
import { useProcessReturnMutation } from "@/services/features/returns/returnsApi";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import { MaterialIcons } from "@expo/vector-icons";

const generateReceiptHtml = (order: any, store: any) => {
  const total = order.items.reduce(
    (acc: number, item: any) =>
      acc + item.quantity * Number(item.product?.sellingPrice || 0),
    0,
  );
  const dateStr = new Date(order.createdAt).toLocaleString();

  const itemsHtml = order.items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 5px 0;">${item.quantity}x ${item.product?.name}</td>
      <td style="text-align: right; padding: 5px 0;">$${(item.quantity * Number(item.product?.sellingPrice || 0)).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #000; padding: 20px; text-align: center; }
          .header { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .sub { font-size: 12px; margin-bottom: 20px; }
          .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { font-size: 14px; }
          .total-row { font-size: 18px; font-weight: bold; }
          .footer { font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="header">${store?.name || "Store"}</div>
        <div class="sub">${store?.address || "Downtown Terminal"}<br/>Tel: ${store?.phone || "--"}</div>
        
        <div style="text-align: left; font-size: 12px;">
          <div>Order: #${order.id.slice(-6).toUpperCase()}</div>
          <div>Date: ${dateStr}</div>
          <div>Cashier: System</div>
        </div>

        <div class="divider"></div>
        
        <table>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <table style="margin-top: 10px;">
          <tr class="total-row">
            <td style="text-align: left;">TOTAL</td>
            <td style="text-align: right;">$${total.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: left; padding-top: 10px;">Paid via</td>
            <td style="text-align: right; padding-top: 10px;">${order.paymentMethod.replace("_", " ")}</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="footer">
          <div>Thank you for your purchase!</div>
          <div>Please come again</div>
        </div>
      </body>
    </html>
  `;
};

const STATUS_STYLING: Record<
  string,
  { bg: string; text: string; dot: string; border: string }
> = {
  COMPLETED: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
  },
  PENDING: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
  },
  CANCELLED: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-400",
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  },
  REFUNDED: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-400",
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  },
};

export default function OrdersScreen() {
  const user = useAppSelector((state: any) => state.auth.user);
  const currentStoreId = useAppSelector((s: any) => s.auth.currentStoreId);
  const role = user?.role || "CASHIER";
  const {
    data: orders,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetOrdersQuery(currentStoreId || undefined);
  const [processReturn, { isLoading: isRefunding }] =
    useProcessReturnMutation();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [refundSuccessOrder, setRefundSuccessOrder] = useState<any>(null);
  const currentStore = user?.stores?.find((s: any) => s.id === currentStoreId);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL"); // "ALL", "TODAY", "YESTERDAY", "WEEK"

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    let result = [...orders];

    if (dateFilter !== "ALL") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      result = result.filter((order) => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);

        if (dateFilter === "TODAY") {
          return orderDate.getTime() === today.getTime();
        }
        if (dateFilter === "YESTERDAY") {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return orderDate.getTime() === yesterday.getTime();
        }
        if (dateFilter === "WEEK") {
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          return orderDate >= lastWeek;
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.id.toLowerCase().includes(q) ||
          order.status.toLowerCase().includes(q) ||
          (order.items &&
            order.items.some((i: any) =>
              i.productName?.toLowerCase().includes(q),
            )),
      );
    }

    return result;
  }, [orders, searchQuery, dateFilter]);

  const handlePrintThermal = async () => {
    if (!selectedOrder) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const html = generateReceiptHtml(selectedOrder, currentStore);
      await Print.printAsync({ html });
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Print Error", "Failed to print the thermal receipt.");
    }
  };

  const handleRefund = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Refund Order",
      "Are you sure you want to refund this entire transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Refund",
          style: "destructive",
          onPress: async () => {
            try {
              const total = selectedOrder.items.reduce(
                (acc: number, item: any) =>
                  acc + item.quantity * Number(item.product?.sellingPrice || 0),
                0,
              );

              const returnPayload = {
                orderId: selectedOrder.id,
                customerId: selectedOrder.customerId || undefined,
                totalAmount: total,
                refundMethod: selectedOrder.paymentMethod || "CASH",
                reason: "Customer requested full refund",
                approvedBy: "System Admin",
                items: selectedOrder.items.map((item: any) => ({
                  orderItemId: item.id,
                  quantity: item.quantity,
                  refundAmount:
                    item.quantity * Number(item.product?.sellingPrice || 0),
                  reason: "Full Order Refund",
                })),
              };

              await processReturn(returnPayload).unwrap();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              setRefundSuccessOrder(selectedOrder);
              setSelectedOrder(null);
              refetch();
            } catch (err) {
              console.error("Refund error:", err);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                "Error",
                "Failed to process refund. Check if all items are still in catalog.",
              );
            }
          },
        },
      ],
    );
  };

  // const modalRef = useRef(null);

  // const handleSuccess = () => {
  //   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  //   // Alert.alert("Success", "Transaction has been fully refunded.");
  //   const itemsHtml = selectedOrder?.items.map((i:any) => `
  //     <tr>
  //       <td style="text-align: left;">${i.product?.name || 'Unknown Product'}</td>
  //       <td style="text-align: right;">1x ${i.quantity}</td>
  //       <td style="text-align: right;">$${i.quantity * Number(i.product?.sellingPrice || 0)}</td>
  //     </tr>
  //   `).join("");

  //   const html = generateReceiptHtml(selectedOrder, currentStore);
  //   Print.printAsync({ html });
  //   setSelectedOrder(null);
  // };

  const handleExport = async () => {
    if (!orders || orders.length === 0) {
      Alert.alert("Export Error", "No transactions to export.");
      return;
    }
    try {
      const csvHeader = "Order ID,Date,Status,Total Amount,Items Summary\n";
      const csvRows = orders
        .map((order) => {
          const date = new Date(order.createdAt).toLocaleString();
          const total = order.items.reduce(
            (acc, item) =>
              acc + item.quantity * Number(item?.product?.sellingPrice || 0),
            0,
          );
          const itemSummary = order.items
            .map((i) => `${i.quantity}x ${i.product?.name}`)
            .join(" | ");
          return `"${order.id}","${date}","${order.status}","${total.toFixed(2)}","${itemSummary}"`;
        })
        .join("\n");

      const csvString = csvHeader + csvRows;
      // @ts-ignore
      const filePath = `${FileSystem.documentDirectory}sales_audit_${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(filePath, csvString, {
        encoding: "utf8",
      });
      await Sharing.shareAsync(filePath, { dialogTitle: "Export Sales Audit" });
    } catch (error) {
      Alert.alert("Export Failed", "Failed to generate the audit record.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0c10" }}>
      {/* Header */}
      <View className="px-6 py-5 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center z-10">
        <View className="flex-row items-center">
          <View className="w-1.5 h-9 bg-[#a855f7] rounded-full mr-3.5 shadow-lg shadow-[#a855f7]/50" />
          <View>
            <Text className="text-2xl font-black text-slate-100 tracking-tight">
              Sales
            </Text>
            <Text className="text-[9px] font-black text-purple-400 tracking-[3px] uppercase mt-0.5">
              Audit & Records
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="bg-[#1f2232] px-3 py-2.5 rounded-[16px] border border-[#2a2e43]">
            <Text className="text-purple-400 font-extrabold text-[10px] uppercase tracking-wider">
              {filteredOrders.length} Trx
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExport}
            className="bg-purple-600/10 px-3.5 py-2.5 rounded-[16px] border border-purple-500/20"
            activeOpacity={0.7}
          >
            <MaterialIcons name="file-download" size={20} color="#a855f7" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filters */}
      <View className="px-6 py-4 bg-[#0b0c10] border-b border-[#161925] z-0">
        <View className="bg-[#1f2232] rounded-[16px] border border-[#2a2e43] px-4 py-1.5 flex-row items-center mb-3">
          <MaterialIcons name="search" size={20} color="#818cf8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by ID, Status, or Item..."
            placeholderTextColor="#475569"
            className="flex-1 text-white font-bold ml-2 h-10"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {["ALL", "TODAY", "YESTERDAY", "WEEK"].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-full border transition-colors ${dateFilter === filter ? "bg-purple-600/20 border-purple-500/50" : "bg-[#1f2232] border-[#2a2e43]"}`}
            >
              <Text
                className={`font-bold text-xs ${dateFilter === filter ? "text-purple-400" : "text-slate-400"}`}
              >
                {filter === "WEEK" ? "THIS WEEK" : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
            paddingTop: 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#8b5cf6"
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <Animated.View
              entering={FadeInDown.duration(400)}
              className="items-center py-24 opacity-40"
            >
              {/* <Text className="text-7xl mb-6">🧾</Text> */}
              <MaterialIcons name="receipt" size={48} color="#60a5fa" />
              <Text className="text-slate-100 font-bold text-lg">
                No Transactions Found
              </Text>
              <Text className="text-slate-500 text-xs mt-1">
                Try adjusting your filters.
              </Text>
            </Animated.View>
          ) : (
            filteredOrders.map((order: any, idx: number) => {
              const st = STATUS_STYLING[order.status] || STATUS_STYLING.PENDING;
              const total = order.items.reduce(
                (acc: number, item: any) =>
                  acc +
                  item.quantity * Number(item?.product?.sellingPrice || 0),
                0,
              );

              return (
                <Animated.View
                  key={order.id}
                  entering={FadeInDown.duration(400)
                    .delay(idx * 30)
                    .springify()}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedOrder(order);
                    }}
                    className="bg-[#1f2232] p-6 rounded-[32px] mb-4 border border-[#2a2e43] shadow-lg"
                  >
                    <View className="flex-row justify-between items-start mb-5">
                      <View>
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="text-slate-100 font-extrabold text-xl">
                            #{order.id.slice(-6).toUpperCase()}
                          </Text>
                          <View
                            className={`px-2.5 py-1 rounded-[8px] flex-row items-center gap-1.5 border ${st.bg} ${st.border}`}
                          >
                            <View
                              className={`w-1.5 h-1.5 rounded-full ${st.dot}`}
                            />
                            <Text
                              className={`text-[8px] font-black tracking-widest uppercase ${st.text}`}
                            >
                              {order.status}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[2px] mt-1">
                          {new Date(order.createdAt).toLocaleDateString()} •{" "}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      <Text className="text-slate-100 font-black text-2xl tracking-tight">
                        ${total.toFixed(2)}
                      </Text>
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      {order.items.slice(0, 3).map((item: any, i: number) => (
                        <View
                          key={i}
                          className="bg-[#121420] px-3 py-1.5 rounded-lg border border-[#2a2e43]"
                        >
                          <Text className="text-slate-400 text-[10px] font-bold">
                            {item.quantity}× {item.product?.name || "Item"}
                          </Text>
                        </View>
                      ))}
                      {order.items.length > 3 && (
                        <View className="bg-[#121420] px-3 py-1.5 rounded-lg border border-[#2a2e43]">
                          <Text className="text-slate-500 text-[10px] font-black">
                            +{order.items.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Digital Receipt Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View className="flex-1 bg-[#0b0c10]">
          <View className="px-6 py-6 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center">
            <Text className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Digital Receipt
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedOrder(null)}
              className="bg-[#1f2232] w-10 h-10 rounded-full items-center justify-center border border-[#2a2e43]"
            >
              <Text className="text-slate-400 font-bold text-xl">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-8"
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            <Animated.View
              entering={FadeInUp.duration(600).springify()}
              className="bg-[#1f2232] rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Receipt cutouts */}
              <View className="absolute top-0 left-0 right-0 h-2 flex-row justify-around overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <View
                    key={i}
                    className="w-3 h-3 bg-[#0b0c10] rounded-full -mt-1.5"
                  />
                ))}
              </View>
              <View className="absolute bottom-0 left-0 right-0 h-2 flex-row justify-around overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <View
                    key={i}
                    className="w-3 h-3 bg-[#0b0c10] rounded-full mt-0.5"
                  />
                ))}
              </View>

              <View className="items-center mb-8 mt-2">
                <View className="w-16 h-16 bg-indigo-500/10 rounded-[20px] items-center justify-center border border-indigo-500/20 mb-4">
                  {/* <Text className="text-3xl">⚡</Text> */}
                  <MaterialIcons name="storefront" size={40} color="#10b981" />
                </View>
                <Text className="text-white text-3xl font-extrabold tracking-tight mb-2">
                  MidnightCorner
                </Text>
                <View className="bg-[#121420] px-3 py-1 rounded-md border border-[#2a2e43]">
                  <Text className="text-slate-500 font-black text-[9px] uppercase tracking-[4px]">
                    Official Receipt
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-8 border-b border-[#2a2e43] border-dashed pb-6">
                <View>
                  <Text className="text-slate-500 text-[9px] font-black uppercase tracking-[3px] mb-1">
                    Date & Time
                  </Text>
                  <Text className="text-slate-200 font-bold text-xs">
                    {selectedOrder &&
                      new Date(selectedOrder.createdAt).toLocaleString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-500 text-[9px] font-black uppercase tracking-[3px] mb-1">
                    Order No.
                  </Text>
                  <Text className="text-slate-200 font-bold text-xs">
                    #{selectedOrder?.id?.slice(-6).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="mb-6">
                {selectedOrder?.items.map((item: any, idx: number) => {
                  const subTotal =
                    item.quantity * Number(item.product?.sellingPrice || 0);
                  return (
                    <View
                      key={idx}
                      className="flex-row justify-between items-center mb-4"
                    >
                      <View className="flex-1">
                        <Text className="text-slate-100 font-bold text-sm tracking-wide">
                          {item.product?.name}
                        </Text>
                        <Text className="text-slate-500 font-black text-[10px] mt-0.5">
                          {item.quantity} x $
                          {Number(item.product?.sellingPrice || 0).toFixed(2)}
                        </Text>
                      </View>
                      <Text className="text-slate-100 font-black text-base">
                        ${subTotal.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View className="border-t border-[#2a2e43] border-dashed pt-6 mt-2">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-slate-400 font-black text-[10px] uppercase tracking-[2px]">
                    Payment Method
                  </Text>
                  <Text className="text-slate-200 font-bold text-sm">
                    {selectedOrder?.paymentMethod.replace("_", " ")}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-400 font-black text-[10px] uppercase tracking-[2px]">
                    Status
                  </Text>
                  <Text
                    className={`font-bold text-sm ${selectedOrder?.status === "COMPLETED" ? "text-emerald-400" : selectedOrder?.status === "REFUNDED" ? "text-rose-400" : "text-amber-400"}`}
                  >
                    {selectedOrder?.status}
                  </Text>
                </View>
              </View>

              <View className="bg-[#121420] mt-8 p-6 rounded-[24px] border border-[#2a2e43] flex-row justify-between items-center">
                <Text className="text-slate-500 font-black text-sm uppercase tracking-[4px]">
                  Grand Total
                </Text>
                <Text className="text-3xl font-extrabold text-indigo-400">
                  $
                  {selectedOrder?.items
                    .reduce(
                      (acc: number, item: any) =>
                        acc +
                        item.quantity * Number(item.product?.sellingPrice || 0),
                      0,
                    )
                    .toFixed(2)}
                </Text>
              </View>

              {/* Print and Refund Actions */}
              <View className="mt-8 gap-3">
                <TouchableOpacity
                  onPress={handlePrintThermal}
                  className="bg-indigo-600 py-5 rounded-[20px] items-center shadow-lg border border-indigo-400/30 flex-row justify-center gap-3"
                >
                  {/* <Text className="text-xl">🖨️</Text> */}
                  <MaterialIcons name="print" size={20} color="white" />
                  <Text className="text-white font-extrabold tracking-widest uppercase text-xs">
                    Print Thermal Invoice
                  </Text>
                </TouchableOpacity>

                {selectedOrder?.status !== "REFUNDED" && role !== "CASHIER" && (
                  <TouchableOpacity
                    onPress={handleRefund}
                    disabled={isRefunding}
                    className="bg-rose-500/10 py-5 rounded-[20px] items-center border border-rose-500/20"
                  >
                    {isRefunding ? (
                      <ActivityIndicator color="#fb7185" />
                    ) : (
                      <Text className="text-rose-400 font-extrabold tracking-widest uppercase text-xs">
                        Refund Transaction
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </Modal>
      {/* Refund Success & Print Prompt Modal */}
      <Modal
        visible={!!refundSuccessOrder}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRefundSuccessOrder(null)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            className="bg-[#1f2232] rounded-[32px] p-6 border border-indigo-500/30 w-full max-w-sm shadow-2xl items-center"
          >
            <View className="w-16 h-16 bg-emerald-500/10 rounded-full border border-emerald-500/20 items-center justify-center mb-4">
              {/* <Text className="text-3xl">🎉</Text> */}
              <MaterialIcons name="check-circle" size={40} color="#10b981" />
            </View>
            <Text className="text-white text-xl font-extrabold tracking-tight text-center mb-2">
              Refund Successful
            </Text>
            <Text className="text-slate-400 text-xs text-center font-bold mb-6 leading-5">
              The transaction has been fully refunded. Would you like to print
              the official thermal refund receipt?
            </Text>

            <TouchableOpacity
              onPress={async () => {
                if (!refundSuccessOrder) return;
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const total = refundSuccessOrder.items.reduce(
                    (acc: number, item: any) =>
                      acc +
                      item.quantity * Number(item.product?.sellingPrice || 0),
                    0,
                  );
                  const dateStr = new Date().toLocaleString();
                  const itemsHtml = refundSuccessOrder.items
                    .map(
                      (item: any) => `
                    <tr>
                      <td style="padding: 5px 0; color: #ff3333;">[REFUNDED] ${item.quantity}x ${item.product?.name}</td>
                      <td style="text-align: right; padding: 5px 0; color: #ff3333;">-$${(item.quantity * Number(item.product?.sellingPrice || 0)).toFixed(2)}</td>
                    </tr>
                  `,
                    )
                    .join("");

                  const html = `
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                          body { font-family: 'Courier New', Courier, monospace; font-size: 14px; color: #000; padding: 20px; text-align: center; }
                          .header { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                          .sub { font-size: 12px; margin-bottom: 20px; }
                          .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
                          table { width: 100%; border-collapse: collapse; }
                          td { font-size: 14px; }
                          .total-row { font-size: 18px; font-weight: bold; color: #ff3333; }
                          .footer { font-size: 12px; margin-top: 30px; }
                          .badge { display: inline-block; padding: 3px 8px; border: 1px solid #000; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
                        </style>
                      </head>
                      <body>
                        <div class="badge">REFUND TRANSACTION</div>
                        <div class="header">${currentStore?.name || "MidnightCorner"}</div>
                        <div class="sub">${currentStore?.address || "Downtown Terminal"}<br/>Tel: ${currentStore?.phone || "--"}</div>
                        
                        <div style="text-align: left; font-size: 12px;">
                          <div>Orig Order: #${refundSuccessOrder.id.slice(-6).toUpperCase()}</div>
                          <div>Refund Date: ${dateStr}</div>
                          <div>Cashier: System</div>
                        </div>

                        <div class="divider"></div>
                        
                        <table>
                          <tbody>
                            ${itemsHtml}
                          </tbody>
                        </table>
                        
                        <div class="divider"></div>
                        
                        <table style="margin-top: 10px;">
                          <tr class="total-row">
                            <td style="text-align: left;">REFUNDED TOTAL</td>
                            <td style="text-align: right;">-$${total.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style="text-align: left; padding-top: 10px; color: #666;">Refunded to</td>
                            <td style="text-align: right; padding-top: 10px; color: #666;">${refundSuccessOrder.paymentMethod.replace("_", " ")}</td>
                          </tr>
                        </table>
                        
                        <div class="divider"></div>
                        
                        <div class="footer">
                          <div>Refund processed successfully.</div>
                          <div>MidnightCorner Retail Systems</div>
                        </div>
                      </body>
                    </html>
                  `;

                  await Print.printAsync({ html });
                  setRefundSuccessOrder(null);
                } catch (error) {
                  console.error("Refund print error:", error);
                  Alert.alert(
                    "Print Error",
                    "Failed to print the refund receipt.",
                  );
                }
              }}
              className="bg-[#e11d48] w-full py-4.5 rounded-[20px] items-center mb-3 shadow-lg border border-rose-400/20 flex-row justify-center gap-2"
            >
              {/* <Text className="text-lg">🖨️</Text> */}
              <MaterialIcons name="print" size={20} color="white" />
              <Text className="text-white font-extrabold tracking-widest uppercase text-xs">
                Print Refund Receipt
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRefundSuccessOrder(null)}
              className="bg-[#121420] w-full py-4 rounded-[20px] items-center border border-[#2a2e43]"
            >
              <Text className="text-slate-400 font-extrabold tracking-widest uppercase text-xs">
                Close & Dismiss
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
