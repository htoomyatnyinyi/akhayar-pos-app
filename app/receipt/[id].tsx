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
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  FlatList,
  NativeModules,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";

// Safely access BleManager without crashing if native module is not compiled yet
let BleManager: any = null;
try {
  if (NativeModules.BleManager) {
    const BleModule = require("react-native-ble-manager");
    BleManager = BleModule.default || BleModule;
  }
} catch (e) {
  // Not available in current runtime
}

// ============================================
// ESC/POS BUILDER (Bluetooth thermal)
// ============================================

function buildEscPosReceipt(
  order: any,
  customer: any,
  store: any,
  receiptNumber: string,
): Uint8Array {
  const chunks: number[] = [];

  // ESC/POS init
  chunks.push(0x1b, 0x40); // Initialize printer
  chunks.push(0x1b, 0x61, 0x01); // Center alignment

  const textEncoder = new TextEncoder();
  const addText = (text: string) => {
    const bytes = textEncoder.encode(text);
    chunks.push(...bytes);
  };

  // Header
  const storeName = (store?.name || "POS SYSTEM").padEnd(32, " ");
  const address = (store?.address || "").padEnd(32, " ");
  const phone = (store?.phone || "").padEnd(32, " ");
  addText(storeName + "\n");
  addText(address + "\n");
  addText(phone + "\n");
  addText("Tel: " + (store?.phone || "") + "\n");
  addText("=".repeat(32) + "\n\n");

  // Receipt Info
  addText("Receipt #: " + receiptNumber + "\n");
  addText("Date: " + new Date(order.createdAt).toLocaleString() + "\n");
  addText("Customer: " + (customer?.name || "Walk-in") + "\n");
  addText("Payment: " + (order.paymentMethod || "CASH") + "\n\n");
  addText("-".repeat(32) + "\n");
  addText("ITEM          QTY  PRICE   TOTAL\n");
  addText("-".repeat(32) + "\n");

  for (const item of order.items || []) {
    const name = (item.productName || "Item").slice(0, 15).padEnd(15);
    const qty = String(item.quantity).padStart(4);
    const price =
      `$${Number(item.unitPrice || item.price).toFixed(2)}`.padStart(7);
    const total =
      `$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}`.padStart(
        7,
      );
    addText(`${name} ${qty} ${price} ${total}\n`);
  }

  addText("\n");
  addText("-".repeat(32) + "\n");
  addText(`Subtotal:     $${Number(order.subTotal ?? 0).toFixed(2)}\n`);
  addText(`Tax:          $${Number(order.taxAmount ?? 0).toFixed(2)}\n`);
  if (order.discountAmount > 0) {
    addText(`Discount:    -$${Number(order.discountAmount ?? 0).toFixed(2)}\n`);
  }
  addText("=".repeat(32) + "\n");
  addText(`TOTAL:        $${Number(order.grandTotal ?? 0).toFixed(2)}\n`);
  addText("-".repeat(32) + "\n");
  addText(`Paid:         $${Number(order.paidAmount ?? 0).toFixed(2)}\n`);
  addText(`Change:       $${Number(order.changeAmount ?? 0).toFixed(2)}\n\n`);

  // Payment breakdown
  if (order.paymentBreakdown?.length > 0) {
    addText("-".repeat(32) + "\n");
    for (const tender of order.paymentBreakdown) {
      addText(`${tender.method}: $${Number(tender.amount).toFixed(2)}\n`);
    }
    addText("\n");
  }

  addText("=".repeat(32) + "\n");
  addText("THANK YOU!\n");
  addText("Have a great day!\n\n");
  addText(receiptNumber + "\n");
  addText("Printed: " + new Date().toLocaleString() + "\n");

  // Cut paper
  chunks.push(0x1d, 0x56, 0x00);
  return new Uint8Array(chunks);
}

// ============================================
// PLAIN TEXT RECEIPT (for sharing)
// ============================================

function formatThermalReceipt(
  order: any,
  customer: any,
  store: any,
  receiptNumber: string,
): string {
  const lines: string[] = [];
  const width = 48;

  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text;
  };

  const divider = "=".repeat(width);
  const thinDivider = "-".repeat(width);

  lines.push(center(store?.name || "POS SYSTEM"));
  lines.push(center(store?.address || ""));
  lines.push(center(store?.phone || ""));
  lines.push(center(`Tel: ${store?.phone || ""}`));
  lines.push(divider);
  lines.push("");
  lines.push(`Receipt #: ${receiptNumber}`);
  lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  lines.push(`Customer: ${customer?.name || "Walk-in"}`);
  lines.push(`Payment: ${order.paymentMethod || "CASH"}`);
  lines.push("");
  lines.push(thinDivider);
  lines.push("ITEM          QTY  PRICE   TOTAL");
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

  if (order.paymentBreakdown?.length > 0) {
    lines.push(thinDivider);
    for (const tender of order.paymentBreakdown) {
      lines.push(`${tender.method}: $${Number(tender.amount).toFixed(2)}`);
    }
    lines.push("");
  }

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

const ReceiptScreen = () => {
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

  // Bluetooth state
  const [bluetoothModalVisible, setBluetoothModalVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);

  // Load saved printer
  useEffect(() => {
    loadSavedPrinter();
  }, []);

  const loadSavedPrinter = async () => {
    try {
      const saved = await AsyncStorage.getItem("selected_printer");
      if (saved) {
        setConnectedDevice(JSON.parse(saved));
      }
    } catch (e) {}
  };

  const savePrinter = async (device: any) => {
    try {
      await AsyncStorage.setItem("selected_printer", JSON.stringify(device));
      setConnectedDevice(device);
    } catch (e) {}
  };

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
  // BLUETOOTH SCANNING & CONNECTION
  // ============================================

  const startScan = async () => {
    if (!BleManager) {
      Alert.alert(
        "Bluetooth Unavailable",
        "Direct Bluetooth printing requires a native build with Bluetooth enabled. Use Print or PDF instead.",
      );
      return;
    }
    if (scanning) return;
    setScanning(true);
    setDevices([]);
    try {
      if (BleManager.start) {
        await BleManager.start({ showAlert: false }).catch(() => {});
      }
      await BleManager.scan([], 5, true);
      const listener = BleManager.onDiscover
        ? BleManager.onDiscover((device: any) => {
            if (device.name) {
              setDevices((prev) => {
                const exists = prev.find((d) => d.id === device.id);
                if (exists) return prev;
                return [...prev, device];
              });
            }
          })
        : null;

      setTimeout(() => {
        if (BleManager?.stopScan) BleManager.stopScan().catch(() => {});
        if (listener?.remove) listener.remove();
        setScanning(false);
      }, 8000);
    } catch (error: any) {
      Alert.alert("Scan Error", error.message || "Unable to start scan.");
      setScanning(false);
    }
  };

  const connectToDevice = async (device: any) => {
    if (!BleManager) return;
    setConnecting(true);
    try {
      await BleManager.connect(device.id);
      await BleManager.retrieveServices(device.id);
      const services = await BleManager.retrieveServices(device.id);

      let writeChar = null;
      for (const service of services) {
        for (const char of service.characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      }
      if (!writeChar) {
        throw new Error("No write characteristic found for this printer.");
      }
      await savePrinter({ ...device, writeChar });
      setBluetoothModalVisible(false);
      Alert.alert("Connected", `Connected to ${device.name}`);
    } catch (error: any) {
      Alert.alert("Connection Error", error.message || "Failed to connect.");
    } finally {
      setConnecting(false);
    }
  };

  // ============================================
  // PRINT TO BLUETOOTH PRINTER
  // ============================================

  const printViaBluetooth = async () => {
    if (!BleManager) {
      printThermalReceipt();
      return;
    }
    if (!connectedDevice) {
      Alert.alert(
        "No Printer",
        "Please connect to a Bluetooth printer first.",
        [{ text: "Scan", onPress: () => setBluetoothModalVisible(true) }],
      );
      return;
    }
    setIsPrinting(true);
    try {
      const escPosData = buildEscPosReceipt(
        order,
        customer,
        store,
        receiptNumber,
      );
      await BleManager.write(
        connectedDevice.id,
        connectedDevice.writeChar.serviceUUID,
        connectedDevice.writeChar.characteristicUUID,
        Buffer.from(escPosData).toString("base64"),
        1,
      );
      Alert.alert("Success", "Receipt printed successfully.");
    } catch (error: any) {
      Alert.alert("Print Error", error.message || "Failed to print.");
      // Fallback to system print
      printThermalReceipt();
    } finally {
      setIsPrinting(false);
    }
  };

  // ============================================
  // SYSTEM PRINT (fallback)
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

  const printThermalReceipt = async () => {
    if (!order) return;
    setIsPrinting(true);
    try {
      const isAvailable = await Print.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Not Available",
          "Printing is not available on this device.",
        );
        setIsPrinting(false);
        return;
      }
      await Print.printAsync({
        html: buildReceiptHtml(),
        orientation: Print.Orientation.portrait,
        margins: { left: 5, top: 5, right: 5, bottom: 5 },
      });
    } catch (error: any) {
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
  // PDF & SHARE
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

  const shareReceipt = async () => {
    if (!order) return;
    const text = formatThermalReceipt(order, customer, store, receiptNumber);
    await Share.share({ message: text });
  };

  // ============================================
  // RENDER
  // ============================================

  if (isOrderLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text className="mt-4 text-sm text-slate-400">
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
          <View className="h-20 w-20 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10">
            <MaterialIcons name="receipt-long" size={40} color="#f87171" />
          </View>
          <Text className="mt-4 text-xl font-bold text-white">
            Receipt Not Found
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-400">
            The order you're looking for doesn't exist or hasn't been synced
            yet.
          </Text>
          <TouchableOpacity
            className="mt-6 rounded-xl bg-sky-500 px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-white">Go Back</Text>
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
                    onPress={refetch}
                    className="mt-1 rounded-full bg-white/10 p-1.5"
                  >
                    <MaterialIcons name="refresh" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                  <Text className="mt-1 text-[10px] text-slate-500">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              }
            />
          </View>

          {/* Printer Status */}
          <View className="mb-3 flex-row items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <View className="flex-row items-center">
              <MaterialIcons
                name={
                  connectedDevice ? "bluetooth-connected" : "bluetooth-disabled"
                }
                size={20}
                color={connectedDevice ? "#34d399" : "#94a3b8"}
              />
              <Text className="ml-2 text-xs text-slate-300">
                {connectedDevice ? connectedDevice.name : "No printer"}
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-full bg-sky-500/20 px-3 py-1"
              onPress={() => setBluetoothModalVisible(true)}
            >
              <Text className="text-xs font-bold text-sky-300">
                {connectedDevice ? "Change" : "Connect"}
              </Text>
            </TouchableOpacity>
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
          {/* <Card className="mb-4">
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
              <Text className="mt-2 max-w-xs text-center text-xs text-slate-400">
                Scan to reopen this receipt quickly
              </Text>
            </View>
          </Card> */}

          {/* Items */}
          <SectionTitle title="Items" />
          <Card className="mb-4">
            {order.items?.length ? (
              order.items.map((item: any, index: number) => (
                <View key={item.id || index}>
                  <RowItem
                    title={item.productName || "Item"}
                    subtitle={`${item.quantity} x $${Number(item.unitPrice || item.price).toFixed(2)}`}
                    right={`$${(item.quantity * Number(item.unitPrice || item.price)).toFixed(2)}`}
                    icon="shopping-bag"
                  />
                  {index < order.items.length - 1 && (
                    <View className="my-3 h-px bg-white/8" />
                  )}
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
                    {index < order.paymentBreakdown.length - 1 && (
                      <View className="my-2 h-px bg-white/8" />
                    )}
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Actions */}
          <View className="mt-2 flex-row gap-3">
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
              onPress={
                connectedDevice ? printViaBluetooth : printThermalReceipt
              }
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
              <Text className="text-xs text-slate-500">
                {offline.isOnline
                  ? "This receipt is synced with the server"
                  : "This receipt is stored locally and will sync when online"}
              </Text>
            </View>
            <Text className="mt-1 text-[10px] text-slate-600">
              {offline.isSyncing
                ? "⏳ Syncing..."
                : `Last synced: ${offline.lastSyncAt ? new Date(offline.lastSyncAt).toLocaleString() : "Never"}`}
            </Text>
          </View>
        </ScrollView>

        {/* Bluetooth Printer Selection Modal */}
        <Modal
          visible={bluetoothModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setBluetoothModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View className="max-h-[80%] rounded-t-3xl bg-slate-900 p-6">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-white">
                  Bluetooth Printers
                </Text>
                <TouchableOpacity
                  onPress={() => setBluetoothModalVisible(false)}
                >
                  <MaterialIcons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="mb-4 flex-row items-center justify-center rounded-xl bg-sky-500/20 p-3"
                onPress={startScan}
                disabled={scanning}
              >
                <MaterialIcons
                  name="bluetooth-search"
                  size={20}
                  color="#38bdf8"
                />
                <Text className="ml-2 font-bold text-sky-300">
                  {scanning ? "Scanning..." : "Scan for Printers"}
                </Text>
              </TouchableOpacity>

              {scanning && (
                <View className="items-center py-4">
                  <ActivityIndicator color="#38bdf8" />
                  <Text className="mt-2 text-xs text-slate-400">
                    Searching...
                  </Text>
                </View>
              )}

              <FlatList
                data={devices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="mb-2 flex-row items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                    onPress={() => connectToDevice(item)}
                    disabled={connecting}
                  >
                    <View>
                      <Text className="font-semibold text-white">
                        {item.name || "Unnamed"}
                      </Text>
                      <Text className="text-xs text-slate-400">{item.id}</Text>
                      {item.rssi !== undefined && (
                        <Text className="text-[10px] text-slate-500">
                          Signal: {item.rssi} dBm
                        </Text>
                      )}
                    </View>
                    {connecting && (
                      <ActivityIndicator size="small" color="#38bdf8" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text className="py-8 text-center text-slate-400">
                    {scanning
                      ? "No printers found yet"
                      : "Tap scan to find printers"}
                  </Text>
                }
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
};

export default ReceiptScreen;

// ============================================
// HTML ESCAPE UTILITY
// ============================================

function escapeHtml(value: string) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
