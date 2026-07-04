// services/features/purchase-orders/purchaseOrderTypes.ts
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  status: "DRAFT" | "PENDING" | "ORDERED" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDate?: string;
  subTotal: number;
  taxAmount: number;
  grandTotal: number;
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  status?: PurchaseOrder["status"];
  orderDate?: string;
  expectedDate?: string;
  subTotal: number;
  taxAmount?: number;
  grandTotal: number;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
}

// services/features/promotions/promotionTypes.ts
export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minPurchase?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  perUserLimit?: number;
  isActive: boolean;
  productIds?: string[];
  categoryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionPayload {
  code: string;
  name: string;
  description?: string;
  discountType: Promotion["discountType"];
  discountValue: number;
  minPurchase?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  productIds?: string[];
  categoryIds?: string[];
}

// services/features/tax/taxTypes.ts
export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isCompound: boolean;
  appliesTo?: string[];
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRatePayload {
  name: string;
  rate: number;
  isCompound?: boolean;
  appliesTo?: string[];
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}
// services/features/notifications/notificationTypes.ts
export interface Notification {
  id: string;
  userId: string;
  type:
    | "LOW_STOCK"
    | "EXPIRING_PRODUCT"
    | "ORDER_STATUS"
    | "PROMOTION"
    | "SYSTEM"
    | "INVENTORY_COUNT";
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationPayload {
  userId: string;
  type: Notification["type"];
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// services/features/webhooks/webhookTypes.ts
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

// services/features/gift-cards/giftCardTypes.ts
export interface GiftCard {
  id: string;
  cardNumber: string;
  pinCode?: string;
  customerId?: string;
  balance: number;
  initialAmount: number;
  expiresAt?: string;
  status: "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface CreateGiftCardPayload {
  initialAmount: number;
  cardNumber?: string;
  pinCode?: string;
  customerId?: string;
  expiresAt?: string;
}

export interface ReloadGiftCardPayload {
  amount: number;
}

// services/features/wallets/walletTypes.ts
export interface Wallet {
  id: string;
  customerId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  amount: number;
  type: "DEPOSIT" | "WITHDRAWAL" | "PURCHASE" | "REFUND";
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface CreateWalletTransactionPayload {
  customerId: string;
  amount: number;
  type: WalletTransaction["type"];
  referenceId?: string;
  description?: string;
}

// services/features/expenses/expenseTypes.ts
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  storeId?: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  categoryId: string;
  storeId?: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  expenseDate?: string;
}

// services/features/cash-registers/cashRegisterTypes.ts
export interface CashRegister {
  id: string;
  storeId: string;
  name: string;
  status: "OPEN" | "CLOSED" | "SUSPENDED" | "MAINTENANCE";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashRegisterPayload {
  storeId: string;
  name: string;
  status?: CashRegister["status"];
}

// services/features/stock-transfers/stockTransferTypes.ts
export interface StockTransfer {
  id: string;
  fromStoreId: string;
  toStoreId: string;
  status: "PENDING" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  notes?: string;
  items: StockTransferItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  receivedQuantity?: number;
}

export interface CreateStockTransferPayload {
  fromStoreId: string;
  toStoreId: string;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
  }[];
}

// services/features/supplier-payments/supplierPaymentTypes.ts
export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "MOBILE_PAYMENT";
  referenceNumber?: string;
  note?: string;
  createdAt: string;
}

export interface CreateSupplierPaymentPayload {
  supplierId: string;
  amount: number;
  paymentMethod: SupplierPayment["paymentMethod"];
  referenceNumber?: string;
  note?: string;
}

// services/features/api-keys/apiKeyTypes.ts
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key?: string;
  permissions: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyPayload {
  userId: string;
  name: string;
  permissions?: string[];
  expiresAt?: string;
}

// services/features/store-settings/storeSettingTypes.ts
export interface StoreSetting {
  id: string;
  storeId: string;
  settingKey: string;
  settingValue: any;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreSettingPayload {
  storeId: string;
  settingKey: string;
  settingValue: any;
  description?: string;
}

// services/offline/syncTypes.ts
export interface SyncOutboxItem {
  id: string;
  entity: string;
  entityId: string;
  operation: string;
  endpoint: string;
  method: string;
  payload: any;
  status: "pending" | "synced" | "failed" | "dead";
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStats {
  outbox: {
    pending: number;
    failed: number;
    dead: number;
  };
  entities: {
    orders: number;
    products: number;
  };
}

export interface SyncStatusByEntity {
  [status: string]: number;
}

export interface SyncResult {
  success?: boolean;
  skipped?: boolean;
  message?: string;
  products?: number;
  sessions?: number;
  orders?: number;
  others?: number;
  remaining?: number;
  failed?: number;
  retried?: number;
  cleared?: number;
  error?: string;
}
// services/offline/dbTypes.ts
import { SQLiteDatabase } from "expo-sqlite";

export interface OfflineDatabase {
  db: SQLiteDatabase;
  isInitialized: boolean;
  migrations: Migration[];
}

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
  down?: (db: SQLiteDatabase) => Promise<void>;
}

// global/responseTypes.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// services/features/tenant/tenantTypes.ts
export interface Tenant {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantPayload {
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  userId?: string;
}

export interface UpdateTenantPayload {
  name?: string;
  email?: string;
  phone?: string;
  userId?: string;
  isActive?: boolean;
}
// ########

// // services/features/expenses/expenseTypes.ts
// export interface Expense {
//   id: string;
//   expenseCategoryId: string;
//   amount: number;
//   currency: string;
//   paymentMethod: string;
//   description?: string;
//   notes?: string;
//   expenseDate: string;
//   receiptUrl?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface ExpenseCategory {
//   id: string;
//   name: string;
//   description?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateExpensePayload {
//   expenseCategoryId: string;
//   amount: number;
//   currency?: string;
//   paymentMethod?: string;
//   description?: string;
//   notes?: string;
//   expenseDate?: string;
//   receiptUrl?: string;
// }

// export interface CreateExpenseCategoryPayload {
//   name: string;
//   description?: string;
//   isActive?: boolean;
// }

// // services/features/receipts/receiptTypes.ts
// export interface Receipt {
//   id: string;
//   orderId: string;
//   receiptNumber: string;
//   receiptUrl: string;
//   createdAt: string;
// }

// export interface GenerateReceiptPayload {
//   orderId: string;
//   includeDetails?: boolean;
//   template?: string;
// }

// // services/features/cash-drawer/cashDrawerTypes.ts
// export interface CashDrawer {
//   id: string;
//   cashierId: string;
//   openingBalance: number;
//   closingBalance?: number;
//   status: "OPEN" | "CLOSED";
//   openingDate: string;
//   closingDate?: string;
//   totalSales: number;
//   totalExpenses: number;
//   expectedAmount: number;
//   actualAmount?: number;
//   difference?: number;
//   notes?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface OpenCashDrawerPayload {
//   cashierId: string;
//   openingBalance: number;
// }

// export interface CloseCashDrawerPayload {
//   id: string;
//   closingBalance: number;
//   actualAmount?: number;
//   notes?: string;
// }

// // services/features/shift/shiftTypes.ts
// export interface Shift {
//   id: string;
//   storeId: string;
//   shiftCode: string;
//   openingTime: string;
//   closingTime?: string;
//   status: "OPEN" | "CLOSED";
//   openingCashierId?: string;
//   closingCashierId?: string;
//   openingBalance: number;
//   closingBalance?: number;
//   totalSales: number;
//   totalExpenses: number;
//   expectedAmount: number;
//   actualAmount?: number;
//   difference?: number;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface OpenShiftPayload {
//   storeId: string;
//   cashierId: string;
//   openingBalance: number;
// }

// export interface CloseShiftPayload {
//   id: string;
//   cashierId: string;
//   closingBalance: number;
//   actualAmount?: number;
//   notes?: string;
// }

// // services/features/sessions/sessionTypes.ts
// export interface Session {
//   id: string;
//   storeId: string;
//   userId: string;
//   sessionCode: string;
//   openingTime: string;
//   closingTime?: string;
//   status: "OPEN" | "CLOSED";
//   openingCashierId?: string;
//   closingCashierId?: string;
//   openingBalance: number;
//   closingBalance?: number;
//   totalSales: number;
//   totalExpenses: number;
//   expectedAmount: number;
//   actualAmount?: number;
//   difference?: number;
//   notes?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface OpenSessionPayload {
//   storeId: string;
//   userId: string;
//   cashierId: string;
//   openingBalance: number;
// }

// export interface CloseSessionPayload {
//   id: string;
//   cashierId: string;
//   closingBalance: number;
//   actualAmount?: number;
//   notes?: string;
// }

// // services/features/closing-reports/closingReportTypes.ts
// export interface ClosingReport {
//   id: string;
//   storeId: string;
//   reportNumber: string;
//   status: "PENDING" | "GENERATED" | "APPROVED" | "REJECTED";
//   reportDate: string;
//   generatedAt: string;
//   approvedAt?: string;
//   approvedBy?: string;
//   notes?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface GenerateClosingReportPayload {
//   storeId: string;
//   reportDate?: string;
// }

// export interface ApproveClosingReportPayload {
//   id: string;
//   approvedBy: string;
//   notes?: string;
// }

// // services/features/sync/syncTypes.ts
// export interface SyncJob {
//   id: string;
//   storeId: string;
//   tenantId: string;
//   syncType: "FULL" | "INCREMENTAL" | "PARTIAL";
//   syncDirection: "UPLOAD" | "DOWNLOAD" | "BOTH";
//   status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
//   summary?: Record<string, any>;
//   startedAt?: string;
//   completedAt?: string;
//   errorMessage?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface SyncConfig {
//   id: string;
//   storeId: string;
//   syncInterval: number;
//   lastSyncAt?: string;
//   nextSyncAt?: string;
//   syncEnabled: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateSyncJobPayload {
//   storeId: string;
//   syncType: SyncJob["syncType"];
//   syncDirection: SyncJob["syncDirection"];
//   summary?: Record<string, any>;
// }
