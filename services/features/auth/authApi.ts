import { baseApi } from "@/services/api/baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      any,
      { email: string; password: string; tenantCode?: string }
    >({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Sync"],
    }),
    platformLogin: builder.mutation<any, { email: string; password: string }>({
      query: (body) => ({ url: "/platform/auth/login", method: "POST", body }),
      invalidatesTags: ["Sync"],
    }),
    register: builder.mutation<any, any>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    getMe: builder.query<any, void>({
      query: () => "/auth/me",
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  usePlatformLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
} = authApi;

// import { posApi } from "@/services/api/posApi";
// import type { RootState } from "@/services/store/store";

// import {
//   AuthMeResponse,
//   AuthSuccessResponse,
//   LoginPayload,
//   RegisterPayload,
//   VerifyEmailPayload,
//   ForgotPasswordPayload,
//   ResetPasswordPayload,
//   User,
// } from "./authTypes";
// import { normalizeAuthUser } from "./authUtils";

// export const authApi = posApi.injectEndpoints({
//   // overrideExisting: false,
//   overrideExisting: true, //  true လို့ ပြောင်းပေးလိုက်ပါ

//   endpoints: (builder) => ({
//     login: builder.mutation<User, LoginPayload>({
//       query: (body) => ({
//         url: "/auth/login",
//         method: "POST",
//         body: {
//           email: body.email.trim().toLowerCase(),
//           password: body.password,
//           ...(body.tenantCode?.trim()
//             ? { tenantCode: body.tenantCode.trim().toUpperCase() }
//             : {}),
//         },
//       }),
//       transformResponse: (response: AuthSuccessResponse) =>
//         normalizeAuthUser(response.user, response.token),
//       invalidatesTags: ["Auth"],
//     }),

//     register: builder.mutation<User, RegisterPayload>({
//       query: (body) => ({
//         url: "/auth/register",
//         method: "POST",
//         body: {
//           name: body.name.trim(),
//           email: body.email.trim().toLowerCase(),
//           password: body.password,
//           tenantName: body.tenantName.trim(),
//           ...(body.tenantCode?.trim()
//             ? { tenantCode: body.tenantCode.trim().toUpperCase() }
//             : {}),
//         },
//       }),
//       transformResponse: (response: AuthSuccessResponse) =>
//         normalizeAuthUser(response.user, response.token),
//       invalidatesTags: ["Auth"],
//     }),

//     me: builder.query<User, void>({
//       async queryFn(_arg, { getState }, _extra, baseQuery) {
//         const result = await baseQuery("/auth/me");
//         if (result.error) return { error: result.error };

//         const response = result.data as AuthMeResponse;
//         const token = (getState() as RootState).auth.user?.token ?? "";
//         return { data: normalizeAuthUser(response.user, token) };
//       },
//       providesTags: ["Auth"],
//     }),

//     verifyEmail: builder.mutation<void, VerifyEmailPayload>({
//       query: (body) => ({
//         url: "/auth/verify-email",
//         method: "POST",
//         body,
//       }),
//       invalidatesTags: ["Auth"],
//     }),

//     resendOtp: builder.mutation<void, void>({
//       query: () => ({
//         url: "/auth/resend-otp",
//         method: "POST",
//       }),
//     }),

//     forgotPassword: builder.mutation<void, ForgotPasswordPayload>({
//       query: (body) => ({
//         url: "/auth/forgot-password",
//         method: "POST",
//         body: { email: body.email.trim().toLowerCase() },
//       }),
//     }),

//     resetPassword: builder.mutation<void, ResetPasswordPayload>({
//       query: (body) => ({
//         url: "/auth/reset-password",
//         method: "POST",
//         body: {
//           email: body.email.trim().toLowerCase(),
//           code: body.code,
//           newPassword: body.newPassword,
//         },
//       }),
//     }),
//   }),
// });

// export const {
//   useLoginMutation,
//   useRegisterMutation,
//   useMeQuery,
//   useVerifyEmailMutation,
//   useResendOtpMutation,
//   useForgotPasswordMutation,
//   useResetPasswordMutation,
// } = authApi;
