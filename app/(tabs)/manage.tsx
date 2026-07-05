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
import { setStore } from "@/services/features/auth/authSlice";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Offline-first local APIs
import {
  useCloseLocalSessionMutation,
  useCreateLocalCategoryMutation,
  useCreateLocalCustomerMutation,
  useCreateLocalProductMutation,
  useCreateLocalStaffMutation,
  useCreateLocalStoreMutation,
  useCreateLocalSupplierMutation,
  useDeleteLocalCategoryMutation,
  useDeleteLocalCustomerMutation,
  useDeleteLocalProductMutation,
  useDeleteLocalStaffMutation,
  useDeleteLocalStoreMutation,
  useDeleteLocalSupplierMutation,
  useGetActiveSessionQuery,
  useGetLocalCategoriesQuery,
  useGetLocalCustomersQuery,
  useGetLocalProductsQuery,
  useGetLocalStaffQuery,
  useGetLocalStoresQuery,
  useGetLocalSuppliersQuery,
  useOpenLocalSessionMutation,
  useUpdateLocalCategoryMutation,
  useUpdateLocalCustomerMutation,
  useUpdateLocalProductMutation,
  useUpdateLocalStaffMutation,
  useUpdateLocalStoreMutation,
  useUpdateLocalSupplierMutation,
} from "@/services/features/offline/localApi";

type ModuleKey =
  | "staff"
  | "products"
  | "stores"
  | "categories"
  | "customers"
  | "suppliers"
  | "sessions";

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

  // ✅ Queries
  const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
    storeId: currentStoreId || undefined,
  });
  const { data: products = [], refetch: refetchProducts } =
    useGetLocalProductsQuery({
      storeId: currentStoreId || undefined,
    });
  const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
    {},
  );
  const { data: categories = [], refetch: refetchCategories } =
    useGetLocalCategoriesQuery({
      storeId: currentStoreId || undefined,
    });
  const { data: customers = [], refetch: refetchCustomers } =
    useGetLocalCustomersQuery({});
  const { data: suppliers = [], refetch: refetchSuppliers } =
    useGetLocalSuppliersQuery({
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

  const [openSession] = useOpenLocalSessionMutation();
  const [closeSession] = useCloseLocalSessionMutation();

  const refetchers = {
    staff: refetchStaff,
    products: refetchProducts,
    stores: refetchStores,
    categories: refetchCategories,
    customers: refetchCustomers,
    suppliers: refetchSuppliers,
    sessions: refetchSession,
  } as const;

  const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

  const storeOptions = useMemo(() => stores, [stores]);

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

  const summary = [
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
  ];

  const list = getModuleList({
    moduleKey,
    staff,
    products,
    stores,
    categories,
    customers,
    suppliers,
    activeSession,
  });

  const handleSave = async (values: Record<string, any>) => {
    try {
      const nextValues = buildPayload(moduleKey, values, currentStoreId);

      if (moduleKey === "staff") {
        if (editor.mode === "create") await createStaff(nextValues).unwrap();
        else
          await updateStaff({ id: editor.item.id, data: nextValues }).unwrap();
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
      await refetchers[moduleKey]();
    } catch (error: any) {
      Alert.alert(
        "Delete failed",
        error?.data?.message || "Unable to delete item.",
      );
    }
  };

  const openEditor = (mode: "create" | "edit", item?: any) => {
    setEditor({ open: true, mode, item });
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <Header
            eyebrow="Administration"
            title="Management"
            subtitle="Manage staff, products, stores, categories, customers, suppliers, and session control from one place."
            right={<Pill label={user?.role ?? "USER"} tone="sky" />}
          />

          <View className="mb-4 flex-row flex-wrap gap-3">
            {summary.map((item) => (
              <View key={item.label} className="w-[48.5%]">
                <MetricCard {...item} />
              </View>
            ))}
          </View>

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

          <SectionTitle title="Modules" />
          <View className="mb-4 flex-row flex-wrap gap-2">
            {(
              [
                "products",
                "staff",
                "stores",
                "categories",
                "customers",
                "suppliers",
                "sessions",
              ] as ModuleKey[]
            ).map((key) => (
              <Pressable
                key={key}
                onPress={() => setModuleKey(key)}
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
          </View>

          <View className="mb-4 flex-row gap-3">
            <ActionButton
              title="Add New"
              icon="add"
              accent="emerald"
              onPress={() => openEditor("create")}
            />
            {moduleKey === "sessions" ? (
              <ActionButton
                title={activeSession ? "Close Session" : "Open Session"}
                icon="schedule"
                accent={activeSession ? "rose" : "sky"}
                onPress={() =>
                  setSessionModal(activeSession ? "close" : "open")
                }
              />
            ) : (
              <ActionButton
                title="Refresh"
                icon="refresh"
                accent="sky"
                onPress={() => refetchers[moduleKey]()}
              />
            )}
          </View>

          <SectionTitle
            title={`${moduleKey} list`}
            action="Tap an item to edit"
          />
          <Card>
            {list.length ? (
              list.map((item: any, index: number) => (
                <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
                  <Pressable onPress={() => openEditor("edit", item)}>
                    <RowItem
                      title={item.name || item.username || item.code || item.id}
                      subtitle={getSubtitle(moduleKey, item)}
                      right={getRightLabel(moduleKey, item)}
                      icon={getIcon(moduleKey)}
                    />
                  </Pressable>
                  {index < list.length - 1 ? (
                    <View className="my-3 h-px bg-white/8" />
                  ) : null}
                </View>
              ))
            ) : (
              <Text className="py-8 text-center text-sm text-slate-400">
                No items yet.
              </Text>
            )}
          </Card>
        </ScrollView>

        <EditorModal
          visible={editor.open}
          title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
          moduleKey={moduleKey}
          item={editor.item}
          mode={editor.mode}
          onClose={() => setEditor({ open: false, mode: "create" })}
          onSave={handleSave}
          onDelete={editor.item ? () => handleDelete(editor.item) : undefined}
          currentStoreId={currentStoreId}
          stores={stores}
          categories={categories}
          suppliers={suppliers}
          refetchCategories={refetchCategories}
          refetchSuppliers={refetchSuppliers}
        />

        <SessionModal
          visible={sessionModal !== null}
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
                id: activeSession.id,
                closingBalance: Number(closingBalance || 0),
                expectedBalance: Number(closingBalance || 0),
                discrepancy: 0,
                notes,
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
      </SafeAreaView>
    </Screen>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getModuleList(input: any) {
  const {
    moduleKey,
    staff,
    products,
    stores,
    categories,
    customers,
    suppliers,
    activeSession,
  } = input;
  if (moduleKey === "staff") return staff;
  if (moduleKey === "products") return products;
  if (moduleKey === "stores") return stores;
  if (moduleKey === "categories") return categories;
  if (moduleKey === "customers") return customers;
  if (moduleKey === "suppliers") return suppliers;
  return activeSession ? [activeSession] : [];
}

function getSubtitle(moduleKey: ModuleKey, item: any) {
  if (moduleKey === "staff")
    return `${item.role} • ${item.email ?? "no email"}`;
  if (moduleKey === "products")
    return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}`;
  if (moduleKey === "stores") return item.address ?? "No address";
  if (moduleKey === "categories") return item.slug ?? "No slug";
  if (moduleKey === "customers") return item.phone ?? item.code;
  if (moduleKey === "suppliers")
    return item.phone ?? item.email ?? "No contact";
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
  if (moduleKey === "sessions") return "schedule";
  return "schedule";
}

// ============================================
// SELECTOR COMPONENTS
// ============================================

// ============================================
// ROLE SELECTOR
// ============================================
function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (role: string) => void;
}) {
  const roles = [
    { label: "Admin", value: "ADMIN", description: "Full system access" },
    {
      label: "Manager",
      value: "MANAGER",
      description: "Manage store operations",
    },
    {
      label: "Cashier",
      value: "CASHIER",
      description: "Process sales and transactions",
    },
    {
      label: "Accountant",
      value: "ACCOUNTANT",
      description: "Financial and reporting access",
    },
  ];

  const [showDropdown, setShowDropdown] = useState(false);
  const selectedRole = roles.find((r) => r.value === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        Role
      </Text>
      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
          >
            {selectedRole ? selectedRole.label : "Select a role..."}
          </Text>
          <MaterialIcons
            name={showDropdown ? "expand-less" : "expand-more"}
            size={24}
            color="#64748b"
          />
        </View>
      </Pressable>

      {showDropdown && (
        <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
          <ScrollView className="max-h-48" nestedScrollEnabled>
            {roles.map((role) => (
              <Pressable
                key={role.value}
                onPress={() => {
                  onChange(role.value);
                  setShowDropdown(false);
                }}
                className={`rounded-xl px-4 py-3 ${
                  value === role.value ? "bg-emerald-500/20" : ""
                }`}
              >
                <Text className="text-white">{role.label}</Text>
                <Text className="text-xs text-slate-400">
                  {role.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function getDefaultPermissions(role: string): string[] {
  const permissions = {
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
  return permissions[role as keyof typeof permissions] || [];
}

// ============================================
// STORE SELECTOR
// ============================================
function StoreSelector({
  value,
  onChange,
  stores,
  label = "Store",
}: {
  value: string;
  onChange: (storeId: string, storeName: string) => void;
  stores: any[];
  label?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredStores = useMemo(() => {
    if (!searchText.trim()) return stores;
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(searchText.toLowerCase()) ||
        store.code?.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [stores, searchText]);

  const selectedStore = stores.find((store) => store.id === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
      </Text>
      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedStore ? "text-white" : "text-slate-400"}`}
          >
            {selectedStore ? selectedStore.name : "Select a store..."}
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
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search stores..."
            placeholderTextColor="#64748b"
            className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />
          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {filteredStores.length > 0 ? (
              filteredStores.map((store) => (
                <Pressable
                  key={store.id}
                  onPress={() => {
                    onChange(store.id, store.name);
                    setShowDropdown(false);
                    setSearchText("");
                  }}
                  className={`rounded-xl px-4 py-3 ${
                    value === store.id ? "bg-emerald-500/20" : ""
                  }`}
                >
                  <Text className="text-white">{store.name}</Text>
                  <Text className="text-xs text-slate-400">
                    {store.code} • {store.address || "No address"}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text className="py-4 text-center text-slate-400">
                No stores found
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================
// CATEGORY SELECTOR
// ============================================
function CategorySelector({
  value,
  onChange,
  categories,
  onAddCategory,
  label = "Category",
}: {
  value: string;
  onChange: (categoryId: string, categoryName: string) => void;
  categories: any[];
  onAddCategory: () => void;
  label?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [categories, searchText]);

  const selectedCategory = categories.find((cat) => cat.id === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
      </Text>

      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedCategory ? "text-white" : "text-slate-400"}`}
          >
            {selectedCategory ? selectedCategory.name : "Select a category..."}
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
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search categories..."
            placeholderTextColor="#64748b"
            className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />

          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {filteredCategories.length > 0 ? (
              filteredCategories.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onChange(item.id, item.name);
                    setShowDropdown(false);
                    setSearchText("");
                  }}
                  className={`rounded-xl px-4 py-3 ${
                    value === item.id ? "bg-emerald-500/20" : ""
                  }`}
                >
                  <Text className="text-white">{item.name}</Text>
                  {item.description && (
                    <Text className="text-xs text-slate-400">
                      {item.description}
                    </Text>
                  )}
                </Pressable>
              ))
            ) : (
              <View className="py-4">
                <Text className="text-center text-slate-400">
                  No categories found
                </Text>
                {searchText.trim() && (
                  <Pressable
                    onPress={() => {
                      onAddCategory();
                      setShowDropdown(false);
                      setSearchText("");
                    }}
                    className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
                  >
                    <Text className="text-center text-emerald-200">
                      Create "{searchText.trim()}"
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================
// SUPPLIER SELECTOR
// ============================================
function SupplierSelector({
  value,
  onChange,
  suppliers,
  label = "Supplier",
}: {
  value: string;
  onChange: (supplierId: string, supplierName: string) => void;
  suppliers: any[];
  label?: string;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredSuppliers = useMemo(() => {
    if (!searchText.trim()) return suppliers;
    return suppliers.filter(
      (sup) =>
        sup.name.toLowerCase().includes(searchText.toLowerCase()) ||
        sup.code?.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [suppliers, searchText]);

  const selectedSupplier = suppliers.find((sup) => sup.id === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
      </Text>

      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-base ${selectedSupplier ? "text-white" : "text-slate-400"}`}
          >
            {selectedSupplier ? selectedSupplier.name : "Select a supplier..."}
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
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search suppliers..."
            placeholderTextColor="#64748b"
            className="mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white"
          />

          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onChange(item.id, item.name);
                    setShowDropdown(false);
                    setSearchText("");
                  }}
                  className={`rounded-xl px-4 py-3 ${
                    value === item.id ? "bg-emerald-500/20" : ""
                  }`}
                >
                  <Text className="text-white">{item.name}</Text>
                  <Text className="text-xs text-slate-400">
                    {item.code} • {item.phone || "No phone"}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Text className="py-4 text-center text-slate-400">
                No suppliers found
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ============================================
// EDITOR MODAL
// ============================================

function EditorModal({
  visible,
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
  refetchCategories,
  refetchSuppliers,
}: {
  visible: boolean;
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
  refetchCategories: () => void;
  refetchSuppliers: () => void;
}) {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
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
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  const [createCategory] = useCreateLocalCategoryMutation();
  const [createSupplier] = useCreateLocalSupplierMutation();

  useEffect(() => {
    if (visible) {
      setFields(item ? { ...item } : getDefaultFields(moduleKey));
      setShowCreateCategory(false);
      setShowCreateSupplier(false);
      setNewCategory({ name: "", slug: "", description: "" });
      setNewSupplier({
        name: "",
        code: "",
        phone: "",
        email: "",
        address: "",
        contactName: "",
      });
    }
  }, [visible, item, moduleKey]);

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
      set("categoryId", result.id);
      set("categoryName", result.name);

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
        <Header
          eyebrow="Editor"
          title={title}
          subtitle="Create or update records offline first."
          right={
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* ============================================ */}
          {/* STAFF FORM */}
          {/* ============================================ */}
          {moduleKey === "staff" && (
            <>
              <Field
                label="Username"
                value={fields.username ?? ""}
                onChangeText={(v) => set("username", v)}
              />
              <Field
                label="Name"
                value={fields.name ?? ""}
                onChangeText={(v) => set("name", v)}
              />
              <Field
                label="Email"
                value={fields.email ?? ""}
                onChangeText={(v) => set("email", v)}
              />
              {mode === "create" && (
                <Field
                  label="Password"
                  value={fields.password ?? ""}
                  onChangeText={(v) => set("password", v)}
                  secureTextEntry
                />
              )}

              {/* ✅ Store Selector for Staff */}
              <StoreSelector
                value={fields.storeId ?? ""}
                onChange={(storeId, storeName) => {
                  set("storeId", storeId);
                  set("storeName", storeName);
                }}
                stores={stores}
                label="Assigned Store"
              />

              <RoleSelector
                value={fields.role ?? "CASHIER"}
                onChange={(role) => {
                  set("role", role);
                  set("permissions", getDefaultPermissions(role));
                }}
              />
            </>
          )}

          {/* ============================================ */}
          {/* PRODUCTS FORM */}
          {/* ============================================ */}
          {moduleKey === "products" && (
            <>
              <Field
                label="Name"
                value={fields.name ?? ""}
                onChangeText={(v) => set("name", v)}
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
              <Field
                label="Brand"
                value={fields.brand ?? ""}
                onChangeText={(v) => set("brand", v)}
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

              {/* ✅ Category Selector */}
              <CategorySelector
                value={fields.categoryId ?? ""}
                onChange={(categoryId, categoryName) => {
                  set("categoryId", categoryId);
                  set("categoryName", categoryName);
                }}
                categories={categories}
                onAddCategory={() => setShowCreateCategory(true)}
              />

              {/* ✅ Supplier Selector */}
              <SupplierSelector
                value={fields.supplierId ?? ""}
                onChange={(supplierId, supplierName) => {
                  set("supplierId", supplierId);
                  set("supplierName", supplierName);
                }}
                suppliers={suppliers}
              />

              {/* Create Category Modal */}
              {showCreateCategory && (
                <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
                    Create New Category
                  </Text>
                  <Field
                    label="Category Name"
                    value={newCategory.name}
                    onChangeText={(v) => {
                      setNewCategory({ ...newCategory, name: v });
                      if (!newCategory.slug) {
                        const slug = v.toLowerCase().replace(/\s+/g, "-");
                        setNewCategory((prev) => ({ ...prev, slug }));
                      }
                    }}
                  />
                  <Field
                    label="Slug (URL friendly)"
                    value={newCategory.slug}
                    onChangeText={(v) =>
                      setNewCategory({ ...newCategory, slug: v })
                    }
                  />
                  <Field
                    label="Description"
                    value={newCategory.description}
                    onChangeText={(v) =>
                      setNewCategory({ ...newCategory, description: v })
                    }
                  />
                  <View className="mt-2 flex-row gap-3">
                    <ActionButton
                      title="Cancel"
                      icon="close"
                      accent="rose"
                      onPress={() => setShowCreateCategory(false)}
                    />
                    <ActionButton
                      title="Create"
                      icon="add"
                      accent="emerald"
                      onPress={handleCreateCategory}
                      disabled={isCreatingCategory}
                    />
                  </View>
                </View>
              )}
              <Pressable
                onPress={() => setShowCreateCategory(true)}
                className="mb-4 rounded-2xl border border-dashed border-sky-500/30 p-4"
              >
                <Text className="text-center text-sky-400">
                  + Create New Category
                </Text>
              </Pressable>
            </>
          )}

          {/* ============================================ */}
          {/* STORES FORM */}
          {/* ============================================ */}
          {moduleKey === "stores" && (
            <>
              <Field
                label="Code"
                value={fields.code ?? ""}
                onChangeText={(v) => set("code", v)}
              />
              <Field
                label="Name"
                value={fields.name ?? ""}
                onChangeText={(v) => set("name", v)}
              />
              <Field
                label="Address"
                value={fields.address ?? ""}
                onChangeText={(v) => set("address", v)}
              />
              <Field
                label="Phone"
                value={fields.phone ?? ""}
                onChangeText={(v) => set("phone", v)}
              />
              <Field
                label="Email"
                value={fields.email ?? ""}
                onChangeText={(v) => set("email", v)}
              />
              <Field
                label="Tax Number"
                value={fields.taxNumber ?? ""}
                onChangeText={(v) => set("taxNumber", v)}
              />
            </>
          )}

          {/* ============================================ */}
          {/* CATEGORIES FORM */}
          {/* ============================================ */}
          {moduleKey === "categories" && (
            <>
              <Field
                label="Name"
                value={fields.name ?? ""}
                onChangeText={(v) => set("name", v)}
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
              />
            </>
          )}

          {/* ============================================ */}
          {/* CUSTOMERS FORM */}
          {/* ============================================ */}
          {moduleKey === "customers" && (
            <>
              <Field
                label="Name"
                value={fields.name ?? ""}
                onChangeText={(v) => set("name", v)}
              />
              <Field
                label="Phone"
                value={fields.phone ?? ""}
                onChangeText={(v) => set("phone", v)}
              />
              <Field
                label="Email"
                value={fields.email ?? ""}
                onChangeText={(v) => set("email", v)}
              />
              <Field
                label="Address"
                value={fields.address ?? ""}
                onChangeText={(v) => set("address", v)}
              />
              <Field
                label="Date of Birth"
                value={fields.dateOfBirth ?? ""}
                onChangeText={(v) => set("dateOfBirth", v)}
                placeholder="YYYY-MM-DD"
              />
              <Field
                label="Gender"
                value={fields.gender ?? ""}
                onChangeText={(v) => set("gender", v)}
                placeholder="MALE / FEMALE / OTHER"
              />
            </>
          )}

          {/* ============================================ */}
          {/* SUPPLIERS FORM */}
          {/* ============================================ */}
          {moduleKey === "suppliers" && (
            <>
              <Field
                label="Name"
                value={fields.name ?? ""}
                onChangeText={(v) => set("name", v)}
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
              />
              <Field
                label="Email"
                value={fields.email ?? ""}
                onChangeText={(v) => set("email", v)}
              />
              <Field
                label="Address"
                value={fields.address ?? ""}
                onChangeText={(v) => set("address", v)}
              />
              <Field
                label="Tax Number"
                value={fields.taxNumber ?? ""}
                onChangeText={(v) => set("taxNumber", v)}
              />
              <Field
                label="Payment Terms (days)"
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

              {/* Create Supplier Button */}
              {showCreateSupplier && (
                <View className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-emerald-400">
                    Create New Supplier
                  </Text>
                  <Field
                    label="Supplier Name"
                    value={newSupplier.name}
                    onChangeText={(v) =>
                      setNewSupplier({ ...newSupplier, name: v })
                    }
                  />
                  <Field
                    label="Code"
                    value={newSupplier.code}
                    onChangeText={(v) =>
                      setNewSupplier({ ...newSupplier, code: v })
                    }
                  />
                  <Field
                    label="Contact Person"
                    value={newSupplier.contactName}
                    onChangeText={(v) =>
                      setNewSupplier({ ...newSupplier, contactName: v })
                    }
                  />
                  <Field
                    label="Phone"
                    value={newSupplier.phone}
                    onChangeText={(v) =>
                      setNewSupplier({ ...newSupplier, phone: v })
                    }
                  />
                  <Field
                    label="Email"
                    value={newSupplier.email}
                    onChangeText={(v) =>
                      setNewSupplier({ ...newSupplier, email: v })
                    }
                  />
                  <View className="mt-2 flex-row gap-3">
                    <ActionButton
                      title="Cancel"
                      icon="close"
                      accent="rose"
                      onPress={() => setShowCreateSupplier(false)}
                    />
                    <ActionButton
                      title="Create"
                      icon="add"
                      accent="emerald"
                      onPress={handleCreateSupplier}
                      disabled={isCreatingSupplier}
                    />
                  </View>
                </View>
              )}
              <Pressable
                onPress={() => setShowCreateSupplier(true)}
                className="mb-4 rounded-2xl border border-dashed border-emerald-500/30 p-4"
              >
                <Text className="text-center text-emerald-400">
                  + Create New Supplier
                </Text>
              </Pressable>
            </>
          )}

          {/* ============================================ */}
          {/* SESSIONS - No form needed */}
          {/* ============================================ */}
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
            <ActionButton
              title="Save"
              icon="save"
              accent="emerald"
              onPress={save}
            />
          </View>
          {mode === "edit" && onDelete ? (
            <View className="mt-3">
              <ActionButton
                title="Delete"
                icon="delete"
                accent="rose"
                onPress={onDelete}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        {label}
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
// DEFAULT FIELDS
// ============================================

function getDefaultFields(moduleKey: ModuleKey) {
  if (moduleKey === "staff")
    return {
      username: "",
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
      permissions: [],
      storeId: "",
    };
  if (moduleKey === "products")
    return {
      sku: "",
      barcode: "",
      name: "",
      description: "",
      brand: "",
      costPrice: 0,
      sellingPrice: 0,
      wholesalePrice: 0,
      categoryId: "",
      categoryName: "",
      manufacturingDate: "",
      expiryDate: "",
      supplierId: "",
      initialStock: 0,
      variants: [],
    };
  if (moduleKey === "stores")
    return {
      code: "",
      name: "",
      address: "",
      phone: "",
      email: "",
      taxNumber: "",
    };
  if (moduleKey === "categories")
    return { name: "", slug: "", description: "" };
  if (moduleKey === "customers")
    return {
      name: "",
      phone: "",
      email: "",
      address: "",
      dateOfBirth: "",
      gender: "",
    };
  if (moduleKey === "suppliers")
    return {
      name: "",
      code: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      taxNumber: "",
      paymentTerms: "",
      creditLimit: "",
    };
  return {};
}

// ============================================
// BUILD PAYLOAD
// ============================================

function buildPayload(
  moduleKey: ModuleKey,
  values: Record<string, any>,
  currentStoreId: string | null,
) {
  if (moduleKey === "staff") {
    const payload: any = {
      username: String(values.username ?? "").trim(),
      email: String(values.email ?? "").trim() || undefined,
      name: String(values.name ?? "").trim(),
      role: values.role ?? "CASHIER",
      permissions: Array.isArray(values.permissions) ? values.permissions : [],
      isActive: values.isActive ?? true,
      storeId: values.storeId || currentStoreId || undefined,
    };
    if (values.password && String(values.password).trim()) {
      payload.password = String(values.password).trim();
    }
    return payload;
  }

  if (moduleKey === "products") {
    const payload: any = {
      tenantId: "default",
      sku: String(values.sku ?? "").trim() || undefined,
      barcode: String(values.barcode ?? "").trim() || undefined,
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim() || undefined,
      brand: String(values.brand ?? "").trim() || undefined,
      costPrice: Number(values.costPrice ?? 0),
      sellingPrice: Number(values.sellingPrice ?? 0),
      wholesalePrice: Number(values.wholesalePrice ?? 0),
      categoryId: String(values.categoryId ?? "").trim() || undefined,
      categoryName: String(values.categoryName ?? "").trim() || undefined,
      manufacturingDate:
        String(values.manufacturingDate ?? "").trim() || undefined,
      expiryDate: String(values.expiryDate ?? "").trim() || undefined,
      supplierId: String(values.supplierId ?? "").trim() || undefined,
      storeId: currentStoreId || undefined,
      initialStock: values.initialStock
        ? Number(values.initialStock)
        : undefined,
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) delete payload[key];
    });
    return payload;
  }

  if (moduleKey === "stores") {
    return {
      tenantId: "default",
      code: String(values.code ?? "").trim() || undefined,
      name: String(values.name ?? "").trim(),
      address: String(values.address ?? "").trim() || undefined,
      phone: String(values.phone ?? "").trim() || undefined,
      email: String(values.email ?? "").trim() || undefined,
      taxNumber: String(values.taxNumber ?? "").trim() || undefined,
      isActive: values.isActive ?? true,
    };
  }

  if (moduleKey === "categories") {
    return {
      tenantId: "default",
      name: String(values.name ?? "").trim(),
      slug: String(values.slug ?? "").trim(),
      description: String(values.description ?? "").trim() || undefined,
      storeId: currentStoreId || undefined,
      isActive: values.isActive ?? true,
    };
  }

  if (moduleKey === "customers") {
    return {
      tenantId: "default",
      name: String(values.name ?? "").trim(),
      phone: String(values.phone ?? "").trim() || undefined,
      email: String(values.email ?? "").trim() || undefined,
      address: String(values.address ?? "").trim() || undefined,
      dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
      gender: String(values.gender ?? "").trim() || undefined,
    };
  }

  if (moduleKey === "suppliers") {
    return {
      tenantId: "default",
      name: String(values.name ?? "").trim(),
      code: String(values.code ?? "").trim() || undefined,
      contactName: String(values.contactName ?? "").trim() || undefined,
      phone: String(values.phone ?? "").trim() || undefined,
      email: String(values.email ?? "").trim() || undefined,
      address: String(values.address ?? "").trim() || undefined,
      taxNumber: String(values.taxNumber ?? "").trim() || undefined,
      paymentTerms: values.paymentTerms
        ? Number(values.paymentTerms)
        : undefined,
      creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
      storeId: currentStoreId || undefined,
      isActive: values.isActive ?? true,
    };
  }

  return values;
}

// ============================================
// SESSION MODAL
// ============================================

function SessionModal({
  visible,
  mode,
  activeSession,
  onClose,
  onOpen,
  onCloseSession,
}: {
  visible: boolean;
  mode: "open" | "close" | null;
  activeSession: any;
  onClose: () => void;
  onOpen: (openingBalance: string, notes: string) => Promise<void>;
  onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
}) {
  const [balance, setBalance] = useState("0");
  const [notes, setNotes] = useState("");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
        <Header
          eyebrow="Session"
          title={mode === "open" ? "Open session" : "Close session"}
          subtitle={
            activeSession ? `Active: ${activeSession.id}` : "No active session"
          }
          right={
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          }
        />
        <TextInput
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
          placeholderTextColor="#64748b"
          className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-green-500"
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          placeholderTextColor="#64748b"
          className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-green-500"
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
    </Modal>
  );
}

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
// import { setStore } from "@/services/features/auth/authSlice";
// import { MaterialIcons } from "@expo/vector-icons";
// import { useEffect, useMemo, useState } from "react";
// import {
//   Alert,
//   Modal,
//   Pressable,
//   ScrollView,
//   Text,
//   TextInput,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// // ✅ Use offline-first local APIs
// import {
//   useCreateLocalStaffMutation,
//   useDeleteLocalStaffMutation,
//   useGetLocalStaffQuery,
//   useUpdateLocalStaffMutation,
// } from "@/services/features/offline/localApi";

// import {
//   useCreateLocalProductMutation,
//   useDeleteLocalProductMutation,
//   useGetLocalProductsQuery,
//   useUpdateLocalProductMutation,
// } from "@/services/features/offline/localApi";

// import {
//   useCreateLocalStoreMutation,
//   useDeleteLocalStoreMutation,
//   useGetLocalStoresQuery,
//   useUpdateLocalStoreMutation,
// } from "@/services/features/offline/localApi";

// import {
//   useCreateLocalCategoryMutation,
//   useDeleteLocalCategoryMutation,
//   useGetLocalCategoriesQuery,
//   useUpdateLocalCategoryMutation,
// } from "@/services/features/offline/localApi";

// import {
//   useCreateLocalCustomerMutation,
//   useDeleteLocalCustomerMutation,
//   useGetLocalCustomersQuery,
//   useUpdateLocalCustomerMutation,
// } from "@/services/features/offline/localApi";

// import {
//   useCloseLocalSessionMutation,
//   useGetActiveSessionQuery,
//   useOpenLocalSessionMutation,
// } from "@/services/features/offline/localApi";

// type ModuleKey =
//   | "staff"
//   | "products"
//   | "stores"
//   | "categories"
//   | "customers"
//   | "sessions";

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

//   // ✅ Offline-first queries
//   const { data: staff = [], refetch: refetchStaff } = useGetLocalStaffQuery({
//     storeId: currentStoreId || undefined,
//   });
//   const { data: products = [], refetch: refetchProducts } =
//     useGetLocalProductsQuery({
//       storeId: currentStoreId || undefined,
//     });
//   console.log(products, "list manage ", currentStoreId);
//   const { data: stores = [], refetch: refetchStores } = useGetLocalStoresQuery(
//     {},
//   );
//   const { data: categories = [], refetch: refetchCategories } =
//     useGetLocalCategoriesQuery({
//       storeId: currentStoreId || undefined,
//     });
//   const { data: customers = [], refetch: refetchCustomers } =
//     useGetLocalCustomersQuery({});
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

//   const [openSession] = useOpenLocalSessionMutation();
//   const [closeSession] = useCloseLocalSessionMutation();

//   const refetchers = {
//     staff: refetchStaff,
//     products: refetchProducts,
//     stores: refetchStores,
//     categories: refetchCategories,
//     customers: refetchCustomers,
//     sessions: refetchSession,
//   } as const;

//   const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

//   const storeOptions = useMemo(() => stores, [stores]);

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
//   ];

//   const list = getModuleList({
//     moduleKey,
//     staff,
//     products,
//     stores,
//     categories,
//     customers,
//     activeSession,
//   });

//   const handleSave = async (values: Record<string, any>) => {
//     try {
//       const nextValues = buildPayload(moduleKey, values, currentStoreId);

//       if (moduleKey === "staff") {
//         if (editor.mode === "create") await createStaff(nextValues).unwrap();
//         else
//           await updateStaff({ id: editor.item.id, data: nextValues }).unwrap();
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
//       await refetchers[moduleKey]();
//     } catch (error: any) {
//       Alert.alert(
//         "Delete failed",
//         error?.data?.message || "Unable to delete item.",
//       );
//     }
//   };

//   const openEditor = (mode: "create" | "edit", item?: any) => {
//     setEditor({ open: true, mode, item });
//   };

//   return (
//     <Screen>
//       <SafeAreaView className="flex-1">
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingBottom: 28 }}
//         >
//           <Header
//             eyebrow="Administration"
//             title="Management"
//             subtitle="Manage staff, products, stores, categories, customers, and session control from one place."
//             right={<Pill label={user?.role ?? "USER"} tone="sky" />}
//           />

//           <View className="mb-4 flex-row flex-wrap gap-3">
//             {summary.map((item) => (
//               <View key={item.label} className="w-[48.5%]">
//                 <MetricCard {...item} />
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
//                         active ? "text-sky-900" : "text-slate-900"
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
//             title={`${moduleKey} list`}
//             action="Tap an item to edit"
//           />
//           <Card>
//             {list.length ? (
//               list.map((item: any, index: number) => (
//                 <View key={item.id ? `item-${item.id}` : `idx-${index}`}>
//                   <Pressable onPress={() => openEditor("edit", item)}>
//                     <RowItem
//                       title={item.name || item.username || item.code || item.id}
//                       subtitle={getSubtitle(moduleKey, item)}
//                       right={getRightLabel(moduleKey, item)}
//                       icon={getIcon(moduleKey)}
//                     />
//                   </Pressable>
//                   {index < list.length - 1 ? (
//                     <View className="my-3 h-px bg-white/8" />
//                   ) : null}
//                 </View>
//               ))
//             ) : (
//               <Text className="py-8 text-center text-sm text-slate-400">
//                 No items yet.
//               </Text>
//             )}
//           </Card>
//         </ScrollView>

//         <EditorModal
//           visible={editor.open}
//           title={`${editor.mode === "create" ? "Create" : "Edit"} ${moduleKey}`}
//           moduleKey={moduleKey}
//           item={editor.item}
//           mode={editor.mode}
//           onClose={() => setEditor({ open: false, mode: "create" })}
//           onSave={handleSave}
//           onDelete={editor.item ? () => handleDelete(editor.item) : undefined}
//           currentStoreId={currentStoreId}
//           stores={stores}
//           categories={categories}
//           refetchCategories={refetchCategories}
//         />

//         <SessionModal
//           visible={sessionModal !== null}
//           mode={sessionModal}
//           activeSession={activeSession}
//           onClose={() => setSessionModal(null)}
//           onOpen={async (openingBalance, notes) => {
//             try {
//               await openSession({
//                 userId: user?.id || "",
//                 openingBalance: Number(openingBalance || 0),
//                 notes,
//                 storeId: currentStoreId || undefined,
//               }).unwrap();
//               setSessionModal(null);
//               await refetchSession();
//             } catch (error: any) {
//               Alert.alert(
//                 "Open session failed",
//                 error?.data?.message || "Unable to open session.",
//               );
//             }
//           }}
//           onCloseSession={async (closingBalance, notes) => {
//             try {
//               if (!activeSession) return;
//               await closeSession({
//                 id: activeSession.id,
//                 closingBalance: Number(closingBalance || 0),
//                 expectedBalance: Number(closingBalance || 0),
//                 discrepancy: 0,
//                 notes,
//               }).unwrap();
//               setSessionModal(null);
//               await refetchSession();
//             } catch (error: any) {
//               Alert.alert(
//                 "Close session failed",
//                 error?.data?.message || "Unable to close session.",
//               );
//             }
//           }}
//         />
//       </SafeAreaView>
//     </Screen>
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
//     activeSession,
//   } = input;
//   if (moduleKey === "staff") return staff;
//   if (moduleKey === "products") return products;
//   if (moduleKey === "stores") return stores;
//   if (moduleKey === "categories") return categories;
//   if (moduleKey === "customers") return customers;
//   return activeSession ? [activeSession] : [];
// }

// function getSubtitle(moduleKey: ModuleKey, item: any) {
//   if (moduleKey === "staff")
//     return `${item.role} • ${item.email ?? "no email"}`;
//   if (moduleKey === "products")
//     return `${item.sku || "N/A"} • Cost: $${Number(item.costPrice ?? 0).toFixed(2)}`;
//   if (moduleKey === "stores") return item.address ?? "No address";
//   if (moduleKey === "categories") return item.slug ?? "No slug";
//   if (moduleKey === "customers") return item.phone ?? item.code;
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
//   if (moduleKey === "sessions") return item.status ?? "OPEN";
//   return "";
// }

// function getIcon(moduleKey: ModuleKey) {
//   if (moduleKey === "staff") return "groups";
//   if (moduleKey === "products") return "inventory-2";
//   if (moduleKey === "stores") return "store";
//   if (moduleKey === "categories") return "category";
//   if (moduleKey === "customers") return "person";
//   if (moduleKey === "sessions") return "schedule";
//   return "schedule";
// }

// // ============================================
// // ROLE SELECTOR
// // ============================================

// function RoleSelector({
//   value,
//   onChange,
// }: {
//   value: string;
//   onChange: (role: string) => void;
// }) {
//   const roles = [
//     { label: "Admin", value: "ADMIN" },
//     { label: "Manager", value: "MANAGER" },
//     { label: "Cashier", value: "CASHIER" },
//     { label: "Accountant", value: "ACCOUNTANT" },
//   ];

//   const [showDropdown, setShowDropdown] = useState(false);
//   const selectedRole = roles.find((r) => r.value === value);

//   return (
//     <View className="mb-4">
//       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
//         Role
//       </Text>
//       <Pressable
//         onPress={() => setShowDropdown(!showDropdown)}
//         className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
//       >
//         <View className="flex-row items-center justify-between">
//           <Text
//             className={`text-base ${selectedRole ? "text-white" : "text-slate-400"}`}
//           >
//             {selectedRole ? selectedRole.label : "Select a role..."}
//           </Text>
//           <MaterialIcons
//             name={showDropdown ? "expand-less" : "expand-more"}
//             size={24}
//             color="#64748b"
//           />
//         </View>
//       </Pressable>

//       {showDropdown && (
//         <View className="mt-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
//           <ScrollView className="max-h-48" nestedScrollEnabled>
//             {roles.map((role) => (
//               <Pressable
//                 key={role.value}
//                 onPress={() => {
//                   onChange(role.value);
//                   setShowDropdown(false);
//                 }}
//                 className={`rounded-xl px-4 py-3 ${
//                   value === role.value ? "bg-emerald-500/20" : ""
//                 }`}
//               >
//                 <Text className="text-white">{role.label}</Text>
//                 <Text className="text-xs text-slate-400">
//                   {role.value === "ADMIN" && "Full system access"}
//                   {role.value === "MANAGER" && "Manage store operations"}
//                   {role.value === "CASHIER" && "Process sales and transactions"}
//                   {role.value === "ACCOUNTANT" &&
//                     "Financial and reporting access"}
//                 </Text>
//               </Pressable>
//             ))}
//           </ScrollView>
//         </View>
//       )}
//     </View>
//   );
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

// // ============================================
// // EDITOR MODAL
// // ============================================

// function EditorModal({
//   visible,
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
//   refetchCategories,
// }: {
//   visible: boolean;
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
//   refetchCategories: () => void;
// }) {
//   const [fields, setFields] = useState<Record<string, any>>({});
//   const [showCreateCategory, setShowCreateCategory] = useState(false);
//   const [newCategory, setNewCategory] = useState({
//     name: "",
//     slug: "",
//     description: "",
//   });
//   const [isCreatingCategory, setIsCreatingCategory] = useState(false);

//   const [createCategory] = useCreateLocalCategoryMutation();

//   useEffect(() => {
//     if (visible) {
//       setFields(item ? { ...item } : getDefaultFields(moduleKey));
//       setShowCreateCategory(false);
//       setNewCategory({ name: "", slug: "", description: "" });
//     }
//   }, [visible, item, moduleKey]);

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
//         tenantId: "default", // TODO: Get from context
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
//       set("categoryId", result.id);
//       set("categoryName", result.name);

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

//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
//         <Header
//           eyebrow="Editor"
//           title={title}
//           subtitle="Create or update records offline first."
//           right={
//             <Pressable onPress={onClose}>
//               <MaterialIcons name="close" size={24} color="#fff" />
//             </Pressable>
//           }
//         />
//         <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
//           {moduleKey === "staff" && (
//             <>
//               <Field
//                 label="Username"
//                 value={fields.username ?? ""}
//                 onChangeText={(v) => set("username", v)}
//               />
//               <Field
//                 label="Name"
//                 value={fields.name ?? ""}
//                 onChangeText={(v) => set("name", v)}
//               />
//               <Field
//                 label="Email"
//                 value={fields.email ?? ""}
//                 onChangeText={(v) => set("email", v)}
//               />
//               {mode === "create" && (
//                 <Field
//                   label="Password"
//                   value={fields.password ?? ""}
//                   onChangeText={(v) => set("password", v)}
//                   secureTextEntry
//                 />
//               )}
//               <RoleSelector
//                 value={fields.role ?? "CASHIER"}
//                 onChange={(role) => {
//                   set("role", role);
//                   set("permissions", getDefaultPermissions(role));
//                 }}
//               />
//             </>
//           )}

//           {moduleKey === "products" && (
//             <>
//               <Field
//                 label="Name"
//                 value={fields.name ?? ""}
//                 onChangeText={(v) => set("name", v)}
//               />
//               <Field
//                 label="SKU"
//                 value={fields.sku ?? ""}
//                 onChangeText={(v) => set("sku", v)}
//               />
//               <Field
//                 label="Barcode"
//                 value={fields.barcode ?? ""}
//                 onChangeText={(v) => set("barcode", v)}
//               />
//               <Field
//                 label="Description"
//                 value={fields.description ?? ""}
//                 onChangeText={(v) => set("description", v)}
//                 multiline
//               />
//               <Field
//                 label="Brand"
//                 value={fields.brand ?? ""}
//                 onChangeText={(v) => set("brand", v)}
//               />
//               <Field
//                 label="Cost Price"
//                 value={fields.costPrice?.toString() ?? ""}
//                 onChangeText={(v) => {
//                   const num = parseFloat(v);
//                   set("costPrice", isNaN(num) ? 0 : num);
//                 }}
//                 keyboardType="decimal-pad"
//               />
//               <Field
//                 label="Selling Price"
//                 value={fields.sellingPrice?.toString() ?? ""}
//                 onChangeText={(v) => {
//                   const num = parseFloat(v);
//                   set("sellingPrice", isNaN(num) ? 0 : num);
//                 }}
//                 keyboardType="decimal-pad"
//               />
//               <Field
//                 label="Wholesale Price"
//                 value={fields.wholesalePrice?.toString() ?? ""}
//                 onChangeText={(v) => {
//                   const num = parseFloat(v);
//                   set("wholesalePrice", isNaN(num) ? 0 : num);
//                 }}
//                 keyboardType="decimal-pad"
//               />
//               <Field
//                 label="Initial Stock"
//                 value={fields.initialStock?.toString() ?? ""}
//                 onChangeText={(v) => {
//                   const num = parseInt(v, 10);
//                   set("initialStock", isNaN(num) ? 0 : num);
//                 }}
//                 keyboardType="numeric"
//               />
//               <Field
//                 label="Manufacturing Date"
//                 value={fields.manufacturingDate ?? ""}
//                 onChangeText={(v) => set("manufacturingDate", v)}
//                 placeholder="YYYY-MM-DD"
//               />
//               <Field
//                 label="Expiry Date"
//                 value={fields.expiryDate ?? ""}
//                 onChangeText={(v) => set("expiryDate", v)}
//                 placeholder="YYYY-MM-DD"
//               />
//               <Field
//                 label="Supplier ID"
//                 value={fields.supplierId ?? ""}
//                 onChangeText={(v) => set("supplierId", v)}
//               />
//               <Field
//                 label="Category ID"
//                 value={fields.categoryId ?? ""}
//                 onChangeText={(v) => set("categoryId", v)}
//               />
//               <Field
//                 label="Category Name"
//                 value={fields.categoryName ?? ""}
//                 onChangeText={(v) => set("categoryName", v)}
//               />
//               {showCreateCategory && (
//                 <View className="mb-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
//                   <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-sky-400">
//                     Create New Category
//                   </Text>
//                   <Field
//                     label="Category Name"
//                     value={newCategory.name}
//                     onChangeText={(v) => {
//                       setNewCategory({ ...newCategory, name: v });
//                       if (!newCategory.slug) {
//                         const slug = v.toLowerCase().replace(/\s+/g, "-");
//                         setNewCategory((prev) => ({ ...prev, slug }));
//                       }
//                     }}
//                   />
//                   <Field
//                     label="Slug (URL friendly)"
//                     value={newCategory.slug}
//                     onChangeText={(v) =>
//                       setNewCategory({ ...newCategory, slug: v })
//                     }
//                   />
//                   <Field
//                     label="Description"
//                     value={newCategory.description}
//                     onChangeText={(v) =>
//                       setNewCategory({ ...newCategory, description: v })
//                     }
//                   />
//                   <View className="mt-2 flex-row gap-3">
//                     <ActionButton
//                       title="Cancel"
//                       icon="close"
//                       accent="rose"
//                       onPress={() => setShowCreateCategory(false)}
//                     />
//                     <ActionButton
//                       title="Create"
//                       icon="add"
//                       accent="emerald"
//                       onPress={handleCreateCategory}
//                       disabled={isCreatingCategory}
//                     />
//                   </View>
//                 </View>
//               )}
//               <Pressable
//                 onPress={() => setShowCreateCategory(true)}
//                 className="mb-4 rounded-2xl border border-dashed border-sky-500/30 p-4"
//               >
//                 <Text className="text-center text-sky-400">
//                   + Create New Category
//                 </Text>
//               </Pressable>
//             </>
//           )}

//           {moduleKey === "stores" && (
//             <>
//               <Field
//                 label="Code"
//                 value={fields.code ?? ""}
//                 onChangeText={(v) => set("code", v)}
//               />
//               <Field
//                 label="Name"
//                 value={fields.name ?? ""}
//                 onChangeText={(v) => set("name", v)}
//               />
//               <Field
//                 label="Address"
//                 value={fields.address ?? ""}
//                 onChangeText={(v) => set("address", v)}
//               />
//               <Field
//                 label="Phone"
//                 value={fields.phone ?? ""}
//                 onChangeText={(v) => set("phone", v)}
//               />
//               <Field
//                 label="Email"
//                 value={fields.email ?? ""}
//                 onChangeText={(v) => set("email", v)}
//               />
//             </>
//           )}

//           {moduleKey === "categories" && (
//             <>
//               <Field
//                 label="Name"
//                 value={fields.name ?? ""}
//                 onChangeText={(v) => set("name", v)}
//               />
//               <Field
//                 label="Slug"
//                 value={fields.slug ?? ""}
//                 onChangeText={(v) => set("slug", v)}
//               />
//               <Field
//                 label="Description"
//                 value={fields.description ?? ""}
//                 onChangeText={(v) => set("description", v)}
//               />
//             </>
//           )}

//           {moduleKey === "customers" && (
//             <>
//               <Field
//                 label="Name"
//                 value={fields.name ?? ""}
//                 onChangeText={(v) => set("name", v)}
//               />
//               <Field
//                 label="Phone"
//                 value={fields.phone ?? ""}
//                 onChangeText={(v) => set("phone", v)}
//               />
//               <Field
//                 label="Email"
//                 value={fields.email ?? ""}
//                 onChangeText={(v) => set("email", v)}
//               />
//               <Field
//                 label="Address"
//                 value={fields.address ?? ""}
//                 onChangeText={(v) => set("address", v)}
//               />
//             </>
//           )}

//           <View className="mt-4 flex-row gap-3">
//             <ActionButton
//               title="Cancel"
//               icon="close"
//               accent="rose"
//               onPress={onClose}
//             />
//             <ActionButton
//               title="Save"
//               icon="save"
//               accent="emerald"
//               onPress={save}
//             />
//           </View>
//           {mode === "edit" && onDelete ? (
//             <View className="mt-3">
//               <ActionButton
//                 title="Delete"
//                 icon="delete"
//                 accent="rose"
//                 onPress={onDelete}
//               />
//             </View>
//           ) : null}
//         </ScrollView>
//       </SafeAreaView>
//     </Modal>
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
// }) {
//   return (
//     <View className="mb-4">
//       <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
//         {label}
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
// // DEFAULT FIELDS
// // ============================================

// function getDefaultFields(moduleKey: ModuleKey) {
//   if (moduleKey === "staff")
//     return {
//       username: "",
//       name: "",
//       email: "",
//       password: "",
//       role: "CASHIER",
//       permissions: [],
//     };
//   if (moduleKey === "products")
//     return {
//       sku: "",
//       barcode: "",
//       name: "",
//       description: "",
//       brand: "",
//       costPrice: 0,
//       sellingPrice: 0,
//       wholesalePrice: 0,
//       categoryId: "",
//       categoryName: "",
//       manufacturingDate: "",
//       expiryDate: "",
//       supplierId: "",
//       initialStock: 0,
//       variants: [],
//     };
//   if (moduleKey === "stores")
//     return { code: "", name: "", address: "", phone: "", email: "" };
//   if (moduleKey === "categories")
//     return { name: "", slug: "", description: "" };
//   if (moduleKey === "customers")
//     return { name: "", phone: "", email: "", address: "" };
//   return {};
// }

// // ============================================
// // BUILD PAYLOAD
// // ============================================

// function buildPayload(
//   moduleKey: ModuleKey,
//   values: Record<string, any>,
//   currentStoreId: string | null,
// ) {
//   if (moduleKey === "staff") {
//     const payload: any = {
//       username: String(values.username ?? "").trim(),
//       email: String(values.email ?? "").trim() || undefined,
//       name: String(values.name ?? "").trim(),
//       role: values.role ?? "CASHIER",
//       permissions: Array.isArray(values.permissions) ? values.permissions : [],
//       isActive: values.isActive ?? true,
//       storeId: currentStoreId || undefined,
//     };
//     if (values.password && String(values.password).trim()) {
//       payload.password = String(values.password).trim();
//     }
//     return payload;
//   }

//   if (moduleKey === "products") {
//     const payload: any = {
//       tenantId: "default",
//       sku: String(values.sku ?? "").trim() || undefined,
//       barcode: String(values.barcode ?? "").trim() || undefined,
//       name: String(values.name ?? "").trim(),
//       description: String(values.description ?? "").trim() || undefined,
//       brand: String(values.brand ?? "").trim() || undefined,
//       costPrice: Number(values.costPrice ?? 0),
//       sellingPrice: Number(values.sellingPrice ?? 0),
//       wholesalePrice: Number(values.wholesalePrice ?? 0),
//       categoryId: String(values.categoryId ?? "").trim() || undefined,
//       categoryName: String(values.categoryName ?? "").trim() || undefined,
//       manufacturingDate:
//         String(values.manufacturingDate ?? "").trim() || undefined,
//       expiryDate: String(values.expiryDate ?? "").trim() || undefined,
//       supplierId: String(values.supplierId ?? "").trim() || undefined,
//       storeId: currentStoreId || undefined,
//       initialStock: values.initialStock
//         ? Number(values.initialStock)
//         : undefined,
//     };
//     Object.keys(payload).forEach((key) => {
//       if (payload[key] === undefined) delete payload[key];
//     });
//     return payload;
//   }

//   if (moduleKey === "stores") {
//     return {
//       tenantId: "default",
//       code: String(values.code ?? "").trim() || undefined,
//       name: String(values.name ?? "").trim(),
//       address: String(values.address ?? "").trim() || undefined,
//       phone: String(values.phone ?? "").trim() || undefined,
//       email: String(values.email ?? "").trim() || undefined,
//       taxNumber: String(values.taxNumber ?? "").trim() || undefined,
//       isActive: values.isActive ?? true,
//     };
//   }

//   if (moduleKey === "categories") {
//     return {
//       tenantId: "default",
//       name: String(values.name ?? "").trim(),
//       slug: String(values.slug ?? "").trim(),
//       description: String(values.description ?? "").trim() || undefined,
//       storeId: currentStoreId || undefined,
//       isActive: values.isActive ?? true,
//     };
//   }

//   if (moduleKey === "customers") {
//     return {
//       tenantId: "default",
//       name: String(values.name ?? "").trim(),
//       phone: String(values.phone ?? "").trim() || undefined,
//       email: String(values.email ?? "").trim() || undefined,
//       address: String(values.address ?? "").trim() || undefined,
//     };
//   }

//   return values;
// }

// // ============================================
// // SESSION MODAL
// // ============================================

// function SessionModal({
//   visible,
//   mode,
//   activeSession,
//   onClose,
//   onOpen,
//   onCloseSession,
// }: {
//   visible: boolean;
//   mode: "open" | "close" | null;
//   activeSession: any;
//   onClose: () => void;
//   onOpen: (openingBalance: string, notes: string) => Promise<void>;
//   onCloseSession: (closingBalance: string, notes: string) => Promise<void>;
// }) {
//   const [balance, setBalance] = useState("0");
//   const [notes, setNotes] = useState("");

//   return (
//     <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
//       <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
//         <Header
//           eyebrow="Session"
//           title={mode === "open" ? "Open session" : "Close session"}
//           subtitle={
//             activeSession ? `Active: ${activeSession.id}` : "No active session"
//           }
//           right={
//             <Pressable onPress={onClose}>
//               <MaterialIcons name="close" size={24} color="#fff" />
//             </Pressable>
//           }
//         />
//         <TextInput
//           value={balance}
//           onChangeText={setBalance}
//           keyboardType="decimal-pad"
//           placeholder={mode === "open" ? "Opening balance" : "Closing balance"}
//           placeholderTextColor="#64748b"
//           className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-green-500"
//         />
//         <TextInput
//           value={notes}
//           onChangeText={setNotes}
//           placeholder="Notes"
//           placeholderTextColor="#64748b"
//           className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-green-500"
//         />
//         <View className="flex-row gap-3">
//           <ActionButton
//             title="Cancel"
//             icon="close"
//             accent="rose"
//             onPress={onClose}
//           />
//           <ActionButton
//             title={mode === "open" ? "Open" : "Close"}
//             icon="schedule"
//             accent="emerald"
//             onPress={async () => {
//               if (mode === "open") await onOpen(balance, notes);
//               else await onCloseSession(balance, notes);
//             }}
//           />
//         </View>
//       </SafeAreaView>
//     </Modal>
//   );
// }
