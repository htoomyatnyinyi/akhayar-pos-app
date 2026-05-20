import { CartItem } from "../cart/cartTypes";

export interface Order {
  id: string; // Changed from number to string (cuid)
  grandTotal: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  product: {
    name: string;
    sellingPrice: string;
  };
  productId: string;
}

export interface CreateOrderPayload {
  subTotal: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  paymentMethod: "CASH" | "KBZ_PAY" | "CB_PAY" | "WAVE_PAY" | "CARD" | "MIXED_PAYMENT";
  paidAmount: number;
  changeAmount: number;
  paymentStatus?: string;
  userId: string;
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    subTotal: number;
  }[];
}
