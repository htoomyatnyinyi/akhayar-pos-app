import { posApi } from "@/services/api/posApi";
import {
  createOfflineOrder,
  deleteOfflineOrder,
  getLocalOrderById,
  getLocalOrders,
  updateOfflineOrderStatus,
} from "@/services/offline/repository";
import { isOnline } from "@/services/offline/network";
export interface CreateOrderPayload {
  subTotal: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  paymentStatus?: string;
  userId: string;
  customerId?: string;
  sessionId?: string;
  storeId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    subTotal: number;
  }>;
}
import { Order } from "./orderTypes";

export const orderApi = posApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    getOrders: builder.query<Order[], string | undefined>({
      async queryFn(storeId, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery(
            `/tenant/orders${storeId ? `?storeId=${storeId}` : ""}`,
          );
          if (!result.error) return { data: result.data as Order[] };
        }

        return { data: await getLocalOrders(storeId) };
      },

      providesTags: ["Orders"],
    }),

    createOrder: builder.mutation<Order, CreateOrderPayload>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({
            url: "/tenant/orders",
            method: "POST",
            body,
          });

          if (!result.error) {
            return { data: result.data as Order };
          }

          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          ) {
            return { error: result.error };
          }
        }

        return { data: await createOfflineOrder(body) };
      },

      invalidatesTags: ["Orders", "Products"],
    }),

    getOrderById: builder.query<Order, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery(`/tenant/orders/${id}`);
          if (!result.error) return { data: result.data as Order };
        }

        const order = await getLocalOrderById(id);
        return order
          ? { data: order }
          : {
              error: {
                status: "CUSTOM_ERROR",
                error: "Order not found offline",
              },
            };
      },
      providesTags: ["Orders"],
    }),

    updateOrderStatus: builder.mutation<Order, { id: string; status: string }>({
      async queryFn({ id, status }, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({
            url: `/tenant/orders/${id}/status`,
            method: "PATCH",
            body: { status },
          });
          if (!result.error) return { data: result.data as Order };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        return { data: await updateOfflineOrderStatus(id, status) };
      },
      invalidatesTags: ["Orders"],
    }),

    deleteOrder: builder.mutation<void, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({
            url: `/tenant/orders/${id}`,
            method: "DELETE",
          });
          if (!result.error) return { data: undefined };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        await deleteOfflineOrder(id);
        return { data: undefined };
      },
      invalidatesTags: ["Orders"],
    }),

    getTransactions: builder.query<Order[], string | undefined>({
      async queryFn(storeId, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery(
            `/tenant/orders/transactions/${storeId}`,
          );
          if (!result.error) return { data: result.data as Order[] };
        }

        return { data: await getLocalOrders(storeId) };
      },
      providesTags: ["Orders"],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useCreateOrderMutation,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
  useGetTransactionsQuery,
  useLazyGetTransactionsQuery,
} = orderApi;
