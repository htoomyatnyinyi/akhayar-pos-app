// working code
import {
  Card,
  Header,
  MetricCard,
  Pill,
  Screen,
  SectionTitle,
  StatRow,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useCloseLocalSessionMutation,
  useGetLocalOrdersQuery,
  useGetLocalSessionsQuery,
  useOpenLocalSessionMutation,
} from "@/services/features/offline/localApi";
import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { canUseSessions } from "@/utils/auth/permissions";

export default function SessionsScreen() {
  const { user, currentStoreId } = useAppSelector((state) => state.auth);
  const canManageSession = canUseSessions(user);

  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useGetLocalSessionsQuery({
    storeId: currentStoreId || undefined,
  });

  const { data: orders = [] } = useGetLocalOrdersQuery({
    storeId: currentStoreId || undefined,
    includeItems: true,
  });

  const [openSession] = useOpenLocalSessionMutation();
  const [closeSession] = useCloseLocalSessionMutation();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSession = sessions.find((s: any) => s.status === "OPEN");
  const closedSessions = sessions.filter((s: any) => s.status === "CLOSED");
  const selectedSessionOrders = selectedSession
    ? orders.filter((order: any) => order.sessionId === selectedSession.id)
    : [];
  const selectedPaymentTotals = selectedSessionOrders
    .filter(isCountedSale)
    .reduce(
      (totals, order) => addPaymentTotals(totals, order),
      emptyPaymentTotals(),
    );
  const expectedClosingCash =
    Number(selectedSession?.openingBalance ?? 0) + selectedPaymentTotals.CASH;
  const cashDifference = (Number(closingBalance) || 0) - expectedClosingCash;

  const handleOpenSession = async () => {
    if (!canManageSession) {
      Alert.alert("Permission required", "You cannot open or close register sessions.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "User not logged in");
      return;
    }
    setIsSubmitting(true);
    try {
      await openSession({
        userId: user.id,
        tenantId: user.tenantId,
        openingBalance: Number(openingBalance) || 0,
        notes: notes.trim() || undefined,
        storeId: currentStoreId || undefined,
        // Dynamically ID ယူသုံးသည့် ပုံစံ
        registerId: "default-register",
        // registerId: currentRegister?.id || "default-register",
        // registerId: "Default Register", // ✅ hardcoded bypass register-id create api. because i did not implement yet.
        // registerId: "Default Register", // ✅ hardcoded bypass register-id create api. because i did not implement yet.
        // registerId: "default", // ✅ hardcoded bypass register-id create api. because i did not implement yet.
      }).unwrap();
      setShowOpenModal(false);
      setOpeningBalance("0");
      setNotes("");
      refetch();
      Alert.alert("Success", "Session opened successfully");
    } catch (error: any) {
      Alert.alert("Error", error?.data?.message || "Failed to open session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!canManageSession) {
      Alert.alert("Permission required", "You cannot open or close register sessions.");
      return;
    }
    if (!selectedSession) return;
    setIsSubmitting(true);
    try {
      const sessionOrders = orders.filter(
        (o: any) => o.sessionId === selectedSession.id,
      );
      const saleOrders = sessionOrders.filter(
        (o: any) => !["VOIDED", "CANCELLED"].includes(o.status),
      );
      const paymentTotals = saleOrders.reduce(
        (totals, order) => addPaymentTotals(totals, order),
        emptyPaymentTotals(),
      );
      const cashSales = paymentTotals.CASH;
      const cardSales = paymentTotals.CARD;
      const digitalSales = paymentTotals.DIGITAL;
      const openingBalance = Number(selectedSession.openingBalance ?? 0);
      const countedCash = Number(closingBalance) || 0;
      const expectedBalance = openingBalance + cashSales;
      const discrepancy = countedCash - expectedBalance;

      await closeSession({
        id: selectedSession.id,
        closingBalance: Number(closingBalance) || 0,
        expectedBalance,
        discrepancy,
        cashSales,
        cardSales,
        digitalSales,
        notes: notes.trim() || undefined,
      }).unwrap();
      await printSessionReport(selectedSession, sessionOrders);
      setShowCloseModal(false);
      setSelectedSession(null);
      setClosingBalance("0");
      setNotes("");
      refetch();
      Alert.alert("Success", "Session closed successfully");
    } catch (error: any) {
      Alert.alert("Error", error?.data?.message || "Failed to close session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSessionCard = (session: any) => {
    const isActive = session.status === "OPEN";
    const sessionOrders = orders.filter((o: any) => o.sessionId === session.id);
    const totalSales = sessionOrders
      .filter(isCountedSale)
      .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);
    const orderCount = sessionOrders.length;

    return (
      <Card key={session.id} className="mb-4">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-bold text-base">
                Session #{session.id.slice(-6)}
              </Text>
              <Pill
                label={isActive ? "OPEN" : "CLOSED"}
                tone={isActive ? "emerald" : "rose"}
              />
            </View>
            <Text className="text-slate-400 text-xs mt-1">
              Opened: {new Date(session.openedAt).toLocaleString()}
            </Text>
            {session.closedAt && (
              <Text className="text-slate-400 text-xs">
                Closed: {new Date(session.closedAt).toLocaleString()}
              </Text>
            )}
            <Text className="text-slate-400 text-xs mt-0.5">
              Orders: {orderCount} • Total: ${totalSales.toFixed(2)}
            </Text>
            {session.notes && (
              <Text className="text-slate-500 text-xs mt-1 italic">
                {session.notes}
              </Text>
            )}
          </View>
          <View className="items-end">
            <Text className="text-emerald-400 font-bold">
              ${totalSales.toFixed(2)}
            </Text>
            {isActive && canManageSession && (
              <TouchableOpacity
                className="mt-2 bg-rose-500/20 px-3 py-1.5 rounded-full border border-rose-500/30"
                onPress={() => {
                  setSelectedSession(session);
                  setShowCloseModal(true);
                }}
              >
                <Text className="text-rose-400 text-xs font-bold">Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen padded={false}>
      <SafeAreaView className="flex-1 bg-slate-950">
        <View className="px-5 pt-6 pb-2">
          <Header
            eyebrow="Cash Management"
            title="Sessions"
            subtitle="View, open, and close cash sessions"
            right={
              <TouchableOpacity
                className="bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30 flex-row items-center"
                onPress={() => setShowOpenModal(true)}
                disabled={!!activeSession || !canManageSession}
              >
                <MaterialIcons
                  name="add"
                  size={16}
                  color={activeSession ? "#64748b" : "#34d399"}
                />
                <Text
                  className={`text-xs font-bold ml-1 ${
                    activeSession ? "text-slate-400" : "text-emerald-400"
                  }`}
                >
                  {activeSession ? "Session Active" : "Open Session"}
                </Text>
              </TouchableOpacity>
            }
          />
        </View>

        <ScrollView
          className="px-5"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#38bdf8"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Metrics */}
          <View className="flex gap-3 mb-5">
            <View className="flex flex-row gap-2">
              <MetricCard
                // icon="schedule"
                label="Active"
                value={activeSession ? "1" : "0"}
                tone={activeSession ? "emerald" : "amber"}
              />
              <MetricCard
                // icon="history"
                label="Total Closed"
                value={closedSessions.length.toString()}
                tone="sky"
              />
            </View>
            <MetricCard
              // icon="attach-money"
              label="Today's Sales"
              value={`$${orders
                .filter(
                  (o: any) =>
                    isCountedSale(o) &&
                    new Date(o.createdAt).toDateString() ===
                      new Date().toDateString(),
                )
                .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0)
                .toFixed(2)}`}
              tone="emerald"
            />
          </View>

          {/* Active Session Highlight */}
          {activeSession && (
            <Card className="mb-5 border border-emerald-500/30 bg-emerald-500/10">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-emerald-400 font-bold text-sm">
                    Active Session
                  </Text>
                  <Text className="text-white font-black text-xl">
                    #{activeSession.id.slice(-6)}
                  </Text>
                  <Text className="text-slate-400 text-xs">
                    Opened:{" "}
                    {new Date(activeSession.openedAt).toLocaleTimeString()}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-emerald-400 font-bold text-lg">
                    $
                    {orders
                      .filter(
                        (o: any) =>
                          o.sessionId === activeSession.id && isCountedSale(o),
                      )
                      .reduce(
                        (sum: number, o: any) => sum + (o.grandTotal || 0),
                        0,
                      )
                      .toFixed(2)}
                  </Text>
                  <Text className="text-slate-500 text-xs">Sales</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Sessions List */}
          <SectionTitle
            title="All Sessions"
            action={sessions.length ? `${sessions.length} total` : undefined}
          />
          {sessions.length > 0 ? (
            sessions.map(renderSessionCard)
          ) : (
            <Card>
              <Text className="text-center text-slate-400 py-6">
                No sessions found. Open your first session.
              </Text>
            </Card>
          )}
        </ScrollView>

        {/* Open Session Modal */}
        <Modal
          visible={showOpenModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowOpenModal(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-slate-900 rounded-t-3xl p-6">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-white font-bold text-xl">
                  Open Session
                </Text>
                <TouchableOpacity onPress={() => setShowOpenModal(false)}>
                  <MaterialIcons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text className="text-slate-400 text-xs uppercase tracking-widest mb-2">
                Opening Balance ($)
              </Text>
              <TextInput
                className="bg-white/5 rounded-2xl px-4 py-3 text-white text-lg border border-white/10 mb-4"
                keyboardType="decimal-pad"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />

              <Text className="text-slate-400 text-xs uppercase tracking-widest mb-2">
                Notes (Optional)
              </Text>
              <TextInput
                className="bg-white/5 rounded-2xl px-4 py-3 text-white text-sm border border-white/10 mb-6"
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Morning shift"
                placeholderTextColor="#64748b"
                multiline
              />

              <TouchableOpacity
                className={`bg-emerald-500 rounded-2xl py-4 items-center ${
                  isSubmitting ? "opacity-60" : ""
                }`}
                onPress={handleOpenSession}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Open Session
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Close Session Modal */}
        <Modal
          visible={showCloseModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCloseModal(false)}
        >
          <View className="flex-1 bg-black/60 justify-end">
            <View className="bg-slate-900 rounded-t-3xl p-6 max-h-[80%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white font-bold text-xl">
                  Close Session
                </Text>
                <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                  <MaterialIcons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {selectedSession && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Card className="mb-4">
                    <StatRow
                      label="Session"
                      value={`#${selectedSession.id.slice(-6)}`}
                    />
                    <StatRow
                      label="Opened"
                      value={new Date(
                        selectedSession.openedAt,
                      ).toLocaleString()}
                    />
                    <StatRow
                      label="Opening Balance"
                      value={`$${selectedSession.openingBalance?.toFixed(2) || "0.00"}`}
                    />
                    <StatRow
                      label="Cash sales"
                      value={`$${selectedPaymentTotals.CASH.toFixed(2)}`}
                    />
                    <StatRow
                      label="Expected cash"
                      value={`$${expectedClosingCash.toFixed(2)}`}
                    />
                    <StatRow
                      label="Difference"
                      value={`${cashDifference >= 0 ? "+" : "-"}$${Math.abs(cashDifference).toFixed(2)}`}
                    />
                  </Card>

                  <Text className="text-slate-400 text-xs uppercase tracking-widest mb-2">
                    Closing Balance ($)
                  </Text>
                  <TextInput
                    className="bg-white/5 rounded-2xl px-4 py-3 text-white text-lg border border-white/10 mb-4"
                    keyboardType="decimal-pad"
                    value={closingBalance}
                    onChangeText={setClosingBalance}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                  />

                  <Text className="text-slate-400 text-xs uppercase tracking-widest mb-2">
                    Notes (Optional)
                  </Text>
                  <TextInput
                    className="bg-white/5 rounded-2xl px-4 py-3 text-white text-sm border border-white/10 mb-6"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="End of shift notes"
                    placeholderTextColor="#64748b"
                    multiline
                  />

                  <TouchableOpacity
                    className={`bg-rose-500 rounded-2xl py-4 items-center ${
                      isSubmitting ? "opacity-60" : ""
                    }`}
                    onPress={handleCloseSession}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Close Session
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

async function printSessionReport(session: any, sessionOrders: any[]) {
  const saleOrders = sessionOrders.filter(isCountedSale);
  const totalSales = saleOrders.reduce(
    (sum, order) => sum + Number(order.grandTotal ?? 0),
    0,
  );
  const paymentTotals = saleOrders.reduce(
    (totals, order) => addPaymentTotals(totals, order),
    emptyPaymentTotals(),
  );
  const orderRows = sessionOrders
    .map((order) => {
      const items =
        Array.isArray(order.items) && order.items.length
          ? order.items
              .map(
                (item: any) =>
                  `<tr><td>${escapeHtml(item.productName || "Item")}</td><td>${item.quantity}</td><td class="right">$${money(item.subTotal ?? item.unitPrice * item.quantity)}</td></tr>`,
              )
              .join("")
          : `<tr><td colspan="3" class="muted">No item details</td></tr>`;
      return `
        <tr class="order-heading">
          <td colspan="3"><strong>#${escapeHtml(order.orderNumber || order.id.slice(-6))}</strong> · ${escapeHtml(order.paymentMethod || "CASH")} · $${money(order.grandTotal)}</td>
        </tr>
        ${items}`;
    })
    .join("");
  const paymentRows = Object.entries(paymentTotals)
    .map(
      ([method, amount]) =>
        `<tr><td>${escapeHtml(method)}</td><td class="right">$${money(amount)}</td></tr>`,
    )
    .join("");

  try {
    await Print.printAsync({
      html: `<!doctype html><html><head><meta charset="utf-8" /><style>
        body { font-family: Courier New, monospace; font-size: 11px; padding: 14px; }
        h2, .center { text-align: center; } h2 { margin: 0 0 4px; }
        .muted { color: #666; } .right { text-align: right; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 0; vertical-align: top; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .order-heading { border-top: 1px solid #000; padding-top: 5px; }
      </style></head><body>
        <h2>SESSION CLOSE REPORT</h2>
        <div class="center">Session #${escapeHtml(session.id.slice(-6))}</div>
        <div class="center">Opened: ${escapeHtml(new Date(session.openedAt).toLocaleString())}</div>
        <div class="divider"></div>
        <table><tr><td>Orders</td><td class="right">${sessionOrders.length}</td></tr><tr><td>Total sales</td><td class="right"><strong>$${money(totalSales)}</strong></td></tr></table>
        <div class="divider"></div><strong>PAYMENT TOTALS</strong><table>${paymentRows}</table>
        <div class="divider"></div><strong>ORDERS</strong><table>${orderRows}</table>
        <div class="divider"></div><div class="center">Printed: ${escapeHtml(new Date().toLocaleString())}</div>
      </body></html>`,
      orientation: Print.Orientation.portrait,
      margins: { left: 5, top: 5, right: 5, bottom: 5 },
    });
  } catch (error: any) {
    Alert.alert(
      "Session closed",
      `The session closed, but the report could not be printed. ${error?.message || ""}`,
    );
  }
}

function money(value: unknown) {
  return Number(value ?? 0).toFixed(2);
}

function isCountedSale(order: any) {
  return !["VOIDED", "CANCELLED"].includes(order.status);
}

function emptyPaymentTotals() {
  return { CASH: 0, CARD: 0, DIGITAL: 0 };
}

function addPaymentTotals(
  totals: { CASH: number; CARD: number; DIGITAL: number },
  order: any,
) {
  const breakdown = Array.isArray(order.paymentBreakdown)
    ? order.paymentBreakdown
    : [];
  if (breakdown.length > 0) {
    for (const tender of breakdown) {
      const method = String(tender.method || "DIGITAL").toUpperCase();
      const amount = Number(tender.amount ?? 0);
      if (method === "CASH") totals.CASH += amount;
      else if (method === "CARD") totals.CARD += amount;
      else totals.DIGITAL += amount;
    }
    return totals;
  }

  const method = String(order.paymentMethod || "DIGITAL").toUpperCase();
  if (method === "CASH") totals.CASH += Number(order.grandTotal ?? 0);
  else if (method === "CARD") totals.CARD += Number(order.grandTotal ?? 0);
  else totals.DIGITAL += Number(order.grandTotal ?? 0);
  return totals;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
