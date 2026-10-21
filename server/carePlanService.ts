import { pool } from "./db";

const d = (v: any) => v instanceof Date ? v.toISOString().substring(0, 10) : (v ? String(v) : "");

function toCP(row: any) {
  return {
    id: row.id as string, planNo: row.plan_no as string,
    petId: (row.pet_id as string) ?? "", petName: row.pet_name as string,
    customerName: row.customer_name as string, doctorName: row.doctor_name as string,
    title: row.title as string, diagnosis: row.diagnosis as string,
    startDate: d(row.start_date), endDate: d(row.end_date),
    status: row.status as string,
    tasks: row.tasks ?? [],
    notes: row.notes ?? undefined,
  };
}

export async function listCarePlans() {
  const { rows } = await pool.query("SELECT * FROM care_plans ORDER BY created_at DESC LIMIT 500");
  return rows.map(toCP);
}

export async function createCarePlan(input: {
  petId?: string; petName: string; customerName: string; doctorName: string;
  title: string; diagnosis?: string; startDate: string; endDate: string;
  status?: string; tasks?: any[]; notes?: string;
}) {
  const planNo = "CP-" + Date.now().toString().slice(-6);
  const { rows } = await pool.query(
    `INSERT INTO care_plans (plan_no, pet_id, pet_name, customer_name, doctor_name, title, diagnosis, start_date, end_date, status, tasks, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [planNo, input.petId || null, input.petName, input.customerName, input.doctorName,
     input.title, input.diagnosis ?? "", input.startDate, input.endDate,
     input.status ?? "Aktif", JSON.stringify(input.tasks ?? []), input.notes ?? null]
  );
  return toCP(rows[0]);
}

export async function toggleCarePlanTask(planId: string, taskId: string) {
  const { rows: cur } = await pool.query("SELECT * FROM care_plans WHERE id=$1", [planId]);
  if (!cur[0]) throw new Error("Care plan tidak ditemukan.");
  const plan = toCP(cur[0]);

  const now = new Date().toISOString().replace("T", " ").substring(0, 16);
  const updatedTasks = plan.tasks.map((task: any) => {
    if (task.id !== taskId) return task;
    const isCompleted = !task.isCompleted;
    return { ...task, isCompleted, completedAt: isCompleted ? now : undefined };
  });
  const allDone = updatedTasks.every((t: any) => t.isCompleted);
  const newStatus = allDone ? "Selesai" : plan.status;

  const { rows } = await pool.query(
    "UPDATE care_plans SET tasks=$1, status=$2 WHERE id=$3 RETURNING *",
    [JSON.stringify(updatedTasks), newStatus, planId]
  );
  return toCP(rows[0]);
}
