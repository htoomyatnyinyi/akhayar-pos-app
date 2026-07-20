// import { baseApi } from "../../services/api/baseApi";
import { baseApi } from "@/services/api/baseApi";

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Get inventory (stock levels) ──
    getInventory: builder.query<
      any,
      { storeId?: string; productId?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/tenant/inventory",
        params: {
          storeId: params.storeId,
          productId: params.productId,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }),
      providesTags: ["Inventory"],
    }),

    // ── Get stock movements ──
    getStockMovements: builder.query<
      any,
      { storeId?: string; type?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/tenant/inventory/movements",
        params: {
          storeId: params.storeId,
          type: params.type,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }),
      providesTags: ["Inventory"],
    }),

    // ── Create manual stock movement ──
    createStockMovement: builder.mutation<any, any>({
      query: (body) => ({
        url: "/tenant/inventory/movements",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),

    // ── Get inventory counts ──
    getInventoryCounts: builder.query<
      any,
      { storeId?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: "/tenant/inventory/counts",
        params: {
          storeId: params.storeId,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }),
      providesTags: ["Inventory"],
    }),

    // ── Create inventory count ──
    createInventoryCount: builder.mutation<any, any>({
      query: (body) => ({
        url: "/tenant/inventory/counts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetInventoryQuery,
  useGetStockMovementsQuery,
  useCreateStockMovementMutation,
  useGetInventoryCountsQuery,
  useCreateInventoryCountMutation,
} = inventoryApi;

// import { posApi } from "@/services/api/posApi";
// import { isOnline } from "@/services/offline/network";
// import {
//   getLocalInventory,
//   createOfflineInventoryMovement,
//   createOfflineInventoryCount,
// } from "@/services/offline/repository";

// import type {
//   InventoryItem,
//   InventoryMovement,
//   CreateMovementPayload,
//   CreateCountPayload,
// } from "./inventoryTypes";

// export const inventoryApi = posApi.injectEndpoints({
//   overrideExisting: true,
//   endpoints: (builder) => ({
//     getInventory: builder.query<InventoryItem[], string | undefined>({
//       async queryFn(storeId, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/inventory",
//             params: storeId ? { storeId } : {},
//           });

//           if (!result.error && Array.isArray(result.data)) {
//             return { data: result.data as InventoryItem[] };
//           }
//         }

//         return { data: await getLocalInventory(storeId) };
//       },
//       providesTags: ["Inventory"],
//     }),

//     createMovement: builder.mutation<InventoryMovement, CreateMovementPayload>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/inventory/movements/",
//             method: "POST",
//             body,
//           });
//           if (!result.error) return { data: result.data as InventoryMovement };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return {
//           data: (await createOfflineInventoryMovement(
//             body,
//           )) as InventoryMovement,
//         };
//       },
//       invalidatesTags: ["Inventory", "Products"],
//     }),

//     createCount: builder.mutation<any, CreateCountPayload>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/inventory/counts/",
//             method: "POST",
//             body,
//           });
//           if (!result.error) return { data: result.data };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await createOfflineInventoryCount(body) };
//       },
//       invalidatesTags: ["Inventory", "Products"],
//     }),
//   }),
// });

// export const {
//   useGetInventoryQuery,
//   useCreateMovementMutation,
//   useCreateCountMutation,
// } = inventoryApi;
