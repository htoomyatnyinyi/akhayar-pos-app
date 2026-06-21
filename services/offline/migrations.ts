import { getSqliteDatabase } from "./db";

const migrations = [
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL, tenant_id TEXT, store_id TEXT, sku TEXT NOT NULL,
    barcode TEXT, name TEXT NOT NULL, description TEXT, brand TEXT, category_id TEXT,
    category_name TEXT, supplier_id TEXT, cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0, stock_quantity INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
    deleted_at TEXT, sync_status TEXT NOT NULL DEFAULT 'synced', sync_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `ALTER TABLE products ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';`,
  `ALTER TABLE products ADD COLUMN sync_error TEXT;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku_idx ON products (tenant_id, sku);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_barcode_idx ON products (tenant_id, barcode);`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL, remote_id TEXT UNIQUE, tenant_id TEXT, store_id TEXT,
    name TEXT NOT NULL, slug TEXT NOT NULL, description TEXT, parent_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'synced', sync_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL, remote_id TEXT UNIQUE, tenant_id TEXT, code TEXT NOT NULL,
    name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, date_of_birth TEXT,
    gender TEXT, loyalty_points INTEGER NOT NULL DEFAULT 0, total_spent REAL NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0, tier TEXT NOT NULL DEFAULT 'BRONZE',
    tier_valid_until TEXT, is_active INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'synced', sync_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY NOT NULL, remote_id TEXT UNIQUE, tenant_id TEXT, code TEXT NOT NULL,
    name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT, tax_number TEXT,
    is_active INTEGER NOT NULL DEFAULT 1, sync_status TEXT NOT NULL DEFAULT 'synced',
    sync_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL, remote_id TEXT UNIQUE, tenant_id TEXT, store_id TEXT,
    user_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN',
    opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TEXT,
    opening_balance REAL NOT NULL DEFAULT 0, closing_balance REAL, expected_balance REAL,
    discrepancy REAL, cash_sales REAL NOT NULL DEFAULT 0, card_sales REAL NOT NULL DEFAULT 0,
    digital_sales REAL NOT NULL DEFAULT 0, notes TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced', sync_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY NOT NULL, remote_id TEXT UNIQUE, tenant_id TEXT, store_id TEXT,
    user_id TEXT NOT NULL, customer_id TEXT, session_id TEXT, order_number TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', payment_status TEXT NOT NULL DEFAULT 'PENDING',
    payment_method TEXT NOT NULL, sub_total REAL NOT NULL, tax_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0, grand_total REAL NOT NULL, paid_amount REAL NOT NULL DEFAULT 0,
    change_amount REAL NOT NULL DEFAULT 0, sync_status TEXT NOT NULL DEFAULT 'pending',
    sync_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, product_name TEXT, quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL, discount_amount REAL NOT NULL DEFAULT 0,
    sub_total REAL NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);`,
  `CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
    operation TEXT NOT NULL, endpoint TEXT NOT NULL, method TEXT NOT NULL,
    payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS sync_outbox_status_next_idx ON sync_outbox(status, next_attempt_at);`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    entity TEXT PRIMARY KEY NOT NULL, cursor TEXT, last_pulled_at TEXT,
    last_pushed_at TEXT, last_error TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS generic_records (
    id TEXT PRIMARY KEY NOT NULL, remote_id TEXT, entity TEXT NOT NULL,
    data TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1,
    sync_status TEXT NOT NULL DEFAULT 'synced', sync_error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_synced_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS generic_records_entity_idx ON generic_records(entity, is_active);`,
];

export function migrateOfflineDatabase() {
  const sqlite = getSqliteDatabase();
  sqlite.withTransactionSync(() => {
    for (const migration of migrations) {
      try {
        sqlite.execSync(migration);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes("duplicate column")) {
          throw error;
        }
      }
    }
  });
}
