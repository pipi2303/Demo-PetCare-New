import React, { useState, useMemo } from 'react';
import {
  Coins,
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  DollarSign,
  CreditCard,
  QrCode,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Lock,
  Building2,
  Sparkles
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { CashDrawerSettlement, Invoice } from '../../types';

interface CashDrawerSettlementModalProps {
  onClose: () => void;
}

export const CashDrawerSettlementModal: React.FC<CashDrawerSettlementModalProps> = ({ onClose }) => {
  const { invoices = [], addAuditLog, activeBranchId, branches = [] } = useData();
  const { user } = useAuth();
  const { addToast } = useToast();

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const [shift, setShift] = useState<CashDrawerSettlement['shift']>('Siang');
  const [cashierName, setCashierName] = useState<string>(user?.name || 'Siti Rahma (Kasir)');
  const [startingCash, setStartingCash] = useState<number>(500000); // Modal Awal
  const [handoverTo, setHandoverTo] = useState<string>('Budi Santoso (Kasir Shift Malam)');
  const [settlementNotes, setSettlementNotes] = useState<string>('Tutup shift operasional POS kasir berjalan lancar, tidak ada kendala printer atau koneksi EDC.');
  const [isSettled, setIsSettled] = useState<boolean>(false);
  const [savedSlip, setSavedSlip] = useState<CashDrawerSettlement | null>(null);

  // Denominations Counter State
  const [denom, setDenom] = useState<Record<string, number>>({
    '100000': 18,
    '50000': 14,
    '20000': 12,
    '10000': 15,
    '5000': 20,
    '2000': 10,
    '1000': 10,
    'coin': 25000
  });

  // Calculate actual physical cash from denomination input
  const physicalCashTotal = useMemo(() => {
    return (
      (denom['100000'] || 0) * 100000 +
      (denom['50000'] || 0) * 50000 +
      (denom['20000'] || 0) * 20000 +
      (denom['10000'] || 0) * 10000 +
      (denom['5000'] || 0) * 5000 +
      (denom['2000'] || 0) * 2000 +
      (denom['1000'] || 0) * 1000 +
      (denom['coin'] || 0)
    );
  }, [denom]);

  // Aggregate today's sales from invoices — hari ini saja (bukan sepanjang
  // masa) supaya rekonsiliasi shift benar-benar mencerminkan uang yang masuk
  // hari ini. Tidak ada fallback angka contoh: kalau omzet riil Rp0, tampilkan
  // Rp0 apa adanya — alat rekonsiliasi kas tidak boleh menyembunyikan selisih
  // sungguhan di balik angka fiktif.
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayInvoices = invoices.filter((inv) => inv.status === 'Lunas' && inv.date === todayStr);

  const cashSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'Tunai')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const qrisSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'QRIS' || inv.paymentMethod === 'GoPay' || inv.paymentMethod === 'OVO' || inv.paymentMethod === 'Dana')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const debitCardSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'Debit' || inv.paymentMethod === 'Kartu Kredit')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const transferSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'Transfer Bank' || inv.paymentMethod === 'Midtrans Online')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const nonCashTotal = qrisSales + debitCardSales + transferSales;
  const grandTotalSales = cashSales + nonCashTotal;

  // Expected cash in drawer = Starting float + Cash sales
  const expectedCashInDrawer = startingCash + cashSales;
  const variance = physicalCashTotal - expectedCashInDrawer;

  const handleDenomChange = (key: string, val: number) => {
    setDenom((prev) => ({
      ...prev,
      [key]: Math.max(0, val)
    }));
  };

  const handleConfirmSettlement = () => {
    const settlementNo = `SETTLE-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const record: CashDrawerSettlement = {
      id: `cd_${Date.now()}`,
      settlementNo,
      shift,
      cashierName,
      openedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      closedAt: new Date().toISOString(),
      startingCash,
      cashSales,
      nonCashSales: {
        qris: qrisSales,
        debit: debitCardSales,
        transfer: transferSales,
        total: nonCashTotal
      },
      expectedCashTotal: expectedCashInDrawer,
      actualCashCount: physicalCashTotal,
      variance,
      cashBreakdown: denom,
      notes: settlementNotes,
      status: variance === 0 ? 'Balanced' : 'Discrepancy',
      branchName: activeBranch?.name || 'Cabang Utama'
    };

    setSavedSlip(record);
    setIsSettled(true);

    if (addAuditLog) {
      addAuditLog(
        'Tambah',
        'Kasir POS / Keuangan',
        `Tutup Shift Kasir ${settlementNo}`,
        `Rekonsiliasi kasir shift ${shift} selesai. Total omzet POS: Rp ${grandTotalSales.toLocaleString('id-ID')}, Uang fisik kasir: Rp ${physicalCashTotal.toLocaleString('id-ID')}, Selisih: Rp ${variance.toLocaleString('id-ID')}.`,
        { userName: cashierName, userRole: 'kasir', severity: variance === 0 ? 'Info' : 'Kritis' }
      );
    }

    addToast(`Tutup Shift & Rekonsiliasi Kasir ${settlementNo} berhasil disimpan!`, 'success');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#B8905A]/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#1E3050] text-white px-5 py-4 flex items-center justify-between border-b border-[#B8905A]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-md">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display">
                  Rekonsiliasi Kasir & Tutup Shift (Cash Drawer Settlement)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40">
                  End of Shift Audit
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE]/80">
                Pencocokan saldo uang fisik laci kasir terhadap transaksi sistem, rekap non-tunai, dan serah terima shift.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#E1D6BE]/70 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-[#101A2C]">
          {isSettled && savedSlip ? (
            /* Settlement Success & Printable Slip */
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-emerald-950 font-display">
                  Tutup Shift Kasir Berhasil Disahkan
                </h4>
                <p className="text-xs text-emerald-800">
                  Nomor Bukti Rekonsiliasi: <strong>{savedSlip.settlementNo}</strong> • Status Kasir:{' '}
                  <span className="font-bold underline">
                    {savedSlip.variance === 0 ? 'Tepat Sesuai (Balanced)' : `Selisih Rp ${savedSlip.variance.toLocaleString('id-ID')}`}
                  </span>
                </p>
              </div>

              {/* Printable Receipt Layout */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300 font-mono text-xs space-y-4 max-w-xl mx-auto shadow-inner">
                <div className="text-center border-b border-dashed border-slate-400 pb-3">
                  <h4 className="font-black text-sm font-sans">PETCARE HOSPITAL & PET SHOP ERP</h4>
                  <p className="text-[11px] text-slate-600">{savedSlip.branchName}</p>
                  <p className="text-[11px] text-slate-600">SLIP REKONSILIASI KASIR POS</p>
                  <p className="text-[10px] text-slate-500 mt-1">{new Date(savedSlip.closedAt).toLocaleString('id-ID')}</p>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3 text-[11px]">
                  <div className="flex justify-between">
                    <span>No. Rekonsiliasi:</span>
                    <span className="font-bold">{savedSlip.settlementNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir Bertugas:</span>
                    <span>{savedSlip.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shift Operasional:</span>
                    <span>Shift {savedSlip.shift}</span>
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>(+) Modal Kasir Awal:</span>
                    <span>Rp {savedSlip.startingCash.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>(+) Penjualan Kas Tunai:</span>
                    <span>Rp {savedSlip.cashSales.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-300">
                    <span>(=) Total Uang Kas Seharusnya:</span>
                    <span>Rp {savedSlip.expectedCashTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-indigo-900">
                    <span>(✔) Uang Fisik Kasir (Hasil Hitung):</span>
                    <span>Rp {savedSlip.actualCashCount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-400">
                    <span>SELISIH (VARIANCE):</span>
                    <span className={savedSlip.variance === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      Rp {savedSlip.variance.toLocaleString('id-ID')} ({savedSlip.variance === 0 ? 'PAS' : savedSlip.variance > 0 ? 'LEBIH' : 'KURANG'})
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3 text-[11px]">
                  <p className="font-bold text-slate-800">Rekap Non-Tunai (Auto-Settled Bank):</p>
                  <div className="flex justify-between text-slate-600">
                    <span>• QRIS (GoPay/OVO/Shopee):</span>
                    <span>Rp {savedSlip.nonCashSales.qris.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>• EDC Debit / CC:</span>
                    <span>Rp {savedSlip.nonCashSales.debit.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>• Transfer Bank:</span>
                    <span>Rp {savedSlip.nonCashSales.transfer.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Omzet Non-Tunai:</span>
                    <span>Rp {savedSlip.nonCashSales.total.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center pt-2 text-[10px]">
                  <div className="space-y-8">
                    <p>Kasir Yang Menyerahkan,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">({savedSlip.cashierName})</p>
                  </div>
                  <div className="space-y-8">
                    <p>Kasir Yang Menerima / SPV,</p>
                    <p className="font-bold border-t border-slate-400 pt-1">({handoverTo})</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak Struk Tutup Shift
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white font-bold rounded-xl text-xs shadow-md hover:brightness-110 cursor-pointer"
                >
                  Selesai & Tutup Jendela
                </button>
              </div>
            </div>
          ) : (
            /* Setup & Denomination Input */
            <div className="space-y-6">
              {/* Shift Info & Float Cash Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Shift Operasional</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                  >
                    <option value="Pagi">Shift Pagi (07:00 - 15:00)</option>
                    <option value="Siang">Shift Siang (15:00 - 22:00)</option>
                    <option value="Malam">Shift Malam (22:00 - 07:00)</option>
                    <option value="Full Day">Full Day / Harian Penuh</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kasir Bertugas</label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Modal Kasir Awal (Float Cash)</label>
                  <input
                    type="number"
                    value={startingCash}
                    onChange={(e) => setStartingCash(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
                  />
                </div>
              </div>

              {/* Real-time Sales Revenue Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Penjualan Tunai:
                  </span>
                  <p className="text-base font-black text-emerald-950">Rp {cashSales.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-emerald-700">Masuk ke laci kasir</p>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" /> QRIS & E-Wallet:
                  </span>
                  <p className="text-base font-black text-blue-950">Rp {qrisSales.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-blue-700">GoPay, OVO, QRIS</p>
                </div>

                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" /> EDC Debit / CC:
                  </span>
                  <p className="text-base font-black text-purple-950">Rp {debitCardSales.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-purple-700">BCA, Mandiri, BRI</p>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" /> Total Omzet Shift:
                  </span>
                  <p className="text-base font-black text-amber-950">Rp {grandTotalSales.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-amber-700">Semua metode lunas</p>
                </div>
              </div>

              {/* Physical Denominations Counter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#B8905A]" />
                    Hitung Uang Fisik Di Laci Kasir (Pecahan Lembar & Koin):
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">Masukkan jumlah lembar uang</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 100.000 (Lembar)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={denom['100000'] || 0}
                        onChange={(e) => handleDenomChange('100000', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">= {((denom['100000'] || 0) * 100).toLocaleString('id-ID')}k</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 50.000 (Lembar)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={denom['50000'] || 0}
                        onChange={(e) => handleDenomChange('50000', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">= {((denom['50000'] || 0) * 50).toLocaleString('id-ID')}k</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 20.000 (Lembar)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={denom['20000'] || 0}
                        onChange={(e) => handleDenomChange('20000', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">= {((denom['20000'] || 0) * 20).toLocaleString('id-ID')}k</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 10.000 (Lembar)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={denom['10000'] || 0}
                        onChange={(e) => handleDenomChange('10000', Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">= {((denom['10000'] || 0) * 10).toLocaleString('id-ID')}k</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 5.000 (Lembar)</label>
                    <input
                      type="number"
                      value={denom['5000'] || 0}
                      onChange={(e) => handleDenomChange('5000', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 2.000 (Lembar)</label>
                    <input
                      type="number"
                      value={denom['2000'] || 0}
                      onChange={(e) => handleDenomChange('2000', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Rp 1.000 (Lembar)</label>
                    <input
                      type="number"
                      value={denom['1000'] || 0}
                      onChange={(e) => handleDenomChange('1000', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Total Koin Receh (Rp)</label>
                    <input
                      type="number"
                      value={denom['coin'] || 0}
                      onChange={(e) => handleDenomChange('coin', Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Reconciliation Balance Card */}
              <div className="p-4 rounded-xl border-2 bg-gradient-to-br from-slate-900 to-[#16233B] text-white space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#E1D6BE]/70">Uang Kas Seharusnya (Modal + Tunai):</span>
                    <p className="text-base font-bold text-[#D9B98A]">Rp {expectedCashInDrawer.toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <span className="text-[#E1D6BE]/70">Total Uang Fisik Terhitung:</span>
                    <p className="text-base font-bold text-white">Rp {physicalCashTotal.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-right">
                    <span className="text-[10px] text-[#E1D6BE]/80 block font-semibold">SELISIH KAS (VARIANCE):</span>
                    <span
                      className={`text-lg font-black ${
                        variance === 0 ? 'text-emerald-400' : variance > 0 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {variance === 0 ? 'Rp 0 (Sempurna/Pas)' : `Rp ${variance.toLocaleString('id-ID')} (${variance > 0 ? 'Lebih' : 'Kurang'})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Handover & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Serah Terima Kas Ke Kasir / Supervisor</label>
                  <input
                    type="text"
                    value={handoverTo}
                    onChange={(e) => setHandoverTo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                    placeholder="Nama kasir penerima / SPV"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Khusus Shift</label>
                  <input
                    type="text"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                    placeholder="Contoh: Saldo EDC mandiri telah di batch close..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#B8905A] text-white font-black rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Sahkan & Cetak Tutup Shift
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
