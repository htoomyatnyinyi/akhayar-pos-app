import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface OfflineState {
  isOnline: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  queuedCount: number;
  lastSyncedAt?: string;
  lastError?: string;
}

const initialState: OfflineState = {
  isOnline: true,
  isInitialized: false,
  isSyncing: false,
  queuedCount: 0,
};

const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.isInitialized = action.payload;
    },
    setSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },
    setQueuedCount(state, action: PayloadAction<number>) {
      state.queuedCount = action.payload;
    },
    setSyncComplete(state) {
      state.isSyncing = false;
      state.lastSyncedAt = new Date().toISOString();
      state.lastError = undefined;
    },
    setSyncError(state, action: PayloadAction<string>) {
      state.isSyncing = false;
      state.lastError = action.payload;
    },
  },
});

export const {
  setOnline,
  setInitialized,
  setSyncing,
  setQueuedCount,
  setSyncComplete,
  setSyncError,
} = offlineSlice.actions;

export default offlineSlice.reducer;
