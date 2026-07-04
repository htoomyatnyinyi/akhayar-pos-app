// services/features/returns/returnTypes.ts
export interface Return {
  id: string;
  orderId: string;
  customerId?: string;
  totalAmount: number;
  refundMethod: "CASH" | "BANK_TRANSFER" | "WALLET" | "GIFT_CARD";
  refundStatus: "PENDING" | "COMPLETED" | "FAILED";
  reason: string;
  items: ReturnItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  orderItemId: string;
  quantity: number;
  refundAmount: number;
  reason?: string;
}

export interface CreateReturnPayload {
  orderId: string;
  customerId?: string;
  totalAmount: number;
  refundMethod: Return["refundMethod"];
  refundStatus?: Return["refundStatus"];
  reason: string;
  items: {
    orderItemId: string;
    quantity: number;
    refundAmount: number;
    reason?: string;
  }[];
}
