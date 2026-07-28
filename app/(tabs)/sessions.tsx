// ============================================
// FILE: app/(tabs)/sessions.tsx
// ============================================

import {
  ActionButton,
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
import { router } from "expo-router";
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

export default function SessionsScreen() {
  const { user, currentStoreId } = useAppSelector((state) => state.auth);

  const {
    data: sessions = [],
    isLoading,
    refetch,
  } = useGetLocalSessionsQuery({
    storeId: currentStoreId || undefined,
  });

  const { data: orders = [] } = useGetLocalOrdersQuery({
    storeId: currentStoreId || undefined,
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

  const handleOpenSession = async () => {
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
    if (!selectedSession) return;
    setIsSubmitting(true);
    try {
      const sessionOrders = orders.filter(
        (o: any) => o.sessionId === selectedSession.id,
      );
      const totalSales = sessionOrders.reduce(
        (sum: number, o: any) => sum + (o.grandTotal || 0),
        0,
      );
      const cashSales = sessionOrders
        .filter((o: any) => o.paymentMethod === "CASH")
        .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);
      const cardSales = sessionOrders
        .filter((o: any) => o.paymentMethod === "CARD")
        .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);
      const digitalSales = sessionOrders
        .filter((o: any) => o.paymentMethod === "DIGITAL")
        .reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0);

      await closeSession({
        id: selectedSession.id,
        closingBalance: Number(closingBalance) || 0,
        expectedBalance: Number(closingBalance) || 0,
        discrepancy: 0,
        cashSales,
        cardSales,
        digitalSales,
        notes: notes.trim() || undefined,
      }).unwrap();
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
    const totalSales = sessionOrders.reduce(
      (sum: number, o: any) => sum + (o.grandTotal || 0),
      0,
    );
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
            {isActive && (
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
                disabled={!!activeSession}
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
          <View className="flex-row gap-3 mb-5">
            <MetricCard
              icon="schedule"
              label="Active"
              value={activeSession ? "1" : "0"}
              tone={activeSession ? "emerald" : "amber"}
            />
            <MetricCard
              icon="history"
              label="Total Closed"
              value={closedSessions.length.toString()}
              tone="sky"
            />
            <MetricCard
              icon="attach-money"
              label="Today's Sales"
              value={`$${orders
                .filter(
                  (o: any) =>
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
                      .filter((o: any) => o.sessionId === activeSession.id)
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
