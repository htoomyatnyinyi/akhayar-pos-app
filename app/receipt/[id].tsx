import * as Print from "expo-print";
import QRCode from "react-native-qrcode-svg";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
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
import { useGetOrderByIdQuery } from "@/services/features/order/orderApi";
import { useGetCustomersQuery } from "@/services/features/customers/customerApi";
import { useGetStoresQuery } from "@/services/features/stores/storeApi";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order } = useGetOrderByIdQuery(id);
  const { data: customers = [] } = useGetCustomersQuery();
  const { data: stores = [] } = useGetStoresQuery();
  const offline = useAppSelector((state) => state.offline);
  const qrRef = useRef<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const receiptNumber = useMemo(() => {
    if (!order?.id) return "RCPT-XXXX";
    return `RCPT-${order.id
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-8)
      .toUpperCase()}`;
  }, [order?.id]);

  const customer = useMemo(
    () => customers.find((item) => item.id === order?.customerId),
    [customers, order?.customerId],
  );

  const store = useMemo(
    () => stores.find((item) => item.id === order?.storeId),
    [stores, order?.storeId],
  );

  useEffect(() => {
    setQrDataUrl(null);
    if (!order?.id || !qrRef.current?.toDataURL) return;
    JSON.stringify({
      orderId: order.id,
      receiptNumber,
    });
    qrRef.current.toDataURL((data: string) => {
      setQrDataUrl(`data:image/png;base64,${data}`);
    });
  }, [order?.id, receiptNumber]);

  const buildReceiptHtml = () => {
    const itemsHtml =
      order?.items
        ?.map(
          (item) => `
          <tr>
            <td>${escapeHtml(item.productName || item.product?.name || "Item")}</td>
            <td style="text-align:right;">${item.quantity}</td>
            <td style="text-align:right;">$${Number(item.price).toFixed(2)}</td>
            <td style="text-align:right;">$${(item.quantity * item.price).toFixed(2)}</td>
          </tr>`,
        )
        .join("") ?? "";

    const tenderHtml =
      order?.paymentBreakdown
        ?.map(
          (tender) => `
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #111827;
              padding: 18px;
            }
            .brand {
              font-size: 22px;
              font-weight: 800;
              margin-bottom: 4px;
            }
            .sub {
              color: #6b7280;
              font-size: 12px;
            }
            .divider {
              border-top: 1px dashed #d1d5db;
              margin: 14px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              padding: 6px 0;
            }
            th {
              color: #6b7280;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .summary td {
              padding: 4px 0;
            }
            .right {
              text-align: right;
            }
            .receipt-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
            }
            .qr {
              width: 110px;
              text-align: center;
            }
            .qr img {
              width: 110px;
              height: 110px;
            }
            .receipt-number {
              font-size: 12px;
              letter-spacing: 2px;
              font-weight: 700;
              margin-top: 6px;
              color: #111827;
            }
          </style>
        </head>
        <body>
          <div class="receipt-head">
            <div>
              <div class="brand">${escapeHtml(store?.name ?? "POS Receipt")}</div>
              <div class="sub">${escapeHtml(store?.address ?? "Store copy")}</div>
              <div class="receipt-number">${escapeHtml(receiptNumber)}</div>
            </div>
            ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="Receipt QR" /><div class="sub">Scan to reopen</div></div>` : ""}
          </div>
          <div class="divider"></div>
          <div><strong>Order:</strong> ${escapeHtml(order?.id ?? "")}</div>
          <div><strong>Receipt No:</strong> ${escapeHtml(receiptNumber)}</div>
          <div><strong>Customer:</strong> ${escapeHtml(customer?.name ?? "Walk-in")}</div>
          <div><strong>Payment:</strong> ${escapeHtml(order?.paymentMethod ?? "CASH")}</div>
          <div><strong>Status:</strong> ${escapeHtml(order?.status ?? "")}</div>
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
          <div class="divider"></div>
          <table class="summary">
            <tbody>
              <tr><td>Subtotal</td><td class="right">$${Number(order?.subTotal ?? 0).toFixed(2)}</td></tr>
              <tr><td>Tax</td><td class="right">$${Number(order?.taxAmount ?? 0).toFixed(2)}</td></tr>
              <tr><td>Discount</td><td class="right">$${Number(order?.discountAmount ?? 0).toFixed(2)}</td></tr>
              <tr><td><strong>Total</strong></td><td class="right"><strong>$${Number(order?.grandTotal ?? 0).toFixed(2)}</strong></td></tr>
              <tr><td>Paid</td><td class="right">$${Number(order?.paidAmount ?? 0).toFixed(2)}</td></tr>
              <tr><td>Change</td><td class="right">$${Number(order?.changeAmount ?? 0).toFixed(2)}</td></tr>
            </tbody>
          </table>
          <div class="divider"></div>
          <table class="summary">
            <tbody>
              ${tenderHtml}
            </tbody>
          </table>
        </body>
      </html>`;
  };

  const shareReceipt = async () => {
    if (!order) return;
    const text = [
      `Receipt ${order.id}`,
      `Status: ${order.status}`,
      `Payment: ${order.paymentMethod ?? "CASH"}`,
      `Total: $${Number(order.grandTotal ?? 0).toFixed(2)}`,
      `Paid: $${Number(order.paidAmount ?? order.grandTotal ?? 0).toFixed(2)}`,
      `Change: $${Number(order.changeAmount ?? 0).toFixed(2)}`,
    ].join("\n");
    await Share.share({ message: text });
  };

  const printReceipt = async () => {
    try {
      await Print.printAsync({ html: buildReceiptHtml() });
    } catch (error: any) {
      Alert.alert("Print failed", error?.message || "Unable to print receipt.");
    }
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <Header
            eyebrow="Receipt"
            title={order ? `Order ${order.id}` : "Loading receipt"}
            subtitle="Local-first confirmation screen. This stays available even before sync finishes."
            right={
              <Pill
                label={offline.isOnline ? "Syncable" : "Offline"}
                tone={offline.isOnline ? "emerald" : "rose"}
              />
            }
          />

          <Card className="mb-4">
            <View className="items-center py-2">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15">
                <MaterialIcons name="receipt-long" size={32} color="#86efac" />
              </View>
              <Text className="text-xl font-black text-white">
                Payment confirmed
              </Text>
              <Text className="mt-2 text-sm text-slate-300">
                Keep this receipt for reference or share it with the customer.
              </Text>
            </View>
            <Divider />
            <StatRow label="Order" value={order?.id ?? "..."} />
            <StatRow label="Receipt #" value={receiptNumber} />
            <StatRow
              label="Payment method"
              value={order?.paymentMethod ?? "CASH"}
            />
            <StatRow label="Customer" value={customer?.name ?? "Walk-in"} />
            <StatRow label="Store" value={store?.name ?? "Main Store"} />
            <StatRow label="Status" value={order?.status ?? "..."} />
          </Card>

          <Card className="mb-4">
            <View className="items-center py-4">
              <Text className="text-[10px] font-bold uppercase tracking-[4px] text-slate-500">
                Receipt QR
              </Text>
              <View className="mt-4 rounded-[28px] bg-white p-4">
                <QRCode
                  getRef={qrRef}
                  value={JSON.stringify({ orderId: order?.id, receiptNumber })}
                  size={176}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
              </View>
              <Text className="mt-4 text-sm font-semibold text-white">
                {receiptNumber}
              </Text>
              <Text className="mt-2 text-center text-xs text-slate-400">
                Scan this code to reopen the receipt quickly.
              </Text>
            </View>
          </Card>

          <SectionTitle title="Items" />
          <Card className="mb-4">
            {order?.items?.length ? (
              order.items.map((item, index) => (
                <View key={item.id}>
                  <RowItem
                    title={item.productName || item.product?.name || "Item"}
                    subtitle={`${item.quantity} x $${Number(item.price).toFixed(2)}`}
                    right={`$${(item.quantity * item.price).toFixed(2)}`}
                    icon="shopping-bag"
                  />
                  {index < order.items.length - 1 ? (
                    <View className="my-3 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-8 text-center text-sm text-slate-400">
                No line items found.
              </Text>
            )}
          </Card>

          <SectionTitle title="Summary" />
          <Card className="mb-4">
            <StatRow
              label="Subtotal"
              value={`$${Number(order?.subTotal ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Tax"
              value={`$${Number(order?.taxAmount ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Discount"
              value={`$${Number(order?.discountAmount ?? 0).toFixed(2)}`}
            />
            <Divider />
            <StatRow
              label="Total"
              value={`$${Number(order?.grandTotal ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Paid"
              value={`$${Number(order?.paidAmount ?? 0).toFixed(2)}`}
            />
            <StatRow
              label="Change"
              value={`$${Number(order?.changeAmount ?? 0).toFixed(2)}`}
            />
          </Card>

          <SectionTitle title="Tender split" />
          <Card className="mb-4">
            {order?.paymentBreakdown?.length ? (
              order.paymentBreakdown.map((tender, index) => (
                <View key={`${tender.method}-${index}`}>
                  <StatRow
                    label={tender.method}
                    value={`$${Number(tender.amount).toFixed(2)}`}
                  />
                  {index < order.paymentBreakdown.length - 1 ? (
                    <View className="my-2 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-6 text-center text-sm text-slate-400">
                No split payment recorded.
              </Text>
            )}
          </Card>

          <View className="flex-row gap-3">
            <ActionButton
              title="New sale"
              icon="add-shopping-cart"
              accent="emerald"
              onPress={() => router.replace("/")}
            />
            <ActionButton
              title="Print"
              icon="print"
              accent="sky"
              onPress={printReceipt}
            />
          </View>

          <View className="mt-4 flex-row gap-3">
            <ActionButton
              title="Share"
              icon="share"
              accent="amber"
              onPress={shareReceipt}
            />
            <ActionButton
              title="Back"
              icon="arrow-back"
              accent="rose"
              onPress={() => router.back()}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
