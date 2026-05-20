export interface Staff {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateStaffPayload {
  username: string;
  email?: string;
  name: string;
  password?: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT';
  permissions: string[];
  isActive?: boolean;
}
