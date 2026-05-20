import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { logout } from "@/services/features/auth/authSlice";
import { setContinuousScan } from "@/services/features/settings/settingsSlice";
import { useGetProductsQuery } from "@/services/features/products/productApi";
import { useGetOrdersQuery } from "@/services/features/order/orderApi";
import {
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useCloseSessionMutation,
} from "@/services/features/sessions/sessionApi";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} from "@/services/features/staff/staffApi";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "@/services/features/customers/customerApi";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
} from "@/services/features/suppliers/supplierApi";
import {
  useGetStoresQuery,
  useUpdateStoreMutation,
} from "@/services/features/stores/storeApi";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from "@/services/features/categories/categoryApi";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: any) => state.auth.user);
  const currentStoreId = useAppSelector(
    (state: any) => state.auth.currentStoreId,
  );
  const isContinuousScan = useAppSelector(
    (state: any) => state.settings?.isContinuousScan,
  );

  const role = user?.role || "CASHIER";
  const isAdmin = role === "ADMIN";
  const isCashier = role === "CASHIER";

  const CONFIG_ITEMS = [
    {
      id: "STAFF",
      title: "Staff Members",
      emoji: <MaterialIcons name="group-add" size={24} color="blue" />,
      subtitle: "Roles & Permissions",
      restricted: !isAdmin,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      id: "CUSTOMERS",
      title: "Customers",
      emoji: <MaterialIcons name="person-add" size={24} color="green" />,
      subtitle: "Loyalty Program",
      restricted: false,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      id: "SUPPLIERS",
      title: "Suppliers",
      emoji: <MaterialIcons name="local-shipping" size={24} color="orange" />,
      subtitle: "Inventory Partners",
      restricted: isCashier,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      id: "CATEGORIES",
      title: "Categories",
      emoji: <MaterialIcons name="local-offer" size={24} color="purple" />,
      subtitle: "Product Groups",
      restricted: isCashier,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      id: "STORE",
      title: "Store Profile",
      emoji: <MaterialIcons name="store" size={24} color="red" />,
      subtitle: "General Configuration",
      restricted: !isAdmin,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
    },
  ];

  const { data: products } = useGetProductsQuery(currentStoreId || undefined);
  const { data: orders } = useGetOrdersQuery(currentStoreId || undefined);

  // Shift Management State
  const {
    data: activeSession,
    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useGetActiveSessionQuery(
    { userId: user?.id || "", storeId: currentStoreId || undefined },
    { skip: !user?.id },
  );
  const [openSession, { isLoading: isOpening }] = useOpenSessionMutation();
  const [closeSession, { isLoading: isClosing }] = useCloseSessionMutation();

  const [isShiftModalVisible, setIsShiftModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"OPEN" | "CLOSE">("OPEN");
  const [balanceInput, setBalanceInput] = useState("");

  // Management State
  const [activeManageModal, setActiveManageModal] = useState<
    "STAFF" | "CUSTOMERS" | "SUPPLIERS" | "STORE" | "CATEGORIES" | null
  >(null);

  // API Hooks for Management
  const { data: staffList } = useGetStaffQuery(currentStoreId || undefined);
  const { data: customerList } = useGetCustomersQuery(
    currentStoreId || undefined,
  );
  const { data: supplierList } = useGetSuppliersQuery(
    currentStoreId || undefined,
  );
  const { data: storeList } = useGetStoresQuery();
  const { data: categoryList } = useGetCategoriesQuery(
    currentStoreId || undefined,
  );

  const [createStaff] = useCreateStaffMutation();
  const [updateStaff] = useUpdateStaffMutation();
  const [updateStore] = useUpdateStoreMutation();
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formValue1, setFormValue1] = useState(""); // Email/Phone/Address
  const [formValue2, setFormValue2] = useState(""); // Role/Tax/Contact
  const [formPassword, setFormPassword] = useState(""); // Password for new staff

  const [deleteStaff] = useDeleteStaffMutation();

  const handleSaveStore = async () => {
    if (!storeList?.[0]) return;
    try {
      await updateStore({
        id: storeList[0].id,
        data: { name: formName, address: formValue1, phone: formValue2 },
      }).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Store profile updated.");
      setActiveManageModal(null);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to update store.");
    }
  };

  const handleSaveStaff = async () => {
    if (
      !formName ||
      !formValue1 ||
      !formValue2 ||
      (!editingId && !formPassword)
    ) {
      Alert.alert(
        "Missing Information",
        "Please fill in all fields (Name, Email, Role, and Password).",
      );
      return;
    }
    try {
      const emailLower = formValue1.toLowerCase().trim();
      if (editingId) {
        await updateStaff({
          id: editingId,
          data: {
            name: formName,
            email: emailLower,
            role: formValue2 as any,
            permissions: [],
          },
        }).unwrap();
      } else {
        await createStaff({
          name: formName,
          email: emailLower,
          username: emailLower,
          password: formPassword,
          role: formValue2 as any,
          permissions: [],
          storeId: currentStoreId || undefined,
        }).unwrap();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Staff member saved.");
      setEditingId(null);
      setFormName("");
      setFormValue1("");
      setFormValue2("CASHIER");
      setFormPassword("");
    } catch (error: any) {
      console.error("Staff save error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error?.data?.message ||
          "Failed to save staff member. The email might already be in use.",
      );
    }
  };

  const handleSaveCustomer = async () => {
    try {
      if (editingId) {
        await updateCustomer({
          id: editingId,
          data: { name: formName, phone: formValue1, address: formValue2 },
        }).unwrap();
      } else {
        await createCustomer({
          name: formName,
          phone: formValue1,
          address: formValue2,
          storeId: currentStoreId || undefined,
        } as any).unwrap();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Customer saved.");
      setEditingId(null);
      setFormName("");
      setFormValue1("");
      setFormValue2("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save customer.");
    }
  };

  const handleSaveSupplier = async () => {
    try {
      if (editingId) {
        await updateSupplier({
          id: editingId,
          data: { name: formName, contactName: formValue1, phone: formValue2 },
        }).unwrap();
      } else {
        await createSupplier({
          name: formName,
          contactName: formValue1,
          phone: formValue2,
          storeId: currentStoreId || undefined,
        } as any).unwrap();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Supplier saved.");
      setEditingId(null);
      setFormName("");
      setFormValue1("");
      setFormValue2("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save supplier.");
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (editingId) {
        await updateCategory({
          id: editingId,
          data: {
            name: formName,
            slug: formName.toLowerCase().replace(/ /g, "-"),
          },
        }).unwrap();
      } else {
        await createCategory({
          name: formName,
          slug: formName.toLowerCase().replace(/ /g, "-"),
          storeId: currentStoreId || undefined,
        } as any).unwrap();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Category saved.");
      setEditingId(null);
      setFormName("");
      setFormValue1("");
      setFormValue2("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save category.");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this staff member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStaff(id).unwrap();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert("Deleted", "Staff member removed.");
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to delete staff member.");
            }
          },
        },
      ],
    );
  };

  const handleShiftAction = async () => {
    if (!balanceInput || isNaN(Number(balanceInput))) {
      Alert.alert("Invalid Amount", "Please enter a valid cash amount.");
      return;
    }
    const balance = Number(balanceInput);
    try {
      if (!user) return;
      if (modalMode === "OPEN") {
        await openSession({
          userId: user.id,
          openingBalance: balance,
          notes: "Opened via mobile terminal",
          storeId: currentStoreId || undefined,
        }).unwrap();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Shift Opened", "You can now process transactions.");
      } else {
        await closeSession({
          sessionId: activeSession!.id,
          data: {
            closingBalance: balance,
            notes: "Closed via mobile terminal",
          },
        }).unwrap();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Shift Closed", "Shift ended successfully.");
        dispatch(logout()); // Auto logout after closing shift
      }
      setIsShiftModalVisible(false);
      setBalanceInput("");
      refetchSession();
    } catch (error: any) {
      console.error("Shift action error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error?.data?.message || `Failed to ${modalMode.toLowerCase()} shift.`,
      );
    }
  };

  const handleLogout = () => {
    if (activeSession) {
      Alert.alert(
        "Active Shift",
        "You have an active shift. Please end your shift before signing out.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "End Shift",
            onPress: () => {
              setModalMode("CLOSE");
              setIsShiftModalVisible(true);
            },
          },
        ],
      );
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  const activeProducts =
    products?.filter((p: any) => p.stockQuantity > 0).length || 0;
  const currentStore = user?.stores?.find((s: any) => s.id === currentStoreId);

  // Analytics Calculations
  const shiftOrders =
    orders?.filter((o: any) => o.sessionId === activeSession?.id) || [];
  const shiftSales = shiftOrders.reduce(
    (sum: number, o: any) => sum + Number(o.grandTotal || 0),
    0,
  );

  let cashTotal = 0,
    kbzTotal = 0,
    waveTotal = 0,
    cardTotal = 0;
  shiftOrders.forEach((o: any) => {
    const amount = Number(o.grandTotal || 0);
    if (o.paymentMethod === "CASH") cashTotal += amount;
    else if (o.paymentMethod === "KBZ_PAY") kbzTotal += amount;
    else if (o.paymentMethod === "WAVE_PAY") waveTotal += amount;
    else if (o.paymentMethod === "CARD") cardTotal += amount;
  });

  const totalPayment = shiftSales || 1;
  const cashPct = (cashTotal / totalPayment) * 100;
  const kbzPct = (kbzTotal / totalPayment) * 100;
  const wavePct = (waveTotal / totalPayment) * 100;
  const cardPct = (cardTotal / totalPayment) * 100;

  const lowStockCount =
    products?.filter(
      (p: any) =>
        p.stockQuantity > 0 && p.stockQuantity <= (p.reorderPoint || 10),
    ).length || 0;
  const outOfStockCount =
    products?.filter((p: any) => p.stockQuantity <= 0).length || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0c10" }}>
      {/* Header */}
      <View className="px-6 py-5 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center z-10">
        <View className="flex-row items-center">
          <View className="w-1.5 h-9 bg-[#f59e0b] rounded-full mr-3.5 shadow-lg shadow-[#f59e0b]/50" />
          <View>
            <Text className="text-2xl font-black text-slate-100 tracking-tight">
              Settings
            </Text>
            <Text className="text-[9px] font-black text-amber-400 tracking-[3px] uppercase mt-0.5">
              Configuration & Profile
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(600).springify()}>
          <View className="bg-[#1f2232] m-6 p-8 rounded-[40px] items-center border border-[#2a2e43] shadow-2xl relative overflow-hidden">
            <View className="absolute top-0 w-full h-32" />
            <View className="w-24 h-24 bg-indigo-600 rounded-[32px] items-center justify-center mb-5 shadow-2xl border-4 border-[#1f2232]">
              <Text className="text-white text-4xl font-black">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text className="text-slate-100 text-3xl font-extrabold tracking-tight">
              {user?.name || "User"}
            </Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="bg-[#121420] px-3 py-1 rounded-md border border-[#2a2e43]">
                <Text className="text-indigo-400 font-black text-[9px] uppercase tracking-[3px]">
                  {user?.role || "Staff"}
                </Text>
              </View>
              <Text className="text-slate-700">•</Text>
              <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-[2px]">
                {currentStore?.name || "Global Terminal"}
              </Text>
            </View>

            {/* Shift Status Indicator */}
            {isLoadingSession ? (
              <ActivityIndicator color="#8b5cf6" style={{ marginTop: 24 }} />
            ) : activeSession ? (
              <View className="flex-row items-center gap-2 bg-emerald-500/10 px-5 py-2.5 rounded-[16px] border border-emerald-500/20 mt-6">
                <View className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <Text className="text-emerald-400 text-[10px] font-black uppercase tracking-[3px]">
                  Active Shift
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setModalMode("OPEN");
                  setIsShiftModalVisible(true);
                }}
                className="flex-row items-center gap-2 bg-amber-500/10 px-6 py-3 rounded-[20px] border border-amber-500/30 mt-6"
              >
                <View className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <Text className="text-amber-400 text-[11px] font-extrabold uppercase tracking-widest">
                  Start Shift
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Interactive Visual Analytics Dashboard */}
        {activeSession && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(100).springify()}
            className="px-6 mb-8"
          >
            <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[4px] mb-4 ml-1">
              Shift Analytics
            </Text>

            <View className="bg-[#1f2232] rounded-[32px] p-6 border border-[#2a2e43] shadow-xl">
              {/* Gross Revenue Header */}
              <View className="mb-6 flex-row justify-between items-start">
                <View>
                  <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-1">
                    Gross Revenue
                  </Text>
                  <Text className="text-emerald-400 font-black text-4xl tracking-tight">
                    ${shiftSales.toFixed(2)}
                  </Text>
                  <Text className="text-slate-500 font-bold text-xs mt-1">
                    {shiftOrders.length} transactions processed
                  </Text>
                </View>
                <View className="w-12 h-12 bg-emerald-500/10 rounded-full border border-emerald-500/20 items-center justify-center shadow-lg">
                  {/* <Text className="text-2xl">📈</Text> */}
                  <MaterialIcons name="analytics" size={24} color="#fff" />
                </View>
              </View>

              {/* Payment Methods Bar */}
              <View className="mb-6">
                <Text className="text-slate-500 font-black text-[10px] uppercase tracking-[3px] mb-3">
                  Payment Ratio
                </Text>
                <View className="h-4 flex-row rounded-full overflow-hidden mb-3 bg-[#121420]">
                  {cashPct > 0 && (
                    <View
                      style={{ width: `${cashPct}%` }}
                      className="bg-emerald-500"
                    />
                  )}
                  {kbzPct > 0 && (
                    <View
                      style={{ width: `${kbzPct}%` }}
                      className="bg-blue-500"
                    />
                  )}
                  {wavePct > 0 && (
                    <View
                      style={{ width: `${wavePct}%` }}
                      className="bg-amber-500"
                    />
                  )}
                  {cardPct > 0 && (
                    <View
                      style={{ width: `${cardPct}%` }}
                      className="bg-purple-500"
                    />
                  )}
                </View>
                <View className="flex-row flex-wrap gap-x-4 gap-y-2">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                    <Text className="text-slate-400 text-[10px] font-bold">
                      CASH {cashPct.toFixed(0)}%
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                    <Text className="text-slate-400 text-[10px] font-bold">
                      KBZ {kbzPct.toFixed(0)}%
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-amber-500" />
                    <Text className="text-slate-400 text-[10px] font-bold">
                      WAVE {wavePct.toFixed(0)}%
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-purple-500" />
                    <Text className="text-slate-400 text-[10px] font-bold">
                      CARD {cardPct.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Catalog Health */}
              <View className="flex-row gap-3 pt-4 border-t border-[#2a2e43]">
                <View className="flex-1 bg-amber-500/10 p-4 rounded-[20px] border border-amber-500/20 items-center">
                  <Text className="text-amber-400 font-black text-2xl mb-1">
                    {lowStockCount}
                  </Text>
                  <Text className="text-amber-400/70 font-black text-[9px] uppercase tracking-[2px]">
                    Low Stock
                  </Text>
                </View>
                <View className="flex-1 bg-rose-500/10 p-4 rounded-[20px] border border-rose-500/20 items-center">
                  <Text className="text-rose-400 font-black text-2xl mb-1">
                    {outOfStockCount}
                  </Text>
                  <Text className="text-rose-400/70 font-black text-[9px] uppercase tracking-[2px]">
                    Empty
                  </Text>
                </View>
                <View className="flex-1 bg-indigo-500/10 p-4 rounded-[20px] border border-indigo-500/20 items-center">
                  <Text className="text-indigo-400 font-black text-2xl mb-1">
                    {activeProducts}
                  </Text>
                  <Text className="text-indigo-400/70 font-black text-[9px] uppercase tracking-[2px]">
                    Active
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Scanner Settings */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150).springify()}
          className="px-6 mb-8"
        >
          <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[4px] mb-4 ml-1">
            Terminal Setup
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              dispatch(setContinuousScan(!isContinuousScan));
            }}
            activeOpacity={0.8}
            className="bg-[#1f2232] p-5 rounded-[28px] flex-row items-center justify-between border border-[#2a2e43] shadow-lg"
          >
            <View className="flex-row items-center gap-4">
              <View
                className={`w-12 h-12 rounded-[20px] items-center justify-center border transition-colors ${isContinuousScan ? "bg-indigo-500/20 border-indigo-500/30" : "bg-[#121420] border-[#2a2e43]"}`}
              >
                <Text className="text-xl">
                  {isContinuousScan ? (
                    <MaterialIcons name="scanner" size={24} color="green" />
                  ) : (
                    <MaterialIcons name="scanner" size={24} color="red" />
                  )}
                </Text>
              </View>
              <View>
                <Text className="text-slate-100 font-extrabold text-base tracking-wide">
                  Continuous Scan
                </Text>
                <Text className="text-slate-500 text-[10px] font-bold mt-0.5">
                  {isContinuousScan
                    ? "Rapid fire item scanning"
                    : "Verify each item scan"}
                </Text>
              </View>
            </View>
            <View
              className={`w-14 h-8 rounded-full p-1 transition-colors ${isContinuousScan ? "bg-indigo-600" : "bg-[#121420]"}`}
            >
              <View
                className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${isContinuousScan ? "translate-x-6" : "translate-x-0"}`}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View className="px-6 mb-8">
          <Text className="text-slate-600 text-[10px] font-black uppercase tracking-[4px] mb-5 ml-4">
            Management Modules
          </Text>
          {CONFIG_ITEMS.map((item, index) => {
            if (item.restricted) return null;
            return (
              <SettingItem
                key={item.id}
                emoji={item.emoji}
                title={item.title}
                subtitle={item.subtitle}
                color={item.color}
                bg={item.bg}
                border={item.border}
                delay={200 + index * 50}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveManageModal(item.id as any);
                  setEditingId(null);
                  setFormName("");
                  setFormValue1("");
                  setFormValue2(item.id === "STAFF" ? "CASHIER" : "");
                  if (item.id === "STORE" && storeList?.[0]) {
                    setFormName(storeList[0].name);
                    setFormValue1(storeList[0].address || "");
                    setFormValue2(storeList[0].phone || "");
                  }
                }}
              />
            );
          })}
        </View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(450).springify()}
          className="px-6"
        >
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-rose-500/10 p-6 rounded-[28px] flex-row items-center justify-center border border-rose-500/20 shadow-lg"
          >
            <Text className="text-rose-400 font-extrabold text-lg tracking-wide">
              {activeSession ? "End Shift & Sign Out" : "Sign Out"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View className="items-center mt-12 opacity-30">
          <Text className="text-slate-400 font-black text-[9px] uppercase tracking-[5px]">
            miniPOS v1.1
          </Text>
        </View>
      </ScrollView>

      {/* Shift Management Modal */}
      <Modal
        visible={isShiftModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <Animated.View
            entering={FadeInUp.duration(400).springify()}
            className="bg-[#1f2232] w-full max-w-sm rounded-[40px] p-8 items-center border border-[#2a2e43] shadow-2xl"
          >
            <View
              className={`w-20 h-20 rounded-[28px] items-center justify-center mb-6 border ${modalMode === "OPEN" ? "bg-amber-500/20 border-amber-500/30" : "bg-rose-500/20 border-rose-500/30"}`}
            >
              <Text className="text-4xl drop-shadow-lg">💵</Text>
            </View>
            <Text className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
              {modalMode === "OPEN" ? "Start Shift" : "End Shift"}
            </Text>
            <Text className="text-slate-400 font-bold text-center text-xs px-4 mb-8 leading-5">
              {modalMode === "OPEN"
                ? "Please count the cash drawer and enter the opening balance to begin."
                : "Count the physical cash in the drawer and enter the final closing balance."}
            </Text>

            <View className="w-full mb-8 relative">
              <Text className="absolute left-6 top-[22px] text-2xl font-black text-slate-500 z-10">
                $
              </Text>
              <TextInput
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#475569"
                autoFocus
                className="w-full bg-[#121420] border border-[#2a2e43] rounded-[24px] py-5 pl-12 pr-6 text-white text-3xl font-black"
              />
            </View>

            <View className="w-full flex-row gap-4">
              <TouchableOpacity
                onPress={() => setIsShiftModalVisible(false)}
                className="flex-1 py-5 rounded-[24px] items-center border border-[#2a2e43] bg-[#121420]"
              >
                <Text className="text-slate-300 font-extrabold tracking-wide">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShiftAction}
                disabled={isOpening || isClosing}
                className={`flex-1 py-5 rounded-[24px] items-center ${modalMode === "OPEN" ? "bg-amber-600 border border-amber-500/50" : "bg-rose-600 border border-rose-500/50"} shadow-lg`}
              >
                {isOpening || isClosing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-extrabold text-lg tracking-wide">
                    {modalMode === "OPEN" ? "Open" : "Close"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Management Container Modal */}
      <Modal
        visible={!!activeManageModal}
        animationType="slide"
        onRequestClose={() => setActiveManageModal(null)}
      >
        <View className="flex-1 bg-[#0b0c10]">
          <View className="px-6 py-6 bg-[#161925] border-b border-[#1f2232] flex-row justify-between items-center z-10">
            <Text className="text-2xl font-extrabold text-slate-100 tracking-tight">
              {activeManageModal === "STAFF" && "Staff Members"}
              {activeManageModal === "CUSTOMERS" && "Customers"}
              {activeManageModal === "SUPPLIERS" && "Suppliers"}
              {activeManageModal === "STORE" && "Store Profile"}
              {activeManageModal === "CATEGORIES" && "Categories"}
            </Text>
            <TouchableOpacity
              onPress={() => setActiveManageModal(null)}
              className="bg-[#1f2232] w-10 h-10 rounded-full items-center justify-center border border-[#2a2e43]"
            >
              <Text className="text-slate-400 font-bold text-xl">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-6 pt-6"
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {activeManageModal === "STAFF" && (
              <View>
                <View className="bg-[#1f2232] p-6 rounded-[32px] mb-8 border border-[#2a2e43] shadow-lg">
                  <Text className="text-slate-400 font-black text-[10px] uppercase tracking-[3px] mb-4">
                    {editingId ? "Edit Staff Member" : "Add New Staff Member"}
                  </Text>
                  <FormField
                    key={`staff-name-${editingId}`}
                    label="Full Name *"
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Full Name"
                  />
                  <View className="mt-4">
                    <FormField
                      key={`staff-email-${editingId}`}
                      label="Email Address *"
                      value={formValue1}
                      onChangeText={setFormValue1}
                      placeholder="Email Address"
                      keyboard="email-address"
                    />
                  </View>
                  {!editingId && (
                    <View className="mt-4">
                      <FormField
                        key={`staff-password-${editingId}`}
                        label="Assign Password *"
                        value={formPassword}
                        onChangeText={setFormPassword}
                        placeholder="••••••••Password"
                        secureTextEntry
                      />
                    </View>
                  )}
                  <View className="mt-4">
                    <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2.5 ml-1">
                      Assign Role
                    </Text>
                    <View className="flex-row gap-2">
                      {["ADMIN", "MANAGER", "CASHIER"].map((roleOption) => (
                        <TouchableOpacity
                          key={roleOption}
                          onPress={() => setFormValue2(roleOption)}
                          className={`flex-1 py-4 rounded-[16px] border items-center transition-colors ${formValue2 === roleOption ? "bg-indigo-600/20 border-indigo-500/50" : "bg-[#121420] border-[#2a2e43]"}`}
                        >
                          <Text
                            className={`font-bold text-xs tracking-wide ${formValue2 === roleOption ? "text-indigo-400" : "text-slate-500"}`}
                          >
                            {roleOption}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleSaveStaff}
                    className="mt-6 bg-indigo-600 py-5 rounded-[24px] items-center shadow-lg border border-indigo-400/30"
                  >
                    <Text className="text-white font-extrabold tracking-wide">
                      {editingId ? "Update Staff" : "Add Staff"}
                    </Text>
                  </TouchableOpacity>
                  {editingId && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(null);
                        setFormName("");
                        setFormValue1("");
                        setFormValue2("");
                      }}
                      className="mt-3 py-3 items-center"
                    >
                      <Text className="text-slate-500 font-bold">
                        Cancel Edit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {staffList?.map((staff, idx) => (
                  <Animated.View
                    key={staff.id}
                    entering={FadeInDown.duration(400)
                      .delay(idx * 30)
                      .springify()}
                    className="bg-[#1f2232] p-5 rounded-[28px] mb-4 border border-[#2a2e43] flex-row items-center shadow-md"
                  >
                    <View className="w-14 h-14 bg-blue-500/10 rounded-[20px] items-center justify-center mr-4 border border-blue-500/20">
                      <Text className="text-2xl">👤</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-extrabold text-lg tracking-tight">
                        {staff.name}
                      </Text>
                      <View className="bg-[#121420] self-start px-2 py-0.5 rounded mt-1 border border-[#2a2e43]">
                        <Text className="text-indigo-400 font-black text-[9px] uppercase tracking-[2px]">
                          {staff.role}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          setEditingId(staff.id);
                          setFormName(staff.name);
                          setFormValue1(staff.email || "");
                          setFormValue2(staff.role);
                        }}
                        className="w-10 h-10 bg-[#121420] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                      >
                        <Text className="text-slate-400 text-sm">✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteStaff(staff.id)}
                        className="w-10 h-10 bg-rose-500/10 rounded-[16px] items-center justify-center border border-rose-500/20"
                      >
                        <Text className="text-rose-400 text-sm">🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}

            {/* Customers, Suppliers, Store logic similar style applied via FormField below */}
            {activeManageModal === "CUSTOMERS" && (
              <View>
                <View className="bg-[#1f2232] p-6 rounded-[32px] mb-8 border border-[#2a2e43] shadow-lg">
                  <Text className="text-slate-400 font-black text-[10px] uppercase tracking-[3px] mb-4">
                    {editingId ? "Edit Customer" : "Add New Customer"}
                  </Text>
                  <FormField
                    key={`cust-name-${editingId}`}
                    label="Full Name"
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Customer Name"
                  />
                  <View className="mt-4">
                    <FormField
                      key={`cust-phone-${editingId}`}
                      label="Phone Number"
                      value={formValue1}
                      onChangeText={setFormValue1}
                      placeholder="+95 ..."
                    />
                  </View>
                  <View className="mt-4">
                    <FormField
                      key={`cust-addr-${editingId}`}
                      label="Address"
                      value={formValue2}
                      onChangeText={setFormValue2}
                      placeholder="Address"
                      multiline
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSaveCustomer}
                    className="mt-6 bg-indigo-600 py-5 rounded-[24px] items-center shadow-lg border border-indigo-400/30"
                  >
                    <Text className="text-white font-extrabold tracking-wide">
                      {editingId ? "Update Customer" : "Add Customer"}
                    </Text>
                  </TouchableOpacity>
                  {editingId && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(null);
                        setFormName("");
                        setFormValue1("");
                        setFormValue2("");
                      }}
                      className="mt-3 py-3 items-center"
                    >
                      <Text className="text-slate-500 font-bold">
                        Cancel Edit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {customerList?.map((cust, idx) => (
                  <Animated.View
                    key={cust.id}
                    entering={FadeInDown.duration(400)
                      .delay(idx * 30)
                      .springify()}
                    className="bg-[#1f2232] p-5 rounded-[28px] mb-4 border border-[#2a2e43] flex-row items-center"
                  >
                    <View className="w-14 h-14 bg-emerald-500/10 rounded-[20px] items-center justify-center mr-4 border border-emerald-500/20">
                      <Text className="text-2xl">💎</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-extrabold text-lg tracking-tight">
                        {cust.name}
                      </Text>
                      <Text className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mt-0.5">
                        {cust.phone || "No Phone"}
                      </Text>
                    </View>
                    <View className="items-end mr-4">
                      <Text className="text-emerald-400 font-black text-sm">
                        {cust.loyaltyPoints} pts
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(cust.id);
                        setFormName(cust.name);
                        setFormValue1(cust.phone || "");
                        setFormValue2(cust.address || "");
                      }}
                      className="w-10 h-10 bg-[#121420] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                    >
                      <Text className="text-slate-400">✏️</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}

            {activeManageModal === "SUPPLIERS" && (
              <View>
                <View className="bg-[#1f2232] p-6 rounded-[32px] mb-8 border border-[#2a2e43]">
                  <Text className="text-slate-400 font-black text-[10px] uppercase tracking-[3px] mb-4">
                    {editingId ? "Edit Supplier" : "Add New Supplier"}
                  </Text>
                  <FormField
                    key={`sup-name-${editingId}`}
                    label="Supplier Name"
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Company Name"
                  />
                  <View className="mt-4">
                    <FormField
                      key={`sup-contact-${editingId}`}
                      label="Contact Person"
                      value={formValue1}
                      onChangeText={setFormValue1}
                      placeholder="Name"
                    />
                  </View>
                  <View className="mt-4">
                    <FormField
                      key={`sup-phone-${editingId}`}
                      label="Phone Number"
                      value={formValue2}
                      onChangeText={setFormValue2}
                      placeholder="+95 ..."
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSaveSupplier}
                    className="mt-6 bg-indigo-600 py-5 rounded-[24px] items-center shadow-lg border border-indigo-400/30"
                  >
                    <Text className="text-white font-extrabold tracking-wide">
                      {editingId ? "Update Supplier" : "Add Supplier"}
                    </Text>
                  </TouchableOpacity>
                  {editingId && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(null);
                        setFormName("");
                        setFormValue1("");
                        setFormValue2("");
                      }}
                      className="mt-3 py-3 items-center"
                    >
                      <Text className="text-slate-500 font-bold">
                        Cancel Edit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {supplierList?.map((sup, idx) => (
                  <Animated.View
                    key={sup.id}
                    entering={FadeInDown.duration(400)
                      .delay(idx * 30)
                      .springify()}
                    className="bg-[#1f2232] p-5 rounded-[28px] mb-4 border border-[#2a2e43] flex-row items-center"
                  >
                    <View className="w-14 h-14 bg-amber-500/10 rounded-[20px] items-center justify-center mr-4 border border-amber-500/20">
                      <Text className="text-2xl">🤝</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-extrabold text-lg tracking-tight">
                        {sup.name}
                      </Text>
                      <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">
                        {sup.contactName || "Global Provider"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(sup.id);
                        setFormName(sup.name);
                        setFormValue1(sup.contactName || "");
                        setFormValue2(sup.phone || "");
                      }}
                      className="w-10 h-10 bg-[#121420] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                    >
                      <Text className="text-slate-400">✏️</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}

            {activeManageModal === "STORE" &&
              storeList &&
              storeList.length > 0 && (
                <View className="bg-[#1f2232] p-8 rounded-[40px] border border-[#2a2e43] shadow-lg">
                  <View className="w-20 h-20 bg-rose-500/10 rounded-[24px] items-center justify-center border border-rose-500/20 mb-6">
                    <MaterialIcons
                      name="store"
                      size={40}
                      color={"#ffffff"}
                      // className="absolute right-5 opacity-70"
                    />
                  </View>
                  <FormField
                    key="store-name"
                    label="Store Name"
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. MidnightCorner Downtown"
                  />
                  <View className="mt-6">
                    <FormField
                      key="store-addr"
                      label="Address"
                      value={formValue1}
                      onChangeText={setFormValue1}
                      placeholder="Street Address"
                      multiline
                    />
                  </View>
                  <View className="mt-6">
                    <FormField
                      key="store-phone"
                      label="Phone Number"
                      value={formValue2}
                      onChangeText={setFormValue2}
                      placeholder="+95 ..."
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleSaveStore}
                    className="mt-10 bg-indigo-600 py-6 rounded-[28px] items-center shadow-2xl border border-indigo-400/30"
                  >
                    <Text className="text-white font-extrabold text-lg tracking-wide">
                      Save Profile
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            {activeManageModal === "CATEGORIES" && (
              <View>
                <View className="bg-[#1f2232] p-6 rounded-[32px] mb-8 border border-[#2a2e43]">
                  <Text className="text-slate-400 font-black text-[10px] uppercase tracking-[3px] mb-4">
                    {editingId ? "Edit Category" : "Add New Category"}
                  </Text>
                  <FormField
                    key={`cat-name-${editingId}`}
                    label="Category Name"
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="Category Name"
                  />
                  <TouchableOpacity
                    onPress={handleSaveCategory}
                    className="mt-6 bg-indigo-600 py-5 rounded-[24px] items-center shadow-lg border border-indigo-400/30"
                  >
                    <Text className="text-white font-extrabold tracking-wide">
                      {editingId ? "Update Category" : "Add Category"}
                    </Text>
                  </TouchableOpacity>
                  {editingId && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(null);
                        setFormName("");
                        setFormValue1("");
                        setFormValue2("");
                      }}
                      className="mt-3 py-3 items-center"
                    >
                      <Text className="text-slate-500 font-bold">
                        Cancel Edit
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {categoryList?.map((cat, idx) => (
                  <Animated.View
                    key={cat.id}
                    entering={FadeInDown.duration(400)
                      .delay(idx * 30)
                      .springify()}
                    className="bg-[#1f2232] p-5 rounded-[28px] mb-4 border border-[#2a2e43] flex-row items-center"
                  >
                    <View className="w-14 h-14 bg-purple-500/10 rounded-[20px] items-center justify-center mr-4 border border-purple-500/20">
                      <Text className="text-2xl">📁</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-100 font-extrabold text-lg tracking-tight">
                        {cat.name}
                      </Text>
                      <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-[3px] mt-0.5">
                        {cat.slug}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(cat.id);
                        setFormName(cat.name);
                      }}
                      className="w-10 h-10 bg-[#121420] rounded-[16px] items-center justify-center border border-[#2a2e43]"
                    >
                      <Text className="text-slate-400">✏️</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SettingItem = ({
  emoji,
  title,
  subtitle,
  onPress,
  delay = 0,
  color,
  bg,
  border,
}: any) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-[#1f2232] mb-4 p-5 rounded-[28px] flex-row items-center border border-[#2a2e43] shadow-lg"
    >
      <View
        className={`w-14 h-14 ${bg} rounded-[20px] items-center justify-center mr-4 border ${border}`}
      >
        <Text className="text-2xl drop-shadow-md">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-slate-100 font-extrabold text-base tracking-wide">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-[2px] mt-1">
            {subtitle}
          </Text>
        )}
      </View>
      <MaterialIcons
        name="arrow-forward-ios"
        size={18}
        color={"#ffffff"}
        className="absolute right-5 opacity-70"
      />
      {/* <Text className="text-slate-600 text-2xl font-bold">›</Text> */}
    </TouchableOpacity>
  </Animated.View>
);

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboard,
  multiline,
  secureTextEntry,
  autoFocus,
}: any) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View>
      <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[3px] mb-2.5 ml-1">
        {label}
      </Text>
      <TextInput
        placeholder={placeholder}
        defaultValue={value}
        onChangeText={onChangeText}
        placeholderTextColor="#475569"
        keyboardType={keyboard || "default"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`bg-[#121420] px-5 py-4 rounded-[20px] border font-bold text-slate-100 transition-colors ${isFocused ? "border-indigo-500/50 bg-[#161826]" : "border-[#2a2e43]"} ${multiline ? "min-h-[100px]" : ""}`}
        style={multiline ? { textAlignVertical: "top" } : {}}
      />
    </View>
  );
}
