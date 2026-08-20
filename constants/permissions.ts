// constants/permissions.ts
export const STAFF_PERMISSIONS = [
  ["VIEW_REPORTS", "View reports"],
  ["EDIT_PRICES", "Edit prices"],
  ["VOID_ORDERS", "Void orders"],
  ["MANAGE_STAFF", "Manage staff"],
  ["MANAGE_INVENTORY", "Manage inventory"],
  ["REFUND_ORDERS", "Refund orders"],
  ["VIEW_AUDIT_LOGS", "View audit logs"],
  ["MANAGE_PROMOTIONS", "Manage promotions"],
  ["VIEW_ANALYTICS", "View analytics"],
  ["MANAGE_API_KEYS", "Manage API keys"],
  ["MANAGE_WEBHOOKS", "Manage webhooks"],
] as const;

export function getDefaultPermissions(role: string): string[] {
  const all = [
    "VIEW_REPORTS",
    "EDIT_PRICES",
    "VOID_ORDERS",
    "MANAGE_STAFF",
    "MANAGE_INVENTORY",
    "REFUND_ORDERS",
    "VIEW_AUDIT_LOGS",
    "MANAGE_PROMOTIONS",
    "VIEW_ANALYTICS",
    "MANAGE_API_KEYS",
    "MANAGE_WEBHOOKS",
  ];
  const permissions: Record<string, string[]> = {
    ADMIN: all,
    MANAGER: [
      "VIEW_REPORTS",
      "EDIT_PRICES",
      "VOID_ORDERS",
      "MANAGE_INVENTORY",
      "REFUND_ORDERS",
      "MANAGE_PROMOTIONS",
      "VIEW_ANALYTICS",
    ],
    CASHIER: ["VIEW_REPORTS"],
    ACCOUNTANT: ["VIEW_REPORTS", "VIEW_ANALYTICS"],
  };
  return permissions[role] || [];
}
