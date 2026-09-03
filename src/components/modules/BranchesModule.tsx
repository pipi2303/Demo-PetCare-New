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
import { Branch } from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';

interface InterBranchTransfer {
  id: string;
  transferNo: string;
  sourceBranchName: string;
  destBranchName: string;
  itemName: string;
  qty: number;
  unit: string;
  status: 'Terkirim' | 'Diterima' | 'Dalam Pengiriman';
  date: string;
  requestedBy: string;
}

export const BranchesModule: React.FC = () => {
  const {
    branches = [],
    activeBranchId,
    setActiveBranchId,
    stockItems = [],
    addBranch,
    updateBranch,
    deleteBranch
  } = useData();
  const { addToast } = useToast();

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

  // Sample Stock Transfers
  const [transfers, setTransfers] = useState<InterBranchTransfer[]>([
    {
      id: 'tr-001',
      transferNo: 'MUTASI-2026-0811',
      sourceBranchName: 'Klinik Utama Kemang (Hospital Pusat)',
      destBranchName: 'Klinik & Pet Care BSD City',
      itemName: 'Vaksin Nobivac Tricat Trio (10 Vial)',
      qty: 10,
      unit: 'vial',
      status: 'Diterima',
      date: '2026-08-11',
      requestedBy: 'Drh. Ratna Permata'
    },
    {
      id: 'tr-002',
      transferNo: 'MUTASI-2026-0813',
      sourceBranchName: 'Klinik Utama Kemang (Hospital Pusat)',
      destBranchName: 'VetCare Express & Grooming Kelapa Gading',
      itemName: 'Shampoo Anti-Fungal Medicated 1L',
      qty: 5,
      unit: 'botol',
      status: 'Dalam Pengiriman',
      date: '2026-08-13',
      requestedBy: 'Budi Santoso'
    }
  ]);

  // Transfer Form State
  const [transferSource, setTransferSource] = useState(allBranches[0]?.name || '');
  const [transferDest, setTransferDest] = useState(allBranches[1]?.name || '');
  const [transferItem, setTransferItem] = useState(stockItems[0]?.name || 'Amoxicillin 250mg');
  const [transferQty, setTransferQty] = useState<number>(5);

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

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) {
      addToast('Nama dan Kode Cabang wajib diisi!', 'warning');
      return;
    }

    if (editingBranch) {
      updateBranch(editingBranch.id, {
        name: newBranchName,
        code: newBranchCode.toUpperCase(),
        address: newBranchAddress || editingBranch.address,
        phone: newBranchPhone || editingBranch.phone,
        email: newBranchEmail || editingBranch.email
      });
      addToast(`Cabang "${newBranchName}" berhasil diperbarui!`, 'success');
    } else {
      const created = addBranch({
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
  };

  const handleDeleteBranch = (branch: Branch) => {
    if (branch.isMainBranch) {
      addToast('Kantor pusat tidak dapat dihapus.', 'error');
      return;
    }
    if (!window.confirm(`Hapus cabang "${branch.name}"? Data terkait cabang ini tidak akan otomatis terhapus.`)) return;
    deleteBranch(branch.id);
    addToast(`Cabang "${branch.name}" berhasil dihapus.`, 'success');
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferSource === transferDest) {
      addToast('Cabang asal dan cabang tujuan tidak boleh sama!', 'error');
      return;
    }

    const created: InterBranchTransfer = {
      id: `tr-${Date.now().toString().slice(-4)}`,
      transferNo: `MUTASI-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
      sourceBranchName: transferSource,
      destBranchName: transferDest,
      itemName: transferItem,
      qty: transferQty,
      unit: 'item',
      status: 'Dalam Pengiriman',
      date: new Date().toISOString().split('T')[0],
      requestedBy: 'Manager Logistik'
    };

    setTransfers([created, ...transfers]);
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
                            setTransfers(transfers.map((t) => t.id === tr.id ? { ...t, status: 'Diterima' } : t));
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider">Klinik Utama Kemang</h4>
            <div className="space-y-1">
              <span className="text-2xl font-black text-[#1B2A45] font-display">Rp 48.500.000</span>
              <p className="text-[11px] text-[#6B6656]">Omset Bulan Berjalan (124 Pasien)</p>
            </div>
            <div className="w-full bg-[#E1D6BE]/40 h-2 rounded-full overflow-hidden">
              <div className="bg-[#B8905A] h-full rounded-full" style={{ width: '85%' }} />
            </div>
            <span className="text-[10px] text-emerald-700 font-bold block">↑ +14% vs bulan lalu</span>
          </div>

          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider">Klinik & Pet Care BSD</h4>
            <div className="space-y-1">
              <span className="text-2xl font-black text-[#1B2A45] font-display">Rp 31.200.000</span>
              <p className="text-[11px] text-[#6B6656]">Omset Bulan Berjalan (78 Pasien)</p>
            </div>
            <div className="w-full bg-[#E1D6BE]/40 h-2 rounded-full overflow-hidden">
              <div className="bg-[#6BA3BE] h-full rounded-full" style={{ width: '62%' }} />
            </div>
            <span className="text-[10px] text-emerald-700 font-bold block">↑ +8% vs bulan lalu</span>
          </div>

          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider">Express Kelapa Gading</h4>
            <div className="space-y-1">
              <span className="text-2xl font-black text-[#1B2A45] font-display">Rp 18.900.000</span>
              <p className="text-[11px] text-[#6B6656]">Omset Bulan Berjalan (52 Pasien)</p>
            </div>
            <div className="w-full bg-[#E1D6BE]/40 h-2 rounded-full overflow-hidden">
              <div className="bg-[#D97757] h-full rounded-full" style={{ width: '45%' }} />
            </div>
            <span className="text-[10px] text-emerald-700 font-bold block">↑ +21% vs bulan lalu</span>
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
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Cabang Asal (Pengirim)</label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Cabang Tujuan (Penerima)</label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                >
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Produk / Obat</label>
                <input
                  type="text"
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jumlah Mutasi</label>
                <input
                  type="number"
                  min="1"
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
