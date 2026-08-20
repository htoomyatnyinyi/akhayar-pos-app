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
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { setStore } from "@/services/features/auth/authSlice";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";

// Offline-first local APIs
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
  useGetLocalBrandsQuery,
  useGetLocalCategoriesQuery,
  useGetLocalCustomersQuery,
  useGetLocalProductsQuery,
  useGetLocalVariantsQuery,
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
  useGetLocalSessionsQuery,
  useGetLocalOrdersQuery,
} from "@/services/features/offline/localApi";

// Import our extracted components and utilities
import EmptyState from "@/components/manage/EmptyState";
import SessionModal from "@/components/manage/SessionModal";
import EditorModal from "@/components/manage/EditorModal";
import {
  ModuleKey,
  getModuleList,
  getSubtitle,
  getRightLabel,
  getIcon,
} from "@/utils/manage/helpers";
import { buildPayload } from "@/utils/manage/buildPayload";

export default function ManageScreen() {
  const dispatch = useAppDispatch();
  const { user, currentStoreId } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "ADMIN";
  const [moduleKey, setModuleKey] = useState<ModuleKey>("products");
  const [editor, setEditor] = useState<{
    open: boolean;
    mode: "create" | "edit";
    item?: any;
  }>({ open: false, mode: "create" });

  const [sessionModal, setSessionModal] = useState<"open" | "close" | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);

  // Store-scoped filter for non-admin users
  const scopedStoreId = isAdmin ? undefined : currentStoreId || undefined;

  // Queries with store scoping
  const {
    data: stores = [],
    refetch: refetchStores,
    isFetching: fetchingStores,
  } = useGetLocalStoresQuery({});
  const {
    data: customers = [],
    refetch: refetchCustomers,
    isFetching: fetchingCustomers,
  } = useGetLocalCustomersQuery({ storeId: scopedStoreId });
  const {
    data: brands = [],
    refetch: refetchBrands,
    isFetching: fetchingBrands,
  } = useGetLocalBrandsQuery({
    storeId: scopedStoreId,
    isActive: true,
  });
  const {
    data: sessions = [],
    refetch: refetchSessions,
    isFetching: fetchingSessions,
  } = useGetLocalSessionsQuery({ storeId: scopedStoreId });
  const {
    data: orders = [],
    refetch: refetchOrders,
    isFetching: fetchingOrders,
  } = useGetLocalOrdersQuery({ storeId: scopedStoreId });
  const {
    data: staff = [],
    refetch: refetchStaff,
    isFetching: fetchingStaff,
  } = useGetLocalStaffQuery({
    storeId: scopedStoreId,
  });
  const {
    data: products = [],
    refetch: refetchProducts,
    isFetching: fetchingProducts,
  } = useGetLocalProductsQuery({ storeId: scopedStoreId });
  const { data: variants = [] } = useGetLocalVariantsQuery(undefined);
  const {
    data: categories = [],
    refetch: refetchCategories,
    isFetching: fetchingCategories,
  } = useGetLocalCategoriesQuery({ storeId: scopedStoreId });
  const {
    data: suppliers = [],
    refetch: refetchSuppliers,
    isFetching: fetchingSuppliers,
  } = useGetLocalSuppliersQuery({ storeId: scopedStoreId });

  // Mutations
  const [createStaff, { isLoading: creatingStaff }] =
    useCreateLocalStaffMutation();
  const [updateStaff, { isLoading: updatingStaff }] =
    useUpdateLocalStaffMutation();
  const [deleteStaff, { isLoading: deletingStaff }] =
    useDeleteLocalStaffMutation();

  const [createProduct, { isLoading: creatingProduct }] =
    useCreateLocalProductMutation();
  const [updateProduct, { isLoading: updatingProduct }] =
    useUpdateLocalProductMutation();
  const [deleteProduct, { isLoading: deletingProduct }] =
    useDeleteLocalProductMutation();

  const [createStore, { isLoading: creatingStore }] =
    useCreateLocalStoreMutation();
  const [updateStore, { isLoading: updatingStore }] =
    useUpdateLocalStoreMutation();
  const [deleteStore, { isLoading: deletingStore }] =
    useDeleteLocalStoreMutation();

  const [createCategory, { isLoading: creatingCategory }] =
    useCreateLocalCategoryMutation();
  const [updateCategory, { isLoading: updatingCategory }] =
    useUpdateLocalCategoryMutation();
  const [deleteCategory, { isLoading: deletingCategory }] =
    useDeleteLocalCategoryMutation();

  const [createCustomer, { isLoading: creatingCustomer }] =
    useCreateLocalCustomerMutation();
  const [updateCustomer, { isLoading: updatingCustomer }] =
    useUpdateLocalCustomerMutation();
  const [deleteCustomer, { isLoading: deletingCustomer }] =
    useDeleteLocalCustomerMutation();

  const [createSupplier, { isLoading: creatingSupplier }] =
    useCreateLocalSupplierMutation();
  const [updateSupplier, { isLoading: updatingSupplier }] =
    useUpdateLocalSupplierMutation();
  const [deleteSupplier, { isLoading: deletingSupplier }] =
    useDeleteLocalSupplierMutation();

  const [createBrand, { isLoading: creatingBrand }] =
    useCreateLocalBrandMutation();
  const [updateBrand, { isLoading: updatingBrand }] =
    useUpdateLocalBrandMutation();
  const [deleteBrand, { isLoading: deletingBrand }] =
    useDeleteLocalBrandMutation();

  const [openSession, { isLoading: openingSession }] =
    useOpenLocalSessionMutation();
  const [closeSession, { isLoading: closingSession }] =
    useCloseLocalSessionMutation();

  const refetchers = {
    staff: refetchStaff,
    products: refetchProducts,
    stores: refetchStores,
    categories: refetchCategories,
    customers: refetchCustomers,
    suppliers: refetchSuppliers,
    brands: refetchBrands,
    sessions: () => {
      refetchSessions();
      refetchOrders();
    },
  } as const;

  const isPrivileged = user?.role === "ADMIN" || user?.role === "MANAGER";

  const storeOptions = useMemo(
    () =>
      isAdmin
        ? stores
        : stores.filter((store: any) =>
            user?.stores?.some((assigned: any) => assigned.id === store.id),
          ),
    [isAdmin, stores, user?.stores],
  );

  const activeSession = sessions.find((s: any) => s.status === "OPEN");

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

  const productsWithVariants = useMemo(
    () =>
      products.map((product: any) => ({
        ...product,
        variants: variants.filter(
          (variant: any) =>
            variant.productId === product.id ||
            variant.productId === product.remoteId,
        ),
      })),
    [products, variants],
  );

  const list = getModuleList({
    moduleKey,
    staff,
    products: productsWithVariants,
    stores,
    categories,
    customers,
    suppliers,
    brands,
    sessions,
  });

  const handleSave = async (values: Record<string, any>) => {
    try {
      const nextValues = buildPayload(
        moduleKey,
        values,
        currentStoreId,
        user?.tenantId,
        editor.mode,
      );

      if (moduleKey === "products") {
        if (!String(nextValues.name ?? "").trim()) {
          Alert.alert(
            "Product name required",
            "Enter a product name before saving.",
          );
          return;
        }
        if (!nextValues.categoryId && !nextValues.categoryName) {
          Alert.alert(
            "Category required",
            "Select a category before saving the product.",
          );
          return;
        }
        if (
          Array.isArray(nextValues.variants) &&
          nextValues.variants.length > 0
        ) {
          const emptyOption = nextValues.variants.find(
            (variant: any) =>
              !String(variant.name ?? "").trim() ||
              !String(variant.sku ?? "").trim(),
          );
          if (emptyOption) {
            Alert.alert(
              "Option details required",
              "Every sellable option needs a name and a unique SKU.",
            );
            return;
          }
          const optionSkus = nextValues.variants.map((variant: any) =>
            String(variant.sku).trim().toLowerCase(),
          );
          if (new Set(optionSkus).size !== optionSkus.length) {
            Alert.alert(
              "Duplicate option SKU",
              "Each option must have a different SKU.",
            );
            return;
          }
        }
      }
      if (moduleKey === "staff") {
        if (!nextValues.email) {
          Alert.alert(
            "Email required",
            "Enter an email address for the staff account.",
          );
          return;
        }
        if (
          editor.mode === "create" &&
          String(nextValues.password ?? "").length < 6
        ) {
          Alert.alert(
            "Password too short",
            "Password must contain at least 6 characters.",
          );
          return;
        }
      }

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
      setEditor({ open: false, mode: "create" });
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

  const handleOpenSession = async (openingBalance: string, notes: string) => {
    if (!user?.id) {
      Alert.alert("Error", "User not logged in");
      return;
    }
    try {
      await openSession({
        userId: user.id,
        tenantId: user.tenantId,
        openingBalance: Number(openingBalance) || 0,
        notes: notes.trim() || undefined,
        storeId: currentStoreId || undefined,
        registerId: "default-register",
      }).unwrap();
      await refetchSessions();
      await refetchOrders();
      Alert.alert("Success", "Session opened successfully");
      setSessionModal(null);
    } catch (error: any) {
      Alert.alert(
        "Open session failed",
        error?.data?.message || "Unable to open session.",
      );
    }
  };

  const handleCloseSession = async (
    closingBalance: string,
    notes: string,
    sessionId: string,
  ) => {
    const selectedSession = sessions.find((s: any) => s.id === sessionId);
    if (!selectedSession) {
      Alert.alert("Error", "Session not found");
      return;
    }
    try {
      const sessionOrders = orders.filter(
        (o: any) => o.sessionId === selectedSession.id,
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
      await refetchSessions();
      await refetchOrders();
      Alert.alert("Success", "Session closed successfully");
      setSessionModal(null);
    } catch (error: any) {
      Alert.alert(
        "Close session failed",
        error?.data?.message || "Unable to close session.",
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStaff(),
      refetchProducts(),
      refetchStores(),
      refetchCategories(),
      refetchCustomers(),
      refetchSuppliers(),
      refetchBrands(),
      refetchSessions(),
      refetchOrders(),
    ]);
    setRefreshing(false);
  };

  const isLoading = {
    staff: fetchingStaff || creatingStaff || updatingStaff || deletingStaff,
    products:
      fetchingProducts || creatingProduct || updatingProduct || deletingProduct,
    stores: fetchingStores || creatingStore || updatingStore || deletingStore,
    categories:
      fetchingCategories ||
      creatingCategory ||
      updatingCategory ||
      deletingCategory,
    customers:
      fetchingCustomers ||
      creatingCustomer ||
      updatingCustomer ||
      deletingCustomer,
    suppliers:
      fetchingSuppliers ||
      creatingSupplier ||
      updatingSupplier ||
      deletingSupplier,
    brands: fetchingBrands || creatingBrand || updatingBrand || deletingBrand,
    sessions:
      fetchingSessions || fetchingOrders || openingSession || closingSession,
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
            />
          }
        >
          <Header
            eyebrow="Administration"
            title="Management"
            subtitle="Manage staff, products, stores, categories, customers, suppliers, brands, and session control from one place."
            right={<Pill label={user?.role ?? "USER"} tone="sky" />}
          />

          {/* Store Context */}
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
              {storeOptions.length === 0 && (
                <Text className="text-slate-500 text-xs">
                  No stores available
                </Text>
              )}
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
                "brands",
                "sessions",
              ] as ModuleKey[]
            ).map((key) => {
              const isActive = moduleKey === key;
              const count =
                key === "sessions"
                  ? sessions.length
                  : key === "staff"
                    ? staff.length
                    : key === "products"
                      ? products.length
                      : key === "stores"
                        ? stores.length
                        : key === "categories"
                          ? categories.length
                          : key === "customers"
                            ? customers.length
                            : key === "suppliers"
                              ? suppliers.length
                              : key === "brands"
                                ? brands.length
                                : 0;
              return (
                <Pressable
                  key={key}
                  onPress={() => setModuleKey(key)}
                  className={`rounded-full border px-4 py-3 flex-row items-center ${
                    isActive
                      ? "border-emerald-400/30 bg-emerald-500/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-[2px] ${
                      isActive ? "text-emerald-200" : "text-slate-300"
                    }`}
                  >
                    {key}
                  </Text>
                  <View className="ml-2 rounded-full bg-slate-700/50 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-slate-300">
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View className="mb-4 flex-row gap-3">
            {moduleKey !== "sessions" && (
              <ActionButton
                title="Add New"
                icon="add"
                accent="emerald"
                onPress={() => openEditor("create")}
                disabled={isLoading[moduleKey]}
              />
            )}
            {moduleKey === "sessions" ? (
              <ActionButton
                title={activeSession ? "Close Session" : "Open Session"}
                icon="schedule"
                accent={activeSession ? "rose" : "sky"}
                onPress={() =>
                  setSessionModal(activeSession ? "close" : "open")
                }
                disabled={isLoading.sessions}
              />
            ) : (
              <ActionButton
                title="Refresh"
                icon="refresh"
                accent="sky"
                onPress={() => refetchers[moduleKey]()}
                disabled={isLoading[moduleKey]}
              />
            )}
          </View>

          <SectionTitle
            title={`${moduleKey} list`}
            action="Tap an item to edit"
          />
          <Card>
            {isLoading[moduleKey] && moduleKey !== "sessions" ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text className="mt-4 text-slate-400">Loading...</Text>
              </View>
            ) : moduleKey === "sessions" ? (
              sessions.length ? (
                sessions.map((session: any) => {
                  const isActive = session.status === "OPEN";
                  const sessionOrders = orders.filter(
                    (o: any) => o.sessionId === session.id,
                  );
                  const totalSales = sessionOrders.reduce(
                    (sum: number, o: any) => sum + (o.grandTotal || 0),
                    0,
                  );
                  const orderCount = sessionOrders.length;

                  return (
                    <View
                      key={session.id}
                      className={`border-b border-white/8 px-4 py-3 last:border-b-0 ${
                        isActive ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-base font-bold text-white">
                              Session #{session.id.slice(-6)}
                            </Text>
                            <Pill
                              label={isActive ? "OPEN" : "CLOSED"}
                              tone={isActive ? "emerald" : "rose"}
                            />
                          </View>
                          <Text className="mt-1 text-xs text-slate-400">
                            Opened:{" "}
                            {new Date(session.openedAt).toLocaleString()}
                          </Text>
                          {session.closedAt && (
                            <Text className="text-xs text-slate-400">
                              Closed:{" "}
                              {new Date(session.closedAt).toLocaleString()}
                            </Text>
                          )}
                          <Text className="mt-0.5 text-xs text-slate-400">
                            Orders: {orderCount} • Total: $
                            {totalSales.toFixed(2)}
                          </Text>
                          {session.notes && (
                            <Text className="mt-1 text-xs italic text-slate-500">
                              {session.notes}
                            </Text>
                          )}
                        </View>
                        <View className="items-end">
                          <Text className="font-bold text-emerald-400">
                            ${totalSales.toFixed(2)}
                          </Text>
                          {isActive && (
                            <TouchableOpacity
                              className="mt-2 rounded-full border border-rose-500/30 bg-rose-500/20 px-3 py-1.5"
                              onPress={() => {
                                setSessionModal("close");
                                setEditor({
                                  open: false,
                                  mode: "create",
                                  item: session,
                                });
                              }}
                            >
                              <Text className="text-xs font-bold text-rose-400">
                                Close
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  icon="schedule"
                  title="No sessions yet"
                  description="Open your first session to start tracking sales."
                />
              )
            ) : list.length ? (
              list.map((item: any, index: number) => (
                <View
                  key={item.id ? `item-${item.id}` : `idx-${index}`}
                  pointerEvents="box-only"
                >
                  <TouchableOpacity
                    onPress={() => openEditor("edit", item)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between px-4 py-3"
                  >
                    <View className="flex-1 flex-row items-center">
                      <MaterialIcons
                        name={getIcon(moduleKey)}
                        size={24}
                        color="#94a3b8"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-white">
                          {item.name || item.username || item.code || item.id}
                        </Text>
                        <Text
                          className="text-sm text-slate-400"
                          numberOfLines={1}
                        >
                          {getSubtitle(moduleKey, item)}
                        </Text>
                        {moduleKey === "products" &&
                          Array.isArray(item.variants) &&
                          item.variants.length > 0 && (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              className="mt-2"
                            >
                              {item.variants.map((variant: any) => (
                                <View
                                  key={variant.id}
                                  className="mr-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1"
                                >
                                  <Text className="text-[10px] font-semibold text-amber-200">
                                    {variant.name} • $
                                    {Number(variant.price ?? 0).toFixed(2)}
                                  </Text>
                                </View>
                              ))}
                            </ScrollView>
                          )}
                      </View>
                    </View>
                    <Text className="text-sm font-medium text-slate-300">
                      {getRightLabel(moduleKey, item)}
                    </Text>
                  </TouchableOpacity>
                  {index < list.length - 1 && (
                    <View className="mx-4 my-2 h-px bg-white/8" />
                  )}
                </View>
              ))
            ) : (
              <EmptyState
                icon={getIcon(moduleKey)}
                title={`No ${moduleKey} found`}
                description={`Create a new ${moduleKey.slice(0, -1)} to get started.`}
              />
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
          brands={brands}
          refetchCategories={refetchCategories}
          refetchSuppliers={refetchSuppliers}
          refetchBrands={refetchBrands}
          isLoading={isLoading[moduleKey]}
        />

        <SessionModal
          visible={sessionModal !== null}
          mode={sessionModal}
          activeSession={activeSession}
          sessions={sessions}
          orders={orders}
          onClose={() => setSessionModal(null)}
          onOpen={handleOpenSession}
          onCloseSession={handleCloseSession}
          isSubmitting={openingSession || closingSession}
        />
      </SafeAreaView>
    </Screen>
  );
}
