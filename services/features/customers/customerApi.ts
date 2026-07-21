import { baseApi } from "@/services/api/baseApi";
import { CustomerRepository } from "@/services/offline/repositories/customerRepo";

export const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Get customers ──
    getCustomers: builder.query<
      any,
      { page?: number; limit?: number; search?: string; tier?: string }
    >({
      async queryFn(params, _api, _extraOptions, baseQuery) {
        const repo = new CustomerRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/customers",
            params: {
              page: params.page || 1,
              limit: params.limit || 50,
              search: params.search,
              tier: params.tier,
            },
          });
          if (result.data) {
            const customers = (result.data as any).data || result.data;
            for (const cus of customers) {
              await repo.upsertFromServer(cus);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching customers");
        }

        let localCustomers = await repo.getCustomers();
        if (params.search) {
          const s = params.search.toLowerCase();
          localCustomers = localCustomers.filter(
            (c: any) =>
              c.name?.toLowerCase().includes(s) || c.phone?.includes(s),
          );
        }
        if (params.tier) {
          localCustomers = localCustomers.filter(
            (c: any) => c.tier === params.tier,
          );
        }

        return { data: localCustomers };
      },
      providesTags: ["Customer"],
    }),

    // ── Get single customer ──
    getCustomer: builder.query<any, string>({
      query: (id) => `/tenant/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
    }),

    // ── Create customer ──
    createCustomer: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new CustomerRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/customers",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverCus = result.data as any;
          await repo.markSynced(localId, serverCus.id);
          return { data: serverCus };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Customer"],
    }),

    // ── Update customer ──
    updateCustomer: builder.mutation<any, { id: string; data: any }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        const repo = new CustomerRepository();
        await repo.updateLocal(id, data);

        const result = await baseQuery({
          url: `/tenant/customers/${id}`,
          method: "PUT",
          body: data,
        });

        if (result.data) {
          const serverCus = result.data as any;
          await repo.markSynced(id, serverCus.id);
          return { data: serverCus };
        }

        return { data: { id, ...data } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Customer", id }],
    }),

    // ── Delete customer (soft delete) ──
    deleteCustomer: builder.mutation<void, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const repo = new CustomerRepository();
        await repo.softDelete(id);

        await baseQuery({
          url: `/tenant/customers/${id}`,
          method: "DELETE",
        });

        return { data: undefined };
      },
      invalidatesTags: ["Customer"],
    }),

    // ── Get customer by phone/email (for lookup) ──
    getCustomerByPhone: builder.query<any, string>({
      query: (phone) => `/tenant/customers/lookup?phone=${phone}`,
      providesTags: ["Customer"],
    }),
  }),
  overrideExisting: true, // false
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
