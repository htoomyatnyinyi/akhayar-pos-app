import { posApi } from "@/services/api/posApi";
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
      query: (storeId) => `/orders${storeId ? `?storeId=${storeId}` : ""}`,

      providesTags: ["Orders"],
    }),

    createOrder: builder.mutation<Order, CreateOrderPayload>({
      query: (body) => ({
        url: "/orders",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Orders", "Products"],
    }),

    getOrderById: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      providesTags: ["Orders"],
    }),

    updateOrderStatus: builder.mutation<Order, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Orders"],
    }),

    deleteOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders"],
    }),

    getTransactions: builder.query<Order[], string | undefined>({
      query: (storeId) => `/orders/transactions/${storeId}`,
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
