import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { getOfflineDb, getSqliteDatabase } from "./db";
import { createLocalId } from "./ids";
import {
  categories,
  customers,
  genericRecords,
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
import type { Category, CreateCategoryPayload } from "@/services/features/categories/categoryTypes";
import type { CreateCustomerPayload, Customer } from "@/services/features/customers/customerTypes";
import type { CreateOrderPayload } from "@/services/features/order/orderApi";
import type { Order } from "@/services/features/order/orderTypes";
import type { Product } from "@/services/features/products/productTypes";
import type { CloseSessionPayload, Session } from "@/services/features/sessions/sessionTypes";
import type { CreateStorePayload, Store } from "@/services/features/stores/storeTypes";

export function normalizeProduct(product: Product & Record<string, any>): typeof products.$inferInsert {
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
    stockQuantity: Number(product.stockQuantity ?? product.inventory?.quantity ?? 0),
    version: Number(product.version ?? 0),
    isActive: product.isActive ?? true,
    deletedAt: product.deletedAt,
    createdAt: product.createdAt ?? new Date().toISOString(),
    updatedAt: product.updatedAt ?? new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function upsertProducts(remoteProducts: Product[]) {
  if (!remoteProducts.length) return;

  const db = getOfflineDb();
  await db
    .insert(products)
    .values(remoteProducts.map((product) => normalizeProduct(product)))
    .onConflictDoUpdate({
      target: products.id,
      set: {
        sku: sql`excluded.sku`,
        barcode: sql`excluded.barcode`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        brand: sql`excluded.brand`,
        categoryId: sql`excluded.category_id`,
        categoryName: sql`excluded.category_name`,
        supplierId: sql`excluded.supplier_id`,
        costPrice: sql`excluded.cost_price`,
        sellingPrice: sql`excluded.selling_price`,
        stockQuantity: sql`excluded.stock_quantity`,
        version: sql`excluded.version`,
        isActive: sql`excluded.is_active`,
        deletedAt: sql`excluded.deleted_at`,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: sql`excluded.last_synced_at`,
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
        remoteId: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        syncStatus: "synced",
        syncError: null,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: categories.id,
      set: {
        remoteId: sql`excluded.remote_id`,
        name: sql`excluded.name`,
        slug: sql`excluded.slug`,
        description: sql`excluded.description`,
        parentId: sql`excluded.parent_id`,
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
        remoteId: customer.id,
        code: customer.code,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        dateOfBirth: customer.dateOfBirth,
        gender: customer.gender,
        loyaltyPoints: customer.loyaltyPoints,
        totalSpent: customer.totalSpent,
        totalOrders: customer.totalOrders,
        tier: customer.tier,
        tierValidUntil: customer.tierValidUntil,
        isActive: customer.isActive,
        syncStatus: "synced",
        syncError: null,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: customers.id,
      set: {
        remoteId: sql`excluded.remote_id`,
        code: sql`excluded.code`,
        name: sql`excluded.name`,
        phone: sql`excluded.phone`,
        email: sql`excluded.email`,
        address: sql`excluded.address`,
        dateOfBirth: sql`excluded.date_of_birth`,
        gender: sql`excluded.gender`,
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
        remoteId: store.id,
        code: store.code,
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        taxNumber: store.taxNumber,
        isActive: store.isActive,
        syncStatus: "synced",
        syncError: null,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: stores.id,
      set: {
        remoteId: sql`excluded.remote_id`,
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
        remoteId: session.id,
        userId: session.userId,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        openingBalance: session.openingBalance,
        closingBalance: session.closingBalance,
        expectedBalance: session.expectedBalance,
        discrepancy: session.discrepancy,
        cashSales: session.cashSales,
        cardSales: session.cardSales,
        digitalSales: session.digitalSales,
        notes: session.notes,
        syncStatus: "synced",
        syncError: null,
        createdAt: session.openedAt,
        updatedAt: session.closedAt ?? session.openedAt,
        lastSyncedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: sessions.id,
      set: {
        remoteId: sql`excluded.remote_id`,
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

export async function getLocalProducts(storeId?: string) {
  const db = getOfflineDb();
  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        storeId ? or(eq(products.storeId, storeId), sql`${products.storeId} IS NULL`) : undefined,
      ),
    );

  return rows.map(toProduct);
}

export async function createOfflineProduct(payload: Partial<Product> & { categoryName?: string; storeId?: string }) {
  const now = new Date().toISOString();
  const id = createLocalId("prod");

  await getOfflineDb().insert(products).values({
    id,
    storeId: payload.storeId,
    sku: payload.sku ?? `LOCAL-${Date.now().toString(36).toUpperCase()}`,
    barcode: payload.barcode,
    name: payload.name ?? "Offline product",
    description: payload.description,
    brand: payload.brand,
    categoryId: payload.categoryId ?? "",
    categoryName: payload.categoryName,
    supplierId: payload.supplierId,
    costPrice: Number(payload.costPrice ?? 0),
    sellingPrice: Number(payload.sellingPrice ?? 0),
    stockQuantity: Number(payload.stockQuantity ?? 0),
    isActive: true,
    syncStatus: "pending" as never,
    createdAt: now,
    updatedAt: now,
  } as typeof products.$inferInsert);

  await enqueueMutation("products", id, "create", "/tenant/products", "POST", payload);
  return toProduct((await getOfflineDb().select().from(products).where(eq(products.id, id)).limit(1))[0]);
}

export async function updateOfflineProduct(id: string, data: Partial<Product> & { categoryName?: string }) {
  await getOfflineDb()
    .update(products)
    .set({ ...data, updatedAt: new Date().toISOString() } as Partial<typeof products.$inferInsert>)
    .where(eq(products.id, id));

  await enqueueMutation("products", id, "update", `/tenant/products/${id}`, "PUT", data);
  const [row] = await getOfflineDb().select().from(products).where(eq(products.id, id)).limit(1);
  return toProduct(row);
}

export async function deleteOfflineProduct(id: string) {
  await getOfflineDb()
    .update(products)
    .set({ isActive: false, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));

  await enqueueMutation("products", id, "delete", `/tenant/products/${id}`, "DELETE", {});
}

export async function getLocalCategories(storeId?: string) {
  const rows = await getOfflineDb()
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.isActive, true),
        storeId ? or(eq(categories.storeId, storeId), sql`${categories.storeId} IS NULL`) : undefined,
      ),
    );

  return rows.map(toCategory);
}

export async function getLocalCustomers() {
  const rows = await getOfflineDb()
    .select()
    .from(customers)
    .where(eq(customers.isActive, true));

  return rows.map(toCustomer);
}

export async function getLocalStores() {
  const rows = await getOfflineDb().select().from(stores).where(eq(stores.isActive, true));
  return rows.map(toStore);
}

export async function getLocalActiveSession(userId: string, storeId?: string) {
  const [row] = await getOfflineDb()
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, "OPEN"),
        storeId ? or(eq(sessions.storeId, storeId), sql`${sessions.storeId} IS NULL`) : undefined,
      ),
    )
    .limit(1);

  return row ? toSession(row) : undefined;
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

export async function createOfflineCustomer(payload: CreateCustomerPayload) {
  const now = new Date().toISOString();
  const id = createLocalId("cus");
  const code = `LOCAL-${Date.now().toString(36).toUpperCase()}`;

  await getOfflineDb().insert(customers).values({
    id,
    code,
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    dateOfBirth: payload.dateOfBirth,
    gender: payload.gender,
    loyaltyPoints: 0,
    totalSpent: 0,
    totalOrders: 0,
    tier: "BRONZE",
    isActive: true,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  await enqueueMutation("customers", id, "create", "/tenant/customers", "POST", payload);
  return toCustomer((await getOfflineDb().select().from(customers).where(eq(customers.id, id)).limit(1))[0]);
}

export async function createOfflineCategory(payload: CreateCategoryPayload & { storeId?: string }) {
  const now = new Date().toISOString();
  const id = createLocalId("cat");

  await getOfflineDb().insert(categories).values({
    id,
    storeId: payload.storeId,
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    parentId: payload.parentId,
    isActive: payload.isActive ?? true,
    sortOrder: payload.sortOrder ?? 0,
    syncStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });

  await enqueueMutation("categories", id, "create", "/tenant/categories", "POST", payload);
  return toCategory((await getOfflineDb().select().from(categories).where(eq(categories.id, id)).limit(1))[0]);
}

export async function createOfflineStore(payload: CreateStorePayload) {
  const now = new Date().toISOString();
  const id = createLocalId("store");
  const code = payload.code ?? `LOCAL-${Date.now().toString(36).toUpperCase()}`;

  await getOfflineDb().insert(stores).values({
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

  await enqueueMutation("stores", id, "create", "/tenant/stores", "POST", { ...payload, code });
  return toStore((await getOfflineDb().select().from(stores).where(eq(stores.id, id)).limit(1))[0]);
}

export async function openOfflineSession(payload: { userId: string; openingBalance: number; notes?: string; storeId?: string }) {
  const now = new Date().toISOString();
  const id = createLocalId("ses");

  await getOfflineDb().insert(sessions).values({
    id,
    userId: payload.userId,
    storeId: payload.storeId,
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

  await enqueueMutation("sessions", id, "open", "/tenant/sessions/open", "POST", payload);
  return toSession((await getOfflineDb().select().from(sessions).where(eq(sessions.id, id)).limit(1))[0]);
}

export async function closeOfflineSession(sessionId: string, payload: CloseSessionPayload) {
  const now = new Date().toISOString();

  await getOfflineDb()
    .update(sessions)
    .set({
      status: "CLOSED",
      closedAt: now,
      closingBalance: payload.closingBalance,
      notes: payload.notes,
      syncStatus: "pending",
      updatedAt: now,
    })
    .where(or(eq(sessions.id, sessionId), eq(sessions.remoteId, sessionId)));

  await enqueueMutation("sessions", sessionId, "close", `/tenant/sessions/${sessionId}/close`, "POST", payload);
  const [row] = await getOfflineDb()
    .select()
    .from(sessions)
    .where(or(eq(sessions.id, sessionId), eq(sessions.remoteId, sessionId)))
    .limit(1);

  return toSession(row);
}

export async function updateOfflineEntity(
  entity: "customers" | "categories" | "stores",
  id: string,
  data: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const table = entity === "customers" ? customers : entity === "categories" ? categories : stores;
  await getOfflineDb()
    .update(table)
    .set({ ...toSqliteUpdate(data), syncStatus: "pending", updatedAt: now })
    .where(eq(table.id, id));

  await enqueueMutation(entity, id, "update", `/tenant/${entity}/${id}`, "PUT", data);
}

export async function deleteOfflineEntity(entity: "customers" | "categories" | "stores", id: string) {
  const now = new Date().toISOString();
  const table = entity === "customers" ? customers : entity === "categories" ? categories : stores;
  await getOfflineDb()
    .update(table)
    .set({ isActive: false, syncStatus: "pending", updatedAt: now })
    .where(eq(table.id, id));

  await enqueueMutation(entity, id, "delete", `/tenant/${entity}/${id}`, "DELETE", {});
}

export async function upsertGenericRecords<T extends { id: string }>(entity: string, records: T[]) {
  if (!records.length) return;
  const now = new Date().toISOString();
  await getOfflineDb()
    .insert(genericRecords)
    .values(
      records.map((record) => ({
        id: record.id,
        remoteId: record.id,
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
        remoteId: sql`excluded.remote_id`,
        data: sql`excluded.data`,
        isActive: sql`excluded.is_active`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: sql`excluded.updated_at`,
        lastSyncedAt: now,
      },
    });
}

export async function getLocalGenericRecords<T>(entity: string) {
  const rows = await getOfflineDb()
    .select()
    .from(genericRecords)
    .where(and(eq(genericRecords.entity, entity), eq(genericRecords.isActive, true)));

  return rows.map((row) => ({ ...(row.data as T), id: row.remoteId ?? row.id }));
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

export async function updateOfflineGenericRecord<T extends Record<string, any>>(
  entity: string,
  endpoint: string,
  id: string,
  data: T,
) {
  const now = new Date().toISOString();
  const [row] = await getOfflineDb().select().from(genericRecords).where(eq(genericRecords.id, id)).limit(1);
  const nextData = { ...((row?.data as Record<string, any>) ?? { id }), ...data, updatedAt: now };

  await getOfflineDb()
    .update(genericRecords)
    .set({ data: nextData, syncStatus: "pending", updatedAt: now })
    .where(eq(genericRecords.id, id));

  await enqueueMutation(entity, id, "update", endpoint, "PUT", data);
  return nextData;
}

export async function deleteOfflineGenericRecord(entity: string, endpoint: string, id: string) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(genericRecords)
    .set({ isActive: false, syncStatus: "pending", updatedAt: now })
    .where(eq(genericRecords.id, id));

  await enqueueMutation(entity, id, "delete", endpoint, "DELETE", {});
}

export async function createOfflineOrder(payload: CreateOrderPayload): Promise<Order> {
  const db = getOfflineDb();
  const sqlite = getSqliteDatabase();
  const now = new Date().toISOString();
  const orderId = createLocalId("ord");
  const outboxId = createLocalId("outbox");

  sqlite.withTransactionSync(() => {
    sqlite.runSync(
      `INSERT INTO orders (
        id, store_id, user_id, customer_id, session_id, status, payment_status,
        payment_method, sub_total, tax_amount, discount_amount, grand_total,
        paid_amount, change_amount, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        payload.storeId ?? null,
        payload.userId,
        payload.customerId ?? null,
        payload.sessionId ?? null,
        "PENDING",
        payload.paymentStatus ?? "PAID",
        payload.paymentMethod,
        payload.subTotal,
        payload.taxAmount ?? 0,
        payload.discountAmount ?? 0,
        payload.grandTotal,
        payload.paidAmount,
        payload.changeAmount,
        JSON.stringify(payload.paymentBreakdown ?? []),
        "pending",
        now,
        now,
      ],
    );

    for (const item of payload.items) {
      sqlite.runSync(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name, quantity, unit_price,
          discount_amount, sub_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createLocalId("item"),
          orderId,
          item.productId,
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
        outboxId,
        "orders",
        orderId,
        "create",
        "/tenant/orders",
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

  const [created] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    return {
      id: created.id,
      grandTotal: created.grandTotal,
      status: created.status,
      createdAt: created.createdAt,
      subTotal: created.subTotal,
      taxAmount: created.taxAmount,
      discountAmount: created.discountAmount,
      paidAmount: created.paidAmount,
      changeAmount: created.changeAmount,
      paymentMethod: created.paymentMethod,
      paymentStatus: created.paymentStatus,
      paymentBreakdown: parsePaymentBreakdown(created.paymentBreakdown ?? payload.paymentBreakdown),
      customerId: created.customerId ?? undefined,
      storeId: created.storeId ?? undefined,
      userId: created.userId,
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName ?? "",
      price: item.unitPrice,
      quantity: item.quantity,
      product: { name: item.productName ?? "", sellingPrice: String(item.unitPrice) },
    })),
  };
}

export async function upsertOrders(remoteOrders: (Order & Record<string, any>)[]) {
  if (!remoteOrders.length) return;
  const now = new Date().toISOString();

  for (const order of remoteOrders) {
    await getOfflineDb()
      .insert(orders)
      .values({
        id: order.id,
        remoteId: order.id,
        storeId: order.storeId,
        userId: order.userId ?? "",
        customerId: order.customerId,
        sessionId: order.sessionId,
        orderNumber: order.orderNumber,
        status: order.status,
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
        createdAt: order.createdAt ?? now,
        updatedAt: order.updatedAt ?? now,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: orders.id,
        set: {
          remoteId: order.id,
          status: order.status,
          paymentStatus: sql`excluded.payment_status`,
          grandTotal: sql`excluded.grand_total`,
          syncStatus: "synced",
          syncError: null,
          updatedAt: sql`excluded.updated_at`,
          lastSyncedAt: now,
        },
      });

    // Upsert order items if present
    if (Array.isArray(order.items)) {
      for (const item of order.items as (OrderItem & Record<string, any>)[]) {
        await getOfflineDb()
          .insert(orderItems)
          .values({
            id: item.id ?? createLocalId("item"),
            orderId: order.id,
            productId: item.productId,
            productName: item.productName ?? item.product?.name ?? null,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice ?? item.price ?? 0),
            discountAmount: Number(item.discountAmount ?? 0),
            subTotal: Number(item.subTotal ?? item.quantity * Number(item.unitPrice ?? item.price ?? 0)),
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
    .where(or(eq(orders.id, id), eq(orders.remoteId, id)))
    .limit(1);

  return row ? toOrder(row) : undefined;
}

export async function updateOfflineOrderStatus(id: string, status: string) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(orders)
    .set({ status, syncStatus: "pending", updatedAt: now })
    .where(or(eq(orders.id, id), eq(orders.remoteId, id)));

  await enqueueMutation("orders", id, "updateStatus", `/tenant/orders/${id}/status`, "PATCH", { status });
  const order = await getLocalOrderById(id);
  if (!order) throw new Error("Order not found in offline cache");
  return order;
}

export async function deleteOfflineOrder(id: string) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(orders)
    .set({ status: "VOIDED", syncStatus: "pending", updatedAt: now })
    .where(or(eq(orders.id, id), eq(orders.remoteId, id)));

  await enqueueMutation("orders", id, "delete", `/tenant/orders/${id}`, "DELETE", {});
}

export async function markOrderSynced(localId: string, remote: Order & Record<string, any>) {
  const now = new Date().toISOString();
  await getOfflineDb()
    .update(orders)
    .set({
      remoteId: remote.id,
      status: remote.status ?? "COMPLETED",
      syncStatus: "synced",
      syncError: null,
      lastSyncedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, localId));
}

export async function markEntitySynced(entity: string, localId: string, remote: Record<string, any>) {
  const now = new Date().toISOString();
  const id = String(remote.id ?? localId);
  const common = {
    remoteId: id,
    syncStatus: "synced",
    syncError: null,
    updatedAt: remote.updatedAt ?? now,
    lastSyncedAt: now,
  };

  if (entity === "products") {
    await getOfflineDb().update(products).set({ lastSyncedAt: now, updatedAt: now }).where(eq(products.id, localId));
  } else if (entity === "customers") {
    await getOfflineDb().update(customers).set({ ...common, code: remote.code }).where(eq(customers.id, localId));
  } else if (entity === "categories") {
    await getOfflineDb().update(categories).set(common).where(eq(categories.id, localId));
  } else if (entity === "stores") {
    await getOfflineDb().update(stores).set({ ...common, code: remote.code }).where(eq(stores.id, localId));
  } else if (entity === "sessions") {
    await getOfflineDb().update(sessions).set(common).where(eq(sessions.id, localId));
  } else {
    await getOfflineDb()
      .update(genericRecords)
      .set({
        remoteId: id,
        data: remote.id ? remote : sql`${genericRecords.data}`,
        syncStatus: "synced",
        syncError: null,
        updatedAt: remote.updatedAt ?? now,
        lastSyncedAt: now,
      })
      .where(eq(genericRecords.id, localId));
  }
}

export async function markOrderSyncFailed(localId: string, error: string) {
  await getOfflineDb()
    .update(orders)
    .set({ syncStatus: "failed", syncError: error, updatedAt: new Date().toISOString() })
    .where(eq(orders.id, localId));
}

export async function markEntitySyncFailed(entity: string, localId: string, error: string) {
  const update = { syncStatus: "failed", syncError: error, updatedAt: new Date().toISOString() };
  if (entity === "products") {
    await getOfflineDb().update(products).set({ syncStatus: "failed", syncError: error, updatedAt: new Date().toISOString() } as any).where(eq(products.id, localId));
  } else if (entity === "customers") {
    await getOfflineDb().update(customers).set(update).where(eq(customers.id, localId));
  } else if (entity === "categories") {
    await getOfflineDb().update(categories).set(update).where(eq(categories.id, localId));
  } else if (entity === "stores") {
    await getOfflineDb().update(stores).set(update).where(eq(stores.id, localId));
  } else if (entity === "sessions") {
    await getOfflineDb().update(sessions).set(update).where(eq(sessions.id, localId));
  } else {
    await getOfflineDb().update(genericRecords).set(update).where(eq(genericRecords.id, localId));
  }
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

export async function markOutboxSynced(id: string) {
  await getOfflineDb().delete(syncOutbox).where(eq(syncOutbox.id, id));
}

export async function markOutboxFailed(id: string, attempts: number, error: string) {
  const delaySeconds = Math.min(300, Math.pow(2, attempts) * 5);
  const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

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
    stockQuantity: product.stockQuantity,
    categoryId: product.categoryId ?? "",
    category: product.categoryId
      ? { id: product.categoryId, name: product.categoryName ?? "" }
      : undefined,
    supplierId: product.supplierId ?? undefined,
    createdAt: product.createdAt,
  };
}

async function toOrder(order: LocalOrder): Promise<Order> {
  const items = await getOfflineDb().select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return {
    id: order.remoteId ?? order.id,
    grandTotal: order.grandTotal,
    status: order.status,
    createdAt: order.createdAt,
    subTotal: order.subTotal,
    taxAmount: order.taxAmount,
    discountAmount: order.discountAmount,
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentBreakdown: parsePaymentBreakdown(order.paymentBreakdown),
    customerId: order.customerId ?? undefined,
    storeId: order.storeId ?? undefined,
    userId: order.userId,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName ?? "",
      price: item.unitPrice,
      quantity: item.quantity,
      product: { name: item.productName ?? "", sellingPrice: String(item.unitPrice) },
    })),
  };
}

function toCategory(category: LocalCategory): Category {
  return {
    id: category.remoteId ?? category.id,
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
    id: customer.remoteId ?? customer.id,
    code: customer.code,
    name: customer.name,
    phone: customer.phone ?? undefined,
    email: customer.email ?? undefined,
    address: customer.address ?? undefined,
    dateOfBirth: customer.dateOfBirth ?? undefined,
    gender: customer.gender ?? undefined,
    loyaltyPoints: customer.loyaltyPoints,
    totalSpent: customer.totalSpent,
    totalOrders: customer.totalOrders,
    tier: customer.tier,
    tierValidUntil: customer.tierValidUntil ?? undefined,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

function toStore(store: LocalStore): Store {
  return {
    id: store.remoteId ?? store.id,
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
    id: session.remoteId ?? session.id,
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

async function enqueueMutation(
  entity: string,
  entityId: string,
  operation: string,
  endpoint: string,
  method: string,
  payload: unknown,
) {
  const now = new Date().toISOString();
  await getOfflineDb().insert(syncOutbox).values({
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

function toSqliteUpdate(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (key === "taxNumber") return ["taxNumber", value];
      if (key === "dateOfBirth") return ["dateOfBirth", value];
      if (key === "parentId") return ["parentId", value];
      return [key, value];
    }),
  );
}
