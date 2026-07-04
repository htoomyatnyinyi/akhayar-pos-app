// services/features/products/productTypes.ts
export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  stockQuantity: number;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  supplierId?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductPayload {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  categoryId?: string;
  categoryName?: string;
  supplierId?: string;
  storeId?: string;
  initialStock?: number;
  manufacturingDate?: string;
  expiryDate?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  name: string;
  price: number;
  color?: string;
  size?: string;
  weight?: number;
  costPrice: number;
  isActive?: boolean;
  sku: string;
  barcode?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  id: string;
}
// export interface Product {
//   id: string;
//   sku: string;
//   barcode?: string;
//   name: string;
//   description?: string;
//   brand?: string;
//   costPrice: number;
//   sellingPrice: number;
//   wholesalePrice: number;
//   stockQuantity: number;
//   categoryId: string;
//   category?: {
//     id: string;
//     name: string;
//   };
//   supplierId?: string;
//   createdAt: string;
// }
