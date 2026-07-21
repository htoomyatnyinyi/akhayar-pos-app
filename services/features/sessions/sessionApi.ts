import { baseApi } from "@/services/api/baseApi";
import { SessionRepository } from "@/services/offline/repositories/sessionRepo";

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveSession: builder.query<any, { userId: string; storeId?: string }>({
      async queryFn({ userId, storeId }, _api, _extraOptions, baseQuery) {
        const repo = new SessionRepository();
        try {
          const result = await baseQuery({
            url: `/tenant/sessions/active/${userId}${
              storeId ? `?storeId=${storeId}` : ""
            }`,
          });

          if (result.data) {
            const session = (result.data as any).data || result.data;
            if (session?.id) {
              await repo.upsertFromServer(session);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching active session");
        }

        const localSession = await repo.getActiveSession(userId, storeId);
        return { data: localSession };
      },
      providesTags: ["Session"],
    }),
    openSession: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new SessionRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/sessions/open",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverSession = result.data as any;
          await repo.markSynced(localId, serverSession.id);
          return { data: serverSession };
        }

        return { data: { ...body, id: localId, status: "OPEN" } };
      },
      invalidatesTags: ["Session"],
    }),
    closeSession: builder.mutation<any, { sessionId: string; data: any }>({
      async queryFn({ sessionId, data }, _api, _extraOptions, baseQuery) {
        const repo = new SessionRepository();
        await repo.updateLocal(sessionId, {
          ...data,
          status: "CLOSED",
          closedAt: Date.now(),
        });

        const result = await baseQuery({
          url: `/tenant/sessions/${sessionId}/close`,
          method: "POST",
          body: data,
        });

        if (result.data) {
          const serverSession = result.data as any;
          await repo.markSynced(sessionId, serverSession.id);
          return { data: serverSession };
        }

        return { data: { id: sessionId, ...data, status: "CLOSED" } };
      },
      invalidatesTags: (result, error, { sessionId }) => [
        { type: "Session", id: sessionId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetActiveSessionQuery,
  useOpenSessionMutation,
  useCloseSessionMutation,
} = sessionApi;
