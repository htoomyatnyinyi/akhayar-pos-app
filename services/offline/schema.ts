// services/offline/schema.ts

import {
  sqliteTable,
  text,
  integer,
  numeric,
  primaryKey,
  index,
  foreignKey,
  unique,
} from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ------------------------------------------------------------------
// ENUMS
// ------------------------------------------------------------------
export type Role = "ADMIN" | "MANAGER" | "CASHIER" | "ACCOUNTANT";
export type Permission =
  | "VIEW_REPORTS"
  | "EDIT_PRICES"
  | "VOID_ORDERS"
  | "MANAGE_STAFF"
  | "MANAGE_INVENTORY"
  | "REFUND_ORDERS"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_PROMOTIONS"
  | "VIEW_ANALYTICS"
  | "MANAGE_API_KEYS"
  | "MANAGE_WEBHOOKS";
export type OrderStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "VOIDED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "HOLD";
export type PaymentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "REFUNDED"
  | "FAILED";
export type PaymentMethod =
  | "CASH"
  | "KBZ_PAY"
  | "CB_PAY"
  | "WAVE_PAY"
  | "CARD"
  | "BANK_TRANSFER"
  | "MIXED_PAYMENT"
  | "GIFT_CARD"
  | "WALLET";
export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
export type CustomerTier =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND";
export type MovementType =
  | "PURCHASE"
  | "SALE"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "EXPIRED"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "OPENING_STOCK"
  | "COUNTING";
export type StockCountStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type TransferStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "CANCELLED"
  | "REJECTED";
export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
export type RegisterStatus = "OPEN" | "CLOSED" | "SUSPENDED" | "MAINTENANCE";
export type SessionStatus = "OPEN" | "CLOSED" | "SUSPENDED";
export type DiscountType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "BUY_X_GET_Y"
  | "FREE_SHIPPING";
export type DiscountApplicability =
  | "ALL_PRODUCTS"
  | "SPECIFIC_PRODUCTS"
  | "SPECIFIC_CATEGORIES"
  | "MINIMUM_PURCHASE";
export type NotificationType =
  | "LOW_STOCK"
  | "EXPIRING_PRODUCT"
  | "ORDER_STATUS"
  | "PROMOTION"
  | "SYSTEM"
  | "INVENTORY_COUNT";
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "PRINT"
  | "VOID"
  | "REFUND"
  | "APPROVE"
  | "REJECT";
export type WalletTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "PAYMENT"
  | "REFUND"
  | "ADJUSTMENT";
export type GiftCardStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
export type GiftCardTransactionType =
  | "ISSUE"
  | "RELOAD"
  | "PAYMENT"
  | "REFUND"
  | "VOID";
export type SyncStatus = "SYNCED" | "PENDING" | "CONFLICT";
export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";
export type DebitCredit = "DEBIT" | "CREDIT";
export type EntryType =
  | "MANUAL"
  | "SALES"
  | "PURCHASE"
  | "PAYMENT"
  | "RECEIPT"
  | "ADJUSTMENT"
  | "TRANSFER";
export type EntryStatus = "DRAFT" | "POSTED" | "REVERSED";

// ------------------------------------------------------------------
// SYNC FIELDS HELPER
// ------------------------------------------------------------------
function syncFields() {
  return {
    serverId: text("server_id").unique(),
    syncStatus: text("sync_status", {
      enum: ["SYNCED", "PENDING", "CONFLICT"],
    }).default("PENDING"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  };
}

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

// ------------------------------------------------------------------
// TABLES
// ------------------------------------------------------------------
export const tenants = sqliteTable("tenants", {
  ...syncFields(),
  id: id(),
  code: text("code").unique().notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  currencyCode: text("currency_code").default("USD"),
});

export const users = sqliteTable(
  "users",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    username: text("username").notNull(),
    email: text("email"),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"] })
      .notNull()
      .default("CASHIER"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
    lastLoginIP: text("last_login_ip"),
    twoFactorSecret: text("two_factor_secret"),
    permissions: text("permissions", { mode: "json" }).$type<Permission[]>(),
  },
  (table) => [
    index("idx_users_tenant").on(table.tenantId),
    index("idx_users_email").on(table.email),
    unique("unq_users_tenant_username").on(table.tenantId, table.username),
  ],
);

export const stores = sqliteTable(
  "stores",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    taxNumber: text("tax_number"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_stores_tenant").on(table.tenantId),
    unique("unq_stores_tenant_code").on(table.tenantId, table.code),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    parentId: text("parent_id"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    sortOrder: integer("sort_order").default(0),
  },
  (table) => [
    foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }),
    index("idx_categories_tenant").on(table.tenantId),
    index("idx_categories_parent").on(table.parentId),
    unique("unq_categories_tenant_slug").on(table.tenantId, table.slug),
  ],
);

export const brands = sqliteTable(
  "brands",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_brands_tenant").on(table.tenantId),
    unique("unq_brands_tenant_name").on(table.tenantId, table.name),
  ],
);

export const suppliers = sqliteTable(
  "suppliers",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    taxId: text("tax_id"),
    paymentTerms: integer("payment_terms"),
    creditLimit: numeric("credit_limit"),
    currentBalance: numeric("current_balance").default("0"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_suppliers_tenant").on(table.tenantId),
    unique("unq_suppliers_tenant_code").on(table.tenantId, table.code),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
    gender: text("gender"),
    loyaltyPoints: integer("loyalty_points").default(0),
    totalSpent: numeric("total_spent").default("0"),
    totalOrders: integer("total_orders").default(0),
    debtAmount: numeric("debt_amount").default("0"),
    creditLimit: numeric("credit_limit"),
    tier: text("tier", {
      enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"],
    }).default("BRONZE"),
    tierValidUntil: integer("tier_valid_until", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_customers_tenant").on(table.tenantId),
    unique("unq_customers_tenant_code").on(table.tenantId, table.code),
    index("idx_customers_phone").on(table.phone),
    index("idx_customers_email").on(table.email),
  ],
);

export const products = sqliteTable(
  "products",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    description: text("description"),
    sku: text("sku"),
    barcode: text("barcode"),
    categoryId: text("category_id").references(() => categories.id),
    brandId: text("brand_id").references(() => brands.id),
    supplierId: text("supplier_id").references(() => suppliers.id),
    costPrice: numeric("cost_price"),
    sellingPrice: numeric("selling_price"),
    wholesalePrice: numeric("wholesale_price"),
    promoPrice: numeric("promo_price"),
    promoStartAt: integer("promo_start_at", { mode: "timestamp" }),
    promoEndAt: integer("promo_end_at", { mode: "timestamp" }),
    isTaxable: integer("is_taxable", { mode: "boolean" }).default(true),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    isReturnable: integer("is_returnable", { mode: "boolean" }).default(true),
    expiryDate: integer("expiry_date", { mode: "timestamp" }),
    manufacturingDate: integer("manufacturing_date", { mode: "timestamp" }),
    bestBeforeDate: integer("best_before_date", { mode: "timestamp" }),
    version: integer("version").default(0),
  },
  (table) => [
    index("idx_products_tenant").on(table.tenantId),
    index("idx_products_category").on(table.categoryId),
    index("idx_products_barcode").on(table.barcode),
    unique("unq_products_tenant_sku").on(table.tenantId, table.sku),
  ],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    ...syncFields(),
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    price: numeric("price").notNull(),
    costPrice: numeric("cost_price").notNull(),
    color: text("color"),
    size: text("size"),
    weight: numeric("weight"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_variants_product").on(table.productId),
    unique("unq_variants_tenant_sku").on(table.tenantId, table.sku),
    unique("unq_variants_product_name").on(table.productId, table.name),
  ],
);

export const lots = sqliteTable(
  "lots",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    number: text("number").notNull(),
    serial: text("serial"),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    remaining: integer("remaining").notNull(),
    expiryDate: integer("expiry_date", { mode: "timestamp" }),
    manufacturingDate: integer("manufacturing_date", { mode: "timestamp" }),
    bestBeforeDate: integer("best_before_date", { mode: "timestamp" }),
  },
  (table) => [
    unique("unq_lots_tenant_number_product_variant").on(
      table.tenantId,
      table.number,
      table.productId,
      table.variantId,
    ),
    index("idx_lots_expiry").on(table.expiryDate),
    index("idx_lots_remaining").on(table.remaining),
  ],
);

export const inventory = sqliteTable(
  "inventory",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    lotId: text("lot_id").references(() => lots.id),
    quantity: integer("quantity").notNull().default(0),
    reservedQty: integer("reserved_qty").default(0),
    reorderPoint: integer("reorder_point").default(10),
    reorderQty: integer("reorder_qty").default(0),
    shelfLocation: text("shelf_location"),
    version: integer("version").default(0),
  },
  (table) => [
    index("idx_inventory_store").on(table.storeId),
    index("idx_inventory_product").on(table.productId),
    unique("unq_inventory_store_product_variant_lot").on(
      table.storeId,
      table.productId,
      table.variantId,
      table.lotId,
    ),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    ...syncFields(),
    id: id(),
    orderNumber: text("order_number").notNull().unique(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    customerId: text("customer_id").references(() => customers.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    sessionId: text("session_id").references(() => sessions.id),
    storeId: text("store_id").references(() => stores.id),
    registerId: text("register_id").references(() => cashRegisters.id),
    status: text("status", {
      enum: [
        "PENDING",
        "COMPLETED",
        "CANCELLED",
        "VOIDED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "HOLD",
      ],
    }).default("PENDING"),
    paymentStatus: text("payment_status", {
      enum: ["PENDING", "PARTIAL", "PAID", "REFUNDED", "FAILED"],
    }).default("PENDING"),
    subTotal: numeric("sub_total").notNull(),
    taxAmount: numeric("tax_amount").default("0"),
    discountAmount: numeric("discount_amount").default("0"),
    discountPercent: numeric("discount_percent").default("0"),
    grandTotal: numeric("grand_total").notNull(),
    currencyCode: text("currency_code").default("USD"),
    paymentMethod: text("payment_method", {
      enum: [
        "CASH",
        "KBZ_PAY",
        "CB_PAY",
        "WAVE_PAY",
        "CARD",
        "BANK_TRANSFER",
        "MIXED_PAYMENT",
        "GIFT_CARD",
        "WALLET",
      ],
    }).default("CASH"),
    paidAmount: numeric("paid_amount").default("0"),
    changeAmount: numeric("change_amount").default("0"),
    notes: text("notes"),
    voidReason: text("void_reason"),
    version: integer("version").default(0),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_orders_tenant").on(table.tenantId),
    index("idx_orders_status_created").on(table.status, table.createdAt),
    index("idx_orders_customer").on(table.customerId),
    index("idx_orders_store").on(table.storeId),
    index("idx_orders_session").on(table.sessionId),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    ...syncFields(),
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price").notNull(),
    discountPercent: numeric("discount_percent").default("0"),
    discountAmount: numeric("discount_amount").default("0"),
    taxAmount: numeric("tax_amount").default("0"),
    subTotal: numeric("sub_total").notNull(),
    isReturned: integer("is_returned", { mode: "boolean" }).default(false),
    returnedQuantity: integer("returned_quantity").default(0),
  },
  (table) => [
    index("idx_order_items_order").on(table.orderId),
    index("idx_order_items_product").on(table.productId),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amount: numeric("amount").notNull(),
    currencyCode: text("currency_code").default("USD"),
    method: text("method", {
      enum: [
        "CASH",
        "KBZ_PAY",
        "CB_PAY",
        "WAVE_PAY",
        "CARD",
        "BANK_TRANSFER",
        "MIXED_PAYMENT",
        "GIFT_CARD",
        "WALLET",
      ],
    }).notNull(),
    referenceNumber: text("reference_number"),
    status: text("status", {
      enum: ["PENDING", "PARTIAL", "PAID", "REFUNDED", "FAILED"],
    }).default("PAID"),
    processedById: text("processed_by_id").references(() => users.id),
    processedAt: integer("processed_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => [
    index("idx_payments_order").on(table.orderId),
    index("idx_payments_reference").on(table.referenceNumber),
  ],
);

export const returns = sqliteTable(
  "returns",
  {
    ...syncFields(),
    id: id(),
    returnNumber: text("return_number").notNull().unique(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    customerId: text("customer_id").references(() => customers.id),
    totalAmount: numeric("total_amount").notNull(),
    refundMethod: text("refund_method", {
      enum: [
        "CASH",
        "KBZ_PAY",
        "CB_PAY",
        "WAVE_PAY",
        "CARD",
        "BANK_TRANSFER",
        "MIXED_PAYMENT",
        "GIFT_CARD",
        "WALLET",
      ],
    }).notNull(),
    refundStatus: text("refund_status", {
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
    }).default("PENDING"),
    reason: text("reason").notNull(),
    approvedById: text("approved_by_id").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_returns_order").on(table.orderId),
    index("idx_returns_customer").on(table.customerId),
  ],
);

export const returnItems = sqliteTable(
  "return_items",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    returnId: text("return_id")
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id),
    quantity: integer("quantity").notNull(),
    refundAmount: numeric("refund_amount").notNull(),
    reason: text("reason"),
  },
  (table) => [
    unique("unq_return_items_return_order_item").on(
      table.returnId,
      table.orderItemId,
    ),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    registerId: text("register_id").references(() => cashRegisters.id),
    storeId: text("store_id").references(() => stores.id),
    status: text("status", { enum: ["OPEN", "CLOSED", "SUSPENDED"] }).default(
      "OPEN",
    ),
    openedAt: integer("opened_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    closedAt: integer("closed_at", { mode: "timestamp" }),
    openingBalance: numeric("opening_balance").default("0"),
    closingBalance: numeric("closing_balance"),
    expectedBalance: numeric("expected_balance"),
    discrepancy: numeric("discrepancy"),
    cashSales: numeric("cash_sales").default("0"),
    cardSales: numeric("card_sales").default("0"),
    digitalSales: numeric("digital_sales").default("0"),
    notes: text("notes"),
  },
  (table) => [
    index("idx_sessions_user_status").on(table.userId, table.status),
    index("idx_sessions_store").on(table.storeId),
  ],
);

export const cashRegisters = sqliteTable(
  "cash_registers",
  {
    ...syncFields(),
    id: id(),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    status: text("status", {
      enum: ["OPEN", "CLOSED", "SUSPENDED", "MAINTENANCE"],
    }).default("CLOSED"),
  },
  (table) => [
    index("idx_cash_registers_store_status").on(table.storeId, table.status),
  ],
);

export const promotions = sqliteTable(
  "promotions",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    discountType: text("discount_type", {
      enum: ["PERCENTAGE", "FIXED_AMOUNT", "BUY_X_GET_Y", "FREE_SHIPPING"],
    }).notNull(),
    discountValue: numeric("discount_value").notNull(),
    minPurchase: numeric("min_purchase"),
    minQuantity: integer("min_quantity"),
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }).notNull(),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").default(0),
    perUserLimit: integer("per_user_limit"),
    applicableTo: text("applicable_to", {
      enum: [
        "ALL_PRODUCTS",
        "SPECIFIC_PRODUCTS",
        "SPECIFIC_CATEGORIES",
        "MINIMUM_PURCHASE",
      ],
    }).default("ALL_PRODUCTS"),
    priority: integer("priority").default(0),
    stackable: integer("stackable", { mode: "boolean" }).default(false),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_promotions_tenant").on(table.tenantId),
    index("idx_promotions_code").on(table.code),
    index("idx_promotions_dates").on(table.startDate, table.endDate),
  ],
);

export const promotionProducts = sqliteTable(
  "promotion_products",
  {
    promotionId: text("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.promotionId, table.productId] }),
    index("idx_promo_products_product").on(table.productId),
  ],
);

export const promotionCategories = sqliteTable(
  "promotion_categories",
  {
    promotionId: text("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.promotionId, table.categoryId] }),
    index("idx_promo_categories_category").on(table.categoryId),
  ],
);

export const taxZones = sqliteTable(
  "tax_zones",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    description: text("description"),
  },
  (table) => [
    unique("unq_tax_zones_tenant_name").on(table.tenantId, table.name),
  ],
);

export const taxRates = sqliteTable(
  "tax_rates",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    taxZoneId: text("tax_zone_id").references(() => taxZones.id),
    name: text("name").notNull(),
    rate: numeric("rate").notNull(),
    isCompound: integer("is_compound", { mode: "boolean" }).default(false),
    appliesTo: text("applies_to", { mode: "json" }).$type<string[]>(),
    validFrom: integer("valid_from", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    validTo: integer("valid_to", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    index("idx_tax_rates_tenant").on(table.tenantId),
    index("idx_tax_rates_zone").on(table.taxZoneId),
  ],
);

export const taxRules = sqliteTable(
  "tax_rules",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    description: text("description"),
    condition: text("condition", { mode: "json" }).notNull(),
    taxRateId: text("tax_rate_id")
      .notNull()
      .references(() => taxRates.id),
    priority: integer("priority").default(0),
  },
  (table) => [
    index("idx_tax_rules_tenant").on(table.tenantId),
    index("idx_tax_rules_rate").on(table.taxRateId),
  ],
);

export const expenseCategories = sqliteTable(
  "expense_categories",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  },
  (table) => [
    unique("unq_expense_categories_tenant_name").on(table.tenantId, table.name),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    storeId: text("store_id").references(() => stores.id),
    categoryId: text("category_id").references(() => expenseCategories.id),
    amount: numeric("amount").notNull(),
    currencyCode: text("currency_code").default("USD"),
    description: text("description"),
    receiptUrl: text("receipt_url"),
    expenseDate: integer("expense_date", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    createdById: text("created_by_id").references(() => users.id),
  },
  (table) => [
    index("idx_expenses_tenant_date").on(table.tenantId, table.expenseDate),
    index("idx_expenses_category").on(table.categoryId),
    index("idx_expenses_store").on(table.storeId),
  ],
);

export const stockMovements = sqliteTable(
  "stock_movements",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    storeId: text("store_id").references(() => stores.id),
    userId: text("user_id").references(() => users.id),
    quantity: integer("quantity").notNull(),
    previousStock: integer("previous_stock").notNull(),
    newStock: integer("new_stock").notNull(),
    type: text("type", {
      enum: [
        "PURCHASE",
        "SALE",
        "RETURN_IN",
        "RETURN_OUT",
        "ADJUSTMENT",
        "DAMAGE",
        "EXPIRED",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "OPENING_STOCK",
        "COUNTING",
      ],
    }).notNull(),
    referenceId: text("reference_id"),
    referenceType: text("reference_type"),
    reason: text("reason"),
  },
  (table) => [
    index("idx_stock_movements_product").on(table.productId),
    index("idx_stock_movements_reference").on(
      table.referenceId,
      table.referenceType,
    ),
    index("idx_stock_movements_store").on(table.storeId),
    index("idx_stock_movements_tenant").on(table.tenantId),
  ],
);

export const purchaseOrders = sqliteTable(
  "purchase_orders",
  {
    ...syncFields(),
    id: id(),
    poNumber: text("po_number").notNull().unique(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    supplierId: text("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    status: text("status", {
      enum: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "ORDERED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CANCELLED",
      ],
    }).default("DRAFT"),
    orderDate: integer("order_date", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    expectedDate: integer("expected_date", { mode: "timestamp" }),
    receivedDate: integer("received_date", { mode: "timestamp" }),
    subTotal: numeric("sub_total").notNull(),
    taxAmount: numeric("tax_amount").default("0"),
    grandTotal: numeric("grand_total").notNull(),
    currencyCode: text("currency_code").default("USD"),
    createdById: text("created_by_id").references(() => users.id),
    notes: text("notes"),
  },
  (table) => [
    index("idx_po_tenant").on(table.tenantId),
    index("idx_po_supplier_status").on(table.supplierId, table.status),
  ],
);

export const purchaseOrderItems = sqliteTable(
  "purchase_order_items",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    poId: text("po_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost").notNull(),
    totalCost: numeric("total_cost").notNull(),
    receivedQuantity: integer("received_quantity").default(0),
  },
  (table) => [
    unique("unq_po_items_po_product_variant").on(
      table.poId,
      table.productId,
      table.variantId,
    ),
  ],
);

export const stockTransfers = sqliteTable(
  "stock_transfers",
  {
    ...syncFields(),
    id: id(),
    transferNumber: text("transfer_number").notNull().unique(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    fromStoreId: text("from_store_id")
      .notNull()
      .references(() => stores.id),
    toStoreId: text("to_store_id")
      .notNull()
      .references(() => stores.id),
    status: text("status", {
      enum: [
        "PENDING",
        "APPROVED",
        "IN_TRANSIT",
        "RECEIVED",
        "CANCELLED",
        "REJECTED",
      ],
    }).default("PENDING"),
    requestedById: text("requested_by_id").references(() => users.id),
    approvedById: text("approved_by_id").references(() => users.id),
    requestedAt: integer("requested_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    notes: text("notes"),
  },
  (table) => [
    index("idx_transfers_tenant").on(table.tenantId),
    index("idx_transfers_status").on(table.status),
  ],
);

export const stockTransferItems = sqliteTable(
  "stock_transfer_items",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    transferId: text("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    variantId: text("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
    receivedQuantity: integer("received_quantity"),
  },
  (table) => [
    unique("unq_transfer_items_transfer_product_variant").on(
      table.transferId,
      table.productId,
      table.variantId,
    ),
  ],
);

export const storeSettings = sqliteTable(
  "store_settings",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    storeId: text("store_id").references(() => stores.id),
    settingKey: text("setting_key").notNull(),
    settingValue: text("setting_value", { mode: "json" }).notNull(),
    description: text("description"),
    updatedById: text("updated_by_id").references(() => users.id),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => [
    unique("unq_store_settings_store_key").on(table.storeId, table.settingKey),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action", {
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "RESTORE",
        "LOGIN",
        "LOGOUT",
        "EXPORT",
        "PRINT",
        "VOID",
        "REFUND",
        "APPROVE",
        "REJECT",
      ],
    }).notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    oldData: text("old_data", { mode: "json" }),
    newData: text("new_data", { mode: "json" }),
    changes: text("changes", { mode: "json" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("idx_audit_entity").on(table.entity, table.entityId),
    index("idx_audit_user_created").on(table.userId, table.createdAt),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type", {
      enum: [
        "LOW_STOCK",
        "EXPIRING_PRODUCT",
        "ORDER_STATUS",
        "PROMOTION",
        "SYSTEM",
        "INVENTORY_COUNT",
      ],
    }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).default(false),
    readAt: integer("read_at", { mode: "timestamp" }),
    metadata: text("metadata", { mode: "json" }),
  },
  (table) => [
    index("idx_notifications_user_read").on(table.userId, table.isRead),
    index("idx_notifications_created").on(table.createdAt),
  ],
);

export const customerWallets = sqliteTable(
  "customer_wallets",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    customerId: text("customer_id")
      .notNull()
      .unique()
      .references(() => customers.id),
    balance: numeric("balance").default("0"),
  },
  (table) => [index("idx_wallets_tenant").on(table.tenantId)],
);

export const walletTransactions = sqliteTable(
  "wallet_transactions",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    walletId: text("wallet_id")
      .notNull()
      .references(() => customerWallets.id),
    amount: numeric("amount").notNull(),
    type: text("type", {
      enum: ["DEPOSIT", "WITHDRAWAL", "PAYMENT", "REFUND", "ADJUSTMENT"],
    }).notNull(),
    referenceId: text("reference_id"),
    description: text("description"),
  },
  (table) => [
    index("idx_wallet_txn_wallet").on(table.walletId),
    index("idx_wallet_txn_tenant").on(table.tenantId),
  ],
);

export const giftCards = sqliteTable(
  "gift_cards",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    customerId: text("customer_id").references(() => customers.id),
    cardNumber: text("card_number").notNull().unique(),
    pinCode: text("pin_code"),
    initialAmount: numeric("initial_amount").notNull(),
    currentBalance: numeric("current_balance").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    status: text("status", {
      enum: ["ACTIVE", "USED", "EXPIRED", "CANCELLED"],
    }).default("ACTIVE"),
  },
  (table) => [
    index("idx_gift_cards_tenant").on(table.tenantId),
    index("idx_gift_cards_status_expiry").on(table.status, table.expiresAt),
  ],
);

export const giftCardTransactions = sqliteTable(
  "gift_card_transactions",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    giftCardId: text("gift_card_id")
      .notNull()
      .references(() => giftCards.id),
    amount: numeric("amount").notNull(),
    type: text("type", {
      enum: ["ISSUE", "RELOAD", "PAYMENT", "REFUND", "VOID"],
    }).notNull(),
    referenceId: text("reference_id"),
  },
  (table) => [
    index("idx_gc_txn_card").on(table.giftCardId),
    index("idx_gc_txn_tenant").on(table.tenantId),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    parentId: text("parent_id"),
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type", {
      enum: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
    }).notNull(),
    subType: text("sub_type"),
    description: text("description"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    isSystem: integer("is_system", { mode: "boolean" }).default(false),
  },
  (table) => [
    foreignKey({ columns: [table.parentId], foreignColumns: [table.id] }),
    unique("unq_accounts_tenant_code").on(table.tenantId, table.code),
    index("idx_accounts_tenant").on(table.tenantId),
  ],
);

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    ...syncFields(),
    id: id(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    entryNumber: text("entry_number").notNull().unique(),
    date: integer("date", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    description: text("description"),
    reference: text("reference"),
    entryType: text("entry_type", {
      enum: [
        "MANUAL",
        "SALES",
        "PURCHASE",
        "PAYMENT",
        "RECEIPT",
        "ADJUSTMENT",
        "TRANSFER",
      ],
    }).default("MANUAL"),
    status: text("status", { enum: ["DRAFT", "POSTED", "REVERSED"] }).default(
      "DRAFT",
    ),
    orderId: text("order_id").references(() => orders.id),
    paymentId: text("payment_id").references(() => payments.id),
  },
  (table) => [
    index("idx_je_date").on(table.date),
    index("idx_je_tenant_date").on(table.tenantId, table.date),
    index("idx_je_order").on(table.orderId),
  ],
);

export const journalLines = sqliteTable(
  "journal_lines",
  {
    ...syncFields(),
    id: id(),
    journalId: text("journal_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    amount: numeric("amount").notNull(),
    currencyCode: text("currency_code").default("USD"),
    exchangeRate: numeric("exchange_rate").default("1"),
    side: text("side", { enum: ["DEBIT", "CREDIT"] }).notNull(),
    description: text("description"),
  },
  (table) => [
    index("idx_journal_lines_journal").on(table.journalId),
    index("idx_journal_lines_account").on(table.accountId),
  ],
);

// ------------------------------------------------------------------
// RELATIONS
// ------------------------------------------------------------------
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  stores: many(stores),
  categories: many(categories),
  brands: many(brands),
  suppliers: many(suppliers),
  customers: many(customers),
  products: many(products),
  orders: many(orders),
  payments: many(payments),
  returns: many(returns),
  sessions: many(sessions),
  cashRegisters: many(cashRegisters),
  promotions: many(promotions),
  taxZones: many(taxZones),
  taxRates: many(taxRates),
  taxRules: many(taxRules),
  expenses: many(expenses),
  expenseCategories: many(expenseCategories),
  purchaseOrders: many(purchaseOrders),
  stockTransfers: many(stockTransfers),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  storeSettings: many(storeSettings),
  inventory: many(inventory),
  productVariants: many(productVariants),
  lots: many(lots),
  customerWallets: many(customerWallets),
  giftCards: many(giftCards),
  accounts: many(accounts),
  journalEntries: many(journalEntries),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  orders: many(orders),
  sessions: many(sessions),
  payments: many(payments),
  stockMovements: many(stockMovements),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  purchaseOrders: many(purchaseOrders, { relationName: "createdBy" }),
  stockTransfersRequested: many(stockTransfers, {
    relationName: "requestedBy",
  }),
  stockTransfersApproved: many(stockTransfers, { relationName: "approvedBy" }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  tenant: one(tenants, { fields: [stores.tenantId], references: [tenants.id] }),
  inventory: many(inventory),
  orders: many(orders),
  sessions: many(sessions),
  cashRegisters: many(cashRegisters),
  expenses: many(expenses),
  stockTransfersFrom: many(stockTransfers, { relationName: "fromStore" }),
  stockTransfersTo: many(stockTransfers, { relationName: "toStore" }),
  storeSettings: many(storeSettings),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [categories.tenantId],
    references: [tenants.id],
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
  promotionCategories: many(promotionCategories),
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  tenant: one(tenants, { fields: [brands.tenantId], references: [tenants.id] }),
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  products: many(products),
  purchaseOrders: many(purchaseOrders),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  orders: many(orders),
  returns: many(returns),
  wallet: one(customerWallets),
  giftCards: many(giftCards),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  variants: many(productVariants),
  inventory: many(inventory),
  orderItems: many(orderItems),
  stockMovements: many(stockMovements),
  purchaseOrderItems: many(purchaseOrderItems),
  promotionProducts: many(promotionProducts),
  stockTransferItems: many(stockTransferItems),
  lots: many(lots),
}));

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    tenant: one(tenants, {
      fields: [productVariants.tenantId],
      references: [tenants.id],
    }),
    inventory: many(inventory),
    orderItems: many(orderItems),
    stockMovements: many(stockMovements),
    purchaseOrderItems: many(purchaseOrderItems),
    stockTransferItems: many(stockTransferItems),
    lots: many(lots),
  }),
);

export const lotsRelations = relations(lots, ({ one, many }) => ({
  tenant: one(tenants, { fields: [lots.tenantId], references: [tenants.id] }),
  product: one(products, {
    fields: [lots.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [lots.variantId],
    references: [productVariants.id],
  }),
  inventory: many(inventory),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventory.tenantId],
    references: [tenants.id],
  }),
  store: one(stores, { fields: [inventory.storeId], references: [stores.id] }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
  lot: one(lots, { fields: [inventory.lotId], references: [lots.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  session: one(sessions, {
    fields: [orders.sessionId],
    references: [sessions.id],
  }),
  register: one(cashRegisters, {
    fields: [orders.registerId],
    references: [cashRegisters.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  returns: many(returns),
  journalEntries: many(journalEntries),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  processedBy: one(users, {
    fields: [payments.processedById],
    references: [users.id],
  }),
  journalEntries: many(journalEntries),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [returns.tenantId],
    references: [tenants.id],
  }),
  order: one(orders, { fields: [returns.orderId], references: [orders.id] }),
  customer: one(customers, {
    fields: [returns.customerId],
    references: [customers.id],
  }),
  approvedBy: one(users, {
    fields: [returns.approvedById],
    references: [users.id],
  }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [returnItems.tenantId],
    references: [tenants.id],
  }),
  return: one(returns, {
    fields: [returnItems.returnId],
    references: [returns.id],
  }),
  orderItem: one(orderItems, {
    fields: [returnItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  register: one(cashRegisters, {
    fields: [sessions.registerId],
    references: [cashRegisters.id],
  }),
  store: one(stores, { fields: [sessions.storeId], references: [stores.id] }),
  orders: many(orders),
}));

export const cashRegistersRelations = relations(
  cashRegisters,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [cashRegisters.storeId],
      references: [stores.id],
    }),
    tenant: one(tenants, {
      fields: [cashRegisters.tenantId],
      references: [tenants.id],
    }),
    sessions: many(sessions),
    orders: many(orders),
  }),
);

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [promotions.tenantId],
    references: [tenants.id],
  }),
  products: many(promotionProducts),
  categories: many(promotionCategories),
}));

export const promotionProductsRelations = relations(
  promotionProducts,
  ({ one }) => ({
    promotion: one(promotions, {
      fields: [promotionProducts.promotionId],
      references: [promotions.id],
    }),
    product: one(products, {
      fields: [promotionProducts.productId],
      references: [products.id],
    }),
  }),
);

export const promotionCategoriesRelations = relations(
  promotionCategories,
  ({ one }) => ({
    promotion: one(promotions, {
      fields: [promotionCategories.promotionId],
      references: [promotions.id],
    }),
    category: one(categories, {
      fields: [promotionCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const taxZonesRelations = relations(taxZones, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [taxZones.tenantId],
    references: [tenants.id],
  }),
  taxRates: many(taxRates),
}));

export const taxRatesRelations = relations(taxRates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [taxRates.tenantId],
    references: [tenants.id],
  }),
  taxZone: one(taxZones, {
    fields: [taxRates.taxZoneId],
    references: [taxZones.id],
  }),
  rules: many(taxRules),
}));

export const taxRulesRelations = relations(taxRules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [taxRules.tenantId],
    references: [tenants.id],
  }),
  taxRate: one(taxRates, {
    fields: [taxRules.taxRateId],
    references: [taxRates.id],
  }),
}));

export const expenseCategoriesRelations = relations(
  expenseCategories,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [expenseCategories.tenantId],
      references: [tenants.id],
    }),
    expenses: many(expenses),
  }),
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [expenses.tenantId],
    references: [tenants.id],
  }),
  store: one(stores, { fields: [expenses.storeId], references: [stores.id] }),
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  createdBy: one(users, {
    fields: [expenses.createdById],
    references: [users.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stockMovements.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [stockMovements.variantId],
    references: [productVariants.id],
  }),
  store: one(stores, {
    fields: [stockMovements.storeId],
    references: [stores.id],
  }),
  user: one(users, { fields: [stockMovements.userId], references: [users.id] }),
}));

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [purchaseOrders.tenantId],
      references: [tenants.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    createdBy: one(users, {
      fields: [purchaseOrders.createdById],
      references: [users.id],
      relationName: "createdBy",
    }),
    items: many(purchaseOrderItems),
  }),
);

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [purchaseOrderItems.tenantId],
      references: [tenants.id],
    }),
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
    tenant: one(tenants, {
      fields: [stockTransfers.tenantId],
      references: [tenants.id],
    }),
    fromStore: one(stores, {
      fields: [stockTransfers.fromStoreId],
      references: [stores.id],
      relationName: "fromStore",
    }),
    toStore: one(stores, {
      fields: [stockTransfers.toStoreId],
      references: [stores.id],
      relationName: "toStore",
    }),
    requestedBy: one(users, {
      fields: [stockTransfers.requestedById],
      references: [users.id],
      relationName: "requestedBy",
    }),
    approvedBy: one(users, {
      fields: [stockTransfers.approvedById],
      references: [users.id],
      relationName: "approvedBy",
    }),
    items: many(stockTransferItems),
  }),
);

export const stockTransferItemsRelations = relations(
  stockTransferItems,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [stockTransferItems.tenantId],
      references: [tenants.id],
    }),
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

export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [storeSettings.tenantId],
    references: [tenants.id],
  }),
  store: one(stores, {
    fields: [storeSettings.storeId],
    references: [stores.id],
  }),
  updatedBy: one(users, {
    fields: [storeSettings.updatedById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const customerWalletsRelations = relations(
  customerWallets,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [customerWallets.tenantId],
      references: [tenants.id],
    }),
    customer: one(customers, {
      fields: [customerWallets.customerId],
      references: [customers.id],
    }),
    transactions: many(walletTransactions),
  }),
);

export const walletTransactionsRelations = relations(
  walletTransactions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [walletTransactions.tenantId],
      references: [tenants.id],
    }),
    wallet: one(customerWallets, {
      fields: [walletTransactions.walletId],
      references: [customerWallets.id],
    }),
  }),
);

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [giftCards.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [giftCards.customerId],
    references: [customers.id],
  }),
  transactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(
  giftCardTransactions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [giftCardTransactions.tenantId],
      references: [tenants.id],
    }),
    giftCard: one(giftCards, {
      fields: [giftCardTransactions.giftCardId],
      references: [giftCards.id],
    }),
  }),
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [accounts.tenantId],
    references: [tenants.id],
  }),
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
  }),
  children: many(accounts),
  journalLines: many(journalLines),
}));

export const journalEntriesRelations = relations(
  journalEntries,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [journalEntries.tenantId],
      references: [tenants.id],
    }),
    order: one(orders, {
      fields: [journalEntries.orderId],
      references: [orders.id],
    }),
    payment: one(payments, {
      fields: [journalEntries.paymentId],
      references: [payments.id],
    }),
    lines: many(journalLines),
  }),
);

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  journal: one(journalEntries, {
    fields: [journalLines.journalId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalLines.accountId],
    references: [accounts.id],
  }),
}));

// import {
//   sqliteTable,
//   text,
//   integer,
//   real,
//   primaryKey,
// } from "drizzle-orm/sqlite-core";

// export const tenant = sqliteTable("tenant", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   code: text("code"),
//   name: text("name"),
//   email: text("email"),
//   phone: text("phone"),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// export const store = sqliteTable("store", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   code: text("code"),
//   name: text("name"),
//   address: text("address"),
//   phone: text("phone"),
//   email: text("email"),
//   taxNumber: text("taxNumber"),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// export const category = sqliteTable("category", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   name: text("name"),
//   slug: text("slug"),
//   description: text("description"),
//   parentId: text("parentId"),
//   sortOrder: integer("sortOrder"),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// export const product = sqliteTable("product", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   categoryId: text("categoryId").references(() => category.id),
//   brandId: text("brandId"),
//   supplierId: text("supplierId"),
//   sku: text("sku"),
//   barcode: text("barcode"),
//   name: text("name"),
//   description: text("description"),
//   costPrice: real("costPrice"),
//   sellingPrice: real("sellingPrice"),
//   wholesalePrice: real("wholesalePrice"),
//   promoPrice: real("promoPrice"),
//   promoStartAt: integer("promoStartAt"),
//   promoEndAt: integer("promoEndAt"),
//   manufacturingDate: integer("manufacturingDate"),
//   expiryDate: integer("expiryDate"),
//   bestBeforeDate: integer("bestBeforeDate"),
//   isTaxable: integer("isTaxable", { mode: "boolean" }).default(true),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   isReturnable: integer("isReturnable", { mode: "boolean" }).default(true),
//   version: integer("version").default(0),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// export const productVariant = sqliteTable("productVariant", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   productId: text("productId")
//     .notNull()
//     .references(() => product.id),
//   name: text("name"),
//   sku: text("sku"),
//   barcode: text("barcode"),
//   price: real("price"),
//   costPrice: real("costPrice"),
//   color: text("color"),
//   size: text("size"),
//   weight: real("weight"),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// export const inventory = sqliteTable("inventory", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   storeId: text("storeId")
//     .notNull()
//     .references(() => store.id),
//   productId: text("productId")
//     .notNull()
//     .references(() => product.id),
//   variantId: text("variantId").references(() => productVariant.id),
//   quantity: integer("quantity").default(0),
//   reservedQty: integer("reservedQty").default(0),
//   reorderPoint: integer("reorderPoint").default(10),
//   reorderQty: integer("reorderQty").default(0),
//   shelfLocation: text("shelfLocation"),
//   version: integer("version").default(0),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// // ── Order ──
// export const order = sqliteTable("order", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   orderNumber: text("orderNumber"),
//   customerId: text("customerId").references(() => customer.id),
//   userId: text("userId"),
//   sessionId: text("sessionId"),
//   storeId: text("storeId").references(() => store.id),
//   registerId: text("registerId"),
//   status: text("status").default("PENDING"),
//   paymentStatus: text("paymentStatus").default("PENDING"),
//   subTotal: real("subTotal"),
//   taxAmount: real("taxAmount"),
//   discountAmount: real("discountAmount"),
//   discountPercent: real("discountPercent"),
//   grandTotal: real("grandTotal"),
//   currencyCode: text("currencyCode").default("USD"),
//   paymentMethod: text("paymentMethod").default("CASH"),
//   paidAmount: real("paidAmount"),
//   changeAmount: real("changeAmount"),
//   notes: text("notes"),
//   voidReason: text("voidReason"),
//   version: integer("version").default(0),
//   completedAt: integer("completedAt"),
//   cancelledAt: integer("cancelledAt"),
//   syncStatus: text("syncStatus").default("pending"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// export const orderItem = sqliteTable("orderItem", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   orderId: text("orderId")
//     .notNull()
//     .references(() => order.id),
//   productId: text("productId")
//     .notNull()
//     .references(() => product.id),
//   variantId: text("variantId").references(() => productVariant.id),
//   quantity: integer("quantity"),
//   unitPrice: real("unitPrice"),
//   discountPercent: real("discountPercent"),
//   discountAmount: real("discountAmount"),
//   taxAmount: real("taxAmount"),
//   subTotal: real("subTotal"),
//   isReturned: integer("isReturned", { mode: "boolean" }).default(false),
//   returnedQuantity: integer("returnedQuantity").default(0),
//   syncStatus: text("syncStatus").default("pending"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// // ── Customers (add similar) ──
// export const customer = sqliteTable("customer", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   code: text("code"),
//   name: text("name"),
//   phone: text("phone"),
//   email: text("email"),
//   address: text("address"),
//   dateOfBirth: integer("dateOfBirth"),
//   gender: text("gender"),
//   loyaltyPoints: integer("loyaltyPoints").default(0),
//   totalSpent: real("totalSpent").default(0),
//   totalOrders: integer("totalOrders").default(0),
//   debtAmount: real("debtAmount").default(0),
//   creditLimit: real("creditLimit"),
//   tier: text("tier").default("BRONZE"),
//   tierValidUntil: integer("tierValidUntil"),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// // ── Supplier ──
// export const supplier = sqliteTable("supplier", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   code: text("code"),
//   name: text("name"),
//   contactName: text("contactName"),
//   phone: text("phone"),
//   email: text("email"),
//   address: text("address"),
//   taxId: text("taxId"),
//   paymentTerms: text("paymentTerms"),
//   creditLimit: real("creditLimit"),
//   currentBalance: real("currentBalance").default(0),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });
// // ── Staff ──
// export const staff = sqliteTable("staff", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   storeId: text("storeId").references(() => store.id),
//   username: text("username"),
//   email: text("email"),
//   name: text("name"),
//   role: text("role"),
//   permissions: text("permissions"), // JSON string array
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// // ── Session ──
// export const session = sqliteTable("session", {
//   id: text("id").primaryKey(),
//   serverId: text("serverId").unique(),
//   tenantId: text("tenantId")
//     .notNull()
//     .references(() => tenant.id),
//   storeId: text("storeId").references(() => store.id),
//   registerId: text("registerId"),
//   userId: text("userId").references(() => staff.id),
//   status: text("status").default("OPEN"),
//   openingBalance: real("openingBalance").default(0),
//   closingBalance: real("closingBalance").default(0),
//   cashCount: real("cashCount").default(0),
//   notes: text("notes"),
//   openedAt: integer("openedAt"),
//   closedAt: integer("closedAt"),
//   isActive: integer("isActive", { mode: "boolean" }).default(true),
//   syncStatus: text("syncStatus").default("synced"),
//   lastModified: integer("lastModified"),
//   isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
// });

// // ── Sync State ──
// export const syncState = sqliteTable("syncState", {
//   entityType: text("entityType").primaryKey(),
//   lastPullAt: integer("lastPullAt"),
//   lastPushAt: integer("lastPushAt"),
// });

// // ── Sync Log ──
// export const syncLog = sqliteTable("syncLog", {
//   id: text("id").primaryKey(),
//   entityType: text("entityType"),
//   entityId: text("entityId"),
//   action: text("action"), // 'insert', 'update', 'delete'
//   payload: text("payload"), // JSON string
//   status: text("status").default("pending"), // 'pending', 'success', 'failed'
//   error: text("error"),
//   createdAt: integer("createdAt"),
//   syncedAt: integer("syncedAt"),
// });
