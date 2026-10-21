import { pool } from "./db";

function toReminder(row: any) {
  return {
    id: row.id as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    petName: row.pet_name as string,
    title: row.title as string,
    type: row.type as string,
    dueDate: row.due_date instanceof Date
      ? row.due_date.toISOString().substring(0, 10)
      : String(row.due_date),
    status: row.status as string,
  };
}

function toCustomerNote(row: any) {
  return {
    id: row.id as string,
    customerId: (row.customer_id as string) ?? "",
    date: row.date instanceof Date ? row.date.toISOString().substring(0, 10) : String(row.date),
    note: row.note as string,
    authorName: row.author_name as string,
  };
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function listReminders() {
  const { rows } = await pool.query("SELECT * FROM reminders ORDER BY due_date");
  return rows.map(toReminder);
}

export async function createReminder(input: {
  customerName: string; customerPhone?: string; petName: string;
  title: string; type: string; dueDate: string; status?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO reminders (customer_name, customer_phone, pet_name, title, type, due_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.customerName, input.customerPhone ?? "", input.petName,
     input.title, input.type, input.dueDate, input.status ?? "Menunggu"]
  );
  return toReminder(rows[0]);
}

export async function updateReminderStatus(id: string, status: string) {
  const { rows } = await pool.query(
    "UPDATE reminders SET status=$1 WHERE id=$2 RETURNING *",
    [status, id]
  );
  if (!rows[0]) throw new Error("Reminder tidak ditemukan.");
  return toReminder(rows[0]);
}

export async function deleteReminder(id: string) {
  await pool.query("DELETE FROM reminders WHERE id=$1", [id]);
}

// ── Customer Notes ─────────────────────────────────────────────────────────────

export async function listCustomerNotes() {
  const { rows } = await pool.query(
    "SELECT * FROM customer_notes ORDER BY created_at DESC LIMIT 2000"
  );
  return rows.map(toCustomerNote);
}

export async function createCustomerNote(input: {
  customerId: string; note: string; authorName: string; date?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO customer_notes (customer_id, note, author_name, date)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [input.customerId, input.note, input.authorName,
     input.date ?? new Date().toISOString().substring(0, 10)]
  );
  return toCustomerNote(rows[0]);
}
