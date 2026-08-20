Here is an analysis of how these modules are scoped in multi-store POS/ERP systems and whether they should change with the store context or remain tenant-wide (shared):

---

### 🏢 Store-Specific vs. 🌐 Organization/Tenant-Wide (Shared)

| Module                  | Store-Specific or Shared?                                                 | Why?                                                                                                                                                                                      | How it should behave in Manage                                                                                    |
| :---------------------- | :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Sessions**            | 🏪 **Store-Specific**                                                     | Cash registers and shift sessions are physical to a specific store.                                                                                                                       | Filtered by active Store Context.                                                                                 |
| **Staff**               | 🏪 **Store-Assigned**                                                     | Staff are assigned to work at specific branches (or all branches for Admins).                                                                                                             | Shows store badge; can be filtered by store.                                                                      |
| **Products & Variants** | 🌐 **Shared Catalog** (Tenant-wide)<br>_(with store-level stock/pricing)_ | The master catalog (Name, SKU, Barcode, Description) is created once for the entire business. Only **stock quantities** and optional **store price overrides** belong to specific stores. | **Shared catalog in Manage**, but when creating/editing products, defaults to the active store for initial stock. |
| **Categories**          | 🌐 **Shared (Tenant-wide)**                                               | "Beverages", "Electronics", "Clothing" apply to the whole business across all branches.                                                                                                   | **Shared across all stores**. _(Store-specific categories create duplicate clutter)._                             |
| **Brands**              | 🌐 **Shared (Tenant-wide)**                                               | Brands (e.g., "Apple", "Nike", "Coca-Cola") are universal business assets.                                                                                                                | **Shared across all stores**.                                                                                     |
| **Suppliers**           | 🌐 **Shared (Tenant-wide)**                                               | Vendor contacts and supplier contracts are managed at the business level.                                                                                                                 | **Shared across all stores**.                                                                                     |
| **Customers**           | 🌐 **Shared (Tenant-wide)**                                               | Customer loyalty, credit balance, and profiles should work across any branch the customer visits.                                                                                         | **Shared across all stores**.                                                                                     |
| **Stores**              | 🏢 **Business Infrastructure**                                            | Lists all branches of the business.                                                                                                                                                       | **Admin-only shared management**.                                                                                 |

---

### 💡 Recommendation for the Manage Screen

You **should NOT separate categories, brands, suppliers, and customers by store**, because in real-world retail/restaurant operations:

1. **No Duplicate Work:** You don't want a manager having to create "Beverages" or "Nike" 5 times for 5 different stores.
2. **Omnichannel Customers:** A customer registered at Store A should be recognized when they buy at Store B.
3. **Clean UI:**
   - When switching Store Context:
     - **Staff & Sessions:** Filtered to that store.
     - **Products:** Displays the catalog, with store-specific stock/pricing tied to the selected store.
     - **Categories / Brands / Suppliers / Customers:** Accessible globally across the tenant with clean organization.

---

### What to enhance next?

If you'd like, we can:

1. **Catalog vs Store Stock:** When viewing Products in Manage, show the stock quantity for the currently selected store context.
2. **Visual Grouping:** Group the modules in the Manage screen into **"Store Operations"** (Staff, Sessions, Store Setup) and **"Master Catalog & CRM"** (Products, Categories, Brands, Suppliers, Customers) so the navigation is immediately intuitive.
