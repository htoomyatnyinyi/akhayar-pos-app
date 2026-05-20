import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { User } from "./authTypes";

interface AuthState {
  user: User | null;
  currentStoreId: string | null;
}

const initialState: AuthState = {
  user: null,
  currentStoreId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // Automatically select the first store if available
      if (action.payload.stores && action.payload.stores.length > 0) {
        state.currentStoreId = action.payload.stores[0].id;
      }
    },
    setStore: (state, action: PayloadAction<string>) => {
      state.currentStoreId = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.currentStoreId = null;
    },
  },
});

export const { setUser, logout, setStore } = authSlice.actions;

export default authSlice.reducer;
