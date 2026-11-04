// Job harian: reminder vaksin H-3, grooming H-1, hotel checkout H-0, alert stok menipis.
// Dijalankan sekali saat server start, lalu setiap 24 jam.
// ponytail: setInterval 24h, bukan cron lib — tambah node-cron jika perlu jam spesifik

import { pool } from "./db";
import { sendWhatsAppMessage } from "./waService";

async function sendVaccineReminders(): Promise<number> {
  const { rows } = await pool.query<{
    pet_name: string; customer_name: string; customer_phone: string; vaccine_name: string; due_date: string;
  }>(
    `SELECT pet_name, customer_name, customer_phone, vaccine_name, due_date
     FROM vac_schedules
     WHERE due_date = CURRENT_DATE + INTERVAL '3 days'
       AND status = 'Mendatang'
       AND customer_phone IS NOT NULL AND customer_phone != ''`
  );
  for (const r of rows) {
    const due = new Date(r.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    await sendWhatsAppMessage(r.customer_phone,
      `Halo ${r.customer_name} 👋\n\n` +
      `Kami mengingatkan bahwa *${r.pet_name}* perlu vaksinasi *${r.vaccine_name}* ` +
      `pada *${due}* (3 hari lagi).\n\nSilakan hubungi kami untuk konfirmasi. Terima kasih! 🐾`
    );
  }
  return rows.length;
}

async function sendGroomingReminders(): Promise<number> {
  // grooming_bookings tidak punya customer_phone — JOIN customers by name (best-effort)
  const { rows } = await pool.query<{
    pet_name: string; customer_name: string; phone: string; package_type: string; date: string; time_slot: string;
  }>(
    `SELECT gb.pet_name, gb.customer_name, c.phone, gb.package_type, gb.date, gb.time_slot
     FROM grooming_bookings gb
     LEFT JOIN customers c ON LOWER(c.name) = LOWER(gb.customer_name) AND c.deleted_at IS NULL
     WHERE gb.date = CURRENT_DATE + INTERVAL '1 day'
       AND gb.status IN ('Terkonfirmasi', 'Menunggu')
       AND c.phone IS NOT NULL AND c.phone != ''`
  );
  for (const r of rows) {
    const tgl = new Date(r.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    await sendWhatsAppMessage(r.phone,
      `Halo ${r.customer_name} 👋\n\n` +
      `Pengingat jadwal *Grooming ${r.package_type}* untuk *${r.pet_name}* ` +
      `besok *${tgl}* pukul ${r.time_slot || "sesuai jadwal"}.\n\nTerima kasih, sampai jumpa! ✂️🐾`
    );
  }
  return rows.length;
}

async function sendHotelCheckoutReminders(): Promise<number> {
  // hotel_reservations punya pet_id → JOIN pets → customers
  const { rows } = await pool.query<{
    pet_name: string; customer_name: string; phone: string; room_no: string; check_out_date: string;
  }>(
    `SELECT hr.pet_name, hr.customer_name, c.phone, hr.room_no, hr.check_out_date
     FROM hotel_reservations hr
     LEFT JOIN pets p ON p.id = hr.pet_id AND p.deleted_at IS NULL
     LEFT JOIN customers c ON c.id = p.customer_id AND c.deleted_at IS NULL
     WHERE hr.check_out_date = CURRENT_DATE
       AND hr.status IN ('Aktif', 'Checkout Hari Ini')
       AND c.phone IS NOT NULL AND c.phone != ''`
  );
  for (const r of rows) {
    await sendWhatsAppMessage(r.phone,
      `Halo ${r.customer_name} 👋\n\n` +
      `*${r.pet_name}* sudah waktunya check-out dari Pet Hotel hari ini (Kamar ${r.room_no}).\n\n` +
      `Silakan hubungi kami untuk jadwal pengambilan. Terima kasih telah mempercayakan perawatan kepada kami! 🏨🐾`
    );
  }
  return rows.length;
}

async function sendLowStockAlert(): Promise<number> {
  const { rows: items } = await pool.query<{ name: string; stock: number; min_stock: number; unit: string }>(
    `SELECT name, stock, min_stock, unit FROM stock_items
     WHERE stock < min_stock AND min_stock > 0
     ORDER BY (min_stock - stock) DESC LIMIT 20`
  );
  if (items.length === 0) return 0;

  const { rows: cfg } = await pool.query("SELECT settings FROM app_settings LIMIT 1");
  const phone: string | undefined = cfg[0]?.settings?.clinicPhone || cfg[0]?.settings?.waPhoneConnected;
  if (!phone) return 0;

  const lines = items.map((i) => `• ${i.name}: sisa *${i.stock} ${i.unit}* (min: ${i.min_stock})`).join("\n");
  await sendWhatsAppMessage(phone,
    `⚠️ *Alert Stok Menipis — ${new Date().toLocaleDateString("id-ID")}*\n\n` +
    `Item berikut perlu segera direstok:\n${lines}\n\nSegera buat Purchase Order.`
  );
  return items.length;
}

async function runReminders() {
  const jobs = [
    sendVaccineReminders().then((n) => n > 0 && console.log(`[ReminderJob] ${n} reminder vaksin terkirim.`)),
    sendGroomingReminders().then((n) => n > 0 && console.log(`[ReminderJob] ${n} reminder grooming terkirim.`)),
    sendHotelCheckoutReminders().then((n) => n > 0 && console.log(`[ReminderJob] ${n} reminder checkout hotel terkirim.`)),
    sendLowStockAlert().then((n) => n > 0 && console.log(`[ReminderJob] Alert stok menipis: ${n} item.`)),
  ];
  await Promise.allSettled(jobs).then((results) =>
    results.forEach((r) => r.status === "rejected" && console.error("[ReminderJob]", r.reason?.message))
  );
}

export function startReminderJob() {
  runReminders();
  setInterval(runReminders, 24 * 60 * 60 * 1000);
}
