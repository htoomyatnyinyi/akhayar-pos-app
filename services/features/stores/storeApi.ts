import { baseApi } from "@/services/api/baseApi";
import { StoreRepository } from "@/services/offline/repositories/storeRepo";

export const storeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStores: builder.query<any, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const repo = new StoreRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/stores",
          });
          if (result.data) {
            const stores = (result.data as any).data || result.data;
            for (const store of stores) {
              await repo.upsertFromServer(store);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching stores");
        }

        const localStores = await repo.getStores();
        return { data: localStores };
      },
      providesTags: ["Store"],
    }),
    createStore: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new StoreRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/stores",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverStore = result.data as any;
          await repo.markSynced(localId, serverStore.id);
          return { data: serverStore };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Store"],
    }),
    updateStore: builder.mutation<any, { id: string; data: any }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        const repo = new StoreRepository();
        await repo.updateLocal(id, data);

        const result = await baseQuery({
          url: `/tenant/stores/${id}`,
          method: "PUT",
          body: data,
        });

        if (result.data) {
          const serverStore = result.data as any;
          await repo.markSynced(id, serverStore.id);
          return { data: serverStore };
        }

        return { data: { id, ...data } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Store", id }],
    }),
    deleteStore: builder.mutation<any, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const repo = new StoreRepository();
        await repo.softDelete(id);

        await baseQuery({
          url: `/tenant/stores/${id}`,
          method: "DELETE",
        });

        return { data: undefined };
      },
      invalidatesTags: ["Store"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStoresQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
} = storeApi;
