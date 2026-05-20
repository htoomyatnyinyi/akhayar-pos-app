export interface Customer {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
  tier: string;
  tierValidUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
}
