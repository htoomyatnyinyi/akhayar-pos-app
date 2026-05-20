import { posApi } from "@/services/api/posApi";

import { LoginPayload, RegisterPayload, User } from "./authTypes";

export const authApi = posApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    login: builder.mutation<User, LoginPayload>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation<User, RegisterPayload>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Auth"],
    }),

    me: builder.query<User, void>({
      query: () => "/auth/me",

      providesTags: ["Auth"],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useMeQuery } = authApi;
