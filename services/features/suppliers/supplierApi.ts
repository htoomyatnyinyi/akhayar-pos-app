import { baseApi } from "@/services/api/baseApi";
import { SupplierRepository } from "@/services/offline/repositories/supplierRepo";

export const supplierApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<any, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const repo = new SupplierRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/suppliers",
          });
          if (result.data) {
            const suppliers = (result.data as any).data || result.data;
            for (const supplier of suppliers) {
              await repo.upsertFromServer(supplier);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching suppliers");
        }

        const localSuppliers = await repo.getSuppliers();
        return { data: localSuppliers };
      },
      providesTags: ["Supplier"],
    }),
    createSupplier: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new SupplierRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/suppliers",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverSupplier = result.data as any;
          await repo.markSynced(localId, serverSupplier.id);
          return { data: serverSupplier };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation<any, { id: string; data: any }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        const repo = new SupplierRepository();
        await repo.updateLocal(id, data);

        const result = await baseQuery({
          url: `/tenant/suppliers/${id}`,
          method: "PUT",
          body: data,
        });

        if (result.data) {
          const serverSupplier = result.data as any;
          await repo.markSynced(id, serverSupplier.id);
          return { data: serverSupplier };
        }

        return { data: { id, ...data } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Supplier", id }],
    }),
    deleteSupplier: builder.mutation<any, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const repo = new SupplierRepository();
        await repo.deleteLocal(id);
        // await repo.softDelete(id);

        await baseQuery({
          url: `/tenant/suppliers/${id}`,
          method: "DELETE",
        });

        return { data: undefined };
      },
      invalidatesTags: ["Supplier"],
    }),
  }),
  overrideExisting: true, // fasle
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = supplierApi;
