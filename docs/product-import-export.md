# Product import, export, and labels

Manage → Products now supports:

- **Export CSV**: exports the product catalog in a format that Excel, Google Sheets, and LibreOffice can open.
- **CSV Template**: saves a blank, ready-to-fill default layout with the correct column headers.
- **Import CSV**: creates products offline and queues them for server sync. Required columns are `name` and `sku`; duplicate SKU/barcode rows and invalid rows are skipped and reported.
- **QR label**: tap the QR icon on any product to preview and print a label containing the product name, QR value, and SKU.

The supported CSV columns are:

`name, sku, barcode, sellingPrice, costPrice, wholesalePrice, categoryName, description, initialStock`

Use an exported CSV as the template. CSV is intentionally used instead of native `.xlsx` because it works on iOS, Android, Expo development builds, and desktop spreadsheet applications without adding a large spreadsheet parser. Product imports remain offline-first; they are not considered server-confirmed until the sync queue succeeds.

Only `name` and `sku` are required. The remaining columns are optional, and common header names such as `Price`, `Category`, `Stock`, and `Quantity` are accepted. If a category name does not exist yet, it is created automatically; blank categories use **General**.
