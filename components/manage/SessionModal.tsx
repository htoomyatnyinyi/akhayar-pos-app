// components/SessionModal.tsx
import React, { useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Card, StatRow } from "@/components/app-ui";

export default function SessionModal({
  visible,
  mode,
  activeSession,
  sessions,
  orders,
  onClose,
  onOpen,
  onCloseSession,
  isSubmitting,
}: {
  visible: boolean;
  mode: "open" | "close" | null;
  activeSession: any;
  sessions: any[];
  orders: any[];
  onClose: () => void;
  onOpen: (openingBalance: string, notes: string) => Promise<void>;
  onCloseSession: (
    closingBalance: string,
    notes: string,
    sessionId: string,
  ) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [balance, setBalance] = useState("0");
  const [notes, setNotes] = useState("");

  const sessionToClose = activeSession;

  const handleOpen = async () => {
    await onOpen(balance, notes);
    setBalance("0");
    setNotes("");
    onClose();
  };

  const handleClose = async () => {
    if (!sessionToClose) return;
    await onCloseSession(balance, notes, sessionToClose.id);
    setBalance("0");
    setNotes("");
    onClose();
  };

  const sessionOrders = sessionToClose
    ? orders.filter((o: any) => o.sessionId === sessionToClose.id)
    : [];
  const saleOrders = sessionOrders.filter(isCountedSale);
  const totalSales = saleOrders.reduce(
    (sum: number, o: any) => sum + (o.grandTotal || 0),
    0,
  );
  const paymentTotals = saleOrders.reduce(
    (totals, order) => addPaymentTotals(totals, order),
    emptyPaymentTotals(),
  );
  const expectedCash =
    Number(sessionToClose?.openingBalance ?? 0) + paymentTotals.CASH;
  const difference = (Number(balance) || 0) - expectedCash;
  const orderCount = sessionOrders.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[80%] rounded-t-3xl bg-slate-900 p-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-white">
              {mode === "open" ? "Open Session" : "Close Session"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {mode === "close" && sessionToClose && (
            <>
              <Card className="mb-4">
                <StatRow
                  label="Session"
                  value={`#${sessionToClose.id.slice(-6)}`}
                />
                <StatRow
                  label="Opened"
                  value={new Date(sessionToClose.openedAt).toLocaleString()}
                />
                <StatRow
                  label="Opening Balance"
                  value={`$${sessionToClose.openingBalance?.toFixed(2) || "0.00"}`}
                />
                <StatRow
                  label="Total Sales"
                  value={`$${totalSales.toFixed(2)}`}
                />
                <StatRow label="Orders" value={orderCount.toString()} />
                <StatRow
                  label="Cash Sales"
                  value={`$${paymentTotals.CASH.toFixed(2)}`}
                />
                <StatRow
                  label="Expected Cash"
                  value={`$${expectedCash.toFixed(2)}`}
                />
                <StatRow
                  label="Difference"
                  value={`${difference >= 0 ? "+" : "-"}$${Math.abs(difference).toFixed(2)}`}
                />
              </Card>
              <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
                Closing Balance ($)
              </Text>
              <TextInput
                className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white"
                keyboardType="decimal-pad"
                value={balance}
                onChangeText={setBalance}
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />
            </>
          )}

          {mode === "open" && (
            <>
              <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
                Opening Balance ($)
              </Text>
              <TextInput
                className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white"
                keyboardType="decimal-pad"
                value={balance}
                onChangeText={setBalance}
                placeholder="0.00"
                placeholderTextColor="#64748b"
              />
            </>
          )}

          <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
            Notes (Optional)
          </Text>
          <TextInput
            className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            value={notes}
            onChangeText={setNotes}
            placeholder={
              mode === "open" ? "e.g. Morning shift" : "End of shift notes"
            }
            placeholderTextColor="#64748b"
            multiline
          />

          <TouchableOpacity
            className={`${
              mode === "open" ? "bg-emerald-500" : "bg-rose-500"
            } items-center rounded-2xl py-4 ${isSubmitting ? "opacity-60" : ""}`}
            onPress={mode === "open" ? handleOpen : handleClose}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-bold text-white">
                {mode === "open" ? "Open Session" : "Close Session"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
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
  if (breakdown.length) {
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
  const amount = Number(order.grandTotal ?? 0);
  if (method === "CASH") totals.CASH += amount;
  else if (method === "CARD") totals.CARD += amount;
  else totals.DIGITAL += amount;
  return totals;
}
