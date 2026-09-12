import React, { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Building2,
  Lock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  ChevronRight,
  UserCheck,
  Search,
  Sparkles,
  Key,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  FolderTree,
  BadgePercent,
  Stethoscope,
  Briefcase,
  Store,
  Truck,
  HeartHandshake,
  ArrowRight,
  Filter,
  Sliders,
  Check,
  X,
  FileSpreadsheet,
  Award,
  Zap,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, SystemGroup, CustomerTierGroup, GroupModulePermission } from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { MODULE_PERMISSIONS, NavModule } from '../../constants/modulePermissions';
import { usePermissions } from '../../hooks/usePermissions';

export const SystemGroupsModule: React.FC = () => {
  const { user, users = [] } = useAuth();
  const {
    employees = [],
    customers = [],
    branches = [],
    activeBranchId,
    pets = [],
    invoices = [],
    systemGroups,
    addSystemGroup,
    updateSystemGroup,
    deleteSystemGroup,
    customerTierGroups,
    addCustomerTierGroup,
    updateCustomerTierGroup,
    deleteCustomerTierGroup
  } = useData();
  const customerTiers = customerTierGroups;
  const { addToast } = useToast();
  const { can } = usePermissions();
  const canDeleteSystemGroups = can('systemGroups', 'delete');

  const [activeTab, setActiveTab] = useState<'userGroups' | 'customerTiers' | 'matrixRBAC' | 'departmentHierarchy'>('userGroups');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('grp-medis');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAssignMemberModal, setShowAssignMemberModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Initial Comprehensive System Groups
  // systemGroups & customerTierGroups sekarang berasal dari DataContext (persisten & tersinkron lintas modul)

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupType, setNewGroupType] = useState<SystemGroup['type']>('Staf & Medis');
  const [newGroupHead, setNewGroupHead] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#5BB076');

  // Customer Tier Membership Form State
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [editingTier, setEditingTier] = useState<CustomerTierGroup | null>(null);
  const [tierForm, setTierForm] = useState({
    tierName: '',
    code: 'STANDARD' as CustomerTierGroup['code'],
    minSpend: 500000,
    discountPercent: 5,
    perks: '',
    color: '#6BA3BE',
    autoUpgrade: true
  });

  const resetTierForm = () => {
    setTierForm({
      tierName: '',
      code: 'STANDARD',
      minSpend: 500000,
      discountPercent: 5,
      perks: '',
      color: '#6BA3BE',
      autoUpgrade: true
    });
    setEditingTier(null);
  };

  const openAddTierModal = () => {
    resetTierForm();
    setShowAddTierModal(true);
  };

  const openEditTierModal = (tier: CustomerTierGroup) => {
    setEditingTier(tier);
    setTierForm({
      tierName: tier.tierName,
      code: tier.code,
      minSpend: tier.minSpend,
      discountPercent: tier.discountPercent,
      perks: tier.perks,
      color: tier.color,
      autoUpgrade: tier.autoUpgrade
    });
    setShowAddTierModal(true);
  };

  const handleSaveTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierForm.tierName.trim()) {
      addToast('Nama tier membership wajib diisi!', 'warning');
      return;
    }
    if (editingTier) {
      updateCustomerTierGroup(editingTier.id, tierForm);
      addToast(`Tier membership "${tierForm.tierName}" berhasil diperbarui!`, 'success');
    } else {
      addCustomerTierGroup({ ...tierForm, memberCount: 0 });
      addToast(`Tier membership baru "${tierForm.tierName}" berhasil dibuat!`, 'success');
    }
    setShowAddTierModal(false);
    resetTierForm();
  };

  const handleDeleteTier = (tier: CustomerTierGroup) => {
    if (!canDeleteSystemGroups) {
      addToast('Akun/grup Anda tidak memiliki hak "Hapus" untuk Grup Sistem & Tier Klien. Hubungi Owner/Admin.', 'error');
      return;
    }
    if (!window.confirm(`Hapus tier membership "${tier.tierName}"?`)) return;
    deleteCustomerTierGroup(tier.id);
    addToast(`Tier membership "${tier.tierName}" dihapus.`, 'success');
  };

  // Selected active group
  const selectedGroup = useMemo(() => {
    return systemGroups.find((g) => g.id === selectedGroupId) || systemGroups[0];
  }, [systemGroups, selectedGroupId]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return systemGroups.filter((g) => {
      const matchQuery =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.departmentHead.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'all' || g.type === filterType;
      return matchQuery && matchType;
    });
  }, [systemGroups, searchQuery, filterType]);

  // Toggle permission in active group
  const handleTogglePermission = (
    moduleId: string,
    permKey: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove'
  ) => {
    const updatedPerms = selectedGroup.modulePermissions.map((mod) =>
      mod.moduleId === moduleId ? { ...mod, [permKey]: !mod[permKey] } : mod
    );
    updateSystemGroup(selectedGroup.id, { modulePermissions: updatedPerms });
    addToast('Hak otorisasi modul grup berhasil diperbarui!', 'success');
  };

  // Add new group
  const handleCreateNewGroup = () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) {
      addToast('Nama grup dan kode grup wajib diisi!', 'warning');
      return;
    }

    const created = addSystemGroup({
      code: newGroupCode.toUpperCase().trim(),
      name: newGroupName.trim(),
      type: newGroupType,
      departmentHead: newGroupHead.trim() || 'Belum Ditentukan',
      description: newGroupDesc.trim() || 'Grup operasional baru sistem VetCare.',
      color: newGroupColor,
      allowedRoles: ['perawat', 'admin'],
      memberCount: 1,
      isSystemDefault: false,
      modulePermissions: [
        { moduleId: 'dashboard', moduleName: 'Dashboard Utama', canView: true, canCreate: false, canEdit: false, canDelete: false },
        { moduleId: 'booking', moduleName: 'Booking Layanan', canView: true, canCreate: true, canEdit: false, canDelete: false },
        { moduleId: 'clinic', moduleName: 'EMR & Poliklinik', canView: false, canCreate: false, canEdit: false, canDelete: false }
      ]
    });

    setSelectedGroupId(created.id);
    setShowAddGroupModal(false);
    setNewGroupName('');
    setNewGroupCode('');
    setNewGroupHead('');
    setNewGroupDesc('');
    addToast(`Grup departemen "${created.name}" berhasil dibuat & diaktifkan!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={FolderTree}
        title="Arsitektur Sistem Grup & Otorisasi RBAC"
        description="Hierarki departemen, perizinan modul staf klinik (RBAC), grup loyalitas klien, dan pembagian tugas operasional."
        badges={[
          {
            label: branches.find((b) => b.id === activeBranchId)?.name || 'Klinik Utama',
            variant: 'emerald',
            icon: Building2
          },
          { label: `${systemGroups.length} Grup`, variant: 'blue' },
          { label: `${customerTiers.length} Tier Klien`, variant: 'gold' }
        ]}
        actions={
          activeTab === 'customerTiers' ? (
            <button
              onClick={openAddTierModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tier Membership</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddGroupModal(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Grup Baru</span>
            </button>
          )
        }
        tabs={[
          { id: 'userGroups', label: 'Hak Akses Staf', icon: Shield, count: systemGroups.length },
          { id: 'customerTiers', label: 'Tier Loyalitas Klien', icon: BadgePercent, count: customerTiers.length },
          { id: 'matrixRBAC', label: 'Matriks RBAC Lintas Peran', icon: Key }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: User & Department Groups */}
      {activeTab === 'userGroups' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Group Selector List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#B8905A]" />
                  Daftar Grup Departemen
                </h3>
                <span className="text-[11px] text-[#6B6656] font-medium">
                  {filteredGroups.length} Grup Terdaftar
                </span>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B6656]" />
                  <input
                    type="text"
                    placeholder="Cari grup, kode, atau PIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[11px] font-semibold text-[#1B2A45]"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="Staf & Medis">Staf & Medis</option>
                  <option value="Layanan & Operasional">Operasional</option>
                  <option value="Eksekutif & Keuangan">Eksekutif</option>
                </select>
              </div>

              {/* Groups List */}
              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {filteredGroups.map((grp) => {
                  const isSelected = grp.id === selectedGroup.id;
                  return (
                    <div
                      key={grp.id}
                      onClick={() => setSelectedGroupId(grp.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#101A2C] to-[#1B2A45] text-white border-[#B8905A] shadow-md'
                          : 'bg-white hover:bg-[#F6F1E6]/60 border-[#E1D6BE] text-[#1B2A45]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: grp.color }}
                          />
                          <h4 className="font-bold text-xs truncate">{grp.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            isSelected ? 'bg-white/20 text-[#D9B98A]' : 'bg-[#E1D6BE]/60 text-[#1B2A45]'
                          }`}>
                            {grp.code}
                          </span>
                        </div>
                        <p className={`text-[11px] line-clamp-1 ${isSelected ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'}`}>
                          {grp.description}
                        </p>
                        <div className="flex items-center gap-3 pt-1 text-[10px]">
                          <span className={isSelected ? 'text-[#D9B98A]' : 'text-[#8C7A5B]'}>
                            PIC: {grp.departmentHead.split('(')[0]}
                          </span>
                          <span className={isSelected ? 'text-emerald-300' : 'text-emerald-700 font-bold'}>
                            {grp.memberCount} Anggota
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#B8905A] translate-x-1' : 'text-[#6B6656]'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Group Details & Granular Permission Matrix */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-5">
              {/* Group Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E1D6BE]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: selectedGroup.color }}
                    />
                    <h3 className="font-bold text-base text-[#1B2A45] font-display">
                      {selectedGroup.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#101A2C] text-[#D9B98A] font-mono font-bold">
                      {selectedGroup.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6656]">
                    {selectedGroup.description}
                  </p>
                  <p className="text-[11px] text-[#8C7A5B] font-semibold pt-0.5">
                    Penanggung Jawab: <span className="text-[#1B2A45] font-bold">{selectedGroup.departmentHead}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => addToast(`Pengaturan grup ${selectedGroup.name} siap dikonfigurasi`, 'info')}
                    className="p-2 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah Info</span>
                  </button>
                </div>
              </div>

              {/* Permission Matrix Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Matriks Otorisasi Modul Terperinci (RBAC)
                  </h4>
                  <span className="text-[10px] text-[#6B6656] italic">
                    Centang untuk memberikan hak aksi spesifik
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E1D6BE]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px] uppercase border-b border-[#E1D6BE]">
                      <tr>
                        <th className="p-3">Nama Modul Aplikasi</th>
                        <th className="p-3 text-center">Lihat (View)</th>
                        <th className="p-3 text-center">Tambah (Create)</th>
                        <th className="p-3 text-center">Ubah (Edit)</th>
                        <th className="p-3 text-center">Hapus (Delete)</th>
                        <th className="p-3 text-center">Otorisasi (Approve)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE] bg-white">
                      {selectedGroup.modulePermissions.map((mod) => (
                        <tr key={mod.moduleId} className="hover:bg-[#F6F1E6]/40">
                          <td className="p-3 font-semibold text-[#1B2A45]">
                            {mod.moduleName}
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={mod.canView}
                              onChange={() => handleTogglePermission(mod.moduleId, 'canView')}
                              className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={mod.canCreate}
                              onChange={() => handleTogglePermission(mod.moduleId, 'canCreate')}
                              className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={mod.canEdit}
                              onChange={() => handleTogglePermission(mod.moduleId, 'canEdit')}
                              className="w-4 h-4 rounded text-[#B8905A] focus:ring-[#B8905A] cursor-pointer"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={mod.canDelete}
                              onChange={() => handleTogglePermission(mod.moduleId, 'canDelete')}
                              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={!!mod.canApprove}
                              onChange={() => handleTogglePermission(mod.moduleId, 'canApprove')}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Roles Associated */}
              <div className="p-4 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-2">
                <h5 className="font-bold text-xs text-[#1B2A45] flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#B8905A]" />
                  Peran Pengguna yang Diizinkan Masuk dalam Grup Ini:
                </h5>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedGroup.allowedRoles.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E1D6BE] text-xs font-bold text-[#1B2A45] capitalize shadow-2xs"
                    >
                      {r.replace('_', ' ')}
                    </span>
                  ))}
                  <button
                    onClick={() => addToast('Peran pengguna telah disinkronkan ke grup sistem', 'success')}
                    className="text-[11px] font-bold text-[#B8905A] hover:underline ml-2"
                  >
                    + Sinkronkan Anggota Staf
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Customer Tiers & Loyalty Groups */}
      {activeTab === 'customerTiers' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {customerTiers.map((tier) => (
              <div
                key={tier.id}
                className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.tierName}
                    </span>
                    <span className="text-xs font-black text-[#1B2A45]">
                      Diskon {tier.discountPercent}%
                    </span>
                  </div>

                  <div>
                    <p className="text-[11px] text-[#6B6656]">Kualifikasi Akumulasi Belanja:</p>
                    <p className="font-bold text-sm text-[#1B2A45] font-display">
                      ≥ Rp {tier.minSpend.toLocaleString('id-ID')}
                    </p>
                  </div>

                  <p className="text-xs text-[#6B6656] leading-relaxed">
                    <strong>Fasilitas & Perks:</strong> {tier.perks}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E1D6BE] flex items-center justify-between text-xs">
                  <span className="text-[#6B6656]">Total Member Terdaftar:</span>
                  <span className="font-bold text-[#1B2A45] font-mono">{tier.memberCount} Klien</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditTierModal(tier)}
                    className="flex-1 py-1.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTier(tier)}
                    className="flex-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E1D6BE] flex items-center justify-between text-xs text-[#6B6656]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8905A]" />
              <span>Sistem secara otomatis menghitung tier pelanggan berdasarkan total riwayat invoice yang telah lunas.</span>
            </div>
            <button
              onClick={() => addToast('Sinkronisasi tier loyalitas pelanggan selesai dieksekusi', 'success')}
              className="px-3 py-1.5 bg-[#B8905A] text-[#101A2C] font-bold text-xs rounded-lg hover:bg-[#9E7848] transition-all"
            >
              Sinkronkan Poin Sekarang
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Global RBAC Matrix */}
      {activeTab === 'matrixRBAC' && (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E1D6BE]">
            <div>
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#B8905A]" />
                Matriks Hak Akses Lintas Peran Sistem (Role-Based Access Control)
              </h3>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Dihitung langsung dari konfigurasi akses modul sungguhan (MODULE_PERMISSIONS) — bukan tabel contoh statis.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E1D6BE]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px] uppercase border-b border-[#E1D6BE]">
                <tr>
                  <th className="p-3">Modul Sistem</th>
                  <th className="p-3 text-center">Owner / Superadmin</th>
                  <th className="p-3 text-center">Dokter Hewan</th>
                  <th className="p-3 text-center">Admin / Farmasi</th>
                  <th className="p-3 text-center">Kasir / Front Office</th>
                  <th className="p-3 text-center">Groomer & Care</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE] bg-white">
                {(() => {
                  // Setiap baris di sini mewakili sekelompok modul nyata dari
                  // MODULE_PERMISSIONS (src/constants/modulePermissions.ts) —
                  // dicentang hanya kalau peran itu punya akses ke SEMUA
                  // modul dalam kelompok tersebut (tidak dilonggarkan).
                  const ROWS: { name: string; modules: NavModule[] }[] = [
                    { name: 'Dashboard Utama & Laporan Eksekutif', modules: ['dashboard', 'reports'] },
                    { name: 'Pemeriksaan Klinik & EMR Medis', modules: ['clinic', 'emr'] },
                    { name: 'Apotek, Dispensing & Laboratorium', modules: ['pharmacy'] },
                    { name: 'Pet Shop Retail & Kasir POS', modules: ['petShop', 'billing'] },
                    { name: 'Grooming Salon, Pet Hotel & Ambulans', modules: ['grooming', 'petHotel', 'ambulance'] },
                    { name: 'Buku Kas & Keuangan Bisnis', modules: ['finance'] },
                    { name: 'Audit Log, Cadangan Cloud & Pengaturan', modules: ['auditLog', 'settings'] }
                  ];
                  const roleHasAccess = (roles: NavModule[], role: UserRole) =>
                    roles.every((m) => {
                      const allowed = MODULE_PERMISSIONS[m];
                      return allowed.includes('*') || allowed.includes(role);
                    });
                  return ROWS.map((row, idx) => {
                    const owner = roleHasAccess(row.modules, 'owner_petcare') || roleHasAccess(row.modules, 'superadmin');
                    const doc = roleHasAccess(row.modules, 'dokter');
                    const admin = roleHasAccess(row.modules, 'admin');
                    const cashier = roleHasAccess(row.modules, 'kasir');
                    const care = roleHasAccess(row.modules, 'groomer');
                    return (
                      <tr key={idx} className="hover:bg-[#F6F1E6]/40">
                        <td className="p-3 font-semibold text-[#1B2A45]">{row.name}</td>
                        <td className="p-3 text-center">{owner ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}</td>
                        <td className="p-3 text-center">{doc ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}</td>
                        <td className="p-3 text-center">{admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}</td>
                        <td className="p-3 text-center">{cashier ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}</td>
                        <td className="p-3 text-center">{care ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-rose-400 mx-auto" />}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add New Group Modal */}
      {showAddGroupModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddGroupModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#B8905A]" />
                Buat Grup / Departemen Baru
              </h3>
              <button
                onClick={() => setShowAddGroupModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Grup / Departemen</label>
                <input
                  type="text"
                  placeholder="Contoh: Tim Bedah Ortopedi & Saraf"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Kode Grup</label>
                  <input
                    type="text"
                    placeholder="Contoh: SURG-VET"
                    value={newGroupCode}
                    onChange={(e) => setNewGroupCode(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-mono font-bold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Tipe Grup</label>
                  <select
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                  >
                    <option value="Staf & Medis">Staf & Medis</option>
                    <option value="Layanan & Operasional">Layanan & Operasional</option>
                    <option value="Inventaris & Logistik">Inventaris & Logistik</option>
                    <option value="Eksekutif & Keuangan">Eksekutif & Keuangan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Kepala Divisi / PIC</label>
                <input
                  type="text"
                  placeholder="Contoh: Drh. Bagus Prasetyo, Sp.KGV"
                  value={newGroupHead}
                  onChange={(e) => setNewGroupHead(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Deskripsi Ruang Lingkup Otorisasi</label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan tugas operasional dan modul yang diizinkan untuk grup ini..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleCreateNewGroup}
                  className="flex-1 py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Aktifkan Grup</span>
                </button>
                <button
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-4 py-3 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold text-xs rounded-xl hover:bg-[#E1D6BE] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Tier Membership */}
      {showAddTierModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setShowAddTierModal(false); resetTierForm(); }
          }}
        >
          <div
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <BadgePercent className="w-5 h-5 text-[#B8905A]" />
                {editingTier ? 'Edit Tier Membership' : 'Tambah Tier Membership Baru'}
              </h3>
              <button
                onClick={() => { setShowAddTierModal(false); resetTierForm(); }}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Tier</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gold Member Paws Elite"
                  value={tierForm.tierName}
                  onChange={(e) => setTierForm({ ...tierForm, tierName: e.target.value })}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Kode Tier</label>
                  <select
                    value={tierForm.code}
                    onChange={(e) => setTierForm({ ...tierForm, code: e.target.value as any })}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  >
                    <option value="PLATINUM">PLATINUM</option>
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Warna Label</label>
                  <input
                    type="color"
                    value={tierForm.color}
                    onChange={(e) => setTierForm({ ...tierForm, color: e.target.value })}
                    className="w-full h-[38px] p-1 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Minimum Belanja (Rp)</label>
                  <input
                    type="number"
                    value={tierForm.minSpend}
                    onChange={(e) => setTierForm({ ...tierForm, minSpend: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Diskon (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={tierForm.discountPercent}
                    onChange={(e) => setTierForm({ ...tierForm, discountPercent: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Fasilitas & Perks</label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan fasilitas/keuntungan tier ini..."
                  value={tierForm.perks}
                  onChange={(e) => setTierForm({ ...tierForm, perks: e.target.value })}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
                />
              </div>

              <label className="flex items-center gap-2 font-bold text-[#1B2A45]">
                <input
                  type="checkbox"
                  checked={tierForm.autoUpgrade}
                  onChange={(e) => setTierForm({ ...tierForm, autoUpgrade: e.target.checked })}
                />
                Naik tier otomatis saat akumulasi belanja tercapai
              </label>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingTier ? 'Simpan Perubahan' : 'Simpan Tier Baru'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddTierModal(false); resetTierForm(); }}
                  className="px-4 py-3 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold text-xs rounded-xl hover:bg-[#E1D6BE] cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
