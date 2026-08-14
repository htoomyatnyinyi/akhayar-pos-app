// export interface CartItem {
//   id: string; // Changed from number to string (Product cuid)
//   name: string;
//   price: number;
//   qty: number;
//   image?: string;
// }

// services/features/cart/cartTypes.ts

export interface CartItem {
  id: string;
  productId?: string;
  variantId?: string;
  name: string;
  price: number;
  qty: number;
  sku?: string;
  barcode?: string;
  stockQuantity?: number;
  image?: string;
}
