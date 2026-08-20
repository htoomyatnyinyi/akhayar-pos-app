import { ModuleKey } from "@/utils/manage/helpers";
import { generateBarcode } from "@/utils/manage/helpers";

export function getDefaultFields(moduleKey: ModuleKey) {
  if (moduleKey === "staff")
    return {
      username: "",
      name: "",
      email: "",
      password: "",
      role: "CASHIER",
      permissions: getDefaultPermissions("CASHIER"),
      storeId: "",
    };
  if (moduleKey === "products")
    return {
      sku: "",
      barcode: "",
      name: "",
      description: "",
      brand: "",
      brandId: "",
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
  if (moduleKey === "brands") return { name: "", description: "" };
  return {};
}

// We need to import getDefaultPermissions from constants
import { getDefaultPermissions } from "@/constants/permissions";

export function buildPayload(
  moduleKey: ModuleKey,
  values: Record<string, any>,
  currentStoreId: string | null,
  tenantId?: string,
  mode: "create" | "edit" = "create",
) {
  if (moduleKey === "staff") {
    const payload: any = {
      tenantId: tenantId || "default",
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
    const variants =
      Array.isArray(values.variants) && values.variants.length > 0
        ? values.variants.map((variant: any) => ({
            id: variant.id || undefined,
            remoteId: variant.remoteId || undefined,
            name: String(variant.name ?? "").trim(),
            sku: String(variant.sku ?? "").trim() || undefined,
            barcode: String(variant.barcode ?? "").trim() || undefined,
            price: Number(variant.price ?? 0),
            costPrice: Number(variant.costPrice ?? 0),
            color: String(variant.color ?? "").trim() || undefined,
            size: String(variant.size ?? "").trim() || undefined,
            ...(mode === "create"
              ? { initialStock: Number(variant.initialStock ?? 0) }
              : {}),
          }))
        : undefined;
    const variantStockTotal =
      mode === "create"
        ? variants?.reduce(
            (total: number, variant: any) =>
              total + Number(variant.initialStock ?? 0),
            0,
          )
        : undefined;
    const payload: any = {
      tenantId: tenantId || "default",
      sku: variants ? undefined : String(values.sku ?? "").trim() || undefined,
      barcode: variants
        ? undefined
        : String(values.barcode ?? "").trim() || generateBarcode(),
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim() || undefined,
      brand: String(values.brand ?? "").trim() || undefined,
      brandId: String(values.brandId ?? "").trim() || undefined,
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
      ...(mode === "create"
        ? {
            initialStock:
              variants && variants.length > 0
                ? variantStockTotal
                : values.initialStock !== undefined
                  ? Number(values.initialStock ?? 0)
                  : undefined,
          }
        : {}),
      variants,
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
      taxId: String(values.taxNumber ?? "").trim() || undefined,
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

  if (moduleKey === "brands") {
    return {
      tenantId: "default",
      name: String(values.name ?? "").trim(),
      description: String(values.description ?? "").trim() || undefined,
      isActive: values.isActive ?? true,
    };
  }

  return values;
}
