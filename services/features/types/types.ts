// /*

// // ============================================
// // FILE: services/features/types.ts
// // ============================================

// // ============================================
// // PRODUCT TYPES
// // ============================================

// export interface Product {
//   id: string;
//   name: string;
//   description?: string;
//   brand?: string;
//   sku: string;
//   barcode?: string;
//   costPrice: number;
//   sellingPrice: number;
//   wholesalePrice?: number;
//   promoPrice?: number;
//   promoStartAt?: string;
//   promoEndAt?: string;
//   isTaxable: boolean;
//   isActive: boolean;
//   isReturnable: boolean;
//   expiryDate?: string;
//   manufacturingDate?: string;
//   bestBeforeDate?: string;
//   categoryId: string;
//   category?: Category;
//   supplierId?: string;
//   tenantId: string;
//   deletedAt?: string;
//   version: number;
//   variants?: ProductVariant[];
//   inventory?: Inventory[];
//   orderItems?: OrderItem[];
//   stockMovements?: InventoryMovement[];
//   priceHistory?: PriceHistory[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface ProductVariant {
//   id: string;
//   name: string;
//   productId: string;
//   product?: Product;
//   tenantId: string;
//   sku: string;
//   barcode?: string;
//   price: number;
//   costPrice: number;
//   color?: string;
//   size?: string;
//   weight?: number;
//   isActive: boolean;
//   inventory?: Inventory[];
//   orderItems?: OrderItem[];
//   stockMovements?: InventoryMovement[];
//   priceHistory?: PriceHistory[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface Category {
//   id: string;
//   tenantId: string;
//   name: string;
//   slug: string;
//   description?: string;
//   parentId?: string;
//   parent?: Category;
//   children?: Category[];
//   isActive: boolean;
//   sortOrder: number;
//   products?: Product[];
//   createdAt: string;
//   updatedAt: string;
// }

// // ============================================
// // PRODUCT PAYLOAD TYPES
// // ============================================

// export interface CreateProductPayload {
//   tenantId: string;
//   name: string;
//   description?: string;
//   brand?: string;
//   sku: string;
//   barcode?: string;
//   costPrice: number;
//   sellingPrice: number;
//   wholesalePrice?: number;
//   promoPrice?: number;
//   promoStartAt?: string;
//   promoEndAt?: string;
//   isTaxable?: boolean;
//   isActive?: boolean;
//   isReturnable?: boolean;
//   expiryDate?: string;
//   manufacturingDate?: string;
//   bestBeforeDate?: string;
//   categoryId: string;
//   categoryName?: string;
//   supplierId?: string;
//   storeId?: string;
//   initialStock?: number;
//   userId?: string;
//   variants?: CreateVariantPayload[];
// }

// export interface CreateVariantPayload {
//   name: string;
//   sku: string;
//   barcode?: string;
//   price: number;
//   costPrice: number;
//   color?: string;
//   size?: string;
//   weight?: number;
//   isActive?: boolean;
//   initialStock?: number;
// }

// export interface UpdateProductPayload extends Partial<CreateProductPayload> {
//   id: string;
// }

// export interface ProductFilters {
//   search?: string;
//   categoryId?: string;
//   brand?: string;
//   isActive?: boolean;
//   minPrice?: number;
//   maxPrice?: number;
//   storeId?: string;
//   tenantId?: string;
// }

// export interface CreateCategoryPayload {
//   tenantId: string;
//   name: string;
//   slug?: string;
//   description?: string;
//   parentId?: string;
//   isActive?: boolean;
//   sortOrder?: number;
// }

// export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {
//   id: string;
// }

// // ============================================
// // INVENTORY TYPES
// // ============================================

// export interface Inventory {
//   id: string;
//   tenantId: string;
//   storeId: string;
//   store?: Store;
//   productId: string;
//   product?: Product;
//   variantId?: string;
//   variant?: ProductVariant;
//   quantity: number;
//   reservedQty: number;
//   reorderPoint: number;
//   reorderQty: number;
//   shelfLocation?: string;
//   version: number;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface InventoryItem {
//   id: string;
//   productId: string;
//   storeId: string;
//   variantId?: string;
//   quantity: number;
//   reservedQty: number;
//   reorderPoint: number;
//   reorderQty: number;
//   shelfLocation?: string;
//   version: number;
//   product: {
//     id: string;
//     name: string;
//     sku: string;
//     sellingPrice?: number;
//     costPrice?: number;
//   };
//   variant?: {
//     id: string;
//     name: string;
//     sku: string;
//     price: number;
//     costPrice: number;
//   };
//   store?: {
//     id: string;
//     name: string;
//     code: string;
//   };
// }

// export interface InventoryMovement {
//   id: string;
//   tenantId: string;
//   storeId: string;
//   store?: Store;
//   productId: string;
//   product?: Product;
//   variantId?: string;
//   variant?: ProductVariant;
//   quantity: number;
//   type: InventoryMovementType;
//   referenceId: string;
//   referenceType: string;
//   reason?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export type InventoryMovementType =
//   | 'IN'
//   | 'OUT'
//   | 'TRANSFER_IN'
//   | 'TRANSFER_OUT'
//   | 'ADJUSTMENT'
//   | 'COUNT';

// export interface InventoryCount {
//   id: string;
//   tenantId: string;
//   storeId: string;
//   store?: Store;
//   status: InventoryCountStatus;
//   scheduledDate?: string;
//   completedAt?: string;
//   notes?: string;
//   items?: InventoryCountItem[];
//   createdAt: string;
//   updatedAt: string;
// }

// export type InventoryCountStatus =
//   | 'PENDING'
//   | 'IN_PROGRESS'
//   | 'COMPLETED'
//   | 'CANCELLED';

// export interface InventoryCountItem {
//   id: string;
//   countId: string;
//   count?: InventoryCount;
//   productId: string;
//   product?: Product;
//   variantId?: string;
//   variant?: ProductVariant;
//   systemQuantity: number;
//   countedQuantity: number;
//   difference: number;
//   reason?: string;
//   createdAt: string;
// }

// // ============================================
// // INVENTORY PAYLOAD TYPES
// // ============================================

// export interface CreateMovementPayload {
//   tenantId: string;
//   storeId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   type: InventoryMovementType;
//   referenceId: string;
//   referenceType: string;
//   reason?: string;
// }

// export interface CreateCountPayload {
//   tenantId: string;
//   storeId: string;
//   scheduledDate?: string;
//   items: Array<{
//     productId: string;
//     variantId?: string;
//     systemQuantity: number;
//     countedQuantity: number;
//     reason?: string;
//   }>;
// }

// export interface UpdateInventoryPayload {
//   productId: string;
//   variantId?: string;
//   storeId: string;
//   quantity: number;
//   reservedQty?: number;
//   reorderPoint?: number;
//   reorderQty?: number;
//   shelfLocation?: string;
// }

// // ============================================
// // PRICE HISTORY TYPES
// // ============================================

// export interface PriceHistory {
//   id: string;
//   tenantId: string;
//   productId: string;
//   product?: Product;
//   variantId?: string;
//   variant?: ProductVariant;
//   oldPrice: number;
//   newPrice: number;
//   changedBy?: string;
//   reason?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreatePriceHistoryPayload {
//   tenantId: string;
//   productId: string;
//   variantId?: string;
//   oldPrice: number;
//   newPrice: number;
//   changedBy?: string;
//   reason?: string;
// }

// export interface PriceHistoryFilters {
//   productId?: string;
//   variantId?: string;
//   startDate?: string;
//   endDate?: string;
// }

// // ============================================
// // CUSTOMER TYPES
// // ============================================

// export interface Customer {
//   id: string;
//   tenantId: string;
//   code: string;
//   name: string;
//   phone?: string;
//   email?: string;
//   address?: string;
//   dateOfBirth?: string;
//   gender?: CustomerGender;
//   debtAmount: number;
//   loyaltyPoints: number;
//   totalSpent: number;
//   totalOrders: number;
//   tier: CustomerTier;
//   tierValidUntil?: string;
//   isActive: boolean;
//   orders?: Order[];
//   createdAt: string;
//   updatedAt: string;
// }

// export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER';

// export type CustomerTier =
//   | 'BRONZE'
//   | 'SILVER'
//   | 'GOLD'
//   | 'PLATINUM'
//   | 'DIAMOND';

// export interface CreateCustomerPayload {
//   tenantId: string;
//   code?: string;
//   name: string;
//   phone?: string;
//   email?: string;
//   address?: string;
//   dateOfBirth?: string;
//   gender?: CustomerGender;
//   debtAmount?: number;
// }

// export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {
//   id: string;
// }

// // ============================================
// // STORE TYPES
// // ============================================

// export interface Store {
//   id: string;
//   tenantId: string;
//   code: string;
//   name: string;
//   address?: string;
//   phone?: string;
//   email?: string;
//   taxNumber?: string;
//   isActive: boolean;
//   inventory?: Inventory[];
//   orders?: Order[];
//   sessions?: Session[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateStorePayload {
//   tenantId: string;
//   code?: string;
//   name: string;
//   address?: string;
//   phone?: string;
//   email?: string;
//   taxNumber?: string;
//   isActive?: boolean;
// }

// export interface UpdateStorePayload extends Partial<CreateStorePayload> {
//   id: string;
// }

// // ============================================
// // SESSION TYPES
// // ============================================

// export interface Session {
//   id: string;
//   tenantId: string;
//   storeId?: string;
//   store?: Store;
//   registerId?: string;
//   userId: string;
//   user?: User;
//   status: SessionStatus;
//   openedAt: string;
//   closedAt?: string;
//   openingBalance: number;
//   closingBalance?: number;
//   expectedBalance?: number;
//   discrepancy?: number;
//   cashSales: number;
//   cardSales: number;
//   digitalSales: number;
//   notes?: string;
//   orders?: Order[];
//   createdAt: string;
//   updatedAt: string;
// }

// export type SessionStatus = 'OPEN' | 'CLOSED' | 'SUSPENDED';

// export interface OpenSessionPayload {
//   userId: string;
//   openingBalance: number;
//   storeId?: string;
//   registerId?: string;
//   notes?: string;
// }

// export interface CloseSessionPayload {
//   closingBalance: number;
//   expectedBalance: number;
//   discrepancy: number;
//   cashSales?: number;
//   cardSales?: number;
//   digitalSales?: number;
//   notes?: string;
// }

// // ============================================
// // ORDER TYPES
// // ============================================

// export interface Order {
//   id: string;
//   tenantId: string;
//   storeId?: string;
//   store?: Store;
//   registerId?: string;
//   userId: string;
//   user?: User;
//   customerId?: string;
//   customer?: Customer;
//   sessionId?: string;
//   session?: Session;
//   orderNumber?: string;
//   status: OrderStatus;
//   paymentStatus: PaymentStatus;
//   paymentMethod: PaymentMethod;
//   subTotal: number;
//   taxAmount: number;
//   discountAmount: number;
//   grandTotal: number;
//   paidAmount: number;
//   changeAmount: number;
//   paymentBreakdown?: PaymentBreakdown[];
//   items: OrderItem[];
//   createdAt: string;
//   updatedAt: string;
// }

// export type OrderStatus =
//   | 'PENDING'
//   | 'COMPLETED'
//   | 'CANCELLED'
//   | 'VOIDED'
//   | 'REFUNDED';

// export type PaymentStatus =
//   | 'PENDING'
//   | 'PAID'
//   | 'PARTIAL'
//   | 'REFUNDED'
//   | 'FAILED';

// export type PaymentMethod =
//   | 'CASH'
//   | 'CARD'
//   | 'DIGITAL'
//   | 'BANK_TRANSFER'
//   | 'CREDIT';

// export interface OrderItem {
//   id: string;
//   orderId: string;
//   order?: Order;
//   productId: string;
//   product?: Product;
//   variantId?: string;
//   variant?: ProductVariant;
//   productName?: string;
//   quantity: number;
//   unitPrice: number;
//   discountAmount: number;
//   subTotal: number;
//   createdAt: string;
// }

// export interface PaymentBreakdown {
//   method: PaymentMethod;
//   amount: number;
//   reference?: string;
// }

// // ============================================
// // ORDER PAYLOAD TYPES
// // ============================================

// export interface CreateOrderPayload {
//   tenantId: string;
//   storeId?: string;
//   registerId?: string;
//   userId: string;
//   customerId?: string;
//   sessionId?: string;
//   paymentMethod: PaymentMethod;
//   paymentStatus?: PaymentStatus;
//   subTotal: number;
//   taxAmount?: number;
//   discountAmount?: number;
//   grandTotal: number;
//   paidAmount: number;
//   changeAmount?: number;
//   paymentBreakdown?: PaymentBreakdown[];
//   items: CreateOrderItemPayload[];
// }

// export interface CreateOrderItemPayload {
//   productId: string;
//   variantId?: string;
//   productName?: string;
//   quantity: number;
//   unitPrice: number;
//   discountAmount?: number;
//   subTotal: number;
// }

// export interface UpdateOrderPayload {
//   id: string;
//   status?: OrderStatus;
//   paymentStatus?: PaymentStatus;
//   paidAmount?: number;
// }

// // ============================================
// // USER TYPES
// // ============================================

// export interface User {
//   id: string;
//   tenantId: string;
//   email: string;
//   name: string;
//   role: UserRole;
//   isActive: boolean;
//   sessions?: Session[];
//   orders?: Order[];
//   createdAt: string;
//   updatedAt: string;
// }

// export type UserRole =
//   | 'ADMIN'
//   | 'MANAGER'
//   | 'CASHIER'
//   | 'STAFF'
//   | 'VIEWER';

// // ============================================
// // TENANT TYPES
// // ============================================

// export interface Tenant {
//   id: string;
//   name: string;
//   code: string;
//   email?: string;
//   phone?: string;
//   address?: string;
//   isActive: boolean;
//   users?: User[];
//   stores?: Store[];
//   products?: Product[];
//   customers?: Customer[];
//   createdAt: string;
//   updatedAt: string;
// }

// // ============================================
// // SUPPLIER TYPES
// // ============================================

// export interface Supplier {
//   id: string;
//   tenantId: string;
//   code: string;
//   name: string;
//   contactPerson?: string;
//   phone?: string;
//   email?: string;
//   address?: string;
//   taxNumber?: string;
//   isActive: boolean;
//   products?: Product[];
//   createdAt: string;
//   updatedAt: string;
// }

// // ============================================
// // SYNC TYPES (Offline)
// // ============================================

// export interface SyncOutboxItem {
//   id: string;
//   entity: string;
//   entityId: string;
//   operation: 'create' | 'update' | 'delete' | 'open' | 'close';
//   endpoint: string;
//   method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
//   payload: any;
//   status: 'pending' | 'synced' | 'failed' | 'dead';
//   attempts: number;
//   nextAttemptAt: string;
//   lastError?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface SyncState {
//   entity: string;
//   cursor?: string;
//   lastPulledAt?: string;
//   lastPushedAt?: string;
//   lastError?: string;
// }

// export interface SyncStatus {
//   isOnline: boolean;
//   queueCount: number;
//   failedCount: number;
//   totalPending: number;
//   items: Array<{
//     id: string;
//     entity: string;
//     operation: string;
//     status: string;
//     attempts: number;
//     lastError: string | null;
//     createdAt: string;
//   }>;
//   failedItems: Array<{
//     id: string;
//     entity: string;
//     operation: string;
//     attempts: number;
//     lastError: string | null;
//     createdAt: string;
//   }>;
//   entityCounts: {
//     [entity: string]: {
//       pending: number;
//       failed: number;
//       synced: number;
//       total: number;
//     };
//   };
// }

// // ============================================
// // API RESPONSE TYPES
// // ============================================

// export interface ApiResponse<T = any> {
//   success: boolean;
//   data?: T;
//   error?: string;
//   message?: string;
//   statusCode?: number;
// }

// export interface PaginatedResponse<T> {
//   data: T[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

// export interface ApiError {
//   message: string;
//   code?: string;
//   statusCode?: number;
//   errors?: Record<string, string[]>;
// }

// // ============================================
// // COMMON FILTERS
// // ============================================

// export interface BaseFilters {
//   page?: number;
//   limit?: number;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
//   search?: string;
//   isActive?: boolean;
//   tenantId?: string;
// }

// export interface DateRangeFilters {
//   startDate?: string;
//   endDate?: string;
// }

// // ============================================
// // EXPORT ALL TYPES
// // ============================================

// export type {
//   // Product
//   Product,
//   ProductVariant,
//   Category,
//   CreateProductPayload,
//   CreateVariantPayload,
//   UpdateProductPayload,
//   ProductFilters,
//   CreateCategoryPayload,
//   UpdateCategoryPayload,

//   // Inventory
//   Inventory,
//   InventoryItem,
//   InventoryMovement,
//   InventoryMovementType,
//   InventoryCount,
//   InventoryCountStatus,
//   InventoryCountItem,
//   CreateMovementPayload,
//   CreateCountPayload,
//   UpdateInventoryPayload,

//   // Price History
//   PriceHistory,
//   CreatePriceHistoryPayload,
//   PriceHistoryFilters,

//   // Customer
//   Customer,
//   CustomerGender,
//   CustomerTier,
//   CreateCustomerPayload,
//   UpdateCustomerPayload,

//   // Store
//   Store,
//   CreateStorePayload,
//   UpdateStorePayload,

//   // Session
//   Session,
//   SessionStatus,
//   OpenSessionPayload,
//   CloseSessionPayload,

//   // Order
//   Order,
//   OrderStatus,
//   PaymentStatus,
//   PaymentMethod,
//   OrderItem,
//   PaymentBreakdown,
//   CreateOrderPayload,
//   CreateOrderItemPayload,
//   UpdateOrderPayload,

//   // User
//   User,
//   UserRole,

//   // Tenant
//   Tenant,

//   // Supplier
//   Supplier,

//   // Sync
//   SyncOutboxItem,
//   SyncState,
//   SyncStatus,

//   // API
//   ApiResponse,
//   PaginatedResponse,
//   ApiError,
//   BaseFilters,
//   DateRangeFilters,
// };
// */
// // ============================================
// // FILE: services/features/priceHistory/priceHistoryTypes.ts
// // ============================================

// export interface PriceHistory {
//   id: string;
//   tenantId: string;
//   productId: string;
//   product?: Product;
//   variantId?: string;
//   variant?: ProductVariant;
//   oldPrice: number;
//   newPrice: number;
//   changedBy?: string;
//   reason?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreatePriceHistoryPayload {
//   tenantId: string;
//   productId: string;
//   variantId?: string;
//   oldPrice: number;
//   newPrice: number;
//   changedBy?: string;
//   reason?: string;
// }

// export interface PriceHistoryFilters {
//   productId?: string;
//   variantId?: string;
//   startDate?: string;
//   endDate?: string;
// }

// // services/features/purchase-orders/purchaseOrderTypes.ts
// export interface PurchaseOrder {
//   id: string;
//   supplierId: string;
//   status: "DRAFT" | "PENDING" | "ORDERED" | "RECEIVED" | "CANCELLED";
//   orderDate: string;
//   expectedDate?: string;
//   subTotal: number;
//   taxAmount: number;
//   grandTotal: number;
//   notes?: string;
//   items: PurchaseOrderItem[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface PurchaseOrderItem {
//   id: string;
//   purchaseOrderId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   unitCost: number;
//   totalCost: number;
// }

// export interface CreatePurchaseOrderPayload {
//   supplierId: string;
//   status?: PurchaseOrder["status"];
//   orderDate?: string;
//   expectedDate?: string;
//   subTotal: number;
//   taxAmount?: number;
//   grandTotal: number;
//   notes?: string;
//   items: {
//     productId: string;
//     variantId?: string;
//     quantity: number;
//     unitCost: number;
//     totalCost: number;
//   }[];
// }

// // services/features/promotions/promotionTypes.ts
// export interface Promotion {
//   id: string;
//   code: string;
//   name: string;
//   description?: string;
//   discountType: "PERCENTAGE" | "FIXED_AMOUNT";
//   discountValue: number;
//   minPurchase?: number;
//   startDate: string;
//   endDate: string;
//   usageLimit?: number;
//   perUserLimit?: number;
//   isActive: boolean;
//   productIds?: string[];
//   categoryIds?: string[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreatePromotionPayload {
//   code: string;
//   name: string;
//   description?: string;
//   discountType: Promotion["discountType"];
//   discountValue: number;
//   minPurchase?: number;
//   startDate: string;
//   endDate: string;
//   usageLimit?: number;
//   perUserLimit?: number;
//   isActive?: boolean;
//   productIds?: string[];
//   categoryIds?: string[];
// }

// // services/features/tax/taxTypes.ts
// export interface TaxRate {
//   id: string;
//   name: string;
//   rate: number;
//   isCompound: boolean;
//   appliesTo?: string[];
//   validFrom?: string;
//   validTo?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateTaxRatePayload {
//   name: string;
//   rate: number;
//   isCompound?: boolean;
//   appliesTo?: string[];
//   validFrom?: string;
//   validTo?: string;
//   isActive?: boolean;
// }
// // services/features/notifications/notificationTypes.ts
// export interface Notification {
//   id: string;
//   userId: string;
//   type:
//     | "LOW_STOCK"
//     | "EXPIRING_PRODUCT"
//     | "ORDER_STATUS"
//     | "PROMOTION"
//     | "SYSTEM"
//     | "INVENTORY_COUNT";
//   title: string;
//   message: string;
//   isRead: boolean;
//   metadata?: Record<string, any>;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateNotificationPayload {
//   userId: string;
//   type: Notification["type"];
//   title: string;
//   message: string;
//   metadata?: Record<string, any>;
// }

// // services/features/webhooks/webhookTypes.ts
// export interface Webhook {
//   id: string;
//   name: string;
//   url: string;
//   events: string[];
//   secret?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateWebhookPayload {
//   name: string;
//   url: string;
//   events: string[];
//   secret?: string;
//   isActive?: boolean;
// }

// // services/features/gift-cards/giftCardTypes.ts
// export interface GiftCard {
//   id: string;
//   cardNumber: string;
//   pinCode?: string;
//   customerId?: string;
//   balance: number;
//   initialAmount: number;
//   expiresAt?: string;
//   status: "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateGiftCardPayload {
//   initialAmount: number;
//   cardNumber?: string;
//   pinCode?: string;
//   customerId?: string;
//   expiresAt?: string;
// }

// export interface ReloadGiftCardPayload {
//   amount: number;
// }

// // services/features/wallets/walletTypes.ts
// export interface Wallet {
//   id: string;
//   customerId: string;
//   balance: number;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface WalletTransaction {
//   id: string;
//   customerId: string;
//   amount: number;
//   type: "DEPOSIT" | "WITHDRAWAL" | "PURCHASE" | "REFUND";
//   referenceId?: string;
//   description?: string;
//   createdAt: string;
// }

// export interface CreateWalletTransactionPayload {
//   customerId: string;
//   amount: number;
//   type: WalletTransaction["type"];
//   referenceId?: string;
//   description?: string;
// }

// // services/features/expenses/expenseTypes.ts
// export interface ExpenseCategory {
//   id: string;
//   name: string;
//   description?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface Expense {
//   id: string;
//   categoryId: string;
//   storeId?: string;
//   amount: number;
//   description?: string;
//   receiptUrl?: string;
//   expenseDate: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateExpensePayload {
//   categoryId: string;
//   storeId?: string;
//   amount: number;
//   description?: string;
//   receiptUrl?: string;
//   expenseDate?: string;
// }

// // services/features/cash-registers/cashRegisterTypes.ts
// export interface CashRegister {
//   id: string;
//   storeId: string;
//   name: string;
//   status: "OPEN" | "CLOSED" | "SUSPENDED" | "MAINTENANCE";
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateCashRegisterPayload {
//   storeId: string;
//   name: string;
//   status?: CashRegister["status"];
// }

// // services/features/stock-transfers/stockTransferTypes.ts
// export interface StockTransfer {
//   id: string;
//   fromStoreId: string;
//   toStoreId: string;
//   status: "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
//   notes?: string;
//   items: StockTransferItem[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface StockTransferItem {
//   id: string;
//   transferId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   receivedQuantity?: number;
// }

// export interface CreateStockTransferPayload {
//   fromStoreId: string;
//   toStoreId: string;
//   notes?: string;
//   items: {
//     productId: string;
//     variantId?: string;
//     quantity: number;
//   }[];
// }

// // services/features/supplier-payments/supplierPaymentTypes.ts
// export interface SupplierPayment {
//   id: string;
//   supplierId: string;
//   amount: number;
//   paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "MOBILE_PAYMENT";
//   referenceNumber?: string;
//   note?: string;
//   createdAt: string;
// }

// export interface CreateSupplierPaymentPayload {
//   supplierId: string;
//   amount: number;
//   paymentMethod: SupplierPayment["paymentMethod"];
//   referenceNumber?: string;
//   note?: string;
// }

// // services/features/api-keys/apiKeyTypes.ts
// export interface ApiKey {
//   id: string;
//   userId: string;
//   name: string;
//   key?: string;
//   permissions: string[];
//   expiresAt?: string;
//   lastUsedAt?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateApiKeyPayload {
//   userId: string;
//   name: string;
//   permissions?: string[];
//   expiresAt?: string;
// }

// // services/features/store-settings/storeSettingTypes.ts
// export interface StoreSetting {
//   id: string;
//   storeId: string;
//   settingKey: string;
//   settingValue: any;
//   description?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateStoreSettingPayload {
//   storeId: string;
//   settingKey: string;
//   settingValue: any;
//   description?: string;
// }

// // services/offline/syncTypes.ts
// export interface SyncOutboxItem {
//   id: string;
//   entity: string;
//   entityId: string;
//   operation: string;
//   endpoint: string;
//   method: string;
//   payload: any;
//   status: "pending" | "synced" | "failed" | "dead";
//   attempts: number;
//   nextAttemptAt: string;
//   lastError?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface SyncStats {
//   outbox: {
//     pending: number;
//     failed: number;
//     dead: number;
//   };
//   entities: {
//     orders: number;
//     products: number;
//   };
// }

// export interface SyncStatusByEntity {
//   [status: string]: number;
// }

// export interface SyncResult {
//   success?: boolean;
//   skipped?: boolean;
//   message?: string;
//   products?: number;
//   sessions?: number;
//   orders?: number;
//   others?: number;
//   remaining?: number;
//   failed?: number;
//   retried?: number;
//   cleared?: number;
//   error?: string;
// }
// // services/offline/dbTypes.ts
// import { SQLiteDatabase } from "expo-sqlite";
// import { Product, ProductVariant } from "../products/productTypes";

// export interface OfflineDatabase {
//   db: SQLiteDatabase;
//   isInitialized: boolean;
//   migrations: Migration[];
// }

// export interface Migration {
//   version: number;
//   up: (db: SQLiteDatabase) => Promise<void>;
//   down?: (db: SQLiteDatabase) => Promise<void>;
// }

// // global/responseTypes.ts
// export interface ApiResponse<T = any> {
//   success: boolean;
//   data?: T;
//   message?: string;
//   errors?: Record<string, string[]>;
//   meta?: {
//     page: number;
//     limit: number;
//     total: number;
//     totalPages: number;
//   };
// }

// export interface PaginatedResponse<T> {
//   data: T[];
//   meta: {
//     page: number;
//     limit: number;
//     total: number;
//     totalPages: number;
//   };
// }

// // services/features/tenant/tenantTypes.ts
// export interface Tenant {
//   id: string;
//   code: string;
//   name: string;
//   email?: string;
//   phone?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateTenantPayload {
//   code?: string;
//   name: string;
//   email?: string;
//   phone?: string;
//   userId?: string;
// }

// export interface UpdateTenantPayload {
//   name?: string;
//   email?: string;
//   phone?: string;
//   userId?: string;
//   isActive?: boolean;
// }
// // ########

// // // services/features/expenses/expenseTypes.ts
// // export interface Expense {
// //   id: string;
// //   expenseCategoryId: string;
// //   amount: number;
// //   currency: string;
// //   paymentMethod: string;
// //   description?: string;
// //   notes?: string;
// //   expenseDate: string;
// //   receiptUrl?: string;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface ExpenseCategory {
// //   id: string;
// //   name: string;
// //   description?: string;
// //   isActive: boolean;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface CreateExpensePayload {
// //   expenseCategoryId: string;
// //   amount: number;
// //   currency?: string;
// //   paymentMethod?: string;
// //   description?: string;
// //   notes?: string;
// //   expenseDate?: string;
// //   receiptUrl?: string;
// // }

// // export interface CreateExpenseCategoryPayload {
// //   name: string;
// //   description?: string;
// //   isActive?: boolean;
// // }

// // // services/features/receipts/receiptTypes.ts
// // export interface Receipt {
// //   id: string;
// //   orderId: string;
// //   receiptNumber: string;
// //   receiptUrl: string;
// //   createdAt: string;
// // }

// // export interface GenerateReceiptPayload {
// //   orderId: string;
// //   includeDetails?: boolean;
// //   template?: string;
// // }

// // // services/features/cash-drawer/cashDrawerTypes.ts
// // export interface CashDrawer {
// //   id: string;
// //   cashierId: string;
// //   openingBalance: number;
// //   closingBalance?: number;
// //   status: "OPEN" | "CLOSED";
// //   openingDate: string;
// //   closingDate?: string;
// //   totalSales: number;
// //   totalExpenses: number;
// //   expectedAmount: number;
// //   actualAmount?: number;
// //   difference?: number;
// //   notes?: string;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface OpenCashDrawerPayload {
// //   cashierId: string;
// //   openingBalance: number;
// // }

// // export interface CloseCashDrawerPayload {
// //   id: string;
// //   closingBalance: number;
// //   actualAmount?: number;
// //   notes?: string;
// // }

// // // services/features/shift/shiftTypes.ts
// // export interface Shift {
// //   id: string;
// //   storeId: string;
// //   shiftCode: string;
// //   openingTime: string;
// //   closingTime?: string;
// //   status: "OPEN" | "CLOSED";
// //   openingCashierId?: string;
// //   closingCashierId?: string;
// //   openingBalance: number;
// //   closingBalance?: number;
// //   totalSales: number;
// //   totalExpenses: number;
// //   expectedAmount: number;
// //   actualAmount?: number;
// //   difference?: number;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface OpenShiftPayload {
// //   storeId: string;
// //   cashierId: string;
// //   openingBalance: number;
// // }

// // export interface CloseShiftPayload {
// //   id: string;
// //   cashierId: string;
// //   closingBalance: number;
// //   actualAmount?: number;
// //   notes?: string;
// // }

// // // services/features/sessions/sessionTypes.ts
// // export interface Session {
// //   id: string;
// //   storeId: string;
// //   userId: string;
// //   sessionCode: string;
// //   openingTime: string;
// //   closingTime?: string;
// //   status: "OPEN" | "CLOSED";
// //   openingCashierId?: string;
// //   closingCashierId?: string;
// //   openingBalance: number;
// //   closingBalance?: number;
// //   totalSales: number;
// //   totalExpenses: number;
// //   expectedAmount: number;
// //   actualAmount?: number;
// //   difference?: number;
// //   notes?: string;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface OpenSessionPayload {
// //   storeId: string;
// //   userId: string;
// //   cashierId: string;
// //   openingBalance: number;
// // }

// // export interface CloseSessionPayload {
// //   id: string;
// //   cashierId: string;
// //   closingBalance: number;
// //   actualAmount?: number;
// //   notes?: string;
// // }

// // // services/features/closing-reports/closingReportTypes.ts
// // export interface ClosingReport {
// //   id: string;
// //   storeId: string;
// //   reportNumber: string;
// //   status: "PENDING" | "GENERATED" | "APPROVED" | "REJECTED";
// //   reportDate: string;
// //   generatedAt: string;
// //   approvedAt?: string;
// //   approvedBy?: string;
// //   notes?: string;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface GenerateClosingReportPayload {
// //   storeId: string;
// //   reportDate?: string;
// // }

// // export interface ApproveClosingReportPayload {
// //   id: string;
// //   approvedBy: string;
// //   notes?: string;
// // }

// // // services/features/sync/syncTypes.ts
// // export interface SyncJob {
// //   id: string;
// //   storeId: string;
// //   tenantId: string;
// //   syncType: "FULL" | "INCREMENTAL" | "PARTIAL";
// //   syncDirection: "UPLOAD" | "DOWNLOAD" | "BOTH";
// //   status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
// //   summary?: Record<string, any>;
// //   startedAt?: string;
// //   completedAt?: string;
// //   errorMessage?: string;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface SyncConfig {
// //   id: string;
// //   storeId: string;
// //   syncInterval: number;
// //   lastSyncAt?: string;
// //   nextSyncAt?: string;
// //   syncEnabled: boolean;
// //   createdAt: string;
// //   updatedAt: string;
// // }

// // export interface CreateSyncJobPayload {
// //   storeId: string;
// //   syncType: SyncJob["syncType"];
// //   syncDirection: SyncJob["syncDirection"];
// //   summary?: Record<string, any>;
// // }
