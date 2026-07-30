import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

let POS_URL = process.env.EXPO_PUBLIC_POS_URL || "https://pos.oasislab.de5.net";
if (!POS_URL.endsWith("/api")) {
  POS_URL = `${POS_URL}/api`;
}
export const POS_API_URL = POS_URL;

export const remoteApi = createApi({
  reducerPath: "remoteApi",
  baseQuery: fetchBaseQuery({
    baseUrl: POS_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.user?.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    "Auth",
    "Products",
    "ProductVariants",
    "Categories",
    "Customers",
    "Stores",
    "Sessions",
    "Orders",
    "Inventory",
    "InventoryMovements",
    "InventoryCounts",
    "PriceHistory",
    "Staff",
    "Suppliers",
    "Brands", // added for brands
    "Payments",
    "Returns",
    "PurchaseOrders",
    "StockTransfers",
    "Promotions",
    "StoreSettings",
    "Notifications",
    "TaxRates",
    "Expenses",
    "CashRegisters",
    "GiftCards",
    "Wallets",
    "SupplierPayments",
    "ApiKeys",
    "Webhooks",
    "AuditLogs",
    "Accounts",
    "JournalEntries",
    "Reports",
    "Dashboard",
    "Sync",
  ],
  endpoints: (builder) => ({
    // // ================================================================
    // // AUTH ENDPOINTS
    // // ================================================================

    // register: builder.mutation<
    //   unknown,
    //   {
    //     name: string;
    //     email: string;
    //     password: string;
    //     tenantName?: string;
    //     tenantCode?: string;
    //   }
    // >({
    //   query: (body) => ({
    //     url: "/auth/register",
    //     method: "POST",
    //     body,
    //   }),
    //   invalidatesTags: ["Auth"],
    // }),

    // login: builder.mutation<
    //   unknown,
    //   {
    //     email: string;
    //     password: string;
    //     tenantCode: string;
    //   }
    // >({
    //   query: (body) => ({
    //     url: "/auth/login",
    //     method: "POST",
    //     body,
    //   }),
    //   invalidatesTags: ["Auth"],
    // }),

    // verifyEmail: builder.mutation<unknown, { code: string }>({
    //   query: (body) => ({
    //     url: "/auth/verify-email",
    //     method: "POST",
    //     body,
    //   }),
    // }),

    // resendOtp: builder.mutation<unknown, void>({
    //   query: () => ({
    //     url: "/auth/resend-otp",
    //     method: "POST",
    //   }),
    // }),

    // forgotPassword: builder.mutation<unknown, { email: string }>({
    //   query: (body) => ({
    //     url: "/auth/forgot-password",
    //     method: "POST",
    //     body,
    //   }),
    // }),

    // resetPassword: builder.mutation<
    //   unknown,
    //   {
    //     email: string;
    //     code: string;
    //     newPassword: string;
    //   }
    // >({
    //   query: (body) => ({
    //     url: "/auth/reset-password",
    //     method: "POST",
    //     body,
    //   }),
    // }),

    // getMe: builder.query<unknown, void>({
    //   query: () => ({
    //     url: "/auth/me",
    //     method: "GET",
    //   }),
    //   providesTags: ["Auth"],
    // }),

    // googleAuth: builder.query<unknown, void>({
    //   query: () => ({
    //     url: "/auth/google",
    //     method: "GET",
    //   }),
    // }),

    // googleAuthCallback: builder.query<unknown, void>({
    //   query: () => ({
    //     url: "/auth/google/callback",
    //     method: "GET",
    //   }),
    // }),

    // platformLogin: builder.mutation<
    //   unknown,
    //   {
    //     email: string;
    //     password: string;
    //   }
    // >({
    //   query: (body) => ({
    //     url: "/platform/auth/login",
    //     method: "POST",
    //     body,
    //   }),
    // }),

    // platformGetMe: builder.query<unknown, void>({
    //   query: () => ({
    //     url: "/platform/auth/me",
    //     method: "GET",
    //   }),
    //   providesTags: ["Auth"],
    // }),

    // ================================================================
    // SYNC ENDPOINTS (pull changes since a timestamp)
    // ================================================================

    getSyncOrders: builder.query<unknown, { since?: string }>({
      query: ({ since }) => ({
        url: "/sync/orders",
        params: since ? { since } : undefined,
      }),
      providesTags: ["Orders", "Sync"],
    }),

    getSyncProducts: builder.query<unknown, { since?: string }>({
      query: ({ since }) => ({
        url: "/sync/products",
        params: since ? { since } : undefined,
      }),
      providesTags: ["Products", "Sync"],
    }),

    getSyncCustomers: builder.query<unknown, { since?: string }>({
      query: ({ since }) => ({
        url: "/sync/customers",
        params: since ? { since } : undefined,
      }),
      providesTags: ["Customers", "Sync"],
    }),

    getSyncInventory: builder.query<unknown, { since?: string }>({
      query: ({ since }) => ({
        url: "/sync/inventory",
        params: since ? { since } : undefined,
      }),
      providesTags: ["Inventory", "Sync"],
    }),

    // ================================================================
    // DASHBOARD ENDPOINTS
    // ================================================================

    getDashboardStats: builder.query<unknown, void>({
      query: () => ({
        url: "/dashboard/stats",
        method: "GET",
      }),
      providesTags: ["Dashboard"],
    }),

    getDashboardRevenue: builder.query<unknown, { days?: number }>({
      query: ({ days }) => ({
        url: "/dashboard/revenue",
        params: days ? { days } : undefined,
      }),
      providesTags: ["Dashboard"],
    }),

    getDashboardTopProducts: builder.query<unknown, { limit?: number }>({
      query: ({ limit }) => ({
        url: "/dashboard/top-products",
        params: limit ? { limit } : undefined,
      }),
      providesTags: ["Dashboard"],
    }),

    getPlatformDashboardStats: builder.query<unknown, void>({
      query: () => ({
        url: "/dashboard/platform/stats",
        method: "GET",
      }),
      providesTags: ["Dashboard"],
    }),

    getPlatformDashboardRevenue: builder.query<unknown, { days?: number }>({
      query: ({ days }) => ({
        url: "/dashboard/platform/revenue",
        params: days ? { days } : undefined,
      }),
      providesTags: ["Dashboard"],
    }),

    getPlatformDashboardTopProducts: builder.query<unknown, { limit?: number }>(
      {
        query: ({ limit }) => ({
          url: "/dashboard/platform/top-products",
          params: limit ? { limit } : undefined,
        }),
        providesTags: ["Dashboard"],
      },
    ),

    // ================================================================
    // PLATFORM ADMIN ENDPOINTS
    // ================================================================

    // API Keys (platform)
    getPlatformApiKeys: builder.query<unknown, void>({
      query: () => ({
        url: "/platform/api-keys/",
        method: "GET",
      }),
      providesTags: ["ApiKeys"],
    }),

    createPlatformApiKey: builder.mutation<
      unknown,
      {
        userId: string;
        name: string;
        permissions?: string[];
        expiresAt?: string;
      }
    >({
      query: (body) => ({
        url: "/platform/api-keys/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ApiKeys"],
    }),

    deletePlatformApiKey: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/platform/api-keys/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ApiKeys"],
    }),

    // Tenants (platform)
    getPlatformTenants: builder.query<
      unknown,
      { page?: number; limit?: number }
    >({
      query: ({ page, limit }) => ({
        url: "/platform/tenants/",
        params: { page, limit },
      }),
      providesTags: ["Auth"],
    }),

    createPlatformTenant: builder.mutation<
      unknown,
      {
        name: string;
        code?: string;
        email?: string;
        phone?: string;
        userId?: string;
      }
    >({
      query: (body) => ({
        url: "/platform/tenants/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    getPlatformTenantById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/platform/tenants/${id}`,
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    updatePlatformTenant: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        email?: string;
        phone?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/platform/tenants/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    deletePlatformTenant: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/platform/tenants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Auth"],
    }),

    assignSubscription: builder.mutation<
      unknown,
      {
        id: string;
        planId: string;
        billingCycle?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/platform/tenants/${id}/subscription`,
        method: "POST",
        body,
      }),
    }),

    // Audit Logs (platform)
    getPlatformAuditLogs: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        userId?: string;
        entity?: string;
        action?: string;
      }
    >({
      query: (params) => ({
        url: "/platform/audit-logs/",
        params,
      }),
      providesTags: ["AuditLogs"],
    }),

    createPlatformAuditLog: builder.mutation<
      unknown,
      {
        action: string;
        entity: string;
        entityId: string;
        userId?: string;
        oldData?: any;
        newData?: any;
        changes?: any;
        ipAddress?: string;
        userAgent?: string;
      }
    >({
      query: (body) => ({
        url: "/platform/audit-logs/",
        method: "POST",
        body,
      }),
    }),

    getPlatformAuditLogById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/platform/audit-logs/${id}`,
        method: "GET",
      }),
      providesTags: ["AuditLogs"],
    }),

    // Store Settings (platform)
    getPlatformStoreSettings: builder.query<
      unknown,
      {
        storeId?: string;
        settingKey?: string;
      }
    >({
      query: (params) => ({
        url: "/platform/store-settings/",
        params,
      }),
      providesTags: ["StoreSettings"],
    }),

    createPlatformStoreSetting: builder.mutation<
      unknown,
      {
        storeId: string;
        settingKey: string;
        settingValue: any;
        description?: string;
      }
    >({
      query: (body) => ({
        url: "/platform/store-settings/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StoreSettings"],
    }),

    getPlatformStoreSettingById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/platform/store-settings/${id}`,
        method: "GET",
      }),
      providesTags: ["StoreSettings"],
    }),

    deletePlatformStoreSetting: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/platform/store-settings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StoreSettings"],
    }),

    // Accounts (platform accounting)
    getPlatformAccounts: builder.query<unknown, { tenantId?: string }>({
      query: (params) => ({
        url: "/platform/accounts/",
        params,
      }),
      providesTags: ["Accounts"],
    }),

    createPlatformAccount: builder.mutation<
      unknown,
      {
        tenantId: string;
        code: string;
        name: string;
        type: string;
        parentId?: string;
        subType?: string;
        description?: string;
        isSystem?: boolean;
      }
    >({
      query: (body) => ({
        url: "/platform/accounts/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounts"],
    }),

    getPlatformAccountById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/platform/accounts/${id}`,
        method: "GET",
      }),
      providesTags: ["Accounts"],
    }),

    updatePlatformAccount: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        parentId?: string;
        subType?: string;
        description?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/platform/accounts/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounts"],
    }),

    deletePlatformAccount: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/platform/accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Accounts"],
    }),

    // Journal Entries (platform accounting)
    getPlatformJournalEntries: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        tenantId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
      }
    >({
      query: (params) => ({
        url: "/platform/journal-entries/",
        params,
      }),
      providesTags: ["JournalEntries"],
    }),

    createPlatformJournalEntry: builder.mutation<
      unknown,
      {
        tenantId: string;
        lines: Array<{
          accountId: string;
          amount: number;
          side: string;
          description?: string;
        }>;
        date?: string;
        description?: string;
        reference?: string;
        entryType?: string;
        status?: string;
        orderId?: string;
        paymentId?: string;
        currencyCode?: string;
        exchangeRate?: number;
      }
    >({
      query: (body) => ({
        url: "/platform/journal-entries/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JournalEntries"],
    }),

    getPlatformJournalEntryById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/platform/journal-entries/${id}`,
        method: "GET",
      }),
      providesTags: ["JournalEntries"],
    }),

    deletePlatformJournalEntry: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/platform/journal-entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["JournalEntries"],
    }),

    postPlatformJournalEntry: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/platform/journal-entries/${id}/post`,
        method: "POST",
      }),
      invalidatesTags: ["JournalEntries"],
    }),

    // Reports (platform)
    getTrialBalance: builder.query<
      unknown,
      { tenantId: string; asOfDate?: string }
    >({
      query: (params) => ({
        url: "/platform/reports/trial-balance",
        params,
      }),
      providesTags: ["Reports"],
    }),

    // ================================================================
    // TENANT ENDPOINTS (main business)
    // ================================================================

    // ---------- Profile ----------
    getTenantProfile: builder.query<unknown, void>({
      query: () => ({
        url: "/tenant/profile/",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    updateTenantProfile: builder.mutation<
      unknown,
      {
        name?: string;
        email?: string;
        phone?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/profile/",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    // ---------- Products ----------
    getRemoteProducts: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        storeId?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/products/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.products) || Array.isArray(result.data)
              ? (result.products || result.data || []).map((p: any) => ({
                  type: "Products" as const,
                  id: p.id,
                }))
              : []
            ).concat({ type: "Products", id: "LIST" })
          : [{ type: "Products", id: "LIST" }],
    }),

    getRemoteProductById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/products/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Products", id }],
    }),

    getRemoteProductByBarcode: builder.query<unknown, string>({
      query: (barcode) => ({
        url: `/tenant/products/barcode/${barcode}`,
        method: "GET",
      }),
      providesTags: ["Products"],
    }),

    createRemoteProduct: builder.mutation<unknown, any>({
      query: (body) => ({
        url: "/tenant/products/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Products", id: "LIST" }],
    }),

    updateRemoteProduct: builder.mutation<unknown, { id: string } & any>({
      query: ({ id, ...body }) => ({
        url: `/tenant/products/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Products", id }],
    }),

    deleteRemoteProduct: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Products", id }],
    }),

    // ---------- Categories ----------
    getRemoteCategories: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/categories/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.categories) || Array.isArray(result.data)
              ? (result.categories || result.data || []).map((c: any) => ({
                  type: "Categories" as const,
                  id: c.id,
                }))
              : []
            ).concat({ type: "Categories", id: "LIST" })
          : [{ type: "Categories", id: "LIST" }],
    }),

    getRemoteCategoryById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/categories/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Categories", id }],
    }),

    createRemoteCategory: builder.mutation<
      unknown,
      {
        name: string;
        slug?: string;
        description?: string;
        parentId?: string;
        sortOrder?: number;
      }
    >({
      query: (body) => ({
        url: "/tenant/categories/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Categories", id: "LIST" }],
    }),

    updateRemoteCategory: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        slug?: string;
        description?: string;
        parentId?: string;
        sortOrder?: number;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/categories/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Categories", id }],
    }),

    deleteRemoteCategory: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Categories", id }],
    }),

    // ---------- Customers ----------
    getRemoteCustomers: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        search?: string;
        tier?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/customers/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.customers) || Array.isArray(result.data)
              ? (result.customers || result.data || []).map((c: any) => ({
                  type: "Customers" as const,
                  id: c.id,
                }))
              : []
            ).concat({ type: "Customers", id: "LIST" })
          : [{ type: "Customers", id: "LIST" }],
    }),

    getRemoteCustomerById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/customers/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Customers", id }],
    }),

    createRemoteCustomer: builder.mutation<
      unknown,
      {
        name: string;
        code?: string;
        phone?: string;
        email?: string;
        address?: string;
        dateOfBirth?: string;
        gender?: string;
        tier?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/customers/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Customers", id: "LIST" }],
    }),

    updateRemoteCustomer: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        code?: string;
        phone?: string;
        email?: string;
        address?: string;
        dateOfBirth?: string;
        gender?: string;
        tier?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/customers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Customers", id }],
    }),

    deleteRemoteCustomer: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Customers", id }],
    }),

    // ---------- Stores ----------
    getRemoteStores: builder.query<unknown, void>({
      query: () => ({
        url: "/tenant/stores/",
        method: "GET",
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.stores) || Array.isArray(result.data)
              ? (result.stores || result.data || []).map((s: any) => ({
                  type: "Stores" as const,
                  id: s.id,
                }))
              : []
            ).concat({ type: "Stores", id: "LIST" })
          : [{ type: "Stores", id: "LIST" }],
    }),

    getRemoteStoreById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/stores/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Stores", id }],
    }),

    createRemoteStore: builder.mutation<
      unknown,
      {
        code: string;
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        taxNumber?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/stores/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Stores", id: "LIST" }],
    }),

    updateRemoteStore: builder.mutation<
      unknown,
      {
        id: string;
        code?: string;
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        taxNumber?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/stores/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Stores", id }],
    }),

    deleteRemoteStore: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/stores/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Stores", id }],
    }),

    // ---------- Sessions ----------
    getRemoteSessions: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
        status?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/sessions/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.sessions) || Array.isArray(result.data)
              ? (result.sessions || result.data || []).map((s: any) => ({
                  type: "Sessions" as const,
                  id: s.id,
                }))
              : []
            ).concat({ type: "Sessions", id: "LIST" })
          : [{ type: "Sessions", id: "LIST" }],
    }),

    getRemoteActiveSession: builder.query<
      unknown,
      { userId: string; storeId?: string }
    >({
      query: ({ userId, storeId }) => ({
        url: `/tenant/sessions/active/${userId}`,
        params: storeId ? { storeId } : undefined,
      }),
      providesTags: ["Sessions"],
    }),

    openRemoteSession: builder.mutation<
      unknown,
      {
        openingBalance: number;
        storeId?: string;
        registerId?: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/sessions/open",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),

    closeRemoteSession: builder.mutation<
      unknown,
      {
        id: string;
        closingBalance: number;
        expectedBalance?: number;
        discrepancy?: number;
        cashSales?: number;
        cardSales?: number;
        digitalSales?: number;
        notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/sessions/${id}/close`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Sessions", id }],
    }),

    // ---------- Orders ----------
    getRemoteOrders: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
        sessionId?: string;
        status?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/orders/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.orders) || Array.isArray(result.data)
              ? (result.orders || result.data || []).map((o: any) => ({
                  type: "Orders" as const,
                  id: o.id,
                }))
              : []
            ).concat({ type: "Orders", id: "LIST" })
          : [{ type: "Orders", id: "LIST" }],
    }),

    getRemoteOrderById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/orders/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Orders", id }],
    }),

    createRemoteOrder: builder.mutation<unknown, any>({
      query: (body) => ({
        url: "/tenant/orders/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Orders", "Inventory"],
    }),

    deleteRemoteOrder: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Orders", id }],
    }),

    completeRemoteOrder: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/orders/${id}/complete`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Orders", id }],
    }),

    updateRemoteOrderStatus: builder.mutation<
      unknown,
      {
        id: string;
        status: string;
      }
    >({
      query: ({ id, status }) => ({
        url: `/tenant/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
    }),

    // ---------- Inventory ----------
    getRemoteInventory: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
        productId?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/inventory/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.inventory) || Array.isArray(result.data)
              ? (result.inventory || result.data || []).map((i: any) => ({
                  type: "Inventory" as const,
                  id: i.id,
                }))
              : []
            ).concat({ type: "Inventory", id: "LIST" })
          : [{ type: "Inventory", id: "LIST" }],
    }),

    // ---------- Inventory Movements ----------
    getRemoteInventoryMovements: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
        type?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/inventory/movements/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.movements) || Array.isArray(result.data)
              ? (result.movements || result.data || []).map((m: any) => ({
                  type: "InventoryMovements" as const,
                  id: m.id,
                }))
              : []
            ).concat({ type: "InventoryMovements", id: "LIST" })
          : [{ type: "InventoryMovements", id: "LIST" }],
    }),

    createRemoteInventoryMovement: builder.mutation<
      unknown,
      {
        storeId: string;
        productId: string;
        variantId?: string;
        quantity: number;
        type: string;
        referenceId: string;
        referenceType: string;
        reason?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/inventory/movements/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["InventoryMovements", "Inventory"],
    }),

    // ---------- Inventory Counts ----------
    getRemoteInventoryCounts: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/inventory/counts/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.counts) || Array.isArray(result.data)
              ? (result.counts || result.data || []).map((c: any) => ({
                  type: "InventoryCounts" as const,
                  id: c.id,
                }))
              : []
            ).concat({ type: "InventoryCounts", id: "LIST" })
          : [{ type: "InventoryCounts", id: "LIST" }],
    }),

    createRemoteInventoryCount: builder.mutation<
      unknown,
      {
        storeId: string;
        items: Array<{
          productId: string;
          variantId?: string;
          systemQuantity: number;
          countedQuantity: number;
          reason?: string;
        }>;
        scheduledDate?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/inventory/counts/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["InventoryCounts", "Inventory"],
    }),

    // ---------- Staff ----------
    getRemoteStaff: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
        role?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/staff/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.staff) || Array.isArray(result.data)
              ? (result.staff || result.data || []).map((s: any) => ({
                  type: "Staff" as const,
                  id: s.id,
                }))
              : []
            ).concat({ type: "Staff", id: "LIST" })
          : [{ type: "Staff", id: "LIST" }],
    }),

    getRemoteStaffById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/staff/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Staff", id }],
    }),

    createRemoteStaff: builder.mutation<
      unknown,
      {
        username: string;
        email: string;
        name: string;
        password: string;
        role: string;
        permissions: string[];
        storeId?: string;
        isActive?: boolean;
      }
    >({
      query: (body) => ({
        url: "/tenant/staff/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),

    updateRemoteStaff: builder.mutation<
      unknown,
      {
        id: string;
        username?: string;
        email?: string;
        name?: string;
        password?: string;
        role?: string;
        permissions?: string[];
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/staff/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Staff", id }],
    }),

    deleteRemoteStaff: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Staff", id }],
    }),

    // ---------- Suppliers ----------
    getRemoteSuppliers: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/suppliers/",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.suppliers) || Array.isArray(result.data)
              ? (result.suppliers || result.data || []).map((s: any) => ({
                  type: "Suppliers" as const,
                  id: s.id,
                }))
              : []
            ).concat({ type: "Suppliers", id: "LIST" })
          : [{ type: "Suppliers", id: "LIST" }],
    }),

    getRemoteSupplierById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/suppliers/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Suppliers", id }],
    }),

    createRemoteSupplier: builder.mutation<
      unknown,
      {
        name: string;
        code?: string;
        contactName?: string;
        phone?: string;
        email?: string;
        address?: string;
        taxId?: string;
        paymentTerms?: number;
        creditLimit?: number;
      }
    >({
      query: (body) => ({
        url: "/tenant/suppliers/",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Suppliers", id: "LIST" }],
    }),

    updateRemoteSupplier: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        code?: string;
        contactName?: string;
        phone?: string;
        email?: string;
        address?: string;
        taxId?: string;
        paymentTerms?: number;
        creditLimit?: number;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/suppliers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Suppliers", id }],
    }),

    deleteRemoteSupplier: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Suppliers", id }],
    }),

    // ---------- Brands (added for local sync) ----------
    getRemoteBrands: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        isActive?: boolean;
      }
    >({
      query: (params) => ({
        url: "/tenant/brands",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.brands) || Array.isArray(result.data)
              ? (result.brands || result.data || []).map((b: any) => ({
                  type: "Brands" as const,
                  id: b.id,
                }))
              : []
            ).concat({ type: "Brands", id: "LIST" })
          : [{ type: "Brands", id: "LIST" }],
    }),

    getRemoteBrandById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/brands/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Brands", id }],
    }),

    createRemoteBrand: builder.mutation<
      unknown,
      {
        name: string;
        description?: string;
        isActive?: boolean;
      }
    >({
      query: (body) => ({
        url: "/tenant/brands",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Brands", id: "LIST" }],
    }),

    updateRemoteBrand: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        description?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/brands/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Brands", id }],
    }),

    deleteRemoteBrand: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/brands/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Brands", id }],
    }),

    // ---------- Price History (if separate endpoint) ----------
    // Note: spec doesn't list price history endpoint under /tenant; it's under /tenant/price-history? Actually not in spec.
    // But localApi has it, so we'll add it if exists.
    getRemotePriceHistory: builder.query<
      unknown,
      {
        productId?: string;
        variantId?: string;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: "/tenant/price-history",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.priceHistory) || Array.isArray(result.data)
              ? (result.priceHistory || result.data || []).map((ph: any) => ({
                  type: "PriceHistory" as const,
                  id: ph.id,
                }))
              : []
            ).concat({ type: "PriceHistory", id: "LIST" })
          : [{ type: "PriceHistory", id: "LIST" }],
    }),

    createRemotePriceHistory: builder.mutation<
      unknown,
      {
        productId: string;
        variantId?: string;
        oldPrice: number;
        newPrice: number;
        changedBy?: string;
        reason?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/price-history",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PriceHistory", "Products"],
    }),

    // ---------- Product Variants (if separate endpoint) ----------
    // The spec does not define explicit variant endpoints, but local expects them.
    // We'll provide them based on common patterns.
    getRemoteProductVariants: builder.query<unknown, { productId?: string }>({
      query: (params) => ({
        url: "/tenant/product-variants",
        params,
      }),
      providesTags: (result) =>
        result
          ? (Array.isArray(result.variants) || Array.isArray(result.data)
              ? (result.variants || result.data || []).map((v: any) => ({
                  type: "ProductVariants" as const,
                  id: v.id,
                }))
              : []
            ).concat({ type: "ProductVariants", id: "LIST" })
          : [{ type: "ProductVariants", id: "LIST" }],
    }),

    createRemoteProductVariant: builder.mutation<unknown, any>({
      query: (body) => ({
        url: "/tenant/product-variants",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProductVariants", "Products"],
    }),

    updateRemoteProductVariant: builder.mutation<unknown, { id: string } & any>(
      {
        query: ({ id, ...body }) => ({
          url: `/tenant/product-variants/${id}`,
          method: "PUT",
          body,
        }),
        invalidatesTags: (result, error, { id }) => [
          { type: "ProductVariants", id },
        ],
      },
    ),

    deleteRemoteProductVariant: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/product-variants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "ProductVariants", id }],
    }),

    // ---------- Extra Tenant Endpoints (optional, but included for completeness) ----------

    // Store-specific products
    getStoreProducts: builder.query<
      unknown,
      {
        id: string;
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
      }
    >({
      query: ({ id, ...params }) => ({
        url: `/tenant/stores/${id}/products`,
        params,
      }),
      providesTags: ["Products"],
    }),

    getStoreProduct: builder.query<
      unknown,
      { storeId: string; productId: string }
    >({
      query: ({ storeId, productId }) => ({
        url: `/tenant/stores/${storeId}/products/${productId}`,
        method: "GET",
      }),
      providesTags: ["Products"],
    }),

    getStoreCategories: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/stores/${id}/categories`,
        method: "GET",
      }),
      providesTags: ["Categories"],
    }),

    getStoreOrders: builder.query<
      unknown,
      {
        id: string;
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: ({ id, ...params }) => ({
        url: `/tenant/stores/${id}/orders`,
        params,
      }),
      providesTags: ["Orders"],
    }),

    getStoreCustomers: builder.query<
      unknown,
      {
        id: string;
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: ({ id, ...params }) => ({
        url: `/tenant/stores/${id}/customers`,
        params,
      }),
      providesTags: ["Customers"],
    }),

    getStoreBrands: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/stores/${id}/brands`,
        method: "GET",
      }),
      providesTags: ["Brands"],
    }),

    getStoreSuppliers: builder.query<
      unknown,
      {
        id: string;
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: ({ id, ...params }) => ({
        url: `/tenant/stores/${id}/suppliers`,
        params,
      }),
      providesTags: ["Suppliers"],
    }),

    // ---------- Other resources (payments, returns, purchase orders, etc.) ----------
    // You can add them following the same pattern if needed.
    // I'll include a few as examples, but you can extend.

    getPayments: builder.query<unknown, void>({
      query: () => ({
        url: "/tenant/payments/",
        method: "GET",
      }),
      providesTags: ["Payments"],
    }),

    createPayment: builder.mutation<
      unknown,
      {
        orderId: string;
        amount: number;
        method: string;
        referenceNumber?: string;
        status?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/payments/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments", "Orders"],
    }),

    getPaymentById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/payments/${id}`,
        method: "GET",
      }),
      providesTags: ["Payments"],
    }),

    updatePayment: builder.mutation<
      unknown,
      {
        id: string;
        amount?: number;
        method?: string;
        referenceNumber?: string;
        status?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/payments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Payments", id }],
    }),

    deletePayment: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Payments", id }],
    }),

    // Returns
    getReturns: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        orderId?: string;
        refundStatus?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/returns/",
        params,
      }),
      providesTags: ["Returns"],
    }),

    createReturn: builder.mutation<
      unknown,
      {
        orderId: string;
        totalAmount: number;
        refundMethod: string;
        reason: string;
        items: Array<{
          orderItemId: string;
          quantity: number;
          refundAmount: number;
          reason?: string;
        }>;
        customerId?: string;
        refundStatus?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/returns/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Returns", "Orders", "Inventory"],
    }),

    getReturnById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/returns/${id}`,
        method: "GET",
      }),
      providesTags: ["Returns"],
    }),

    deleteReturn: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Returns", id }],
    }),

    // ---------- Purchase Orders ----------
    getPurchaseOrders: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        supplierId?: string;
        status?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/purchase-orders/",
        params,
      }),
      providesTags: ["PurchaseOrders"],
    }),

    createPurchaseOrder: builder.mutation<unknown, any>({
      query: (body) => ({
        url: "/tenant/purchase-orders/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrders", "Inventory"],
    }),

    getPurchaseOrderById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "GET",
      }),
      providesTags: ["PurchaseOrders"],
    }),

    updatePurchaseOrder: builder.mutation<
      unknown,
      {
        id: string;
        status?: string;
        expectedDate?: string;
        notes?: string;
        subTotal?: number;
        taxAmount?: number;
        grandTotal?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrders", id },
      ],
    }),

    deletePurchaseOrder: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "PurchaseOrders", id }],
    }),

    receivePurchaseOrder: builder.mutation<
      unknown,
      { id: string; storeId: string }
    >({
      query: ({ id, storeId }) => ({
        url: `/tenant/purchase-orders/${id}/receive`,
        method: "POST",
        body: { storeId },
      }),
      invalidatesTags: ["PurchaseOrders", "Inventory"],
    }),

    // ---------- Stock Transfers ----------
    getStockTransfers: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        fromStoreId?: string;
        toStoreId?: string;
        status?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/stock-transfers/",
        params,
      }),
      providesTags: ["StockTransfers"],
    }),

    createStockTransfer: builder.mutation<
      unknown,
      {
        fromStoreId: string;
        toStoreId: string;
        items: Array<{
          productId: string;
          variantId?: string;
          quantity: number;
        }>;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/stock-transfers/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StockTransfers", "Inventory"],
    }),

    getStockTransferById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}`,
        method: "GET",
      }),
      providesTags: ["StockTransfers"],
    }),

    deleteStockTransfer: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "StockTransfers", id }],
    }),

    completeStockTransfer: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [{ type: "StockTransfers", id }],
    }),

    // ---------- Promotions ----------
    getPromotions: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
      }
    >({
      query: (params) => ({
        url: "/tenant/promotions/",
        params,
      }),
      providesTags: ["Promotions"],
    }),

    createPromotion: builder.mutation<unknown, any>({
      query: (body) => ({
        url: "/tenant/promotions/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Promotions"],
    }),

    getPromotionById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/promotions/${id}`,
        method: "GET",
      }),
      providesTags: ["Promotions"],
    }),

    updatePromotion: builder.mutation<unknown, { id: string } & any>({
      query: ({ id, ...body }) => ({
        url: `/tenant/promotions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Promotions", id }],
    }),

    deletePromotion: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Promotions", id }],
    }),

    // ---------- Store Settings (tenant) ----------
    getTenantStoreSettings: builder.query<
      unknown,
      {
        storeId?: string;
        settingKey?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/store-settings/",
        params,
      }),
      providesTags: ["StoreSettings"],
    }),

    createTenantStoreSetting: builder.mutation<
      unknown,
      {
        storeId: string;
        settingKey: string;
        settingValue: any;
        description?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/store-settings/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StoreSettings"],
    }),

    getTenantStoreSettingById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/store-settings/${id}`,
        method: "GET",
      }),
      providesTags: ["StoreSettings"],
    }),

    deleteTenantStoreSetting: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/store-settings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StoreSettings"],
    }),

    // ---------- Notifications ----------
    getNotifications: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        isRead?: boolean;
        type?: string;
        since?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/notifications/",
        params,
      }),
      providesTags: ["Notifications"],
    }),

    createNotification: builder.mutation<
      unknown,
      {
        userId: string;
        type: string;
        title: string;
        message: string;
        metadata?: any;
      }
    >({
      query: (body) => ({
        url: "/tenant/notifications/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Notifications"],
    }),

    getUnreadCount: builder.query<unknown, void>({
      query: () => ({
        url: "/tenant/notifications/unread-count",
        method: "GET",
      }),
      providesTags: ["Notifications"],
    }),

    getNotificationById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/notifications/${id}`,
        method: "GET",
      }),
      providesTags: ["Notifications"],
    }),

    deleteNotification: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsRead: builder.mutation<unknown, void>({
      query: () => ({
        url: "/tenant/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markNotificationRead: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Notifications", id }],
    }),

    // ---------- Tax Rates ----------
    getTaxRates: builder.query<unknown, { isActive?: boolean }>({
      query: (params) => ({
        url: "/tenant/tax-rates/",
        params,
      }),
      providesTags: ["TaxRates"],
    }),

    createTaxRate: builder.mutation<
      unknown,
      {
        name: string;
        rate: number;
        isCompound?: boolean;
        appliesTo?: string[];
        validFrom?: string;
        validTo?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/tax-rates/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TaxRates"],
    }),

    getTaxRateById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "GET",
      }),
      providesTags: ["TaxRates"],
    }),

    updateTaxRate: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        rate?: number;
        isCompound?: boolean;
        appliesTo?: string[];
        validFrom?: string;
        validTo?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "TaxRates", id }],
    }),

    deleteTaxRate: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "TaxRates", id }],
    }),

    // ---------- Expenses ----------
    getExpenses: builder.query<unknown, void>({
      query: () => ({
        url: "/tenant/expenses/",
        method: "GET",
      }),
      providesTags: ["Expenses"],
    }),

    createExpense: builder.mutation<
      unknown,
      {
        categoryId: string;
        amount: number;
        storeId?: string;
        description?: string;
        receiptUrl?: string;
        expenseDate?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/expenses/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Expenses"],
    }),

    getExpenseById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/expenses/${id}`,
        method: "GET",
      }),
      providesTags: ["Expenses"],
    }),

    updateExpense: builder.mutation<
      unknown,
      {
        id: string;
        categoryId?: string;
        amount?: number;
        storeId?: string;
        description?: string;
        receiptUrl?: string;
        expenseDate?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/expenses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Expenses", id }],
    }),

    deleteExpense: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Expenses", id }],
    }),

    // ---------- Cash Registers ----------
    getCashRegisters: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        storeId?: string;
        status?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/cash-registers/",
        params,
      }),
      providesTags: ["CashRegisters"],
    }),

    createCashRegister: builder.mutation<
      unknown,
      {
        storeId: string;
        name: string;
        status?: "OPEN" | "CLOSED" | "SUSPENDED" | "MAINTENANCE";
      }
    >({
      query: (body) => ({
        url: "/tenant/cash-registers/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CashRegisters"],
    }),

    getCashRegisterById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/cash-registers/${id}`,
        method: "GET",
      }),
      providesTags: ["CashRegisters"],
    }),

    updateCashRegister: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        status?: "OPEN" | "CLOSED" | "SUSPENDED" | "MAINTENANCE";
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/cash-registers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "CashRegisters", id },
      ],
    }),

    deleteCashRegister: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/cash-registers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "CashRegisters", id }],
    }),

    // ---------- Gift Cards ----------
    getGiftCards: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        status?: string;
        customerId?: string;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/gift-cards/",
        params,
      }),
      providesTags: ["GiftCards"],
    }),

    createGiftCard: builder.mutation<
      unknown,
      {
        initialAmount: number;
        cardNumber?: string;
        pinCode?: string;
        customerId?: string;
        expiresAt?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/gift-cards/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GiftCards"],
    }),

    lookupGiftCard: builder.query<unknown, string>({
      query: (cardNumber) => ({
        url: `/tenant/gift-cards/lookup/${cardNumber}`,
        method: "GET",
      }),
      providesTags: ["GiftCards"],
    }),

    reloadGiftCard: builder.mutation<unknown, { id: string; amount: number }>({
      query: ({ id, amount }) => ({
        url: `/tenant/gift-cards/${id}/reload`,
        method: "POST",
        body: { amount },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "GiftCards", id }],
    }),

    updateGiftCardStatus: builder.mutation<
      unknown,
      { id: string; status: string }
    >({
      query: ({ id, status }) => ({
        url: `/tenant/gift-cards/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "GiftCards", id }],
    }),

    // ---------- Wallets ----------
    getWallets: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/wallets/",
        params,
      }),
      providesTags: ["Wallets"],
    }),

    getWalletByCustomer: builder.query<unknown, string>({
      query: (customerId) => ({
        url: `/tenant/wallets/customer/${customerId}`,
        method: "GET",
      }),
      providesTags: ["Wallets"],
    }),

    createWalletTransaction: builder.mutation<
      unknown,
      {
        customerId: string;
        amount: number;
        type: string;
        referenceId?: string;
        description?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/wallets/transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Wallets"],
    }),

    // ---------- Supplier Payments ----------
    getSupplierPayments: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        supplierId?: string;
        paymentMethod?: string;
      }
    >({
      query: (params) => ({
        url: "/tenant/supplier-payments/",
        params,
      }),
      providesTags: ["SupplierPayments"],
    }),

    createSupplierPayment: builder.mutation<
      unknown,
      {
        supplierId: string;
        amount: number;
        paymentMethod: string;
        referenceNumber?: string;
        note?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/supplier-payments/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SupplierPayments", "Suppliers"],
    }),

    getSupplierPaymentById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/supplier-payments/${id}`,
        method: "GET",
      }),
      providesTags: ["SupplierPayments"],
    }),

    // ---------- Tenant API Keys ----------
    getTenantApiKeys: builder.query<unknown, void>({
      query: () => ({
        url: "/tenant/api-keys/",
        method: "GET",
      }),
      providesTags: ["ApiKeys"],
    }),

    createTenantApiKey: builder.mutation<
      unknown,
      {
        userId: string;
        name: string;
        permissions?: string[];
        expiresAt?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/api-keys/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ApiKeys"],
    }),

    deleteTenantApiKey: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/api-keys/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ApiKeys"],
    }),

    // ---------- Webhooks ----------
    getWebhooks: builder.query<
      unknown,
      {
        page?: number;
        limit?: number;
        all?: boolean;
      }
    >({
      query: (params) => ({
        url: "/tenant/webhooks/",
        params,
      }),
      providesTags: ["Webhooks"],
    }),

    createWebhook: builder.mutation<
      unknown,
      {
        name: string;
        url: string;
        events: string[];
        secret?: string;
      }
    >({
      query: (body) => ({
        url: "/tenant/webhooks/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Webhooks"],
    }),

    getWebhookById: builder.query<unknown, string>({
      query: (id) => ({
        url: `/tenant/webhooks/${id}`,
        method: "GET",
      }),
      providesTags: ["Webhooks"],
    }),

    updateWebhook: builder.mutation<
      unknown,
      {
        id: string;
        name?: string;
        url?: string;
        events?: string[];
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/tenant/webhooks/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Webhooks", id }],
    }),

    deleteWebhook: builder.mutation<unknown, string>({
      query: (id) => ({
        url: `/tenant/webhooks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Webhooks", id }],
    }),
  }),
});

// ================================================================
// Export all hooks
// ================================================================

export const {
  // Auth
  useRegisterMutation,
  useLoginMutation,
  useVerifyEmailMutation,
  useResendOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetMeQuery,
  useGoogleAuthQuery,
  useGoogleAuthCallbackQuery,
  usePlatformLoginMutation,
  usePlatformGetMeQuery,

  // Sync
  useGetSyncOrdersQuery,
  useGetSyncProductsQuery,
  useGetSyncCustomersQuery,
  useGetSyncInventoryQuery,

  // Dashboard
  useGetDashboardStatsQuery,
  useGetDashboardRevenueQuery,
  useGetDashboardTopProductsQuery,
  useGetPlatformDashboardStatsQuery,
  useGetPlatformDashboardRevenueQuery,
  useGetPlatformDashboardTopProductsQuery,

  // Platform Admin
  useGetPlatformApiKeysQuery,
  useCreatePlatformApiKeyMutation,
  useDeletePlatformApiKeyMutation,
  useGetPlatformTenantsQuery,
  useCreatePlatformTenantMutation,
  useGetPlatformTenantByIdQuery,
  useUpdatePlatformTenantMutation,
  useDeletePlatformTenantMutation,
  useAssignSubscriptionMutation,
  useGetPlatformAuditLogsQuery,
  useCreatePlatformAuditLogMutation,
  useGetPlatformAuditLogByIdQuery,
  useGetPlatformStoreSettingsQuery,
  useCreatePlatformStoreSettingMutation,
  useGetPlatformStoreSettingByIdQuery,
  useDeletePlatformStoreSettingMutation,
  useGetPlatformAccountsQuery,
  useCreatePlatformAccountMutation,
  useGetPlatformAccountByIdQuery,
  useUpdatePlatformAccountMutation,
  useDeletePlatformAccountMutation,
  useGetPlatformJournalEntriesQuery,
  useCreatePlatformJournalEntryMutation,
  useGetPlatformJournalEntryByIdQuery,
  useDeletePlatformJournalEntryMutation,
  usePostPlatformJournalEntryMutation,
  useGetTrialBalanceQuery,

  // Tenant
  useGetTenantProfileQuery,
  useUpdateTenantProfileMutation,

  // Products
  useGetRemoteProductsQuery,
  useGetRemoteProductByIdQuery,
  useGetRemoteProductByBarcodeQuery,
  useCreateRemoteProductMutation,
  useUpdateRemoteProductMutation,
  useDeleteRemoteProductMutation,

  // Categories
  useGetRemoteCategoriesQuery,
  useGetRemoteCategoryByIdQuery,
  useCreateRemoteCategoryMutation,
  useUpdateRemoteCategoryMutation,
  useDeleteRemoteCategoryMutation,

  // Customers
  useGetRemoteCustomersQuery,
  useGetRemoteCustomerByIdQuery,
  useCreateRemoteCustomerMutation,
  useUpdateRemoteCustomerMutation,
  useDeleteRemoteCustomerMutation,

  // Stores
  useGetRemoteStoresQuery,
  useGetRemoteStoreByIdQuery,
  useCreateRemoteStoreMutation,
  useUpdateRemoteStoreMutation,
  useDeleteRemoteStoreMutation,

  // Sessions
  useGetRemoteSessionsQuery,
  useGetRemoteActiveSessionQuery,
  useOpenRemoteSessionMutation,
  useCloseRemoteSessionMutation,

  // Orders
  useGetRemoteOrdersQuery,
  useGetRemoteOrderByIdQuery,
  useCreateRemoteOrderMutation,
  useDeleteRemoteOrderMutation,
  useCompleteRemoteOrderMutation,
  useUpdateRemoteOrderStatusMutation,

  // Inventory
  useGetRemoteInventoryQuery,

  // Inventory Movements
  useGetRemoteInventoryMovementsQuery,
  useCreateRemoteInventoryMovementMutation,

  // Inventory Counts
  useGetRemoteInventoryCountsQuery,
  useCreateRemoteInventoryCountMutation,

  // Staff
  useGetRemoteStaffQuery,
  useGetRemoteStaffByIdQuery,
  useCreateRemoteStaffMutation,
  useUpdateRemoteStaffMutation,
  useDeleteRemoteStaffMutation,

  // Suppliers
  useGetRemoteSuppliersQuery,
  useGetRemoteSupplierByIdQuery,
  useCreateRemoteSupplierMutation,
  useUpdateRemoteSupplierMutation,
  useDeleteRemoteSupplierMutation,

  // Brands
  useGetRemoteBrandsQuery,
  useGetRemoteBrandByIdQuery,
  useCreateRemoteBrandMutation,
  useUpdateRemoteBrandMutation,
  useDeleteRemoteBrandMutation,

  // Price History
  useGetRemotePriceHistoryQuery,
  useCreateRemotePriceHistoryMutation,

  // Product Variants
  useGetRemoteProductVariantsQuery,
  useCreateRemoteProductVariantMutation,
  useUpdateRemoteProductVariantMutation,
  useDeleteRemoteProductVariantMutation,

  // Store-specific
  useGetStoreProductsQuery,
  useGetStoreProductQuery,
  useGetStoreCategoriesQuery,
  useGetStoreOrdersQuery,
  useGetStoreCustomersQuery,
  useGetStoreBrandsQuery,
  useGetStoreSuppliersQuery,

  // Payments
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useGetPaymentByIdQuery,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,

  // Returns
  useGetReturnsQuery,
  useCreateReturnMutation,
  useGetReturnByIdQuery,
  useDeleteReturnMutation,

  // Purchase Orders
  useGetPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrderByIdQuery,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,

  // Stock Transfers
  useGetStockTransfersQuery,
  useCreateStockTransferMutation,
  useGetStockTransferByIdQuery,
  useDeleteStockTransferMutation,
  useCompleteStockTransferMutation,

  // Promotions
  useGetPromotionsQuery,
  useCreatePromotionMutation,
  useGetPromotionByIdQuery,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,

  // Store Settings (tenant)
  useGetTenantStoreSettingsQuery,
  useCreateTenantStoreSettingMutation,
  useGetTenantStoreSettingByIdQuery,
  useDeleteTenantStoreSettingMutation,

  // Notifications
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useGetUnreadCountQuery,
  useGetNotificationByIdQuery,
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,

  // Tax Rates
  useGetTaxRatesQuery,
  useCreateTaxRateMutation,
  useGetTaxRateByIdQuery,
  useUpdateTaxRateMutation,
  useDeleteTaxRateMutation,

  // Expenses
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useGetExpenseByIdQuery,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,

  // Cash Registers
  useGetCashRegistersQuery,
  useCreateCashRegisterMutation,
  useGetCashRegisterByIdQuery,
  useUpdateCashRegisterMutation,
  useDeleteCashRegisterMutation,

  // Gift Cards
  useGetGiftCardsQuery,
  useCreateGiftCardMutation,
  useLookupGiftCardQuery,
  useReloadGiftCardMutation,
  useUpdateGiftCardStatusMutation,

  // Wallets
  useGetWalletsQuery,
  useGetWalletByCustomerQuery,
  useCreateWalletTransactionMutation,

  // Supplier Payments
  useGetSupplierPaymentsQuery,
  useCreateSupplierPaymentMutation,
  useGetSupplierPaymentByIdQuery,

  // Tenant API Keys
  useGetTenantApiKeysQuery,
  useCreateTenantApiKeyMutation,
  useDeleteTenantApiKeyMutation,

  // Webhooks
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useGetWebhookByIdQuery,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
} = remoteApi;
