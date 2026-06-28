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
import { MaterialIcons } from "@expo/vector-icons";
import {
  Screen,
  Header,
  Card,
  Pill,
  RowItem,
  SectionTitle,
  ActionButton,
  MetricCard,
} from "@/components/app-ui";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import {
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} from "@/services/features/staff/staffApi";
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "@/services/features/products/productApi";
import {
  useGetStoresQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
} from "@/services/features/stores/storeApi";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/services/features/categories/categoryApi";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "@/services/features/suppliers/supplierApi";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from "@/services/features/customers/customerApi";
import {
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useCloseSessionMutation,
} from "@/services/features/sessions/sessionApi";
import { setStore } from "@/services/features/auth/authSlice";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";

type ModuleKey =
  | "staff"
  | "products"
  | "stores"
  | "categories"
  | "suppliers"
  | "customers"
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

  const { data: staff = [], refetch: refetchStaff } = useGetStaffQuery(
    currentStoreId || undefined,
  );
  const { data: products = [], refetch: refetchProducts } = useGetProductsQuery(
    currentStoreId || undefined,
  );
  const { data: stores = [], refetch: refetchStores } = useGetStoresQuery();
  const { data: categories = [], refetch: refetchCategories } =
    useGetCategoriesQuery(currentStoreId || undefined);
  // const { data: categories = [], refetch: refetchCategories } =
  //   useGetCategoriesQuery(currentStoreId || undefined);

  const { data: suppliers = [], refetch: refetchSuppliers } =
    useGetSuppliersQuery(currentStoreId || undefined);
  const { data: customers = [], refetch: refetchCustomers } =
    useGetCustomersQuery();
  const { data: activeSession, refetch: refetchSession } =
    useGetActiveSessionQuery(
      { userId: user?.id || "", storeId: currentStoreId || undefined },
      { skip: !user?.id },
    );
  console.log("categories", categories);

  const [createStaff] = useCreateStaffMutation();
  const [updateStaff] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [createStore] = useCreateStoreMutation();
  const [updateStore] = useUpdateStoreMutation();
  const [deleteStore] = useDeleteStoreMutation();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [openSession] = useOpenSessionMutation();
  const [closeSession] = useCloseSessionMutation();
  const refetchers = {
    staff: refetchStaff,
    products: refetchProducts,
    stores: refetchStores,
    categories: refetchCategories,
    suppliers: refetchSuppliers,
    customers: refetchCustomers,
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
    suppliers,
    customers,
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
          await updateProduct({
            id: editor.item.id,
            data: nextValues,
          }).unwrap();
      } else if (moduleKey === "stores") {
        if (editor.mode === "create") await createStore(nextValues).unwrap();
        else
          await updateStore({ id: editor.item.id, data: nextValues }).unwrap();
      } else if (moduleKey === "categories") {
        if (editor.mode === "create") await createCategory(nextValues).unwrap();
        else
          await updateCategory({
            id: editor.item.id,
            data: nextValues,
          }).unwrap();
      } else if (moduleKey === "suppliers") {
        if (editor.mode === "create") await createSupplier(nextValues).unwrap();
        else
          await updateSupplier({
            id: editor.item.id,
            data: nextValues,
          }).unwrap();
      } else if (moduleKey === "customers") {
        if (editor.mode === "create") await createCustomer(nextValues).unwrap();
        else
          await updateCustomer({
            id: editor.item.id,
            data: nextValues,
          }).unwrap();
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
      else if (moduleKey === "suppliers")
        await deleteSupplier(item.id).unwrap();
      else if (moduleKey === "customers")
        await deleteCustomer(item.id).unwrap();
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
            subtitle="Manage staff, products, stores, categories, suppliers, customers, and session control from one place."
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
              {storeOptions.map((store) => {
                const active = store.id === currentStoreId;
                return (
                  <Pressable
                    key={store.id}
                    onPress={() => dispatch(setStore(store.id))}
                    className={`rounded-full border px-4 py-3 ${active ? "border-sky-400/30 bg-sky-500/15" : "border-white/10 bg-white/5"}`}
                  >
                    <Text
                      className={`text-xs font-bold uppercase tracking-[2px] ${active ? "text-sky-200" : "text-slate-300"}`}
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
                "suppliers",
                "customers",
                "sessions",
              ] as ModuleKey[]
            ).map((key) => (
              <Pressable
                key={key}
                onPress={() => setModuleKey(key)}
                className={`rounded-full border px-4 py-3 ${moduleKey === key ? "border-emerald-400/30 bg-emerald-500/15" : "border-white/10 bg-white/5"}`}
              >
                <Text
                  className={`text-xs font-bold uppercase tracking-[2px] ${moduleKey === key ? "text-emerald-200" : "text-slate-300"}`}
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
          refetchCategories={refetchCategories}
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
                data: { closingBalance: Number(closingBalance || 0), notes },
              }).unwrap();
              setSessionModal(null);
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

function getModuleList(input: any) {
  const {
    moduleKey,
    staff,
    products,
    stores,
    categories,
    suppliers,
    customers,
    activeSession,
  } = input;
  if (moduleKey === "staff") return staff;
  if (moduleKey === "products") return products;
  if (moduleKey === "stores") return stores;
  if (moduleKey === "categories") return categories;
  if (moduleKey === "suppliers") return suppliers;
  if (moduleKey === "customers") return customers;
  return activeSession ? [activeSession] : [];
}

function getSubtitle(moduleKey: ModuleKey, item: any) {
  if (moduleKey === "staff")
    return `${item.role} • ${item.email ?? "no email"}`;
  if (moduleKey === "products")
    return `${item.sku} • Stock ${item.stockQuantity}`;
  if (moduleKey === "stores") return item.address ?? "No address";
  if (moduleKey === "categories") return item.slug;
  if (moduleKey === "suppliers")
    return item.phone ?? item.email ?? "No contact";
  if (moduleKey === "customers") return item.phone ?? item.code;
  return `${item.status} • ${item.openedAt ?? ""}`;
}

function getRightLabel(moduleKey: ModuleKey, item: any) {
  if (moduleKey === "staff") return item.isActive ? "Active" : "Inactive";
  if (moduleKey === "products")
    return `$${Number(item.sellingPrice ?? 0).toFixed(2)}`;
  if (moduleKey === "stores") return item.isActive ? "Open" : "Closed";
  if (moduleKey === "categories") return item.isActive ? "Live" : "Off";
  if (moduleKey === "suppliers")
    return item.currentBalance
      ? `$${Number(item.currentBalance).toFixed(2)}`
      : "0";
  if (moduleKey === "customers") return item.tier ?? "BRONZE";
  return item.status ?? "OPEN";
}

function getIcon(moduleKey: ModuleKey) {
  if (moduleKey === "staff") return "groups";
  if (moduleKey === "products") return "inventory-2";
  if (moduleKey === "stores") return "store";
  if (moduleKey === "categories") return "category";
  if (moduleKey === "suppliers") return "local-shipping";
  if (moduleKey === "customers") return "person";
  return "schedule";
}

// Role Selector Component
function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (role: string) => void;
}) {
  const roles = [
    { label: "Admin", value: "ADMIN" },
    { label: "Manager", value: "MANAGER" },
    { label: "Cashier", value: "CASHIER" },
    { label: "Accountant", value: "ACCOUNTANT" },
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
          <ScrollView
            className="max-h-48"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
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
                  {role.value === "ADMIN" && "Full system access"}
                  {role.value === "MANAGER" && "Manage store operations"}
                  {role.value === "CASHIER" && "Process sales and transactions"}
                  {role.value === "ACCOUNTANT" &&
                    "Financial and reporting access"}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Permission Toggles Component
function PermissionToggles({
  value,
  onChange,
}: {
  value: string[];
  onChange: (permissions: string[]) => void;
}) {
  const availablePermissions = [
    "VIEW_REPORTS",
    "EDIT_PRICES",
    "MANAGE_STAFF",
    "MANAGE_PRODUCTS",
    "VIEW_SALES",
    "MANAGE_CUSTOMERS",
    "EDIT_INVENTORY",
  ];

  const togglePermission = (permission: string) => {
    if (value.includes(permission)) {
      onChange(value.filter((p) => p !== permission));
    } else {
      onChange([...value, permission]);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {availablePermissions.map((permission) => {
        const isActive = value.includes(permission);
        return (
          <Pressable
            key={permission}
            onPress={() => togglePermission(permission)}
            className={`rounded-full border px-3 py-2 ${
              isActive
                ? "border-emerald-400/30 bg-emerald-500/20"
                : "border-white/10 bg-white/5"
            }`}
          >
            <Text
              className={`text-xs font-bold uppercase tracking-[1px] ${
                isActive ? "text-emerald-200" : "text-slate-400"
              }`}
            >
              {permission.replace("_", " ")}
            </Text>
          </Pressable>
        );
      })}
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

// Category Selector Component
function CategorySelector({
  value,
  onChange,
  categories,
  onAddCategory,
}: {
  value: string;
  onChange: (categoryName: string) => void;
  categories: any[];
  onAddCategory: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [categories, searchText]);

  const selectedCategory = categories.find((cat) => cat.name === value);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
        Category
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
            placeholder="Search or create category..."
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
                    onChange(item.name);
                    setShowDropdown(false);
                    setSearchText("");
                  }}
                  className={`rounded-xl px-4 py-3 ${
                    value === item.name ? "bg-emerald-500/20" : ""
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
  refetchCategories,
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
  refetchCategories: () => void;
}) {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [createCategory] = useCreateCategoryMutation();

  useEffect(() => {
    if (visible) {
      setFields(item ? { ...item } : getDefaultFields(moduleKey));
      setShowCreateCategory(false);
      setNewCategory({ name: "", slug: "", description: "" });
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
        name: newCategory.name.trim(),
        slug:
          newCategory.slug.trim() ||
          newCategory.name.trim().toLowerCase().replace(/\s+/g, "-"),
        description: newCategory.description.trim() || undefined,
        storeId: currentStoreId!,
        isActive: true,
      };
      console.log("payload for category", payload);

      const result = await createCategory(payload).unwrap();
      console.log("result for category", result);

      // Refresh categories and wait for it to complete
      await refetchCategories();

      // Set the category in product form
      set("categoryName", result.name);

      // Close category modal
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

              <RoleSelector
                value={fields.role ?? "CASHIER"}
                onChange={(role) => {
                  set("role", role);
                  // Auto-set permissions based on role
                  set("permissions", getDefaultPermissions(role));
                }}
              />

              <View className="mb-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-slate-400">
                  Permissions
                </Text>
                <PermissionToggles
                  value={fields.permissions ?? []}
                  onChange={(permissions) => set("permissions", permissions)}
                />
              </View>
            </>
          )}

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
              <Field
                label="Supplier ID"
                value={fields.supplierId ?? ""}
                onChangeText={(v) => set("supplierId", v)}
              />
              <Field
                label="Category ID"
                value={fields.categoryId ?? ""}
                onChangeText={(v) => set("categoryId", v)}
              />

              <CategorySelector
                value={fields.categoryName ?? ""}
                onChange={(categoryName) => set("categoryName", categoryName)}
                categories={categories}
                onAddCategory={() => setShowCreateCategory(true)}
              />
            </>
          )}

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
            </>
          )}

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

          {moduleKey === "suppliers" && (
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
                label="Contact"
                value={fields.contactName ?? ""}
                onChangeText={(v) => set("contactName", v)}
              />
              <Field
                label="Phone"
                value={fields.phone ?? ""}
                onChangeText={(v) => set("phone", v)}
              />
            </>
          )}

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
            </>
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

      {/* Create Category Modal */}
      <Modal
        visible={showCreateCategory}
        animationType="slide"
        onRequestClose={() => setShowCreateCategory(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-950 px-4 pt-4">
          <Header
            eyebrow="Categories"
            title="Create New Category"
            subtitle="Add a category to organize your products"
            right={
              <Pressable onPress={() => setShowCreateCategory(false)}>
                <MaterialIcons name="close" size={24} color="#fff" />
              </Pressable>
            }
          />
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
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
              onChangeText={(v) => setNewCategory({ ...newCategory, slug: v })}
            />
            <Field
              label="Description"
              value={newCategory.description}
              onChangeText={(v) =>
                setNewCategory({ ...newCategory, description: v })
              }
            />

            <View className="mt-4 flex-row gap-3">
              <ActionButton
                title="Cancel"
                icon="close"
                accent="rose"
                onPress={() => setShowCreateCategory(false)}
              />
              <ActionButton
                title="Create Category"
                icon="add"
                accent="emerald"
                onPress={handleCreateCategory}

                // disabled={isCreatingCategory}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

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

function getDefaultFields(moduleKey: ModuleKey) {
  if (moduleKey === "staff")
    return {
      username: "",
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
      permissions: [],
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
    return { code: "", name: "", address: "", phone: "" };
  if (moduleKey === "categories")
    return { name: "", slug: "", description: "" };
  if (moduleKey === "suppliers")
    return { code: "", name: "", contactName: "", phone: "" };
  if (moduleKey === "customers")
    return { name: "", phone: "", email: "", address: "" };
  return {};
}

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
      storeId: currentStoreId || undefined,
    };

    // Only include password if it's provided (for creation)
    if (values.password && String(values.password).trim()) {
      payload.password = String(values.password).trim();
    }

    return payload;
  }

  if (moduleKey === "products") {
    const payload: any = {
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
      variants: Array.isArray(values.variants) ? values.variants : [],
    };

    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return payload;
  }

  if (moduleKey === "stores") {
    return {
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
      name: String(values.name ?? "").trim(),
      slug: String(values.slug ?? "").trim(),
      description: String(values.description ?? "").trim() || undefined,
      parentId: String(values.parentId ?? "").trim() || undefined,
      sortOrder: Number(values.sortOrder ?? 0),
      isActive: values.isActive ?? true,
      storeId: currentStoreId || undefined,
    };
  }

  if (moduleKey === "suppliers") {
    return {
      code: String(values.code ?? "").trim() || undefined,
      name: String(values.name ?? "").trim(),
      contactName: String(values.contactName ?? "").trim() || undefined,
      phone: String(values.phone ?? "").trim() || undefined,
      email: String(values.email ?? "").trim() || undefined,
      address: String(values.address ?? "").trim() || undefined,
      taxId: String(values.taxId ?? "").trim() || undefined,
      paymentTerms: values.paymentTerms
        ? Number(values.paymentTerms)
        : undefined,
      creditLimit: values.creditLimit ? Number(values.creditLimit) : undefined,
      isActive: values.isActive ?? true,
      storeId: currentStoreId || undefined,
    };
  }

  if (moduleKey === "customers") {
    return {
      name: String(values.name ?? "").trim(),
      phone: String(values.phone ?? "").trim() || undefined,
      email: String(values.email ?? "").trim() || undefined,
      address: String(values.address ?? "").trim() || undefined,
      dateOfBirth: String(values.dateOfBirth ?? "").trim() || undefined,
      gender: String(values.gender ?? "").trim() || undefined,
    };
  }

  return values;
}

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
          className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          placeholderTextColor="#64748b"
          className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
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
