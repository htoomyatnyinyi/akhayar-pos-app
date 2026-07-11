// ============================================
// FILE: app/(tabs)/receipt/[id].tsx
// ============================================

import {
  Card,
  Divider,
  Header,
  MetricCard,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetActiveSessionQuery,
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
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

// ============================================
// BLUETOOTH PRINTER MODAL (Simplified - No Printer)
// ============================================

function BluetoothPrinterModal({
  visible,
  onClose,
  onPrint,
  receiptText,
  isPrinting,
}: {
  visible: boolean;
  onClose: () => void;
  onPrint: () => void;
  receiptText: string;
  isPrinting: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-950 p-5">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-white text-xl font-black">Print Receipt</Text>
          <Pressable onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#94a3b8" />
          </Pressable>
        </View>

        <Card className="mb-6">
          <View className="items-center py-6">
            <View className="h-16 w-16 bg-sky-500/20 rounded-full items-center justify-center mb-4">
              <MaterialIcons name="print" size={32} color="#38bdf8" />
            </View>
            <Text className="text-white font-bold text-lg">
              Print Receipt
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-2">
              This will open the system print dialog. You can select AirPrint,
              save as PDF, or share.
            </Text>
          </View>
        </Card>

        <View className="flex-row gap-3">
          <ActionButton
            title="Cancel"
            icon="close"
            accent="rose"
            onPress={onClose}
          />
          <ActionButton
            title={isPrinting ? "Printing..." : "Print Receipt"}
            icon="print"
            accent="sky"
            onPress={onPrint}
            disabled={isPrinting}
          />
        </View>

        <View className="mt-4">
          <ActionButton
            title="Save as PDF"
            icon="picture-as-pdf"
            accent="amber"
            onPress={async () => {
              try {
                const { uri } = await Print.printToFileAsync({
                  html: buildReceiptHtml(receiptText),
                  base64: false,
                });
                Alert.alert("PDF Created", "Receipt saved to PDF", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Share PDF",
                    onPress: () => Sharing.shareAsync(uri),
                  },
                ]);
                onClose();
              } catch (error: any) {
                Alert.alert("Error", error?.message || "Failed to save PDF.");
              }
            }}
          />
        </View>

        <View className="mt-4">
          <ActionButton
            title="Share Receipt"
            icon="share"
            accent="emerald"
            onPress={() => {
              Share.share({ message: receiptText });
              onClose();
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Helper to build HTML from receipt text
function buildReceiptHtml(receiptText: string) {
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
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          pre {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            margin: 0;
            padding: 0;
          }
          .center { text-align: center; }
        </style>
      </head>
      <body>
        <pre>${receiptText}</pre>
      </body>
    </html>`;
}

// ============================================
// MAIN RECEIPT SCREEN
// ============================================

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAppSelector((state) => state.auth.user);

  // ✅ Offline-first queries
  const { data: order, isLoading: isOrderLoading } =
    useGetLocalOrderByIdQuery(id);
  const { data: customers = [] } = useGetLocalCustomersQuery({});
  const { data: stores = [] } = useGetLocalStoresQuery({});
  const { data: activeSession } = useGetActiveSessionQuery({
    userId: user?.id || "",
  });

  const offline = useAppSelector((state) => state.offline);
  const qrRef = useRef<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

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
  // THERMAL RECEIPT FORMATTER
  // ============================================

  const buildThermalReceiptText = (): string => {
    const lines: string[] = [];
    const width = 48;

    const center = (text: string) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2));
      return " ".repeat(padding) + text;
    };

    const divider = "=".repeat(width);
    const thinDivider = "-".repeat(width);

    // Header
    lines.push(center(store?.name || "POS SYSTEM"));
    lines.push(center(store?.address || ""));
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
      `Subtotal:     $${Number(order.subTotal ?? 0).toFixed(2)}`.padStart(
        width,
      ),
    );
    lines.push(
      `Tax:          $${Number(order.taxAmount ?? 0).toFixed(2)}`.padStart(
        width,
      ),
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
  };

  // ============================================
  // PRINT FUNCTIONS
  // ============================================

  // ✅ Print via expo-print
  const printReceipt = async () => {
    if (!order) return;

    setIsPrinting(true);
    try {
      const html = buildReceiptHtml(buildThermalReceiptText());
      await Print.printAsync({ html });
    } catch (error: any) {
      if (
        error.message?.includes("No print service") ||
        error.message?.includes("not available") ||
        error.code === "E_PRINT_UNAVAILABLE"
      ) {
        Alert.alert(
          "Print Not Available",
          "No print service found. Would you like to save as PDF instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save as PDF", onPress: saveAsPDF },
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

  const saveAsPDF = async () => {
    try {
      const html = buildReceiptHtml(buildThermalReceiptText());
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      Alert.alert("PDF Created", "Receipt saved to PDF", [
        { text: "Cancel", style: "cancel" },
        { text: "Share PDF", onPress: () => Sharing.shareAsync(uri) },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save PDF.");
    }
  };

  const shareReceipt = async () => {
    if (!order) return;
    const text = buildThermalReceiptText();
    await Share.share({ message: text });
  };

  const handlePrintViaModal = async () => {
    setIsPrinting(true);
    try {
      const html = buildReceiptHtml(buildThermalReceiptText());
      await Print.printAsync({ html });
      setShowPrintModal(false);
    } catch (error: any) {
      if (
        error.message?.includes("No print service") ||
        error.message?.includes("not available") ||
        error.code === "E_PRINT_UNAVAILABLE"
      ) {
        Alert.alert(
          "Print Not Available",
          "No print service found. Would you like to save as PDF instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Save as PDF", onPress: saveAsPDF },
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

  const handleNewSale = () => {
    router.replace("/(tabs)/pos");
  };

  // ============================================
  // LOADING / ERROR STATES
  // ============================================

  if (isOrderLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#38bdf8" />
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

  // ============================================
  // MAIN RENDER
  // ============================================

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
          if (order.paymentBreakdown?.length > 0) {
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
          }

          {/* Actions */}
          <View className="flex-row gap-3 mt-2">
            <ActionButton
              title="New Sale"
              icon="add-shopping-cart"
              accent="emerald"
              onPress={handleNewSale}
            />
            <ActionButton
              title={isPrinting ? "Printing..." : "Print"}
              icon="print"
              accent="sky"
              onPress={() => setShowPrintModal(true)}
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

      {/* Print Modal */}
      <BluetoothPrinterModal
        visible={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onPrint={handlePrintViaModal}
        receiptText={buildThermalReceiptText()}
        isPrinting={isPrinting}
      />
    </Screen>
  );
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
// import * as Sharing from "expo-sharing";
// import { useEffect, useMemo, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Modal,
//   Pressable,
//   ScrollView,
//   Share,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import QRCode from "react-native-qrcode-svg";
// import { SafeAreaView } from "react-native-safe-area-context";

// // ============================================
// // Bluetooth Printer Service (REAL - POS-5890U)
// // ============================================
// import { bluetoothPrinterService } from "@/utils/printerService";

// // Alias for backward compatibility within this file
// const bluetoothService = bluetoothPrinterService;

// // ============================================
// // BLUETOOTH PRINTER MODAL
// // ============================================

// interface BluetoothDevice {
//   address: string;
//   name: string;
// }

// function BluetoothPrinterModal({
//   visible,
//   onClose,
//   onConnect,
//   onPrint,
//   receiptText,
//   isPrinting,
// }: {
//   visible: boolean;
//   onClose: () => void;
//   onConnect: (address: string) => void;
//   onPrint: () => void;
//   receiptText: string;
//   isPrinting: boolean;
// }) {
//   const [devices, setDevices] = useState<BluetoothDevice[]>([]);
//   const [isScanning, setIsScanning] = useState(false);
//   const [isConnecting, setIsConnecting] = useState(false);
//   const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

//   const scanForPrinters = async () => {
//     setIsScanning(true);
//     try {
//       const hasPermission = await bluetoothService.requestPermissions();
//       if (!hasPermission) {
//         Alert.alert(
//           "Permission Required",
//           "Please grant Bluetooth permissions in Settings",
//         );
//         setIsScanning(false);
//         return;
//       }

//       // Enable Bluetooth adapter (required before scan)
//       const btEnabled = await bluetoothService.enableBluetooth();
//       if (!btEnabled) {
//         Alert.alert(
//           "Bluetooth Off",
//           "Please turn on Bluetooth to connect your printer",
//         );
//         setIsScanning(false);
//         return;
//       }

//       const scannedDevices = await bluetoothService.scanDevices();

//       // Sort: known printer names first, then everything else
//       const sorted = [...scannedDevices].sort((a, b) => {
//         const isPrinter = (d: any) =>
//           d.name?.toLowerCase().includes("printer") ||
//           d.name?.toLowerCase().includes("pos") ||
//           d.name?.toLowerCase().includes("thermal") ||
//           d.name?.toLowerCase().includes("5890") ||
//           d.name?.toLowerCase().includes("escpos");
//         return isPrinter(b) ? 1 : isPrinter(a) ? -1 : 0;
//       });

//       setDevices(sorted);

//       if (scannedDevices.length === 0) {
//         Alert.alert(
//           "No Devices Found",
//           "Make sure your POS-5890U printer is powered on and in pairing mode",
//         );
//       }
//     } catch (error: any) {
//       Alert.alert(
//         "Scan Failed",
//         error?.message || "Unable to scan for Bluetooth devices",
//       );
//     } finally {
//       setIsScanning(false);
//     }
//   };

//   const connectToPrinter = async (address: string) => {
//     setIsConnecting(true);
//     try {
//       const success = await bluetoothService.connectDevice(address);
//       if (success) {
//         setConnectedAddress(address);
//         onConnect(address);
//         Alert.alert("Connected", "Printer connected successfully");
//       } else {
//         Alert.alert("Connection Failed", "Unable to connect to printer");
//       }
//     } catch (error) {
//       Alert.alert("Error", "Connection error occurred");
//     } finally {
//       setIsConnecting(false);
//     }
//   };

//   const handlePrint = async () => {
//     if (!connectedAddress) {
//       Alert.alert("No Printer", "Please connect to a printer first");
//       return;
//     }
//     onPrint();
//   };

//   useEffect(() => {
//     if (visible) {
//       scanForPrinters();
//     }
//   }, [visible]);

//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView
//         className="flex-1"
//         style={{ backgroundColor: "#FFC200", padding: 10 }}
//       >
//         <View className="flex-row items-center justify-between mb-6">
//           <Text className="text-red-900 text-xl font-black">
//             Bluetooth Printer
//           </Text>
//           <Pressable onPress={onClose}>
//             <MaterialIcons name="close" size={24} color="#fff" />
//           </Pressable>
//         </View>

//         {/* Status Card */}
//         <Card className="mb-4">
//           <View className="flex-row items-center justify-between">
//             <Text className="text-white">Status:</Text>
//             <Pill
//               label={connectedAddress ? "Connected" : "Disconnected"}
//               tone={connectedAddress ? "emerald" : "rose"}
//             />
//           </View>
//           {connectedAddress && (
//             <Text className="text-slate-400 text-xs mt-1">
//               Device: {connectedAddress}
//             </Text>
//           )}
//         </Card>

//         {/* Scan Button */}
//         <TouchableOpacity
//           className={`rounded-2xl p-4 items-center mb-4 ${
//             isScanning ? "bg-slate-700" : "bg-sky-500"
//           }`}
//           onPress={scanForPrinters}
//           disabled={isScanning}
//         >
//           <View className="flex-row items-center">
//             <MaterialIcons
//               name={isScanning ? "sync" : "bluetooth-searching"}
//               size={20}
//               color="white"
//             />
//             <Text className="text-red-500 font-bold ml-2">
//               {isScanning ? "Scanning..." : "Scan for Printers"}
//             </Text>
//           </View>
//         </TouchableOpacity>

//         {/* Device List */}
//         {devices.length > 0 && (
//           <View className="flex-1" style={{ backgroundColor: "#FFC200" }}>
//             <Text className="text-blue-900 text-xs uppercase tracking-[3px] mb-2">
//               Found Devices ({devices.length})
//             </Text>
//             <FlatList
//               data={devices}
//               keyExtractor={(item) => item.address}
//               renderItem={({ item }) => (
//                 <TouchableOpacity
//                   className="flex-row items-center justify-between bg-white/5 rounded-xl p-3 mb-2 border border-white/10"
//                   onPress={() => connectToPrinter(item.address)}
//                   disabled={isConnecting}
//                 >
//                   <View>
//                     <Text className="text-red-900 font-semibold">
//                       {item.name || "Unknown Device"}
//                     </Text>
//                     <Text className="text-slate-400 text-xs">
//                       {item.address}
//                     </Text>
//                   </View>
//                   {connectedAddress === item.address ? (
//                     <Pill label="Connected" tone="emerald" />
//                   ) : (
//                     <MaterialIcons
//                       name="bluetooth-connected"
//                       size={24}
//                       color="#38bdf8"
//                     />
//                   )}
//                 </TouchableOpacity>
//               )}
//             />
//           </View>
//         )}

//         {/* Print Button */}
//         {connectedAddress && (
//           <TouchableOpacity
//             className={`rounded-2xl p-4 items-center mt-4 ${
//               isPrinting ? "bg-slate-700" : "bg-emerald-500"
//             }`}
//             onPress={handlePrint}
//             disabled={isPrinting}
//           >
//             <View className="flex-row items-center">
//               <MaterialIcons
//                 name={isPrinting ? "sync" : "print"}
//                 size={20}
//                 color="white"
//               />
//               <Text className="text-white font-bold ml-2">
//                 {isPrinting ? "Printing..." : "Print Receipt"}
//               </Text>
//             </View>
//           </TouchableOpacity>
//         )}
//       </SafeAreaView>
//     </Modal>
//   );
// }

// // ============================================
// // MAIN RECEIPT SCREEN
// // ============================================

// export default function ReceiptScreen() {
//   const router = useRouter();
//   const { id } = useLocalSearchParams<{ id: string }>();
//   const user = useAppSelector((state) => state.auth.user);

//   // ✅ Offline-first queries
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
//   const [isPrinting, setIsPrinting] = useState(false);
//   const [showBluetoothModal, setShowBluetoothModal] = useState(false);
//   const [bluetoothAddress, setBluetoothAddress] = useState<string | null>(null);

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

//   // ============================================
//   // THERMAL RECEIPT FORMATTER (POS-5890U)
//   // ============================================

//   const buildThermalReceiptText = (): string => {
//     const lines: string[] = [];
//     const width = 48;

//     const center = (text: string) => {
//       const padding = Math.max(0, Math.floor((width - text.length) / 2));
//       return " ".repeat(padding) + text;
//     };

//     const divider = "=".repeat(width);
//     const thinDivider = "-".repeat(width);

//     // Header
//     lines.push(center(store?.name || "POS SYSTEM"));
//     lines.push(center(store?.address || ""));
//     lines.push(center(`Tel: ${store?.phone || ""}`));
//     lines.push(divider);
//     lines.push("");

//     // Receipt Info
//     lines.push(`Receipt #: ${receiptNumber}`);
//     lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
//     lines.push(`Order: ${order.id.slice(-8)}`);
//     lines.push(`Customer: ${customer?.name || "Walk-in"}`);
//     lines.push(`Payment: ${order.paymentMethod || "CASH"}`);
//     lines.push(`Status: ${order.status || "COMPLETED"}`);
//     lines.push("");
//     lines.push(thinDivider);
//     lines.push("");

//     // Items
//     lines.push("ITEM           QTY  PRICE   TOTAL");
//     lines.push(thinDivider);

//     for (const item of order.items || []) {
//       const name = (item.productName || "Item").slice(0, 15).padEnd(15);
//       const qty = String(item.quantity).padStart(4);
//       const price =
//         `$${Number(item.unitPrice || item.price).toFixed(2)}`.padStart(7);
//       const total =
//         `$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}`.padStart(
//           7,
//         );
//       lines.push(`${name} ${qty} ${price} ${total}`);
//     }

//     lines.push("");
//     lines.push(thinDivider);
//     lines.push("");

//     // Totals
//     lines.push(
//       `Subtotal:     $${Number(order.subTotal ?? 0).toFixed(2)}`.padStart(
//         width,
//       ),
//     );
//     lines.push(
//       `Tax:          $${Number(order.taxAmount ?? 0).toFixed(2)}`.padStart(
//         width,
//       ),
//     );
//     if (order.discountAmount > 0) {
//       lines.push(
//         `Discount:    -$${Number(order.discountAmount ?? 0).toFixed(2)}`.padStart(
//           width,
//         ),
//       );
//     }
//     lines.push(divider);
//     lines.push(
//       `TOTAL:        $${Number(order.grandTotal ?? 0).toFixed(2)}`.padStart(
//         width,
//       ),
//     );
//     lines.push(thinDivider);
//     lines.push(
//       `Paid:         $${Number(order.paidAmount ?? 0).toFixed(2)}`.padStart(
//         width,
//       ),
//     );
//     lines.push(
//       `Change:       $${Number(order.changeAmount ?? 0).toFixed(2)}`.padStart(
//         width,
//       ),
//     );
//     lines.push("");

//     // Payment Breakdown
//     if (order.paymentBreakdown?.length > 0) {
//       lines.push(thinDivider);
//       for (const tender of order.paymentBreakdown) {
//         lines.push(`${tender.method}: $${Number(tender.amount).toFixed(2)}`);
//       }
//       lines.push("");
//     }

//     // Footer
//     lines.push(divider);
//     lines.push(center("THANK YOU!"));
//     lines.push(center("Have a great day!"));
//     lines.push("");
//     lines.push(center(receiptNumber));
//     lines.push(center(`Printed: ${new Date().toLocaleString()}`));

//     return lines.join("\n");
//   };

//   // ============================================
//   // HTML RECEIPT BUILDER (for PDF/Print)
//   // ============================================

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
//               font-family: 'Courier New', Courier, monospace;
//               font-size: 12px;
//               padding: 16px;
//               max-width: 300px;
//               margin: 0 auto;
//             }
//             .center { text-align: center; }
//             .brand { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
//             .divider { border-top: 1px dashed #000; margin: 8px 0; }
//             .thin-divider { border-top: 1px dotted #000; margin: 6px 0; }
//             table { width: 100%; border-collapse: collapse; }
//             th, td { padding: 4px 0; text-align: left; }
//             .right { text-align: right; }
//             .bold { font-weight: 700; }
//             .text-muted { color: #666; }
//             .qr { text-align: center; margin: 12px 0; }
//             .qr img { width: 100px; height: 100px; }
//             .footer { margin-top: 16px; text-align: center; font-size: 11px; }
//           </style>
//         </head>
//         <body>
//           <div class="center">
//             <div class="brand">${escapeHtml(store?.name || "POS SYSTEM")}</div>
//             <div class="text-muted">${escapeHtml(store?.address || "")}</div>
//             <div class="text-muted">${escapeHtml(store?.phone || "")}</div>
//             <div class="divider"></div>
//             <div><strong>Receipt #:</strong> ${escapeHtml(receiptNumber)}</div>
//             <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
//             <div><strong>Customer:</strong> ${escapeHtml(customer?.name || "Walk-in")}</div>
//             <div><strong>Payment:</strong> ${escapeHtml(order.paymentMethod || "CASH")}</div>
//           </div>
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
//           <div class="thin-divider"></div>
//           <table>
//             <tbody>
//               <tr><td>Subtotal</td><td class="right">$${Number(order.subTotal ?? 0).toFixed(2)}</td></tr>
//               <tr><td>Tax</td><td class="right">$${Number(order.taxAmount ?? 0).toFixed(2)}</td></tr>
//               ${order.discountAmount > 0 ? `<tr><td>Discount</td><td class="right">-$${Number(order.discountAmount).toFixed(2)}</td></tr>` : ""}
//               <tr class="bold"><td>TOTAL</td><td class="right">$${Number(order.grandTotal ?? 0).toFixed(2)}</td></tr>
//               <tr><td>Paid</td><td class="right">$${Number(order.paidAmount ?? 0).toFixed(2)}</td></tr>
//               <tr><td>Change</td><td class="right">$${Number(order.changeAmount ?? 0).toFixed(2)}</td></tr>
//             </tbody>
//           </table>
//           ${
//             order.paymentBreakdown?.length > 0
//               ? `
//             <div class="thin-divider"></div>
//             <table>
//               <tbody>
//                 ${tenderHtml}
//               </tbody>
//             </table>
//           `
//               : ""
//           }
//           ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="QR" /></div>` : ""}
//           <div class="divider"></div>
//           <div class="center">
//             <div><strong>THANK YOU!</strong></div>
//             <div class="text-muted">Have a great day!</div>
//             <div class="text-muted" style="margin-top:8px;font-size:10px;">${receiptNumber}</div>
//           </div>
//         </body>
//       </html>`;
//   };

//   // ============================================
//   // PRINT FUNCTIONS
//   // ============================================

//   // ✅ Print via expo-print
//   const printReceipt = async () => {
//     if (!order) return;

//     setIsPrinting(true);
//     try {
//       await Print.printAsync({
//         html: buildReceiptHtml(),
//       });
//     } catch (error: any) {
//       if (
//         error.message?.includes("No print service") ||
//         error.message?.includes("not available") ||
//         error.code === "E_PRINT_UNAVAILABLE"
//       ) {
//         Alert.alert(
//           "Print Not Available",
//           "No print service found. Would you like to save as PDF instead?",
//           [
//             { text: "Cancel", style: "cancel" },
//             { text: "Save as PDF", onPress: saveAsPDF },
//           ],
//         );
//       } else {
//         Alert.alert(
//           "Print Failed",
//           error?.message || "Unable to print receipt.",
//         );
//       }
//     } finally {
//       setIsPrinting(false);
//     }
//   };

//   // ✅ Print via Bluetooth
//   const printViaBluetooth = async () => {
//     if (!order) return;

//     const receiptText = buildThermalReceiptText();

//     // If already connected, print directly
//     if (bluetoothAddress) {
//       setIsPrinting(true);
//       try {
//         const success = await bluetoothService.printThermalReceipt(receiptText);
//         if (success) {
//           Alert.alert("Success", "Receipt printed successfully");
//         } else {
//           Alert.alert("Print Failed", "Unable to print receipt");
//         }
//       } catch (error) {
//         Alert.alert("Error", "Print error occurred");
//       } finally {
//         setIsPrinting(false);
//       }
//     } else {
//       // Show Bluetooth connection modal
//       setShowBluetoothModal(true);
//     }
//   };

//   const saveAsPDF = async () => {
//     try {
//       const { uri } = await Print.printToFileAsync({
//         html: buildReceiptHtml(),
//         base64: false,
//       });

//       Alert.alert("PDF Created", "Receipt saved to PDF", [
//         { text: "Cancel", style: "cancel" },
//         { text: "Share PDF", onPress: () => Sharing.shareAsync(uri) },
//       ]);
//     } catch (error: any) {
//       Alert.alert("Error", error?.message || "Failed to save PDF.");
//     }
//   };

//   const shareReceipt = async () => {
//     if (!order) return;
//     const text = buildThermalReceiptText();
//     await Share.share({ message: text });
//   };

//   const handleBluetoothConnect = (address: string) => {
//     setBluetoothAddress(address);
//     setShowBluetoothModal(false);
//   };

//   const handleBluetoothPrint = async () => {
//     const receiptText = buildThermalReceiptText();
//     setIsPrinting(true);
//     try {
//       const success = await bluetoothService.printThermalReceipt(receiptText);
//       if (success) {
//         Alert.alert("Success", "Receipt printed successfully");
//         setShowBluetoothModal(false);
//       } else {
//         Alert.alert("Print Failed", "Unable to print receipt");
//       }
//     } catch (error) {
//       Alert.alert("Error", "Print error occurred");
//     } finally {
//       setIsPrinting(false);
//     }
//   };

//   const handleNewSale = () => {
//     router.replace("/(tabs)/pos");
//   };

//   // ============================================
//   // LOADING / ERROR STATES
//   // ============================================

//   if (isOrderLoading) {
//     return (
//       <Screen>
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color="#38bdf8" />
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

//   // ============================================
//   // MAIN RENDER
//   // ============================================

//   return (
//     <Screen padded={false}>
//       <SafeAreaView className="flex-1 bg-slate-950">
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
//                   {bluetoothAddress && (
//                     <Text className="text-emerald-400 text-[8px] mt-1">
//                       Bluetooth ✓
//                     </Text>
//                   )}
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
//               title={isPrinting ? "Printing..." : "Print"}
//               icon="print"
//               accent="sky"
//               onPress={printReceipt}
//               disabled={isPrinting}
//             />
//           </View>

//           <View className="mt-3 flex-row gap-3">
//             <ActionButton
//               title="Bluetooth"
//               icon="bluetooth"
//               accent="sky"
//               onPress={printViaBluetooth}
//             />
//             <ActionButton
//               title="Share"
//               icon="share"
//               accent="amber"
//               onPress={shareReceipt}
//             />
//             <ActionButton
//               title="PDF"
//               icon="picture-as-pdf"
//               accent="rose"
//               onPress={saveAsPDF}
//             />
//           </View>

//           <View className="mt-3">
//             <ActionButton
//               title="Back"
//               icon="arrow-back"
//               accent="slate"
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

//       {/* Bluetooth Printer Modal */}
//       <BluetoothPrinterModal
//         visible={showBluetoothModal}
//         onClose={() => setShowBluetoothModal(false)}
//         onConnect={handleBluetoothConnect}
//         onPrint={handleBluetoothPrint}
//         receiptText={buildThermalReceiptText()}
//         isPrinting={isPrinting}
//       />
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
