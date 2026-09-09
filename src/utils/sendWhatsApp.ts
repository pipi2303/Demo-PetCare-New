// Helper terpusat untuk mengirim notifikasi WhatsApp ke pelanggan.
//
// Begitu backend terhubung ke Fonnte (WA_TOKEN sudah diisi di .env server), pesan
// terkirim otomatis tanpa staf perlu klik apa pun. Selama token belum dikonfigurasi,
// fungsi ini otomatis fallback membuka tautan wa.me manual — perilaku lama sebelum
// otomatisasi ini ditambahkan — sehingga fitur tidak pernah rusak di lingkungan demo/lokal.

export interface WhatsAppSendOutcome {
  auto: boolean; // true = terkirim otomatis via Fonnte, false = fallback tautan manual dibuka
}

function normalizeIndonesianPhone(rawPhone: string): string {
  const digitsOnly = (rawPhone || '').replace(/[^0-9]/g, '');
  if (digitsOnly.startsWith('0')) return `62${digitsOnly.slice(1)}`;
  if (digitsOnly.startsWith('62')) return digitsOnly;
  return `62${digitsOnly}`;
}

export async function sendWhatsAppNotification(rawPhone: string, message: string): Promise<WhatsAppSendOutcome> {
  try {
    const res = await fetch('/api/wa/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rawPhone, message }),
    });
    const data = await res.json();
    if (data?.success) {
      return { auto: true };
    }
  } catch {
    // Backend tidak terjangkau — lanjut ke fallback tautan manual di bawah.
  }

  const cleanPhone = normalizeIndonesianPhone(rawPhone);
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
  return { auto: false };
}
