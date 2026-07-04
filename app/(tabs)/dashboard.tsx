// screens/ProductCreateScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAppDispatch } from "@/hooks/redux-hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/redux-hooks/useAppSelector";
import { createOfflineProduct } from "@/services/offline/repository";
import { syncNow } from "@/services/offline/syncManager";
import { useGetLocalCategoriesQuery } from "@/services/features/offline/localApi";
import Icon from "@expo/vector-icons/Ionicons";

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  sellingPrice: string;
  costPrice: string;
  stockQuantity: string;
  categoryId: string;
  description: string;
}

export function ProductCreateScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const isOnline = useAppSelector((state) => state.offline.isOnline);

  const { data: categories } = useGetLocalCategoriesQuery();

  const [form, setForm] = useState<ProductForm>({
    name: "",
    sku: "",
    barcode: "",
    sellingPrice: "",
    costPrice: "",
    stockQuantity: "0",
    categoryId: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // ✅ Handle form changes
  const handleChange = (field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ Submit product
  const handleSubmit = async () => {
    // Validation
    if (!form.name.trim()) {
      Alert.alert("Validation", "Product name is required");
      return;
    }
    if (!form.sku.trim()) {
      Alert.alert("Validation", "SKU is required");
      return;
    }
    if (!form.sellingPrice || parseFloat(form.sellingPrice) <= 0) {
      Alert.alert("Validation", "Valid selling price is required");
      return;
    }

    setLoading(true);

    try {
      // ✅ Create product offline first
      const newProduct = await createOfflineProduct({
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        sellingPrice: parseFloat(form.sellingPrice),
        costPrice: parseFloat(form.costPrice) || 0,
        stockQuantity: parseInt(form.stockQuantity) || 0,
        categoryId: form.categoryId || undefined,
        description: form.description.trim() || undefined,
      });

      // ✅ Show success
      Alert.alert("Success", `Product "${form.name}" created successfully!`, [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
            // ✅ Trigger sync if online
            if (isOnline) {
              syncNow(dispatch, () => ({}) as any, { force: true });
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Create product error:", error);
      Alert.alert("Error", "Failed to create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Render category picker
  const renderCategoryPicker = () => (
    <View style={styles.categoryPickerContainer}>
      <TouchableOpacity
        style={styles.categoryPickerTrigger}
        onPress={() => setShowCategoryPicker(!showCategoryPicker)}
      >
        <Text
          style={
            form.categoryId
              ? styles.categorySelected
              : styles.categoryPlaceholder
          }
        >
          {form.categoryId
            ? categories?.find((c) => c.id === form.categoryId)?.name ||
              "Select Category"
            : "Select Category"}
        </Text>
        <Icon
          name={showCategoryPicker ? "chevron-up" : "chevron-down"}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>

      {showCategoryPicker && (
        <View style={styles.categoryList}>
          <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => {
              setForm((prev) => ({ ...prev, categoryId: "" }));
              setShowCategoryPicker(false);
            }}
          >
            <Text>None</Text>
          </TouchableOpacity>
          {categories?.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                form.categoryId === category.id && styles.categoryItemSelected,
              ]}
              onPress={() => {
                setForm((prev) => ({ ...prev, categoryId: category.id }));
                setShowCategoryPicker(false);
              }}
            >
              <Text
                style={
                  form.categoryId === category.id &&
                  styles.categoryItemTextSelected
                }
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* ✅ Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name"
            value={form.name}
            onChangeText={(text) => handleChange("name", text)}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>SKU *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter SKU"
              value={form.sku}
              onChangeText={(text) => handleChange("sku", text.toUpperCase())}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Barcode</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter barcode"
              value={form.barcode}
              onChangeText={(text) => handleChange("barcode", text)}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Selling Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={form.sellingPrice}
              onChangeText={(text) => handleChange("sellingPrice", text)}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Cost Price</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={form.costPrice}
              onChangeText={(text) => handleChange("costPrice", text)}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Stock Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={form.stockQuantity}
            onChangeText={(text) => handleChange("stockQuantity", text)}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          {renderCategoryPicker()}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter description"
            value={form.description}
            onChangeText={(text) => handleChange("description", text)}
            multiline
            numberOfLines={4}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* ✅ Offline Mode Notice */}
        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Icon name="cloud-offline-outline" size={20} color="#F59E0B" />
            <Text style={styles.offlineNoticeText}>
              You are offline. Product will be saved locally and synced when
              online.
            </Text>
          </View>
        )}

        {/* ✅ Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Create Product</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  categoryPickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  categoryPickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  categoryPlaceholder: {
    color: "#9CA3AF",
    fontSize: 16,
  },
  categorySelected: {
    color: "#1F2937",
    fontSize: 16,
  },
  categoryList: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  categoryItemTextSelected: {
    color: "#3B82F6",
    fontWeight: "500",
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    marginBottom: 16,
  },
  offlineNoticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#92400E",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
