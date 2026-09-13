import React, { useState, useMemo } from 'react';
import {
  History,
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileSpreadsheet,
  Trash2,
  Lock,
  Eye,
  RefreshCw,
  Sparkles,
  Server,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Sliders,
  Check,
  Building2,
  Activity,
  AlertCircle,
  FileCode,
  ArrowRight,
  FileText,
  Printer,
  Shield,
  FileCheck,
  Settings2,
  Info,
  ChevronRight,
  Stethoscope,
  DollarSign,
  Database
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { AuditLog } from '../../types';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import {
  generateSystemActivityReportPDF,
  exportSystemActivityReportCSV,
  exportSystemActivityReportExcelXML,
  getAuditLogCategory,
  SystemActivityReportOptions
} from '../../utils/systemActivityReportGenerator';

export const AuditLogModule: React.FC = () => {
  const { auditLogs = [], branches = [], activeBranchId, currentUser } = useData();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLog | null>(null);

  // System Activity Report Modal States
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportScope, setReportScope] = useState<'all' | 'clinical' | 'financial' | 'critical' | 'master' | 'security'>('all');
  const [reportDateRange, setReportDateRange] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('2026-08-01');
  const [reportEndDate, setReportEndDate] = useState<string>('2026-08-13');
  const [reportSeverityFilter, setReportSeverityFilter] = useState<'all' | 'critical_warn' | 'critical_only'>('all');
  const [reportBranchFilter, setReportBranchFilter] = useState<string>('all');
  const [includeDiffSnapshot, setIncludeDiffSnapshot] = useState<boolean>(true);
  const [includeDigitalSignatures, setIncludeDigitalSignatures] = useState<boolean>(true);
  const [customReportNotes, setCustomReportNotes] = useState<string>(
    'Laporan telah diperiksa oleh Pengawas Sistem & Auditor Kepatuhan Klinik untuk verifikasi keabsahan data rekam medis elektronik dan billing transaksi.'
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Extended realistic seed logs if context is small
  const allLogs: AuditLog[] = useMemo(() => {
    const defaultMock: AuditLog[] = [
      {
        id: 'log-001',
        timestamp: '2026-08-13 16:45:12',
        userName: 'Drh. Ratna Permata',
        userRole: 'dokter',
        module: 'Pemeriksaan Klinik & EMR',
        action: 'Tambah',
        target: 'SOAP-20260813-0091 (Pasien: Mimi / Kucing)',
        details: 'Menyimpan diagnosa klinis Gastritis Akut dan meresepkan Amoxicillin 250mg 2x1 hari.',
        severity: 'Warning',
        branchName: 'Klinik Pusat Tebet'
      },
      {
        id: 'log-002',
        timestamp: '2026-08-13 16:20:05',
        userName: 'Siska Amanda',
        userRole: 'kasir',
        module: 'Kasir POS & Billing',
        action: 'Bayar',
        target: 'INV-20260813-0042 (Rp 285.000)',
        details: 'Penyelesaian pembayaran invoice via QRIS Mandiri Lunas. Poin reward 28 ditambahkan ke akun Andri Santoso.',
        severity: 'Kritis',
        branchName: 'Klinik Pusat Tebet'
      },
      {
        id: 'log-003',
        timestamp: '2026-08-13 15:55:40',
        userName: 'Apoteker Dimas',
        userRole: 'admin',
        module: 'Apotek & Farmasi',
        action: 'Dispense',
        target: 'DRG-201 (Ketoconazole 200mg)',
        details: 'Pengurangan stok obat otomatis sebanyak 10 tablet untuk resep poli rawat jalan.',
        severity: 'Warning',
        branchName: 'Klinik Pusat Tebet'
      },
      {
        id: 'log-004',
        timestamp: '2026-08-13 15:10:22',
        userName: 'Drh. Hendra Wijaya',
        userRole: 'owner_klinik',
        module: 'Katalog Tarif & Layanan',
        action: 'Edit',
        target: 'Layanan Vaksin Rabies Premium',
        details: 'Mengubah tarif dasar dari Rp 180.000 menjadi Rp 200.000/dosis.',
        severity: 'Kritis',
        previousValue: '{"price": 180000}',
        newValue: '{"price": 200000}',
        branchName: 'Klinik Pusat Tebet'
      },
      {
        id: 'log-005',
        timestamp: '2026-08-13 14:02:18',
        userName: 'Budi Santoso (Groomer)',
        userRole: 'groomer',
        module: 'Grooming Salon',
        action: 'Edit',
        target: 'GRM-SESS-088 (Milo / Golden Retriever)',
        details: 'Memperbarui status tahapan grooming menjadi "Pengeringan & Sisir Bulu".',
        severity: 'Info',
        branchName: 'Cabang BSD Serpong'
      },
      {
        id: 'log-006',
        timestamp: '2026-08-13 11:30:00',
        userName: 'Admin Sistem',
        userRole: 'superadmin',
        module: 'Keamanan & Autentikasi',
        action: 'Login',
        target: 'Sesi Web IP 182.253.12.88',
        details: 'Login berhasil via otentikasi kata sandi dengan hak akses superadmin.',
        severity: 'Info',
        branchName: 'Klinik Pusat Tebet'
      },
      {
        id: 'log-007',
        timestamp: '2026-08-13 09:15:33',
        userName: 'Siska Amanda',
        userRole: 'kasir',
        module: 'Poli & Antrean',
        action: 'Tambah',
        target: 'VIS-20260813-018',
        details: 'Registrasi pendaftaran walk-in antrean Poli Bedah untuk anjing Bruno.',
        severity: 'Info',
        branchName: 'Klinik Pusat Tebet'
      },
      {
        id: 'log-008',
        timestamp: '2026-08-12 19:40:10',
        userName: 'Drh. Ratna Permata',
        userRole: 'dokter',
        module: 'Vaksinasi & Paspor',
        action: 'Cetak',
        target: 'CERT-VAC-88219 (Paspor Kucing Milo)',
        details: 'Mencetak ulang sertifikat vaksinasi resmi format bilingual PDF.',
        severity: 'Info',
        branchName: 'Klinik Pusat Tebet'
      }
    ];

    // Sebelumnya 8 entri contoh ini SELALU digabung permanen ke log asli
    // (bukan cuma fallback saat kosong) — setiap ekspor "System Activity
    // Report" untuk audit kepatuhan selalu tercampur aktivitas staf fiktif
    // dengan yang sungguhan, mengaburkan keabsahannya. Log audit adalah data
    // sensitif kepatuhan — beda dari widget notifikasi, di sini contoh
    // hanya tampil kalau BENAR-BENAR belum ada aktivitas tercatat sama
    // sekali (instalasi baru), dan tidak pernah campur dengan data asli.
    return auditLogs.length > 0 ? auditLogs : defaultMock;
  }, [auditLogs]);

  // Filter logs for System Activity Report generator based on modal options
  const reportFilteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      // 1. Scope filter
      const category = getAuditLogCategory(log);
      if (reportScope === 'clinical' && category !== 'Klinis (EMR & Farmasi)') return false;
      if (reportScope === 'financial' && category !== 'Finansial & Billing') return false;
      if (reportScope === 'critical' && (log.severity !== 'Kritis' && log.action !== 'Hapus' && !log.module.includes('Keamanan'))) return false;
      if (reportScope === 'master' && category !== 'Master & SDM') return false;
      if (reportScope === 'security' && category !== 'Keamanan & Akses') return false;

      // 2. Severity filter
      if (reportSeverityFilter === 'critical_only' && log.severity !== 'Kritis') return false;
      if (reportSeverityFilter === 'critical_warn' && log.severity !== 'Kritis' && log.severity !== 'Warning') return false;

      // 3. Branch filter
      if (reportBranchFilter !== 'all') {
        const branchMatch = (log.branchName || '').toLowerCase().includes(reportBranchFilter.toLowerCase());
        if (!branchMatch) return false;
      }

      // 4. Date Range filter
      if (reportDateRange === 'today') {
        const todayStr = '2026-08-13';
        if (!log.timestamp.startsWith(todayStr)) return false;
      } else if (reportDateRange === '7days') {
        if (log.timestamp < '2026-08-06') return false;
      } else if (reportDateRange === '30days') {
        if (log.timestamp < '2026-07-14') return false;
      } else if (reportDateRange === 'custom') {
        const logDate = log.timestamp.split(' ')[0];
        if (reportStartDate && logDate < reportStartDate) return false;
        if (reportEndDate && logDate > reportEndDate) return false;
      }

      return true;
    });
  }, [allLogs, reportScope, reportSeverityFilter, reportBranchFilter, reportDateRange, reportStartDate, reportEndDate]);

  const reportStats = useMemo(() => {
    const total = reportFilteredLogs.length;
    const clinical = reportFilteredLogs.filter((l) => getAuditLogCategory(l) === 'Klinis (EMR & Farmasi)').length;
    const financial = reportFilteredLogs.filter((l) => getAuditLogCategory(l) === 'Finansial & Billing').length;
    const critical = reportFilteredLogs.filter((l) => (l.severity || 'Info') === 'Kritis' || l.action === 'Hapus' || (l.module || '').includes('Keamanan')).length;
    const warning = reportFilteredLogs.filter((l) => (l.severity || 'Info') === 'Warning' || l.action === 'Edit' || l.action === 'Dispense').length;
    return { total, clinical, financial, critical, warning };
  }, [reportFilteredLogs]);

  const handleExportReportPDF = () => {
    try {
      setIsExporting(true);
      const branchObj = branches.find((b) => b.id === activeBranchId);
      const options: SystemActivityReportOptions = {
        logs: reportFilteredLogs,
        reportTitle:
          reportScope === 'clinical'
            ? 'SYSTEM ACTIVITY REPORT: AUDIT REKAM MEDIS & RESEP KLINIS'
            : reportScope === 'financial'
            ? 'SYSTEM ACTIVITY REPORT: AUDIT TRANSAKSI FINANSIAL & BILLING KASIR'
            : reportScope === 'critical'
            ? 'SYSTEM ACTIVITY REPORT: INVESTIGASI AKSI KRITIS & PERUBAHAN SENSITIF'
            : 'SYSTEM ACTIVITY REPORT: PENGAWASAN AKTIVITAS SISTEM & DATA SENSITIF',
        reportScope: reportScope,
        periodLabel:
          reportDateRange === 'today'
            ? 'Hari Ini (13 Agustus 2026)'
            : reportDateRange === '7days'
            ? '7 Hari Terakhir'
            : reportDateRange === '30days'
            ? '30 Hari Terakhir'
            : reportDateRange === 'custom'
            ? `${reportStartDate} s/d ${reportEndDate}`
            : 'Semua Periode',
        branchName: reportBranchFilter !== 'all' ? reportBranchFilter : (branchObj?.name || 'Semua Unit Operasional'),
        adminName: currentUser?.name || 'Administrator Sistem VetCare',
        adminRole: currentUser?.role?.toUpperCase() || 'SUPERADMIN',
        includeDiffSnapshot,
        includeDigitalSignatures,
        customNotes: customReportNotes
      };

      const doc = generateSystemActivityReportPDF(options);
      const filename = `Laporan_Aktivitas_Sistem_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      addToast('Laporan Aktivitas Sistem format PDF resmi berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Gagal membuat laporan PDF: ' + (err?.message || 'Error tidak diketahui'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReportExcelXML = () => {
    try {
      setIsExporting(true);
      const branchObj = branches.find((b) => b.id === activeBranchId);
      const options: SystemActivityReportOptions = {
        logs: reportFilteredLogs,
        reportScope: reportScope,
        branchName: reportBranchFilter !== 'all' ? reportBranchFilter : (branchObj?.name || 'Semua Cabang'),
        adminName: currentUser?.name || 'Administrator Sistem VetCare',
        includeDiffSnapshot
      };
      exportSystemActivityReportExcelXML(options);
      addToast('Laporan Aktivitas Sistem Excel (.xls) berhasil diekspor dengan format lengkap!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Gagal mengekspor Excel: ' + (err?.message || 'Error'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportReportCSV = () => {
    try {
      setIsExporting(true);
      const branchObj = branches.find((b) => b.id === activeBranchId);
      const options: SystemActivityReportOptions = {
        logs: reportFilteredLogs,
        reportScope: reportScope,
        branchName: reportBranchFilter !== 'all' ? reportBranchFilter : (branchObj?.name || 'Semua Cabang'),
        adminName: currentUser?.name || 'Administrator Sistem VetCare',
        includeDiffSnapshot
      };
      exportSystemActivityReportCSV(options);
      addToast('Laporan Aktivitas Sistem format CSV (Excel Ready) berhasil diunduh!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Gagal mengekspor CSV: ' + (err?.message || 'Error'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter logs for table
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const matchSearch =
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.module.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction = selectedAction === 'all' || log.action === selectedAction;
      const matchModule = selectedModule === 'all' || log.module.toLowerCase().includes(selectedModule.toLowerCase());
      const matchRole = selectedRole === 'all' || log.userRole === selectedRole;
      const matchSeverity = selectedSeverity === 'all' || (log.severity || 'Info') === selectedSeverity;
      const matchBranch = selectedBranch === 'all' || (log.branchName && log.branchName.toLowerCase().includes(selectedBranch.toLowerCase()));

      return matchSearch && matchAction && matchModule && matchRole && matchSeverity && matchBranch;
    });
  }, [allLogs, searchQuery, selectedAction, selectedModule, selectedRole, selectedSeverity, selectedBranch]);

  // Stats calculation
  const totalCount = allLogs.length;
  const criticalCount = allLogs.filter((l) => l.severity === 'Kritis' || l.action === 'Hapus' || l.module.includes('Keamanan')).length;
  const warningCount = allLogs.filter((l) => l.severity === 'Warning' || l.action === 'Edit' || l.action === 'Dispense').length;
  const paymentCount = allLogs.filter((l) => l.action === 'Bayar' || l.module.includes('Billing') || l.module.includes('Keuangan')).length;

  const handleExportCSV = () => {
    const header = 'ID,Timestamp,Pengguna,Peran,Cabang,Tingkat Risiko,Modul,Aksi,Target Data,Rincian,Nilai Sebelum,Nilai Sesudah\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.userName}","${l.userRole}","${l.branchName || 'Klinik Utama'}","${l.severity || 'Info'}","${l.module}","${l.action}","${(l.target || '').replace(/"/g, '""')}","${(l.details || '').replace(/"/g, '""')}","${(l.previousValue || '').replace(/"/g, '""')}","${(l.newValue || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-security-vetcare-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    addToast('File ekspor log audit CSV komprehensif berhasil diunduh!', 'success');
  };

  const getActionBadgeColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'Tambah':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
      case 'Edit':
        return 'bg-amber-500/15 text-amber-800 border-amber-500/30 font-medium';
      case 'Hapus':
        return 'bg-rose-500/15 text-rose-700 border-rose-500/30 font-bold';
      case 'Bayar':
        return 'bg-blue-500/15 text-blue-700 border-blue-500/30 font-semibold';
      case 'Dispense':
        return 'bg-purple-500/15 text-purple-700 border-purple-500/30';
      case 'Login':
      case 'Logout':
        return 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30';
      case 'Cetak':
        return 'bg-teal-500/15 text-teal-700 border-teal-500/30';
      default:
        return 'bg-gray-500/15 text-gray-700 border-gray-500/30';
    }
  };

  const getSeverityBadge = (severity?: 'Info' | 'Warning' | 'Kritis') => {
    switch (severity) {
      case 'Kritis':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 border border-rose-500/40 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Kritis
          </span>
        );
      case 'Warning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-800 border border-amber-500/40 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Warning
          </span>
        );
      case 'Info':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-700 border border-sky-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={History}
        title="Audit Trail & Jejak Aktivitas Sensitif Real-Time"
        description="Pencatatan mutasi data, otentikasi login, transaksi kasir, dispensing obat, dan diff perubahan."
        badges={[
          {
            label: branches.find((b) => b.id === activeBranchId)?.name || 'Semua Cabang',
            variant: 'emerald',
            icon: Building2
          },
          { label: 'Hash Integritas SHA-256', variant: 'purple' }
        ]}
        actions={
          <>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow border border-[#D9B98A]"
            >
              <FileText className="w-3.5 h-3.5 text-[#101A2C]" />
              <span>Laporan Audit</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-[#101A2C]/80 hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-white/30 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
          </>
        }
        stats={[
          { label: 'Total Log', value: totalCount, variant: 'default' },
          { label: 'Sensitif/Kritis', value: criticalCount, variant: 'rose' },
          { label: 'Modifikasi', value: warningCount, variant: 'amber' },
          { label: 'Kasir & Billing', value: paymentCount, variant: 'blue' }
        ]}
      />

      {/* Main Table Card */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
        {/* Filters Bar */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#6B6656]" />
              <input
                type="text"
                placeholder="Cari user pelaksana, target data, modul, atau kata kunci..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45]"
              >
                <option value="all">Semua Tingkat Risiko</option>
                <option value="Kritis">🔴 Risiko Kritis</option>
                <option value="Warning">🟡 Peringatan / Modifikasi</option>
                <option value="Info">🔵 Informasi Standar</option>
              </select>

              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="px-3 py-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45]"
              >
                <option value="all">Semua Jenis Aksi</option>
                <option value="Tambah">Tambah Data (+)</option>
                <option value="Edit">Edit / Modifikasi</option>
                <option value="Hapus">Hapus Data (-)</option>
                <option value="Bayar">Pembayaran Kasir</option>
                <option value="Dispense">Dispense Resep Obat</option>
                <option value="Login">Login / Akses Sesi</option>
                <option value="Logout">Logout Sesi</option>
                <option value="Cetak">Cetak Dokumen</option>
              </select>

              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45]"
              >
                <option value="all">Semua Modul</option>
                <option value="Master Data">Master Data & CRM</option>
                <option value="Klinik">Poli & Rekam Medis (EMR)</option>
                <option value="Farmasi">Farmasi & Resep</option>
                <option value="Kasir">Kasir POS & Billing</option>
                <option value="Keuangan">Buku Kas & Keuangan</option>
                <option value="Inventaris">Inventaris & Gudang</option>
                <option value="Purchasing">Purchasing & Vendor</option>
                <option value="SDM">SDM & Akses Karyawan</option>
                <option value="Keamanan">Keamanan & Autentikasi</option>
              </select>

              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45]"
              >
                <option value="all">Semua Peran</option>
                <option value="dokter">Dokter Hewan</option>
                <option value="kasir">Kasir POS</option>
                <option value="admin">Admin Operasional</option>
                <option value="groomer">Groomer</option>
                <option value="owner_klinik">Owner Klinik</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-xl border border-[#E1D6BE]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px] uppercase border-b border-[#E1D6BE]">
              <tr>
                <th className="p-3">Waktu (WIB)</th>
                <th className="p-3">Pelaksana / User</th>
                <th className="p-3">Cabang Klinik</th>
                <th className="p-3">Modul Aplikasi</th>
                <th className="p-3 text-center">Tingkat Risiko</th>
                <th className="p-3 text-center">Jenis Aksi</th>
                <th className="p-3">Target Data / Dokumen</th>
                <th className="p-3">Rincian Modifikasi</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BE] bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#6B6656]">
                    Tidak ada catatan aktivitas yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F6F1E6]/40 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-[#6B6656] whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-[#1B2A45]">{log.userName}</div>
                      <span className="text-[10px] text-[#8C7A5B] capitalize">{log.userRole.replace('_', ' ')}</span>
                    </td>

                    <td className="p-3 text-[#1B2A45] font-medium whitespace-nowrap text-[11px]">
                      {log.branchName || 'Klinik Utama'}
                    </td>

                    <td className="p-3 text-[#1B2A45] font-medium whitespace-nowrap">
                      {log.module}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3 font-medium text-[#1B2A45] max-w-[180px] truncate" title={log.target}>
                      {log.target}
                    </td>

                    <td className="p-3 text-[#6B6656] max-w-[280px] truncate" title={log.details}>
                      {log.details}
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLogForDetails(log)}
                        className="p-1.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#B8905A]" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal with Diff Comparison */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-xl w-full shadow-2xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#B8905A]" />
                Rincian Lengkap Jejak Audit & Diff Perubahan
              </h3>
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]">
                <div>
                  <span className="text-[10px] text-[#6B6656] block">ID Event Audit:</span>
                  <span className="font-mono font-bold text-[#1B2A45]">{selectedLogForDetails.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6656] block">Waktu Tercatat:</span>
                  <span className="font-mono font-bold text-[#1B2A45]">{selectedLogForDetails.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6656] block">Pengguna Pelaksana:</span>
                  <span className="font-bold text-[#1B2A45]">{selectedLogForDetails.userName} ({selectedLogForDetails.userRole})</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6656] block">Cabang Klinik:</span>
                  <span className="font-bold text-[#1B2A45]">{selectedLogForDetails.branchName || 'Klinik Utama'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6656] block">Modul Sistem:</span>
                  <span className="font-bold text-[#1B2A45]">{selectedLogForDetails.module}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B6656] block">Tingkat Risiko:</span>
                  <div className="mt-0.5">{getSeverityBadge(selectedLogForDetails.severity)}</div>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Target Objek Data:</label>
                <div className="p-2.5 bg-white rounded-lg border border-[#E1D6BE] font-semibold text-[#1B2A45]">
                  {selectedLogForDetails.target}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Deskripsi Aktivitas:</label>
                <div className="p-3 bg-white rounded-lg border border-[#E1D6BE] text-[#1B2A45] leading-relaxed">
                  {selectedLogForDetails.details}
                </div>
              </div>

              {/* Data Diff Before & After if available */}
              {(selectedLogForDetails.previousValue || selectedLogForDetails.newValue) && (
                <div className="space-y-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
                  <div className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-600" />
                    <span>Perbandingan Perubahan Data (Diff Snapshot):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedLogForDetails.previousValue && (
                      <div>
                        <span className="text-[10px] font-bold text-rose-700 block mb-1">Nilai Sebelum (Previous):</span>
                        <pre className="p-2 bg-white rounded-lg border border-rose-200 text-[11px] font-mono text-rose-800 overflow-x-auto whitespace-pre-wrap">
                          {selectedLogForDetails.previousValue}
                        </pre>
                      </div>
                    )}
                    {selectedLogForDetails.newValue && (
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 block mb-1">Nilai Sesudah (New):</span>
                        <pre className="p-2 bg-white rounded-lg border border-emerald-200 text-[11px] font-mono text-emerald-800 overflow-x-auto whitespace-pre-wrap">
                          {selectedLogForDetails.newValue}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Integritas jejak audit ini terlindungi secara kriptografis & terhubung langsung ke Master Log Sistem.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Activity Report Generator Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#B8905A]/40 p-6 max-w-4xl w-full shadow-2xl space-y-5 animate-in fade-in max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E1D6BE] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/20 text-[#B8905A] border border-[#B8905A]/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Administrator Audit Center
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 border border-blue-500/30 text-[10px] font-bold">
                    Format: PDF & Excel (.xls/.csv)
                  </span>
                </div>
                <h3 className="font-bold text-lg text-[#1B2A45] font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#B8905A]" />
                  System Activity Report: Ekspor & Audit Modifikasi Data Sensitif
                </h3>
                <p className="text-xs text-[#6B6656]">
                  Hasilkan dokumen laporan resmi forensik aktivitas pengguna, mencakup riwayat modifikasi rekam medis klinis (EMR/Resep) dan transaksi keuangan/billing kasir dengan rincian diff perubahan nilai.
                </p>
              </div>

              <button
                onClick={() => setShowReportModal(false)}
                className="text-xs font-bold text-gray-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Tutup (Esc)
              </button>
            </div>

            {/* Scope Selector Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#B8905A]" />
                <span>1. Pilih Fokus / Cakupan Laporan:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() => setReportScope('all')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    reportScope === 'all'
                      ? 'bg-[#1B2A45] text-white border-[#1B2A45] shadow-sm'
                      : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-[#F6F1E6]'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Semua Rekam</span>
                  <span className="text-xs font-bold block truncate">Semua Aktivitas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportScope('clinical')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    reportScope === 'clinical'
                      ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                      : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-teal-50/50'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Klinik & Farmasi</span>
                  <span className="text-xs font-bold block truncate">EMR & Resep</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportScope('financial')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    reportScope === 'financial'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                      : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-blue-50/50'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Keuangan & Kasir</span>
                  <span className="text-xs font-bold block truncate">Billing & Tarif</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportScope('critical')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    reportScope === 'critical'
                      ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                      : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-rose-50/50'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Sensitif / Kritis</span>
                  <span className="text-xs font-bold block truncate">Investigasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportScope('master')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    reportScope === 'master'
                      ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                      : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-amber-50/50'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Master & SDM</span>
                  <span className="text-xs font-bold block truncate">Gudang & Gaji</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportScope('security')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    reportScope === 'security'
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                      : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-indigo-50/50'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Akses & Otentikasi</span>
                  <span className="text-xs font-bold block truncate">Login & Sesi</span>
                </button>
              </div>
            </div>

            {/* Filter Parameters Grid */}
            <div className="p-4 bg-[#F6F1E6]/80 rounded-xl border border-[#E1D6BE] space-y-3 text-xs">
              <span className="font-bold text-[#1B2A45] block">2. Parameter Filter & Konfigurasi Dokumen:</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Date range */}
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block mb-1">Periode Waktu:</label>
                  <select
                    value={reportDateRange}
                    onChange={(e) => setReportDateRange(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-white rounded-lg border border-[#E1D6BE] text-xs font-medium text-[#1B2A45]"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="today">Hari Ini (13 Ags 2026)</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="30days">30 Hari Terakhir</option>
                    <option value="custom">Rentang Kustom...</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block mb-1">Unit Cabang Klinik:</label>
                  <select
                    value={reportBranchFilter}
                    onChange={(e) => setReportBranchFilter(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white rounded-lg border border-[#E1D6BE] text-xs font-medium text-[#1B2A45]"
                  >
                    <option value="all">Semua Cabang Klinik</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block mb-1">Tingkat Risiko:</label>
                  <select
                    value={reportSeverityFilter}
                    onChange={(e) => setReportSeverityFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-white rounded-lg border border-[#E1D6BE] text-xs font-medium text-[#1B2A45]"
                  >
                    <option value="all">Semua Tingkat Risiko</option>
                    <option value="critical_warn">Hanya Kritis & Warning</option>
                    <option value="critical_only">Khusus Risiko Kritis</option>
                  </select>
                </div>

                {/* Diff & Signature Checkbox */}
                <div className="flex flex-col justify-center space-y-1.5 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-[#1B2A45]">
                    <input
                      type="checkbox"
                      checked={includeDiffSnapshot}
                      onChange={(e) => setIncludeDiffSnapshot(e.target.checked)}
                      className="rounded text-[#B8905A] focus:ring-[#B8905A]"
                    />
                    <span>Sertakan Snapshot Diff Data</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-[#1B2A45]">
                    <input
                      type="checkbox"
                      checked={includeDigitalSignatures}
                      onChange={(e) => setIncludeDigitalSignatures(e.target.checked)}
                      className="rounded text-[#B8905A] focus:ring-[#B8905A]"
                    />
                    <span>Sertakan Kolom TTD Auditor</span>
                  </label>
                </div>
              </div>

              {/* Custom Date Pickers if custom */}
              {reportDateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E1D6BE]">
                  <div>
                    <label className="text-[10px] font-semibold text-[#6B6656] block mb-1">Tanggal Mulai:</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E1D6BE] text-xs text-[#1B2A45]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6B6656] block mb-1">Tanggal Selesai:</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-[#E1D6BE] text-xs text-[#1B2A45]"
                    />
                  </div>
                </div>
              )}

              {/* Notes Input */}
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-[#6B6656] block mb-1">Catatan Kepatuhan / Evaluasi Auditor:</label>
                <input
                  type="text"
                  value={customReportNotes}
                  onChange={(e) => setCustomReportNotes(e.target.value)}
                  placeholder="Masukkan catatan resmi pengawas untuk dilampirkan pada dokumen..."
                  className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E1D6BE] text-xs text-[#1B2A45]"
                />
              </div>
            </div>

            {/* Live Metrics Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-[#E1D6BE] text-center">
                <span className="text-[10px] text-[#6B6656] uppercase font-bold block">Log Terpilih</span>
                <span className="text-base font-black text-[#1B2A45] font-mono">{reportStats.total} Baris</span>
              </div>
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-center">
                <span className="text-[10px] text-teal-700 uppercase font-bold block">Modifikasi Klinis</span>
                <span className="text-base font-black text-teal-800 font-mono">{reportStats.clinical} Kasus</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                <span className="text-[10px] text-blue-700 uppercase font-bold block">Modifikasi Finansial</span>
                <span className="text-base font-black text-blue-800 font-mono">{reportStats.financial} Transaksi</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <span className="text-[10px] text-rose-700 uppercase font-bold block">Aksi Kritis / Warn</span>
                <span className="text-base font-black text-rose-800 font-mono">{reportStats.critical + reportStats.warning} Event</span>
              </div>
            </div>

            {/* Preview Table of Filtered Logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#B8905A]" />
                  Pratinjau Data Laporan ({reportFilteredLogs.length} entri akan diekspor):
                </span>
                <span className="text-[11px] text-[#6B6656]">
                  Menampilkan sampel ringkas data terfilter
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-[#E1D6BE] bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[9px] uppercase sticky top-0 border-b border-[#E1D6BE]">
                    <tr>
                      <th className="p-2">Waktu</th>
                      <th className="p-2">Pelaksana</th>
                      <th className="p-2">Kategori Record</th>
                      <th className="p-2">Aksi</th>
                      <th className="p-2">Target Data</th>
                      <th className="p-2">Diff / Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1D6BE]">
                    {reportFilteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-[#6B6656]">
                          Tidak ada data yang sesuai dengan filter laporan yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      reportFilteredLogs.slice(0, 10).map((l) => (
                        <tr key={l.id} className="hover:bg-[#F6F1E6]/50">
                          <td className="p-2 font-mono text-[10px] text-[#6B6656] whitespace-nowrap">{l.timestamp}</td>
                          <td className="p-2 font-medium text-[#1B2A45] whitespace-nowrap">{l.userName} ({l.userRole})</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE]">
                              {getAuditLogCategory(l)}
                            </span>
                          </td>
                          <td className="p-2 whitespace-nowrap font-bold text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded border ${getActionBadgeColor(l.action)}`}>
                              {l.action}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-[#1B2A45] max-w-[150px] truncate" title={l.target}>{l.target}</td>
                          <td className="p-2 text-[#6B6656] max-w-[200px] truncate" title={l.details}>
                            {l.previousValue || l.newValue ? `[Diff] ${l.details}` : l.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export Actions Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#E1D6BE]">
              <div className="text-[11px] text-[#6B6656] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#B8905A] shrink-0" />
                <span>Dokumen PDF akan otomatis diformat dalam layout Landscape resolusi tinggi lengkap dengan Kop Surat & TTD.</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportReportExcelXML}
                  disabled={reportFilteredLogs.length === 0 || isExporting}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Excel (.xls)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportReportCSV}
                  disabled={reportFilteredLogs.length === 0 || isExporting}
                  className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportReportPDF}
                  disabled={reportFilteredLogs.length === 0 || isExporting}
                  className="px-4 py-2 rounded-xl bg-[#B8905A] hover:bg-[#c79e65] disabled:opacity-50 text-[#101A2C] font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all border border-[#D9B98A]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Unduh PDF Resmi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

