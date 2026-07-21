import { baseApi } from "@/services/api/baseApi";
import { StaffRepository } from "@/services/offline/repositories/staffRepo";

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStaff: builder.query<any, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const repo = new StaffRepository();
        try {
          const result = await baseQuery({
            url: "/tenant/staff",
          });
          if (result.data) {
            const staffs = (result.data as any).data || result.data;
            for (const staff of staffs) {
              await repo.upsertFromServer(staff);
            }
          }
        } catch (e) {
          console.log("Offline or network error fetching staff");
        }

        const localStaff = await repo.getStaff();
        return { data: localStaff };
      },
      providesTags: ["Staff"],
    }),
    createStaff: builder.mutation<any, any>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const repo = new StaffRepository();
        const localId = await repo.createLocal(body);

        const result = await baseQuery({
          url: "/tenant/staff",
          method: "POST",
          body,
        });

        if (result.data) {
          const serverStaff = result.data as any;
          await repo.markSynced(localId, serverStaff.id);
          return { data: serverStaff };
        }

        return { data: { ...body, id: localId } };
      },
      invalidatesTags: ["Staff"],
    }),
    updateStaff: builder.mutation<any, { id: string; data: any }>({
      async queryFn({ id, data }, _api, _extraOptions, baseQuery) {
        const repo = new StaffRepository();
        await repo.updateLocal(id, data);

        const result = await baseQuery({
          url: `/tenant/staff/${id}`,
          method: "PUT",
          body: data,
        });

        if (result.data) {
          const serverStaff = result.data as any;
          await repo.markSynced(id, serverStaff.id);
          return { data: serverStaff };
        }

        return { data: { id, ...data } };
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Staff", id }],
    }),
    deleteStaff: builder.mutation<any, string>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const repo = new StaffRepository();
        await repo.deleteLocal(id);

        await baseQuery({
          url: `/tenant/staff/${id}`,
          method: "DELETE",
        });

        return { data: undefined };
      },
      invalidatesTags: ["Staff"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = staffApi;
