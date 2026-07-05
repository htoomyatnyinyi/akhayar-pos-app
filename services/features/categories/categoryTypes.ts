// ============================================
// FILE: services/features/categories/categoryTypes.ts
// ============================================

import { Product } from "../products/productTypes";

export interface Category {
  remoteId: any;
  id: string;
  tenantId: string;
  storeId: any;
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

export interface CreateCategoryPayload {
  tenantId: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {
  id: string;
}

// // services/features/categories/categoryTypes.ts
// export interface Category {
//   tenantId: any;
//   id: string;
//   name: string;
//   slug: string;
//   description?: string;
//   parentId?: string;
//   storeId?: string;
//   isActive: boolean;
//   sortOrder: number;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateCategoryPayload {
//   name: string;
//   slug?: string;
//   description?: string;
//   parentId?: string;
//   storeId?: string;
//   isActive?: boolean;
//   sortOrder?: number;
// }
// // export interface Category {
// //   tenantId: any;
// //   id: string;
// //   name: string;
// //   slug: string;
// //   description?: string;
// //   parentId?: string;
// //   isActive: boolean;
// //   sortOrder: number;
// //   createdAt: string;
// //   updatedAt: string;
// //   storeId?: string;
// // }

// // export interface CreateCategoryPayload {
// //   name: string;
// //   slug: string;
// //   description?: string;
// //   parentId?: string;
// //   isActive?: boolean;
// //   sortOrder?: number;
// // }
