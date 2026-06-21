import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const syncEntities = ["products", "orders", "customers", "categories", "inventory"] as const;
export type SyncEntity = (typeof syncEntities)[number];

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    storeId: text("store_id"),
    sku: text("sku").notNull(),
    barcode: text("barcode"),
    name: text("name").notNull(),
    description: text("description"),
    brand: text("brand"),
    categoryId: text("category_id"),
    categoryName: text("category_name"),
    supplierId: text("supplier_id"),
    costPrice: real("cost_price").notNull().default(0),
    sellingPrice: real("selling_price").notNull().default(0),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    version: integer("version").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    deletedAt: text("deleted_at"),
    syncStatus: text("sync_status").notNull().default("synced"),
    syncError: text("sync_error"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSyncedAt: text("last_synced_at"),
  },
  (table) => ({
    skuIdx: uniqueIndex("products_tenant_sku_idx").on(table.tenantId, table.sku),
    barcodeIdx: uniqueIndex("products_tenant_barcode_idx").on(table.tenantId, table.barcode),
  }),
);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  remoteId: text("remote_id").unique(),
  tenantId: text("tenant_id"),
  storeId: text("store_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  parentId: text("parent_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  syncStatus: text("sync_status").notNull().default("synced"),
  syncError: text("sync_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at"),
});

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  remoteId: text("remote_id").unique(),
  tenantId: text("tenant_id"),
  code: text("code").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
  totalOrders: integer("total_orders").notNull().default(0),
  tier: text("tier").notNull().default("BRONZE"),
  tierValidUntil: text("tier_valid_until"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  syncStatus: text("sync_status").notNull().default("synced"),
  syncError: text("sync_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at"),
});

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  remoteId: text("remote_id").unique(),
  tenantId: text("tenant_id"),
  code: text("code").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxNumber: text("tax_number"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  syncStatus: text("sync_status").notNull().default("synced"),
  syncError: text("sync_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  remoteId: text("remote_id").unique(),
  tenantId: text("tenant_id"),
  storeId: text("store_id"),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("OPEN"),
  openedAt: text("opened_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at"),
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  remoteId: text("remote_id").unique(),
  tenantId: text("tenant_id"),
  storeId: text("store_id"),
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
  syncStatus: text("sync_status").notNull().default("pending"),
  syncError: text("sync_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at"),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name"),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  discountAmount: real("discount_amount").notNull().default(0),
  subTotal: real("sub_total").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const syncOutbox = sqliteTable("sync_outbox", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  operation: text("operation").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: text("next_attempt_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const syncState = sqliteTable("sync_state", {
  entity: text("entity").primaryKey(),
  cursor: text("cursor"),
  lastPulledAt: text("last_pulled_at"),
  lastPushedAt: text("last_pushed_at"),
  lastError: text("last_error"),
});

export const genericRecords = sqliteTable("generic_records", {
  id: text("id").primaryKey(),
  remoteId: text("remote_id"),
  entity: text("entity").notNull(),
  data: text("data", { mode: "json" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  syncStatus: text("sync_status").notNull().default("synced"),
  syncError: text("sync_error"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: text("last_synced_at"),
});

export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export type LocalProduct = typeof products.$inferSelect;
export type LocalCategory = typeof categories.$inferSelect;
export type LocalCustomer = typeof customers.$inferSelect;
export type LocalStore = typeof stores.$inferSelect;
export type LocalSession = typeof sessions.$inferSelect;
export type LocalOrder = typeof orders.$inferSelect;
export type LocalOrderItem = typeof orderItems.$inferSelect;
export type SyncOutboxItem = typeof syncOutbox.$inferSelect;
export type GenericRecord = typeof genericRecords.$inferSelect;
