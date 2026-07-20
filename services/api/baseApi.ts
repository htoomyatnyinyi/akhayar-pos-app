import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
// import { getToken } from "../secureStorage";
import { getToken } from "@/utils/secureStorage";
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://localhost:6060/api";

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
  ],
  endpoints: () => ({}),
});

// import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
// // import { getToken } from "../secureStorage";
// import { getToken } from "@/utils/secureStorage";

// const BASE_URL =
//   process.env.EXPO_PUBLIC_API_URL || "https://your-backend.com/api";

// export const baseApi = createApi({
//   reducerPath: "api",
//   baseQuery: fetchBaseQuery({
//     baseUrl: BASE_URL,
//     prepareHeaders: async (headers) => {
//       const token = await getToken();
//       if (token) headers.set("Authorization", `Bearer ${token}`);
//       return headers;
//     },
//   }),
//   tagTypes: [
//     "Order",
//     "Product",
//     "Customer",
//     "Supplier",
//     "Category",
//     "Store",
//     "Inventory",
//     "Sync",
//   ],
//   endpoints: () => ({}),
// });

// // import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// // const BASE_URL =
// //   process.env.EXPO_PUBLIC_API_URL || "https://localhost:6060/api";

// // export const baseApi = createApi({
// //   reducerPath: "api",
// //   baseQuery: fetchBaseQuery({
// //     baseUrl: BASE_URL,
// //     prepareHeaders: (headers) => {
// //       const token = localStorage.getItem("token"); // or secure store
// //       if (token) headers.set("Authorization", `Bearer ${token}`);
// //       return headers;
// //     },
// //   }),
// //   tagTypes: ["Order", "Product", "Customer", "Sync"],
// //   endpoints: () => ({}),
// // });
