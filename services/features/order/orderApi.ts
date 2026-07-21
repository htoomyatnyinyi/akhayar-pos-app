import { baseApi } from "@/services/api/baseApi";
import { OrderRepository } from "@/services/offline/repositories/orderRepo";

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query<any, { storeId?: string; status?: string }>({
      async queryFn(params, _api, _extraOptions, baseQuery) {
        const repo = new OrderRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/orders",
            params: { ...params, limit: 100 },
          });
          if (result.data) {
            const orders = (result.data as any).data || result.data;
            for (const ord of orders) {
              await repo.upsertFromServer(ord);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching orders");
        }
        const localOrders = await repo.getOrders(params.storeId, params.status);
        return { data: localOrders };
      },
      providesTags: ["Order"],
    }),
    createOrder: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new OrderRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/orders",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverOrder = result.data as any;
          await repo.markSynced(localId, serverOrder.id);
          return { data: serverOrder };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Order"],
    }),
    updateOrderStatus: builder.mutation<any, { id: string; status: string }>({
      async queryFn({ id, status }, _api, _extraOptions, baseQuery) {
        const repo = new OrderRepository();
        await repo.updateStatus(id, status);

        const result = await baseQuery({
          url: `/tenant/orders/${id}/status`,
          method: "PATCH",
          body: { status },
        });

        if (result.data) {
          return { data: result.data };
        }

        return { data: { id, status } };
      },
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
