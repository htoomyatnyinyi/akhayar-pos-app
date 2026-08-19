import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";

import authReducer from "@/services/features/auth/authSlice";
import cartReducer from "@/services/features/cart/cartSlice";
import settingsReducer from "@/services/features/settings/settingsSlice";

// import offlineReducer from "@/services/offline/offlineSlice";
import offlineReducer from "@/services/features/offline/offlineSlice";

import { posApi } from "@/services/api/posApi";
import { localApi } from "../features/offline/localApi";
import { remoteApi } from "../api/remoteApi";

// Safe storage wrapper for redux-persist
const safeStorage = {
  getItem: async (key: string) => {
    try {
      if (AsyncStorage?.getItem) {
        return await AsyncStorage.getItem(key);
      }
      return null;
    } catch (e) {
      console.warn("Storage getItem fallback:", e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (AsyncStorage?.setItem) {
        await AsyncStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("Storage setItem fallback:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (AsyncStorage?.removeItem) {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("Storage removeItem fallback:", e);
    }
  },
};

const persistConfig = {
  key: "root",
  version: 1,
  storage: safeStorage,
  whitelist: ["auth", "settings"], // Persist auth and settings
};

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  settings: settingsReducer,
  offline: offlineReducer,
  [posApi.reducerPath]: posApi.reducer,
  [localApi.reducerPath]: localApi.reducer,
  [remoteApi.reducerPath]: remoteApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(posApi.middleware)
      .concat(localApi.middleware)
      .concat(remoteApi.middleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
