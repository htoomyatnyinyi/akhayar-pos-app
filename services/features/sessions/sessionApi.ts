// import { posApi } from "@/services/api/posApi";
// import { isOnline } from "@/services/offline/network";
// import {
//   closeOfflineSession,
//   getLocalActiveSession,
//   openOfflineSession,
//   upsertSessions,
// } from "@/services/offline/repository";

// import { Session, CloseSessionPayload } from "./sessionTypes";

// export interface OpenSessionPayload {
//   userId: string;
//   openingBalance: number;
//   notes?: string;
//   storeId?: string;
// }

// export const sessionApi = posApi.injectEndpoints({
//   overrideExisting: false,

//   endpoints: (builder) => ({
//     getActiveSession: builder.query<
//       Session | null,
//       {
//         userId: string;
//         storeId?: string;
//       }
//     >({
//       async queryFn({ userId, storeId }, _api, _extraOptions, baseQuery) {
//         try {
//           // -----------------------------
//           // ONLINE
//           // -----------------------------
//           if (await isOnline()) {
//             const result = await baseQuery(
//               `/tenant/sessions/active/${userId}${
//                 storeId ? `?storeId=${storeId}` : ""
//               }`,
//             );

//             if (!result.error) {
//               const session = result.data as Session | null;

//               // Save to SQLite if found
//               if (session?.id) {
//                 await upsertSessions([session]);
//               }

//               // Return API result directly
//               return {
//                 data: session ?? null,
//               };
//             }

//             // 4xx -> fallback to local
//             if (
//               typeof result.error.status === "number" &&
//               result.error.status < 500
//             ) {
//               const localSession = await getLocalActiveSession(userId, storeId);

//               return {
//                 data: localSession ?? null,
//               };
//             }
//           }

//           // -----------------------------
//           // OFFLINE
//           // -----------------------------
//           const localSession = await getLocalActiveSession(userId, storeId);

//           return {
//             data: localSession ?? null,
//           };
//         } catch (err) {
//           return {
//             error: {
//               status: "CUSTOM_ERROR",
//               error:
//                 err instanceof Error
//                   ? err.message
//                   : "Failed to get active session",
//             },
//           };
//         }
//       },

//       providesTags: ["Sessions"],
//     }),

//     openSession: builder.mutation<Session, OpenSessionPayload>({
//       async queryFn(body, _api, _extraOptions, baseQuery) {
//         try {
//           if (await isOnline()) {
//             const result = await baseQuery({
//               url: "/tenant/sessions/open",
//               method: "POST",
//               body,
//             });

//             if (!result.error) {
//               return {
//                 data: result.data as Session,
//               };
//             }

//             if (
//               typeof result.error.status === "number" &&
//               result.error.status < 500
//             ) {
//               return {
//                 error: result.error,
//               };
//             }
//           }

//           const session = await openOfflineSession(body);

//           return {
//             data: session,
//           };
//         } catch (err) {
//           return {
//             error: {
//               status: "CUSTOM_ERROR",
//               error:
//                 err instanceof Error ? err.message : "Unable to open session",
//             },
//           };
//         }
//       },

//       invalidatesTags: ["Sessions"],
//     }),

//     closeSession: builder.mutation<
//       Session,
//       {
//         sessionId: string;
//         data: CloseSessionPayload;
//       }
//     >({
//       async queryFn({ sessionId, data }, _api, _extraOptions, baseQuery) {
//         try {
//           if (await isOnline()) {
//             const result = await baseQuery({
//               url: `/tenant/sessions/${sessionId}/close`,
//               method: "POST",
//               body: data,
//             });

//             if (!result.error) {
//               return {
//                 data: result.data as Session,
//               };
//             }

//             if (
//               typeof result.error.status === "number" &&
//               result.error.status < 500
//             ) {
//               return {
//                 error: result.error,
//               };
//             }
//           }

//           const session = await closeOfflineSession(sessionId, data);

//           return {
//             data: session,
//           };
//         } catch (err) {
//           return {
//             error: {
//               status: "CUSTOM_ERROR",
//               error:
//                 err instanceof Error ? err.message : "Unable to close session",
//             },
//           };
//         }
//       },

//       invalidatesTags: ["Sessions"],
//     }),
//   }),
// });

// export const {
//   useGetActiveSessionQuery,
//   useOpenSessionMutation,
//   useCloseSessionMutation,
// } = sessionApi;

// // import { posApi } from "@/services/api/posApi";
// // import { isOnline } from "@/services/offline/network";
// // import {
// //   closeOfflineSession,
// //   getLocalActiveSession,
// //   openOfflineSession,
// //   upsertSessions,
// // } from "@/services/offline/repository";
// // export interface OpenSessionPayload {
// //   userId: string;
// //   openingBalance: number;
// //   notes?: string;
// //   storeId?: string;
// // }
// // import { Session, CloseSessionPayload } from "./sessionTypes";

// // export const sessionApi = posApi.injectEndpoints({
// //   overrideExisting: false,
// //   endpoints: (builder) => ({
// //     getActiveSession: builder.query<
// //       Session,
// //       { userId: string; storeId?: string }
// //     >({
// //       async queryFn({ userId, storeId }, _api, _extraOptions, baseQuery) {
// //         if (await isOnline()) {
// //           const result = await baseQuery(
// //             `/tenant/sessions/active/${userId}${storeId ? `?storeId=${storeId}` : ""}`,
// //           );
// //           if (!result.error) {
// //             const session = result.data as Session;
// //             if (session?.id) await upsertSessions([session]);
// //             return { data: await getLocalActiveSession(userId, storeId) as Session };
// //           }

// //           if (
// //             typeof result.error.status === "number" &&
// //             result.error.status < 500
// //           ) {
// //             const localSession = await getLocalActiveSession(userId, storeId);
// //             return localSession
// //               ? { data: localSession }
// //               : { error: result.error };
// //           }
// //         }

// //         const localSession = await getLocalActiveSession(userId, storeId);
// //         return localSession
// //           ? { data: localSession }
// //           : {
// //               error: {
// //                 status: "CUSTOM_ERROR",
// //                 error: "No active offline session",
// //               },
// //             };
// //       },
// //       providesTags: ["Sessions"],
// //     }),

// //     openSession: builder.mutation<Session, OpenSessionPayload>({
// //       async queryFn(body, _api, _extraOptions, baseQuery) {
// //         if (await isOnline()) {
// //           const result = await baseQuery({
// //             url: "/tenant/sessions/open",
// //             method: "POST",
// //             body,
// //           });
// //           if (!result.error) return { data: result.data as Session };
// //           if (
// //             typeof result.error.status === "number" &&
// //             result.error.status < 500
// //           )
// //             return { error: result.error };
// //         }

// //         return { data: await openOfflineSession(body) };
// //       },
// //       invalidatesTags: ["Sessions"],
// //     }),

// //     closeSession: builder.mutation<
// //       Session,
// //       { sessionId: string; data: CloseSessionPayload }
// //     >({
// //       async queryFn({ sessionId, data }, _api, _extraOptions, baseQuery) {
// //         if (await isOnline()) {
// //           const result = await baseQuery({
// //             url: `/tenant/sessions/${sessionId}/close`,
// //             method: "POST",
// //             body: data,
// //           });
// //           if (!result.error) return { data: result.data as Session };
// //           if (
// //             typeof result.error.status === "number" &&
// //             result.error.status < 500
// //           )
// //             return { error: result.error };
// //         }

// //         return { data: await closeOfflineSession(sessionId, data) };
// //       },
// //       invalidatesTags: ["Sessions"],
// //     }),
// //   }),
// // });

// // export const {
// //   useGetActiveSessionQuery,
// //   useOpenSessionMutation,
// //   useCloseSessionMutation,
// // } = sessionApi;
