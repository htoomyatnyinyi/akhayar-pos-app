import { posApi } from "@/services/api/posApi";

import { Product } from "./productTypes";

export const productApi = posApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    getProducts: builder.query<Product[], string | undefined>({
      query: (storeId) => ({
        url: "/products",
        params: storeId ? { storeId } : {},
      }),

      providesTags: ["Products"],
    }),

    getProductById: builder.query<Product, number>({
      query: (id) => `/products/${id}`,
    }),

    createProduct: builder.mutation<Product, Partial<Product> & { categoryName?: string; storeId?: string }>({
      query: (body) => ({
        url: "/products",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Products", "Categories"],
    }),

    updateProduct: builder.mutation<Product, { id: string; data: Partial<Product> & { categoryName?: string } }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Products", "Categories"],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),

    getProductByBarcode: builder.query<{ found: boolean; product?: Product; message?: string }, string>({
      query: (barcode) => `/products/barcode/${barcode}`,
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useLazyGetProductByBarcodeQuery,
} = productApi;
