// ============================================
// FILE: services/features/inventory/inventoryTypes.ts
// ============================================

import { Product, ProductVariant } from "../products/productTypes";
import { Store } from "../stores/storeTypes";

export interface Inventory {
  id: string;
  tenantId: string;
  storeId: string;
  store?: Store;
  productId: string;
  product?: Product;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  reservedQty: number;
  reorderPoint: number;
  reorderQty: number;
  shelfLocation?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  variantId?: string;
  quantity: number;
  reservedQty: number;
  reorderPoint: number;
  reorderQty: number;
  shelfLocation?: string;
  version: number;
  product: {
    id: string;
    name: string;
    sku: string;
    sellingPrice?: number;
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
    price: number;
  };
}

export interface InventoryMovement {
  id: string;
  tenantId: string;
  storeId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  type: "IN" | "OUT" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT" | "COUNT";
  referenceId: string;
  referenceType: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCount {
  id: string;
  tenantId: string;
  storeId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledDate?: string;
  completedAt?: string;
  notes?: string;
  items?: InventoryCountItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCountItem {
  id: string;
  countId: string;
  productId: string;
  variantId?: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  reason?: string;
  createdAt: string;
}

export interface CreateMovementPayload {
  /** Stable idempotency key for offline retries. */
  clientMovementId?: string;
  tenantId: string;
  storeId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  type: "IN" | "OUT" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUSTMENT" | "COUNT";
  referenceId: string;
  referenceType: string;
  reason?: string;
}

export interface CreateCountPayload {
  tenantId: string;
  storeId: string;
  scheduledDate?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    systemQuantity: number;
    countedQuantity: number;
    reason?: string;
  }>;
}

export interface UpdateInventoryPayload {
  productId: string;
  variantId?: string;
  storeId: string;
  quantity: number;
  reservedQty?: number;
  reorderPoint?: number;
  reorderQty?: number;
  shelfLocation?: string;
}

// // services/features/inventory/inventoryTypes.ts
// export interface InventoryItem {
//   id: string;
//   productId: string;
//   storeId: string;
//   quantity: number;
//   product: {
//     id: string;
//     name: string;
//     sku: string;
//   };
// }

// export interface InventoryMovement {
//   id: string;
//   tenantId?: string;
//   storeId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "COUNT";
//   referenceId: string;
//   referenceType: string;
//   reason?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateMovementPayload {
//   storeId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   type: InventoryMovement["type"];
//   referenceId: string;
//   referenceType: string;
//   reason?: string;
// }

// export interface InventoryCount {
//   id: string;
//   storeId: string;
//   status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
//   scheduledDate?: string;
//   completedAt?: string;
//   notes?: string;
//   items: InventoryCountItem[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface InventoryCountItem {
//   id: string;
//   countId: string;
//   productId: string;
//   variantId?: string;
//   systemQuantity: number;
//   countedQuantity: number;
//   difference: number;
//   reason?: string;
//   createdAt: string;
// }

// export interface CreateCountPayload {
//   storeId: string;
//   scheduledDate?: string;
//   items: {
//     productId: string;
//     variantId?: string;
//     systemQuantity: number;
//     countedQuantity: number;
//     reason?: string;
//   }[];
// }

// // export interface InventoryItem {
// //   id: string;
// //   productId: string;
// //   variantId?: string;
// //   storeId: string;
// //   quantity: number;
// //   product?: {
// //     id: string;
// //     name: string;
// //     sku: string;
// //   };
// // }

// // export interface InventoryMovement {
// //   id: string;
// //   storeId: string;
// //   productId: string;
// //   variantId?: string;
// //   quantity: number;
// //   type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "COUNT";
// //   referenceId: string;
// //   referenceType: string;
// //   reason?: string;
// //   createdAt: string;
// // }

// // export interface InventoryCount {
// //   id: string;
// //   storeId: string;
// //   status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
// //   scheduledDate?: string;
// //   completedAt?: string;
// //   notes?: string;
// //   createdAt: string;
// // }

// // export interface InventoryCountItem {
// //   productId: string;
// //   variantId?: string;
// //   systemQuantity: number;
// //   countedQuantity: number;
// //   reason?: string;
// // }

// // export interface CreateMovementPayload {
// //   storeId: string;
// //   productId: string;
// //   variantId?: string;
// //   quantity: number;
// //   type: string;
// //   referenceId: string;
// //   referenceType: string;
// //   reason?: string;
// // }

// // export interface CreateCountPayload {
// //   storeId: string;
// //   scheduledDate?: string;
// //   items: InventoryCountItem[];
// // }
