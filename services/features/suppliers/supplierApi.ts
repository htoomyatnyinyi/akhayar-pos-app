import { posApi } from "@/services/api/posApi";
import { isOnline } from "@/services/offline/network";
import {
  createOfflineGenericRecord,
  deleteOfflineGenericRecord,
  getLocalGenericRecords,
  updateOfflineGenericRecord,
  upsertGenericRecords,
} from "@/services/offline/repository";
import { Supplier, CreateSupplierPayload } from "./supplierTypes";

export const supplierApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getSuppliers: builder.query<Supplier[], string | undefined>({
      async queryFn(storeId, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({
            url: "/tenant/suppliers",
            params: storeId ? { storeId } : {},
          });
          if (!result.error && Array.isArray(result.data)) {
            await upsertGenericRecords("suppliers", result.data as Supplier[]);
            return { data: await getLocalGenericRecords<Supplier>("suppliers") };
          }
        }

        return { data: await getLocalGenericRecords<Supplier>("suppliers") };
      },
      providesTags: ["Inventory"],
    }),

    getSupplierById: builder.query<Supplier, string>({
      query: (id) => `/tenant/suppliers/${id}`,
      providesTags: ["Inventory"],
    }),

    createSupplier: builder.mutation<
      Supplier,
      CreateSupplierPayload & { storeId?: string }
    >({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({
            url: "/tenant/suppliers",
            method: "POST",
            body,
          });
          if (!result.error) return { data: result.data as Supplier };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        return {
          data: (await createOfflineGenericRecord(
            "suppliers",
            "/tenant/suppliers",
            body,
          )) as Supplier,
        };
      },
      invalidatesTags: ["Inventory"],
    }),

    updateSupplier: builder.mutation<
      Supplier,
      { id: string; data: Partial<CreateSupplierPayload> }
    >({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        if (await isOnline() && !String(id).includes("_")) {
          const result = await baseQuery({
            url: `/tenant/suppliers/${id}`,
            method: "PUT",
            body: data,
          });
          if (!result.error) return { data: result.data as Supplier };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        return {
          data: (await updateOfflineGenericRecord(
            "suppliers",
            `/tenant/suppliers/${id}`,
            id,
            data,
          )) as Supplier,
        };
      },
      invalidatesTags: ["Inventory"],
    }),

    deleteSupplier: builder.mutation<void, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        if (await isOnline() && !String(id).includes("_")) {
          const result = await baseQuery({
            url: `/tenant/suppliers/${id}`,
            method: "DELETE",
          });
          if (!result.error) return { data: undefined };
          if (
            typeof result.error.status === "number" &&
            result.error.status < 500
          )
            return { error: result.error };
        }

        await deleteOfflineGenericRecord("suppliers", `/tenant/suppliers/${id}`, id);
        return { data: undefined };
      },
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
