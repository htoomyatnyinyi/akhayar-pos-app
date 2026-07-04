// constants/entity.ts
export enum EntityType {
  PRODUCT = "products",
  SESSION = "sessions",
  ORDER = "orders",
  CATEGORY = "categories",
  CUSTOMER = "customers",
  STORE = "stores",
  INVENTORY = "inventory",
  STAFF = "staff",
  RETURN = "returns",
  PURCHASE_ORDER = "purchase_orders",
  STOCK_TRANSFER = "stock_transfers",
  PROMOTION = "promotions",
  NOTIFICATION = "notifications",
  EXPENSE = "expenses",
  GIFT_CARD = "gift_cards",
  WALLET = "wallets",
}

export enum EntityOperation {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  OPEN = "open",
  CLOSE = "close",
  COMPLETE = "complete",
  VOID = "void",
  //   RESTOCK = "restock",
}

export enum SyncStatus {
  PENDING = "pending",
  SYNCED = "synced",
  FAILED = "failed",
  DEAD = "dead",
}
