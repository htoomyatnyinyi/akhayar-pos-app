import { posApi } from "@/services/api/posApi";
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
      query: (storeId) => `/staff${storeId ? `?storeId=${storeId}` : ""}`,
      providesTags: ["Staff"],
    }),

    getStaffById: builder.query<Staff, string>({
      query: (id) => `/staff/${id}`,
      providesTags: ["Staff"],
    }),

    createStaff: builder.mutation<Staff, CreateStaffPayload>({
      query: (body) => ({
        url: "/staff",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Staff"],
    }),

    updateStaff: builder.mutation<Staff, { id: string; data: Partial<CreateStaffPayload> }>({
      query: ({ id, data }) => ({
        url: `/staff/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Staff"],
    }),

    deleteStaff: builder.mutation<void, string>({
      query: (id) => ({
        url: `/staff/${id}`,
        method: "DELETE",
      }),
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
