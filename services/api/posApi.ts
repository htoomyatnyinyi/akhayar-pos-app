import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

let POS_URL = process.env.EXPO_PUBLIC_POS_URL || "https://pos.oasislab.de5.net";
if (!POS_URL.endsWith("/api")) {
  POS_URL = `${POS_URL}/api`;
}

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

  tagTypes: ["Auth", "Products", "Orders", "Customers", "Staff", "Categories", "Inventory", "Sessions", "Stores"],

  endpoints: () => ({}),
});
