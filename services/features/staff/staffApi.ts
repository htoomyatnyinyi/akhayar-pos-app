import { posApi } from "@/services/api/posApi";
import { isOnline } from "@/services/offline/network";
import {
  createOfflineGenericRecord,
  deleteOfflineGenericRecord,
  getLocalGenericRecords,
  updateOfflineGenericRecord,
  upsertGenericRecords,
} from "@/services/offline/repository";
import { Staff } from "./staffTypes";

export interface CreateStaffPayload {
  username: string;
  email?: string;
  name: string;
  password?: string;
  role: string;
  permissions: string[];
  isActive?: boolean;
  storeId?: string;
}

export const staffApi = posApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getStaff: builder.query<Staff[], string | undefined>({
      async queryFn(storeId, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery(`/staff${storeId ? `?storeId=${storeId}` : ""}`);
          if (!result.error && Array.isArray(result.data)) {
            await upsertGenericRecords("staff", result.data as Staff[]);
            return { data: result.data as Staff[] };
          }
        }

        return { data: await getLocalGenericRecords<Staff>("staff") };
      },
      providesTags: ["Staff"],
    }),

    getStaffById: builder.query<Staff, string>({
      query: (id) => `/staff/${id}`,
      providesTags: ["Staff"],
    }),

    createStaff: builder.mutation<Staff, CreateStaffPayload>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({ url: "/staff", method: "POST", body });
          if (!result.error) return { data: result.data as Staff };
          if (typeof result.error.status === "number" && result.error.status < 500) return { error: result.error };
        }

        return { data: (await createOfflineGenericRecord("staff", "/staff", body)) as Staff };
      },
      invalidatesTags: ["Staff"],
    }),

    updateStaff: builder.mutation<Staff, { id: string; data: Partial<CreateStaffPayload> }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({ url: `/staff/${id}`, method: "PUT", body: data });
          if (!result.error) return { data: result.data as Staff };
          if (typeof result.error.status === "number" && result.error.status < 500) return { error: result.error };
        }

        return { data: (await updateOfflineGenericRecord("staff", `/staff/${id}`, id, data)) as unknown as Staff };
      },
      invalidatesTags: ["Staff"],
    }),

    deleteStaff: builder.mutation<void, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        if (await isOnline()) {
          const result = await baseQuery({ url: `/staff/${id}`, method: "DELETE" });
          if (!result.error) return { data: undefined };
          if (typeof result.error.status === "number" && result.error.status < 500) return { error: result.error };
        }

        await deleteOfflineGenericRecord("staff", `/staff/${id}`, id);
        return { data: undefined };
      },
      invalidatesTags: ["Staff"],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useGetStaffByIdQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = staffApi;
