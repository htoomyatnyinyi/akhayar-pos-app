import { posApi } from "@/services/api/posApi";

export const returnsApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getReturns: builder.query<any[], void>({
      query: () => "/returns",
      providesTags: ["Orders"],
    }),
    processReturn: builder.mutation<any, any>({
      query: (body) => ({
        url: "/returns",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Orders", "Products"],
    }),
  }),
});

export const {
  useGetReturnsQuery,
  useProcessReturnMutation,
} = returnsApi;
