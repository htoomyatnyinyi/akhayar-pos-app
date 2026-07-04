// services/api/remoteApi.ts
import { posApi } from "./posApi";

export const remoteApi = posApi.injectEndpoints({
  overrideExisting: true, //  true လို့ ပြောင်းပေးလိုက်ပါ
  endpoints: (builder) => ({
    // ============================================
    // 1. AUTH (Platform & Tenant)
    // ============================================
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
    }),

    verifyEmail: builder.mutation({
      query: ({ code }) => ({
        url: "/auth/verify-email",
        method: "POST",
        body: { code },
      }),
    }),

    resendOTP: builder.mutation({
      query: () => ({
        url: "/auth/resend-otp",
        method: "POST",
      }),
    }),

    forgotPassword: builder.mutation({
      query: ({ email }) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: { email },
      }),
    }),

    resetPassword: builder.mutation({
      query: ({ email, code, newPassword }) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: { email, code, newPassword },
      }),
    }),

    getMe: builder.query({
      query: () => "/auth/me",
      providesTags: ["Auth"],
    }),

    platformLogin: builder.mutation({
      query: (credentials) => ({
        url: "/platform/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),

    getPlatformMe: builder.query({
      query: () => "/platform/auth/me",
      providesTags: ["Auth"],
    }),

    // ============================================
    // 2. PRODUCTS
    // ============================================
    getRemoteProducts: builder.query({
      query: (params) => ({
        url: "/tenant/products/",
        params,
      }),
      providesTags: ["Products"],
    }),

    getRemoteProductById: builder.query({
      query: (id) => `/tenant/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Products", id }],
    }),

    getRemoteProductByBarcode: builder.query({
      query: (barcode) => `/tenant/products/barcode/${barcode}`,
      providesTags: ["Products"],
    }),

    createRemoteProduct: builder.mutation({
      query: (product) => ({
        url: "/tenant/products/",
        method: "POST",
        body: product,
      }),
      invalidatesTags: ["Products", "Inventory"],
    }),

    updateRemoteProduct: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/products/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Products", id }],
    }),

    deleteRemoteProduct: builder.mutation({
      query: (id) => ({
        url: `/tenant/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),

    // ============================================
    // 3. CATEGORIES
    // ============================================
    getRemoteCategories: builder.query({
      query: (params) => ({
        url: "/tenant/categories/",
        params,
      }),
      providesTags: ["Categories"],
    }),

    getRemoteCategoryById: builder.query({
      query: (id) => `/tenant/categories/${id}`,
      providesTags: (result, error, id) => [{ type: "Categories", id }],
    }),

    createRemoteCategory: builder.mutation({
      query: (category) => ({
        url: "/tenant/categories/",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["Categories"],
    }),

    updateRemoteCategory: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/categories/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Categories", id }],
    }),

    deleteRemoteCategory: builder.mutation({
      query: (id) => ({
        url: `/tenant/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),

    // ============================================
    // 4. CUSTOMERS
    // ============================================
    getRemoteCustomers: builder.query({
      query: (params) => ({
        url: "/tenant/customers/",
        params,
      }),
      providesTags: ["Customers"],
    }),

    getRemoteCustomerById: builder.query({
      query: (id) => `/tenant/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customers", id }],
    }),

    createRemoteCustomer: builder.mutation({
      query: (customer) => ({
        url: "/tenant/customers/",
        method: "POST",
        body: customer,
      }),
      invalidatesTags: ["Customers"],
    }),

    updateRemoteCustomer: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/customers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Customers", id }],
    }),

    deleteRemoteCustomer: builder.mutation({
      query: (id) => ({
        url: `/tenant/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),

    // ============================================
    // 5. ORDERS
    // ============================================
    getRemoteOrders: builder.query({
      query: (params) => ({
        url: "/tenant/orders/",
        params,
      }),
      providesTags: ["Orders"],
    }),

    getRemoteOrderById: builder.query({
      query: (id) => `/tenant/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "Orders", id }],
    }),

    createRemoteOrder: builder.mutation({
      query: (order) => ({
        url: "/tenant/orders/",
        method: "POST",
        body: order,
      }),
      invalidatesTags: ["Orders", "Inventory"],
    }),

    deleteRemoteOrder: builder.mutation({
      query: (id) => ({
        url: `/tenant/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders"],
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/tenant/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
    }),

    // ============================================
    // 6. SESSIONS
    // ============================================
    getRemoteSessions: builder.query({
      query: (params) => ({
        url: "/tenant/sessions/",
        params,
      }),
      providesTags: ["Sessions"],
    }),

    createRemoteSession: builder.mutation({
      query: (body) => ({
        url: "/tenant/sessions/open",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),

    closeRemoteSession: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tenant/sessions/${id}/close`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    getRemoteSessionById: builder.query({
      query: (id) => `/tenant/sessions/${id}`,
      providesTags: (result, error, id) => [{ type: "Sessions", id }],
    }),

    getActiveSession: builder.query({
      query: ({ userId, storeId }) => ({
        url: `/tenant/sessions/active/${userId}`,
        params: { storeId },
      }),
      providesTags: ["Sessions"],
    }),

    openSession: builder.mutation({
      query: (data) => ({
        url: "/tenant/sessions/open",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    closeSession: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tenant/sessions/${id}/close`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    // ============================================
    // 7. INVENTORY
    // ============================================
    getRemoteInventory: builder.query({
      query: (params) => ({
        url: "/tenant/inventory/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    getInventoryMovements: builder.query({
      query: (params) => ({
        url: "/tenant/inventory/movements/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    createInventoryMovement: builder.mutation({
      query: (movement) => ({
        url: "/tenant/inventory/movements/",
        method: "POST",
        body: movement,
      }),
      invalidatesTags: ["Inventory"],
    }),

    getInventoryCounts: builder.query({
      query: (params) => ({
        url: "/tenant/inventory/counts/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    createInventoryCount: builder.mutation({
      query: (count) => ({
        url: "/tenant/inventory/counts/",
        method: "POST",
        body: count,
      }),
      invalidatesTags: ["Inventory"],
    }),

    // ============================================
    // 8. STORES
    // ============================================
    getRemoteStores: builder.query({
      query: () => "/tenant/stores/",
      providesTags: ["Stores"],
    }),

    getRemoteStoreById: builder.query({
      query: (id) => `/tenant/stores/${id}`,
      providesTags: (result, error, id) => [{ type: "Stores", id }],
    }),

    createRemoteStore: builder.mutation({
      query: (store) => ({
        url: "/tenant/stores/",
        method: "POST",
        body: store,
      }),
      invalidatesTags: ["Stores"],
    }),

    updateRemoteStore: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/stores/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Stores", id }],
    }),

    deleteRemoteStore: builder.mutation({
      query: (id) => ({
        url: `/tenant/stores/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stores"],
    }),

    // ============================================
    // 9. STAFF
    // ============================================
    getRemoteStaff: builder.query({
      query: (params) => ({
        url: "/tenant/staff/",
        params,
      }),
      providesTags: ["Staff"],
    }),

    getRemoteStaffById: builder.query({
      query: (id) => `/tenant/staff/${id}`,
      providesTags: (result, error, id) => [{ type: "Staff", id }],
    }),

    createRemoteStaff: builder.mutation({
      query: (staff) => ({
        url: "/tenant/staff/",
        method: "POST",
        body: staff,
      }),
      invalidatesTags: ["Staff"],
    }),

    updateRemoteStaff: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/staff/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Staff", id }],
    }),

    deleteRemoteStaff: builder.mutation({
      query: (id) => ({
        url: `/tenant/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Staff"],
    }),

    // ============================================
    // 10. PAYMENTS
    // ============================================
    getPayments: builder.query({
      query: () => "/tenant/payments/",
      providesTags: ["Orders"],
    }),

    createPayment: builder.mutation({
      query: (payment) => ({
        url: "/tenant/payments/",
        method: "POST",
        body: payment,
      }),
      invalidatesTags: ["Orders"],
    }),

    updatePayment: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/payments/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Orders"],
    }),

    deletePayment: builder.mutation({
      query: (id) => ({
        url: `/tenant/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders"],
    }),

    // ============================================
    // 11. RETURNS
    // ============================================
    getReturns: builder.query({
      query: (params) => ({
        url: "/tenant/returns/",
        params,
      }),
      providesTags: ["Orders"],
    }),

    createReturn: builder.mutation({
      query: (returnData) => ({
        url: "/tenant/returns/",
        method: "POST",
        body: returnData,
      }),
      invalidatesTags: ["Orders", "Inventory"],
    }),

    deleteReturn: builder.mutation({
      query: (id) => ({
        url: `/tenant/returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders"],
    }),

    // ============================================
    // 12. PURCHASE ORDERS
    // ============================================
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: "/tenant/purchase-orders/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    createPurchaseOrder: builder.mutation({
      query: (purchaseOrder) => ({
        url: "/tenant/purchase-orders/",
        method: "POST",
        body: purchaseOrder,
      }),
      invalidatesTags: ["Inventory"],
    }),

    updatePurchaseOrder: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Inventory"],
    }),

    deletePurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),

    receivePurchaseOrder: builder.mutation({
      query: ({ id, storeId }) => ({
        url: `/tenant/purchase-orders/${id}/receive`,
        method: "POST",
        body: { storeId },
      }),
      invalidatesTags: ["Inventory"],
    }),

    // ============================================
    // 13. STOCK TRANSFERS
    // ============================================
    getStockTransfers: builder.query({
      query: (params) => ({
        url: "/tenant/stock-transfers/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    createStockTransfer: builder.mutation({
      query: (transfer) => ({
        url: "/tenant/stock-transfers/",
        method: "POST",
        body: transfer,
      }),
      invalidatesTags: ["Inventory"],
    }),

    deleteStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),

    completeStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: ["Inventory"],
    }),

    // ============================================
    // 14. SUPPLIERS
    // ============================================
    getSuppliers: builder.query({
      query: (params) => ({
        url: "/tenant/suppliers/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    createSupplier: builder.mutation({
      query: (supplier) => ({
        url: "/tenant/suppliers/",
        method: "POST",
        body: supplier,
      }),
      invalidatesTags: ["Inventory"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/suppliers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Inventory"],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/tenant/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory"],
    }),

    // ============================================
    // 15. PROMOTIONS
    // ============================================
    getPromotions: builder.query({
      query: (params) => ({
        url: "/tenant/promotions/",
        params,
      }),
      providesTags: ["Products"],
    }),

    createPromotion: builder.mutation({
      query: (promotion) => ({
        url: "/tenant/promotions/",
        method: "POST",
        body: promotion,
      }),
      invalidatesTags: ["Products"],
    }),

    updatePromotion: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/promotions/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Products"],
    }),

    deletePromotion: builder.mutation({
      query: (id) => ({
        url: `/tenant/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),

    // ============================================
    // 16. STORE SETTINGS
    // ============================================
    getStoreSettings: builder.query({
      query: (params) => ({
        url: "/tenant/store-settings/",
        params,
      }),
      providesTags: ["Stores"],
    }),

    createStoreSetting: builder.mutation({
      query: (setting) => ({
        url: "/tenant/store-settings/",
        method: "POST",
        body: setting,
      }),
      invalidatesTags: ["Stores"],
    }),

    deleteStoreSetting: builder.mutation({
      query: (id) => ({
        url: `/tenant/store-settings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stores"],
    }),

    // ============================================
    // 17. NOTIFICATIONS
    // ============================================
    getNotifications: builder.query({
      query: (params) => ({
        url: "/tenant/notifications/",
        params,
      }),
      providesTags: ["Staff"],
    }),

    getUnreadCount: builder.query({
      query: () => "/tenant/notifications/unread-count",
      providesTags: ["Staff"],
    }),

    markAllRead: builder.mutation({
      query: () => ({
        url: "/tenant/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Staff"],
    }),

    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/tenant/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Staff"],
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/tenant/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Staff"],
    }),

    // ============================================
    // 18. TAX RATES
    // ============================================
    getTaxRates: builder.query({
      query: (params) => ({
        url: "/tenant/tax-rates/",
        params,
      }),
      providesTags: ["Products"],
    }),

    createTaxRate: builder.mutation({
      query: (taxRate) => ({
        url: "/tenant/tax-rates/",
        method: "POST",
        body: taxRate,
      }),
      invalidatesTags: ["Products"],
    }),

    updateTaxRate: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Products"],
    }),

    deleteTaxRate: builder.mutation({
      query: (id) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),
  }),
  overrideExisting: false,
});

export const { endpoints: remoteEndpoints } = remoteApi;
