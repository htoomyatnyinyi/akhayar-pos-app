import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { User } from "./authTypes";

interface AuthState {
  user: User | null;
  currentStoreId: string | null;
  lastTenantCode: string;
}

const initialState: AuthState = {
  user: null,
  currentStoreId: null,
  lastTenantCode: "",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      if (action.payload.stores.length > 0) {
        state.currentStoreId = action.payload.stores[0].id;
      }
      if (action.payload.tenant?.code) {
        state.lastTenantCode = action.payload.tenant.code;
      }
    },
    setStore: (state, action: PayloadAction<string>) => {
      state.currentStoreId = action.payload;
    },
    setLastTenantCode: (state, action: PayloadAction<string>) => {
      state.lastTenantCode = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.currentStoreId = null;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
});

export const { setUser, logout, setStore, setLastTenantCode, clearUser } =
  authSlice.actions;

export default authSlice.reducer;
