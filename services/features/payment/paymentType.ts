// services/features/payments/paymentTypes.ts
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method:
    | "CASH"
    | "KBZ_PAY"
    | "CB_PAY"
    | "WAVE_PAY"
    | "CARD"
    | "BANK_TRANSFER"
    | "MIXED_PAYMENT"
    | "GIFT_CARD"
    | "WALLET";
  referenceNumber?: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  orderId: string;
  amount: number;
  method: Payment["method"];
  referenceNumber?: string;
  status?: Payment["status"];
}

// // services/features/payments/paymentTypes.ts
// export interface Payment {
//   id: string;
//   orderId: string;
//   amount: number;
//   method:
//     | "CASH"
//     | "KBZ_PAY"
//     | "CB_PAY"
//     | "WAVE_PAY"
//     | "CARD"
//     | "BANK_TRANSFER"
//     | "MIXED_PAYMENT"
//     | "GIFT_CARD"
//     | "WALLET";
//   referenceNumber?: string;
//   status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreatePaymentPayload {
//   orderId: string;
//   amount: number;
//   method: Payment["method"];
//   referenceNumber?: string;
//   status?: Payment["status"];
// }
