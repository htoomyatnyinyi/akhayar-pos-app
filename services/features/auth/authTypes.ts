export interface User {
  id: string; 
  name: string;
  email: string;
  token: string;
  role: "ADMIN" | "MANAGER" | "CASHIER" | "ACCOUNTANT";
  permissions: string[];
  stores: any[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}
