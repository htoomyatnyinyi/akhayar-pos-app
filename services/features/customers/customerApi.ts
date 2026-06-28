import { posApi } from "@/services/api/posApi";
import { isOnline } from "@/services/offline/network";
import {
  createOfflineCustomer,
  deleteOfflineEntity,
  getLocalCustomers,
  updateOfflineEntity,
  upsertCustomers,
} from "@/services/offline/repository";
import { Customer, CreateCustomerPayload } from "./customerTypes";

export const customerApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getCustomers: builder.query<Customer[], void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery("/tenant/customers");
          if (!result.error && Array.isArray(result.data)) {
            await upsertCustomers(result.data as Customer[]);
            return { data: await getLocalCustomers() };
          }
        }

        return { data: await getLocalCustomers() };
      },
      providesTags: ["Customers"],
    }),

    getCustomerById: builder.query<Customer, string>({
      query: (id) => `/tenant/customers/${id}`,
      providesTags: ["Customers"],
    }),

    createCustomer: builder.mutation<Customer, CreateCustomerPayload>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({
            url: "/tenant/customers",
            method: "POST",
            body,
          });
          if (!result.error) return { data: result.data as Customer };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        return { data: await createOfflineCustomer(body) };
      },
      invalidatesTags: ["Customers"],
    }),

    updateCustomer: builder.mutation<
      Customer,
      { id: string; data: Partial<CreateCustomerPayload> }
    >({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        if ((await isOnline()) && !String(id).includes("_")) {
          const result = await baseQuery({
            url: `/tenant/customers/${id}`,
            method: "PUT",
            body: data,
          });
          if (!result.error) return { data: result.data as Customer };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        await updateOfflineEntity("customers", id, data);
        return {
          data: (await getLocalCustomers()).find(
            (customer) => customer.id === id,
          ) as Customer,
        };
      },
      invalidatesTags: ["Customers"],
    }),

    deleteCustomer: builder.mutation<void, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        if ((await isOnline()) && !String(id).includes("_")) {
          const result = await baseQuery({
            url: `/tenant/customers/${id}`,
            method: "DELETE",
          });
          if (!result.error) return { data: undefined };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        await deleteOfflineEntity("customers", id);
        return { data: undefined };
      },
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
