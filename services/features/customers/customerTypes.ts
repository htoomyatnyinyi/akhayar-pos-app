// services/features/customers/customerTypes.ts
export interface Customer {
  tenantId: any;
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  debtAmount?: number;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  tierValidUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  code?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  debtAmount?: number;
  tier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
}

// export interface Customer {
//   tenantId: any;
//   debtAmount: number;
//   id: string;
//   code: string;
//   name: string;
//   phone?: string;
//   email?: string;
//   address?: string;
//   dateOfBirth?: string;
//   gender?: string;
//   loyaltyPoints: number;
//   totalSpent: number;
//   totalOrders: number;
//   tier: string;
//   tierValidUntil?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateCustomerPayload {
//   code: string;
//   debtAmount: number;
//   name: string;
//   phone?: string;
//   email?: string;
//   address?: string;
//   dateOfBirth?: string;
//   gender?: string;
// }
