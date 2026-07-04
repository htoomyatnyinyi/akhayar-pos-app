import { and, eq, inArray, lte, or, sql, desc } from "drizzle-orm";
import { getOfflineDb, getSqliteDatabase } from "./db";
import { createLocalId } from "./ids";
import {
  categories,
  customers,
  genericRecords,
  inventoryMovements,
  inventoryCounts,
  inventoryCountItems,
  orderItems,
  orders,
  products,
  sessions,
  stores,
  syncOutbox,
  type LocalCategory,
  type LocalCustomer,
  type LocalOrder,
  type LocalProduct,
  type LocalSession,
  type LocalStore,
} from "./schema";
import type {
  Category,
  CreateCategoryPayload,
} from "@/services/features/categories/categoryTypes";
import type {
  CreateCustomerPayload,
  Customer,
} from "@/services/features/customers/customerTypes";
import type { CreateOrderPayload } from "@/services/features/order/orderApi";
import type { Order, OrderItem } from "@/services/features/order/orderTypes";
import type { Product } from "@/services/features/products/productTypes";
import type {
  CloseSessionPayload,
  Session,
} from "@/services/features/sessions/sessionTypes";
import type {
  CreateStorePayload,
  Store,
} from "@/services/features/stores/storeTypes";
import type {
  CreateMovementPayload,
  CreateCountPayload,
  InventoryItem,
} from "@/services/features/inventory/inventoryTypes";
import { isOnline } from "./network";

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

export function normalizeProduct(
  product: Product & Record<string, any>,
): typeof products.$inferInsert {
  return {
    id: product.id,
    tenantId: product.tenantId,
    storeId: product.storeId,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    description: product.description,
    brand: product.brand,
    categoryId: product.categoryId,
    categoryName: product.category?.name,
    supplierId: product.supplierId,
    costPrice: Number(product.costPrice ?? 0),
    sellingPrice: Number(product.sellingPrice ?? 0),
    wholesalePrice: Number(product.wholesalePrice ?? 0),
    stockQuantity: Number(
      product.stockQuantity ?? product.inventory?.quantity ?? 0,
    ),
    manufacturingDate: product.manufacturingDate,
    expiryDate: product.expiryDate,
    version: Number(product.version ?? 0),
    isActive: product.isActive ?? true,
    deletedAt: product.deletedAt,
    createdAt: product.createdAt ?? new Date().toISOString(),
    updatedAt: product.updatedAt ?? new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
}

// ============================================
// UPSERT FUNCTIONS (Pull from Server)
// ============================================

export async function upsertProducts(remoteProducts: Product[]) {
  if (!remoteProducts.length) return;

  const db = getOfflineDb();
  await db
    .insert(products)
    .values(remoteProducts.map((product) => normalizeProduct(product)))
    .onConflictDoUpdate({
      target: products.id,
      set: {
        sku: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.sku ELSE ${products.sku} END`,
        barcode: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.barcode ELSE ${products.barcode} END`,
        name: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.name ELSE ${products.name} END`,
        description: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.description ELSE ${products.description} END`,
        brand: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.brand ELSE ${products.brand} END`,
        categoryId: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.category_id ELSE ${products.categoryId} END`,
        categoryName: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.category_name ELSE ${products.categoryName} END`,
        supplierId: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.supplier_id ELSE ${products.supplierId} END`,
        costPrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.cost_price ELSE ${products.costPrice} END`,
        sellingPrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.selling_price ELSE ${products.sellingPrice} END`,
        wholesalePrice: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.wholesale_price ELSE ${products.wholesalePrice} END`,
        stockQuantity: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.stock_quantity ELSE ${products.stockQuantity} END`,
        manufacturingDate: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.manufacturing_date ELSE ${products.manufacturingDate} END`,
        expiryDate: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.expiry_date ELSE ${products.expiryDate} END`,
        version: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.version ELSE ${products.version} END`,
        isActive: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.is_active ELSE ${products.isActive} END`,
        deletedAt: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.deleted_at ELSE ${products.deletedAt} END`,
        updatedAt: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.updated_at ELSE ${products.updatedAt} END`,
        lastSyncedAt: sql`CASE WHEN excluded.updated_at > ${products.updatedAt} THEN excluded.last_synced_at ELSE ${products.lastSyncedAt} END`,
      },
    });
}

export async function upsertCategories(remoteCategories: Category[]) {
  if (!remoteCategories.length) return;
  const now = new Date().toISOString();

  await getOfflineDb()
    .insert(categories)
    .values(
      remoteCategories.map((category) => ({
        id: category.id,
        tenantId: category.tenantId,
        storeId: category.storeId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        isActive: category.isActive ?? true,
        sortOrder: category.sortOrder ?? 0,
        syncStatus: "synced",
        syncError: null,
        createdAt: category.createdAt ?? now,
        updatedAt: category.updatedAt ?? now,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        description: sql`excluded.description`,
        parentId: sql`excluded.parent_id`,
        storeId: sql`excluded.store_id`,
        isActive: sql`excluded.is_active`,
        sortOrder: sql`excluded.sort_order`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: now,
      },
    });
}

export async function upsertCustomers(remoteCustomers: Customer[]) {
  if (!remoteCustomers.length) return;
  const now = new Date().toISOString();

  await getOfflineDb()
    .insert(customers)
    .values(
      remoteCustomers.map((customer) => ({
        id: customer.id,
        tenantId: customer.tenantId,
        code: customer.code,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        debtAmount: customer.debtAmount ?? 0,
        loyaltyPoints: customer.loyaltyPoints ?? 0,
        totalSpent: customer.totalSpent ?? 0,
        totalOrders: customer.totalOrders ?? 0,
        tier: customer.tier ?? "BRONZE",
        tierValidUntil: customer.tierValidUntil,
        isActive: customer.isActive ?? true,
        syncStatus: "synced",
        syncError: null,
        createdAt: customer.createdAt ?? now,
        updatedAt: customer.updatedAt ?? now,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: customers.id,
      set: {
        code: sql`excluded.code`,
        name: sql`excluded.name`,
        phone: sql`excluded.phone`,
        email: sql`excluded.email`,
        address: sql`excluded.address`,
        dateOfBirth: sql`excluded.date_of_birth`,
        gender: sql`excluded.gender`,
        debtAmount: sql`excluded.debt_amount`,
        loyaltyPoints: sql`excluded.loyalty_points`,
        totalSpent: sql`excluded.total_spent`,
        totalOrders: sql`excluded.total_orders`,
        tier: sql`excluded.tier`,
        tierValidUntil: sql`excluded.tier_valid_until`,
        isActive: sql`excluded.is_active`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: now,
      },
    });
}

export async function upsertStores(remoteStores: Store[]) {
  if (!remoteStores.length) return;
  const now = new Date().toISOString();

  await getOfflineDb()
    .insert(stores)
    .values(
      remoteStores.map((store) => ({
        id: store.id,
        tenantId: store.tenantId,
        code: store.code,
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        taxNumber: store.taxNumber,
        isActive: store.isActive ?? true,
        syncStatus: "synced",
        syncError: null,
        createdAt: store.createdAt ?? now,
        updatedAt: store.updatedAt ?? now,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: stores.id,
      set: {
        code: sql`excluded.code`,
        name: sql`excluded.name`,
        address: sql`excluded.address`,
        phone: sql`excluded.phone`,
        email: sql`excluded.email`,
        taxNumber: sql`excluded.tax_number`,
        isActive: sql`excluded.is_active`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: now,
      },
    });
}

export async function upsertSessions(remoteSessions: Session[]) {
  if (!remoteSessions.length) return;
  const now = new Date().toISOString();

  await getOfflineDb()
    .insert(sessions)
    .values(
      remoteSessions.map((session) => ({
        id: session.id,
        tenantId: session.tenantId,
        storeId: session.storeId,
        registerId: session.registerId,
        userId: session.userId,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        openingBalance: session.openingBalance ?? 0,
        closingBalance: session.closingBalance,
        expectedBalance: session.expectedBalance,
        discrepancy: session.discrepancy,
        cashSales: session.cashSales ?? 0,
        cardSales: session.cardSales ?? 0,
        digitalSales: session.digitalSales ?? 0,
        notes: session.notes,
        syncStatus: "synced",
        syncError: null,
        createdAt: session.openedAt ?? now,
        updatedAt: session.closedAt ?? session.openedAt ?? now,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: sessions.id,
      set: {
        status: sql`excluded.status`,
        closedAt: sql`excluded.closed_at`,
        closingBalance: sql`excluded.closing_balance`,
        expectedBalance: sql`excluded.expected_balance`,
        discrepancy: sql`excluded.discrepancy`,
        cashSales: sql`excluded.cash_sales`,
        cardSales: sql`excluded.card_sales`,
        digitalSales: sql`excluded.digital_sales`,
        notes: sql`excluded.notes`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: now,
      },
    });
}

export async function upsertOrders(
  remoteOrders: (Order & Record<string, any>)[],
) {
  if (!remoteOrders.length) return;
  const now = new Date().toISOString();

  const db = getOfflineDb();
  await db.transaction(async (tx) => {
    for (const order of remoteOrders) {
      await tx
        .insert(orders)
        .values({
          id: order.id,
          tenantId: order.tenantId,
          storeId: order.storeId,
          registerId: order.registerId,
          userId: order.userId ?? "",
          customerId: order.customerId,
          sessionId: order.sessionId,
          orderNumber: order.orderNumber,
          status: order.status ?? "COMPLETED",
          paymentStatus: order.paymentStatus ?? "PAID",
          paymentMethod: order.paymentMethod ?? "CASH",
          subTotal: Number(order.subTotal ?? order.grandTotal ?? 0),
          taxAmount: Number(order.taxAmount ?? 0),
          discountAmount: Number(order.discountAmount ?? 0),
          grandTotal: Number(order.grandTotal ?? 0),
          paidAmount: Number(order.paidAmount ?? 0),
          changeAmount: Number(order.changeAmount ?? 0),
          paymentBreakdown: order.paymentBreakdown ?? null,
          syncStatus: "synced",
          syncError: null,
          createdAt: order.createdAt ?? now,
          updatedAt: order.updatedAt ?? now,
          lastSyncedAt: now,
        })
        .onConflictDoUpdate({
          target: orders.id,
          set: {
            status: order.status,
            paymentStatus: sql`excluded.payment_status`,
            grandTotal: sql`excluded.grand_total`,
            syncStatus: "synced",
            syncError: null,
            updatedAt: sql`excluded.updated_at`,
            lastSyncedAt: now,
          },
        });

      if (Array.isArray(order.items)) {
        for (const item of order.items as (OrderItem & Record<string, any>)[]) {
          await tx
            .insert(orderItems)
            .values({
              id: item.id ?? createLocalId("item"),
              orderId: order.id,
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName ?? item.product?.name ?? null,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice ?? item.price ?? 0),
              discountAmount: Number(item.discountAmount ?? 0),
              subTotal: Number(
                item.subTotal ??
                  item.quantity * Number(item.unitPrice ?? item.price ?? 0),
              ),
              createdAt: item.createdAt ?? now,
            })
            .onConflictDoUpdate({
              target: orderItems.id,
              set: {
                quantity: sql`excluded.quantity`,
                unitPrice: sql`excluded.unit_price`,
                subTotal: sql`excluded.sub_total`,
              },
            });
        }
      }
    }
  });
}

export async function upsertGenericRecords<T extends { id: string }>(
  entity: string,
  records: T[],
) {
  if (!records.length) return;
  const now = new Date().toISOString();
  await getOfflineDb()
    .insert(genericRecords)
    .values(
      records.map((record) => ({
        id: record.id,
        entity,
        data: record,
        isActive: (record as any).isActive ?? true,
        syncStatus: "synced",
        syncError: null,
        createdAt: (record as any).createdAt ?? now,
        updatedAt: (record as any).updatedAt ?? now,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: genericRecords.id,
      set: {
        data: sql`excluded.data`,
        isActive: sql`excluded.is_active`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: now,
      },
    });
}

// ============================================
// GET LOCAL FUNCTIONS (Read from SQLite)
// ============================================

export async function getLocalProducts(storeId?: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        storeId
          ? or(eq(products.storeId, storeId), sql`${products.storeId} IS NULL`)
          : undefined,
      ),
    );

  return rows.map(toProduct);
}

export async function getLocalProductById(id: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return row ? toProduct(row) : undefined;
}

export async function getLocalProductByBarcode(barcode: string) {
  const db = getOfflineDb();
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.barcode, barcode), eq(products.isActive, true)))
    .limit(1);
  return row ? toProduct(row) : undefined;
}

export async function getLocalCategories(storeId?: string | null) {
  const rows = await getOfflineDb()
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.isActive, true),
        storeId !== undefined
          ? or(
              eq(categories.storeId, storeId ?? ""),
              sql`${categories.storeId} IS NULL`,
            )
          : undefined,
      ),
    );

  return rows.map(toCategory);
}

export async function getLocalCategoryById(id: string) {
  const [row] = await getOfflineDb()
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row ? toCategory(row) : undefined;
}

export async function getLocalCustomers() {
  const rows = await getOfflineDb()
    .select()
    .from(customers)
    .where(eq(customers.isActive, true));

  return rows.map(toCustomer);
}

export async function getLocalCustomerById(id: string) {
  const [row] = await getOfflineDb()
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return row ? toCustomer(row) : undefined;
}

export async function getLocalStores() {
  const rows = await getOfflineDb()
    .select()
    .from(stores)
    .where(eq(stores.isActive, true));
  return rows.map(toStore);
}

export async function getLocalStoreById(id: string) {
  const [row] = await getOfflineDb()
    .select()
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);
  return row ? toStore(row) : undefined;
}

export async function getLocalSessions(storeId?: string, status?: string) {
  const db = getOfflineDb();
  let query = db.select().from(sessions).$dynamic();

  const conditions = [];
  if (storeId) conditions.push(eq(sessions.storeId, storeId));
  if (status) conditions.push(eq(sessions.status, status));
  if (conditions.length) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(desc(sessions.createdAt));
  return rows.map(toSession);
}

export async function getLocalActiveSession(userId: string, storeId?: string) {
  const [row] = await getOfflineDb()
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, "OPEN"),
        storeId
          ? or(eq(sessions.storeId, storeId), sql`${sessions.storeId} IS NULL`)
          : undefined,
      ),
    )
    .limit(1);

  return row ? toSession(row) : undefined;
}

export async function getLocalOrders(storeId?: string) {
  const rows = await getOfflineDb()
    .select()
    .from(orders)
    .where(storeId ? eq(orders.storeId, storeId) : undefined);

  return Promise.all(rows.map((order) => toOrder(order)));
}

export async function getLocalOrderById(id: string) {
  const [row] = await getOfflineDb()
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  return row ? toOrder(row) : undefined;
}

export async function getLocalInventory(
  storeId?: string,
): Promise<InventoryItem[]> {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        storeId
          ? or(eq(products.storeId, storeId), sql`${products.storeId} IS NULL`)
          : undefined,
      ),
    );

  return rows.map((row) => ({
    id: row.id,
    productId: row.id,
    storeId: storeId ?? row.storeId ?? "unknown",
    quantity: row.stockQuantity,
    product: {
      id: row.id,
      name: row.name,
      sku: row.sku,
    },
  }));
}

export async function getLocalInventoryMovements(
  storeId?: string,
  type?: string,
) {
  const db = getOfflineDb();
  let query = db.select().from(inventoryMovements).$dynamic();

  const conditions = [];
  if (storeId) conditions.push(eq(inventoryMovements.storeId, storeId));
  if (type) conditions.push(eq(inventoryMovements.type, type));
  if (conditions.length) {
    query = query.where(and(...conditions));
  }

  return await query.orderBy(desc(inventoryMovements.createdAt));
}

export async function getLocalGenericRecords<T>(entity: string) {
  const rows = await getOfflineDb()
    .select()
    .from(genericRecords)
    .where(
      and(eq(genericRecords.entity, entity), eq(genericRecords.isActive, true)),
    );

  return rows.map((row) => ({
    ...(row.data as T),
    id: row.id,
  }));
}

// ============================================
// CREATE OFFLINE FUNCTIONS (Push to Server later)
// ============================================

export async function createOfflineProduct(
  payload: Partial<Product> & { categoryName?: string; storeId?: string },
) {
  const now = new Date().toISOString();
  const id = createLocalId("prod");

  await getOfflineDb()
    .insert(products)
    .values({
      id,
      storeId: payload.storeId,
      sku: payload.sku ?? `LOCAL-${Date.now().toString(36).toUpperCase()}`,
      barcode:
        payload.barcode && payload.barcode.trim() !== ""
          ? payload.barcode.trim()
          : `QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      name: payload.name ?? "Offline product",
      description: payload.description,
      brand: payload.brand,
      categoryId: payload.categoryId ?? "",
      categoryName: payload.categoryName,
      supplierId: payload.supplierId,
      costPrice: Number(payload.costPrice ?? 0),
      sellingPrice: Number(payload.sellingPrice ?? 0),
      wholesalePrice: Number(payload.wholesalePrice ?? 0),
      stockQuantity: Number(payload.stockQuantity ?? 0),
      isActive: true,
      syncStatus: "pending" as never,
      createdAt: now,
      updatedAt: now,
    } as typeof products.$inferInsert);

  await enqueueMutation(
    "products",
    id,
    "create",
    "/api/tenant/products",
    "POST",
    payload,
  );
  return toProduct(
    (
      await getOfflineDb()
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1)
    )[0],
  );
}

export async function createOfflineCategory(
  payload: CreateCategoryPayload & { storeId?: string },
) {
  const now = new Date().toISOString();
  const id = createLocalId("cat");

  await getOfflineDb()
    .insert(categories)
    .values({
      id,
      storeId: payload.storeId,
      name: payload.name,
      slug: payload.slug ?? payload.name.toLowerCase().replace(/\s+/g, "-"),
      description: payload.description,
      parentId: payload.parentId,
      isActive: payload.isActive ?? true,
      sortOrder: payload.sortOrder ?? 0,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

  await enqueueMutation(
    "categories",
    id,
    "create",
    "/api/tenant/categories",
    "POST",
    payload,
  );
  return toCategory(
    (
      await getOfflineDb()
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1)
    )[0],
  );
}

export async function createOfflineCustomer(payload: CreateCustomerPayload) {
  const now = new Date().toISOString();
  const id = createLocalId("cus");
  const code = payload.code ?? `LOCAL-${Date.now().toString(36).toUpperCase()}`;

  await getOfflineDb()
    .insert(customers)
    .values({
      id,
      code,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      debtAmount: payload.debtAmount ?? 0,
      loyaltyPoints: 0,
      totalSpent: 0,
      totalOrders: 0,
      tier: "BRONZE",
      isActive: true,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

  await enqueueMutation(
    "customers",
    id,
    "create",
    "/api/tenant/customers",
    "POST",
    payload,
  );
  return toCustomer(
    (
      await getOfflineDb()
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1)
    )[0],
  );
}

export async function createOfflineStore(payload: CreateStorePayload) {
  const now = new Date().toISOString();
  const id = createLocalId("store");
  const code = payload.code ?? `LOCAL-${Date.now().toString(36).toUpperCase()}`;

  await getOfflineDb()
    .insert(stores)
    .values({
      id,
      code,
      name: payload.name,
      address: payload.address,
      phone: payload.phone,
      email: payload.email,
      taxNumber: payload.taxNumber,
      isActive: payload.isActive ?? true,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

  await enqueueMutation("stores", id, "create", "/api/tenant/stores", "POST", {
    ...payload,
    code,
  });
  return toStore(
    (
      await getOfflineDb()
        .select()
        .from(stores)
        .where(eq(stores.id, id))
        .limit(1)
    )[0],
  );
}

export async function openOfflineSession(payload: {
  userId: string;
  openingBalance: number;
  notes?: string;
  storeId?: string;
  registerId?: string;
}) {
  const now = new Date().toISOString();
  const id = createLocalId("ses");

  await getOfflineDb().insert(sessions).values({
    id,
    userId: payload.userId,
    storeId: payload.storeId,
    registerId: payload.registerId,
    status: "OPEN",
    openedAt: now,
    openingBalance: payload.openingBalance,
    cashSales: 0,
    cardSales: 0,
    digitalSales: 0,
    notes: payload.notes,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  await enqueueMutation(
    "sessions",
    id,
    "open",
    "/api/tenant/sessions/open",
    "POST",
    payload,
  );
  return toSession(
    (
      await getOfflineDb()
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1)
    )[0],
  );
}

export async function createOfflineOrder(
  payload: CreateOrderPayload,
): Promise<Order> {
  const db = getOfflineDb();
  const sqlite = getSqliteDatabase();
  const now = new Date().toISOString();
  const orderId = createLocalId("ord");

  const cleanPayload = {
    ...payload,
    subTotal: Number(payload.subTotal) || 0,
    taxAmount: Number(payload.taxAmount) || 0,

    discountAmount: Number(payload.discountAmount) || 0,

    grandTotal: Number(payload.grandTotal) || 0,
    paidAmount: Number(payload.paidAmount) || 0,
    changeAmount: Number(payload.changeAmount) || 0,
    items: payload.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      subTotal: Number(item.subTotal) || 0,
      discountAmount: Number(item.discountAmount) || 0,
    })),
  };

  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `INSERT INTO orders (
        id, store_id, register_id, user_id, customer_id, session_id, status, payment_status,
        payment_method, sub_total, tax_amount, discount_amount, grand_total,
        paid_amount, change_amount, payment_breakdown, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        cleanPayload.storeId ?? null,
        cleanPayload.registerId ?? null,
        cleanPayload.userId,
        cleanPayload.customerId ?? null,
        cleanPayload.sessionId ?? null,
        "PENDING",
        cleanPayload.paymentStatus ?? "PAID",
        cleanPayload.paymentMethod,
        cleanPayload.subTotal,
        cleanPayload.taxAmount ?? 0,
        cleanPayload.discountAmount ?? 0,
        cleanPayload.grandTotal,
        cleanPayload.paidAmount,
        cleanPayload.changeAmount,
        JSON.stringify(cleanPayload.paymentBreakdown ?? []),
        "pending",
        now,
        now,
      ],
    );

    for (const item of cleanPayload.items) {
      sqlite.runSync(
        `INSERT INTO order_items (
          id, order_id, product_id, variant_id, product_name, quantity, unit_price,
          discount_amount, sub_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createLocalId("item"),
          orderId,
          item.productId,
          item.variantId ?? null,
          null,
          item.quantity,
          item.unitPrice,
          item.discountAmount ?? 0,
          item.subTotal,
          now,
        ],
      );

      sqlite.runSync(
        "UPDATE products SET stock_quantity = MAX(stock_quantity - ?, 0), updated_at = ? WHERE id = ?",
        [item.quantity, now, item.productId],
      );
    }

    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "orders",
        orderId,
        "create",
        "/api/tenant/orders",
        "POST",
        JSON.stringify(cleanPayload),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  const [created] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return {
    id: created.id,
    grandTotal: created.grandTotal,
    status: created.status as Order["status"],
    createdAt: created.createdAt,
    subTotal: created.subTotal,
    taxAmount: created.taxAmount,
    discountAmount: created.discountAmount,
    paidAmount: created.paidAmount,
    changeAmount: created.changeAmount,
    paymentMethod: created.paymentMethod as Order["paymentMethod"],
    paymentStatus: created.paymentStatus as Order["paymentStatus"],
    paymentBreakdown: parsePaymentBreakdown(
      created.paymentBreakdown ?? cleanPayload.paymentBreakdown,
    ),
    customerId: created.customerId ?? undefined,
    storeId: created.storeId ?? undefined,
    userId: created.userId,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName ?? "",
      price: item.unitPrice,
      quantity: item.quantity,
      product: {
        name: item.productName ?? "",
        sellingPrice: String(item.unitPrice),
      },
    })),
  };
}

export async function createOfflineInventoryMovement(
  payload: CreateMovementPayload,
) {
  const now = new Date().toISOString();
  const id = createLocalId("mov");
  const sqlite = getSqliteDatabase();
  const db = getOfflineDb();

  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `INSERT INTO inventory_movements (
        id, tenant_id, store_id, product_id, variant_id, quantity, type,
        reference_id, reference_type, reason, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        null,
        payload.storeId,
        payload.productId,
        payload.variantId ?? null,
        payload.quantity,
        payload.type,
        payload.referenceId,
        payload.referenceType,
        payload.reason ?? null,
        "pending",
        now,
        now,
      ],
    );

    const multiplier = ["IN", "TRANSFER"].includes(payload.type) ? 1 : -1;
    sqlite.runSync(
      "UPDATE products SET stock_quantity = MAX(stock_quantity + ?, 0), updated_at = ? WHERE id = ?",
      [payload.quantity * multiplier, now, payload.productId],
    );

    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "inventory_movements",
        id,
        "create",
        "/api/tenant/inventory/movements",
        "POST",
        JSON.stringify(payload),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  const [row] = await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.id, id))
    .limit(1);
  return row;
}

export async function createOfflineInventoryCount(payload: CreateCountPayload) {
  const now = new Date().toISOString();
  const countId = createLocalId("cnt");
  const sqlite = getSqliteDatabase();

  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `INSERT INTO inventory_counts (
        id, tenant_id, store_id, status, scheduled_date, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        countId,
        null,
        payload.storeId,
        "COMPLETED",
        payload.scheduledDate ?? null,
        "pending",
        now,
        now,
      ],
    );

    for (const item of payload.items) {
      const diff = item.countedQuantity - item.systemQuantity;
      sqlite.runSync(
        `INSERT INTO inventory_count_items (
          id, count_id, product_id, variant_id, system_quantity, counted_quantity, difference, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createLocalId("cnti"),
          countId,
          item.productId,
          item.variantId ?? null,
          item.systemQuantity,
          item.countedQuantity,
          diff,
          item.reason ?? null,
          now,
        ],
      );

      sqlite.runSync(
        "UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ?",
        [item.countedQuantity, now, item.productId],
      );
    }

    sqlite.runSync(
      `INSERT INTO sync_outbox (
        id, entity, entity_id, operation, endpoint, method, payload, status,
        attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId("outbox"),
        "inventory_counts",
        countId,
        "create",
        "/api/tenant/inventory/counts",
        "POST",
        JSON.stringify(payload),
        "pending",
        0,
        now,
        now,
        now,
      ],
    );
  });

  return { id: countId, status: "COMPLETED" };
}

export async function createOfflineGenericRecord<T extends Record<string, any>>(
  entity: string,
  endpoint: string,
  payload: T,
) {
  const now = new Date().toISOString();
  const id = createLocalId(entity.slice(0, 4));
  const data = {
    ...payload,
    id,
    code: payload.code ?? `LOCAL-${Date.now().toString(36).toUpperCase()}`,
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await getOfflineDb().insert(genericRecords).values({
    id,
    entity,
    data,
    isActive: data.isActive,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  await enqueueMutation(entity, id, "create", endpoint, "POST", payload);
  return data;
}

// ============================================
// UPDATE OFFLINE FUNCTIONS
// ============================================

export async function updateOfflineProduct(
  id: string,
  data: Partial<Product> & { categoryName?: string },
) {
  await getOfflineDb()
    .update(products)
    .set({ ...data, updatedAt: new Date().toISOString() } as Partial<
      typeof products.$inferInsert
    >)
    .where(eq(products.id, id));

  await enqueueMutation(
    "products",
    id,
    "update",
    `/api/tenant/products/${id}`,
    "PUT",
    data,
  );
  const [row] = await getOfflineDb()
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return toProduct(row);
}

export async function updateOfflineCategory(
  id: string,
  data: Partial<Category>,
) {
  await getOfflineDb()
    .update(categories)
    .set({ ...data, updatedAt: new Date().toISOString() } as Partial<
      typeof categories.$inferInsert
    >)
    .where(eq(categories.id, id));

  await enqueueMutation(
    "categories",
    id,
    "update",
    `/api/tenant/categories/${id}`,
    "PUT",
    data,
  );
  const [row] = await getOfflineDb()
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return toCategory(row);
}

export async function updateOfflineCustomer(
  id: string,
  data: Partial<Customer>,
) {
  await getOfflineDb()
    .update(customers)
    .set({ ...data, updatedAt: new Date().toISOString() } as Partial<
      typeof customers.$inferInsert
    >)
    .where(eq(customers.id, id));

  await enqueueMutation(
    "customers",
    id,
    "update",
    `/api/tenant/customers/${id}`,
    "PUT",
    data,
  );
  const [row] = await getOfflineDb()
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return toCustomer(row);
}

export async function updateOfflineStore(id: string, data: Partial<Store>) {
  await getOfflineDb()
    .update(stores)
    .set({ ...data, updatedAt: new Date().toISOString() } as Partial<
      typeof stores.$inferInsert
    >)
    .where(eq(stores.id, id));

  await enqueueMutation(
    "stores",
    id,
    "update",
    `/api/tenant/stores/${id}`,
    "PUT",
    data,
  );
  const [row] = await getOfflineDb()
    .select()
    .from(stores)
    .where(eq(stores.id, id))
    .limit(1);
  return toStore(row);
}

export async function updateOfflineOrderStatus(id: string, status: string) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(orders)
    .set({ status, syncStatus: "pending", updatedAt: now })
    .where(eq(orders.id, id));

  await enqueueMutation(
    "orders",
    id,
    "updateStatus",
    `/api/tenant/orders/${id}/status`,
    "PATCH",
    { status },
  );
  const order = await getLocalOrderById(id);
  if (!order) throw new Error("Order not found in offline cache");
  return order;
}

export async function closeOfflineSession(
  sessionId: string,
  payload: CloseSessionPayload,
) {
  const now = new Date().toISOString();

  await getOfflineDb()
    .update(sessions)
    .set({
      status: "CLOSED",
      closedAt: now,
      closingBalance: payload.closingBalance,
      expectedBalance: payload.expectedBalance,
      discrepancy: payload.discrepancy,
      cashSales: payload.cashSales ?? 0,
      cardSales: payload.cardSales ?? 0,
      digitalSales: payload.digitalSales ?? 0,
      notes: payload.notes,
      syncStatus: "pending",
      updatedAt: now,
    })
    .where(eq(sessions.id, sessionId));

  await enqueueMutation(
    "sessions",
    sessionId,
    "close",
    `/api/tenant/sessions/${sessionId}/close`,
    "POST",
    payload,
  );
  const [row] = await getOfflineDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  return toSession(row);
}

export async function updateOfflineGenericRecord<T extends Record<string, any>>(
  entity: string,
  endpoint: string,
  id: string,
  data: T,
) {
  const now = new Date().toISOString();
  const [row] = await getOfflineDb()
    .select()
    .from(genericRecords)
    .where(eq(genericRecords.id, id))
    .limit(1);
  const nextData = {
    ...((row?.data as Record<string, any>) ?? { id }),
    ...data,
    updatedAt: now,
  };

  await getOfflineDb()
    .update(genericRecords)
    .set({ data: nextData, syncStatus: "pending", updatedAt: now })
    .where(eq(genericRecords.id, id));

  await enqueueMutation(entity, id, "update", endpoint, "PUT", data);
  return nextData;
}

// ============================================
// DELETE OFFLINE FUNCTIONS (Soft Delete)
// ============================================

export async function deleteOfflineProduct(id: string) {
  await getOfflineDb()
    .update(products)
    .set({
      isActive: false,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id));

  await enqueueMutation(
    "products",
    id,
    "delete",
    `/api/tenant/products/${id}`,
    "DELETE",
    {},
  );
}

export async function deleteOfflineCategory(id: string) {
  await getOfflineDb()
    .update(categories)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(categories.id, id));

  await enqueueMutation(
    "categories",
    id,
    "delete",
    `/api/tenant/categories/${id}`,
    "DELETE",
    {},
  );
}

export async function deleteOfflineCustomer(id: string) {
  await getOfflineDb()
    .update(customers)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customers.id, id));

  await enqueueMutation(
    "customers",
    id,
    "delete",
    `/api/tenant/customers/${id}`,
    "DELETE",
    {},
  );
}

export async function deleteOfflineStore(id: string) {
  await getOfflineDb()
    .update(stores)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(stores.id, id));

  await enqueueMutation(
    "stores",
    id,
    "delete",
    `/api/tenant/stores/${id}`,
    "DELETE",
    {},
  );
}

export async function deleteOfflineOrder(id: string) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(orders)
    .set({ status: "VOIDED", syncStatus: "pending", updatedAt: now })
    .where(eq(orders.id, id));

  await enqueueMutation(
    "orders",
    id,
    "delete",
    `/api/tenant/orders/${id}`,
    "DELETE",
    {},
  );
}

export async function deleteOfflineGenericRecord(
  entity: string,
  endpoint: string,
  id: string,
) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(genericRecords)
    .set({ isActive: false, syncStatus: "pending", updatedAt: now })
    .where(eq(genericRecords.id, id));

  await enqueueMutation(entity, id, "delete", endpoint, "DELETE", {});
}

// ============================================
// SYNC OUTBOX FUNCTIONS
// ============================================

async function enqueueMutation(
  entity: string,
  entityId: string,
  operation: string,
  endpoint: string,
  method: string,
  payload: unknown,
) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .insert(syncOutbox)
    .values({
      id: createLocalId("outbox"),
      entity,
      entityId,
      operation,
      endpoint,
      method,
      payload,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
}

export async function enqueueMutations(
  items: Array<{
    entity: string;
    entityId: string;
    operation: string;
    endpoint: string;
    method: string;
    payload: unknown;
  }>,
) {
  if (!items.length) return;

  const now = new Date().toISOString();
  const db = getOfflineDb();

  await db.insert(syncOutbox).values(
    items.map((item) => ({
      id: createLocalId("outbox"),
      ...item,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function getDueOutboxItems(limit = 25) {
  return getOfflineDb()
    .select()
    .from(syncOutbox)
    .where(
      and(
        inArray(syncOutbox.status, ["pending", "failed"]),
        lte(syncOutbox.nextAttemptAt, new Date().toISOString()),
      ),
    )
    .limit(limit);
}

export async function getOutboxItems(limit = 100) {
  return getOfflineDb()
    .select()
    .from(syncOutbox)
    .orderBy(syncOutbox.updatedAt)
    .limit(limit);
}

export async function getFailedOutboxItems(limit = 100) {
  return getOfflineDb()
    .select()
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["failed", "dead"]))
    .orderBy(syncOutbox.updatedAt)
    .limit(limit);
}

export async function retryOutboxItem(id: string) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(syncOutbox)
    .set({
      status: "pending",
      nextAttemptAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(eq(syncOutbox.id, id));
}

export async function retryAllFailedOutboxItems() {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(syncOutbox)
    .set({
      status: "pending",
      nextAttemptAt: now,
      updatedAt: now,
      lastError: null,
    })
    .where(inArray(syncOutbox.status, ["failed", "dead"]));
}

export async function markOutboxSynced(id: string) {
  await getOfflineDb().delete(syncOutbox).where(eq(syncOutbox.id, id));
}

export async function markOutboxFailed(
  id: string,
  attempts: number,
  error: string,
) {
  const delaySeconds = Math.min(300, Math.pow(2, attempts) * 5);
  const nextAttemptAt = new Date(
    Date.now() + delaySeconds * 1000,
  ).toISOString();

  await getOfflineDb()
    .update(syncOutbox)
    .set({
      status: "failed",
      attempts,
      lastError: error,
      nextAttemptAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(syncOutbox.id, id));
}

export async function markOutboxDead(id: string) {
  await getOfflineDb()
    .update(syncOutbox)
    .set({
      status: "dead",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(syncOutbox.id, id));
}

export async function getQueuedCount() {
  const result = await getOfflineDb()
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["pending", "failed"]));

  return Number(result[0]?.count ?? 0);
}

export async function clearSyncedOutboxItems() {
  const db = getOfflineDb();
  const result = await db
    .delete(syncOutbox)
    .where(eq(syncOutbox.status, "synced"))
    .returning();
  return result.length;
}

export async function clearAllOutboxItems() {
  const db = getOfflineDb();
  const result = await db.delete(syncOutbox).returning();
  return result.length;
}

// ============================================
// SYNC STATUS FUNCTIONS
// ============================================

export async function getSyncStats() {
  const db = getOfflineDb();

  const [totalPending] = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(eq(syncOutbox.status, "pending"));

  const [totalFailed] = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(eq(syncOutbox.status, "failed"));

  const [totalDead] = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncOutbox)
    .where(eq(syncOutbox.status, "dead"));

  const [ordersPending] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.syncStatus, "pending"));

  const [productsPending] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.syncStatus, "pending"));

  return {
    outbox: {
      pending: Number(totalPending?.count ?? 0),
      failed: Number(totalFailed?.count ?? 0),
      dead: Number(totalDead?.count ?? 0),
    },
    entities: {
      orders: Number(ordersPending?.count ?? 0),
      products: Number(productsPending?.count ?? 0),
    },
  };
}

// export async function getSyncStatusByEntity(entity: string) {
//   const db = getOfflineDb();
//   const result = await db
//     .select({
//       status: syncOutbox.status,
//       count: sql<number>`count(*)`,
//     })
//     .from(syncOutbox)
//     .where(eq(syncOutbox.entity, entity))
//     .groupBy(syncOutbox.status);

//   return result.reduce(
//     (acc, row) => {
//       acc[row.status] = Number(row.count);
//       return acc;
//     },
//     {} as Record<string, number>,
//   );
// }

// ============================================
// MARK SYNCED FUNCTIONS
// ============================================

export async function markOrderSynced(
  localId: string,
  remote: Order & Record<string, any>,
) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(orders)
    .set({
      status: remote.status ?? "COMPLETED",
      syncStatus: "synced",
      syncError: null,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, localId));
}

export async function markEntitySynced(
  entity: string,
  localId: string,
  remote: Record<string, any>,
) {
  const now = new Date().toISOString();

  if (entity === "products") {
    await getOfflineDb()
      .update(products)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.sku && { sku: remote.sku }),
        ...(remote.name && { name: remote.name }),
        ...(remote.sellingPrice && { sellingPrice: remote.sellingPrice }),
      })
      .where(eq(products.id, localId));
  } else if (entity === "customers") {
    await getOfflineDb()
      .update(customers)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.code && { code: remote.code }),
        ...(remote.name && { name: remote.name }),
      })
      .where(eq(customers.id, localId));
  } else if (entity === "categories") {
    await getOfflineDb()
      .update(categories)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.name && { name: remote.name }),
        ...(remote.slug && { slug: remote.slug }),
      })
      .where(eq(categories.id, localId));
  } else if (entity === "stores") {
    await getOfflineDb()
      .update(stores)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.code && { code: remote.code }),
        ...(remote.name && { name: remote.name }),
      })
      .where(eq(stores.id, localId));
  } else if (entity === "sessions") {
    await getOfflineDb()
      .update(sessions)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
        ...(remote.status && { status: remote.status }),
        ...(remote.closedAt && { closedAt: remote.closedAt }),
      })
      .where(eq(sessions.id, localId));
  } else if (entity === "inventory_movements") {
    await getOfflineDb()
      .update(inventoryMovements)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      } as any)
      .where(eq(inventoryMovements.id, localId));
  } else if (entity === "inventory_counts") {
    await getOfflineDb()
      .update(inventoryCounts)
      .set({
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      } as any)
      .where(eq(inventoryCounts.id, localId));
  } else {
    await getOfflineDb()
      .update(genericRecords)
      .set({
        data: remote.id ? remote : sql`${genericRecords.data}`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      })
      .where(eq(genericRecords.id, localId));
  }
}

export async function markOrderSyncFailed(localId: string, error: string) {
  await getOfflineDb()
    .update(orders)
    .set({
      syncStatus: "failed",
      syncError: error,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orders.id, localId));
}

export async function markEntitySyncFailed(
  entity: string,
  localId: string,
  error: string,
) {
  const update = {
    syncStatus: "failed",
    syncError: error,
    updatedAt: new Date().toISOString(),
  };

  if (entity === "products") {
    await getOfflineDb()
      .update(products)
      .set(update)
      .where(eq(products.id, localId));
  } else if (entity === "customers") {
    await getOfflineDb()
      .update(customers)
      .set(update)
      .where(eq(customers.id, localId));
  } else if (entity === "categories") {
    await getOfflineDb()
      .update(categories)
      .set(update)
      .where(eq(categories.id, localId));
  } else if (entity === "stores") {
    await getOfflineDb()
      .update(stores)
      .set(update)
      .where(eq(stores.id, localId));
  } else if (entity === "sessions") {
    await getOfflineDb()
      .update(sessions)
      .set(update)
      .where(eq(sessions.id, localId));
  } else if (entity === "inventory_movements") {
    await getOfflineDb()
      .update(inventoryMovements)
      .set(update)
      .where(eq(inventoryMovements.id, localId));
  } else if (entity === "inventory_counts") {
    await getOfflineDb()
      .update(inventoryCounts)
      .set(update)
      .where(eq(inventoryCounts.id, localId));
  } else {
    await getOfflineDb()
      .update(genericRecords)
      .set(update)
      .where(eq(genericRecords.id, localId));
  }
}

// ============================================
// CONFLICT RESOLUTION
// ============================================

export async function resolveConflict(
  entity: string,
  localId: string,
  resolution: "local" | "remote",
  remoteData?: Record<string, any>,
) {
  const db = getOfflineDb();
  const now = new Date().toISOString();

  if (resolution === "remote" && remoteData) {
    const table = getTableForEntity(entity);
    if (!table) return;

    await db
      .update(table)
      .set({
        ...remoteData,
        syncStatus: "synced",
        syncError: null,
        updatedAt: now,
        lastSyncedAt: now,
      } as any)
      .where(eq(table.id, localId));

    await db
      .delete(syncOutbox)
      .where(
        and(eq(syncOutbox.entity, entity), eq(syncOutbox.entityId, localId)),
      );
  } else {
    await db
      .update(syncOutbox)
      .set({
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        updatedAt: now,
        lastError: null,
      })
      .where(
        and(eq(syncOutbox.entity, entity), eq(syncOutbox.entityId, localId)),
      );
  }
}

function getTableForEntity(entity: string) {
  switch (entity) {
    case "products":
      return products;
    case "categories":
      return categories;
    case "customers":
      return customers;
    case "stores":
      return stores;
    case "sessions":
      return sessions;
    case "orders":
      return orders;
    case "inventory_movements":
      return inventoryMovements;
    case "inventory_counts":
      return inventoryCounts;
    default:
      return null;
  }
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

export async function cleanupOldData(daysToKeep = 30) {
  const db = getOfflineDb();
  const cutoff = new Date(
    Date.now() - daysToKeep * 24 * 60 * 60 * 1000,
  ).toISOString();

  const syncedOutbox = await db
    .delete(syncOutbox)
    .where(
      and(eq(syncOutbox.status, "synced"), lte(syncOutbox.createdAt, cutoff)),
    )
    .returning();

  const deletedGeneric = await db
    .delete(genericRecords)
    .where(
      and(
        eq(genericRecords.isActive, false),
        lte(genericRecords.updatedAt, cutoff),
      ),
    )
    .returning();

  const deletedCounts = await db
    .delete(inventoryCounts)
    .where(
      and(
        eq(inventoryCounts.status, "COMPLETED"),
        lte(inventoryCounts.createdAt, cutoff),
      ),
    )
    .returning();

  return {
    outbox: syncedOutbox.length,
    genericRecords: deletedGeneric.length,
    inventoryCounts: deletedCounts.length,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parsePaymentBreakdown(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value as Order["paymentBreakdown"];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toProduct(product: LocalProduct): Product {
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode ?? undefined,
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ?? undefined,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    wholesalePrice: product.wholesalePrice ?? 0,
    stockQuantity: product.stockQuantity,
    categoryId: product.categoryId ?? "",
    category: product.categoryId
      ? { id: product.categoryId, name: product.categoryName ?? "" }
      : undefined,
    supplierId: product.supplierId ?? undefined,
    manufacturingDate: product.manufacturingDate ?? undefined,
    expiryDate: product.expiryDate ?? undefined,
    createdAt: product.createdAt,
  };
}

async function toOrder(order: LocalOrder): Promise<Order> {
  const items = await getOfflineDb()
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return {
    id: order.id,
    grandTotal: order.grandTotal,
    status: order.status as Order["status"],
    createdAt: order.createdAt,
    subTotal: order.subTotal,
    taxAmount: order.taxAmount,
    discountAmount: order.discountAmount,
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    paymentMethod: order.paymentMethod as Order["paymentMethod"],
    paymentStatus: order.paymentStatus as Order["paymentStatus"],
    paymentBreakdown: parsePaymentBreakdown(order.paymentBreakdown),
    customerId: order.customerId ?? undefined,
    storeId: order.storeId ?? undefined,
    userId: order.userId,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      productName: item.productName ?? "",
      price: item.unitPrice,
      quantity: item.quantity,
      product: {
        name: item.productName ?? "",
        sellingPrice: String(item.unitPrice),
      },
    })),
  };
}

function toCategory(category: LocalCategory): Category {
  return {
    id: category.id,
    tenantId: category.tenantId,
    name: category.name,
    slug: category.slug,
    description: category.description ?? undefined,
    parentId: category.parentId ?? undefined,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function toCustomer(customer: LocalCustomer): Customer {
  return {
    id: customer.id,
    tenantId: customer.tenantId,
    code: customer.code,
    name: customer.name,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
    address: customer.address ?? undefined,
    dateOfBirth: customer.dateOfBirth ?? undefined,
    gender: customer.gender ?? undefined,
    debtAmount: customer.debtAmount ?? 0,
    loyaltyPoints: customer.loyaltyPoints,
    totalSpent: customer.totalSpent,
    totalOrders: customer.totalOrders,
    tier: (customer.tier as Customer["tier"]) ?? "BRONZE",
    tierValidUntil: customer.tierValidUntil ?? undefined,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function toStore(store: LocalStore): Store {
  return {
    id: store.id,
    code: store.code,
    name: store.name,
    address: store.address ?? undefined,
    phone: store.phone ?? undefined,
    email: store.email ?? undefined,
    taxNumber: store.taxNumber ?? undefined,
    isActive: store.isActive,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function toSession(session: LocalSession): Session {
  return {
    id: session.id,
    tenantId: session.tenantId,
    userId: session.userId,
    status: session.status as Session["status"],
    openedAt: session.openedAt,
    closedAt: session.closedAt ?? undefined,
    openingBalance: session.openingBalance,
    closingBalance: session.closingBalance ?? undefined,
    expectedBalance: session.expectedBalance ?? undefined,
    discrepancy: session.discrepancy ?? undefined,
    cashSales: session.cashSales,
    cardSales: session.cardSales,
    digitalSales: session.digitalSales,
    notes: session.notes ?? undefined,
  };
}

// #######
// services/offline/repository.ts ထဲမှာ ထည့်ပါ (အောက်ဆုံးမှာ)

// ============================================
// GET SYNC STATUS
// ============================================

export interface SyncStatus {
  isOnline: boolean;
  queueCount: number;
  failedCount: number;
  totalPending: number;
  items: Array<{
    id: string;
    entity: string;
    operation: string;
    status: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }>;
  failedItems: Array<{
    id: string;
    entity: string;
    operation: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }>;
  entityCounts: {
    [entity: string]: {
      pending: number;
      failed: number;
      synced: number;
      total: number;
    };
  };
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const db = getOfflineDb();
  const online = await isOnline();

  // Get all outbox items
  const allItems = await db
    .select()
    .from(syncOutbox)
    .orderBy(syncOutbox.createdAt);

  // Get pending items
  const pendingItems = allItems.filter(
    (item) => item.status === "pending" || item.status === "failed",
  );

  // Get failed items
  const failedItems = allItems.filter(
    (item) => item.status === "failed" || item.status === "dead",
  );

  // Calculate entity counts
  const entityCounts: SyncStatus["entityCounts"] = {};

  for (const item of allItems) {
    if (!entityCounts[item.entity]) {
      entityCounts[item.entity] = {
        pending: 0,
        failed: 0,
        synced: 0,
        total: 0,
      };
    }
    entityCounts[item.entity].total++;

    if (item.status === "pending") {
      entityCounts[item.entity].pending++;
    } else if (item.status === "failed" || item.status === "dead") {
      entityCounts[item.entity].failed++;
    } else if (item.status === "synced") {
      entityCounts[item.entity].synced++;
    }
  }

  return {
    isOnline: online,
    queueCount: pendingItems.length,
    failedCount: failedItems.length,
    totalPending: allItems.filter((item) => item.status === "pending").length,
    items: pendingItems.map((item) => ({
      id: item.id,
      entity: item.entity,
      operation: item.operation,
      status: item.status,
      attempts: item.attempts,
      lastError: item.lastError ?? null,
      createdAt: item.createdAt,
    })),
    failedItems: failedItems.map((item) => ({
      id: item.id,
      entity: item.entity,
      operation: item.operation,
      attempts: item.attempts,
      lastError: item.lastError ?? null,
      createdAt: item.createdAt,
    })),
    entityCounts,
  };
}

// ============================================
// GET SYNC STATUS BY ENTITY
// ============================================

export async function getSyncStatusByEntity(entity: string) {
  const db = getOfflineDb();

  const items = await db
    .select()
    .from(syncOutbox)
    .where(eq(syncOutbox.entity, entity));

  const pending = items.filter((item) => item.status === "pending").length;
  const failed = items.filter(
    (item) => item.status === "failed" || item.status === "dead",
  ).length;
  const synced = items.filter((item) => item.status === "synced").length;

  return {
    total: items.length,
    pending,
    failed,
    synced,
    items: items.map((item) => ({
      id: item.id,
      entityId: item.entityId,
      operation: item.operation,
      status: item.status,
      attempts: item.attempts,
      lastError: item.lastError ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

// ============================================
// GET FAILED ITEMS WITH DETAILS
// ============================================

export async function getFailedItemsWithDetails(limit = 50) {
  const db = getOfflineDb();

  const items = await db
    .select()
    .from(syncOutbox)
    .where(inArray(syncOutbox.status, ["failed", "dead"]))
    .orderBy(syncOutbox.updatedAt)
    .limit(limit);

  // Get related entity data if possible
  const result = [];
  for (const item of items) {
    let entityData = null;

    switch (item.entity) {
      case "products": {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.entityId))
          .limit(1);
        entityData = product;
        break;
      }
      case "orders": {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, item.entityId))
          .limit(1);
        entityData = order;
        break;
      }
      case "customers": {
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, item.entityId))
          .limit(1);
        entityData = customer;
        break;
      }
      case "categories": {
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, item.entityId))
          .limit(1);
        entityData = category;
        break;
      }
      case "stores": {
        const [store] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, item.entityId))
          .limit(1);
        entityData = store;
        break;
      }
      case "sessions": {
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, item.entityId))
          .limit(1);
        entityData = session;
        break;
      }
    }

    result.push({
      ...item,
      entityData,
    });
  }

  return result;
}

// ============================================
// GET PENDING ITEMS WITH DETAILS
// ============================================

export async function getPendingItemsWithDetails(limit = 50) {
  const db = getOfflineDb();

  const items = await db
    .select()
    .from(syncOutbox)
    .where(eq(syncOutbox.status, "pending"))
    .orderBy(syncOutbox.createdAt)
    .limit(limit);

  // Get related entity data if possible
  const result = [];
  for (const item of items) {
    let entityData = null;

    switch (item.entity) {
      case "products": {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.entityId))
          .limit(1);
        entityData = product;
        break;
      }
      case "orders": {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, item.entityId))
          .limit(1);
        entityData = order;
        break;
      }
      case "customers": {
        const [customer] = await db
          .select()
          .from(customers)
          .where(eq(customers.id, item.entityId))
          .limit(1);
        entityData = customer;
        break;
      }
      case "categories": {
        const [category] = await db
          .select()
          .from(categories)
          .where(eq(categories.id, item.entityId))
          .limit(1);
        entityData = category;
        break;
      }
      case "stores": {
        const [store] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, item.entityId))
          .limit(1);
        entityData = store;
        break;
      }
      case "sessions": {
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, item.entityId))
          .limit(1);
        entityData = session;
        break;
      }
    }

    result.push({
      ...item,
      entityData,
    });
  }

  return result;
}

// ============================================
// GET SYNC QUEUE SUMMARY
// ============================================

export async function getSyncQueueSummary() {
  const db = getOfflineDb();

  const allItems = await db.select().from(syncOutbox);

  const summary = {
    total: allItems.length,
    pending: 0,
    synced: 0,
    failed: 0,
    dead: 0,
    byEntity: {} as Record<
      string,
      {
        total: number;
        pending: number;
        synced: number;
        failed: number;
        dead: number;
      }
    >,
    oldestPending: null as string | null,
    newestPending: null as string | null,
  };

  for (const item of allItems) {
    // Count by status
    if (item.status === "pending") summary.pending++;
    else if (item.status === "synced") summary.synced++;
    else if (item.status === "failed") summary.failed++;
    else if (item.status === "dead") summary.dead++;

    // Count by entity
    if (!summary.byEntity[item.entity]) {
      summary.byEntity[item.entity] = {
        total: 0,
        pending: 0,
        synced: 0,
        failed: 0,
        dead: 0,
      };
    }
    summary.byEntity[item.entity].total++;
    if (item.status === "pending") summary.byEntity[item.entity].pending++;
    else if (item.status === "synced") summary.byEntity[item.entity].synced++;
    else if (item.status === "failed") summary.byEntity[item.entity].failed++;
    else if (item.status === "dead") summary.byEntity[item.entity].dead++;

    // Track oldest and newest pending
    if (item.status === "pending") {
      if (!summary.oldestPending || item.createdAt < summary.oldestPending) {
        summary.oldestPending = item.createdAt;
      }
      if (!summary.newestPending || item.createdAt > summary.newestPending) {
        summary.newestPending = item.createdAt;
      }
    }
  }

  return summary;
}
