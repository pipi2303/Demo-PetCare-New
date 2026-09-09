// Layanan pengiriman WhatsApp otomatis untuk PetCare ERP, memakai Fonnte.
//
// Selama WA_TOKEN belum diisi di .env, sendWhatsAppMessage() mengembalikan
// { simulated: true } sehingga frontend tetap bisa fallback ke tautan wa.me manual
// (perilaku lama) — fitur tidak pernah rusak walau token belum disiapkan.
//
// CATATAN VERIFIKASI: payload di bawah mengikuti kontrak Fonnte "Simple Send Message"
// yang umum (POST https://api.fonnte.com/send, header Authorization: <token>,
// body target & message). Karena tidak bisa mengakses internet untuk mengecek ulang
// dokumentasi resmi Fonnte saat kode ini ditulis, mohon cocokkan sekali lagi dengan
// https://docs.fonnte.com sebelum dipakai ke pelanggan sungguhan — terutama format
// nomor tujuan (single vs banyak nomor) dan nama field respons error.

const FONNTE_SEND_URL = "https://api.fonnte.com/send";

export function isWaConfigured(): boolean {
  return !!process.env.WA_TOKEN;
}

export function normalizeIndonesianPhone(rawPhone: string): string {
  const digitsOnly = (rawPhone || "").replace(/[^0-9]/g, "");
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`;
  if (digitsOnly.startsWith("62")) return digitsOnly;
  return `62${digitsOnly}`;
}

export interface WhatsAppSendResult {
  success: boolean;
  simulated: boolean;
  message: string;
}

export async function sendWhatsAppMessage(rawPhone: string, message: string): Promise<WhatsAppSendResult> {
  const token = process.env.WA_TOKEN;
  const target = normalizeIndonesianPhone(rawPhone);

  if (!target) {
    return { success: false, simulated: false, message: "Nomor tujuan tidak valid." };
  }

  if (!token) {
    return {
      success: false,
      simulated: true,
      message: "WA_TOKEN belum dikonfigurasi — gunakan tautan WhatsApp manual sebagai fallback."
    };
  }

  try {
    const form = new URLSearchParams();
    form.set("target", target);
    form.set("message", message);
    form.set("countryCode", "62");

    const response = await fetch(FONNTE_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok || data?.status === false) {
      return {
        success: false,
        simulated: false,
        message: data?.reason || `Fonnte merespons dengan status HTTP ${response.status}.`
      };
    }

    return { success: true, simulated: false, message: "Pesan WhatsApp terkirim otomatis via Fonnte." };
  } catch (err: any) {
    return {
      success: false,
      simulated: false,
      message: `Gagal menghubungi Fonnte: ${err?.message || "unknown error"}`
    };
  }
}
