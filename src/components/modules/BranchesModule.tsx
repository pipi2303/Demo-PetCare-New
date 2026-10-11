import React, { useState } from 'react';
import {
  GitBranch,
  Building2,
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRightLeft,
  BarChart3,
  Search,
  Sparkles,
  Layers,
  Clock,
  ShieldCheck,
  Check,
  TrendingUp,
  Package,
  Calendar,
  Users,
  Store
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Branch } from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { usePermissions } from '../../hooks/usePermissions';

export const BranchesModule: React.FC = () => {
  const {
    branches = [],
    activeBranchId,
    setActiveBranchId,
    stockItems = [],
    addBranch,
    updateBranch,
    deleteBranch,
    interBranchTransfers = [],
    addInterBranchTransfer,
    markInterBranchTransferReceived,
    invoices = [],
    clinicVisits = [],
    pets = []
  } = useData();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canDeleteBranch = can('branches', 'delete');

  const [activeTab, setActiveTab] = useState<'branchesList' | 'stockTransfer' | 'analytics'>('branchesList');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // New Branch Form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchPic, setNewBranchPic] = useState('');

  // Data cabang aktual dari DataContext - tersinkron dengan seluruh modul lain (filter cabang, dsb)
  const allBranches = branches;

  // Riwayat mutasi stok antar cabang — sekarang dari koleksi persisten
  // DataContext (interBranchTransfers), bukan lagi useState lokal yang
  // di-seed 2 catatan contoh dan hilang setiap reload halaman.
  const transfers = interBranchTransfers;

  // Transfer Form State — pilih cabang & item stok SUNGGUHAN (bukan lagi
  // teks bebas tanpa validasi kuantitas terhadap stok yang benar-benar ada).
  const [transferSourceId, setTransferSourceId] = useState(allBranches[0]?.id || '');
  const [transferDestId, setTransferDestId] = useState(allBranches[1]?.id || '');
  const [transferStockItemId, setTransferStockItemId] = useState(stockItems[0]?.id || '');
  const [transferQty, setTransferQty] = useState<number>(5);
  const selectedTransferStock = stockItems.find((s) => s.id === transferStockItemId);

  // Analisis & Performa — dulu 3 kartu per-cabang dengan omset/pasien/growth
  // hardcoded (nama cabangnya bahkan tidak cocok dengan data cabang asli).
  // Invoice & CashTransaction tidak punya field branchId sama sekali di
  // seluruh aplikasi, jadi omset TIDAK BISA dipecah per cabang secara jujur
  // saat ini — diganti kartu konsolidasi seluruh jaringan dari data nyata,
  // dengan catatan eksplisit soal keterbatasan ini (bukan angka karangan).
  const todayStr = new Date().toISOString().substring(0, 10);
  const thisMonthKey = todayStr.slice(0, 7);
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);

  const revenueThisMonth = invoices
    .filter((i) => i.status === 'Lunas' && i.date?.startsWith(thisMonthKey))
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const revenueLastMonth = invoices
    .filter((i) => i.status === 'Lunas' && i.date?.startsWith(lastMonthKey))
    .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const revenueGrowthPercent =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : revenueThisMonth > 0
      ? 100
      : 0;
  const paidInvoicesThisMonth = invoices.filter((i) => i.status === 'Lunas' && i.date?.startsWith(thisMonthKey)).length;
  const activeClinicQueueToday = clinicVisits.filter((v) => v.status !== 'Selesai' && v.status !== 'Batal').length;

  const resetBranchForm = () => {
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchAddress('');
    setNewBranchPhone('');
    setNewBranchEmail('');
    setEditingBranch(null);
  };

  const openAddBranchModal = () => {
    resetBranchForm();
    setShowAddBranchModal(true);
  };

  const openEditBranchModal = (branch: Branch) => {
    setEditingBranch(branch);
    setNewBranchName(branch.name);
    setNewBranchCode(branch.code);
    setNewBranchAddress(branch.address);
    setNewBranchPhone(branch.phone);
    setNewBranchEmail(branch.email);
    setShowAddBranchModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) {
      addToast('Nama dan Kode Cabang wajib diisi!', 'warning');
      return;
    }

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, {
          name: newBranchName,
          code: newBranchCode.toUpperCase(),
          address: newBranchAddress || editingBranch.address,
          phone: newBranchPhone || editingBranch.phone,
          email: newBranchEmail || editingBranch.email
        });
        addToast(`Cabang "${newBranchName}" berhasil diperbarui!`, 'success');
      } else {
        const created = await addBranch({
          name: newBranchName,
          code: newBranchCode.toUpperCase(),
          address: newBranchAddress || 'Alamat cabang baru',
          phone: newBranchPhone || '+62 812-0000-0000',
          email: newBranchEmail || 'cabang@vetcare.id',
          isActive: true,
          isMainBranch: false
        });
        addToast(`Cabang baru "${created.name}" berhasil didaftarkan!`, 'success');
      }

      setShowAddBranchModal(false);
      resetBranchForm();
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan data cabang.', 'error');
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    if (branch.isMainBranch) {
      addToast('Kantor pusat tidak dapat dihapus.', 'error');
      return;
    }
    if (!canDeleteBranch) {
      addToast('Akun/grup Anda tidak memiliki hak "Hapus" untuk Manajemen Cabang. Hubungi Owner/Admin.', 'error');
      return;
    }
    if (!window.confirm(`Hapus cabang "${branch.name}"? Data terkait cabang ini tidak akan otomatis terhapus.`)) return;
    try {
      await deleteBranch(branch.id);
      addToast(`Cabang "${branch.name}" berhasil dihapus.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menghapus cabang.', 'error');
    }
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const sourceBranch = allBranches.find((b) => b.id === transferSourceId);
    const destBranch = allBranches.find((b) => b.id === transferDestId);
    if (!sourceBranch || !destBranch) {
      addToast('Pilih cabang asal dan tujuan yang valid.', 'error');
      return;
    }
    if (transferSourceId === transferDestId) {
      addToast('Cabang asal dan cabang tujuan tidak boleh sama!', 'error');
      return;
    }
    if (!selectedTransferStock) {
      addToast('Pilih produk/obat yang akan dimutasi.', 'error');
      return;
    }
    if (transferQty <= 0) {
      addToast('Jumlah mutasi harus lebih dari 0.', 'error');
      return;
    }
    if (transferQty > selectedTransferStock.stock) {
      addToast(`Stok ${selectedTransferStock.name} tidak mencukupi (tersedia ${selectedTransferStock.stock} ${selectedTransferStock.unit}).`, 'error');
      return;
    }

    // Catatan: stok itu satu pool bersama seluruh cabang (StockItem tidak
    // punya branchId), jadi mutasi ini TIDAK mengurangi/menambah angka
    // stock — hanya menerbitkan surat jalan + jejak audit StockMovement
    // yang benar-benar tersimpan (lihat addInterBranchTransfer).
    const created = addInterBranchTransfer({
      sourceBranchId: sourceBranch.id,
      sourceBranchName: sourceBranch.name,
      destBranchId: destBranch.id,
      destBranchName: destBranch.name,
      stockItemId: selectedTransferStock.id,
      itemName: selectedTransferStock.name,
      qty: transferQty,
      unit: selectedTransferStock.unit,
      requestedBy: user?.name || 'Staf Logistik'
    });

    setShowTransferModal(false);
    addToast(`Surat Jalan Mutasi Stok ${created.transferNo} berhasil diterbitkan!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={GitBranch}
        title="Manajemen Jaringan Multi-Cabang Klinik"
        description="Sinkronisasi data terpusat, transfer stok antar cabang, dan komparasi performa pendapatan."
        badges={[
          { label: `${allBranches.length} Cabang Terhubung`, variant: 'emerald', icon: Building2 },
          { label: `${transfers.length} Mutasi Aktif`, variant: 'blue' },
          { label: 'Cloud Sync Real-Time', variant: 'gold' }
        ]}
        actions={
          <button
            onClick={openAddBranchModal}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Cabang Baru</span>
          </button>
        }
        tabs={[
          { id: 'branchesList', label: 'Daftar Cabang', icon: Building2, count: allBranches.length },
          { id: 'stockTransfer', label: 'Mutasi Stok', icon: ArrowRightLeft, count: transfers.length },
          { id: 'analytics', label: 'Analisis & Performa', icon: BarChart3 }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: Branches List */}
      {activeTab === 'branchesList' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allBranches.map((branch) => {
            const isCurrentActive = branch.id === activeBranchId || (branch.isMainBranch && !activeBranchId);
            return (
              <div
                key={branch.id}
                className={`bg-[#FFFDF9] rounded-2xl border transition-all p-5 shadow-2xs flex flex-col justify-between space-y-4 ${
                  isCurrentActive ? 'border-[#B8905A] ring-2 ring-[#B8905A]/30' : 'border-[#E1D6BE]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#101A2C] text-[#D9B98A] font-mono font-bold text-xs">
                      {branch.code}
                    </span>
                    {branch.isMainBranch && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 text-[10px] font-bold">
                        ★ Kantor Pusat
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-[#1B2A45] font-display">
                      {branch.name}
                    </h3>
                    <p className="text-xs text-[#6B6656] mt-1 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#B8905A] shrink-0 mt-0.5" />
                      <span>{branch.address}</span>
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-[#6B6656] pt-1">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>{branch.phone}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>{branch.email}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E1D6BE] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Operasional Aktif
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditBranchModal(branch)}
                      title="Edit Cabang"
                      className="p-1.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!branch.isMainBranch && (
                      <button
                        onClick={() => handleDeleteBranch(branch)}
                        title="Hapus Cabang"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setActiveBranchId(branch.id);
                      addToast(`Beralih ke sesi operasional cabang: ${branch.name}`, 'success');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isCurrentActive
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE]'
                    }`}
                  >
                    {isCurrentActive ? '✓ Cabang Terpilih' : 'Pilih Cabang Ini'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Stock Transfer */}
      {activeTab === 'stockTransfer' && (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E1D6BE]">
            <div>
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#B8905A]" />
                Surat Jalan & Riwayat Mutasi Stok Antar Cabang
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Pengiriman persediaan obat, vaksin, dan pakan medis antar gudang cabang klinik.
              </p>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Mutasi Stok Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E1D6BE]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px] uppercase border-b border-[#E1D6BE]">
                <tr>
                  <th className="p-3">No. Mutasi</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Cabang Pengirim (Asal)</th>
                  <th className="p-3">Cabang Penerima (Tujuan)</th>
                  <th className="p-3">Nama Produk & Jumlah</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE] bg-white">
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-[#6B6656]">
                      Belum ada mutasi stok antar cabang yang diterbitkan.
                    </td>
                  </tr>
                )}
                {transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-[#F6F1E6]/40">
                    <td className="p-3 font-mono font-bold text-[#1B2A45]">{tr.transferNo}</td>
                    <td className="p-3 text-[#6B6656]">{tr.date}</td>
                    <td className="p-3 font-semibold text-[#1B2A45]">{tr.sourceBranchName}</td>
                    <td className="p-3 font-semibold text-[#1B2A45]">{tr.destBranchName}</td>
                    <td className="p-3 font-bold text-[#1B2A45]">
                      {tr.itemName} ({tr.qty} {tr.unit})
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        tr.status === 'Diterima'
                          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-800 border-amber-500/30 animate-pulse'
                      }`}>
                        {tr.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {tr.status === 'Dalam Pengiriman' && (
                        <button
                          onClick={() => {
                            markInterBranchTransferReceived(tr.id);
                            addToast(`Mutasi stok ${tr.transferNo} telah dikonfirmasi diterima di cabang tujuan!`, 'success');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          Konfirmasi Terima
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Performance Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Data konsolidasi seluruh jaringan, bukan per cabang.</strong> Invoice & transaksi kas belum
              ditandai cabangnya di mana pun dalam sistem, sehingga omset tidak bisa dipecah secara jujur per cabang
              saat ini. Angka di bawah dihitung langsung dari data invoice, antrean, dan pasien sungguhan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#6B6656]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Omset Bulan Berjalan</span>
                <TrendingUp className="w-4 h-4 text-[#B8905A]" />
              </div>
              <span className="text-xl font-black text-[#1B2A45] font-display block">
                Rp {revenueThisMonth.toLocaleString('id-ID')}
              </span>
              <span className={`text-[10px] font-bold block ${revenueGrowthPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {revenueGrowthPercent >= 0 ? '↑' : '↓'} {Math.abs(revenueGrowthPercent)}% vs bulan lalu (Rp {revenueLastMonth.toLocaleString('id-ID')})
              </span>
            </div>

            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#6B6656]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Invoice Lunas Bulan Ini</span>
                <Package className="w-4 h-4 text-[#B8905A]" />
              </div>
              <span className="text-xl font-black text-[#1B2A45] font-display block">{paidInvoicesThisMonth} Transaksi</span>
              <span className="text-[10px] text-[#6B6656] block">Seluruh unit bisnis (klinik, pet shop, grooming, hotel)</span>
            </div>

            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#6B6656]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Antrean Klinik Aktif</span>
                <Calendar className="w-4 h-4 text-[#B8905A]" />
              </div>
              <span className="text-xl font-black text-[#1B2A45] font-display block">{activeClinicQueueToday} Pasien</span>
              <span className="text-[10px] text-[#6B6656] block">Sedang menunggu / diperiksa saat ini</span>
            </div>

            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[#6B6656]">
                <span className="text-[11px] font-bold uppercase tracking-wider">Cabang Aktif</span>
                <Store className="w-4 h-4 text-[#B8905A]" />
              </div>
              <span className="text-xl font-black text-[#1B2A45] font-display block">
                {allBranches.filter((b) => b.isActive).length} / {allBranches.length}
              </span>
              <span className="text-[10px] text-[#6B6656] block">{pets.length} pasien hewan terdaftar di jaringan</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Branch */}
      {showAddBranchModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddBranchModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#B8905A]" />
                {editingBranch ? 'Edit Data Cabang' : 'Tambah Cabang Klinik Baru'}
              </h3>
              <button
                onClick={() => { setShowAddBranchModal(false); resetBranchForm(); }}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Cabang</label>
                <input
                  type="text"
                  placeholder="Contoh: VetCare Hospital Surabaya Barat"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Kode Cabang</label>
                <input
                  type="text"
                  placeholder="Contoh: SBY-04"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-mono font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Alamat lokasi cabang..."
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Telepon</label>
                  <input
                    type="text"
                    placeholder="+62 812-..."
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="cabang@vetcare.id"
                    value={newBranchEmail}
                    onChange={(e) => setNewBranchEmail(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddBranchModal(false); resetBranchForm(); }}
                  className="px-4 py-2.5 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold rounded-xl hover:bg-[#E1D6BE]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md"
                >
                  {editingBranch ? 'Simpan Perubahan' : 'Simpan Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inter-Branch Transfer */}
      {showTransferModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTransferModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#B8905A]" />
                Buat Surat Jalan Mutasi Stok
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-3 text-xs">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                Stok adalah satu pool bersama seluruh cabang — mutasi ini menerbitkan surat jalan &amp; jejak audit, angka stok tidak berubah.
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Cabang Asal (Pengirim)</label>
                <select
                  value={transferSourceId}
                  onChange={(e) => setTransferSourceId(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Cabang Tujuan (Penerima)</label>
                <select
                  value={transferDestId}
                  onChange={(e) => setTransferDestId(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Produk / Obat (dari Master Inventaris)</label>
                <select
                  value={transferStockItemId}
                  onChange={(e) => setTransferStockItemId(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                >
                  {stockItems.length === 0 && <option value="">Belum ada item stok di Master Inventaris</option>}
                  {stockItems.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.sku}) — tersedia {s.stock} {s.unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">
                  Jumlah Mutasi {selectedTransferStock ? `(maks. ${selectedTransferStock.stock} ${selectedTransferStock.unit})` : ''}
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedTransferStock?.stock}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2.5 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold rounded-xl hover:bg-[#E1D6BE]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md"
                >
                  Terbitkan Surat Jalan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
