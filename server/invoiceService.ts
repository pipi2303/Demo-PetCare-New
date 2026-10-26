import { pool, withTransaction } from "./db";
import { getAppSettings } from "./tenantService";
import { journalizeInvoicePayment, journalizeCogs, journalizeCashExpense, journalizeCashIncome } from "./accountingService";

function toInvoice(row: any, items: any[]) {
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    customerId: row.customer_id,
    customerName: row.customer_name,
    petName: row.pet_name ?? undefined,
    date: row.date.toISOString().substring(0, 10),
    items: items.map((i) => ({
      id: i.id,
      category: i.category,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      totalPrice: Number(i.total_price),
      cogsAmount: Number(i.cogs_amount ?? 0),
    })),
    subtotal: Number(row.subtotal),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount),
    paymentMethod: row.payment_method,
    status: row.status,
    loyaltyPointsEarned: row.loyalty_points_earned,
    cashierName: row.cashier_name,
  };
}

function toCashTransaction(row: any) {
  return {
    id: row.id,
    transNo: row.trans_no,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    date: row.occurred_at,
    description: row.description,
    referenceNo: row.reference_no ?? undefined,
    operator: row.operator,
  };
}

export async function listInvoices() {
  const { rows: invoices } = await pool.query(
    `SELECT invoices.*, customers.name AS customer_name FROM invoices JOIN customers ON customers.id = invoices.customer_id AND customers.deleted_at IS NULL ORDER BY invoices.date DESC LIMIT 500`
  );
  const invoiceIds = invoices.map((r) => r.id);
  const { rows: items } = invoiceIds.length > 0
    ? await pool.query("SELECT * FROM invoice_items WHERE invoice_id = ANY($1::uuid[])", [invoiceIds])
    : { rows: [] };
  const itemsByInvoice = new Map<string, any[]>();
  for (const item of items) {
    const list = itemsByInvoice.get(item.invoice_id) || [];
    list.push(item);
    itemsByInvoice.set(item.invoice_id, list);
  }
  return invoices.map((row) => toInvoice(row, itemsByInvoice.get(row.id) || []));
}

export async function createInvoice(input: {
  customerId: string;
  petName?: string;
  items: { category: string; name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  cashierName: string;
}) {
  const settings = await getAppSettings();
  const prefix = settings?.invoicePrefix || "INV";
  const invoiceNo = `${prefix}-${Date.now().toString().slice(-6)}`;

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO invoices (invoice_no, customer_id, pet_name, subtotal, discount_amount, total_amount, paid_amount, payment_method, status, loyalty_points_earned, cashier_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10) RETURNING *`,
      [
        invoiceNo, input.customerId, input.petName ?? null, input.subtotal, input.discountAmount,
        input.totalAmount, input.paidAmount, input.paymentMethod, input.status, input.cashierName,
      ]
    );
    const invoice = rows[0];
    const insertedItems: any[] = [];
    for (const item of input.items) {
      const { rows: itemRows } = await client.query(
        `INSERT INTO invoice_items (invoice_id, category, name, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [invoice.id, item.category, item.name, item.quantity, item.unitPrice, item.totalPrice]
      );
      insertedItems.push(itemRows[0]);
    }
    const { rows: customerRows } = await client.query("SELECT name FROM customers WHERE id = $1", [input.customerId]);
    return toInvoice({ ...invoice, customer_name: customerRows[0]?.name }, insertedItems);
  });
}

export async function processPayment(invoiceId: string, method: string, pointsRedeemed: number, operatorName: string) {
  return withTransaction(async (client) => {
    const { rows: invRows } = await client.query(
      `SELECT invoices.*, customers.name AS customer_name FROM invoices JOIN customers ON customers.id = invoices.customer_id AND customers.deleted_at IS NULL WHERE invoices.id = $1 FOR UPDATE`,
      [invoiceId]
    );
    const invoice = invRows[0];
    if (!invoice) throw new Error("Invoice tidak ditemukan.");
    // Idempotency guard: mencegah double-count kas & poin loyalti kalau
    // "Konfirmasi Pembayaran" ditekan dua kali untuk invoice yang sama.
    if (invoice.status === "Lunas") {
      const { rows: items } = await client.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
      return toInvoice(invoice, items);
    }

    const totalAmount = Number(invoice.total_amount);
    const pointsEarned = Math.floor(totalAmount / 10000);

    const { rows: updatedInvRows } = await client.query(
      `UPDATE invoices SET status = 'Lunas', paid_amount = total_amount, payment_method = $1, loyalty_points_earned = $2 WHERE id = $3 RETURNING *`,
      [method, pointsEarned, invoiceId]
    );

    const transNo = "CSH-" + Date.now().toString().slice(-6);
    const occurredAt = new Date().toISOString().replace("T", " ").substring(0, 16);
    await client.query(
      `INSERT INTO cash_transactions (trans_no, type, category, amount, occurred_at, description, reference_no, operator)
       VALUES ($1,'Masuk','Pelunasan Invoice',$2,$3,$4,$5,$6)`,
      [
        transNo, totalAmount, occurredAt,
        `Pelunasan ${invoice.invoice_no} (${invoice.customer_name}) via ${method}`,
        invoice.invoice_no, invoice.cashier_name || operatorName || "Kasir",
      ]
    );

    const { rows: custRows } = await client.query("SELECT * FROM customers WHERE id = $1 FOR UPDATE", [invoice.customer_id]);
    const customer = custRows[0];
    const newPoints = Math.max(0, customer.loyalty_points - pointsRedeemed + pointsEarned);
    const newSpent = Number(customer.total_spent) + totalAmount;
    let tier = customer.membership_tier;
    if (newSpent >= 10000000) tier = "Platinum";
    else if (newSpent >= 5000000) tier = "Gold";
    await client.query(
      "UPDATE customers SET loyalty_points = $1, total_spent = $2, membership_tier = $3 WHERE id = $4",
      [newPoints, newSpent, tier, customer.id]
    );

    const { rows: items } = await client.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);

    // Double-entry journal: DR Cash / CR Revenue
    await journalizeInvoicePayment(client, {
      id: invoiceId, invoiceNo: invoice.invoice_no, totalAmount,
      cashierName: invoice.cashier_name || operatorName || "Kasir",
      items: items.map((i: any) => ({ category: i.category, totalPrice: Number(i.total_price) })),
    }).catch((e: any) => { console.warn("[Accounting] Jurnal invoice dilewati:", e?.message); });

    // COGS: match goods-based invoice items to stock_items by name
    const goodsCategories = ["Obat", "Makanan", "Vitamin", "Aksesoris", "Pasir Kucing", "Pet Shop Product"];
    for (const item of items) {
      if (!goodsCategories.includes(item.category)) continue;
      // Prefer exact match, fallback to ILIKE only on trimmed exact string (no wildcards)
      const { rows: stockRows } = await client.query(
        `SELECT id, purchase_price FROM stock_items
         WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [item.name]
      );
      if (!stockRows[0]) continue;
      const cogsPerUnit = Number(stockRows[0].purchase_price);
      const cogsTotal = cogsPerUnit * Number(item.quantity);
      if (cogsTotal <= 0) continue;
      // Record COGS in invoice_item
      await client.query("UPDATE invoice_items SET stock_item_id=$1, cogs_amount=$2 WHERE id=$3",
        [stockRows[0].id, cogsTotal, item.id]);
      // Deduct stock
      await client.query("UPDATE stock_items SET stock = GREATEST(0, stock - $1) WHERE id=$2",
        [Number(item.quantity), stockRows[0].id]);
      // Journal: DR HPP / CR Persediaan
      await journalizeCogs(client, invoice.invoice_no, item.name, cogsTotal,
        invoice.cashier_name || operatorName || "Kasir"
      ).catch((e: any) => { console.warn("[Accounting] Jurnal COGS dilewati:", e?.message); });
    }

    return toInvoice(updatedInvRows[0], items);
  });
}

export async function listCashTransactions() {
  const { rows } = await pool.query("SELECT * FROM cash_transactions ORDER BY occurred_at DESC LIMIT 500");
  return rows.map(toCashTransaction);
}

export async function createCashTransaction(input: {
  type: string; category: string; amount: number;
  description: string; referenceNo?: string; operator: string;
}) {
  return withTransaction(async (client) => {
    const transNo = "CSH-" + Date.now().toString().slice(-6);
    const occurredAt = new Date().toISOString().replace("T", " ").substring(0, 16);
    const { rows } = await client.query(
      `INSERT INTO cash_transactions (trans_no, type, category, amount, occurred_at, description, reference_no, operator)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [transNo, input.type, input.category, input.amount, occurredAt,
       input.description, input.referenceNo ?? null, input.operator]
    );
    // Auto double-entry journal (Pelunasan Invoice already journalized via processPayment)
    if (input.category !== "Pelunasan Invoice") {
      if (input.type === "Keluar") {
        await journalizeCashExpense(client, transNo, input.category, input.amount, input.operator).catch(() => {});
      } else {
        await journalizeCashIncome(client, transNo, input.category, input.amount, input.operator).catch(() => {});
      }
    }
    return toCashTransaction(rows[0]);
  });
}
