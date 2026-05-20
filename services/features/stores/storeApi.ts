import { posApi } from "@/services/api/posApi";
import { Store, CreateStorePayload } from "./storeTypes";

export const storeApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getStores: builder.query<Store[], void>({
      query: () => "/stores",
      providesTags: ["Stores" as any],
    }),

    getStoreById: builder.query<Store, string>({
      query: (id) => `/stores/${id}`,
      providesTags: ["Stores" as any],
    }),

    createStore: builder.mutation<Store, CreateStorePayload>({
      query: (body) => ({
        url: "/stores",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Stores" as any],
    }),

    updateStore: builder.mutation<Store, { id: string; data: Partial<CreateStorePayload> }>({
      query: ({ id, data }) => ({
        url: `/stores/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Stores" as any],
    }),

    deleteStore: builder.mutation<void, string>({
      query: (id) => ({
        url: `/stores/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stores" as any],
    }),
  }),
});

export const {
  useGetStoresQuery,
  useGetStoreByIdQuery,
  useCreateStoreMutation,
  useUpdateStoreMutation,
  useDeleteStoreMutation,
} = storeApi;
