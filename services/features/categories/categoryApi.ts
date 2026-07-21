// import { baseApi } from "../../services/api/baseApi";
import { baseApi } from "@/services/api/baseApi";

import { CategoryRepository } from "@/services/offline/repositories/categoryRepo";

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<
      any,
      { page?: number; limit?: number; search?: string }
    >({
      async queryFn(params, _api, _extraOptions, baseQuery) {
        const repo = new CategoryRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/categories",
            params: {
              page: params.page || 1,
              limit: params.limit || 50,
              search: params.search,
            },
          });
          if (result.data) {
            const categories = (result.data as any).data || result.data;
            for (const cat of categories) {
              await repo.upsertFromServer(cat);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching categories");
        }
        const localCategories = await repo.getCategories();
        return { data: localCategories };
      },
      providesTags: ["Category"],
    }),
    getCategory: builder.query<any, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        // Fallback to basic network request for single item for now
        const result = await baseQuery(`/tenant/categories/${id}`);
        if (result.error) return { error: result.error };
        return { data: result.data };
      },
      providesTags: (result, error, id) => [{ type: "Category", id }],
    }),
    createCategory: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new CategoryRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/categories",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverCat = result.data as any;
          await repo.markSynced(localId, serverCat.id);
          return { data: serverCat };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Category"],
    }),
    updateCategory: builder.mutation<any, { id: string; data: any }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        const repo = new CategoryRepository();
        await repo.updateLocal(id, data);

        const result = await baseQuery({
          url: `/tenant/categories/${id}`,
          method: "PUT",
          body: data,
        });

        if (result.data) {
          const serverCat = result.data as any;
          await repo.markSynced(id, serverCat.id);
          return { data: serverCat };
        }

        return { data: { id, ...data } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Category", id }],
    }),
    deleteCategory: builder.mutation<void, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const repo = new CategoryRepository();
        await repo.deleteLocal(id);

        await baseQuery({
          url: `/tenant/categories/${id}`,
          method: "DELETE",
        });

        return { data: undefined };
      },
      invalidatesTags: ["Category"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;

// import { posApi } from "@/services/api/posApi";
// import { isOnline } from "@/services/offline/network";
// import {
//   createOfflineCategory,
//   deleteOfflineEntity,
//   getLocalCategories,
//   updateOfflineEntity,
//   upsertCategories,
// } from "@/services/offline/repository";
// import { Category, CreateCategoryPayload } from "./categoryTypes";

// export const categoryApi = posApi.injectEndpoints({
//   // overrideExisting: false,
//   overrideExisting: true, // ⚠️ ဒီဖိုင်မှာလည်း ဒါလေး ပါနေဖို့ လိုအပ်ပါတယ်ဗျာ
//   endpoints: (builder) => ({
//     getCategories: builder.query<Category[], string | undefined>({
//       async queryFn(storeId, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/categories",
//             params: storeId ? { storeId } : {},
//           });

//           if (!result.error && Array.isArray(result.data)) {
//             await upsertCategories(result.data as Category[]);
//             return { data: await getLocalCategories(storeId) };
//           }
//         }

//         return { data: await getLocalCategories(storeId) };
//       },
//       providesTags: ["Categories"],
//     }),

//     getCategoryById: builder.query<Category, string>({
//       query: (id) => `/tenant/categories/${id}`,
//       providesTags: ["Categories"],
//     }),

//     createCategory: builder.mutation<
//       Category,
//       CreateCategoryPayload & { storeId?: string }
//     >({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({
//             url: "/tenant/categories",
//             method: "POST",
//             body,
//           });
//           if (!result.error) return { data: result.data as Category };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         return { data: await createOfflineCategory(body) };
//       },
//       invalidatesTags: ["Categories"],
//     }),

//     updateCategory: builder.mutation<
//       Category,
//       { id: string; data: Partial<CreateCategoryPayload> }
//     >({
//       async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
//         if ((await isOnline()) && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/categories/${id}`,
//             method: "PUT",
//             body: data,
//           });
//           if (!result.error) return { data: result.data as Category };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await updateOfflineEntity("categories", id, data);
//         return {
//           data: (await getLocalCategories()).find(
//             (category) => category.id === id,
//           ) as Category,
//         };
//       },
//       invalidatesTags: ["Categories"],
//     }),

//     deleteCategory: builder.mutation<void, string>({
//       async queryFn(id, _api, _extraOptions, baseQuery) {
//         if ((await isOnline()) && !String(id).includes("_")) {
//           const result = await baseQuery({
//             url: `/tenant/categories/${id}`,
//             method: "DELETE",
//           });
//           if (!result.error) return { data: undefined };
//           if (
//             typeof result.error.status === "number" &&
//             result.error.status < 500
//           )
//             return { error: result.error };
//         }

//         await deleteOfflineEntity("categories", id);
//         return { data: undefined };
//       },
//       invalidatesTags: ["Categories"],
//     }),
//   }),
// });

// export const {
//   useGetCategoriesQuery,
//   useGetCategoryByIdQuery,
//   useCreateCategoryMutation,
//   useUpdateCategoryMutation,
//   useDeleteCategoryMutation,
// } = categoryApi;
