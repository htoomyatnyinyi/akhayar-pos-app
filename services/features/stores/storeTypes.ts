export interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStorePayload {
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  isActive?: boolean;
}
