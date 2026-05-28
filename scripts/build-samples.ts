/**
 * Build sample datasets for OpenCoDesk demos and agent testing.
 *
 * Usage: npx tsx scripts/build-samples.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";

const SAMPLES_DIR = resolve(process.cwd(), "samples");
const SUPERSTORE_URL =
  "https://raw.githubusercontent.com/Harsh-Belekar/Global-Superstore-Sales-Dashboard-Excel-/main/Superstore_rowdata.csv";

async function downloadSuperstoreCsv(): Promise<Buffer> {
  const res = await fetch(SUPERSTORE_URL);
  if (!res.ok) {
    throw new Error(`Failed to download Superstore CSV: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function writeWorkbook(path: string, sheetName: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, path);
}

function buildSalesQ1(): Record<string, unknown>[] {
  return [
    { order_id: 1001, order_date: "2026-01-03", region: "West", rep: "Avery Chen", product: "Analytics Suite", units: 12, unit_price: 240, discount_pct: 0 },
    { order_id: 1002, order_date: "2026-01-07", region: "East", rep: "Maya Patel", product: "Data Connector", units: 18, unit_price: 95, discount_pct: 5 },
    { order_id: 1003, order_date: "2026-01-09", region: "Central", rep: "Jordan Lee", product: "Workflow Seats", units: 32, unit_price: 45, discount_pct: 0 },
    { order_id: 1004, order_date: "2026-01-12", region: "South", rep: "Riley Green", product: "Analytics Suite", units: 8, unit_price: 240, discount_pct: 10 },
    { order_id: 1005, order_date: "2026-01-19", region: "West", rep: "Avery Chen", product: "Workflow Seats", units: 44, unit_price: 45, discount_pct: 0 },
    { order_id: 1006, order_date: "2026-01-23", region: "East", rep: "Maya Patel", product: "Analytics Suite", units: 10, unit_price: 240, discount_pct: 0 },
    { order_id: 1007, order_date: "2026-02-02", region: "Central", rep: "Jordan Lee", product: "Data Connector", units: 22, unit_price: 95, discount_pct: 0 },
    { order_id: 1008, order_date: "2026-02-06", region: "South", rep: "Riley Green", product: "Workflow Seats", units: 36, unit_price: 45, discount_pct: 5 },
    { order_id: 1009, order_date: "2026-02-10", region: "West", rep: "Avery Chen", product: "Data Connector", units: 28, unit_price: 95, discount_pct: 0 },
    { order_id: 1010, order_date: "2026-02-17", region: "East", rep: "Maya Patel", product: "Workflow Seats", units: 40, unit_price: 45, discount_pct: 0 },
    { order_id: 1011, order_date: "2026-02-24", region: "Central", rep: "Jordan Lee", product: "Analytics Suite", units: 14, unit_price: 240, discount_pct: 7.5 },
    { order_id: 1012, order_date: "2026-03-03", region: "South", rep: "Riley Green", product: "Data Connector", units: 25, unit_price: 95, discount_pct: 0 },
    { order_id: 1013, order_date: "2026-03-09", region: "West", rep: "Avery Chen", product: "Analytics Suite", units: 16, unit_price: 240, discount_pct: 5 },
    { order_id: 1014, order_date: "2026-03-14", region: "East", rep: "Maya Patel", product: "Data Connector", units: 30, unit_price: 95, discount_pct: 10 },
    { order_id: 1015, order_date: "2026-03-21", region: "Central", rep: "Jordan Lee", product: "Workflow Seats", units: 52, unit_price: 45, discount_pct: 0 },
    { order_id: 1016, order_date: "2026-03-27", region: "South", rep: "Riley Green", product: "Analytics Suite", units: 11, unit_price: 240, discount_pct: 0 },
  ];
}

function buildInventory(): Record<string, unknown>[] {
  const products = [
    ["SKU-100", "Analytics Suite License", "Software", 142, 40, "Northwind Supply", 180],
    ["SKU-101", "Data Connector Pack", "Software", 88, 25, "Northwind Supply", 72],
    ["SKU-102", "Workflow Seats (50)", "Software", 31, 35, "Contoso Parts", 38],
    ["SKU-200", "Ergonomic Office Chair", "Furniture", 54, 20, "Fabrikam Furnishings", 210],
    ["SKU-201", "Standing Desk 60in", "Furniture", 17, 15, "Fabrikam Furnishings", 420],
    ["SKU-202", "Conference Table 8ft", "Furniture", 8, 5, "Fabrikam Furnishings", 890],
    ["SKU-300", "Laser Printer Pro", "Technology", 63, 18, "Adventure Works", 340],
    ["SKU-301", "27in Monitor 4K", "Technology", 44, 22, "Adventure Works", 265],
    ["SKU-302", "Wireless Keyboard", "Technology", 120, 30, "Adventure Works", 45],
    ["SKU-400", "Copy Paper Case", "Office Supplies", 210, 50, "Wide World Importers", 28],
    ["SKU-401", "Sticky Notes Bulk", "Office Supplies", 95, 40, "Wide World Importers", 12],
    ["SKU-402", "Ballpoint Pens Box", "Office Supplies", 180, 60, "Wide World Importers", 8],
  ] as const;

  const regions = ["West", "East", "Central", "South"] as const;

  const rows: Record<string, unknown>[] = [];
  for (const region of regions) {
    for (const [sku, name, category, qty, reorder, supplier, cost] of products) {
      const variance = Math.floor(Math.random() * 20) - 10;
      const quantity = Math.max(0, qty + variance);
      rows.push({
        sku,
        product_name: name,
        category,
        region,
        quantity_on_hand: quantity,
        reorder_point: reorder,
        supplier,
        unit_cost: cost,
        below_reorder: quantity < reorder ? "YES" : "NO",
        inventory_value: quantity * cost,
      });
    }
  }
  return rows;
}

function buildExpenseClaims(): Record<string, unknown>[] {
  const departments = ["Sales", "Engineering", "Marketing", "Operations", "Finance"];
  const categories = ["Travel", "Meals", "Software", "Equipment", "Training"];
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i <= 48; i++) {
    const dept = departments[i % departments.length];
    const category = categories[i % categories.length];
    const amount = Math.round((80 + (i * 37) % 920) * 100) / 100;
    const month = String((i % 12) + 1).padStart(2, "0");
    rows.push({
      claim_id: `EXP-2026-${String(i).padStart(4, "0")}`,
      submit_date: `2026-${month}-${String((i % 28) + 1).padStart(2, "0")}`,
      employee: `Employee ${i}`,
      department: dept,
      category,
      amount_usd: amount,
      status: i % 7 === 0 ? "Pending" : "Approved",
      notes: i % 5 === 0 ? "Missing receipt" : "",
    });
  }
  return rows;
}

async function main() {
  mkdirSync(SAMPLES_DIR, { recursive: true });

  console.log("Downloading Superstore CSV...");
  const superstoreCsv = await downloadSuperstoreCsv();
  writeFileSync(resolve(SAMPLES_DIR, "superstore-sales.csv"), superstoreCsv);

  const superstoreWb = XLSX.read(superstoreCsv, { type: "buffer" });
  const sheet = superstoreWb.Sheets[superstoreWb.SheetNames[0]];
  const allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  const sampleRows = allRows.slice(0, 2000);
  writeWorkbook(resolve(SAMPLES_DIR, "superstore-sales.xlsx"), "Orders", sampleRows);
  console.log(`✓ superstore-sales.xlsx (${sampleRows.length} rows)`);

  const salesQ1 = buildSalesQ1();
  writeFileSync(
    resolve(SAMPLES_DIR, "sales-q1.csv"),
    ["order_id,order_date,region,rep,product,units,unit_price,discount_pct"]
      .concat(
        salesQ1.map((r) =>
          [r.order_id, r.order_date, r.region, r.rep, r.product, r.units, r.unit_price, r.discount_pct].join(","),
        ),
      )
      .join("\n") + "\n",
  );
  writeWorkbook(resolve(SAMPLES_DIR, "sales-q1.xlsx"), "Q1 Sales", salesQ1);
  console.log("✓ sales-q1.xlsx + sales-q1.csv");

  writeWorkbook(resolve(SAMPLES_DIR, "retail-inventory.xlsx"), "Inventory", buildInventory());
  console.log("✓ retail-inventory.xlsx");

  writeWorkbook(resolve(SAMPLES_DIR, "expense-claims.xlsx"), "Expense Claims", buildExpenseClaims());
  console.log("✓ expense-claims.xlsx");

  console.log("\nDone. Files written to samples/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
