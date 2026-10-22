import { pool } from "./db";

function toEmployee(row: any) {
  return {
    id: row.id as string,
    nik: row.nik as string,
    name: row.name as string,
    role: row.role as string,
    department: row.department as string,
    branchId: (row.branch_id as string) ?? undefined,
    shift: row.shift ?? undefined,
    phone: row.phone as string,
    email: row.email as string,
    hireDate: row.hire_date instanceof Date
      ? row.hire_date.toISOString().substring(0, 10)
      : String(row.hire_date),
    sipNumber: row.sip_number ?? undefined,
    baseSalary: Number(row.base_salary),
    commissionRatePercent: Number(row.commission_rate_percent),
    status: row.status as string,
  };
}

function nextNik(existing: string[]): string {
  let n = existing.length + 1;
  let nik: string;
  do { nik = `EMP-${String(n).padStart(3, "0")}`; n++; } while (existing.includes(nik));
  return nik;
}

export async function listEmployees() {
  const { rows } = await pool.query("SELECT * FROM employees ORDER BY name");
  return rows.map(toEmployee);
}

export async function createEmployee(input: {
  name: string; role: string; department?: string; branchId?: string; shift?: string;
  phone?: string; email?: string; hireDate?: string; sipNumber?: string;
  baseSalary?: number; commissionRatePercent?: number; status?: string;
}) {
  if (!input.name?.trim()) throw new Error("Nama karyawan wajib diisi.");
  if (!input.role?.trim()) throw new Error("Peran karyawan wajib diisi.");
  const { rows: existing } = await pool.query("SELECT nik FROM employees");
  const nik = nextNik(existing.map((r: any) => r.nik));
  const { rows } = await pool.query(
    `INSERT INTO employees
       (nik, name, role, department, branch_id, shift, phone, email, hire_date,
        sip_number, base_salary, commission_rate_percent, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [
      nik, input.name, input.role, input.department ?? "",
      input.branchId ?? null, input.shift ?? null,
      input.phone ?? "", input.email ?? "",
      input.hireDate ?? new Date().toISOString().substring(0, 10),
      input.sipNumber ?? null,
      input.baseSalary ?? 0, input.commissionRatePercent ?? 0,
      input.status ?? "Aktif",
    ]
  );
  return toEmployee(rows[0]);
}

export async function updateEmployee(id: string, patch: Record<string, any>) {
  const { rows: cur } = await pool.query("SELECT * FROM employees WHERE id=$1", [id]);
  if (!cur[0]) throw new Error("Karyawan tidak ditemukan.");
  const c = cur[0];
  const { rows } = await pool.query(
    `UPDATE employees SET
       name=$1, role=$2, department=$3, branch_id=$4, shift=$5, phone=$6,
       email=$7, hire_date=$8, sip_number=$9, base_salary=$10,
       commission_rate_percent=$11, status=$12
     WHERE id=$13 RETURNING *`,
    [
      patch.name ?? c.name, patch.role ?? c.role, patch.department ?? c.department,
      patch.branchId ?? c.branch_id, patch.shift ?? c.shift,
      patch.phone ?? c.phone, patch.email ?? c.email,
      patch.hireDate ?? c.hire_date, patch.sipNumber ?? c.sip_number,
      patch.baseSalary ?? c.base_salary,
      patch.commissionRatePercent ?? c.commission_rate_percent,
      patch.status ?? c.status, id,
    ]
  );
  return toEmployee(rows[0]);
}

export async function deleteEmployee(id: string) {
  await pool.query("DELETE FROM employees WHERE id=$1", [id]);
}
