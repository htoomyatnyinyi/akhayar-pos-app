import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

let POS_URL = process.env.EXPO_PUBLIC_POS_URL || "https://pos.oasislab.de5.net";
if (!POS_URL.endsWith("/api")) {
  POS_URL = `${POS_URL}/api`;
}

export const POS_API_URL = POS_URL;

export const posApi = createApi({
  reducerPath: "posApi",
  baseQuery: fetchBaseQuery({
    baseUrl: POS_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth.user?.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  refetchOnFocus: true,
  refetchOnReconnect: true,

  tagTypes: [
    "Auth",
    "Products",
    "ProductVariants",
    "InventoryMovements",
    "InventoryCounts",
    "PriceHistory",
    "Payments",
    "Returns",
    "Orders",
    "CustomerOrders",
    "Customers",
    "Staff",
    "Categories",
    "Inventory",
    "Sessions",
    "Stores",
    "PurchaseOrders",
    "StockTransfers",
    "Suppliers",
    "Promotions",
    "StoreSettings",
    "Notifications",
    "TaxRates",
    "Dashboard",
    "Reports",
    "Brands",
  ],

  endpoints: () => ({}),
});
