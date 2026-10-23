import React, { Component, useState, useEffect } from 'react';

type EBProps = { children: React.ReactNode };
type EBState = { error: Error | null };
class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8 text-center">
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">Terjadi kesalahan aplikasi</h2>
            <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 p-3 rounded">{err.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { usePermissions } from './hooks/usePermissions';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { WAStatusBanner } from './components/layout/WAStatusBanner';
import { PWAInstallPrompt } from './components/layout/PWAInstallPrompt';
import { QueueDisplay } from './components/common/QueueDisplay';
import { DoseCalculator } from './components/common/DoseCalculator';
import { CctvMonitor } from './components/common/CctvMonitor';
import { ModalPortal } from './components/common/ModalPortal';
import { DashboardModule } from './components/modules/DashboardModule';
import { MasterDataModule } from './components/modules/MasterDataModule';
import { ClinicModule } from './components/modules/ClinicModule';
import { CRMModule } from './components/modules/CRMModule';
import { BillingFinanceModule } from './components/modules/BillingFinanceModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { PetShopModule } from './components/modules/PetShopModule';
import { PurchasingModule } from './components/modules/PurchasingModule';
import { ClientPortalModule } from './components/modules/ClientPortalModule';
import { ServicesModule } from './components/modules/ServicesModule';
import { DiagnosticsModule } from './components/modules/DiagnosticsModule';
import { HRMModule } from './components/modules/HRMModule';
import { ReportsExportModule } from './components/modules/ReportsExportModule';
import { AIAssistantModule } from './components/modules/AIAssistantModule';
import { SystemGroupsModule } from './components/modules/SystemGroupsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { AuditLogModule } from './components/modules/AuditLogModule';
import { BranchesModule } from './components/modules/BranchesModule';
import { NotificationsModule } from './components/modules/NotificationsModule';
import { TenantAdminModule } from './components/modules/TenantAdminModule';
import { LoginScreen } from './components/auth/LoginScreen';
import { ResetPasswordScreen } from './components/auth/ResetPasswordScreen';
import { LockScreen } from './components/auth/LockScreen';
import { useIdleTimer } from './hooks/useIdleTimer';
import { getRoleInfo } from './utils/roleUtils';
import {
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
  Sparkles,
  Tv,
  CheckCircle2,
  Plus,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const MODULE_TITLES: Record<NavModule, { title: string; desc: string }> = {
  dashboard: { title: 'Dashboard Utama', desc: 'Ringkasan performa klinik, omzet, dan antrian' },
  masterData: { title: 'Master Data Pelanggan & Hewan', desc: 'Database pelanggan, pasien hewan microchip, katalog tarif, dokter & supplier' },
  booking: { title: 'Booking & Antrian Layanan', desc: 'Sistem booking online, nomor antrian otomatis & layar TV pemanggil' },
  clinic: { title: 'Pemeriksaan Klinik & CPPT', desc: 'Pemeriksaan fisik dokter, keluhan, diagnosis ICD-10, SOAP & resep' },
  emr: { title: 'Rekam Medis (EMR)', desc: 'Riwayat rekam medis terpadu, lab, radiologi, dan resep obat' },
  vaccination: { title: 'Vaksinasi & Paspor Hewan', desc: 'Jadwal vaksin berkala, sertifikat Rabies & Paspor Digital' },
  pharmacy: { title: 'Apotek & Laboratorium', desc: 'Resep digital, racikan obat, stok farmasi & hasil sampel lab' },
  grooming: { title: 'Grooming Salon & Spa', desc: 'Sesi perawatan, pilihan paket grooming & foto sebelum/sesudah' },
  petHotel: { title: 'Pet Hotel Boarding', desc: 'Reservasi kamar, checklist pakan harian & monitoring cctv live' },
  patientGallery: { title: 'Galeri Foto Pasien', desc: 'Dokumentasi foto medis, perkembangan perawatan & photo booth' },
  petShop: { title: 'Pet Shop (POS)', desc: 'Point of Sales kasir toko, barcode scanner, pakan & perlengkapan' },
  inventory: { title: 'Stok & Manajemen Gudang', desc: 'Stok opname, kartu stok, expired date alert & transfer antar cabang' },
  purchasing: { title: 'Purchasing (PO)', desc: 'Purchase order ke supplier, penerimaan barang & hutang usaha' },
  billing: { title: 'Billing & Kasir', desc: 'Invoice gabungan klinik + shop + hotel, diskon, poin & metode bayar' },
  finance: { title: 'Buku Kas & Keuangan', desc: 'Pemasukan, pengeluaran operasional, jurnal umum & laporan laba rugi' },
  hrm: { title: 'SDM & Shift Kerja', desc: 'Data dokter/staff, jadwal shift, absensi GPS & perhitungan komisi' },
  crm: { title: 'CRM & Member Loyalty', desc: 'Broadcast WhatsApp otomatis, pengingat vaksin & poin member' },
  reports: { title: 'Laporan & Eksekutif', desc: 'Analytics pendapatan, performa dokter, dan laporan pajak' },
  aiAssistant: { title: 'AI Vet Assistant', desc: 'Saran diagnosis medis, kalkulator dosis & perangkum rekam medis' },
  telehealth: { title: 'Telehealth Video Konsultasi', desc: 'Konsultasi dokter hewan online via video call & e-resep' },
  eForms: { title: 'E-Form & Digital Consent', desc: 'Formulir persetujuan tindakan operasi, rawat inap & anestesi' },
  ambulance: { title: 'Ambulance & Emergency Rescue', desc: 'Layanan antar jemput hewan darurat & tim medis keliling' },
  carePlan: { title: 'Rencana Perawatan (Care Plan)', desc: 'Rencana perawatan intensif harian & instruksi khusus pasien' },
  auditLog: { title: 'Audit Log & Jejak Sistem', desc: 'Catatan jejak aktivitas user, perubahan data & keamanan' },
  systemGroups: { title: 'Manajemen Sistem Grup & RBAC', desc: 'Departemen staf, hak akses perizinan modul granular dan tier pelanggan' },
  notifications: { title: 'Pusat Notifikasi', desc: 'Pengingat otomatis booking, stok habis & pesan sistem' },
  branches: { title: 'Manajemen Cabang Klinik', desc: 'Pengaturan multi-cabang, cabang pusat & sinkronisasi data' },
  settings: { title: 'Pengaturan Sistem', desc: 'Konfigurasi profil klinik, header invoice, tax & integrasi WA' },
  tenantAdmin: { title: 'SaaS Superadmin Admin Tenant', desc: 'Manajemen lisensi, langganan tenant & kuota data' },
};

const MainAppContent: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showQueueDisplay, setShowQueueDisplay] = useState(false);
  const [showDoseCalcModal, setShowDoseCalcModal] = useState(false);
  const [showCctvModal, setShowCctvModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('resetToken')
  );

  const { user, isLoginScreenOpen, closeLoginScreen, isLocked, lockApp } = useAuth();
  const { addToast } = useToast();
  const { appSettings } = useData();

  // Lock Aplikasi Otomatis — timer cuma aktif kalau sudah login & fiturnya
  // diaktifkan di Pengaturan Sistem. Berhenti total (tidak dengar event
  // apa pun) kalau appLockEnabled false, supaya tidak ada overhead diam-diam.
  useIdleTimer(!!user && !isLoginScreenOpen && appSettings.appLockEnabled, appSettings.appLockTimeoutMinutes, lockApp);

  // Single source of truth for role/permission resolution (see usePermissions.ts) —
  // replaces the divergent effectiveRole logic that used to live separately here.
  const { role: userRole, canAccessModule } = usePermissions();
  const roleInfo = getRoleInfo(userRole);

  // Check if current user is allowed to access the active module
  const isModuleAllowed = canAccessModule(activeModule);

  // Auto-redirect if active module is not permitted for current role
  useEffect(() => {
    if (!isModuleAllowed && user && !isLoginScreenOpen) {
      if (userRole === 'owner_petshop') {
        setActiveModule('petShop');
      } else {
        setActiveModule('dashboard');
      }
    }
  }, [userRole, activeModule, isModuleAllowed, user, isLoginScreenOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openPublicBooking = () => {
    setShowQueueDisplay(true);
  };

  if (resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onDone={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setResetToken(null);
        }}
      />
    );
  }

  if (!user || isLoginScreenOpen) {
    return <LoginScreen onSuccessfulLogin={() => closeLoginScreen()} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F1E6] text-[#22242B] font-sans antialiased selection:bg-[#1B2A45] selection:text-[#FFFDF9]">
      {/* Lock Aplikasi Otomatis — overlay di atas aplikasi, BUKAN ganti
          seluruh halaman seperti LoginScreen, supaya modal/form yang
          sedang terbuka di baliknya tidak hilang saat unlock. */}
      {isLocked && <LockScreen />}

      {/* Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Header Topbar */}
      <Header
        activeModule={activeModule}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        openGlobalSearch={() => setIsSearchOpen(true)}
        openPublicBooking={openPublicBooking}
        onOpenAI={() => setActiveModule('aiAssistant')}
      />

      {/* Main View Area — this is the "AREA CONTENT UTAMA": the containing
          block for every modal/dialog in the app (see .content-area in
          index.css). It now scrolls internally (h-screen + overflow-y-auto)
          so its box always matches the visible viewport slice next to the
          Sidebar and below the Header, which is what keeps a centered modal
          visible instead of centering somewhere down a long scrolled page. */}
      <main
        className={`content-area h-screen overflow-y-auto pt-20 pb-12 px-4 md:px-6 transition-all duration-300 ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-5">
          {/* WhatsApp Status Banner */}
          <WAStatusBanner />

          {/* Quick Utility Actions Bar - Only visible on Dashboard ERP */}
          {activeModule === 'dashboard' && (
            <div className="flex items-center justify-between bg-[#FFFDF9] px-4 py-2.5 rounded-xl border border-[#E1D6BE] shadow-2xs">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-[#1B2A45]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-[#1B2A45] text-[#D9B98A] font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                    <span>{roleInfo.iconText}</span> {roleInfo.label}
                  </span>
                  <span className="text-[#6B6656] text-[11px] hidden sm:inline">
                    • {roleInfo.businessType}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDoseCalcModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#E1D6BE]/40 hover:bg-[#E1D6BE]/70 text-[#1B2A45] text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#E1D6BE]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" />
                  <span>Kalkulator Dosis</span>
                </button>

                <button
                  onClick={() => setShowCctvModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#E1D6BE]/40 hover:bg-[#E1D6BE]/70 text-[#1B2A45] text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#E1D6BE]"
                >
                  <Tv className="w-3.5 h-3.5 text-[#1B2A45]" />
                  <span>CCTV Monitor</span>
                </button>

                <button
                  onClick={() => setShowQueueDisplay(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Tv className="w-3.5 h-3.5 text-[#D9B98A]" />
                  <span>Layar Antrian TV</span>
                </button>
              </div>
            </div>
          )}

          {/* Animated Module Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {/* If module is restricted for the current user's profile, show informative role-restricted view */}
              {!isModuleAllowed ? (
                <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-8 shadow-xs text-center max-w-2xl mx-auto space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-3xl border border-amber-500/20">
                    🔒
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-[#1B2A45] font-display">
                      Menu Disembunyikan untuk Profil {roleInfo.label}
                    </h3>
                    <p className="text-xs text-[#6B6656] max-w-lg mx-auto leading-relaxed">
                      Modul <strong>"{MODULE_TITLES[activeModule]?.title || activeModule}"</strong> tidak aktif pada jenis kepemilikan usaha <strong>{roleInfo.businessType}</strong>. Menu ini otomatis disembunyikan dari sidebar untuk kenyamanan dan fokus operasional usaha Anda.
                    </p>
                  </div>

                  <div className="bg-[#F6F1E6] p-4 rounded-xl border border-[#E1D6BE] text-left text-xs space-y-2">
                    <p className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-[#B8905A]" /> Ringkasan Hak Akses Profil Anda:
                    </p>
                    <p className="text-[#6B6656] text-[11px]">{roleInfo.desc}</p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (userRole === 'owner_petshop') {
                          setActiveModule('petShop');
                        } else {
                          setActiveModule('dashboard');
                        }
                      }}
                      className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Buka Menu Utama Profil</span>
                      <ArrowRight className="w-4 h-4 text-[#D9B98A]" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Render Active Module */}
                  {activeModule === 'dashboard' && <DashboardModule setActiveModule={setActiveModule} />}
                  {activeModule === 'masterData' && <MasterDataModule />}
                  {(activeModule === 'clinic' || activeModule === 'eForms' || activeModule === 'carePlan') && <ClinicModule activeModule={activeModule} />}
                  {(activeModule === 'emr' || activeModule === 'pharmacy' || activeModule === 'patientGallery') && <DiagnosticsModule activeModule={activeModule} />}
                  {['booking', 'grooming', 'petHotel', 'telehealth', 'ambulance'].includes(activeModule) && (
                    <ServicesModule activeModule={activeModule} setActiveModule={setActiveModule} />
                  )}
                  {activeModule === 'hrm' && <HRMModule />}
                  {activeModule === 'reports' && <ReportsExportModule />}
                  {activeModule === 'aiAssistant' && <AIAssistantModule setActiveModule={setActiveModule} />}
                  {activeModule === 'crm' && <CRMModule />}
                  {activeModule === 'petShop' && <PetShopModule />}
                  {activeModule === 'inventory' && <InventoryModule activeModule={activeModule} setActiveModule={setActiveModule} />}
                  {activeModule === 'purchasing' && <PurchasingModule />}
                  {(activeModule === 'billing' || activeModule === 'finance') && <BillingFinanceModule activeModule={activeModule} />}
                  {activeModule === 'vaccination' && <ClientPortalModule activeModule={activeModule} />}
                  {activeModule === 'systemGroups' && <SystemGroupsModule />}
                  {activeModule === 'branches' && <BranchesModule />}
                  {activeModule === 'notifications' && <NotificationsModule setActiveModule={setActiveModule} />}
                  {activeModule === 'auditLog' && <AuditLogModule />}
                  {activeModule === 'settings' && <SettingsModule />}
                  {activeModule === 'tenantAdmin' && <TenantAdminModule />}

                  {![
                    'dashboard',
                    'masterData',
                    'clinic',
                    'emr',
                    'pharmacy',
                    'patientGallery',
                    'eForms',
                    'carePlan',
                    'booking',
                    'grooming',
                    'petHotel',
                    'telehealth',
                    'ambulance',
                    'hrm',
                    'reports',
                    'aiAssistant',
                    'crm',
                    'billing',
                    'finance',
                    'petShop',
                    'inventory',
                    'purchasing',
                    'vaccination',
                    'systemGroups',
                    'branches',
                    'notifications',
                    'auditLog',
                    'settings',
                    'tenantAdmin'
                  ].includes(activeModule) && (
                    <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-8 shadow-2xs text-center space-y-4">
                      <div className="w-14 h-14 mx-auto rounded-full bg-[#E1D6BE]/40 text-[#1B2A45] flex items-center justify-center font-bold text-2xl border border-[#E1D6BE]">
                        🐾
                      </div>
                      <div className="max-w-md mx-auto space-y-1">
                        <h2 className="text-xl font-bold text-[#1B2A45] font-display">
                          {MODULE_TITLES[activeModule]?.title || activeModule}
                        </h2>
                        <p className="text-xs text-[#6B6656]">
                          {MODULE_TITLES[activeModule]?.desc || 'Modul operasional ERP terintegrasi.'}
                        </p>
                      </div>

                      <div className="pt-4 flex items-center justify-center gap-3">
                        <button
                          onClick={() => addToast(`Modul ${MODULE_TITLES[activeModule]?.title} dalam mode aktif.`, 'info')}
                          className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-[#D9B98A]" /> Tambah Transaksi / Record
                        </button>
                        <button
                          onClick={() => setActiveModule('dashboard')}
                          className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Kembali ke Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal portal target — stays INSIDE .content-area so anything
            rendered through <ModalPortal> (used by modals that live outside
            the content area in the DOM, e.g. ones opened from Sidebar/Header)
            shares the exact same coordinate system as every other modal. */}
        <div id="modal-root" className="contents" />

        {/* Global Search Modal */}
        {isSearchOpen && (
          <ModalPortal>
            <GlobalSearchModal
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              setActiveModule={setActiveModule}
            />
          </ModalPortal>
        )}

        {/* Dose Calculator Modal */}
        {showDoseCalcModal && (
          <ModalPortal>
            <div
              className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowDoseCalcModal(false);
              }}
            >
              <div className="max-w-2xl w-full cursor-default max-h-[90vh] overflow-y-auto rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <DoseCalculator onClose={() => setShowDoseCalcModal(false)} />
              </div>
            </div>
          </ModalPortal>
        )}

        {/* CCTV Monitor Modal */}
        {showCctvModal && (
          <ModalPortal>
            <div
              className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowCctvModal(false);
              }}
            >
              <div className="max-w-4xl w-full bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-white">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Tv className="w-4 h-4 text-sky-400" /> CCTV Real-time Monitoring Pet Hotel & Grooming
                  </h3>
                  <button
                    onClick={() => setShowCctvModal(false)}
                    className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-bold"
                  >
                    Tutup Monitor
                  </button>
                </div>
                <CctvMonitor />
              </div>
            </div>
          </ModalPortal>
        )}
      </main>

      {/* Fullscreen TV Queue Display — intentionally a real kiosk display
          meant to be shown on an external TV at reception, not a page
          dialog, so it stays a true viewport-covering overlay outside
          .content-area (matches the LockScreen exception below). */}
      {showQueueDisplay && <QueueDisplay onClose={() => setShowQueueDisplay(false)} />}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <ErrorBoundary>
                <MainAppContent />
              </ErrorBoundary>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
