// import { posApi } from "@/services/api/posApi";
// import { isOnline } from "@/services/offline/network";
// import {
//   createOfflineGenericRecord,
//   getLocalGenericRecords,
//   upsertGenericRecords,
// } from "@/services/offline/repository";

// export const returnsApi = posApi.injectEndpoints({
//   overrideExisting: false,
//   endpoints: (builder) => ({
//     getReturns: builder.query<any[], void>({
//       async queryFn(_arg, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery("/tenant/returns");
//           if (!result.error && Array.isArray(result.data)) {
//             await upsertGenericRecords("returns", result.data as Array<{ id: string }>);
//             return { data: result.data as any[] };
//           }
//         }

//         return { data: await getLocalGenericRecords<any>("returns") };
//       },
//       providesTags: ["Orders"],
//     }),
//     processReturn: builder.mutation<any, any>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         if (await isOnline()) {
//           const result = await baseQuery({ url: "/tenant/returns", method: "POST", body });
//           if (!result.error) return { data: result.data };
//           if (typeof result.error.status === "number" && result.error.status < 500) return { error: result.error };
//         }

//         return { data: await createOfflineGenericRecord("returns", "/tenant/returns", body) };
//       },
//       invalidatesTags: ["Orders", "Products"],
//     }),
//   }),
// });

// export const {
//   useGetReturnsQuery,
//   useProcessReturnMutation,
// } = returnsApi;
