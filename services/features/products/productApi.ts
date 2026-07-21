import { baseApi } from "@/services/api/baseApi";
import { ProductRepository } from "@/services/offline/repositories/productRepo";

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<
      any,
      { storeId?: string; categoryId?: string; search?: string }
    >({
      async queryFn(params, _api, _extraOptions, baseQuery) {
        const repo = new ProductRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/products",
            params: { ...params, limit: 100 },
          });
          if (result.data) {
            const products = (result.data as any).data || result.data;
            for (const prod of products) {
              await repo.upsertFromServer(prod);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching products");
        }

        let localProducts = await repo.getProducts(params.storeId);

        // Filter locally if necessary
        if (params.categoryId) {
          localProducts = localProducts.filter(
            (p: any) => p.categoryId === params.categoryId,
          );
        }
        if (params.search) {
          const lower = params.search.toLowerCase();
          localProducts = localProducts.filter(
            (p: any) =>
              p.name?.toLowerCase().includes(lower) ||
              p.barcode?.includes(lower) ||
              p.sku?.toLowerCase().includes(lower),
          );
        }

        return { data: localProducts };
      },
      providesTags: ["Product"],
    }),
    createProduct: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new ProductRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/products",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverProd = result.data as any;
          await repo.markSynced(localId, serverProd.id);
          return { data: serverProd };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Product"],
    }),
    updateProduct: builder.mutation<any, { id: string; data: any }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        const repo = new ProductRepository();
        await repo.updateLocal(id, data);

        const result = await baseQuery({
          url: `/tenant/products/${id}`,
          method: "PUT",
          body: data,
        });

        if (result.data) {
          const serverProd = result.data as any;
          await repo.markSynced(id, serverProd.id);
          return { data: serverProd };
        }

        return { data: { id, ...data } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Product", id }],
    }),
    deleteProduct: builder.mutation<any, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const repo = new ProductRepository();
        await repo.deleteLocal(id);

        await baseQuery({
          url: `/tenant/products/${id}`,
          method: "DELETE",
        });

        return { data: undefined };
      },
      invalidatesTags: ["Product"],
    }),
    // Sync endpoint (pull)
    getProductsSync: builder.query<any, { since?: number }>({
      query: ({ since }) => ({
        url: "/tenant/products/sync",
        params: { since },
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useLazyGetProductsSyncQuery,
} = productsApi;
