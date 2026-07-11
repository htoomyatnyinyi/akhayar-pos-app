import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

let POS_URL = process.env.EXPO_PUBLIC_POS_URL || "http://192.168.1.178:6060";
// let POS_URL = process.env.EXPO_PUBLIC_POS_URL || "https://pos.oasislab.de5.net";
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
    "CashRegister",
    "Wallets",
    "ApiKeys",
    "Tenants",
    "AuditLogs",
    "TenantStoreSettings",
    "Webhooks",
    "CashRegisters",
    "TenantApiKeys",
    "Customers",
    "Staff",
    "Categories",
    "SupplierPayments",
    "Inventory",
    "Brands",
    "Suppliers",
    "Sessions",
    "Stores",
    "PurchaseOrders",
    "StockTransfers",
    "ExpenseCategories",
    "Expenses",
    "Promotions",
    "StoreSettings",
    "Notifications",
    "TaxRates",
    "Dashboard",
    "GiftCards",
    "Reports",
  ],

  endpoints: () => ({}),
});
