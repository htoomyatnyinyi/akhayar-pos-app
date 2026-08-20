Implemented full permission enforcement across frontend and backend.

Frontend changes:

- Added [`utils/auth/permissions.ts`](/Users/htoomyatnyinyi/Desktop/test_pos/akhayar_project/akhayar-pos-app/utils/auth/permissions.ts)
  - `hasPermission`
  - `hasAnyPermission`
  - `canUseSessions`
  - `canCreateOrders`
- Manage tab now requires `MANAGE_STAFF` or `MANAGE_INVENTORY`.
- Dashboard now requires `VIEW_REPORTS` or `VIEW_ANALYTICS`.
- Manage modules are filtered by permission.
- Staff/store actions require `MANAGE_STAFF`.
- Product/catalog actions require `MANAGE_INVENTORY` or `EDIT_PRICES`.
- Inventory adjustments, movements, allocation, and product creation require `MANAGE_INVENTORY`.
- Order cancellation requires `REFUND_ORDERS`.
- Order voiding requires `VOID_ORDERS`.
- Session open/close is limited to `ADMIN`, `MANAGER`, and `CASHIER`.
- POS checkout is limited to `ADMIN`, `MANAGER`, and `CASHIER`.
- Managers cannot assign staff permissions they do not personally have.

Backend changes in `../pos_server`:

- Added strict permission lookup and guards in [`src/lib/security.ts`](/Users/htoomyatnyinyi/Desktop/test_pos/akhayar_project/pos_server/src/lib/security.ts).
- Added `requirePermission`.
- Added `requireAnyPermission`.
- Added delegated-permission protection for staff management.
- Protected:
  - Products
  - Product stock allocation
  - Inventory movements
  - Brands
  - Categories
  - Suppliers
  - Stores
  - Staff
  - Order void/cancel actions
  - Session open/close
- Completing an order remains available to cashiers.
- Empty custom permission lists now fail closed instead of automatically receiving role defaults.
- `ADMIN` and `SUPER_ADMIN` bypass individual permission checks.

Validation:

- Frontend ESLint has no new errors; only existing warnings remain.
- `git diff --check` passes for both projects.
- Backend typecheck could not be executed because the backend has no installed TypeScript binary/node modules in this workspace.,
