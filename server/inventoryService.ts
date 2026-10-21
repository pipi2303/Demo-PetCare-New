import { pool } from "./db";

function toCat(row: any) {
  return { id: row.id as string, name: row.name as string };
}

function toWh(row: any) {
  return { id: row.id as string, name: row.name as string };
}

function toStockItem(row: any) {
  return {
    id: row.id as string,
    sku: row.sku as string,
    name: row.name as string,
    category: row.category as string,
    warehouse: row.warehouse as string,
    stock: Number(row.stock),
    minStock: Number(row.min_stock),
    unit: row.unit as string,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    supplierName: row.supplier_name as string,
    expiryDate: row.expiry_date
      ? (row.expiry_date instanceof Date ? row.expiry_date.toISOString().substring(0, 10) : String(row.expiry_date))
      : undefined,
    batchNumber: row.batch_number ?? undefined,
    isClearanceSale: Boolean(row.is_clearance_sale),
    clearanceDiscountPercent: row.clearance_discount_percent != null ? Number(row.clearance_discount_percent) : undefined,
  };
}

function toStockMovement(row: any) {
  return {
    id: row.id as string,
    itemId: (row.item_id as string) ?? "",
    itemName: row.item_name as string,
    type: row.type as "Masuk" | "Keluar" | "Transfer" | "Opname",
    quantity: Number(row.quantity),
    fromWarehouse: row.from_warehouse ?? undefined,
    toWarehouse: row.to_warehouse ?? undefined,
    referenceNo: row.reference_no as string,
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    operator: row.operator as string,
  };
}

function toSupplier(row: any) {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    contactPerson: row.contact_person as string,
    phone: row.phone as string,
    email: row.email as string,
    address: row.address as string,
    category: row.category as string,
  };
}

function toPO(row: any) {
  return {
    id: row.id as string,
    poNo: row.po_no as string,
    supplierName: row.supplier_name as string,
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    status: row.status as string,
    items: row.items as any[],
    totalAmount: Number(row.total_amount),
    notes: row.notes ?? undefined,
  };
}

function nextCode(prefix: string, existing: string[]): string {
  let n = existing.length + 1;
  let code: string;
  do { code = `${prefix}-${String(n).padStart(3, "0")}`; n++; } while (existing.includes(code));
  return code;
}

// ── Product Categories ───────────────────────────────────────────────────────

export async function listProductCategories() {
  const { rows } = await pool.query("SELECT * FROM product_categories ORDER BY name");
  return rows.map(toCat);
}

export async function createProductCategory(name: string) {
  const { rows } = await pool.query(
    "INSERT INTO product_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *",
    [name.trim()]
  );
  if (!rows[0]) throw new Error(`Kategori '${name}' sudah ada.`);
  return toCat(rows[0]);
}

export async function deleteProductCategory(id: string) {
  await pool.query("DELETE FROM product_categories WHERE id = $1", [id]);
}

// ── Warehouses ───────────────────────────────────────────────────────────────

export async function listWarehouses() {
  const { rows } = await pool.query("SELECT * FROM warehouses ORDER BY name");
  return rows.map(toWh);
}

export async function createWarehouse(name: string) {
  const { rows } = await pool.query(
    "INSERT INTO warehouses (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *",
    [name.trim()]
  );
  if (!rows[0]) throw new Error(`Gudang '${name}' sudah ada.`);
  return toWh(rows[0]);
}

export async function deleteWarehouse(id: string) {
  await pool.query("DELETE FROM warehouses WHERE id = $1", [id]);
}

// ── Stock Items ──────────────────────────────────────────────────────────────

export async function listStockItems() {
  const { rows } = await pool.query("SELECT * FROM stock_items ORDER BY name");
  return rows.map(toStockItem);
}

export async function createStockItem(input: {
  sku?: string; name: string; category: string; warehouse: string; stock: number;
  minStock: number; unit: string; purchasePrice: number; sellingPrice: number;
  supplierName: string; expiryDate?: string; batchNumber?: string;
  isClearanceSale?: boolean; clearanceDiscountPercent?: number;
}) {
  const sku = input.sku || "SKU-" + Math.floor(1000 + Math.random() * 9000);
  const { rows } = await pool.query(
    `INSERT INTO stock_items
       (sku, name, category, warehouse, stock, min_stock, unit, purchase_price, selling_price,
        supplier_name, expiry_date, batch_number, is_clearance_sale, clearance_discount_percent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      sku, input.name, input.category, input.warehouse, input.stock, input.minStock,
      input.unit, input.purchasePrice, input.sellingPrice, input.supplierName,
      input.expiryDate ?? null, input.batchNumber ?? null,
      input.isClearanceSale ?? false, input.clearanceDiscountPercent ?? null,
    ]
  );
  return toStockItem(rows[0]);
}

export async function updateStockItem(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM stock_items WHERE id = $1", [id]);
  if (!cur[0]) throw new Error("Item stok tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE stock_items SET
       sku=$1, name=$2, category=$3, warehouse=$4, stock=$5, min_stock=$6, unit=$7,
       purchase_price=$8, selling_price=$9, supplier_name=$10, expiry_date=$11,
       batch_number=$12, is_clearance_sale=$13, clearance_discount_percent=$14
     WHERE id=$15 RETURNING *`,
    [
      patch.sku ?? c.sku, patch.name ?? c.name, patch.category ?? c.category,
      patch.warehouse ?? c.warehouse, patch.stock ?? c.stock, patch.minStock ?? c.min_stock,
      patch.unit ?? c.unit, patch.purchasePrice ?? c.purchase_price,
      patch.sellingPrice ?? c.selling_price, patch.supplierName ?? c.supplier_name,
      patch.expiryDate ?? c.expiry_date, patch.batchNumber ?? c.batch_number,
      patch.isClearanceSale ?? c.is_clearance_sale,
      patch.clearanceDiscountPercent ?? c.clearance_discount_percent, id,
    ]
  );
  return toStockItem(rows[0]);
}

// ── Stock Movements ──────────────────────────────────────────────────────────

export async function listStockMovements() {
  const { rows } = await pool.query(
    "SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 1000"
  );
  return rows.map(toStockMovement);
}

export async function createStockMovement(sm: {
  itemId?: string; itemName: string; type: string; quantity: number;
  fromWarehouse?: string; toWarehouse?: string; referenceNo: string; operator: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO stock_movements
       (item_id, item_name, type, quantity, from_warehouse, to_warehouse, reference_no, operator)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      sm.itemId || null, sm.itemName, sm.type, sm.quantity,
      sm.fromWarehouse ?? null, sm.toWarehouse ?? null, sm.referenceNo, sm.operator,
    ]
  );
  return toStockMovement(rows[0]);
}

// ── Suppliers ────────────────────────────────────────────────────────────────

export async function listSuppliers() {
  const { rows } = await pool.query("SELECT * FROM suppliers ORDER BY name");
  return rows.map(toSupplier);
}

export async function createSupplier(input: {
  name: string; contactPerson?: string; phone?: string; email?: string;
  address?: string; category?: string;
}) {
  const { rows: existing } = await pool.query("SELECT code FROM suppliers");
  const code = nextCode("SUP", existing.map((r: any) => r.code));
  const { rows } = await pool.query(
    `INSERT INTO suppliers (code, name, contact_person, phone, email, address, category)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [code, input.name, input.contactPerson ?? "", input.phone ?? "",
     input.email ?? "", input.address ?? "", input.category ?? ""]
  );
  return toSupplier(rows[0]);
}

export async function updateSupplier(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM suppliers WHERE id = $1", [id]);
  if (!cur[0]) throw new Error("Supplier tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE suppliers SET name=$1, contact_person=$2, phone=$3, email=$4, address=$5, category=$6
     WHERE id=$7 RETURNING *`,
    [
      patch.name ?? c.name, patch.contactPerson ?? c.contact_person,
      patch.phone ?? c.phone, patch.email ?? c.email,
      patch.address ?? c.address, patch.category ?? c.category, id,
    ]
  );
  return toSupplier(rows[0]);
}

export async function deleteSupplier(id: string) {
  await pool.query("DELETE FROM suppliers WHERE id = $1", [id]);
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

export async function listPurchaseOrders() {
  const { rows } = await pool.query(
    "SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 500"
  );
  return rows.map(toPO);
}

export async function createPurchaseOrder(input: {
  supplierName: string; items: any[]; totalAmount: number; notes?: string;
}) {
  const poNo = "PO-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO purchase_orders (po_no, supplier_name, items, total_amount, notes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [poNo, input.supplierName, JSON.stringify(input.items), input.totalAmount, input.notes ?? null]
  );
  return toPO(rows[0]);
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE purchase_orders SET status=$1 WHERE id=$2 RETURNING *",
    [status, id]
  );
  if (!rows[0]) throw new Error("Purchase order tidak ditemukan.");
  return toPO(rows[0]);
}

// Atomic: mark PO received, bump stock quantities, create movement logs.
export async function receivePurchaseOrder(id: string, operatorName: string) {
  const { rows: poRows } = await pool.query("SELECT * FROM purchase_orders WHERE id=$1", [id]);
  const po = poRows[0];
  if (!po) throw new Error("Purchase order tidak ditemukan.");
  if (po.status === "Diterima") throw new Error("Purchase order sudah diterima.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE purchase_orders SET status='Diterima' WHERE id=$1", [id]);

    const { rows: allStockItems } = await client.query("SELECT * FROM stock_items");
    for (const item of po.items as any[]) {
      const skuMatch = (item.itemName as string).match(/\[([^\]]+)\]\s*$/);
      const sku = skuMatch ? skuMatch[1].trim() : null;
      const nameWithoutSku = (item.itemName as string).replace(/\s*\[[^\]]+\]\s*$/, "").trim();
      const stock = allStockItems.find(
        (s: any) => (sku && s.sku === sku) || s.name === item.itemName || s.name === nameWithoutSku
      );
      if (stock) {
        await client.query("UPDATE stock_items SET stock = stock + $1 WHERE id=$2", [item.quantity, stock.id]);
        await client.query(
          `INSERT INTO stock_movements (item_id, item_name, type, quantity, to_warehouse, reference_no, operator)
           VALUES ($1,$2,'Masuk',$3,$4,$5,$6)`,
          [stock.id, stock.name, item.quantity, stock.warehouse, po.po_no, operatorName]
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows: updated } = await pool.query("SELECT * FROM purchase_orders WHERE id=$1", [id]);
  return toPO(updated[0]);
}
