// ============================================
// FILE: services/api/remoteApi.ts
// ============================================

import { posApi } from "./posApi";

export const remoteApi = posApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // ============================================
    // 1. AUTH (Platform-specific only)
    // ============================================

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

    getRemoteProductBySku: builder.query({
      query: (sku) => `/tenant/products/sku/${sku}`,
      providesTags: ["Products"],
    }),

    createRemoteProduct: builder.mutation({
      query: (product) => ({
        url: "/tenant/products/",
        method: "POST",
        body: product,
      }),
      invalidatesTags: ["Products", "Inventory", "ProductVariants"],
    }),

    updateRemoteProduct: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/products/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Products", id },
        "Products",
        "Inventory",
      ],
    }),

    deleteRemoteProduct: builder.mutation({
      query: (id) => ({
        url: `/tenant/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products", "Inventory", "ProductVariants"],
    }),

    // ============================================
    // 3. PRODUCT VARIANTS
    // ============================================
    getRemoteProductVariants: builder.query({
      query: (params) => ({
        url: "/tenant/products/variants/",
        params,
      }),
      providesTags: ["ProductVariants"],
    }),

    getRemoteProductVariantById: builder.query({
      query: (id) => `/tenant/products/variants/${id}`,
      providesTags: (result, error, id) => [{ type: "ProductVariants", id }],
    }),

    getRemoteProductVariantByBarcode: builder.query({
      query: (barcode) => `/tenant/products/variants/barcode/${barcode}`,
      providesTags: ["ProductVariants"],
    }),

    getRemoteProductVariantsByProduct: builder.query({
      query: (productId) => `/tenant/products/${productId}/variants`,
      providesTags: ["ProductVariants"],
    }),

    createRemoteProductVariant: builder.mutation({
      query: (variant) => ({
        url: "/tenant/products/variants/",
        method: "POST",
        body: variant,
      }),
      invalidatesTags: ["ProductVariants", "Products", "Inventory"],
    }),

    updateRemoteProductVariant: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/products/variants/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ProductVariants", id },
        "ProductVariants",
        "Products",
      ],
    }),

    deleteRemoteProductVariant: builder.mutation({
      query: (id) => ({
        url: `/tenant/products/variants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductVariants", "Products", "Inventory"],
    }),

    // ============================================
    // 4. CATEGORIES
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

    getRemoteCategoryBySlug: builder.query({
      query: (slug) => `/tenant/categories/slug/${slug}`,
      providesTags: ["Categories"],
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
      invalidatesTags: ["Categories", "Products"],
    }),

    // ============================================
    // 5. CUSTOMERS
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

    getRemoteCustomerByPhone: builder.query({
      query: (phone) => `/tenant/customers/phone/${phone}`,
      providesTags: ["Customers"],
    }),

    getRemoteCustomerByCode: builder.query({
      query: (code) => `/tenant/customers/code/${code}`,
      providesTags: ["Customers"],
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
    // 6. ORDERS
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

    getRemoteOrderByNumber: builder.query({
      query: (orderNumber) => `/tenant/orders/number/${orderNumber}`,
      providesTags: ["Orders"],
    }),

    getRemoteOrdersByCustomer: builder.query({
      query: (customerId) => `/tenant/orders/customer/${customerId}`,
      providesTags: ["Orders"],
    }),

    getRemoteOrdersBySession: builder.query({
      query: (sessionId) => `/tenant/orders/session/${sessionId}`,
      providesTags: ["Orders"],
    }),

    createRemoteOrder: builder.mutation({
      query: (order) => ({
        url: "/tenant/orders/",
        method: "POST",
        body: order,
      }),
      invalidatesTags: ["Orders", "Inventory", "Customers"],
    }),

    updateRemoteOrder: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/orders/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
    }),

    deleteRemoteOrder: builder.mutation({
      query: (id) => ({
        url: `/tenant/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders", "Inventory"],
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/tenant/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
    }),

    voidOrder: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/tenant/orders/${id}/void`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Orders", id },
        "Inventory",
      ],
    }),

    refundOrder: builder.mutation({
      query: ({ id, items, reason }) => ({
        url: `/tenant/orders/${id}/refund`,
        method: "POST",
        body: { items, reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Orders", id },
        "Inventory",
      ],
    }),

    // ============================================
    // 7. SESSIONS
    // ============================================
    getRemoteSessions: builder.query({
      query: (params) => ({
        url: "/tenant/sessions/",
        params,
      }),
      providesTags: ["Sessions"],
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

    createRemoteSession: builder.mutation({
      query: (body) => ({
        url: "/tenant/sessions/open",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sessions"],
    }),

    openSession: builder.mutation({
      query: (data) => ({
        url: "/tenant/sessions/open",
        method: "POST",
        body: data,
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

    closeSession: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/tenant/sessions/${id}/close`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    suspendSession: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/tenant/sessions/${id}/suspend`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Sessions"],
    }),

    resumeSession: builder.mutation({
      query: (id) => ({
        url: `/tenant/sessions/${id}/resume`,
        method: "POST",
      }),
      invalidatesTags: ["Sessions"],
    }),

    // ============================================
    // 8. INVENTORY
    // ============================================
    getRemoteInventory: builder.query({
      query: (params) => ({
        url: "/tenant/inventory/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    getRemoteInventoryByProduct: builder.query({
      query: ({ productId, storeId }) => ({
        url: `/tenant/inventory/product/${productId}`,
        params: { storeId },
      }),
      providesTags: ["Inventory"],
    }),

    getRemoteInventoryByVariant: builder.query({
      query: ({ variantId, storeId }) => ({
        url: `/tenant/inventory/variant/${variantId}`,
        params: { storeId },
      }),
      providesTags: ["Inventory"],
    }),

    getRemoteInventoryByStore: builder.query({
      query: (storeId) => `/tenant/inventory/store/${storeId}`,
      providesTags: ["Inventory"],
    }),

    upsertRemoteInventory: builder.mutation({
      query: (inventory) => ({
        url: "/tenant/inventory/",
        method: "POST",
        body: inventory,
      }),
      invalidatesTags: ["Inventory", "Products"],
    }),

    updateRemoteInventory: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/inventory/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Inventory", id },
        "Inventory",
      ],
    }),

    adjustInventory: builder.mutation({
      query: ({ id, quantity, reason }) => ({
        url: `/tenant/inventory/${id}/adjust`,
        method: "POST",
        body: { quantity, reason },
      }),
      invalidatesTags: ["Inventory", "Products"],
    }),

    // ============================================
    // 9. INVENTORY MOVEMENTS
    // ============================================
    getInventoryMovements: builder.query({
      query: (params) => ({
        url: "/tenant/inventory/movements/",
        params,
      }),
      providesTags: ["InventoryMovements"],
    }),

    getInventoryMovementsByProduct: builder.query({
      query: (productId) => `/tenant/inventory/movements/product/${productId}`,
      providesTags: ["InventoryMovements"],
    }),

    getInventoryMovementsByVariant: builder.query({
      query: (variantId) => `/tenant/inventory/movements/variant/${variantId}`,
      providesTags: ["InventoryMovements"],
    }),

    createRemoteInventoryMovement: builder.mutation({
      query: (movement) => ({
        url: "/tenant/inventory/movements/",
        method: "POST",
        body: movement,
      }),
      invalidatesTags: ["InventoryMovements", "Inventory"],
    }),

    // ============================================
    // 10. INVENTORY COUNTS
    // ============================================
    getInventoryCounts: builder.query({
      query: (params) => ({
        url: "/tenant/inventory/counts/",
        params,
      }),
      providesTags: ["InventoryCounts"],
    }),

    getInventoryCountById: builder.query({
      query: (id) => `/tenant/inventory/counts/${id}`,
      providesTags: (result, error, id) => [{ type: "InventoryCounts", id }],
    }),

    createRemoteInventoryCount: builder.mutation({
      query: (count) => ({
        url: "/tenant/inventory/counts/",
        method: "POST",
        body: count,
      }),
      invalidatesTags: ["InventoryCounts", "Inventory"],
    }),

    completeInventoryCount: builder.mutation({
      query: ({ id, items }) => ({
        url: `/tenant/inventory/counts/${id}/complete`,
        method: "POST",
        body: { items },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "InventoryCounts", id },
        "Inventory",
      ],
    }),

    cancelInventoryCount: builder.mutation({
      query: (id) => ({
        url: `/tenant/inventory/counts/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [{ type: "InventoryCounts", id }],
    }),

    // ============================================
    // 11. PRICE HISTORY
    // ============================================
    getRemotePriceHistory: builder.query({
      query: (params) => ({
        url: "/tenant/price-history/",
        params,
      }),
      providesTags: ["PriceHistory"],
    }),

    getRemotePriceHistoryByProduct: builder.query({
      query: (productId) => `/tenant/price-history/product/${productId}`,
      providesTags: ["PriceHistory"],
    }),

    getRemotePriceHistoryByVariant: builder.query({
      query: (variantId) => `/tenant/price-history/variant/${variantId}`,
      providesTags: ["PriceHistory"],
    }),

    createRemotePriceHistory: builder.mutation({
      query: (priceHistory) => ({
        url: "/tenant/price-history/",
        method: "POST",
        body: priceHistory,
      }),
      invalidatesTags: ["PriceHistory", "Products", "ProductVariants"],
    }),

    // ============================================
    // 12. STORES
    // ============================================
    getRemoteStores: builder.query({
      query: () => "/tenant/stores/",
      providesTags: ["Stores"],
    }),

    getRemoteStoreById: builder.query({
      query: (id) => `/tenant/stores/${id}`,
      providesTags: (result, error, id) => [{ type: "Stores", id }],
    }),

    getRemoteStoreByCode: builder.query({
      query: (code) => `/tenant/stores/code/${code}`,
      providesTags: ["Stores"],
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
      invalidatesTags: ["Stores", "Inventory"],
    }),

    // ============================================
    // 13. STAFF
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
    // 14. PAYMENTS
    // ============================================
    getPayments: builder.query({
      query: (params) => ({
        url: "/tenant/payments/",
        params,
      }),
      providesTags: ["Payments"],
    }),

    getPaymentById: builder.query({
      query: (id) => `/tenant/payments/${id}`,
      providesTags: (result, error, id) => [{ type: "Payments", id }],
    }),

    getPaymentsByOrder: builder.query({
      query: (orderId) => `/tenant/payments/order/${orderId}`,
      providesTags: ["Payments"],
    }),

    createPayment: builder.mutation({
      query: (payment) => ({
        url: "/tenant/payments/",
        method: "POST",
        body: payment,
      }),
      invalidatesTags: ["Payments", "Orders"],
    }),

    updatePayment: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/payments/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Payments", id }],
    }),

    deletePayment: builder.mutation({
      query: (id) => ({
        url: `/tenant/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Payments", "Orders"],
    }),

    // ============================================
    // 15. RETURNS
    // ============================================
    getReturns: builder.query({
      query: (params) => ({
        url: "/tenant/returns/",
        params,
      }),
      providesTags: ["Returns"],
    }),

    getReturnById: builder.query({
      query: (id) => `/tenant/returns/${id}`,
      providesTags: (result, error, id) => [{ type: "Returns", id }],
    }),

    getReturnsByOrder: builder.query({
      query: (orderId) => `/tenant/returns/order/${orderId}`,
      providesTags: ["Returns"],
    }),

    createReturn: builder.mutation({
      query: (returnData) => ({
        url: "/tenant/returns/",
        method: "POST",
        body: returnData,
      }),
      invalidatesTags: ["Returns", "Orders", "Inventory"],
    }),

    updateReturn: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/returns/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Returns", id }],
    }),

    deleteReturn: builder.mutation({
      query: (id) => ({
        url: `/tenant/returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Returns", "Orders"],
    }),

    approveReturn: builder.mutation({
      query: ({ id, approve }) => ({
        url: `/tenant/returns/${id}/approve`,
        method: "POST",
        body: { approve },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Returns", id },
        "Inventory",
      ],
    }),

    // ============================================
    // 16. PURCHASE ORDERS
    // ============================================
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: "/tenant/purchase-orders/",
        params,
      }),
      providesTags: ["PurchaseOrders"],
    }),

    getPurchaseOrderById: builder.query({
      query: (id) => `/tenant/purchase-orders/${id}`,
      providesTags: (result, error, id) => [{ type: "PurchaseOrders", id }],
    }),

    createPurchaseOrder: builder.mutation({
      query: (purchaseOrder) => ({
        url: "/tenant/purchase-orders/",
        method: "POST",
        body: purchaseOrder,
      }),
      invalidatesTags: ["PurchaseOrders", "Inventory"],
    }),

    updatePurchaseOrder: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrders", id },
      ],
    }),

    deletePurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/tenant/purchase-orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PurchaseOrders", "Inventory"],
    }),

    receivePurchaseOrder: builder.mutation({
      query: ({ id, storeId, items }) => ({
        url: `/tenant/purchase-orders/${id}/receive`,
        method: "POST",
        body: { storeId, items },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrders", id },
        "Inventory",
      ],
    }),

    // ============================================
    // 17. STOCK TRANSFERS
    // ============================================
    getStockTransfers: builder.query({
      query: (params) => ({
        url: "/tenant/stock-transfers/",
        params,
      }),
      providesTags: ["StockTransfers"],
    }),

    getStockTransferById: builder.query({
      query: (id) => `/tenant/stock-transfers/${id}`,
      providesTags: (result, error, id) => [{ type: "StockTransfers", id }],
    }),

    createStockTransfer: builder.mutation({
      query: (transfer) => ({
        url: "/tenant/stock-transfers/",
        method: "POST",
        body: transfer,
      }),
      invalidatesTags: ["StockTransfers", "Inventory"],
    }),

    updateStockTransfer: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/stock-transfers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "StockTransfers", id },
      ],
    }),

    deleteStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StockTransfers", "Inventory"],
    }),

    completeStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/tenant/stock-transfers/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "StockTransfers", id },
        "Inventory",
      ],
    }),

    // ============================================
    // 18. SUPPLIERS
    // ============================================
    getSuppliers: builder.query({
      query: (params) => ({
        url: "/tenant/suppliers/",
        params,
      }),
      providesTags: ["Suppliers"],
    }),

    getSupplierById: builder.query({
      query: (id) => `/tenant/suppliers/${id}`,
      providesTags: (result, error, id) => [{ type: "Suppliers", id }],
    }),

    createSupplier: builder.mutation({
      query: (supplier) => ({
        url: "/tenant/suppliers/",
        method: "POST",
        body: supplier,
      }),
      invalidatesTags: ["Suppliers"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/suppliers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Suppliers", id }],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/tenant/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Suppliers", "Products"],
    }),

    // ============================================
    // 19. PROMOTIONS
    // ============================================
    getPromotions: builder.query({
      query: (params) => ({
        url: "/tenant/promotions/",
        params,
      }),
      providesTags: ["Promotions"],
    }),

    getPromotionById: builder.query({
      query: (id) => `/tenant/promotions/${id}`,
      providesTags: (result, error, id) => [{ type: "Promotions", id }],
    }),

    createPromotion: builder.mutation({
      query: (promotion) => ({
        url: "/tenant/promotions/",
        method: "POST",
        body: promotion,
      }),
      invalidatesTags: ["Promotions", "Products"],
    }),

    updatePromotion: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/promotions/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Promotions", id }],
    }),

    deletePromotion: builder.mutation({
      query: (id) => ({
        url: `/tenant/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Promotions", "Products"],
    }),

    // ============================================
    // 20. STORE SETTINGS
    // ============================================
    getStoreSettings: builder.query({
      query: (params) => ({
        url: "/tenant/store-settings/",
        params,
      }),
      providesTags: ["StoreSettings"],
    }),

    getStoreSettingById: builder.query({
      query: (id) => `/tenant/store-settings/${id}`,
      providesTags: (result, error, id) => [{ type: "StoreSettings", id }],
    }),

    createStoreSetting: builder.mutation({
      query: (setting) => ({
        url: "/tenant/store-settings/",
        method: "POST",
        body: setting,
      }),
      invalidatesTags: ["StoreSettings", "Stores"],
    }),

    updateStoreSetting: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/store-settings/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "StoreSettings", id },
      ],
    }),

    deleteStoreSetting: builder.mutation({
      query: (id) => ({
        url: `/tenant/store-settings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StoreSettings", "Stores"],
    }),

    // ============================================
    // 21. NOTIFICATIONS
    // ============================================
    getNotifications: builder.query({
      query: (params) => ({
        url: "/tenant/notifications/",
        params,
      }),
      providesTags: ["Notifications"],
    }),

    getUnreadCount: builder.query({
      query: () => "/tenant/notifications/unread-count",
      providesTags: ["Notifications"],
    }),

    markAllRead: builder.mutation({
      query: () => ({
        url: "/tenant/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/tenant/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Notifications", id }],
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/tenant/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),

    // ============================================
    // 22. TAX RATES
    // ============================================
    getTaxRates: builder.query({
      query: (params) => ({
        url: "/tenant/tax-rates/",
        params,
      }),
      providesTags: ["TaxRates"],
    }),

    getTaxRateById: builder.query({
      query: (id) => `/tenant/tax-rates/${id}`,
      providesTags: (result, error, id) => [{ type: "TaxRates", id }],
    }),

    createTaxRate: builder.mutation({
      query: (taxRate) => ({
        url: "/tenant/tax-rates/",
        method: "POST",
        body: taxRate,
      }),
      invalidatesTags: ["TaxRates", "Products"],
    }),

    updateTaxRate: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "TaxRates", id }],
    }),

    deleteTaxRate: builder.mutation({
      query: (id) => ({
        url: `/tenant/tax-rates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TaxRates", "Products"],
    }),

    // ============================================
    // 23. DASHBOARD / STATISTICS
    // ============================================
    getDashboardStats: builder.query({
      query: (params) => ({
        url: "/tenant/dashboard/stats",
        params,
      }),
      providesTags: ["Dashboard"],
    }),

    getSalesStats: builder.query({
      query: (params) => ({
        url: "/tenant/dashboard/sales",
        params,
      }),
      providesTags: ["Dashboard"],
    }),

    getInventoryStats: builder.query({
      query: (params) => ({
        url: "/tenant/dashboard/inventory",
        params,
      }),
      providesTags: ["Dashboard"],
    }),

    // ============================================
    // 24. REPORTS
    // ============================================
    getSalesReport: builder.query({
      query: (params) => ({
        url: "/tenant/reports/sales",
        params,
      }),
      providesTags: ["Reports"],
    }),

    getInventoryReport: builder.query({
      query: (params) => ({
        url: "/tenant/reports/inventory",
        params,
      }),
      providesTags: ["Reports"],
    }),

    getTaxReport: builder.query({
      query: (params) => ({
        url: "/tenant/reports/tax",
        params,
      }),
      providesTags: ["Reports"],
    }),

    getCustomerReport: builder.query({
      query: (params) => ({
        url: "/tenant/reports/customers",
        params,
      }),
      providesTags: ["Reports"],
    }),
  }),
});

export const { endpoints: remoteEndpoints } = remoteApi;

// // services/api/remoteApi.ts
// import { posApi } from "./posApi";

// export const remoteApi = posApi.injectEndpoints({
//   overrideExisting: true,
//   endpoints: (builder) => ({
//     // ============================================
//     // 1. AUTH (Platform-specific only)
//     // NOTE: login, register, verifyEmail, forgotPassword,
//     // resetPassword, resendOtp are defined in authApi.ts
//     // ============================================

//     /*
//         login: builder.mutation({
//       query: (credentials) => ({
//         url: "/auth/login",
//         method: "POST",
//         body: credentials,
//       }),
//       invalidatesTags: ["Auth"],
//     }),

//     register: builder.mutation({
//       query: (userData) => ({
//         url: "/auth/register",
//         method: "POST",
//         body: userData,
//       }),
//     }),

//     verifyEmail: builder.mutation({
//       query: ({ code }) => ({
//         url: "/auth/verify-email",
//         method: "POST",
//         body: { code },
//       }),
//     }),

//     resendOTP: builder.mutation({
//       query: () => ({
//         url: "/auth/resend-otp",
//         method: "POST",
//       }),
//     }),

//     forgotPassword: builder.mutation({
//       query: ({ email }) => ({
//         url: "/auth/forgot-password",
//         method: "POST",
//         body: { email },
//       }),
//     }),

//     resetPassword: builder.mutation({
//       query: ({ email, code, newPassword }) => ({
//         url: "/auth/reset-password",
//         method: "POST",
//         body: { email, code, newPassword },
//       }),
//     }),

//     */
//     getMe: builder.query({
//       query: () => "/auth/me",
//       providesTags: ["Auth"],
//     }),

//     platformLogin: builder.mutation({
//       query: (credentials) => ({
//         url: "/platform/auth/login",
//         method: "POST",
//         body: credentials,
//       }),
//     }),

//     getPlatformMe: builder.query({
//       query: () => "/platform/auth/me",
//       providesTags: ["Auth"],
//     }),

//     // ============================================
//     // 2. PRODUCTS
//     // ============================================
//     getRemoteProducts: builder.query({
//       query: (params) => ({
//         url: "/tenant/products/",
//         params,
//       }),
//       providesTags: ["Products"],
//     }),

//     getRemoteProductById: builder.query({
//       query: (id) => `/tenant/products/${id}`,
//       providesTags: (result, error, id) => [{ type: "Products", id }],
//     }),

//     // getRemoteProductByBarcode: builder.query({
//     //   query: (barcode) => `/tenant/products/barcode/${barcode}`,
//     //   providesTags: ["Products"],
//     // }),

//     createRemoteProduct: builder.mutation({
//       query: (product) => ({
//         url: "/tenant/products/",
//         method: "POST",
//         body: product,
//       }),
//       invalidatesTags: ["Products", "Inventory"],
//     }),

//     updateRemoteProduct: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/products/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Products", id }],
//     }),

//     deleteRemoteProduct: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/products/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Products"],
//     }),

//     // ============================================
//     // 3. CATEGORIES
//     // ============================================
//     getRemoteCategories: builder.query({
//       query: (params) => ({
//         url: "/tenant/categories/",
//         params,
//       }),
//       providesTags: ["Categories"],
//     }),

//     getRemoteCategoryById: builder.query({
//       query: (id) => `/tenant/categories/${id}`,
//       providesTags: (result, error, id) => [{ type: "Categories", id }],
//     }),

//     createRemoteCategory: builder.mutation({
//       query: (category) => ({
//         url: "/tenant/categories/",
//         method: "POST",
//         body: category,
//       }),
//       invalidatesTags: ["Categories"],
//     }),

//     updateRemoteCategory: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/categories/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Categories", id }],
//     }),

//     deleteRemoteCategory: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/categories/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Categories"],
//     }),

//     // ============================================
//     // 4. CUSTOMERS
//     // ============================================
//     getRemoteCustomers: builder.query({
//       query: (params) => ({
//         url: "/tenant/customers/",
//         params,
//       }),
//       providesTags: ["Customers"],
//     }),

//     getRemoteCustomerById: builder.query({
//       query: (id) => `/tenant/customers/${id}`,
//       providesTags: (result, error, id) => [{ type: "Customers", id }],
//     }),

//     createRemoteCustomer: builder.mutation({
//       query: (customer) => ({
//         url: "/tenant/customers/",
//         method: "POST",
//         body: customer,
//       }),
//       invalidatesTags: ["Customers"],
//     }),

//     updateRemoteCustomer: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/customers/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Customers", id }],
//     }),

//     deleteRemoteCustomer: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/customers/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Customers"],
//     }),

//     // ============================================
//     // 5. ORDERS
//     // ============================================
//     getRemoteOrders: builder.query({
//       query: (params) => ({
//         url: "/tenant/orders/",
//         params,
//       }),
//       providesTags: ["Orders"],
//     }),

//     getRemoteOrderById: builder.query({
//       query: (id) => `/tenant/orders/${id}`,
//       providesTags: (result, error, id) => [{ type: "Orders", id }],
//     }),

//     createRemoteOrder: builder.mutation({
//       query: (order) => ({
//         url: "/tenant/orders/",
//         method: "POST",
//         body: order,
//       }),
//       invalidatesTags: ["Orders", "Inventory"],
//     }),

//     deleteRemoteOrder: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/orders/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Orders"],
//     }),

//     updateOrderStatus: builder.mutation({
//       query: ({ id, status }) => ({
//         url: `/tenant/orders/${id}/status`,
//         method: "PATCH",
//         body: { status },
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
//     }),

//     // ============================================
//     // 6. SESSIONS
//     // ============================================
//     getRemoteSessions: builder.query({
//       query: (params) => ({
//         url: "/tenant/sessions/",
//         params,
//       }),
//       providesTags: ["Sessions"],
//     }),

//     createRemoteSession: builder.mutation({
//       query: (body) => ({
//         url: "/tenant/sessions/open",
//         method: "POST",
//         body,
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     closeRemoteSession: builder.mutation({
//       query: ({ id, ...data }) => ({
//         url: `/tenant/sessions/${id}/close`,
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     getRemoteSessionById: builder.query({
//       query: (id) => `/tenant/sessions/${id}`,
//       providesTags: (result, error, id) => [{ type: "Sessions", id }],
//     }),

//     getActiveSession: builder.query({
//       query: ({ userId, storeId }) => ({
//         url: `/tenant/sessions/active/${userId}`,
//         params: { storeId },
//       }),
//       providesTags: ["Sessions"],
//     }),

//     openSession: builder.mutation({
//       query: (data) => ({
//         url: "/tenant/sessions/open",
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     closeSession: builder.mutation({
//       query: ({ id, ...data }) => ({
//         url: `/tenant/sessions/${id}/close`,
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     // ============================================
//     // 7. INVENTORY
//     // ============================================
//     getRemoteInventory: builder.query({
//       query: (params) => ({
//         url: "/tenant/inventory/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     getInventoryMovements: builder.query({
//       query: (params) => ({
//         url: "/tenant/inventory/movements/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     createInventoryMovement: builder.mutation({
//       query: (movement) => ({
//         url: "/tenant/inventory/movements/",
//         method: "POST",
//         body: movement,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     getInventoryCounts: builder.query({
//       query: (params) => ({
//         url: "/tenant/inventory/counts/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     createInventoryCount: builder.mutation({
//       query: (count) => ({
//         url: "/tenant/inventory/counts/",
//         method: "POST",
//         body: count,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     // ============================================
//     // 8. STORES
//     // ============================================
//     getRemoteStores: builder.query({
//       query: () => "/tenant/stores/",
//       providesTags: ["Stores"],
//     }),

//     getRemoteStoreById: builder.query({
//       query: (id) => `/tenant/stores/${id}`,
//       providesTags: (result, error, id) => [{ type: "Stores", id }],
//     }),

//     createRemoteStore: builder.mutation({
//       query: (store) => ({
//         url: "/tenant/stores/",
//         method: "POST",
//         body: store,
//       }),
//       invalidatesTags: ["Stores"],
//     }),

//     updateRemoteStore: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/stores/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Stores", id }],
//     }),

//     deleteRemoteStore: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/stores/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Stores"],
//     }),

//     // ============================================
//     // 9. STAFF
//     // ============================================
//     getRemoteStaff: builder.query({
//       query: (params) => ({
//         url: "/tenant/staff/",
//         params,
//       }),
//       providesTags: ["Staff"],
//     }),

//     getRemoteStaffById: builder.query({
//       query: (id) => `/tenant/staff/${id}`,
//       providesTags: (result, error, id) => [{ type: "Staff", id }],
//     }),

//     createRemoteStaff: builder.mutation({
//       query: (staff) => ({
//         url: "/tenant/staff/",
//         method: "POST",
//         body: staff,
//       }),
//       invalidatesTags: ["Staff"],
//     }),

//     updateRemoteStaff: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/staff/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Staff", id }],
//     }),

//     deleteRemoteStaff: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/staff/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Staff"],
//     }),

//     // ============================================
//     // 10. PAYMENTS
//     // ============================================
//     getPayments: builder.query({
//       query: () => "/tenant/payments/",
//       providesTags: ["Orders"],
//     }),

//     createPayment: builder.mutation({
//       query: (payment) => ({
//         url: "/tenant/payments/",
//         method: "POST",
//         body: payment,
//       }),
//       invalidatesTags: ["Orders"],
//     }),

//     updatePayment: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/payments/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: ["Orders"],
//     }),

//     deletePayment: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/payments/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Orders"],
//     }),

//     // ============================================
//     // 11. RETURNS
//     // ============================================
//     getReturns: builder.query({
//       query: (params) => ({
//         url: "/tenant/returns/",
//         params,
//       }),
//       providesTags: ["Orders"],
//     }),

//     createReturn: builder.mutation({
//       query: (returnData) => ({
//         url: "/tenant/returns/",
//         method: "POST",
//         body: returnData,
//       }),
//       invalidatesTags: ["Orders", "Inventory"],
//     }),

//     deleteReturn: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/returns/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Orders"],
//     }),

//     // ============================================
//     // 12. PURCHASE ORDERS
//     // ============================================
//     getPurchaseOrders: builder.query({
//       query: (params) => ({
//         url: "/tenant/purchase-orders/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     createPurchaseOrder: builder.mutation({
//       query: (purchaseOrder) => ({
//         url: "/tenant/purchase-orders/",
//         method: "POST",
//         body: purchaseOrder,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     updatePurchaseOrder: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/purchase-orders/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     deletePurchaseOrder: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/purchase-orders/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     receivePurchaseOrder: builder.mutation({
//       query: ({ id, storeId }) => ({
//         url: `/tenant/purchase-orders/${id}/receive`,
//         method: "POST",
//         body: { storeId },
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     // ============================================
//     // 13. STOCK TRANSFERS
//     // ============================================
//     getStockTransfers: builder.query({
//       query: (params) => ({
//         url: "/tenant/stock-transfers/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     createStockTransfer: builder.mutation({
//       query: (transfer) => ({
//         url: "/tenant/stock-transfers/",
//         method: "POST",
//         body: transfer,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     deleteStockTransfer: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/stock-transfers/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     completeStockTransfer: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/stock-transfers/${id}/complete`,
//         method: "POST",
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     // ============================================
//     // 14. SUPPLIERS
//     // ============================================
//     getSuppliers: builder.query({
//       query: (params) => ({
//         url: "/tenant/suppliers/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     createSupplier: builder.mutation({
//       query: (supplier) => ({
//         url: "/tenant/suppliers/",
//         method: "POST",
//         body: supplier,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     updateSupplier: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/suppliers/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     deleteSupplier: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/suppliers/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Inventory"],
//     }),

//     // ============================================
//     // 15. PROMOTIONS
//     // ============================================
//     getPromotions: builder.query({
//       query: (params) => ({
//         url: "/tenant/promotions/",
//         params,
//       }),
//       providesTags: ["Products"],
//     }),

//     createPromotion: builder.mutation({
//       query: (promotion) => ({
//         url: "/tenant/promotions/",
//         method: "POST",
//         body: promotion,
//       }),
//       invalidatesTags: ["Products"],
//     }),

//     updatePromotion: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/promotions/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: ["Products"],
//     }),

//     deletePromotion: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/promotions/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Products"],
//     }),

//     // ============================================
//     // 16. STORE SETTINGS
//     // ============================================
//     getStoreSettings: builder.query({
//       query: (params) => ({
//         url: "/tenant/store-settings/",
//         params,
//       }),
//       providesTags: ["Stores"],
//     }),

//     createStoreSetting: builder.mutation({
//       query: (setting) => ({
//         url: "/tenant/store-settings/",
//         method: "POST",
//         body: setting,
//       }),
//       invalidatesTags: ["Stores"],
//     }),

//     deleteStoreSetting: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/store-settings/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Stores"],
//     }),

//     // ============================================
//     // 17. NOTIFICATIONS
//     // ============================================
//     getNotifications: builder.query({
//       query: (params) => ({
//         url: "/tenant/notifications/",
//         params,
//       }),
//       providesTags: ["Staff"],
//     }),

//     getUnreadCount: builder.query({
//       query: () => "/tenant/notifications/unread-count",
//       providesTags: ["Staff"],
//     }),

//     markAllRead: builder.mutation({
//       query: () => ({
//         url: "/tenant/notifications/read-all",
//         method: "PATCH",
//       }),
//       invalidatesTags: ["Staff"],
//     }),

//     markNotificationRead: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/notifications/${id}/read`,
//         method: "PATCH",
//       }),
//       invalidatesTags: ["Staff"],
//     }),

//     deleteNotification: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/notifications/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Staff"],
//     }),

//     // ============================================
//     // 18. TAX RATES
//     // ============================================
//     getTaxRates: builder.query({
//       query: (params) => ({
//         url: "/tenant/tax-rates/",
//         params,
//       }),
//       providesTags: ["Products"],
//     }),

//     createTaxRate: builder.mutation({
//       query: (taxRate) => ({
//         url: "/tenant/tax-rates/",
//         method: "POST",
//         body: taxRate,
//       }),
//       invalidatesTags: ["Products"],
//     }),

//     updateTaxRate: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/tax-rates/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: ["Products"],
//     }),

//     deleteTaxRate: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/tax-rates/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Products"],
//     }),
//   }),
// });

// export const { endpoints: remoteEndpoints } = remoteApi;
