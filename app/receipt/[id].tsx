import {
  ActionButton,
  Card,
  Divider,
  Header,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetLocalCustomersQuery,
  useGetLocalOrderByIdQuery,
  useGetLocalStoresQuery,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

// ============================================
// THERMAL RECEIPT FORMATTER
// ============================================

function formatThermalReceipt(
  order: any,
  customer: any,
  store: any,
  receiptNumber: string,
): string {
  const lines: string[] = [];
  const width = 48; // 80mm thermal printer width

  // Center text helper
  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text;
  };

  const divider = "=".repeat(width);
  const thinDivider = "-".repeat(width);

  // Header
  lines.push(center(store?.name || "POS SYSTEM"));
  lines.push(center(store?.address || ""));
  lines.push(center(store?.phone || ""));
  lines.push(center(`Tel: ${store?.phone || ""}`));
  lines.push(divider);
  lines.push("");

  // Receipt Info
  lines.push(`Receipt #: ${receiptNumber}`);
  lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  lines.push(`Order: ${order.id.slice(-8)}`);
  lines.push(`Customer: ${customer?.name || "Walk-in"}`);
  lines.push(`Payment: ${order.paymentMethod || "CASH"}`);
  lines.push(`Status: ${order.status || "COMPLETED"}`);
  lines.push("");
  lines.push(thinDivider);
  lines.push("");

  // Items
  lines.push("ITEM           QTY  PRICE   TOTAL");
  lines.push(thinDivider);

  for (const item of order.items || []) {
    const name = (item.productName || "Item").slice(0, 15).padEnd(15);
    const qty = String(item.quantity).padStart(4);
    const price =
      `$${Number(item.unitPrice || item.price).toFixed(2)}`.padStart(7);
    const total =
      `$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}`.padStart(
        7,
      );
    lines.push(`${name} ${qty} ${price} ${total}`);
  }

  lines.push("");
  lines.push(thinDivider);
  lines.push("");

  // Totals
  lines.push(
    `Subtotal:     $${Number(order.subTotal ?? 0).toFixed(2)}`.padStart(width),
  );
  lines.push(
    `Tax:          $${Number(order.taxAmount ?? 0).toFixed(2)}`.padStart(width),
  );
  if (order.discountAmount > 0) {
    lines.push(
      `Discount:    -$${Number(order.discountAmount ?? 0).toFixed(2)}`.padStart(
        width,
      ),
    );
  }
  lines.push(divider);
  lines.push(
    `TOTAL:        $${Number(order.grandTotal ?? 0).toFixed(2)}`.padStart(
      width,
    ),
  );
  lines.push(thinDivider);
  lines.push(
    `Paid:         $${Number(order.paidAmount ?? 0).toFixed(2)}`.padStart(
      width,
    ),
  );
  lines.push(
    `Change:       $${Number(order.changeAmount ?? 0).toFixed(2)}`.padStart(
      width,
    ),
  );
  lines.push("");

  // Payment Breakdown
  if (order.paymentBreakdown?.length > 0) {
    lines.push(thinDivider);
    for (const tender of order.paymentBreakdown) {
      lines.push(`${tender.method}: $${Number(tender.amount).toFixed(2)}`);
    }
    lines.push("");
  }

  // Footer
  lines.push(divider);
  lines.push(center("THANK YOU!"));
  lines.push(center("Have a great day!"));
  lines.push("");
  lines.push(center(receiptNumber));
  lines.push(center(`Printed: ${new Date().toLocaleString()}`));

  return lines.join("\n");
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReceiptScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: order,
    isLoading: isOrderLoading,
    refetch,
  } = useGetLocalOrderByIdQuery(id);
  const { data: customers = [] } = useGetLocalCustomersQuery({});
  const { data: stores = [] } = useGetLocalStoresQuery({});

  const offline = useAppSelector((state) => state.offline);
  const qrRef = useRef<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const receiptNumber = useMemo(() => {
    if (!order?.id) return "RCPT-XXXX";
    return `RCPT-${order.id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-8)
      .toUpperCase()}`;
  }, [order?.id]);

  const customer = useMemo(
    () => customers.find((item: any) => item.id === order?.customerId),
    [customers, order?.customerId],
  );

  const store = useMemo(
    () => stores.find((item: any) => item.id === order?.storeId),
    [stores, order?.storeId],
  );

  useEffect(() => {
    setQrDataUrl(null);
    if (!order?.id || !qrRef.current?.toDataURL) return;
    qrRef.current.toDataURL((data: string) => {
      setQrDataUrl(`data:image/png;base64,${data}`);
    });
  }, [order?.id, receiptNumber]);

  // ============================================
  // HTML RECEIPT BUILDER
  // ============================================

  const buildReceiptHtml = () => {
    const itemsHtml =
      order?.items
        ?.map(
          (item: any) => `
          <tr>
            <td>${escapeHtml(item.productName || "Item")}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">$${Number(item.unitPrice || item.price).toFixed(2)}</td>
            <td style="text-align:right;">$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}</td>
          </tr>`,
        )
        .join("") ?? "";

    const tenderHtml =
      order?.paymentBreakdown
        ?.map(
          (tender: any) => `
          <tr>
            <td>${escapeHtml(tender.method)}</td>
            <td style="text-align:right;">$${Number(tender.amount).toFixed(2)}</td>
          </tr>`,
        )
        .join("") ?? "";

    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              padding: 16px;
              max-width: 300px;
              margin: 0 auto;
            }
            .center { text-align: center; }
            .brand { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .thin-divider { border-top: 1px dotted #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 4px 0; text-align: left; }
            .right { text-align: right; }
            .bold { font-weight: 700; }
            .text-muted { color: #666; }
            .qr { text-align: center; margin: 12px 0; }
            .qr img { width: 100px; height: 100px; }
            .footer { margin-top: 16px; text-align: center; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="brand">${escapeHtml(store?.name || "POS SYSTEM")}</div>
            <div class="text-muted">${escapeHtml(store?.address || "")}</div>
            <div class="text-muted">${escapeHtml(store?.phone || "")}</div>
            <div class="divider"></div>
            <div><strong>Receipt #:</strong> ${escapeHtml(receiptNumber)}</div>
            <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
            <div><strong>Customer:</strong> ${escapeHtml(customer?.name || "Walk-in")}</div>
            <div><strong>Payment:</strong> ${escapeHtml(order.paymentMethod || "CASH")}</div>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="thin-divider"></div>
          <table>
            <tbody>
              <tr><td>Subtotal</td><td class="right">$${Number(order.subTotal ?? 0).toFixed(2)}</td></tr>
              <tr><td>Tax</td><td class="right">$${Number(order.taxAmount ?? 0).toFixed(2)}</td></tr>
              ${order.discountAmount > 0 ? `<tr><td>Discount</td><td class="right">-$${Number(order.discountAmount).toFixed(2)}</td></tr>` : ""}
              <tr class="bold"><td>TOTAL</td><td class="right">$${Number(order.grandTotal ?? 0).toFixed(2)}</td></tr>
              <tr><td>Paid</td><td class="right">$${Number(order.paidAmount ?? 0).toFixed(2)}</td></tr>
              <tr><td>Change</td><td class="right">$${Number(order.changeAmount ?? 0).toFixed(2)}</td></tr>
            </tbody>
          </table>
          ${
            order.paymentBreakdown?.length > 0
              ? `
            <div class="thin-divider"></div>
            <table>
              <tbody>
                ${tenderHtml}
              </tbody>
            </table>
          `
              : ""
          }
          ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="QR" /></div>` : ""}
          <div class="divider"></div>
          <div class="center">
            <div><strong>THANK YOU!</strong></div>
            <div class="text-muted">Have a great day!</div>
            <div class="text-muted" style="margin-top:8px;font-size:10px;">${receiptNumber}</div>
          </div>
        </body>
      </html>`;
  };

  // ============================================
  // PRINT TO THERMAL PRINTER
  // ============================================

  const printThermalReceipt = async () => {
    if (!order) return;

    setIsPrinting(true);
    try {
      // Check if the device supports thermal printing
      const isAvailable = await Print.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert(
          "Not Available",
          "Printing is not available on this device.",
        );
        setIsPrinting(false);
        return;
      }

      // For POS-5890U, use the thermal receipt format
      // Since thermal printers work best with simple text, we'll use the HTML version
      // but formatted for thermal printer dimensions
      await Print.printAsync({
        html: buildReceiptHtml(),
        printerUrl: null, // Uses default printer
        orientation: Print.Orientation.portrait,
        margins: {
          left: 5,
          top: 5,
          right: 5,
          bottom: 5,
        },
      });
    } catch (error: any) {
      // If thermal printing fails, try alternative
      if (error.message?.includes("No print service")) {
        Alert.alert(
          "Print Service",
          "No print service found. Would you like to save as PDF?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save PDF", onPress: saveAsPDF },
          ],
        );
      } else {
        Alert.alert(
          "Print Failed",
          error?.message || "Unable to print receipt.",
        );
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // ============================================
  // SAVE AS PDF
  // ============================================

  const saveAsPDF = async () => {
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildReceiptHtml(),
        base64: false,
      });

      Alert.alert("PDF Created", `Receipt saved to:\n${uri}`, [
        { text: "Cancel", style: "cancel" },
        { text: "Share", onPress: () => Sharing.shareAsync(uri) },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save PDF.");
    }
  };

  // ============================================
  // SHARE RECEIPT
  // ============================================

  const shareReceipt = async () => {
    if (!order) return;

    const text = formatThermalReceipt(order, customer, store, receiptNumber);
    await Share.share({ message: text });
  };

  // ============================================
  // REFRESH
  // ============================================

  const handleRefresh = () => {
    refetch();
  };

  if (isOrderLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <View className="h-16 w-16 rounded-full border-4 border-sky-500/30 border-t-sky-500 animate-spin" />
          <Text className="text-slate-400 mt-4 text-sm">
            Loading receipt...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-5">
          <View className="h-20 w-20 bg-rose-500/10 rounded-full items-center justify-center border border-rose-500/20">
            <MaterialIcons name="receipt-long" size={40} color="#f87171" />
          </View>
          <Text className="text-white text-xl font-bold mt-4">
            Receipt Not Found
          </Text>
          <Text className="text-slate-400 text-center mt-2">
            The order you're looking for doesn't exist or hasn't been synced
            yet.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-sky-500 px-6 py-3 rounded-xl"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          className="px-5"
        >
          {/* Header */}
          <View className="pt-6 pb-2">
            <Header
              eyebrow="Receipt"
              title={`Order ${order.id.slice(-6).toUpperCase()}`}
              subtitle="Local-first confirmation screen"
              right={
                <View className="items-end">
                  <Pill
                    label={offline.isOnline ? "Online" : "Offline"}
                    tone={offline.isOnline ? "emerald" : "rose"}
                  />
                  <TouchableOpacity
                    onPress={handleRefresh}
                    className="mt-1 bg-white/10 p-1.5 rounded-full"
                  >
                    <MaterialIcons name="refresh" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                  <Text className="text-slate-500 text-[10px] mt-1">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              }
            />
          </View>

          {/* Success Status */}
          <Card className="mb-4">
            <View className="items-center py-3">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15">
                <MaterialIcons name="check-circle" size={36} color="#34d399" />
              </View>
              <Text className="text-xl font-black text-white">
                Payment Confirmed
              </Text>
              <Text className="mt-1 text-sm text-slate-400">
                {receiptNumber} •{" "}
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Divider />
            <StatRow label="Order ID" value={order.id} />
            <StatRow label="Receipt #" value={receiptNumber} />
            <StatRow label="Payment" value={order.paymentMethod ?? "CASH"} />
            <StatRow label="Customer" value={customer?.name ?? "Walk-in"} />
            <StatRow
              label="Status"
              value={order.status ?? "COMPLETED"}
              valueColor={
                order.status === "COMPLETED"
                  ? "#34d399"
                  : order.status === "PENDING"
                    ? "#fbbf24"
                    : "#f87171"
              }
            />
          </Card>

          {/* QR Code */}
          <Card className="mb-4">
            <View className="items-center py-4">
              <Text className="text-[10px] font-bold uppercase tracking-[4px] text-slate-500">
                Receipt QR
              </Text>
              <View className="mt-4 rounded-[28px] bg-white p-4">
                <QRCode
                  getRef={qrRef}
                  value={JSON.stringify({ orderId: order.id, receiptNumber })}
                  size={176}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
              </View>
              <Text className="mt-4 text-sm font-semibold text-white">
                {receiptNumber}
              </Text>
              <Text className="mt-2 text-center text-xs text-slate-400 max-w-xs">
                Scan to reopen this receipt quickly
              </Text>
            </View>
          </Card>

          {/* Items */}
          <SectionTitle title="Items" />
          <Card className="mb-4">
            {order.items?.length ? (
              order.items.map((item: any, index: number) => (
                <View key={item.id}>
                  <RowItem
                    title={item.productName || "Item"}
                    subtitle={`${item.quantity} x $${Number(item.unitPrice || item.price).toFixed(2)}`}
                    right={`$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}`}
                    icon="shopping-bag"
                  />
                  {index < order.items.length - 1 ? (
                    <View className="my-3 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-8 text-center text-sm text-slate-400">
                No items found
              </Text>
            )}
          </Card>

          {/* Summary */}
          <SectionTitle title="Summary" />
          <Card className="mb-4">
            <StatRow
              label="Subtotal"
              value={`$${Number(order.subTotal ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Tax"
              value={`$${Number(order.taxAmount ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Discount"
              value={`-$${Number(order.discountAmount ?? 0).toFixed(2)}`}
              valueColor="#fbbf24"
            />
            <Divider />
            <StatRow
              label="Total"
              value={`$${Number(order.grandTotal ?? 0).toFixed(2)}`}
              valueColor="#34d399"
              bold
            />
            <StatRow
              label="Paid"
              value={`$${Number(order.paidAmount ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Change"
              value={`$${Number(order.changeAmount ?? 0).toFixed(2)}`}
              valueColor="#94a3b8"
            />
          </Card>

          {/* Payment Breakdown */}
          {order.paymentBreakdown?.length > 0 && (
            <>
              <SectionTitle title="Payment Breakdown" />
              <Card className="mb-4">
                {order.paymentBreakdown.map((tender: any, index: number) => (
                  <View key={`${tender.method}-${index}`}>
                    <StatRow
                      label={tender.method}
                      value={`$${Number(tender.amount).toFixed(2)}`}
                    />
                    {index < order.paymentBreakdown.length - 1 ? (
                      <View className="my-2 h-px bg-white/8" />
                    ) : null}
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Actions */}
          <View className="flex-row gap-3 mt-2">
            <ActionButton
              title="New Sale"
              icon="add-shopping-cart"
              accent="emerald"
              onPress={() => router.replace("/(tabs)/pos")}
            />
            <ActionButton
              title={isPrinting ? "Printing..." : "Print"}
              icon="print"
              accent="sky"
              onPress={printThermalReceipt}
              disabled={isPrinting}
            />
          </View>

          <View className="mt-3 flex-row gap-3">
            <ActionButton
              title="Share"
              icon="share"
              accent="amber"
              onPress={shareReceipt}
            />
            <ActionButton
              title="PDF"
              icon="picture-as-pdf"
              accent="rose"
              onPress={saveAsPDF}
            />
            <ActionButton
              title="Back"
              icon="arrow-back"
              accent="slate"
              onPress={() => router.back()}
            />
          </View>

          {/* Offline Status */}
          <View className="mt-6 items-center">
            <View className="flex-row items-center gap-2">
              <View
                className={`h-2 w-2 rounded-full ${
                  offline.isOnline ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <Text className="text-slate-500 text-xs">
                {offline.isOnline
                  ? "This receipt is synced with the server"
                  : "This receipt is stored locally and will sync when online"}
              </Text>
            </View>
            <Text className="text-slate-600 text-[10px] mt-1">
              {offline.isSyncing
                ? "⏳ Syncing..."
                : `Last synced: ${offline.lastSyncAt ? new Date(offline.lastSyncAt).toLocaleString() : "Never"}`}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function escapeHtml(value: string) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// // ============================================
// // FILE: app/(tabs)/receipt/[id].tsx
// // ============================================

// import {
//   ActionButton,
//   Card,
//   Divider,
//   Header,
//   Pill,
//   RowItem,
//   Screen,
//   SectionTitle,
//   StatRow,
// } from "@/components/app-ui";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import {
//   useGetActiveSessionQuery,
//   useGetLocalCustomersQuery,
//   useGetLocalOrderByIdQuery,
//   useGetLocalStoresQuery,
// } from "@/services/features/offline/localApi";
// import { MaterialIcons } from "@expo/vector-icons";
// import * as Print from "expo-print";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//   Alert,
//   ScrollView,
//   Share,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import QRCode from "react-native-qrcode-svg";
// import { SafeAreaView } from "react-native-safe-area-context";

// export default function ReceiptScreen() {
//   const router = useRouter();
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const user = useAppSelector((state) => state.auth.user);

//   // ✅ Use offline-first queries
//   const { data: order, isLoading: isOrderLoading } =
//     useGetLocalOrderByIdQuery(id);
//   const { data: customers = [] } = useGetLocalCustomersQuery({});
//   const { data: stores = [] } = useGetLocalStoresQuery({});
//   const { data: activeSession } = useGetActiveSessionQuery({
//     userId: user?.id || "",
//   });

//   const offline = useAppSelector((state) => state.offline);
//   const qrRef = useRef<any>(null);
//   const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

//   const receiptNumber = useMemo(() => {
//     if (!order?.id) return "RCPT-XXXX";
//     return `RCPT-${order.id
//       .replace(/[^a-zA-Z0-9]/g, "")
//       .slice(-8)
//       .toUpperCase()}`;
//   }, [order?.id]);

//   const customer = useMemo(
//     () => customers.find((item: any) => item.id === order?.customerId),
//     [customers, order?.customerId],
//   );

//   const store = useMemo(
//     () => stores.find((item: any) => item.id === order?.storeId),
//     [stores, order?.storeId],
//   );

//   useEffect(() => {
//     setQrDataUrl(null);
//     if (!order?.id || !qrRef.current?.toDataURL) return;
//     qrRef.current.toDataURL((data: string) => {
//       setQrDataUrl(`data:image/png;base64,${data}`);
//     });
//   }, [order?.id, receiptNumber]);

//   const buildReceiptHtml = () => {
//     const itemsHtml =
//       order?.items
//         ?.map(
//           (item: any) => `
//           <tr>
//             <td>${escapeHtml(item.productName || "Item")}</td>
//             <td style="text-align:right;">${item.quantity}</td>
//             <td style="text-align:right;">$${Number(item.unitPrice || item.price).toFixed(2)}</td>
//             <td style="text-align:right;">$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}</td>
//           </tr>`,
//         )
//         .join("") ?? "";

//     const tenderHtml =
//       order?.paymentBreakdown
//         ?.map(
//           (tender: any) => `
//           <tr>
//             <td>${escapeHtml(tender.method)}</td>
//             <td style="text-align:right;">$${Number(tender.amount).toFixed(2)}</td>
//           </tr>`,
//         )
//         .join("") ?? "";

//     return `<!doctype html>
//       <html>
//         <head>
//           <meta charset="utf-8" />
//           <meta name="viewport" content="width=device-width, initial-scale=1" />
//           <style>
//             body {
//               font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
//               color: #111827;
//               padding: 18px;
//             }
//             .brand {
//               font-size: 22px;
//               font-weight: 800;
//               margin-bottom: 4px;
//             }
//             .sub {
//               color: #6b7280;
//               font-size: 12px;
//             }
//             .divider {
//               border-top: 1px dashed #d1d5db;
//               margin: 14px 0;
//             }
//             table {
//               width: 100%;
//               border-collapse: collapse;
//               font-size: 12px;
//             }
//             th, td {
//               padding: 6px 0;
//             }
//             th {
//               color: #6b7280;
//               text-align: left;
//               border-bottom: 1px solid #e5e7eb;
//             }
//             .summary td {
//               padding: 4px 0;
//             }
//             .right {
//               text-align: right;
//             }
//             .receipt-head {
//               display: flex;
//               justify-content: space-between;
//               align-items: flex-start;
//               gap: 16px;
//             }
//             .qr {
//               width: 110px;
//               text-align: center;
//             }
//             .qr img {
//               width: 110px;
//               height: 110px;
//             }
//             .receipt-number {
//               font-size: 12px;
//               letter-spacing: 2px;
//               font-weight: 700;
//               margin-top: 6px;
//               color: #111827;
//             }
//           </style>
//         </head>
//         <body>
//           <div class="receipt-head">
//             <div>
//               <div class="brand">${escapeHtml(store?.name ?? "POS Receipt")}</div>
//               <div class="sub">${escapeHtml(store?.address ?? "Store copy")}</div>
//               <div class="receipt-number">${escapeHtml(receiptNumber)}</div>
//             </div>
//             ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="Receipt QR" /><div class="sub">Scan to reopen</div></div>` : ""}
//           </div>
//           <div class="divider"></div>
//           <div><strong>Order:</strong> ${escapeHtml(order?.id ?? "")}</div>
//           <div><strong>Receipt No:</strong> ${escapeHtml(receiptNumber)}</div>
//           <div><strong>Customer:</strong> ${escapeHtml(customer?.name ?? "Walk-in")}</div>
//           <div><strong>Payment:</strong> ${escapeHtml(order?.paymentMethod ?? "CASH")}</div>
//           <div><strong>Status:</strong> ${escapeHtml(order?.status ?? "")}</div>
//           <div class="divider"></div>
//           <table>
//             <thead>
//               <tr>
//                 <th>Item</th>
//                 <th class="right">Qty</th>
//                 <th class="right">Price</th>
//                 <th class="right">Total</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${itemsHtml}
//             </tbody>
//           </table>
//           <div class="divider"></div>
//           <table class="summary">
//             <tbody>
//               <tr><td>Subtotal</td><td class="right">$${Number(order?.subTotal ?? 0).toFixed(2)}</td></tr>
//               <tr><td>Tax</td><td class="right">$${Number(order?.taxAmount ?? 0).toFixed(2)}</td></tr>
//               <tr><td>Discount</td><td class="right">$${Number(order?.discountAmount ?? 0).toFixed(2)}</td></tr>
//               <tr><td><strong>Total</strong></td><td class="right"><strong>$${Number(order?.grandTotal ?? 0).toFixed(2)}</strong></td></tr>
//               <tr><td>Paid</td><td class="right">$${Number(order?.paidAmount ?? 0).toFixed(2)}</td></tr>
//               <tr><td>Change</td><td class="right">$${Number(order?.changeAmount ?? 0).toFixed(2)}</td></tr>
//             </tbody>
//           </table>
//           <div class="divider"></div>
//           <table class="summary">
//             <tbody>
//               ${tenderHtml}
//             </tbody>
//           </table>
//         </body>
//       </html>`;
//   };

//   const shareReceipt = async () => {
//     if (!order) return;
//     const text = [
//       `🧾 ${store?.name || "POS"} Receipt`,
//       `━━━━━━━━━━━━━━━━━━`,
//       `Receipt #: ${receiptNumber}`,
//       `Order ID: ${order.id}`,
//       `Customer: ${customer?.name || "Walk-in"}`,
//       `Status: ${order.status}`,
//       `Payment: ${order.paymentMethod ?? "CASH"}`,
//       `━━━━━━━━━━━━━━━━━━`,
//       `Subtotal: $${Number(order.subTotal ?? 0).toFixed(2)}`,
//       `Tax: $${Number(order.taxAmount ?? 0).toFixed(2)}`,
//       `Discount: $${Number(order.discountAmount ?? 0).toFixed(2)}`,
//       `Total: $${Number(order.grandTotal ?? 0).toFixed(2)}`,
//       `Paid: $${Number(order.paidAmount ?? 0).toFixed(2)}`,
//       `Change: $${Number(order.changeAmount ?? 0).toFixed(2)}`,
//       `━━━━━━━━━━━━━━━━━━`,
//       `${new Date(order.createdAt).toLocaleString()}`,
//     ].join("\n");
//     await Share.share({ message: text });
//   };

//   const printReceipt = async () => {
//     try {
//       await Print.printAsync({ html: buildReceiptHtml() });
//     } catch (error: any) {
//       Alert.alert("Print failed", error?.message || "Unable to print receipt.");
//     }
//   };

//   const handleNewSale = () => {
//     // router.replace("/pos");
//     router.back();
//   };

//   if (isOrderLoading) {
//     return (
//       <Screen>
//         <View className="flex-1 items-center justify-center">
//           <View className="h-16 w-16 rounded-full border-4 border-sky-500/30 border-t-sky-500 animate-spin" />
//           <Text className="text-slate-400 mt-4 text-sm">
//             Loading receipt...
//           </Text>
//         </View>
//       </Screen>
//     );
//   }

//   if (!order) {
//     return (
//       <Screen>
//         <View className="flex-1 items-center justify-center px-5">
//           <View className="h-20 w-20 bg-rose-500/10 rounded-full items-center justify-center border border-rose-500/20">
//             <MaterialIcons name="receipt-long" size={40} color="#f87171" />
//           </View>
//           <Text className="text-white text-xl font-bold mt-4">
//             Receipt Not Found
//           </Text>
//           <Text className="text-slate-400 text-center mt-2">
//             The order you're looking for doesn't exist or hasn't been synced
//             yet.
//           </Text>
//           <TouchableOpacity
//             className="mt-6 bg-sky-500 px-6 py-3 rounded-xl"
//             onPress={() => router.back()}
//           >
//             <Text className="text-white font-bold">Go Back</Text>
//           </TouchableOpacity>
//         </View>
//       </Screen>
//     );
//   }

//   return (
//     <Screen padded={false}>
//       <SafeAreaView className="flex-1">
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 28 }}
//           className="px-5"
//         >
//           {/* Header */}
//           <View className="pt-6 pb-2">
//             <Header
//               eyebrow="Receipt"
//               title={`Order ${order.id.slice(-6).toUpperCase()}`}
//               subtitle="Local-first confirmation screen"
//               right={
//                 <View className="items-end">
//                   <Pill
//                     label={offline.isOnline ? "Online" : "Offline"}
//                     tone={offline.isOnline ? "emerald" : "rose"}
//                   />
//                   <Text className="text-slate-500 text-[10px] mt-1">
//                     {new Date(order.createdAt).toLocaleTimeString()}
//                   </Text>
//                 </View>
//               }
//             />
//           </View>

//           {/* Success Status */}
//           <Card className="mb-4">
//             <View className="items-center py-3">
//               <View className="mb-3 h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15">
//                 <MaterialIcons name="check-circle" size={36} color="#34d399" />
//               </View>
//               <Text className="text-xl font-black text-white">
//                 Payment Confirmed
//               </Text>
//               <Text className="mt-1 text-sm text-slate-400">
//                 {receiptNumber} •{" "}
//                 {new Date(order.createdAt).toLocaleDateString()}
//               </Text>
//             </View>
//             <Divider />
//             <StatRow label="Order ID" value={order.id} />
//             <StatRow label="Receipt #" value={receiptNumber} />
//             <StatRow label="Payment" value={order.paymentMethod ?? "CASH"} />
//             <StatRow label="Customer" value={customer?.name ?? "Walk-in"} />
//             <StatRow
//               label="Status"
//               value={order.status ?? "COMPLETED"}
//               valueColor={
//                 order.status === "COMPLETED"
//                   ? "#34d399"
//                   : order.status === "PENDING"
//                     ? "#fbbf24"
//                     : "#f87171"
//               }
//             />
//           </Card>

//           {/* QR Code */}
//           <Card className="mb-4">
//             <View className="items-center py-4">
//               <Text className="text-[10px] font-bold uppercase tracking-[4px] text-slate-500">
//                 Receipt QR
//               </Text>
//               <View className="mt-4 rounded-[28px] bg-white p-4">
//                 <QRCode
//                   getRef={qrRef}
//                   value={JSON.stringify({ orderId: order.id, receiptNumber })}
//                   size={176}
//                   backgroundColor="#ffffff"
//                   color="#000000"
//                 />
//               </View>
//               <Text className="mt-4 text-sm font-semibold text-white">
//                 {receiptNumber}
//               </Text>
//               <Text className="mt-2 text-center text-xs text-slate-400 max-w-xs">
//                 Scan to reopen this receipt quickly
//               </Text>
//             </View>
//           </Card>

//           {/* Items */}
//           <SectionTitle title="Items" />
//           <Card className="mb-4">
//             {order.items?.length ? (
//               order.items.map((item: any, index: number) => (
//                 <View key={item.id}>
//                   <RowItem
//                     title={item.productName || "Item"}
//                     subtitle={`${item.quantity} x $${Number(item.unitPrice || item.price).toFixed(2)}`}
//                     right={`$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}`}
//                     icon="shopping-bag"
//                   />
//                   {index < order.items.length - 1 ? (
//                     <View className="my-3 h-px bg-white/8" />
//                   ) : null}
//                 </View>
//               ))
//             ) : (
//               <Text className="py-8 text-center text-sm text-slate-400">
//                 No items found
//               </Text>
//             )}
//           </Card>

//           {/* Summary */}
//           <SectionTitle title="Summary" />
//           <Card className="mb-4">
//             <StatRow
//               label="Subtotal"
//               value={`$${Number(order.subTotal ?? 0).toFixed(2)}`}
//             />
//             <StatRow
//               label="Tax"
//               value={`$${Number(order.taxAmount ?? 0).toFixed(2)}`}
//             />
//             <StatRow
//               label="Discount"
//               value={`-$${Number(order.discountAmount ?? 0).toFixed(2)}`}
//               valueColor="#fbbf24"
//             />
//             <Divider />
//             <StatRow
//               label="Total"
//               value={`$${Number(order.grandTotal ?? 0).toFixed(2)}`}
//               valueColor="#34d399"
//               bold
//             />
//             <StatRow
//               label="Paid"
//               value={`$${Number(order.paidAmount ?? 0).toFixed(2)}`}
//             />
//             <StatRow
//               label="Change"
//               value={`$${Number(order.changeAmount ?? 0).toFixed(2)}`}
//               valueColor="#94a3b8"
//             />
//           </Card>

//           {/* Payment Breakdown */}
//           {order.paymentBreakdown?.length > 0 && (
//             <>
//               <SectionTitle title="Payment Breakdown" />
//               <Card className="mb-4">
//                 {order.paymentBreakdown.map((tender: any, index: number) => (
//                   <View key={`${tender.method}-${index}`}>
//                     <StatRow
//                       label={tender.method}
//                       value={`$${Number(tender.amount).toFixed(2)}`}
//                     />
//                     {index < order.paymentBreakdown.length - 1 ? (
//                       <View className="my-2 h-px bg-white/8" />
//                     ) : null}
//                   </View>
//                 ))}
//               </Card>
//             </>
//           )}

//           {/* Actions */}
//           <View className="flex-row gap-3 mt-2">
//             <ActionButton
//               title="New Sale"
//               icon="add-shopping-cart"
//               accent="emerald"
//               onPress={handleNewSale}
//             />
//             <ActionButton
//               title="Print"
//               icon="print"
//               accent="sky"
//               onPress={printReceipt}
//             />
//           </View>

//           <View className="mt-3 flex-row gap-3">
//             <ActionButton
//               title="Share"
//               icon="share"
//               accent="amber"
//               onPress={shareReceipt}
//             />
//             <ActionButton
//               title="Back"
//               icon="arrow-back"
//               accent="rose"
//               onPress={() => router.back()}
//             />
//           </View>

//           {/* Offline Status */}
//           <View className="mt-6 items-center">
//             <View className="flex-row items-center gap-2">
//               <View
//                 className={`h-2 w-2 rounded-full ${
//                   offline.isOnline ? "bg-emerald-400" : "bg-amber-400"
//                 }`}
//               />
//               <Text className="text-slate-500 text-xs">
//                 {offline.isOnline
//                   ? "This receipt is synced with the server"
//                   : "This receipt is stored locally and will sync when online"}
//               </Text>
//             </View>
//             <Text className="text-slate-600 text-[10px] mt-1">
//               {offline.isSyncing
//                 ? "⏳ Syncing..."
//                 : `Last synced: ${offline.lastSyncAt ? new Date(offline.lastSyncAt).toLocaleString() : "Never"}`}
//             </Text>
//           </View>
//         </ScrollView>
//       </SafeAreaView>
//     </Screen>
//   );
// }

// function escapeHtml(value: string) {
//   if (!value) return "";
//   return value
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#39;");
// }
