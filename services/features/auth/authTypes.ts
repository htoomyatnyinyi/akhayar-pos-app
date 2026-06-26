export interface Tenant {
  id: string;
  code: string;
  name: string;
}

export interface AuthStore {
  id: string;
  name: string;
  code?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
  role: "ADMIN" | "MANAGER" | "CASHIER" | "ACCOUNTANT";
  permissions: string[];
  stores: AuthStore[];
  tenantId: string;
  tenant?: Tenant;
  emailVerified?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  tenantCode?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  tenantName: string;
  tenantCode?: string;
}

export interface VerifyEmailPayload {
  code: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
}

export interface AuthApiUser {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  tenantId: string;
  emailVerified?: boolean;
  userPermissions?: { permission: string }[];
  stores?: Array<{
    storeId: string;
    isPrimary?: boolean;
    store?: AuthStore;
  }>;
  tenant?: Tenant;
}

export interface AuthSuccessResponse {
  success: true;
  user: AuthApiUser;
  token: string;
  message?: string;
}

export interface AuthMeResponse {
  success: true;
  user: AuthApiUser;
}
