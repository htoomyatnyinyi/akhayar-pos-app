// services/offline/offlineSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  syncStatus: "idle" | "syncing" | "complete" | "error";
  syncProgress: number;
  syncError: string | null;
  queuedCount: number;
  lastSyncAt: string | null;
  isInitialized: boolean;
}

const initialState: OfflineState = {
  isOnline: true,
  isSyncing: false,
  syncStatus: "idle",
  syncProgress: 0,
  syncError: null,
  queuedCount: 0,
  lastSyncAt: null,
  isInitialized: false,
};

const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
      state.syncStatus = action.payload ? "syncing" : "idle";
    },
    setSyncProgress: (state, action: PayloadAction<number>) => {
      state.syncProgress = action.payload;
    },
    setSyncComplete: (state) => {
      state.isSyncing = false;
      state.syncStatus = "complete";
      state.syncError = null;
      state.syncProgress = 100;
      state.lastSyncAt = new Date().toISOString();
    },
    setSyncError: (state, action: PayloadAction<string>) => {
      state.isSyncing = false;
      state.syncStatus = "error";
      state.syncError = action.payload;
    },
    setQueuedCount: (state, action: PayloadAction<number>) => {
      state.queuedCount = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
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
  },
});

export const {
  setOnline,
  setSyncing,
  setSyncProgress,
  setSyncComplete,
  setSyncError,
  setQueuedCount,
  setInitialized,
  clearSyncError,
  resetSync,
} = offlineSlice.actions;

export default offlineSlice.reducer;

// import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// interface OfflineState {
//   isOnline: boolean;
//   isInitialized: boolean;
//   isSyncing: boolean;
//   queuedCount: number;
//   lastSyncedAt?: string;
//   lastError?: string;
// }

// const initialState: OfflineState = {
//   isOnline: true,
//   isInitialized: false,
//   isSyncing: false,
//   queuedCount: 0,
// };

// const offlineSlice = createSlice({
//   name: "offline",
//   initialState,
//   reducers: {
//     setOnline(state, action: PayloadAction<boolean>) {
//       state.isOnline = action.payload;
//     },
//     setInitialized(state, action: PayloadAction<boolean>) {
//       state.isInitialized = action.payload;
//     },
//     setSyncing(state, action: PayloadAction<boolean>) {
//       state.isSyncing = action.payload;
//     },
//     setQueuedCount(state, action: PayloadAction<number>) {
//       state.queuedCount = action.payload;
//     },
//     setSyncComplete(state) {
//       state.isSyncing = false;
//       state.lastSyncedAt = new Date().toISOString();
//       state.lastError = undefined;
//     },
//     setSyncError(state, action: PayloadAction<string>) {
//       state.isSyncing = false;
//       state.lastError = action.payload;
//     },
//   },
// });

// export const {
//   setOnline,
//   setInitialized,
//   setSyncing,
//   setQueuedCount,
//   setSyncComplete,
//   setSyncError,
// } = offlineSlice.actions;

// export default offlineSlice.reducer;
