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
          localProducts = localProducts.filter((p: any) => p.categoryId === params.categoryId);
        }
        if (params.search) {
          const lower = params.search.toLowerCase();
          localProducts = localProducts.filter((p: any) => 
            p.name?.toLowerCase().includes(lower) || p.barcode?.includes(lower) || p.sku?.toLowerCase().includes(lower)
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
  overrideExisting: false,
});

export const {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useLazyGetProductsSyncQuery,
} = productsApi;

// import { posApi } from "@/services/api/posApi";
// import {
//   createOfflineProduct,
//   deleteOfflineProduct,
//   getLocalProductByBarcode,
//   getLocalProducts,
//   updateOfflineProduct,
//   upsertProducts,
// } from "@/services/offline/repository";
// import { isOnline } from "@/services/offline/network";

// import { Product } from "./productTypes";

// export const productApi = posApi.injectEndpoints({
//   overrideExisting: false,

//   endpoints: (builder) => ({
//     getProducts: builder.query<Product[], string | undefined>({
//       async queryFn(storeId, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/products",
//             params: storeId ? { storeId } : {},
//           });

//           if (!result.error && Array.isArray(result.data)) {
//             await upsertProducts(result.data as Product[]);
//             return { data: await getLocalProducts(storeId) };
//           }
//         }

//         return { data: await getLocalProducts(storeId) };
//       },

//       providesTags: ["Products"],
//     }),

//     getProductById: builder.query<Product, number>({
//       query: (id) => `/tenant/products/${id}`,
//     }),

//     createProduct: builder.mutation<
//       Product,
//       Partial<Product> & { categoryName?: string; storeId?: string }
//     >({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/products",
//             method: "POST",
//             body,
//           });
//           if (!result.error) return { data: result.data as Product };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await createOfflineProduct(body) };
//       },

//       invalidatesTags: ["Products", "Categories"],
//     }),

//     updateProduct: builder.mutation<
//       Product,
//       { id: string; data: Partial<Product> & { categoryName?: string } }
//     >({
//       async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
//         if (await isOnline() && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/products/${id}`,
//             method: "PUT",
//             body: data,
//           });
//           if (!result.error) return { data: result.data as Product };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await updateOfflineProduct(id, data) };
//       },
//       invalidatesTags: ["Products", "Categories"],
//     }),

//     deleteProduct: builder.mutation<void, string>({
//       async queryFn(id, _api, _extraOptions, baseQuery) {
//         if (await isOnline() && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/products/${id}`,
//             method: "DELETE",
//           });
//           if (!result.error) return { data: undefined };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await deleteOfflineProduct(id);
//         return { data: undefined };
//       },
//       invalidatesTags: ["Products"],
//     }),

//     getProductByBarcode: builder.query<
//       { found: boolean; product?: Product; message?: string },
//       string
//     >({
//       async queryFn(barcode, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery(`/tenant/products/barcode/${barcode}`);

//           if (!result.error) {
//             const data = result.data as {
//               found: boolean;
//               product?: Product;
//               message?: string;
//             };
//             if (data.product) {
//               await upsertProducts([data.product]);
//             }
//             return { data };
//           }
//         }

//         const product = await getLocalProductByBarcode(barcode);
//         return product
//           ? { data: { found: true, product } }
//           : {
//               data: {
//                 found: false,
//                 message: "Product is not available in offline cache",
//               },
//             };
//       },
//     }),
//   }),
// });

// export const {
//   useGetProductsQuery,
//   useGetProductByIdQuery,
//   useCreateProductMutation,
//   useUpdateProductMutation,
//   useDeleteProductMutation,
//   useLazyGetProductByBarcodeQuery,
// } = productApi;
