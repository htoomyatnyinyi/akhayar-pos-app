// services/features/inventory/inventoryTypes.ts
export interface InventoryItem {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface InventoryMovement {
  id: string;
  tenantId?: string;
  storeId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "COUNT";
  referenceId: string;
  referenceType: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMovementPayload {
  storeId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  type: InventoryMovement["type"];
  referenceId: string;
  referenceType: string;
  reason?: string;
}

export interface InventoryCount {
  id: string;
  storeId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledDate?: string;
  completedAt?: string;
  notes?: string;
  items: InventoryCountItem[];
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

export interface CreateCountPayload {
  storeId: string;
  scheduledDate?: string;
  items: {
    productId: string;
    variantId?: string;
    systemQuantity: number;
    countedQuantity: number;
    reason?: string;
  }[];
}

// export interface InventoryItem {
//   id: string;
//   productId: string;
//   variantId?: string;
//   storeId: string;
//   quantity: number;
//   product?: {
//     id: string;
//     name: string;
//     sku: string;
//   };
// }

// export interface InventoryMovement {
//   id: string;
//   storeId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   type: "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT" | "COUNT";
//   referenceId: string;
//   referenceType: string;
//   reason?: string;
//   createdAt: string;
// }

// export interface InventoryCount {
//   id: string;
//   storeId: string;
//   status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
//   scheduledDate?: string;
//   completedAt?: string;
//   notes?: string;
//   createdAt: string;
// }

// export interface InventoryCountItem {
//   productId: string;
//   variantId?: string;
//   systemQuantity: number;
//   countedQuantity: number;
//   reason?: string;
// }

// export interface CreateMovementPayload {
//   storeId: string;
//   productId: string;
//   variantId?: string;
//   quantity: number;
//   type: string;
//   referenceId: string;
//   referenceType: string;
//   reason?: string;
// }

// export interface CreateCountPayload {
//   storeId: string;
//   scheduledDate?: string;
//   items: InventoryCountItem[];
// }
