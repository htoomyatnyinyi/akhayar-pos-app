// ============================================
// FILE: app/(tabs)/manage.tsx
// ============================================

import {
  ActionButton,
  Card,
  Header,
  MetricCard,
  Pill,
  RowItem,
  Screen,
  SectionTitle,
} from "@/components/app-ui";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { logout, setStore } from "@/services/features/auth/authSlice";
import { resetOfflineState } from "@/services/features/offline/offlineSlice";
import { clearOfflineDatabase } from "@/services/offline/db";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Offline-first local APIs
import {
  useCloseLocalSessionMutation,
  useCreateLocalBrandMutation,
  useCreateLocalCategoryMutation,
  useCreateLocalCustomerMutation,
  useCreateLocalProductMutation,
  useCreateLocalStaffMutation,
  useCreateLocalStoreMutation,
  useCreateLocalSupplierMutation,
  useDeleteLocalBrandMutation,
  useDeleteLocalCategoryMutation,
  useDeleteLocalCustomerMutation,
  useDeleteLocalProductMutation,
  useDeleteLocalStaffMutation,
  useDeleteLocalStoreMutation,
  useDeleteLocalSupplierMutation,
  useGetActiveSessionQuery,
  useGetLocalBrandsQuery,
  useGetLocalCategoriesQuery,
  useGetLocalCustomersQuery,
  useGetLocalProductsQuery,
  useGetLocalStaffQuery,
  useGetLocalStoresQuery,
  useGetLocalSuppliersQuery,
  useOpenLocalSessionMutation,
  useUpdateLocalBrandMutation,
  useUpdateLocalCategoryMutation,
  useUpdateLocalCustomerMutation,
  useUpdateLocalProductMutation,
  useUpdateLocalStaffMutation,
  useUpdateLocalStoreMutation,
  useUpdateLocalSupplierMutation,
  useGetLocalInventoryQuery,
} from "@/services/features/offline/localApi";

type ModuleKey =
  | "staff"
  | "products"
  | "stores"
  | "categories"
  | "customers"
  | "suppliers"
  | "sessions"
  | "brands"
  | "inventory";

export default function ManageScreen() {
  const dispatch = useAppDispatch();
  const { user, currentStoreId } = useAppSelector((state) => state.auth);
  const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
  const [editor, setEditor] = useState<{
    open: boolean;
    mode: "create" | "edit";
    item?: any;
  }>({ open: false, mode: "create" });

  const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Queries
  const {
    data: staff = [],
    isLoading: isLoadingStaff,
    refetch: refetchStaff,
  } = useGetLocalStaffQuery({
    storeId: currentStoreId || undefined,
  });
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
  } = useGetLocalProductsQuery({
    storeId: currentStoreId || undefined,
  });
  const {
    data: stores = [],
    isLoading: isLoadingStores,
    refetch: refetchStores,
  } = useGetLocalStoresQuery({});
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    refetch: refetchCategories,
  } = useGetLocalCategoriesQuery({
    storeId: currentStoreId || undefined,
  });
  const {
    data: customers = [],
    isLoading: isLoadingCustomers,
    refetch: refetchCustomers,
  } = useGetLocalCustomersQuery({});
  const {
    data: suppliers = [],
    isLoading: isLoadingSuppliers,
    refetch: refetchSuppliers,
  } = useGetLocalSuppliersQuery({
    storeId: currentStoreId || undefined,
  });
  const {
    data: brands = [],
    isLoading: isLoadingBrands,
    refetch: refetchBrands,
  } = useGetLocalBrandsQuery({});
  const {
    data: inventory = [],
    isLoading: isLoadingInventory,
    refetch: refetchInventory,
  } = useGetLocalInventoryQuery({
    storeId: currentStoreId || undefined,
  });
  const { data: activeSession, refetch: refetchSession } =
    useGetActiveSessionQuery(
      { userId: user?.id || "", storeId: currentStoreId || undefined },
      { skip: !user?.id },
    );

  // ✅ Mutations
  const [createStaff] = useCreateLocalStaffMutation();
  const [updateStaff] = useUpdateLocalStaffMutation();
  const [deleteStaff] = useDeleteLocalStaffMutation();

  const [createProduct] = useCreateLocalProductMutation();
  const [updateProduct] = useUpdateLocalProductMutation();
  const [deleteProduct] = useDeleteLocalProductMutation();

  const [createStore] = useCreateLocalStoreMutation();
  const [updateStore] = useUpdateLocalStoreMutation();
  const [deleteStore] = useDeleteLocalStoreMutation();

  const [createCategory] = useCreateLocalCategoryMutation();
  const [updateCategory] = useUpdateLocalCategoryMutation();
  const [deleteCategory] = useDeleteLocalCategoryMutation();

  const [createCustomer] = useCreateLocalCustomerMutation();
  const [updateCustomer] = useUpdateLocalCustomerMutation();
  const [deleteCustomer] = useDeleteLocalCustomerMutation();

  const [createSupplier] = useCreateLocalSupplierMutation();
  const [updateSupplier] = useUpdateLocalSupplierMutation();
  const [deleteSupplier] = useDeleteLocalSupplierMutation();

  const [createBrand] = useCreateLocalBrandMutation();
  const [updateBrand] = useUpdateLocalBrandMutation();
  const [deleteBrand] = useDeleteLocalBrandMutation();

  const [openSession] = useOpenLocalSessionMutation();
  const [closeSession] = useCloseLocalSessionMutation();

  const refetchers = {
    staff: refetchStaff,
    products: refetchProducts,
    stores: refetchStores,
    categories: refetchCategories,
    customers: refetchCustomers,
    suppliers: refetchSuppliers,
    brands: refetchBrands,
    sessions: refetchSession,
    inventory: refetchInventory,
  } as const;

  const isLoading =
    isLoadingStaff ||
    isLoadingProducts ||
    isLoadingStores ||
    isLoadingCategories ||
    isLoadingCustomers ||
    isLoadingSuppliers ||
    isLoadingBrands ||
    isLoadingInventory;

  const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

  const storeOptions = useMemo(() => stores, [stores]);

  // Get data based on module
  const rawData = useMemo(() => {
    switch (moduleKey) {
      case "staff":
        return staff;
      case "products":
        return products;
      case "stores":
        return stores;
      case "categories":
        return categories;
      case "customers":
        return customers;
      case "suppliers":
        return suppliers;
      case "brands":
        return brands;
      case "inventory":
        return inventory;
      case "sessions":
        return activeSession ? [activeSession] : [];
      default:
        return [];
    }
  }, [
    moduleKey,
    staff,
    products,
    stores,
    categories,
    customers,
    suppliers,
    brands,
    inventory,
    activeSession,
  ]);

  // Filter and search
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const query = searchQuery.toLowerCase();
    return rawData.filter((item: any) => {
      const searchable = [
        item.name,
        item.username,
        item.code,
        item.email,
        item.phone,
        item.sku,
        item.barcode,
        item.id,
        item.product?.name,
      ].filter(Boolean);
      return searchable.some((field: any) =>
        String(field).toLowerCase().includes(query),
      );
    });
  }, [rawData, searchQuery]);

  // Summary with trends
  const summary = useMemo(() => {
    const lowStockCount = inventory.filter(
      (i: any) => i.quantity <= 10 && i.quantity > 0,
    ).length;
    const outOfStockCount = inventory.filter(
      (i: any) => i.quantity === 0,
    ).length;

    return [
      {
        label: "Staff",
        value: String(staff.length),
        icon: "groups" as const,
        tone: "sky" as const,
      },
      {
        label: "Products",
        value: String(products.length),
        icon: "inventory-2" as const,
        tone: "emerald" as const,
      },
      {
        label: "Stores",
        value: String(stores.length),
        icon: "store" as const,
        tone: "amber" as const,
      },
      {
        label: "Customers",
        value: String(customers.length),
        icon: "person" as const,
        tone: "rose" as const,
      },
      {
        label: "Brands",
        value: String(brands.length),
        icon: "branding-watermark" as const,
        tone: "purple" as const,
      },
      {
        label: "Inventory",
        value: String(inventory.length),
        icon: "inventory" as const,
        tone:
          outOfStockCount > 0
            ? "rose"
            : lowStockCount > 0
              ? "amber"
              : "emerald",
      },
    ];
  }, [staff, products, stores, customers, brands, inventory]);

  // ✅ Sign Out Handler
  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Offline data will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await clearOfflineDatabase();
              dispatch(resetOfflineState());
              dispatch(logout());
            } catch (error) {
              Alert.alert("Error", "Failed to sign out.");
            }
          },
        },
      ],
    );
  };

  // ✅ Export Data
  const exportData = async () => {
    try {
      const data = JSON.stringify(filteredList, null, 2);
      const path = `${FileSystem.documentDirectory}${moduleKey}_export_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, data);
      await Sharing.shareAsync(path);
    } catch (error) {
      Alert.alert("Export failed", "Unable to export data.");
    }
  };

  // ✅ Import Data
  const importData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });
      if (result.type === "success") {
        const content = await FileSystem.readAsStringAsync(result.uri);
        const data = JSON.parse(content);
        Alert.alert("Success", `Imported ${data.length} items successfully.`);
      }
    } catch (error) {
      Alert.alert("Import failed", "Unable to import data.");
    }
  };

  // ✅ Handle Save
  const handleSave = async (values: Record<string, any>) => {
    try {
      const nextValues = buildPayload(moduleKey, values, currentStoreId);

      if (moduleKey === "staff") {
        if (editor.mode === "create") await createStaff(nextValues).unwrap();
        else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
      } else if (moduleKey === "products") {
        if (editor.mode === "create") await createProduct(nextValues).unwrap();
        else
          await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
      } else if (moduleKey === "stores") {
        if (editor.mode === "create") await createStore(nextValues).unwrap();
        else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
      } else if (moduleKey === "categories") {
        if (editor.mode === "create") await createCategory(nextValues).unwrap();
        else
          await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
      } else if (moduleKey === "customers") {
        if (editor.mode === "create") await createCustomer(nextValues).unwrap();
        else
          await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
      } else if (moduleKey === "suppliers") {
        if (editor.mode === "create") await createSupplier(nextValues).unwrap();
        else
          await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
      } else if (moduleKey === "brands") {
        if (editor.mode === "create") await createBrand(nextValues).unwrap();
        else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
      }

      await refetchers[moduleKey]();
      setEditor({ open: false, mode: "create" });
    } catch (error: any) {
      Alert.alert(
        "Save failed",
        error?.data?.message || "Unable to save changes.",
      );
    }
  };

  // ✅ Handle Delete
  const handleDelete = async (item: any) => {
    try {
      if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
      else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
      else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
      else if (moduleKey === "categories")
        await deleteCategory(item.id).unwrap();
      else if (moduleKey === "customers")
        await deleteCustomer(item.id).unwrap();
      else if (moduleKey === "suppliers")
        await deleteSupplier(item.id).unwrap();
      else if (moduleKey === "brands") await deleteBrand(item.id).unwrap();
      await refetchers[moduleKey]();
    } catch (error: any) {
      Alert.alert(
        "Delete failed",
        error?.data?.message || "Unable to delete item.",
      );
    }
  };

  // ✅ Open Editor
  const openEditor = (mode: "create" | "edit", item?: any) => {
    if (moduleKey === "inventory" && item) {
      Alert.alert(
        "Inventory Details",
        `Product: ${item.product?.name || item.name || "Unknown"}\nQuantity: ${item.quantity || 0}\nStore: ${item.store?.name || "Unknown Store"}\nReorder Point: ${item.reorderPoint || 10}`,
        [{ text: "OK" }],
      );
      return;
    }
    if (moduleKey === "sessions") {
      setSessionModal(activeSession ? "close" : "open");
      return;
    }
    setEditor({ open: true, mode, item });
  };

  // ✅ Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refetchers[moduleKey]();
    setRefreshing(false);
  };

  if (!isPrivileged) {
    return (
      <Screen>
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <Pill label="Restricted" tone="rose" />
            <Text className="mt-4 text-3xl font-black text-white">
              Management locked
            </Text>
            <Text className="mt-3 text-center text-sm text-slate-300">
              Your account does not have access to staff, product, or store
              management.
            </Text>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          className="px-5"
        >
          <Header
            eyebrow="Administration"
            title="Management"
            subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, inventory, and session control from one place."
            right={<Pill label={user?.role ?? "USER"} tone="sky" />}
          />

          {/* ✅ Summary Metrics - Grid Layout */}
          <View className="flex-row flex-wrap gap-3 mb-4">
            {summary.map((item) => (
              <View key={item.label} className="w-[31%]">
                <MetricCard
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  tone={item.tone}
                />
              </View>
            ))}
          </View>

          {/* ✅ Store Context */}
          <Card className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
              Store context
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 8 }}
            >
              {storeOptions.map((store: any) => {
                const active = store.id === currentStoreId;
                return (
                  <Pressable
                    key={store.id}
                    onPress={() => dispatch(setStore(store.id))}
                    className={`rounded-full border px-4 py-3 ${
                      active
                        ? "border-sky-400/30 bg-sky-500/15"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase tracking-[2px] ${
                        active ? "text-sky-200" : "text-slate-300"
                      }`}
                    >
                      {store.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>

          {/* ✅ Module Selection */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {(
                [
                  "products",
                  "staff",
                  "stores",
                  "categories",
                  "customers",
                  "suppliers",
                  "brands",
                  "inventory",
                  "sessions",
                ] as ModuleKey[]
              ).map((key) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    setModuleKey(key);
                    setSearchQuery("");
                  }}
                  className={`rounded-full border px-4 py-3 ${
                    moduleKey === key
                      ? "border-emerald-400/30 bg-emerald-500/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-[2px] ${
                      moduleKey === key ? "text-emerald-200" : "text-slate-300"
                    }`}
                  >
                    {key}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* ✅ Search Bar */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white/5 rounded-full px-4 py-3 border border-white/10">
              <MaterialIcons name="search" size={20} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-3 text-white text-sm font-medium"
                placeholder="Search..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialIcons name="close" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ✅ Action Buttons */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            <ActionButton
              title="Add New"
              icon="add"
              accent="emerald"
              onPress={() => openEditor("create")}
            />
            <ActionButton
              title="Refresh"
              icon="refresh"
              accent="sky"
              onPress={onRefresh}
            />
            <ActionButton
              title="Export"
              icon="file-download"
              accent="amber"
              onPress={exportData}
            />
            <ActionButton
              title="Import"
              icon="file-upload"
              accent="purple"
              onPress={importData}
            />
          </View>

          {/* ✅ List */}
          <SectionTitle
            title={`${moduleKey} (${filteredList.length})`}
            action="Tap to edit"
          />
          <Card>
            {isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text className="text-slate-400 mt-4 text-sm">Loading...</Text>
              </View>
            ) : filteredList.length > 0 ? (
              filteredList.map((item: any, index: number) => {
                const displayName =
                  item.name || item.username || item.code || item.id;

                if (moduleKey === "inventory") {
                  displayName =
                    item.product?.name ||
                    item.productName ||
                    `Product ${item.productId?.slice(-6)}`;
                }

                return (
                  <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
                    <Pressable onPress={() => openEditor("edit", item)}>
                      <RowItem
                        title={displayName}
                        subtitle={getSubtitle(moduleKey, item)}
                        right={getRightLabel(moduleKey, item)}
                        icon={getIcon(moduleKey)}
                      />
                    </Pressable>
                    {index < filteredList.length - 1 ? (
                      <View className="my-3 h-px bg-white/8" />
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View className="py-8 items-center">
                <View className="h-16 w-16 bg-white/5 rounded-full items-center justify-center border border-white/10">
                  <MaterialIcons name="inbox" size={28} color="#64748b" />
                </View>
                <Text className="text-slate-400 text-center text-sm mt-3">
                  No {moduleKey} found
                </Text>
                <Text className="text-slate-500 text-xs text-center mt-1">
                  {moduleKey === "inventory"
                    ? "Inventory is managed through sales and purchases"
                    : `Create one by tapping "Add New"`}
                </Text>
              </View>
            )}
          </Card>

          {/* ✅ Sign Out */}
          <View className="mt-6 pt-4 border-t border-white/10">
            <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400 mb-3">
              Account
            </Text>
            <Pressable
              onPress={handleSignOut}
              className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="bg-rose-500/20 p-2 rounded-full">
                  <MaterialIcons name="logout" size={20} color="#f87171" />
                </View>
                <Text className="text-rose-400 font-semibold ml-3">
                  Sign Out
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#f87171" />
            </Pressable>
            <Text className="text-slate-500 text-[10px] mt-2 text-center">
              This will clear all offline data and return to login
            </Text>
          </View>
        </ScrollView>

        {/* ✅ Editor Modal */}
        <Modal
          visible={editor.open}
          animationType="slide"
          onRequestClose={() => setEditor({ open: false, mode: "create" })}
          transparent={true}
        >
          <View className="flex-1 bg-black/70">
            <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
              <EditorModalContent
                title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
                moduleKey={moduleKey}
                item={editor.item}
                mode={editor.mode}
                onClose={() => setEditor({ open: false, mode: "create" })}
                onSave={handleSave}
                onDelete={
                  editor.item ? () => handleDelete(editor.item) : undefined
                }
                currentStoreId={currentStoreId}
                stores={stores}
                categories={categories}
                suppliers={suppliers}
                brands={brands}
                refetchCategories={refetchCategories}
                refetchSuppliers={refetchSuppliers}
                refetchBrands={refetchBrands}
              />
            </View>
          </View>
        </Modal>

        {/* ✅ Session Modal */}
        <Modal
          visible={sessionModal !== null}
          animationType="slide"
          onRequestClose={() => setSessionModal(null)}
          transparent={true}
        >
          <View className="flex-1 bg-black/70">
            <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
              <SessionModalContent
                mode={sessionModal}
                activeSession={activeSession}
                onClose={() => setSessionModal(null)}
                onOpen={async (openingBalance, notes) => {
                  try {
                    await openSession({
                      userId: user?.id || "",
                      openingBalance: Number(openingBalance || 0),
                      notes,
                      storeId: currentStoreId || undefined,
                    }).unwrap();
                    setSessionModal(null);
                    await refetchSession();
                  } catch (error: any) {
                    Alert.alert(
                      "Open session failed",
                      error?.data?.message || "Unable to open session.",
                    );
                  }
                }}
                onCloseSession={async (closingBalance, notes) => {
                  try {
                    if (!activeSession) return;
                    await closeSession({
                      sessionId: activeSession.id,
                      data: {
                        closingBalance: Number(closingBalance || 0),
                        expectedBalance: Number(closingBalance || 0),
                        discrepancy: 0,
                        cashSales: 0,
                        cardSales: 0,
                        digitalSales: 0,
                        notes,
                      },
                    }).unwrap();
                    setSessionModal(null);
                    await refetchSession();
                  } catch (error: any) {
                    Alert.alert(
                      "Close session failed",
                      error?.data?.message || "Unable to close session.",
                    );
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}

// ============================================
// EDITOR MODAL CONTENT
// ============================================

function EditorModalContent({
  title,
  moduleKey,
  item,
  mode,
  onClose,
  onSave,
  onDelete,
  currentStoreId,
  stores,
  categories,
  suppliers,
  brands,
  refetchCategories,
  refetchSuppliers,
  refetchBrands,
}: {
  title: string;
  moduleKey: ModuleKey;
  item?: any;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (values: Record<string, any>) => Promise<void>;
  onDelete?: () => void;
  currentStoreId: string | null;
  stores: any[];
  categories: any[];
  suppliers: any[];
  brands: any[];
  refetchCategories: () => void;
  refetchSuppliers: () => void;
  refetchBrands: () => void;
}) {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
    contactName: "",
  });
  const [newBrand, setNewBrand] = useState({
    name: "",
    description: "",
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  const [createCategory] = useCreateLocalCategoryMutation();
  const [createSupplier] = useCreateLocalSupplierMutation();
  const [createBrand] = useCreateLocalBrandMutation();

  useEffect(() => {
    if (item !== undefined) {
      setFields(item ? { ...item } : getDefaultFields(moduleKey));
    }
  }, [item, moduleKey]);

  const set = (key: string, value: any) =>
    setFields((current) => ({ ...current, [key]: value }));

  const save = () => onSave(fields);

  const handleCreateCategory = async () => {
    try {
      if (!newCategory.name.trim()) {
        Alert.alert("Error", "Category name is required");
        return;
      }

      setIsCreatingCategory(true);
      if (!currentStoreId) {
        Alert.alert("Error", "Store not found");
        return;
      }

      const payload = {
        tenantId: "default",
        name: newCategory.name.trim(),
        slug:
          newCategory.slug.trim() ||
          newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: newCategory.description.trim() || undefined,
        storeId: currentStoreId,
        isActive: true,
      };

      const result = await createCategory(payload).unwrap();
      await refetchCategories();
      set("categoryId", result?.id);
      set("categoryName", result?.name);

      setShowCreateCategory(false);
      setNewCategory({ name: "", slug: "", description: "" });

      Alert.alert("Success", "Category created successfully");
    } catch (error: any) {
      Alert.alert(
        "Failed to create category",
        error?.data?.message || "Unable to create category.",
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      if (!newSupplier.name.trim()) {
        Alert.alert("Error", "Supplier name is required");
        return;
      }

      setIsCreatingSupplier(true);
      if (!currentStoreId) {
        Alert.alert("Error", "Store not found");
        return;
      }

      const payload = {
        tenantId: "default",
        name: newSupplier.name.trim(),
        code: newSupplier.code.trim() || undefined,
        contactName: newSupplier.contactName.trim() || undefined,
        phone: newSupplier.phone.trim() || undefined,
        email: newSupplier.email.trim() || undefined,
        address: newSupplier.address.trim() || undefined,
        storeId: currentStoreId,
        isActive: true,
      };

      const result = await createSupplier(payload).unwrap();
      await refetchSuppliers();
      set("supplierId", result.id);
      set("supplierName", result.name);

      setShowCreateSupplier(false);
      setNewSupplier({
        name: "",
        code: "",
        phone: "",
        email: "",
        address: "",
        contactName: "",
      });

      Alert.alert("Success", "Supplier created successfully");
    } catch (error: any) {
      Alert.alert(
        "Failed to create supplier",
        error?.data?.message || "Unable to create supplier.",
      );
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleCreateBrand = async () => {
    try {
      if (!newBrand.name.trim()) {
        Alert.alert("Error", "Brand name is required");
        return;
      }

      setIsCreatingBrand(true);

      const payload = {
        tenantId: "default",
        name: newBrand.name.trim(),
        description: newBrand.description.trim() || undefined,
        isActive: true,
      };

      const result = await createBrand(payload).unwrap();
      await refetchBrands();
      set("brandId", result.id);
      set("brand", result.name);

      setShowCreateBrand(false);
      setNewBrand({ name: "", description: "" });

      Alert.alert("Success", "Brand created successfully");
    } catch (error: any) {
      Alert.alert(
        "Failed to create brand",
        error?.data?.message || "Unable to create brand.",
      );
    } finally {
      setIsCreatingBrand(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 px-4 pt-4">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-white text-xl font-black">{title}</Text>
        <Pressable onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#94a3b8" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Staff Form */}
        {moduleKey === "staff" && (
          <>
            <Field
              label="Username"
              value={fields.username ?? ""}
              onChangeText={(v) => set("username", v)}
              required
            />
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="Email"
              value={fields.email ?? ""}
              onChangeText={(v) => set("email", v)}
              required
              keyboardType="email-address"
            />
            {mode === "create" && (
              <Field
                label="Password"
                value={fields.password ?? ""}
                onChangeText={(v) => set("password", v)}
                secureTextEntry
                required
              />
            )}
            <SelectField
              label="Role"
              value={fields.role ?? "CASHIER"}
              options={[
                { label: "Admin", value: "ADMIN" },
                { label: "Manager", value: "MANAGER" },
                { label: "Cashier", value: "CASHIER" },
                { label: "Accountant", value: "ACCOUNTANT" },
              ]}
              onChange={(value) => {
                set("role", value);
                set("permissions", getDefaultPermissions(value));
              }}
              required
            />
            <SelectField
              label="Store"
              value={fields.storeId ?? ""}
              options={stores.map((s: any) => ({ label: s.name, value: s.id }))}
              onChange={(value) => set("storeId", value)}
            />
          </>
        )}

        {/* Products Form */}
        {moduleKey === "products" && (
          <>
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="SKU"
              value={fields.sku ?? ""}
              onChangeText={(v) => set("sku", v)}
            />
            <Field
              label="Barcode"
              value={fields.barcode ?? ""}
              onChangeText={(v) => set("barcode", v)}
            />
            <Field
              label="Description"
              value={fields.description ?? ""}
              onChangeText={(v) => set("description", v)}
              multiline
            />

            <SelectField
              label="Brand"
              value={fields.brandId ?? ""}
              options={brands.map((b: any) => ({ label: b.name, value: b.id }))}
              onChange={(value) => set("brandId", value)}
              onAddNew={() => setShowCreateBrand(true)}
            />
            <SelectField
              label="Category"
              value={fields.categoryId ?? ""}
              options={categories.map((c: any) => ({
                label: c.name,
                value: c.id,
              }))}
              onChange={(value) => set("categoryId", value)}
              required
              onAddNew={() => setShowCreateCategory(true)}
            />
            <SelectField
              label="Supplier"
              value={fields.supplierId ?? ""}
              options={suppliers.map((s: any) => ({
                label: s.name,
                value: s.id,
              }))}
              onChange={(value) => set("supplierId", value)}
              onAddNew={() => setShowCreateSupplier(true)}
            />

            <Field
              label="Cost Price"
              value={fields.costPrice?.toString() ?? ""}
              onChangeText={(v) => {
                const num = parseFloat(v);
                set("costPrice", isNaN(num) ? 0 : num);
              }}
              keyboardType="decimal-pad"
            />
            <Field
              label="Selling Price"
              value={fields.sellingPrice?.toString() ?? ""}
              onChangeText={(v) => {
                const num = parseFloat(v);
                set("sellingPrice", isNaN(num) ? 0 : num);
              }}
              keyboardType="decimal-pad"
              required
            />
            <Field
              label="Wholesale Price"
              value={fields.wholesalePrice?.toString() ?? ""}
              onChangeText={(v) => {
                const num = parseFloat(v);
                set("wholesalePrice", isNaN(num) ? 0 : num);
              }}
              keyboardType="decimal-pad"
            />
            <Field
              label="Initial Stock"
              value={fields.initialStock?.toString() ?? ""}
              onChangeText={(v) => {
                const num = parseInt(v, 10);
                set("initialStock", isNaN(num) ? 0 : num);
              }}
              keyboardType="numeric"
            />
            <Field
              label="Manufacturing Date"
              value={fields.manufacturingDate ?? ""}
              onChangeText={(v) => set("manufacturingDate", v)}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="Expiry Date"
              value={fields.expiryDate ?? ""}
              onChangeText={(v) => set("expiryDate", v)}
              placeholder="YYYY-MM-DD"
            />
          </>
        )}

        {/* Stores Form */}
        {moduleKey === "stores" && (
          <>
            <Field
              label="Code"
              value={fields.code ?? ""}
              onChangeText={(v) => set("code", v)}
              required
            />
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="Address"
              value={fields.address ?? ""}
              onChangeText={(v) => set("address", v)}
              multiline
            />
            <Field
              label="Phone"
              value={fields.phone ?? ""}
              onChangeText={(v) => set("phone", v)}
              keyboardType="phone-pad"
            />
            <Field
              label="Email"
              value={fields.email ?? ""}
              onChangeText={(v) => set("email", v)}
              keyboardType="email-address"
            />
            <Field
              label="Tax Number"
              value={fields.taxNumber ?? ""}
              onChangeText={(v) => set("taxNumber", v)}
            />
          </>
        )}

        {/* Categories Form */}
        {moduleKey === "categories" && (
          <>
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="Slug"
              value={fields.slug ?? ""}
              onChangeText={(v) => set("slug", v)}
            />
            <Field
              label="Description"
              value={fields.description ?? ""}
              onChangeText={(v) => set("description", v)}
              multiline
            />
            <SelectField
              label="Parent Category"
              value={fields.parentId ?? ""}
              options={categories.map((c: any) => ({
                label: c.name,
                value: c.id,
              }))}
              onChange={(value) => set("parentId", value)}
            />
          </>
        )}

        {/* Brands Form */}
        {moduleKey === "brands" && (
          <>
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="Description"
              value={fields.description ?? ""}
              onChangeText={(v) => set("description", v)}
              multiline
            />
          </>
        )}

        {/* Customers Form */}
        {moduleKey === "customers" && (
          <>
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="Phone"
              value={fields.phone ?? ""}
              onChangeText={(v) => set("phone", v)}
              keyboardType="phone-pad"
            />
            <Field
              label="Email"
              value={fields.email ?? ""}
              onChangeText={(v) => set("email", v)}
              keyboardType="email-address"
            />
            <Field
              label="Address"
              value={fields.address ?? ""}
              onChangeText={(v) => set("address", v)}
              multiline
            />
            <Field
              label="Date of Birth"
              value={fields.dateOfBirth ?? ""}
              onChangeText={(v) => set("dateOfBirth", v)}
              placeholder="YYYY-MM-DD"
            />
            <SelectField
              label="Gender"
              value={fields.gender ?? ""}
              options={[
                { label: "Male", value: "MALE" },
                { label: "Female", value: "FEMALE" },
                { label: "Other", value: "OTHER" },
              ]}
              onChange={(value) => set("gender", value)}
            />
            <SelectField
              label="Tier"
              value={fields.tier ?? "BRONZE"}
              options={[
                { label: "Bronze", value: "BRONZE" },
                { label: "Silver", value: "SILVER" },
                { label: "Gold", value: "GOLD" },
                { label: "Platinum", value: "PLATINUM" },
                { label: "Diamond", value: "DIAMOND" },
              ]}
              onChange={(value) => set("tier", value)}
            />
          </>
        )}

        {/* Suppliers Form */}
        {moduleKey === "suppliers" && (
          <>
            <Field
              label="Name"
              value={fields.name ?? ""}
              onChangeText={(v) => set("name", v)}
              required
            />
            <Field
              label="Code"
              value={fields.code ?? ""}
              onChangeText={(v) => set("code", v)}
            />
            <Field
              label="Contact Person"
              value={fields.contactName ?? ""}
              onChangeText={(v) => set("contactName", v)}
            />
            <Field
              label="Phone"
              value={fields.phone ?? ""}
              onChangeText={(v) => set("phone", v)}
              keyboardType="phone-pad"
            />
            <Field
              label="Email"
              value={fields.email ?? ""}
              onChangeText={(v) => set("email", v)}
              keyboardType="email-address"
            />
            <Field
              label="Address"
              value={fields.address ?? ""}
              onChangeText={(v) => set("address", v)}
              multiline
            />
            <Field
              label="Tax Number"
              value={fields.taxNumber ?? ""}
              onChangeText={(v) => set("taxNumber", v)}
            />
            <Field
              label="Payment Terms"
              value={fields.paymentTerms?.toString() ?? ""}
              onChangeText={(v) => {
                const num = parseInt(v, 10);
                set("paymentTerms", isNaN(num) ? undefined : num);
              }}
              keyboardType="numeric"
              placeholder="30"
            />
            <Field
              label="Credit Limit"
              value={fields.creditLimit?.toString() ?? ""}
              onChangeText={(v) => {
                const num = parseFloat(v);
                set("creditLimit", isNaN(num) ? undefined : num);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </>
        )}

        {/* Sessions - No form */}
        {moduleKey === "sessions" && (
          <View className="py-8">
            <Text className="text-center text-slate-400">
              Session management is handled separately.
            </Text>
            <Text className="text-center text-slate-500 text-sm mt-2">
              Use the "Open Session" or "Close Session" button above.
            </Text>
          </View>
        )}

        <View className="mt-4 flex-row gap-3">
          <ActionButton
            title="Cancel"
            icon="close"
            accent="rose"
            onPress={onClose}
          />
          {moduleKey !== "inventory" && moduleKey !== "sessions" && (
            <ActionButton
              title="Save"
              icon="save"
              accent="emerald"
              onPress={save}
            />
          )}
        </View>
        {mode === "edit" &&
          onDelete &&
          moduleKey !== "inventory" &&
          moduleKey !== "sessions" && (
            <View className="mt-3">
              <ActionButton
                title="Delete"
                icon="delete"
                accent="rose"
                onPress={onDelete}
              />
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// SESSION MODAL CONTENT
// ============================================

function SessionModalContent({
  mode,
  activeSession,
  onClose,
  onOpen,
  onCloseSession,
}: {
  mode: "open" | "close" | null;
  activeSession: any;
  onClose: () => void;
  onOpen: (openingBalance: string, notes: string) => Promise<void>;
  onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
}) {
  const [balance, setBalance] = useState("0");
  const [notes, setNotes] = useState("");

  return (
    <SafeAreaView className="flex-1 px-4 pt-4">
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-white text-xl font-black">
          {mode === "open" ? "Open Session" : "Close Session"}
        </Text>
        <Pressable onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#94a3b8" />
        </Pressable>
      </View>

      <Text className="text-slate-400 text-sm mb-4">
        {activeSession ? `Active: ${activeSession.id}` : "No active session"}
      </Text>

      <TextInput
        value={balance}
        onChangeText={setBalance}
        keyboardType="decimal-pad"
        placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
        placeholderTextColor="#64748b"
        className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
      />
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes"
        placeholderTextColor="#64748b"
        className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
        multiline
        numberOfLines={3}
      />
      <View className="flex-row gap-3">
        <ActionButton
          title="Cancel"
          icon="close"
          accent="rose"
          onPress={onClose}
        />
        <ActionButton
          title={mode === "open" ? "Open" : "Close"}
          icon="schedule"
          accent="emerald"
          onPress={async () => {
            if (mode === "open") await onOpen(balance, notes);
            else await onCloseSession(balance, notes);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

// ============================================
// SELECT FIELD COMPONENT
// ============================================

function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  onAddNew,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  required?: boolean;
  onAddNew?: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label} {required && <Text className="text-rose-400">*</Text>}
      </Text>
      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedOption ? "text-white" : "text-slate-400"}`}
          >
            {selectedOption
              ? selectedOption.label
              : `Select ${label.toLowerCase()}...`}
          </Text>
          <MaterialIcons
            name={showDropdown ? "expand-less" : "expand-more"}
            size={24}
            color="#64748b"
          />
        </View>
      </Pressable>

      {showDropdown && (
        <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
          <ScrollView nestedScrollEnabled>
            {options.length > 0 ? (
              options.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setShowDropdown(false);
                  }}
                  className={`rounded-xl px-4 py-3 ${
                    value === option.value ? "bg-emerald-500/20" : ""
                  }`}
                >
                  <Text className="text-white">{option.label}</Text>
                </Pressable>
              ))
            ) : (
              <Text className="py-4 text-center text-slate-400">
                No options available
              </Text>
            )}
            {onAddNew && (
              <Pressable
                onPress={() => {
                  setShowDropdown(false);
                  onAddNew();
                }}
                className="mt-2 rounded-xl border border-dashed border-sky-500/30 p-3"
              >
                <Text className="text-center text-sky-400">+ Create New</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================
// FIELD COMPONENT
// ============================================

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  multiline = false,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?:
    | "default"
    | "decimal-pad"
    | "numeric"
    | "email-address"
    | "phone-pad";
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label} {required && <Text className="text-rose-400">*</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#64748b"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
          multiline ? "min-h-[100px] text-left align-top" : ""
        }`}
      />
    </View>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSubtitle(moduleKey: ModuleKey, item: any) {
  if (moduleKey === "staff")
    return `${item.role} • ${item.email ?? "no email"}`;
  if (moduleKey === "products") {
    const brandName = item.brand?.name || item.brandName || "";
    return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
  }
  if (moduleKey === "stores") return item.address ?? "No address";
  if (moduleKey === "categories") return item.slug ?? "No slug";
  if (moduleKey === "customers") return item.phone ?? item.code;
  if (moduleKey === "suppliers")
    return item.phone ?? item.email ?? "No contact";
  if (moduleKey === "brands") return item.description ?? "No description";
  if (moduleKey === "inventory") {
    const productName = item.product?.name || item.productName || "Unknown";
    const storeName = item.store?.name || "Unknown Store";
    return `${productName} • ${storeName}`;
  }
  if (moduleKey === "sessions")
    return `${item.status} • ${item.openedAt ?? ""}`;
  return "";
}

function getRightLabel(moduleKey: ModuleKey, item: any) {
  if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
  if (moduleKey === "products")
    return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
  if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
  if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
  if (moduleKey === "customers") return item.tier ?? "BRONZE";
  if (moduleKey === "suppliers") {
    if (item.currentBalance !== undefined && item.currentBalance !== null) {
      return `$${Number(item.currentBalance).toFixed(2)}`;
    }
    return item.isActive ? "Active" : "Inactive";
  }
  if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive";
  if (moduleKey === "inventory") {
    const qty = item.quantity || 0;
    if (qty === 0) return "Out of Stock";
    if (qty <= 10) return "Low Stock";
    return `${qty} units`;
  }
  if (moduleKey === "sessions") return item.status ?? "OPEN";
  return "";
}

function getIcon(moduleKey: ModuleKey) {
  if (moduleKey === "staff") return "groups";
  if (moduleKey === "products") return "inventory-2";
  if (moduleKey === "stores") return "store";
  if (moduleKey === "categories") return "category";
  if (moduleKey === "customers") return "person";
  if (moduleKey === "suppliers") return "local-shipping";
  if (moduleKey === "brands") return "branding-watermark";
  if (moduleKey === "inventory") return "inventory";
  if (moduleKey === "sessions") return "schedule";
  return "schedule";
}

function getDefaultFields(moduleKey: ModuleKey) {
  const configs: Record<ModuleKey, any[]> = {
    staff: [
      { key: "username", value: "" },
      { key: "name", value: "" },
      { key: "email", value: "" },
      { key: "password", value: "" },
      { key: "role", value: "CASHIER" },
      { key: "permissions", value: [] },
      { key: "storeId", value: "" },
    ],
    products: [
      { key: "name", value: "" },
      { key: "sku", value: "" },
      { key: "barcode", value: "" },
      { key: "description", value: "" },
      { key: "brandId", value: "" },
      { key: "categoryId", value: "" },
      { key: "supplierId", value: "" },
      { key: "costPrice", value: 0 },
      { key: "sellingPrice", value: 0 },
      { key: "wholesalePrice", value: 0 },
      { key: "initialStock", value: 0 },
      { key: "manufacturingDate", value: "" },
      { key: "expiryDate", value: "" },
    ],
    stores: [
      { key: "code", value: "" },
      { key: "name", value: "" },
      { key: "address", value: "" },
      { key: "phone", value: "" },
      { key: "email", value: "" },
      { key: "taxNumber", value: "" },
    ],
    categories: [
      { key: "name", value: "" },
      { key: "slug", value: "" },
      { key: "description", value: "" },
      { key: "parentId", value: "" },
    ],
    brands: [
      { key: "name", value: "" },
      { key: "description", value: "" },
    ],
    customers: [
      { key: "name", value: "" },
      { key: "phone", value: "" },
      { key: "email", value: "" },
      { key: "address", value: "" },
      { key: "dateOfBirth", value: "" },
      { key: "gender", value: "" },
      { key: "tier", value: "BRONZE" },
    ],
    suppliers: [
      { key: "name", value: "" },
      { key: "code", value: "" },
      { key: "contactName", value: "" },
      { key: "phone", value: "" },
      { key: "email", value: "" },
      { key: "address", value: "" },
      { key: "taxNumber", value: "" },
      { key: "paymentTerms", value: "" },
      { key: "creditLimit", value: "" },
    ],
    sessions: [],
    inventory: [],
  };

  const fields = configs[moduleKey] || [];
  const result: Record<string, any> = {};
  for (const field of fields) {
    result[field.key] = field.value;
  }
  return result;
}

function getDefaultPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
    ADMIN: [
      "VIEW_REPORTS",
      "EDIT_PRICES",
      "MANAGE_STAFF",
      "MANAGE_PRODUCTS",
      "VIEW_SALES",
      "MANAGE_CUSTOMERS",
      "EDIT_INVENTORY",
    ],
    MANAGER: [
      "VIEW_REPORTS",
      "EDIT_PRICES",
      "MANAGE_PRODUCTS",
      "VIEW_SALES",
      "MANAGE_CUSTOMERS",
    ],
    CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
    ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
  };
  return permissions[role] || [];
}

function buildPayload(
  moduleKey: ModuleKey,
  values: Record<string, any>,
  currentStoreId: string | null,
) {
  const payload: Record<string, any> = {
    tenantId: "default",
    ...values,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === "" || payload[key] === undefined) {
      delete payload[key];
    }
    if (payload[key] === "true") payload[key] = true;
    if (payload[key] === "false") payload[key] = false;
  });

  if (["products", "staff", "categories", "suppliers"].includes(moduleKey)) {
    payload.storeId = currentStoreId || undefined;
  }

  return payload;
}
