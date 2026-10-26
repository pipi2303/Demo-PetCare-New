import { pool, withTransaction } from "./db";
import type { PoolClient } from "pg";

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export interface CoAAccount {
  id: string; code: string; name: string;
  type: "Aset" | "Kewajiban" | "Ekuitas" | "Pendapatan" | "HPP" | "Beban";
  description: string; isActive: boolean;
}

function toCoa(row: any): CoAAccount {
  return { id: row.id, code: row.code, name: row.name, type: row.type,
           description: row.description, isActive: row.is_active };
}

export async function listCoA() {
  const { rows } = await pool.query("SELECT * FROM chart_of_accounts ORDER BY code");
  return rows.map(toCoa);
}

export async function getCoAByCode(code: string) {
  const { rows } = await pool.query("SELECT * FROM chart_of_accounts WHERE code=$1", [code]);
  return rows[0] ? toCoa(rows[0]) : null;
}

export async function createCoA(input: Omit<CoAAccount, "id">) {
  const { rows } = await pool.query(
    "INSERT INTO chart_of_accounts (code, name, type, description, is_active) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [input.code, input.name, input.type, input.description ?? "", input.isActive ?? true]
  );
  return toCoa(rows[0]);
}

export async function updateCoA(id: string, patch: Partial<CoAAccount>) {
  const { rows: cur } = await pool.query("SELECT * FROM chart_of_accounts WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Akun tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    "UPDATE chart_of_accounts SET code=$1, name=$2, type=$3, description=$4, is_active=$5 WHERE id=$6 RETURNING *",
    [patch.code ?? c.code, patch.name ?? c.name, patch.type ?? c.type,
     patch.description ?? c.description, patch.isActive ?? c.is_active, id]
  );
  return toCoa(rows[0]);
}

export async function deleteCoA(id: string) {
  await pool.query("DELETE FROM chart_of_accounts WHERE id=$1", [id]);
}

// ── Journal Entries ───────────────────────────────────────────────────────────

export interface JournalLine { accountId: string; accountCode?: string; accountName?: string; debit: number; credit: number; description?: string; }
export interface JournalEntry {
  id: string; entryNo: string; date: string; description: string;
  referenceNo: string; source: string; createdBy: string; lines: JournalLine[];
}

function toEntry(row: any, lines: any[]): JournalEntry {
  return {
    id: row.id, entryNo: row.entry_no,
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    description: row.description, referenceNo: row.reference_no,
    source: row.source, createdBy: row.created_by,
    lines: lines.map((l) => ({
      accountId: l.account_id, accountCode: l.code, accountName: l.name,
      debit: Number(l.debit), credit: Number(l.credit), description: l.description,
    })),
  };
}

export async function createJournalEntry(
  client: PoolClient,
  input: { date?: string; description: string; referenceNo?: string; source?: string; createdBy?: string; lines: JournalLine[] }
) {
  if (input.lines.length < 2) throw new Error("Jurnal butuh minimal 2 baris.");
  const totalDebit = input.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = input.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) throw new Error("Total debit harus sama dengan total kredit.");

  const entryNo = "JRN-" + Date.now().toString().slice(-8);
  const { rows: e } = await client.query(
    "INSERT INTO journal_entries (entry_no, date, description, reference_no, source, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
    [entryNo, input.date ?? new Date().toISOString().substring(0, 10),
     input.description, input.referenceNo ?? "", input.source ?? "manual", input.createdBy ?? ""]
  );
  for (const l of input.lines) {
    await client.query(
      "INSERT INTO journal_lines (entry_id, account_id, debit, credit, description) VALUES ($1,$2,$3,$4,$5)",
      [e[0].id, l.accountId, l.debit, l.credit, l.description ?? ""]
    );
  }
  return e[0];
}

export async function listJournalEntries(limit = 200) {
  const { rows: entries } = await pool.query(
    "SELECT * FROM journal_entries ORDER BY date DESC, created_at DESC LIMIT $1", [limit]
  );
  if (!entries.length) return [];
  const ids = entries.map((r) => r.id);
  const { rows: lines } = await pool.query(
    `SELECT jl.*, ca.code, ca.name FROM journal_lines jl
     JOIN chart_of_accounts ca ON ca.id = jl.account_id
     WHERE jl.entry_id = ANY($1::uuid[]) ORDER BY jl.entry_id, jl.debit DESC`,
    [ids]
  );
  const byEntry = new Map<string, any[]>();
  for (const l of lines) {
    const list = byEntry.get(l.entry_id) || [];
    list.push(l);
    byEntry.set(l.entry_id, list);
  }
  return entries.map((e) => toEntry(e, byEntry.get(e.id) || []));
}

// ── Trial Balance ─────────────────────────────────────────────────────────────

export interface TrialBalanceLine {
  code: string; name: string; type: string;
  totalDebit: number; totalCredit: number; balance: number;
}

export async function getTrialBalance() {
  const { rows } = await pool.query(`
    SELECT ca.code, ca.name, ca.type,
           COALESCE(SUM(jl.debit), 0)  AS total_debit,
           COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM chart_of_accounts ca
    LEFT JOIN journal_lines jl ON jl.account_id = ca.id
    WHERE ca.is_active = TRUE
    GROUP BY ca.id, ca.code, ca.name, ca.type
    ORDER BY ca.code
  `);
  return rows.map((r): TrialBalanceLine => ({
    code: r.code, name: r.name, type: r.type,
    totalDebit: Number(r.total_debit), totalCredit: Number(r.total_credit),
    balance: Number(r.total_debit) - Number(r.total_credit),
  }));
}

// ── Aging Report ──────────────────────────────────────────────────────────────

export interface AgingBucket { label: string; min: number; max: number; count: number; total: number; invoices: any[]; }

export async function getReceivablesAging() {
  const { rows } = await pool.query(`
    SELECT i.id, i.invoice_no, i.total_amount, i.date,
           c.name AS customer_name, c.phone AS customer_phone,
           CURRENT_DATE - i.date::date AS days_overdue
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id AND c.deleted_at IS NULL
    WHERE i.status = 'Belum Dibayar'
    ORDER BY i.date ASC
  `);

  const buckets: AgingBucket[] = [
    { label: "0–7 hari",  min: 0,  max: 7,   count: 0, total: 0, invoices: [] },
    { label: "8–14 hari", min: 8,  max: 14,  count: 0, total: 0, invoices: [] },
    { label: "15–30 hari",min: 15, max: 30,  count: 0, total: 0, invoices: [] },
    { label: "> 30 hari", min: 31, max: 9999, count: 0, total: 0, invoices: [] },
  ];

  for (const r of rows) {
    const days = Number(r.days_overdue);
    const inv = {
      id: r.id, invoiceNo: r.invoice_no,
      customerName: r.customer_name, customerPhone: r.customer_phone,
      totalAmount: Number(r.total_amount),
      date: r.date instanceof Date ? r.date.toISOString().substring(0, 10) : String(r.date),
      daysOverdue: days,
    };
    const bucket = buckets.find((b) => days >= b.min && days <= b.max) ?? buckets[3];
    bucket.count++;
    bucket.total += Number(r.total_amount);
    bucket.invoices.push(inv);
  }
  const grandTotal = rows.reduce((s, r) => s + Number(r.total_amount), 0);
  return { buckets, grandTotal, totalCount: rows.length };
}

// ── CoA-aware GL mappings ─────────────────────────────────────────────────────

// Maps invoice item category → revenue GL code
const REVENUE_MAP: Record<string, string> = {
  "Konsultasi": "4100", "Vaksin": "4100", "Tindakan": "4100",
  "Rawat Inap": "4100", "Lab": "4100",
  "Grooming": "4200",
  "Pet Hotel": "4300",
  "Obat": "4400", "Makanan": "4400", "Vitamin": "4400",
  "Aksesoris": "4400", "Pasir Kucing": "4400",
  "Telehealth": "4500",
};

// Maps cash transaction category → expense GL code
const EXPENSE_MAP: Record<string, string> = {
  "Payroll & Komisi Staff": "6100",
  "Gaji Karyawan": "6100",
  "Listrik & Air": "6300", "Listrik, Air & Internet": "6300",
  "Maintenance": "6400", "Maintenance Alat & AC": "6400",
  "Makan Staf": "6600", "Konsumsi & Dapur Staf": "6600",
  "Operasional": "6500", "Operasional & ATK": "6500",
  "Lain-lain": "6800",
};

// Lookup account ID by code (cached per session via in-memory map after first load)
const codeCache = new Map<string, string>(); // code → uuid

async function accountId(client: PoolClient, code: string): Promise<string | null> {
  if (codeCache.has(code)) return codeCache.get(code)!;
  const { rows } = await client.query("SELECT id FROM chart_of_accounts WHERE code=$1", [code]);
  if (rows[0]) { codeCache.set(code, rows[0].id); return rows[0].id; }
  return null;
}

// Auto-journal for invoice payment
export async function journalizeInvoicePayment(
  client: PoolClient,
  invoice: { id: string; invoiceNo: string; totalAmount: number; cashierName: string; items: any[] }
) {
  const cashId = await accountId(client, "1100");
  const arId   = await accountId(client, "1200");
  if (!cashId) return; // CoA not seeded yet — skip silently

  // Group items by revenue category
  const revMap = new Map<string, number>(); // accountCode → amount
  for (const item of invoice.items) {
    const revCode = REVENUE_MAP[item.category] ?? "4100";
    revMap.set(revCode, (revMap.get(revCode) ?? 0) + Number(item.totalPrice));
  }

  const lines: JournalLine[] = [{ accountId: cashId, debit: invoice.totalAmount, credit: 0 }];
  for (const [code, amount] of revMap) {
    const revId = await accountId(client, code);
    if (revId) lines.push({ accountId: revId, debit: 0, credit: amount });
  }
  // Ensure balance (rounding protection)
  const revTotal = lines.filter((l) => l.credit > 0).reduce((s, l) => s + l.credit, 0);
  if (Math.abs(revTotal - invoice.totalAmount) > 0.01) return;

  await createJournalEntry(client, {
    description: `Pembayaran invoice ${invoice.invoiceNo}`,
    referenceNo: invoice.invoiceNo, source: "invoice",
    createdBy: invoice.cashierName, lines,
  });
}

// Auto-journal for COGS when goods are sold
export async function journalizeCogs(
  client: PoolClient,
  invoiceNo: string, itemName: string, cogsAmount: number, cashierName: string
) {
  if (cogsAmount <= 0) return;
  const cogsId  = await accountId(client, "5100");
  const invtId  = await accountId(client, "1300");
  if (!cogsId || !invtId) return;
  await createJournalEntry(client, {
    description: `HPP penjualan: ${itemName} (${invoiceNo})`,
    referenceNo: invoiceNo, source: "cogs", createdBy: cashierName,
    lines: [
      { accountId: cogsId, debit: cogsAmount, credit: 0 },
      { accountId: invtId, debit: 0,          credit: cogsAmount },
    ],
  });
}

// Auto-journal for cash expense
export async function journalizeCashExpense(
  client: PoolClient,
  transNo: string, category: string, amount: number, operator: string
) {
  const cashId    = await accountId(client, "1100");
  const expCode   = EXPENSE_MAP[category] ?? "6800";
  const expId     = await accountId(client, expCode);
  if (!cashId || !expId) return;
  await createJournalEntry(client, {
    description: `Pengeluaran kas: ${category}`,
    referenceNo: transNo, source: "cash_transaction", createdBy: operator,
    lines: [
      { accountId: expId,  debit: amount, credit: 0 },
      { accountId: cashId, debit: 0,      credit: amount },
    ],
  });
}

// Auto-journal for cash income (non-invoice)
export async function journalizeCashIncome(
  client: PoolClient,
  transNo: string, category: string, amount: number, operator: string
) {
  const cashId = await accountId(client, "1100");
  const revId  = await accountId(client, "4100"); // default to clinic revenue
  if (!cashId || !revId) return;
  await createJournalEntry(client, {
    description: `Pemasukan kas: ${category}`,
    referenceNo: transNo, source: "cash_transaction", createdBy: operator,
    lines: [
      { accountId: cashId, debit: amount, credit: 0 },
      { accountId: revId,  debit: 0,      credit: amount },
    ],
  });
}
