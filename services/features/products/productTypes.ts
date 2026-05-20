export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  supplierId?: string;
  createdAt: string;
}
