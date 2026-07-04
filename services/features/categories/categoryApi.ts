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
