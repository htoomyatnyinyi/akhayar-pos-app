import { eq } from "drizzle-orm";
import { getOfflineDb } from "./db";
import {
  customers,
  orders,
  productVariants,
  products,
  sessions,
  stores,
} from "./schema";

export type RemoteEntityTable =
  | "sessions"
  | "stores"
  | "products"
  | "product_variants"
  | "customers"
  | "orders";

const TABLE_MAP = {
  sessions,
  stores,
  products,
  product_variants: productVariants,
  customers,
  orders,
} as const;

/** Local IDs are generated as `{prefix}_{timestamp}_{random}`. */
const LOCAL_ID_PATTERN =
  /^(ses|ord|cus|store|brn|cat|mov|cnt|outbox|var|stf|sup|item|ph)_[a-z0-9]+_[a-z0-9]+$/i;

export function isLocalId(id: string): boolean {
  return LOCAL_ID_PATTERN.test(id);
}

/**
 * Resolve a local entity ID to the remote/server ID used by the API.
 * Throws if the entity exists locally but has not been synced yet.
 */
export async function resolveRemoteId(
  table: RemoteEntityTable,
  localId: string,
  options: { required?: boolean } = {},
): Promise<string | undefined> {
  const { required = true } = options;
  if (!localId) {
    if (required) throw new Error(`Missing ${table} id`);
    return undefined;
  }

  if (!isLocalId(localId)) {
    return localId;
  }

  const tbl = TABLE_MAP[table];
  const [row] = await getOfflineDb()
    .select({ id: tbl.id, remoteId: tbl.remoteId, syncStatus: tbl.syncStatus })
    .from(tbl)
    .where(eq(tbl.id, localId))
    .limit(1);

  if (!row) {
    return localId;
  }

  if (row.remoteId) {
    return row.remoteId;
  }

  if (row.syncStatus === "synced") {
    return row.id;
  }

  throw new Error(`${table} ${localId} is not synced yet`);
}

export async function resolveOptionalRemoteId(
  table: RemoteEntityTable,
  localId?: string | null,
): Promise<string | undefined> {
  if (!localId) return undefined;
  return resolveRemoteId(table, localId, { required: false });
}
