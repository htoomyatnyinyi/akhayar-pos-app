import { OrderRepository } from "@/services/offline/repositories/orderRepo";
import { ProductRepository } from "@/services/offline/repositories/productRepo";
import { CustomerRepository } from "@/services/offline/repositories/customerRepo";
import { SupplierRepository } from "@/services/offline/repositories/supplierRepo";
import { CategoryRepository } from "@/services/offline/repositories/categoryRepo";
import { StoreRepository } from "@/services/offline/repositories/storeRepo";
import { InventoryRepository } from "@/services/offline/repositories/inventoryRepo";
import { StaffRepository } from "@/services/offline/repositories/staffRepo";
import { SessionRepository } from "@/services/offline/repositories/sessionRepo";
import { db } from "@/services/offline/db";
import { syncState, syncLog } from "@/services/offline/schema";
// import { syncState, syncLog } from "../../services/offline/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const API_URL = process.env.EXPO_PUBLIC_POS_URL
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
  private staffRepo = new StaffRepository();
  private sessionRepo = new SessionRepository();

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
    // Staff
    for (const item of await this.staffRepo.getPending()) {
      await this.pushEntity(item, "staff", token);
    }
    // Sessions
    for (const item of await this.sessionRepo.getPending()) {
      await this.pushEntity(item, "sessions", token);
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
        staff: this.staffRepo,
        sessions: this.sessionRepo,
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
    await this.pullEntities("staff", tenantId, token);
    await this.pullEntities("sessions", tenantId, token);
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
      const data = Array.isArray(json) ? json : json.data || [];
      const repoMap: Record<string, any> = {
        orders: this.orderRepo,
        products: this.productRepo,
        customers: this.customerRepo,
        suppliers: this.supplierRepo,
        categories: this.categoryRepo,
        stores: this.storeRepo,
        inventory: this.inventoryRepo,
        staff: this.staffRepo,
        sessions: this.sessionRepo,
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
