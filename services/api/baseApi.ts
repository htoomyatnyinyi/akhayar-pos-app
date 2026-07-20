import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getToken } from "@/utils/secureStorage";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:6060/api";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: [
    "Order",
    "Product",
    "Customer",
    "Inventory",
    "Category",
    "Supplier",
    "Store",
    "Sync",
  ],
  endpoints: () => ({}),
});
