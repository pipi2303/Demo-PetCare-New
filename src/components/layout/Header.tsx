import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { NavModule } from './Sidebar';
import { getRoleInfo } from '../../utils/roleUtils';
import { UserRole } from '../../types';
import { PinConfirmModal } from '../auth/PinConfirmModal';
import {
  Menu,
  Search,
  Bell,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  UserCheck,
  Check,
  ShieldCheck,
  Store,
  LogOut,
  Lock,
  KeyRound,
  Zap,
  Building2,
  MapPin,
  ShoppingBag,
  Stethoscope,
  Sparkle
} from 'lucide-react';

interface HeaderProps {
  activeModule: NavModule;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
  openGlobalSearch: () => void;
  openPublicBooking: () => void;
  onOpenAI?: () => void;
}

const MODULE_TITLES: Record<NavModule, string> = {
  dashboard: 'Dashboard Operasional ERP',
  masterData: 'Master Data Pelanggan & Hewan',
  booking: 'Booking & Antrian Layanan',
  clinic: 'Pemeriksaan Klinik & CPPT SOAP',
  emr: 'Rekam Medis Elektronik (EMR)',
  vaccination: 'Vaksinasi & Paspor Hewan',
  pharmacy: 'Apotek & Laboratorium',
  grooming: 'Grooming Salon & Spa',
  petHotel: 'Pet Hotel Boarding',
  patientGallery: 'Galeri Foto Pasien',
  petShop: 'Pet Shop POS Kasir & Barcode',
  inventory: 'Stok & Manajemen Gudang',
  purchasing: 'Purchasing (Purchase Orders)',
  billing: 'Billing & Pembayaran Kasir',
  finance: 'Buku Kas & Keuangan',
  hrm: 'SDM, Absensi & Shift Kerja',
  crm: 'CRM, Loyalitas & Blast WA',
  reports: 'Laporan & Analytics Eksekutif',
  aiAssistant: 'AI Veterinary Assistant',
  telehealth: 'Telehealth Video Konsultasi',
  eForms: 'E-Form & Digital Consent',
  ambulance: 'Ambulance & Emergency Rescue',
  carePlan: 'Rencana Perawatan (Care Plan)',
  auditLog: 'Audit Log & Jejak Sistem',
  systemGroups: 'Sistem Grup & RBAC Departemen',
  notifications: 'Pusat Notifikasi',
  branches: 'Manajemen Cabang Klinik',
  settings: 'Pengaturan Sistem',
  tenantAdmin: 'SaaS Superadmin Admin Tenant',
};

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  isCollapsed,
  setIsCollapsed,
  openGlobalSearch,
  openPublicBooking,
  onOpenAI,
}) => {
  const { user, findAccountEmailByRole, logout, openLoginScreen, activeOwnership, lockApp } = useAuth();
  const { notifications = [], markNotificationRead } = useData();
  const { addToast } = useToast();
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [pinTarget, setPinTarget] = useState<{ role: UserRole; email: string; label: string } | null>(null);

  // Derive effective role from user role or active ownership
  let userRole: UserRole = 'owner_klinik';
  if (user?.role && user.role !== 'owner') {
    userRole = user.role;
  }
  if (user?.ownershipType && (user.ownershipType === 'owner_klinik' || user.ownershipType === 'owner_petshop' || user.ownershipType === 'owner_petcare')) {
    userRole = user.ownershipType as UserRole;
  } else if (activeOwnership && (activeOwnership === 'owner_klinik' || activeOwnership === 'owner_petshop' || activeOwnership === 'owner_petcare') && (user?.role?.startsWith('owner') || user?.role === 'owner' || !user)) {
    userRole = activeOwnership as UserRole;
  }

  const roleInfo = getRoleInfo(userRole);
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const ROLE_LABELS: Record<string, string> = {
    owner_petshop: 'Owner Petshop (Toko Retail & POS)',
    owner_klinik: 'Owner Klinik (Medis & RS Hewan)',
    owner_petcare: 'Owner PetCare (All-in-One Ecosystem)',
    dokter: 'Dokter Hewan',
    kasir: 'Kasir & POS',
    groomer: 'Groomer',
    admin: 'Admin Sistem'
  };

  // Switching persona now requires that persona's own PIN, verified
  // server-side — clicking a role button only opens the PIN prompt, it no
  // longer switches instantly.
  const handleRoleSelect = (role: UserRole) => {
    const email = findAccountEmailByRole(role);
    setShowUserDropdown(false);
    if (!email) {
      addToast(`Tidak ada akun demo terdaftar untuk peran: ${role.replace('_', ' ')}`, 'error');
      return;
    }
    setPinTarget({ role, email, label: ROLE_LABELS[role] || role.replace('_', ' ') });
  };

  useEffect(() => {
    if (!showNotifDropdown && !showUserDropdown) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setShowNotifDropdown(false);
        setShowUserDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifDropdown(false);
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifDropdown, showUserDropdown]);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-[#1B2A45] border-b border-[#B8905A]/30 shadow-md transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        isCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Left section: Collapse Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl text-[#D9B98A] hover:bg-[#101A2C] hover:text-[#FFFDF9] transition-colors cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <nav className="text-xs text-[#EDE6D6]/80 flex items-center gap-1.5 font-medium leading-tight">
            <span className="text-[#D9B98A] font-bold">PetCare - ERP</span>
            <span className="text-[#B8905A]/70 font-bold">/</span>
            <span className="text-[#FFFDF9] font-bold font-display tracking-tight">
              {MODULE_TITLES[activeModule] || activeModule}
            </span>
          </nav>
        </div>
      </div>

      {/* Center/Right section: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          onClick={openGlobalSearch}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#101A2C] text-[#EDE6D6] hover:bg-[#101A2C]/80 hover:border-[#D9B98A] text-xs font-medium border border-[#B8905A]/30 transition-all shadow-2xs group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[#D9B98A] group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline text-[#EDE6D6]/70">Cari pasien, obat, barang...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-[#1B2A45] border border-[#B8905A]/40 rounded text-[#D9B98A] font-mono font-bold">
            ⌘K
          </kbd>
        </button>

        {/* Public Booking Portal button */}
        <div className="relative group">
          <button
            onClick={openPublicBooking}
            className="flex items-center justify-center p-2 rounded-lg bg-[#B8905A] text-[#FFFDF9] hover:bg-[#9E7848] border border-[#D9B98A]/30 transition-all shadow-2xs cursor-pointer"
            aria-label="Form Booking Online"
          >
            <ClipboardList className="w-4 h-4 text-[#FFFDF9]" />
          </button>

          {/* Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2.5 py-1 bg-[#101A2C] border border-[#B8905A]/40 text-[#FFFDF9] text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <span>Form Booking Online</span>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#101A2C] border-t border-l border-[#B8905A]/40 rotate-45"></div>
          </div>
        </div>

        {/* Notification Bell */}
        <div className="relative" data-dropdown-container="true">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowUserDropdown(false);
            }}
            className="p-2 rounded-xl text-[#D9B98A] bg-[#101A2C] hover:bg-[#101A2C]/80 border border-[#B8905A]/30 transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#D9B98A]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#7A3030] text-[#FFFDF9] rounded-full text-[10px] font-bold flex items-center justify-center border border-[#FFFDF9]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-[#FFFDF9] rounded-xl shadow-xl border border-[#E1D6BE] p-3 z-50 text-[#22242B] animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1D6BE]">
                <h4 className="text-xs font-bold text-[#1B2A45] font-display">Notifikasi Terbaru</h4>
                <span className="text-[10px] bg-[#E1D6BE] text-[#1B2A45] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} Baru
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      !n.isRead
                        ? 'bg-[#F6F1E6] border-[#E1D6BE]'
                        : 'bg-[#FFFDF9] border-[#E1D6BE]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#1B2A45]">{n.title}</span>
                      <span className="text-[10px] text-[#6B6656]">{n.createdAt}</span>
                    </div>
                    <p className="text-[11px] text-[#22242B] line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Role Profile Switcher Badge (Section Kanan Atas) */}
        <div className="relative" data-dropdown-container="true">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifDropdown(false);
            }}
            className={`flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-xl border transition-all text-left cursor-pointer group ${
              userRole === 'owner_petshop'
                ? 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20'
                : userRole === 'owner_klinik' || userRole === 'owner'
                ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                : userRole === 'owner_petcare'
                ? 'border-[#B8905A]/50 bg-[#D9B98A]/10 hover:bg-[#D9B98A]/20'
                : 'border-[#B8905A]/30 bg-[#101A2C] hover:bg-[#101A2C]/80'
            }`}
            title="Klik untuk ganti profil kepemilikan usaha atau peran staff"
          >
            <div
              className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform ${
                userRole === 'owner_petshop'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : userRole === 'owner_klinik' || userRole === 'owner'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : userRole === 'owner_petcare'
                  ? 'bg-[#D9B98A] text-[#101A2C] font-black'
                  : 'bg-[#D9B98A] text-[#101A2C]'
              }`}
            >
              {roleInfo.iconText}
            </div>
            <div className="hidden md:block text-left">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-[#FFFDF9] leading-none">{roleInfo.label}</p>
                <ChevronDown className="w-3 h-3 text-[#D9B98A] group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p
                className={`text-[10px] font-semibold mt-0.5 truncate max-w-[140px] ${
                  userRole === 'owner_petshop'
                    ? 'text-amber-300'
                    : userRole === 'owner_klinik' || userRole === 'owner'
                    ? 'text-emerald-300'
                    : userRole === 'owner_petcare'
                    ? 'text-[#D9B98A]'
                    : 'text-[#EDE6D6]/80'
                }`}
              >
                {roleInfo.businessType}
              </p>
            </div>
          </button>

          {/* Role Profile Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-84 bg-[#1B2A45] border border-[#B8905A] rounded-2xl shadow-2xl p-3.5 z-50 text-[#EDE6D6] space-y-3 animate-in fade-in zoom-in-95 duration-150">
              {/* Active User Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#B8905A]/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-sm shrink-0 ${
                      userRole === 'owner_petshop'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : userRole === 'owner_klinik' || userRole === 'owner'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : userRole === 'owner_petcare'
                        ? 'bg-[#D9B98A] text-[#101A2C] font-bold'
                        : 'bg-[#D9B98A] text-[#101A2C] font-bold'
                    }`}
                  >
                    {roleInfo.iconText}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#FFFDF9] truncate">
                      {user?.name || (userRole === 'owner_petshop' ? 'Rendra Pratama (Owner Petshop)' : 'drh. Hendrawan')}
                    </h4>
                    <p className="text-[10px] text-[#D9B98A] truncate">
                      {user?.email || (userRole === 'owner_petshop' ? 'owner.petshop@petcare.id' : 'owner.klinik@petcare.id')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserDropdown(false)}
                  className="p-1 rounded-lg hover:bg-[#101A2C] text-[#D9B98A] hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Title Section */}
              <div>
                <p className="text-[10px] font-bold text-[#D9B98A] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Pilih Profil Kepemilikan (Owner)
                </p>
              </div>

              {/* 3 Main Owner Options */}
              <div className="space-y-2">
                {/* 1. Owner Petshop (Highlight) */}
                <button
                  onClick={() => handleRoleSelect('owner_petshop')}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    userRole === 'owner_petshop'
                      ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500 shadow-sm'
                      : 'bg-[#101A2C]/60 border-[#B8905A]/30 hover:bg-[#101A2C] hover:border-amber-500/50'
                  }`}
                >
                  <span className="text-2xl mt-0.5">🛒</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FFFDF9]">Owner Petshop</span>
                      {userRole === 'owner_petshop' ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/25 text-amber-300 rounded-md font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#101A2C] text-[#D9B98A] rounded-md font-medium border border-[#B8905A]/30">
                          Pilih
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-amber-300 font-semibold">Toko Retail Pet Shop & Pakan</p>
                    <div className="mt-1 text-[9px] space-y-0.5">
                      <p className="text-emerald-300/90 font-medium">✓ Kasir POS, Barcode, Stok & PO Supplier</p>
                      <p className="text-rose-300/80">✗ Modul Medis & Salon disembunyikan</p>
                    </div>
                  </div>
                </button>

                {/* 2. Owner Klinik */}
                <button
                  onClick={() => handleRoleSelect('owner_klinik')}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    userRole === 'owner_klinik' || userRole === 'owner'
                      ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500 shadow-sm'
                      : 'bg-[#101A2C]/60 border-[#B8905A]/30 hover:bg-[#101A2C] hover:border-emerald-500/50'
                  }`}
                >
                  <span className="text-2xl mt-0.5">🏥</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FFFDF9]">Owner Klinik</span>
                      {(userRole === 'owner_klinik' || userRole === 'owner') ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/25 text-emerald-300 rounded-md font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#101A2C] text-[#D9B98A] rounded-md font-medium border border-[#B8905A]/30">
                          Pilih
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-300 font-semibold">Praktek Medis & RS Hewan Vet</p>
                    <div className="mt-1 text-[9px] space-y-0.5">
                      <p className="text-emerald-300/90 font-medium">✓ EMR, CPPT, Apotek, Vaksin & Lab</p>
                      <p className="text-rose-300/80">✗ Toko POS, Grooming & Hotel disembunyikan</p>
                    </div>
                  </div>
                </button>

                {/* 3. Owner PetCare */}
                <button
                  onClick={() => handleRoleSelect('owner_petcare')}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                    userRole === 'owner_petcare'
                      ? 'bg-[#D9B98A]/25 border-[#D9B98A] ring-1 ring-[#D9B98A] shadow-sm'
                      : 'bg-[#101A2C]/60 border-[#B8905A]/30 hover:bg-[#101A2C] hover:border-[#D9B98A]/50'
                  }`}
                >
                  <span className="text-2xl mt-0.5">🐾</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#FFFDF9]">Owner PetCare (All-in-One)</span>
                      {userRole === 'owner_petcare' ? (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#D9B98A]/30 text-[#D9B98A] rounded-md font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Aktif
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#101A2C] text-[#D9B98A] rounded-md font-medium border border-[#B8905A]/30">
                          Pilih
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#D9B98A] font-semibold">One-Stop Solution Ecosystem</p>
                    <p className="text-[9px] text-emerald-300 font-medium mt-1">
                      🌟 Akses Penuh ke Seluruh 28 Modul Operasional
                    </p>
                  </div>
                </button>
              </div>

              {/* Other Roles Quick Switch */}
              <div className="pt-2 border-t border-[#B8905A]/20">
                <p className="text-[9px] font-bold text-[#D9B98A]/80 uppercase tracking-wider mb-1.5">
                  Peran Operasional Staff:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleRoleSelect('dokter')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      userRole === 'dokter'
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-[#101A2C] hover:bg-[#101A2C]/80 border-[#B8905A]/30 text-[#EDE6D6]'
                    }`}
                  >
                    <span>🩺</span> Dokter Hewan
                  </button>
                  <button
                    onClick={() => handleRoleSelect('kasir')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      userRole === 'kasir'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : 'bg-[#101A2C] hover:bg-[#101A2C]/80 border-[#B8905A]/30 text-[#EDE6D6]'
                    }`}
                  >
                    <span>💳</span> Kasir & POS
                  </button>
                  <button
                    onClick={() => handleRoleSelect('groomer')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      userRole === 'groomer'
                        ? 'bg-pink-500/20 border-pink-400 text-pink-200'
                        : 'bg-[#101A2C] hover:bg-[#101A2C]/80 border-[#B8905A]/30 text-[#EDE6D6]'
                    }`}
                  >
                    <span>✂️</span> Groomer
                  </button>
                  <button
                    onClick={() => handleRoleSelect('admin')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      userRole === 'admin'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-[#101A2C] hover:bg-[#101A2C]/80 border-[#B8905A]/30 text-[#EDE6D6]'
                    }`}
                  >
                    <span>🛠️</span> Admin Sistem
                  </button>
                </div>
              </div>

              {/* Portal Login, Switch Shift & Logout Actions */}
              <div className="pt-2.5 border-t border-[#B8905A]/20 space-y-1.5">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    openLoginScreen();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#B8905A] hover:bg-[#D9B98A] text-[#101A2C] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Buka Layar Login & Otorisasi</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    lockApp();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#B8905A]" />
                  <span>Kunci Sekarang</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#101A2C] hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {pinTarget && (
        <PinConfirmModal
          targetLabel={pinTarget.label}
          targetEmail={pinTarget.email}
          onSuccess={() => {
            addToast(`Profil aktif beralih ke: ${pinTarget.label}`, 'success');
            setPinTarget(null);
          }}
          onCancel={() => setPinTarget(null)}
        />
      )}
    </header>
  );
};
