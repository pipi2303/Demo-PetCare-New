import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { createQrisPayment, pollPaymentStatus, PaymentStatus } from '../../utils/payment';
import {
  Receipt,
  QrCode,
  DollarSign,
  CreditCard,
  Building2,
  TrendingUp,
  PieChart,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  BarChart2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface BillingFinanceModuleProps {
  activeModule?: 'billing' | 'finance' | string;
}

export const BillingFinanceModule: React.FC<BillingFinanceModuleProps> = ({ activeModule = 'billing' }) => {
  const { invoices = [], cashTransactions = [], productCategories = [], addInvoice, processPayment, addCashTransaction } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pos' | 'cashbook' | 'pl'>(
    activeModule === 'finance' ? 'cashbook' : 'pos'
  );

  React.useEffect(() => {
    if (activeModule === 'finance' && activeTab === 'pos') {
      setActiveTab('cashbook');
    } else if (activeModule === 'billing' && (activeTab === 'cashbook' || activeTab === 'pl')) {
      setActiveTab('pos');
    }
  }, [activeModule]);
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<any>('QRIS');

  // Real QRIS payment state (Midtrans). qrisPhase 'idle' means: not a QRIS
  // payment in progress (either a different payment method is selected, or
  // the modal isn't open) — in that case the old decorative QR + manual
  // "Konfirmasi Lunas" flow is used unchanged for staff-confirmed methods.
  const [qrisPhase, setQrisPhase] = useState<'idle' | 'loading' | 'waiting_real' | 'waiting_simulated' | 'failed'>('idle');
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
  const [qrisMessage, setQrisMessage] = useState<string>('');
  const pollRef = React.useRef<{ stop: () => void } | null>(null);

  // Simple new invoice state
  const [custName, setCustName] = useState('Budi Santoso');
  const [petName, setPetName] = useState('Mimi');
  const [itemCategory, setItemCategory] = useState('Klinik');
  const [itemName, setItemName] = useState('Pemeriksaan Umum & Resep Obat');
  const [itemPrice, setItemPrice] = useState(150000);

  // Cashbook entry form
  // Nilai HARUS persis 'Masuk'/'Keluar' — sama dengan union CashTransaction['type']
  // di types.ts. Sebelumnya di sini 'In'/'Out', jadi SETIAP pencatatan kas manual
  // (sewa, listrik, maintenance, dst — sumber utama beban operasional) tersimpan
  // dengan type yang tidak pernah cocok dengan filter type==='Keluar' di manapun
  // (tab Laba/Rugi, Laporan Keuangan PDF) — beban itu senyap dari kedua laporan.
  const [cashType, setCashType] = useState<'Masuk' | 'Keluar'>('Keluar');
  const [cashCategory, setCashCategory] = useState('Operasional');
  const [cashDescription, setCashDescription] = useState('Pembelian Alat Tulis & Pembersih Klinik');
  const [cashAmount, setCashAmount] = useState(250000);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvId) || invoices[0];

  const handleCreateInvoice = async () => {
    try {
      const inv = await addInvoice({
        customerId: 'c1',
        customerName: custName,
        petName,
        items: [
          {
            id: 'item_' + Date.now(),
            category: itemCategory,
            name: itemName,
            quantity: 1,
            unitPrice: itemPrice,
            totalPrice: itemPrice
          }
        ],
        subtotal: itemPrice,
        discountAmount: 0,
        totalAmount: itemPrice,
        paidAmount: 0,
        paymentMethod: 'QRIS',
        status: 'Belum Dibayar',
        loyaltyPointsEarned: Math.floor(itemPrice / 10000),
        cashierName: 'Kasir Utama'
      });

      addToast(`Invoice baru ${inv.invoiceNo} senilai Rp ${itemPrice.toLocaleString('id-ID')} dibuat.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal membuat invoice.', 'error');
    }
  };

  const stopQrisPolling = () => {
    pollRef.current?.stop();
    pollRef.current = null;
  };

  const handleOpenPayment = (invId: string) => {
    setSelectedInvId(invId);
    setPaymentMethod('QRIS');
    setShowQrisModal(true);
  };

  const handleCloseQrisModal = () => {
    stopQrisPolling();
    setQrisPhase('idle');
    setQrisImageUrl(null);
    setShowQrisModal(false);
  };

  // Metode selain QRIS tetap staff-confirmed langsung (Tunai/Debit/Kartu
  // Kredit/Transfer Bank tidak lewat payment gateway — dicatat manual seperti
  // sebelumnya, itu memang di luar skop integrasi Midtrans).
  const isConfirmingPaymentRef = React.useRef(false);
  const handleConfirmManualPayment = async () => {
    if (!selectedInvId || isConfirmingPaymentRef.current) return;
    isConfirmingPaymentRef.current = true;
    try {
      await processPayment(selectedInvId, paymentMethod);
      setShowQrisModal(false);
      addToast(`Pembayaran Rp ${selectedInvoice?.totalAmount.toLocaleString('id-ID')} via ${paymentMethod} LUNAS!`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal memproses pembayaran.', 'error');
    } finally {
      isConfirmingPaymentRef.current = false;
    }
  };

  // Membuat charge QRIS nyata via Midtrans (server/paymentService.ts). Kalau
  // gateway belum dikonfigurasi (MIDTRANS_SERVER_KEY kosong), backend balas
  // simulated:true dan modal fallback ke QR dekoratif + konfirmasi manual
  // seperti perilaku sebelum integrasi ini ada — tidak pernah mematahkan fitur.
  const handleStartQrisPayment = async () => {
    if (!selectedInvoice) return;
    stopQrisPolling();
    setQrisPhase('loading');
    setQrisImageUrl(null);
    setQrisMessage('');

    const result = await createQrisPayment(selectedInvoice.invoiceNo, selectedInvoice.totalAmount, selectedInvoice.customerName);

    if (result.simulated) {
      setQrisPhase('waiting_simulated');
      return;
    }
    if (!result.success || !result.qrImageUrl) {
      setQrisPhase('failed');
      setQrisMessage(result.message || 'Gagal membuat kode QRIS. Coba lagi.');
      return;
    }

    setQrisImageUrl(result.qrImageUrl);
    setQrisPhase('waiting_real');

    pollRef.current = pollPaymentStatus(selectedInvoice.invoiceNo, {
      onSettled: async (status: PaymentStatus) => {
        if (status === 'settlement') {
          try {
            await processPayment(selectedInvoice.id, 'QRIS');
            addToast(`Pembayaran QRIS Rp ${selectedInvoice.totalAmount.toLocaleString('id-ID')} untuk ${selectedInvoice.invoiceNo} berhasil dikonfirmasi!`, 'success');
          } catch (err: any) {
            addToast(err?.message || 'Gagal mengonfirmasi pembayaran QRIS.', 'error');
          }
          handleCloseQrisModal();
        } else {
          setQrisPhase('failed');
          setQrisMessage(
            status === 'expire' ? 'Kode QRIS kedaluwarsa sebelum dibayar.' : 'Pembayaran dibatalkan atau ditolak.'
          );
        }
      }
    });
  };

  React.useEffect(() => {
    if (showQrisModal && paymentMethod === 'QRIS' && qrisPhase === 'idle') {
      handleStartQrisPayment();
    }
    if (showQrisModal && paymentMethod !== 'QRIS' && qrisPhase !== 'idle') {
      stopQrisPolling();
      setQrisPhase('idle');
      setQrisImageUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQrisModal, paymentMethod]);

  React.useEffect(() => () => stopQrisPolling(), []);

  const handleAddCashRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashDescription || cashAmount <= 0) {
      addToast('Harap isi deskripsi dan nominal transaksi kas!', 'error');
      return;
    }

    try {
      await addCashTransaction({
        type: cashType,
        category: cashCategory,
        description: cashDescription,
        amount: cashAmount,
        operator: 'Manager Keuangan'
      });

      addToast(`Pencatatan Kas ${cashType} senilai Rp ${cashAmount.toLocaleString('id-ID')} berhasil disimpan.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan pencatatan kas.', 'error');
      return;
    }
    setCashDescription('');
    setCashAmount(100000);
  };

  // Profit & Loss — dihitung dari invoice & buku kas sungguhan, bukan angka
  // contoh. Pendapatan per unit bisnis dipetakan dari kategori tiap item
  // invoice: 'Klinik'/'Grooming'/'Pet Hotel'/'Pet Shop' dipakai langsung oleh
  // form billing manual di tab ini, 'Telehealth' (dari modul Layanan)
  // dianggap bagian Klinik, dan kategori produk apa pun yang cocok dengan
  // Master Data Kategori Produk (Makanan, Obat, dst — dipakai kasir Pet Shop)
  // dianggap Pet Shop. Beban operasional TIDAK ditandai per unit di Buku Kas
  // saat ini, jadi hanya ditampilkan sebagai total keseluruhan — memecahnya
  // per unit tanpa data nyata hanya akan mengarang ulang angka yang sama
  // seperti sebelumnya.
  const productCategoryNames = new Set(productCategories.map((c) => c.name));
  const BUSINESS_UNITS = ['Klinik', 'Grooming', 'Pet Hotel', 'Pet Shop'] as const;
  const classifyUnit = (category: string): (typeof BUSINESS_UNITS)[number] | 'Lainnya' => {
    if (category === 'Telehealth') return 'Klinik';
    if ((BUSINESS_UNITS as readonly string[]).includes(category)) return category as (typeof BUSINESS_UNITS)[number];
    if (productCategoryNames.has(category)) return 'Pet Shop';
    return 'Lainnya';
  };

  const paidInvoices = invoices.filter((inv) => inv.status === 'Lunas');
  const unitRevenue: Record<string, number> = { Klinik: 0, Grooming: 0, 'Pet Hotel': 0, 'Pet Shop': 0, Lainnya: 0 };
  paidInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const unit = classifyUnit(item.category);
      unitRevenue[unit] += item.totalPrice;
    });
  });

  const totalRev = Object.values(unitRevenue).reduce((a, b) => a + b, 0);
  const totalExp = cashTransactions.filter((ct) => ct.type === 'Keluar').reduce((sum, ct) => sum + ct.amount, 0);
  const netProfit = totalRev - totalExp;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#1B2A45] rounded-xl p-5 text-[#FFFDF9] border border-[#B8905A]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40 text-[11px] font-semibold uppercase tracking-wider">
            Kasir, Billing & Buku Kas Keuangan
          </span>
          <h2 className="text-xl font-bold mt-1 text-[#FFFDF9] font-display">
            Point of Sales, Buku Kas Jurnal & Laporan Laba Rugi
          </h2>
          <p className="text-xs text-[#EDE6D6]/80 mt-0.5">
            Proses transaksi gabungan klinik, pet shop & hotel dengan simulasi QRIS instan, pencatatan kas masuk/keluar, serta breakdown laba rugi per unit bisnis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pos'
                ? 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <Receipt className="w-4 h-4" /> Billing & POS Kasir
          </button>
          <button
            onClick={() => setActiveTab('cashbook')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cashbook'
                ? 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <Wallet className="w-4 h-4" /> Buku Kas & Jurnal
          </button>
          <button
            onClick={() => setActiveTab('pl')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'pl'
                ? 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <PieChart className="w-4 h-4" /> Laba / Rugi Per Unit
          </button>
        </div>
      </div>

      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Invoices List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#B8905A]" /> Daftar Invoice & Status Pelunasan
                </h3>
              </div>

              <div className="divide-y divide-[#E1D6BE]">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1B2A45] text-sm">{inv.invoiceNo}</span>
                        <span className="text-[#22242B] font-semibold">{inv.customerName}</span>
                        {inv.petName && <span className="text-[10px] text-[#6B6656]">({inv.petName})</span>}
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                            inv.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-[#6B6656] text-[11px] mt-0.5">
                        Tgl: {inv.date} | Total: <span className="font-bold text-[#1B2A45]">Rp {inv.totalAmount.toLocaleString('id-ID')}</span>
                      </p>
                    </div>

                    {inv.status === 'Belum Dibayar' ? (
                      <button
                        onClick={() => handleOpenPayment(inv.id)}
                        className="px-3.5 py-1.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Bayar QRIS / Kasir
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Lunas ({inv.paymentMethod})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Quick Create Invoice */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Buat Invoice / Transaksi POS Baru
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Nama Pelanggan</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Nama Pasien / Anabul</label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Kategori Layanan</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                >
                  <option value="Klinik">Klinik & Tindakan</option>
                  <option value="Grooming">Grooming</option>
                  <option value="Pet Hotel">Pet Hotel</option>
                  <option value="Pet Shop">Pet Shop Product</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Nama Item / Layanan</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Total Biaya (Rp)</label>
                <input
                  type="number"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <button
                onClick={handleCreateInvoice}
                className="w-full py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all mt-2 flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4 text-[#D9B98A]" /> Generasi Invoice Kasir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CASHBOOK & PETTY CASH */}
      {activeTab === 'cashbook' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#B8905A]" /> Mutasi Jurnal Kas Masuk & Kas Keluar
                </h3>
                <span className="text-xs text-[#6B6656]">Total {cashTransactions.length} Transaksi Recorded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#22242B]">
                  <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Tipe Jurnal</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Deskripsi Transaksi</th>
                      <th className="p-2.5">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1D6BE]">
                    {cashTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="p-2.5 font-mono text-[#6B6656]">{tx.date}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                              tx.type === 'Masuk' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type === 'Masuk' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            Kas {tx.type === 'Masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold">{tx.category}</td>
                        <td className="p-2.5">{tx.description}</td>
                        <td
                          className={`p-2.5 font-bold font-mono ${
                            tx.type === 'Masuk' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type === 'Masuk' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Form Catat Mutasi Kas Kecil
            </h3>

            <form onSubmit={handleAddCashRecord} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashType('Keluar')}
                    className={`py-2 rounded font-bold border transition-all ${
                      cashType === 'Keluar' ? 'bg-rose-800 text-white border-rose-800' : 'bg-[#F6F1E6] text-[#22242B]'
                    }`}
                  >
                    Kas Keluar (Beban)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashType('Masuk')}
                    className={`py-2 rounded font-bold border transition-all ${
                      cashType === 'Masuk' ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-[#F6F1E6] text-[#22242B]'
                    }`}
                  >
                    Kas Masuk (Injeksi)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Kategori Biaya</label>
                <select
                  value={cashCategory}
                  onChange={(e) => setCashCategory(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                >
                  <option value="Operasional">Operasional & ATK</option>
                  <option value="Listrik & Air">Listrik, Air & Internet</option>
                  <option value="Maintenance">Maintenance Alat & AC</option>
                  <option value="Makan Staf">Konsumsi & Dapur Staf</option>
                  <option value="Lain-lain">Lain-lain</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Deskripsi Transaksi</label>
                <input
                  type="text"
                  required
                  value={cashDescription}
                  onChange={(e) => setCashDescription(e.target.value)}
                  placeholder="Deskripsi keperluan..."
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1B2A45] block mb-1">Nominal Transaksi (Rp)</label>
                <input
                  type="number"
                  required
                  value={cashAmount}
                  onChange={(e) => setCashAmount(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all mt-2"
              >
                Simpan Mutasi Kas
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'pl' && (
        <div className="space-y-5">
          {/* Top KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E1D6BE] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B6656] uppercase">Total Pendapatan (Omzet)</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">Rp {totalRev.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E1D6BE] shadow-2xs">
              <span className="text-[11px] font-bold text-[#6B6656] uppercase">Total Beban Operasional</span>
              <p className="text-xl font-bold text-rose-700 mt-1">Rp {totalExp.toLocaleString('id-ID')}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#1B2A45] text-[#FFFDF9] border border-[#B8905A]/30 shadow-2xs">
              <span className="text-[11px] font-bold text-[#D9B98A] uppercase">Laba Bersih (Net Profit)</span>
              <p className="text-xl font-bold text-[#FFFDF9] mt-1">Rp {netProfit.toLocaleString('id-ID')}</p>
            </div>
          </div>

          {/* Business Unit Breakdown */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display border-b border-[#E1D6BE] pb-2 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#B8905A]" /> Pendapatan Per Unit Bisnis (dari Invoice Lunas)
            </h3>
            <p className="text-[11px] text-[#6B6656] -mt-2">
              Beban operasional belum ditandai per unit di Buku Kas, jadi hanya ditampilkan sebagai total keseluruhan di atas — bukan dipecah per unit.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {BUSINESS_UNITS.map((unit) => {
                const rev = unitRevenue[unit];
                const share = totalRev > 0 ? (rev / totalRev) * 100 : 0;

                return (
                  <div key={unit} className="p-4 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] space-y-2">
                    <span className="text-xs font-bold text-[#1B2A45] uppercase tracking-wider block">{unit}</span>
                    <div className="text-xs space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span className="text-[#6B6656]">Pendapatan:</span>
                        <span className="font-bold text-emerald-700">Rp {rev.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E1D6BE]">
                        <span className="font-bold text-[#1B2A45]">Kontribusi Omzet:</span>
                        <span className="font-bold text-[#1B2A45]">{share.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {unitRevenue.Lainnya > 0 && (
              <p className="text-[11px] text-[#6B6656]">
                + Rp {unitRevenue.Lainnya.toLocaleString('id-ID')} dari kategori item invoice yang belum terpetakan ke unit manapun.
              </p>
            )}
          </div>
        </div>
      )}

      {/* QRIS Modal */}
      {showQrisModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 space-y-5 shadow-2xl text-[#22242B]">
            <div className="text-center border-b border-[#E1D6BE] pb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/20 text-[#B8905A] text-[10px] font-bold uppercase">
                Payment Gateway & Instan QRIS
              </span>
              <h3 className="text-lg font-bold text-[#1B2A45] font-display mt-1">
                Pembayaran {selectedInvoice.invoiceNo}
              </h3>
              <p className="text-2xl font-extrabold text-[#1B2A45] mt-1">
                Rp {selectedInvoice.totalAmount.toLocaleString('id-ID')}
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-[#101A2C] p-4 rounded-xl text-center space-y-3 border border-[#B8905A]/30">
              {paymentMethod === 'QRIS' && qrisPhase === 'loading' && (
                <div className="w-48 h-48 mx-auto flex flex-col items-center justify-center gap-2 text-[#EDE6D6]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D9B98A]" />
                  <span className="text-[11px]">Membuat kode QRIS...</span>
                </div>
              )}

              {paymentMethod === 'QRIS' && qrisPhase === 'waiting_real' && qrisImageUrl && (
                <>
                  <div className="w-48 h-48 mx-auto bg-white p-3 rounded-lg flex items-center justify-center border-2 border-[#B8905A]">
                    <img src={qrisImageUrl} alt="Kode QRIS pembayaran" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[11px] text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menunggu pembayaran...
                  </p>
                  <p className="text-[11px] text-[#EDE6D6]/80 font-mono">
                    Scan QRIS via GoPay, OVO, Dana, BCA, atau Mobile Banking apapun
                  </p>
                </>
              )}

              {paymentMethod === 'QRIS' && qrisPhase === 'failed' && (
                <div className="w-48 h-48 mx-auto flex flex-col items-center justify-center gap-2 text-rose-300">
                  <AlertTriangle className="w-8 h-8" />
                  <span className="text-[11px] px-2">{qrisMessage}</span>
                  <button
                    onClick={handleStartQrisPayment}
                    className="mt-1 px-3 py-1.5 bg-[#B8905A] text-[#101A2C] font-bold text-[11px] rounded-lg flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Buat Ulang QRIS
                  </button>
                </div>
              )}

              {(paymentMethod !== 'QRIS' || qrisPhase === 'waiting_simulated' || qrisPhase === 'idle') && (
                <>
                  <div className="w-48 h-48 mx-auto bg-white p-3 rounded-lg flex items-center justify-center border-2 border-[#B8905A]">
                    {/* QR dekoratif (mode simulasi — gateway pembayaran belum dikonfigurasi, atau metode non-QRIS) */}
                    <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100">
                      <path d="M 10 10 H 30 V 30 H 10 Z M 70 10 H 90 V 30 H 70 Z M 10 70 H 30 V 90 H 10 Z" fill="currentColor" />
                      <path d="M 15 15 H 25 V 25 H 15 Z M 75 15 H 85 V 25 H 75 Z M 15 75 H 25 V 85 H 15 Z" fill="#1B2A45" />
                      <rect x="40" y="40" width="20" height="20" fill="#B8905A" />
                      <rect x="10" y="45" width="20" height="10" fill="currentColor" />
                      <rect x="45" y="10" width="10" height="20" fill="currentColor" />
                      <rect x="70" y="45" width="20" height="20" fill="currentColor" />
                      <rect x="45" y="70" width="20" height="20" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-[#EDE6D6]/80 font-mono">
                    {paymentMethod === 'QRIS'
                      ? 'Mode simulasi — payment gateway belum dikonfigurasi (MIDTRANS_SERVER_KEY)'
                      : 'Scan QRIS via GoPay, OVO, Dana, BCA, atau Mobile Banking'}
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-[#1B2A45] block mb-1">Pilih Metode Bayar</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded bg-[#F6F1E6] border border-[#E1D6BE] font-bold text-[#1B2A45]"
              >
                <option value="QRIS">QRIS Instan</option>
                <option value="Tunai">Tunai / Cash</option>
                <option value="Debit">Kartu Debit</option>
                <option value="Kartu Kredit">Kartu Kredit</option>
                <option value="Transfer Bank">Transfer Bank</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCloseQrisModal}
                className="w-1/2 py-2.5 bg-[#F6F1E6] hover:bg-[#E1D6BE]/50 text-[#1B2A45] font-bold text-xs rounded-lg transition-all border border-[#E1D6BE]"
              >
                Batal
              </button>
              {paymentMethod === 'QRIS' && qrisPhase === 'waiting_real' ? (
                <button
                  disabled
                  className="w-1/2 py-2.5 bg-[#1B2A45]/50 text-[#FFFDF9]/70 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Menunggu Pelanggan Bayar
                </button>
              ) : (
                <button
                  onClick={handleConfirmManualPayment}
                  disabled={paymentMethod === 'QRIS' && qrisPhase === 'loading'}
                  className="w-1/2 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Konfirmasi Lunas
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
