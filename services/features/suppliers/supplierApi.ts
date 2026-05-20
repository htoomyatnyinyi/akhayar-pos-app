import { posApi } from "@/services/api/posApi";
import { Supplier, CreateSupplierPayload } from "./supplierTypes";

export const supplierApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getSuppliers: builder.query<Supplier[], string | undefined>({
      query: (storeId) => ({
        url: "/suppliers",
        params: storeId ? { storeId } : {},
      }),
      providesTags: ["Inventory"],
    }),

    getSupplierById: builder.query<Supplier, string>({
      query: (id) => `/suppliers/${id}`,
      providesTags: ["Inventory"],
    }),

    createSupplier: builder.mutation<Supplier, CreateSupplierPayload & { storeId?: string }>({
      query: (body) => ({
        url: "/suppliers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Inventory"],
    }),

    updateSupplier: builder.mutation<Supplier, { id: string; data: Partial<CreateSupplierPayload> }>({
      query: ({ id, data }) => ({
        url: `/suppliers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Inventory"],
    }),

    deleteSupplier: builder.mutation<void, string>({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = supplierApi;
