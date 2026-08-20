import type { User } from "@/services/features/auth/authTypes";

export type AppPermission =
  | "VIEW_REPORTS"
  | "EDIT_PRICES"
  | "VOID_ORDERS"
  | "MANAGE_STAFF"
  | "MANAGE_INVENTORY"
  | "REFUND_ORDERS"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_PROMOTIONS"
  | "VIEW_ANALYTICS"
  | "MANAGE_API_KEYS"
  | "MANAGE_WEBHOOKS";

export function hasPermission(
  user: User | null | undefined,
  permission: AppPermission,
) {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  const assigned = Array.isArray(user.permissions) ? user.permissions : [];
  return assigned.includes(permission);
}

export function hasAnyPermission(
  user: User | null | undefined,
  permissions: AppPermission[],
) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function canUseSessions(user: User | null | undefined) {
  return user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "CASHIER";
}

export function canCreateOrders(user: User | null | undefined) {
  return user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "CASHIER";
}
