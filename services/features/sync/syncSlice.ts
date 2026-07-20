import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingItems: number; // count of pending entities
}

const initialState: SyncState = {
  isOnline: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingItems: 0,
};

const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    setLastSync: (state, action: PayloadAction<number>) => {
      state.lastSyncAt = action.payload;
    },
    setPendingCount: (state, action: PayloadAction<number>) => {
      state.pendingItems = action.payload;
    },
  },
});

export const { setOnlineStatus, setSyncing, setLastSync, setPendingCount } =
  syncSlice.actions;
export default syncSlice.reducer;
