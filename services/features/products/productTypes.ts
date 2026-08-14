// ============================================
// FILE: services/features/products/productTypes.ts
// ============================================

import { Inventory } from "../inventory/inventoryTypes";

export interface Product {
  id: string;
  remoteId?: string;
  name: string;
  description?: string;
  brand?: string;
  sku: string;
  barcode?: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  promoPrice?: number;
  promoStartAt?: string;
  promoEndAt?: string;
  isTaxable: boolean;
  isActive: boolean;
  isReturnable: boolean;
  expiryDate?: string;
  manufacturingDate?: string;
  bestBeforeDate?: string;
  categoryId: string;
  category?: Category;
  supplierId?: string;
  tenantId: string;
  deletedAt?: string;
  version: number;
  variants?: ProductVariant[];
  inventory?: Inventory[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  productId: string;
  product?: Product;
  tenantId: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice: number;
  color?: string;
  size?: string;
  weight?: number;
  isActive: boolean;
  inventory?: Inventory[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isActive: boolean;
  sortOrder: number;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  tenantId: string;
  name: string;
  description?: string;
  brand?: string;
  sku: string;
  barcode?: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  promoPrice?: number;
  promoStartAt?: string;
  promoEndAt?: string;
  isTaxable?: boolean;
  isActive?: boolean;
  isReturnable?: boolean;
  expiryDate?: string;
  manufacturingDate?: string;
  bestBeforeDate?: string;
  categoryId: string;
  supplierId?: string;
  storeId?: string;
  initialStock?: number;
  userId?: string;
  variants?: CreateVariantPayload[];
}

export interface CreateVariantPayload {
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice: number;
  color?: string;
  size?: string;
  weight?: number;
  isActive?: boolean;
  initialStock?: number;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  id: string;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  brand?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  storeId?: string;
  tenantId?: string;
}

// ============================================
// FILE: services/features/priceHistory/priceHistoryTypes.ts
// ============================================

export interface PriceHistory {
  id: string;
  tenantId: string;
  productId: string;
  product?: Product;
  variantId?: string;
  variant?: ProductVariant;
  oldPrice: number;
  newPrice: number;
  changedBy?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceHistoryPayload {
  tenantId: string;
  productId: string;
  variantId?: string;
  oldPrice: number;
  newPrice: number;
  changedBy?: string;
  reason?: string;
}

export interface PriceHistoryFilters {
  productId?: string;
  variantId?: string;
  startDate?: string;
  endDate?: string;
}

// // services/features/products/productTypes.ts
// export interface Product {
//   id: string;
//   sku: string;
//   barcode?: string;
//   name: string;
//   description?: string;
//   brand?: string;
//   costPrice: number;
//   sellingPrice: number;
//   wholesalePrice?: number;
//   stockQuantity: number;
//   categoryId?: string;
//   category?: {
//     id: string;
//     name: string;
//   };
//   supplierId?: string;
//   manufacturingDate?: string;
//   expiryDate?: string;
//   isActive?: boolean;
//   createdAt: string;
//   updatedAt?: string;
// }

// export interface CreateProductPayload {
//   sku: string;
//   barcode?: string;
//   name: string;
//   description?: string;
//   brand?: string;
//   costPrice: number;
//   sellingPrice: number;
//   wholesalePrice?: number;
//   categoryId?: string;
//   categoryName?: string;
//   supplierId?: string;
//   storeId?: string;
//   initialStock?: number;
//   manufacturingDate?: string;
//   expiryDate?: string;
//   variants?: ProductVariant[];
// }

// export interface ProductVariant {
//   name: string;
//   price: number;
//   color?: string;
//   size?: string;
//   weight?: number;
//   costPrice: number;
//   isActive?: boolean;
//   sku: string;
//   barcode?: string;
// }

// export interface UpdateProductPayload extends Partial<CreateProductPayload> {
//   id: string;
// }
// // export interface Product {
// //   id: string;
// //   sku: string;
// //   barcode?: string;
// //   name: string;
// //   description?: string;
// //   brand?: string;
// //   costPrice: number;
// //   sellingPrice: number;
// //   wholesalePrice: number;
// //   stockQuantity: number;
// //   categoryId: string;
// //   category?: {
// //     id: string;
// //     name: string;
// //   };
// //   supplierId?: string;
// //   createdAt: string;
// // }
