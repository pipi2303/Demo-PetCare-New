import React, { useMemo, useState } from 'react';
import {
  Customer,
  Pet,
  ServiceItem,
  Employee,
  Drug,
  HotelRoom,
  GroomingPackage,
  ClinicVisit,
  SOAPNote,
  VacHistory,
  VacSchedule,
  LabTest,
  Invoice,
  ChartOfAccount,
} from '../../types';
import {
  X,
  ShieldCheck,
  GitBranch,
  TrendingUp,
  Users,
  Dog,
  Stethoscope,
  Syringe,
  Hotel,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Download,
  Percent,
  FileSpreadsheet,
  Layers,
  Award,
  Clock,
  Phone,
  Pill,
  Plus,
  Sparkles,
} from 'lucide-react';

interface MasterDataGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: 'architecture' | 'integration' | 'optimization';
  customers: Customer[];
  pets: Pet[];
  services: ServiceItem[];
  employees: Employee[];
  drugs: Drug[];
  hotelRooms: HotelRoom[];
  groomingPackages: GroomingPackage[];
  clinicVisits: ClinicVisit[];
  invoices: Invoice[];
  vacSchedules: VacSchedule[];
  chartOfAccounts: ChartOfAccount[];
  onSyncCustomerMetrics: () => Promise<number>;
  onBulkAdjustServicePrices: (category: string, percentDelta: number) => Promise<number>;
  onExportUniversalCSV: (entityKey: string) => void;
  onOpenDeduplication: (mode: 'customers' | 'pets') => void;
  onSelectEntity360: (target: { type: 'customer'; customer: Customer } | { type: 'pet'; pet: Pet }) => void;
  onSuccessToast: (msg: string) => void;
}

export const MasterDataGovernanceModal: React.FC<MasterDataGovernanceModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'architecture',
  customers,
  pets,
  services,
  employees,
  drugs,
  hotelRooms,
  groomingPackages,
  clinicVisits,
  invoices,
  vacSchedules,
  chartOfAccounts,
  onSyncCustomerMetrics,
  onBulkAdjustServicePrices,
  onExportUniversalCSV,
  onOpenDeduplication,
  onSelectEntity360,
  onSuccessToast,
}) => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'integration' | 'optimization'>(initialSection);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('All');
  const [priceDeltaPercent, setPriceDeltaPercent] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

  // 1. Architecture & Relational Integrity Metrics
  const architectureAudit = useMemo(() => {
    const customerIds = new Set(customers.map((c) => c.id));
    const orphanPets = pets.filter((p) => !customerIds.has(p.customerId));

    const unsyncedCustomers = customers.filter((c) => {
      const actualPetCount = pets.filter((p) => p.customerId === c.id).length;
      const paidInvoicesTotal = invoices
        .filter((inv) => inv.customerId === c.id && inv.status === 'Lunas')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      return c.petCount !== actualPetCount || (paidInvoicesTotal > 0 && c.totalSpent < paidInvoicesTotal);
    });

    const customersWithoutPets = customers.filter(
      (c) => pets.filter((p) => p.customerId === c.id).length === 0
    );
    const customersWithoutNik = customers.filter((c) => !c.nik || c.nik.trim().length < 8);
    const petsWithoutMicrochip = pets.filter(
      (p) => !p.microchipNo || p.microchipNo.trim() === '' || p.microchipNo === '-'
    );
    const petsWithAllergies = pets.filter(
      (p) => p.allergies && p.allergies.trim() !== '' && p.allergies.toLowerCase() !== 'tidak ada'
    );

    const totalChecks = Math.max(1, customers.length * 2 + pets.length * 2);
    const issuesCount =
      orphanPets.length +
      unsyncedCustomers.length +
      customersWithoutPets.length +
      petsWithoutMicrochip.length;
    const healthScore = Math.max(65, Math.min(100, Math.round(((totalChecks - issuesCount) / totalChecks) * 100)));

    return {
      orphanPets,
      unsyncedCustomers,
      customersWithoutPets,
      customersWithoutNik,
      petsWithoutMicrochip,
      petsWithAllergies,
      healthScore,
    };
  }, [customers, pets, invoices]);

  // 2. Cross-Module Integration Flow Metrics
  const integrationAudit = useMemo(() => {
    const activeDoctors = employees.filter(
      (e) => e.status === 'Aktif' && (e.role.toLowerCase().includes('dokter') || e.department === 'Medis')
    );
    const lowStockDrugs = drugs.filter((d) => d.stock <= d.minStock);
    const expiringDrugs = drugs.filter((d) => {
      if (!d.expiryDate) return false;
      const diffDays = (new Date(d.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
      return diffDays <= 90;
    });
    const activeRooms = hotelRooms.filter((r) => r.isActive);
    const activeServices = services.filter((s) => s.isActive);
    const revenueCoAs = chartOfAccounts.filter((c) => c.type === 'Pendapatan');

    return {
      activeDoctors,
      lowStockDrugs,
      expiringDrugs,
      activeRooms,
      activeServices,
      revenueCoAs,
    };
  }, [employees, drugs, hotelRooms, services, chartOfAccounts]);

  // 3. Preview for Bulk Service Price Optimization
  const affectedServices = useMemo(() => {
    return services.filter(
      (s) => selectedServiceCategory === 'All' || s.category === selectedServiceCategory
    );
  }, [services, selectedServiceCategory]);

  if (!isOpen) return null;

  const handleRunSync = async () => {
    setIsProcessing(true);
    try {
      const count = await onSyncCustomerMetrics();
      onSuccessToast(
        count > 0
          ? `Berhasil menyinkronkan relasi jumlah hewan & LTV pada ${count} profil pelanggan!`
          : 'Seluruh metrik relasi pelanggan & hewan sudah sinkron 100%.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyBulkPrice = async () => {
    if (priceDeltaPercent === 0) return;
    setIsProcessing(true);
    try {
      const updated = await onBulkAdjustServicePrices(selectedServiceCategory, priceDeltaPercent);
      onSuccessToast(
        `Berhasil memperbarui tarif pada ${updated} layanan (${priceDeltaPercent > 0 ? '+' : ''}${priceDeltaPercent}%)!`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#101A2C]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#FFFDF9] border border-[#E1D6BE] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#1B2A45]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dark Navy Header */}
        <div className="bg-gradient-to-r from-[#1B2A45] via-[#16233A] to-[#101A2C] px-5 py-3.5 border-b border-[#B8905A]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B8905A]/20 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#FFFDF9]">
                  Pusat Arsitektur, Integrasi &amp; Optimasi Master Data
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Skor Integritas: {architectureAudit.healthScore}%
                </span>
              </div>
              <p className="text-[11px] text-[#D9B98A]/85">
                Tata kelola relasi 360° Pelanggan–Pasien, konektivitas lintas modul klinik, dan optimasi katalog tarif.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#101A2C]/80 hover:bg-[#101A2C] text-[#D9B98A] hover:text-white border border-[#B8905A]/30 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Pillar Navigation Bar */}
        <div className="bg-[#F6F1E6] px-5 py-2.5 border-b border-[#E1D6BE] flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('architecture')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'architecture'
                ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                : 'bg-white text-[#1B2A45]/75 hover:text-[#1B2A45] border border-[#E1D6BE]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#D9B98A]" />
            1. Arsitektur &amp; Integritas Relasi Data
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('integration')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'integration'
                ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                : 'bg-white text-[#1B2A45]/75 hover:text-[#1B2A45] border border-[#E1D6BE]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-[#D9B98A]" />
            2. Alur Integrasi Lintas Modul
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('optimization')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSection === 'optimization'
                ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                : 'bg-white text-[#1B2A45]/75 hover:text-[#1B2A45] border border-[#E1D6BE]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#D9B98A]" />
            3. Optimasi Katalog &amp; Tata Kelola Massal
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeSection === 'architecture' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-[#E1D6BE] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6B6656]">Relasi Pemilik ↔ Hewan</span>
                    <Users className="w-4 h-4 text-[#B8905A]" />
                  </div>
                  <p className="text-lg font-black text-[#1B2A45] mt-1">
                    {customers.length} Pemilik • {pets.length} Pasien
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    {architectureAudit.orphanPets.length === 0
                      ? '0 entitas yatim (100% valid)'
                      : `${architectureAudit.orphanPets.length} pasien perlu tautan pemilik`}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E1D6BE] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6B6656]">Sinkronisasi Metrik LTV</span>
                    <RefreshCw className="w-4 h-4 text-sky-600" />
                  </div>
                  <p className="text-lg font-black text-[#1B2A45] mt-1">
                    {architectureAudit.unsyncedCustomers.length} Perlu Rekonsiliasi
                  </p>
                  <p className="text-[11px] text-[#6B6656] mt-0.5">
                    Kesesuaian jumlah hewan &amp; histori invoice lunas
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E1D6BE] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6B6656]">Identitas &amp; Microchip</span>
                    <Dog className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-lg font-black text-[#1B2A45] mt-1">
                    {pets.length - architectureAudit.petsWithoutMicrochip.length}/{pets.length} Terpasang
                  </p>
                  <p className="text-[11px] text-[#6B6656] mt-0.5">
                    {architectureAudit.customersWithoutNik.length} pelanggan belum isi NIK KTP
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#E1D6BE] shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#6B6656]">Peringatan Alergi Klinis</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-lg font-black text-rose-700 mt-1">
                    {architectureAudit.petsWithAllergies.length} Pasien Berisiko
                  </p>
                  <p className="text-[11px] text-[#6B6656] mt-0.5">
                    Terkunci otomatis pada resep &amp; SOAP EMR
                  </p>
                </div>
              </div>

              {/* Actionable Architecture Tools */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-[#B8905A]" />
                        Rekonsiliasi Otomatis Relasi Pelanggan &amp; LTV
                      </h4>
                      <p className="text-[11px] text-[#6B6656] mt-0.5">
                        Menghitung ulang `petCount` dari tabel Pasien Hewan aktif dan menyelaraskan `totalSpent` dari Invoice Lunas.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleRunSync}
                      className="px-3 py-1.5 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#D9B98A] ${isProcessing ? 'animate-spin' : ''}`} />
                      Sinkronkan Sekarang
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F6F1E6]/70 border border-[#E1D6BE] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#1B2A45]/80 font-medium">Pembersihan Profil Ganda (Deduplication Engine)</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDeduplication('customers');
                          }}
                          className="px-2.5 py-1 rounded bg-white hover:bg-[#E1D6BE]/50 text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-bold cursor-pointer"
                        >
                          Cek Duplikat Pelanggan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenDeduplication('pets');
                          }}
                          className="px-2.5 py-1 rounded bg-white hover:bg-[#E1D6BE]/50 text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-bold cursor-pointer"
                        >
                          Cek Duplikat Pasien
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick 360 Entity Inspector Launcher */}
                <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" />
                    Inspektor Relasi 360° (Pelanggan ↔ Pasien ↔ Rekam Medis)
                  </h4>
                  <p className="text-[11px] text-[#6B6656]">
                    Pilih pelanggan di bawah untuk membuka tampilan hierarki 360° lengkap dengan daftar hewan, histori kunjungan, vaksinasi, dan invoice:
                  </p>
                  <div className="max-h-36 overflow-y-auto divide-y divide-[#E1D6BE]/50 border border-[#E1D6BE] rounded-lg">
                    {customers.slice(0, 6).map((c) => {
                      const ownedPets = pets.filter((p) => p.customerId === c.id);
                      return (
                        <div
                          key={c.id}
                          className="px-3 py-2 flex items-center justify-between hover:bg-[#F6F1E6]/50 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#1B2A45]">{c.name}</span>
                            <span className="text-[10px] text-[#6B6656] ml-2">
                              ({ownedPets.length} hewan • {c.membershipTier})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectEntity360({ type: 'customer', customer: c });
                            }}
                            className="text-[11px] font-bold text-[#1B2A45] hover:text-[#B8905A] flex items-center gap-1 cursor-pointer"
                          >
                            Buka 360° <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integration' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] text-xs space-y-1">
                <h4 className="font-bold text-[#1B2A45] text-sm">
                  Peta Konektivitas Lintas Modul (Single Source of Truth)
                </h4>
                <p className="text-[#6B6656]">
                  Modul Master Data berperan sebagai hulu data bagi 6 modul hilir: Klinik &amp; EMR, Farmasi &amp; Inventori, Pet Hotel, Grooming, HRM Dokter/Staff, dan Kasir/Akuntansi GL.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* 1. Clinic & EMR */}
                <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      Terhubung Aktif
                    </span>
                    <Stethoscope className="w-4 h-4 text-[#1B2A45]" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1B2A45]">Master Pasien ↔ Poliklinik &amp; SOAP EMR</h5>
                  <p className="text-[11px] text-[#6B6656]">
                    {clinicVisits.length} kunjungan klinik &amp; {vacSchedules.length} jadwal vaksinasi terhubung langsung ke ID Pasien Microchip &amp; peringatan alergi obat.
                  </p>
                  <div className="pt-1 text-[11px] font-semibold text-[#1B2A45] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Tersedia tombol &ldquo;Kirim ke Antrean Poli&rdquo; di kartu Pasien
                  </div>
                </div>

                {/* 2. Pharmacy & Inventory */}
                <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        integrationAudit.lowStockDrugs.length > 0
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {integrationAudit.lowStockDrugs.length > 0
                        ? `${integrationAudit.lowStockDrugs.length} Stok Minimum`
                        : 'Stok Aman'}
                    </span>
                    <Pill className="w-4 h-4 text-[#1B2A45]" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1B2A45]">Master Obat &amp; Vaksin ↔ Resep &amp; Gudang</h5>
                  <p className="text-[11px] text-[#6B6656]">
                    {drugs.length} sediaan farmasi terhubung ke e-Prescription SOAP. {integrationAudit.expiringDrugs.length} item mendekati kedaluwarsa (&le; 90 hari).
                  </p>
                  <div className="pt-1 text-[11px] font-semibold text-[#1B2A45] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Auto-deduct stok saat resep ditebus di Kasir
                  </div>
                </div>

                {/* 3. Billing, Services & CoA */}
                <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      {integrationAudit.activeServices.length} Tarif Aktif
                    </span>
                    <FileSpreadsheet className="w-4 h-4 text-[#1B2A45]" />
                  </div>
                  <h5 className="font-bold text-xs text-[#1B2A45]">Katalog Layanan ↔ Billing &amp; Bagan Akun (CoA)</h5>
                  <p className="text-[11px] text-[#6B6656]">
                    Tarif layanan, kamar hotel ({integrationAudit.activeRooms.length} ruang), dan paket grooming ({groomingPackages.length} paket) otomatis mengisi item Invoice &amp; Jurnal Umum ({integrationAudit.revenueCoAs.length} akun pendapatan).
                  </p>
                  <div className="pt-1 text-[11px] font-semibold text-[#1B2A45] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Kalkulasi otomatis komisi dokter ({integrationAudit.activeDoctors.length} dokter aktif)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'optimization' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bulk Service Tariff Optimizer */}
              <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] flex items-center justify-center text-[#1B2A45]">
                    <Percent className="w-4 h-4 text-[#B8905A]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1B2A45]">
                      Penyesuaian Tarif Layanan Massal (Bulk Price Optimizer)
                    </h4>
                    <p className="text-[11px] text-[#6B6656]">
                      Sesuaikan harga katalog layanan per kategori secara proporsional (dibulatkan ke Rp 1.000 terdekat).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Kategori Layanan</label>
                    <select
                      value={selectedServiceCategory}
                      onChange={(e) => setSelectedServiceCategory(e.target.value)}
                      className="w-full bg-[#F6F1E6]/60 border border-[#E1D6BE] rounded-lg px-2.5 py-2 text-xs font-semibold text-[#1B2A45]"
                    >
                      <option value="All">Semua Kategori ({services.length})</option>
                      <option value="Konsultasi">Konsultasi</option>
                      <option value="Vaksinasi">Vaksinasi</option>
                      <option value="Grooming">Grooming</option>
                      <option value="Pet Hotel">Pet Hotel</option>
                      <option value="Lab & Radiologi">Lab &amp; Radiologi</option>
                      <option value="Bedah & Tindakan">Bedah &amp; Tindakan</option>
                      <option value="Ambulance">Ambulance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-[11px]">Persentase Penyesuaian (%)</label>
                    <div className="flex items-center gap-1.5">
                      {[-5, 5, 10, 15].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPriceDeltaPercent(pct)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                            priceDeltaPercent === pct
                              ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45]'
                              : 'bg-[#F6F1E6]/60 text-[#1B2A45] border-[#E1D6BE] hover:bg-[#E1D6BE]/50'
                          }`}
                        >
                          {pct > 0 ? `+${pct}%` : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F6F1E6]/60 border border-[#E1D6BE] max-h-32 overflow-y-auto space-y-1 text-[11px]">
                  <div className="font-bold text-[#1B2A45] mb-1">
                    Pratinjau Perubahan ({affectedServices.length} layanan terdampak):
                  </div>
                  {affectedServices.slice(0, 5).map((s) => {
                    const nextPrice = Math.max(
                      1000,
                      Math.round((s.price * (1 + priceDeltaPercent / 100)) / 1000) * 1000
                    );
                    return (
                      <div key={s.id} className="flex items-center justify-between text-[#1B2A45]/85">
                        <span className="truncate pr-2">{s.name}</span>
                        <span className="font-mono shrink-0">
                          Rp {s.price.toLocaleString('id-ID')} &rarr;{' '}
                          <strong className="text-emerald-700">Rp {nextPrice.toLocaleString('id-ID')}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={isProcessing || affectedServices.length === 0}
                  onClick={handleApplyBulkPrice}
                  className="w-full py-2 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Terapkan Penyesuaian Tarif ({priceDeltaPercent > 0 ? `+${priceDeltaPercent}%` : `${priceDeltaPercent}%`})
                </button>
              </div>

              {/* Universal CSV Export Hub */}
              <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] flex items-center justify-center text-[#1B2A45]">
                    <Download className="w-4 h-4 text-[#B8905A]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1B2A45]">
                      Ekspor Data Master Terpadu (Universal CSV Export)
                    </h4>
                    <p className="text-[11px] text-[#6B6656]">
                      Unduh dataset seluruh entitas Master Data untuk kebutuhan audit, backup, maupun pelaporan manajemen.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'customers', label: `Data Pelanggan (${customers.length})` },
                    { key: 'pets', label: `Pasien Hewan (${pets.length})` },
                    { key: 'services', label: `Katalog Layanan (${services.length})` },
                    { key: 'staff', label: `Dokter & Staff (${employees.length})` },
                    { key: 'drugs', label: `Obat & Vaksin (${drugs.length})` },
                    { key: 'coa', label: `Bagan Akun GL (${chartOfAccounts.length})` },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onExportUniversalCSV(item.key)}
                      className="px-3 py-2 rounded-lg bg-[#F6F1E6]/70 hover:bg-[#E1D6BE]/60 border border-[#E1D6BE] text-left text-xs font-bold text-[#1B2A45] flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="truncate">{item.label}</span>
                      <Download className="w-3.5 h-3.5 text-[#B8905A] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface MasterEntity360ModalProps {
  target: { type: 'customer'; customer: Customer } | { type: 'pet'; pet: Pet } | null;
  onClose: () => void;
  customers: Customer[];
  pets: Pet[];
  clinicVisits: ClinicVisit[];
  soapNotes: SOAPNote[];
  vacHistories: VacHistory[];
  vacSchedules: VacSchedule[];
  labTests: LabTest[];
  invoices: Invoice[];
  onSwitchTarget: (next: { type: 'customer'; customer: Customer } | { type: 'pet'; pet: Pet }) => void;
  onQuickAddPetForCustomer: (customer: Customer) => void;
  onOpenQuickDispatch: (pet: Pet) => void;
}

export const MasterEntity360Modal: React.FC<MasterEntity360ModalProps> = ({
  target,
  onClose,
  customers,
  pets,
  clinicVisits,
  soapNotes,
  vacHistories,
  vacSchedules,
  labTests,
  invoices,
  onSwitchTarget,
  onQuickAddPetForCustomer,
  onOpenQuickDispatch,
}) => {
  if (!target) return null;

  const isCustomer = target.type === 'customer';
  const customer = isCustomer
    ? target.customer
    : customers.find((c) => c.id === target.pet.customerId) || null;
  const ownedPets = customer ? pets.filter((p) => p.customerId === customer.id) : target.type === 'pet' ? [target.pet] : [];
  const activePet = target.type === 'pet' ? target.pet : ownedPets[0] || null;

  const relatedPetIds = new Set(
    target.type === 'pet' ? [target.pet.id] : ownedPets.map((p) => p.id)
  );

  const entityVisits = clinicVisits.filter(
    (v) => relatedPetIds.has(v.petId) || (customer && v.customerId === customer.id)
  );
  const entitySoaps = soapNotes.filter((s) => relatedPetIds.has(s.petId));
  const entityVaccines = vacHistories.filter((vh) => relatedPetIds.has(vh.petId));
  const entitySchedules = vacSchedules.filter((vs) => relatedPetIds.has(vs.petId));
  const entityLabs = labTests.filter((lt) => relatedPetIds.has(lt.petId));
  const entityInvoices = customer
    ? invoices.filter((inv) => inv.customerId === customer.id)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#101A2C]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#FFFDF9] border border-[#E1D6BE] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#1B2A45]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1B2A45] via-[#16233A] to-[#101A2C] px-5 py-3.5 border-b border-[#B8905A]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B8905A]/20 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A]">
              {isCustomer ? <Users className="w-4 h-4" /> : <Dog className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#FFFDF9]">
                  Profil Relasi 360° — {isCustomer ? customer?.name : target.pet.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B8905A]/25 text-[#D9B98A] border border-[#B8905A]/40">
                  {isCustomer ? `${ownedPets.length} Pasien Terdaftar` : target.pet.species}
                </span>
              </div>
              <p className="text-[11px] text-[#D9B98A]/85">
                Tampilan hierarki terpadu: Pemilik, Pasien Hewan, Rekam Medis SOAP, Vaksinasi, Lab &amp; Riwayat Transaksi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#101A2C]/80 hover:bg-[#101A2C] text-[#D9B98A] hover:text-white border border-[#B8905A]/30 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Owner & Pets Relational Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Owner Card */}
            <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-2.5 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8905A]">
                  Data Pemilik (Owner)
                </span>
                {customer && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F6F1E6] border border-[#E1D6BE] text-[10px] font-bold">
                    {customer.membershipTier}
                  </span>
                )}
              </div>
              {customer ? (
                <>
                  <p className="text-sm font-bold text-[#1B2A45]">{customer.name}</p>
                  <p className="text-[11px] text-[#1B2A45]/75 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> {customer.phone}
                  </p>
                  {customer.address && (
                    <p className="text-[11px] text-[#6B6656]">{customer.address}</p>
                  )}
                  <div className="pt-2 border-t border-[#E1D6BE]/60 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#6B6656] block">Poin Loyalitas</span>
                      <span className="font-bold text-sky-700">{customer.loyaltyPoints} Pts</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6B6656] block">Total LTV</span>
                      <span className="font-bold text-[#1B2A45]">
                        Rp {(customer.totalSpent || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickAddPetForCustomer(customer);
                    }}
                    className="w-full mt-2 py-1.5 px-3 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Hewan untuk {customer.name.split(' ')[0]}
                  </button>
                </>
              ) : (
                <p className="text-[#6B6656] italic">Data pemilik tidak ditemukan.</p>
              )}
            </div>

            {/* Owned Pets List */}
            <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 space-y-2.5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8905A]">
                  Pasien Hewan Terhubung ({ownedPets.length})
                </span>
                {activePet && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQuickDispatch(activePet);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-[#D9B98A]" />
                    Daftarkan {activePet.name} ke Antrean / Layanan
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ownedPets.map((p) => {
                  const isSelected = target.type === 'pet' && target.pet.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSwitchTarget({ type: 'pet', pet: p })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#F6F1E6] border-[#B8905A] ring-1 ring-[#B8905A]'
                          : 'bg-[#FFFDF9] border-[#E1D6BE] hover:bg-[#F6F1E6]/50'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1B2A45] truncate">{p.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-white border border-[#E1D6BE] text-[10px] font-semibold">
                            {p.species}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6656] truncate">
                          {p.breed} • {p.weightKg} kg • {p.microchipNo}
                        </p>
                        {p.allergies && p.allergies !== 'Tidak Ada' && (
                          <p className="text-[10px] text-rose-700 font-bold">
                            Alergi: {p.allergies}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onOpenQuickDispatch(p);
                        }}
                        title="Kirim ke Antrean Poli / Vaksin"
                        className="px-2 py-1 rounded bg-[#1B2A45] text-[#D9B98A] hover:text-white text-[10px] font-bold shrink-0 cursor-pointer"
                      >
                        + Layanan
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinical & Financial KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-[#F6F1E6]/70 border border-[#E1D6BE]">
              <span className="text-[10px] text-[#6B6656] font-bold block">Kunjungan Klinik</span>
              <span className="text-base font-black text-[#1B2A45]">{entityVisits.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F1E6]/70 border border-[#E1D6BE]">
              <span className="text-[10px] text-[#6B6656] font-bold block">Rekam Medis SOAP</span>
              <span className="text-base font-black text-[#1B2A45]">{entitySoaps.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F1E6]/70 border border-[#E1D6BE]">
              <span className="text-[10px] text-[#6B6656] font-bold block">Riwayat &amp; Jadwal Vaksin</span>
              <span className="text-base font-black text-[#1B2A45]">
                {entityVaccines.length + entitySchedules.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F1E6]/70 border border-[#E1D6BE]">
              <span className="text-[10px] text-[#6B6656] font-bold block">Uji Laboratorium</span>
              <span className="text-base font-black text-[#1B2A45]">{entityLabs.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F6F1E6]/70 border border-[#E1D6BE]">
              <span className="text-[10px] text-[#6B6656] font-bold block">Invoice Transaksi</span>
              <span className="text-base font-black text-[#1B2A45]">{entityInvoices.length}</span>
            </div>
          </div>

          {/* Recent Clinical Visits & SOAP Timeline */}
          <div className="bg-white rounded-xl border border-[#E1D6BE] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F6F1E6] border-b border-[#E1D6BE] font-bold text-[#1B2A45] flex items-center justify-between">
              <span>Riwayat Kunjungan &amp; Catatan Klinis Terakhir</span>
              <span className="text-[11px] text-[#6B6656]">{entityVisits.length} entri</span>
            </div>
            <div className="divide-y divide-[#E1D6BE]/50 max-h-48 overflow-y-auto">
              {entityVisits.length === 0 ? (
                <p className="p-4 text-center text-[#6B6656] italic">
                  Belum ada riwayat kunjungan klinik untuk entitas ini.
                </p>
              ) : (
                entityVisits.map((v) => {
                  const soap = entitySoaps.find((s) => s.visitId === v.id || s.petId === v.petId);
                  return (
                    <div key={v.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#B8905A]">{v.visitNo}</span>
                          <span className="font-bold text-[#1B2A45]">{v.petName}</span>
                          <span className="px-2 py-0.2 rounded-full bg-[#F6F1E6] border border-[#E1D6BE] text-[10px] font-bold">
                            {v.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1B2A45]/80 mt-0.5">
                          Keluhan: {v.complaint} • Dokter: {v.doctorName}
                        </p>
                        {soap && (
                          <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                            Assessment SOAP: {soap.assessment} | Plan: {soap.plan}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6B6656] shrink-0">{v.queuedAt}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CrossModuleQuickActionModalProps {
  pet: Pet | null;
  onClose: () => void;
  employees: Employee[];
  services: ServiceItem[];
  drugs: Drug[];
  onDispatchClinicVisit: (payload: {
    pet: Pet;
    serviceCategory: string;
    doctorName: string;
    complaint: string;
    isEmergency: boolean;
  }) => Promise<void>;
  onScheduleVaccine: (payload: {
    pet: Pet;
    vaccineName: string;
    scheduledDate: string;
    doctorName: string;
  }) => Promise<void>;
}

export const CrossModuleQuickActionModal: React.FC<CrossModuleQuickActionModalProps> = ({
  pet,
  onClose,
  employees,
  drugs,
  onDispatchClinicVisit,
  onScheduleVaccine,
}) => {
  const doctors = useMemo(
    () =>
      employees.filter(
        (e) => e.status === 'Aktif' && (e.role.toLowerCase().includes('dokter') || e.department === 'Medis')
      ),
    [employees]
  );
  const vaccines = useMemo(
    () => drugs.filter((d) => d.category === 'Vaksin'),
    [drugs]
  );

  const [mode, setMode] = useState<'clinic' | 'vaccine'>('clinic');
  const [serviceCategory, setServiceCategory] = useState('Konsultasi Umum');
  const [doctorName, setDoctorName] = useState(doctors[0]?.name || 'drh. Andi Pratama');
  const [complaint, setComplaint] = useState('Pemeriksaan kesehatan rutin & observasi klinis');
  const [isEmergency, setIsEmergency] = useState(false);

  const [vaccineName, setVaccineName] = useState(vaccines[0]?.name || 'Vaksin Rabies Nobivac');
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);

  if (!pet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'clinic') {
        await onDispatchClinicVisit({
          pet,
          serviceCategory,
          doctorName,
          complaint,
          isEmergency,
        });
      } else {
        await onScheduleVaccine({
          pet,
          vaccineName,
          scheduledDate,
          doctorName,
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#101A2C]/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#FFFDF9] border border-[#E1D6BE] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#1B2A45]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#1B2A45] to-[#101A2C] px-5 py-3.5 border-b border-[#B8905A]/30 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#FFFDF9]">
              Integrasi Cepat Lintas Modul — {pet.name}
            </h3>
            <p className="text-[11px] text-[#D9B98A]/85">
              Pemilik: {pet.customerName} • Microchip: {pet.microchipNo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#101A2C] text-[#D9B98A] hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE]">
            <button
              type="button"
              onClick={() => setMode('clinic')}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'clinic' ? 'bg-[#1B2A45] text-[#FFFDF9]' : 'text-[#1B2A45]/75'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" /> Antrean Poliklinik
            </button>
            <button
              type="button"
              onClick={() => setMode('vaccine')}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'vaccine' ? 'bg-[#1B2A45] text-[#FFFDF9]' : 'text-[#1B2A45]/75'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" /> Jadwal Vaksinasi
            </button>
          </div>

          {pet.allergies && pet.allergies !== 'Tidak Ada' && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Peringatan Alergi Otomatis: {pet.allergies}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block font-bold mb-1">Dokter Hewan Penanggung Jawab</label>
              <select
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs font-semibold text-[#1B2A45]"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.shift || 'Aktif'})
                  </option>
                ))}
                {doctors.length === 0 && <option value="drh. Andi Pratama">drh. Andi Pratama</option>}
              </select>
            </div>

            {mode === 'clinic' ? (
              <>
                <div>
                  <label className="block font-bold mb-1">Poli / Layanan Tujuan</label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs font-semibold text-[#1B2A45]"
                  >
                    <option value="Konsultasi Umum">Poli Konsultasi Umum</option>
                    <option value="Vaksinasi & Preventif">Poli Vaksinasi &amp; Preventif</option>
                    <option value="Bedah & Tindakan">Poli Bedah &amp; Tindakan</option>
                    <option value="IGD / Darurat">Unit Gawat Darurat (IGD)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Keluhan Utama / Anamnesis Awal *</label>
                  <textarea
                    required
                    rows={2}
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs text-[#1B2A45]"
                  />
                </div>
                <label className="flex items-center gap-2 font-bold text-rose-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                  />
                  Prioritas Gawat Darurat (IGD / Fast-Track)
                </label>
              </>
            ) : (
              <>
                <div>
                  <label className="block font-bold mb-1">Sediaan Vaksin (Master Obat/Vaksin)</label>
                  <select
                    value={vaccineName}
                    onChange={(e) => setVaccineName(e.target.value)}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs font-semibold text-[#1B2A45]"
                  >
                    {vaccines.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} (Stok: {v.stock} {v.unit})
                      </option>
                    ))}
                    <option value="Vaksin Rabies Nobivac">Vaksin Rabies Nobivac</option>
                    <option value="Vaksin Tricat Trio">Vaksin Tricat Trio</option>
                    <option value="Vaksin Eurican 4">Vaksin Eurican 4</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Tanggal Jadwal Vaksinasi *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-xs text-[#1B2A45]"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              {mode === 'clinic'
                ? 'Kirim Langsung ke Antrean Poliklinik'
                : 'Simpan ke Jadwal Vaksinasi Klinik'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
