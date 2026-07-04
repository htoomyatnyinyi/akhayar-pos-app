// services/offline/offlineSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface OfflineState {
  // Network status
  isOnline: boolean;

  // Sync status
  isSyncing: boolean;
  syncStatus: "idle" | "syncing" | "complete" | "error";
  syncProgress: number; // 0-100
  syncError: string | null;

  // Queue status
  queuedCount: number;
  failedCount: number;

  // Timestamps
  lastSyncAt: string | null;
  lastErrorAt: string | null;

  // Initialization
  isInitialized: boolean;

  // Sync statistics (optional but useful)
  syncStats?: {
    totalSynced: number;
    totalFailed: number;
    lastSyncDuration: number; // in milliseconds
  };
}

const initialState: OfflineState = {
  // Network
  isOnline: true,

  // Sync
  isSyncing: false,
  syncStatus: "idle",
  syncProgress: 0,
  syncError: null,

  // Queue
  queuedCount: 0,
  failedCount: 0,

  // Timestamps
  lastSyncAt: null,
  lastErrorAt: null,

  // Init
  isInitialized: false,

  // Stats
  syncStats: {
    totalSynced: 0,
    totalFailed: 0,
    lastSyncDuration: 0,
  },
};

const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    // ============================================
    // Network Status
    // ============================================
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (action.payload && state.syncError) {
        // Auto-clear error when back online
        state.syncError = null;
        state.syncStatus = "idle";
      }
    },

    // ============================================
    // Sync Status
    // ============================================
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
      state.syncStatus = action.payload ? "syncing" : "idle";
      if (action.payload) {
        state.syncError = null;
        state.syncProgress = 0;
      }
    },

    setSyncProgress: (state, action: PayloadAction<number>) => {
      state.syncProgress = Math.min(100, Math.max(0, action.payload));
    },

    setSyncComplete: (state) => {
      state.isSyncing = false;
      state.syncStatus = "complete";
      state.syncError = null;
      state.syncProgress = 100;
      state.lastSyncAt = new Date().toISOString();
      if (state.syncStats) {
        state.syncStats.totalSynced += 1;
      }
    },

    setSyncError: (state, action: PayloadAction<string>) => {
      state.isSyncing = false;
      state.syncStatus = "error";
      state.syncError = action.payload;
      state.lastErrorAt = new Date().toISOString();
      if (state.syncStats) {
        state.syncStats.totalFailed += 1;
      }
    },

    clearSyncError: (state) => {
      state.syncError = null;
      state.syncStatus = "idle";
    },

    resetSync: (state) => {
      state.isSyncing = false;
      state.syncStatus = "idle";
      state.syncProgress = 0;
      state.syncError = null;
    },

    // ============================================
    // Queue Status
    // ============================================
    setQueuedCount: (state, action: PayloadAction<number>) => {
      state.queuedCount = Math.max(0, action.payload);
    },

    setFailedCount: (state, action: PayloadAction<number>) => {
      state.failedCount = Math.max(0, action.payload);
    },

    incrementQueuedCount: (state, action: PayloadAction<number>) => {
      state.queuedCount += action.payload;
    },

    decrementQueuedCount: (state, action: PayloadAction<number>) => {
      state.queuedCount = Math.max(0, state.queuedCount - action.payload);
    },

    // ============================================
    // Initialization
    // ============================================
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },

    // ============================================
    // Sync Statistics
    // ============================================
    setSyncDuration: (state, action: PayloadAction<number>) => {
      if (state.syncStats) {
        state.syncStats.lastSyncDuration = action.payload;
      }
    },

    incrementSyncedCount: (state, action: PayloadAction<number>) => {
      if (state.syncStats) {
        state.syncStats.totalSynced += action.payload;
      }
    },

    incrementFailedCount: (state, action: PayloadAction<number>) => {
      if (state.syncStats) {
        state.syncStats.totalFailed += action.payload;
      }
    },

    resetSyncStats: (state) => {
      state.syncStats = {
        totalSynced: 0,
        totalFailed: 0,
        lastSyncDuration: 0,
      };
    },

    // ============================================
    // Full Reset (for logout or app reset)
    // ============================================
    resetOfflineState: (state) => {
      state.isSyncing = false;
      state.syncStatus = "idle";
      state.syncProgress = 0;
      state.syncError = null;
      state.queuedCount = 0;
      state.failedCount = 0;
      state.lastSyncAt = null;
      state.lastErrorAt = null;
      state.syncStats = {
        totalSynced: 0,
        totalFailed: 0,
        lastSyncDuration: 0,
      };
    },
  },
});

// ============================================
// Actions
// ============================================
export const {
  // Network
  setOnline,

  // Sync
  setSyncing,
  setSyncProgress,
  setSyncComplete,
  setSyncError,
  clearSyncError,
  resetSync,

  // Queue
  setQueuedCount,
  setFailedCount,
  incrementQueuedCount,
  decrementQueuedCount,

  // Init
  setInitialized,

  // Stats
  setSyncDuration,
  incrementSyncedCount,
  incrementFailedCount,
  resetSyncStats,

  // Reset
  resetOfflineState,
} = offlineSlice.actions;

// ============================================
// Selectors
// ============================================
export const selectIsOnline = (state: { offline: OfflineState }) =>
  state.offline.isOnline;
export const selectIsSyncing = (state: { offline: OfflineState }) =>
  state.offline.isSyncing;
export const selectSyncStatus = (state: { offline: OfflineState }) =>
  state.offline.syncStatus;
export const selectSyncProgress = (state: { offline: OfflineState }) =>
  state.offline.syncProgress;
export const selectSyncError = (state: { offline: OfflineState }) =>
  state.offline.syncError;
export const selectQueuedCount = (state: { offline: OfflineState }) =>
  state.offline.queuedCount;
export const selectFailedCount = (state: { offline: OfflineState }) =>
  state.offline.failedCount;
export const selectLastSyncAt = (state: { offline: OfflineState }) =>
  state.offline.lastSyncAt;
export const selectIsInitialized = (state: { offline: OfflineState }) =>
  state.offline.isInitialized;
export const selectSyncStats = (state: { offline: OfflineState }) =>
  state.offline.syncStats;

export default offlineSlice.reducer;
