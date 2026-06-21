export interface Order {
  id: string;
  grandTotal: number;
  status: string;
  items: OrderItem[];
  createdAt: string;
  subTotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  paidAmount?: number;
  changeAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentBreakdown?: PaymentBreakdownItem[];
  customerId?: string;
  storeId?: string;
  userId?: string;
}

export interface PaymentBreakdownItem {
  method: "CASH" | "KBZ_PAY" | "CB_PAY" | "WAVE_PAY" | "CARD";
  amount: number;
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
  paymentBreakdown?: PaymentBreakdownItem[];
  userId: string;
  customerId?: string;
  sessionId?: string;
  storeId?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    subTotal: number;
  }[];
}
