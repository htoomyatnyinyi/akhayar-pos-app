import { posApi } from "@/services/api/posApi";
import type { RootState } from "@/services/store/store";

import {
  AuthMeResponse,
  AuthSuccessResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "./authTypes";
import { normalizeAuthUser } from "./authUtils";

export const authApi = posApi.injectEndpoints({
  overrideExisting: false,

  endpoints: (builder) => ({
    login: builder.mutation<User, LoginPayload>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body: {
          email: body.email.trim().toLowerCase(),
          password: body.password,
          ...(body.tenantCode?.trim()
            ? { tenantCode: body.tenantCode.trim().toUpperCase() }
            : {}),
        },
      }),
      transformResponse: (response: AuthSuccessResponse) =>
        normalizeAuthUser(response.user, response.token),
      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation<User, RegisterPayload>({
      query: (body) => ({
        url: "/auth/register",
        method: "POST",
        body: {
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          password: body.password,
          tenantName: body.tenantName.trim(),
          ...(body.tenantCode?.trim()
            ? { tenantCode: body.tenantCode.trim().toUpperCase() }
            : {}),
        },
      }),
      transformResponse: (response: AuthSuccessResponse) =>
        normalizeAuthUser(response.user, response.token),
      invalidatesTags: ["Auth"],
    }),

    me: builder.query<User, void>({
      async queryFn(_arg, { getState }, _extra, baseQuery) {
        const result = await baseQuery("/auth/me");
        if (result.error) return { error: result.error };

        const response = result.data as AuthMeResponse;
        const token = (getState() as RootState).auth.user?.token ?? "";
        return { data: normalizeAuthUser(response.user, token) };
      },
      providesTags: ["Auth"],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useMeQuery } = authApi;
