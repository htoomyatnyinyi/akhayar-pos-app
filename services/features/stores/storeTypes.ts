// services/features/stores/storeTypes.ts
export interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  tenantId?: string;
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

// export interface Store {
//   tenantId: any;
//   id: string;
//   code: string;
//   name: string;
//   address?: string;
//   phone?: string;
//   email?: string;
//   taxNumber?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// export interface CreateStorePayload {
//   code?: string;
//   name: string;
//   address?: string;
//   phone?: string;
//   email?: string;
//   taxNumber?: string;
//   isActive?: boolean;
// }
// //
