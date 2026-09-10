import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';
import { getRoleInfo } from '../../utils/roleUtils';
import { PinConfirmModal } from '../auth/PinConfirmModal';
import { usePermissions } from '../../hooks/usePermissions';
// NavModule & MODULE_PERMISSIONS now live in a standalone constants file so
// usePermissions.ts can import them without a circular dependency on this
// file. Re-exported here so every existing `from './Sidebar'` /
// `from '../layout/Sidebar'` import site keeps working unchanged.
import { NavModule, MODULE_PERMISSIONS } from '../../constants/modulePermissions';
export type { NavModule };
export { MODULE_PERMISSIONS };
import {
  LayoutDashboard,
  Database,
  CalendarCheck,
  Stethoscope,
  FileText,
  Syringe,
  Pill,
  Scissors,
  Hotel,
  Camera,
  ShoppingBag,
  Package,
  Truck,
  Receipt,
  Wallet,
  Users,
  Award,
  BarChart3,
  Bot,
  Video,
  FileSignature,
  Ambulance,
  HeartPulse,
  History,
  Bell,
  GitBranch,
  Settings,
  Building2,
  ChevronRight,
  ChevronDown,
  LogOut,
  UserCheck,
  Sparkles,
  ShieldCheck,
  Check,
  FolderTree
} from 'lucide-react';

interface SidebarProps {
  activeModule: NavModule;
  setActiveModule: (m: NavModule) => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
}

interface NavItem {
  id: NavModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'BERANDA',
    items: [{ id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard, allowedRoles: MODULE_PERMISSIONS.dashboard }],
  },
  {
    title: 'DATA MASTER',
    items: [{ id: 'masterData', label: 'Pelanggan & Master', icon: Database, allowedRoles: MODULE_PERMISSIONS.masterData }],
  },
  {
    title: 'LAYANAN',
    items: [
      { id: 'booking', label: 'Booking & Antrian', icon: CalendarCheck, allowedRoles: MODULE_PERMISSIONS.booking },
      { id: 'grooming', label: 'Grooming Salon', icon: Scissors, allowedRoles: MODULE_PERMISSIONS.grooming },
      { id: 'petHotel', label: 'Pet Hotel Boarding', icon: Hotel, allowedRoles: MODULE_PERMISSIONS.petHotel },
      { id: 'telehealth', label: 'Telehealth Video', icon: Video, allowedRoles: MODULE_PERMISSIONS.telehealth },
      { id: 'ambulance', label: 'Ambulance Rescue', icon: Ambulance, allowedRoles: MODULE_PERMISSIONS.ambulance },
    ],
  },
  {
    title: 'MEDIS & FARMASI',
    items: [
      { id: 'clinic', label: 'Pemeriksaan Klinik', icon: Stethoscope, allowedRoles: MODULE_PERMISSIONS.clinic },
      { id: 'emr', label: 'Rekam Medis (EMR)', icon: FileText, allowedRoles: MODULE_PERMISSIONS.emr },
      { id: 'vaccination', label: 'Vaksinasi & Paspor', icon: Syringe, allowedRoles: MODULE_PERMISSIONS.vaccination },
      { id: 'pharmacy', label: 'Apotek & Lab', icon: Pill, allowedRoles: MODULE_PERMISSIONS.pharmacy },
      { id: 'carePlan', label: 'Rencana Care Plan', icon: HeartPulse, allowedRoles: MODULE_PERMISSIONS.carePlan },
      { id: 'eForms', label: 'E-Form Consent', icon: FileSignature, allowedRoles: MODULE_PERMISSIONS.eForms },
      { id: 'patientGallery', label: 'Galeri Foto Pasien', icon: Camera, allowedRoles: MODULE_PERMISSIONS.patientGallery },
    ],
  },
  {
    title: 'PENJUALAN & LOGISTIK',
    items: [
      { id: 'petShop', label: 'Pet Shop (POS)', icon: ShoppingBag, allowedRoles: MODULE_PERMISSIONS.petShop },
      { id: 'inventory', label: 'Stok & Gudang', icon: Package, allowedRoles: MODULE_PERMISSIONS.inventory },
      { id: 'purchasing', label: 'Purchasing (PO)', icon: Truck, allowedRoles: MODULE_PERMISSIONS.purchasing },
      { id: 'billing', label: 'Billing & Kasir', icon: Receipt, allowedRoles: MODULE_PERMISSIONS.billing },
    ],
  },
  {
    title: 'MANAJEMEN',
    items: [
      { id: 'finance', label: 'Buku Kas & Keuangan', icon: Wallet, allowedRoles: MODULE_PERMISSIONS.finance },
      { id: 'hrm', label: 'SDM & Shift Kerja', icon: Users, allowedRoles: MODULE_PERMISSIONS.hrm },
      { id: 'crm', label: 'CRM & Member Loyalty', icon: Award, allowedRoles: MODULE_PERMISSIONS.crm },
    ],
  },
  {
    title: 'LAPORAN & AI',
    items: [
      { id: 'reports', label: 'Laporan & Eksekutif', icon: BarChart3, allowedRoles: MODULE_PERMISSIONS.reports },
      { id: 'aiAssistant', label: 'AI Vet Assistant', icon: Bot, allowedRoles: MODULE_PERMISSIONS.aiAssistant },
    ],
  },
  {
    title: 'SISTEM',
    items: [
      { id: 'notifications', label: 'Notifikasi', icon: Bell, allowedRoles: MODULE_PERMISSIONS.notifications },
      { id: 'systemGroups', label: 'Grup & Hak Akses', icon: FolderTree, allowedRoles: MODULE_PERMISSIONS.systemGroups },
      { id: 'branches', label: 'Cabang Klinik', icon: GitBranch, allowedRoles: MODULE_PERMISSIONS.branches },
      { id: 'auditLog', label: 'Audit Log Sistem', icon: History, allowedRoles: MODULE_PERMISSIONS.auditLog },
      { id: 'settings', label: 'Pengaturan Sistem', icon: Settings, allowedRoles: MODULE_PERMISSIONS.settings },
      { id: 'tenantAdmin', label: 'SaaS Superadmin', icon: Building2, allowedRoles: MODULE_PERMISSIONS.tenantAdmin },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, findAccountEmailByRole, logout } = useAuth();
  const { stockItems = [] } = useData();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showRoleSelector, setShowRoleSelector] = useState<boolean>(false);
  const [pinTarget, setPinTarget] = useState<{ role: UserRole; email: string } | null>(null);

  // Compute number of inventory products falling below or equal to minimum stock threshold
  const lowStockCount = useMemo(() => {
    return (stockItems || []).filter((item) => {
      const stock = item?.stock ?? 0;
      const minStock = item?.minStock ?? 0;
      return stock <= minStock;
    }).length;
  }, [stockItems]);

  // Single source of truth for role/permission resolution (see usePermissions.ts) —
  // replaces the divergent effectiveRole logic that used to live separately here.
  const { role: userRole } = usePermissions();
  const roleInfo = getRoleInfo(userRole);

  const canAccess = (allowedRoles: string[]) => {
    if (allowedRoles.includes('*')) return true;
    return allowedRoles.includes(userRole);
  };

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  // Selecting a role only opens the PIN prompt now — the switch itself
  // (AuthContext.switchAccount) requires that persona's own PIN, verified
  // server-side, so nobody can silently become another role with one click.
  const handleSelectRole = (newRole: UserRole) => {
    const email = findAccountEmailByRole(newRole);
    setShowRoleSelector(false);
    if (!email) return;
    setPinTarget({ role: newRole, email });
  };

  const handleRoleSwitchConfirmed = (newRole: UserRole) => {
    // If current module is not allowed in new role, redirect safely
    const isAllowedInNewRole =
      MODULE_PERMISSIONS[activeModule]?.includes('*') ||
      MODULE_PERMISSIONS[activeModule]?.includes(newRole);

    if (!isAllowedInNewRole) {
      if (newRole === 'owner_petshop') {
        setActiveModule('petShop');
      } else {
        setActiveModule('dashboard');
      }
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-gradient-to-b from-[#1B2A45] via-[#162238] to-[#101A2C] text-[#EDE6D6] flex flex-col transition-all duration-300 border-r border-[#B8905A]/30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#B8905A]/30 bg-[#101A2C]">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#D9B98A] text-[#1B2A45] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              🐾
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[#EDE6D6] leading-tight text-sm tracking-tight font-display truncate">
                PetCare - ERP
              </h1>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-[#D9B98A] text-[#1B2A45] flex items-center justify-center font-bold text-base shadow-xs">
            🐾
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => canAccess(item.allowedRoles));
          if (visibleItems.length === 0) return null;

          const isGroupCollapsed = collapsedGroups[group.title];

          return (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-[#D9B98A]/90 tracking-wider uppercase hover:text-[#EDE6D6]"
                >
                  <span>{group.title}</span>
                  {isGroupCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}

              {(!isGroupCollapsed || isCollapsed) && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    const isInventory = item.id === 'inventory';
                    const hasLowStock = isInventory && lowStockCount > 0;

                    return (
                      <button
                        key={item.id}
                        id={`sidebar-nav-${item.id}`}
                        onClick={() => setActiveModule(item.id)}
                        title={
                          isCollapsed
                            ? hasLowStock
                              ? `${item.label} (${lowStockCount} produk di bawah batas stok minimum)`
                              : item.label
                            : hasLowStock
                            ? `${lowStockCount} produk di bawah batas stok minimum`
                            : undefined
                        }
                        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#D9B98A] text-[#101A2C] font-bold shadow-2xs'
                            : 'text-[#EDE6D6]/80 hover:text-[#EDE6D6] hover:bg-[#B8905A]/20'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <div className="relative inline-flex items-center justify-center shrink-0">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-[#101A2C]' : 'text-[#D9B98A]/80'}`} />
                          {isCollapsed && hasLowStock && (
                            <span
                              id="sidebar-inventory-badge-collapsed"
                              className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white font-bold text-[9px] leading-none flex items-center justify-center shadow-xs ring-1 ring-[#101A2C]"
                            >
                              {lowStockCount > 99 ? '99+' : lowStockCount}
                            </span>
                          )}
                        </div>

                        {!isCollapsed && (
                          <>
                            <span className="truncate flex-1 text-left">{item.label}</span>
                            {hasLowStock && (
                              <span
                                id="sidebar-inventory-badge-expanded"
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight shrink-0 flex items-center gap-1 transition-all ${
                                  isActive
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-rose-500 text-white shadow-2xs ring-1 ring-rose-400/30'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                                <span>{lowStockCount}</span>
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-[#B8905A]/30 bg-[#101A2C] relative">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-90"
              title="Klik untuk ganti profil"
            >
              <div className="w-9 h-9 rounded-full bg-[#D9B98A] text-[#101A2C] border border-[#B8905A] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.name.substring(0, 2).toUpperCase() || 'OP'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#EDE6D6] truncate">{user?.name}</p>
                <p className="text-[10px] text-[#D9B98A] uppercase tracking-wider font-semibold truncate">
                  {roleInfo.label}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Keluar"
              className="p-1.5 hover:bg-[#1B2A45] text-[#D9B98A] hover:text-rose-300 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRoleSelector(true)}
            title={`Profil: ${roleInfo.label} (Klik untuk ganti)`}
            className="w-full py-1 flex items-center justify-center text-[#D9B98A] hover:text-[#FFFDF9]"
          >
            <div className="w-8 h-8 rounded-full bg-[#D9B98A] text-[#101A2C] flex items-center justify-center font-bold text-xs">
              {roleInfo.iconText}
            </div>
          </button>
        )}

        {/* Modal / Popover Role Switcher */}
        {showRoleSelector && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowRoleSelector(false);
            }}
          >
            <div 
              className="bg-[#1B2A45] border border-[#B8905A] rounded-2xl w-full max-w-md p-5 text-[#EDE6D6] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#B8905A]/30">
                <div>
                  <h3 className="font-bold text-base text-[#FFFDF9] flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#D9B98A]" /> Pilih Profil & Hak Akses
                  </h3>
                  <p className="text-xs text-[#D9B98A]/80">
                    Pilih profil pemilik usaha untuk menyesuaikan menu sidebar
                  </p>
                </div>
                <button
                  onClick={() => setShowRoleSelector(false)}
                  className="w-7 h-7 rounded-lg bg-[#101A2C] text-[#D9B98A] hover:text-[#FFFDF9] flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Owner Profiles Section */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#D9B98A] uppercase tracking-wider">
                  Profil Pemilik Usaha (Owner):
                </p>

                {/* 1. Owner Klinik */}
                <button
                  onClick={() => handleSelectRole('owner_klinik')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    userRole === 'owner_klinik' || userRole === 'owner'
                      ? 'bg-[#D9B98A]/20 border-[#D9B98A] shadow-md ring-1 ring-[#D9B98A]'
                      : 'bg-[#101A2C]/60 border-[#B8905A]/30 hover:border-[#D9B98A]/60 hover:bg-[#101A2C]'
                  }`}
                >
                  <span className="text-2xl mt-0.5">🏥</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#FFFDF9]">Owner Klinik</h4>
                      {(userRole === 'owner_klinik' || userRole === 'owner') && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#D9B98A]/90 font-medium">
                      Praktek Medis & Rumah Sakit Hewan
                    </p>
                    <p className="text-[10px] text-[#EDE6D6]/70 mt-1 leading-relaxed">
                      ✅ Rekam Medis (EMR), Pemeriksaan Klinik, Apotek & Lab, Rawat Inap, Vaksinasi, Billing & Keuangan.
                    </p>
                    <p className="text-[10px] text-rose-300/80 mt-0.5">
                      🚫 Menu Disembunyikan: Pet Shop POS, Grooming, Pet Hotel
                    </p>
                  </div>
                </button>

                {/* 2. Owner Petshop */}
                <button
                  onClick={() => handleSelectRole('owner_petshop')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    userRole === 'owner_petshop'
                      ? 'bg-[#D9B98A]/20 border-[#D9B98A] shadow-md ring-1 ring-[#D9B98A]'
                      : 'bg-[#101A2C]/60 border-[#B8905A]/30 hover:border-[#D9B98A]/60 hover:bg-[#101A2C]'
                  }`}
                >
                  <span className="text-2xl mt-0.5">🛒</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#FFFDF9]">Owner Petshop</h4>
                      {userRole === 'owner_petshop' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#D9B98A]/90 font-medium">
                      Toko Retail Pet Shop, Pakan & Aksesoris
                    </p>
                    <p className="text-[10px] text-[#EDE6D6]/70 mt-1 leading-relaxed">
                      ✅ Pet Shop POS Barcode, Stok Gudang & Opname, Purchasing PO Supplier, Billing Kasir, CRM Loyalty & Keuangan.
                    </p>
                    <p className="text-[10px] text-rose-300/80 mt-0.5">
                      🚫 Menu Disembunyikan: Semua Modul Medis Dokter, EMR, Farmasi, Grooming & Hotel
                    </p>
                  </div>
                </button>

                {/* 3. Owner PetCare */}
                <button
                  onClick={() => handleSelectRole('owner_petcare')}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    userRole === 'owner_petcare'
                      ? 'bg-[#D9B98A]/20 border-[#D9B98A] shadow-md ring-1 ring-[#D9B98A]'
                      : 'bg-[#101A2C]/60 border-[#B8905A]/30 hover:border-[#D9B98A]/60 hover:bg-[#101A2C]'
                  }`}
                >
                  <span className="text-2xl mt-0.5">🐾</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#FFFDF9]">Owner PetCare (All-in-One)</h4>
                      {userRole === 'owner_petcare' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D9B98A]/30 text-[#D9B98A] font-bold border border-[#B8905A]/50 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#D9B98A]/90 font-medium">
                      Ekosistem Lengkap (Klinik + Petshop + Grooming + Hotel)
                    </p>
                    <p className="text-[10px] text-emerald-300/90 mt-1 leading-relaxed font-semibold">
                      🌟 Akses Penuh ke Seluruh 28 Modul ERP tanpa batasan.
                    </p>
                  </div>
                </button>
              </div>

              {/* Other Staff Roles */}
              <div className="pt-2 border-t border-[#B8905A]/20">
                <p className="text-[10px] font-bold text-[#D9B98A]/80 uppercase tracking-wider mb-2">
                  Profil Pengguna Staff Lainnya:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSelectRole('dokter')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left border flex items-center gap-2 ${
                      userRole === 'dokter'
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-[#101A2C] border-[#B8905A]/30 text-[#EDE6D6] hover:bg-[#1B2A45]'
                    }`}
                  >
                    <span>🩺</span> Dokter Hewan
                  </button>
                  <button
                    onClick={() => handleSelectRole('kasir')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left border flex items-center gap-2 ${
                      userRole === 'kasir'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : 'bg-[#101A2C] border-[#B8905A]/30 text-[#EDE6D6] hover:bg-[#1B2A45]'
                    }`}
                  >
                    <span>💳</span> Kasir & POS
                  </button>
                  <button
                    onClick={() => handleSelectRole('groomer')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left border flex items-center gap-2 ${
                      userRole === 'groomer'
                        ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                        : 'bg-[#101A2C] border-[#B8905A]/30 text-[#EDE6D6] hover:bg-[#1B2A45]'
                    }`}
                  >
                    <span>✂️</span> Groomer Salon
                  </button>
                  <button
                    onClick={() => handleSelectRole('admin')}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left border flex items-center gap-2 ${
                      userRole === 'admin'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-[#101A2C] border-[#B8905A]/30 text-[#EDE6D6] hover:bg-[#1B2A45]'
                    }`}
                  >
                    <span>🛠️</span> Admin Sistem
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {pinTarget && (
        <PinConfirmModal
          targetLabel={getRoleInfo(pinTarget.role).label || pinTarget.role.replace('_', ' ')}
          targetEmail={pinTarget.email}
          onSuccess={() => {
            handleRoleSwitchConfirmed(pinTarget.role);
            setPinTarget(null);
          }}
          onCancel={() => setPinTarget(null)}
        />
      )}
    </aside>
  );
};
