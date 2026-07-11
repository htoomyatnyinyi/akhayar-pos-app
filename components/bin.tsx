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

// // ============================================
// // FILE: app/(tabs)/manage.tsx
// // ============================================

// import {
//   ActionButton,
//   Card,
//   Header,
//   MetricCard,
//   Pill,
//   RowItem,
//   Screen,
//   SectionTitle,
// } from "@/components/app-ui";
// import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// import { logout, setStore } from "@/services/features/auth/authSlice";
// import { resetOfflineState } from "@/services/features/offline/offlineSlice";
// import { clearOfflineDatabase } from "@/services/offline/db";
// import { MaterialIcons } from "@expo/vector-icons";
// import { useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Modal,
//   Pressable,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// // ✅ Offline-first local APIs
// import {
//   useCloseLocalSessionMutation,
//   useCreateLocalBrandMutation,
//   useCreateLocalCategoryMutation,
//   useCreateLocalCustomerMutation,
//   useCreateLocalProductMutation,
//   useCreateLocalStaffMutation,
//   useCreateLocalStoreMutation,
//   useCreateLocalSupplierMutation,
//   useDeleteLocalBrandMutation,
//   useDeleteLocalCategoryMutation,
//   useDeleteLocalCustomerMutation,
//   useDeleteLocalProductMutation,
//   useDeleteLocalStaffMutation,
//   useDeleteLocalStoreMutation,
//   useDeleteLocalSupplierMutation,
//   useGetActiveSessionQuery,
//   useGetLocalBrandsQuery,
//   useGetLocalCategoriesQuery,
//   useGetLocalCustomersQuery,
//   useGetLocalProductsQuery,
//   useGetLocalStaffQuery,
//   useGetLocalStoresQuery,
//   useGetLocalSuppliersQuery,
//   useOpenLocalSessionMutation,
//   useUpdateLocalBrandMutation,
//   useUpdateLocalCategoryMutation,
//   useUpdateLocalCustomerMutation,
//   useUpdateLocalProductMutation,
//   useUpdateLocalStaffMutation,
//   useUpdateLocalStoreMutation,
//   useUpdateLocalSupplierMutation,
//   useGetLocalInventoryQuery,
//   useGetLocalInventoryMovementsQuery,
// } from "@/services/features/offline/localApi";

// type ModuleKey =
//   | "staff"
//   | "products"
//   | "stores"
//   | "categories"
//   | "customers"
//   | "suppliers"
//   | "sessions"
//   | "brands"
//   | "inventory";

// // ============================================
// // MODULE CONFIGURATION
// // ============================================

// interface ModuleConfig {
//   label: string;
//   icon: keyof typeof MaterialIcons.glyphMap;
//   fields: FieldConfig[];
//   createLabel: string;
//   editLabel: string;
//   emptyMessage: string;
// }

// interface FieldConfig {
//   key: string;
//   label: string;
//   type:
//     | "text"
//     | "number"
//     | "decimal"
//     | "email"
//     | "phone"
//     | "select"
//     | "multiline";
//   required?: boolean;
//   options?: { label: string; value: string }[];
//   placeholder?: string;
// }

// const MODULE_CONFIGS: Record<ModuleKey, ModuleConfig> = {
//   products: {
//     label: "Products",
//     icon: "inventory-2",
//     createLabel: "Create Product",
//     editLabel: "Edit Product",
//     emptyMessage:
//       "No products found. Create your first product to get started.",
//     fields: [
//       { key: "name", label: "Name", type: "text", required: true },
//       { key: "sku", label: "SKU", type: "text" },
//       { key: "barcode", label: "Barcode", type: "text" },
//       { key: "description", label: "Description", type: "multiline" },
//       { key: "brandId", label: "Brand", type: "select" },
//       { key: "categoryId", label: "Category", type: "select", required: true },
//       { key: "supplierId", label: "Supplier", type: "select" },
//       { key: "costPrice", label: "Cost Price", type: "decimal" },
//       {
//         key: "sellingPrice",
//         label: "Selling Price",
//         type: "decimal",
//         required: true,
//       },
//       { key: "wholesalePrice", label: "Wholesale Price", type: "decimal" },
//       { key: "initialStock", label: "Initial Stock", type: "number" },
//       {
//         key: "manufacturingDate",
//         label: "Manufacturing Date",
//         type: "text",
//         placeholder: "YYYY-MM-DD",
//       },
//       {
//         key: "expiryDate",
//         label: "Expiry Date",
//         type: "text",
//         placeholder: "YYYY-MM-DD",
//       },
//       {
//         key: "isActive",
//         label: "Active",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   staff: {
//     label: "Staff",
//     icon: "groups",
//     createLabel: "Create Staff",
//     editLabel: "Edit Staff",
//     emptyMessage:
//       "No staff members found. Add your team members to get started.",
//     fields: [
//       { key: "username", label: "Username", type: "text", required: true },
//       { key: "name", label: "Full Name", type: "text", required: true },
//       { key: "email", label: "Email", type: "email", required: true },
//       { key: "password", label: "Password", type: "text", required: true },
//       {
//         key: "role",
//         label: "Role",
//         type: "select",
//         required: true,
//         options: [
//           { label: "Admin", value: "ADMIN" },
//           { label: "Manager", value: "MANAGER" },
//           { label: "Cashier", value: "CASHIER" },
//           { label: "Accountant", value: "ACCOUNTANT" },
//         ],
//       },
//       { key: "storeId", label: "Store", type: "select" },
//       {
//         key: "isActive",
//         label: "Status",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   stores: {
//     label: "Stores",
//     icon: "store",
//     createLabel: "Create Store",
//     editLabel: "Edit Store",
//     emptyMessage: "No stores found. Create your first store location.",
//     fields: [
//       { key: "code", label: "Code", type: "text", required: true },
//       { key: "name", label: "Name", type: "text", required: true },
//       { key: "address", label: "Address", type: "multiline" },
//       { key: "phone", label: "Phone", type: "phone" },
//       { key: "email", label: "Email", type: "email" },
//       { key: "taxNumber", label: "Tax Number", type: "text" },
//       {
//         key: "isActive",
//         label: "Status",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   categories: {
//     label: "Categories",
//     icon: "category",
//     createLabel: "Create Category",
//     editLabel: "Edit Category",
//     emptyMessage:
//       "No categories found. Organize your products with categories.",
//     fields: [
//       { key: "name", label: "Name", type: "text", required: true },
//       { key: "slug", label: "Slug", type: "text" },
//       { key: "description", label: "Description", type: "multiline" },
//       { key: "parentId", label: "Parent Category", type: "select" },
//       {
//         key: "isActive",
//         label: "Status",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   brands: {
//     label: "Brands",
//     icon: "branding-watermark",
//     createLabel: "Create Brand",
//     editLabel: "Edit Brand",
//     emptyMessage:
//       "No brands found. Add product brands to organize your catalog.",
//     fields: [
//       { key: "name", label: "Name", type: "text", required: true },
//       { key: "description", label: "Description", type: "multiline" },
//       {
//         key: "isActive",
//         label: "Status",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   customers: {
//     label: "Customers",
//     icon: "person",
//     createLabel: "Create Customer",
//     editLabel: "Edit Customer",
//     emptyMessage: "No customers found. Add your first customer.",
//     fields: [
//       { key: "name", label: "Name", type: "text", required: true },
//       { key: "phone", label: "Phone", type: "phone" },
//       { key: "email", label: "Email", type: "email" },
//       { key: "address", label: "Address", type: "multiline" },
//       {
//         key: "dateOfBirth",
//         label: "Date of Birth",
//         type: "text",
//         placeholder: "YYYY-MM-DD",
//       },
//       {
//         key: "gender",
//         label: "Gender",
//         type: "select",
//         options: [
//           { label: "Male", value: "MALE" },
//           { label: "Female", value: "FEMALE" },
//           { label: "Other", value: "OTHER" },
//         ],
//       },
//       {
//         key: "tier",
//         label: "Tier",
//         type: "select",
//         options: [
//           { label: "Bronze", value: "BRONZE" },
//           { label: "Silver", value: "SILVER" },
//           { label: "Gold", value: "GOLD" },
//           { label: "Platinum", value: "PLATINUM" },
//           { label: "Diamond", value: "DIAMOND" },
//         ],
//       },
//       {
//         key: "isActive",
//         label: "Status",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   suppliers: {
//     label: "Suppliers",
//     icon: "local-shipping",
//     createLabel: "Create Supplier",
//     editLabel: "Edit Supplier",
//     emptyMessage: "No suppliers found. Add your suppliers.",
//     fields: [
//       { key: "name", label: "Name", type: "text", required: true },
//       { key: "code", label: "Code", type: "text" },
//       { key: "contactName", label: "Contact Person", type: "text" },
//       { key: "phone", label: "Phone", type: "phone" },
//       { key: "email", label: "Email", type: "email" },
//       { key: "address", label: "Address", type: "multiline" },
//       { key: "taxNumber", label: "Tax Number", type: "text" },
//       { key: "paymentTerms", label: "Payment Terms (days)", type: "number" },
//       { key: "creditLimit", label: "Credit Limit", type: "decimal" },
//       {
//         key: "isActive",
//         label: "Status",
//         type: "select",
//         options: [
//           { label: "Active", value: "true" },
//           { label: "Inactive", value: "false" },
//         ],
//       },
//     ],
//   },
//   sessions: {
//     label: "Sessions",
//     icon: "schedule",
//     createLabel: "Open Session",
//     editLabel: "Close Session",
//     emptyMessage: "No active sessions.",
//     fields: [],
//   },
//   inventory: {
//     label: "Inventory",
//     icon: "inventory",
//     createLabel: "Adjust Stock",
//     editLabel: "View Details",
//     emptyMessage: "No inventory items found.",
//     fields: [
//       { key: "productId", label: "Product", type: "select", required: true },
//       { key: "storeId", label: "Store", type: "select", required: true },
//       { key: "quantity", label: "Quantity", type: "number", required: true },
//       { key: "reorderPoint", label: "Reorder Point", type: "number" },
//       { key: "shelfLocation", label: "Shelf Location", type: "text" },
//     ],
//   },
// };

// export default function ManageScreen() {
//   const dispatch = useAppDispatch();
//   const { user, currentStoreId } = useAppSelector((state) => state.auth);
//   const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
//   const [editor, setEditor] = useState<{
//     open: boolean;
//     mode: "create" | "edit";
//     item?: any;
//   }>({ open: false, mode: "create" });

//   const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
//     null,
//   );
//   const [searchQuery, setSearchQuery] = useState("");

//   // ✅ Queries
//   const {
//     data: staff = [],
//     isLoading: isLoadingStaff,
//     refetch: refetchStaff,
//   } = useGetLocalStaffQuery({
//     storeId: currentStoreId || undefined,
//   });
//   const {
//     data: products = [],
//     isLoading: isLoadingProducts,
//     refetch: refetchProducts,
//   } = useGetLocalProductsQuery({
//     storeId: currentStoreId || undefined,
//   });
//   const {
//     data: stores = [],
//     isLoading: isLoadingStores,
//     refetch: refetchStores,
//   } = useGetLocalStoresQuery({});
//   const {
//     data: categories = [],
//     isLoading: isLoadingCategories,
//     refetch: refetchCategories,
//   } = useGetLocalCategoriesQuery({
//     storeId: currentStoreId || undefined,
//   });
//   const {
//     data: customers = [],
//     isLoading: isLoadingCustomers,
//     refetch: refetchCustomers,
//   } = useGetLocalCustomersQuery({});
//   const {
//     data: suppliers = [],
//     isLoading: isLoadingSuppliers,
//     refetch: refetchSuppliers,
//   } = useGetLocalSuppliersQuery({
//     storeId: currentStoreId || undefined,
//   });
//   const {
//     data: brands = [],
//     isLoading: isLoadingBrands,
//     refetch: refetchBrands,
//   } = useGetLocalBrandsQuery({});
//   const {
//     data: inventory = [],
//     isLoading: isLoadingInventory,
//     refetch: refetchInventory,
//   } = useGetLocalInventoryQuery({
//     storeId: currentStoreId || undefined,
//   });
//   const { data: activeSession, refetch: refetchSession } =
//     useGetActiveSessionQuery(
//       { userId: user?.id || "", storeId: currentStoreId || undefined },
//       { skip: !user?.id },
//     );

//   // ✅ Mutations
//   const [createStaff] = useCreateLocalStaffMutation();
//   const [updateStaff] = useUpdateLocalStaffMutation();
//   const [deleteStaff] = useDeleteLocalStaffMutation();

//   const [createProduct] = useCreateLocalProductMutation();
//   const [updateProduct] = useUpdateLocalProductMutation();
//   const [deleteProduct] = useDeleteLocalProductMutation();

//   const [createStore] = useCreateLocalStoreMutation();
//   const [updateStore] = useUpdateLocalStoreMutation();
//   const [deleteStore] = useDeleteLocalStoreMutation();

//   const [createCategory] = useCreateLocalCategoryMutation();
//   const [updateCategory] = useUpdateLocalCategoryMutation();
//   const [deleteCategory] = useDeleteLocalCategoryMutation();

//   const [createCustomer] = useCreateLocalCustomerMutation();
//   const [updateCustomer] = useUpdateLocalCustomerMutation();
//   const [deleteCustomer] = useDeleteLocalCustomerMutation();

//   const [createSupplier] = useCreateLocalSupplierMutation();
//   const [updateSupplier] = useUpdateLocalSupplierMutation();
//   const [deleteSupplier] = useDeleteLocalSupplierMutation();

//   const [createBrand] = useCreateLocalBrandMutation();
//   const [updateBrand] = useUpdateLocalBrandMutation();
//   const [deleteBrand] = useDeleteLocalBrandMutation();

//   const [openSession] = useOpenLocalSessionMutation();
//   const [closeSession] = useCloseLocalSessionMutation();

//   const refetchers = {
//     staff: refetchStaff,
//     products: refetchProducts,
//     stores: refetchStores,
//     categories: refetchCategories,
//     customers: refetchCustomers,
//     suppliers: refetchSuppliers,
//     brands: refetchBrands,
//     sessions: refetchSession,
//     inventory: refetchInventory,
//   } as const;

//   const isLoading =
//     isLoadingStaff ||
//     isLoadingProducts ||
//     isLoadingStores ||
//     isLoadingCategories ||
//     isLoadingCustomers ||
//     isLoadingSuppliers ||
//     isLoadingBrands ||
//     isLoadingInventory;

//   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

//   const storeOptions = useMemo(() => stores, [stores]);

//   // ✅ Sign Out Handler
//   const handleSignOut = async () => {
//     Alert.alert(
//       "Sign Out",
//       "Are you sure you want to sign out? Offline data will be cleared.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Sign Out",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               await clearOfflineDatabase();
//               dispatch(resetOfflineState());
//               dispatch(logout());
//             } catch (error) {
//               Alert.alert("Error", "Failed to sign out.");
//             }
//           },
//         },
//       ],
//     );
//   };

//   if (!isPrivileged) {
//     return (
//       <Screen>
//         <SafeAreaView className="flex-1">
//           <View className="flex-1 items-center justify-center px-6">
//             <Pill label="Restricted" tone="rose" />
//             <Text className="mt-4 text-3xl font-black text-white">
//               Management locked
//             </Text>
//             <Text className="mt-3 text-center text-sm text-slate-300">
//               Your account does not have access to staff, product, or store
//               management.
//             </Text>
//           </View>
//         </SafeAreaView>
//       </Screen>
//     );
//   }

//   const summary = [
//     {
//       label: "Staff",
//       value: String(staff.length),
//       icon: "groups" as const,
//       tone: "sky" as const,
//     },
//     {
//       label: "Products",
//       value: String(products.length),
//       icon: "inventory-2" as const,
//       tone: "emerald" as const,
//     },
//     {
//       label: "Stores",
//       value: String(stores.length),
//       icon: "store" as const,
//       tone: "amber" as const,
//     },
//     {
//       label: "Customers",
//       value: String(customers.length),
//       icon: "person" as const,
//       tone: "rose" as const,
//     },
//     {
//       label: "Brands",
//       value: String(brands.length),
//       icon: "branding-watermark" as const,
//       tone: "purple" as const,
//     },
//     {
//       label: "Inventory",
//       value: String(inventory.length),
//       icon: "inventory" as const,
//       tone: "sky" as const,
//     },
//   ];

//   const list = getModuleList({
//     moduleKey,
//     staff,
//     products,
//     stores,
//     categories,
//     customers,
//     suppliers,
//     brands,
//     activeSession,
//     inventory,
//   });

//   const handleSave = async (values: Record<string, any>) => {
//     try {
//       const nextValues = buildPayload(moduleKey, values, currentStoreId);

//       if (moduleKey === "staff") {
//         if (editor.mode === "create") await createStaff(nextValues).unwrap();
//         else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
//       } else if (moduleKey === "products") {
//         if (editor.mode === "create") await createProduct(nextValues).unwrap();
//         else
//           await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
//       } else if (moduleKey === "stores") {
//         if (editor.mode === "create") await createStore(nextValues).unwrap();
//         else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
//       } else if (moduleKey === "categories") {
//         if (editor.mode === "create") await createCategory(nextValues).unwrap();
//         else
//           await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
//       } else if (moduleKey === "customers") {
//         if (editor.mode === "create") await createCustomer(nextValues).unwrap();
//         else
//           await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
//       } else if (moduleKey === "suppliers") {
//         if (editor.mode === "create") await createSupplier(nextValues).unwrap();
//         else
//           await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
//       } else if (moduleKey === "brands") {
//         if (editor.mode === "create") await createBrand(nextValues).unwrap();
//         else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
//       }

//       await refetchers[moduleKey]();
//       setEditor({ open: false, mode: "create" });
//     } catch (error: any) {
//       Alert.alert(
//         "Save failed",
//         error?.data?.message || "Unable to save changes.",
//       );
//     }
//   };

//   const handleDelete = async (item: any) => {
//     try {
//       if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
//       else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
//       else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
//       else if (moduleKey === "categories")
//         await deleteCategory(item.id).unwrap();
//       else if (moduleKey === "customers")
//         await deleteCustomer(item.id).unwrap();
//       else if (moduleKey === "suppliers")
//         await deleteSupplier(item.id).unwrap();
//       else if (moduleKey === "brands") await deleteBrand(item.id).unwrap();
//       await refetchers[moduleKey]();
//     } catch (error: any) {
//       Alert.alert(
//         "Delete failed",
//         error?.data?.message || "Unable to delete item.",
//       );
//     }
//   };

//   const openEditor = (mode: "create" | "edit", item?: any) => {
//     if (moduleKey === "inventory" && item) {
//       Alert.alert(
//         "Inventory Details",
//         `Product: ${item.product?.name || item.name || "Unknown"}\nQuantity: ${item.quantity || 0}\nStore: ${item.store?.name || "Unknown Store"}\nReorder Point: ${item.reorderPoint || 10}`,
//         [{ text: "OK" }],
//       );
//       return;
//     }
//     setEditor({ open: true, mode, item });
//   };

//   if (isLoading) {
//     return (
//       <Screen>
//         <SafeAreaView className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color="#38bdf8" />
//           <Text className="text-slate-400 mt-4 text-sm">Loading data...</Text>
//         </SafeAreaView>
//       </Screen>
//     );
//   }

//   return (
//     <Screen>
//       <SafeAreaView className="flex-1 bg-slate-950">
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 28 }}
//           className="px-5"
//         >
//           <Header
//             eyebrow="Administration"
//             title="Management"
//             subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, inventory, and session control from one place."
//             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
//           />

//           <View className="mb-4 flex-row flex-wrap gap-3">
//             {summary.map((item) => (
//               <View key={item.label} className="w-[48.5%]">
//                 <MetricCard
//                   icon={item.icon}
//                   label={item.label}
//                   value={item.value}
//                   tone={item.tone}
//                 />
//               </View>
//             ))}
//           </View>

//           <Card className="mb-4">
//             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
//               Store context
//             </Text>
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               className="mt-3"
//               contentContainerStyle={{ gap: 8 }}
//             >
//               {storeOptions.map((store: any) => {
//                 const active = store.id === currentStoreId;
//                 return (
//                   <Pressable
//                     key={store.id}
//                     onPress={() => dispatch(setStore(store.id))}
//                     className={`rounded-full border px-4 py-3 ${
//                       active
//                         ? "border-sky-400/30 bg-sky-500/15"
//                         : "border-white/10 bg-white/5"
//                     }`}
//                   >
//                     <Text
//                       className={`text-xs font-bold uppercase tracking-[2px] ${
//                         active ? "text-sky-200" : "text-slate-300"
//                       }`}
//                     >
//                       {store.name}
//                     </Text>
//                   </Pressable>
//                 );
//               })}
//             </ScrollView>
//           </Card>

//           <SectionTitle title="Modules" />
//           <View className="mb-4 flex-row flex-wrap gap-2">
//             {(
//               [
//                 "products",
//                 "staff",
//                 "stores",
//                 "categories",
//                 "customers",
//                 "suppliers",
//                 "brands",
//                 "inventory",
//                 "sessions",
//               ] as ModuleKey[]
//             ).map((key) => (
//               <Pressable
//                 key={key}
//                 onPress={() => setModuleKey(key)}
//                 className={`rounded-full border px-4 py-3 ${
//                   moduleKey === key
//                     ? "border-emerald-400/30 bg-emerald-500/15"
//                     : "border-white/10 bg-white/5"
//                 }`}
//               >
//                 <Text
//                   className={`text-xs font-bold uppercase tracking-[2px] ${
//                     moduleKey === key ? "text-emerald-200" : "text-slate-300"
//                   }`}
//                 >
//                   {key}
//                 </Text>
//               </Pressable>
//             ))}
//           </View>

//           <View className="mb-4 flex-row gap-3">
//             <ActionButton
//               title="Add New"
//               icon="add"
//               accent="emerald"
//               onPress={() => openEditor("create")}
//             />
//             {moduleKey === "sessions" ? (
//               <ActionButton
//                 title={activeSession ? "Close Session" : "Open Session"}
//                 icon="schedule"
//                 accent={activeSession ? "rose" : "sky"}
//                 onPress={() =>
//                   setSessionModal(activeSession ? "close" : "open")
//                 }
//               />
//             ) : (
//               <ActionButton
//                 title="Refresh"
//                 icon="refresh"
//                 accent="sky"
//                 onPress={() => refetchers[moduleKey]()}
//               />
//             )}
//           </View>

//           <SectionTitle
//             title={`${moduleKey} list (${list.length})`}
//             action="Tap an item to edit"
//           />
//           <Card>
//             {list.length > 0 ? (
//               list.map((item: any, index: number) => {
//                 let displayName =
//                   item.name || item.username || item.code || item.id;

//                 if (moduleKey === "inventory") {
//                   displayName =
//                     item.product?.name ||
//                     item.productName ||
//                     `Product ${item.productId?.slice(-6)}`;
//                 }

//                 return (
//                   <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
//                     <Pressable onPress={() => openEditor("edit", item)}>
//                       <RowItem
//                         title={displayName}
//                         subtitle={getSubtitle(moduleKey, item)}
//                         right={getRightLabel(moduleKey, item)}
//                         icon={getIcon(moduleKey)}
//                       />
//                     </Pressable>
//                     {index < list.length - 1 ? (
//                       <View className="my-3 h-px bg-white/8" />
//                     ) : null}
//                   </View>
//                 );
//               })
//             ) : (
//               <View className="py-8 items-center">
//                 <View className="h-16 w-16 bg-white/5 rounded-full items-center justify-center border border-white/10">
//                   <MaterialIcons name="inbox" size={28} color="#64748b" />
//                 </View>
//                 <Text className="text-slate-400 text-center text-sm mt-3">
//                   No {moduleKey} found
//                 </Text>
//                 <Text className="text-slate-500 text-xs text-center mt-1">
//                   {moduleKey === "inventory"
//                     ? "Inventory is managed through sales and purchases"
//                     : `Create one by tapping "Add New"`}
//                 </Text>
//               </View>
//             )}
//           </Card>

//           {/* ✅ Sign Out Button */}
//           <View className="mt-6 pt-4 border-t border-white/10">
//             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400 mb-3">
//               Account
//             </Text>
//             <Pressable
//               onPress={handleSignOut}
//               className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 flex-row items-center justify-between"
//             >
//               <View className="flex-row items-center">
//                 <View className="bg-rose-500/20 p-2 rounded-full">
//                   <MaterialIcons name="logout" size={20} color="#f87171" />
//                 </View>
//                 <Text className="text-rose-400 font-semibold ml-3">
//                   Sign Out
//                 </Text>
//               </View>
//               <MaterialIcons name="chevron-right" size={20} color="#f87171" />
//             </Pressable>
//             <Text className="text-slate-500 text-[10px] mt-2 text-center">
//               This will clear all offline data and return to login
//             </Text>
//           </View>
//         </ScrollView>

//         {/* Editor Modal */}
//         <Modal
//           visible={editor.open}
//           animationType="slide"
//           onRequestClose={() => setEditor({ open: false, mode: "create" })}
//           transparent={true}
//         >
//           <View className="flex-1 bg-black/70">
//             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
//               <EditorModalContent
//                 title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
//                 moduleKey={moduleKey}
//                 item={editor.item}
//                 mode={editor.mode}
//                 onClose={() => setEditor({ open: false, mode: "create" })}
//                 onSave={handleSave}
//                 onDelete={
//                   editor.item ? () => handleDelete(editor.item) : undefined
//                 }
//                 currentStoreId={currentStoreId}
//                 stores={stores}
//                 categories={categories}
//                 suppliers={suppliers}
//                 brands={brands}
//                 refetchCategories={refetchCategories}
//                 refetchSuppliers={refetchSuppliers}
//                 refetchBrands={refetchBrands}
//               />
//             </View>
//           </View>
//         </Modal>

//         {/* Session Modal */}
//         <Modal
//           visible={sessionModal !== null}
//           animationType="slide"
//           onRequestClose={() => setSessionModal(null)}
//           transparent={true}
//         >
//           <View className="flex-1 bg-black/70">
//             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
//               <SessionModalContent
//                 mode={sessionModal}
//                 activeSession={activeSession}
//                 onClose={() => setSessionModal(null)}
//                 onOpen={async (openingBalance, notes) => {
//                   try {
//                     await openSession({
//                       userId: user?.id || "",
//                       openingBalance: Number(openingBalance || 0),
//                       notes,
//                       storeId: currentStoreId || undefined,
//                     }).unwrap();
//                     setSessionModal(null);
//                     await refetchSession();
//                   } catch (error: any) {
//                     Alert.alert(
//                       "Open session failed",
//                       error?.data?.message || "Unable to open session.",
//                     );
//                   }
//                 }}
//                 onCloseSession={async (closingBalance, notes) => {
//                   try {
//                     if (!activeSession) return;
//                     await closeSession({
//                       sessionId: activeSession.id,
//                       data: {
//                         closingBalance: Number(closingBalance || 0),
//                         expectedBalance: Number(closingBalance || 0),
//                         discrepancy: 0,
//                         cashSales: 0,
//                         cardSales: 0,
//                         digitalSales: 0,
//                         notes,
//                       },
//                     }).unwrap();
//                     setSessionModal(null);
//                     await refetchSession();
//                   } catch (error: any) {
//                     Alert.alert(
//                       "Close session failed",
//                       error?.data?.message || "Unable to close session.",
//                     );
//                   }
//                 }}
//               />
//             </View>
//           </View>
//         </Modal>
//       </SafeAreaView>
//     </Screen>
//   );
// }

// // ============================================
// // EDITOR MODAL CONTENT
// // ============================================

// function EditorModalContent({
//   title,
//   moduleKey,
//   item,
//   mode,
//   onClose,
//   onSave,
//   onDelete,
//   currentStoreId,
//   stores,
//   categories,
//   suppliers,
//   brands,
//   refetchCategories,
//   refetchSuppliers,
//   refetchBrands,
// }: {
//   title: string;
//   moduleKey: ModuleKey;
//   item?: any;
//   mode: "create" | "edit";
//   onClose: () => void;
//   onSave: (values: Record<string, any>) => Promise<void>;
//   onDelete?: () => void;
//   currentStoreId: string | null;
//   stores: any[];
//   categories: any[];
//   suppliers: any[];
//   brands: any[];
//   refetchCategories: () => void;
//   refetchSuppliers: () => void;
//   refetchBrands: () => void;
// }) {
//   const [fields, setFields] = useState<Record<string, any>>({});
//   const [showCreateCategory, setShowCreateCategory] = useState(false);
//   const [showCreateSupplier, setShowCreateSupplier] = useState(false);
//   const [showCreateBrand, setShowCreateBrand] = useState(false);
//   const [newCategory, setNewCategory] = useState({
//     name: "",
//     slug: "",
//     description: "",
//   });
//   const [newSupplier, setNewSupplier] = useState({
//     name: "",
//     code: "",
//     phone: "",
//     email: "",
//     address: "",
//     contactName: "",
//   });
//   const [newBrand, setNewBrand] = useState({
//     name: "",
//     description: "",
//   });
//   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
//   const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
//   const [isCreatingBrand, setIsCreatingBrand] = useState(false);

//   const [createCategory] = useCreateLocalCategoryMutation();
//   const [createSupplier] = useCreateLocalSupplierMutation();
//   const [createBrand] = useCreateLocalBrandMutation();

//   useEffect(() => {
//     if (item !== undefined) {
//       setFields(item ? { ...item } : getDefaultFields(moduleKey));
//     }
//   }, [item, moduleKey]);

//   const set = (key: string, value: any) =>
//     setFields((current) => ({ ...current, [key]: value }));

//   const save = () => onSave(fields);

//   const handleCreateCategory = async () => {
//     try {
//       if (!newCategory.name.trim()) {
//         Alert.alert("Error", "Category name is required");
//         return;
//       }

//       setIsCreatingCategory(true);
//       if (!currentStoreId) {
//         Alert.alert("Error", "Store not found");
//         return;
//       }

//       const payload = {
//         tenantId: "default",
//         name: newCategory.name.trim(),
//         slug:
//           newCategory.slug.trim() ||
//           newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
//         description: newCategory.description.trim() || undefined,
//         storeId: currentStoreId,
//         isActive: true,
//       };

//       const result = await createCategory(payload).unwrap();
//       await refetchCategories();
//       set("categoryId", result?.id);
//       set("categoryName", result?.name);

//       setShowCreateCategory(false);
//       setNewCategory({ name: "", slug: "", description: "" });

//       Alert.alert("Success", "Category created successfully");
//     } catch (error: any) {
//       Alert.alert(
//         "Failed to create category",
//         error?.data?.message || "Unable to create category.",
//       );
//     } finally {
//       setIsCreatingCategory(false);
//     }
//   };

//   const handleCreateSupplier = async () => {
//     try {
//       if (!newSupplier.name.trim()) {
//         Alert.alert("Error", "Supplier name is required");
//         return;
//       }

//       setIsCreatingSupplier(true);
//       if (!currentStoreId) {
//         Alert.alert("Error", "Store not found");
//         return;
//       }

//       const payload = {
//         tenantId: "default",
//         name: newSupplier.name.trim(),
//         code: newSupplier.code.trim() || undefined,
//         contactName: newSupplier.contactName.trim() || undefined,
//         phone: newSupplier.phone.trim() || undefined,
//         email: newSupplier.email.trim() || undefined,
//         address: newSupplier.address.trim() || undefined,
//         storeId: currentStoreId,
//         isActive: true,
//       };

//       const result = await createSupplier(payload).unwrap();
//       await refetchSuppliers();
//       set("supplierId", result.id);
//       set("supplierName", result.name);

//       setShowCreateSupplier(false);
//       setNewSupplier({
//         name: "",
//         code: "",
//         phone: "",
//         email: "",
//         address: "",
//         contactName: "",
//       });

//       Alert.alert("Success", "Supplier created successfully");
//     } catch (error: any) {
//       Alert.alert(
//         "Failed to create supplier",
//         error?.data?.message || "Unable to create supplier.",
//       );
//     } finally {
//       setIsCreatingSupplier(false);
//     }
//   };

//   const handleCreateBrand = async () => {
//     try {
//       if (!newBrand.name.trim()) {
//         Alert.alert("Error", "Brand name is required");
//         return;
//       }

//       setIsCreatingBrand(true);

//       const payload = {
//         tenantId: "default",
//         name: newBrand.name.trim(),
//         description: newBrand.description.trim() || undefined,
//         isActive: true,
//       };

//       const result = await createBrand(payload).unwrap();
//       await refetchBrands();
//       set("brandId", result.id);
//       set("brand", result.name);

//       setShowCreateBrand(false);
//       setNewBrand({ name: "", description: "" });

//       Alert.alert("Success", "Brand created successfully");
//     } catch (error: any) {
//       Alert.alert(
//         "Failed to create brand",
//         error?.data?.message || "Unable to create brand.",
//       );
//     } finally {
//       setIsCreatingBrand(false);
//     }
//   };

//   return (
//     <SafeAreaView className="flex-1 px-4 pt-4">
//       <View className="flex-row items-center justify-between mb-6">
//         <Text className="text-white text-xl font-black">{title}</Text>
//         <Pressable onPress={onClose}>
//           <MaterialIcons name="close" size={24} color="#94a3b8" />
//         </Pressable>
//       </View>

//       <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
//         {/* Staff Form */}
//         {moduleKey === "staff" && (
//           <>
//             <Field
//               label="Username"
//               value={fields.username ?? ""}
//               onChangeText={(v) => set("username", v)}
//               required
//             />
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="Email"
//               value={fields.email ?? ""}
//               onChangeText={(v) => set("email", v)}
//               required
//               keyboardType="email-address"
//             />
//             {mode === "create" && (
//               <Field
//                 label="Password"
//                 value={fields.password ?? ""}
//                 onChangeText={(v) => set("password", v)}
//                 secureTextEntry
//                 required
//               />
//             )}

//             <SelectField
//               label="Role"
//               value={fields.role ?? "CASHIER"}
//               options={[
//                 { label: "Admin", value: "ADMIN" },
//                 { label: "Manager", value: "MANAGER" },
//                 { label: "Cashier", value: "CASHIER" },
//                 { label: "Accountant", value: "ACCOUNTANT" },
//               ]}
//               onChange={(value) => {
//                 set("role", value);
//                 set("permissions", getDefaultPermissions(value));
//               }}
//               required
//             />

//             <SelectField
//               label="Store"
//               value={fields.storeId ?? ""}
//               options={stores.map((s: any) => ({ label: s.name, value: s.id }))}
//               onChange={(value) => set("storeId", value)}
//             />

//             <SelectField
//               label="Status"
//               value={
//                 fields.isActive !== undefined ? String(fields.isActive) : "true"
//               }
//               options={[
//                 { label: "Active", value: "true" },
//                 { label: "Inactive", value: "false" },
//               ]}
//               onChange={(value) => set("isActive", value === "true")}
//             />
//           </>
//         )}

//         {/* Products Form */}
//         {moduleKey === "products" && (
//           <>
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="SKU"
//               value={fields.sku ?? ""}
//               onChangeText={(v) => set("sku", v)}
//             />
//             <Field
//               label="Barcode"
//               value={fields.barcode ?? ""}
//               onChangeText={(v) => set("barcode", v)}
//             />
//             <Field
//               label="Description"
//               value={fields.description ?? ""}
//               onChangeText={(v) => set("description", v)}
//               multiline
//             />

//             <SelectField
//               label="Brand"
//               value={fields.brandId ?? ""}
//               options={brands.map((b: any) => ({ label: b.name, value: b.id }))}
//               onChange={(value) => set("brandId", value)}
//               onAddNew={() => setShowCreateBrand(true)}
//             />

//             <SelectField
//               label="Category"
//               value={fields.categoryId ?? ""}
//               options={categories.map((c: any) => ({
//                 label: c.name,
//                 value: c.id,
//               }))}
//               onChange={(value) => set("categoryId", value)}
//               required
//               onAddNew={() => setShowCreateCategory(true)}
//             />

//             <SelectField
//               label="Supplier"
//               value={fields.supplierId ?? ""}
//               options={suppliers.map((s: any) => ({
//                 label: s.name,
//                 value: s.id,
//               }))}
//               onChange={(value) => set("supplierId", value)}
//               onAddNew={() => setShowCreateSupplier(true)}
//             />

//             <Field
//               label="Cost Price"
//               value={fields.costPrice?.toString() ?? ""}
//               onChangeText={(v) => {
//                 const num = parseFloat(v);
//                 set("costPrice", isNaN(num) ? 0 : num);
//               }}
//               keyboardType="decimal-pad"
//             />
//             <Field
//               label="Selling Price"
//               value={fields.sellingPrice?.toString() ?? ""}
//               onChangeText={(v) => {
//                 const num = parseFloat(v);
//                 set("sellingPrice", isNaN(num) ? 0 : num);
//               }}
//               keyboardType="decimal-pad"
//               required
//             />
//             <Field
//               label="Wholesale Price"
//               value={fields.wholesalePrice?.toString() ?? ""}
//               onChangeText={(v) => {
//                 const num = parseFloat(v);
//                 set("wholesalePrice", isNaN(num) ? 0 : num);
//               }}
//               keyboardType="decimal-pad"
//             />
//             <Field
//               label="Initial Stock"
//               value={fields.initialStock?.toString() ?? ""}
//               onChangeText={(v) => {
//                 const num = parseInt(v, 10);
//                 set("initialStock", isNaN(num) ? 0 : num);
//               }}
//               keyboardType="numeric"
//             />
//             <Field
//               label="Manufacturing Date"
//               value={fields.manufacturingDate ?? ""}
//               onChangeText={(v) => set("manufacturingDate", v)}
//               placeholder="YYYY-MM-DD"
//             />
//             <Field
//               label="Expiry Date"
//               value={fields.expiryDate ?? ""}
//               onChangeText={(v) => set("expiryDate", v)}
//               placeholder="YYYY-MM-DD"
//             />

//             <SelectField
//               label="Status"
//               value={
//                 fields.isActive !== undefined ? String(fields.isActive) : "true"
//               }
//               options={[
//                 { label: "Active", value: "true" },
//                 { label: "Inactive", value: "false" },
//               ]}
//               onChange={(value) => set("isActive", value === "true")}
//             />
//           </>
//         )}

//         {/* Stores Form */}
//         {moduleKey === "stores" && (
//           <>
//             <Field
//               label="Code"
//               value={fields.code ?? ""}
//               onChangeText={(v) => set("code", v)}
//               required
//             />
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="Address"
//               value={fields.address ?? ""}
//               onChangeText={(v) => set("address", v)}
//               multiline
//             />
//             <Field
//               label="Phone"
//               value={fields.phone ?? ""}
//               onChangeText={(v) => set("phone", v)}
//               keyboardType="phone-pad"
//             />
//             <Field
//               label="Email"
//               value={fields.email ?? ""}
//               onChangeText={(v) => set("email", v)}
//               keyboardType="email-address"
//             />
//             <Field
//               label="Tax Number"
//               value={fields.taxNumber ?? ""}
//               onChangeText={(v) => set("taxNumber", v)}
//             />
//           </>
//         )}

//         {/* Categories Form */}
//         {moduleKey === "categories" && (
//           <>
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="Slug"
//               value={fields.slug ?? ""}
//               onChangeText={(v) => set("slug", v)}
//             />
//             <Field
//               label="Description"
//               value={fields.description ?? ""}
//               onChangeText={(v) => set("description", v)}
//               multiline
//             />
//             <SelectField
//               label="Parent Category"
//               value={fields.parentId ?? ""}
//               options={categories.map((c: any) => ({
//                 label: c.name,
//                 value: c.id,
//               }))}
//               onChange={(value) => set("parentId", value)}
//             />
//           </>
//         )}

//         {/* Brands Form */}
//         {moduleKey === "brands" && (
//           <>
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="Description"
//               value={fields.description ?? ""}
//               onChangeText={(v) => set("description", v)}
//               multiline
//             />
//           </>
//         )}

//         {/* Customers Form */}
//         {moduleKey === "customers" && (
//           <>
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="Phone"
//               value={fields.phone ?? ""}
//               onChangeText={(v) => set("phone", v)}
//               keyboardType="phone-pad"
//             />
//             <Field
//               label="Email"
//               value={fields.email ?? ""}
//               onChangeText={(v) => set("email", v)}
//               keyboardType="email-address"
//             />
//             <Field
//               label="Address"
//               value={fields.address ?? ""}
//               onChangeText={(v) => set("address", v)}
//               multiline
//             />
//             <Field
//               label="Date of Birth"
//               value={fields.dateOfBirth ?? ""}
//               onChangeText={(v) => set("dateOfBirth", v)}
//               placeholder="YYYY-MM-DD"
//             />
//             <SelectField
//               label="Gender"
//               value={fields.gender ?? ""}
//               options={[
//                 { label: "Male", value: "MALE" },
//                 { label: "Female", value: "FEMALE" },
//                 { label: "Other", value: "OTHER" },
//               ]}
//               onChange={(value) => set("gender", value)}
//             />
//             <SelectField
//               label="Tier"
//               value={fields.tier ?? "BRONZE"}
//               options={[
//                 { label: "Bronze", value: "BRONZE" },
//                 { label: "Silver", value: "SILVER" },
//                 { label: "Gold", value: "GOLD" },
//                 { label: "Platinum", value: "PLATINUM" },
//                 { label: "Diamond", value: "DIAMOND" },
//               ]}
//               onChange={(value) => set("tier", value)}
//             />
//           </>
//         )}

//         {/* Suppliers Form */}
//         {moduleKey === "suppliers" && (
//           <>
//             <Field
//               label="Name"
//               value={fields.name ?? ""}
//               onChangeText={(v) => set("name", v)}
//               required
//             />
//             <Field
//               label="Code"
//               value={fields.code ?? ""}
//               onChangeText={(v) => set("code", v)}
//             />
//             <Field
//               label="Contact Person"
//               value={fields.contactName ?? ""}
//               onChangeText={(v) => set("contactName", v)}
//             />
//             <Field
//               label="Phone"
//               value={fields.phone ?? ""}
//               onChangeText={(v) => set("phone", v)}
//               keyboardType="phone-pad"
//             />
//             <Field
//               label="Email"
//               value={fields.email ?? ""}
//               onChangeText={(v) => set("email", v)}
//               keyboardType="email-address"
//             />
//             <Field
//               label="Address"
//               value={fields.address ?? ""}
//               onChangeText={(v) => set("address", v)}
//               multiline
//             />
//             <Field
//               label="Tax Number"
//               value={fields.taxNumber ?? ""}
//               onChangeText={(v) => set("taxNumber", v)}
//             />
//             <Field
//               label="Payment Terms"
//               value={fields.paymentTerms?.toString() ?? ""}
//               onChangeText={(v) => {
//                 const num = parseInt(v, 10);
//                 set("paymentTerms", isNaN(num) ? undefined : num);
//               }}
//               keyboardType="numeric"
//               placeholder="30"
//             />
//             <Field
//               label="Credit Limit"
//               value={fields.creditLimit?.toString() ?? ""}
//               onChangeText={(v) => {
//                 const num = parseFloat(v);
//                 set("creditLimit", isNaN(num) ? undefined : num);
//               }}
//               keyboardType="decimal-pad"
//               placeholder="0.00"
//             />
//           </>
//         )}

//         {/* Sessions - No form */}
//         {moduleKey === "sessions" && (
//           <View className="py-8">
//             <Text className="text-center text-slate-400">
//               Session management is handled separately.
//             </Text>
//             <Text className="text-center text-slate-500 text-sm mt-2">
//               Use the "Open Session" or "Close Session" button above.
//             </Text>
//           </View>
//         )}

//         {/* Inventory - Read Only */}
//         {moduleKey === "inventory" && item && (
//           <Card className="mb-4">
//             <View className="flex-row justify-between items-center mb-2">
//               <Text className="text-slate-400 text-xs font-bold uppercase tracking-[3px]">
//                 Product
//               </Text>
//               <Text className="text-white font-semibold text-base">
//                 {item.product?.name || item.name || "Unknown"}
//               </Text>
//             </View>
//             <Divider />
//             <View className="flex-row justify-between items-center mb-2">
//               <Text className="text-slate-400 text-xs font-bold uppercase tracking-[3px]">
//                 Quantity
//               </Text>
//               <Text
//                 className={`font-semibold text-base ${
//                   item.quantity === 0
//                     ? "text-rose-400"
//                     : item.quantity <= 10
//                       ? "text-amber-400"
//                       : "text-emerald-400"
//                 }`}
//               >
//                 {item.quantity || 0} units
//               </Text>
//             </View>
//             <Divider />
//             <View className="flex-row justify-between items-center mb-2">
//               <Text className="text-slate-400 text-xs font-bold uppercase tracking-[3px]">
//                 Store
//               </Text>
//               <Text className="text-white font-semibold text-base">
//                 {item.store?.name || "Unknown Store"}
//               </Text>
//             </View>
//             <Divider />
//             <View className="flex-row justify-between items-center">
//               <Text className="text-slate-400 text-xs font-bold uppercase tracking-[3px]">
//                 Reorder Point
//               </Text>
//               <Text className="text-white font-semibold text-base">
//                 {item.reorderPoint || 10}
//               </Text>
//             </View>
//           </Card>
//         )}

//         <View className="mt-4 flex-row gap-3">
//           <ActionButton
//             title="Cancel"
//             icon="close"
//             accent="rose"
//             onPress={onClose}
//           />
//           {moduleKey !== "inventory" && (
//             <ActionButton
//               title="Save"
//               icon="save"
//               accent="emerald"
//               onPress={save}
//             />
//           )}
//         </View>
//         {mode === "edit" && onDelete && moduleKey !== "inventory" && (
//           <View className="mt-3">
//             <ActionButton
//               title="Delete"
//               icon="delete"
//               accent="rose"
//               onPress={onDelete}
//             />
//           </View>
//         )}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// // ============================================
// // SESSION MODAL CONTENT
// // ============================================

// function SessionModalContent({
//   mode,
//   activeSession,
//   onClose,
//   onOpen,
//   onCloseSession,
// }: {
//   mode: "open" | "close" | null;
//   activeSession: any;
//   onClose: () => void;
//   onOpen: (openingBalance: string, notes: string) => Promise<void>;
//   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// }) {
//   const [balance, setBalance] = useState("0");
//   const [notes, setNotes] = useState("");

//   return (
//     <SafeAreaView className="flex-1 px-4 pt-4">
//       <View className="flex-row items-center justify-between mb-6">
//         <Text className="text-white text-xl font-black">
//           {mode === "open" ? "Open Session" : "Close Session"}
//         </Text>
//         <Pressable onPress={onClose}>
//           <MaterialIcons name="close" size={24} color="#94a3b8" />
//         </Pressable>
//       </View>

//       <Text className="text-slate-400 text-sm mb-4">
//         {activeSession ? `Active: ${activeSession.id}` : "No active session"}
//       </Text>

//       <TextInput
//         value={balance}
//         onChangeText={setBalance}
//         keyboardType="decimal-pad"
//         placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
//         placeholderTextColor="#64748b"
//         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
//       />
//       <TextInput
//         value={notes}
//         onChangeText={setNotes}
//         placeholder="Notes"
//         placeholderTextColor="#64748b"
//         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
//         multiline
//         numberOfLines={3}
//       />
//       <View className="flex-row gap-3">
//         <ActionButton
//           title="Cancel"
//           icon="close"
//           accent="rose"
//           onPress={onClose}
//         />
//         <ActionButton
//           title={mode === "open" ? "Open" : "Close"}
//           icon="schedule"
//           accent="emerald"
//           onPress={async () => {
//             if (mode === "open") await onOpen(balance, notes);
//             else await onCloseSession(balance, notes);
//           }}
//         />
//       </View>
//     </SafeAreaView>
//   );
// }

// // ============================================
// // SELECT FIELD COMPONENT
// // ============================================

// function SelectField({
//   label,
//   value,
//   options,
//   onChange,
//   required = false,
//   onAddNew,
// }: {
//   label: string;
//   value: string;
//   options: { label: string; value: string }[];
//   onChange: (value: string) => void;
//   required?: boolean;
//   onAddNew?: () => void;
// }) {
//   const [showDropdown, setShowDropdown] = useState(false);
//   const selectedOption = options.find((o) => o.value === value);

//   return (
//     <View className="mb-4">
//       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
//         {label} {required && <Text className="text-rose-400">*</Text>}
//       </Text>
//       <Pressable
//         onPress={() => setShowDropdown(!showDropdown)}
//         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
//       >
//         <View className="flex-row items-center justify-between">
//           <Text
//             className={`text-base ${selectedOption ? "text-white" : "text-slate-400"}`}
//           >
//             {selectedOption
//               ? selectedOption.label
//               : `Select ${label.toLowerCase()}...`}
//           </Text>
//           <MaterialIcons
//             name={showDropdown ? "expand-less" : "expand-more"}
//             size={24}
//             color="#64748b"
//           />
//         </View>
//       </Pressable>

//       {showDropdown && (
//         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
//           <ScrollView nestedScrollEnabled>
//             {options.length > 0 ? (
//               options.map((option) => (
//                 <Pressable
//                   key={option.value}
//                   onPress={() => {
//                     onChange(option.value);
//                     setShowDropdown(false);
//                   }}
//                   className={`rounded-xl px-4 py-3 ${
//                     value === option.value ? "bg-emerald-500/20" : ""
//                   }`}
//                 >
//                   <Text className="text-white">{option.label}</Text>
//                 </Pressable>
//               ))
//             ) : (
//               <Text className="py-4 text-center text-slate-400">
//                 No options available
//               </Text>
//             )}
//             {onAddNew && (
//               <Pressable
//                 onPress={() => {
//                   setShowDropdown(false);
//                   onAddNew();
//                 }}
//                 className="mt-2 rounded-xl border border-dashed border-sky-500/30 p-3"
//               >
//                 <Text className="text-center text-sky-400">+ Create New</Text>
//               </Pressable>
//             )}
//           </ScrollView>
//         </View>
//       )}
//     </View>
//   );
// }

// // ============================================
// // FIELD COMPONENT
// // ============================================

// function Field({
//   label,
//   value,
//   onChangeText,
//   secureTextEntry = false,
//   keyboardType = "default",
//   multiline = false,
//   placeholder,
//   required = false,
// }: {
//   label: string;
//   value: string;
//   onChangeText: (value: string) => void;
//   secureTextEntry?: boolean;
//   keyboardType?:
//     | "default"
//     | "decimal-pad"
//     | "numeric"
//     | "email-address"
//     | "phone-pad";
//   multiline?: boolean;
//   placeholder?: string;
//   required?: boolean;
// }) {
//   return (
//     <View className="mb-4">
//       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
//         {label} {required && <Text className="text-rose-400">*</Text>}
//       </Text>
//       <TextInput
//         value={value}
//         onChangeText={onChangeText}
//         placeholder={placeholder || label}
//         placeholderTextColor="#64748b"
//         secureTextEntry={secureTextEntry}
//         keyboardType={keyboardType}
//         multiline={multiline}
//         numberOfLines={multiline ? 3 : 1}
//         className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
//           multiline ? "min-h-[100px] text-left align-top" : ""
//         }`}
//       />
//     </View>
//   );
// }

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// function getModuleList(input: any) {
//   const {
//     moduleKey,
//     staff,
//     products,
//     stores,
//     categories,
//     customers,
//     suppliers,
//     brands,
//     activeSession,
//     inventory,
//   } = input;

//   if (moduleKey === "staff") return staff;
//   if (moduleKey === "products") return products;
//   if (moduleKey === "stores") return stores;
//   if (moduleKey === "categories") return categories;
//   if (moduleKey === "customers") return customers;
//   if (moduleKey === "suppliers") return suppliers;
//   if (moduleKey === "brands") return brands;
//   if (moduleKey === "inventory") return inventory;
//   return activeSession ? [activeSession] : [];
// }

// function getSubtitle(moduleKey: ModuleKey, item: any) {
//   if (moduleKey === "staff")
//     return `${item.role} • ${item.email ?? "no email"}`;
//   if (moduleKey === "products") {
//     const brandName = item.brand?.name || item.brandName || "";
//     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
//   }
//   if (moduleKey === "stores") return item.address ?? "No address";
//   if (moduleKey === "categories") return item.slug ?? "No slug";
//   if (moduleKey === "customers") return item.phone ?? item.code;
//   if (moduleKey === "suppliers")
//     return item.phone ?? item.email ?? "No contact";
//   if (moduleKey === "brands") return item.description ?? "No description";
//   if (moduleKey === "inventory") {
//     const productName = item.product?.name || item.productName || "Unknown";
//     const storeName = item.store?.name || "Unknown Store";
//     return `${productName} • ${storeName}`;
//   }
//   if (moduleKey === "sessions")
//     return `${item.status} • ${item.openedAt ?? ""}`;
//   return "";
// }

// function getRightLabel(moduleKey: ModuleKey, item: any) {
//   if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
//   if (moduleKey === "products")
//     return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
//   if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
//   if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
//   if (moduleKey === "customers") return item.tier ?? "BRONZE";
//   if (moduleKey === "suppliers") {
//     if (item.currentBalance !== undefined && item.currentBalance !== null) {
//       return `$${Number(item.currentBalance).toFixed(2)}`;
//     }
//     return item.isActive ? "Active" : "Inactive";
//   }
//   if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive";
//   if (moduleKey === "inventory") {
//     const qty = item.quantity || 0;
//     if (qty === 0) return "Out of Stock";
//     if (qty <= 10) return "Low Stock";
//     return `${qty} units`;
//   }
//   if (moduleKey === "sessions") return item.status ?? "OPEN";
//   return "";
// }

// function getIcon(moduleKey: ModuleKey) {
//   if (moduleKey === "staff") return "groups";
//   if (moduleKey === "products") return "inventory-2";
//   if (moduleKey === "stores") return "store";
//   if (moduleKey === "categories") return "category";
//   if (moduleKey === "customers") return "person";
//   if (moduleKey === "suppliers") return "local-shipping";
//   if (moduleKey === "brands") return "branding-watermark";
//   if (moduleKey === "inventory") return "inventory";
//   if (moduleKey === "sessions") return "schedule";
//   return "schedule";
// }

// function getDefaultFields(moduleKey: ModuleKey) {
//   const config = MODULE_CONFIGS[moduleKey];
//   const fields: Record<string, any> = {};
//   if (config) {
//     for (const field of config.fields) {
//       if (field.type === "select") {
//         fields[field.key] = field.options?.[0]?.value ?? "";
//       } else if (field.type === "number" || field.type === "decimal") {
//         fields[field.key] = 0;
//       } else {
//         fields[field.key] = "";
//       }
//     }
//   }
//   return fields;
// }

// function getDefaultPermissions(role: string): string[] {
//   const permissions = {
//     ADMIN: [
//       "VIEW_REPORTS",
//       "EDIT_PRICES",
//       "MANAGE_STAFF",
//       "MANAGE_PRODUCTS",
//       "VIEW_SALES",
//       "MANAGE_CUSTOMERS",
//       "EDIT_INVENTORY",
//     ],
//     MANAGER: [
//       "VIEW_REPORTS",
//       "EDIT_PRICES",
//       "MANAGE_PRODUCTS",
//       "VIEW_SALES",
//       "MANAGE_CUSTOMERS",
//     ],
//     CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
//     ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
//   };
//   return permissions[role as keyof typeof permissions] || [];
// }

// function buildPayload(
//   moduleKey: ModuleKey,
//   values: Record<string, any>,
//   currentStoreId: string | null,
// ) {
//   const payload: Record<string, any> = {
//     tenantId: "default",
//     ...values,
//   };

//   // Clean up values
//   Object.keys(payload).forEach((key) => {
//     if (payload[key] === "" || payload[key] === undefined) {
//       delete payload[key];
//     }
//     if (payload[key] === "true") payload[key] = true;
//     if (payload[key] === "false") payload[key] = false;
//   });

//   // Add storeId for relevant modules
//   if (["products", "staff", "categories", "suppliers"].includes(moduleKey)) {
//     payload.storeId = currentStoreId || undefined;
//   }

//   return payload;
// }

// // ============================================
// // DIVIDER COMPONENT
// // ============================================

// function Divider() {
//   return <View className="my-2 h-px bg-white/8" />;
// }

// // // ============================================
// // // FILE: app/(tabs)/manage.tsx
// // // ============================================

// // import {
// //   ActionButton,
// //   Card,
// //   Divider,
// //   Header,
// //   MetricCard,
// //   Pill,
// //   RowItem,
// //   Screen,
// //   SectionTitle,
// // } from "@/components/app-ui";
// // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // import { logout, setStore } from "@/services/features/auth/authSlice";
// // import { resetOfflineState } from "@/services/features/offline/offlineSlice";
// // import { clearOfflineDatabase } from "@/services/offline/db";
// // import { MaterialIcons } from "@expo/vector-icons";
// // import { useMemo, useState } from "react";
// // import {
// //   ActivityIndicator,
// //   Alert,
// //   Modal,
// //   Pressable,
// //   ScrollView,
// //   Text,
// //   TextInput,
// //   View,
// // } from "react-native";
// // import { SafeAreaView } from "react-native-safe-area-context";

// // // ✅ Offline-first local APIs
// // import {
// //   useCloseLocalSessionMutation,
// //   useCreateLocalBrandMutation,
// //   useCreateLocalCategoryMutation,
// //   useCreateLocalCustomerMutation,
// //   useCreateLocalProductMutation,
// //   useCreateLocalStaffMutation,
// //   useCreateLocalStoreMutation,
// //   useCreateLocalSupplierMutation,
// //   useDeleteLocalBrandMutation,
// //   useDeleteLocalCategoryMutation,
// //   useDeleteLocalCustomerMutation,
// //   useDeleteLocalProductMutation,
// //   useDeleteLocalStaffMutation,
// //   useDeleteLocalStoreMutation,
// //   useDeleteLocalSupplierMutation,
// //   useGetActiveSessionQuery,
// //   useGetLocalBrandsQuery,
// //   useGetLocalCategoriesQuery,
// //   useGetLocalCustomersQuery,
// //   useGetLocalProductsQuery,
// //   useGetLocalStaffQuery,
// //   useGetLocalStoresQuery,
// //   useGetLocalSuppliersQuery,
// //   useOpenLocalSessionMutation,
// //   useUpdateLocalBrandMutation,
// //   useUpdateLocalCategoryMutation,
// //   useUpdateLocalCustomerMutation,
// //   useUpdateLocalProductMutation,
// //   useUpdateLocalStaffMutation,
// //   useUpdateLocalStoreMutation,
// //   useUpdateLocalSupplierMutation,
// //   useGetLocalInventoryQuery,
// // } from "@/services/features/offline/localApi";

// // type ModuleKey =
// //   | "staff"
// //   | "products"
// //   | "stores"
// //   | "categories"
// //   | "customers"
// //   | "suppliers"
// //   | "sessions"
// //   | "brands"
// //   | "inventory";

// // export default function ManageScreen() {
// //   const dispatch = useAppDispatch();
// //   const { user, currentStoreId } = useAppSelector((state) => state.auth);
// //   const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
// //   const [editor, setEditor] = useState<{
// //     open: boolean;
// //     mode: "create" | "edit";
// //     item?: any;
// //   }>({ open: false, mode: "create" });

// //   const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
// //     null,
// //   );

// //   // ✅ Queries with debug logging
// //   const {
// //     data: staff = [],
// //     isLoading: isLoadingStaff,
// //     refetch: refetchStaff,
// //   } = useGetLocalStaffQuery({
// //     storeId: currentStoreId,
// //   });
// //   console.log("staff list", staff, currentStoreId);

// //   const {
// //     data: products = [],
// //     isLoading: isLoadingProducts,
// //     refetch: refetchProducts,
// //   } = useGetLocalProductsQuery({
// //     storeId: currentStoreId,
// //   });
// //   // console.log("products list", products);

// //   const {
// //     data: stores = [],
// //     isLoading: isLoadingStores,
// //     refetch: refetchStores,
// //   } = useGetLocalStoresQuery({});

// //   const {
// //     data: categories = [],
// //     isLoading: isLoadingCategories,
// //     refetch: refetchCategories,
// //   } = useGetLocalCategoriesQuery({
// //     storeId: currentStoreId || undefined,
// //   });

// //   const {
// //     data: customers = [],
// //     isLoading: isLoadingCustomers,
// //     refetch: refetchCustomers,
// //   } = useGetLocalCustomersQuery({});

// //   const {
// //     data: suppliers = [],
// //     isLoading: isLoadingSuppliers,
// //     refetch: refetchSuppliers,
// //   } = useGetLocalSuppliersQuery({
// //     storeId: currentStoreId || undefined,
// //   });

// //   const {
// //     data: brands = [],
// //     isLoading: isLoadingBrands,
// //     refetch: refetchBrands,
// //   } = useGetLocalBrandsQuery({});

// //   const {
// //     data: inventory = [],
// //     isLoading: isLoadingInventory,
// //     refetch: refetchInventory,
// //   } = useGetLocalInventoryQuery({
// //     storeId: currentStoreId || undefined,
// //   });

// //   const { data: activeSession, refetch: refetchSession } =
// //     useGetActiveSessionQuery(
// //       { userId: user?.id || "", storeId: currentStoreId || undefined },
// //       { skip: !user?.id },
// //     );

// //   // ✅ Mutations
// //   const [createStaff] = useCreateLocalStaffMutation();
// //   const [updateStaff] = useUpdateLocalStaffMutation();
// //   const [deleteStaff] = useDeleteLocalStaffMutation();

// //   const [createProduct] = useCreateLocalProductMutation();
// //   const [updateProduct] = useUpdateLocalProductMutation();
// //   const [deleteProduct] = useDeleteLocalProductMutation();

// //   const [createStore] = useCreateLocalStoreMutation();
// //   const [updateStore] = useUpdateLocalStoreMutation();
// //   const [deleteStore] = useDeleteLocalStoreMutation();

// //   const [createCategory] = useCreateLocalCategoryMutation();
// //   const [updateCategory] = useUpdateLocalCategoryMutation();
// //   const [deleteCategory] = useDeleteLocalCategoryMutation();

// //   const [createCustomer] = useCreateLocalCustomerMutation();
// //   const [updateCustomer] = useUpdateLocalCustomerMutation();
// //   const [deleteCustomer] = useDeleteLocalCustomerMutation();

// //   const [createSupplier] = useCreateLocalSupplierMutation();
// //   const [updateSupplier] = useUpdateLocalSupplierMutation();
// //   const [deleteSupplier] = useDeleteLocalSupplierMutation();

// //   const [createBrand] = useCreateLocalBrandMutation();
// //   const [updateBrand] = useUpdateLocalBrandMutation();
// //   const [deleteBrand] = useDeleteLocalBrandMutation();

// //   const [openSession] = useOpenLocalSessionMutation();
// //   const [closeSession] = useCloseLocalSessionMutation();

// //   const refetchers = {
// //     staff: refetchStaff,
// //     products: refetchProducts,
// //     stores: refetchStores,
// //     categories: refetchCategories,
// //     customers: refetchCustomers,
// //     suppliers: refetchSuppliers,
// //     brands: refetchBrands,
// //     sessions: refetchSession,
// //     inventory: refetchInventory,
// //   } as const;

// //   const isLoading =
// //     isLoadingStaff ||
// //     isLoadingProducts ||
// //     isLoadingStores ||
// //     isLoadingCategories ||
// //     isLoadingCustomers ||
// //     isLoadingSuppliers ||
// //     isLoadingBrands ||
// //     isLoadingInventory;

// //   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

// //   const storeOptions = useMemo(() => stores, [stores]);

// //   // ✅ Debug logs
// //   console.log(`📊 [Manage] ${moduleKey} data:`, {
// //     staff: staff.length,
// //     products: products.length,
// //     stores: stores.length,
// //     categories: categories.length,
// //     customers: customers.length,
// //     suppliers: suppliers.length,
// //     brands: brands.length,
// //     inventory: inventory.length,
// //     currentStoreId,
// //   });

// //   // ✅ Sign Out Handler
// //   const handleSignOut = async () => {
// //     Alert.alert(
// //       "Sign Out",
// //       "Are you sure you want to sign out? Offline data will be cleared.",
// //       [
// //         { text: "Cancel", style: "cancel" },
// //         {
// //           text: "Sign Out",
// //           style: "destructive",
// //           onPress: async () => {
// //             try {
// //               await clearOfflineDatabase();
// //               dispatch(resetOfflineState());
// //               dispatch(logout());
// //             } catch (error) {
// //               Alert.alert("Error", "Failed to sign out.");
// //             }
// //           },
// //         },
// //       ],
// //     );
// //   };

// //   if (!isPrivileged) {
// //     return (
// //       <Screen>
// //         <SafeAreaView className="flex-1">
// //           <View className="flex-1 items-center justify-center px-6">
// //             <Pill label="Restricted" tone="rose" />
// //             <Text className="mt-4 text-3xl font-black text-white">
// //               Management locked
// //             </Text>
// //             <Text className="mt-3 text-center text-sm text-slate-300">
// //               Your account does not have access to staff, product, or store
// //               management.
// //             </Text>
// //           </View>
// //         </SafeAreaView>
// //       </Screen>
// //     );
// //   }

// //   const summary = [
// //     {
// //       label: "Staff",
// //       value: String(staff.length),
// //       icon: "groups" as const,
// //       tone: "sky" as const,
// //     },
// //     {
// //       label: "Products",
// //       value: String(products.length),
// //       icon: "inventory-2" as const,
// //       tone: "emerald" as const,
// //     },
// //     {
// //       label: "Stores",
// //       value: String(stores.length),
// //       icon: "store" as const,
// //       tone: "amber" as const,
// //     },
// //     {
// //       label: "Customers",
// //       value: String(customers.length),
// //       icon: "person" as const,
// //       tone: "rose" as const,
// //     },
// //     {
// //       label: "Brands",
// //       value: String(brands.length),
// //       icon: "branding-watermark" as const,
// //       tone: "purple" as const,
// //     },
// //     {
// //       label: "Inventory",
// //       value: String(inventory.length),
// //       icon: "inventory" as const,
// //       tone: "sky" as const,
// //     },
// //   ];

// //   const list = getModuleList({
// //     moduleKey,
// //     staff,
// //     products,
// //     stores,
// //     categories,
// //     customers,
// //     suppliers,
// //     brands,
// //     activeSession,
// //     inventory,
// //   });

// //   const handleSave = async (values: Record<string, any>) => {
// //     try {
// //       const nextValues = buildPayload(moduleKey, values, currentStoreId);

// //       if (moduleKey === "staff") {
// //         if (editor.mode === "create") await createStaff(nextValues).unwrap();
// //         else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
// //       } else if (moduleKey === "products") {
// //         if (editor.mode === "create") await createProduct(nextValues).unwrap();
// //         else
// //           await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
// //       } else if (moduleKey === "stores") {
// //         if (editor.mode === "create") await createStore(nextValues).unwrap();
// //         else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
// //       } else if (moduleKey === "categories") {
// //         if (editor.mode === "create") await createCategory(nextValues).unwrap();
// //         else
// //           await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
// //       } else if (moduleKey === "customers") {
// //         if (editor.mode === "create") await createCustomer(nextValues).unwrap();
// //         else
// //           await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
// //       } else if (moduleKey === "suppliers") {
// //         if (editor.mode === "create") await createSupplier(nextValues).unwrap();
// //         else
// //           await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
// //       } else if (moduleKey === "brands") {
// //         if (editor.mode === "create") await createBrand(nextValues).unwrap();
// //         else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
// //       }

// //       await refetchers[moduleKey]();
// //       setEditor({ open: false, mode: "create" });
// //     } catch (error: any) {
// //       Alert.alert(
// //         "Save failed",
// //         error?.data?.message || "Unable to save changes.",
// //       );
// //     }
// //   };

// //   const handleDelete = async (item: any) => {
// //     try {
// //       if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
// //       else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
// //       else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
// //       else if (moduleKey === "categories")
// //         await deleteCategory(item.id).unwrap();
// //       else if (moduleKey === "customers")
// //         await deleteCustomer(item.id).unwrap();
// //       else if (moduleKey === "suppliers")
// //         await deleteSupplier(item.id).unwrap();
// //       else if (moduleKey === "brands") await deleteBrand(item.id).unwrap();
// //       await refetchers[moduleKey]();
// //     } catch (error: any) {
// //       Alert.alert(
// //         "Delete failed",
// //         error?.data?.message || "Unable to delete item.",
// //       );
// //     }
// //   };

// //   const openEditor = (mode: "create" | "edit", item?: any) => {
// //     // ✅ Prevent editing inventory items - show details instead
// //     if (moduleKey === "inventory" && item) {
// //       Alert.alert(
// //         "Inventory Details",
// //         `Product: ${item.product?.name || item.name || "Unknown"}\nQuantity: ${item.quantity || 0}\nStore: ${item.store?.name || "Unknown Store"}\nReorder Point: ${item.reorderPoint || 10}`,
// //         [{ text: "OK" }],
// //       );
// //       return;
// //     }
// //     setEditor({ open: true, mode, item });
// //   };

// //   if (isLoading) {
// //     return (
// //       <Screen>
// //         <SafeAreaView className="flex-1 items-center justify-center">
// //           <ActivityIndicator size="large" color="#38bdf8" />
// //           <Text className="text-slate-400 mt-4 text-sm">Loading data...</Text>
// //         </SafeAreaView>
// //       </Screen>
// //     );
// //   }

// //   return (
// //     <Screen>
// //       <SafeAreaView className="flex-1 bg-slate-950">
// //         <ScrollView
// //           showsVerticalScrollIndicator={false}
// //           contentContainerStyle={{ paddingBottom: 28 }}
// //           className="px-5"
// //         >
// //           <Header
// //             eyebrow="Administration"
// //             title="Management"
// //             subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, inventory, and session control from one place."
// //             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
// //           />

// //           <View className="mb-4 flex-row flex-wrap gap-3">
// //             {summary.map((item) => (
// //               <View key={item.label} className="w-[48.5%]">
// //                 <MetricCard
// //                   icon={item.icon}
// //                   label={item.label}
// //                   value={item.value}
// //                   tone={item.tone}
// //                 />
// //               </View>
// //             ))}
// //           </View>

// //           <Card className="mb-4">
// //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //               Store context
// //             </Text>
// //             <ScrollView
// //               horizontal
// //               showsHorizontalScrollIndicator={false}
// //               className="mt-3"
// //               contentContainerStyle={{ gap: 8 }}
// //             >
// //               {storeOptions.map((store: any) => {
// //                 const active = store.id === currentStoreId;
// //                 return (
// //                   <Pressable
// //                     key={store.id}
// //                     onPress={() => dispatch(setStore(store.id))}
// //                     className={`rounded-full border px-4 py-3 ${
// //                       active
// //                         ? "border-sky-400/30 bg-sky-500/15"
// //                         : "border-white/10 bg-white/5"
// //                     }`}
// //                   >
// //                     <Text
// //                       className={`text-xs font-bold uppercase tracking-[2px] ${
// //                         active ? "text-sky-200" : "text-slate-300"
// //                       }`}
// //                     >
// //                       {store.name}
// //                     </Text>
// //                   </Pressable>
// //                 );
// //               })}
// //             </ScrollView>
// //           </Card>

// //           <SectionTitle title="Modules" />
// //           <View className="mb-4 flex-row flex-wrap gap-2">
// //             {(
// //               [
// //                 "products",
// //                 "staff",
// //                 "stores",
// //                 "categories",
// //                 "customers",
// //                 "suppliers",
// //                 "brands",
// //                 "inventory",
// //                 "sessions",
// //               ] as ModuleKey[]
// //             ).map((key) => (
// //               <Pressable
// //                 key={key}
// //                 onPress={() => setModuleKey(key)}
// //                 className={`rounded-full border px-4 py-3 ${
// //                   moduleKey === key
// //                     ? "border-emerald-400/30 bg-emerald-500/15"
// //                     : "border-white/10 bg-white/5"
// //                 }`}
// //               >
// //                 <Text
// //                   className={`text-xs font-bold uppercase tracking-[2px] ${
// //                     moduleKey === key ? "text-emerald-200" : "text-slate-300"
// //                   }`}
// //                 >
// //                   {key}
// //                 </Text>
// //               </Pressable>
// //             ))}
// //           </View>

// //           <View className="mb-4 flex-row gap-3">
// //             <ActionButton
// //               title="Add New"
// //               icon="add"
// //               accent="emerald"
// //               onPress={() => openEditor("create")}
// //             />
// //             {moduleKey === "sessions" ? (
// //               <ActionButton
// //                 title={activeSession ? "Close Session" : "Open Session"}
// //                 icon="schedule"
// //                 accent={activeSession ? "rose" : "sky"}
// //                 onPress={() =>
// //                   setSessionModal(activeSession ? "close" : "open")
// //                 }
// //               />
// //             ) : (
// //               <ActionButton
// //                 title="Refresh"
// //                 icon="refresh"
// //                 accent="sky"
// //                 onPress={() => refetchers[moduleKey]()}
// //               />
// //             )}
// //           </View>

// //           <SectionTitle
// //             title={`${moduleKey} list (${list.length})`}
// //             action="Tap an item to edit"
// //           />
// //           <Card>
// //             {list.length > 0 ? (
// //               list.map((item: any, index: number) => {
// //                 // ✅ Get display name based on module
// //                 let displayName =
// //                   item.name || item.username || item.code || item.id;

// //                 // ✅ For inventory, show product name
// //                 if (moduleKey === "inventory") {
// //                   displayName =
// //                     item.product?.name ||
// //                     item.productName ||
// //                     `Product ${item.productId?.slice(-6)}`;
// //                 }

// //                 return (
// //                   <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
// //                     <Pressable onPress={() => openEditor("edit", item)}>
// //                       <RowItem
// //                         title={displayName}
// //                         subtitle={getSubtitle(moduleKey, item)}
// //                         right={getRightLabel(moduleKey, item)}
// //                         icon={getIcon(moduleKey)}
// //                       />
// //                     </Pressable>
// //                     {index < list.length - 1 ? (
// //                       <View className="my-3 h-px bg-white/8" />
// //                     ) : null}
// //                   </View>
// //                 );
// //               })
// //             ) : (
// //               <View className="py-8 items-center">
// //                 <View className="h-16 w-16 bg-white/5 rounded-full items-center justify-center border border-white/10">
// //                   <MaterialIcons name="inbox" size={28} color="#64748b" />
// //                 </View>
// //                 <Text className="text-slate-400 text-center text-sm mt-3">
// //                   No {moduleKey} found
// //                 </Text>
// //                 <Text className="text-slate-500 text-xs text-center mt-1">
// //                   {moduleKey === "inventory"
// //                     ? "Inventory is managed through sales and purchases"
// //                     : `Create one by tapping "Add New"`}
// //                 </Text>
// //               </View>
// //             )}
// //           </Card>

// //           {/* ✅ Sign Out Button */}
// //           <View className="mt-6 pt-4 border-t border-white/10">
// //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400 mb-3">
// //               Account
// //             </Text>
// //             <Pressable
// //               onPress={handleSignOut}
// //               className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 flex-row items-center justify-between"
// //             >
// //               <View className="flex-row items-center">
// //                 <View className="bg-rose-500/20 p-2 rounded-full">
// //                   <MaterialIcons name="logout" size={20} color="#f87171" />
// //                 </View>
// //                 <Text className="text-rose-400 font-semibold ml-3">
// //                   Sign Out
// //                 </Text>
// //               </View>
// //               <MaterialIcons name="chevron-right" size={20} color="#f87171" />
// //             </Pressable>
// //             <Text className="text-slate-500 text-[10px] mt-2 text-center">
// //               This will clear all offline data and return to login
// //             </Text>
// //           </View>
// //         </ScrollView>

// //         {/* Editor Modal */}
// //         <Modal
// //           visible={editor.open}
// //           animationType="slide"
// //           onRequestClose={() => setEditor({ open: false, mode: "create" })}
// //           transparent={true}
// //         >
// //           <View className="flex-1 bg-black/70">
// //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// //               <EditorModalContent
// //                 title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
// //                 moduleKey={moduleKey}
// //                 item={editor.item}
// //                 mode={editor.mode}
// //                 onClose={() => setEditor({ open: false, mode: "create" })}
// //                 onSave={handleSave}
// //                 onDelete={
// //                   editor.item ? () => handleDelete(editor.item) : undefined
// //                 }
// //                 currentStoreId={currentStoreId}
// //                 stores={stores}
// //                 categories={categories}
// //                 suppliers={suppliers}
// //                 brands={brands}
// //                 refetchCategories={refetchCategories}
// //                 refetchSuppliers={refetchSuppliers}
// //                 refetchBrands={refetchBrands}
// //               />
// //             </View>
// //           </View>
// //         </Modal>

// //         {/* Session Modal */}
// //         <Modal
// //           visible={sessionModal !== null}
// //           animationType="slide"
// //           onRequestClose={() => setSessionModal(null)}
// //           transparent={true}
// //         >
// //           <View className="flex-1 bg-black/70">
// //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// //               <SessionModalContent
// //                 mode={sessionModal}
// //                 activeSession={activeSession}
// //                 onClose={() => setSessionModal(null)}
// //                 onOpen={async (openingBalance, notes) => {
// //                   try {
// //                     await openSession({
// //                       userId: user?.id || "",
// //                       openingBalance: Number(openingBalance || 0),
// //                       notes,
// //                       storeId: currentStoreId || undefined,
// //                     }).unwrap();
// //                     setSessionModal(null);
// //                     await refetchSession();
// //                   } catch (error: any) {
// //                     Alert.alert(
// //                       "Open session failed",
// //                       error?.data?.message || "Unable to open session.",
// //                     );
// //                   }
// //                 }}
// //                 onCloseSession={async (closingBalance, notes) => {
// //                   try {
// //                     if (!activeSession) return;
// //                     await closeSession({
// //                       id: activeSession.id,
// //                       closingBalance: Number(closingBalance || 0),
// //                       expectedBalance: Number(closingBalance || 0),
// //                       discrepancy: 0,
// //                       cashSales: 0,
// //                       cardSales: 0,
// //                       digitalSales: 0,
// //                       notes,
// //                     }).unwrap();
// //                     setSessionModal(null);
// //                     await refetchSession();
// //                   } catch (error: any) {
// //                     Alert.alert(
// //                       "Close session failed",
// //                       error?.data?.message || "Unable to close session.",
// //                     );
// //                   }
// //                 }}
// //               />
// //             </View>
// //           </View>
// //         </Modal>
// //       </SafeAreaView>
// //     </Screen>
// //   );
// // }

// // // ============================================
// // // HELPER FUNCTIONS
// // // ============================================

// // function getModuleList(input: any) {
// //   const {
// //     moduleKey,
// //     staff,
// //     products,
// //     stores,
// //     categories,
// //     customers,
// //     suppliers,
// //     brands,
// //     activeSession,
// //     inventory,
// //   } = input;

// //   if (moduleKey === "staff") return staff;
// //   if (moduleKey === "products") return products;
// //   if (moduleKey === "stores") return stores;
// //   if (moduleKey === "categories") return categories;
// //   if (moduleKey === "customers") return customers;
// //   if (moduleKey === "suppliers") return suppliers;
// //   if (moduleKey === "brands") return brands;
// //   if (moduleKey === "inventory") return inventory;
// //   return activeSession ? [activeSession] : [];
// // }

// // function getSubtitle(moduleKey: ModuleKey, item: any) {
// //   if (moduleKey === "staff")
// //     return `${item.role} • ${item.email ?? "no email"}`;
// //   if (moduleKey === "products") {
// //     const brandName = item.brand?.name || item.brandName || "";
// //     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
// //   }
// //   if (moduleKey === "stores") return item.address ?? "No address";
// //   if (moduleKey === "categories") return item.slug ?? "No slug";
// //   if (moduleKey === "customers") return item.phone ?? item.code;
// //   if (moduleKey === "suppliers")
// //     return item.phone ?? item.email ?? "No contact";
// //   if (moduleKey === "brands") return item.description ?? "No description";
// //   if (moduleKey === "inventory") {
// //     const productName = item.product?.name || item.productName || "Unknown";
// //     const storeName = item.store?.name || "Unknown Store";
// //     return `${productName} • ${storeName}`;
// //   }
// //   if (moduleKey === "sessions")
// //     return `${item.status} • ${item.openedAt ?? ""}`;
// //   return "";
// // }

// // function getRightLabel(moduleKey: ModuleKey, item: any) {
// //   if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
// //   if (moduleKey === "products")
// //     return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
// //   if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
// //   if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
// //   if (moduleKey === "customers") return item.tier ?? "BRONZE";
// //   if (moduleKey === "suppliers") {
// //     if (item.currentBalance !== undefined && item.currentBalance !== null) {
// //       return `$${Number(item.currentBalance).toFixed(2)}`;
// //     }
// //     return item.isActive ? "Active" : "Inactive";
// //   }
// //   if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive";
// //   if (moduleKey === "inventory") {
// //     const qty = item.quantity || 0;
// //     if (qty === 0) return "Out of Stock";
// //     if (qty <= 10) return "Low Stock";
// //     return `${qty} units`;
// //   }
// //   if (moduleKey === "sessions") return item.status ?? "OPEN";
// //   return "";
// // }

// // function getIcon(moduleKey: ModuleKey) {
// //   if (moduleKey === "staff") return "groups";
// //   if (moduleKey === "products") return "inventory-2";
// //   if (moduleKey === "stores") return "store";
// //   if (moduleKey === "categories") return "category";
// //   if (moduleKey === "customers") return "person";
// //   if (moduleKey === "suppliers") return "local-shipping";
// //   if (moduleKey === "brands") return "branding-watermark";
// //   if (moduleKey === "inventory") return "inventory";
// //   if (moduleKey === "sessions") return "schedule";
// //   return "schedule";
// // }

// // // ============================================
// // // EDITOR MODAL CONTENT
// // // ============================================

// // function EditorModalContent({
// //   title,
// //   moduleKey,
// //   item,
// //   mode,
// //   onClose,
// //   onSave,
// //   onDelete,
// //   currentStoreId,
// //   stores,
// //   categories,
// //   suppliers,
// //   brands,
// //   refetchCategories,
// //   refetchSuppliers,
// //   refetchBrands,
// // }: {
// //   title: string;
// //   moduleKey: ModuleKey;
// //   item?: any;
// //   mode: "create" | "edit";
// //   onClose: () => void;
// //   onSave: (values: Record<string, any>) => Promise<void>;
// //   onDelete?: () => void;
// //   currentStoreId: string | null;
// //   stores: any[];
// //   categories: any[];
// //   suppliers: any[];
// //   brands: any[];
// //   refetchCategories: () => void;
// //   refetchSuppliers: () => void;
// //   refetchBrands: () => void;
// // }) {
// //   const [fields, setFields] = useState<Record<string, any>>({});
// //   const [showCreateCategory, setShowCreateCategory] = useState(false);
// //   const [showCreateSupplier, setShowCreateSupplier] = useState(false);
// //   const [showCreateBrand, setShowCreateBrand] = useState(false);
// //   const [newCategory, setNewCategory] = useState({
// //     name: "",
// //     slug: "",
// //     description: "",
// //   });
// //   const [newSupplier, setNewSupplier] = useState({
// //     name: "",
// //     code: "",
// //     phone: "",
// //     email: "",
// //     address: "",
// //     contactName: "",
// //   });
// //   const [newBrand, setNewBrand] = useState({
// //     name: "",
// //     description: "",
// //   });
// //   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
// //   const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
// //   const [isCreatingBrand, setIsCreatingBrand] = useState(false);

// //   const [createCategory] = useCreateLocalCategoryMutation();
// //   const [createSupplier] = useCreateLocalSupplierMutation();
// //   const [createBrand] = useCreateLocalBrandMutation();

// //   useEffect(() => {
// //     if (item !== undefined) {
// //       setFields(item ? { ...item } : getDefaultFields(moduleKey));
// //     }
// //   }, [item, moduleKey]);

// //   const set = (key: string, value: any) =>
// //     setFields((current) => ({ ...current, [key]: value }));

// //   const save = () => onSave(fields);

// //   const handleCreateCategory = async () => {
// //     try {
// //       if (!newCategory.name.trim()) {
// //         Alert.alert("Error", "Category name is required");
// //         return;
// //       }

// //       setIsCreatingCategory(true);
// //       if (!currentStoreId) {
// //         Alert.alert("Error", "Store not found");
// //         return;
// //       }

// //       const payload = {
// //         tenantId: "default",
// //         name: newCategory.name.trim(),
// //         slug:
// //           newCategory.slug.trim() ||
// //           newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
// //         description: newCategory.description.trim() || undefined,
// //         storeId: currentStoreId,
// //         isActive: true,
// //       };

// //       const result = await createCategory(payload).unwrap();
// //       await refetchCategories();
// //       set("categoryId", result?.id);
// //       set("categoryName", result?.name);

// //       setShowCreateCategory(false);
// //       setNewCategory({ name: "", slug: "", description: "" });

// //       Alert.alert("Success", "Category created successfully");
// //     } catch (error: any) {
// //       Alert.alert(
// //         "Failed to create category",
// //         error?.data?.message || "Unable to create category.",
// //       );
// //     } finally {
// //       setIsCreatingCategory(false);
// //     }
// //   };

// //   const handleCreateSupplier = async () => {
// //     try {
// //       if (!newSupplier.name.trim()) {
// //         Alert.alert("Error", "Supplier name is required");
// //         return;
// //       }

// //       setIsCreatingSupplier(true);
// //       if (!currentStoreId) {
// //         Alert.alert("Error", "Store not found");
// //         return;
// //       }

// //       const payload = {
// //         tenantId: "default",
// //         name: newSupplier.name.trim(),
// //         code: newSupplier.code.trim() || undefined,
// //         contactName: newSupplier.contactName.trim() || undefined,
// //         phone: newSupplier.phone.trim() || undefined,
// //         email: newSupplier.email.trim() || undefined,
// //         address: newSupplier.address.trim() || undefined,
// //         storeId: currentStoreId,
// //         isActive: true,
// //       };

// //       const result = await createSupplier(payload).unwrap();
// //       await refetchSuppliers();
// //       set("supplierId", result.id);
// //       set("supplierName", result.name);

// //       setShowCreateSupplier(false);
// //       setNewSupplier({
// //         name: "",
// //         code: "",
// //         phone: "",
// //         email: "",
// //         address: "",
// //         contactName: "",
// //       });

// //       Alert.alert("Success", "Supplier created successfully");
// //     } catch (error: any) {
// //       Alert.alert(
// //         "Failed to create supplier",
// //         error?.data?.message || "Unable to create supplier.",
// //       );
// //     } finally {
// //       setIsCreatingSupplier(false);
// //     }
// //   };

// //   const handleCreateBrand = async () => {
// //     try {
// //       if (!newBrand.name.trim()) {
// //         Alert.alert("Error", "Brand name is required");
// //         return;
// //       }

// //       setIsCreatingBrand(true);

// //       const payload = {
// //         tenantId: "default",
// //         name: newBrand.name.trim(),
// //         description: newBrand.description.trim() || undefined,
// //         isActive: true,
// //       };

// //       const result = await createBrand(payload).unwrap();
// //       await refetchBrands();
// //       set("brandId", result.id);
// //       set("brand", result.name);

// //       setShowCreateBrand(false);
// //       setNewBrand({ name: "", description: "" });

// //       Alert.alert("Success", "Brand created successfully");
// //     } catch (error: any) {
// //       Alert.alert(
// //         "Failed to create brand",
// //         error?.data?.message || "Unable to create brand.",
// //       );
// //     } finally {
// //       setIsCreatingBrand(false);
// //     }
// //   };

// //   return (
// //     <SafeAreaView className="flex-1 px-4 pt-4">
// //       <View className="flex-row items-center justify-between mb-6">
// //         <Text className="text-white text-xl font-black">{title}</Text>
// //         <Pressable onPress={onClose}>
// //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// //         </Pressable>
// //       </View>

// //       <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
// //         {/* Staff Form */}
// //         {moduleKey === "staff" && (
// //           <>
// //             <Field
// //               label="Username"
// //               value={fields.username ?? ""}
// //               onChangeText={(v) => set("username", v)}
// //             />
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="Email"
// //               value={fields.email ?? ""}
// //               onChangeText={(v) => set("email", v)}
// //             />
// //             {mode === "create" && (
// //               <Field
// //                 label="Password"
// //                 value={fields.password ?? ""}
// //                 onChangeText={(v) => set("password", v)}
// //                 secureTextEntry
// //               />
// //             )}

// //             <StoreSelector
// //               value={fields.storeId ?? ""}
// //               onChange={(storeId, storeName) => {
// //                 set("storeId", storeId);
// //                 set("storeName", storeName);
// //               }}
// //               stores={stores}
// //               label="Assigned Store"
// //             />

// //             <RoleSelector
// //               value={fields.role ?? "CASHIER"}
// //               onChange={(role) => {
// //                 set("role", role);
// //                 set("permissions", getDefaultPermissions(role));
// //               }}
// //             />
// //           </>
// //         )}

// //         {/* Products Form */}
// //         {moduleKey === "products" && (
// //           <>
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="SKU"
// //               value={fields.sku ?? ""}
// //               onChangeText={(v) => set("sku", v)}
// //             />
// //             <Field
// //               label="Barcode"
// //               value={fields.barcode ?? ""}
// //               onChangeText={(v) => set("barcode", v)}
// //             />
// //             <Field
// //               label="Description"
// //               value={fields.description ?? ""}
// //               onChangeText={(v) => set("description", v)}
// //               multiline
// //             />

// //             <BrandSelector
// //               value={fields.brandId ?? ""}
// //               onChange={(brandId, brandName) => {
// //                 set("brandId", brandId);
// //                 set("brand", brandName);
// //               }}
// //               brands={brands}
// //               onAddBrand={() => setShowCreateBrand(true)}
// //             />

// //             <Field
// //               label="Cost Price"
// //               value={fields.costPrice?.toString() ?? ""}
// //               onChangeText={(v) => {
// //                 const num = parseFloat(v);
// //                 set("costPrice", isNaN(num) ? 0 : num);
// //               }}
// //               keyboardType="decimal-pad"
// //             />
// //             <Field
// //               label="Selling Price"
// //               value={fields.sellingPrice?.toString() ?? ""}
// //               onChangeText={(v) => {
// //                 const num = parseFloat(v);
// //                 set("sellingPrice", isNaN(num) ? 0 : num);
// //               }}
// //               keyboardType="decimal-pad"
// //             />
// //             <Field
// //               label="Wholesale Price"
// //               value={fields.wholesalePrice?.toString() ?? ""}
// //               onChangeText={(v) => {
// //                 const num = parseFloat(v);
// //                 set("wholesalePrice", isNaN(num) ? 0 : num);
// //               }}
// //               keyboardType="decimal-pad"
// //             />
// //             <Field
// //               label="Initial Stock"
// //               value={fields.initialStock?.toString() ?? ""}
// //               onChangeText={(v) => {
// //                 const num = parseInt(v, 10);
// //                 set("initialStock", isNaN(num) ? 0 : num);
// //               }}
// //               keyboardType="numeric"
// //             />

// //             <CategorySelector
// //               value={fields.categoryId ?? ""}
// //               onChange={(categoryId, categoryName) => {
// //                 set("categoryId", categoryId);
// //                 set("categoryName", categoryName);
// //               }}
// //               categories={categories}
// //               onAddCategory={() => setShowCreateCategory(true)}
// //             />

// //             <SupplierSelector
// //               value={fields.supplierId ?? ""}
// //               onChange={(supplierId, supplierName) => {
// //                 set("supplierId", supplierId);
// //                 set("supplierName", supplierName);
// //               }}
// //               suppliers={suppliers}
// //             />

// //             {showCreateCategory && (
// //               <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
// //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
// //                   Create New Category
// //                 </Text>
// //                 <Field
// //                   label="Category Name"
// //                   value={newCategory.name}
// //                   onChangeText={(v) => {
// //                     setNewCategory({ ...newCategory, name: v });
// //                     if (!newCategory.slug) {
// //                       const slug = v.toLowerCase().replace(/\s+/g, "-");
// //                       setNewCategory((prev) => ({ ...prev, slug }));
// //                     }
// //                   }}
// //                 />
// //                 <Field
// //                   label="Slug (URL friendly)"
// //                   value={newCategory.slug}
// //                   onChangeText={(v) =>
// //                     setNewCategory({ ...newCategory, slug: v })
// //                   }
// //                 />
// //                 <Field
// //                   label="Description"
// //                   value={newCategory.description}
// //                   onChangeText={(v) =>
// //                     setNewCategory({ ...newCategory, description: v })
// //                   }
// //                 />
// //                 <View className="mt-2 flex-row gap-3">
// //                   <ActionButton
// //                     title="Cancel"
// //                     icon="close"
// //                     accent="rose"
// //                     onPress={() => setShowCreateCategory(false)}
// //                   />
// //                   <ActionButton
// //                     title="Create"
// //                     icon="add"
// //                     accent="emerald"
// //                     onPress={handleCreateCategory}
// //                     disabled={isCreatingCategory}
// //                   />
// //                 </View>
// //               </View>
// //             )}

// //             {showCreateBrand && (
// //               <View className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
// //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-purple-400">
// //                   Create New Brand
// //                 </Text>
// //                 <Field
// //                   label="Brand Name"
// //                   value={newBrand.name}
// //                   onChangeText={(v) => setNewBrand({ ...newBrand, name: v })}
// //                 />
// //                 <Field
// //                   label="Description"
// //                   value={newBrand.description}
// //                   onChangeText={(v) =>
// //                     setNewBrand({ ...newBrand, description: v })
// //                   }
// //                 />
// //                 <View className="mt-2 flex-row gap-3">
// //                   <ActionButton
// //                     title="Cancel"
// //                     icon="close"
// //                     accent="rose"
// //                     onPress={() => setShowCreateBrand(false)}
// //                   />
// //                   <ActionButton
// //                     title="Create"
// //                     icon="add"
// //                     accent="emerald"
// //                     onPress={handleCreateBrand}
// //                     disabled={isCreatingBrand}
// //                   />
// //                 </View>
// //               </View>
// //             )}
// //           </>
// //         )}

// //         {/* Stores Form */}
// //         {moduleKey === "stores" && (
// //           <>
// //             <Field
// //               label="Code"
// //               value={fields.code ?? ""}
// //               onChangeText={(v) => set("code", v)}
// //             />
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="Address"
// //               value={fields.address ?? ""}
// //               onChangeText={(v) => set("address", v)}
// //             />
// //             <Field
// //               label="Phone"
// //               value={fields.phone ?? ""}
// //               onChangeText={(v) => set("phone", v)}
// //             />
// //             <Field
// //               label="Email"
// //               value={fields.email ?? ""}
// //               onChangeText={(v) => set("email", v)}
// //             />
// //             <Field
// //               label="Tax Number"
// //               value={fields.taxNumber ?? ""}
// //               onChangeText={(v) => set("taxNumber", v)}
// //             />
// //           </>
// //         )}

// //         {/* Categories Form */}
// //         {moduleKey === "categories" && (
// //           <>
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="Slug"
// //               value={fields.slug ?? ""}
// //               onChangeText={(v) => set("slug", v)}
// //             />
// //             <Field
// //               label="Description"
// //               value={fields.description ?? ""}
// //               onChangeText={(v) => set("description", v)}
// //             />
// //           </>
// //         )}

// //         {/* Brands Form */}
// //         {moduleKey === "brands" && (
// //           <>
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="Description"
// //               value={fields.description ?? ""}
// //               onChangeText={(v) => set("description", v)}
// //               multiline
// //             />
// //           </>
// //         )}

// //         {/* Customers Form */}
// //         {moduleKey === "customers" && (
// //           <>
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="Phone"
// //               value={fields.phone ?? ""}
// //               onChangeText={(v) => set("phone", v)}
// //             />
// //             <Field
// //               label="Email"
// //               value={fields.email ?? ""}
// //               onChangeText={(v) => set("email", v)}
// //             />
// //             <Field
// //               label="Address"
// //               value={fields.address ?? ""}
// //               onChangeText={(v) => set("address", v)}
// //             />
// //             <Field
// //               label="Date of Birth"
// //               value={fields.dateOfBirth ?? ""}
// //               onChangeText={(v) => set("dateOfBirth", v)}
// //               placeholder="YYYY-MM-DD"
// //             />
// //             <Field
// //               label="Gender"
// //               value={fields.gender ?? ""}
// //               onChangeText={(v) => set("gender", v)}
// //               placeholder="MALE / FEMALE / OTHER"
// //             />
// //           </>
// //         )}

// //         {/* Suppliers Form */}
// //         {moduleKey === "suppliers" && (
// //           <>
// //             <Field
// //               label="Name"
// //               value={fields.name ?? ""}
// //               onChangeText={(v) => set("name", v)}
// //             />
// //             <Field
// //               label="Code"
// //               value={fields.code ?? ""}
// //               onChangeText={(v) => set("code", v)}
// //             />
// //             <Field
// //               label="Contact Person"
// //               value={fields.contactName ?? ""}
// //               onChangeText={(v) => set("contactName", v)}
// //             />
// //             <Field
// //               label="Phone"
// //               value={fields.phone ?? ""}
// //               onChangeText={(v) => set("phone", v)}
// //             />
// //             <Field
// //               label="Email"
// //               value={fields.email ?? ""}
// //               onChangeText={(v) => set("email", v)}
// //             />
// //             <Field
// //               label="Address"
// //               value={fields.address ?? ""}
// //               onChangeText={(v) => set("address", v)}
// //             />
// //             <Field
// //               label="Tax Number"
// //               value={fields.taxNumber ?? ""}
// //               onChangeText={(v) => set("taxNumber", v)}
// //             />
// //             <Field
// //               label="Payment Terms (days)"
// //               value={fields.paymentTerms?.toString() ?? ""}
// //               onChangeText={(v) => {
// //                 const num = parseInt(v, 10);
// //                 set("paymentTerms", isNaN(num) ? undefined : num);
// //               }}
// //               keyboardType="numeric"
// //               placeholder="30"
// //             />
// //             <Field
// //               label="Credit Limit"
// //               value={fields.creditLimit?.toString() ?? ""}
// //               onChangeText={(v) => {
// //                 const num = parseFloat(v);
// //                 set("creditLimit", isNaN(num) ? undefined : num);
// //               }}
// //               keyboardType="decimal-pad"
// //               placeholder="0.00"
// //             />

// //             {showCreateSupplier && (
// //               <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
// //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-emerald-400">
// //                   Create New Supplier
// //                 </Text>
// //                 <Field
// //                   label="Supplier Name"
// //                   value={newSupplier.name}
// //                   onChangeText={(v) =>
// //                     setNewSupplier({ ...newSupplier, name: v })
// //                   }
// //                 />
// //                 <Field
// //                   label="Code"
// //                   value={newSupplier.code}
// //                   onChangeText={(v) =>
// //                     setNewSupplier({ ...newSupplier, code: v })
// //                   }
// //                 />
// //                 <Field
// //                   label="Contact Person"
// //                   value={newSupplier.contactName}
// //                   onChangeText={(v) =>
// //                     setNewSupplier({ ...newSupplier, contactName: v })
// //                   }
// //                 />
// //                 <Field
// //                   label="Phone"
// //                   value={newSupplier.phone}
// //                   onChangeText={(v) =>
// //                     setNewSupplier({ ...newSupplier, phone: v })
// //                   }
// //                 />
// //                 <Field
// //                   label="Email"
// //                   value={newSupplier.email}
// //                   onChangeText={(v) =>
// //                     setNewSupplier({ ...newSupplier, email: v })
// //                   }
// //                 />
// //                 <View className="mt-2 flex-row gap-3">
// //                   <ActionButton
// //                     title="Cancel"
// //                     icon="close"
// //                     accent="rose"
// //                     onPress={() => setShowCreateSupplier(false)}
// //                   />
// //                   <ActionButton
// //                     title="Create"
// //                     icon="add"
// //                     accent="emerald"
// //                     onPress={handleCreateSupplier}
// //                     disabled={isCreatingSupplier}
// //                   />
// //                 </View>
// //               </View>
// //             )}
// //           </>
// //         )}

// //         {/* Sessions - No form */}
// //         {moduleKey === "sessions" && (
// //           <View className="py-8">
// //             <Text className="text-center text-slate-400">
// //               Session management is handled separately.
// //             </Text>
// //             <Text className="text-center text-slate-500 text-sm mt-2">
// //               Use the "Open Session" or "Close Session" button above.
// //             </Text>
// //           </View>
// //         )}

// //         <View className="mt-4 flex-row gap-3">
// //           <ActionButton
// //             title="Cancel"
// //             icon="close"
// //             accent="rose"
// //             onPress={onClose}
// //           />
// //           <ActionButton
// //             title="Save"
// //             icon="save"
// //             accent="emerald"
// //             onPress={save}
// //           />
// //         </View>
// //         {mode === "edit" && onDelete && (
// //           <View className="mt-3">
// //             <ActionButton
// //               title="Delete"
// //               icon="delete"
// //               accent="rose"
// //               onPress={onDelete}
// //             />
// //           </View>
// //         )}
// //       </ScrollView>
// //     </SafeAreaView>
// //   );
// // }

// // // ============================================
// // // SESSION MODAL CONTENT
// // // ============================================

// // function SessionModalContent({
// //   mode,
// //   activeSession,
// //   onClose,
// //   onOpen,
// //   onCloseSession,
// // }: {
// //   mode: "open" | "close" | null;
// //   activeSession: any;
// //   onClose: () => void;
// //   onOpen: (openingBalance: string, notes: string) => Promise<void>;
// //   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// // }) {
// //   const [balance, setBalance] = useState("0");
// //   const [notes, setNotes] = useState("");

// //   return (
// //     <SafeAreaView className="flex-1 px-4 pt-4">
// //       <View className="flex-row items-center justify-between mb-6">
// //         <Text className="text-white text-xl font-black">
// //           {mode === "open" ? "Open Session" : "Close Session"}
// //         </Text>
// //         <Pressable onPress={onClose}>
// //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// //         </Pressable>
// //       </View>

// //       <Text className="text-slate-400 text-sm mb-4">
// //         {activeSession ? `Active: ${activeSession.id}` : "No active session"}
// //       </Text>

// //       <TextInput
// //         value={balance}
// //         onChangeText={setBalance}
// //         keyboardType="decimal-pad"
// //         placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
// //         placeholderTextColor="#64748b"
// //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// //       />
// //       <TextInput
// //         value={notes}
// //         onChangeText={setNotes}
// //         placeholder="Notes"
// //         placeholderTextColor="#64748b"
// //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// //         multiline
// //         numberOfLines={3}
// //       />
// //       <View className="flex-row gap-3">
// //         <ActionButton
// //           title="Cancel"
// //           icon="close"
// //           accent="rose"
// //           onPress={onClose}
// //         />
// //         <ActionButton
// //           title={mode === "open" ? "Open" : "Close"}
// //           icon="schedule"
// //           accent="emerald"
// //           onPress={async () => {
// //             if (mode === "open") await onOpen(balance, notes);
// //             else await onCloseSession(balance, notes);
// //           }}
// //         />
// //       </View>
// //     </SafeAreaView>
// //   );
// // }

// // // ============================================
// // // ROLE SELECTOR
// // // ============================================

// // function RoleSelector({
// //   value,
// //   onChange,
// // }: {
// //   value: string;
// //   onChange: (role: string) => void;
// // }) {
// //   const roles = [
// //     { label: "Admin", value: "ADMIN", description: "Full system access" },
// //     {
// //       label: "Manager",
// //       value: "MANAGER",
// //       description: "Manage store operations",
// //     },
// //     {
// //       label: "Cashier",
// //       value: "CASHIER",
// //       description: "Process sales and transactions",
// //     },
// //     {
// //       label: "Accountant",
// //       value: "ACCOUNTANT",
// //       description: "Financial and reporting access",
// //     },
// //   ];

// //   const [showDropdown, setShowDropdown] = useState(false);
// //   const selectedRole = roles.find((r) => r.value === value);

// //   return (
// //     <View className="mb-4">
// //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //         Role
// //       </Text>
// //       <Pressable
// //         onPress={() => setShowDropdown(!showDropdown)}
// //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// //       >
// //         <View className="flex-row items-center justify-between">
// //           <Text
// //             className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
// //           >
// //             {selectedRole ? selectedRole.label : "Select a role..."}
// //           </Text>
// //           <MaterialIcons
// //             name={showDropdown ? "expand-less" : "expand-more"}
// //             size={24}
// //             color="#64748b"
// //           />
// //         </View>
// //       </Pressable>

// //       {showDropdown && (
// //         <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
// //           <ScrollView className="max-h-48" nestedScrollEnabled>
// //             {roles.map((role) => (
// //               <Pressable
// //                 key={role.value}
// //                 onPress={() => {
// //                   onChange(role.value);
// //                   setShowDropdown(false);
// //                 }}
// //                 className={`rounded-xl px-4 py-3 ${
// //                   value === role.value ? "bg-emerald-500/20" : ""
// //                 }`}
// //               >
// //                 <Text className="text-white">{role.label}</Text>
// //                 <Text className="text-xs text-slate-400">
// //                   {role.description}
// //                 </Text>
// //               </Pressable>
// //             ))}
// //           </ScrollView>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // function getDefaultPermissions(role: string): string[] {
// //   const permissions = {
// //     ADMIN: [
// //       "VIEW_REPORTS",
// //       "EDIT_PRICES",
// //       "MANAGE_STAFF",
// //       "MANAGE_PRODUCTS",
// //       "VIEW_SALES",
// //       "MANAGE_CUSTOMERS",
// //       "EDIT_INVENTORY",
// //     ],
// //     MANAGER: [
// //       "VIEW_REPORTS",
// //       "EDIT_PRICES",
// //       "MANAGE_PRODUCTS",
// //       "VIEW_SALES",
// //       "MANAGE_CUSTOMERS",
// //     ],
// //     CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
// //     ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
// //   };
// //   return permissions[role as keyof typeof permissions] || [];
// // }

// // // ============================================
// // // STORE SELECTOR
// // // ============================================

// // function StoreSelector({
// //   value,
// //   onChange,
// //   stores,
// //   label = "Store",
// // }: {
// //   value: string;
// //   onChange: (storeId: string, storeName: string) => void;
// //   stores: any[];
// //   label?: string;
// // }) {
// //   const [showDropdown, setShowDropdown] = useState(false);
// //   const [searchText, setSearchText] = useState("");

// //   const filteredStores = useMemo(() => {
// //     if (!searchText.trim()) return stores;
// //     return stores.filter(
// //       (store) =>
// //         store.name.toLowerCase().includes(searchText.toLowerCase()) ||
// //         store.code?.toLowerCase().includes(searchText.toLowerCase()),
// //     );
// //   }, [stores, searchText]);

// //   const selectedStore = stores.find((store) => store.id === value);

// //   return (
// //     <View className="mb-4">
// //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //         {label}
// //       </Text>
// //       <Pressable
// //         onPress={() => setShowDropdown(!showDropdown)}
// //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// //       >
// //         <View className="flex-row items-center justify-between">
// //           <Text
// //             className={`text-base ${selectedStore ? "text-white" : "text-slate-400"}`}
// //           >
// //             {selectedStore ? selectedStore.name : "Select a store..."}
// //           </Text>
// //           <MaterialIcons
// //             name={showDropdown ? "expand-less" : "expand-more"}
// //             size={24}
// //             color="#64748b"
// //           />
// //         </View>
// //       </Pressable>

// //       {showDropdown && (
// //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// //           <TextInput
// //             value={searchText}
// //             onChangeText={setSearchText}
// //             placeholder="Search stores..."
// //             placeholderTextColor="#64748b"
// //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// //           />
// //           <ScrollView
// //             className="max-h-48"
// //             showsVerticalScrollIndicator={true}
// //             nestedScrollEnabled={true}
// //           >
// //             {filteredStores.length > 0 ? (
// //               filteredStores.map((store) => (
// //                 <Pressable
// //                   key={store.id}
// //                   onPress={() => {
// //                     onChange(store.id, store.name);
// //                     setShowDropdown(false);
// //                     setSearchText("");
// //                   }}
// //                   className={`rounded-xl px-4 py-3 ${
// //                     value === store.id ? "bg-emerald-500/20" : ""
// //                   }`}
// //                 >
// //                   <Text className="text-white">{store.name}</Text>
// //                   <Text className="text-xs text-slate-400">
// //                     {store.code} • {store.address || "No address"}
// //                   </Text>
// //                 </Pressable>
// //               ))
// //             ) : (
// //               <Text className="py-4 text-center text-slate-400">
// //                 No stores found
// //               </Text>
// //             )}
// //           </ScrollView>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // // ============================================
// // // CATEGORY SELECTOR
// // // ============================================

// // function CategorySelector({
// //   value,
// //   onChange,
// //   categories,
// //   onAddCategory,
// //   label = "Category",
// // }: {
// //   value: string;
// //   onChange: (categoryId: string, categoryName: string) => void;
// //   categories: any[];
// //   onAddCategory: () => void;
// //   label?: string;
// // }) {
// //   const [showDropdown, setShowDropdown] = useState(false);
// //   const [searchText, setSearchText] = useState("");

// //   const filteredCategories = useMemo(() => {
// //     if (!searchText.trim()) return categories;
// //     return categories.filter((cat) =>
// //       cat.name.toLowerCase().includes(searchText.toLowerCase()),
// //     );
// //   }, [categories, searchText]);

// //   const selectedCategory = categories.find((cat) => cat.id === value);

// //   return (
// //     <View className="mb-4">
// //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //         {label}
// //       </Text>

// //       <Pressable
// //         onPress={() => setShowDropdown(!showDropdown)}
// //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// //       >
// //         <View className="flex-row items-center justify-between">
// //           <Text
// //             className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
// //           >
// //             {selectedCategory ? selectedCategory.name : "Select a category..."}
// //           </Text>
// //           <MaterialIcons
// //             name={showDropdown ? "expand-less" : "expand-more"}
// //             size={24}
// //             color="#64748b"
// //           />
// //         </View>
// //       </Pressable>

// //       {showDropdown && (
// //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// //           <TextInput
// //             value={searchText}
// //             onChangeText={setSearchText}
// //             placeholder="Search categories..."
// //             placeholderTextColor="#64748b"
// //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// //           />

// //           <ScrollView
// //             className="max-h-48"
// //             showsVerticalScrollIndicator={true}
// //             nestedScrollEnabled={true}
// //           >
// //             {filteredCategories.length > 0 ? (
// //               filteredCategories.map((item) => (
// //                 <Pressable
// //                   key={item.id}
// //                   onPress={() => {
// //                     onChange(item.id, item.name);
// //                     setShowDropdown(false);
// //                     setSearchText("");
// //                   }}
// //                   className={`rounded-xl px-4 py-3 ${
// //                     value === item.id ? "bg-emerald-500/20" : ""
// //                   }`}
// //                 >
// //                   <Text className="text-white">{item.name}</Text>
// //                   {item.description && (
// //                     <Text className="text-xs text-slate-400">
// //                       {item.description}
// //                     </Text>
// //                   )}
// //                 </Pressable>
// //               ))
// //             ) : (
// //               <View className="py-4">
// //                 <Text className="text-center text-slate-400">
// //                   No categories found
// //                 </Text>
// //                 {searchText.trim() && (
// //                   <Pressable
// //                     onPress={() => {
// //                       onAddCategory();
// //                       setShowDropdown(false);
// //                       setSearchText("");
// //                     }}
// //                     className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
// //                   >
// //                     <Text className="text-center text-emerald-200">
// //                       Create "{searchText.trim()}"
// //                     </Text>
// //                   </Pressable>
// //                 )}
// //               </View>
// //             )}
// //           </ScrollView>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // // ============================================
// // // BRAND SELECTOR
// // // ============================================

// // function BrandSelector({
// //   value,
// //   onChange,
// //   brands,
// //   onAddBrand,
// //   label = "Brand",
// // }: {
// //   value: string;
// //   onChange: (brandId: string, brandName: string) => void;
// //   brands: any[];
// //   onAddBrand: () => void;
// //   label?: string;
// // }) {
// //   const [showDropdown, setShowDropdown] = useState(false);
// //   const [searchText, setSearchText] = useState("");

// //   const filteredBrands = useMemo(() => {
// //     if (!searchText.trim()) return brands;
// //     return brands.filter((brand) =>
// //       brand.name.toLowerCase().includes(searchText.toLowerCase()),
// //     );
// //   }, [brands, searchText]);

// //   const selectedBrand = brands.find((brand) => brand.id === value);

// //   return (
// //     <View className="mb-4">
// //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //         {label}
// //       </Text>

// //       <Pressable
// //         onPress={() => setShowDropdown(!showDropdown)}
// //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// //       >
// //         <View className="flex-row items-center justify-between">
// //           <Text
// //             className={`text-base ${selectedBrand ? "text-white" : "text-slate-400"}`}
// //           >
// //             {selectedBrand ? selectedBrand.name : "Select a brand..."}
// //           </Text>
// //           <MaterialIcons
// //             name={showDropdown ? "expand-less" : "expand-more"}
// //             size={24}
// //             color="#64748b"
// //           />
// //         </View>
// //       </Pressable>

// //       {showDropdown && (
// //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// //           <TextInput
// //             value={searchText}
// //             onChangeText={setSearchText}
// //             placeholder="Search brands..."
// //             placeholderTextColor="#64748b"
// //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// //           />

// //           <ScrollView
// //             className="max-h-48"
// //             showsVerticalScrollIndicator={true}
// //             nestedScrollEnabled={true}
// //           >
// //             {filteredBrands.length > 0 ? (
// //               filteredBrands.map((item) => (
// //                 <Pressable
// //                   key={item.id}
// //                   onPress={() => {
// //                     onChange(item.id, item.name);
// //                     setShowDropdown(false);
// //                     setSearchText("");
// //                   }}
// //                   className={`rounded-xl px-4 py-3 ${
// //                     value === item.id ? "bg-purple-500/20" : ""
// //                   }`}
// //                 >
// //                   <Text className="text-white">{item.name}</Text>
// //                   {item.description && (
// //                     <Text className="text-xs text-slate-400">
// //                       {item.description}
// //                     </Text>
// //                   )}
// //                 </Pressable>
// //               ))
// //             ) : (
// //               <View className="py-4">
// //                 <Text className="text-center text-slate-400">
// //                   No brands found
// //                 </Text>
// //                 {searchText.trim() && (
// //                   <Pressable
// //                     onPress={() => {
// //                       onAddBrand();
// //                       setShowDropdown(false);
// //                       setSearchText("");
// //                     }}
// //                     className="mt-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3"
// //                   >
// //                     <Text className="text-center text-purple-200">
// //                       Create "{searchText.trim()}"
// //                     </Text>
// //                   </Pressable>
// //                 )}
// //               </View>
// //             )}
// //           </ScrollView>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // // ============================================
// // // SUPPLIER SELECTOR
// // // ============================================

// // function SupplierSelector({
// //   value,
// //   onChange,
// //   suppliers,
// //   label = "Supplier",
// // }: {
// //   value: string;
// //   onChange: (supplierId: string, supplierName: string) => void;
// //   suppliers: any[];
// //   label?: string;
// // }) {
// //   const [showDropdown, setShowDropdown] = useState(false);
// //   const [searchText, setSearchText] = useState("");

// //   const filteredSuppliers = useMemo(() => {
// //     if (!searchText.trim()) return suppliers;
// //     return suppliers.filter(
// //       (sup) =>
// //         sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
// //         sup.code?.toLowerCase().includes(searchText.toLowerCase()),
// //     );
// //   }, [suppliers, searchText]);

// //   const selectedSupplier = suppliers.find((sup) => sup.id === value);

// //   return (
// //     <View className="mb-4">
// //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //         {label}
// //       </Text>

// //       <Pressable
// //         onPress={() => setShowDropdown(!showDropdown)}
// //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// //       >
// //         <View className="flex-row items-center justify-between">
// //           <Text
// //             className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
// //           >
// //             {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
// //           </Text>
// //           <MaterialIcons
// //             name={showDropdown ? "expand-less" : "expand-more"}
// //             size={24}
// //             color="#64748b"
// //           />
// //         </View>
// //       </Pressable>

// //       {showDropdown && (
// //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// //           <TextInput
// //             value={searchText}
// //             onChangeText={setSearchText}
// //             placeholder="Search suppliers..."
// //             placeholderTextColor="#64748b"
// //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// //           />

// //           <ScrollView
// //             className="max-h-48"
// //             showsVerticalScrollIndicator={true}
// //             nestedScrollEnabled={true}
// //           >
// //             {filteredSuppliers.length > 0 ? (
// //               filteredSuppliers.map((item) => (
// //                 <Pressable
// //                   key={item.id}
// //                   onPress={() => {
// //                     onChange(item.id, item.name);
// //                     setShowDropdown(false);
// //                     setSearchText("");
// //                   }}
// //                   className={`rounded-xl px-4 py-3 ${
// //                     value === item.id ? "bg-emerald-500/20" : ""
// //                   }`}
// //                 >
// //                   <Text className="text-white">{item.name}</Text>
// //                   <Text className="text-xs text-slate-400">
// //                     {item.code} • {item.phone || "No phone"}
// //                   </Text>
// //                 </Pressable>
// //               ))
// //             ) : (
// //               <Text className="py-4 text-center text-slate-400">
// //                 No suppliers found
// //               </Text>
// //             )}
// //           </ScrollView>
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // // ============================================
// // // FIELD COMPONENT
// // // ============================================

// // function Field({
// //   label,
// //   value,
// //   onChangeText,
// //   secureTextEntry = false,
// //   keyboardType = "default",
// //   multiline = false,
// //   placeholder,
// // }: {
// //   label: string;
// //   value: string;
// //   onChangeText: (value: string) => void;
// //   secureTextEntry?: boolean;
// //   keyboardType?:
// //     | "default"
// //     | "decimal-pad"
// //     | "numeric"
// //     | "email-address"
// //     | "phone-pad";
// //   multiline?: boolean;
// //   placeholder?: string;
// // }) {
// //   return (
// //     <View className="mb-4">
// //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// //         {label}
// //       </Text>
// //       <TextInput
// //         value={value}
// //         onChangeText={onChangeText}
// //         placeholder={placeholder || label}
// //         placeholderTextColor="#64748b"
// //         secureTextEntry={secureTextEntry}
// //         keyboardType={keyboardType}
// //         multiline={multiline}
// //         numberOfLines={multiline ? 3 : 1}
// //         className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
// //           multiline ? "min-h-[100px] text-left align-top" : ""
// //         }`}
// //       />
// //     </View>
// //   );
// // }

// // // ============================================
// // // DEFAULT FIELDS
// // // ============================================

// // function getDefaultFields(moduleKey: ModuleKey) {
// //   if (moduleKey === "staff")
// //     return {
// //       username: "",
// //       name: "",
// //       email: "",
// //       password: "",
// //       role: "CASHIER",
// //       permissions: [],
// //       storeId: "",
// //     };
// //   if (moduleKey === "products")
// //     return {
// //       sku: "",
// //       barcode: "",
// //       name: "",
// //       description: "",
// //       brandId: "",
// //       brand: "",
// //       costPrice: 0,
// //       sellingPrice: 0,
// //       wholesalePrice: 0,
// //       categoryId: "",
// //       categoryName: "",
// //       manufacturingDate: "",
// //       expiryDate: "",
// //       supplierId: "",
// //       initialStock: 0,
// //       variants: [],
// //     };
// //   if (moduleKey === "stores")
// //     return {
// //       code: "",
// //       name: "",
// //       address: "",
// //       phone: "",
// //       email: "",
// //       taxNumber: "",
// //     };
// //   if (moduleKey === "categories")
// //     return { name: "", slug: "", description: "" };
// //   if (moduleKey === "brands") return { name: "", description: "" };
// //   if (moduleKey === "customers")
// //     return {
// //       name: "",
// //       phone: "",
// //       email: "",
// //       address: "",
// //       dateOfBirth: "",
// //       gender: "",
// //     };
// //   if (moduleKey === "suppliers")
// //     return {
// //       name: "",
// //       code: "",
// //       contactName: "",
// //       phone: "",
// //       email: "",
// //       address: "",
// //       taxNumber: "",
// //       paymentTerms: "",
// //       creditLimit: "",
// //     };
// //   return {};
// // }

// // // ============================================
// // // BUILD PAYLOAD
// // // ============================================

// // function buildPayload(
// //   moduleKey: ModuleKey,
// //   values: Record<string, any>,
// //   currentStoreId: string | null,
// // ) {
// //   if (moduleKey === "staff") {
// //     const payload: any = {
// //       username: String(values.username ?? "").trim(),
// //       email: String(values.email ?? "").trim() || undefined,
// //       name: String(values.name ?? "").trim(),
// //       role: values.role ?? "CASHIER",
// //       permissions: Array.isArray(values.permissions) ? values.permissions : [],
// //       isActive: values.isActive ?? true,
// //       storeId: values.storeId || currentStoreId || undefined,
// //     };
// //     if (values.password && String(values.password).trim()) {
// //       payload.password = String(values.password).trim();
// //     }
// //     return payload;
// //   }

// //   if (moduleKey === "products") {
// //     const payload: any = {
// //       tenantId: "default",
// //       sku: String(values.sku ?? "").trim() || undefined,
// //       barcode: String(values.barcode ?? "").trim() || undefined,
// //       name: String(values.name ?? "").trim(),
// //       description: String(values.description ?? "").trim() || undefined,
// //       brandId: String(values.brandId ?? "").trim() || undefined,
// //       costPrice: Number(values.costPrice ?? 0),
// //       sellingPrice: Number(values.sellingPrice ?? 0),
// //       wholesalePrice: Number(values.wholesalePrice ?? 0),
// //       categoryId: String(values.categoryId ?? "").trim() || undefined,
// //       categoryName: String(values.categoryName ?? "").trim() || undefined,
// //       manufacturingDate:
// //         String(values.manufacturingDate ?? "").trim() || undefined,
// //       expiryDate: String(values.expiryDate ?? "").trim() || undefined,
// //       supplierId: String(values.supplierId ?? "").trim() || undefined,
// //       storeId: currentStoreId || undefined,
// //       initialStock: values.initialStock
// //         ? Number(values.initialStock)
// //         : undefined,
// //     };
// //     Object.keys(payload).forEach((key) => {
// //       if (payload[key] === undefined) delete payload[key];
// //     });
// //     return payload;
// //   }

// //   if (moduleKey === "stores") {
// //     return {
// //       tenantId: "default",
// //       code: String(values.code ?? "").trim() || undefined,
// //       name: String(values.name ?? "").trim(),
// //       address: String(values.address ?? "").trim() || undefined,
// //       phone: String(values.phone ?? "").trim() || undefined,
// //       email: String(values.email ?? "").trim() || undefined,
// //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// //       isActive: values.isActive ?? true,
// //     };
// //   }

// //   if (moduleKey === "categories") {
// //     return {
// //       tenantId: "default",
// //       name: String(values.name ?? "").trim(),
// //       slug: String(values.slug ?? "").trim(),
// //       description: String(values.description ?? "").trim() || undefined,
// //       storeId: currentStoreId || undefined,
// //       isActive: values.isActive ?? true,
// //     };
// //   }

// //   if (moduleKey === "brands") {
// //     return {
// //       tenantId: "default",
// //       name: String(values.name ?? "").trim(),
// //       description: String(values.description ?? "").trim() || undefined,
// //       isActive: values.isActive ?? true,
// //     };
// //   }

// //   if (moduleKey === "customers") {
// //     return {
// //       tenantId: "default",
// //       name: String(values.name ?? "").trim(),
// //       phone: String(values.phone ?? "").trim() || undefined,
// //       email: String(values.email ?? "").trim() || undefined,
// //       address: String(values.address ?? "").trim() || undefined,
// //       dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
// //       gender: String(values.gender ?? "").trim() || undefined,
// //     };
// //   }

// //   if (moduleKey === "suppliers") {
// //     return {
// //       tenantId: "default",
// //       name: String(values.name ?? "").trim(),
// //       code: String(values.code ?? "").trim() || undefined,
// //       contactName: String(values.contactName ?? "").trim() || undefined,
// //       phone: String(values.phone ?? "").trim() || undefined,
// //       email: String(values.email ?? "").trim() || undefined,
// //       address: String(values.address ?? "").trim() || undefined,
// //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// //       paymentTerms: values.paymentTerms
// //         ? Number(values.paymentTerms)
// //         : undefined,
// //       creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
// //       storeId: currentStoreId || undefined,
// //       isActive: values.isActive ?? true,
// //     };
// //   }

// //   return values;
// // }

// // // // ============================================
// // // // FILE: app/(tabs)/manage.tsx
// // // // ============================================

// // // import {
// // //   ActionButton,
// // //   Card,
// // //   Header,
// // //   MetricCard,
// // //   Pill,
// // //   RowItem,
// // //   Screen,
// // //   SectionTitle,
// // // } from "@/components/app-ui";
// // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // // import { logout, setStore } from "@/services/features/auth/authSlice";
// // // import { resetOfflineState } from "@/services/features/offline/offlineSlice";
// // // import { clearOfflineDatabase } from "@/services/offline/db";
// // // import { MaterialIcons } from "@expo/vector-icons";
// // // import { useEffect, useMemo, useState } from "react";
// // // import {
// // //   ActivityIndicator,
// // //   Alert,
// // //   Modal,
// // //   Pressable,
// // //   ScrollView,
// // //   Text,
// // //   TextInput,
// // //   View,
// // // } from "react-native";
// // // import { SafeAreaView } from "react-native-safe-area-context";

// // // // ✅ Offline-first local APIs
// // // import {
// // //   useCloseLocalSessionMutation,
// // //   useCreateLocalBrandMutation,
// // //   useCreateLocalCategoryMutation,
// // //   useCreateLocalCustomerMutation,
// // //   useCreateLocalProductMutation,
// // //   useCreateLocalStaffMutation,
// // //   useCreateLocalStoreMutation,
// // //   useCreateLocalSupplierMutation,
// // //   useDeleteLocalBrandMutation,
// // //   useDeleteLocalCategoryMutation,
// // //   useDeleteLocalCustomerMutation,
// // //   useDeleteLocalProductMutation,
// // //   useDeleteLocalStaffMutation,
// // //   useDeleteLocalStoreMutation,
// // //   useDeleteLocalSupplierMutation,
// // //   useGetActiveSessionQuery,
// // //   useGetLocalBrandsQuery,
// // //   useGetLocalCategoriesQuery,
// // //   useGetLocalCustomersQuery,
// // //   useGetLocalProductsQuery,
// // //   useGetLocalStaffQuery,
// // //   useGetLocalStoresQuery,
// // //   useGetLocalSuppliersQuery,
// // //   useOpenLocalSessionMutation,
// // //   useUpdateLocalBrandMutation,
// // //   useUpdateLocalCategoryMutation,
// // //   useUpdateLocalCustomerMutation,
// // //   useUpdateLocalProductMutation,
// // //   useUpdateLocalStaffMutation,
// // //   useUpdateLocalStoreMutation,
// // //   useUpdateLocalSupplierMutation,
// // //   useGetLocalInventoryQuery,
// // //   useGetLocalInventoryMovementsQuery,
// // // } from "@/services/features/offline/localApi";

// // // type ModuleKey =
// // //   | "staff"
// // //   | "products"
// // //   | "stores"
// // //   | "categories"
// // //   | "customers"
// // //   | "suppliers"
// // //   | "sessions"
// // //   | "brands"
// // //   | "inventory";

// // // export default function ManageScreen() {
// // //   const dispatch = useAppDispatch();
// // //   const { user, currentStoreId } = useAppSelector((state) => state.auth);
// // //   const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
// // //   const [editor, setEditor] = useState<{
// // //     open: boolean;
// // //     mode: "create" | "edit";
// // //     item?: any;
// // //   }>({ open: false, mode: "create" });

// // //   const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
// // //     null,
// // //   );

// // //   // ✅ Queries
// // //   const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
// // //     storeId: currentStoreId || undefined,
// // //   });
// // //   const { data: products = [], refetch: refetchProducts } =
// // //     useGetLocalProductsQuery({
// // //       storeId: currentStoreId || undefined,
// // //     });
// // //   const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
// // //     {},
// // //   );
// // //   const { data: categories = [], refetch: refetchCategories } =
// // //     useGetLocalCategoriesQuery({
// // //       storeId: currentStoreId || undefined,
// // //     });
// // //   const { data: customers = [], refetch: refetchCustomers } =
// // //     useGetLocalCustomersQuery({});
// // //   const { data: suppliers = [], refetch: refetchSuppliers } =
// // //     useGetLocalSuppliersQuery({
// // //       storeId: currentStoreId || undefined,
// // //     });
// // //   const { data: brands = [], refetch: refetchBrands } = useGetLocalBrandsQuery(
// // //     {},
// // //   );
// // //   const { data: activeSession, refetch: refetchSession } =
// // //     useGetActiveSessionQuery(
// // //       { userId: user?.id || "", storeId: currentStoreId || undefined },
// // //       { skip: !user?.id },
// // //     );

// // //   // ✅ Inventory Queries
// // //   const { data: inventory = [], refetch: refetchInventory } =
// // //     useGetLocalInventoryQuery({
// // //       storeId: currentStoreId || undefined,
// // //     });
// // //   const { data: inventoryMovements = [], refetch: refetchInventoryMovements } =
// // //     useGetLocalInventoryMovementsQuery({
// // //       storeId: currentStoreId || undefined,
// // //     });

// // //   // ✅ Mutations
// // //   const [createStaff] = useCreateLocalStaffMutation();
// // //   const [updateStaff] = useUpdateLocalStaffMutation();
// // //   const [deleteStaff] = useDeleteLocalStaffMutation();

// // //   const [createProduct] = useCreateLocalProductMutation();
// // //   const [updateProduct] = useUpdateLocalProductMutation();
// // //   const [deleteProduct] = useDeleteLocalProductMutation();

// // //   const [createStore] = useCreateLocalStoreMutation();
// // //   const [updateStore] = useUpdateLocalStoreMutation();
// // //   const [deleteStore] = useDeleteLocalStoreMutation();

// // //   const [createCategory] = useCreateLocalCategoryMutation();
// // //   const [updateCategory] = useUpdateLocalCategoryMutation();
// // //   const [deleteCategory] = useDeleteLocalCategoryMutation();

// // //   const [createCustomer] = useCreateLocalCustomerMutation();
// // //   const [updateCustomer] = useUpdateLocalCustomerMutation();
// // //   const [deleteCustomer] = useDeleteLocalCustomerMutation();

// // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // //   const [updateSupplier] = useUpdateLocalSupplierMutation();
// // //   const [deleteSupplier] = useDeleteLocalSupplierMutation();

// // //   const [createBrand] = useCreateLocalBrandMutation();
// // //   const [updateBrand] = useUpdateLocalBrandMutation();
// // //   const [deleteBrand] = useDeleteLocalBrandMutation();

// // //   const [openSession] = useOpenLocalSessionMutation();
// // //   const [closeSession] = useCloseLocalSessionMutation();

// // //   const refetchers = {
// // //     staff: refetchStaff,
// // //     products: refetchProducts,
// // //     stores: refetchStores,
// // //     categories: refetchCategories,
// // //     customers: refetchCustomers,
// // //     suppliers: refetchSuppliers,
// // //     brands: refetchBrands,
// // //     sessions: refetchSession,
// // //     inventory: refetchInventory,
// // //   } as const;

// // //   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

// // //   const storeOptions = useMemo(() => stores, [stores]);

// // //   // ✅ Sign Out Handler
// // //   const handleSignOut = async () => {
// // //     Alert.alert(
// // //       "Sign Out",
// // //       "Are you sure you want to sign out? Offline data will be cleared.",
// // //       [
// // //         { text: "Cancel", style: "cancel" },
// // //         {
// // //           text: "Sign Out",
// // //           style: "destructive",
// // //           onPress: async () => {
// // //             try {
// // //               await clearOfflineDatabase();
// // //               dispatch(resetOfflineState());
// // //               dispatch(logout());
// // //             } catch (error) {
// // //               Alert.alert("Error", "Failed to sign out.");
// // //             }
// // //           },
// // //         },
// // //       ],
// // //     );
// // //   };

// // //   if (!isPrivileged) {
// // //     return (
// // //       <Screen>
// // //         <SafeAreaView className="flex-1">
// // //           <View className="flex-1 items-center justify-center px-6">
// // //             <Pill label="Restricted" tone="rose" />
// // //             <Text className="mt-4 text-3xl font-black text-white">
// // //               Management locked
// // //             </Text>
// // //             <Text className="mt-3 text-center text-sm text-slate-300">
// // //               Your account does not have access to staff, product, or store
// // //               management.
// // //             </Text>
// // //           </View>
// // //         </SafeAreaView>
// // //       </Screen>
// // //     );
// // //   }

// // //   const summary = [
// // //     {
// // //       label: "Staff",
// // //       value: String(staff.length),
// // //       icon: "groups" as const,
// // //       tone: "sky" as const,
// // //     },
// // //     {
// // //       label: "Products",
// // //       value: String(products.length),
// // //       icon: "inventory-2" as const,
// // //       tone: "emerald" as const,
// // //     },
// // //     {
// // //       label: "Stores",
// // //       value: String(stores.length),
// // //       icon: "store" as const,
// // //       tone: "amber" as const,
// // //     },
// // //     {
// // //       label: "Customers",
// // //       value: String(customers.length),
// // //       icon: "person" as const,
// // //       tone: "rose" as const,
// // //     },
// // //     {
// // //       label: "Brands",
// // //       value: String(brands.length),
// // //       icon: "branding-watermark" as const,
// // //       tone: "purple" as const,
// // //     },
// // //     {
// // //       label: "Inventory",
// // //       value: String(inventory.length),
// // //       icon: "inventory" as const,
// // //       tone: "sky" as const,
// // //     },
// // //   ];

// // //   const list = getModuleList({
// // //     moduleKey,
// // //     staff,
// // //     products,
// // //     stores,
// // //     categories,
// // //     customers,
// // //     suppliers,
// // //     brands,
// // //     activeSession,
// // //     inventory,
// // //   });

// // //   const handleSave = async (values: Record<string, any>) => {
// // //     try {
// // //       const nextValues = buildPayload(moduleKey, values, currentStoreId);

// // //       if (moduleKey === "staff") {
// // //         if (editor.mode === "create") await createStaff(nextValues).unwrap();
// // //         else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
// // //       } else if (moduleKey === "products") {
// // //         if (editor.mode === "create") await createProduct(nextValues).unwrap();
// // //         else
// // //           await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
// // //       } else if (moduleKey === "stores") {
// // //         if (editor.mode === "create") await createStore(nextValues).unwrap();
// // //         else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
// // //       } else if (moduleKey === "categories") {
// // //         if (editor.mode === "create") await createCategory(nextValues).unwrap();
// // //         else
// // //           await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
// // //       } else if (moduleKey === "customers") {
// // //         if (editor.mode === "create") await createCustomer(nextValues).unwrap();
// // //         else
// // //           await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
// // //       } else if (moduleKey === "suppliers") {
// // //         if (editor.mode === "create") await createSupplier(nextValues).unwrap();
// // //         else
// // //           await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
// // //       } else if (moduleKey === "brands") {
// // //         if (editor.mode === "create") await createBrand(nextValues).unwrap();
// // //         else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
// // //       }

// // //       await refetchers[moduleKey]();
// // //       setEditor({ open: false, mode: "create" });
// // //     } catch (error: any) {
// // //       Alert.alert(
// // //         "Save failed",
// // //         error?.data?.message || "Unable to save changes.",
// // //       );
// // //     }
// // //   };

// // //   const handleDelete = async (item: any) => {
// // //     try {
// // //       if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
// // //       else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
// // //       else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
// // //       else if (moduleKey === "categories")
// // //         await deleteCategory(item.id).unwrap();
// // //       else if (moduleKey === "customers")
// // //         await deleteCustomer(item.id).unwrap();
// // //       else if (moduleKey === "suppliers")
// // //         await deleteSupplier(item.id).unwrap();
// // //       else if (moduleKey === "brands") await deleteBrand(item.id).unwrap();
// // //       await refetchers[moduleKey]();
// // //     } catch (error: any) {
// // //       Alert.alert(
// // //         "Delete failed",
// // //         error?.data?.message || "Unable to delete item.",
// // //       );
// // //     }
// // //   };

// // //   const openEditor = (mode: "create" | "edit", item?: any) => {
// // //     setEditor({ open: true, mode, item });
// // //   };

// // //   return (
// // //     <Screen>
// // //       <SafeAreaView className="flex-1 bg-slate-950">
// // //         <ScrollView
// // //           showsVerticalScrollIndicator={false}
// // //           contentContainerStyle={{ paddingBottom: 28 }}
// // //           className="px-5"
// // //         >
// // //           <Header
// // //             eyebrow="Administration"
// // //             title="Management"
// // //             subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, inventory, and session control from one place."
// // //             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
// // //           />

// // //           <View className="mb-4 flex-row flex-wrap gap-3">
// // //             {summary.map((item) => (
// // //               <View key={item.label} className="w-[48.5%]">
// // //                 <MetricCard
// // //                   icon={item.icon}
// // //                   label={item.label}
// // //                   value={item.value}
// // //                   tone={item.tone}
// // //                 />
// // //               </View>
// // //             ))}
// // //           </View>

// // //           <Card className="mb-4">
// // //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //               Store context
// // //             </Text>
// // //             <ScrollView
// // //               horizontal
// // //               showsHorizontalScrollIndicator={false}
// // //               className="mt-3"
// // //               contentContainerStyle={{ gap: 8 }}
// // //             >
// // //               {storeOptions.map((store: any) => {
// // //                 const active = store.id === currentStoreId;
// // //                 return (
// // //                   <Pressable
// // //                     key={store.id}
// // //                     onPress={() => dispatch(setStore(store.id))}
// // //                     className={`rounded-full border px-4 py-3 ${
// // //                       active
// // //                         ? "border-sky-400/30 bg-sky-500/15"
// // //                         : "border-white/10 bg-white/5"
// // //                     }`}
// // //                   >
// // //                     <Text
// // //                       className={`text-xs font-bold uppercase tracking-[2px] ${
// // //                         active ? "text-sky-200" : "text-slate-300"
// // //                       }`}
// // //                     >
// // //                       {store.name}
// // //                     </Text>
// // //                   </Pressable>
// // //                 );
// // //               })}
// // //             </ScrollView>
// // //           </Card>

// // //           <SectionTitle title="Modules" />
// // //           <View className="mb-4 flex-row flex-wrap gap-2">
// // //             {(
// // //               [
// // //                 "products",
// // //                 "staff",
// // //                 "stores",
// // //                 "categories",
// // //                 "customers",
// // //                 "suppliers",
// // //                 "brands",
// // //                 "inventory",
// // //                 "sessions",
// // //               ] as ModuleKey[]
// // //             ).map((key) => (
// // //               <Pressable
// // //                 key={key}
// // //                 onPress={() => setModuleKey(key)}
// // //                 className={`rounded-full border px-4 py-3 ${
// // //                   moduleKey === key
// // //                     ? "border-emerald-400/30 bg-emerald-500/15"
// // //                     : "border-white/10 bg-white/5"
// // //                 }`}
// // //               >
// // //                 <Text
// // //                   className={`text-xs font-bold uppercase tracking-[2px] ${
// // //                     moduleKey === key ? "text-emerald-200" : "text-slate-300"
// // //                   }`}
// // //                 >
// // //                   {key}
// // //                 </Text>
// // //               </Pressable>
// // //             ))}
// // //           </View>

// // //           <View className="mb-4 flex-row gap-3">
// // //             <ActionButton
// // //               title="Add New"
// // //               icon="add"
// // //               accent="emerald"
// // //               onPress={() => openEditor("create")}
// // //             />
// // //             {moduleKey === "sessions" ? (
// // //               <ActionButton
// // //                 title={activeSession ? "Close Session" : "Open Session"}
// // //                 icon="schedule"
// // //                 accent={activeSession ? "rose" : "sky"}
// // //                 onPress={() =>
// // //                   setSessionModal(activeSession ? "close" : "open")
// // //                 }
// // //               />
// // //             ) : (
// // //               <ActionButton
// // //                 title="Refresh"
// // //                 icon="refresh"
// // //                 accent="sky"
// // //                 onPress={() => refetchers[moduleKey]()}
// // //               />
// // //             )}
// // //           </View>

// // //           <SectionTitle
// // //             title={`${moduleKey} list`}
// // //             action="Tap an item to edit"
// // //           />
// // //           <Card>
// // //             {list.length ? (
// // //               list.map((item: any, index: number) => (
// // //                 <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
// // //                   <Pressable onPress={() => openEditor("edit", item)}>
// // //                     <RowItem
// // //                       title={item.name || item.username || item.code || item.id}
// // //                       subtitle={getSubtitle(moduleKey, item)}
// // //                       right={getRightLabel(moduleKey, item)}
// // //                       icon={getIcon(moduleKey)}
// // //                     />
// // //                   </Pressable>
// // //                   {index < list.length - 1 ? (
// // //                     <View className="my-3 h-px bg-white/8" />
// // //                   ) : null}
// // //                 </View>
// // //               ))
// // //             ) : (
// // //               <View className="py-8 items-center">
// // //                 <View className="h-16 w-16 bg-white/5 rounded-full items-center justify-center border border-white/10">
// // //                   <MaterialIcons name="inbox" size={28} color="#64748b" />
// // //                 </View>
// // //                 <Text className="text-slate-400 text-center text-sm mt-3">
// // //                   No {moduleKey} found
// // //                 </Text>
// // //                 <Text className="text-slate-500 text-xs text-center mt-1">
// // //                   Create one by tapping "Add New"
// // //                 </Text>
// // //               </View>
// // //             )}
// // //           </Card>

// // //           {/* ✅ Sign Out Button */}
// // //           <View className="mt-6 pt-4 border-t border-white/10">
// // //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400 mb-3">
// // //               Account
// // //             </Text>
// // //             <Pressable
// // //               onPress={handleSignOut}
// // //               className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 flex-row items-center justify-between"
// // //             >
// // //               <View className="flex-row items-center">
// // //                 <View className="bg-rose-500/20 p-2 rounded-full">
// // //                   <MaterialIcons name="logout" size={20} color="#f87171" />
// // //                 </View>
// // //                 <Text className="text-rose-400 font-semibold ml-3">
// // //                   Sign Out
// // //                 </Text>
// // //               </View>
// // //               <MaterialIcons name="chevron-right" size={20} color="#f87171" />
// // //             </Pressable>
// // //             <Text className="text-slate-500 text-[10px] mt-2 text-center">
// // //               This will clear all offline data and return to login
// // //             </Text>
// // //           </View>
// // //         </ScrollView>

// // //         {/* Editor Modal */}
// // //         <Modal
// // //           visible={editor.open}
// // //           animationType="slide"
// // //           onRequestClose={() => setEditor({ open: false, mode: "create" })}
// // //           transparent={true}
// // //         >
// // //           <View className="flex-1 bg-black/70">
// // //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// // //               <EditorModalContent
// // //                 title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
// // //                 moduleKey={moduleKey}
// // //                 item={editor.item}
// // //                 mode={editor.mode}
// // //                 onClose={() => setEditor({ open: false, mode: "create" })}
// // //                 onSave={handleSave}
// // //                 onDelete={
// // //                   editor.item ? () => handleDelete(editor.item) : undefined
// // //                 }
// // //                 currentStoreId={currentStoreId}
// // //                 stores={stores}
// // //                 categories={categories}
// // //                 suppliers={suppliers}
// // //                 brands={brands}
// // //                 refetchCategories={refetchCategories}
// // //                 refetchSuppliers={refetchSuppliers}
// // //                 refetchBrands={refetchBrands}
// // //               />
// // //             </View>
// // //           </View>
// // //         </Modal>

// // //         {/* Session Modal */}
// // //         <Modal
// // //           visible={sessionModal !== null}
// // //           animationType="slide"
// // //           onRequestClose={() => setSessionModal(null)}
// // //           transparent={true}
// // //         >
// // //           <View className="flex-1 bg-black/70">
// // //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// // //               <SessionModalContent
// // //                 mode={sessionModal}
// // //                 activeSession={activeSession}
// // //                 onClose={() => setSessionModal(null)}
// // //                 onOpen={async (openingBalance, notes) => {
// // //                   try {
// // //                     await openSession({
// // //                       userId: user?.id || "",
// // //                       openingBalance: Number(openingBalance || 0),
// // //                       notes,
// // //                       storeId: currentStoreId || undefined,
// // //                     }).unwrap();
// // //                     setSessionModal(null);
// // //                     await refetchSession();
// // //                   } catch (error: any) {
// // //                     Alert.alert(
// // //                       "Open session failed",
// // //                       error?.data?.message || "Unable to open session.",
// // //                     );
// // //                   }
// // //                 }}
// // //                 onCloseSession={async (closingBalance, notes) => {
// // //                   try {
// // //                     if (!activeSession) return;
// // //                     await closeSession({
// // //                       id: activeSession.id,
// // //                       closingBalance: Number(closingBalance || 0),
// // //                       expectedBalance: Number(closingBalance || 0),
// // //                       discrepancy: 0,
// // //                       cashSales: 0,
// // //                       cardSales: 0,
// // //                       digitalSales: 0,
// // //                       notes,
// // //                     }).unwrap();
// // //                     setSessionModal(null);
// // //                     await refetchSession();
// // //                   } catch (error: any) {
// // //                     Alert.alert(
// // //                       "Close session failed",
// // //                       error?.data?.message || "Unable to close session.",
// // //                     );
// // //                   }
// // //                 }}
// // //               />
// // //             </View>
// // //           </View>
// // //         </Modal>
// // //       </SafeAreaView>
// // //     </Screen>
// // //   );
// // // }

// // // // ============================================
// // // // HELPER FUNCTIONS
// // // // ============================================

// // // function getModuleList(input: any) {
// // //   const {
// // //     moduleKey,
// // //     staff,
// // //     products,
// // //     stores,
// // //     categories,
// // //     customers,
// // //     suppliers,
// // //     brands,
// // //     activeSession,
// // //     inventory,
// // //   } = input;
// // //   if (moduleKey === "staff") return staff;
// // //   if (moduleKey === "products") return products;
// // //   if (moduleKey === "stores") return stores;
// // //   if (moduleKey === "categories") return categories;
// // //   if (moduleKey === "customers") return customers;
// // //   if (moduleKey === "suppliers") return suppliers;
// // //   if (moduleKey === "brands") return brands;
// // //   if (moduleKey === "inventory") return inventory;
// // //   return activeSession ? [activeSession] : [];
// // // }

// // // function getSubtitle(moduleKey: ModuleKey, item: any) {
// // //   if (moduleKey === "staff")
// // //     return `${item.role} • ${item.email ?? "no email"}`;
// // //   if (moduleKey === "products") {
// // //     const brandName = item.brand?.name || item.brandName || "";
// // //     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
// // //   }
// // //   if (moduleKey === "stores") return item.address ?? "No address";
// // //   if (moduleKey === "categories") return item.slug ?? "No slug";
// // //   if (moduleKey === "customers") return item.phone ?? item.code;
// // //   if (moduleKey === "suppliers")
// // //     return item.phone ?? item.email ?? "No contact";
// // //   if (moduleKey === "brands") return item.description ?? "No description";
// // //   if (moduleKey === "inventory") {
// // //     const productName = item.product?.name || item.name || "Unknown";
// // //     return `${productName} • Qty: ${item.quantity || 0}`;
// // //   }
// // //   if (moduleKey === "sessions")
// // //     return `${item.status} • ${item.openedAt ?? ""}`;
// // //   return "";
// // // }

// // // function getRightLabel(moduleKey: ModuleKey, item: any) {
// // //   if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
// // //   if (moduleKey === "products")
// // //     return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
// // //   if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
// // //   if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
// // //   if (moduleKey === "customers") return item.tier ?? "BRONZE";
// // //   if (moduleKey === "suppliers") {
// // //     if (item.currentBalance !== undefined && item.currentBalance !== null) {
// // //       return `$${Number(item.currentBalance).toFixed(2)}`;
// // //     }
// // //     return item.isActive ? "Active" : "Inactive";
// // //   }
// // //   if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive";
// // //   if (moduleKey === "inventory") {
// // //     const qty = item.quantity || 0;
// // //     if (qty === 0) return "Out of Stock";
// // //     if (qty <= 10) return "Low Stock";
// // //     return `${qty} in stock`;
// // //   }
// // //   if (moduleKey === "sessions") return item.status ?? "OPEN";
// // //   return "";
// // // }

// // // function getIcon(moduleKey: ModuleKey) {
// // //   if (moduleKey === "staff") return "groups";
// // //   if (moduleKey === "products") return "inventory-2";
// // //   if (moduleKey === "stores") return "store";
// // //   if (moduleKey === "categories") return "category";
// // //   if (moduleKey === "customers") return "person";
// // //   if (moduleKey === "suppliers") return "local-shipping";
// // //   if (moduleKey === "brands") return "branding-watermark";
// // //   if (moduleKey === "inventory") return "inventory";
// // //   if (moduleKey === "sessions") return "schedule";
// // //   return "schedule";
// // // }

// // // // ============================================
// // // // EDITOR MODAL CONTENT
// // // // ============================================

// // // function EditorModalContent({
// // //   title,
// // //   moduleKey,
// // //   item,
// // //   mode,
// // //   onClose,
// // //   onSave,
// // //   onDelete,
// // //   currentStoreId,
// // //   stores,
// // //   categories,
// // //   suppliers,
// // //   brands,
// // //   refetchCategories,
// // //   refetchSuppliers,
// // //   refetchBrands,
// // // }: {
// // //   title: string;
// // //   moduleKey: ModuleKey;
// // //   item?: any;
// // //   mode: "create" | "edit";
// // //   onClose: () => void;
// // //   onSave: (values: Record<string, any>) => Promise<void>;
// // //   onDelete?: () => void;
// // //   currentStoreId: string | null;
// // //   stores: any[];
// // //   categories: any[];
// // //   suppliers: any[];
// // //   brands: any[];
// // //   refetchCategories: () => void;
// // //   refetchSuppliers: () => void;
// // //   refetchBrands: () => void;
// // // }) {
// // //   const [fields, setFields] = useState<Record<string, any>>({});
// // //   const [showCreateCategory, setShowCreateCategory] = useState(false);
// // //   const [showCreateSupplier, setShowCreateSupplier] = useState(false);
// // //   const [showCreateBrand, setShowCreateBrand] = useState(false);
// // //   const [newCategory, setNewCategory] = useState({
// // //     name: "",
// // //     slug: "",
// // //     description: "",
// // //   });
// // //   const [newSupplier, setNewSupplier] = useState({
// // //     name: "",
// // //     code: "",
// // //     phone: "",
// // //     email: "",
// // //     address: "",
// // //     contactName: "",
// // //   });
// // //   const [newBrand, setNewBrand] = useState({
// // //     name: "",
// // //     description: "",
// // //   });
// // //   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
// // //   const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
// // //   const [isCreatingBrand, setIsCreatingBrand] = useState(false);

// // //   const [createCategory] = useCreateLocalCategoryMutation();
// // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // //   const [createBrand] = useCreateLocalBrandMutation();

// // //   useEffect(() => {
// // //     if (item !== undefined) {
// // //       setFields(item ? { ...item } : getDefaultFields(moduleKey));
// // //     }
// // //   }, [item, moduleKey]);

// // //   const set = (key: string, value: any) =>
// // //     setFields((current) => ({ ...current, [key]: value }));

// // //   const save = () => onSave(fields);

// // //   const handleCreateCategory = async () => {
// // //     try {
// // //       if (!newCategory.name.trim()) {
// // //         Alert.alert("Error", "Category name is required");
// // //         return;
// // //       }

// // //       setIsCreatingCategory(true);
// // //       if (!currentStoreId) {
// // //         Alert.alert("Error", "Store not found");
// // //         return;
// // //       }

// // //       const payload = {
// // //         tenantId: "default",
// // //         name: newCategory.name.trim(),
// // //         slug:
// // //           newCategory.slug.trim() ||
// // //           newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
// // //         description: newCategory.description.trim() || undefined,
// // //         storeId: currentStoreId,
// // //         isActive: true,
// // //       };

// // //       const result = await createCategory(payload).unwrap();
// // //       await refetchCategories();
// // //       set("categoryId", result?.id);
// // //       set("categoryName", result?.name);

// // //       setShowCreateCategory(false);
// // //       setNewCategory({ name: "", slug: "", description: "" });

// // //       Alert.alert("Success", "Category created successfully");
// // //     } catch (error: any) {
// // //       Alert.alert(
// // //         "Failed to create category",
// // //         error?.data?.message || "Unable to create category.",
// // //       );
// // //     } finally {
// // //       setIsCreatingCategory(false);
// // //     }
// // //   };

// // //   const handleCreateSupplier = async () => {
// // //     try {
// // //       if (!newSupplier.name.trim()) {
// // //         Alert.alert("Error", "Supplier name is required");
// // //         return;
// // //       }

// // //       setIsCreatingSupplier(true);
// // //       if (!currentStoreId) {
// // //         Alert.alert("Error", "Store not found");
// // //         return;
// // //       }

// // //       const payload = {
// // //         tenantId: "default",
// // //         name: newSupplier.name.trim(),
// // //         code: newSupplier.code.trim() || undefined,
// // //         contactName: newSupplier.contactName.trim() || undefined,
// // //         phone: newSupplier.phone.trim() || undefined,
// // //         email: newSupplier.email.trim() || undefined,
// // //         address: newSupplier.address.trim() || undefined,
// // //         storeId: currentStoreId,
// // //         isActive: true,
// // //       };

// // //       const result = await createSupplier(payload).unwrap();
// // //       await refetchSuppliers();
// // //       set("supplierId", result.id);
// // //       set("supplierName", result.name);

// // //       setShowCreateSupplier(false);
// // //       setNewSupplier({
// // //         name: "",
// // //         code: "",
// // //         phone: "",
// // //         email: "",
// // //         address: "",
// // //         contactName: "",
// // //       });

// // //       Alert.alert("Success", "Supplier created successfully");
// // //     } catch (error: any) {
// // //       Alert.alert(
// // //         "Failed to create supplier",
// // //         error?.data?.message || "Unable to create supplier.",
// // //       );
// // //     } finally {
// // //       setIsCreatingSupplier(false);
// // //     }
// // //   };

// // //   const handleCreateBrand = async () => {
// // //     try {
// // //       if (!newBrand.name.trim()) {
// // //         Alert.alert("Error", "Brand name is required");
// // //         return;
// // //       }

// // //       setIsCreatingBrand(true);

// // //       const payload = {
// // //         tenantId: "default",
// // //         name: newBrand.name.trim(),
// // //         description: newBrand.description.trim() || undefined,
// // //         isActive: true,
// // //       };

// // //       const result = await createBrand(payload).unwrap();
// // //       await refetchBrands();
// // //       set("brandId", result.id);
// // //       set("brand", result.name);

// // //       setShowCreateBrand(false);
// // //       setNewBrand({ name: "", description: "" });

// // //       Alert.alert("Success", "Brand created successfully");
// // //     } catch (error: any) {
// // //       Alert.alert(
// // //         "Failed to create brand",
// // //         error?.data?.message || "Unable to create brand.",
// // //       );
// // //     } finally {
// // //       setIsCreatingBrand(false);
// // //     }
// // //   };

// // //   return (
// // //     <SafeAreaView className="flex-1 px-4 pt-4">
// // //       <View className="flex-row items-center justify-between mb-6">
// // //         <Text className="text-white text-xl font-black">{title}</Text>
// // //         <Pressable onPress={onClose}>
// // //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// // //         </Pressable>
// // //       </View>

// // //       <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
// // //         {/* Staff Form */}
// // //         {moduleKey === "staff" && (
// // //           <>
// // //             <Field
// // //               label="Username"
// // //               value={fields.username ?? ""}
// // //               onChangeText={(v) => set("username", v)}
// // //             />
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="Email"
// // //               value={fields.email ?? ""}
// // //               onChangeText={(v) => set("email", v)}
// // //             />
// // //             {mode === "create" && (
// // //               <Field
// // //                 label="Password"
// // //                 value={fields.password ?? ""}
// // //                 onChangeText={(v) => set("password", v)}
// // //                 secureTextEntry
// // //               />
// // //             )}

// // //             <StoreSelector
// // //               value={fields.storeId ?? ""}
// // //               onChange={(storeId, storeName) => {
// // //                 set("storeId", storeId);
// // //                 set("storeName", storeName);
// // //               }}
// // //               stores={stores}
// // //               label="Assigned Store"
// // //             />

// // //             <RoleSelector
// // //               value={fields.role ?? "CASHIER"}
// // //               onChange={(role) => {
// // //                 set("role", role);
// // //                 set("permissions", getDefaultPermissions(role));
// // //               }}
// // //             />
// // //           </>
// // //         )}

// // //         {/* Products Form */}
// // //         {moduleKey === "products" && (
// // //           <>
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="SKU"
// // //               value={fields.sku ?? ""}
// // //               onChangeText={(v) => set("sku", v)}
// // //             />
// // //             <Field
// // //               label="Barcode"
// // //               value={fields.barcode ?? ""}
// // //               onChangeText={(v) => set("barcode", v)}
// // //             />
// // //             <Field
// // //               label="Description"
// // //               value={fields.description ?? ""}
// // //               onChangeText={(v) => set("description", v)}
// // //               multiline
// // //             />

// // //             <BrandSelector
// // //               value={fields.brandId ?? ""}
// // //               onChange={(brandId, brandName) => {
// // //                 set("brandId", brandId);
// // //                 set("brand", brandName);
// // //               }}
// // //               brands={brands}
// // //               onAddBrand={() => setShowCreateBrand(true)}
// // //             />

// // //             <Field
// // //               label="Cost Price"
// // //               value={fields.costPrice?.toString() ?? ""}
// // //               onChangeText={(v) => {
// // //                 const num = parseFloat(v);
// // //                 set("costPrice", isNaN(num) ? 0 : num);
// // //               }}
// // //               keyboardType="decimal-pad"
// // //             />
// // //             <Field
// // //               label="Selling Price"
// // //               value={fields.sellingPrice?.toString() ?? ""}
// // //               onChangeText={(v) => {
// // //                 const num = parseFloat(v);
// // //                 set("sellingPrice", isNaN(num) ? 0 : num);
// // //               }}
// // //               keyboardType="decimal-pad"
// // //             />
// // //             <Field
// // //               label="Wholesale Price"
// // //               value={fields.wholesalePrice?.toString() ?? ""}
// // //               onChangeText={(v) => {
// // //                 const num = parseFloat(v);
// // //                 set("wholesalePrice", isNaN(num) ? 0 : num);
// // //               }}
// // //               keyboardType="decimal-pad"
// // //             />
// // //             <Field
// // //               label="Initial Stock"
// // //               value={fields.initialStock?.toString() ?? ""}
// // //               onChangeText={(v) => {
// // //                 const num = parseInt(v, 10);
// // //                 set("initialStock", isNaN(num) ? 0 : num);
// // //               }}
// // //               keyboardType="numeric"
// // //             />

// // //             <CategorySelector
// // //               value={fields.categoryId ?? ""}
// // //               onChange={(categoryId, categoryName) => {
// // //                 set("categoryId", categoryId);
// // //                 set("categoryName", categoryName);
// // //               }}
// // //               categories={categories}
// // //               onAddCategory={() => setShowCreateCategory(true)}
// // //             />

// // //             <SupplierSelector
// // //               value={fields.supplierId ?? ""}
// // //               onChange={(supplierId, supplierName) => {
// // //                 set("supplierId", supplierId);
// // //                 set("supplierName", supplierName);
// // //               }}
// // //               suppliers={suppliers}
// // //             />

// // //             {showCreateCategory && (
// // //               <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
// // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
// // //                   Create New Category
// // //                 </Text>
// // //                 <Field
// // //                   label="Category Name"
// // //                   value={newCategory.name}
// // //                   onChangeText={(v) => {
// // //                     setNewCategory({ ...newCategory, name: v });
// // //                     if (!newCategory.slug) {
// // //                       const slug = v.toLowerCase().replace(/\s+/g, "-");
// // //                       setNewCategory((prev) => ({ ...prev, slug }));
// // //                     }
// // //                   }}
// // //                 />
// // //                 <Field
// // //                   label="Slug (URL friendly)"
// // //                   value={newCategory.slug}
// // //                   onChangeText={(v) =>
// // //                     setNewCategory({ ...newCategory, slug: v })
// // //                   }
// // //                 />
// // //                 <Field
// // //                   label="Description"
// // //                   value={newCategory.description}
// // //                   onChangeText={(v) =>
// // //                     setNewCategory({ ...newCategory, description: v })
// // //                   }
// // //                 />
// // //                 <View className="mt-2 flex-row gap-3">
// // //                   <ActionButton
// // //                     title="Cancel"
// // //                     icon="close"
// // //                     accent="rose"
// // //                     onPress={() => setShowCreateCategory(false)}
// // //                   />
// // //                   <ActionButton
// // //                     title="Create"
// // //                     icon="add"
// // //                     accent="emerald"
// // //                     onPress={handleCreateCategory}
// // //                     disabled={isCreatingCategory}
// // //                   />
// // //                 </View>
// // //               </View>
// // //             )}

// // //             {showCreateBrand && (
// // //               <View className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
// // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-purple-400">
// // //                   Create New Brand
// // //                 </Text>
// // //                 <Field
// // //                   label="Brand Name"
// // //                   value={newBrand.name}
// // //                   onChangeText={(v) => setNewBrand({ ...newBrand, name: v })}
// // //                 />
// // //                 <Field
// // //                   label="Description"
// // //                   value={newBrand.description}
// // //                   onChangeText={(v) =>
// // //                     setNewBrand({ ...newBrand, description: v })
// // //                   }
// // //                 />
// // //                 <View className="mt-2 flex-row gap-3">
// // //                   <ActionButton
// // //                     title="Cancel"
// // //                     icon="close"
// // //                     accent="rose"
// // //                     onPress={() => setShowCreateBrand(false)}
// // //                   />
// // //                   <ActionButton
// // //                     title="Create"
// // //                     icon="add"
// // //                     accent="emerald"
// // //                     onPress={handleCreateBrand}
// // //                     disabled={isCreatingBrand}
// // //                   />
// // //                 </View>
// // //               </View>
// // //             )}
// // //           </>
// // //         )}

// // //         {/* Stores Form */}
// // //         {moduleKey === "stores" && (
// // //           <>
// // //             <Field
// // //               label="Code"
// // //               value={fields.code ?? ""}
// // //               onChangeText={(v) => set("code", v)}
// // //             />
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="Address"
// // //               value={fields.address ?? ""}
// // //               onChangeText={(v) => set("address", v)}
// // //             />
// // //             <Field
// // //               label="Phone"
// // //               value={fields.phone ?? ""}
// // //               onChangeText={(v) => set("phone", v)}
// // //             />
// // //             <Field
// // //               label="Email"
// // //               value={fields.email ?? ""}
// // //               onChangeText={(v) => set("email", v)}
// // //             />
// // //             <Field
// // //               label="Tax Number"
// // //               value={fields.taxNumber ?? ""}
// // //               onChangeText={(v) => set("taxNumber", v)}
// // //             />
// // //           </>
// // //         )}

// // //         {/* Categories Form */}
// // //         {moduleKey === "categories" && (
// // //           <>
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="Slug"
// // //               value={fields.slug ?? ""}
// // //               onChangeText={(v) => set("slug", v)}
// // //             />
// // //             <Field
// // //               label="Description"
// // //               value={fields.description ?? ""}
// // //               onChangeText={(v) => set("description", v)}
// // //             />
// // //           </>
// // //         )}

// // //         {/* Brands Form */}
// // //         {moduleKey === "brands" && (
// // //           <>
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="Description"
// // //               value={fields.description ?? ""}
// // //               onChangeText={(v) => set("description", v)}
// // //               multiline
// // //             />
// // //           </>
// // //         )}

// // //         {/* Customers Form */}
// // //         {moduleKey === "customers" && (
// // //           <>
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="Phone"
// // //               value={fields.phone ?? ""}
// // //               onChangeText={(v) => set("phone", v)}
// // //             />
// // //             <Field
// // //               label="Email"
// // //               value={fields.email ?? ""}
// // //               onChangeText={(v) => set("email", v)}
// // //             />
// // //             <Field
// // //               label="Address"
// // //               value={fields.address ?? ""}
// // //               onChangeText={(v) => set("address", v)}
// // //             />
// // //             <Field
// // //               label="Date of Birth"
// // //               value={fields.dateOfBirth ?? ""}
// // //               onChangeText={(v) => set("dateOfBirth", v)}
// // //               placeholder="YYYY-MM-DD"
// // //             />
// // //             <Field
// // //               label="Gender"
// // //               value={fields.gender ?? ""}
// // //               onChangeText={(v) => set("gender", v)}
// // //               placeholder="MALE / FEMALE / OTHER"
// // //             />
// // //           </>
// // //         )}

// // //         {/* Suppliers Form */}
// // //         {moduleKey === "suppliers" && (
// // //           <>
// // //             <Field
// // //               label="Name"
// // //               value={fields.name ?? ""}
// // //               onChangeText={(v) => set("name", v)}
// // //             />
// // //             <Field
// // //               label="Code"
// // //               value={fields.code ?? ""}
// // //               onChangeText={(v) => set("code", v)}
// // //             />
// // //             <Field
// // //               label="Contact Person"
// // //               value={fields.contactName ?? ""}
// // //               onChangeText={(v) => set("contactName", v)}
// // //             />
// // //             <Field
// // //               label="Phone"
// // //               value={fields.phone ?? ""}
// // //               onChangeText={(v) => set("phone", v)}
// // //             />
// // //             <Field
// // //               label="Email"
// // //               value={fields.email ?? ""}
// // //               onChangeText={(v) => set("email", v)}
// // //             />
// // //             <Field
// // //               label="Address"
// // //               value={fields.address ?? ""}
// // //               onChangeText={(v) => set("address", v)}
// // //             />
// // //             <Field
// // //               label="Tax Number"
// // //               value={fields.taxNumber ?? ""}
// // //               onChangeText={(v) => set("taxNumber", v)}
// // //             />
// // //             <Field
// // //               label="Payment Terms (days)"
// // //               value={fields.paymentTerms?.toString() ?? ""}
// // //               onChangeText={(v) => {
// // //                 const num = parseInt(v, 10);
// // //                 set("paymentTerms", isNaN(num) ? undefined : num);
// // //               }}
// // //               keyboardType="numeric"
// // //               placeholder="30"
// // //             />
// // //             <Field
// // //               label="Credit Limit"
// // //               value={fields.creditLimit?.toString() ?? ""}
// // //               onChangeText={(v) => {
// // //                 const num = parseFloat(v);
// // //                 set("creditLimit", isNaN(num) ? undefined : num);
// // //               }}
// // //               keyboardType="decimal-pad"
// // //               placeholder="0.00"
// // //             />

// // //             {showCreateSupplier && (
// // //               <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
// // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-emerald-400">
// // //                   Create New Supplier
// // //                 </Text>
// // //                 <Field
// // //                   label="Supplier Name"
// // //                   value={newSupplier.name}
// // //                   onChangeText={(v) =>
// // //                     setNewSupplier({ ...newSupplier, name: v })
// // //                   }
// // //                 />
// // //                 <Field
// // //                   label="Code"
// // //                   value={newSupplier.code}
// // //                   onChangeText={(v) =>
// // //                     setNewSupplier({ ...newSupplier, code: v })
// // //                   }
// // //                 />
// // //                 <Field
// // //                   label="Contact Person"
// // //                   value={newSupplier.contactName}
// // //                   onChangeText={(v) =>
// // //                     setNewSupplier({ ...newSupplier, contactName: v })
// // //                   }
// // //                 />
// // //                 <Field
// // //                   label="Phone"
// // //                   value={newSupplier.phone}
// // //                   onChangeText={(v) =>
// // //                     setNewSupplier({ ...newSupplier, phone: v })
// // //                   }
// // //                 />
// // //                 <Field
// // //                   label="Email"
// // //                   value={newSupplier.email}
// // //                   onChangeText={(v) =>
// // //                     setNewSupplier({ ...newSupplier, email: v })
// // //                   }
// // //                 />
// // //                 <View className="mt-2 flex-row gap-3">
// // //                   <ActionButton
// // //                     title="Cancel"
// // //                     icon="close"
// // //                     accent="rose"
// // //                     onPress={() => setShowCreateSupplier(false)}
// // //                   />
// // //                   <ActionButton
// // //                     title="Create"
// // //                     icon="add"
// // //                     accent="emerald"
// // //                     onPress={handleCreateSupplier}
// // //                     disabled={isCreatingSupplier}
// // //                   />
// // //                 </View>
// // //               </View>
// // //             )}
// // //           </>
// // //         )}

// // //         {/* Sessions - No form */}
// // //         {moduleKey === "sessions" && (
// // //           <View className="py-8">
// // //             <Text className="text-center text-slate-400">
// // //               Session management is handled separately.
// // //             </Text>
// // //             <Text className="text-center text-slate-500 text-sm mt-2">
// // //               Use the "Open Session" or "Close Session" button above.
// // //             </Text>
// // //           </View>
// // //         )}

// // //         <View className="mt-4 flex-row gap-3">
// // //           <ActionButton
// // //             title="Cancel"
// // //             icon="close"
// // //             accent="rose"
// // //             onPress={onClose}
// // //           />
// // //           <ActionButton
// // //             title="Save"
// // //             icon="save"
// // //             accent="emerald"
// // //             onPress={save}
// // //           />
// // //         </View>
// // //         {mode === "edit" && onDelete && (
// // //           <View className="mt-3">
// // //             <ActionButton
// // //               title="Delete"
// // //               icon="delete"
// // //               accent="rose"
// // //               onPress={onDelete}
// // //             />
// // //           </View>
// // //         )}
// // //       </ScrollView>
// // //     </SafeAreaView>
// // //   );
// // // }

// // // // ============================================
// // // // SESSION MODAL CONTENT
// // // // ============================================

// // // function SessionModalContent({
// // //   mode,
// // //   activeSession,
// // //   onClose,
// // //   onOpen,
// // //   onCloseSession,
// // // }: {
// // //   mode: "open" | "close" | null;
// // //   activeSession: any;
// // //   onClose: () => void;
// // //   onOpen: (openingBalance: string, notes: string) => Promise<void>;
// // //   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// // // }) {
// // //   const [balance, setBalance] = useState("0");
// // //   const [notes, setNotes] = useState("");

// // //   return (
// // //     <SafeAreaView className="flex-1 px-4 pt-4">
// // //       <View className="flex-row items-center justify-between mb-6">
// // //         <Text className="text-white text-xl font-black">
// // //           {mode === "open" ? "Open Session" : "Close Session"}
// // //         </Text>
// // //         <Pressable onPress={onClose}>
// // //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// // //         </Pressable>
// // //       </View>

// // //       <Text className="text-slate-400 text-sm mb-4">
// // //         {activeSession ? `Active: ${activeSession.id}` : "No active session"}
// // //       </Text>

// // //       <TextInput
// // //         value={balance}
// // //         onChangeText={setBalance}
// // //         keyboardType="decimal-pad"
// // //         placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
// // //         placeholderTextColor="#64748b"
// // //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// // //       />
// // //       <TextInput
// // //         value={notes}
// // //         onChangeText={setNotes}
// // //         placeholder="Notes"
// // //         placeholderTextColor="#64748b"
// // //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// // //         multiline
// // //         numberOfLines={3}
// // //       />
// // //       <View className="flex-row gap-3">
// // //         <ActionButton
// // //           title="Cancel"
// // //           icon="close"
// // //           accent="rose"
// // //           onPress={onClose}
// // //         />
// // //         <ActionButton
// // //           title={mode === "open" ? "Open" : "Close"}
// // //           icon="schedule"
// // //           accent="emerald"
// // //           onPress={async () => {
// // //             if (mode === "open") await onOpen(balance, notes);
// // //             else await onCloseSession(balance, notes);
// // //           }}
// // //         />
// // //       </View>
// // //     </SafeAreaView>
// // //   );
// // // }

// // // // ============================================
// // // // ROLE SELECTOR
// // // // ============================================

// // // function RoleSelector({
// // //   value,
// // //   onChange,
// // // }: {
// // //   value: string;
// // //   onChange: (role: string) => void;
// // // }) {
// // //   const roles = [
// // //     { label: "Admin", value: "ADMIN", description: "Full system access" },
// // //     {
// // //       label: "Manager",
// // //       value: "MANAGER",
// // //       description: "Manage store operations",
// // //     },
// // //     {
// // //       label: "Cashier",
// // //       value: "CASHIER",
// // //       description: "Process sales and transactions",
// // //     },
// // //     {
// // //       label: "Accountant",
// // //       value: "ACCOUNTANT",
// // //       description: "Financial and reporting access",
// // //     },
// // //   ];

// // //   const [showDropdown, setShowDropdown] = useState(false);
// // //   const selectedRole = roles.find((r) => r.value === value);

// // //   return (
// // //     <View className="mb-4">
// // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //         Role
// // //       </Text>
// // //       <Pressable
// // //         onPress={() => setShowDropdown(!showDropdown)}
// // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // //       >
// // //         <View className="flex-row items-center justify-between">
// // //           <Text
// // //             className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
// // //           >
// // //             {selectedRole ? selectedRole.label : "Select a role..."}
// // //           </Text>
// // //           <MaterialIcons
// // //             name={showDropdown ? "expand-less" : "expand-more"}
// // //             size={24}
// // //             color="#64748b"
// // //           />
// // //         </View>
// // //       </Pressable>

// // //       {showDropdown && (
// // //         <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // //           <ScrollView className="max-h-48" nestedScrollEnabled>
// // //             {roles.map((role) => (
// // //               <Pressable
// // //                 key={role.value}
// // //                 onPress={() => {
// // //                   onChange(role.value);
// // //                   setShowDropdown(false);
// // //                 }}
// // //                 className={`rounded-xl px-4 py-3 ${
// // //                   value === role.value ? "bg-emerald-500/20" : ""
// // //                 }`}
// // //               >
// // //                 <Text className="text-white">{role.label}</Text>
// // //                 <Text className="text-xs text-slate-400">
// // //                   {role.description}
// // //                 </Text>
// // //               </Pressable>
// // //             ))}
// // //           </ScrollView>
// // //         </View>
// // //       )}
// // //     </View>
// // //   );
// // // }

// // // function getDefaultPermissions(role: string): string[] {
// // //   const permissions = {
// // //     ADMIN: [
// // //       "VIEW_REPORTS",
// // //       "EDIT_PRICES",
// // //       "MANAGE_STAFF",
// // //       "MANAGE_PRODUCTS",
// // //       "VIEW_SALES",
// // //       "MANAGE_CUSTOMERS",
// // //       "EDIT_INVENTORY",
// // //     ],
// // //     MANAGER: [
// // //       "VIEW_REPORTS",
// // //       "EDIT_PRICES",
// // //       "MANAGE_PRODUCTS",
// // //       "VIEW_SALES",
// // //       "MANAGE_CUSTOMERS",
// // //     ],
// // //     CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
// // //     ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
// // //   };
// // //   return permissions[role as keyof typeof permissions] || [];
// // // }

// // // // ============================================
// // // // STORE SELECTOR
// // // // ============================================

// // // function StoreSelector({
// // //   value,
// // //   onChange,
// // //   stores,
// // //   label = "Store",
// // // }: {
// // //   value: string;
// // //   onChange: (storeId: string, storeName: string) => void;
// // //   stores: any[];
// // //   label?: string;
// // // }) {
// // //   const [showDropdown, setShowDropdown] = useState(false);
// // //   const [searchText, setSearchText] = useState("");

// // //   const filteredStores = useMemo(() => {
// // //     if (!searchText.trim()) return stores;
// // //     return stores.filter(
// // //       (store) =>
// // //         store.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // //         store.code?.toLowerCase().includes(searchText.toLowerCase()),
// // //     );
// // //   }, [stores, searchText]);

// // //   const selectedStore = stores.find((store) => store.id === value);

// // //   return (
// // //     <View className="mb-4">
// // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //         {label}
// // //       </Text>
// // //       <Pressable
// // //         onPress={() => setShowDropdown(!showDropdown)}
// // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // //       >
// // //         <View className="flex-row items-center justify-between">
// // //           <Text
// // //             className={`text-base ${selectedStore ? "text-white" : "text-slate-400"}`}
// // //           >
// // //             {selectedStore ? selectedStore.name : "Select a store..."}
// // //           </Text>
// // //           <MaterialIcons
// // //             name={showDropdown ? "expand-less" : "expand-more"}
// // //             size={24}
// // //             color="#64748b"
// // //           />
// // //         </View>
// // //       </Pressable>

// // //       {showDropdown && (
// // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // //           <TextInput
// // //             value={searchText}
// // //             onChangeText={setSearchText}
// // //             placeholder="Search stores..."
// // //             placeholderTextColor="#64748b"
// // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // //           />
// // //           <ScrollView
// // //             className="max-h-48"
// // //             showsVerticalScrollIndicator={true}
// // //             nestedScrollEnabled={true}
// // //           >
// // //             {filteredStores.length > 0 ? (
// // //               filteredStores.map((store) => (
// // //                 <Pressable
// // //                   key={store.id}
// // //                   onPress={() => {
// // //                     onChange(store.id, store.name);
// // //                     setShowDropdown(false);
// // //                     setSearchText("");
// // //                   }}
// // //                   className={`rounded-xl px-4 py-3 ${
// // //                     value === store.id ? "bg-emerald-500/20" : ""
// // //                   }`}
// // //                 >
// // //                   <Text className="text-white">{store.name}</Text>
// // //                   <Text className="text-xs text-slate-400">
// // //                     {store.code} • {store.address || "No address"}
// // //                   </Text>
// // //                 </Pressable>
// // //               ))
// // //             ) : (
// // //               <Text className="py-4 text-center text-slate-400">
// // //                 No stores found
// // //               </Text>
// // //             )}
// // //           </ScrollView>
// // //         </View>
// // //       )}
// // //     </View>
// // //   );
// // // }

// // // // ============================================
// // // // CATEGORY SELECTOR
// // // // ============================================

// // // function CategorySelector({
// // //   value,
// // //   onChange,
// // //   categories,
// // //   onAddCategory,
// // //   label = "Category",
// // // }: {
// // //   value: string;
// // //   onChange: (categoryId: string, categoryName: string) => void;
// // //   categories: any[];
// // //   onAddCategory: () => void;
// // //   label?: string;
// // // }) {
// // //   const [showDropdown, setShowDropdown] = useState(false);
// // //   const [searchText, setSearchText] = useState("");

// // //   const filteredCategories = useMemo(() => {
// // //     if (!searchText.trim()) return categories;
// // //     return categories.filter((cat) =>
// // //       cat.name.toLowerCase().includes(searchText.toLowerCase()),
// // //     );
// // //   }, [categories, searchText]);

// // //   const selectedCategory = categories.find((cat) => cat.id === value);

// // //   return (
// // //     <View className="mb-4">
// // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //         {label}
// // //       </Text>

// // //       <Pressable
// // //         onPress={() => setShowDropdown(!showDropdown)}
// // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // //       >
// // //         <View className="flex-row items-center justify-between">
// // //           <Text
// // //             className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
// // //           >
// // //             {selectedCategory ? selectedCategory.name : "Select a category..."}
// // //           </Text>
// // //           <MaterialIcons
// // //             name={showDropdown ? "expand-less" : "expand-more"}
// // //             size={24}
// // //             color="#64748b"
// // //           />
// // //         </View>
// // //       </Pressable>

// // //       {showDropdown && (
// // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // //           <TextInput
// // //             value={searchText}
// // //             onChangeText={setSearchText}
// // //             placeholder="Search categories..."
// // //             placeholderTextColor="#64748b"
// // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // //           />

// // //           <ScrollView
// // //             className="max-h-48"
// // //             showsVerticalScrollIndicator={true}
// // //             nestedScrollEnabled={true}
// // //           >
// // //             {filteredCategories.length > 0 ? (
// // //               filteredCategories.map((item) => (
// // //                 <Pressable
// // //                   key={item.id}
// // //                   onPress={() => {
// // //                     onChange(item.id, item.name);
// // //                     setShowDropdown(false);
// // //                     setSearchText("");
// // //                   }}
// // //                   className={`rounded-xl px-4 py-3 ${
// // //                     value === item.id ? "bg-emerald-500/20" : ""
// // //                   }`}
// // //                 >
// // //                   <Text className="text-white">{item.name}</Text>
// // //                   {item.description && (
// // //                     <Text className="text-xs text-slate-400">
// // //                       {item.description}
// // //                     </Text>
// // //                   )}
// // //                 </Pressable>
// // //               ))
// // //             ) : (
// // //               <View className="py-4">
// // //                 <Text className="text-center text-slate-400">
// // //                   No categories found
// // //                 </Text>
// // //                 {searchText.trim() && (
// // //                   <Pressable
// // //                     onPress={() => {
// // //                       onAddCategory();
// // //                       setShowDropdown(false);
// // //                       setSearchText("");
// // //                     }}
// // //                     className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
// // //                   >
// // //                     <Text className="text-center text-emerald-200">
// // //                       Create "{searchText.trim()}"
// // //                     </Text>
// // //                   </Pressable>
// // //                 )}
// // //               </View>
// // //             )}
// // //           </ScrollView>
// // //         </View>
// // //       )}
// // //     </View>
// // //   );
// // // }

// // // // ============================================
// // // // BRAND SELECTOR
// // // // ============================================

// // // function BrandSelector({
// // //   value,
// // //   onChange,
// // //   brands,
// // //   onAddBrand,
// // //   label = "Brand",
// // // }: {
// // //   value: string;
// // //   onChange: (brandId: string, brandName: string) => void;
// // //   brands: any[];
// // //   onAddBrand: () => void;
// // //   label?: string;
// // // }) {
// // //   const [showDropdown, setShowDropdown] = useState(false);
// // //   const [searchText, setSearchText] = useState("");

// // //   const filteredBrands = useMemo(() => {
// // //     if (!searchText.trim()) return brands;
// // //     return brands.filter((brand) =>
// // //       brand.name.toLowerCase().includes(searchText.toLowerCase()),
// // //     );
// // //   }, [brands, searchText]);

// // //   const selectedBrand = brands.find((brand) => brand.id === value);

// // //   return (
// // //     <View className="mb-4">
// // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //         {label}
// // //       </Text>

// // //       <Pressable
// // //         onPress={() => setShowDropdown(!showDropdown)}
// // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // //       >
// // //         <View className="flex-row items-center justify-between">
// // //           <Text
// // //             className={`text-base ${selectedBrand ? "text-white" : "text-slate-400"}`}
// // //           >
// // //             {selectedBrand ? selectedBrand.name : "Select a brand..."}
// // //           </Text>
// // //           <MaterialIcons
// // //             name={showDropdown ? "expand-less" : "expand-more"}
// // //             size={24}
// // //             color="#64748b"
// // //           />
// // //         </View>
// // //       </Pressable>

// // //       {showDropdown && (
// // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // //           <TextInput
// // //             value={searchText}
// // //             onChangeText={setSearchText}
// // //             placeholder="Search brands..."
// // //             placeholderTextColor="#64748b"
// // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // //           />

// // //           <ScrollView
// // //             className="max-h-48"
// // //             showsVerticalScrollIndicator={true}
// // //             nestedScrollEnabled={true}
// // //           >
// // //             {filteredBrands.length > 0 ? (
// // //               filteredBrands.map((item) => (
// // //                 <Pressable
// // //                   key={item.id}
// // //                   onPress={() => {
// // //                     onChange(item.id, item.name);
// // //                     setShowDropdown(false);
// // //                     setSearchText("");
// // //                   }}
// // //                   className={`rounded-xl px-4 py-3 ${
// // //                     value === item.id ? "bg-purple-500/20" : ""
// // //                   }`}
// // //                 >
// // //                   <Text className="text-white">{item.name}</Text>
// // //                   {item.description && (
// // //                     <Text className="text-xs text-slate-400">
// // //                       {item.description}
// // //                     </Text>
// // //                   )}
// // //                 </Pressable>
// // //               ))
// // //             ) : (
// // //               <View className="py-4">
// // //                 <Text className="text-center text-slate-400">
// // //                   No brands found
// // //                 </Text>
// // //                 {searchText.trim() && (
// // //                   <Pressable
// // //                     onPress={() => {
// // //                       onAddBrand();
// // //                       setShowDropdown(false);
// // //                       setSearchText("");
// // //                     }}
// // //                     className="mt-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3"
// // //                   >
// // //                     <Text className="text-center text-purple-200">
// // //                       Create "{searchText.trim()}"
// // //                     </Text>
// // //                   </Pressable>
// // //                 )}
// // //               </View>
// // //             )}
// // //           </ScrollView>
// // //         </View>
// // //       )}
// // //     </View>
// // //   );
// // // }

// // // // ============================================
// // // // SUPPLIER SELECTOR
// // // // ============================================

// // // function SupplierSelector({
// // //   value,
// // //   onChange,
// // //   suppliers,
// // //   label = "Supplier",
// // // }: {
// // //   value: string;
// // //   onChange: (supplierId: string, supplierName: string) => void;
// // //   suppliers: any[];
// // //   label?: string;
// // // }) {
// // //   const [showDropdown, setShowDropdown] = useState(false);
// // //   const [searchText, setSearchText] = useState("");

// // //   const filteredSuppliers = useMemo(() => {
// // //     if (!searchText.trim()) return suppliers;
// // //     return suppliers.filter(
// // //       (sup) =>
// // //         sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // //         sup.code?.toLowerCase().includes(searchText.toLowerCase()),
// // //     );
// // //   }, [suppliers, searchText]);

// // //   const selectedSupplier = suppliers.find((sup) => sup.id === value);

// // //   return (
// // //     <View className="mb-4">
// // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //         {label}
// // //       </Text>

// // //       <Pressable
// // //         onPress={() => setShowDropdown(!showDropdown)}
// // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // //       >
// // //         <View className="flex-row items-center justify-between">
// // //           <Text
// // //             className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
// // //           >
// // //             {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
// // //           </Text>
// // //           <MaterialIcons
// // //             name={showDropdown ? "expand-less" : "expand-more"}
// // //             size={24}
// // //             color="#64748b"
// // //           />
// // //         </View>
// // //       </Pressable>

// // //       {showDropdown && (
// // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // //           <TextInput
// // //             value={searchText}
// // //             onChangeText={setSearchText}
// // //             placeholder="Search suppliers..."
// // //             placeholderTextColor="#64748b"
// // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // //           />

// // //           <ScrollView
// // //             className="max-h-48"
// // //             showsVerticalScrollIndicator={true}
// // //             nestedScrollEnabled={true}
// // //           >
// // //             {filteredSuppliers.length > 0 ? (
// // //               filteredSuppliers.map((item) => (
// // //                 <Pressable
// // //                   key={item.id}
// // //                   onPress={() => {
// // //                     onChange(item.id, item.name);
// // //                     setShowDropdown(false);
// // //                     setSearchText("");
// // //                   }}
// // //                   className={`rounded-xl px-4 py-3 ${
// // //                     value === item.id ? "bg-emerald-500/20" : ""
// // //                   }`}
// // //                 >
// // //                   <Text className="text-white">{item.name}</Text>
// // //                   <Text className="text-xs text-slate-400">
// // //                     {item.code} • {item.phone || "No phone"}
// // //                   </Text>
// // //                 </Pressable>
// // //               ))
// // //             ) : (
// // //               <Text className="py-4 text-center text-slate-400">
// // //                 No suppliers found
// // //               </Text>
// // //             )}
// // //           </ScrollView>
// // //         </View>
// // //       )}
// // //     </View>
// // //   );
// // // }

// // // // ============================================
// // // // FIELD COMPONENT
// // // // ============================================

// // // function Field({
// // //   label,
// // //   value,
// // //   onChangeText,
// // //   secureTextEntry = false,
// // //   keyboardType = "default",
// // //   multiline = false,
// // //   placeholder,
// // // }: {
// // //   label: string;
// // //   value: string;
// // //   onChangeText: (value: string) => void;
// // //   secureTextEntry?: boolean;
// // //   keyboardType?:
// // //     | "default"
// // //     | "decimal-pad"
// // //     | "numeric"
// // //     | "email-address"
// // //     | "phone-pad";
// // //   multiline?: boolean;
// // //   placeholder?: string;
// // // }) {
// // //   return (
// // //     <View className="mb-4">
// // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // //         {label}
// // //       </Text>
// // //       <TextInput
// // //         value={value}
// // //         onChangeText={onChangeText}
// // //         placeholder={placeholder || label}
// // //         placeholderTextColor="#64748b"
// // //         secureTextEntry={secureTextEntry}
// // //         keyboardType={keyboardType}
// // //         multiline={multiline}
// // //         numberOfLines={multiline ? 3 : 1}
// // //         className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
// // //           multiline ? "min-h-[100px] text-left align-top" : ""
// // //         }`}
// // //       />
// // //     </View>
// // //   );
// // // }

// // // // ============================================
// // // // DEFAULT FIELDS
// // // // ============================================

// // // function getDefaultFields(moduleKey: ModuleKey) {
// // //   if (moduleKey === "staff")
// // //     return {
// // //       username: "",
// // //       name: "",
// // //       email: "",
// // //       password: "",
// // //       role: "CASHIER",
// // //       permissions: [],
// // //       storeId: "",
// // //     };
// // //   if (moduleKey === "products")
// // //     return {
// // //       sku: "",
// // //       barcode: "",
// // //       name: "",
// // //       description: "",
// // //       brandId: "",
// // //       brand: "",
// // //       costPrice: 0,
// // //       sellingPrice: 0,
// // //       wholesalePrice: 0,
// // //       categoryId: "",
// // //       categoryName: "",
// // //       manufacturingDate: "",
// // //       expiryDate: "",
// // //       supplierId: "",
// // //       initialStock: 0,
// // //       variants: [],
// // //     };
// // //   if (moduleKey === "stores")
// // //     return {
// // //       code: "",
// // //       name: "",
// // //       address: "",
// // //       phone: "",
// // //       email: "",
// // //       taxNumber: "",
// // //     };
// // //   if (moduleKey === "categories")
// // //     return { name: "", slug: "", description: "" };
// // //   if (moduleKey === "brands") return { name: "", description: "" };
// // //   if (moduleKey === "customers")
// // //     return {
// // //       name: "",
// // //       phone: "",
// // //       email: "",
// // //       address: "",
// // //       dateOfBirth: "",
// // //       gender: "",
// // //     };
// // //   if (moduleKey === "suppliers")
// // //     return {
// // //       name: "",
// // //       code: "",
// // //       contactName: "",
// // //       phone: "",
// // //       email: "",
// // //       address: "",
// // //       taxNumber: "",
// // //       paymentTerms: "",
// // //       creditLimit: "",
// // //     };
// // //   return {};
// // // }

// // // // ============================================
// // // // BUILD PAYLOAD
// // // // ============================================

// // // function buildPayload(
// // //   moduleKey: ModuleKey,
// // //   values: Record<string, any>,
// // //   currentStoreId: string | null,
// // // ) {
// // //   if (moduleKey === "staff") {
// // //     const payload: any = {
// // //       username: String(values.username ?? "").trim(),
// // //       email: String(values.email ?? "").trim() || undefined,
// // //       name: String(values.name ?? "").trim(),
// // //       role: values.role ?? "CASHIER",
// // //       permissions: Array.isArray(values.permissions) ? values.permissions : [],
// // //       isActive: values.isActive ?? true,
// // //       storeId: values.storeId || currentStoreId || undefined,
// // //     };
// // //     if (values.password && String(values.password).trim()) {
// // //       payload.password = String(values.password).trim();
// // //     }
// // //     return payload;
// // //   }

// // //   if (moduleKey === "products") {
// // //     const payload: any = {
// // //       tenantId: "default",
// // //       sku: String(values.sku ?? "").trim() || undefined,
// // //       barcode: String(values.barcode ?? "").trim() || undefined,
// // //       name: String(values.name ?? "").trim(),
// // //       description: String(values.description ?? "").trim() || undefined,
// // //       brandId: String(values.brandId ?? "").trim() || undefined,
// // //       costPrice: Number(values.costPrice ?? 0),
// // //       sellingPrice: Number(values.sellingPrice ?? 0),
// // //       wholesalePrice: Number(values.wholesalePrice ?? 0),
// // //       categoryId: String(values.categoryId ?? "").trim() || undefined,
// // //       categoryName: String(values.categoryName ?? "").trim() || undefined,
// // //       manufacturingDate:
// // //         String(values.manufacturingDate ?? "").trim() || undefined,
// // //       expiryDate: String(values.expiryDate ?? "").trim() || undefined,
// // //       supplierId: String(values.supplierId ?? "").trim() || undefined,
// // //       storeId: currentStoreId || undefined,
// // //       initialStock: values.initialStock
// // //         ? Number(values.initialStock)
// // //         : undefined,
// // //     };
// // //     Object.keys(payload).forEach((key) => {
// // //       if (payload[key] === undefined) delete payload[key];
// // //     });
// // //     return payload;
// // //   }

// // //   if (moduleKey === "stores") {
// // //     return {
// // //       tenantId: "default",
// // //       code: String(values.code ?? "").trim() || undefined,
// // //       name: String(values.name ?? "").trim(),
// // //       address: String(values.address ?? "").trim() || undefined,
// // //       phone: String(values.phone ?? "").trim() || undefined,
// // //       email: String(values.email ?? "").trim() || undefined,
// // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // //       isActive: values.isActive ?? true,
// // //     };
// // //   }

// // //   if (moduleKey === "categories") {
// // //     return {
// // //       tenantId: "default",
// // //       name: String(values.name ?? "").trim(),
// // //       slug: String(values.slug ?? "").trim(),
// // //       description: String(values.description ?? "").trim() || undefined,
// // //       storeId: currentStoreId || undefined,
// // //       isActive: values.isActive ?? true,
// // //     };
// // //   }

// // //   if (moduleKey === "brands") {
// // //     return {
// // //       tenantId: "default",
// // //       name: String(values.name ?? "").trim(),
// // //       description: String(values.description ?? "").trim() || undefined,
// // //       isActive: values.isActive ?? true,
// // //     };
// // //   }

// // //   if (moduleKey === "customers") {
// // //     return {
// // //       tenantId: "default",
// // //       name: String(values.name ?? "").trim(),
// // //       phone: String(values.phone ?? "").trim() || undefined,
// // //       email: String(values.email ?? "").trim() || undefined,
// // //       address: String(values.address ?? "").trim() || undefined,
// // //       dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
// // //       gender: String(values.gender ?? "").trim() || undefined,
// // //     };
// // //   }

// // //   if (moduleKey === "suppliers") {
// // //     return {
// // //       tenantId: "default",
// // //       name: String(values.name ?? "").trim(),
// // //       code: String(values.code ?? "").trim() || undefined,
// // //       contactName: String(values.contactName ?? "").trim() || undefined,
// // //       phone: String(values.phone ?? "").trim() || undefined,
// // //       email: String(values.email ?? "").trim() || undefined,
// // //       address: String(values.address ?? "").trim() || undefined,
// // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // //       paymentTerms: values.paymentTerms
// // //         ? Number(values.paymentTerms)
// // //         : undefined,
// // //       creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
// // //       storeId: currentStoreId || undefined,
// // //       isActive: values.isActive ?? true,
// // //     };
// // //   }

// // //   return values;
// // // }

// // // // // ============================================
// // // // // FILE: app/(tabs)/manage.tsx
// // // // // ============================================

// // // // import {
// // // //   ActionButton,
// // // //   Card,
// // // //   Header,
// // // //   MetricCard,
// // // //   Pill,
// // // //   RowItem,
// // // //   Screen,
// // // //   SectionTitle,
// // // // } from "@/components/app-ui";
// // // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // // // import { logout, setStore } from "@/services/features/auth/authSlice";
// // // // import { resetOfflineState } from "@/services/features/offline/offlineSlice";
// // // // import { clearOfflineDatabase } from "@/services/offline/db";
// // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // import { useEffect, useMemo, useState } from "react";
// // // // import {
// // // //   ActivityIndicator,
// // // //   Alert,
// // // //   Modal,
// // // //   Pressable,
// // // //   ScrollView,
// // // //   Text,
// // // //   TextInput,
// // // //   View,
// // // // } from "react-native";
// // // // import { SafeAreaView } from "react-native-safe-area-context";

// // // // // ✅ Offline-first local APIs
// // // // import {
// // // //   useCloseLocalSessionMutation,
// // // //   useCreateLocalBrandMutation,
// // // //   useCreateLocalCategoryMutation,
// // // //   useCreateLocalCustomerMutation,
// // // //   useCreateLocalProductMutation,
// // // //   useCreateLocalStaffMutation,
// // // //   useCreateLocalStoreMutation,
// // // //   useCreateLocalSupplierMutation,
// // // //   useDeleteLocalBrandMutation,
// // // //   useDeleteLocalCategoryMutation,
// // // //   useDeleteLocalCustomerMutation,
// // // //   useDeleteLocalProductMutation,
// // // //   useDeleteLocalStaffMutation,
// // // //   useDeleteLocalStoreMutation,
// // // //   useDeleteLocalSupplierMutation,
// // // //   useGetActiveSessionQuery,
// // // //   useGetLocalBrandsQuery,
// // // //   useGetLocalCategoriesQuery,
// // // //   useGetLocalCustomersQuery,
// // // //   useGetLocalProductsQuery,
// // // //   useGetLocalStaffQuery,
// // // //   useGetLocalStoresQuery,
// // // //   useGetLocalSuppliersQuery,
// // // //   useOpenLocalSessionMutation,
// // // //   useUpdateLocalBrandMutation,
// // // //   useUpdateLocalCategoryMutation,
// // // //   useUpdateLocalCustomerMutation,
// // // //   useUpdateLocalProductMutation,
// // // //   useUpdateLocalStaffMutation,
// // // //   useUpdateLocalStoreMutation,
// // // //   useUpdateLocalSupplierMutation,
// // // //   // ✅ Import inventory queries
// // // //   useGetLocalInventoryQuery,
// // // //   useGetLocalInventoryMovementsQuery,
// // // // } from "@/services/features/offline/localApi";

// // // // type ModuleKey =
// // // //   | "staff"
// // // //   | "products"
// // // //   | "stores"
// // // //   | "categories"
// // // //   | "customers"
// // // //   | "suppliers"
// // // //   | "sessions"
// // // //   | "brands"
// // // //   | "inventory"; // ✅ ADDED

// // // // export default function ManageScreen() {
// // // //   const dispatch = useAppDispatch();
// // // //   const { user, currentStoreId } = useAppSelector((state) => state.auth);
// // // //   const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
// // // //   const [editor, setEditor] = useState<{
// // // //     open: boolean;
// // // //     mode: "create" | "edit";
// // // //     item?: any;
// // // //   }>({ open: false, mode: "create" });

// // // //   const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
// // // //     null,
// // // //   );

// // // //   // ✅ Queries
// // // //   const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
// // // //     storeId: currentStoreId || undefined,
// // // //   });
// // // //   const { data: products = [], refetch: refetchProducts } =
// // // //     useGetLocalProductsQuery({
// // // //       storeId: currentStoreId || undefined,
// // // //     });
// // // //   const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
// // // //     {},
// // // //   );
// // // //   const { data: categories = [], refetch: refetchCategories } =
// // // //     useGetLocalCategoriesQuery({
// // // //       storeId: currentStoreId || undefined,
// // // //     });
// // // //   const { data: customers = [], refetch: refetchCustomers } =
// // // //     useGetLocalCustomersQuery({});
// // // //   const { data: suppliers = [], refetch: refetchSuppliers } =
// // // //     useGetLocalSuppliersQuery({
// // // //       storeId: currentStoreId || undefined,
// // // //     });
// // // //   const { data: brands = [], refetch: refetchBrands } = useGetLocalBrandsQuery(
// // // //     {},
// // // //   );
// // // //   const { data: activeSession, refetch: refetchSession } =
// // // //     useGetActiveSessionQuery(
// // // //       { userId: user?.id || "", storeId: currentStoreId || undefined },
// // // //       { skip: !user?.id },
// // // //     );

// // // //   // ✅ Inventory Queries
// // // //   const { data: inventory = [], refetch: refetchInventory } =
// // // //     useGetLocalInventoryQuery({
// // // //       storeId: currentStoreId || undefined,
// // // //     });
// // // //   const { data: inventoryMovements = [], refetch: refetchInventoryMovements } =
// // // //     useGetLocalInventoryMovementsQuery({
// // // //       storeId: currentStoreId || undefined,
// // // //     });

// // // //   // ✅ Mutations
// // // //   const [createStaff] = useCreateLocalStaffMutation();
// // // //   const [updateStaff] = useUpdateLocalStaffMutation();
// // // //   const [deleteStaff] = useDeleteLocalStaffMutation();

// // // //   const [createProduct] = useCreateLocalProductMutation();
// // // //   const [updateProduct] = useUpdateLocalProductMutation();
// // // //   const [deleteProduct] = useDeleteLocalProductMutation();

// // // //   const [createStore] = useCreateLocalStoreMutation();
// // // //   const [updateStore] = useUpdateLocalStoreMutation();
// // // //   const [deleteStore] = useDeleteLocalStoreMutation();

// // // //   const [createCategory] = useCreateLocalCategoryMutation();
// // // //   const [updateCategory] = useUpdateLocalCategoryMutation();
// // // //   const [deleteCategory] = useDeleteLocalCategoryMutation();

// // // //   const [createCustomer] = useCreateLocalCustomerMutation();
// // // //   const [updateCustomer] = useUpdateLocalCustomerMutation();
// // // //   const [deleteCustomer] = useDeleteLocalCustomerMutation();

// // // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // // //   const [updateSupplier] = useUpdateLocalSupplierMutation();
// // // //   const [deleteSupplier] = useDeleteLocalSupplierMutation();

// // // //   const [createBrand] = useCreateLocalBrandMutation();
// // // //   const [updateBrand] = useUpdateLocalBrandMutation();
// // // //   const [deleteBrand] = useDeleteLocalBrandMutation();

// // // //   const [openSession] = useOpenLocalSessionMutation();
// // // //   const [closeSession] = useCloseLocalSessionMutation();

// // // //   const refetchers = {
// // // //     staff: refetchStaff,
// // // //     products: refetchProducts,
// // // //     stores: refetchStores,
// // // //     categories: refetchCategories,
// // // //     customers: refetchCustomers,
// // // //     suppliers: refetchSuppliers,
// // // //     brands: refetchBrands,
// // // //     sessions: refetchSession,
// // // //     inventory: refetchInventory,
// // // //   } as const;

// // // //   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

// // // //   const storeOptions = useMemo(() => stores, [stores]);

// // // //   // ✅ Sign Out Handler
// // // //   const handleSignOut = async () => {
// // // //     Alert.alert(
// // // //       "Sign Out",
// // // //       "Are you sure you want to sign out? Offline data will be cleared.",
// // // //       [
// // // //         { text: "Cancel", style: "cancel" },
// // // //         {
// // // //           text: "Sign Out",
// // // //           style: "destructive",
// // // //           onPress: async () => {
// // // //             try {
// // // //               await clearOfflineDatabase();
// // // //               dispatch(resetOfflineState());
// // // //               dispatch(logout());
// // // //             } catch (error) {
// // // //               Alert.alert("Error", "Failed to sign out.");
// // // //             }
// // // //           },
// // // //         },
// // // //       ],
// // // //     );
// // // //   };

// // // //   if (!isPrivileged) {
// // // //     return (
// // // //       <Screen>
// // // //         <SafeAreaView className="flex-1">
// // // //           <View className="flex-1 items-center justify-center px-6">
// // // //             <Pill label="Restricted" tone="rose" />
// // // //             <Text className="mt-4 text-3xl font-black text-white">
// // // //               Management locked
// // // //             </Text>
// // // //             <Text className="mt-3 text-center text-sm text-slate-300">
// // // //               Your account does not have access to staff, product, or store
// // // //               management.
// // // //             </Text>
// // // //           </View>
// // // //         </SafeAreaView>
// // // //       </Screen>
// // // //     );
// // // //   }

// // // //   // ✅ Summary with Inventory
// // // //   const summary = [
// // // //     {
// // // //       label: "Staff",
// // // //       value: String(staff.length),
// // // //       icon: "groups" as const,
// // // //       tone: "sky" as const,
// // // //     },
// // // //     {
// // // //       label: "Products",
// // // //       value: String(products.length),
// // // //       icon: "inventory-2" as const,
// // // //       tone: "emerald" as const,
// // // //     },
// // // //     {
// // // //       label: "Stores",
// // // //       value: String(stores.length),
// // // //       icon: "store" as const,
// // // //       tone: "amber" as const,
// // // //     },
// // // //     {
// // // //       label: "Customers",
// // // //       value: String(customers.length),
// // // //       icon: "person" as const,
// // // //       tone: "rose" as const,
// // // //     },
// // // //     {
// // // //       label: "Brands",
// // // //       value: String(brands.length),
// // // //       icon: "branding-watermark" as const,
// // // //       tone: "purple" as const,
// // // //     },
// // // //     {
// // // //       label: "Inventory",
// // // //       value: String(inventory.length),
// // // //       icon: "inventory" as const,
// // // //       tone: "sky" as const,
// // // //     },
// // // //   ];

// // // //   const list = getModuleList({
// // // //     moduleKey,
// // // //     staff,
// // // //     products,
// // // //     stores,
// // // //     categories,
// // // //     customers,
// // // //     suppliers,
// // // //     brands,
// // // //     activeSession,
// // // //     inventory, // ✅ ADDED
// // // //     inventoryMovements, // ✅ ADDED
// // // //   });

// // // //   const handleSave = async (values: Record<string, any>) => {
// // // //     try {
// // // //       const nextValues = buildPayload(moduleKey, values, currentStoreId);

// // // //       if (moduleKey === "staff") {
// // // //         if (editor.mode === "create") await createStaff(nextValues).unwrap();
// // // //         else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       } else if (moduleKey === "products") {
// // // //         if (editor.mode === "create") await createProduct(nextValues).unwrap();
// // // //         else
// // // //           await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       } else if (moduleKey === "stores") {
// // // //         if (editor.mode === "create") await createStore(nextValues).unwrap();
// // // //         else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       } else if (moduleKey === "categories") {
// // // //         if (editor.mode === "create") await createCategory(nextValues).unwrap();
// // // //         else
// // // //           await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       } else if (moduleKey === "customers") {
// // // //         if (editor.mode === "create") await createCustomer(nextValues).unwrap();
// // // //         else
// // // //           await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       } else if (moduleKey === "suppliers") {
// // // //         if (editor.mode === "create") await createSupplier(nextValues).unwrap();
// // // //         else
// // // //           await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       } else if (moduleKey === "brands") {
// // // //         if (editor.mode === "create") await createBrand(nextValues).unwrap();
// // // //         else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
// // // //       }

// // // //       await refetchers[moduleKey]();
// // // //       setEditor({ open: false, mode: "create" });
// // // //     } catch (error: any) {
// // // //       Alert.alert(
// // // //         "Save failed",
// // // //         error?.data?.message || "Unable to save changes.",
// // // //       );
// // // //     }
// // // //   };

// // // //   const handleDelete = async (item: any) => {
// // // //     try {
// // // //       if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
// // // //       else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
// // // //       else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
// // // //       else if (moduleKey === "categories")
// // // //         await deleteCategory(item.id).unwrap();
// // // //       else if (moduleKey === "customers")
// // // //         await deleteCustomer(item.id).unwrap();
// // // //       else if (moduleKey === "suppliers")
// // // //         await deleteSupplier(item.id).unwrap();
// // // //       else if (moduleKey === "brands") await deleteBrand(item.id).unwrap();
// // // //       await refetchers[moduleKey]();
// // // //     } catch (error: any) {
// // // //       Alert.alert(
// // // //         "Delete failed",
// // // //         error?.data?.message || "Unable to delete item.",
// // // //       );
// // // //     }
// // // //   };

// // // //   const openEditor = (mode: "create" | "edit", item?: any) => {
// // // //     setEditor({ open: true, mode, item });
// // // //   };

// // // //   return (
// // // //     <Screen>
// // // //       <SafeAreaView className="flex-1 bg-slate-950">
// // // //         <ScrollView
// // // //           showsVerticalScrollIndicator={false}
// // // //           contentContainerStyle={{ paddingBottom: 28 }}
// // // //           className="px-5"
// // // //         >
// // // //           <Header
// // // //             eyebrow="Administration"
// // // //             title="Management"
// // // //             subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, and session control from one place."
// // // //             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
// // // //           />

// // // //           <View className="mb-4 flex-row flex-wrap gap-3">
// // // //             {summary.map((item) => (
// // // //               <View key={item.label} className="w-[48.5%]">
// // // //                 <MetricCard
// // // //                   icon={item.icon}
// // // //                   label={item.label}
// // // //                   value={item.value}
// // // //                   tone={item.tone}
// // // //                 />
// // // //               </View>
// // // //             ))}
// // // //           </View>

// // // //           <Card className="mb-4">
// // // //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //               Store context
// // // //             </Text>
// // // //             <ScrollView
// // // //               horizontal
// // // //               showsHorizontalScrollIndicator={false}
// // // //               className="mt-3"
// // // //               contentContainerStyle={{ gap: 8 }}
// // // //             >
// // // //               {storeOptions.map((store: any) => {
// // // //                 const active = store.id === currentStoreId;
// // // //                 return (
// // // //                   <Pressable
// // // //                     key={store.id}
// // // //                     onPress={() => dispatch(setStore(store.id))}
// // // //                     className={`rounded-full border px-4 py-3 ${
// // // //                       active
// // // //                         ? "border-sky-400/30 bg-sky-500/15"
// // // //                         : "border-white/10 bg-white/5"
// // // //                     }`}
// // // //                   >
// // // //                     <Text
// // // //                       className={`text-xs font-bold uppercase tracking-[2px] ${
// // // //                         active ? "text-sky-200" : "text-slate-300"
// // // //                       }`}
// // // //                     >
// // // //                       {store.name}
// // // //                     </Text>
// // // //                   </Pressable>
// // // //                 );
// // // //               })}
// // // //             </ScrollView>
// // // //           </Card>

// // // //           <SectionTitle title="Modules" />
// // // //           <View className="mb-4 flex-row flex-wrap gap-2">
// // // //             {(
// // // //               [
// // // //                 "products",
// // // //                 "staff",
// // // //                 "stores",
// // // //                 "categories",
// // // //                 "customers",
// // // //                 "suppliers",
// // // //                 "brands",
// // // //                 "inventory", // ✅ ADDED
// // // //                 "sessions",
// // // //               ] as ModuleKey[]
// // // //             ).map((key) => (
// // // //               <Pressable
// // // //                 key={key}
// // // //                 onPress={() => setModuleKey(key)}
// // // //                 className={`rounded-full border px-4 py-3 ${
// // // //                   moduleKey === key
// // // //                     ? "border-emerald-400/30 bg-emerald-500/15"
// // // //                     : "border-white/10 bg-white/5"
// // // //                 }`}
// // // //               >
// // // //                 <Text
// // // //                   className={`text-xs font-bold uppercase tracking-[2px] ${
// // // //                     moduleKey === key ? "text-emerald-200" : "text-slate-300"
// // // //                   }`}
// // // //                 >
// // // //                   {key}
// // // //                 </Text>
// // // //               </Pressable>
// // // //             ))}
// // // //           </View>

// // // //           <View className="mb-4 flex-row gap-3">
// // // //             <ActionButton
// // // //               title="Add New"
// // // //               icon="add"
// // // //               accent="emerald"
// // // //               onPress={() => openEditor("create")}
// // // //             />
// // // //             {moduleKey === "sessions" ? (
// // // //               <ActionButton
// // // //                 title={activeSession ? "Close Session" : "Open Session"}
// // // //                 icon="schedule"
// // // //                 accent={activeSession ? "rose" : "sky"}
// // // //                 onPress={() =>
// // // //                   setSessionModal(activeSession ? "close" : "open")
// // // //                 }
// // // //               />
// // // //             ) : (
// // // //               <ActionButton
// // // //                 title="Refresh"
// // // //                 icon="refresh"
// // // //                 accent="sky"
// // // //                 onPress={() => refetchers[moduleKey]()}
// // // //               />
// // // //             )}
// // // //           </View>

// // // //           <SectionTitle
// // // //             title={`${moduleKey} list`}
// // // //             action="Tap an item to edit"
// // // //           />
// // // //           <Card>
// // // //             {list.length ? (
// // // //               list.map((item: any, index: number) => (
// // // //                 <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
// // // //                   <Pressable onPress={() => openEditor("edit", item)}>
// // // //                     <RowItem
// // // //                       title={item.name || item.username || item.code || item.id}
// // // //                       subtitle={getSubtitle(moduleKey, item)}
// // // //                       right={getRightLabel(moduleKey, item)}
// // // //                       icon={getIcon(moduleKey)}
// // // //                     />
// // // //                   </Pressable>
// // // //                   {index < list.length - 1 ? (
// // // //                     <View className="my-3 h-px bg-white/8" />
// // // //                   ) : null}
// // // //                 </View>
// // // //               ))
// // // //             ) : (
// // // //               <View className="py-8 items-center">
// // // //                 <View className="h-16 w-16 bg-white/5 rounded-full items-center justify-center border border-white/10">
// // // //                   <MaterialIcons name="inbox" size={28} color="#64748b" />
// // // //                 </View>
// // // //                 <Text className="text-slate-400 text-center text-sm mt-3">
// // // //                   No {moduleKey} found
// // // //                 </Text>
// // // //                 <Text className="text-slate-500 text-xs text-center mt-1">
// // // //                   Create one by tapping "Add New"
// // // //                 </Text>
// // // //               </View>
// // // //             )}
// // // //           </Card>

// // // //           {/* ✅ Sign Out Button */}
// // // //           <View className="mt-6 pt-4 border-t border-white/10">
// // // //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400 mb-3">
// // // //               Account
// // // //             </Text>
// // // //             <Pressable
// // // //               onPress={handleSignOut}
// // // //               className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 flex-row items-center justify-between"
// // // //             >
// // // //               <View className="flex-row items-center">
// // // //                 <View className="bg-rose-500/20 p-2 rounded-full">
// // // //                   <MaterialIcons name="logout" size={20} color="#f87171" />
// // // //                 </View>
// // // //                 <Text className="text-rose-400 font-semibold ml-3">
// // // //                   Sign Out
// // // //                 </Text>
// // // //               </View>
// // // //               <MaterialIcons name="chevron-right" size={20} color="#f87171" />
// // // //             </Pressable>
// // // //             <Text className="text-slate-500 text-[10px] mt-2 text-center">
// // // //               This will clear all offline data and return to login
// // // //             </Text>
// // // //           </View>
// // // //         </ScrollView>

// // // //         {/* Editor Modal */}
// // // //         <Modal
// // // //           visible={editor.open}
// // // //           animationType="slide"
// // // //           onRequestClose={() => setEditor({ open: false, mode: "create" })}
// // // //           transparent={true}
// // // //         >
// // // //           <View className="flex-1 bg-black/70">
// // // //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// // // //               <EditorModalContent
// // // //                 title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
// // // //                 moduleKey={moduleKey}
// // // //                 item={editor.item}
// // // //                 mode={editor.mode}
// // // //                 onClose={() => setEditor({ open: false, mode: "create" })}
// // // //                 onSave={handleSave}
// // // //                 onDelete={
// // // //                   editor.item ? () => handleDelete(editor.item) : undefined
// // // //                 }
// // // //                 currentStoreId={currentStoreId}
// // // //                 stores={stores}
// // // //                 categories={categories}
// // // //                 suppliers={suppliers}
// // // //                 brands={brands}
// // // //                 refetchCategories={refetchCategories}
// // // //                 refetchSuppliers={refetchSuppliers}
// // // //                 refetchBrands={refetchBrands}
// // // //               />
// // // //             </View>
// // // //           </View>
// // // //         </Modal>

// // // //         {/* Session Modal */}
// // // //         <Modal
// // // //           visible={sessionModal !== null}
// // // //           animationType="slide"
// // // //           onRequestClose={() => setSessionModal(null)}
// // // //           transparent={true}
// // // //         >
// // // //           <View className="flex-1 bg-black/70">
// // // //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// // // //               <SessionModalContent
// // // //                 mode={sessionModal}
// // // //                 activeSession={activeSession}
// // // //                 onClose={() => setSessionModal(null)}
// // // //                 onOpen={async (openingBalance, notes) => {
// // // //                   try {
// // // //                     await openSession({
// // // //                       userId: user?.id || "",
// // // //                       openingBalance: Number(openingBalance || 0),
// // // //                       notes,
// // // //                       storeId: currentStoreId || undefined,
// // // //                     }).unwrap();
// // // //                     setSessionModal(null);
// // // //                     await refetchSession();
// // // //                   } catch (error: any) {
// // // //                     Alert.alert(
// // // //                       "Open session failed",
// // // //                       error?.data?.message || "Unable to open session.",
// // // //                     );
// // // //                   }
// // // //                 }}
// // // //                 onCloseSession={async (closingBalance, notes) => {
// // // //                   try {
// // // //                     if (!activeSession) return;
// // // //                     await closeSession({
// // // //                       id: activeSession.id,
// // // //                       closingBalance: Number(closingBalance || 0),
// // // //                       expectedBalance: Number(closingBalance || 0),
// // // //                       discrepancy: 0,
// // // //                       cashSales: 0,
// // // //                       cardSales: 0,
// // // //                       digitalSales: 0,
// // // //                       notes,
// // // //                     }).unwrap();
// // // //                     setSessionModal(null);
// // // //                     await refetchSession();
// // // //                   } catch (error: any) {
// // // //                     Alert.alert(
// // // //                       "Close session failed",
// // // //                       error?.data?.message || "Unable to close session.",
// // // //                     );
// // // //                   }
// // // //                 }}
// // // //               />
// // // //             </View>
// // // //           </View>
// // // //         </Modal>
// // // //       </SafeAreaView>
// // // //     </Screen>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // HELPER FUNCTIONS - Updated for Inventory
// // // // // ============================================

// // // // function getModuleList(input: any) {
// // // //   const {
// // // //     moduleKey,
// // // //     staff,
// // // //     products,
// // // //     stores,
// // // //     categories,
// // // //     customers,
// // // //     suppliers,
// // // //     brands,
// // // //     activeSession,
// // // //     inventory,
// // // //     inventoryMovements,
// // // //   } = input;
// // // //   if (moduleKey === "staff") return staff;
// // // //   if (moduleKey === "products") return products;
// // // //   if (moduleKey === "stores") return stores;
// // // //   if (moduleKey === "categories") return categories;
// // // //   if (moduleKey === "customers") return customers;
// // // //   if (moduleKey === "suppliers") return suppliers;
// // // //   if (moduleKey === "brands") return brands;
// // // //   if (moduleKey === "inventory") return inventory;
// // // //   if (moduleKey === "inventory") return inventoryMovements; // For movements view
// // // //   return activeSession ? [activeSession] : [];
// // // // }

// // // // function getSubtitle(moduleKey: ModuleKey, item: any) {
// // // //   if (moduleKey === "staff")
// // // //     return `${item.role} • ${item.email ?? "no email"}`;
// // // //   if (moduleKey === "products") {
// // // //     const brandName = item.brand?.name || item.brandName || "";
// // // //     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
// // // //   }
// // // //   if (moduleKey === "stores") return item.address ?? "No address";
// // // //   if (moduleKey === "categories") return item.slug ?? "No slug";
// // // //   if (moduleKey === "customers") return item.phone ?? item.code;
// // // //   if (moduleKey === "suppliers")
// // // //     return item.phone ?? item.email ?? "No contact";
// // // //   if (moduleKey === "brands") return item.description ?? "No description";
// // // //   if (moduleKey === "inventory") {
// // // //     const productName = item.product?.name || item.name || "Unknown";
// // // //     return `${productName} • Qty: ${item.quantity || 0}`;
// // // //   }
// // // //   if (moduleKey === "sessions")
// // // //     return `${item.status} • ${item.openedAt ?? ""}`;
// // // //   return "";
// // // // }

// // // // function getRightLabel(moduleKey: ModuleKey, item: any) {
// // // //   if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
// // // //   if (moduleKey === "products")
// // // //     return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
// // // //   if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
// // // //   if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
// // // //   if (moduleKey === "customers") return item.tier ?? "BRONZE";
// // // //   if (moduleKey === "suppliers") {
// // // //     if (item.currentBalance !== undefined && item.currentBalance !== null) {
// // // //       return `$${Number(item.currentBalance).toFixed(2)}`;
// // // //     }
// // // //     return item.isActive ? "Active" : "Inactive";
// // // //   }
// // // //   if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive";
// // // //   if (moduleKey === "inventory") {
// // // //     const qty = item.quantity || 0;
// // // //     if (qty === 0) return "Out of Stock";
// // // //     if (qty <= 10) return "Low Stock";
// // // //     return `${qty} in stock`;
// // // //   }
// // // //   if (moduleKey === "sessions") return item.status ?? "OPEN";
// // // //   return "";
// // // // }

// // // // function getIcon(moduleKey: ModuleKey) {
// // // //   if (moduleKey === "staff") return "groups";
// // // //   if (moduleKey === "products") return "inventory-2";
// // // //   if (moduleKey === "stores") return "store";
// // // //   if (moduleKey === "categories") return "category";
// // // //   if (moduleKey === "customers") return "person";
// // // //   if (moduleKey === "suppliers") return "local-shipping";
// // // //   if (moduleKey === "brands") return "branding-watermark";
// // // //   if (moduleKey === "inventory") return "inventory";
// // // //   if (moduleKey === "sessions") return "schedule";
// // // //   return "schedule";
// // // // }

// // // // // ============================================
// // // // // EDITOR MODAL CONTENT (Keep as before)
// // // // // ============================================

// // // // function EditorModalContent({
// // // //   title,
// // // //   moduleKey,
// // // //   item,
// // // //   mode,
// // // //   onClose,
// // // //   onSave,
// // // //   onDelete,
// // // //   currentStoreId,
// // // //   stores,
// // // //   categories,
// // // //   suppliers,
// // // //   brands,
// // // //   refetchCategories,
// // // //   refetchSuppliers,
// // // //   refetchBrands,
// // // // }: {
// // // //   title: string;
// // // //   moduleKey: ModuleKey;
// // // //   item?: any;
// // // //   mode: "create" | "edit";
// // // //   onClose: () => void;
// // // //   onSave: (values: Record<string, any>) => Promise<void>;
// // // //   onDelete?: () => void;
// // // //   currentStoreId: string | null;
// // // //   stores: any[];
// // // //   categories: any[];
// // // //   suppliers: any[];
// // // //   brands: any[];
// // // //   refetchCategories: () => void;
// // // //   refetchSuppliers: () => void;
// // // //   refetchBrands: () => void;
// // // // }) {
// // // //   const [fields, setFields] = useState<Record<string, any>>({});
// // // //   const [showCreateCategory, setShowCreateCategory] = useState(false);
// // // //   const [showCreateSupplier, setShowCreateSupplier] = useState(false);
// // // //   const [showCreateBrand, setShowCreateBrand] = useState(false);
// // // //   const [newCategory, setNewCategory] = useState({
// // // //     name: "",
// // // //     slug: "",
// // // //     description: "",
// // // //   });
// // // //   const [newSupplier, setNewSupplier] = useState({
// // // //     name: "",
// // // //     code: "",
// // // //     phone: "",
// // // //     email: "",
// // // //     address: "",
// // // //     contactName: "",
// // // //   });
// // // //   const [newBrand, setNewBrand] = useState({
// // // //     name: "",
// // // //     description: "",
// // // //   });
// // // //   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
// // // //   const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
// // // //   const [isCreatingBrand, setIsCreatingBrand] = useState(false);

// // // //   const [createCategory] = useCreateLocalCategoryMutation();
// // // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // // //   const [createBrand] = useCreateLocalBrandMutation();

// // // //   useEffect(() => {
// // // //     if (item !== undefined) {
// // // //       setFields(item ? { ...item } : getDefaultFields(moduleKey));
// // // //     }
// // // //   }, [item, moduleKey]);

// // // //   const set = (key: string, value: any) =>
// // // //     setFields((current) => ({ ...current, [key]: value }));

// // // //   const save = () => onSave(fields);

// // // //   const handleCreateCategory = async () => {
// // // //     try {
// // // //       if (!newCategory.name.trim()) {
// // // //         Alert.alert("Error", "Category name is required");
// // // //         return;
// // // //       }

// // // //       setIsCreatingCategory(true);
// // // //       if (!currentStoreId) {
// // // //         Alert.alert("Error", "Store not found");
// // // //         return;
// // // //       }

// // // //       const payload = {
// // // //         tenantId: "default",
// // // //         name: newCategory.name.trim(),
// // // //         slug:
// // // //           newCategory.slug.trim() ||
// // // //           newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
// // // //         description: newCategory.description.trim() || undefined,
// // // //         storeId: currentStoreId,
// // // //         isActive: true,
// // // //       };

// // // //       const result = await createCategory(payload).unwrap();
// // // //       await refetchCategories();
// // // //       set("categoryId", result?.id);
// // // //       set("categoryName", result?.name);

// // // //       setShowCreateCategory(false);
// // // //       setNewCategory({ name: "", slug: "", description: "" });

// // // //       Alert.alert("Success", "Category created successfully");
// // // //     } catch (error: any) {
// // // //       Alert.alert(
// // // //         "Failed to create category",
// // // //         error?.data?.message || "Unable to create category.",
// // // //       );
// // // //     } finally {
// // // //       setIsCreatingCategory(false);
// // // //     }
// // // //   };

// // // //   const handleCreateSupplier = async () => {
// // // //     try {
// // // //       if (!newSupplier.name.trim()) {
// // // //         Alert.alert("Error", "Supplier name is required");
// // // //         return;
// // // //       }

// // // //       setIsCreatingSupplier(true);
// // // //       if (!currentStoreId) {
// // // //         Alert.alert("Error", "Store not found");
// // // //         return;
// // // //       }

// // // //       const payload = {
// // // //         tenantId: "default",
// // // //         name: newSupplier.name.trim(),
// // // //         code: newSupplier.code.trim() || undefined,
// // // //         contactName: newSupplier.contactName.trim() || undefined,
// // // //         phone: newSupplier.phone.trim() || undefined,
// // // //         email: newSupplier.email.trim() || undefined,
// // // //         address: newSupplier.address.trim() || undefined,
// // // //         storeId: currentStoreId,
// // // //         isActive: true,
// // // //       };

// // // //       const result = await createSupplier(payload).unwrap();
// // // //       await refetchSuppliers();
// // // //       set("supplierId", result.id);
// // // //       set("supplierName", result.name);

// // // //       setShowCreateSupplier(false);
// // // //       setNewSupplier({
// // // //         name: "",
// // // //         code: "",
// // // //         phone: "",
// // // //         email: "",
// // // //         address: "",
// // // //         contactName: "",
// // // //       });

// // // //       Alert.alert("Success", "Supplier created successfully");
// // // //     } catch (error: any) {
// // // //       Alert.alert(
// // // //         "Failed to create supplier",
// // // //         error?.data?.message || "Unable to create supplier.",
// // // //       );
// // // //     } finally {
// // // //       setIsCreatingSupplier(false);
// // // //     }
// // // //   };

// // // //   const handleCreateBrand = async () => {
// // // //     try {
// // // //       if (!newBrand.name.trim()) {
// // // //         Alert.alert("Error", "Brand name is required");
// // // //         return;
// // // //       }

// // // //       setIsCreatingBrand(true);

// // // //       const payload = {
// // // //         tenantId: "default",
// // // //         name: newBrand.name.trim(),
// // // //         description: newBrand.description.trim() || undefined,
// // // //         isActive: true,
// // // //       };

// // // //       const result = await createBrand(payload).unwrap();
// // // //       await refetchBrands();
// // // //       set("brandId", result.id);
// // // //       set("brand", result.name);

// // // //       setShowCreateBrand(false);
// // // //       setNewBrand({ name: "", description: "" });

// // // //       Alert.alert("Success", "Brand created successfully");
// // // //     } catch (error: any) {
// // // //       Alert.alert(
// // // //         "Failed to create brand",
// // // //         error?.data?.message || "Unable to create brand.",
// // // //       );
// // // //     } finally {
// // // //       setIsCreatingBrand(false);
// // // //     }
// // // //   };

// // // //   return (
// // // //     <SafeAreaView className="flex-1 px-4 pt-4">
// // // //       <View className="flex-row items-center justify-between mb-6">
// // // //         <Text className="text-white text-xl font-black">{title}</Text>
// // // //         <Pressable onPress={onClose}>
// // // //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// // // //         </Pressable>
// // // //       </View>

// // // //       <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
// // // //         {/* Staff Form */}
// // // //         {moduleKey === "staff" && (
// // // //           <>
// // // //             <Field
// // // //               label="Username"
// // // //               value={fields.username ?? ""}
// // // //               onChangeText={(v) => set("username", v)}
// // // //             />
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="Email"
// // // //               value={fields.email ?? ""}
// // // //               onChangeText={(v) => set("email", v)}
// // // //             />
// // // //             {mode === "create" && (
// // // //               <Field
// // // //                 label="Password"
// // // //                 value={fields.password ?? ""}
// // // //                 onChangeText={(v) => set("password", v)}
// // // //                 secureTextEntry
// // // //               />
// // // //             )}

// // // //             <StoreSelector
// // // //               value={fields.storeId ?? ""}
// // // //               onChange={(storeId, storeName) => {
// // // //                 set("storeId", storeId);
// // // //                 set("storeName", storeName);
// // // //               }}
// // // //               stores={stores}
// // // //               label="Assigned Store"
// // // //             />

// // // //             <RoleSelector
// // // //               value={fields.role ?? "CASHIER"}
// // // //               onChange={(role) => {
// // // //                 set("role", role);
// // // //                 set("permissions", getDefaultPermissions(role));
// // // //               }}
// // // //             />
// // // //           </>
// // // //         )}

// // // //         {/* Products Form */}
// // // //         {moduleKey === "products" && (
// // // //           <>
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="SKU"
// // // //               value={fields.sku ?? ""}
// // // //               onChangeText={(v) => set("sku", v)}
// // // //             />
// // // //             <Field
// // // //               label="Barcode"
// // // //               value={fields.barcode ?? ""}
// // // //               onChangeText={(v) => set("barcode", v)}
// // // //             />
// // // //             <Field
// // // //               label="Description"
// // // //               value={fields.description ?? ""}
// // // //               onChangeText={(v) => set("description", v)}
// // // //               multiline
// // // //             />

// // // //             <BrandSelector
// // // //               value={fields.brandId ?? ""}
// // // //               onChange={(brandId, brandName) => {
// // // //                 set("brandId", brandId);
// // // //                 set("brand", brandName);
// // // //               }}
// // // //               brands={brands}
// // // //               onAddBrand={() => setShowCreateBrand(true)}
// // // //             />

// // // //             <Field
// // // //               label="Cost Price"
// // // //               value={fields.costPrice?.toString() ?? ""}
// // // //               onChangeText={(v) => {
// // // //                 const num = parseFloat(v);
// // // //                 set("costPrice", isNaN(num) ? 0 : num);
// // // //               }}
// // // //               keyboardType="decimal-pad"
// // // //             />
// // // //             <Field
// // // //               label="Selling Price"
// // // //               value={fields.sellingPrice?.toString() ?? ""}
// // // //               onChangeText={(v) => {
// // // //                 const num = parseFloat(v);
// // // //                 set("sellingPrice", isNaN(num) ? 0 : num);
// // // //               }}
// // // //               keyboardType="decimal-pad"
// // // //             />
// // // //             <Field
// // // //               label="Wholesale Price"
// // // //               value={fields.wholesalePrice?.toString() ?? ""}
// // // //               onChangeText={(v) => {
// // // //                 const num = parseFloat(v);
// // // //                 set("wholesalePrice", isNaN(num) ? 0 : num);
// // // //               }}
// // // //               keyboardType="decimal-pad"
// // // //             />
// // // //             <Field
// // // //               label="Initial Stock"
// // // //               value={fields.initialStock?.toString() ?? ""}
// // // //               onChangeText={(v) => {
// // // //                 const num = parseInt(v, 10);
// // // //                 set("initialStock", isNaN(num) ? 0 : num);
// // // //               }}
// // // //               keyboardType="numeric"
// // // //             />

// // // //             <CategorySelector
// // // //               value={fields.categoryId ?? ""}
// // // //               onChange={(categoryId, categoryName) => {
// // // //                 set("categoryId", categoryId);
// // // //                 set("categoryName", categoryName);
// // // //               }}
// // // //               categories={categories}
// // // //               onAddCategory={() => setShowCreateCategory(true)}
// // // //             />

// // // //             <SupplierSelector
// // // //               value={fields.supplierId ?? ""}
// // // //               onChange={(supplierId, supplierName) => {
// // // //                 set("supplierId", supplierId);
// // // //                 set("supplierName", supplierName);
// // // //               }}
// // // //               suppliers={suppliers}
// // // //             />

// // // //             {showCreateCategory && (
// // // //               <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
// // // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
// // // //                   Create New Category
// // // //                 </Text>
// // // //                 <Field
// // // //                   label="Category Name"
// // // //                   value={newCategory.name}
// // // //                   onChangeText={(v) => {
// // // //                     setNewCategory({ ...newCategory, name: v });
// // // //                     if (!newCategory.slug) {
// // // //                       const slug = v.toLowerCase().replace(/\s+/g, "-");
// // // //                       setNewCategory((prev) => ({ ...prev, slug }));
// // // //                     }
// // // //                   }}
// // // //                 />
// // // //                 <Field
// // // //                   label="Slug (URL friendly)"
// // // //                   value={newCategory.slug}
// // // //                   onChangeText={(v) =>
// // // //                     setNewCategory({ ...newCategory, slug: v })
// // // //                   }
// // // //                 />
// // // //                 <Field
// // // //                   label="Description"
// // // //                   value={newCategory.description}
// // // //                   onChangeText={(v) =>
// // // //                     setNewCategory({ ...newCategory, description: v })
// // // //                   }
// // // //                 />
// // // //                 <View className="mt-2 flex-row gap-3">
// // // //                   <ActionButton
// // // //                     title="Cancel"
// // // //                     icon="close"
// // // //                     accent="rose"
// // // //                     onPress={() => setShowCreateCategory(false)}
// // // //                   />
// // // //                   <ActionButton
// // // //                     title="Create"
// // // //                     icon="add"
// // // //                     accent="emerald"
// // // //                     onPress={handleCreateCategory}
// // // //                     disabled={isCreatingCategory}
// // // //                   />
// // // //                 </View>
// // // //               </View>
// // // //             )}

// // // //             {showCreateBrand && (
// // // //               <View className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
// // // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-purple-400">
// // // //                   Create New Brand
// // // //                 </Text>
// // // //                 <Field
// // // //                   label="Brand Name"
// // // //                   value={newBrand.name}
// // // //                   onChangeText={(v) => setNewBrand({ ...newBrand, name: v })}
// // // //                 />
// // // //                 <Field
// // // //                   label="Description"
// // // //                   value={newBrand.description}
// // // //                   onChangeText={(v) =>
// // // //                     setNewBrand({ ...newBrand, description: v })
// // // //                   }
// // // //                 />
// // // //                 <View className="mt-2 flex-row gap-3">
// // // //                   <ActionButton
// // // //                     title="Cancel"
// // // //                     icon="close"
// // // //                     accent="rose"
// // // //                     onPress={() => setShowCreateBrand(false)}
// // // //                   />
// // // //                   <ActionButton
// // // //                     title="Create"
// // // //                     icon="add"
// // // //                     accent="emerald"
// // // //                     onPress={handleCreateBrand}
// // // //                     disabled={isCreatingBrand}
// // // //                   />
// // // //                 </View>
// // // //               </View>
// // // //             )}
// // // //           </>
// // // //         )}

// // // //         {/* Stores Form */}
// // // //         {moduleKey === "stores" && (
// // // //           <>
// // // //             <Field
// // // //               label="Code"
// // // //               value={fields.code ?? ""}
// // // //               onChangeText={(v) => set("code", v)}
// // // //             />
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="Address"
// // // //               value={fields.address ?? ""}
// // // //               onChangeText={(v) => set("address", v)}
// // // //             />
// // // //             <Field
// // // //               label="Phone"
// // // //               value={fields.phone ?? ""}
// // // //               onChangeText={(v) => set("phone", v)}
// // // //             />
// // // //             <Field
// // // //               label="Email"
// // // //               value={fields.email ?? ""}
// // // //               onChangeText={(v) => set("email", v)}
// // // //             />
// // // //             <Field
// // // //               label="Tax Number"
// // // //               value={fields.taxNumber ?? ""}
// // // //               onChangeText={(v) => set("taxNumber", v)}
// // // //             />
// // // //           </>
// // // //         )}

// // // //         {/* Categories Form */}
// // // //         {moduleKey === "categories" && (
// // // //           <>
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="Slug"
// // // //               value={fields.slug ?? ""}
// // // //               onChangeText={(v) => set("slug", v)}
// // // //             />
// // // //             <Field
// // // //               label="Description"
// // // //               value={fields.description ?? ""}
// // // //               onChangeText={(v) => set("description", v)}
// // // //             />
// // // //           </>
// // // //         )}

// // // //         {/* Brands Form */}
// // // //         {moduleKey === "brands" && (
// // // //           <>
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="Description"
// // // //               value={fields.description ?? ""}
// // // //               onChangeText={(v) => set("description", v)}
// // // //               multiline
// // // //             />
// // // //           </>
// // // //         )}

// // // //         {/* Customers Form */}
// // // //         {moduleKey === "customers" && (
// // // //           <>
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="Phone"
// // // //               value={fields.phone ?? ""}
// // // //               onChangeText={(v) => set("phone", v)}
// // // //             />
// // // //             <Field
// // // //               label="Email"
// // // //               value={fields.email ?? ""}
// // // //               onChangeText={(v) => set("email", v)}
// // // //             />
// // // //             <Field
// // // //               label="Address"
// // // //               value={fields.address ?? ""}
// // // //               onChangeText={(v) => set("address", v)}
// // // //             />
// // // //             <Field
// // // //               label="Date of Birth"
// // // //               value={fields.dateOfBirth ?? ""}
// // // //               onChangeText={(v) => set("dateOfBirth", v)}
// // // //               placeholder="YYYY-MM-DD"
// // // //             />
// // // //             <Field
// // // //               label="Gender"
// // // //               value={fields.gender ?? ""}
// // // //               onChangeText={(v) => set("gender", v)}
// // // //               placeholder="MALE / FEMALE / OTHER"
// // // //             />
// // // //           </>
// // // //         )}

// // // //         {/* Suppliers Form */}
// // // //         {moduleKey === "suppliers" && (
// // // //           <>
// // // //             <Field
// // // //               label="Name"
// // // //               value={fields.name ?? ""}
// // // //               onChangeText={(v) => set("name", v)}
// // // //             />
// // // //             <Field
// // // //               label="Code"
// // // //               value={fields.code ?? ""}
// // // //               onChangeText={(v) => set("code", v)}
// // // //             />
// // // //             <Field
// // // //               label="Contact Person"
// // // //               value={fields.contactName ?? ""}
// // // //               onChangeText={(v) => set("contactName", v)}
// // // //             />
// // // //             <Field
// // // //               label="Phone"
// // // //               value={fields.phone ?? ""}
// // // //               onChangeText={(v) => set("phone", v)}
// // // //             />
// // // //             <Field
// // // //               label="Email"
// // // //               value={fields.email ?? ""}
// // // //               onChangeText={(v) => set("email", v)}
// // // //             />
// // // //             <Field
// // // //               label="Address"
// // // //               value={fields.address ?? ""}
// // // //               onChangeText={(v) => set("address", v)}
// // // //             />
// // // //             <Field
// // // //               label="Tax Number"
// // // //               value={fields.taxNumber ?? ""}
// // // //               onChangeText={(v) => set("taxNumber", v)}
// // // //             />
// // // //             <Field
// // // //               label="Payment Terms (days)"
// // // //               value={fields.paymentTerms?.toString() ?? ""}
// // // //               onChangeText={(v) => {
// // // //                 const num = parseInt(v, 10);
// // // //                 set("paymentTerms", isNaN(num) ? undefined : num);
// // // //               }}
// // // //               keyboardType="numeric"
// // // //               placeholder="30"
// // // //             />
// // // //             <Field
// // // //               label="Credit Limit"
// // // //               value={fields.creditLimit?.toString() ?? ""}
// // // //               onChangeText={(v) => {
// // // //                 const num = parseFloat(v);
// // // //                 set("creditLimit", isNaN(num) ? undefined : num);
// // // //               }}
// // // //               keyboardType="decimal-pad"
// // // //               placeholder="0.00"
// // // //             />

// // // //             {showCreateSupplier && (
// // // //               <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
// // // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-emerald-400">
// // // //                   Create New Supplier
// // // //                 </Text>
// // // //                 <Field
// // // //                   label="Supplier Name"
// // // //                   value={newSupplier.name}
// // // //                   onChangeText={(v) =>
// // // //                     setNewSupplier({ ...newSupplier, name: v })
// // // //                   }
// // // //                 />
// // // //                 <Field
// // // //                   label="Code"
// // // //                   value={newSupplier.code}
// // // //                   onChangeText={(v) =>
// // // //                     setNewSupplier({ ...newSupplier, code: v })
// // // //                   }
// // // //                 />
// // // //                 <Field
// // // //                   label="Contact Person"
// // // //                   value={newSupplier.contactName}
// // // //                   onChangeText={(v) =>
// // // //                     setNewSupplier({ ...newSupplier, contactName: v })
// // // //                   }
// // // //                 />
// // // //                 <Field
// // // //                   label="Phone"
// // // //                   value={newSupplier.phone}
// // // //                   onChangeText={(v) =>
// // // //                     setNewSupplier({ ...newSupplier, phone: v })
// // // //                   }
// // // //                 />
// // // //                 <Field
// // // //                   label="Email"
// // // //                   value={newSupplier.email}
// // // //                   onChangeText={(v) =>
// // // //                     setNewSupplier({ ...newSupplier, email: v })
// // // //                   }
// // // //                 />
// // // //                 <View className="mt-2 flex-row gap-3">
// // // //                   <ActionButton
// // // //                     title="Cancel"
// // // //                     icon="close"
// // // //                     accent="rose"
// // // //                     onPress={() => setShowCreateSupplier(false)}
// // // //                   />
// // // //                   <ActionButton
// // // //                     title="Create"
// // // //                     icon="add"
// // // //                     accent="emerald"
// // // //                     onPress={handleCreateSupplier}
// // // //                     disabled={isCreatingSupplier}
// // // //                   />
// // // //                 </View>
// // // //               </View>
// // // //             )}
// // // //           </>
// // // //         )}

// // // //         {/* Sessions - No form */}
// // // //         {moduleKey === "sessions" && (
// // // //           <View className="py-8">
// // // //             <Text className="text-center text-slate-400">
// // // //               Session management is handled separately.
// // // //             </Text>
// // // //             <Text className="text-center text-slate-500 text-sm mt-2">
// // // //               Use the "Open Session" or "Close Session" button above.
// // // //             </Text>
// // // //           </View>
// // // //         )}

// // // //         <View className="mt-4 flex-row gap-3">
// // // //           <ActionButton
// // // //             title="Cancel"
// // // //             icon="close"
// // // //             accent="rose"
// // // //             onPress={onClose}
// // // //           />
// // // //           <ActionButton
// // // //             title="Save"
// // // //             icon="save"
// // // //             accent="emerald"
// // // //             onPress={save}
// // // //           />
// // // //         </View>
// // // //         {mode === "edit" && onDelete && (
// // // //           <View className="mt-3">
// // // //             <ActionButton
// // // //               title="Delete"
// // // //               icon="delete"
// // // //               accent="rose"
// // // //               onPress={onDelete}
// // // //             />
// // // //           </View>
// // // //         )}
// // // //       </ScrollView>
// // // //     </SafeAreaView>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // SESSION MODAL CONTENT
// // // // // ============================================

// // // // function SessionModalContent({
// // // //   mode,
// // // //   activeSession,
// // // //   onClose,
// // // //   onOpen,
// // // //   onCloseSession,
// // // // }: {
// // // //   mode: "open" | "close" | null;
// // // //   activeSession: any;
// // // //   onClose: () => void;
// // // //   onOpen: (openingBalance: string, notes: string) => Promise<void>;
// // // //   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// // // // }) {
// // // //   const [balance, setBalance] = useState("0");
// // // //   const [notes, setNotes] = useState("");

// // // //   return (
// // // //     <SafeAreaView className="flex-1 px-4 pt-4">
// // // //       <View className="flex-row items-center justify-between mb-6">
// // // //         <Text className="text-white text-xl font-black">
// // // //           {mode === "open" ? "Open Session" : "Close Session"}
// // // //         </Text>
// // // //         <Pressable onPress={onClose}>
// // // //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// // // //         </Pressable>
// // // //       </View>

// // // //       <Text className="text-slate-400 text-sm mb-4">
// // // //         {activeSession ? `Active: ${activeSession.id}` : "No active session"}
// // // //       </Text>

// // // //       <TextInput
// // // //         value={balance}
// // // //         onChangeText={setBalance}
// // // //         keyboardType="decimal-pad"
// // // //         placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
// // // //         placeholderTextColor="#64748b"
// // // //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// // // //       />
// // // //       <TextInput
// // // //         value={notes}
// // // //         onChangeText={setNotes}
// // // //         placeholder="Notes"
// // // //         placeholderTextColor="#64748b"
// // // //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// // // //         multiline
// // // //         numberOfLines={3}
// // // //       />
// // // //       <View className="flex-row gap-3">
// // // //         <ActionButton
// // // //           title="Cancel"
// // // //           icon="close"
// // // //           accent="rose"
// // // //           onPress={onClose}
// // // //         />
// // // //         <ActionButton
// // // //           title={mode === "open" ? "Open" : "Close"}
// // // //           icon="schedule"
// // // //           accent="emerald"
// // // //           onPress={async () => {
// // // //             if (mode === "open") await onOpen(balance, notes);
// // // //             else await onCloseSession(balance, notes);
// // // //           }}
// // // //         />
// // // //       </View>
// // // //     </SafeAreaView>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // SELECTOR COMPONENTS (RoleSelector, StoreSelector, CategorySelector, BrandSelector, SupplierSelector, Field)
// // // // // ============================================

// // // // // // ============================================
// // // // // // ROLE SELECTOR
// // // // // // ============================================

// // // // function RoleSelector({
// // // //   value,
// // // //   onChange,
// // // // }: {
// // // //   value: string;
// // // //   onChange: (role: string) => void;
// // // // }) {
// // // //   const roles = [
// // // //     { label: "Admin", value: "ADMIN", description: "Full system access" },
// // // //     {
// // // //       label: "Manager",
// // // //       value: "MANAGER",
// // // //       description: "Manage store operations",
// // // //     },
// // // //     {
// // // //       label: "Cashier",
// // // //       value: "CASHIER",
// // // //       description: "Process sales and transactions",
// // // //     },
// // // //     {
// // // //       label: "Accountant",
// // // //       value: "ACCOUNTANT",
// // // //       description: "Financial and reporting access",
// // // //     },
// // // //   ];

// // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // //   const selectedRole = roles.find((r) => r.value === value);

// // // //   return (
// // // //     <View className="mb-4">
// // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //         Role
// // // //       </Text>
// // // //       <Pressable
// // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // //       >
// // // //         <View className="flex-row items-center justify-between">
// // // //           <Text
// // // //             className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
// // // //           >
// // // //             {selectedRole ? selectedRole.label : "Select a role..."}
// // // //           </Text>
// // // //           <MaterialIcons
// // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // //             size={24}
// // // //             color="#64748b"
// // // //           />
// // // //         </View>
// // // //       </Pressable>

// // // //       {showDropdown && (
// // // //         <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // //           <ScrollView className="max-h-48" nestedScrollEnabled>
// // // //             {roles.map((role) => (
// // // //               <Pressable
// // // //                 key={role.value}
// // // //                 onPress={() => {
// // // //                   onChange(role.value);
// // // //                   setShowDropdown(false);
// // // //                 }}
// // // //                 className={`rounded-xl px-4 py-3 ${
// // // //                   value === role.value ? "bg-emerald-500/20" : ""
// // // //                 }`}
// // // //               >
// // // //                 <Text className="text-white">{role.label}</Text>
// // // //                 <Text className="text-xs text-slate-400">
// // // //                   {role.description}
// // // //                 </Text>
// // // //               </Pressable>
// // // //             ))}
// // // //           </ScrollView>
// // // //         </View>
// // // //       )}
// // // //     </View>
// // // //   );
// // // // }

// // // // function getDefaultPermissions(role: string): string[] {
// // // //   const permissions = {
// // // //     ADMIN: [
// // // //       "VIEW_REPORTS",
// // // //       "EDIT_PRICES",
// // // //       "MANAGE_STAFF",
// // // //       "MANAGE_PRODUCTS",
// // // //       "VIEW_SALES",
// // // //       "MANAGE_CUSTOMERS",
// // // //       "EDIT_INVENTORY",
// // // //     ],
// // // //     MANAGER: [
// // // //       "VIEW_REPORTS",
// // // //       "EDIT_PRICES",
// // // //       "MANAGE_PRODUCTS",
// // // //       "VIEW_SALES",
// // // //       "MANAGE_CUSTOMERS",
// // // //     ],
// // // //     CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
// // // //     ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
// // // //   };
// // // //   return permissions[role as keyof typeof permissions] || [];
// // // // }

// // // // // ============================================
// // // // // STORE SELECTOR
// // // // // ============================================

// // // // function StoreSelector({
// // // //   value,
// // // //   onChange,
// // // //   stores,
// // // //   label = "Store",
// // // // }: {
// // // //   value: string;
// // // //   onChange: (storeId: string, storeName: string) => void;
// // // //   stores: any[];
// // // //   label?: string;
// // // // }) {
// // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // //   const [searchText, setSearchText] = useState("");

// // // //   const filteredStores = useMemo(() => {
// // // //     if (!searchText.trim()) return stores;
// // // //     return stores.filter(
// // // //       (store) =>
// // // //         store.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // // //         store.code?.toLowerCase().includes(searchText.toLowerCase()),
// // // //     );
// // // //   }, [stores, searchText]);

// // // //   const selectedStore = stores.find((store) => store.id === value);

// // // //   return (
// // // //     <View className="mb-4">
// // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //         {label}
// // // //       </Text>
// // // //       <Pressable
// // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // //       >
// // // //         <View className="flex-row items-center justify-between">
// // // //           <Text
// // // //             className={`text-base ${selectedStore ? "text-white" : "text-slate-400"}`}
// // // //           >
// // // //             {selectedStore ? selectedStore.name : "Select a store..."}
// // // //           </Text>
// // // //           <MaterialIcons
// // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // //             size={24}
// // // //             color="#64748b"
// // // //           />
// // // //         </View>
// // // //       </Pressable>

// // // //       {showDropdown && (
// // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // //           <TextInput
// // // //             value={searchText}
// // // //             onChangeText={setSearchText}
// // // //             placeholder="Search stores..."
// // // //             placeholderTextColor="#64748b"
// // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // //           />
// // // //           <ScrollView
// // // //             className="max-h-48"
// // // //             showsVerticalScrollIndicator={true}
// // // //             nestedScrollEnabled={true}
// // // //           >
// // // //             {filteredStores.length > 0 ? (
// // // //               filteredStores.map((store) => (
// // // //                 <Pressable
// // // //                   key={store.id}
// // // //                   onPress={() => {
// // // //                     onChange(store.id, store.name);
// // // //                     setShowDropdown(false);
// // // //                     setSearchText("");
// // // //                   }}
// // // //                   className={`rounded-xl px-4 py-3 ${
// // // //                     value === store.id ? "bg-emerald-500/20" : ""
// // // //                   }`}
// // // //                 >
// // // //                   <Text className="text-white">{store.name}</Text>
// // // //                   <Text className="text-xs text-slate-400">
// // // //                     {store.code} • {store.address || "No address"}
// // // //                   </Text>
// // // //                 </Pressable>
// // // //               ))
// // // //             ) : (
// // // //               <Text className="py-4 text-center text-slate-400">
// // // //                 No stores found
// // // //               </Text>
// // // //             )}
// // // //           </ScrollView>
// // // //         </View>
// // // //       )}
// // // //     </View>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // CATEGORY SELECTOR
// // // // // ============================================

// // // // function CategorySelector({
// // // //   value,
// // // //   onChange,
// // // //   categories,
// // // //   onAddCategory,
// // // //   label = "Category",
// // // // }: {
// // // //   value: string;
// // // //   onChange: (categoryId: string, categoryName: string) => void;
// // // //   categories: any[];
// // // //   onAddCategory: () => void;
// // // //   label?: string;
// // // // }) {
// // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // //   const [searchText, setSearchText] = useState("");

// // // //   const filteredCategories = useMemo(() => {
// // // //     if (!searchText.trim()) return categories;
// // // //     return categories.filter((cat) =>
// // // //       cat.name.toLowerCase().includes(searchText.toLowerCase()),
// // // //     );
// // // //   }, [categories, searchText]);

// // // //   const selectedCategory = categories.find((cat) => cat.id === value);

// // // //   return (
// // // //     <View className="mb-4">
// // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //         {label}
// // // //       </Text>

// // // //       <Pressable
// // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // //       >
// // // //         <View className="flex-row items-center justify-between">
// // // //           <Text
// // // //             className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
// // // //           >
// // // //             {selectedCategory ? selectedCategory.name : "Select a category..."}
// // // //           </Text>
// // // //           <MaterialIcons
// // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // //             size={24}
// // // //             color="#64748b"
// // // //           />
// // // //         </View>
// // // //       </Pressable>

// // // //       {showDropdown && (
// // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // //           <TextInput
// // // //             value={searchText}
// // // //             onChangeText={setSearchText}
// // // //             placeholder="Search categories..."
// // // //             placeholderTextColor="#64748b"
// // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // //           />

// // // //           <ScrollView
// // // //             className="max-h-48"
// // // //             showsVerticalScrollIndicator={true}
// // // //             nestedScrollEnabled={true}
// // // //           >
// // // //             {filteredCategories.length > 0 ? (
// // // //               filteredCategories.map((item) => (
// // // //                 <Pressable
// // // //                   key={item.id}
// // // //                   onPress={() => {
// // // //                     onChange(item.id, item.name);
// // // //                     setShowDropdown(false);
// // // //                     setSearchText("");
// // // //                   }}
// // // //                   className={`rounded-xl px-4 py-3 ${
// // // //                     value === item.id ? "bg-emerald-500/20" : ""
// // // //                   }`}
// // // //                 >
// // // //                   <Text className="text-white">{item.name}</Text>
// // // //                   {item.description && (
// // // //                     <Text className="text-xs text-slate-400">
// // // //                       {item.description}
// // // //                     </Text>
// // // //                   )}
// // // //                 </Pressable>
// // // //               ))
// // // //             ) : (
// // // //               <View className="py-4">
// // // //                 <Text className="text-center text-slate-400">
// // // //                   No categories found
// // // //                 </Text>
// // // //                 {searchText.trim() && (
// // // //                   <Pressable
// // // //                     onPress={() => {
// // // //                       onAddCategory();
// // // //                       setShowDropdown(false);
// // // //                       setSearchText("");
// // // //                     }}
// // // //                     className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
// // // //                   >
// // // //                     <Text className="text-center text-emerald-200">
// // // //                       Create "{searchText.trim()}"
// // // //                     </Text>
// // // //                   </Pressable>
// // // //                 )}
// // // //               </View>
// // // //             )}
// // // //           </ScrollView>
// // // //         </View>
// // // //       )}
// // // //     </View>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // BRAND SELECTOR
// // // // // ============================================

// // // // function BrandSelector({
// // // //   value,
// // // //   onChange,
// // // //   brands,
// // // //   onAddBrand,
// // // //   label = "Brand",
// // // // }: {
// // // //   value: string;
// // // //   onChange: (brandId: string, brandName: string) => void;
// // // //   brands: any[];
// // // //   onAddBrand: () => void;
// // // //   label?: string;
// // // // }) {
// // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // //   const [searchText, setSearchText] = useState("");

// // // //   const filteredBrands = useMemo(() => {
// // // //     if (!searchText.trim()) return brands;
// // // //     return brands.filter((brand) =>
// // // //       brand.name.toLowerCase().includes(searchText.toLowerCase()),
// // // //     );
// // // //   }, [brands, searchText]);

// // // //   const selectedBrand = brands.find((brand) => brand.id === value);

// // // //   return (
// // // //     <View className="mb-4">
// // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //         {label}
// // // //       </Text>

// // // //       <Pressable
// // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // //       >
// // // //         <View className="flex-row items-center justify-between">
// // // //           <Text
// // // //             className={`text-base ${selectedBrand ? "text-white" : "text-slate-400"}`}
// // // //           >
// // // //             {selectedBrand ? selectedBrand.name : "Select a brand..."}
// // // //           </Text>
// // // //           <MaterialIcons
// // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // //             size={24}
// // // //             color="#64748b"
// // // //           />
// // // //         </View>
// // // //       </Pressable>

// // // //       {showDropdown && (
// // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // //           <TextInput
// // // //             value={searchText}
// // // //             onChangeText={setSearchText}
// // // //             placeholder="Search brands..."
// // // //             placeholderTextColor="#64748b"
// // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // //           />

// // // //           <ScrollView
// // // //             className="max-h-48"
// // // //             showsVerticalScrollIndicator={true}
// // // //             nestedScrollEnabled={true}
// // // //           >
// // // //             {filteredBrands.length > 0 ? (
// // // //               filteredBrands.map((item) => (
// // // //                 <Pressable
// // // //                   key={item.id}
// // // //                   onPress={() => {
// // // //                     onChange(item.id, item.name);
// // // //                     setShowDropdown(false);
// // // //                     setSearchText("");
// // // //                   }}
// // // //                   className={`rounded-xl px-4 py-3 ${
// // // //                     value === item.id ? "bg-purple-500/20" : ""
// // // //                   }`}
// // // //                 >
// // // //                   <Text className="text-white">{item.name}</Text>
// // // //                   {item.description && (
// // // //                     <Text className="text-xs text-slate-400">
// // // //                       {item.description}
// // // //                     </Text>
// // // //                   )}
// // // //                 </Pressable>
// // // //               ))
// // // //             ) : (
// // // //               <View className="py-4">
// // // //                 <Text className="text-center text-slate-400">
// // // //                   No brands found
// // // //                 </Text>
// // // //                 {searchText.trim() && (
// // // //                   <Pressable
// // // //                     onPress={() => {
// // // //                       onAddBrand();
// // // //                       setShowDropdown(false);
// // // //                       setSearchText("");
// // // //                     }}
// // // //                     className="mt-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3"
// // // //                   >
// // // //                     <Text className="text-center text-purple-200">
// // // //                       Create "{searchText.trim()}"
// // // //                     </Text>
// // // //                   </Pressable>
// // // //                 )}
// // // //               </View>
// // // //             )}
// // // //           </ScrollView>
// // // //         </View>
// // // //       )}
// // // //     </View>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // SUPPLIER SELECTOR
// // // // // ============================================

// // // // function SupplierSelector({
// // // //   value,
// // // //   onChange,
// // // //   suppliers,
// // // //   label = "Supplier",
// // // // }: {
// // // //   value: string;
// // // //   onChange: (supplierId: string, supplierName: string) => void;
// // // //   suppliers: any[];
// // // //   label?: string;
// // // // }) {
// // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // //   const [searchText, setSearchText] = useState("");

// // // //   const filteredSuppliers = useMemo(() => {
// // // //     if (!searchText.trim()) return suppliers;
// // // //     return suppliers.filter(
// // // //       (sup) =>
// // // //         sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // // //         sup.code?.toLowerCase().includes(searchText.toLowerCase()),
// // // //     );
// // // //   }, [suppliers, searchText]);

// // // //   const selectedSupplier = suppliers.find((sup) => sup.id === value);

// // // //   return (
// // // //     <View className="mb-4">
// // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //         {label}
// // // //       </Text>

// // // //       <Pressable
// // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // //       >
// // // //         <View className="flex-row items-center justify-between">
// // // //           <Text
// // // //             className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
// // // //           >
// // // //             {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
// // // //           </Text>
// // // //           <MaterialIcons
// // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // //             size={24}
// // // //             color="#64748b"
// // // //           />
// // // //         </View>
// // // //       </Pressable>

// // // //       {showDropdown && (
// // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // //           <TextInput
// // // //             value={searchText}
// // // //             onChangeText={setSearchText}
// // // //             placeholder="Search suppliers..."
// // // //             placeholderTextColor="#64748b"
// // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // //           />

// // // //           <ScrollView
// // // //             className="max-h-48"
// // // //             showsVerticalScrollIndicator={true}
// // // //             nestedScrollEnabled={true}
// // // //           >
// // // //             {filteredSuppliers.length > 0 ? (
// // // //               filteredSuppliers.map((item) => (
// // // //                 <Pressable
// // // //                   key={item.id}
// // // //                   onPress={() => {
// // // //                     onChange(item.id, item.name);
// // // //                     setShowDropdown(false);
// // // //                     setSearchText("");
// // // //                   }}
// // // //                   className={`rounded-xl px-4 py-3 ${
// // // //                     value === item.id ? "bg-emerald-500/20" : ""
// // // //                   }`}
// // // //                 >
// // // //                   <Text className="text-white">{item.name}</Text>
// // // //                   <Text className="text-xs text-slate-400">
// // // //                     {item.code} • {item.phone || "No phone"}
// // // //                   </Text>
// // // //                 </Pressable>
// // // //               ))
// // // //             ) : (
// // // //               <Text className="py-4 text-center text-slate-400">
// // // //                 No suppliers found
// // // //               </Text>
// // // //             )}
// // // //           </ScrollView>
// // // //         </View>
// // // //       )}
// // // //     </View>
// // // //   );
// // // // }

// // // // // ============================================
// // // // // FIELD COMPONENT
// // // // // ============================================

// // // // function Field({
// // // //   label,
// // // //   value,
// // // //   onChangeText,
// // // //   secureTextEntry = false,
// // // //   keyboardType = "default",
// // // //   multiline = false,
// // // //   placeholder,
// // // // }: {
// // // //   label: string;
// // // //   value: string;
// // // //   onChangeText: (value: string) => void;
// // // //   secureTextEntry?: boolean;
// // // //   keyboardType?:
// // // //     | "default"
// // // //     | "decimal-pad"
// // // //     | "numeric"
// // // //     | "email-address"
// // // //     | "phone-pad";
// // // //   multiline?: boolean;
// // // //   placeholder?: string;
// // // // }) {
// // // //   return (
// // // //     <View className="mb-4">
// // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // //         {label}
// // // //       </Text>
// // // //       <TextInput
// // // //         value={value}
// // // //         onChangeText={onChangeText}
// // // //         placeholder={placeholder || label}
// // // //         placeholderTextColor="#64748b"
// // // //         secureTextEntry={secureTextEntry}
// // // //         keyboardType={keyboardType}
// // // //         multiline={multiline}
// // // //         numberOfLines={multiline ? 3 : 1}
// // // //         className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
// // // //           multiline ? "min-h-[100px] text-left align-top" : ""
// // // //         }`}
// // // //       />
// // // //     </View>
// // // //   );
// // // // }

// // // // function getDefaultFields(moduleKey: ModuleKey) {
// // // //   if (moduleKey === "staff")
// // // //     return {
// // // //       username: "",
// // // //       name: "",
// // // //       email: "",
// // // //       password: "",
// // // //       role: "CASHIER",
// // // //       permissions: [],
// // // //       storeId: "",
// // // //     };
// // // //   if (moduleKey === "products")
// // // //     return {
// // // //       sku: "",
// // // //       barcode: "",
// // // //       name: "",
// // // //       description: "",
// // // //       brandId: "",
// // // //       brand: "",
// // // //       costPrice: 0,
// // // //       sellingPrice: 0,
// // // //       wholesalePrice: 0,
// // // //       categoryId: "",
// // // //       categoryName: "",
// // // //       manufacturingDate: "",
// // // //       expiryDate: "",
// // // //       supplierId: "",
// // // //       initialStock: 0,
// // // //       variants: [],
// // // //     };
// // // //   if (moduleKey === "stores")
// // // //     return {
// // // //       code: "",
// // // //       name: "",
// // // //       address: "",
// // // //       phone: "",
// // // //       email: "",
// // // //       taxNumber: "",
// // // //     };
// // // //   if (moduleKey === "categories")
// // // //     return { name: "", slug: "", description: "" };
// // // //   if (moduleKey === "brands") return { name: "", description: "" };
// // // //   if (moduleKey === "customers")
// // // //     return {
// // // //       name: "",
// // // //       phone: "",
// // // //       email: "",
// // // //       address: "",
// // // //       dateOfBirth: "",
// // // //       gender: "",
// // // //     };
// // // //   if (moduleKey === "suppliers")
// // // //     return {
// // // //       name: "",
// // // //       code: "",
// // // //       contactName: "",
// // // //       phone: "",
// // // //       email: "",
// // // //       address: "",
// // // //       taxNumber: "",
// // // //       paymentTerms: "",
// // // //       creditLimit: "",
// // // //     };
// // // //   return {};
// // // // }

// // // // function buildPayload(
// // // //   moduleKey: ModuleKey,
// // // //   values: Record<string, any>,
// // // //   currentStoreId: string | null,
// // // // ) {
// // // //   if (moduleKey === "staff") {
// // // //     const payload: any = {
// // // //       username: String(values.username ?? "").trim(),
// // // //       email: String(values.email ?? "").trim() || undefined,
// // // //       name: String(values.name ?? "").trim(),
// // // //       role: values.role ?? "CASHIER",
// // // //       permissions: Array.isArray(values.permissions) ? values.permissions : [],
// // // //       isActive: values.isActive ?? true,
// // // //       storeId: values.storeId || currentStoreId || undefined,
// // // //     };
// // // //     if (values.password && String(values.password).trim()) {
// // // //       payload.password = String(values.password).trim();
// // // //     }
// // // //     return payload;
// // // //   }

// // // //   if (moduleKey === "products") {
// // // //     const payload: any = {
// // // //       tenantId: "default",
// // // //       sku: String(values.sku ?? "").trim() || undefined,
// // // //       barcode: String(values.barcode ?? "").trim() || undefined,
// // // //       name: String(values.name ?? "").trim(),
// // // //       description: String(values.description ?? "").trim() || undefined,
// // // //       brandId: String(values.brandId ?? "").trim() || undefined,
// // // //       costPrice: Number(values.costPrice ?? 0),
// // // //       sellingPrice: Number(values.sellingPrice ?? 0),
// // // //       wholesalePrice: Number(values.wholesalePrice ?? 0),
// // // //       categoryId: String(values.categoryId ?? "").trim() || undefined,
// // // //       categoryName: String(values.categoryName ?? "").trim() || undefined,
// // // //       manufacturingDate:
// // // //         String(values.manufacturingDate ?? "").trim() || undefined,
// // // //       expiryDate: String(values.expiryDate ?? "").trim() || undefined,
// // // //       supplierId: String(values.supplierId ?? "").trim() || undefined,
// // // //       storeId: currentStoreId || undefined,
// // // //       initialStock: values.initialStock
// // // //         ? Number(values.initialStock)
// // // //         : undefined,
// // // //     };
// // // //     Object.keys(payload).forEach((key) => {
// // // //       if (payload[key] === undefined) delete payload[key];
// // // //     });
// // // //     return payload;
// // // //   }

// // // //   if (moduleKey === "stores") {
// // // //     return {
// // // //       tenantId: "default",
// // // //       code: String(values.code ?? "").trim() || undefined,
// // // //       name: String(values.name ?? "").trim(),
// // // //       address: String(values.address ?? "").trim() || undefined,
// // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // //       email: String(values.email ?? "").trim() || undefined,
// // // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // // //       isActive: values.isActive ?? true,
// // // //     };
// // // //   }

// // // //   if (moduleKey === "categories") {
// // // //     return {
// // // //       tenantId: "default",
// // // //       name: String(values.name ?? "").trim(),
// // // //       slug: String(values.slug ?? "").trim(),
// // // //       description: String(values.description ?? "").trim() || undefined,
// // // //       storeId: currentStoreId || undefined,
// // // //       isActive: values.isActive ?? true,
// // // //     };
// // // //   }

// // // //   if (moduleKey === "brands") {
// // // //     return {
// // // //       tenantId: "default",
// // // //       name: String(values.name ?? "").trim(),
// // // //       description: String(values.description ?? "").trim() || undefined,
// // // //       isActive: values.isActive ?? true,
// // // //     };
// // // //   }

// // // //   if (moduleKey === "customers") {
// // // //     return {
// // // //       tenantId: "default",
// // // //       name: String(values.name ?? "").trim(),
// // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // //       email: String(values.email ?? "").trim() || undefined,
// // // //       address: String(values.address ?? "").trim() || undefined,
// // // //       dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
// // // //       gender: String(values.gender ?? "").trim() || undefined,
// // // //     };
// // // //   }

// // // //   if (moduleKey === "suppliers") {
// // // //     return {
// // // //       tenantId: "default",
// // // //       name: String(values.name ?? "").trim(),
// // // //       code: String(values.code ?? "").trim() || undefined,
// // // //       contactName: String(values.contactName ?? "").trim() || undefined,
// // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // //       email: String(values.email ?? "").trim() || undefined,
// // // //       address: String(values.address ?? "").trim() || undefined,
// // // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // // //       paymentTerms: values.paymentTerms
// // // //         ? Number(values.paymentTerms)
// // // //         : undefined,
// // // //       creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
// // // //       storeId: currentStoreId || undefined,
// // // //       isActive: values.isActive ?? true,
// // // //     };
// // // //   }

// // // //   return values;
// // // // }

// // // // // ... (Keep all the selector components from your original code - RoleSelector, StoreSelector, CategorySelector, BrandSelector, SupplierSelector, Field)

// // // // // // ============================================
// // // // // // FILE: app/(tabs)/manage.tsx
// // // // // // ============================================

// // // // // import {
// // // // //   ActionButton,
// // // // //   Card,
// // // // //   Header,
// // // // //   MetricCard,
// // // // //   Pill,
// // // // //   RowItem,
// // // // //   Screen,
// // // // //   SectionTitle,
// // // // // } from "@/components/app-ui";
// // // // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // // // // import { setStore } from "@/services/features/auth/authSlice";
// // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // import { useEffect, useMemo, useState } from "react";
// // // // // import {
// // // // //   ActivityIndicator,
// // // // //   Alert,
// // // // //   Modal,
// // // // //   Pressable,
// // // // //   ScrollView,
// // // // //   Text,
// // // // //   TextInput,
// // // // //   View,
// // // // // } from "react-native";
// // // // // import { SafeAreaView } from "react-native-safe-area-context";

// // // // // // ✅ Offline-first local APIs
// // // // // import {
// // // // //   useCloseLocalSessionMutation,
// // // // //   useCreateLocalBrandMutation,
// // // // //   useCreateLocalCategoryMutation,
// // // // //   useCreateLocalCustomerMutation,
// // // // //   useCreateLocalProductMutation,
// // // // //   useCreateLocalStaffMutation,
// // // // //   useCreateLocalStoreMutation,
// // // // //   useCreateLocalSupplierMutation,
// // // // //   useDeleteLocalBrandMutation,
// // // // //   useDeleteLocalCategoryMutation,
// // // // //   useDeleteLocalCustomerMutation,
// // // // //   useDeleteLocalProductMutation,
// // // // //   useDeleteLocalStaffMutation,
// // // // //   useDeleteLocalStoreMutation,
// // // // //   useDeleteLocalSupplierMutation,
// // // // //   useGetActiveSessionQuery,
// // // // //   useGetLocalBrandsQuery,
// // // // //   useGetLocalCategoriesQuery,
// // // // //   useGetLocalCustomersQuery,
// // // // //   useGetLocalProductsQuery,
// // // // //   useGetLocalStaffQuery,
// // // // //   useGetLocalStoresQuery,
// // // // //   useGetLocalSuppliersQuery,
// // // // //   useOpenLocalSessionMutation,
// // // // //   useUpdateLocalBrandMutation,
// // // // //   useUpdateLocalCategoryMutation,
// // // // //   useUpdateLocalCustomerMutation,
// // // // //   useUpdateLocalProductMutation,
// // // // //   useUpdateLocalStaffMutation,
// // // // //   useUpdateLocalStoreMutation,
// // // // //   useUpdateLocalSupplierMutation,
// // // // // } from "@/services/features/offline/localApi";

// // // // // type ModuleKey =
// // // // //   | "staff"
// // // // //   | "products"
// // // // //   | "stores"
// // // // //   | "categories"
// // // // //   | "customers"
// // // // //   | "suppliers"
// // // // //   | "sessions"
// // // // //   | "brands";

// // // // // export default function ManageScreen() {
// // // // //   const dispatch = useAppDispatch();
// // // // //   const { user, currentStoreId } = useAppSelector((state) => state.auth);
// // // // //   const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
// // // // //   const [editor, setEditor] = useState<{
// // // // //     open: boolean;
// // // // //     mode: "create" | "edit";
// // // // //     item?: any;
// // // // //   }>({ open: false, mode: "create" });

// // // // //   const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
// // // // //     null,
// // // // //   );

// // // // //   // ✅ Queries
// // // // //   const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
// // // // //     storeId: currentStoreId || undefined,
// // // // //   });
// // // // //   const { data: products = [], refetch: refetchProducts } =
// // // // //     useGetLocalProductsQuery({
// // // // //       storeId: currentStoreId || undefined,
// // // // //     });
// // // // //   const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
// // // // //     {},
// // // // //   );
// // // // //   const { data: categories = [], refetch: refetchCategories } =
// // // // //     useGetLocalCategoriesQuery({
// // // // //       storeId: currentStoreId || undefined,
// // // // //     });
// // // // //   const { data: customers = [], refetch: refetchCustomers } =
// // // // //     useGetLocalCustomersQuery({});
// // // // //   const { data: suppliers = [], refetch: refetchSuppliers } =
// // // // //     useGetLocalSuppliersQuery({
// // // // //       storeId: currentStoreId || undefined,
// // // // //     });
// // // // //   const { data: brands = [], refetch: refetchBrands } = useGetLocalBrandsQuery(
// // // // //     {},
// // // // //   );
// // // // //   const { data: activeSession, refetch: refetchSession } =
// // // // //     useGetActiveSessionQuery(
// // // // //       { userId: user?.id || "", storeId: currentStoreId || undefined },
// // // // //       { skip: !user?.id },
// // // // //     );

// // // // //   // ✅ Mutations
// // // // //   const [createStaff] = useCreateLocalStaffMutation();
// // // // //   const [updateStaff] = useUpdateLocalStaffMutation();
// // // // //   const [deleteStaff] = useDeleteLocalStaffMutation();

// // // // //   const [createProduct] = useCreateLocalProductMutation();
// // // // //   const [updateProduct] = useUpdateLocalProductMutation();
// // // // //   const [deleteProduct] = useDeleteLocalProductMutation();

// // // // //   const [createStore] = useCreateLocalStoreMutation();
// // // // //   const [updateStore] = useUpdateLocalStoreMutation();
// // // // //   const [deleteStore] = useDeleteLocalStoreMutation();

// // // // //   const [createCategory] = useCreateLocalCategoryMutation();
// // // // //   const [updateCategory] = useUpdateLocalCategoryMutation();
// // // // //   const [deleteCategory] = useDeleteLocalCategoryMutation();

// // // // //   const [createCustomer] = useCreateLocalCustomerMutation();
// // // // //   const [updateCustomer] = useUpdateLocalCustomerMutation();
// // // // //   const [deleteCustomer] = useDeleteLocalCustomerMutation();

// // // // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // // // //   const [updateSupplier] = useUpdateLocalSupplierMutation();
// // // // //   const [deleteSupplier] = useDeleteLocalSupplierMutation();

// // // // //   const [createBrand] = useCreateLocalBrandMutation();
// // // // //   const [updateBrand] = useUpdateLocalBrandMutation();
// // // // //   const [deleteBrand] = useDeleteLocalBrandMutation();

// // // // //   const [openSession] = useOpenLocalSessionMutation();
// // // // //   const [closeSession] = useCloseLocalSessionMutation();

// // // // //   const refetchers = {
// // // // //     staff: refetchStaff,
// // // // //     products: refetchProducts,
// // // // //     stores: refetchStores,
// // // // //     categories: refetchCategories,
// // // // //     customers: refetchCustomers,
// // // // //     suppliers: refetchSuppliers,
// // // // //     brands: refetchBrands,
// // // // //     sessions: refetchSession,
// // // // //   } as const;

// // // // //   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

// // // // //   const storeOptions = useMemo(() => stores, [stores]);

// // // // //   if (!isPrivileged) {
// // // // //     return (
// // // // //       <Screen>
// // // // //         <SafeAreaView className="flex-1">
// // // // //           <View className="flex-1 items-center justify-center px-6">
// // // // //             <Pill label="Restricted" tone="rose" />
// // // // //             <Text className="mt-4 text-3xl font-black text-white">
// // // // //               Management locked
// // // // //             </Text>
// // // // //             <Text className="mt-3 text-center text-sm text-slate-300">
// // // // //               Your account does not have access to staff, product, or store
// // // // //               management.
// // // // //             </Text>
// // // // //           </View>
// // // // //         </SafeAreaView>
// // // // //       </Screen>
// // // // //     );
// // // // //   }

// // // // //   const summary = [
// // // // //     {
// // // // //       label: "Staff",
// // // // //       value: String(staff.length),
// // // // //       icon: "groups" as const,
// // // // //       tone: "sky" as const,
// // // // //     },
// // // // //     {
// // // // //       label: "Products",
// // // // //       value: String(products.length),
// // // // //       icon: "inventory-2" as const,
// // // // //       tone: "emerald" as const,
// // // // //     },
// // // // //     {
// // // // //       label: "Stores",
// // // // //       value: String(stores.length),
// // // // //       icon: "store" as const,
// // // // //       tone: "amber" as const,
// // // // //     },
// // // // //     {
// // // // //       label: "Customers",
// // // // //       value: String(customers.length),
// // // // //       icon: "person" as const,
// // // // //       tone: "rose" as const,
// // // // //     },
// // // // //     {
// // // // //       label: "Brands",
// // // // //       value: String(brands.length),
// // // // //       icon: "branding-watermark" as const,
// // // // //       tone: "purple" as const,
// // // // //     },
// // // // //   ];

// // // // //   const list = getModuleList({
// // // // //     moduleKey,
// // // // //     staff,
// // // // //     products,
// // // // //     stores,
// // // // //     categories,
// // // // //     customers,
// // // // //     suppliers,
// // // // //     brands,
// // // // //     activeSession,
// // // // //   });

// // // // //   const handleSave = async (values: Record<string, any>) => {
// // // // //     try {
// // // // //       const nextValues = buildPayload(moduleKey, values, currentStoreId);

// // // // //       if (moduleKey === "staff") {
// // // // //         if (editor.mode === "create") await createStaff(nextValues).unwrap();
// // // // //         else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       } else if (moduleKey === "products") {
// // // // //         if (editor.mode === "create") await createProduct(nextValues).unwrap();
// // // // //         else
// // // // //           await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       } else if (moduleKey === "stores") {
// // // // //         if (editor.mode === "create") await createStore(nextValues).unwrap();
// // // // //         else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       } else if (moduleKey === "categories") {
// // // // //         if (editor.mode === "create") await createCategory(nextValues).unwrap();
// // // // //         else
// // // // //           await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       } else if (moduleKey === "customers") {
// // // // //         if (editor.mode === "create") await createCustomer(nextValues).unwrap();
// // // // //         else
// // // // //           await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       } else if (moduleKey === "suppliers") {
// // // // //         if (editor.mode === "create") await createSupplier(nextValues).unwrap();
// // // // //         else
// // // // //           await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       } else if (moduleKey === "brands") {
// // // // //         if (editor.mode === "create") await createBrand(nextValues).unwrap();
// // // // //         else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
// // // // //       }

// // // // //       await refetchers[moduleKey]();
// // // // //       setEditor({ open: false, mode: "create" });
// // // // //     } catch (error: any) {
// // // // //       Alert.alert(
// // // // //         "Save failed",
// // // // //         error?.data?.message || "Unable to save changes.",
// // // // //       );
// // // // //     }
// // // // //   };

// // // // //   const handleDelete = async (item: any) => {
// // // // //     try {
// // // // //       if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
// // // // //       else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
// // // // //       else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
// // // // //       else if (moduleKey === "categories")
// // // // //         await deleteCategory(item.id).unwrap();
// // // // //       else if (moduleKey === "customers")
// // // // //         await deleteCustomer(item.id).unwrap();
// // // // //       else if (moduleKey === "suppliers")
// // // // //         await deleteSupplier(item.id).unwrap();
// // // // //       else if (moduleKey === "brands") await deleteBrand(item.id).unwrap();
// // // // //       await refetchers[moduleKey]();
// // // // //     } catch (error: any) {
// // // // //       Alert.alert(
// // // // //         "Delete failed",
// // // // //         error?.data?.message || "Unable to delete item.",
// // // // //       );
// // // // //     }
// // // // //   };

// // // // //   const openEditor = (mode: "create" | "edit", item?: any) => {
// // // // //     setEditor({ open: true, mode, item });
// // // // //   };

// // // // //   return (
// // // // //     <Screen>
// // // // //       <SafeAreaView className="flex-1 bg-slate-950">
// // // // //         <ScrollView
// // // // //           showsVerticalScrollIndicator={false}
// // // // //           contentContainerStyle={{ paddingBottom: 28 }}
// // // // //           className="px-5"
// // // // //         >
// // // // //           <Header
// // // // //             eyebrow="Administration"
// // // // //             title="Management"
// // // // //             subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, and session control from one place."
// // // // //             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
// // // // //           />

// // // // //           <View className="mb-4 flex-row flex-wrap gap-3">
// // // // //             {summary.map((item) => (
// // // // //               <View key={item.label} className="w-[48.5%]">
// // // // //                 <MetricCard
// // // // //                   icon={item.icon}
// // // // //                   label={item.label}
// // // // //                   value={item.value}
// // // // //                   tone={item.tone}
// // // // //                 />
// // // // //               </View>
// // // // //             ))}
// // // // //           </View>

// // // // //           <Card className="mb-4">
// // // // //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //               Store context
// // // // //             </Text>
// // // // //             <ScrollView
// // // // //               horizontal
// // // // //               showsHorizontalScrollIndicator={false}
// // // // //               className="mt-3"
// // // // //               contentContainerStyle={{ gap: 8 }}
// // // // //             >
// // // // //               {storeOptions.map((store: any) => {
// // // // //                 const active = store.id === currentStoreId;
// // // // //                 return (
// // // // //                   <Pressable
// // // // //                     key={store.id}
// // // // //                     onPress={() => dispatch(setStore(store.id))}
// // // // //                     className={`rounded-full border px-4 py-3 ${
// // // // //                       active
// // // // //                         ? "border-sky-400/30 bg-sky-500/15"
// // // // //                         : "border-white/10 bg-white/5"
// // // // //                     }`}
// // // // //                   >
// // // // //                     <Text
// // // // //                       className={`text-xs font-bold uppercase tracking-[2px] ${
// // // // //                         active ? "text-sky-200" : "text-slate-300"
// // // // //                       }`}
// // // // //                     >
// // // // //                       {store.name}
// // // // //                     </Text>
// // // // //                   </Pressable>
// // // // //                 );
// // // // //               })}
// // // // //             </ScrollView>
// // // // //           </Card>

// // // // //           <SectionTitle title="Modules" />
// // // // //           <View className="mb-4 flex-row flex-wrap gap-2">
// // // // //             {(
// // // // //               [
// // // // //                 "products",
// // // // //                 "staff",
// // // // //                 "stores",
// // // // //                 "categories",
// // // // //                 "customers",
// // // // //                 "suppliers",
// // // // //                 "brands",
// // // // //                 "sessions",
// // // // //               ] as ModuleKey[]
// // // // //             ).map((key) => (
// // // // //               <Pressable
// // // // //                 key={key}
// // // // //                 onPress={() => setModuleKey(key)}
// // // // //                 className={`rounded-full border px-4 py-3 ${
// // // // //                   moduleKey === key
// // // // //                     ? "border-emerald-400/30 bg-emerald-500/15"
// // // // //                     : "border-white/10 bg-white/5"
// // // // //                 }`}
// // // // //               >
// // // // //                 <Text
// // // // //                   className={`text-xs font-bold uppercase tracking-[2px] ${
// // // // //                     moduleKey === key ? "text-emerald-200" : "text-slate-300"
// // // // //                   }`}
// // // // //                 >
// // // // //                   {key}
// // // // //                 </Text>
// // // // //               </Pressable>
// // // // //             ))}
// // // // //           </View>

// // // // //           <View className="mb-4 flex-row gap-3">
// // // // //             <ActionButton
// // // // //               title="Add New"
// // // // //               icon="add"
// // // // //               accent="emerald"
// // // // //               onPress={() => openEditor("create")}
// // // // //             />
// // // // //             {moduleKey === "sessions" ? (
// // // // //               <ActionButton
// // // // //                 title={activeSession ? "Close Session" : "Open Session"}
// // // // //                 icon="schedule"
// // // // //                 accent={activeSession ? "rose" : "sky"}
// // // // //                 onPress={() =>
// // // // //                   setSessionModal(activeSession ? "close" : "open")
// // // // //                 }
// // // // //               />
// // // // //             ) : (
// // // // //               <ActionButton
// // // // //                 title="Refresh"
// // // // //                 icon="refresh"
// // // // //                 accent="sky"
// // // // //                 onPress={() => refetchers[moduleKey]()}
// // // // //               />
// // // // //             )}
// // // // //           </View>

// // // // //           <SectionTitle
// // // // //             title={`${moduleKey} list`}
// // // // //             action="Tap an item to edit"
// // // // //           />
// // // // //           <Card>
// // // // //             {list.length ? (
// // // // //               list.map((item: any, index: number) => (
// // // // //                 <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
// // // // //                   <Pressable onPress={() => openEditor("edit", item)}>
// // // // //                     <RowItem
// // // // //                       title={item.name || item.username || item.code || item.id}
// // // // //                       subtitle={getSubtitle(moduleKey, item)}
// // // // //                       right={getRightLabel(moduleKey, item)}
// // // // //                       icon={getIcon(moduleKey)}
// // // // //                     />
// // // // //                   </Pressable>
// // // // //                   {index < list.length - 1 ? (
// // // // //                     <View className="my-3 h-px bg-white/8" />
// // // // //                   ) : null}
// // // // //                 </View>
// // // // //               ))
// // // // //             ) : (
// // // // //               <View className="py-8 items-center">
// // // // //                 <View className="h-16 w-16 bg-white/5 rounded-full items-center justify-center border border-white/10">
// // // // //                   <MaterialIcons name="inbox" size={28} color="#64748b" />
// // // // //                 </View>
// // // // //                 <Text className="text-slate-400 text-center text-sm mt-3">
// // // // //                   No {moduleKey} found
// // // // //                 </Text>
// // // // //                 <Text className="text-slate-500 text-xs text-center mt-1">
// // // // //                   Create one by tapping "Add New"
// // // // //                 </Text>
// // // // //               </View>
// // // // //             )}
// // // // //           </Card>
// // // // //         </ScrollView>

// // // // //         {/* ✅ Editor Modal with overlay */}
// // // // //         <Modal
// // // // //           visible={editor.open}
// // // // //           animationType="slide"
// // // // //           onRequestClose={() => setEditor({ open: false, mode: "create" })}
// // // // //           transparent={true}
// // // // //         >
// // // // //           <View className="flex-1 bg-black/70">
// // // // //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// // // // //               <EditorModalContent
// // // // //                 title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
// // // // //                 moduleKey={moduleKey}
// // // // //                 item={editor.item}
// // // // //                 mode={editor.mode}
// // // // //                 onClose={() => setEditor({ open: false, mode: "create" })}
// // // // //                 onSave={handleSave}
// // // // //                 onDelete={
// // // // //                   editor.item ? () => handleDelete(editor.item) : undefined
// // // // //                 }
// // // // //                 currentStoreId={currentStoreId}
// // // // //                 stores={stores}
// // // // //                 categories={categories}
// // // // //                 suppliers={suppliers}
// // // // //                 brands={brands}
// // // // //                 refetchCategories={refetchCategories}
// // // // //                 refetchSuppliers={refetchSuppliers}
// // // // //                 refetchBrands={refetchBrands}
// // // // //               />
// // // // //             </View>
// // // // //           </View>
// // // // //         </Modal>

// // // // //         {/* ✅ Session Modal with overlay */}
// // // // //         <Modal
// // // // //           visible={sessionModal !== null}
// // // // //           animationType="slide"
// // // // //           onRequestClose={() => setSessionModal(null)}
// // // // //           transparent={true}
// // // // //         >
// // // // //           <View className="flex-1 bg-black/70">
// // // // //             <View className="flex-1 mt-20 bg-slate-900 rounded-t-3xl">
// // // // //               <SessionModalContent
// // // // //                 mode={sessionModal}
// // // // //                 activeSession={activeSession}
// // // // //                 onClose={() => setSessionModal(null)}
// // // // //                 onOpen={async (openingBalance, notes) => {
// // // // //                   try {
// // // // //                     await openSession({
// // // // //                       userId: user?.id || "",
// // // // //                       openingBalance: Number(openingBalance || 0),
// // // // //                       notes,
// // // // //                       storeId: currentStoreId || undefined,
// // // // //                     }).unwrap();
// // // // //                     setSessionModal(null);
// // // // //                     await refetchSession();
// // // // //                   } catch (error: any) {
// // // // //                     Alert.alert(
// // // // //                       "Open session failed",
// // // // //                       error?.data?.message || "Unable to open session.",
// // // // //                     );
// // // // //                   }
// // // // //                 }}
// // // // //                 onCloseSession={async (closingBalance, notes) => {
// // // // //                   try {
// // // // //                     if (!activeSession) return;
// // // // //                     await closeSession({
// // // // //                       id: activeSession.id,
// // // // //                       closingBalance: Number(closingBalance || 0),
// // // // //                       expectedBalance: Number(closingBalance || 0),
// // // // //                       discrepancy: 0,
// // // // //                       cashSales: 0,
// // // // //                       cardSales: 0,
// // // // //                       digitalSales: 0,
// // // // //                       notes,
// // // // //                     }).unwrap();
// // // // //                     setSessionModal(null);
// // // // //                     await refetchSession();
// // // // //                   } catch (error: any) {
// // // // //                     Alert.alert(
// // // // //                       "Close session failed",
// // // // //                       error?.data?.message || "Unable to close session.",
// // // // //                     );
// // // // //                   }
// // // // //                 }}
// // // // //               />
// // // // //             </View>
// // // // //           </View>
// // // // //         </Modal>
// // // // //       </SafeAreaView>
// // // // //     </Screen>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // EDITOR MODAL CONTENT
// // // // // // ============================================

// // // // // function EditorModalContent({
// // // // //   title,
// // // // //   moduleKey,
// // // // //   item,
// // // // //   mode,
// // // // //   onClose,
// // // // //   onSave,
// // // // //   onDelete,
// // // // //   currentStoreId,
// // // // //   stores,
// // // // //   categories,
// // // // //   suppliers,
// // // // //   brands,
// // // // //   refetchCategories,
// // // // //   refetchSuppliers,
// // // // //   refetchBrands,
// // // // // }: {
// // // // //   title: string;
// // // // //   moduleKey: ModuleKey;
// // // // //   item?: any;
// // // // //   mode: "create" | "edit";
// // // // //   onClose: () => void;
// // // // //   onSave: (values: Record<string, any>) => Promise<void>;
// // // // //   onDelete?: () => void;
// // // // //   currentStoreId: string | null;
// // // // //   stores: any[];
// // // // //   categories: any[];
// // // // //   suppliers: any[];
// // // // //   brands: any[];
// // // // //   refetchCategories: () => void;
// // // // //   refetchSuppliers: () => void;
// // // // //   refetchBrands: () => void;
// // // // // }) {
// // // // //   const [fields, setFields] = useState<Record<string, any>>({});
// // // // //   const [showCreateCategory, setShowCreateCategory] = useState(false);
// // // // //   const [showCreateSupplier, setShowCreateSupplier] = useState(false);
// // // // //   const [showCreateBrand, setShowCreateBrand] = useState(false);
// // // // //   const [newCategory, setNewCategory] = useState({
// // // // //     name: "",
// // // // //     slug: "",
// // // // //     description: "",
// // // // //   });
// // // // //   const [newSupplier, setNewSupplier] = useState({
// // // // //     name: "",
// // // // //     code: "",
// // // // //     phone: "",
// // // // //     email: "",
// // // // //     address: "",
// // // // //     contactName: "",
// // // // //   });
// // // // //   const [newBrand, setNewBrand] = useState({
// // // // //     name: "",
// // // // //     description: "",
// // // // //   });
// // // // //   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
// // // // //   const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
// // // // //   const [isCreatingBrand, setIsCreatingBrand] = useState(false);

// // // // //   const [createCategory] = useCreateLocalCategoryMutation();
// // // // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // // // //   const [createBrand] = useCreateLocalBrandMutation();

// // // // //   useEffect(() => {
// // // // //     if (item !== undefined) {
// // // // //       setFields(item ? { ...item } : getDefaultFields(moduleKey));
// // // // //     }
// // // // //   }, [item, moduleKey]);

// // // // //   const set = (key: string, value: any) =>
// // // // //     setFields((current) => ({ ...current, [key]: value }));

// // // // //   const save = () => onSave(fields);

// // // // //   const handleCreateCategory = async () => {
// // // // //     try {
// // // // //       if (!newCategory.name.trim()) {
// // // // //         Alert.alert("Error", "Category name is required");
// // // // //         return;
// // // // //       }

// // // // //       setIsCreatingCategory(true);
// // // // //       if (!currentStoreId) {
// // // // //         Alert.alert("Error", "Store not found");
// // // // //         return;
// // // // //       }

// // // // //       const payload = {
// // // // //         tenantId: "default",
// // // // //         name: newCategory.name.trim(),
// // // // //         slug:
// // // // //           newCategory.slug.trim() ||
// // // // //           newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
// // // // //         description: newCategory.description.trim() || undefined,
// // // // //         storeId: currentStoreId,
// // // // //         isActive: true,
// // // // //       };

// // // // //       const result = await createCategory(payload).unwrap();
// // // // //       await refetchCategories();
// // // // //       set("categoryId", result?.id);
// // // // //       set("categoryName", result?.name);

// // // // //       setShowCreateCategory(false);
// // // // //       setNewCategory({ name: "", slug: "", description: "" });

// // // // //       Alert.alert("Success", "Category created successfully");
// // // // //     } catch (error: any) {
// // // // //       Alert.alert(
// // // // //         "Failed to create category",
// // // // //         error?.data?.message || "Unable to create category.",
// // // // //       );
// // // // //     } finally {
// // // // //       setIsCreatingCategory(false);
// // // // //     }
// // // // //   };

// // // // //   const handleCreateSupplier = async () => {
// // // // //     try {
// // // // //       if (!newSupplier.name.trim()) {
// // // // //         Alert.alert("Error", "Supplier name is required");
// // // // //         return;
// // // // //       }

// // // // //       setIsCreatingSupplier(true);
// // // // //       if (!currentStoreId) {
// // // // //         Alert.alert("Error", "Store not found");
// // // // //         return;
// // // // //       }

// // // // //       const payload = {
// // // // //         tenantId: "default",
// // // // //         name: newSupplier.name.trim(),
// // // // //         code: newSupplier.code.trim() || undefined,
// // // // //         contactName: newSupplier.contactName.trim() || undefined,
// // // // //         phone: newSupplier.phone.trim() || undefined,
// // // // //         email: newSupplier.email.trim() || undefined,
// // // // //         address: newSupplier.address.trim() || undefined,
// // // // //         storeId: currentStoreId,
// // // // //         isActive: true,
// // // // //       };

// // // // //       const result = await createSupplier(payload).unwrap();
// // // // //       await refetchSuppliers();
// // // // //       set("supplierId", result.id);
// // // // //       set("supplierName", result.name);

// // // // //       setShowCreateSupplier(false);
// // // // //       setNewSupplier({
// // // // //         name: "",
// // // // //         code: "",
// // // // //         phone: "",
// // // // //         email: "",
// // // // //         address: "",
// // // // //         contactName: "",
// // // // //       });

// // // // //       Alert.alert("Success", "Supplier created successfully");
// // // // //     } catch (error: any) {
// // // // //       Alert.alert(
// // // // //         "Failed to create supplier",
// // // // //         error?.data?.message || "Unable to create supplier.",
// // // // //       );
// // // // //     } finally {
// // // // //       setIsCreatingSupplier(false);
// // // // //     }
// // // // //   };

// // // // //   const handleCreateBrand = async () => {
// // // // //     try {
// // // // //       if (!newBrand.name.trim()) {
// // // // //         Alert.alert("Error", "Brand name is required");
// // // // //         return;
// // // // //       }

// // // // //       setIsCreatingBrand(true);

// // // // //       const payload = {
// // // // //         tenantId: "default",
// // // // //         name: newBrand.name.trim(),
// // // // //         description: newBrand.description.trim() || undefined,
// // // // //         isActive: true,
// // // // //       };

// // // // //       const result = await createBrand(payload).unwrap();
// // // // //       await refetchBrands();
// // // // //       set("brandId", result.id);
// // // // //       set("brand", result.name);

// // // // //       setShowCreateBrand(false);
// // // // //       setNewBrand({ name: "", description: "" });

// // // // //       Alert.alert("Success", "Brand created successfully");
// // // // //     } catch (error: any) {
// // // // //       Alert.alert(
// // // // //         "Failed to create brand",
// // // // //         error?.data?.message || "Unable to create brand.",
// // // // //       );
// // // // //     } finally {
// // // // //       setIsCreatingBrand(false);
// // // // //     }
// // // // //   };

// // // // //   return (
// // // // //     <SafeAreaView className="flex-1 px-4 pt-4">
// // // // //       <View className="flex-row items-center justify-between mb-6">
// // // // //         <Text className="text-white text-xl font-black">{title}</Text>
// // // // //         <Pressable onPress={onClose}>
// // // // //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// // // // //         </Pressable>
// // // // //       </View>

// // // // //       <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
// // // // //         {/* Staff Form */}
// // // // //         {moduleKey === "staff" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Username"
// // // // //               value={fields.username ?? ""}
// // // // //               onChangeText={(v) => set("username", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Email"
// // // // //               value={fields.email ?? ""}
// // // // //               onChangeText={(v) => set("email", v)}
// // // // //             />
// // // // //             {mode === "create" && (
// // // // //               <Field
// // // // //                 label="Password"
// // // // //                 value={fields.password ?? ""}
// // // // //                 onChangeText={(v) => set("password", v)}
// // // // //                 secureTextEntry
// // // // //               />
// // // // //             )}

// // // // //             <StoreSelector
// // // // //               value={fields.storeId ?? ""}
// // // // //               onChange={(storeId, storeName) => {
// // // // //                 set("storeId", storeId);
// // // // //                 set("storeName", storeName);
// // // // //               }}
// // // // //               stores={stores}
// // // // //               label="Assigned Store"
// // // // //             />

// // // // //             <RoleSelector
// // // // //               value={fields.role ?? "CASHIER"}
// // // // //               onChange={(role) => {
// // // // //                 set("role", role);
// // // // //                 set("permissions", getDefaultPermissions(role));
// // // // //               }}
// // // // //             />
// // // // //           </>
// // // // //         )}

// // // // //         {/* Products Form */}
// // // // //         {moduleKey === "products" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="SKU"
// // // // //               value={fields.sku ?? ""}
// // // // //               onChangeText={(v) => set("sku", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Barcode"
// // // // //               value={fields.barcode ?? ""}
// // // // //               onChangeText={(v) => set("barcode", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Description"
// // // // //               value={fields.description ?? ""}
// // // // //               onChangeText={(v) => set("description", v)}
// // // // //               multiline
// // // // //             />

// // // // //             <BrandSelector
// // // // //               value={fields.brandId ?? ""}
// // // // //               onChange={(brandId, brandName) => {
// // // // //                 set("brandId", brandId);
// // // // //                 set("brand", brandName);
// // // // //               }}
// // // // //               brands={brands}
// // // // //               onAddBrand={() => setShowCreateBrand(true)}
// // // // //             />

// // // // //             <Field
// // // // //               label="Cost Price"
// // // // //               value={fields.costPrice?.toString() ?? ""}
// // // // //               onChangeText={(v) => {
// // // // //                 const num = parseFloat(v);
// // // // //                 set("costPrice", isNaN(num) ? 0 : num);
// // // // //               }}
// // // // //               keyboardType="decimal-pad"
// // // // //             />
// // // // //             <Field
// // // // //               label="Selling Price"
// // // // //               value={fields.sellingPrice?.toString() ?? ""}
// // // // //               onChangeText={(v) => {
// // // // //                 const num = parseFloat(v);
// // // // //                 set("sellingPrice", isNaN(num) ? 0 : num);
// // // // //               }}
// // // // //               keyboardType="decimal-pad"
// // // // //             />
// // // // //             <Field
// // // // //               label="Wholesale Price"
// // // // //               value={fields.wholesalePrice?.toString() ?? ""}
// // // // //               onChangeText={(v) => {
// // // // //                 const num = parseFloat(v);
// // // // //                 set("wholesalePrice", isNaN(num) ? 0 : num);
// // // // //               }}
// // // // //               keyboardType="decimal-pad"
// // // // //             />
// // // // //             <Field
// // // // //               label="Initial Stock"
// // // // //               value={fields.initialStock?.toString() ?? ""}
// // // // //               onChangeText={(v) => {
// // // // //                 const num = parseInt(v, 10);
// // // // //                 set("initialStock", isNaN(num) ? 0 : num);
// // // // //               }}
// // // // //               keyboardType="numeric"
// // // // //             />

// // // // //             <CategorySelector
// // // // //               value={fields.categoryId ?? ""}
// // // // //               onChange={(categoryId, categoryName) => {
// // // // //                 set("categoryId", categoryId);
// // // // //                 set("categoryName", categoryName);
// // // // //               }}
// // // // //               categories={categories}
// // // // //               onAddCategory={() => setShowCreateCategory(true)}
// // // // //             />

// // // // //             <SupplierSelector
// // // // //               value={fields.supplierId ?? ""}
// // // // //               onChange={(supplierId, supplierName) => {
// // // // //                 set("supplierId", supplierId);
// // // // //                 set("supplierName", supplierName);
// // // // //               }}
// // // // //               suppliers={suppliers}
// // // // //             />

// // // // //             {showCreateCategory && (
// // // // //               <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
// // // // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
// // // // //                   Create New Category
// // // // //                 </Text>
// // // // //                 <Field
// // // // //                   label="Category Name"
// // // // //                   value={newCategory.name}
// // // // //                   onChangeText={(v) => {
// // // // //                     setNewCategory({ ...newCategory, name: v });
// // // // //                     if (!newCategory.slug) {
// // // // //                       const slug = v.toLowerCase().replace(/\s+/g, "-");
// // // // //                       setNewCategory((prev) => ({ ...prev, slug }));
// // // // //                     }
// // // // //                   }}
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Slug (URL friendly)"
// // // // //                   value={newCategory.slug}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewCategory({ ...newCategory, slug: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Description"
// // // // //                   value={newCategory.description}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewCategory({ ...newCategory, description: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <View className="mt-2 flex-row gap-3">
// // // // //                   <ActionButton
// // // // //                     title="Cancel"
// // // // //                     icon="close"
// // // // //                     accent="rose"
// // // // //                     onPress={() => setShowCreateCategory(false)}
// // // // //                   />
// // // // //                   <ActionButton
// // // // //                     title="Create"
// // // // //                     icon="add"
// // // // //                     accent="emerald"
// // // // //                     onPress={handleCreateCategory}
// // // // //                     disabled={isCreatingCategory}
// // // // //                   />
// // // // //                 </View>
// // // // //               </View>
// // // // //             )}

// // // // //             {showCreateBrand && (
// // // // //               <View className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
// // // // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-purple-400">
// // // // //                   Create New Brand
// // // // //                 </Text>
// // // // //                 <Field
// // // // //                   label="Brand Name"
// // // // //                   value={newBrand.name}
// // // // //                   onChangeText={(v) => setNewBrand({ ...newBrand, name: v })}
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Description"
// // // // //                   value={newBrand.description}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewBrand({ ...newBrand, description: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <View className="mt-2 flex-row gap-3">
// // // // //                   <ActionButton
// // // // //                     title="Cancel"
// // // // //                     icon="close"
// // // // //                     accent="rose"
// // // // //                     onPress={() => setShowCreateBrand(false)}
// // // // //                   />
// // // // //                   <ActionButton
// // // // //                     title="Create"
// // // // //                     icon="add"
// // // // //                     accent="emerald"
// // // // //                     onPress={handleCreateBrand}
// // // // //                     disabled={isCreatingBrand}
// // // // //                   />
// // // // //                 </View>
// // // // //               </View>
// // // // //             )}
// // // // //           </>
// // // // //         )}

// // // // //         {/* Stores Form */}
// // // // //         {moduleKey === "stores" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Code"
// // // // //               value={fields.code ?? ""}
// // // // //               onChangeText={(v) => set("code", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Address"
// // // // //               value={fields.address ?? ""}
// // // // //               onChangeText={(v) => set("address", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Phone"
// // // // //               value={fields.phone ?? ""}
// // // // //               onChangeText={(v) => set("phone", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Email"
// // // // //               value={fields.email ?? ""}
// // // // //               onChangeText={(v) => set("email", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Tax Number"
// // // // //               value={fields.taxNumber ?? ""}
// // // // //               onChangeText={(v) => set("taxNumber", v)}
// // // // //             />
// // // // //           </>
// // // // //         )}

// // // // //         {/* Categories Form */}
// // // // //         {moduleKey === "categories" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Slug"
// // // // //               value={fields.slug ?? ""}
// // // // //               onChangeText={(v) => set("slug", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Description"
// // // // //               value={fields.description ?? ""}
// // // // //               onChangeText={(v) => set("description", v)}
// // // // //             />
// // // // //           </>
// // // // //         )}

// // // // //         {/* Brands Form */}
// // // // //         {moduleKey === "brands" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Description"
// // // // //               value={fields.description ?? ""}
// // // // //               onChangeText={(v) => set("description", v)}
// // // // //               multiline
// // // // //             />
// // // // //           </>
// // // // //         )}

// // // // //         {/* Customers Form */}
// // // // //         {moduleKey === "customers" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Phone"
// // // // //               value={fields.phone ?? ""}
// // // // //               onChangeText={(v) => set("phone", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Email"
// // // // //               value={fields.email ?? ""}
// // // // //               onChangeText={(v) => set("email", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Address"
// // // // //               value={fields.address ?? ""}
// // // // //               onChangeText={(v) => set("address", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Date of Birth"
// // // // //               value={fields.dateOfBirth ?? ""}
// // // // //               onChangeText={(v) => set("dateOfBirth", v)}
// // // // //               placeholder="YYYY-MM-DD"
// // // // //             />
// // // // //             <Field
// // // // //               label="Gender"
// // // // //               value={fields.gender ?? ""}
// // // // //               onChangeText={(v) => set("gender", v)}
// // // // //               placeholder="MALE / FEMALE / OTHER"
// // // // //             />
// // // // //           </>
// // // // //         )}

// // // // //         {/* Suppliers Form */}
// // // // //         {moduleKey === "suppliers" && (
// // // // //           <>
// // // // //             <Field
// // // // //               label="Name"
// // // // //               value={fields.name ?? ""}
// // // // //               onChangeText={(v) => set("name", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Code"
// // // // //               value={fields.code ?? ""}
// // // // //               onChangeText={(v) => set("code", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Contact Person"
// // // // //               value={fields.contactName ?? ""}
// // // // //               onChangeText={(v) => set("contactName", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Phone"
// // // // //               value={fields.phone ?? ""}
// // // // //               onChangeText={(v) => set("phone", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Email"
// // // // //               value={fields.email ?? ""}
// // // // //               onChangeText={(v) => set("email", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Address"
// // // // //               value={fields.address ?? ""}
// // // // //               onChangeText={(v) => set("address", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Tax Number"
// // // // //               value={fields.taxNumber ?? ""}
// // // // //               onChangeText={(v) => set("taxNumber", v)}
// // // // //             />
// // // // //             <Field
// // // // //               label="Payment Terms (days)"
// // // // //               value={fields.paymentTerms?.toString() ?? ""}
// // // // //               onChangeText={(v) => {
// // // // //                 const num = parseInt(v, 10);
// // // // //                 set("paymentTerms", isNaN(num) ? undefined : num);
// // // // //               }}
// // // // //               keyboardType="numeric"
// // // // //               placeholder="30"
// // // // //             />
// // // // //             <Field
// // // // //               label="Credit Limit"
// // // // //               value={fields.creditLimit?.toString() ?? ""}
// // // // //               onChangeText={(v) => {
// // // // //                 const num = parseFloat(v);
// // // // //                 set("creditLimit", isNaN(num) ? undefined : num);
// // // // //               }}
// // // // //               keyboardType="decimal-pad"
// // // // //               placeholder="0.00"
// // // // //             />

// // // // //             {showCreateSupplier && (
// // // // //               <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
// // // // //                 <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-emerald-400">
// // // // //                   Create New Supplier
// // // // //                 </Text>
// // // // //                 <Field
// // // // //                   label="Supplier Name"
// // // // //                   value={newSupplier.name}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewSupplier({ ...newSupplier, name: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Code"
// // // // //                   value={newSupplier.code}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewSupplier({ ...newSupplier, code: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Contact Person"
// // // // //                   value={newSupplier.contactName}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewSupplier({ ...newSupplier, contactName: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Phone"
// // // // //                   value={newSupplier.phone}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewSupplier({ ...newSupplier, phone: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <Field
// // // // //                   label="Email"
// // // // //                   value={newSupplier.email}
// // // // //                   onChangeText={(v) =>
// // // // //                     setNewSupplier({ ...newSupplier, email: v })
// // // // //                   }
// // // // //                 />
// // // // //                 <View className="mt-2 flex-row gap-3">
// // // // //                   <ActionButton
// // // // //                     title="Cancel"
// // // // //                     icon="close"
// // // // //                     accent="rose"
// // // // //                     onPress={() => setShowCreateSupplier(false)}
// // // // //                   />
// // // // //                   <ActionButton
// // // // //                     title="Create"
// // // // //                     icon="add"
// // // // //                     accent="emerald"
// // // // //                     onPress={handleCreateSupplier}
// // // // //                     disabled={isCreatingSupplier}
// // // // //                   />
// // // // //                 </View>
// // // // //               </View>
// // // // //             )}
// // // // //           </>
// // // // //         )}

// // // // //         {/* Sessions - No form */}
// // // // //         {moduleKey === "sessions" && (
// // // // //           <View className="py-8">
// // // // //             <Text className="text-center text-slate-400">
// // // // //               Session management is handled separately.
// // // // //             </Text>
// // // // //             <Text className="text-center text-slate-500 text-sm mt-2">
// // // // //               Use the "Open Session" or "Close Session" button above.
// // // // //             </Text>
// // // // //           </View>
// // // // //         )}

// // // // //         <View className="mt-4 flex-row gap-3">
// // // // //           <ActionButton
// // // // //             title="Cancel"
// // // // //             icon="close"
// // // // //             accent="rose"
// // // // //             onPress={onClose}
// // // // //           />
// // // // //           <ActionButton
// // // // //             title="Save"
// // // // //             icon="save"
// // // // //             accent="emerald"
// // // // //             onPress={save}
// // // // //           />
// // // // //         </View>
// // // // //         {mode === "edit" && onDelete && (
// // // // //           <View className="mt-3">
// // // // //             <ActionButton
// // // // //               title="Delete"
// // // // //               icon="delete"
// // // // //               accent="rose"
// // // // //               onPress={onDelete}
// // // // //             />
// // // // //           </View>
// // // // //         )}
// // // // //       </ScrollView>
// // // // //     </SafeAreaView>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // SESSION MODAL CONTENT
// // // // // // ============================================

// // // // // function SessionModalContent({
// // // // //   mode,
// // // // //   activeSession,
// // // // //   onClose,
// // // // //   onOpen,
// // // // //   onCloseSession,
// // // // // }: {
// // // // //   mode: "open" | "close" | null;
// // // // //   activeSession: any;
// // // // //   onClose: () => void;
// // // // //   onOpen: (openingBalance: string, notes: string) => Promise<void>;
// // // // //   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// // // // // }) {
// // // // //   const [balance, setBalance] = useState("0");
// // // // //   const [notes, setNotes] = useState("");

// // // // //   return (
// // // // //     <SafeAreaView className="flex-1 px-4 pt-4">
// // // // //       <View className="flex-row items-center justify-between mb-6">
// // // // //         <Text className="text-white text-xl font-black">
// // // // //           {mode === "open" ? "Open Session" : "Close Session"}
// // // // //         </Text>
// // // // //         <Pressable onPress={onClose}>
// // // // //           <MaterialIcons name="close" size={24} color="#94a3b8" />
// // // // //         </Pressable>
// // // // //       </View>

// // // // //       <Text className="text-slate-400 text-sm mb-4">
// // // // //         {activeSession ? `Active: ${activeSession.id}` : "No active session"}
// // // // //       </Text>

// // // // //       <TextInput
// // // // //         value={balance}
// // // // //         onChangeText={setBalance}
// // // // //         keyboardType="decimal-pad"
// // // // //         placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
// // // // //         placeholderTextColor="#64748b"
// // // // //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// // // // //       />
// // // // //       <TextInput
// // // // //         value={notes}
// // // // //         onChangeText={setNotes}
// // // // //         placeholder="Notes"
// // // // //         placeholderTextColor="#64748b"
// // // // //         className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
// // // // //         multiline
// // // // //         numberOfLines={3}
// // // // //       />
// // // // //       <View className="flex-row gap-3">
// // // // //         <ActionButton
// // // // //           title="Cancel"
// // // // //           icon="close"
// // // // //           accent="rose"
// // // // //           onPress={onClose}
// // // // //         />
// // // // //         <ActionButton
// // // // //           title={mode === "open" ? "Open" : "Close"}
// // // // //           icon="schedule"
// // // // //           accent="emerald"
// // // // //           onPress={async () => {
// // // // //             if (mode === "open") await onOpen(balance, notes);
// // // // //             else await onCloseSession(balance, notes);
// // // // //           }}
// // // // //         />
// // // // //       </View>
// // // // //     </SafeAreaView>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // ROLE SELECTOR
// // // // // // ============================================

// // // // // function RoleSelector({
// // // // //   value,
// // // // //   onChange,
// // // // // }: {
// // // // //   value: string;
// // // // //   onChange: (role: string) => void;
// // // // // }) {
// // // // //   const roles = [
// // // // //     { label: "Admin", value: "ADMIN", description: "Full system access" },
// // // // //     {
// // // // //       label: "Manager",
// // // // //       value: "MANAGER",
// // // // //       description: "Manage store operations",
// // // // //     },
// // // // //     {
// // // // //       label: "Cashier",
// // // // //       value: "CASHIER",
// // // // //       description: "Process sales and transactions",
// // // // //     },
// // // // //     {
// // // // //       label: "Accountant",
// // // // //       value: "ACCOUNTANT",
// // // // //       description: "Financial and reporting access",
// // // // //     },
// // // // //   ];

// // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // //   const selectedRole = roles.find((r) => r.value === value);

// // // // //   return (
// // // // //     <View className="mb-4">
// // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //         Role
// // // // //       </Text>
// // // // //       <Pressable
// // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // //       >
// // // // //         <View className="flex-row items-center justify-between">
// // // // //           <Text
// // // // //             className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
// // // // //           >
// // // // //             {selectedRole ? selectedRole.label : "Select a role..."}
// // // // //           </Text>
// // // // //           <MaterialIcons
// // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // //             size={24}
// // // // //             color="#64748b"
// // // // //           />
// // // // //         </View>
// // // // //       </Pressable>

// // // // //       {showDropdown && (
// // // // //         <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // //           <ScrollView className="max-h-48" nestedScrollEnabled>
// // // // //             {roles.map((role) => (
// // // // //               <Pressable
// // // // //                 key={role.value}
// // // // //                 onPress={() => {
// // // // //                   onChange(role.value);
// // // // //                   setShowDropdown(false);
// // // // //                 }}
// // // // //                 className={`rounded-xl px-4 py-3 ${
// // // // //                   value === role.value ? "bg-emerald-500/20" : ""
// // // // //                 }`}
// // // // //               >
// // // // //                 <Text className="text-white">{role.label}</Text>
// // // // //                 <Text className="text-xs text-slate-400">
// // // // //                   {role.description}
// // // // //                 </Text>
// // // // //               </Pressable>
// // // // //             ))}
// // // // //           </ScrollView>
// // // // //         </View>
// // // // //       )}
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // function getDefaultPermissions(role: string): string[] {
// // // // //   const permissions = {
// // // // //     ADMIN: [
// // // // //       "VIEW_REPORTS",
// // // // //       "EDIT_PRICES",
// // // // //       "MANAGE_STAFF",
// // // // //       "MANAGE_PRODUCTS",
// // // // //       "VIEW_SALES",
// // // // //       "MANAGE_CUSTOMERS",
// // // // //       "EDIT_INVENTORY",
// // // // //     ],
// // // // //     MANAGER: [
// // // // //       "VIEW_REPORTS",
// // // // //       "EDIT_PRICES",
// // // // //       "MANAGE_PRODUCTS",
// // // // //       "VIEW_SALES",
// // // // //       "MANAGE_CUSTOMERS",
// // // // //     ],
// // // // //     CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
// // // // //     ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
// // // // //   };
// // // // //   return permissions[role as keyof typeof permissions] || [];
// // // // // }

// // // // // // ============================================
// // // // // // STORE SELECTOR
// // // // // // ============================================

// // // // // function StoreSelector({
// // // // //   value,
// // // // //   onChange,
// // // // //   stores,
// // // // //   label = "Store",
// // // // // }: {
// // // // //   value: string;
// // // // //   onChange: (storeId: string, storeName: string) => void;
// // // // //   stores: any[];
// // // // //   label?: string;
// // // // // }) {
// // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // //   const [searchText, setSearchText] = useState("");

// // // // //   const filteredStores = useMemo(() => {
// // // // //     if (!searchText.trim()) return stores;
// // // // //     return stores.filter(
// // // // //       (store) =>
// // // // //         store.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // // // //         store.code?.toLowerCase().includes(searchText.toLowerCase()),
// // // // //     );
// // // // //   }, [stores, searchText]);

// // // // //   const selectedStore = stores.find((store) => store.id === value);

// // // // //   return (
// // // // //     <View className="mb-4">
// // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //         {label}
// // // // //       </Text>
// // // // //       <Pressable
// // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // //       >
// // // // //         <View className="flex-row items-center justify-between">
// // // // //           <Text
// // // // //             className={`text-base ${selectedStore ? "text-white" : "text-slate-400"}`}
// // // // //           >
// // // // //             {selectedStore ? selectedStore.name : "Select a store..."}
// // // // //           </Text>
// // // // //           <MaterialIcons
// // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // //             size={24}
// // // // //             color="#64748b"
// // // // //           />
// // // // //         </View>
// // // // //       </Pressable>

// // // // //       {showDropdown && (
// // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // //           <TextInput
// // // // //             value={searchText}
// // // // //             onChangeText={setSearchText}
// // // // //             placeholder="Search stores..."
// // // // //             placeholderTextColor="#64748b"
// // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // //           />
// // // // //           <ScrollView
// // // // //             className="max-h-48"
// // // // //             showsVerticalScrollIndicator={true}
// // // // //             nestedScrollEnabled={true}
// // // // //           >
// // // // //             {filteredStores.length > 0 ? (
// // // // //               filteredStores.map((store) => (
// // // // //                 <Pressable
// // // // //                   key={store.id}
// // // // //                   onPress={() => {
// // // // //                     onChange(store.id, store.name);
// // // // //                     setShowDropdown(false);
// // // // //                     setSearchText("");
// // // // //                   }}
// // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // //                     value === store.id ? "bg-emerald-500/20" : ""
// // // // //                   }`}
// // // // //                 >
// // // // //                   <Text className="text-white">{store.name}</Text>
// // // // //                   <Text className="text-xs text-slate-400">
// // // // //                     {store.code} • {store.address || "No address"}
// // // // //                   </Text>
// // // // //                 </Pressable>
// // // // //               ))
// // // // //             ) : (
// // // // //               <Text className="py-4 text-center text-slate-400">
// // // // //                 No stores found
// // // // //               </Text>
// // // // //             )}
// // // // //           </ScrollView>
// // // // //         </View>
// // // // //       )}
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // CATEGORY SELECTOR
// // // // // // ============================================

// // // // // function CategorySelector({
// // // // //   value,
// // // // //   onChange,
// // // // //   categories,
// // // // //   onAddCategory,
// // // // //   label = "Category",
// // // // // }: {
// // // // //   value: string;
// // // // //   onChange: (categoryId: string, categoryName: string) => void;
// // // // //   categories: any[];
// // // // //   onAddCategory: () => void;
// // // // //   label?: string;
// // // // // }) {
// // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // //   const [searchText, setSearchText] = useState("");

// // // // //   const filteredCategories = useMemo(() => {
// // // // //     if (!searchText.trim()) return categories;
// // // // //     return categories.filter((cat) =>
// // // // //       cat.name.toLowerCase().includes(searchText.toLowerCase()),
// // // // //     );
// // // // //   }, [categories, searchText]);

// // // // //   const selectedCategory = categories.find((cat) => cat.id === value);

// // // // //   return (
// // // // //     <View className="mb-4">
// // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //         {label}
// // // // //       </Text>

// // // // //       <Pressable
// // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // //       >
// // // // //         <View className="flex-row items-center justify-between">
// // // // //           <Text
// // // // //             className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
// // // // //           >
// // // // //             {selectedCategory ? selectedCategory.name : "Select a category..."}
// // // // //           </Text>
// // // // //           <MaterialIcons
// // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // //             size={24}
// // // // //             color="#64748b"
// // // // //           />
// // // // //         </View>
// // // // //       </Pressable>

// // // // //       {showDropdown && (
// // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // //           <TextInput
// // // // //             value={searchText}
// // // // //             onChangeText={setSearchText}
// // // // //             placeholder="Search categories..."
// // // // //             placeholderTextColor="#64748b"
// // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // //           />

// // // // //           <ScrollView
// // // // //             className="max-h-48"
// // // // //             showsVerticalScrollIndicator={true}
// // // // //             nestedScrollEnabled={true}
// // // // //           >
// // // // //             {filteredCategories.length > 0 ? (
// // // // //               filteredCategories.map((item) => (
// // // // //                 <Pressable
// // // // //                   key={item.id}
// // // // //                   onPress={() => {
// // // // //                     onChange(item.id, item.name);
// // // // //                     setShowDropdown(false);
// // // // //                     setSearchText("");
// // // // //                   }}
// // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // //                     value === item.id ? "bg-emerald-500/20" : ""
// // // // //                   }`}
// // // // //                 >
// // // // //                   <Text className="text-white">{item.name}</Text>
// // // // //                   {item.description && (
// // // // //                     <Text className="text-xs text-slate-400">
// // // // //                       {item.description}
// // // // //                     </Text>
// // // // //                   )}
// // // // //                 </Pressable>
// // // // //               ))
// // // // //             ) : (
// // // // //               <View className="py-4">
// // // // //                 <Text className="text-center text-slate-400">
// // // // //                   No categories found
// // // // //                 </Text>
// // // // //                 {searchText.trim() && (
// // // // //                   <Pressable
// // // // //                     onPress={() => {
// // // // //                       onAddCategory();
// // // // //                       setShowDropdown(false);
// // // // //                       setSearchText("");
// // // // //                     }}
// // // // //                     className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
// // // // //                   >
// // // // //                     <Text className="text-center text-emerald-200">
// // // // //                       Create "{searchText.trim()}"
// // // // //                     </Text>
// // // // //                   </Pressable>
// // // // //                 )}
// // // // //               </View>
// // // // //             )}
// // // // //           </ScrollView>
// // // // //         </View>
// // // // //       )}
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // BRAND SELECTOR
// // // // // // ============================================

// // // // // function BrandSelector({
// // // // //   value,
// // // // //   onChange,
// // // // //   brands,
// // // // //   onAddBrand,
// // // // //   label = "Brand",
// // // // // }: {
// // // // //   value: string;
// // // // //   onChange: (brandId: string, brandName: string) => void;
// // // // //   brands: any[];
// // // // //   onAddBrand: () => void;
// // // // //   label?: string;
// // // // // }) {
// // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // //   const [searchText, setSearchText] = useState("");

// // // // //   const filteredBrands = useMemo(() => {
// // // // //     if (!searchText.trim()) return brands;
// // // // //     return brands.filter((brand) =>
// // // // //       brand.name.toLowerCase().includes(searchText.toLowerCase()),
// // // // //     );
// // // // //   }, [brands, searchText]);

// // // // //   const selectedBrand = brands.find((brand) => brand.id === value);

// // // // //   return (
// // // // //     <View className="mb-4">
// // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //         {label}
// // // // //       </Text>

// // // // //       <Pressable
// // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // //       >
// // // // //         <View className="flex-row items-center justify-between">
// // // // //           <Text
// // // // //             className={`text-base ${selectedBrand ? "text-white" : "text-slate-400"}`}
// // // // //           >
// // // // //             {selectedBrand ? selectedBrand.name : "Select a brand..."}
// // // // //           </Text>
// // // // //           <MaterialIcons
// // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // //             size={24}
// // // // //             color="#64748b"
// // // // //           />
// // // // //         </View>
// // // // //       </Pressable>

// // // // //       {showDropdown && (
// // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // //           <TextInput
// // // // //             value={searchText}
// // // // //             onChangeText={setSearchText}
// // // // //             placeholder="Search brands..."
// // // // //             placeholderTextColor="#64748b"
// // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // //           />

// // // // //           <ScrollView
// // // // //             className="max-h-48"
// // // // //             showsVerticalScrollIndicator={true}
// // // // //             nestedScrollEnabled={true}
// // // // //           >
// // // // //             {filteredBrands.length > 0 ? (
// // // // //               filteredBrands.map((item) => (
// // // // //                 <Pressable
// // // // //                   key={item.id}
// // // // //                   onPress={() => {
// // // // //                     onChange(item.id, item.name);
// // // // //                     setShowDropdown(false);
// // // // //                     setSearchText("");
// // // // //                   }}
// // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // //                     value === item.id ? "bg-purple-500/20" : ""
// // // // //                   }`}
// // // // //                 >
// // // // //                   <Text className="text-white">{item.name}</Text>
// // // // //                   {item.description && (
// // // // //                     <Text className="text-xs text-slate-400">
// // // // //                       {item.description}
// // // // //                     </Text>
// // // // //                   )}
// // // // //                 </Pressable>
// // // // //               ))
// // // // //             ) : (
// // // // //               <View className="py-4">
// // // // //                 <Text className="text-center text-slate-400">
// // // // //                   No brands found
// // // // //                 </Text>
// // // // //                 {searchText.trim() && (
// // // // //                   <Pressable
// // // // //                     onPress={() => {
// // // // //                       onAddBrand();
// // // // //                       setShowDropdown(false);
// // // // //                       setSearchText("");
// // // // //                     }}
// // // // //                     className="mt-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3"
// // // // //                   >
// // // // //                     <Text className="text-center text-purple-200">
// // // // //                       Create "{searchText.trim()}"
// // // // //                     </Text>
// // // // //                   </Pressable>
// // // // //                 )}
// // // // //               </View>
// // // // //             )}
// // // // //           </ScrollView>
// // // // //         </View>
// // // // //       )}
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // SUPPLIER SELECTOR
// // // // // // ============================================

// // // // // function SupplierSelector({
// // // // //   value,
// // // // //   onChange,
// // // // //   suppliers,
// // // // //   label = "Supplier",
// // // // // }: {
// // // // //   value: string;
// // // // //   onChange: (supplierId: string, supplierName: string) => void;
// // // // //   suppliers: any[];
// // // // //   label?: string;
// // // // // }) {
// // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // //   const [searchText, setSearchText] = useState("");

// // // // //   const filteredSuppliers = useMemo(() => {
// // // // //     if (!searchText.trim()) return suppliers;
// // // // //     return suppliers.filter(
// // // // //       (sup) =>
// // // // //         sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // // // //         sup.code?.toLowerCase().includes(searchText.toLowerCase()),
// // // // //     );
// // // // //   }, [suppliers, searchText]);

// // // // //   const selectedSupplier = suppliers.find((sup) => sup.id === value);

// // // // //   return (
// // // // //     <View className="mb-4">
// // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //         {label}
// // // // //       </Text>

// // // // //       <Pressable
// // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // //       >
// // // // //         <View className="flex-row items-center justify-between">
// // // // //           <Text
// // // // //             className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
// // // // //           >
// // // // //             {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
// // // // //           </Text>
// // // // //           <MaterialIcons
// // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // //             size={24}
// // // // //             color="#64748b"
// // // // //           />
// // // // //         </View>
// // // // //       </Pressable>

// // // // //       {showDropdown && (
// // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // //           <TextInput
// // // // //             value={searchText}
// // // // //             onChangeText={setSearchText}
// // // // //             placeholder="Search suppliers..."
// // // // //             placeholderTextColor="#64748b"
// // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // //           />

// // // // //           <ScrollView
// // // // //             className="max-h-48"
// // // // //             showsVerticalScrollIndicator={true}
// // // // //             nestedScrollEnabled={true}
// // // // //           >
// // // // //             {filteredSuppliers.length > 0 ? (
// // // // //               filteredSuppliers.map((item) => (
// // // // //                 <Pressable
// // // // //                   key={item.id}
// // // // //                   onPress={() => {
// // // // //                     onChange(item.id, item.name);
// // // // //                     setShowDropdown(false);
// // // // //                     setSearchText("");
// // // // //                   }}
// // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // //                     value === item.id ? "bg-emerald-500/20" : ""
// // // // //                   }`}
// // // // //                 >
// // // // //                   <Text className="text-white">{item.name}</Text>
// // // // //                   <Text className="text-xs text-slate-400">
// // // // //                     {item.code} • {item.phone || "No phone"}
// // // // //                   </Text>
// // // // //                 </Pressable>
// // // // //               ))
// // // // //             ) : (
// // // // //               <Text className="py-4 text-center text-slate-400">
// // // // //                 No suppliers found
// // // // //               </Text>
// // // // //             )}
// // // // //           </ScrollView>
// // // // //         </View>
// // // // //       )}
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // FIELD COMPONENT
// // // // // // ============================================

// // // // // function Field({
// // // // //   label,
// // // // //   value,
// // // // //   onChangeText,
// // // // //   secureTextEntry = false,
// // // // //   keyboardType = "default",
// // // // //   multiline = false,
// // // // //   placeholder,
// // // // // }: {
// // // // //   label: string;
// // // // //   value: string;
// // // // //   onChangeText: (value: string) => void;
// // // // //   secureTextEntry?: boolean;
// // // // //   keyboardType?:
// // // // //     | "default"
// // // // //     | "decimal-pad"
// // // // //     | "numeric"
// // // // //     | "email-address"
// // // // //     | "phone-pad";
// // // // //   multiline?: boolean;
// // // // //   placeholder?: string;
// // // // // }) {
// // // // //   return (
// // // // //     <View className="mb-4">
// // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // //         {label}
// // // // //       </Text>
// // // // //       <TextInput
// // // // //         value={value}
// // // // //         onChangeText={onChangeText}
// // // // //         placeholder={placeholder || label}
// // // // //         placeholderTextColor="#64748b"
// // // // //         secureTextEntry={secureTextEntry}
// // // // //         keyboardType={keyboardType}
// // // // //         multiline={multiline}
// // // // //         numberOfLines={multiline ? 3 : 1}
// // // // //         className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
// // // // //           multiline ? "min-h-[100px] text-left align-top" : ""
// // // // //         }`}
// // // // //       />
// // // // //     </View>
// // // // //   );
// // // // // }

// // // // // // ============================================
// // // // // // HELPER FUNCTIONS
// // // // // // ============================================

// // // // // function getModuleList(input: any) {
// // // // //   const {
// // // // //     moduleKey,
// // // // //     staff,
// // // // //     products,
// // // // //     stores,
// // // // //     categories,
// // // // //     customers,
// // // // //     suppliers,
// // // // //     brands,
// // // // //     activeSession,
// // // // //   } = input;
// // // // //   if (moduleKey === "staff") return staff;
// // // // //   if (moduleKey === "products") return products;
// // // // //   if (moduleKey === "stores") return stores;
// // // // //   if (moduleKey === "categories") return categories;
// // // // //   if (moduleKey === "customers") return customers;
// // // // //   if (moduleKey === "suppliers") return suppliers;
// // // // //   if (moduleKey === "brands") return brands;
// // // // //   return activeSession ? [activeSession] : [];
// // // // // }

// // // // // function getSubtitle(moduleKey: ModuleKey, item: any) {
// // // // //   if (moduleKey === "staff")
// // // // //     return `${item.role} • ${item.email ?? "no email"}`;
// // // // //   if (moduleKey === "products") {
// // // // //     const brandName = item.brand?.name || item.brandName || "";
// // // // //     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
// // // // //   }
// // // // //   if (moduleKey === "stores") return item.address ?? "No address";
// // // // //   if (moduleKey === "categories") return item.slug ?? "No slug";
// // // // //   if (moduleKey === "customers") return item.phone ?? item.code;
// // // // //   if (moduleKey === "suppliers")
// // // // //     return item.phone ?? item.email ?? "No contact";
// // // // //   if (moduleKey === "brands") return item.description ?? "No description";
// // // // //   if (moduleKey === "sessions")
// // // // //     return `${item.status} • ${item.openedAt ?? ""}`;
// // // // //   return "";
// // // // // }

// // // // // function getRightLabel(moduleKey: ModuleKey, item: any) {
// // // // //   if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
// // // // //   if (moduleKey === "products")
// // // // //     return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
// // // // //   if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
// // // // //   if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
// // // // //   if (moduleKey === "customers") return item.tier ?? "BRONZE";
// // // // //   if (moduleKey === "suppliers") {
// // // // //     if (item.currentBalance !== undefined && item.currentBalance !== null) {
// // // // //       return `$${Number(item.currentBalance).toFixed(2)}`;
// // // // //     }
// // // // //     return item.isActive ? "Active" : "Inactive";
// // // // //   }
// // // // //   if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive";
// // // // //   if (moduleKey === "sessions") return item.status ?? "OPEN";
// // // // //   return "";
// // // // // }

// // // // // function getIcon(moduleKey: ModuleKey) {
// // // // //   if (moduleKey === "staff") return "groups";
// // // // //   if (moduleKey === "products") return "inventory-2";
// // // // //   if (moduleKey === "stores") return "store";
// // // // //   if (moduleKey === "categories") return "category";
// // // // //   if (moduleKey === "customers") return "person";
// // // // //   if (moduleKey === "suppliers") return "local-shipping";
// // // // //   if (moduleKey === "brands") return "branding-watermark";
// // // // //   if (moduleKey === "sessions") return "schedule";
// // // // //   return "schedule";
// // // // // }

// // // // // function getDefaultFields(moduleKey: ModuleKey) {
// // // // //   if (moduleKey === "staff")
// // // // //     return {
// // // // //       username: "",
// // // // //       name: "",
// // // // //       email: "",
// // // // //       password: "",
// // // // //       role: "CASHIER",
// // // // //       permissions: [],
// // // // //       storeId: "",
// // // // //     };
// // // // //   if (moduleKey === "products")
// // // // //     return {
// // // // //       sku: "",
// // // // //       barcode: "",
// // // // //       name: "",
// // // // //       description: "",
// // // // //       brandId: "",
// // // // //       brand: "",
// // // // //       costPrice: 0,
// // // // //       sellingPrice: 0,
// // // // //       wholesalePrice: 0,
// // // // //       categoryId: "",
// // // // //       categoryName: "",
// // // // //       manufacturingDate: "",
// // // // //       expiryDate: "",
// // // // //       supplierId: "",
// // // // //       initialStock: 0,
// // // // //       variants: [],
// // // // //     };
// // // // //   if (moduleKey === "stores")
// // // // //     return {
// // // // //       code: "",
// // // // //       name: "",
// // // // //       address: "",
// // // // //       phone: "",
// // // // //       email: "",
// // // // //       taxNumber: "",
// // // // //     };
// // // // //   if (moduleKey === "categories")
// // // // //     return { name: "", slug: "", description: "" };
// // // // //   if (moduleKey === "brands") return { name: "", description: "" };
// // // // //   if (moduleKey === "customers")
// // // // //     return {
// // // // //       name: "",
// // // // //       phone: "",
// // // // //       email: "",
// // // // //       address: "",
// // // // //       dateOfBirth: "",
// // // // //       gender: "",
// // // // //     };
// // // // //   if (moduleKey === "suppliers")
// // // // //     return {
// // // // //       name: "",
// // // // //       code: "",
// // // // //       contactName: "",
// // // // //       phone: "",
// // // // //       email: "",
// // // // //       address: "",
// // // // //       taxNumber: "",
// // // // //       paymentTerms: "",
// // // // //       creditLimit: "",
// // // // //     };
// // // // //   return {};
// // // // // }

// // // // // function buildPayload(
// // // // //   moduleKey: ModuleKey,
// // // // //   values: Record<string, any>,
// // // // //   currentStoreId: string | null,
// // // // // ) {
// // // // //   if (moduleKey === "staff") {
// // // // //     const payload: any = {
// // // // //       username: String(values.username ?? "").trim(),
// // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       role: values.role ?? "CASHIER",
// // // // //       permissions: Array.isArray(values.permissions) ? values.permissions : [],
// // // // //       isActive: values.isActive ?? true,
// // // // //       storeId: values.storeId || currentStoreId || undefined,
// // // // //     };
// // // // //     if (values.password && String(values.password).trim()) {
// // // // //       payload.password = String(values.password).trim();
// // // // //     }
// // // // //     return payload;
// // // // //   }

// // // // //   if (moduleKey === "products") {
// // // // //     const payload: any = {
// // // // //       tenantId: "default",
// // // // //       sku: String(values.sku ?? "").trim() || undefined,
// // // // //       barcode: String(values.barcode ?? "").trim() || undefined,
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       description: String(values.description ?? "").trim() || undefined,
// // // // //       brandId: String(values.brandId ?? "").trim() || undefined,
// // // // //       costPrice: Number(values.costPrice ?? 0),
// // // // //       sellingPrice: Number(values.sellingPrice ?? 0),
// // // // //       wholesalePrice: Number(values.wholesalePrice ?? 0),
// // // // //       categoryId: String(values.categoryId ?? "").trim() || undefined,
// // // // //       categoryName: String(values.categoryName ?? "").trim() || undefined,
// // // // //       manufacturingDate:
// // // // //         String(values.manufacturingDate ?? "").trim() || undefined,
// // // // //       expiryDate: String(values.expiryDate ?? "").trim() || undefined,
// // // // //       supplierId: String(values.supplierId ?? "").trim() || undefined,
// // // // //       storeId: currentStoreId || undefined,
// // // // //       initialStock: values.initialStock
// // // // //         ? Number(values.initialStock)
// // // // //         : undefined,
// // // // //     };
// // // // //     Object.keys(payload).forEach((key) => {
// // // // //       if (payload[key] === undefined) delete payload[key];
// // // // //     });
// // // // //     return payload;
// // // // //   }

// // // // //   if (moduleKey === "stores") {
// // // // //     return {
// // // // //       tenantId: "default",
// // // // //       code: String(values.code ?? "").trim() || undefined,
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       address: String(values.address ?? "").trim() || undefined,
// // // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // // // //       isActive: values.isActive ?? true,
// // // // //     };
// // // // //   }

// // // // //   if (moduleKey === "categories") {
// // // // //     return {
// // // // //       tenantId: "default",
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       slug: String(values.slug ?? "").trim(),
// // // // //       description: String(values.description ?? "").trim() || undefined,
// // // // //       storeId: currentStoreId || undefined,
// // // // //       isActive: values.isActive ?? true,
// // // // //     };
// // // // //   }

// // // // //   if (moduleKey === "brands") {
// // // // //     return {
// // // // //       tenantId: "default",
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       description: String(values.description ?? "").trim() || undefined,
// // // // //       isActive: values.isActive ?? true,
// // // // //     };
// // // // //   }

// // // // //   if (moduleKey === "customers") {
// // // // //     return {
// // // // //       tenantId: "default",
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // //       address: String(values.address ?? "").trim() || undefined,
// // // // //       dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
// // // // //       gender: String(values.gender ?? "").trim() || undefined,
// // // // //     };
// // // // //   }

// // // // //   if (moduleKey === "suppliers") {
// // // // //     return {
// // // // //       tenantId: "default",
// // // // //       name: String(values.name ?? "").trim(),
// // // // //       code: String(values.code ?? "").trim() || undefined,
// // // // //       contactName: String(values.contactName ?? "").trim() || undefined,
// // // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // //       address: String(values.address ?? "").trim() || undefined,
// // // // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // // // //       paymentTerms: values.paymentTerms
// // // // //         ? Number(values.paymentTerms)
// // // // //         : undefined,
// // // // //       creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
// // // // //       storeId: currentStoreId || undefined,
// // // // //       isActive: values.isActive ?? true,
// // // // //     };
// // // // //   }

// // // // //   return values;
// // // // // }

// // // // // // import {
// // // // // //   ActionButton,
// // // // // //   Card,
// // // // // //   Header,
// // // // // //   MetricCard,
// // // // // //   Pill,
// // // // // //   RowItem,
// // // // // //   Screen,
// // // // // //   SectionTitle,
// // // // // // } from "@/components/app-ui";
// // // // // // import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
// // // // // // import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
// // // // // // import { setStore } from "@/services/features/auth/authSlice";
// // // // // // import { MaterialIcons } from "@expo/vector-icons";
// // // // // // import { useEffect, useMemo, useState } from "react";
// // // // // // import {
// // // // // //   Alert,
// // // // // //   Modal,
// // // // // //   Pressable,
// // // // // //   ScrollView,
// // // // // //   Text,
// // // // // //   TextInput,
// // // // // //   View,
// // // // // // } from "react-native";
// // // // // // import { SafeAreaView } from "react-native-safe-area-context";

// // // // // // // ✅ Offline-first local APIs
// // // // // // import {
// // // // // //   useCloseLocalSessionMutation,
// // // // // //   useCreateLocalBrandMutation,
// // // // // //   useCreateLocalCategoryMutation,
// // // // // //   useCreateLocalCustomerMutation,
// // // // // //   useCreateLocalProductMutation,
// // // // // //   useCreateLocalStaffMutation,
// // // // // //   useCreateLocalStoreMutation,
// // // // // //   useCreateLocalSupplierMutation,
// // // // // //   useDeleteLocalBrandMutation,
// // // // // //   useDeleteLocalCategoryMutation,
// // // // // //   useDeleteLocalCustomerMutation,
// // // // // //   useDeleteLocalProductMutation,
// // // // // //   useDeleteLocalStaffMutation,
// // // // // //   useDeleteLocalStoreMutation,
// // // // // //   useDeleteLocalSupplierMutation,
// // // // // //   useGetActiveSessionQuery,
// // // // // //   useGetLocalBrandsQuery,
// // // // // //   useGetLocalCategoriesQuery,
// // // // // //   useGetLocalCustomersQuery,
// // // // // //   useGetLocalProductsQuery,
// // // // // //   useGetLocalStaffQuery,
// // // // // //   useGetLocalStoresQuery,
// // // // // //   useGetLocalSuppliersQuery,
// // // // // //   useOpenLocalSessionMutation,
// // // // // //   useUpdateLocalBrandMutation,
// // // // // //   useUpdateLocalCategoryMutation,
// // // // // //   useUpdateLocalCustomerMutation,
// // // // // //   useUpdateLocalProductMutation,
// // // // // //   useUpdateLocalStaffMutation,
// // // // // //   useUpdateLocalStoreMutation,
// // // // // //   useUpdateLocalSupplierMutation,
// // // // // // } from "@/services/features/offline/localApi";

// // // // // // type ModuleKey =
// // // // // //   | "staff"
// // // // // //   | "products"
// // // // // //   | "stores"
// // // // // //   | "categories"
// // // // // //   | "customers"
// // // // // //   | "suppliers"
// // // // // //   | "sessions"
// // // // // //   | "brands"; // ✅ ADDED

// // // // // // export default function ManageScreen() {
// // // // // //   const dispatch = useAppDispatch();
// // // // // //   const { user, currentStoreId } = useAppSelector((state) => state.auth);
// // // // // //   const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
// // // // // //   const [editor, setEditor] = useState<{
// // // // // //     open: boolean;
// // // // // //     mode: "create" | "edit";
// // // // // //     item?: any;
// // // // // //   }>({ open: false, mode: "create" });

// // // // // //   const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
// // // // // //     null,
// // // // // //   );

// // // // // //   // ✅ Queries
// // // // // //   const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
// // // // // //     storeId: currentStoreId || undefined,
// // // // // //   });
// // // // // //   const { data: products = [], refetch: refetchProducts } =
// // // // // //     useGetLocalProductsQuery({
// // // // // //       storeId: currentStoreId || undefined,
// // // // // //     });
// // // // // //   const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
// // // // // //     {},
// // // // // //   );
// // // // // //   const { data: categories = [], refetch: refetchCategories } =
// // // // // //     useGetLocalCategoriesQuery({
// // // // // //       storeId: currentStoreId || undefined,
// // // // // //     });
// // // // // //   const { data: customers = [], refetch: refetchCustomers } =
// // // // // //     useGetLocalCustomersQuery({});
// // // // // //   const { data: suppliers = [], refetch: refetchSuppliers } =
// // // // // //     useGetLocalSuppliersQuery({
// // // // // //       storeId: currentStoreId || undefined,
// // // // // //     });
// // // // // //   const {
// // // // // //     data: brands = [],
// // // // // //     refetch: refetchBrands,
// // // // // //   } = // ✅ ADDED
// // // // // //     useGetLocalBrandsQuery({});
// // // // // //   const { data: activeSession, refetch: refetchSession } =
// // // // // //     useGetActiveSessionQuery(
// // // // // //       { userId: user?.id || "", storeId: currentStoreId || undefined },
// // // // // //       { skip: !user?.id },
// // // // // //     );

// // // // // //   // ✅ Mutations
// // // // // //   const [createStaff] = useCreateLocalStaffMutation();
// // // // // //   const [updateStaff] = useUpdateLocalStaffMutation();
// // // // // //   const [deleteStaff] = useDeleteLocalStaffMutation();

// // // // // //   const [createProduct] = useCreateLocalProductMutation();
// // // // // //   const [updateProduct] = useUpdateLocalProductMutation();
// // // // // //   const [deleteProduct] = useDeleteLocalProductMutation();

// // // // // //   const [createStore] = useCreateLocalStoreMutation();
// // // // // //   const [updateStore] = useUpdateLocalStoreMutation();
// // // // // //   const [deleteStore] = useDeleteLocalStoreMutation();

// // // // // //   const [createCategory] = useCreateLocalCategoryMutation();
// // // // // //   const [updateCategory] = useUpdateLocalCategoryMutation();
// // // // // //   const [deleteCategory] = useDeleteLocalCategoryMutation();

// // // // // //   const [createCustomer] = useCreateLocalCustomerMutation();
// // // // // //   const [updateCustomer] = useUpdateLocalCustomerMutation();
// // // // // //   const [deleteCustomer] = useDeleteLocalCustomerMutation();

// // // // // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // // // // //   const [updateSupplier] = useUpdateLocalSupplierMutation();
// // // // // //   const [deleteSupplier] = useDeleteLocalSupplierMutation();

// // // // // //   // ✅ Brand mutations
// // // // // //   const [createBrand] = useCreateLocalBrandMutation();
// // // // // //   const [updateBrand] = useUpdateLocalBrandMutation();
// // // // // //   const [deleteBrand] = useDeleteLocalBrandMutation();

// // // // // //   const [openSession] = useOpenLocalSessionMutation();
// // // // // //   const [closeSession] = useCloseLocalSessionMutation();

// // // // // //   const refetchers = {
// // // // // //     staff: refetchStaff,
// // // // // //     products: refetchProducts,
// // // // // //     stores: refetchStores,
// // // // // //     categories: refetchCategories,
// // // // // //     customers: refetchCustomers,
// // // // // //     suppliers: refetchSuppliers,
// // // // // //     brands: refetchBrands, // ✅ ADDED
// // // // // //     sessions: refetchSession,
// // // // // //   } as const;

// // // // // //   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

// // // // // //   const storeOptions = useMemo(() => stores, [stores]);

// // // // // //   if (!isPrivileged) {
// // // // // //     return (
// // // // // //       <Screen>
// // // // // //         <SafeAreaView className="flex-1">
// // // // // //           <View className="flex-1 items-center justify-center px-6">
// // // // // //             <Pill label="Restricted" tone="rose" />
// // // // // //             <Text className="mt-4 text-3xl font-black text-white">
// // // // // //               Management locked
// // // // // //             </Text>
// // // // // //             <Text className="mt-3 text-center text-sm text-slate-300">
// // // // // //               Your account does not have access to staff, product, or store
// // // // // //               management.
// // // // // //             </Text>
// // // // // //           </View>
// // // // // //         </SafeAreaView>
// // // // // //       </Screen>
// // // // // //     );
// // // // // //   }

// // // // // //   const summary = [
// // // // // //     {
// // // // // //       label: "Staff",
// // // // // //       value: String(staff.length),
// // // // // //       icon: "groups" as const,
// // // // // //       tone: "sky" as const,
// // // // // //     },
// // // // // //     {
// // // // // //       label: "Products",
// // // // // //       value: String(products.length),
// // // // // //       icon: "inventory-2" as const,
// // // // // //       tone: "emerald" as const,
// // // // // //     },
// // // // // //     {
// // // // // //       label: "Stores",
// // // // // //       value: String(stores.length),
// // // // // //       icon: "store" as const,
// // // // // //       tone: "amber" as const,
// // // // // //     },
// // // // // //     {
// // // // // //       label: "Brands", // ✅ ADDED
// // // // // //       value: String(brands.length),
// // // // // //       icon: "branding-watermark" as const,
// // // // // //       tone: "purple" as const,
// // // // // //     },
// // // // // //   ];

// // // // // //   const list = getModuleList({
// // // // // //     moduleKey,
// // // // // //     staff,
// // // // // //     products,
// // // // // //     stores,
// // // // // //     categories,
// // // // // //     customers,
// // // // // //     suppliers,
// // // // // //     brands, // ✅ ADDED
// // // // // //     activeSession,
// // // // // //   });

// // // // // //   const handleSave = async (values: Record<string, any>) => {
// // // // // //     try {
// // // // // //       const nextValues = buildPayload(moduleKey, values, currentStoreId);

// // // // // //       if (moduleKey === "staff") {
// // // // // //         if (editor.mode === "create") await createStaff(nextValues).unwrap();
// // // // // //         else await updateStaff({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       } else if (moduleKey === "products") {
// // // // // //         if (editor.mode === "create") await createProduct(nextValues).unwrap();
// // // // // //         else
// // // // // //           await updateProduct({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       } else if (moduleKey === "stores") {
// // // // // //         if (editor.mode === "create") await createStore(nextValues).unwrap();
// // // // // //         else await updateStore({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       } else if (moduleKey === "categories") {
// // // // // //         if (editor.mode === "create") await createCategory(nextValues).unwrap();
// // // // // //         else
// // // // // //           await updateCategory({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       } else if (moduleKey === "customers") {
// // // // // //         if (editor.mode === "create") await createCustomer(nextValues).unwrap();
// // // // // //         else
// // // // // //           await updateCustomer({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       } else if (moduleKey === "suppliers") {
// // // // // //         if (editor.mode === "create") await createSupplier(nextValues).unwrap();
// // // // // //         else
// // // // // //           await updateSupplier({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       } else if (moduleKey === "brands") {
// // // // // //         // ✅ ADDED
// // // // // //         if (editor.mode === "create") await createBrand(nextValues).unwrap();
// // // // // //         else await updateBrand({ id: editor.item.id, ...nextValues }).unwrap();
// // // // // //       }

// // // // // //       await refetchers[moduleKey]();
// // // // // //       setEditor({ open: false, mode: "create" });
// // // // // //     } catch (error: any) {
// // // // // //       Alert.alert(
// // // // // //         "Save failed",
// // // // // //         error?.data?.message || "Unable to save changes.",
// // // // // //       );
// // // // // //     }
// // // // // //   };

// // // // // //   const handleDelete = async (item: any) => {
// // // // // //     try {
// // // // // //       if (moduleKey === "staff") await deleteStaff(item.id).unwrap();
// // // // // //       else if (moduleKey === "products") await deleteProduct(item.id).unwrap();
// // // // // //       else if (moduleKey === "stores") await deleteStore(item.id).unwrap();
// // // // // //       else if (moduleKey === "categories")
// // // // // //         await deleteCategory(item.id).unwrap();
// // // // // //       else if (moduleKey === "customers")
// // // // // //         await deleteCustomer(item.id).unwrap();
// // // // // //       else if (moduleKey === "suppliers")
// // // // // //         await deleteSupplier(item.id).unwrap();
// // // // // //       else if (moduleKey === "brands") await deleteBrand(item.id).unwrap(); // ✅ ADDED
// // // // // //       await refetchers[moduleKey]();
// // // // // //     } catch (error: any) {
// // // // // //       Alert.alert(
// // // // // //         "Delete failed",
// // // // // //         error?.data?.message || "Unable to delete item.",
// // // // // //       );
// // // // // //     }
// // // // // //   };

// // // // // //   const openEditor = (mode: "create" | "edit", item?: any) => {
// // // // // //     setEditor({ open: true, mode, item });
// // // // // //   };

// // // // // //   return (
// // // // // //     <Screen>
// // // // // //       <SafeAreaView className="flex-1">
// // // // // //         <ScrollView
// // // // // //           showsVerticalScrollIndicator={false}
// // // // // //           contentContainerStyle={{ paddingBottom: 28 }}
// // // // // //         >
// // // // // //           <Header
// // // // // //             eyebrow="Administration"
// // // // // //             title="Management"
// // // // // //             subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, and session control from one place."
// // // // // //             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
// // // // // //           />

// // // // // //           <View className="mb-4 flex-row flex-wrap gap-3">
// // // // // //             {summary.map((item) => (
// // // // // //               <View key={item.label} className="w-[48.5%]">
// // // // // //                 {/* <MetricCard {...item} />
// // // // // //                  */}
// // // // // //                 <MetricCard
// // // // // //                   icon={item.icon}
// // // // // //                   label={item.label}
// // // // // //                   value={item.value}
// // // // // //                   tone={item.tone}
// // // // // //                   delta={item.delta}
// // // // // //                 />
// // // // // //               </View>
// // // // // //             ))}
// // // // // //           </View>

// // // // // //           <Card className="mb-4">
// // // // // //             <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //               Store context
// // // // // //             </Text>
// // // // // //             <ScrollView
// // // // // //               horizontal
// // // // // //               showsHorizontalScrollIndicator={false}
// // // // // //               className="mt-3"
// // // // // //               contentContainerStyle={{ gap: 8 }}
// // // // // //             >
// // // // // //               {storeOptions.map((store: any) => {
// // // // // //                 const active = store.id === currentStoreId;
// // // // // //                 return (
// // // // // //                   <Pressable
// // // // // //                     key={store.id}
// // // // // //                     onPress={() => dispatch(setStore(store.id))}
// // // // // //                     className={`rounded-full border px-4 py-3 ${
// // // // // //                       active
// // // // // //                         ? "border-sky-400/30 bg-sky-500/15"
// // // // // //                         : "border-white/10 bg-white/5"
// // // // // //                     }`}
// // // // // //                   >
// // // // // //                     <Text
// // // // // //                       className={`text-xs font-bold uppercase tracking-[2px] ${
// // // // // //                         active ? "text-sky-200" : "text-slate-300"
// // // // // //                       }`}
// // // // // //                     >
// // // // // //                       {store.name}
// // // // // //                     </Text>
// // // // // //                   </Pressable>
// // // // // //                 );
// // // // // //               })}
// // // // // //             </ScrollView>
// // // // // //           </Card>

// // // // // //           <SectionTitle title="Modules" />
// // // // // //           <View className="mb-4 flex-row flex-wrap gap-2">
// // // // // //             {(
// // // // // //               [
// // // // // //                 "products",
// // // // // //                 "staff",
// // // // // //                 "stores",
// // // // // //                 "categories",
// // // // // //                 "customers",
// // // // // //                 "suppliers",
// // // // // //                 "brands", // ✅ ADDED
// // // // // //                 "sessions",
// // // // // //               ] as ModuleKey[]
// // // // // //             ).map((key) => (
// // // // // //               <Pressable
// // // // // //                 key={key}
// // // // // //                 onPress={() => setModuleKey(key)}
// // // // // //                 className={`rounded-full border px-4 py-3 ${
// // // // // //                   moduleKey === key
// // // // // //                     ? "border-emerald-400/30 bg-emerald-500/15"
// // // // // //                     : "border-white/10 bg-white/5"
// // // // // //                 }`}
// // // // // //               >
// // // // // //                 <Text
// // // // // //                   className={`text-xs font-bold uppercase tracking-[2px] ${
// // // // // //                     moduleKey === key ? "text-emerald-200" : "text-slate-300"
// // // // // //                   }`}
// // // // // //                 >
// // // // // //                   {key}
// // // // // //                 </Text>
// // // // // //               </Pressable>
// // // // // //             ))}
// // // // // //           </View>

// // // // // //           <View className="mb-4 flex-row gap-3">
// // // // // //             <ActionButton
// // // // // //               title="Add New"
// // // // // //               icon="add"
// // // // // //               accent="emerald"
// // // // // //               onPress={() => openEditor("create")}
// // // // // //             />
// // // // // //             {moduleKey === "sessions" ? (
// // // // // //               <ActionButton
// // // // // //                 title={activeSession ? "Close Session" : "Open Session"}
// // // // // //                 icon="schedule"
// // // // // //                 accent={activeSession ? "rose" : "sky"}
// // // // // //                 onPress={() =>
// // // // // //                   setSessionModal(activeSession ? "close" : "open")
// // // // // //                 }
// // // // // //               />
// // // // // //             ) : (
// // // // // //               <ActionButton
// // // // // //                 title="Refresh"
// // // // // //                 icon="refresh"
// // // // // //                 accent="sky"
// // // // // //                 onPress={() => refetchers[moduleKey]()}
// // // // // //               />
// // // // // //             )}
// // // // // //           </View>

// // // // // //           <SectionTitle
// // // // // //             title={`${moduleKey} list`}
// // // // // //             action="Tap an item to edit"
// // // // // //           />
// // // // // //           <Card>
// // // // // //             {list.length ? (
// // // // // //               list.map((item: any, index: number) => (
// // // // // //                 <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
// // // // // //                   <Pressable onPress={() => openEditor("edit", item)}>
// // // // // //                     <RowItem
// // // // // //                       title={item.name || item.username || item.code || item.id}
// // // // // //                       subtitle={getSubtitle(moduleKey, item)}
// // // // // //                       right={getRightLabel(moduleKey, item)}
// // // // // //                       icon={getIcon(moduleKey)}
// // // // // //                     />
// // // // // //                   </Pressable>
// // // // // //                   {index < list.length - 1 ? (
// // // // // //                     <View className="my-3 h-px bg-white/8" />
// // // // // //                   ) : null}
// // // // // //                 </View>
// // // // // //               ))
// // // // // //             ) : (
// // // // // //               <Text className="py-8 text-center text-sm text-slate-400">
// // // // // //                 No items yet.
// // // // // //               </Text>
// // // // // //             )}
// // // // // //           </Card>
// // // // // //         </ScrollView>

// // // // // //         <EditorModal
// // // // // //           visible={editor.open}
// // // // // //           title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
// // // // // //           moduleKey={moduleKey}
// // // // // //           item={editor.item}
// // // // // //           mode={editor.mode}
// // // // // //           onClose={() => setEditor({ open: false, mode: "create" })}
// // // // // //           onSave={handleSave}
// // // // // //           onDelete={editor.item ? () => handleDelete(editor.item) : undefined}
// // // // // //           currentStoreId={currentStoreId}
// // // // // //           stores={stores}
// // // // // //           categories={categories}
// // // // // //           suppliers={suppliers}
// // // // // //           brands={brands} // ✅ ADDED
// // // // // //           refetchCategories={refetchCategories}
// // // // // //           refetchSuppliers={refetchSuppliers}
// // // // // //           refetchBrands={refetchBrands} // ✅ ADDED
// // // // // //         />

// // // // // //         <SessionModal
// // // // // //           visible={sessionModal !== null}
// // // // // //           mode={sessionModal}
// // // // // //           activeSession={activeSession}
// // // // // //           onClose={() => setSessionModal(null)}
// // // // // //           onOpen={async (openingBalance, notes) => {
// // // // // //             try {
// // // // // //               await openSession({
// // // // // //                 userId: user?.id || "",
// // // // // //                 openingBalance: Number(openingBalance || 0),
// // // // // //                 notes,
// // // // // //                 storeId: currentStoreId || undefined,
// // // // // //               }).unwrap();
// // // // // //               setSessionModal(null);
// // // // // //               await refetchSession();
// // // // // //             } catch (error: any) {
// // // // // //               Alert.alert(
// // // // // //                 "Open session failed",
// // // // // //                 error?.data?.message || "Unable to open session.",
// // // // // //               );
// // // // // //             }
// // // // // //           }}
// // // // // //           onCloseSession={async (closingBalance, notes) => {
// // // // // //             try {
// // // // // //               if (!activeSession) return;
// // // // // //               await closeSession({
// // // // // //                 sessionId: activeSession.id,
// // // // // //                 data: {
// // // // // //                   closingBalance: Number(closingBalance || 0),
// // // // // //                   expectedBalance: Number(closingBalance || 0),
// // // // // //                   discrepancy: 0,
// // // // // //                   cashSales: 0,
// // // // // //                   cardSales: 0,
// // // // // //                   digitalSales: 0,
// // // // // //                   notes,
// // // // // //                 },
// // // // // //               }).unwrap();
// // // // // //               setSessionModal(null);
// // // // // //               await refetchSession();
// // // // // //             } catch (error: any) {
// // // // // //               Alert.alert(
// // // // // //                 "Close session failed",
// // // // // //                 error?.data?.message || "Unable to close session.",
// // // // // //               );
// // // // // //             }
// // // // // //           }}
// // // // // //         />
// // // // // //       </SafeAreaView>
// // // // // //     </Screen>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // HELPER FUNCTIONS
// // // // // // // ============================================

// // // // // // function getModuleList(input: any) {
// // // // // //   const {
// // // // // //     moduleKey,
// // // // // //     staff,
// // // // // //     products,
// // // // // //     stores,
// // // // // //     categories,
// // // // // //     customers,
// // // // // //     suppliers,
// // // // // //     brands,
// // // // // //     activeSession,
// // // // // //   } = input;
// // // // // //   if (moduleKey === "staff") return staff;
// // // // // //   if (moduleKey === "products") return products;
// // // // // //   if (moduleKey === "stores") return stores;
// // // // // //   if (moduleKey === "categories") return categories;
// // // // // //   if (moduleKey === "customers") return customers;
// // // // // //   if (moduleKey === "suppliers") return suppliers;
// // // // // //   if (moduleKey === "brands") return brands; // ✅ ADDED
// // // // // //   return activeSession ? [activeSession] : [];
// // // // // // }

// // // // // // function getSubtitle(moduleKey: ModuleKey, item: any) {
// // // // // //   if (moduleKey === "staff")
// // // // // //     return `${item.role} • ${item.email ?? "no email"}`;
// // // // // //   if (moduleKey === "products") {
// // // // // //     const brandName = item.brand?.name || item.brandName || "";
// // // // // //     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}${brandName ? ` • ${brandName}` : ""}`;
// // // // // //   }
// // // // // //   if (moduleKey === "stores") return item.address ?? "No address";
// // // // // //   if (moduleKey === "categories") return item.slug ?? "No slug";
// // // // // //   if (moduleKey === "customers") return item.phone ?? item.code;
// // // // // //   if (moduleKey === "suppliers")
// // // // // //     return item.phone ?? item.email ?? "No contact";
// // // // // //   if (moduleKey === "brands") return item.description ?? "No description"; // ✅ ADDED
// // // // // //   if (moduleKey === "sessions")
// // // // // //     return `${item.status} • ${item.openedAt ?? ""}`;
// // // // // //   return "";
// // // // // // }

// // // // // // function getRightLabel(moduleKey: ModuleKey, item: any) {
// // // // // //   if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
// // // // // //   if (moduleKey === "products")
// // // // // //     return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
// // // // // //   if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
// // // // // //   if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
// // // // // //   if (moduleKey === "customers") return item.tier ?? "BRONZE";
// // // // // //   if (moduleKey === "suppliers") {
// // // // // //     if (item.currentBalance !== undefined && item.currentBalance !== null) {
// // // // // //       return `$${Number(item.currentBalance).toFixed(2)}`;
// // // // // //     }
// // // // // //     return item.isActive ? "Active" : "Inactive";
// // // // // //   }
// // // // // //   if (moduleKey === "brands") return item.isActive ? "Active" : "Inactive"; // ✅ ADDED
// // // // // //   if (moduleKey === "sessions") return item.status ?? "OPEN";
// // // // // //   return "";
// // // // // // }

// // // // // // function getIcon(moduleKey: ModuleKey) {
// // // // // //   if (moduleKey === "staff") return "groups";
// // // // // //   if (moduleKey === "products") return "inventory-2";
// // // // // //   if (moduleKey === "stores") return "store";
// // // // // //   if (moduleKey === "categories") return "category";
// // // // // //   if (moduleKey === "customers") return "person";
// // // // // //   if (moduleKey === "suppliers") return "local-shipping";
// // // // // //   if (moduleKey === "brands") return "branding-watermark"; // ✅ ADDED
// // // // // //   if (moduleKey === "sessions") return "schedule";
// // // // // //   return "schedule";
// // // // // // }

// // // // // // // ============================================
// // // // // // // SELECTOR COMPONENTS
// // // // // // // ============================================

// // // // // // // ============================================
// // // // // // // ROLE SELECTOR
// // // // // // // ============================================
// // // // // // function RoleSelector({
// // // // // //   value,
// // // // // //   onChange,
// // // // // // }: {
// // // // // //   value: string;
// // // // // //   onChange: (role: string) => void;
// // // // // // }) {
// // // // // //   const roles = [
// // // // // //     { label: "Admin", value: "ADMIN", description: "Full system access" },
// // // // // //     {
// // // // // //       label: "Manager",
// // // // // //       value: "MANAGER",
// // // // // //       description: "Manage store operations",
// // // // // //     },
// // // // // //     {
// // // // // //       label: "Cashier",
// // // // // //       value: "CASHIER",
// // // // // //       description: "Process sales and transactions",
// // // // // //     },
// // // // // //     {
// // // // // //       label: "Accountant",
// // // // // //       value: "ACCOUNTANT",
// // // // // //       description: "Financial and reporting access",
// // // // // //     },
// // // // // //   ];

// // // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // // //   const selectedRole = roles.find((r) => r.value === value);

// // // // // //   return (
// // // // // //     <View className="mb-4">
// // // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //         Role
// // // // // //       </Text>
// // // // // //       <Pressable
// // // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // // //       >
// // // // // //         <View className="flex-row items-center justify-between">
// // // // // //           <Text
// // // // // //             className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
// // // // // //           >
// // // // // //             {selectedRole ? selectedRole.label : "Select a role..."}
// // // // // //           </Text>
// // // // // //           <MaterialIcons
// // // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // // //             size={24}
// // // // // //             color="#64748b"
// // // // // //           />
// // // // // //         </View>
// // // // // //       </Pressable>

// // // // // //       {showDropdown && (
// // // // // //         <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // // //           <ScrollView className="max-h-48" nestedScrollEnabled>
// // // // // //             {roles.map((role) => (
// // // // // //               <Pressable
// // // // // //                 key={role.value}
// // // // // //                 onPress={() => {
// // // // // //                   onChange(role.value);
// // // // // //                   setShowDropdown(false);
// // // // // //                 }}
// // // // // //                 className={`rounded-xl px-4 py-3 ${
// // // // // //                   value === role.value ? "bg-emerald-500/20" : ""
// // // // // //                 }`}
// // // // // //               >
// // // // // //                 <Text className="text-white">{role.label}</Text>
// // // // // //                 <Text className="text-xs text-slate-400">
// // // // // //                   {role.description}
// // // // // //                 </Text>
// // // // // //               </Pressable>
// // // // // //             ))}
// // // // // //           </ScrollView>
// // // // // //         </View>
// // // // // //       )}
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // function getDefaultPermissions(role: string): string[] {
// // // // // //   const permissions = {
// // // // // //     ADMIN: [
// // // // // //       "VIEW_REPORTS",
// // // // // //       "EDIT_PRICES",
// // // // // //       "MANAGE_STAFF",
// // // // // //       "MANAGE_PRODUCTS",
// // // // // //       "VIEW_SALES",
// // // // // //       "MANAGE_CUSTOMERS",
// // // // // //       "EDIT_INVENTORY",
// // // // // //     ],
// // // // // //     MANAGER: [
// // // // // //       "VIEW_REPORTS",
// // // // // //       "EDIT_PRICES",
// // // // // //       "MANAGE_PRODUCTS",
// // // // // //       "VIEW_SALES",
// // // // // //       "MANAGE_CUSTOMERS",
// // // // // //     ],
// // // // // //     CASHIER: ["VIEW_REPORTS", "VIEW_SALES"],
// // // // // //     ACCOUNTANT: ["VIEW_REPORTS", "VIEW_SALES", "MANAGE_CUSTOMERS"],
// // // // // //   };
// // // // // //   return permissions[role as keyof typeof permissions] || [];
// // // // // // }

// // // // // // // ============================================
// // // // // // // STORE SELECTOR
// // // // // // // ============================================
// // // // // // function StoreSelector({
// // // // // //   value,
// // // // // //   onChange,
// // // // // //   stores,
// // // // // //   label = "Store",
// // // // // // }: {
// // // // // //   value: string;
// // // // // //   onChange: (storeId: string, storeName: string) => void;
// // // // // //   stores: any[];
// // // // // //   label?: string;
// // // // // // }) {
// // // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // // //   const [searchText, setSearchText] = useState("");

// // // // // //   const filteredStores = useMemo(() => {
// // // // // //     if (!searchText.trim()) return stores;
// // // // // //     return stores.filter(
// // // // // //       (store) =>
// // // // // //         store.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // // // // //         store.code?.toLowerCase().includes(searchText.toLowerCase()),
// // // // // //     );
// // // // // //   }, [stores, searchText]);

// // // // // //   const selectedStore = stores.find((store) => store.id === value);

// // // // // //   return (
// // // // // //     <View className="mb-4">
// // // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //         {label}
// // // // // //       </Text>
// // // // // //       <Pressable
// // // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // // //       >
// // // // // //         <View className="flex-row items-center justify-between">
// // // // // //           <Text
// // // // // //             className={`text-base ${selectedStore ? "text-white" : "text-slate-400"}`}
// // // // // //           >
// // // // // //             {selectedStore ? selectedStore.name : "Select a store..."}
// // // // // //           </Text>
// // // // // //           <MaterialIcons
// // // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // // //             size={24}
// // // // // //             color="#64748b"
// // // // // //           />
// // // // // //         </View>
// // // // // //       </Pressable>

// // // // // //       {showDropdown && (
// // // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // // //           <TextInput
// // // // // //             value={searchText}
// // // // // //             onChangeText={setSearchText}
// // // // // //             placeholder="Search stores..."
// // // // // //             placeholderTextColor="#64748b"
// // // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // // //           />
// // // // // //           <ScrollView
// // // // // //             className="max-h-48"
// // // // // //             showsVerticalScrollIndicator={true}
// // // // // //             nestedScrollEnabled={true}
// // // // // //           >
// // // // // //             {filteredStores.length > 0 ? (
// // // // // //               filteredStores.map((store) => (
// // // // // //                 <Pressable
// // // // // //                   key={store.id}
// // // // // //                   onPress={() => {
// // // // // //                     onChange(store.id, store.name);
// // // // // //                     setShowDropdown(false);
// // // // // //                     setSearchText("");
// // // // // //                   }}
// // // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // // //                     value === store.id ? "bg-emerald-500/20" : ""
// // // // // //                   }`}
// // // // // //                 >
// // // // // //                   <Text className="text-white">{store.name}</Text>
// // // // // //                   <Text className="text-xs text-slate-400">
// // // // // //                     {store.code} • {store.address || "No address"}
// // // // // //                   </Text>
// // // // // //                 </Pressable>
// // // // // //               ))
// // // // // //             ) : (
// // // // // //               <Text className="py-4 text-center text-slate-400">
// // // // // //                 No stores found
// // // // // //               </Text>
// // // // // //             )}
// // // // // //           </ScrollView>
// // // // // //         </View>
// // // // // //       )}
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // CATEGORY SELECTOR
// // // // // // // ============================================
// // // // // // function CategorySelector({
// // // // // //   value,
// // // // // //   onChange,
// // // // // //   categories,
// // // // // //   onAddCategory,
// // // // // //   label = "Category",
// // // // // // }: {
// // // // // //   value: string;
// // // // // //   onChange: (categoryId: string, categoryName: string) => void;
// // // // // //   categories: any[];
// // // // // //   onAddCategory: () => void;
// // // // // //   label?: string;
// // // // // // }) {
// // // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // // //   const [searchText, setSearchText] = useState("");

// // // // // //   const filteredCategories = useMemo(() => {
// // // // // //     if (!searchText.trim()) return categories;
// // // // // //     return categories.filter((cat) =>
// // // // // //       cat.name.toLowerCase().includes(searchText.toLowerCase()),
// // // // // //     );
// // // // // //   }, [categories, searchText]);

// // // // // //   const selectedCategory = categories.find((cat) => cat.id === value);

// // // // // //   return (
// // // // // //     <View className="mb-4">
// // // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //         {label}
// // // // // //       </Text>

// // // // // //       <Pressable
// // // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // // //       >
// // // // // //         <View className="flex-row items-center justify-between">
// // // // // //           <Text
// // // // // //             className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
// // // // // //           >
// // // // // //             {selectedCategory ? selectedCategory.name : "Select a category..."}
// // // // // //           </Text>
// // // // // //           <MaterialIcons
// // // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // // //             size={24}
// // // // // //             color="#64748b"
// // // // // //           />
// // // // // //         </View>
// // // // // //       </Pressable>

// // // // // //       {showDropdown && (
// // // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // // //           <TextInput
// // // // // //             value={searchText}
// // // // // //             onChangeText={setSearchText}
// // // // // //             placeholder="Search categories..."
// // // // // //             placeholderTextColor="#64748b"
// // // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // // //           />

// // // // // //           <ScrollView
// // // // // //             className="max-h-48"
// // // // // //             showsVerticalScrollIndicator={true}
// // // // // //             nestedScrollEnabled={true}
// // // // // //           >
// // // // // //             {filteredCategories.length > 0 ? (
// // // // // //               filteredCategories.map((item) => (
// // // // // //                 <Pressable
// // // // // //                   key={item.id}
// // // // // //                   onPress={() => {
// // // // // //                     onChange(item.id, item.name);
// // // // // //                     setShowDropdown(false);
// // // // // //                     setSearchText("");
// // // // // //                   }}
// // // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // // //                     value === item.id ? "bg-emerald-500/20" : ""
// // // // // //                   }`}
// // // // // //                 >
// // // // // //                   <Text className="text-white">{item.name}</Text>
// // // // // //                   {item.description && (
// // // // // //                     <Text className="text-xs text-slate-400">
// // // // // //                       {item.description}
// // // // // //                     </Text>
// // // // // //                   )}
// // // // // //                 </Pressable>
// // // // // //               ))
// // // // // //             ) : (
// // // // // //               <View className="py-4">
// // // // // //                 <Text className="text-center text-slate-400">
// // // // // //                   No categories found
// // // // // //                 </Text>
// // // // // //                 {searchText.trim() && (
// // // // // //                   <Pressable
// // // // // //                     onPress={() => {
// // // // // //                       onAddCategory();
// // // // // //                       setShowDropdown(false);
// // // // // //                       setSearchText("");
// // // // // //                     }}
// // // // // //                     className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
// // // // // //                   >
// // // // // //                     <Text className="text-center text-emerald-200">
// // // // // //                       Create "{searchText.trim()}"
// // // // // //                     </Text>
// // // // // //                   </Pressable>
// // // // // //                 )}
// // // // // //               </View>
// // // // // //             )}
// // // // // //           </ScrollView>
// // // // // //         </View>
// // // // // //       )}
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // BRAND SELECTOR - ✅ NEW
// // // // // // // ============================================
// // // // // // function BrandSelector({
// // // // // //   value,
// // // // // //   onChange,
// // // // // //   brands,
// // // // // //   onAddBrand,
// // // // // //   label = "Brand",
// // // // // // }: {
// // // // // //   value: string;
// // // // // //   onChange: (brandId: string, brandName: string) => void;
// // // // // //   brands: any[];
// // // // // //   onAddBrand: () => void;
// // // // // //   label?: string;
// // // // // // }) {
// // // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // // //   const [searchText, setSearchText] = useState("");

// // // // // //   const filteredBrands = useMemo(() => {
// // // // // //     if (!searchText.trim()) return brands;
// // // // // //     return brands.filter((brand) =>
// // // // // //       brand.name.toLowerCase().includes(searchText.toLowerCase()),
// // // // // //     );
// // // // // //   }, [brands, searchText]);

// // // // // //   const selectedBrand = brands.find((brand) => brand.id === value);

// // // // // //   return (
// // // // // //     <View className="mb-4">
// // // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //         {label}
// // // // // //       </Text>

// // // // // //       <Pressable
// // // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // // //       >
// // // // // //         <View className="flex-row items-center justify-between">
// // // // // //           <Text
// // // // // //             className={`text-base ${selectedBrand ? "text-white" : "text-slate-400"}`}
// // // // // //           >
// // // // // //             {selectedBrand ? selectedBrand.name : "Select a brand..."}
// // // // // //           </Text>
// // // // // //           <MaterialIcons
// // // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // // //             size={24}
// // // // // //             color="#64748b"
// // // // // //           />
// // // // // //         </View>
// // // // // //       </Pressable>

// // // // // //       {showDropdown && (
// // // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // // //           <TextInput
// // // // // //             value={searchText}
// // // // // //             onChangeText={setSearchText}
// // // // // //             placeholder="Search brands..."
// // // // // //             placeholderTextColor="#64748b"
// // // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // // //           />

// // // // // //           <ScrollView
// // // // // //             className="max-h-48"
// // // // // //             showsVerticalScrollIndicator={true}
// // // // // //             nestedScrollEnabled={true}
// // // // // //           >
// // // // // //             {filteredBrands.length > 0 ? (
// // // // // //               filteredBrands.map((item) => (
// // // // // //                 <Pressable
// // // // // //                   key={item.id}
// // // // // //                   onPress={() => {
// // // // // //                     onChange(item.id, item.name);
// // // // // //                     setShowDropdown(false);
// // // // // //                     setSearchText("");
// // // // // //                   }}
// // // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // // //                     value === item.id ? "bg-purple-500/20" : ""
// // // // // //                   }`}
// // // // // //                 >
// // // // // //                   <Text className="text-white">{item.name}</Text>
// // // // // //                   {item.description && (
// // // // // //                     <Text className="text-xs text-slate-400">
// // // // // //                       {item.description}
// // // // // //                     </Text>
// // // // // //                   )}
// // // // // //                 </Pressable>
// // // // // //               ))
// // // // // //             ) : (
// // // // // //               <View className="py-4">
// // // // // //                 <Text className="text-center text-slate-400">
// // // // // //                   No brands found
// // // // // //                 </Text>
// // // // // //                 {searchText.trim() && (
// // // // // //                   <Pressable
// // // // // //                     onPress={() => {
// // // // // //                       onAddBrand();
// // // // // //                       setShowDropdown(false);
// // // // // //                       setSearchText("");
// // // // // //                     }}
// // // // // //                     className="mt-2 rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3"
// // // // // //                   >
// // // // // //                     <Text className="text-center text-purple-200">
// // // // // //                       Create "{searchText.trim()}"
// // // // // //                     </Text>
// // // // // //                   </Pressable>
// // // // // //                 )}
// // // // // //               </View>
// // // // // //             )}
// // // // // //           </ScrollView>
// // // // // //         </View>
// // // // // //       )}
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // SUPPLIER SELECTOR
// // // // // // // ============================================
// // // // // // function SupplierSelector({
// // // // // //   value,
// // // // // //   onChange,
// // // // // //   suppliers,
// // // // // //   label = "Supplier",
// // // // // // }: {
// // // // // //   value: string;
// // // // // //   onChange: (supplierId: string, supplierName: string) => void;
// // // // // //   suppliers: any[];
// // // // // //   label?: string;
// // // // // // }) {
// // // // // //   const [showDropdown, setShowDropdown] = useState(false);
// // // // // //   const [searchText, setSearchText] = useState("");

// // // // // //   const filteredSuppliers = useMemo(() => {
// // // // // //     if (!searchText.trim()) return suppliers;
// // // // // //     return suppliers.filter(
// // // // // //       (sup) =>
// // // // // //         sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
// // // // // //         sup.code?.toLowerCase().includes(searchText.toLowerCase()),
// // // // // //     );
// // // // // //   }, [suppliers, searchText]);

// // // // // //   const selectedSupplier = suppliers.find((sup) => sup.id === value);

// // // // // //   return (
// // // // // //     <View className="mb-4">
// // // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //         {label}
// // // // // //       </Text>

// // // // // //       <Pressable
// // // // // //         onPress={() => setShowDropdown(!showDropdown)}
// // // // // //         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
// // // // // //       >
// // // // // //         <View className="flex-row items-center justify-between">
// // // // // //           <Text
// // // // // //             className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
// // // // // //           >
// // // // // //             {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
// // // // // //           </Text>
// // // // // //           <MaterialIcons
// // // // // //             name={showDropdown ? "expand-less" : "expand-more"}
// // // // // //             size={24}
// // // // // //             color="#64748b"
// // // // // //           />
// // // // // //         </View>
// // // // // //       </Pressable>

// // // // // //       {showDropdown && (
// // // // // //         <View className="mt-2 max-h-60 rounded-2xl border border-white/10 bg-slate-900 p-2">
// // // // // //           <TextInput
// // // // // //             value={searchText}
// // // // // //             onChangeText={setSearchText}
// // // // // //             placeholder="Search suppliers..."
// // // // // //             placeholderTextColor="#64748b"
// // // // // //             className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
// // // // // //           />

// // // // // //           <ScrollView
// // // // // //             className="max-h-48"
// // // // // //             showsVerticalScrollIndicator={true}
// // // // // //             nestedScrollEnabled={true}
// // // // // //           >
// // // // // //             {filteredSuppliers.length > 0 ? (
// // // // // //               filteredSuppliers.map((item) => (
// // // // // //                 <Pressable
// // // // // //                   key={item.id}
// // // // // //                   onPress={() => {
// // // // // //                     onChange(item.id, item.name);
// // // // // //                     setShowDropdown(false);
// // // // // //                     setSearchText("");
// // // // // //                   }}
// // // // // //                   className={`rounded-xl px-4 py-3 ${
// // // // // //                     value === item.id ? "bg-emerald-500/20" : ""
// // // // // //                   }`}
// // // // // //                 >
// // // // // //                   <Text className="text-white">{item.name}</Text>
// // // // // //                   <Text className="text-xs text-slate-400">
// // // // // //                     {item.code} • {item.phone || "No phone"}
// // // // // //                   </Text>
// // // // // //                 </Pressable>
// // // // // //               ))
// // // // // //             ) : (
// // // // // //               <Text className="py-4 text-center text-slate-400">
// // // // // //                 No suppliers found
// // // // // //               </Text>
// // // // // //             )}
// // // // // //           </ScrollView>
// // // // // //         </View>
// // // // // //       )}
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // EDITOR MODAL
// // // // // // // ============================================

// // // // // // function EditorModal({
// // // // // //   visible,
// // // // // //   title,
// // // // // //   moduleKey,
// // // // // //   item,
// // // // // //   mode,
// // // // // //   onClose,
// // // // // //   onSave,
// // // // // //   onDelete,
// // // // // //   currentStoreId,
// // // // // //   stores,
// // // // // //   categories,
// // // // // //   suppliers,
// // // // // //   brands,
// // // // // //   refetchCategories,
// // // // // //   refetchSuppliers,
// // // // // //   refetchBrands,
// // // // // // }: {
// // // // // //   visible: boolean;
// // // // // //   title: string;
// // // // // //   moduleKey: ModuleKey;
// // // // // //   item?: any;
// // // // // //   mode: "create" | "edit";
// // // // // //   onClose: () => void;
// // // // // //   onSave: (values: Record<string, any>) => Promise<void>;
// // // // // //   onDelete?: () => void;
// // // // // //   currentStoreId: string | null;
// // // // // //   stores: any[];
// // // // // //   categories: any[];
// // // // // //   suppliers: any[];
// // // // // //   brands: any[];
// // // // // //   refetchCategories: () => void;
// // // // // //   refetchSuppliers: () => void;
// // // // // //   refetchBrands: () => void;
// // // // // // }) {
// // // // // //   const [fields, setFields] = useState<Record<string, any>>({});
// // // // // //   const [showCreateCategory, setShowCreateCategory] = useState(false);
// // // // // //   const [showCreateSupplier, setShowCreateSupplier] = useState(false);
// // // // // //   const [showCreateBrand, setShowCreateBrand] = useState(false); // ✅ ADDED
// // // // // //   const [newCategory, setNewCategory] = useState({
// // // // // //     name: "",
// // // // // //     slug: "",
// // // // // //     description: "",
// // // // // //   });
// // // // // //   const [newSupplier, setNewSupplier] = useState({
// // // // // //     name: "",
// // // // // //     code: "",
// // // // // //     phone: "",
// // // // // //     email: "",
// // // // // //     address: "",
// // // // // //     contactName: "",
// // // // // //   });
// // // // // //   const [newBrand, setNewBrand] = useState({
// // // // // //     name: "",
// // // // // //     description: "",
// // // // // //   });
// // // // // //   const [isCreatingCategory, setIsCreatingCategory] = useState(false);
// // // // // //   const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
// // // // // //   const [isCreatingBrand, setIsCreatingBrand] = useState(false);

// // // // // //   const [createCategory] = useCreateLocalCategoryMutation();
// // // // // //   const [createSupplier] = useCreateLocalSupplierMutation();
// // // // // //   const [createBrand] = useCreateLocalBrandMutation(); // ✅ ADDED

// // // // // //   useEffect(() => {
// // // // // //     if (visible) {
// // // // // //       setFields(item ? { ...item } : getDefaultFields(moduleKey));
// // // // // //       setShowCreateCategory(false);
// // // // // //       setShowCreateSupplier(false);
// // // // // //       setShowCreateBrand(false);
// // // // // //       setNewCategory({ name: "", slug: "", description: "" });
// // // // // //       setNewSupplier({
// // // // // //         name: "",
// // // // // //         code: "",
// // // // // //         phone: "",
// // // // // //         email: "",
// // // // // //         address: "",
// // // // // //         contactName: "",
// // // // // //       });
// // // // // //       setNewBrand({ name: "", description: "" });
// // // // // //     }
// // // // // //   }, [visible, item, moduleKey]);

// // // // // //   const set = (key: string, value: any) =>
// // // // // //     setFields((current) => ({ ...current, [key]: value }));

// // // // // //   const save = () => onSave(fields);

// // // // // //   const handleCreateCategory = async () => {
// // // // // //     try {
// // // // // //       if (!newCategory.name.trim()) {
// // // // // //         Alert.alert("Error", "Category name is required");
// // // // // //         return;
// // // // // //       }

// // // // // //       setIsCreatingCategory(true);
// // // // // //       if (!currentStoreId) {
// // // // // //         Alert.alert("Error", "Store not found");
// // // // // //         return;
// // // // // //       }

// // // // // //       const payload = {
// // // // // //         tenantId: "default",
// // // // // //         name: newCategory.name.trim(),
// // // // // //         slug:
// // // // // //           newCategory.slug.trim() ||
// // // // // //           newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
// // // // // //         description: newCategory.description.trim() || undefined,
// // // // // //         storeId: currentStoreId,
// // // // // //         isActive: true,
// // // // // //       };

// // // // // //       const result = await createCategory(payload).unwrap();
// // // // // //       await refetchCategories();
// // // // // //       set("categoryId", result?.id);
// // // // // //       set("categoryName", result?.name);

// // // // // //       setShowCreateCategory(false);
// // // // // //       setNewCategory({ name: "", slug: "", description: "" });

// // // // // //       Alert.alert("Success", "Category created successfully");
// // // // // //     } catch (error: any) {
// // // // // //       Alert.alert(
// // // // // //         "Failed to create category",
// // // // // //         error?.data?.message || "Unable to create category.",
// // // // // //       );
// // // // // //     } finally {
// // // // // //       setIsCreatingCategory(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const handleCreateSupplier = async () => {
// // // // // //     try {
// // // // // //       if (!newSupplier.name.trim()) {
// // // // // //         Alert.alert("Error", "Supplier name is required");
// // // // // //         return;
// // // // // //       }

// // // // // //       setIsCreatingSupplier(true);
// // // // // //       if (!currentStoreId) {
// // // // // //         Alert.alert("Error", "Store not found");
// // // // // //         return;
// // // // // //       }

// // // // // //       const payload = {
// // // // // //         tenantId: "default",
// // // // // //         name: newSupplier.name.trim(),
// // // // // //         code: newSupplier.code.trim() || undefined,
// // // // // //         contactName: newSupplier.contactName.trim() || undefined,
// // // // // //         phone: newSupplier.phone.trim() || undefined,
// // // // // //         email: newSupplier.email.trim() || undefined,
// // // // // //         address: newSupplier.address.trim() || undefined,
// // // // // //         storeId: currentStoreId,
// // // // // //         isActive: true,
// // // // // //       };

// // // // // //       const result = await createSupplier(payload).unwrap();
// // // // // //       await refetchSuppliers();
// // // // // //       set("supplierId", result.id);
// // // // // //       set("supplierName", result.name);

// // // // // //       setShowCreateSupplier(false);
// // // // // //       setNewSupplier({
// // // // // //         name: "",
// // // // // //         code: "",
// // // // // //         phone: "",
// // // // // //         email: "",
// // // // // //         address: "",
// // // // // //         contactName: "",
// // // // // //       });

// // // // // //       Alert.alert("Success", "Supplier created successfully");
// // // // // //     } catch (error: any) {
// // // // // //       Alert.alert(
// // // // // //         "Failed to create supplier",
// // // // // //         error?.data?.message || "Unable to create supplier.",
// // // // // //       );
// // // // // //     } finally {
// // // // // //       setIsCreatingSupplier(false);
// // // // // //     }
// // // // // //   };

// // // // // //   // ✅ NEW: Handle Create Brand
// // // // // //   const handleCreateBrand = async () => {
// // // // // //     try {
// // // // // //       if (!newBrand.name.trim()) {
// // // // // //         Alert.alert("Error", "Brand name is required");
// // // // // //         return;
// // // // // //       }

// // // // // //       setIsCreatingBrand(true);

// // // // // //       const payload = {
// // // // // //         tenantId: "default",
// // // // // //         name: newBrand.name.trim(),
// // // // // //         description: newBrand.description.trim() || undefined,
// // // // // //         isActive: true,
// // // // // //       };

// // // // // //       const result = await createBrand(payload).unwrap();
// // // // // //       await refetchBrands();
// // // // // //       set("brandId", result.id);
// // // // // //       set("brand", result.name);

// // // // // //       setShowCreateBrand(false);
// // // // // //       setNewBrand({ name: "", description: "" });

// // // // // //       Alert.alert("Success", "Brand created successfully");
// // // // // //     } catch (error: any) {
// // // // // //       Alert.alert(
// // // // // //         "Failed to create brand",
// // // // // //         error?.data?.message || "Unable to create brand.",
// // // // // //       );
// // // // // //     } finally {
// // // // // //       setIsCreatingBrand(false);
// // // // // //     }
// // // // // //   };

// // // // // //   return (
// // // // // //     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
// // // // // //       <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
// // // // // //         <Header
// // // // // //           eyebrow="Editor"
// // // // // //           title={title}
// // // // // //           subtitle="Create or update records offline first."
// // // // // //           right={
// // // // // //             <Pressable onPress={onClose}>
// // // // // //               <MaterialIcons name="close" size={24} color="#fff" />
// // // // // //             </Pressable>
// // // // // //           }
// // // // // //         />
// // // // // //         <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
// // // // // //           {/* ============================================ */}
// // // // // //           {/* STAFF FORM */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "staff" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Username"
// // // // // //                 value={fields.username ?? ""}
// // // // // //                 onChangeText={(v) => set("username", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Email"
// // // // // //                 value={fields.email ?? ""}
// // // // // //                 onChangeText={(v) => set("email", v)}
// // // // // //               />
// // // // // //               {mode === "create" && (
// // // // // //                 <Field
// // // // // //                   label="Password"
// // // // // //                   value={fields.password ?? ""}
// // // // // //                   onChangeText={(v) => set("password", v)}
// // // // // //                   secureTextEntry
// // // // // //                 />
// // // // // //               )}

// // // // // //               <StoreSelector
// // // // // //                 value={fields.storeId ?? ""}
// // // // // //                 onChange={(storeId, storeName) => {
// // // // // //                   set("storeId", storeId);
// // // // // //                   set("storeName", storeName);
// // // // // //                 }}
// // // // // //                 stores={stores}
// // // // // //                 label="Assigned Store"
// // // // // //               />

// // // // // //               <RoleSelector
// // // // // //                 value={fields.role ?? "CASHIER"}
// // // // // //                 onChange={(role) => {
// // // // // //                   set("role", role);
// // // // // //                   set("permissions", getDefaultPermissions(role));
// // // // // //                 }}
// // // // // //               />
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* PRODUCTS FORM */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "products" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="SKU"
// // // // // //                 value={fields.sku ?? ""}
// // // // // //                 onChangeText={(v) => set("sku", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Barcode"
// // // // // //                 value={fields.barcode ?? ""}
// // // // // //                 onChangeText={(v) => set("barcode", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Description"
// // // // // //                 value={fields.description ?? ""}
// // // // // //                 onChangeText={(v) => set("description", v)}
// // // // // //                 multiline
// // // // // //               />

// // // // // //               {/* ✅ Brand Selector */}
// // // // // //               <BrandSelector
// // // // // //                 value={fields.brandId ?? ""}
// // // // // //                 onChange={(brandId, brandName) => {
// // // // // //                   set("brandId", brandId);
// // // // // //                   set("brand", brandName);
// // // // // //                 }}
// // // // // //                 brands={brands}
// // // // // //                 onAddBrand={() => setShowCreateBrand(true)}
// // // // // //               />

// // // // // //               <Field
// // // // // //                 label="Cost Price"
// // // // // //                 value={fields.costPrice?.toString() ?? ""}
// // // // // //                 onChangeText={(v) => {
// // // // // //                   const num = parseFloat(v);
// // // // // //                   set("costPrice", isNaN(num) ? 0 : num);
// // // // // //                 }}
// // // // // //                 keyboardType="decimal-pad"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Selling Price"
// // // // // //                 value={fields.sellingPrice?.toString() ?? ""}
// // // // // //                 onChangeText={(v) => {
// // // // // //                   const num = parseFloat(v);
// // // // // //                   set("sellingPrice", isNaN(num) ? 0 : num);
// // // // // //                 }}
// // // // // //                 keyboardType="decimal-pad"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Wholesale Price"
// // // // // //                 value={fields.wholesalePrice?.toString() ?? ""}
// // // // // //                 onChangeText={(v) => {
// // // // // //                   const num = parseFloat(v);
// // // // // //                   set("wholesalePrice", isNaN(num) ? 0 : num);
// // // // // //                 }}
// // // // // //                 keyboardType="decimal-pad"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Initial Stock"
// // // // // //                 value={fields.initialStock?.toString() ?? ""}
// // // // // //                 onChangeText={(v) => {
// // // // // //                   const num = parseInt(v, 10);
// // // // // //                   set("initialStock", isNaN(num) ? 0 : num);
// // // // // //                 }}
// // // // // //                 keyboardType="numeric"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Manufacturing Date"
// // // // // //                 value={fields.manufacturingDate ?? ""}
// // // // // //                 onChangeText={(v) => set("manufacturingDate", v)}
// // // // // //                 placeholder="YYYY-MM-DD"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Expiry Date"
// // // // // //                 value={fields.expiryDate ?? ""}
// // // // // //                 onChangeText={(v) => set("expiryDate", v)}
// // // // // //                 placeholder="YYYY-MM-DD"
// // // // // //               />

// // // // // //               <CategorySelector
// // // // // //                 value={fields.categoryId ?? ""}
// // // // // //                 onChange={(categoryId, categoryName) => {
// // // // // //                   set("categoryId", categoryId);
// // // // // //                   set("categoryName", categoryName);
// // // // // //                 }}
// // // // // //                 categories={categories}
// // // // // //                 onAddCategory={() => setShowCreateCategory(true)}
// // // // // //               />

// // // // // //               <SupplierSelector
// // // // // //                 value={fields.supplierId ?? ""}
// // // // // //                 onChange={(supplierId, supplierName) => {
// // // // // //                   set("supplierId", supplierId);
// // // // // //                   set("supplierName", supplierName);
// // // // // //                 }}
// // // // // //                 suppliers={suppliers}
// // // // // //               />

// // // // // //               {/* Create Category Modal */}
// // // // // //               {showCreateCategory && (
// // // // // //                 <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
// // // // // //                   <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
// // // // // //                     Create New Category
// // // // // //                   </Text>
// // // // // //                   <Field
// // // // // //                     label="Category Name"
// // // // // //                     value={newCategory.name}
// // // // // //                     onChangeText={(v) => {
// // // // // //                       setNewCategory({ ...newCategory, name: v });
// // // // // //                       if (!newCategory.slug) {
// // // // // //                         const slug = v.toLowerCase().replace(/\s+/g, "-");
// // // // // //                         setNewCategory((prev) => ({ ...prev, slug }));
// // // // // //                       }
// // // // // //                     }}
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Slug (URL friendly)"
// // // // // //                     value={newCategory.slug}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewCategory({ ...newCategory, slug: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Description"
// // // // // //                     value={newCategory.description}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewCategory({ ...newCategory, description: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <View className="mt-2 flex-row gap-3">
// // // // // //                     <ActionButton
// // // // // //                       title="Cancel"
// // // // // //                       icon="close"
// // // // // //                       accent="rose"
// // // // // //                       onPress={() => setShowCreateCategory(false)}
// // // // // //                     />
// // // // // //                     <ActionButton
// // // // // //                       title="Create"
// // // // // //                       icon="add"
// // // // // //                       accent="emerald"
// // // // // //                       onPress={handleCreateCategory}
// // // // // //                       disabled={isCreatingCategory}
// // // // // //                     />
// // // // // //                   </View>
// // // // // //                 </View>
// // // // // //               )}
// // // // // //               <Pressable
// // // // // //                 onPress={() => setShowCreateCategory(true)}
// // // // // //                 className="mb-4 rounded-2xl border border-dashed border-sky-500/30 p-4"
// // // // // //               >
// // // // // //                 <Text className="text-center text-sky-400">
// // // // // //                   + Create New Category
// // // // // //                 </Text>
// // // // // //               </Pressable>

// // // // // //               {/* Create Brand Modal - ✅ NEW */}
// // // // // //               {showCreateBrand && (
// // // // // //                 <View className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
// // // // // //                   <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-purple-400">
// // // // // //                     Create New Brand
// // // // // //                   </Text>
// // // // // //                   <Field
// // // // // //                     label="Brand Name"
// // // // // //                     value={newBrand.name}
// // // // // //                     onChangeText={(v) => setNewBrand({ ...newBrand, name: v })}
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Description"
// // // // // //                     value={newBrand.description}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewBrand({ ...newBrand, description: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <View className="mt-2 flex-row gap-3">
// // // // // //                     <ActionButton
// // // // // //                       title="Cancel"
// // // // // //                       icon="close"
// // // // // //                       accent="rose"
// // // // // //                       onPress={() => setShowCreateBrand(false)}
// // // // // //                     />
// // // // // //                     <ActionButton
// // // // // //                       title="Create"
// // // // // //                       icon="add"
// // // // // //                       accent="rose"
// // // // // //                       onPress={handleCreateBrand}
// // // // // //                       disabled={isCreatingBrand}
// // // // // //                     />
// // // // // //                   </View>
// // // // // //                 </View>
// // // // // //               )}
// // // // // //               <Pressable
// // // // // //                 onPress={() => setShowCreateBrand(true)}
// // // // // //                 className="mb-4 rounded-2xl border border-dashed border-purple-500/30 p-4"
// // // // // //               >
// // // // // //                 <Text className="text-center text-purple-400">
// // // // // //                   + Create New Brand
// // // // // //                 </Text>
// // // // // //               </Pressable>
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* STORES FORM */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "stores" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Code"
// // // // // //                 value={fields.code ?? ""}
// // // // // //                 onChangeText={(v) => set("code", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Address"
// // // // // //                 value={fields.address ?? ""}
// // // // // //                 onChangeText={(v) => set("address", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Phone"
// // // // // //                 value={fields.phone ?? ""}
// // // // // //                 onChangeText={(v) => set("phone", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Email"
// // // // // //                 value={fields.email ?? ""}
// // // // // //                 onChangeText={(v) => set("email", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Tax Number"
// // // // // //                 value={fields.taxNumber ?? ""}
// // // // // //                 onChangeText={(v) => set("taxNumber", v)}
// // // // // //               />
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* CATEGORIES FORM */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "categories" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Slug"
// // // // // //                 value={fields.slug ?? ""}
// // // // // //                 onChangeText={(v) => set("slug", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Description"
// // // // // //                 value={fields.description ?? ""}
// // // // // //                 onChangeText={(v) => set("description", v)}
// // // // // //               />
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* BRANDS FORM - ✅ NEW */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "brands" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Description"
// // // // // //                 value={fields.description ?? ""}
// // // // // //                 onChangeText={(v) => set("description", v)}
// // // // // //                 multiline
// // // // // //               />
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* CUSTOMERS FORM */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "customers" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Phone"
// // // // // //                 value={fields.phone ?? ""}
// // // // // //                 onChangeText={(v) => set("phone", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Email"
// // // // // //                 value={fields.email ?? ""}
// // // // // //                 onChangeText={(v) => set("email", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Address"
// // // // // //                 value={fields.address ?? ""}
// // // // // //                 onChangeText={(v) => set("address", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Date of Birth"
// // // // // //                 value={fields.dateOfBirth ?? ""}
// // // // // //                 onChangeText={(v) => set("dateOfBirth", v)}
// // // // // //                 placeholder="YYYY-MM-DD"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Gender"
// // // // // //                 value={fields.gender ?? ""}
// // // // // //                 onChangeText={(v) => set("gender", v)}
// // // // // //                 placeholder="MALE / FEMALE / OTHER"
// // // // // //               />
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* SUPPLIERS FORM */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "suppliers" && (
// // // // // //             <>
// // // // // //               <Field
// // // // // //                 label="Name"
// // // // // //                 value={fields.name ?? ""}
// // // // // //                 onChangeText={(v) => set("name", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Code"
// // // // // //                 value={fields.code ?? ""}
// // // // // //                 onChangeText={(v) => set("code", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Contact Person"
// // // // // //                 value={fields.contactName ?? ""}
// // // // // //                 onChangeText={(v) => set("contactName", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Phone"
// // // // // //                 value={fields.phone ?? ""}
// // // // // //                 onChangeText={(v) => set("phone", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Email"
// // // // // //                 value={fields.email ?? ""}
// // // // // //                 onChangeText={(v) => set("email", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Address"
// // // // // //                 value={fields.address ?? ""}
// // // // // //                 onChangeText={(v) => set("address", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Tax Number"
// // // // // //                 value={fields.taxNumber ?? ""}
// // // // // //                 onChangeText={(v) => set("taxNumber", v)}
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Payment Terms (days)"
// // // // // //                 value={fields.paymentTerms?.toString() ?? ""}
// // // // // //                 onChangeText={(v) => {
// // // // // //                   const num = parseInt(v, 10);
// // // // // //                   set("paymentTerms", isNaN(num) ? undefined : num);
// // // // // //                 }}
// // // // // //                 keyboardType="numeric"
// // // // // //                 placeholder="30"
// // // // // //               />
// // // // // //               <Field
// // // // // //                 label="Credit Limit"
// // // // // //                 value={fields.creditLimit?.toString() ?? ""}
// // // // // //                 onChangeText={(v) => {
// // // // // //                   const num = parseFloat(v);
// // // // // //                   set("creditLimit", isNaN(num) ? undefined : num);
// // // // // //                 }}
// // // // // //                 keyboardType="decimal-pad"
// // // // // //                 placeholder="0.00"
// // // // // //               />

// // // // // //               {showCreateSupplier && (
// // // // // //                 <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
// // // // // //                   <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-emerald-400">
// // // // // //                     Create New Supplier
// // // // // //                   </Text>
// // // // // //                   <Field
// // // // // //                     label="Supplier Name"
// // // // // //                     value={newSupplier.name}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewSupplier({ ...newSupplier, name: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Code"
// // // // // //                     value={newSupplier.code}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewSupplier({ ...newSupplier, code: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Contact Person"
// // // // // //                     value={newSupplier.contactName}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewSupplier({ ...newSupplier, contactName: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Phone"
// // // // // //                     value={newSupplier.phone}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewSupplier({ ...newSupplier, phone: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <Field
// // // // // //                     label="Email"
// // // // // //                     value={newSupplier.email}
// // // // // //                     onChangeText={(v) =>
// // // // // //                       setNewSupplier({ ...newSupplier, email: v })
// // // // // //                     }
// // // // // //                   />
// // // // // //                   <View className="mt-2 flex-row gap-3">
// // // // // //                     <ActionButton
// // // // // //                       title="Cancel"
// // // // // //                       icon="close"
// // // // // //                       accent="rose"
// // // // // //                       onPress={() => setShowCreateSupplier(false)}
// // // // // //                     />
// // // // // //                     <ActionButton
// // // // // //                       title="Create"
// // // // // //                       icon="add"
// // // // // //                       accent="emerald"
// // // // // //                       onPress={handleCreateSupplier}
// // // // // //                       disabled={isCreatingSupplier}
// // // // // //                     />
// // // // // //                   </View>
// // // // // //                 </View>
// // // // // //               )}
// // // // // //               <Pressable
// // // // // //                 onPress={() => setShowCreateSupplier(true)}
// // // // // //                 className="mb-4 rounded-2xl border border-dashed border-emerald-500/30 p-4"
// // // // // //               >
// // // // // //                 <Text className="text-center text-emerald-400">
// // // // // //                   + Create New Supplier
// // // // // //                 </Text>
// // // // // //               </Pressable>
// // // // // //             </>
// // // // // //           )}

// // // // // //           {/* ============================================ */}
// // // // // //           {/* SESSIONS - No form needed */}
// // // // // //           {/* ============================================ */}
// // // // // //           {moduleKey === "sessions" && (
// // // // // //             <View className="py-8">
// // // // // //               <Text className="text-center text-slate-400">
// // // // // //                 Session management is handled separately.
// // // // // //               </Text>
// // // // // //               <Text className="text-center text-slate-500 text-sm mt-2">
// // // // // //                 Use the "Open Session" or "Close Session" button above.
// // // // // //               </Text>
// // // // // //             </View>
// // // // // //           )}

// // // // // //           <View className="mt-4 flex-row gap-3">
// // // // // //             <ActionButton
// // // // // //               title="Cancel"
// // // // // //               icon="close"
// // // // // //               accent="rose"
// // // // // //               onPress={onClose}
// // // // // //             />
// // // // // //             <ActionButton
// // // // // //               title="Save"
// // // // // //               icon="save"
// // // // // //               accent="emerald"
// // // // // //               onPress={save}
// // // // // //             />
// // // // // //           </View>
// // // // // //           {mode === "edit" && onDelete ? (
// // // // // //             <View className="mt-3">
// // // // // //               <ActionButton
// // // // // //                 title="Delete"
// // // // // //                 icon="delete"
// // // // // //                 accent="rose"
// // // // // //                 onPress={onDelete}
// // // // // //               />
// // // // // //             </View>
// // // // // //           ) : null}
// // // // // //         </ScrollView>
// // // // // //       </SafeAreaView>
// // // // // //     </Modal>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // FIELD COMPONENT
// // // // // // // ============================================

// // // // // // function Field({
// // // // // //   label,
// // // // // //   value,
// // // // // //   onChangeText,
// // // // // //   secureTextEntry = false,
// // // // // //   keyboardType = "default",
// // // // // //   multiline = false,
// // // // // //   placeholder,
// // // // // // }: {
// // // // // //   label: string;
// // // // // //   value: string;
// // // // // //   onChangeText: (value: string) => void;
// // // // // //   secureTextEntry?: boolean;
// // // // // //   keyboardType?:
// // // // // //     | "default"
// // // // // //     | "decimal-pad"
// // // // // //     | "numeric"
// // // // // //     | "email-address"
// // // // // //     | "phone-pad";
// // // // // //   multiline?: boolean;
// // // // // //   placeholder?: string;
// // // // // // }) {
// // // // // //   return (
// // // // // //     <View className="mb-4">
// // // // // //       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
// // // // // //         {label}
// // // // // //       </Text>
// // // // // //       <TextInput
// // // // // //         value={value}
// // // // // //         onChangeText={onChangeText}
// // // // // //         placeholder={placeholder || label}
// // // // // //         placeholderTextColor="#64748b"
// // // // // //         secureTextEntry={secureTextEntry}
// // // // // //         keyboardType={keyboardType}
// // // // // //         multiline={multiline}
// // // // // //         numberOfLines={multiline ? 3 : 1}
// // // // // //         className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white ${
// // // // // //           multiline ? "min-h-[100px] text-left align-top" : ""
// // // // // //         }`}
// // // // // //       />
// // // // // //     </View>
// // // // // //   );
// // // // // // }

// // // // // // // ============================================
// // // // // // // DEFAULT FIELDS
// // // // // // // ============================================

// // // // // // function getDefaultFields(moduleKey: ModuleKey) {
// // // // // //   if (moduleKey === "staff")
// // // // // //     return {
// // // // // //       username: "",
// // // // // //       name: "",
// // // // // //       email: "",
// // // // // //       password: "",
// // // // // //       role: "CASHIER",
// // // // // //       permissions: [],
// // // // // //       storeId: "",
// // // // // //     };
// // // // // //   if (moduleKey === "products")
// // // // // //     return {
// // // // // //       sku: "",
// // // // // //       barcode: "",
// // // // // //       name: "",
// // // // // //       description: "",
// // // // // //       brandId: "",
// // // // // //       brand: "",
// // // // // //       costPrice: 0,
// // // // // //       sellingPrice: 0,
// // // // // //       wholesalePrice: 0,
// // // // // //       categoryId: "",
// // // // // //       categoryName: "",
// // // // // //       manufacturingDate: "",
// // // // // //       expiryDate: "",
// // // // // //       supplierId: "",
// // // // // //       initialStock: 0,
// // // // // //       variants: [],
// // // // // //     };
// // // // // //   if (moduleKey === "stores")
// // // // // //     return {
// // // // // //       code: "",
// // // // // //       name: "",
// // // // // //       address: "",
// // // // // //       phone: "",
// // // // // //       email: "",
// // // // // //       taxNumber: "",
// // // // // //     };
// // // // // //   if (moduleKey === "categories")
// // // // // //     return { name: "", slug: "", description: "" };
// // // // // //   if (moduleKey === "brands")
// // // // // //     // ✅ ADDED
// // // // // //     return { name: "", description: "" };
// // // // // //   if (moduleKey === "customers")
// // // // // //     return {
// // // // // //       name: "",
// // // // // //       phone: "",
// // // // // //       email: "",
// // // // // //       address: "",
// // // // // //       dateOfBirth: "",
// // // // // //       gender: "",
// // // // // //     };
// // // // // //   if (moduleKey === "suppliers")
// // // // // //     return {
// // // // // //       name: "",
// // // // // //       code: "",
// // // // // //       contactName: "",
// // // // // //       phone: "",
// // // // // //       email: "",
// // // // // //       address: "",
// // // // // //       taxNumber: "",
// // // // // //       paymentTerms: "",
// // // // // //       creditLimit: "",
// // // // // //     };
// // // // // //   return {};
// // // // // // }

// // // // // // // ============================================
// // // // // // // BUILD PAYLOAD
// // // // // // // ============================================

// // // // // // function buildPayload(
// // // // // //   moduleKey: ModuleKey,
// // // // // //   values: Record<string, any>,
// // // // // //   currentStoreId: string | null,
// // // // // // ) {
// // // // // //   if (moduleKey === "staff") {
// // // // // //     const payload: any = {
// // // // // //       username: String(values.username ?? "").trim(),
// // // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       role: values.role ?? "CASHIER",
// // // // // //       permissions: Array.isArray(values.permissions) ? values.permissions : [],
// // // // // //       isActive: values.isActive ?? true,
// // // // // //       storeId: values.storeId || currentStoreId || undefined,
// // // // // //     };
// // // // // //     if (values.password && String(values.password).trim()) {
// // // // // //       payload.password = String(values.password).trim();
// // // // // //     }
// // // // // //     return payload;
// // // // // //   }

// // // // // //   if (moduleKey === "products") {
// // // // // //     const payload: any = {
// // // // // //       tenantId: "default",
// // // // // //       sku: String(values.sku ?? "").trim() || undefined,
// // // // // //       barcode: String(values.barcode ?? "").trim() || undefined,
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       description: String(values.description ?? "").trim() || undefined,
// // // // // //       brandId: String(values.brandId ?? "").trim() || undefined,
// // // // // //       costPrice: Number(values.costPrice ?? 0),
// // // // // //       sellingPrice: Number(values.sellingPrice ?? 0),
// // // // // //       wholesalePrice: Number(values.wholesalePrice ?? 0),
// // // // // //       categoryId: String(values.categoryId ?? "").trim() || undefined,
// // // // // //       categoryName: String(values.categoryName ?? "").trim() || undefined,
// // // // // //       manufacturingDate:
// // // // // //         String(values.manufacturingDate ?? "").trim() || undefined,
// // // // // //       expiryDate: String(values.expiryDate ?? "").trim() || undefined,
// // // // // //       supplierId: String(values.supplierId ?? "").trim() || undefined,
// // // // // //       storeId: currentStoreId || undefined,
// // // // // //       initialStock: values.initialStock
// // // // // //         ? Number(values.initialStock)
// // // // // //         : undefined,
// // // // // //     };
// // // // // //     Object.keys(payload).forEach((key) => {
// // // // // //       if (payload[key] === undefined) delete payload[key];
// // // // // //     });
// // // // // //     return payload;
// // // // // //   }

// // // // // //   if (moduleKey === "stores") {
// // // // // //     return {
// // // // // //       tenantId: "default",
// // // // // //       code: String(values.code ?? "").trim() || undefined,
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       address: String(values.address ?? "").trim() || undefined,
// // // // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // // // // //       isActive: values.isActive ?? true,
// // // // // //     };
// // // // // //   }

// // // // // //   if (moduleKey === "categories") {
// // // // // //     return {
// // // // // //       tenantId: "default",
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       slug: String(values.slug ?? "").trim(),
// // // // // //       description: String(values.description ?? "").trim() || undefined,
// // // // // //       storeId: currentStoreId || undefined,
// // // // // //       isActive: values.isActive ?? true,
// // // // // //     };
// // // // // //   }

// // // // // //   if (moduleKey === "brands") {
// // // // // //     // ✅ ADDED
// // // // // //     return {
// // // // // //       tenantId: "default",
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       description: String(values.description ?? "").trim() || undefined,
// // // // // //       isActive: values.isActive ?? true,
// // // // // //     };
// // // // // //   }

// // // // // //   if (moduleKey === "customers") {
// // // // // //     return {
// // // // // //       tenantId: "default",
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // // //       address: String(values.address ?? "").trim() || undefined,
// // // // // //       dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
// // // // // //       gender: String(values.gender ?? "").trim() || undefined,
// // // // // //     };
// // // // // //   }

// // // // // //   if (moduleKey === "suppliers") {
// // // // // //     return {
// // // // // //       tenantId: "default",
// // // // // //       name: String(values.name ?? "").trim(),
// // // // // //       code: String(values.code ?? "").trim() || undefined,
// // // // // //       contactName: String(values.contactName ?? "").trim() || undefined,
// // // // // //       phone: String(values.phone ?? "").trim() || undefined,
// // // // // //       email: String(values.email ?? "").trim() || undefined,
// // // // // //       address: String(values.address ?? "").trim() || undefined,
// // // // // //       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
// // // // // //       paymentTerms: values.paymentTerms
// // // // // //         ? Number(values.paymentTerms)
// // // // // //         : undefined,
// // // // // //       creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
// // // // // //       storeId: currentStoreId || undefined,
// // // // // //       isActive: values.isActive ?? true,
// // // // // //     };
// // // // // //   }

// // // // // //   return values;
// // // // // // }

// // // // // // // ============================================
// // // // // // // SESSION MODAL
// // // // // // // ============================================

// // // // // // function SessionModal({
// // // // // //   visible,
// // // // // //   mode,
// // // // // //   activeSession,
// // // // // //   onClose,
// // // // // //   onOpen,
// // // // // //   onCloseSession,
// // // // // // }: {
// // // // // //   visible: boolean;
// // // // // //   mode: "open" | "close" | null;
// // // // // //   activeSession: any;
// // // // // //   onClose: () => void;
// // // // // //   onOpen: (openingBalance: string, notes: string) => Promise<void>;
// // // // // //   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// // // // // // }) {
// // // // // //   const [balance, setBalance] = useState("0");
// // // // // //   const [notes, setNotes] = useState("");

// // // // // //   return (
// // // // // //     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
// // // // // //       <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
// // // // // //         <Header
// // // // // //           eyebrow="Session"
// // // // // //           title={mode === "open" ? "Open session" : "Close session"}
// // // // // //           subtitle={
// // // // // //             activeSession ? `Active: ${activeSession.id}` : "No active session"
// // // // // //           }
// // // // // //           right={
// // // // // //             <Pressable onPress={onClose}>
// // // // // //               <MaterialIcons name="close" size={24} color="#fff" />
// // // // // //             </Pressable>
// // // // // //           }
// // // // // //         />
// // // // // //         <TextInput
// // // // // //           value={balance}
// // // // // //           onChangeText={setBalance}
// // // // // //           keyboardType="decimal-pad"
// // // // // //           placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
// // // // // //           placeholderTextColor="#64748b"
// // // // // //           className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-green-500"
// // // // // //         />
// // // // // //         <TextInput
// // // // // //           value={notes}
// // // // // //           onChangeText={setNotes}
// // // // // //           placeholder="Notes"
// // // // // //           placeholderTextColor="#64748b"
// // // // // //           className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-green-500"
// // // // // //         />
// // // // // //         <View className="flex-row gap-3">
// // // // // //           <ActionButton
// // // // // //             title="Cancel"
// // // // // //             icon="close"
// // // // // //             accent="rose"
// // // // // //             onPress={onClose}
// // // // // //           />
// // // // // //           <ActionButton
// // // // // //             title={mode === "open" ? "Open" : "Close"}
// // // // // //             icon="schedule"
// // // // // //             accent="emerald"
// // // // // //             onPress={async () => {
// // // // // //               if (mode === "open") await onOpen(balance, notes);
// // // // // //               else await onCloseSession(balance, notes);
// // // // // //             }}
// // // // // //           />
// // // // // //         </View>
// // // // // //       </SafeAreaView>
// // // // // //     </Modal>
// // // // // //   );
// // // // // // }
