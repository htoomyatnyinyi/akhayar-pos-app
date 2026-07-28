// ============================================
// FILE: services/api/brandEndpoints.ts
// ============================================

// import { posApi, POS_API_URL } from "./remoteApi";
import { posApi } from "@/services/api/posApi";

// ============================================
// TYPES
// ============================================

export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateBrandPayload = Omit<
  Brand,
  "id" | "createdAt" | "updatedAt"
> & {
  tenantId: string;
  name: string;
};

export type UpdateBrandPayload = Partial<
  Omit<Brand, "id" | "tenantId" | "createdAt" | "updatedAt">
>;

export interface BrandListResponse {
  brands?: Brand[];
  data?: Brand[]; // fallback
  items?: Brand[]; // fallback
  total?: number;
  page?: number;
  limit?: number;
}

export interface BrandResponse {
  brand?: Brand;
  data?: Brand; // fallback
}

// ============================================
// INJECT BRAND ENDPOINTS
// ============================================

export const brandEndpoints = posApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET all brands
    getRemoteBrands: builder.query<
      BrandListResponse,
      { isActive?: boolean; page?: number; limit?: number } | void
    >({
      query: (params) => {
        let url = "/tenant/brands";
        const searchParams = new URLSearchParams();
        if (params && typeof params === "object") {
          if (params.isActive !== undefined)
            searchParams.append("isActive", String(params.isActive));
          if (params.page) searchParams.append("page", String(params.page));
          if (params.limit) searchParams.append("limit", String(params.limit));
          const query = searchParams.toString();
          if (query) url += `?${query}`;
        }
        return { url, method: "GET" };
      },
      providesTags: (result) =>
        result
          ? [
              ...(Array.isArray(result.brands) ||
              Array.isArray(result.data) ||
              Array.isArray(result.items)
                ? (result.brands || result.data || result.items || []).map(
                    ({ id }) => ({ type: "Brands" as const, id }),
                  )
                : []),
              { type: "Brands", id: "LIST" },
            ]
          : [{ type: "Brands", id: "LIST" }],
    }),

    // GET brand by ID
    getRemoteBrandById: builder.query<BrandResponse, string>({
      query: (id) => ({
        url: `/tenant/brands/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Brands", id }],
    }),

    // CREATE brand
    createRemoteBrand: builder.mutation<BrandResponse, CreateBrandPayload>({
      query: (payload) => ({
        url: "/tenant/brands",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: [{ type: "Brands", id: "LIST" }],
    }),

    // UPDATE brand
    updateRemoteBrand: builder.mutation<
      BrandResponse,
      { id: string } & UpdateBrandPayload
    >({
      query: ({ id, ...payload }) => ({
        url: `/tenant/brands/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Brands", id }],
    }),

    // DELETE brand (soft delete if API supports, otherwise hard)
    deleteRemoteBrand: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/tenant/brands/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Brands", id }],
    }),
  }),
});

// ============================================
// EXPORT HOOKS
// ============================================

export const {
  useGetRemoteBrandsQuery,
  useGetRemoteBrandByIdQuery,
  useCreateRemoteBrandMutation,
  useUpdateRemoteBrandMutation,
  useDeleteRemoteBrandMutation,
} = brandEndpoints;
