// components/EditorModal.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Header, ActionButton } from "@/components/app-ui";
import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";
import { useCreateLocalCategoryMutation } from "@/services/features/offline/localApi";
import { useCreateLocalSupplierMutation } from "@/services/features/offline/localApi";
import { useCreateLocalBrandMutation } from "@/services/features/offline/localApi";

import Field from "./Field";
import DateField from "./DateField";
import VariantEditor from "./VariantEditor";
import RoleSelector from "./RoleSelector";
import PermissionSelector from "./PermissionSelector";
import StoreSelector from "./StoreSelector";
import CategorySelector from "./CategorySelector";
import SupplierSelector from "./SupplierSelector";
import BrandSelector from "./BrandSelector";

import { ModuleKey } from "@/utils/manage/helpers";
import { getDefaultFields, buildPayload } from "@/utils/manage/buildPayload";
import { getDefaultPermissions } from "@/constants/permissions";
import { generateBarcode } from "@/utils/manage/helpers";

export default function EditorModal({
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
  brands,
  refetchCategories,
  refetchSuppliers,
  refetchBrands,
  isLoading,
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
  brands: any[];
  refetchCategories: () => void;
  refetchSuppliers: () => void;
  refetchBrands: () => void;
  isLoading: boolean;
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
  const [scannerTarget, setScannerTarget] = useState<"master" | number | null>(
    null,
  );

  const [createCategory] = useCreateLocalCategoryMutation();
  const [createSupplier] = useCreateLocalSupplierMutation();
  const [createBrand] = useCreateLocalBrandMutation();

  const hasVariants =
    moduleKey === "products" &&
    Array.isArray(fields.variants) &&
    fields.variants.length > 0;

  const startVariantProduct = () => {
    if (hasVariants) return;
    setFields((current) => ({
      ...current,
      sku: "",
      barcode: "",
      variants: [
        {
          name: "",
          sku: "",
          price: 0,
          costPrice: 0,
          color: "",
          size: "",
          initialStock: 0,
        },
      ],
    }));
  };

  const useSimpleProduct = () => {
    set("variants", []);
  };

  useEffect(() => {
    if (visible) {
      setFields(item ? { ...item } : getDefaultFields(moduleKey));
      setShowCreateCategory(false);
      setShowCreateSupplier(false);
      setShowCreateBrand(false);
      setNewCategory({ name: "", slug: "", description: "" });
      setNewSupplier({
        name: "",
        code: "",
        phone: "",
        email: "",
        address: "",
        contactName: "",
      });
      setNewBrand({ name: "", description: "" });
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

  const handleCreateBrand = async () => {
    try {
      if (!newBrand.name.trim()) {
        Alert.alert("Error", "Brand name is required");
        return;
      }

      setIsCreatingBrand(true);
      if (!currentStoreId) {
        Alert.alert("Error", "Store not found");
        return;
      }

      const payload = {
        tenantId: "default",
        name: newBrand.name.trim(),
        description: newBrand.description.trim() || undefined,
        isActive: true,
      };

      const result = await createBrand(payload).unwrap();
      await refetchBrands();
      set("brandId", result.id);
      set("brandName", result.name);

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-slate-950">
        <SafeAreaView className="flex-1 px-4 pt-4">
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
            {/* STAFF */}
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
                <PermissionSelector
                  value={
                    Array.isArray(fields.permissions) ? fields.permissions : []
                  }
                  onChange={(permissions) => set("permissions", permissions)}
                />
              </>
            )}
            {/* PRODUCTS FORM */}
            {moduleKey === "products" && (
              <>
                <Field
                  label={hasVariants ? "Product name (master)" : "Product name"}
                  value={fields.name ?? ""}
                  onChangeText={(v) => set("name", v)}
                />
                {mode === "create" && (
                  <View className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <Text className="text-xs font-bold uppercase tracking-[3px] text-slate-400">
                      How is this item sold?
                    </Text>
                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        onPress={useSimpleProduct}
                        className={`flex-1 rounded-xl border p-3 ${
                          !hasVariants
                            ? "border-sky-400/50 bg-sky-500/15"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <Text className="text-center text-xs font-bold text-white">
                          Single item
                        </Text>
                        <Text className="mt-1 text-center text-[10px] text-slate-400">
                          One SKU, price, and stock
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={startVariantProduct}
                        className={`flex-1 rounded-xl border p-3 ${
                          hasVariants
                            ? "border-amber-400/50 bg-amber-500/15"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <Text className="text-center text-xs font-bold text-white">
                          Has options
                        </Text>
                        <Text className="mt-1 text-center text-[10px] text-slate-400">
                          Size, color, pack, etc.
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {!hasVariants && (
                  <>
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
                    <View className="flex-row gap-2 mb-4">
                      <TouchableOpacity
                        onPress={() => setScannerTarget("master")}
                        className="flex-1 rounded-xl border border-sky-400/30 bg-sky-500/15 py-3"
                      >
                        <Text className="text-center text-sky-200 font-bold text-xs">
                          Scan barcode / QR
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => set("barcode", generateBarcode())}
                        className="flex-1 rounded-xl border border-amber-400/30 bg-amber-500/15 py-3"
                      >
                        <Text className="text-center text-amber-200 font-bold text-xs">
                          Auto-generate
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <Field
                  label="Description"
                  value={fields.description ?? ""}
                  onChangeText={(v) => set("description", v)}
                  multiline
                />
                {!hasVariants && (
                  <>
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
                    {mode === "create" ? (
                      <Field
                        label="Initial Stock"
                        value={fields.initialStock?.toString() ?? ""}
                        onChangeText={(v) => {
                          const num = parseInt(v, 10);
                          set("initialStock", isNaN(num) ? 0 : num);
                        }}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text className="mb-4 text-xs text-amber-300">
                        Stock is managed separately in Inventory. Initial stock
                        is only used when creating a product.
                      </Text>
                    )}
                  </>
                )}
                {hasVariants && (
                  <Text className="mb-4 text-xs text-amber-300">
                    This is a master product. Each sellable option below needs
                    its own name, SKU, price, and stock.
                  </Text>
                )}
                <VariantEditor
                  variants={
                    Array.isArray(fields.variants) ? fields.variants : []
                  }
                  editable={mode !== "view"}
                  showInitialStock={mode === "create"}
                  onChange={(v) => set("variants", v)}
                  onScanBarcode={(index) => setScannerTarget(index)}
                />
                <DateField
                  label="Manufacturing Date"
                  value={fields.manufacturingDate}
                  onChange={(value) => set("manufacturingDate", value)}
                />
                <DateField
                  label="Expiry Date"
                  value={fields.expiryDate}
                  onChange={(value) => set("expiryDate", value)}
                />

                {/* Category Selector */}
                <CategorySelector
                  value={fields.categoryId ?? ""}
                  onChange={(categoryId, categoryName) => {
                    set("categoryId", categoryId);
                    set("categoryName", categoryName);
                  }}
                  categories={categories}
                  onAddCategory={() => setShowCreateCategory(true)}
                />

                {/* Supplier Selector */}
                <SupplierSelector
                  value={fields.supplierId ?? ""}
                  onChange={(supplierId, supplierName) => {
                    set("supplierId", supplierId);
                    set("supplierName", supplierName);
                  }}
                  suppliers={suppliers}
                />

                {/* Brand Selector */}
                <BrandSelector
                  value={fields.brandId ?? ""}
                  onChange={(brandId, brandName) => {
                    set("brandId", brandId);
                    set("brandName", brandName);
                  }}
                  brands={brands}
                  onAddBrand={() => setShowCreateBrand(true)}
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
                  className="mb-2 rounded-2xl border border-dashed border-sky-500/30 p-4"
                >
                  <Text className="text-center text-sky-400">
                    + Create New Category
                  </Text>
                </Pressable>

                {/* Create Brand Modal */}
                {showCreateBrand && (
                  <View className="mb-4 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                    <Text className="mb-2 text-xs font-bold uppercase tracking-[3px] text-purple-400">
                      Create New Brand
                    </Text>
                    <Field
                      label="Brand Name"
                      value={newBrand.name}
                      onChangeText={(v) =>
                        setNewBrand({ ...newBrand, name: v })
                      }
                    />
                    <Field
                      label="Description"
                      value={newBrand.description}
                      onChangeText={(v) =>
                        setNewBrand({ ...newBrand, description: v })
                      }
                    />
                    <View className="mt-2 flex-row gap-3">
                      <ActionButton
                        title="Cancel"
                        icon="close"
                        accent="rose"
                        onPress={() => setShowCreateBrand(false)}
                      />
                      <ActionButton
                        title="Create"
                        icon="add"
                        accent="emerald"
                        onPress={handleCreateBrand}
                        disabled={isCreatingBrand}
                      />
                    </View>
                  </View>
                )}
                <Pressable
                  onPress={() => setShowCreateBrand(true)}
                  className="mb-4 rounded-2xl border border-dashed border-purple-500/30 p-4"
                >
                  <Text className="text-center text-purple-400">
                    + Create New Brand
                  </Text>
                </Pressable>
              </>
            )}
            {/* STORES FORM */}
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
            {/* CATEGORIES FORM */}
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
            {/* CUSTOMERS FORM */}
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
            {/* SUPPLIERS FORM */}
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
            {/* BRANDS FORM */}
            {moduleKey === "brands" && (
              <>
                <Field
                  label="Name"
                  value={fields.name ?? ""}
                  onChangeText={(v) => set("name", v)}
                />
                <Field
                  label="Description"
                  value={fields.description ?? ""}
                  onChangeText={(v) => set("description", v)}
                />
              </>
            )}
            {/* SESSIONS - No form needed */}
            {moduleKey === "sessions" && (
              <View className="py-8">
                <Text className="text-center text-slate-400">
                  Session management is handled separately.
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
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
                disabled={isLoading}
              />
              <ActionButton
                title="Save"
                icon="save"
                accent="emerald"
                onPress={save}
                disabled={isLoading}
              />
            </View>
            {mode === "edit" && onDelete && (
              <View className="mt-3">
                <ActionButton
                  title="Delete"
                  icon="delete"
                  accent="rose"
                  onPress={onDelete}
                  disabled={isLoading}
                />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
        <BarcodeScannerModal
          visible={scannerTarget !== null}
          onClose={() => setScannerTarget(null)}
          onScan={(value) => {
            if (scannerTarget === "master") {
              set("barcode", value);
            } else if (typeof scannerTarget === "number") {
              const currentVariants = fields.variants || [];
              const nextVariants = currentVariants.map((v: any, i: number) =>
                i === scannerTarget ? { ...v, barcode: value } : v,
              );
              set("variants", nextVariants);
            }
            setScannerTarget(null);
          }}
        />
      </View>
    </Modal>
  );
}
