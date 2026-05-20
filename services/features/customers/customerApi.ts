import { posApi } from "@/services/api/posApi";
import { Customer, CreateCustomerPayload } from "./customerTypes";

export const customerApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getCustomers: builder.query<Customer[], void>({
      query: () => "/customers",
      providesTags: ["Customers"],
    }),

    getCustomerById: builder.query<Customer, string>({
      query: (id) => `/customers/${id}`,
      providesTags: ["Customers"],
    }),

    createCustomer: builder.mutation<Customer, CreateCustomerPayload>({
      query: (body) => ({
        url: "/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customers"],
    }),

    updateCustomer: builder.mutation<Customer, { id: string; data: Partial<CreateCustomerPayload> }>({
      query: ({ id, data }) => ({
        url: `/customers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Customers"],
    }),

    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({
        url: `/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} = customerApi;
