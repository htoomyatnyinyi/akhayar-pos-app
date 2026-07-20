// import { baseApi } from "../../services/api/baseApi";
import { baseApi } from "@/services/api/baseApi";

export const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Get customers ──
    getCustomers: builder.query<
      any,
      { page?: number; limit?: number; search?: string; tier?: string }
    >({
      query: (params) => ({
        url: "/tenant/customers",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          tier: params.tier,
        },
      }),
      providesTags: ["Customer"],
    }),

    // ── Get single customer ──
    getCustomer: builder.query<any, string>({
      query: (id) => `/tenant/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
    }),

    // ── Create customer ──
    createCustomer: builder.mutation<any, any>({
      query: (body) => ({
        url: "/tenant/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customer"],
    }),

    // ── Update customer ──
    updateCustomer: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/tenant/customers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Customer", id }],
    }),

    // ── Delete customer (soft delete) ──
    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tenant/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customer"],
    }),

    // ── Get customer by phone/email (for lookup) ──
    getCustomerByPhone: builder.query<any, string>({
      query: (phone) => `/tenant/customers/lookup?phone=${phone}`,
      providesTags: ["Customer"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomerByPhoneQuery,
} = customersApi;

// import { posApi } from "@/services/api/posApi";
// import { isOnline } from "@/services/offline/network";
// import {
//   createOfflineCustomer,
//   deleteOfflineEntity,
//   getLocalCustomers,
//   updateOfflineEntity,
//   upsertCustomers,
// } from "@/services/offline/repository";
// import { Customer, CreateCustomerPayload } from "./customerTypes";

// export const customerApi = posApi.injectEndpoints({
//   overrideExisting: false,
//   endpoints: (builder) => ({
//     getCustomers: builder.query<Customer[], void>({
//       async queryFn(_arg, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery("/tenant/customers");
//           if (!result.error && Array.isArray(result.data)) {
//             await upsertCustomers(result.data as Customer[]);
//             return { data: await getLocalCustomers() };
//           }
//         }

//         return { data: await getLocalCustomers() };
//       },
//       providesTags: ["Customers"],
//     }),

//     getCustomerById: builder.query<Customer, string>({
//       query: (id) => `/tenant/customers/${id}`,
//       providesTags: ["Customers"],
//     }),

//     createCustomer: builder.mutation<Customer, CreateCustomerPayload>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/customers",
//             method: "POST",
//             body,
//           });
//           if (!result.error) return { data: result.data as Customer };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await createOfflineCustomer(body) };
//       },
//       invalidatesTags: ["Customers"],
//     }),

//     updateCustomer: builder.mutation<
//       Customer,
//       { id: string; data: Partial<CreateCustomerPayload> }
//     >({
//       async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
//         if ((await isOnline()) && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/customers/${id}`,
//             method: "PUT",
//             body: data,
//           });
//           if (!result.error) return { data: result.data as Customer };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await updateOfflineEntity("customers", id, data);
//         return {
//           data: (await getLocalCustomers()).find(
//             (customer) => customer.id === id,
//           ) as Customer,
//         };
//       },
//       invalidatesTags: ["Customers"],
//     }),

//     deleteCustomer: builder.mutation<void, string>({
//       async queryFn(id, _api, _extraOptions, baseQuery) {
//         if ((await isOnline()) && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/customers/${id}`,
//             method: "DELETE",
//           });
//           if (!result.error) return { data: undefined };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await deleteOfflineEntity("customers", id);
//         return { data: undefined };
//       },
//       invalidatesTags: ["Customers"],
//     }),
//   }),
// });

// export const {
//   useGetCustomersQuery,
//   useGetCustomerByIdQuery,
//   useCreateCustomerMutation,
//   useUpdateCustomerMutation,
//   useDeleteCustomerMutation,
// } = customerApi;
