// services/features/categories/categoryTypes.ts
export interface Category {
  tenantId: any;
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  storeId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  storeId?: string;
  isActive?: boolean;
  sortOrder?: number;
}
// export interface Category {
//   tenantId: any;
//   id: string;
//   name: string;
//   slug: string;
//   description?: string;
//   parentId?: string;
//   isActive: boolean;
//   sortOrder: number;
//   createdAt: string;
//   updatedAt: string;
//   storeId?: string;
// }

// export interface CreateCategoryPayload {
//   name: string;
//   slug: string;
//   description?: string;
//   parentId?: string;
//   isActive?: boolean;
//   sortOrder?: number;
// }
