import { posApi } from "@/services/api/posApi";
export interface OpenSessionPayload {
  userId: string;
  openingBalance: number;
  notes?: string;
  storeId?: string;
}
import { Session, CloseSessionPayload } from "./sessionTypes";

export const sessionApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getActiveSession: builder.query<Session, { userId: string; storeId?: string }>({
      query: ({ userId, storeId }) => `/sessions/active/${userId}${storeId ? `?storeId=${storeId}` : ""}`,
      providesTags: ["Sessions"],
    }),

    openSession: builder.mutation<Session, OpenSessionPayload>({
      query: (body) => ({
        url: "/sessions/open",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),

    closeSession: builder.mutation<Session, { sessionId: string; data: CloseSessionPayload }>({
      query: ({ sessionId, data }) => ({
        url: `/sessions/${sessionId}/close`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),
  }),
});

export const {
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useCloseSessionMutation,
} = sessionApi;
