export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
  paymentTerms?: number;
  creditLimit?: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  code?: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive?: boolean;
  paymentTerms?: number;
  creditLimit?: number;
}
