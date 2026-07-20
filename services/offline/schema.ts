import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const tenant = sqliteTable("tenant", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  code: text("code"),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

export const store = sqliteTable("store", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  code: text("code"),
  name: text("name"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxNumber: text("taxNumber"),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

export const category = sqliteTable("category", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  name: text("name"),
  slug: text("slug"),
  description: text("description"),
  parentId: text("parentId"),
  sortOrder: integer("sortOrder"),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

export const product = sqliteTable("product", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  categoryId: text("categoryId").references(() => category.id),
  brandId: text("brandId"),
  supplierId: text("supplierId"),
  sku: text("sku"),
  barcode: text("barcode"),
  name: text("name"),
  description: text("description"),
  costPrice: real("costPrice"),
  sellingPrice: real("sellingPrice"),
  wholesalePrice: real("wholesalePrice"),
  promoPrice: real("promoPrice"),
  promoStartAt: integer("promoStartAt", { mode: "timestamp" }),
  promoEndAt: integer("promoEndAt", { mode: "timestamp" }),
  manufacturingDate: integer("manufacturingDate", { mode: "timestamp" }),
  expiryDate: integer("expiryDate", { mode: "timestamp" }),
  bestBeforeDate: integer("bestBeforeDate", { mode: "timestamp" }),
  isTaxable: integer("isTaxable", { mode: "boolean" }).default(true),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  isReturnable: integer("isReturnable", { mode: "boolean" }).default(true),
  version: integer("version").default(0),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

export const productVariant = sqliteTable("productVariant", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  productId: text("productId")
    .notNull()
    .references(() => product.id),
  name: text("name"),
  sku: text("sku"),
  barcode: text("barcode"),
  price: real("price"),
  costPrice: real("costPrice"),
  color: text("color"),
  size: text("size"),
  weight: real("weight"),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

export const inventory = sqliteTable("inventory", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  storeId: text("storeId")
    .notNull()
    .references(() => store.id),
  productId: text("productId")
    .notNull()
    .references(() => product.id),
  variantId: text("variantId").references(() => productVariant.id),
  quantity: integer("quantity").default(0),
  reservedQty: integer("reservedQty").default(0),
  reorderPoint: integer("reorderPoint").default(10),
  reorderQty: integer("reorderQty").default(0),
  shelfLocation: text("shelfLocation"),
  version: integer("version").default(0),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

// ── Order ──
export const order = sqliteTable("order", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  orderNumber: text("orderNumber"),
  customerId: text("customerId").references(() => customer.id),
  userId: text("userId"),
  sessionId: text("sessionId"),
  storeId: text("storeId").references(() => store.id),
  registerId: text("registerId"),
  status: text("status").default("PENDING"),
  paymentStatus: text("paymentStatus").default("PENDING"),
  subTotal: real("subTotal"),
  taxAmount: real("taxAmount"),
  discountAmount: real("discountAmount"),
  discountPercent: real("discountPercent"),
  grandTotal: real("grandTotal"),
  currencyCode: text("currencyCode").default("USD"),
  paymentMethod: text("paymentMethod").default("CASH"),
  paidAmount: real("paidAmount"),
  changeAmount: real("changeAmount"),
  notes: text("notes"),
  voidReason: text("voidReason"),
  version: integer("version").default(0),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  cancelledAt: integer("cancelledAt", { mode: "timestamp" }),
  syncStatus: text("syncStatus").default("pending"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

export const orderItem = sqliteTable("orderItem", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  orderId: text("orderId")
    .notNull()
    .references(() => order.id),
  productId: text("productId")
    .notNull()
    .references(() => product.id),
  variantId: text("variantId").references(() => productVariant.id),
  quantity: integer("quantity"),
  unitPrice: real("unitPrice"),
  discountPercent: real("discountPercent"),
  discountAmount: real("discountAmount"),
  taxAmount: real("taxAmount"),
  subTotal: real("subTotal"),
  isReturned: integer("isReturned", { mode: "boolean" }).default(false),
  returnedQuantity: integer("returnedQuantity").default(0),
  syncStatus: text("syncStatus").default("pending"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});

// ── Customers (add similar) ──
export const customer = sqliteTable("customer", {
  id: text("id").primaryKey(),
  serverId: text("serverId").unique(),
  tenantId: text("tenantId")
    .notNull()
    .references(() => tenant.id),
  code: text("code"),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  dateOfBirth: integer("dateOfBirth", { mode: "timestamp" }),
  gender: text("gender"),
  loyaltyPoints: integer("loyaltyPoints").default(0),
  totalSpent: real("totalSpent").default(0),
  totalOrders: integer("totalOrders").default(0),
  debtAmount: real("debtAmount").default(0),
  creditLimit: real("creditLimit"),
  tier: text("tier").default("BRONZE"),
  tierValidUntil: integer("tierValidUntil", { mode: "timestamp" }),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  syncStatus: text("syncStatus").default("synced"),
  lastModified: integer("lastModified", { mode: "timestamp" }),
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false),
});
// ── Sync State ──
export const syncState = sqliteTable("syncState", {
  entityType: text("entityType").primaryKey(),
  lastPullAt: integer("lastPullAt", { mode: "timestamp" }),
  lastPushAt: integer("lastPushAt", { mode: "timestamp" }),
});

// ── Sync Log ──
export const syncLog = sqliteTable("syncLog", {
  id: text("id").primaryKey(),
  entityType: text("entityType"),
  entityId: text("entityId"),
  action: text("action"), // 'insert', 'update', 'delete'
  payload: text("payload"), // JSON string
  status: text("status").default("pending"), // 'pending', 'success', 'failed'
  error: text("error"),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  syncedAt: integer("syncedAt", { mode: "timestamp" }),
});
