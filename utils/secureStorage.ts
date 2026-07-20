import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const TENANT_ID_KEY = "tenant_id";
const USER_KEY = "user";

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveTenantId(tenantId: string): Promise<void> {
  await SecureStore.setItemAsync(TENANT_ID_KEY, tenantId);
}

export async function getTenantId(): Promise<string | null> {
  return await SecureStore.getItemAsync(TENANT_ID_KEY);
}

export async function removeTenantId(): Promise<void> {
  await SecureStore.deleteItemAsync(TENANT_ID_KEY);
}

export async function saveUser(user: any): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<any | null> {
  const data = await SecureStore.getItemAsync(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function removeUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

// import * as SecureStore from "expo-secure-store";

// const TOKEN_KEY = "auth_token";
// const TENANT_ID_KEY = "tenant_id";
// const USER_KEY = "user";

// export async function saveToken(token: string): Promise<void> {
//   await SecureStore.setItemAsync(TOKEN_KEY, token);
// }

// export async function getToken(): Promise<string | null> {
//   return await SecureStore.getItemAsync(TOKEN_KEY);
// }

// export async function removeToken(): Promise<void> {
//   await SecureStore.deleteItemAsync(TOKEN_KEY);
// }

// export async function saveTenantId(tenantId: string): Promise<void> {
//   await SecureStore.setItemAsync(TENANT_ID_KEY, tenantId);
// }

// export async function getTenantId(): Promise<string | null> {
//   return await SecureStore.getItemAsync(TENANT_ID_KEY);
// }

// export async function removeTenantId(): Promise<void> {
//   await SecureStore.deleteItemAsync(TENANT_ID_KEY);
// }

// export async function saveUser(user: any): Promise<void> {
//   await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
// }

// export async function getUser(): Promise<any | null> {
//   const data = await SecureStore.getItemAsync(USER_KEY);
//   return data ? JSON.parse(data) : null;
// }

// export async function removeUser(): Promise<void> {
//   await SecureStore.deleteItemAsync(USER_KEY);
// }
