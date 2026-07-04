// import { posApi } from "@/services/api/posApi";
// import { isOnline } from "@/services/offline/network";
// import {
//   createOfflineStore,
//   deleteOfflineEntity,
//   getLocalStores,
//   updateOfflineEntity,
//   upsertStores,
// } from "@/services/offline/repository";
// import { Store, CreateStorePayload } from "./storeTypes";

// export const storeApi = posApi.injectEndpoints({
//   overrideExisting: false,
//   endpoints: (builder) => ({
//     getStores: builder.query<Store[], void>({
//       async queryFn(_arg, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery("/tenant/stores");
//           if (!result.error && Array.isArray(result.data)) {
//             await upsertStores(result.data as Store[]);
//             return { data: await getLocalStores() };
//           }
//         }

//         return { data: await getLocalStores() };
//       },
//       providesTags: ["Stores" as any],
//     }),

//     getStoreById: builder.query<Store, string>({
//       query: (id) => `/tenant/stores/${id}`,
//       providesTags: ["Stores" as any],
//     }),

//     createStore: builder.mutation<Store, CreateStorePayload>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/stores",
//             method: "POST",
//             body,
//           });
//           if (!result.error) return { data: result.data as Store };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await createOfflineStore(body) };
//       },
//       invalidatesTags: ["Stores" as any],
//     }),

//     updateStore: builder.mutation<
//       Store,
//       { id: string; data: Partial<CreateStorePayload> }
//     >({
//       async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
//         if (await isOnline() && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/stores/${id}`,
//             method: "PUT",
//             body: data,
//           });
//           if (!result.error) return { data: result.data as Store };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await updateOfflineEntity("stores", id, data);
//         return {
//           data: (await getLocalStores()).find(
//             (store) => store.id === id,
//           ) as Store,
//         };
//       },
//       invalidatesTags: ["Stores" as any],
//     }),

//     deleteStore: builder.mutation<void, string>({
//       async queryFn(id, _api, _extraOptions, baseQuery) {
//         if (await isOnline() && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/stores/${id}`,
//             method: "DELETE",
//           });
//           if (!result.error) return { data: undefined };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await deleteOfflineEntity("stores", id);
//         return { data: undefined };
//       },
//       invalidatesTags: ["Stores" as any],
//     }),
//   }),
// });

// export const {
//   useGetStoresQuery,
//   useGetStoreByIdQuery,
//   useCreateStoreMutation,
//   useUpdateStoreMutation,
//   useDeleteStoreMutation,
// } = storeApi;
