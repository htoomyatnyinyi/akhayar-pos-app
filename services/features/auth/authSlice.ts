import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  saveToken,
  saveTenantId,
  saveUser,
  removeToken,
  removeTenantId,
  removeUser,
} from "@/utils/secureStorage";

export interface AuthState {
  user: any | null;
  token: string | null;
  tenantId: string | null;
  selectedStoreId: string | null;
  isAuthenticated: boolean;
  isPlatform: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  tenantId: null,
  selectedStoreId: null,
  isAuthenticated: false,
  isPlatform: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: any;
        token: string;
        tenantId: string;
        stores?: any[];
      }>,
    ) => {
      const { user, token, tenantId, stores } = action.payload;
      state.user = user;
      state.token = token;
      state.tenantId = tenantId;
      state.isAuthenticated = true;
      state.isPlatform = user?.role === "SUPER_ADMIN";
      if (stores && stores.length > 0) {
        state.selectedStoreId = stores[0].id;
      }
      saveToken(token);
      saveTenantId(tenantId);
      saveUser(user);
    },
    setSelectedStore: (state, action: PayloadAction<string>) => {
      state.selectedStoreId = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.tenantId = null;
      state.selectedStoreId = null;
      state.isAuthenticated = false;
      state.isPlatform = false;
      removeToken();
      removeTenantId();
      removeUser();
    },
  },
});

export const { setCredentials, setSelectedStore, logout } = authSlice.actions;
export default authSlice.reducer;

// import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// import type { User } from "./authTypes";

// interface AuthState {
//   user: User | null;
//   currentStoreId: string | null;
//   lastTenantCode: string;
// }

// const initialState: AuthState = {
//   user: null,
//   currentStoreId: null,
//   lastTenantCode: "",
// };

// const authSlice = createSlice({
//   name: "auth",
//   initialState,
//   reducers: {
//     setUser: (state, action: PayloadAction<User>) => {
//       state.user = action.payload;
//       if (action.payload.stores.length > 0) {
//         state.currentStoreId = action.payload.stores[0].id;
//       }
//       if (action.payload.tenant?.code) {
//         state.lastTenantCode = action.payload.tenant.code;
//       }
//     },
//     setStore: (state, action: PayloadAction<string>) => {
//       state.currentStoreId = action.payload;
//     },
//     setLastTenantCode: (state, action: PayloadAction<string>) => {
//       state.lastTenantCode = action.payload;
//     },
//     logout: (state) => {
//       state.user = null;
//       state.currentStoreId = null;
//     },
//     clearUser: (state) => {
//       state.user = null;
//     },
//   },
// });

// export const { setUser, logout, setStore, setLastTenantCode, clearUser } =
//   authSlice.actions;

// export default authSlice.reducer;
