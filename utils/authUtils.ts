// services/features/auth/authUtils.ts

import { User } from "@/services/features/auth/authTypes";

export function normalizeAuthUser(user: User, token: string): User {
  return {
    ...user,
    token,
    stores: user.stores || [],
    tenant: user.tenant || undefined,
  };
}
