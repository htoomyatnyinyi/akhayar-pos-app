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
        url: "/api/tenant/products/",
        params,
      }),
      providesTags: ["Products"],
    }),

    getStoreProducts: builder.query({
      query: ({ id, params }) => ({
        url: `/api/tenant/stores/${id}/products`,
        params,
      }),
      providesTags: ["Products"],
    }),

    getStoreProductById: builder.query({
      query: ({ storeId, productId }) =>
        `/api/tenant/stores/${storeId}/products/${productId}`,
      providesTags: (result, error, { storeId, productId }) => [
        { type: "Products", id: productId },
      ],
    }),

    getRemoteProductById: builder.query({
      query: (id) => `/api/tenant/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Products", id }],
    }),

    getRemoteProductByBarcode: builder.query({
      query: (barcode) => `/api/tenant/products/barcode/${barcode}`,
      providesTags: ["Products"],
    }),

    getRemoteProductBySku: builder.query({
      query: (sku) => `/api/tenant/products/sku/${sku}`,
      providesTags: ["Products"],
    }),

    createRemoteProduct: builder.mutation({
      query: (product) => ({
        url: "/api/tenant/products/",
        method: "POST",
        body: product,
      }),
      invalidatesTags: ["Products", "Inventory", "ProductVariants"],
    }),

    updateRemoteProduct: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/products/${id}`,
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
        url: `/api/tenant/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products", "Inventory", "ProductVariants"],
    }),

    // ============================================
    // 3. CATEGORIES
    // ============================================
    getRemoteCategories: builder.query({
      query: (params) => ({
        url: "/api/tenant/categories/",
        params,
      }),
      providesTags: ["Categories"],
    }),

    getRemoteCategoryById: builder.query({
      query: (id) => `/api/tenant/categories/${id}`,
      providesTags: (result, error, id) => [{ type: "Categories", id }],
    }),

    createRemoteCategory: builder.mutation({
      query: (category) => ({
        url: "/api/tenant/categories/",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["Categories"],
    }),

    updateRemoteCategory: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/categories/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Categories", id }],
    }),

    deleteRemoteCategory: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories", "Products"],
    }),

    // ============================================
    // 4. BRANDS
    // ============================================
    getRemoteBrands: builder.query({
      query: (params) => ({
        url: "/api/tenant/brands/",
        params,
      }),
      providesTags: ["Brands"],
    }),

    getRemoteBrandById: builder.query({
      query: (id) => `/api/tenant/brands/${id}`,
      providesTags: (result, error, id) => [{ type: "Brands", id }],
    }),

    createRemoteBrand: builder.mutation({
      query: (brand) => ({
        url: "/api/tenant/brands/",
        method: "POST",
        body: brand,
      }),
      invalidatesTags: ["Brands"],
    }),

    updateRemoteBrand: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/brands/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Brands", id }],
    }),

    deleteRemoteBrand: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/brands/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Brands", "Products"],
    }),

    // ============================================
    // 5. CUSTOMERS
    // ============================================
    getRemoteCustomers: builder.query({
      query: (params) => ({
        url: "/api/tenant/customers/",
        params,
      }),
      providesTags: ["Customers"],
    }),

    getRemoteCustomerById: builder.query({
      query: (id) => `/api/tenant/customers/${id}`,
      providesTags: (result, error, id) => [{ type: "Customers", id }],
    }),

    createRemoteCustomer: builder.mutation({
      query: (customer) => ({
        url: "/api/tenant/customers/",
        method: "POST",
        body: customer,
      }),
      invalidatesTags: ["Customers"],
    }),

    updateRemoteCustomer: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/customers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Customers", id }],
    }),

    deleteRemoteCustomer: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),

    // ============================================
    // 6. SUPPLIERS
    // ============================================
    getSuppliers: builder.query({
      query: (params) => ({
        url: "/api/tenant/suppliers/",
        params,
      }),
      providesTags: ["Suppliers"],
    }),

    getSupplierById: builder.query({
      query: (id) => `/api/tenant/suppliers/${id}`,
      providesTags: (result, error, id) => [{ type: "Suppliers", id }],
    }),

    createSupplier: builder.mutation({
      query: (supplier) => ({
        url: "/api/tenant/suppliers/",
        method: "POST",
        body: supplier,
      }),
      invalidatesTags: ["Suppliers"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/suppliers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Suppliers", id }],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Suppliers", "Products"],
    }),

    // ============================================
    // FILE: services/api/remoteApi.ts
    // ============================================

    // Add this missing endpoint in the supplier payments section:

    getSupplierPayments: builder.query({
      query: (params) => ({
        url: "/api/tenant/supplier-payments/",
        params,
      }),
      providesTags: ["SupplierPayments"],
    }),

    getSupplierPaymentById: builder.query({
      query: (id) => `/api/tenant/supplier-payments/${id}`,
      providesTags: (result, error, id) => [{ type: "SupplierPayments", id }],
    }),

    createSupplierPayment: builder.mutation({
      query: (payment) => ({
        url: "/api/tenant/supplier-payments/",
        method: "POST",
        body: payment,
      }),
      invalidatesTags: ["SupplierPayments", "Suppliers"],
    }),

    // ============================================
    // 7. ORDERS
    // ============================================
    getRemoteOrders: builder.query({
      query: (params) => ({
        url: "/api/tenant/orders/",
        params,
      }),
      providesTags: ["Orders"],
    }),

    getRemoteOrderById: builder.query({
      query: (id) => `/api/tenant/orders/${id}`,
      providesTags: (result, error, id) => [{ type: "Orders", id }],
    }),

    createRemoteOrder: builder.mutation({
      query: (order) => ({
        url: "/api/tenant/orders/",
        method: "POST",
        body: order,
      }),
      invalidatesTags: ["Orders", "Inventory", "Customers"],
    }),

    updateOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/api/tenant/orders/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
    }),

    deleteRemoteOrder: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders", "Inventory"],
    }),

    // ============================================
    // 8. SESSIONS
    // ============================================
    getRemoteSessions: builder.query({
      query: (params) => ({
        url: "/api/tenant/sessions/",
        params,
      }),
      providesTags: ["Sessions"],
    }),

    getRemoteSessionById: builder.query({
      query: (id) => `/api/tenant/sessions/${id}`,
      providesTags: (result, error, id) => [{ type: "Sessions", id }],
    }),

    getActiveSession: builder.query({
      query: ({ userId, storeId }) => ({
        url: `/api/tenant/sessions/active/${userId}`,
        params: { storeId },
      }),
      providesTags: ["Sessions"],
    }),

    openSession: builder.mutation({
      query: (data) => ({
        url: "/api/tenant/sessions/open",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    closeSession: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/api/tenant/sessions/${id}/close`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sessions"],
    }),

    // ============================================
    // 9. INVENTORY
    // ============================================
    getRemoteInventory: builder.query({
      query: (params) => ({
        url: "/api/tenant/inventory/",
        params,
      }),
      providesTags: ["Inventory"],
    }),

    getInventoryMovements: builder.query({
      query: (params) => ({
        url: "/api/tenant/inventory/movements/",
        params,
      }),
      providesTags: ["InventoryMovements"],
    }),

    createRemoteInventoryMovement: builder.mutation({
      query: (movement) => ({
        url: "/api/tenant/inventory/movements/",
        method: "POST",
        body: movement,
      }),
      invalidatesTags: ["InventoryMovements", "Inventory"],
    }),

    getInventoryCounts: builder.query({
      query: (params) => ({
        url: "/api/tenant/inventory/counts/",
        params,
      }),
      providesTags: ["InventoryCounts"],
    }),

    createRemoteInventoryCount: builder.mutation({
      query: (count) => ({
        url: "/api/tenant/inventory/counts/",
        method: "POST",
        body: count,
      }),
      invalidatesTags: ["InventoryCounts", "Inventory"],
    }),

    // ============================================
    // 10. STORES
    // ============================================
    getRemoteStores: builder.query({
      query: () => "/api/tenant/stores/",
      providesTags: ["Stores"],
    }),

    getRemoteStoreById: builder.query({
      query: (id) => `/api/tenant/stores/${id}`,
      providesTags: (result, error, id) => [{ type: "Stores", id }],
    }),

    createRemoteStore: builder.mutation({
      query: (store) => ({
        url: "/api/tenant/stores/",
        method: "POST",
        body: store,
      }),
      invalidatesTags: ["Stores"],
    }),

    updateRemoteStore: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/stores/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Stores", id }],
    }),

    deleteRemoteStore: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/stores/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Stores", "Inventory"],
    }),

    // ============================================
    // 11. PAYMENTS
    // ============================================
    getPayments: builder.query({
      query: (params) => ({
        url: "/api/tenant/payments/",
        params,
      }),
      providesTags: ["Payments"],
    }),

    getPaymentById: builder.query({
      query: (id) => `/api/tenant/payments/${id}`,
      providesTags: (result, error, id) => [{ type: "Payments", id }],
    }),

    createPayment: builder.mutation({
      query: (payment) => ({
        url: "/api/tenant/payments/",
        method: "POST",
        body: payment,
      }),
      invalidatesTags: ["Payments", "Orders"],
    }),

    updatePayment: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/payments/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Payments", id }],
    }),

    deletePayment: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/payments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Payments", "Orders"],
    }),

    // ============================================
    // 12. RETURNS
    // ============================================
    getReturns: builder.query({
      query: (params) => ({
        url: "/api/tenant/returns/",
        params,
      }),
      providesTags: ["Returns"],
    }),

    getReturnById: builder.query({
      query: (id) => `/api/tenant/returns/${id}`,
      providesTags: (result, error, id) => [{ type: "Returns", id }],
    }),

    createReturn: builder.mutation({
      query: (returnData) => ({
        url: "/api/tenant/returns/",
        method: "POST",
        body: returnData,
      }),
      invalidatesTags: ["Returns", "Orders", "Inventory"],
    }),

    deleteReturn: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Returns", "Orders"],
    }),

    // ============================================
    // 13. PURCHASE ORDERS
    // ============================================
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: "/api/tenant/purchase-orders/",
        params,
      }),
      providesTags: ["PurchaseOrders"],
    }),

    getPurchaseOrderById: builder.query({
      query: (id) => `/api/tenant/purchase-orders/${id}`,
      providesTags: (result, error, id) => [{ type: "PurchaseOrders", id }],
    }),

    createPurchaseOrder: builder.mutation({
      query: (purchaseOrder) => ({
        url: "/api/tenant/purchase-orders/",
        method: "POST",
        body: purchaseOrder,
      }),
      invalidatesTags: ["PurchaseOrders", "Inventory", "Suppliers"],
    }),

    updatePurchaseOrder: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/purchase-orders/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrders", id },
      ],
    }),

    deletePurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/purchase-orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PurchaseOrders"],
    }),

    receivePurchaseOrder: builder.mutation({
      query: ({ id, storeId }) => ({
        url: `/api/tenant/purchase-orders/${id}/receive`,
        method: "POST",
        body: { storeId },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "PurchaseOrders", id },
        "Inventory",
        "Suppliers",
      ],
    }),

    // ============================================
    // 14. STOCK TRANSFERS
    // ============================================
    getStockTransfers: builder.query({
      query: (params) => ({
        url: "/api/tenant/stock-transfers/",
        params,
      }),
      providesTags: ["StockTransfers"],
    }),

    getStockTransferById: builder.query({
      query: (id) => `/api/tenant/stock-transfers/${id}`,
      providesTags: (result, error, id) => [{ type: "StockTransfers", id }],
    }),

    createStockTransfer: builder.mutation({
      query: (transfer) => ({
        url: "/api/tenant/stock-transfers/",
        method: "POST",
        body: transfer,
      }),
      invalidatesTags: ["StockTransfers", "Inventory", "Stores"],
    }),

    deleteStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/stock-transfers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StockTransfers", "Inventory"],
    }),

    completeStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/stock-transfers/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "StockTransfers", id },
        "Inventory",
        "Stores",
      ],
    }),

    // ============================================
    // 15. PROMOTIONS
    // ============================================
    getPromotions: builder.query({
      query: (params) => ({
        url: "/api/tenant/promotions/",
        params,
      }),
      providesTags: ["Promotions"],
    }),

    getPromotionById: builder.query({
      query: (id) => `/api/tenant/promotions/${id}`,
      providesTags: (result, error, id) => [{ type: "Promotions", id }],
    }),

    createPromotion: builder.mutation({
      query: (promotion) => ({
        url: "/api/tenant/promotions/",
        method: "POST",
        body: promotion,
      }),
      invalidatesTags: ["Promotions", "Products"],
    }),

    updatePromotion: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/promotions/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Promotions", id }],
    }),

    deletePromotion: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/promotions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Promotions", "Products"],
    }),

    // ============================================
    // 16. STAFF
    // ============================================
    getRemoteStaff: builder.query({
      query: (params) => ({
        url: "/api/tenant/staff/",
        params,
      }),
      providesTags: ["Staff"],
    }),

    getRemoteStaffById: builder.query({
      query: (id) => `/api/tenant/staff/${id}`,
      providesTags: (result, error, id) => [{ type: "Staff", id }],
    }),

    createRemoteStaff: builder.mutation({
      query: (staff) => ({
        url: "/api/tenant/staff/",
        method: "POST",
        body: staff,
      }),
      invalidatesTags: ["Staff"],
    }),

    updateRemoteStaff: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/staff/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Staff", id }],
    }),

    deleteRemoteStaff: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Staff"],
    }),

    // ============================================
    // 17. EXPENSES
    // ============================================
    getExpenses: builder.query({
      query: (params) => ({
        url: "/api/tenant/expenses/",
        params,
      }),
      providesTags: ["Expenses"],
    }),

    getExpenseById: builder.query({
      query: (id) => `/api/tenant/expenses/${id}`,
      providesTags: (result, error, id) => [{ type: "Expenses", id }],
    }),

    getExpenseCategories: builder.query({
      query: () => "/api/tenant/expenses/categories/",
      providesTags: ["ExpenseCategories"],
    }),

    createExpenseCategory: builder.mutation({
      query: (category) => ({
        url: "/api/tenant/expenses/categories/",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["ExpenseCategories"],
    }),

    updateExpenseCategory: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/expenses/categories/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ExpenseCategories", id },
      ],
    }),

    deleteExpenseCategory: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/expenses/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ExpenseCategories"],
    }),

    createExpense: builder.mutation({
      query: (expense) => ({
        url: "/api/tenant/expenses/",
        method: "POST",
        body: expense,
      }),
      invalidatesTags: ["Expenses", "ExpenseCategories"],
    }),

    updateExpense: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/expenses/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Expenses", id }],
    }),

    deleteExpense: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Expenses"],
    }),

    // ============================================
    // 18. CASH REGISTERS
    // ============================================
    getCashRegisters: builder.query({
      query: (params) => ({
        url: "/api/tenant/cash-registers/",
        params,
      }),
      providesTags: ["CashRegisters"],
    }),

    getCashRegisterById: builder.query({
      query: (id) => `/api/tenant/cash-registers/${id}`,
      providesTags: (result, error, id) => [{ type: "CashRegisters", id }],
    }),

    createCashRegister: builder.mutation({
      query: (register) => ({
        url: "/api/tenant/cash-registers/",
        method: "POST",
        body: register,
      }),
      invalidatesTags: ["CashRegisters", "Stores"],
    }),

    updateCashRegister: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/cash-registers/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "CashRegisters", id },
      ],
    }),

    deleteCashRegister: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/cash-registers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CashRegisters"],
    }),

    // ============================================
    // 19. GIFT CARDS
    // ============================================
    getGiftCards: builder.query({
      query: (params) => ({
        url: "/api/tenant/gift-cards/",
        params,
      }),
      providesTags: ["GiftCards"],
    }),

    getGiftCardByNumber: builder.query({
      query: (cardNumber) => `/api/tenant/gift-cards/lookup/${cardNumber}`,
      providesTags: (result, error, cardNumber) => [
        { type: "GiftCards", id: cardNumber },
      ],
    }),

    createGiftCard: builder.mutation({
      query: (giftCard) => ({
        url: "/api/tenant/gift-cards/",
        method: "POST",
        body: giftCard,
      }),
      invalidatesTags: ["GiftCards", "Customers"],
    }),

    reloadGiftCard: builder.mutation({
      query: ({ id, amount }) => ({
        url: `/api/tenant/gift-cards/${id}/reload`,
        method: "POST",
        body: { amount },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "GiftCards", id }],
    }),

    updateGiftCardStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/api/tenant/gift-cards/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "GiftCards", id }],
    }),

    // ============================================
    // 20. WALLETS
    // ============================================
    getWallets: builder.query({
      query: (params) => ({
        url: "/api/tenant/wallets/",
        params,
      }),
      providesTags: ["Wallets"],
    }),

    getWalletByCustomer: builder.query({
      query: (customerId) => `/api/tenant/wallets/customer/${customerId}`,
      providesTags: (result, error, customerId) => [
        { type: "Wallets", id: customerId },
      ],
    }),

    createWalletTransaction: builder.mutation({
      query: (transaction) => ({
        url: "/api/tenant/wallets/transactions",
        method: "POST",
        body: transaction,
      }),
      invalidatesTags: ["Wallets", "Customers"],
    }),

    // ============================================
    // 21. TAX RATES
    // ============================================
    getTaxRates: builder.query({
      query: (params) => ({
        url: "/api/tenant/tax-rates/",
        params,
      }),
      providesTags: ["TaxRates"],
    }),

    getTaxRateById: builder.query({
      query: (id) => `/api/tenant/tax-rates/${id}`,
      providesTags: (result, error, id) => [{ type: "TaxRates", id }],
    }),

    createTaxRate: builder.mutation({
      query: (taxRate) => ({
        url: "/api/tenant/tax-rates/",
        method: "POST",
        body: taxRate,
      }),
      invalidatesTags: ["TaxRates", "Products"],
    }),

    updateTaxRate: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/tax-rates/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "TaxRates", id }],
    }),

    deleteTaxRate: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/tax-rates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TaxRates"],
    }),

    // ============================================
    // 22. NOTIFICATIONS
    // ============================================
    getNotifications: builder.query({
      query: (params) => ({
        url: "/api/tenant/notifications/",
        params,
      }),
      providesTags: ["Notifications"],
    }),

    getUnreadCount: builder.query({
      query: () => "/api/tenant/notifications/unread-count",
      providesTags: ["Notifications"],
    }),

    markAllRead: builder.mutation({
      query: () => ({
        url: "/api/tenant/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),

    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Notifications", id }],
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),

    // ============================================
    // 23. API KEYS (Platform)
    // ============================================
    getApiKeys: builder.query({
      query: () => ({
        url: "/api/platform/api-keys/",
      }),
      providesTags: ["ApiKeys"],
    }),

    createApiKey: builder.mutation({
      query: (apiKey) => ({
        url: "/api/platform/api-keys/",
        method: "POST",
        body: apiKey,
      }),
      invalidatesTags: ["ApiKeys"],
    }),

    deleteApiKey: builder.mutation({
      query: (id) => ({
        url: `/api/platform/api-keys/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ApiKeys"],
    }),

    // ============================================
    // 24. TENANTS (Platform)
    // ============================================
    getTenants: builder.query({
      query: (params) => ({
        url: "/api/platform/tenants/",
        params,
      }),
      providesTags: ["Tenants"],
    }),

    getTenantById: builder.query({
      query: (id) => `/api/platform/tenants/${id}`,
      providesTags: (result, error, id) => [{ type: "Tenants", id }],
    }),

    createTenant: builder.mutation({
      query: (tenant) => ({
        url: "/api/platform/tenants/",
        method: "POST",
        body: tenant,
      }),
      invalidatesTags: ["Tenants"],
    }),

    updateTenant: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/platform/tenants/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Tenants", id }],
    }),

    deleteTenant: builder.mutation({
      query: (id) => ({
        url: `/api/platform/tenants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tenants"],
    }),

    // ============================================
    // 25. TENANT SUBSCRIPTION
    // ============================================
    createTenantSubscription: builder.mutation({
      query: ({ id, ...subscription }) => ({
        url: `/api/platform/tenants/${id}/subscription`,
        method: "POST",
        body: subscription,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Tenants", id }],
    }),

    // ============================================
    // 26. AUDIT LOGS (Platform)
    // ============================================
    getAuditLogs: builder.query({
      query: (params) => ({
        url: "/api/platform/audit-logs/",
        params,
      }),
      providesTags: ["AuditLogs"],
    }),

    getAuditLogById: builder.query({
      query: (id) => `/api/platform/audit-logs/${id}`,
      providesTags: (result, error, id) => [{ type: "AuditLogs", id }],
    }),

    createAuditLog: builder.mutation({
      query: (log) => ({
        url: "/api/platform/audit-logs/",
        method: "POST",
        body: log,
      }),
      invalidatesTags: ["AuditLogs"],
    }),

    // ============================================
    // 27. STORE SETTINGS (Platform)
    // ============================================
    getStoreSettingsPlatform: builder.query({
      query: (params) => ({
        url: "/api/platform/store-settings/",
        params,
      }),
      providesTags: ["StoreSettings"],
    }),

    getStoreSettingPlatformById: builder.query({
      query: (id) => `/api/platform/store-settings/${id}`,
      providesTags: (result, error, id) => [{ type: "StoreSettings", id }],
    }),

    createStoreSettingPlatform: builder.mutation({
      query: (setting) => ({
        url: "/api/platform/store-settings/",
        method: "POST",
        body: setting,
      }),
      invalidatesTags: ["StoreSettings"],
    }),

    deleteStoreSettingPlatform: builder.mutation({
      query: (id) => ({
        url: `/api/platform/store-settings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["StoreSettings"],
    }),

    // ============================================
    // 28. STORE SETTINGS (Tenant)
    // ============================================
    getTenantStoreSettings: builder.query({
      query: (params) => ({
        url: "/api/tenant/store-settings/",
        params,
      }),
      providesTags: ["TenantStoreSettings"],
    }),

    getTenantStoreSettingById: builder.query({
      query: (id) => `/api/tenant/store-settings/${id}`,
      providesTags: (result, error, id) => [
        { type: "TenantStoreSettings", id },
      ],
    }),

    createTenantStoreSetting: builder.mutation({
      query: (setting) => ({
        url: "/api/tenant/store-settings/",
        method: "POST",
        body: setting,
      }),
      invalidatesTags: ["TenantStoreSettings"],
    }),

    deleteTenantStoreSetting: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/store-settings/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TenantStoreSettings"],
    }),

    // ============================================
    // 29. WEBHOOKS (Tenant)
    // ============================================
    getWebhooks: builder.query({
      query: (params) => ({
        url: "/api/tenant/webhooks/",
        params,
      }),
      providesTags: ["Webhooks"],
    }),

    getWebhookById: builder.query({
      query: (id) => `/api/tenant/webhooks/${id}`,
      providesTags: (result, error, id) => [{ type: "Webhooks", id }],
    }),

    createWebhook: builder.mutation({
      query: (webhook) => ({
        url: "/api/tenant/webhooks/",
        method: "POST",
        body: webhook,
      }),
      invalidatesTags: ["Webhooks"],
    }),

    updateWebhook: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/tenant/webhooks/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Webhooks", id }],
    }),

    deleteWebhook: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/webhooks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Webhooks"],
    }),

    // ============================================
    // 30. TENANT API KEYS
    // ============================================
    getTenantApiKeys: builder.query({
      query: () => ({
        url: "/api/tenant/api-keys/",
      }),
      providesTags: ["TenantApiKeys"],
    }),

    createTenantApiKey: builder.mutation({
      query: (apiKey) => ({
        url: "/api/tenant/api-keys/",
        method: "POST",
        body: apiKey,
      }),
      invalidatesTags: ["TenantApiKeys"],
    }),

    deleteTenantApiKey: builder.mutation({
      query: (id) => ({
        url: `/api/tenant/api-keys/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TenantApiKeys"],
    }),
  }),
});

export const { endpoints: remoteEndpoints } = remoteApi;

// // ============================================
// // FILE: services/api/remoteApi.ts
// // ============================================

// import { posApi } from "./posApi";

// export const remoteApi = posApi.injectEndpoints({
//   overrideExisting: true,
//   endpoints: (builder) => ({
//     // ============================================
//     // 1. AUTH (Platform-specific only)
//     // ============================================

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

//     getStoreProducts: builder.query({
//       query: (storeId) => `/tenant/stores/${storeId}/products`,
//       providesTags: ["Products"],
//     }),

//     getStoreProductById: builder.query({
//       query: ({ storeId, productId }) =>
//         `/tenant/stores/${storeId}/products/${productId}`,
//       providesTags: (result, error, { storeId, productId }) => [
//         { type: "Products", id: productId },
//       ],
//     }),

//     getRemoteProductById: builder.query({
//       query: (id) => `/tenant/products/${id}`,
//       providesTags: (result, error, id) => [{ type: "Products", id }],
//     }),

//     getRemoteProductByBarcode: builder.query({
//       query: (barcode) => `/tenant/products/barcode/${barcode}`,
//       providesTags: ["Products"],
//     }),

//     getRemoteProductBySku: builder.query({
//       query: (sku) => `/tenant/products/sku/${sku}`,
//       providesTags: ["Products"],
//     }),

//     createRemoteProduct: builder.mutation({
//       query: (product) => ({
//         url: "/tenant/products/",
//         method: "POST",
//         body: product,
//       }),
//       invalidatesTags: ["Products", "Inventory", "ProductVariants"],
//     }),

//     updateRemoteProduct: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/products/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "Products", id },
//         "Products",
//         "Inventory",
//       ],
//     }),

//     deleteRemoteProduct: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/products/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Products", "Inventory", "ProductVariants"],
//     }),

//     // ============================================
//     // 3. PRODUCT VARIANTS
//     // ============================================
//     getRemoteProductVariants: builder.query({
//       query: (params) => ({
//         url: "/tenant/products/variants/",
//         params,
//       }),
//       providesTags: ["ProductVariants"],
//     }),

//     getRemoteProductVariantById: builder.query({
//       query: (id) => `/tenant/products/variants/${id}`,
//       providesTags: (result, error, id) => [{ type: "ProductVariants", id }],
//     }),

//     getRemoteProductVariantByBarcode: builder.query({
//       query: (barcode) => `/tenant/products/variants/barcode/${barcode}`,
//       providesTags: ["ProductVariants"],
//     }),

//     getRemoteProductVariantsByProduct: builder.query({
//       query: (productId) => `/tenant/products/${productId}/variants`,
//       providesTags: ["ProductVariants"],
//     }),

//     createRemoteProductVariant: builder.mutation({
//       query: (variant) => ({
//         url: "/tenant/products/variants/",
//         method: "POST",
//         body: variant,
//       }),
//       invalidatesTags: ["ProductVariants", "Products", "Inventory"],
//     }),

//     updateRemoteProductVariant: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/products/variants/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "ProductVariants", id },
//         "ProductVariants",
//         "Products",
//       ],
//     }),

//     deleteRemoteProductVariant: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/products/variants/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["ProductVariants", "Products", "Inventory"],
//     }),

//     // ============================================
//     // 4. CATEGORIES
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

//     getRemoteCategoryBySlug: builder.query({
//       query: (slug) => `/tenant/categories/slug/${slug}`,
//       providesTags: ["Categories"],
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
//       invalidatesTags: ["Categories", "Products"],
//     }),

//     // ============================================
//     // 5. CUSTOMERS
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

//     getRemoteCustomerByPhone: builder.query({
//       query: (phone) => `/tenant/customers/phone/${phone}`,
//       providesTags: ["Customers"],
//     }),

//     getRemoteCustomerByCode: builder.query({
//       query: (code) => `/tenant/customers/code/${code}`,
//       providesTags: ["Customers"],
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
//     // 6. ORDERS
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

//     getRemoteOrderByNumber: builder.query({
//       query: (orderNumber) => `/tenant/orders/number/${orderNumber}`,
//       providesTags: ["Orders"],
//     }),

//     getRemoteOrdersByCustomer: builder.query({
//       query: (customerId) => `/tenant/orders/customer/${customerId}`,
//       providesTags: ["Orders"],
//     }),

//     getRemoteOrdersBySession: builder.query({
//       query: (sessionId) => `/tenant/orders/session/${sessionId}`,
//       providesTags: ["Orders"],
//     }),

//     createRemoteOrder: builder.mutation({
//       query: (order) => ({
//         url: "/tenant/orders/",
//         method: "POST",
//         body: order,
//       }),
//       invalidatesTags: ["Orders", "Inventory", "Customers"],
//     }),

//     updateRemoteOrder: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/orders/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
//     }),

//     deleteRemoteOrder: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/orders/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Orders", "Inventory"],
//     }),

//     updateOrderStatus: builder.mutation({
//       query: ({ id, status }) => ({
//         url: `/tenant/orders/${id}/status`,
//         method: "PATCH",
//         body: { status },
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Orders", id }],
//     }),

//     voidOrder: builder.mutation({
//       query: ({ id, reason }) => ({
//         url: `/tenant/orders/${id}/void`,
//         method: "POST",
//         body: { reason },
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "Orders", id },
//         "Inventory",
//       ],
//     }),

//     refundOrder: builder.mutation({
//       query: ({ id, items, reason }) => ({
//         url: `/tenant/orders/${id}/refund`,
//         method: "POST",
//         body: { items, reason },
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "Orders", id },
//         "Inventory",
//       ],
//     }),

//     // ============================================
//     // 7. SESSIONS
//     // ============================================
//     getRemoteSessions: builder.query({
//       query: (params) => ({
//         url: "/tenant/sessions/",
//         params,
//       }),
//       providesTags: ["Sessions"],
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

//     createRemoteSession: builder.mutation({
//       query: (body) => ({
//         url: "/tenant/sessions/open",
//         method: "POST",
//         body,
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     openSession: builder.mutation({
//       query: (data) => ({
//         url: "/tenant/sessions/open",
//         method: "POST",
//         body: data,
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

//     closeSession: builder.mutation({
//       query: ({ id, ...data }) => ({
//         url: `/tenant/sessions/${id}/close`,
//         method: "POST",
//         body: data,
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     suspendSession: builder.mutation({
//       query: ({ id, reason }) => ({
//         url: `/tenant/sessions/${id}/suspend`,
//         method: "POST",
//         body: { reason },
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     resumeSession: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/sessions/${id}/resume`,
//         method: "POST",
//       }),
//       invalidatesTags: ["Sessions"],
//     }),

//     // ============================================
//     // 8. INVENTORY
//     // ============================================
//     getRemoteInventory: builder.query({
//       query: (params) => ({
//         url: "/tenant/inventory/",
//         params,
//       }),
//       providesTags: ["Inventory"],
//     }),

//     getRemoteInventoryByProduct: builder.query({
//       query: ({ productId, storeId }) => ({
//         url: `/tenant/inventory/product/${productId}`,
//         params: { storeId },
//       }),
//       providesTags: ["Inventory"],
//     }),

//     getRemoteInventoryByVariant: builder.query({
//       query: ({ variantId, storeId }) => ({
//         url: `/tenant/inventory/variant/${variantId}`,
//         params: { storeId },
//       }),
//       providesTags: ["Inventory"],
//     }),

//     getRemoteInventoryByStore: builder.query({
//       query: (storeId) => `/tenant/inventory/store/${storeId}`,
//       providesTags: ["Inventory"],
//     }),

//     upsertRemoteInventory: builder.mutation({
//       query: (inventory) => ({
//         url: "/tenant/inventory/",
//         method: "POST",
//         body: inventory,
//       }),
//       invalidatesTags: ["Inventory", "Products"],
//     }),

//     updateRemoteInventory: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/inventory/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "Inventory", id },
//         "Inventory",
//       ],
//     }),

//     adjustInventory: builder.mutation({
//       query: ({ id, quantity, reason }) => ({
//         url: `/tenant/inventory/${id}/adjust`,
//         method: "POST",
//         body: { quantity, reason },
//       }),
//       invalidatesTags: ["Inventory", "Products"],
//     }),

//     // ============================================
//     // 9. INVENTORY MOVEMENTS
//     // ============================================
//     getInventoryMovements: builder.query({
//       query: (params) => ({
//         url: "/tenant/inventory/movements/",
//         params,
//       }),
//       providesTags: ["InventoryMovements"],
//     }),

//     getInventoryMovementsByProduct: builder.query({
//       query: (productId) => `/tenant/inventory/movements/product/${productId}`,
//       providesTags: ["InventoryMovements"],
//     }),

//     getInventoryMovementsByVariant: builder.query({
//       query: (variantId) => `/tenant/inventory/movements/variant/${variantId}`,
//       providesTags: ["InventoryMovements"],
//     }),

//     createRemoteInventoryMovement: builder.mutation({
//       query: (movement) => ({
//         url: "/tenant/inventory/movements/",
//         method: "POST",
//         body: movement,
//       }),
//       invalidatesTags: ["InventoryMovements", "Inventory"],
//     }),

//     // ============================================
//     // 10. INVENTORY COUNTS
//     // ============================================
//     getInventoryCounts: builder.query({
//       query: (params) => ({
//         url: "/tenant/inventory/counts/",
//         params,
//       }),
//       providesTags: ["InventoryCounts"],
//     }),

//     getInventoryCountById: builder.query({
//       query: (id) => `/tenant/inventory/counts/${id}`,
//       providesTags: (result, error, id) => [{ type: "InventoryCounts", id }],
//     }),

//     createRemoteInventoryCount: builder.mutation({
//       query: (count) => ({
//         url: "/tenant/inventory/counts/",
//         method: "POST",
//         body: count,
//       }),
//       invalidatesTags: ["InventoryCounts", "Inventory"],
//     }),

//     completeInventoryCount: builder.mutation({
//       query: ({ id, items }) => ({
//         url: `/tenant/inventory/counts/${id}/complete`,
//         method: "POST",
//         body: { items },
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "InventoryCounts", id },
//         "Inventory",
//       ],
//     }),

//     cancelInventoryCount: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/inventory/counts/${id}/cancel`,
//         method: "POST",
//       }),
//       invalidatesTags: (result, error, id) => [{ type: "InventoryCounts", id }],
//     }),

//     // ============================================
//     // 11. PRICE HISTORY
//     // ============================================
//     getRemotePriceHistory: builder.query({
//       query: (params) => ({
//         url: "/tenant/price-history/",
//         params,
//       }),
//       providesTags: ["PriceHistory"],
//     }),

//     getRemotePriceHistoryByProduct: builder.query({
//       query: (productId) => `/tenant/price-history/product/${productId}`,
//       providesTags: ["PriceHistory"],
//     }),

//     getRemotePriceHistoryByVariant: builder.query({
//       query: (variantId) => `/tenant/price-history/variant/${variantId}`,
//       providesTags: ["PriceHistory"],
//     }),

//     createRemotePriceHistory: builder.mutation({
//       query: (priceHistory) => ({
//         url: "/tenant/price-history/",
//         method: "POST",
//         body: priceHistory,
//       }),
//       invalidatesTags: ["PriceHistory", "Products", "ProductVariants"],
//     }),

//     // ============================================
//     // 12. STORES
//     // ============================================
//     getRemoteStores: builder.query({
//       query: () => "/tenant/stores/",
//       providesTags: ["Stores"],
//     }),

//     getRemoteStoreById: builder.query({
//       query: (id) => `/tenant/stores/${id}`,
//       providesTags: (result, error, id) => [{ type: "Stores", id }],
//     }),

//     getRemoteStoreByCode: builder.query({
//       query: (code) => `/tenant/stores/code/${code}`,
//       providesTags: ["Stores"],
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
//       invalidatesTags: ["Stores", "Inventory"],
//     }),

//     // ============================================
//     // 13. STAFF
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
//     // 14. PAYMENTS
//     // ============================================
//     getPayments: builder.query({
//       query: (params) => ({
//         url: "/tenant/payments/",
//         params,
//       }),
//       providesTags: ["Payments"],
//     }),

//     getPaymentById: builder.query({
//       query: (id) => `/tenant/payments/${id}`,
//       providesTags: (result, error, id) => [{ type: "Payments", id }],
//     }),

//     getPaymentsByOrder: builder.query({
//       query: (orderId) => `/tenant/payments/order/${orderId}`,
//       providesTags: ["Payments"],
//     }),

//     createPayment: builder.mutation({
//       query: (payment) => ({
//         url: "/tenant/payments/",
//         method: "POST",
//         body: payment,
//       }),
//       invalidatesTags: ["Payments", "Orders"],
//     }),

//     updatePayment: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/payments/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Payments", id }],
//     }),

//     deletePayment: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/payments/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Payments", "Orders"],
//     }),

//     // ============================================
//     // 15. RETURNS
//     // ============================================
//     getReturns: builder.query({
//       query: (params) => ({
//         url: "/tenant/returns/",
//         params,
//       }),
//       providesTags: ["Returns"],
//     }),

//     getReturnById: builder.query({
//       query: (id) => `/tenant/returns/${id}`,
//       providesTags: (result, error, id) => [{ type: "Returns", id }],
//     }),

//     getReturnsByOrder: builder.query({
//       query: (orderId) => `/tenant/returns/order/${orderId}`,
//       providesTags: ["Returns"],
//     }),

//     createReturn: builder.mutation({
//       query: (returnData) => ({
//         url: "/tenant/returns/",
//         method: "POST",
//         body: returnData,
//       }),
//       invalidatesTags: ["Returns", "Orders", "Inventory"],
//     }),

//     updateReturn: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/returns/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Returns", id }],
//     }),

//     deleteReturn: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/returns/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Returns", "Orders"],
//     }),

//     approveReturn: builder.mutation({
//       query: ({ id, approve }) => ({
//         url: `/tenant/returns/${id}/approve`,
//         method: "POST",
//         body: { approve },
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "Returns", id },
//         "Inventory",
//       ],
//     }),

//     // ============================================
//     // 16. PURCHASE ORDERS
//     // ============================================
//     getPurchaseOrders: builder.query({
//       query: (params) => ({
//         url: "/tenant/purchase-orders/",
//         params,
//       }),
//       providesTags: ["PurchaseOrders"],
//     }),

//     getPurchaseOrderById: builder.query({
//       query: (id) => `/tenant/purchase-orders/${id}`,
//       providesTags: (result, error, id) => [{ type: "PurchaseOrders", id }],
//     }),

//     createPurchaseOrder: builder.mutation({
//       query: (purchaseOrder) => ({
//         url: "/tenant/purchase-orders/",
//         method: "POST",
//         body: purchaseOrder,
//       }),
//       invalidatesTags: ["PurchaseOrders", "Inventory"],
//     }),

//     updatePurchaseOrder: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/purchase-orders/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "PurchaseOrders", id },
//       ],
//     }),

//     deletePurchaseOrder: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/purchase-orders/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["PurchaseOrders", "Inventory"],
//     }),

//     receivePurchaseOrder: builder.mutation({
//       query: ({ id, storeId, items }) => ({
//         url: `/tenant/purchase-orders/${id}/receive`,
//         method: "POST",
//         body: { storeId, items },
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "PurchaseOrders", id },
//         "Inventory",
//       ],
//     }),

//     // ============================================
//     // 17. STOCK TRANSFERS
//     // ============================================
//     getStockTransfers: builder.query({
//       query: (params) => ({
//         url: "/tenant/stock-transfers/",
//         params,
//       }),
//       providesTags: ["StockTransfers"],
//     }),

//     getStockTransferById: builder.query({
//       query: (id) => `/tenant/stock-transfers/${id}`,
//       providesTags: (result, error, id) => [{ type: "StockTransfers", id }],
//     }),

//     createStockTransfer: builder.mutation({
//       query: (transfer) => ({
//         url: "/tenant/stock-transfers/",
//         method: "POST",
//         body: transfer,
//       }),
//       invalidatesTags: ["StockTransfers", "Inventory"],
//     }),

//     updateStockTransfer: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/stock-transfers/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "StockTransfers", id },
//       ],
//     }),

//     deleteStockTransfer: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/stock-transfers/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["StockTransfers", "Inventory"],
//     }),

//     completeStockTransfer: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/stock-transfers/${id}/complete`,
//         method: "POST",
//       }),
//       invalidatesTags: (result, error, id) => [
//         { type: "StockTransfers", id },
//         "Inventory",
//       ],
//     }),

//     // ============================================
//     // 18. SUPPLIERS
//     // ============================================
//     getSuppliers: builder.query({
//       query: (params) => ({
//         url: "/tenant/suppliers/",
//         params,
//       }),
//       providesTags: ["Suppliers"],
//     }),

//     getSupplierById: builder.query({
//       query: (id) => `/tenant/suppliers/${id}`,
//       providesTags: (result, error, id) => [{ type: "Suppliers", id }],
//     }),

//     createSupplier: builder.mutation({
//       query: (supplier) => ({
//         url: "/tenant/suppliers/",
//         method: "POST",
//         body: supplier,
//       }),
//       invalidatesTags: ["Suppliers"],
//     }),

//     updateSupplier: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/suppliers/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Suppliers", id }],
//     }),

//     deleteSupplier: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/suppliers/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Suppliers", "Products"],
//     }),

//     // ============================================
//     // 19. PROMOTIONS
//     // ============================================
//     getPromotions: builder.query({
//       query: (params) => ({
//         url: "/tenant/promotions/",
//         params,
//       }),
//       providesTags: ["Promotions"],
//     }),

//     getPromotionById: builder.query({
//       query: (id) => `/tenant/promotions/${id}`,
//       providesTags: (result, error, id) => [{ type: "Promotions", id }],
//     }),

//     createPromotion: builder.mutation({
//       query: (promotion) => ({
//         url: "/tenant/promotions/",
//         method: "POST",
//         body: promotion,
//       }),
//       invalidatesTags: ["Promotions", "Products"],
//     }),

//     updatePromotion: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/promotions/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "Promotions", id }],
//     }),

//     deletePromotion: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/promotions/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Promotions", "Products"],
//     }),

//     // ============================================
//     // 20. STORE SETTINGS
//     // ============================================
//     getStoreSettings: builder.query({
//       query: (params) => ({
//         url: "/tenant/store-settings/",
//         params,
//       }),
//       providesTags: ["StoreSettings"],
//     }),

//     getStoreSettingById: builder.query({
//       query: (id) => `/tenant/store-settings/${id}`,
//       providesTags: (result, error, id) => [{ type: "StoreSettings", id }],
//     }),

//     createStoreSetting: builder.mutation({
//       query: (setting) => ({
//         url: "/tenant/store-settings/",
//         method: "POST",
//         body: setting,
//       }),
//       invalidatesTags: ["StoreSettings", "Stores"],
//     }),

//     updateStoreSetting: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/store-settings/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [
//         { type: "StoreSettings", id },
//       ],
//     }),

//     deleteStoreSetting: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/store-settings/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["StoreSettings", "Stores"],
//     }),

//     // ============================================
//     // 21. NOTIFICATIONS
//     // ============================================
//     getNotifications: builder.query({
//       query: (params) => ({
//         url: "/tenant/notifications/",
//         params,
//       }),
//       providesTags: ["Notifications"],
//     }),

//     getUnreadCount: builder.query({
//       query: () => "/tenant/notifications/unread-count",
//       providesTags: ["Notifications"],
//     }),

//     markAllRead: builder.mutation({
//       query: () => ({
//         url: "/tenant/notifications/read-all",
//         method: "PATCH",
//       }),
//       invalidatesTags: ["Notifications"],
//     }),

//     markNotificationRead: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/notifications/${id}/read`,
//         method: "PATCH",
//       }),
//       invalidatesTags: (result, error, id) => [{ type: "Notifications", id }],
//     }),

//     deleteNotification: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/notifications/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["Notifications"],
//     }),

//     // ============================================
//     // 22. TAX RATES
//     // ============================================
//     getTaxRates: builder.query({
//       query: (params) => ({
//         url: "/tenant/tax-rates/",
//         params,
//       }),
//       providesTags: ["TaxRates"],
//     }),

//     getTaxRateById: builder.query({
//       query: (id) => `/tenant/tax-rates/${id}`,
//       providesTags: (result, error, id) => [{ type: "TaxRates", id }],
//     }),

//     createTaxRate: builder.mutation({
//       query: (taxRate) => ({
//         url: "/tenant/tax-rates/",
//         method: "POST",
//         body: taxRate,
//       }),
//       invalidatesTags: ["TaxRates", "Products"],
//     }),

//     updateTaxRate: builder.mutation({
//       query: ({ id, ...patch }) => ({
//         url: `/tenant/tax-rates/${id}`,
//         method: "PUT",
//         body: patch,
//       }),
//       invalidatesTags: (result, error, { id }) => [{ type: "TaxRates", id }],
//     }),

//     deleteTaxRate: builder.mutation({
//       query: (id) => ({
//         url: `/tenant/tax-rates/${id}`,
//         method: "DELETE",
//       }),
//       invalidatesTags: ["TaxRates", "Products"],
//     }),

//     // ============================================
//     // 23. DASHBOARD / STATISTICS
//     // ============================================
//     getDashboardStats: builder.query({
//       query: (params) => ({
//         url: "/tenant/dashboard/stats",
//         params,
//       }),
//       providesTags: ["Dashboard"],
//     }),

//     getSalesStats: builder.query({
//       query: (params) => ({
//         url: "/tenant/dashboard/sales",
//         params,
//       }),
//       providesTags: ["Dashboard"],
//     }),

//     getInventoryStats: builder.query({
//       query: (params) => ({
//         url: "/tenant/dashboard/inventory",
//         params,
//       }),
//       providesTags: ["Dashboard"],
//     }),

//     // ============================================
//     // 24. REPORTS
//     // ============================================
//     getSalesReport: builder.query({
//       query: (params) => ({
//         url: "/tenant/reports/sales",
//         params,
//       }),
//       providesTags: ["Reports"],
//     }),

//     getInventoryReport: builder.query({
//       query: (params) => ({
//         url: "/tenant/reports/inventory",
//         params,
//       }),
//       providesTags: ["Reports"],
//     }),

//     getTaxReport: builder.query({
//       query: (params) => ({
//         url: "/tenant/reports/tax",
//         params,
//       }),
//       providesTags: ["Reports"],
//     }),

//     getCustomerReport: builder.query({
//       query: (params) => ({
//         url: "/tenant/reports/customers",
//         params,
//       }),
//       providesTags: ["Reports"],
//     }),
//   }),
// });

// export const { endpoints: remoteEndpoints } = remoteApi;
