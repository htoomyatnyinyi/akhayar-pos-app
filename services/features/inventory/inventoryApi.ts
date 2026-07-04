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
//   overrideExisting: false,
//   endpoints: (builder) => ({
//     getInventory: builder.query<InventoryItem[], string | undefined>({
//       async queryFn(storeId, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/inventory",
//             params: storeId ? { storeId } : {},
//           });

//           if (!result.error && Array.isArray(result.data)) {
//             // Inventory is essentially joined from products in offline DB,
//             // we could upsert products here, but for now we just return the remote data
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
//           if (typeof result.error.status === "number" && result.error.status < 500)
//             return { error: result.error };
//         }

//         return { data: await createOfflineInventoryMovement(body) };
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
//           if (typeof result.error.status === "number" && result.error.status < 500)
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
