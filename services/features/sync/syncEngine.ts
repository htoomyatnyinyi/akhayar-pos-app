import { OrderRepository } from "@/services/offline/repositories/orderRepo";
import { ProductRepository } from "@/services/offline/repositories/productRepo";
import { CustomerRepository } from "@/services/offline/repositories/customerRepo";
import { SupplierRepository } from "@/services/offline/repositories/supplierRepo";
import { CategoryRepository } from "@/services/offline/repositories/categoryRepo";
import { StoreRepository } from "@/services/offline/repositories/storeRepo";
import { InventoryRepository } from "@/services/offline/repositories/inventoryRepo";
import { db } from "@/services/offline/db";
import { syncState, syncLog } from "@/services/offline/schema";
// import { syncState, syncLog } from "../../services/offline/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const API_URL =
  process.env.EXPO_PUBLIC_POS_URL
    ? `${process.env.EXPO_PUBLIC_POS_URL}/api`
    : process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.57:6060/api";

export class SyncEngine {
  private orderRepo = new OrderRepository();
  private productRepo = new ProductRepository();
  private customerRepo = new CustomerRepository();
  private supplierRepo = new SupplierRepository();
  private categoryRepo = new CategoryRepository();
  private storeRepo = new StoreRepository();
  private inventoryRepo = new InventoryRepository();

  // ────────────────────────────────────────────
  // Main sync – push then pull
  // ────────────────────────────────────────────
  async sync(tenantId: string, token: string) {
    await this.push(tenantId, token);
    await this.pull(tenantId, token);
    await this.updatePendingCount();
  }

  // ────────────────────────────────────────────
  // Push: send pending local records to server
  // ────────────────────────────────────────────
  async push(tenantId: string, token: string) {
    // Orders
    for (const item of await this.orderRepo.getPending()) {
      await this.pushEntity(item, "orders", token);
    }
    // Products
    for (const item of await this.productRepo.getPending()) {
      await this.pushEntity(item, "products", token);
    }
    // Customers
    for (const item of await this.customerRepo.getPending()) {
      await this.pushEntity(item, "customers", token);
    }
    // Suppliers
    for (const item of await this.supplierRepo.getPending()) {
      await this.pushEntity(item, "suppliers", token);
    }
    // Categories
    for (const item of await this.categoryRepo.getPending()) {
      await this.pushEntity(item, "categories", token);
    }
    // Stores
    for (const item of await this.storeRepo.getPending()) {
      await this.pushEntity(item, "stores", token);
    }
    // Inventory
    for (const item of await this.inventoryRepo.getPending()) {
      await this.pushEntity(item, "inventory", token);
    }

    // Update lastPush timestamp
    await db
      .insert(syncState)
      .values({ entityType: "push", lastPushAt: Date.now() })
      .onConflictDoUpdate({
        target: syncState.entityType,
        set: { lastPushAt: Date.now() },
      });
  }

  private async pushEntity(entity: any, endpoint: string, token: string) {
    try {
      const response = await fetch(`${API_URL}/tenant/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(entity),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const server = await response.json();
      // Mark synced based on entity type
      const repoMap: Record<string, any> = {
        orders: this.orderRepo,
        products: this.productRepo,
        customers: this.customerRepo,
        suppliers: this.supplierRepo,
        categories: this.categoryRepo,
        stores: this.storeRepo,
        inventory: this.inventoryRepo,
      };
      if (repoMap[endpoint]) {
        await repoMap[endpoint].markSynced(entity.id, server.id);
      }
    } catch (error: any) {
      await this.logError(endpoint, entity.id, "insert", error.message);
    }
  }

  // ────────────────────────────────────────────
  // Pull: fetch server updates since last sync
  // ────────────────────────────────────────────
  async pull(tenantId: string, token: string) {
    await this.pullEntities("orders", tenantId, token);
    await this.pullEntities("products", tenantId, token);
    await this.pullEntities("customers", tenantId, token);
    await this.pullEntities("suppliers", tenantId, token);
    await this.pullEntities("categories", tenantId, token);
    await this.pullEntities("stores", tenantId, token);
    await this.pullEntities("inventory", tenantId, token);
  }

  private async pullEntities(
    entityType: string,
    tenantId: string,
    token: string,
  ) {
    const state = await db
      .select()
      .from(syncState)
      .where(eq(syncState.entityType, entityType));
    const since = state.length > 0 ? state[0].lastPullAt : 0;

    try {
      // Use the same /tenant/ endpoints as the API slices
      const response = await fetch(
        `${API_URL}/tenant/${entityType}?since=${since}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) return;
      const json = await response.json();
      // Handle both paginated { data: [...] } and plain array responses
      const data = Array.isArray(json) ? json : (json.data || []);
      const repoMap: Record<string, any> = {
        orders: this.orderRepo,
        products: this.productRepo,
        customers: this.customerRepo,
        suppliers: this.supplierRepo,
        categories: this.categoryRepo,
        stores: this.storeRepo,
        inventory: this.inventoryRepo,
      };
      const repo = repoMap[entityType];
      if (repo && Array.isArray(data)) {
        for (const item of data) {
          await repo.upsertFromServer(item);
        }
      }
      // Update lastPull timestamp
      await db
        .insert(syncState)
        .values({ entityType, lastPullAt: Date.now() })
        .onConflictDoUpdate({
          target: syncState.entityType,
          set: { lastPullAt: Date.now() },
        });
    } catch (error) {
      // Network errors during pull are expected when offline — log quietly
      console.log(`Pull ${entityType} skipped (offline or server unavailable)`);
    }
  }

  // ────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────
  private async logError(
    entityType: string,
    entityId: string,
    action: string,
    error: string,
  ) {
    await db.insert(syncLog).values({
      id: uuid(),
      entityType,
      entityId,
      action,
      error,
      status: "failed",
      createdAt: Date.now(),
    });
  }

  private async updatePendingCount() {
    const pending = await this.orderRepo.getPending();
    // Optionally dispatch to Redux – we already have a sync slice.
    // We'll handle this in the sync initializer.
    return pending.length;
  }
}

// import { OrderRepository } from "@/services/offline/repositories/orderRepo";
// import { ProductRepository } from "@/services/offline/repositories/productRepo";
// import { CustomerRepository } from "@/services/offline/repositories/customerRepo";
// import { SupplierRepository } from "@/services/offline/repositories/supplierRepo";
// import { CategoryRepository } from "@/services/offline/repositories/categoryRepo";
// import { InventoryRepository } from "@/services/offline/repositories/inventoryRepo";
// import { StoreRepository } from "@/services/offline/repositories/storeRepo";
// import { db } from "@/services/offline/db";
// import { syncState, syncLog } from "@/services/offline/schema";
// import { eq } from "drizzle-orm";
// import { v4 as uuid } from "uuid";

// const API_URL = process.env.EXPO_PUBLIC_API_URL;

// export class SyncEngine {
//   private orderRepo = new OrderRepository();
//   private productRepo = new ProductRepository();
//   private customerRepo = new CustomerRepository();
//   private supplierRepo = new SupplierRepository();
//   private categoryRepo = new CategoryRepository();
//   private storeRepo = new StoreRepository();
//   private inventoryRepo = new InventoryRepository();

//   // ── Main sync ──
//   async sync(tenantId: string, token: string) {
//     await this.push(tenantId, token);
//     await this.pull(tenantId, token);
//     await this.updatePendingCount();
//   }

//   // ── Push ──
//   async push(tenantId: string, token: string) {
//     // Push products
//     const pendingProducts = await this.productRepo.getPending();
//     for (const localProduct of pendingProducts) {
//       try {
//         const response = await fetch(`${API_URL}/tenant/products`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(localProduct),
//         });
//         if (!response.ok) throw new Error(`Server error: ${response.status}`);
//         const serverProduct = await response.json();
//         await this.productRepo.markSynced(localProduct.id, serverProduct.id);
//       } catch (error: any) {
//         await this.logSyncError(
//           "product",
//           localProduct.id,
//           "insert",
//           error.message,
//         );
//       }
//     }

//     // Push orders
//     const pendingOrders = await this.orderRepo.getPendingOrders();
//     for (const localOrder of pendingOrders) {
//       try {
//         const response = await fetch(`${API_URL}/tenant/orders`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(localOrder),
//         });
//         if (!response.ok) throw new Error(`Server error: ${response.status}`);
//         const serverOrder = await response.json();
//         await this.orderRepo.markSynced(localOrder.id, serverOrder.id);
//       } catch (error: any) {
//         await this.logSyncError(
//           "order",
//           localOrder.id,
//           "insert",
//           error.message,
//         );
//       }
//     }

//     // Push suppliers
//     for (const item of await this.supplierRepo.getPending()) {
//       await this.pushEntity(item, "supplier", token);
//     }
//     // Push categories
//     for (const item of await this.categoryRepo.getPending()) {
//       await this.pushEntity(item, "categories", token);
//     }
//     // Push stores
//     for (const item of await this.storeRepo.getPending()) {
//       await this.pushEntity(item, "stores", token);
//     }
//     // Push inventory
//     for (const item of await this.inventoryRepo.getPending()) {
//       await this.pushEntity(item, "inventory", token);
//     }

//     // Update syncState for push
//     await db
//       .insert(syncState)
//       .values({ entityType: "push", lastPushAt: Date.now() })
//       .onConflictDoUpdate({
//         target: syncState.entityType,
//         set: { lastPushAt: Date.now() },
//       });
//   }

//   // ── Push entity (helper) ──
//   private async pushEntity(entity: any, endpoint: string, token: string) {
//     try {
//       const response = await fetch(`${API_URL}/tenant/${endpoint}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(entity),
//       });
//       if (!response.ok) throw new Error(`HTTP ${response.status}`);
//       const server = await response.json();
//       // Mark synced based on entity type
//       switch (endpoint) {
//         case "supplier":
//           await this.supplierRepo.markSynced(entity.id, server.id);
//           break;
//         case "categories":
//           await this.categoryRepo.markSynced(entity.id, server.id);
//           break;
//         case "stores":
//           await this.storeRepo.markSynced(entity.id, server.id);
//           break;
//         case "inventory":
//           await this.inventoryRepo.markSynced(entity.id, server.id);
//           break;
//       }
//     } catch (error) {
//       await this.logSyncError(endpoint, entity.id, "insert", error.message);
//     }
//   }

//   // ── Pull ──
//   async pull(tenantId: string, token: string) {
//     await this.pullEntities("supplier", tenantId, token);
//     await this.pullEntities("category", tenantId, token);
//     await this.pullEntities("store", tenantId, token);
//     await this.pullEntities("inventory", tenantId, token);

//     // ── Products ──
//     const productState = await db
//       .select()
//       .from(syncState)
//       .where(eq(syncState.entityType, "product"));
//     const productSince =
//       productState.length > 0 ? productState[0].lastPullAt : 0;

//     try {
//       const response = await fetch(
//         `${API_URL}/tenant/products/sync?since=${productSince}`,
//         { headers: { Authorization: `Bearer ${token}` } },
//       );
//       if (response.ok) {
//         const serverProducts = await response.json();
//         for (const sp of serverProducts) {
//           await this.productRepo.upsertFromServer(sp);
//         }
//         await db
//           .insert(syncState)
//           .values({ entityType: "product", lastPullAt: Date.now() })
//           .onConflictDoUpdate({
//             target: syncState.entityType,
//             set: { lastPullAt: Date.now() },
//           });
//       }
//     } catch (error: any) {
//       console.error("Product pull failed", error);
//     }

//     // ── Orders ──
//     const orderState = await db
//       .select()
//       .from(syncState)
//       .where(eq(syncState.entityType, "order"));
//     const orderSince = orderState.length > 0 ? orderState[0].lastPullAt : 0;

//     try {
//       const response = await fetch(
//         `${API_URL}/tenant/orders/sync?since=${orderSince}`,
//         { headers: { Authorization: `Bearer ${token}` } },
//       );
//       if (response.ok) {
//         const serverOrders = await response.json();
//         for (const so of serverOrders) {
//           await this.orderRepo.upsertFromServer(so);
//         }
//         await db
//           .insert(syncState)
//           .values({ entityType: "order", lastPullAt: Date.now() })
//           .onConflictDoUpdate({
//             target: syncState.entityType,
//             set: { lastPullAt: Date.now() },
//           });
//       }
//     } catch (error: any) {
//       console.error("Order pull failed", error);
//     }
//   }

//   // --- Generic pull methods for other entities ---
//   private async pullEntities(
//     entityType: string,
//     tenantId: string,
//     token: string,
//   ) {
//     const state = await db
//       .select()
//       .from(syncState)
//       .where(eq(syncState.entityType, entityType));
//     const since = state.length > 0 ? state[0].lastPullAt : 0;
//     try {
//       const response = await fetch(
//         `${API_URL}/tenant/${entityType}s/sync?since=${since}`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         },
//       );
//       if (response.ok) {
//         const data = await response.json();
//         for (const item of data) {
//           switch (entityType) {
//             case "supplier":
//               await this.supplierRepo.upsertFromServer(item);
//               break;
//             case "category":
//               await this.categoryRepo.upsertFromServer(item);
//               break;
//             case "store":
//               await this.storeRepo.upsertFromServer(item);
//               break;
//             case "inventory":
//               await this.inventoryRepo.upsertFromServer(item);
//               break;
//           }
//         }
//         await db
//           .insert(syncState)
//           .values({ entityType, lastPullAt: Date.now() })
//           .onConflictDoUpdate({
//             target: syncState.entityType,
//             set: { lastPullAt: Date.now() },
//           });
//       }
//     } catch (error) {
//       console.error(`Pull ${entityType} failed`, error);
//     }
//   }

//   // ── Log sync errors ──
//   async logSyncError(
//     entityType: string,
//     entityId: string,
//     action: string,
//     error: string,
//   ) {
//     await db.insert(syncLog).values({
//       id: uuid(),
//       entityType,
//       entityId,
//       action,
//       error,
//       status: "failed",
//       createdAt: Date.now(),
//     });
//   }

//   // ── Update pending count in Redux ──
//   async updatePendingCount() {
//     const pendingProducts = await db
//       .select()
//       .from(product)
//       .where(eq(product.syncStatus, "pending"));
//     const pendingOrders = await db
//       .select()
//       .from(order)
//       .where(eq(order.syncStatus, "pending"));
//     // Dispatch via store (handled in App)
//     return pendingProducts.length + pendingOrders.length;
//   }
// }
