import { baseApi } from "@/services/api/baseApi";

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<any, { storeId?: string; status?: string }>({
      query: (params) => ({
        url: "/tenant/orders",
        params: { ...params, limit: 100 },
      }),
      providesTags: ["Order"],
    }),
    createOrder: builder.mutation<any, any>({
      query: (body) => ({
        url: "/tenant/orders",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Order"],
    }),
    updateOrderStatus: builder.mutation<any, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/tenant/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Order", id }],
    }),
    // Pull orders for sync (since timestamp)
    getOrdersSync: builder.query<any, { since?: number }>({
      query: ({ since }) => ({
        url: "/tenant/orders/sync",
        params: { since },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useLazyGetOrdersSyncQuery,
} = ordersApi;

// import { posApi } from "@/services/api/posApi";
// import {
//   createOfflineOrder,
//   deleteOfflineOrder,
//   getLocalOrderById,
//   getLocalOrders,
//   updateOfflineOrderStatus,
//   upsertOrders,
// } from "@/services/offline/repository";
// import { isOnline } from "@/services/offline/network";
// import { Order } from "./orderTypes";
// export type { CreateOrderPayload } from "./orderTypes";

// export const orderApi = posApi.injectEndpoints({
//   // overrideExisting: false,
//   overrideExisting: true, //  true လို့ ပြောင်းပေးလိုက်ပါ

//   endpoints: (builder) => ({
//     getOrders: builder.query<Order[], string | undefined>({
//       async queryFn(storeId, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery(
//             `/tenant/orders${storeId ? `?storeId=${storeId}` : ""}`,
//           );
//           if (!result.error) {
//             const data = result.data as Order[];
//             if (Array.isArray(data)) await upsertOrders(data);
//             return { data: await getLocalOrders(storeId) };
//           }
//         }

//         return { data: await getLocalOrders(storeId) };
//       },

//       providesTags: ["Orders"],
//     }),

//     createOrder: builder.mutation<Order, CreateOrderPayload>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/orders",
//             method: "POST",
//             body,
//           });

//           if (!result.error) {
//             const data = result.data as Order;
//             await upsertOrders([
//               {
//                 ...data,
//                 ...body,
//                 id: data.id,
//                 items: data.items ?? [],
//               } as Order & Record<string, any>,
//             ]);
//             return { data };
//           }

//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           ) {
//             return { error: result.error };
//           }
//         }

//         return { data: await createOfflineOrder(body) };
//       },

//       invalidatesTags: ["Orders", "Products"],
//     }),

//     getOrderById: builder.query<Order, string>({
//       async queryFn(id, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery(`/tenant/orders/${id}`);
//           if (!result.error) return { data: result.data as Order };
//         }

//         const order = await getLocalOrderById(id);
//         return order
//           ? { data: order }
//           : {
//               error: {
//                 status: "CUSTOM_ERROR",
//                 error: "Order not found offline",
//               },
//             };
//       },
//       providesTags: ["Orders"],
//     }),

//     updateOrderStatus: builder.mutation<Order, { id: string; status: string }>({
//       async queryFn({ id, status }, _api, _extraOptions, baseQuery) {
//         if ((await isOnline()) && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/orders/${id}/status`,
//             method: "PATCH",
//             body: { status },
//           });
//           if (!result.error) return { data: result.data as Order };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await updateOfflineOrderStatus(id, status) };
//       },
//       invalidatesTags: ["Orders"],
//     }),

//     deleteOrder: builder.mutation<void, string>({
//       async queryFn(id, _api, _extraOptions, baseQuery) {
//         if ((await isOnline()) && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/orders/${id}`,
//             method: "DELETE",
//           });
//           if (!result.error) return { data: undefined };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await deleteOfflineOrder(id);
//         return { data: undefined };
//       },
//       invalidatesTags: ["Orders"],
//     }),

//     getTransactions: builder.query<Order[], string | undefined>({
//       async queryFn(storeId, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery(
//             `/tenant/orders/transactions/${storeId}`,
//           );
//           if (!result.error) return { data: result.data as Order[] };
//         }

//         return { data: await getLocalOrders(storeId) };
//       },
//       providesTags: ["Orders"],
//     }),
//   }),
// });

// export const {
//   useGetOrdersQuery,
//   useCreateOrderMutation,
//   useGetOrderByIdQuery,
//   useUpdateOrderStatusMutation,
//   useDeleteOrderMutation,
//   useGetTransactionsQuery,
//   useLazyGetTransactionsQuery,
// } = orderApi;
