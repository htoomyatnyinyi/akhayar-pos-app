export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "sku",
  "barcode",
  "sellingPrice",
  "costPrice",
  "wholesalePrice",
  "categoryName",
  "description",
  "initialStock",
] as const;

export type ProductImportRow = Record<(typeof PRODUCT_IMPORT_COLUMNS)[number], string>;

/** A blank, Excel-compatible layout users can fill in and import unchanged. */
export const productImportTemplateCsv = `${PRODUCT_IMPORT_COLUMNS.join(",")}\n`;

export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function productsToCsv(products: any[]) {
  const rows = [PRODUCT_IMPORT_COLUMNS.join(",")];
  for (const product of products) {
    rows.push(
      PRODUCT_IMPORT_COLUMNS.map((column) => csvCell(product[column])).join(","),
    );
  }
  return `${rows.join("\n")}\n`;
}

/** Small RFC-4180-compatible parser for product imports (CSV opens in Excel). */
export function parseProductCsv(input: string): ProductImportRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) records.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) records.push(row);
  }
  if (records.length < 2) return [];

  const headerAliases: Record<string, (typeof PRODUCT_IMPORT_COLUMNS)[number]> = {
    name: "name",
    productname: "name",
    sku: "sku",
    barcode: "barcode",
    sellingprice: "sellingPrice",
    price: "sellingPrice",
    costprice: "costPrice",
    cost: "costPrice",
    wholesaleprice: "wholesalePrice",
    wholesale: "wholesalePrice",
    categoryname: "categoryName",
    category: "categoryName",
    description: "description",
    initialstock: "initialStock",
    stock: "initialStock",
    quantity: "initialStock",
  };
  const normalizedHeaders = records[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim().replace(/[ _-]/g, "").toLowerCase(),
  );
  const headers = normalizedHeaders.map((header) => headerAliases[header] || header);
  const requiredColumns = ["name", "sku"] as const;
  const missingRequired = requiredColumns.filter((column) => !headers.includes(column));
  if (missingRequired.length) {
    throw new Error(`Missing required columns: ${missingRequired.join(", ")}`);
  }

  return records.slice(1).map((values) => {
    const result = {} as ProductImportRow;
    for (const column of PRODUCT_IMPORT_COLUMNS) {
      result[column] = values[headers.indexOf(column)]?.trim() ?? "";
    }
    return result;
  });
}
