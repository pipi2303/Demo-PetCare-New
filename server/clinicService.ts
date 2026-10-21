import { pool } from "./db";

const SELECT_VISIT = `
  SELECT clinic_visits.*, customers.name AS customer_name, pets.name AS pet_name, pets.species AS pet_species, pets.breed AS pet_breed
  FROM clinic_visits
  JOIN customers ON customers.id = clinic_visits.customer_id AND customers.deleted_at IS NULL
  JOIN pets ON pets.id = clinic_visits.pet_id AND pets.deleted_at IS NULL
`;

function toClinicVisit(row: any) {
  return {
    id: row.id,
    visitNo: row.visit_no,
    queueNo: row.queue_no,
    customerId: row.customer_id,
    customerName: row.customer_name,
    petId: row.pet_id,
    petName: row.pet_name,
    petSpecies: row.pet_species,
    petBreed: row.pet_breed ?? "",
    doctorId: row.doctor_id ?? "",
    doctorName: row.doctor_name ?? "",
    complaint: row.complaint,
    status: row.status,
    queuedAt: row.queued_at ?? "",
    calledAt: row.called_at ?? undefined,
    examinedAt: row.examined_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    slaMinutes: row.sla_minutes ?? undefined,
    branchId: row.branch_id ?? undefined,
  };
}

function nowClockLabel(): string {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export async function listClinicVisits() {
  const { rows } = await pool.query(`${SELECT_VISIT} ORDER BY clinic_visits.queue_no ASC LIMIT 500`);
  return rows.map(toClinicVisit);
}

export async function createClinicVisit(input: {
  customerId: string;
  petId: string;
  doctorId?: string;
  doctorName?: string;
  complaint: string;
  branchId?: string;
}) {
  const { rows: openRows } = await pool.query(
    "SELECT count(*)::int AS count FROM clinic_visits WHERE status NOT IN ('Selesai', 'Batal')"
  );
  const queueNo = openRows[0].count + 1;
  const visitNo = "VIS-" + Date.now().toString().slice(-6);

  const { rows } = await pool.query(
    `INSERT INTO clinic_visits (visit_no, queue_no, customer_id, pet_id, doctor_id, doctor_name, complaint, status, branch_id, queued_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Menunggu',$8,$9) RETURNING id`,
    [visitNo, queueNo, input.customerId, input.petId, input.doctorId ?? null, input.doctorName ?? null, input.complaint, input.branchId ?? null, nowClockLabel()]
  );
  const { rows: fullRows } = await pool.query(`${SELECT_VISIT} WHERE clinic_visits.id = $1`, [rows[0].id]);
  return toClinicVisit(fullRows[0]);
}

export async function updateVisitStatus(id: string, status: string) {
  const columnByStatus: Record<string, string> = {
    Dipanggil: "called_at",
    "Sedang Diperiksa": "examined_at",
    Selesai: "completed_at",
  };
  const column = columnByStatus[status];
  const query = column
    ? `UPDATE clinic_visits SET status = $1, ${column} = $2 WHERE id = $3 RETURNING id`
    : `UPDATE clinic_visits SET status = $1 WHERE id = $2 RETURNING id`;
  const params = column ? [status, nowClockLabel(), id] : [status, id];
  const { rows } = await pool.query(query, params);
  if (!rows[0]) throw new Error("Kunjungan poli tidak ditemukan.");
  const { rows: fullRows } = await pool.query(`${SELECT_VISIT} WHERE clinic_visits.id = $1`, [id]);
  return toClinicVisit(fullRows[0]);
}

export async function updateClinicVisit(id: string, patch: Record<string, any>) {
  const { rows: currentRows } = await pool.query("SELECT * FROM clinic_visits WHERE id = $1", [id]);
  const current = currentRows[0];
  if (!current) throw new Error("Kunjungan poli tidak ditemukan.");
  const next = {
    doctor_id: patch.doctorId ?? current.doctor_id,
    doctor_name: patch.doctorName ?? current.doctor_name,
    complaint: patch.complaint ?? current.complaint,
    status: patch.status ?? current.status,
    branch_id: patch.branchId ?? current.branch_id,
    sla_minutes: patch.slaMinutes ?? current.sla_minutes,
  };
  await pool.query(
    `UPDATE clinic_visits SET doctor_id=$1, doctor_name=$2, complaint=$3, status=$4, branch_id=$5, sla_minutes=$6 WHERE id=$7`,
    [next.doctor_id, next.doctor_name, next.complaint, next.status, next.branch_id, next.sla_minutes, id]
  );
  const { rows: fullRows } = await pool.query(`${SELECT_VISIT} WHERE clinic_visits.id = $1`, [id]);
  return toClinicVisit(fullRows[0]);
}
