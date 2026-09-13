// Helper terpusat untuk pembayaran QRIS nyata (Midtrans) di frontend.
//
// Begitu backend terhubung ke Midtrans (MIDTRANS_SERVER_KEY sudah diisi di .env
// server), memanggil createQrisPayment() menghasilkan QR sungguhan yang bisa
// di-scan pelanggan. Selama key belum dikonfigurasi, backend membalas
// simulated:true — pemanggil (BillingFinanceModule/PetShopModule) bertanggung
// jawab menampilkan fallback QR dekoratif dalam kondisi itu.

import { authHeaders } from './authToken';

export interface QrisPaymentResult {
  success: boolean;
  simulated: boolean;
  qrImageUrl?: string;
  transactionId?: string;
  expiryTime?: string;
  message?: string;
}

export async function createQrisPayment(
  orderId: string,
  grossAmount: number,
  customerName: string
): Promise<QrisPaymentResult> {
  try {
    const res = await fetch('/api/payment/qris/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ orderId, grossAmount, customerName })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, simulated: false, message: e?.message || 'Tidak dapat terhubung ke server pembayaran.' };
  }
}

export type PaymentStatus = 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny' | 'error' | 'not_found';

/**
 * Polling ringan status transaksi sampai lunas (settlement/capture), gagal
 * (expire/cancel/deny), atau `intervalMs * maxAttempts` terlampaui. Mengembalikan
 * fungsi `stop()` untuk membatalkan polling secara manual (mis. saat modal ditutup).
 */
export function pollPaymentStatus(
  orderId: string,
  opts: {
    onSettled: (status: PaymentStatus) => void;
    intervalMs?: number;
    maxAttempts?: number;
  }
): { stop: () => void } {
  const intervalMs = opts.intervalMs ?? 3000;
  const maxAttempts = opts.maxAttempts ?? 200; // ~10 menit pada interval 3 detik
  let attempts = 0;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    attempts += 1;
    try {
      const res = await fetch(`/api/payment/status/${encodeURIComponent(orderId)}`, {
        headers: authHeaders()
      });
      const data = await res.json();
      const status: PaymentStatus = data?.status || 'pending';

      if (status === 'settlement' || status === 'expire' || status === 'cancel' || status === 'deny') {
        opts.onSettled(status);
        return;
      }
    } catch {
      // Abaikan error jaringan sesaat, coba lagi di tick berikutnya.
    }

    if (!stopped && attempts < maxAttempts) {
      setTimeout(tick, intervalMs);
    } else if (!stopped) {
      opts.onSettled('expire');
    }
  };

  setTimeout(tick, intervalMs);

  return {
    stop: () => {
      stopped = true;
    }
  };
}
