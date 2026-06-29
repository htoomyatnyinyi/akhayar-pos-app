Yes, you're absolutely right! A **repository** is a pattern that interacts with the database (in your case, SQLite) to perform CRUD operations. Let me explain the architecture:

## Repository Pattern in Your App

### 1. **What is a Repository?**

A repository is a layer that sits between your business logic and the database. It handles:

- Database queries (SELECT, INSERT, UPDATE, DELETE)
- Data mapping between database and your application models
- Abstracting the database implementation details

### 2. **Your Current Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│                    (manage.tsx, etc.)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Service Layer                        │
│              (staffApi, productApi, etc.)                   │
│           - useGetStaffQuery, useCreateStaffMutation        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                         │
│         (Should interact with SQLite directly)              │
│           - StaffRepository, ProductRepository              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Database                        │
│                  (Local storage)                            │
└─────────────────────────────────────────────────────────────┘
```

### 3. **How Repositories Should Work**

Here's an example of what a repository should look like:

```typescript
// repositories/StaffRepository.ts
import { Database } from "react-native-sqlite-storage";

export interface Staff {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "CASHIER" | "ACCOUNTANT";
  permissions: string[];
  isActive: boolean;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export class StaffRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Create table
  async createTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        permissions TEXT, -- JSON array
        isActive INTEGER DEFAULT 1,
        storeId TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `;
    await this.db.execute(query);
  }

  // Insert staff member
  async create(
    staff: Omit<Staff, "id" | "createdAt" | "updatedAt">,
  ): Promise<Staff> {
    const id = generateId();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO staff (id, username, email, name, role, permissions, isActive, storeId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      staff.username,
      staff.email || null,
      staff.name,
      staff.role,
      JSON.stringify(staff.permissions),
      staff.isActive ? 1 : 0,
      staff.storeId || null,
      now,
      now,
    ];

    await this.db.execute(query, params);

    return {
      id,
      ...staff,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Get staff by ID
  async findById(id: string): Promise<Staff | null> {
    const query = "SELECT * FROM staff WHERE id = ?";
    const result = await this.db.execute(query, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      permissions: JSON.parse(row.permissions),
      isActive: row.isActive === 1,
    };
  }

  // Get all staff for a store
  async findByStoreId(storeId: string): Promise<Staff[]> {
    const query = "SELECT * FROM staff WHERE storeId = ? AND isActive = 1";
    const result = await this.db.execute(query, [storeId]);

    return result.rows.map((row) => ({
      ...row,
      permissions: JSON.parse(row.permissions),
      isActive: row.isActive === 1,
    }));
  }

  // Update staff
  async update(id: string, data: Partial<Staff>): Promise<Staff | null> {
    const fields: string[] = [];
    const params: any[] = [];

    // Build dynamic update query
    Object.entries(data).forEach(([key, value]) => {
      if (key === "permissions") {
        fields.push("permissions = ?");
        params.push(JSON.stringify(value));
      } else if (key === "isActive") {
        fields.push("isActive = ?");
        params.push(value ? 1 : 0);
      } else if (value !== undefined) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) return null;

    fields.push("updatedAt = ?");
    params.push(new Date().toISOString());
    params.push(id);

    const query = `UPDATE staff SET ${fields.join(", ")} WHERE id = ?`;
    await this.db.execute(query, params);

    return this.findById(id);
  }

  // Delete staff
  async delete(id: string): Promise<boolean> {
    const query = "DELETE FROM staff WHERE id = ?";
    await this.db.execute(query, [id]);
    return true;
  }

  // Soft delete (set inactive)
  async softDelete(id: string): Promise<boolean> {
    const query = "UPDATE staff SET isActive = 0, updatedAt = ? WHERE id = ?";
    await this.db.execute(query, [new Date().toISOString(), id]);
    return true;
  }
}
```

### 4. **Integration with Your API Services**

Your API services should use these repositories:

```typescript
// services/features/staff/staffApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { StaffRepository } from "@/repositories/StaffRepository";
import { getDatabase } from "@/utils/database";

const staffRepository = new StaffRepository(getDatabase());

export const staffApi = createApi({
  reducerPath: "staffApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Staff"],
  endpoints: (builder) => ({
    getStaff: builder.query<Staff[], string | undefined>({
      queryFn: async (storeId) => {
        try {
          const staff = storeId
            ? await staffRepository.findByStoreId(storeId)
            : await staffRepository.findAll();
          return { data: staff };
        } catch (error) {
          return { error: { message: error.message } };
        }
      },
      providesTags: ["Staff"],
    }),
    createStaff: builder.mutation<Staff, Partial<Staff>>({
      queryFn: async (staffData) => {
        try {
          const staff = await staffRepository.create(staffData);
          return { data: staff };
        } catch (error) {
          return { error: { message: error.message } };
        }
      },
      invalidatesTags: ["Staff"],
    }),
    updateStaff: builder.mutation<Staff, { id: string; data: Partial<Staff> }>({
      queryFn: async ({ id, data }) => {
        try {
          const staff = await staffRepository.update(id, data);
          if (!staff) throw new Error("Staff not found");
          return { data: staff };
        } catch (error) {
          return { error: { message: error.message } };
        }
      },
      invalidatesTags: ["Staff"],
    }),
    deleteStaff: builder.mutation<boolean, string>({
      queryFn: async (id) => {
        try {
          await staffRepository.delete(id);
          return { data: true };
        } catch (error) {
          return { error: { message: error.message } };
        }
      },
      invalidatesTags: ["Staff"],
    }),
  }),
});
```

### 5. **Benefits of Using Repositories**

1. **Separation of Concerns**: Business logic is separated from database logic
2. **Testability**: Easy to mock repositories for unit testing
3. **Maintainability**: Database changes only affect the repository layer
4. **Reusability**: Repositories can be used across different parts of the app
5. **Cache Management**: Can implement caching strategies at repository level

### 6. **For Your SQLite Database**

You'd need to set up SQLite with React Native:

```bash
npm install react-native-sqlite-storage
# or
npm install @react-native-community/sqlite
```

Then initialize it:

```typescript
// utils/database.ts
import SQLite from "react-native-sqlite-storage";

let db: SQLite.Database | null = null;

export const getDatabase = () => {
  if (!db) {
    db = SQLite.openDatabase(
      {
        name: "MyApp.db",
        location: "default",
      },
      () => {},
      (error) => {
        console.error("Database error:", error);
      },
    );
  }
  return db;
};

// Initialize all tables
export const initializeDatabase = async () => {
  const db = getDatabase();
  const repositories = [
    new StaffRepository(db),
    new ProductRepository(db),
    new StoreRepository(db),
    // ... etc
  ];

  for (const repo of repositories) {
    await repo.createTable();
  }
};
```

So yes, **repositories are the layer that directly interacts with your SQLite database** to perform all CRUD operations, and your API services use these repositories to fetch and manipulate data.

Great question! **Sync** is the process of keeping your local SQLite database in sync with the remote server. Here's a comprehensive explanation of how sync works in your application:

## Sync Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Remote Server (Cloud)                   │
│                    (Your Backend API)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │  HTTP/HTTPS (REST API)
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Sync Service Layer                       │
│         - Conflict Resolution                               │
│         - Change Detection                                  │
│         - Batch Processing                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Local SQLite Database                    │
│                   (Offline-first storage)                   │
└─────────────────────────────────────────────────────────────┘
```

## 1. **Sync Strategies**

### **A. Manual Sync (User-Triggered)**

```typescript
// services/sync/syncService.ts
export class SyncService {
  private db: Database;
  private apiClient: ApiClient;

  constructor(db: Database, apiClient: ApiClient) {
    this.db = db;
    this.apiClient = apiClient;
  }

  // User clicks "Sync Now" button
  async manualSync(): Promise<SyncResult> {
    try {
      const result = {
        pulled: 0,
        pushed: 0,
        errors: [],
      };

      // 1. PUSH local changes to server
      const localChanges = await this.getLocalChanges();
      for (const change of localChanges) {
        try {
          await this.pushChange(change);
          result.pushed++;
        } catch (error) {
          result.errors.push({
            change,
            error: error.message,
          });
        }
      }

      // 2. PULL remote changes from server
      const remoteChanges = await this.getRemoteChanges();
      for (const change of remoteChanges) {
        try {
          await this.applyChange(change);
          result.pulled++;
        } catch (error) {
          result.errors.push({
            change,
            error: error.message,
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  private async getLocalChanges(): Promise<Change[]> {
    // Query changes that haven't been synced
    const query = `
      SELECT * FROM sync_queue 
      WHERE synced_at IS NULL 
      ORDER BY created_at ASC
    `;
    const result = await this.db.execute(query);
    return result.rows;
  }

  private async getRemoteChanges(): Promise<Change[]> {
    const lastSyncTime = await this.getLastSyncTime();
    return this.apiClient.getChanges({
      since: lastSyncTime,
      entityTypes: ["staff", "products", "categories", "customers"],
    });
  }

  private async pushChange(change: Change): Promise<void> {
    await this.apiClient.pushChange(change);
    // Mark as synced
    await this.markSynced(change.id);
  }

  private async applyChange(change: Change): Promise<void> {
    // Apply remote change to local database
    const { entityType, action, data } = change;
    const repository = this.getRepository(entityType);

    switch (action) {
      case "CREATE":
        await repository.create(data);
        break;
      case "UPDATE":
        await repository.update(data.id, data);
        break;
      case "DELETE":
        await repository.delete(data.id);
        break;
    }
  }
}
```

### **B. Automatic Sync (Real-time/Background)**

```typescript
// services/sync/autoSyncService.ts
export class AutoSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    private syncService: SyncService,
    private intervalMs: number = 30000, // 30 seconds
  ) {}

  startAutoSync(): void {
    if (this.syncInterval) return;

    // Immediate first sync
    this.performSync();

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performSync(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;
    try {
      // Check if online
      const isOnline = await this.checkConnectivity();
      if (!isOnline) {
        console.log("Offline - skipping sync");
        return;
      }

      const result = await this.syncService.manualSync();
      console.log(
        `Sync completed: ${result.pulled} pulled, ${result.pushed} pushed`,
      );

      // Notify UI if needed
      this.notifySyncComplete(result);
    } catch (error) {
      console.error("Auto sync failed:", error);
      this.notifySyncError(error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    // Check network connectivity
    return navigator.onLine;
  }

  private notifySyncComplete(result: SyncResult): void {
    // Emit event or update Redux state
    eventEmitter.emit("sync:complete", result);
  }
}
```

### **C. Real-time Sync (WebSocket)**

```typescript
// services/sync/realtimeSync.ts
export class RealtimeSyncService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private apiClient: ApiClient,
    private syncService: SyncService,
  ) {}

  connect(): void {
    const wsUrl = this.apiClient.getWebSocketUrl();
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected for real-time sync");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case "ENTITY_CHANGED":
        // Immediately apply change to local DB
        this.applyRemoteChange(message.payload);
        break;
      case "SYNC_REQUEST":
        // Server requesting sync
        this.syncService.manualSync();
        break;
      case "CONFLICT":
        // Handle conflict
        this.resolveConflict(message.payload);
        break;
    }
  }

  private async applyRemoteChange(change: Change): Promise<void> {
    const { entityType, action, data } = change;

    // Check for conflicts (local modifications)
    if (await this.hasLocalChanges(data.id, entityType)) {
      await this.resolveConflict({
        remote: data,
        local: await this.getLocalData(data.id, entityType),
      });
    } else {
      await this.syncService.applyChange(change);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts})`);
        this.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }
}
```

## 2. **Conflict Resolution**

```typescript
// services/sync/conflictResolver.ts
export class ConflictResolver {
  async resolveConflict(context: ConflictContext): Promise<Resolution> {
    const { localData, remoteData, entityType } = context;

    // Strategy 1: Last Write Wins (LWW)
    if (localData.updatedAt > remoteData.updatedAt) {
      return {
        winner: "LOCAL",
        resolvedData: localData,
        action: "PUSH_TO_SERVER",
      };
    } else if (remoteData.updatedAt > localData.updatedAt) {
      return {
        winner: "REMOTE",
        resolvedData: remoteData,
        action: "PULL_TO_LOCAL",
      };
    }

    // Strategy 2: Manual Resolution (User decides)
    return {
      winner: "PENDING",
      requiresUserInput: true,
      localData,
      remoteData,
    };

    // Strategy 3: Merge (Combine changes)
    // For example, merge arrays or different fields
    const mergedData = {
      ...localData,
      ...remoteData,
      // Custom merge logic for specific fields
      permissions: [
        ...new Set([...localData.permissions, ...remoteData.permissions]),
      ],
      updatedAt: new Date().toISOString(),
    };

    return {
      winner: "MERGE",
      resolvedData: mergedData,
      action: "SYNC_BOTH_WAYS",
    };
  }
}
```

## 3. **Change Tracking (Sync Queue)**

```typescript
// services/sync/changeTracker.ts
export class ChangeTracker {
  constructor(private db: Database) {}

  // Track changes for sync
  async trackChange(
    entityType: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    data: any,
  ): Promise<void> {
    const query = `
      INSERT INTO sync_queue (
        id,
        entity_type,
        action,
        data,
        created_at,
        synced_at
      ) VALUES (?, ?, ?, ?, ?, NULL)
    `;

    await this.db.execute(query, [
      generateId(),
      entityType,
      action,
      JSON.stringify(data),
      new Date().toISOString(),
    ]);
  }

  // Get pending changes
  async getPendingChanges(): Promise<SyncQueueItem[]> {
    const query = `
      SELECT * FROM sync_queue 
      WHERE synced_at IS NULL 
      ORDER BY created_at ASC
    `;
    const result = await this.db.execute(query);
    return result.rows.map((row) => ({
      ...row,
      data: JSON.parse(row.data),
    }));
  }

  // Mark as synced
  async markAsSynced(changeId: string): Promise<void> {
    const query = `
      UPDATE sync_queue 
      SET synced_at = ? 
      WHERE id = ?
    `;
    await this.db.execute(query, [new Date().toISOString(), changeId]);
  }
}
```

## 4. **Sync Table Schema**

```sql
-- Sync queue table
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'staff', 'products', 'categories'
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  data TEXT NOT NULL, -- JSON data
  created_at TEXT NOT NULL,
  synced_at TEXT,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT
);

-- Sync metadata
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

-- Conflicts table
CREATE TABLE sync_conflicts (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  local_data TEXT,
  remote_data TEXT,
  resolved_at TEXT,
  resolution TEXT, -- 'LOCAL_WINS', 'REMOTE_WINS', 'MANUAL'
  status TEXT -- 'PENDING', 'RESOLVED'
);
```

## 5. **Using Sync in Your App**

```typescript
// In your ManageScreen component
import { useSync } from '@/hooks/useSync';

export default function ManageScreen() {
  const { sync, isSyncing, lastSyncTime, syncStatus } = useSync();

  // Trigger manual sync
  const handleSync = async () => {
    const result = await sync();
    if (result.success) {
      Alert.alert('Sync Complete',
        `Pulled ${result.pulled} changes, Pushed ${result.pushed} changes`
      );
    } else {
      Alert.alert('Sync Failed', result.error);
    }
  };

  return (
    <View>
      <ActionButton
        title={isSyncing ? "Syncing..." : "Sync Now"}
        icon="sync"
        accent="sky"
        onPress={handleSync}
        disabled={isSyncing}
      />
      <Text className="text-slate-400">
        Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'}
      </Text>
    </View>
  );
}
```

## 6. **Sync Best Practices**

1. **Offline-First**: Always save to local DB first, sync later
2. **Conflict Resolution**: Have clear conflict resolution strategies
3. **Retry Logic**: Implement exponential backoff for failed syncs
4. **Batch Processing**: Sync in batches to avoid overwhelming the server
5. **User Feedback**: Show sync status/progress to users
6. **Selective Sync**: Only sync what's needed (e.g., current store)
7. **Delta Sync**: Only sync changes, not entire datasets
8. **Sync Scheduling**: Sync during off-peak hours or when on Wi-Fi

## 7. **Complete Sync Flow Example**

```typescript
// Example: Creating a product with sync
const handleCreateProduct = async (productData) => {
  try {
    // 1. Save to local DB immediately
    const localProduct = await productRepository.create({
      ...productData,
      storeId: currentStoreId,
      _synced: false,
    });

    // 2. Track change for sync
    await changeTracker.trackChange("products", "CREATE", localProduct);

    // 3. Update UI immediately (optimistic update)
    updateUI(localProduct);

    // 4. If online, sync immediately
    if (await checkConnectivity()) {
      await syncService.syncNow();
    }

    Alert.alert("Success", "Product created locally");
  } catch (error) {
    Alert.alert("Error", "Failed to create product");
  }
};
```

This sync architecture ensures your app works offline-first, provides real-time updates, and handles conflicts gracefully!
