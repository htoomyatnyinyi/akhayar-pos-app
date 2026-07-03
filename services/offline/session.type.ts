// types/session.types.ts
export interface LocalSession {
  id: string; // local id: ses_xxx
  remoteId?: string; // backend id: 8c9f...
  userId: string;
  storeId: string;
  openingBalance: number;
  closingBalance?: number;
  status: "OPEN" | "CLOSING" | "CLOSED" | "SYNC_ERROR";
  openedAt: string;
  closedAt?: string;
  notes?: string;
  syncStatus: "pending" | "synced" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithSession {
  id: string;
  sessionId: string; // local session id initially
  remoteSessionId?: string; // will be filled after session sync
  // ... other order fields
}
