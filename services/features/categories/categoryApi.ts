import { posApi } from "@/services/api/posApi";
import { Category, CreateCategoryPayload } from "./categoryTypes";

export const categoryApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], string | undefined>({
      query: (storeId) => ({
        url: "/categories",
        params: storeId ? { storeId } : {},
      }),
      providesTags: ["Categories"],
    }),

    getCategoryById: builder.query<Category, string>({
      query: (id) => `/categories/${id}`,
      providesTags: ["Categories"],
    }),

    createCategory: builder.mutation<Category, CreateCategoryPayload & { storeId?: string }>({
      query: (body) => ({
        url: "/categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Categories"],
    }),

    updateCategory: builder.mutation<Category, { id: string; data: Partial<CreateCategoryPayload> }>({
      query: ({ id, data }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryByIdQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
