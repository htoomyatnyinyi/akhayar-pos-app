// ============================================
// FILE: services/offline/schema.ts
// ============================================

import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================
// SYNC ENTITIES
// ============================================

export const syncEntities = [
  "products",
  "product_variants",
  "categories",
  "brands",
  "inventory",
  "inventory_movements",
  "inventory_counts",
  "customers",
  "stores",
  "staff",
  "suppliers",
  "sessions",
  "orders",
  "price_history",
  "promotions",
  "tax_rates",
  "expenses",
  "expense_categories",
  "cash_registers",
  "gift_cards",
  "gift_card_transactions",
  "wallets",
  "wallet_transactions",
  "supplier_payments",
  "purchase_orders",
  "purchase_order_items",
  "stock_transfers",
  "stock_transfer_items",
  "webhooks",
  "api_keys",
  "notifications",
  "tenant_store_settings",
  "audit_logs",
] as const;
export type SyncEntity = (typeof syncEntities)[number];

// ============================================
// 1. PRODUCTS
// ============================================
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    name: text("name").notNull(),
    description: text("description"),
    brand: text("brand"),
    brandId: text("brand_id"),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    costPrice: real("cost_price").notNull().default(0),
    sellingPrice: real("selling_price").notNull().default(0),
    wholesalePrice: real("wholesale_price").default(0),
    promoPrice: real("promo_price"),
    promoStartAt: text("promo_start_at"),
    promoEndAt: text("promo_end_at"),
    isTaxable: integer("is_taxable", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    isReturnable: integer("is_returnable", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    expiryDate: text("expiry_date"),
    manufacturingDate: text("manufacturing_date"),
    bestBeforeDate: text("best_before_date"),
    categoryId: text("category_id").notNull(),
    supplierId: text("supplier_id"),
    deletedAt: text("deleted_at"),
    version: integer("version").notNull().default(0),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    skuIdx: uniqueIndex("products_tenant_sku_idx").on(
      table.tenantId,
      table.sku,
    ),
    barcodeIdx: uniqueIndex("products_tenant_barcode_idx").on(
      table.tenantId,
      table.barcode,
    ),
    categoryIdx: index("products_category_idx").on(table.categoryId),
    tenantActiveIdx: index("products_tenant_active_idx").on(
      table.tenantId,
      table.isActive,
    ),
    expiryIdx: index("products_expiry_idx").on(table.expiryDate),
    deletedIdx: index("products_deleted_idx").on(table.deletedAt),
    skuIdx2: index("products_sku_idx").on(table.sku),
    barcodeIdx2: index("products_barcode_idx").on(table.barcode),
    tenantCreatedIdx: index("products_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
    nameIdx: index("products_name_idx").on(table.name),
    brandIdx: index("products_brand_idx").on(table.brand),
    brandIdIdx: index("products_brand_id_idx").on(table.brandId),
    storeIdx: index("products_store_idx").on(table.storeId),
  }),
);

// ============================================
// 2. PRODUCT VARIANTS
// ============================================
export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    name: text("name").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    price: real("price").notNull(),
    costPrice: real("cost_price").notNull(),
    color: text("color"),
    size: text("size"),
    weight: real("weight"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantSkuIdx: uniqueIndex("variant_tenant_sku_idx").on(
      table.tenantId,
      table.sku,
    ),
    tenantBarcodeIdx: uniqueIndex("variant_tenant_barcode_idx").on(
      table.tenantId,
      table.barcode,
    ),
    productNameIdx: uniqueIndex("variant_product_name_idx").on(
      table.productId,
      table.name,
    ),
    productIdx: index("variant_product_idx").on(table.productId),
    activeIdx: index("variant_active_idx").on(table.isActive),
    tenantIdx: index("variant_tenant_idx").on(table.tenantId),
    tenantCreatedIdx: index("variant_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
  }),
);

// ============================================
// 3. CATEGORIES
// ============================================
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    name: text("name").notNull(),
    description: text("description"),
    slug: text("slug"),
    parentId: text("parent_id"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    sortOrder: integer("sort_order").notNull().default(0),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantNameIdx: uniqueIndex("categories_tenant_name_idx").on(
      table.tenantId,
      table.name,
    ),
    tenantSlugIdx: uniqueIndex("categories_tenant_slug_idx").on(
      table.tenantId,
      table.slug,
    ),
    parentIdx: index("categories_parent_idx").on(table.parentId),
    activeIdx: index("categories_active_idx").on(table.isActive),
    storeIdx: index("categories_store_idx").on(table.storeId),
  }),
);

// ============================================
// 4. BRANDS
// ============================================
export const brands = sqliteTable(
  "brands",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantNameIdx: uniqueIndex("brands_tenant_name_idx").on(
      table.tenantId,
      table.name,
    ),
    activeIdx: index("brands_active_idx").on(table.isActive),
    tenantIdx: index("brands_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 5. INVENTORY
// ============================================
export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull().default(0),
    reservedQty: integer("reserved_qty").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(10),
    reorderQty: integer("reorder_qty").notNull().default(0),
    shelfLocation: text("shelf_location"),
    version: integer("version").notNull().default(0),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    storeProductVariantIdx: uniqueIndex("store_product_variant_idx").on(
      table.storeId,
      table.productId,
      table.variantId,
    ),
    storeQuantityIdx: index("inventory_store_quantity_idx").on(
      table.storeId,
      table.quantity,
    ),
    productStoreIdx: index("inventory_product_store_idx").on(
      table.productId,
      table.storeId,
    ),
    reorderIdx: index("inventory_reorder_idx").on(
      table.reorderPoint,
      table.quantity,
    ),
    quantityIdx: index("inventory_quantity_idx").on(table.quantity),
    tenantIdx: index("inventory_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 6. INVENTORY MOVEMENTS
// ============================================
export const inventoryMovements = sqliteTable(
  "inventory_movements",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    storeId: text("store_id").notNull(),
    quantity: integer("quantity").notNull(),
    type: text("type").notNull(),
    referenceId: text("reference_id").notNull(),
    referenceType: text("reference_type").notNull(),
    reason: text("reason"),
    syncStatus: text("sync_status").notNull().default("pending"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    productIdx: index("movements_product_idx").on(table.productId),
    storeIdx: index("movements_store_idx").on(table.storeId),
    typeIdx: index("movements_type_idx").on(table.type),
    referenceIdx: index("movements_reference_idx").on(
      table.referenceId,
      table.referenceType,
    ),
    createdAtIdx: index("movements_created_at_idx").on(table.createdAt),
  }),
);

// ============================================
// 7. INVENTORY COUNTS
// ============================================
export const inventoryCounts = sqliteTable(
  "inventory_counts",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id").notNull(),
    status: text("status").notNull().default("PENDING"),
    scheduledDate: text("scheduled_date"),
    completedAt: text("completed_at"),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default("pending"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    storeIdx: index("counts_store_idx").on(table.storeId),
    statusIdx: index("counts_status_idx").on(table.status),
    scheduledIdx: index("counts_scheduled_idx").on(table.scheduledDate),
  }),
);

// ============================================
// 8. INVENTORY COUNT ITEMS
// ============================================
export const inventoryCountItems = sqliteTable(
  "inventory_count_items",
  {
    id: text("id").primaryKey(),
    countId: text("count_id")
      .notNull()
      .references(() => inventoryCounts.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    systemQuantity: integer("system_quantity").notNull(),
    countedQuantity: integer("counted_quantity").notNull(),
    difference: integer("difference").notNull(),
    reason: text("reason"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    countIdx: index("count_items_count_idx").on(table.countId),
    productIdx: index("count_items_product_idx").on(table.productId),
  }),
);

// ============================================
// 9. CUSTOMERS
// ============================================
export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    dateOfBirth: text("date_of_birth"),
    gender: text("gender"),
    debtAmount: real("debt_amount").notNull().default(0),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    totalSpent: real("total_spent").notNull().default(0),
    totalOrders: integer("total_orders").notNull().default(0),
    tier: text("tier").notNull().default("BRONZE"),
    tierValidUntil: text("tier_valid_until"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantCodeIdx: uniqueIndex("customers_tenant_code_idx").on(
      table.tenantId,
      table.code,
    ),
    tenantPhoneIdx: uniqueIndex("customers_tenant_phone_idx").on(
      table.tenantId,
      table.phone,
    ),
    tenantEmailIdx: uniqueIndex("customers_tenant_email_idx").on(
      table.tenantId,
      table.email,
    ),
    nameIdx: index("customers_name_idx").on(table.name),
    activeIdx: index("customers_active_idx").on(table.isActive),
  }),
);

// ============================================
// 10. STORES
// ============================================
export const stores = sqliteTable(
  "stores",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    taxNumber: text("tax_number"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantCodeIdx: uniqueIndex("stores_tenant_code_idx").on(
      table.tenantId,
      table.code,
    ),
    nameIdx: index("stores_name_idx").on(table.name),
    activeIdx: index("stores_active_idx").on(table.isActive),
  }),
);

// ============================================
// 11. SESSIONS
// ============================================
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    registerId: text("register_id"),
    userId: text("user_id").notNull(),
    status: text("status").notNull().default("OPEN"),
    openedAt: text("opened_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    closedAt: text("closed_at"),
    openingBalance: real("opening_balance").notNull().default(0),
    closingBalance: real("closing_balance"),
    expectedBalance: real("expected_balance"),
    discrepancy: real("discrepancy"),
    cashSales: real("cash_sales").notNull().default(0),
    cardSales: real("card_sales").notNull().default(0),
    digitalSales: real("digital_sales").notNull().default(0),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    storeIdx: index("sessions_store_idx").on(table.storeId),
    userIdx: index("sessions_user_idx").on(table.userId),
    statusIdx: index("sessions_status_idx").on(table.status),
    openedIdx: index("sessions_opened_idx").on(table.openedAt),
  }),
);

// ============================================
// 12. STAFF
// ============================================
// export const staff = sqliteTable(
//   "staff",
//   {
//     id: text("id").primaryKey(),
//     remoteId: text("remote_id").unique(),
//     tenantId: text("tenant_id").notNull(),
//     storeId: text("store_id"),
//     username: text("username").notNull(),
//     email: text("email"),
//     name: text("name").notNull(),
//     role: text("role").notNull().default("CASHIER"),
//     permissions: text("permissions", { mode: "json" })
//       .$type<string[]>()
//       .default([]),
//     isActive: integer("is_active", { mode: "boolean" })
//       .notNull()
//       .default(sql`1`),
//     syncStatus: text("sync_status").notNull().default("synced"),
//     syncError: text("sync_error"),
//     createdAt: text("created_at")
//       .notNull()
//       .default(sql`CURRENT_TIMESTAMP`),
//     updatedAt: text("updated_at")
//       .notNull()
//       .default(sql`CURRENT_TIMESTAMP`),
//     lastSyncedAt: text("last_synced_at"),
//   },
//   (table) => ({
//     tenantUsernameIdx: uniqueIndex("staff_tenant_username_idx").on(
//       table.tenantId,
//       table.username,
//     ),
//     tenantEmailIdx: uniqueIndex("staff_tenant_email_idx").on(
//       table.tenantId,
//       table.email,
//     ),
//     storeIdx: index("staff_store_idx").on(table.storeId),
//     roleIdx: index("staff_role_idx").on(table.role),
//     activeIdx: index("staff_active_idx").on(table.isActive),
//     tenantIdx: index("staff_tenant_idx").on(table.tenantId),
//   }),
// );

// ============================================
// FILE: services/offline/schema.ts
// ============================================

// // In the staff table definition, make sure permissions is defined as:
// export const staff = sqliteTable(
//   "staff",
//   {
//     id: text("id").primaryKey(),
//     remoteId: text("remote_id").unique(),
//     tenantId: text("tenant_id").notNull(),
//     storeId: text("store_id"),
//     username: text("username").notNull(),
//     email: text("email"),
//     name: text("name").notNull(),
//     role: text("role").notNull().default("CASHIER"),
//     // ✅ Make sure permissions is stored as TEXT with json mode
//     permissions: text("permissions", { mode: "json" })
//       .$type<string[]>()
//       .default([]),
//     isActive: integer("is_active", { mode: "boolean" })
//       .notNull()
//       .default(sql`1`),
//     syncStatus: text("sync_status").notNull().default("synced"),
//     syncError: text("sync_error"),
//     createdAt: text("created_at")
//       .notNull()
//       .default(sql`CURRENT_TIMESTAMP`),
//     updatedAt: text("updated_at")
//       .notNull()
//       .default(sql`CURRENT_TIMESTAMP`),
//     lastSyncedAt: text("last_synced_at"),
//   },
//   (table) => ({
//     tenantUsernameIdx: uniqueIndex("staff_tenant_username_idx").on(
//       table.tenantId,
//       table.username,
//     ),
//     tenantEmailIdx: uniqueIndex("staff_tenant_email_idx").on(
//       table.tenantId,
//       table.email,
//     ),
//     storeIdx: index("staff_store_idx").on(table.storeId),
//     roleIdx: index("staff_role_idx").on(table.role),
//     activeIdx: index("staff_active_idx").on(table.isActive),
//     tenantIdx: index("staff_tenant_idx").on(table.tenantId),
//   }),
// );

// ============================================
// FILE: services/offline/schema.ts
// ============================================

export const staff = sqliteTable(
  "staff",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    username: text("username").notNull(),
    email: text("email"),
    name: text("name").notNull(),
    role: text("role").notNull().default("CASHIER"),
    // ✅ Fix: Use text with json mode, but handle null values
    permissions: text("permissions", { mode: "json" })
      .$type<string[]>()
      .default(sql`'[]'`),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantUsernameIdx: uniqueIndex("staff_tenant_username_idx").on(
      table.tenantId,
      table.username,
    ),
    tenantEmailIdx: uniqueIndex("staff_tenant_email_idx").on(
      table.tenantId,
      table.email,
    ),
    storeIdx: index("staff_store_idx").on(table.storeId),
    roleIdx: index("staff_role_idx").on(table.role),
    activeIdx: index("staff_active_idx").on(table.isActive),
    tenantIdx: index("staff_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 13. SUPPLIERS
// ============================================
export const suppliers = sqliteTable(
  "suppliers",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    taxNumber: text("tax_number"),
    paymentTerms: integer("payment_terms"),
    creditLimit: real("credit_limit"),
    currentBalance: real("current_balance").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantCodeIdx: uniqueIndex("suppliers_tenant_code_idx").on(
      table.tenantId,
      table.code,
    ),
    tenantPhoneIdx: uniqueIndex("suppliers_tenant_phone_idx").on(
      table.tenantId,
      table.phone,
    ),
    tenantEmailIdx: uniqueIndex("suppliers_tenant_email_idx").on(
      table.tenantId,
      table.email,
    ),
    storeIdx: index("suppliers_store_idx").on(table.storeId),
    nameIdx: index("suppliers_name_idx").on(table.name),
    activeIdx: index("suppliers_active_idx").on(table.isActive),
    tenantIdx: index("suppliers_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 14. ORDERS
// ============================================
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    registerId: text("register_id"),
    userId: text("user_id").notNull(),
    customerId: text("customer_id"),
    sessionId: text("session_id"),
    orderNumber: text("order_number"),
    status: text("status").notNull().default("PENDING"),
    paymentStatus: text("payment_status").notNull().default("PENDING"),
    paymentMethod: text("payment_method").notNull(),
    subTotal: real("sub_total").notNull(),
    taxAmount: real("tax_amount").notNull().default(0),
    discountAmount: real("discount_amount").notNull().default(0),
    grandTotal: real("grand_total").notNull(),
    paidAmount: real("paid_amount").notNull().default(0),
    changeAmount: real("change_amount").notNull().default(0),
    paymentBreakdown: text("payment_breakdown", { mode: "json" }),
    syncStatus: text("sync_status").notNull().default("pending"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantOrderIdx: uniqueIndex("orders_tenant_order_idx").on(
      table.tenantId,
      table.orderNumber,
    ),
    storeIdx: index("orders_store_idx").on(table.storeId),
    customerIdx: index("orders_customer_idx").on(table.customerId),
    sessionIdx: index("orders_session_idx").on(table.sessionId),
    statusIdx: index("orders_status_idx").on(table.status),
    paymentStatusIdx: index("orders_payment_status_idx").on(
      table.paymentStatus,
    ),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  }),
);

// ============================================
// 15. ORDER ITEMS
// ============================================
export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").references(() => productVariants.id),
    productName: text("product_name"),
    quantity: integer("quantity").notNull(),
    unitPrice: real("unit_price").notNull(),
    discountAmount: real("discount_amount").notNull().default(0),
    subTotal: real("sub_total").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
    productIdx: index("order_items_product_idx").on(table.productId),
    variantIdx: index("order_items_variant_idx").on(table.variantId),
  }),
);

// ============================================
// 16. PRICE HISTORY
// ============================================
export const priceHistory = sqliteTable(
  "price_history",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id),
    oldPrice: real("old_price").notNull(),
    newPrice: real("new_price").notNull(),
    changedBy: text("changed_by"),
    reason: text("reason"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    productIdx: index("price_history_product_idx").on(table.productId),
    variantIdx: index("price_history_variant_idx").on(table.variantId),
    tenantIdx: index("price_history_tenant_idx").on(table.tenantId),
    createdIdx: index("price_history_created_idx").on(table.createdAt),
  }),
);

// ============================================
// 17. PROMOTIONS
// ============================================
export const promotions = sqliteTable(
  "promotions",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    discountType: text("discount_type").notNull(),
    discountValue: real("discount_value").notNull(),
    minPurchase: real("min_purchase"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    usageLimit: integer("usage_limit"),
    perUserLimit: integer("per_user_limit"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantCodeIdx: uniqueIndex("promotions_tenant_code_idx").on(
      table.tenantId,
      table.code,
    ),
    activeIdx: index("promotions_active_idx").on(table.isActive),
    dateRangeIdx: index("promotions_date_range_idx").on(
      table.startDate,
      table.endDate,
    ),
    tenantIdx: index("promotions_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 18. TAX RATES
// ============================================
export const taxRates = sqliteTable(
  "tax_rates",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    rate: real("rate").notNull(),
    isCompound: integer("is_compound", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    appliesTo: text("applies_to", { mode: "json" })
      .$type<string[]>()
      .default([]),
    validFrom: text("valid_from").notNull(),
    validTo: text("valid_to"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantNameIdx: uniqueIndex("tax_rates_tenant_name_idx").on(
      table.tenantId,
      table.name,
    ),
    activeIdx: index("tax_rates_active_idx").on(table.isActive),
    tenantIdx: index("tax_rates_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 19. EXPENSES
// ============================================
export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    categoryId: text("category_id").notNull(),
    amount: real("amount").notNull(),
    description: text("description"),
    receiptUrl: text("receipt_url"),
    expenseDate: text("expense_date").notNull(),
    createdById: text("created_by_id").notNull(),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantIdx: index("expenses_tenant_idx").on(table.tenantId),
    storeIdx: index("expenses_store_idx").on(table.storeId),
    categoryIdx: index("expenses_category_idx").on(table.categoryId),
    dateIdx: index("expenses_date_idx").on(table.expenseDate),
  }),
);

// ============================================
// 20. EXPENSE CATEGORIES
// ============================================
export const expenseCategories = sqliteTable(
  "expense_categories",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantNameIdx: uniqueIndex("expense_categories_tenant_name_idx").on(
      table.tenantId,
      table.name,
    ),
    activeIdx: index("expense_categories_active_idx").on(table.isActive),
    tenantIdx: index("expense_categories_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 21. CASH REGISTERS
// ============================================
export const cashRegisters = sqliteTable(
  "cash_registers",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("CLOSED"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    storeIdx: index("cash_registers_store_idx").on(table.storeId),
    statusIdx: index("cash_registers_status_idx").on(table.status),
    tenantIdx: index("cash_registers_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 22. GIFT CARDS
// ============================================
export const giftCards = sqliteTable(
  "gift_cards",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    customerId: text("customer_id"),
    cardNumber: text("card_number").notNull().unique(),
    pinCode: text("pin_code"),
    initialAmount: real("initial_amount").notNull(),
    currentBalance: real("current_balance").notNull(),
    expiresAt: text("expires_at"),
    status: text("status").notNull().default("ACTIVE"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    cardNumberIdx: uniqueIndex("gift_cards_card_number_idx").on(
      table.cardNumber,
    ),
    customerIdx: index("gift_cards_customer_idx").on(table.customerId),
    statusIdx: index("gift_cards_status_idx").on(table.status),
    tenantIdx: index("gift_cards_tenant_idx").on(table.tenantId),
    expiryIdx: index("gift_cards_expiry_idx").on(table.expiresAt),
  }),
);

// ============================================
// 23. GIFT CARD TRANSACTIONS
// ============================================
export const giftCardTransactions = sqliteTable(
  "gift_card_transactions",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    giftCardId: text("gift_card_id").notNull(),
    amount: real("amount").notNull(),
    type: text("type").notNull(),
    referenceId: text("reference_id"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    giftCardIdx: index("gift_card_transactions_gift_card_idx").on(
      table.giftCardId,
    ),
    tenantIdx: index("gift_card_transactions_tenant_idx").on(table.tenantId),
    createdIdx: index("gift_card_transactions_created_idx").on(table.createdAt),
  }),
);

// ============================================
// 24. WALLETS
// ============================================
export const wallets = sqliteTable(
  "wallets",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    customerId: text("customer_id").notNull().unique(),
    balance: real("balance").notNull().default(0),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    customerIdx: uniqueIndex("wallets_customer_idx").on(table.customerId),
    tenantIdx: index("wallets_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 25. WALLET TRANSACTIONS
// ============================================
export const walletTransactions = sqliteTable(
  "wallet_transactions",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    walletId: text("wallet_id").notNull(),
    amount: real("amount").notNull(),
    type: text("type").notNull(),
    referenceId: text("reference_id"),
    description: text("description"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    walletIdx: index("wallet_transactions_wallet_idx").on(table.walletId),
    tenantIdx: index("wallet_transactions_tenant_idx").on(table.tenantId),
    createdIdx: index("wallet_transactions_created_idx").on(table.createdAt),
  }),
);

// ============================================
// 26. SUPPLIER PAYMENTS
// ============================================
export const supplierPayments = sqliteTable(
  "supplier_payments",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    supplierId: text("supplier_id").notNull(),
    amount: real("amount").notNull(),
    paymentMethod: text("payment_method").notNull(),
    referenceNumber: text("reference_number"),
    note: text("note"),
    paidAt: text("paid_at").notNull(),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    supplierIdx: index("supplier_payments_supplier_idx").on(table.supplierId),
    tenantIdx: index("supplier_payments_tenant_idx").on(table.tenantId),
    paidAtIdx: index("supplier_payments_paid_at_idx").on(table.paidAt),
  }),
);

// ============================================
// 27. PURCHASE ORDERS
// ============================================
export const purchaseOrders = sqliteTable(
  "purchase_orders",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    supplierId: text("supplier_id").notNull(),
    poNumber: text("po_number").notNull(),
    status: text("status").notNull().default("DRAFT"),
    orderDate: text("order_date").notNull(),
    expectedDate: text("expected_date"),
    receivedDate: text("received_date"),
    subTotal: real("sub_total").notNull(),
    taxAmount: real("tax_amount").notNull().default(0),
    grandTotal: real("grand_total").notNull(),
    createdById: text("created_by_id").notNull(),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantPoIdx: uniqueIndex("purchase_orders_tenant_po_idx").on(
      table.tenantId,
      table.poNumber,
    ),
    supplierIdx: index("purchase_orders_supplier_idx").on(table.supplierId),
    statusIdx: index("purchase_orders_status_idx").on(table.status),
    tenantIdx: index("purchase_orders_tenant_idx").on(table.tenantId),
    orderDateIdx: index("purchase_orders_order_date_idx").on(table.orderDate),
  }),
);

// ============================================
// 28. PURCHASE ORDER ITEMS
// ============================================
export const purchaseOrderItems = sqliteTable(
  "purchase_order_items",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    poId: text("po_id").notNull(),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    quantity: integer("quantity").notNull(),
    unitCost: real("unit_cost").notNull(),
    totalCost: real("total_cost").notNull(),
    receivedQuantity: integer("received_quantity").notNull().default(0),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    poIdx: index("purchase_order_items_po_idx").on(table.poId),
    productIdx: index("purchase_order_items_product_idx").on(table.productId),
    tenantIdx: index("purchase_order_items_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 29. STOCK TRANSFERS
// ============================================
export const stockTransfers = sqliteTable(
  "stock_transfers",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    transferNumber: text("transfer_number").notNull(),
    fromStoreId: text("from_store_id").notNull(),
    toStoreId: text("to_store_id").notNull(),
    status: text("status").notNull().default("PENDING"),
    requestedById: text("requested_by_id").notNull(),
    approvedById: text("approved_by_id"),
    requestedAt: text("requested_at").notNull(),
    completedAt: text("completed_at"),
    notes: text("notes"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantTransferIdx: uniqueIndex("stock_transfers_tenant_transfer_idx").on(
      table.tenantId,
      table.transferNumber,
    ),
    fromStoreIdx: index("stock_transfers_from_store_idx").on(table.fromStoreId),
    toStoreIdx: index("stock_transfers_to_store_idx").on(table.toStoreId),
    statusIdx: index("stock_transfers_status_idx").on(table.status),
    tenantIdx: index("stock_transfers_tenant_idx").on(table.tenantId),
    requestedAtIdx: index("stock_transfers_requested_at_idx").on(
      table.requestedAt,
    ),
  }),
);

// ============================================
// 30. STOCK TRANSFER ITEMS
// ============================================
export const stockTransferItems = sqliteTable(
  "stock_transfer_items",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    transferId: text("transfer_id").notNull(),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    quantity: integer("quantity").notNull(),
    receivedQuantity: integer("received_quantity"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    transferIdx: index("stock_transfer_items_transfer_idx").on(
      table.transferId,
    ),
    productIdx: index("stock_transfer_items_product_idx").on(table.productId),
    tenantIdx: index("stock_transfer_items_tenant_idx").on(table.tenantId),
  }),
);

// ============================================
// 31. WEBHOOKS
// ============================================
export const webhooks = sqliteTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    events: text("events", { mode: "json" }).$type<string[]>().notNull(),
    secret: text("secret"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    lastTriggeredAt: text("last_triggered_at"),
    lastError: text("last_error"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantIdx: index("webhooks_tenant_idx").on(table.tenantId),
    activeIdx: index("webhooks_active_idx").on(table.isActive),
    tenantNameIdx: uniqueIndex("webhooks_tenant_name_idx").on(
      table.tenantId,
      table.name,
    ),
  }),
);

// ============================================
// 32. API KEYS
// ============================================
export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    secret: text("secret").notNull(),
    permissions: text("permissions", { mode: "json" })
      .$type<string[]>()
      .default([]),
    lastUsedAt: text("last_used_at"),
    expiresAt: text("expires_at"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    keyIdx: uniqueIndex("api_keys_key_idx").on(table.key),
    tenantIdx: index("api_keys_tenant_idx").on(table.tenantId),
    activeIdx: index("api_keys_active_idx").on(table.isActive),
    userIdx: index("api_keys_user_idx").on(table.userId),
  }),
);

// ============================================
// 33. NOTIFICATIONS
// ============================================
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: integer("is_read", { mode: "boolean" })
      .notNull()
      .default(sql`0`),
    readAt: text("read_at"),
    metadata: text("metadata", { mode: "json" }),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    readIdx: index("notifications_read_idx").on(table.isRead),
    typeIdx: index("notifications_type_idx").on(table.type),
    tenantIdx: index("notifications_tenant_idx").on(table.tenantId),
    createdIdx: index("notifications_created_idx").on(table.createdAt),
  }),
);

// ============================================
// 34. TENANT STORE SETTINGS
// ============================================
export const tenantStoreSettings = sqliteTable(
  "tenant_store_settings",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    storeId: text("store_id"),
    settingKey: text("setting_key").notNull(),
    settingValue: text("setting_value", { mode: "json" }).notNull(),
    description: text("description"),
    updatedById: text("updated_by_id").notNull(),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantStoreKeyIdx: uniqueIndex("tenant_store_settings_key_idx").on(
      table.tenantId,
      table.storeId,
      table.settingKey,
    ),
    tenantIdx: index("tenant_store_settings_tenant_idx").on(table.tenantId),
    storeIdx: index("tenant_store_settings_store_idx").on(table.storeId),
    keyIdx: index("tenant_store_settings_key_idx").on(table.settingKey),
  }),
);

// ============================================
// 35. AUDIT LOGS
// ============================================
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id").unique(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    oldData: text("old_data", { mode: "json" }),
    newData: text("new_data", { mode: "json" }),
    changes: text("changes", { mode: "json" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    tenantIdx: index("audit_logs_tenant_idx").on(table.tenantId),
    userIdx: index("audit_logs_user_idx").on(table.userId),
    entityIdx: index("audit_logs_entity_idx").on(table.entity, table.entityId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    createdIdx: index("audit_logs_created_idx").on(table.createdAt),
  }),
);

// ============================================
// 36. SYNC OUTBOX
// ============================================
export const syncOutbox = sqliteTable(
  "sync_outbox",
  {
    id: text("id").primaryKey(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation").notNull(),
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull(),
    payload: text("payload", { mode: "json" }).notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: text("next_attempt_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastError: text("last_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    entityIdx: index("outbox_entity_idx").on(table.entity),
    statusIdx: index("outbox_status_idx").on(table.status),
    nextAttemptIdx: index("outbox_next_attempt_idx").on(table.nextAttemptAt),
  }),
);

// ============================================
// 37. SYNC STATE
// ============================================
export const syncState = sqliteTable(
  "sync_state",
  {
    entity: text("entity").primaryKey(),
    cursor: text("cursor"),
    lastPulledAt: text("last_pulled_at"),
    lastPushedAt: text("last_pushed_at"),
    lastError: text("last_error"),
  },
  (table) => ({
    entityIdx: index("sync_state_entity_idx").on(table.entity),
  }),
);

// ============================================
// 38. GENERIC RECORDS
// ============================================
export const genericRecords = sqliteTable(
  "generic_records",
  {
    id: text("id").primaryKey(),
    remoteId: text("remote_id"),
    entity: text("entity").notNull(),
    data: text("data", { mode: "json" }).notNull(),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(sql`1`),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    entityIdx: index("generic_entity_idx").on(table.entity),
    activeIdx: index("generic_active_idx").on(table.isActive),
  }),
);

// ============================================
// 39. TYPE EXPORTS
// ============================================

export type LocalProduct = typeof products.$inferSelect;
export type LocalProductVariant = typeof productVariants.$inferSelect;
export type LocalCategory = typeof categories.$inferSelect;
export type LocalBrand = typeof brands.$inferSelect;
export type LocalInventory = typeof inventory.$inferSelect;
export type LocalInventoryMovement = typeof inventoryMovements.$inferSelect;
export type LocalInventoryCount = typeof inventoryCounts.$inferSelect;
export type LocalInventoryCountItem = typeof inventoryCountItems.$inferSelect;
export type LocalCustomer = typeof customers.$inferSelect;
export type LocalStore = typeof stores.$inferSelect;
export type LocalStaff = typeof staff.$inferSelect;
export type LocalSupplier = typeof suppliers.$inferSelect;
export type LocalSession = typeof sessions.$inferSelect;
export type LocalOrder = typeof orders.$inferSelect;
export type LocalOrderItem = typeof orderItems.$inferSelect;
export type LocalPriceHistory = typeof priceHistory.$inferSelect;
export type LocalPromotion = typeof promotions.$inferSelect;
export type LocalTaxRate = typeof taxRates.$inferSelect;
export type LocalExpense = typeof expenses.$inferSelect;
export type LocalExpenseCategory = typeof expenseCategories.$inferSelect;
export type LocalCashRegister = typeof cashRegisters.$inferSelect;
export type LocalGiftCard = typeof giftCards.$inferSelect;
export type LocalGiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type LocalWallet = typeof wallets.$inferSelect;
export type LocalWalletTransaction = typeof walletTransactions.$inferSelect;
export type LocalSupplierPayment = typeof supplierPayments.$inferSelect;
export type LocalPurchaseOrder = typeof purchaseOrders.$inferSelect;
export type LocalPurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type LocalStockTransfer = typeof stockTransfers.$inferSelect;
export type LocalStockTransferItem = typeof stockTransferItems.$inferSelect;
export type LocalWebhook = typeof webhooks.$inferSelect;
export type LocalApiKey = typeof apiKeys.$inferSelect;
export type LocalNotification = typeof notifications.$inferSelect;
export type LocalTenantStoreSetting = typeof tenantStoreSettings.$inferSelect;
export type LocalAuditLog = typeof auditLogs.$inferSelect;
export type SyncOutboxItem = typeof syncOutbox.$inferSelect;
export type SyncState = typeof syncState.$inferSelect;
export type GenericRecord = typeof genericRecords.$inferSelect;

// ============================================
// 40. INSERT TYPES
// ============================================

export type InsertProduct = typeof products.$inferInsert;
export type InsertProductVariant = typeof productVariants.$inferInsert;
export type InsertCategory = typeof categories.$inferInsert;
export type InsertBrand = typeof brands.$inferInsert;
export type InsertInventory = typeof inventory.$inferInsert;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;
export type InsertInventoryCount = typeof inventoryCounts.$inferInsert;
export type InsertInventoryCountItem = typeof inventoryCountItems.$inferInsert;
export type InsertCustomer = typeof customers.$inferInsert;
export type InsertStore = typeof stores.$inferInsert;
export type InsertStaff = typeof staff.$inferInsert;
export type InsertSupplier = typeof suppliers.$inferInsert;
export type InsertSession = typeof sessions.$inferInsert;
export type InsertOrder = typeof orders.$inferInsert;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;
export type InsertPromotion = typeof promotions.$inferInsert;
export type InsertTaxRate = typeof taxRates.$inferInsert;
export type InsertExpense = typeof expenses.$inferInsert;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;
export type InsertCashRegister = typeof cashRegisters.$inferInsert;
export type InsertGiftCard = typeof giftCards.$inferInsert;
export type InsertGiftCardTransaction =
  typeof giftCardTransactions.$inferInsert;
export type InsertWallet = typeof wallets.$inferInsert;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;
export type InsertSupplierPayment = typeof supplierPayments.$inferInsert;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type InsertStockTransfer = typeof stockTransfers.$inferInsert;
export type InsertStockTransferItem = typeof stockTransferItems.$inferInsert;
export type InsertWebhook = typeof webhooks.$inferInsert;
export type InsertApiKey = typeof apiKeys.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;
export type InsertTenantStoreSetting = typeof tenantStoreSettings.$inferInsert;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertSyncOutbox = typeof syncOutbox.$inferInsert;
export type InsertSyncState = typeof syncState.$inferInsert;
export type InsertGenericRecord = typeof genericRecords.$inferInsert;

// ============================================
// 41. RELATIONS
// ============================================

export const productsRelations = relations(products, ({ many, one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  variants: many(productVariants),
  inventory: many(inventory),
  orderItems: many(orderItems),
  stockMovements: many(inventoryMovements),
  priceHistory: many(priceHistory),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    inventory: many(inventory),
    orderItems: many(orderItems),
    stockMovements: many(inventoryMovements),
    priceHistory: many(priceHistory),
  }),
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
  store: one(stores, {
    fields: [inventory.storeId],
    references: [stores.id],
  }),
}));

export const inventoryMovementsRelations = relations(
  inventoryMovements,
  ({ one }) => ({
    product: one(products, {
      fields: [inventoryMovements.productId],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [inventoryMovements.variantId],
      references: [productVariants.id],
    }),
    store: one(stores, {
      fields: [inventoryMovements.storeId],
      references: [stores.id],
    }),
  }),
);

export const inventoryCountsRelations = relations(
  inventoryCounts,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [inventoryCounts.storeId],
      references: [stores.id],
    }),
    items: many(inventoryCountItems),
  }),
);

export const inventoryCountItemsRelations = relations(
  inventoryCountItems,
  ({ one }) => ({
    count: one(inventoryCounts, {
      fields: [inventoryCountItems.countId],
      references: [inventoryCounts.id],
    }),
    product: one(products, {
      fields: [inventoryCountItems.productId],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [inventoryCountItems.variantId],
      references: [productVariants.id],
    }),
  }),
);

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  inventory: many(inventory),
  orders: many(orders),
  sessions: many(sessions),
  staff: many(staff),
  suppliers: many(suppliers),
}));

export const staffRelations = relations(staff, ({ one }) => ({
  store: one(stores, {
    fields: [staff.storeId],
    references: [stores.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  store: one(stores, {
    fields: [suppliers.storeId],
    references: [stores.id],
  }),
  products: many(products),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  session: one(sessions, {
    fields: [orders.sessionId],
    references: [sessions.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  product: one(products, {
    fields: [priceHistory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [priceHistory.variantId],
    references: [productVariants.id],
  }),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  tenant: one(tenantStoreSettings, {
    fields: [promotions.tenantId],
    references: [tenantStoreSettings.tenantId],
  }),
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  tenant: one(tenantStoreSettings, {
    fields: [taxRates.tenantId],
    references: [tenantStoreSettings.tenantId],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  store: one(stores, {
    fields: [expenses.storeId],
    references: [stores.id],
  }),
}));

export const expenseCategoriesRelations = relations(
  expenseCategories,
  ({ many }) => ({
    expenses: many(expenses),
  }),
);

export const cashRegistersRelations = relations(cashRegisters, ({ one }) => ({
  store: one(stores, {
    fields: [cashRegisters.storeId],
    references: [stores.id],
  }),
}));

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  customer: one(customers, {
    fields: [giftCards.customerId],
    references: [customers.id],
  }),
  transactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(
  giftCardTransactions,
  ({ one }) => ({
    giftCard: one(giftCards, {
      fields: [giftCardTransactions.giftCardId],
      references: [giftCards.id],
    }),
  }),
);

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  customer: one(customers, {
    fields: [wallets.customerId],
    references: [customers.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
  }),
);

export const supplierPaymentsRelations = relations(
  supplierPayments,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierPayments.supplierId],
      references: [suppliers.id],
    }),
  }),
);

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    items: many(purchaseOrderItems),
  }),
);

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderItems.poId],
      references: [purchaseOrders.id],
    }),
    product: one(products, {
      fields: [purchaseOrderItems.productId],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [purchaseOrderItems.variantId],
      references: [productVariants.id],
    }),
  }),
);

export const stockTransfersRelations = relations(
  stockTransfers,
  ({ one, many }) => ({
    fromStore: one(stores, {
      fields: [stockTransfers.fromStoreId],
      references: [stores.id],
    }),
    toStore: one(stores, {
      fields: [stockTransfers.toStoreId],
      references: [stores.id],
    }),
    items: many(stockTransferItems),
  }),
);

export const stockTransferItemsRelations = relations(
  stockTransferItems,
  ({ one }) => ({
    transfer: one(stockTransfers, {
      fields: [stockTransferItems.transferId],
      references: [stockTransfers.id],
    }),
    product: one(products, {
      fields: [stockTransferItems.productId],
      references: [products.id],
    }),
    variant: one(productVariants, {
      fields: [stockTransferItems.variantId],
      references: [productVariants.id],
    }),
  }),
);

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  tenant: one(tenantStoreSettings, {
    fields: [webhooks.tenantId],
    references: [tenantStoreSettings.tenantId],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenantStoreSettings, {
    fields: [apiKeys.tenantId],
    references: [tenantStoreSettings.tenantId],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenantStoreSettings, {
    fields: [notifications.tenantId],
    references: [tenantStoreSettings.tenantId],
  }),
}));

export const tenantStoreSettingsRelations = relations(
  tenantStoreSettings,
  ({ one }) => ({
    tenant: one(tenantStoreSettings, {
      fields: [tenantStoreSettings.tenantId],
      references: [tenantStoreSettings.tenantId],
    }),
    store: one(stores, {
      fields: [tenantStoreSettings.storeId],
      references: [stores.id],
    }),
  }),
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenantStoreSettings, {
    fields: [auditLogs.tenantId],
    references: [tenantStoreSettings.tenantId],
  }),
}));
// /
