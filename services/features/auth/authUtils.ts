import type { AuthApiUser, User } from "./authTypes";

export function normalizeAuthUser(apiUser: AuthApiUser, token: string): User {
  const stores = (apiUser.stores ?? []).map((entry) => ({
    id: entry.store?.id ?? entry.storeId,
    name: entry.store?.name ?? "Store",
    code: entry.store?.code,
  }));

  const primaryEntry = (apiUser.stores ?? []).find((entry) => entry.isPrimary);
  const primaryId = primaryEntry?.store?.id ?? primaryEntry?.storeId;
  const orderedStores = primaryId
    ? [
        ...stores.filter((store) => store.id === primaryId),
        ...stores.filter((store) => store.id !== primaryId),
      ]
    : stores;

  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    token,
    role: apiUser.role,
    tenantId: apiUser.tenantId,
    tenant: apiUser.tenant,
    emailVerified: apiUser.emailVerified,
    permissions: (apiUser.userPermissions ?? []).map((entry) => entry.permission),
    stores: orderedStores,
  };
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string } }).data;
    if (data?.message) return data.message;
  }

  return fallback;
}

export function slugifyTenantCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}
