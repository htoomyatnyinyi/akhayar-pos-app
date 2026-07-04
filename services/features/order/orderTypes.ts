// services/features/order/orderTypes.ts
export interface Order {
  id: string;
  orderNumber?: string;
  storeId?: string;
  registerId?: string;
  userId: string;
  customerId?: string;
  sessionId?: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "VOIDED" | "REFUNDED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paymentMethod:
    | "CASH"
    | "KBZ_PAY"
    | "CB_PAY"
    | "WAVE_PAY"
    | "CARD"
    | "BANK_TRANSFER"
    | "MIXED_PAYMENT"
    | "GIFT_CARD"
    | "WALLET";
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentBreakdown?: PaymentBreakdown[];
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  quantity: number;
  price: number;
  discountAmount?: number;
  product: {
    name: string;
    sellingPrice: string;
  };
}

export interface PaymentBreakdown {
  method: string;
  amount: number;
  referenceNumber?: string;
}

export interface CreateOrderPayload {
  storeId?: string;
  registerId?: string;
  userId: string;
  customerId?: string;
  sessionId?: string;
  paymentMethod: string;
  paymentStatus?: string;
  subTotal: number;
  taxAmount?: number;
  discountAmount?: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentBreakdown?: PaymentBreakdown[];
  items: CreateOrderItemPayload[];
}

export interface CreateOrderItemPayload {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  subTotal: number;
}

export interface UpdateOrderStatusPayload {
  status: Order["status"];
}

// export interface Order {
//   id: string;
//   grandTotal: number;
//   status: string;
//   items: OrderItem[];
//   createdAt: string;
//   subTotal?: number;
//   taxAmount?: number;
//   discountAmount?: number;
//   paidAmount?: number;
//   changeAmount?: number;
//   paymentMethod?: string;
//   paymentStatus?: string;
//   paymentBreakdown?: PaymentBreakdownItem[];
//   customerId?: string;
//   storeId?: string;
//   userId?: string;
// }

// export interface PaymentBreakdownItem {
//   method: "CASH" | "KBZ_PAY" | "CB_PAY" | "WAVE_PAY" | "CARD";
//   amount: number;
// }

// export interface OrderItem {
//   id: string;
//   productName: string;
//   price: number;
//   quantity: number;
//   product: {
//     name: string;
//     sellingPrice: string;
//   };
//   productId: string;
// }

// export interface CreateOrderPayload {
//   subTotal: number;
//   taxAmount?: number;
//   discountAmount?: number;
//   grandTotal: number;
//   paymentMethod:
//     | "CASH"
//     | "KBZ_PAY"
//     | "CB_PAY"
//     | "WAVE_PAY"
//     | "CARD"
//     | "MIXED_PAYMENT";
//   paidAmount: number;
//   changeAmount: number;

//   paymentStatus?: string;
//   paymentBreakdown?: PaymentBreakdownItem[];
//   userId: string;
//   customerId?: string;
//   sessionId?: string;
//   storeId?: string;
//   items: {
//     productId: string;
//     quantity: number;
//     unitPrice: number;
//     discountAmount?: number;
//     subTotal: number;
//   }[];
// }
