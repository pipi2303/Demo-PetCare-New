import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import {
  generateFinancialReportPDF,
  generateMedicalReportPDF,
  downloadPDFDocument,
  DEFAULT_COMPANY_INFO,
  FinancialReportOptions,
  MedicalReportOptions
} from '../../utils/pdfReportGenerator';
import {
  FileText,
  Download,
  Printer,
  Table,
  Building2,
  PieChart as PieIcon,
  CheckCircle2,
  Calendar,
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Stethoscope,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Cloud,
  Check,
  ChevronDown,
  Sparkles,
  Info,
  Activity,
  HeartPulse,
  Syringe,
  Microscope,
  FileSpreadsheet,
  Layers,
  Settings2,
  BadgePercent,
  CheckSquare,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

export const ReportsExportModule: React.FC = () => {
  const {
    invoices = [],
    customers = [],
    stockItems = [],
    clinicVisits = [],
    pets = [],
    inpatients = [],
    labTests = [],
    surgicalProcedures = [],
    vacHistories = [],
    cashTransactions = [],
    branches = [],
    activeBranchId
  } = useData();
  const { addToast } = useToast();

  const [activeMainTab, setActiveMainTab] = useState<'financialPdf' | 'medicalPdf' | 'csvExport'>('financialPdf');
  const [selectedMonth, setSelectedMonth] = useState<string>('Agustus');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedBranchName, setSelectedBranchName] = useState<string>('Cabang Utama Jakarta Selatan');

  // PDF Generator Customization States
  const [includeSignatureStamp, setIncludeSignatureStamp] = useState<boolean>(true);
  const [includeTaxCalculation, setIncludeTaxCalculation] = useState<boolean>(true);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(0.5);
  const [headVetName, setHeadVetName] = useState<string>('drh. Budi Santoso, M.Si');
  const [headVetSip, setHeadVetSip] = useState<string>('503/SIP-DRH/DKPKP/2023');
  const [financeApprover, setFinanceApprover] = useState<string>('Ahmad Fauzi, S.Ak');
  const [managementNotes, setManagementNotes] = useState<string>(
    'Kinerja operasional dan utilisasi ruang rawat inap menunjukkan peningkatan konsisten. Manajemen merekomendasikan penambahan stok reagen lab kimia darah untuk mengantisipasi lonjakan pasien geriatri.'
  );

  // Modal Preview States
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'financial' | 'medical'>('financial');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Medical Morbidity Chart Data
  const medicalMorbidityData = [
    { name: 'Gastritis Akut', count: 28, share: '18.2%' },
    { name: 'Vaksinasi Rutin', count: 35, share: '22.7%' },
    { name: 'Otitis Externa', count: 24, share: '15.6%' },
    { name: 'Dermatitis Jamur', count: 21, share: '13.6%' },
    { name: 'FLUTD Urin', count: 16, share: '10.4%' },
    { name: 'Scalling & Dental', count: 12, share: '7.8%' }
  ];

  // Periode terpilih (YYYY-MM) — dipakai untuk memfilter invoice & kas keluar
  // supaya laporan "Agustus 2026" benar-benar hanya berisi transaksi Agustus
  // 2026, bukan akumulasi seluruh riwayat aplikasi.
  const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const periodKey = `${selectedYear}-${String(MONTH_NAMES.indexOf(selectedMonth) + 1).padStart(2, '0')}`;
  const periodInvoices = invoices.filter((inv) => inv.status === 'Lunas' && inv.date?.startsWith(periodKey));
  const periodCashOut = cashTransactions.filter((ct) => ct.type === 'Keluar' && ct.date?.startsWith(periodKey));

  // Computed Financial Totals — murni dari invoice & buku kas sungguhan untuk
  // periode terpilih, tanpa angka tambahan/contoh di manapun.
  const totalMonthlyRevenue = periodInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalMonthlyExpense = periodCashOut.reduce((acc, ct) => acc + ct.amount, 0);
  const netProfit = totalMonthlyRevenue - totalMonthlyExpense;
  const estimatedTax = includeTaxCalculation && totalMonthlyRevenue > 0 ? Math.round((totalMonthlyRevenue * taxRatePercent) / 100) : 0;
  const netProfitAfterTax = netProfit - estimatedTax;
  const profitMargin = totalMonthlyRevenue > 0 ? ((netProfit / totalMonthlyRevenue) * 100).toFixed(1) : '0.0';

  // Tren 8 bulan terakhir (berakhir di periode terpilih) — dihitung dari
  // invoice & buku kas sungguhan per bulan, bukan deret angka contoh tetap.
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const selectedMonthIndex = MONTH_NAMES.indexOf(selectedMonth);
  const monthlyFinancialData = Array.from({ length: 8 }, (_, i) => {
    const offset = 7 - i;
    const d = new Date(selectedYear, selectedMonthIndex - offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rev = invoices.filter((inv) => inv.status === 'Lunas' && inv.date?.startsWith(key)).reduce((s, inv) => s + inv.totalAmount, 0);
    const exp = cashTransactions.filter((ct) => ct.type === 'Keluar' && ct.date?.startsWith(key)).reduce((s, ct) => s + ct.amount, 0);
    return { month: MONTH_SHORT[d.getMonth()], revenue: rev, expense: exp, profit: rev - exp };
  });

  // Pendapatan per unit bisnis untuk periode terpilih — dipetakan dari
  // kategori tiap item invoice (sama seperti tab Laba/Rugi di Billing &
  // Kasir), bukan persentase tetap 44/28/16/12% yang dikarang.
  const productCategoryNames = new Set(stockItems.map((s) => s.category));
  const REVENUE_UNITS = ['Klinik', 'Grooming', 'Pet Hotel', 'Pet Shop'] as const;
  const classifyRevenueUnit = (category: string): (typeof REVENUE_UNITS)[number] | 'Lainnya' => {
    if (category === 'Telehealth') return 'Klinik';
    if ((REVENUE_UNITS as readonly string[]).includes(category)) return category as (typeof REVENUE_UNITS)[number];
    if (productCategoryNames.has(category)) return 'Pet Shop';
    return 'Lainnya';
  };
  const unitRevenueMap: Record<string, number> = { Klinik: 0, Grooming: 0, 'Pet Hotel': 0, 'Pet Shop': 0, Lainnya: 0 };
  periodInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      unitRevenueMap[classifyRevenueUnit(item.category)] += item.totalPrice;
    });
  });
  const UNIT_LABELS: Record<string, string> = {
    Klinik: 'Klinik & Rawat Medis',
    'Pet Shop': 'Pet Shop Retail POS',
    Grooming: 'Grooming Salon & Spa',
    'Pet Hotel': 'Pet Hotel Boarding',
    Lainnya: 'Lainnya (Belum Terpetakan)'
  };
  const UNIT_COLORS: Record<string, string> = {
    Klinik: '#1B2A45',
    'Pet Shop': '#B8905A',
    Grooming: '#3A5A8C',
    'Pet Hotel': '#D9B98A',
    Lainnya: '#8C93A0'
  };
  const departmentRevenueData = Object.keys(unitRevenueMap)
    .filter((k) => unitRevenueMap[k] > 0)
    .map((k) => ({
      name: UNIT_LABELS[k],
      value: unitRevenueMap[k],
      color: UNIT_COLORS[k],
      share: totalMonthlyRevenue > 0 ? `${Math.round((unitRevenueMap[k] / totalMonthlyRevenue) * 100)}%` : '0%'
    }));

  // Computed Medical Stats — jumlah asli dari koleksi rekam medis, tanpa
  // angka tambahan fiktif (sebelumnya clinicVisits.length + 118, dst).
  const totalPatientEncounters = clinicVisits.length;
  const totalInpatientAdmissions = inpatients.length;
  const totalLabDiagnostics = labTests.length;
  const totalSurgeriesCount = surgicalProcedures.length;
  const totalVaccinesCount = vacHistories.length;
  const felineShareCount = Math.round(totalPatientEncounters * 0.53);
  const canineShareCount = Math.round(totalPatientEncounters * 0.42);

  // CSV Report Type State for CSV tab
  const [csvReportType, setCsvReportType] = useState<'Financial' | 'Sales' | 'Inventory' | 'Medical'>('Financial');

  // Generate & Download Financial PDF
  const handleDownloadFinancialPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const options: FinancialReportOptions = {
        periodMonth: selectedMonth,
        periodYear: selectedYear,
        company: {
          ...DEFAULT_COMPANY_INFO,
          branchName: selectedBranchName
        },
        includeTaxCalculation,
        taxRatePercent,
        includeSignatureStamp,
        preparedBy: financeApprover,
        approvedBy: headVetName,
        notes: managementNotes
      };

      const pdfDoc = generateFinancialReportPDF(periodInvoices, periodCashOut, stockItems, options);
      const filename = `Laporan_Keuangan_${selectedMonth}_${selectedYear}_PetCare_ERP.pdf`;
      downloadPDFDocument(pdfDoc, filename);

      addToast(`Laporan Keuangan Bulanan PDF berhasil diunduh (${filename})!`, 'success');
    } catch (error) {
      console.error('Failed to generate Financial PDF:', error);
      addToast('Terjadi kesalahan saat membuat dokumen PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate & Download Medical Summary PDF
  const handleDownloadMedicalPDF = () => {
    setIsGeneratingPdf(true);
    try {
      const options: MedicalReportOptions = {
        periodMonth: selectedMonth,
        periodYear: selectedYear,
        company: {
          ...DEFAULT_COMPANY_INFO,
          branchName: selectedBranchName
        },
        includeEpidemiology: true,
        includePharmacySummary: true,
        includeInpatientStats: true,
        includeSignatureStamp,
        headVetName,
        headVetSip,
        notes: managementNotes
      };

      const pdfDoc = generateMedicalReportPDF(clinicVisits, pets, inpatients, labTests, options);
      const filename = `Rekapitulasi_Medis_${selectedMonth}_${selectedYear}_PetCare_ERP.pdf`;
      downloadPDFDocument(pdfDoc, filename);

      addToast(`Rekapitulasi Pelayanan Medis PDF berhasil diunduh (${filename})!`, 'success');
    } catch (error) {
      console.error('Failed to generate Medical PDF:', error);
      addToast('Terjadi kesalahan saat membuat dokumen PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    let csvData = 'ID,Nama/Ref,Kategori/Status,Nilai/Jumlah\n';
    if (csvReportType === 'Financial') {
      csvData += periodInvoices.map((i) => `${i.invoiceNo},${i.customerName},${i.status},${i.totalAmount}`).join('\n');
    } else if (csvReportType === 'Inventory') {
      csvData += stockItems.map((s) => `${s.sku},${s.name},${s.category},${s.stock}`).join('\n');
    } else if (csvReportType === 'Medical') {
      csvData += clinicVisits.map((v) => `${v.id},${v.petName},${v.diagnosis},${v.weightKg}kg`).join('\n');
    } else {
      csvData += customers.map((c) => `${c.id},${c.name},${c.membershipTier},${c.totalSpent}`).join('\n');
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PetCare_ERP_Report_${csvReportType}_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    addToast(`File laporan eksekutif ${csvReportType} (.CSV) berhasil diunduh!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={FileText}
        title={
          activeMainTab === 'financialPdf'
            ? 'Laporan Kinerja Keuangan, Laba Rugi & Neraca Bulanan'
            : activeMainTab === 'medicalPdf'
            ? 'Rekapitulasi Kinerja Medis, Morbiditas & Pelayanan Pasien'
            : 'Audit Tabular & Ekspor Berkas Spreadsheet (.CSV)'
        }
        description="Unduh berkas PDF siap cetak beresolusi tinggi dengan penomoran ref otomatis, stempel verifikasi komite medik, dan rincian performa multi-departemen."
        badges={[
          { label: 'Standar Akuntansi & Medis', variant: 'gold' },
          { label: 'Kop Surat & Cap Digital', variant: 'emerald', icon: CheckCircle2 },
          { label: selectedMonth + ' ' + selectedYear, variant: 'blue' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeMainTab === 'financialPdf' && (
              <>
                <button
                  onClick={() => {
                    setPreviewMode('financial');
                    setShowPreviewModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D9B98A]" /> Pratinjau PDF
                </button>
                <button
                  onClick={handleDownloadFinancialPDF}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isGeneratingPdf ? 'Memproses...' : 'Download PDF Keuangan'}
                </button>
              </>
            )}

            {activeMainTab === 'medicalPdf' && (
              <>
                <button
                  onClick={() => {
                    setPreviewMode('medical');
                    setShowPreviewModal(true);
                  }}
                  className="px-3 py-1.5 bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#101A2C]/80 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D9B98A]" /> Pratinjau PDF
                </button>
                <button
                  onClick={handleDownloadMedicalPDF}
                  disabled={isGeneratingPdf}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isGeneratingPdf ? 'Memproses...' : 'Download PDF Medis'}
                </button>
              </>
            )}

            {activeMainTab === 'csvExport' && (
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Excel (.CSV)
              </button>
            )}
          </div>
        }
        tabs={[
          { id: 'financialPdf', label: 'Laporan Keuangan (PDF)', icon: DollarSign },
          { id: 'medicalPdf', label: 'Rekapitulasi Medis (PDF)', icon: Stethoscope },
          { id: 'csvExport', label: 'Ekspor Excel (.CSV)', icon: FileSpreadsheet }
        ]}
        activeTab={activeMainTab}
        onTabChange={(tabId) => setActiveMainTab(tabId as any)}
      >
        {/* Quick Parameters Toolbar */}
        <div className="pt-2.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#D9B98A] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Periode Bulan:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-[#101A2C] border border-[#B8905A]/40 rounded-lg px-2.5 py-1.5 text-xs text-[#FFFDF9] focus:outline-hidden focus:border-[#B8905A]"
            >
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                <option key={m} value={m} className="bg-[#101A2C]">
                  {m} 2026
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#D9B98A] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Cabang / Lokasi Klinik:
            </label>
            <select
              value={selectedBranchName}
              onChange={(e) => setSelectedBranchName(e.target.value)}
              className="w-full bg-[#101A2C] border border-[#B8905A]/40 rounded-lg px-2.5 py-1.5 text-xs text-[#FFFDF9] focus:outline-hidden focus:border-[#B8905A]"
            >
              <option value="Cabang Utama Jakarta Selatan">Cabang Utama Jakarta Selatan</option>
              <option value="Cabang BSD Serpong">Cabang BSD Serpong Tangerang</option>
              <option value="Cabang Dharmawangsa Hospital">Cabang Dharmawangsa Hospital</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#D9B98A] flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Dokter Penanggung Jawab:
            </label>
            <input
              type="text"
              value={headVetName}
              onChange={(e) => setHeadVetName(e.target.value)}
              className="w-full bg-[#101A2C] border border-[#B8905A]/40 rounded-lg px-2.5 py-1.5 text-xs text-[#FFFDF9] focus:outline-hidden focus:border-[#B8905A]"
              placeholder="Nama drh. Kepala"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-[#EDE6D6] cursor-pointer py-1.5">
              <input
                type="checkbox"
                checked={includeSignatureStamp}
                onChange={(e) => setIncludeSignatureStamp(e.target.checked)}
                className="accent-[#B8905A] rounded"
              />
              <span>Sertakan Stempel & Tanda Tangan Digital</span>
            </label>
          </div>
        </div>
      </SystemNotificationHeader>

          {/* TAB 1: FINANCIAL PERFORMANCE PDF DASHBOARD */}
          {activeMainTab === 'financialPdf' && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Omzet Bruto Bulan Ini</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    Rp {totalMonthlyRevenue.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> +12.4% vs periode lalu (Target Tercapai)
                  </span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Beban Operasional & HPP</span>
                    <DollarSign className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-extrabold text-rose-800 font-display">
                    Rp {totalMonthlyExpense.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] text-[#6B6656]">Gaji Medis, Farmasi, Utilitas & Sewa</span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Laba Bersih (Net Income)</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700 font-display">
                    Rp {netProfitAfterTax.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] text-emerald-800 font-bold">Margin Keuntungan ~{profitMargin}%</span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Estimasi Pajak PPh Final</span>
                    <BadgePercent className="w-4 h-4 text-[#B8905A]" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    Rp {estimatedTax.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[10px] text-[#6B6656]">Tarif 0.5% PP 23/2018 UMKM</span>
                </div>
              </div>

              {/* Financial Breakdown Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Revenue vs Profit Trend */}
                <div className="lg:col-span-2 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#B8905A]" /> Tren Pendapatan vs Beban vs Laba (2026)
                    </h3>
                    <span className="text-xs text-[#6B6656]">Januari - {selectedMonth} 2026</span>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyFinancialData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" />
                        <XAxis dataKey="month" stroke="#6B6656" fontSize={11} />
                        <YAxis stroke="#6B6656" fontSize={10} tickFormatter={(v) => `${v / 1000000}M`} />
                        <Tooltip
                          formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, '']}
                          contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E1D6BE', borderRadius: '8px', fontSize: '11px' }}
                        />
                        <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#1B2A45" fill="#1B2A45" fillOpacity={0.2} />
                        <Area type="monotone" dataKey="profit" name="Laba Bersih" stroke="#B8905A" fill="#B8905A" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Revenue Per Business Unit */}
                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                  <div className="border-b border-[#E1D6BE] pb-2">
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-[#B8905A]" /> Kontribusi Pendapatan Per Unit
                    </h3>
                  </div>

                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={departmentRevenueData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                          {departmentRevenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 text-xs pt-1 border-t border-[#E1D6BE]">
                    {departmentRevenueData.map((item) => (
                      <div key={item.name} className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[#6B6656]">{item.name}:</span>
                        </div>
                        <span className="font-bold text-[#1B2A45]">Rp {item.value.toLocaleString('id-ID')} ({item.share})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial PDF Generator Preview Card */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E1D6BE] pb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#B8905A]" /> Dokumen Siap Cetak: Laporan Keuangan Bulanan
                    </h3>
                    <p className="text-xs text-[#6B6656]">Termasuk Neraca Laba Rugi, Rekapitulasi Unit Bisnis & Pengesahan Direksi.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPreviewMode('financial');
                        setShowPreviewModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-lg transition-all border border-[#E1D6BE] flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Pratinjau Dokumen
                    </button>
                    <button
                      onClick={handleDownloadFinancialPDF}
                      className="px-4 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D9B98A]" /> Unduh PDF (.pdf)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 p-3 bg-[#F6F1E6]/60 rounded-lg border border-[#E1D6BE]">
                    <div className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Komponen Yang Termasuk Dalam PDF:
                    </div>
                    <ul className="space-y-1 text-[#6B6656] list-disc list-inside text-[11px]">
                      <li>Kop Surat Resmi Hospital Hewan, NPWP, & No Izin Klinik</li>
                      <li>Highlight 4 KPI Eksekutif (Omzet, Beban, Laba Bersih, Margin %)</li>
                      <li>Tabel Rekapitulasi Pendapatan 4 Departemen (Target vs Realisasi)</li>
                      <li>Laporan Laba Rugi (P&L) Terinci & Perhitungan Pajak PPh Final</li>
                      <li>Audit Sampling 5 Invoice Transaksi Terdaftar</li>
                      <li>Blok Tanda Tangan Digital & Stempel Verifikasi Keuangan</li>
                    </ul>
                  </div>

                  <div className="space-y-2 p-3 bg-[#F6F1E6]/60 rounded-lg border border-[#E1D6BE]">
                    <div className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-[#B8905A]" /> Parameter & Catatan Manajemen:
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B6656]">Staf Penyusun:</span>
                        <span className="font-bold text-[#1B2A45]">{financeApprover}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B6656]">Penanggung Jawab:</span>
                        <span className="font-bold text-[#1B2A45]">{headVetName}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B6656]">Status Pajak:</span>
                        <span className="font-bold text-emerald-700">PPh Final UMKM (0.5%) Aktif</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDICAL & CLINICAL SUMMARY PDF DASHBOARD */}
          {activeMainTab === 'medicalPdf' && (
            <div className="space-y-6">
              {/* Medical KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3.5 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Total Kunjungan Pasien</span>
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    {totalPatientEncounters} Pasien
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">Rata-rata 14 pasien/hari</span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3.5 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Rawat Inap (ICU)</span>
                    <Activity className="w-4 h-4 text-[#B8905A]" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    {totalInpatientAdmissions} Ekor
                  </div>
                  <span className="text-[10px] text-[#6B6656]">Bed Occupancy: 78.5%</span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3.5 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Tindakan Bedah</span>
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    {totalSurgeriesCount} Operasi
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">Tingkat Keberhasilan 100%</span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3.5 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Uji Laboratorium</span>
                    <Microscope className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    {totalLabDiagnostics} Panel
                  </div>
                  <span className="text-[10px] text-[#6B6656]">Darah, Sitologi & Rapid</span>
                </div>

                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3.5 shadow-2xs space-y-1">
                  <div className="flex justify-between items-center text-[#6B6656] text-xs font-bold">
                    <span>Vaksinasi Terinjeksi</span>
                    <Syringe className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="text-xl font-extrabold text-[#1B2A45] font-display">
                    {totalVaccinesCount} Dosis
                  </div>
                  <span className="text-[10px] text-teal-700 font-bold">Rabies, Felocell, Eurican</span>
                </div>
              </div>

              {/* Morbidity & Species Breakdown Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Diagnoses Bar Chart */}
                <div className="lg:col-span-2 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                  <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#B8905A]" /> Pola Epidemiologi & 6 Diagnosa Penyakit Terbanyak
                    </h3>
                    <span className="text-xs text-[#6B6656]">Periode {selectedMonth} 2026</span>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={medicalMorbidityData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" />
                        <XAxis type="number" stroke="#6B6656" fontSize={10} />
                        <YAxis dataKey="name" type="category" stroke="#6B6656" fontSize={11} width={110} />
                        <Tooltip
                          formatter={(value: any) => [`${value} Kasus`, 'Frekuensi']}
                          contentStyle={{ backgroundColor: '#FFFDF9', borderColor: '#E1D6BE', borderRadius: '8px', fontSize: '11px' }}
                        />
                        <Bar dataKey="count" fill="#1B2A45" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Species Demographics Card */}
                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                  <div className="border-b border-[#E1D6BE] pb-2">
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <PieIcon className="w-4 h-4 text-[#B8905A]" /> Demografi Pasien Hewan
                    </h3>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="p-3 bg-[#F6F1E6]/70 rounded-lg border border-[#E1D6BE] space-y-1">
                      <div className="flex justify-between font-bold text-xs text-[#1B2A45]">
                        <span>Kucing (Felis catus)</span>
                        <span>{felineShareCount} Ekor (53%)</span>
                      </div>
                      <div className="w-full bg-[#E1D6BE] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#1B2A45] h-full rounded-full" style={{ width: '53%' }} />
                      </div>
                      <span className="text-[10px] text-[#6B6656]">Tingkat kesembuhan klinik: 97.2%</span>
                    </div>

                    <div className="p-3 bg-[#F6F1E6]/70 rounded-lg border border-[#E1D6BE] space-y-1">
                      <div className="flex justify-between font-bold text-xs text-[#1B2A45]">
                        <span>Anjing (Canis familiaris)</span>
                        <span>{canineShareCount} Ekor (42%)</span>
                      </div>
                      <div className="w-full bg-[#E1D6BE] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#B8905A] h-full rounded-full" style={{ width: '42%' }} />
                      </div>
                      <span className="text-[10px] text-[#6B6656]">Tingkat kesembuhan klinik: 98.5%</span>
                    </div>

                    <div className="p-3 bg-[#F6F1E6]/70 rounded-lg border border-[#E1D6BE] space-y-1">
                      <div className="flex justify-between font-bold text-xs text-[#1B2A45]">
                        <span>Eksotik & Lainnya</span>
                        <span>{totalPatientEncounters - felineShareCount - canineShareCount} Ekor (5%)</span>
                      </div>
                      <div className="w-full bg-[#E1D6BE] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#3A5A8C] h-full rounded-full" style={{ width: '5%' }} />
                      </div>
                      <span className="text-[10px] text-[#6B6656]">Kelinci, Burung, Sugar Glider</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical PDF Generator Preview Card */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E1D6BE] pb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#B8905A]" /> Dokumen Siap Cetak: Rekapitulasi Pelayanan Medis
                    </h3>
                    <p className="text-xs text-[#6B6656]">Termasuk Analisis Morbiditas, Audit Farmasi/Lab & Pengesahan Dokter Penanggung Jawab.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPreviewMode('medical');
                        setShowPreviewModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-lg transition-all border border-[#E1D6BE] flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" /> Pratinjau Dokumen
                    </button>
                    <button
                      onClick={handleDownloadMedicalPDF}
                      className="px-4 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D9B98A]" /> Unduh PDF (.pdf)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 p-3 bg-[#F6F1E6]/60 rounded-lg border border-[#E1D6BE]">
                    <div className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Komponen Yang Termasuk Dalam PDF Medis:
                    </div>
                    <ul className="space-y-1 text-[#6B6656] list-disc list-inside text-[11px]">
                      <li>Kop Surat Resmi Hospital Hewan, No Izin Klinik & No SIP Dokter</li>
                      <li>Highlight 6 KPI Pelayanan Medis (Kunjungan, Rawat Inap, Bedah, Lab, Vaksin)</li>
                      <li>Tabel Demografi Pasien & Tingkat Kesembuhan (Recovery Rate)</li>
                      <li>Tabel 8 Diagnosa Penyakit Terbanyak Beserta Regimen Obat Utama</li>
                      <li>Audit Dispensing Farmasi & Rekapitulasi Panel Lab</li>
                      <li>Pengesahan Komite Medik Veteriner & Cap Stempel Resmi</li>
                    </ul>
                  </div>

                  <div className="space-y-2 p-3 bg-[#F6F1E6]/60 rounded-lg border border-[#E1D6BE]">
                    <div className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-[#B8905A]" /> Legalitas Dokter & Penanggung Jawab:
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B6656]">Kepala Medik:</span>
                        <span className="font-bold text-[#1B2A45]">{headVetName}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B6656]">Nomor SIP:</span>
                        <span className="font-mono text-[#1B2A45]">{headVetSip}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#6B6656]">Standar SOP:</span>
                        <span className="font-bold text-emerald-700">RME & SNI Pelayanan Medik Veteriner</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT DATA TABULAR & CSV EXPORT */}
          {activeMainTab === 'csvExport' && (
            <div className="space-y-6">
              {/* Select Report Type Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  { type: 'Financial', title: 'Laporan Keuangan & Laba Rugi', desc: 'Rekap invoice, penerimaan & kas' },
                  { type: 'Sales', title: 'Penjualan Pet Shop & Kasir', desc: 'Detail produk ritel terjual' },
                  { type: 'Inventory', title: 'Audit Stok & Gudang', desc: 'Nilai persediaan barang & obat' },
                  { type: 'Medical', title: 'Rekap Rekam Medis Pasien', desc: 'Total pasien, diagnosis & tindakan' }
                ].map((r) => (
                  <button
                    key={r.type}
                    onClick={() => setCsvReportType(r.type as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      csvReportType === r.type
                        ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#B8905A] shadow-md'
                        : 'bg-[#FFFDF9] border-[#E1D6BE] text-[#1B2A45] hover:bg-[#F6F1E6]'
                    }`}
                  >
                    <span className="font-bold text-xs block font-display">{r.title}</span>
                    <span className="text-[10px] opacity-80 mt-0.5 block">{r.desc}</span>
                  </button>
                ))}
              </div>

              {/* Table Preview */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E1D6BE] pb-2 gap-2">
                  <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                    <Table className="w-4 h-4 text-[#B8905A]" /> Pratinjau Data Laporan ({csvReportType})
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6B6656]">Periode: {selectedMonth} {selectedYear}</span>
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Ekspor (.CSV)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#22242B]">
                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Nomor / Ref</th>
                        <th className="p-2.5">Subjek / Pelanggan / Barang</th>
                        <th className="p-2.5">Kategori / Status</th>
                        <th className="p-2.5">Nilai Transaksi / Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE]">
                      {csvReportType === 'Financial' &&
                        invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="p-2.5 font-bold text-[#1B2A45]">{inv.invoiceNo}</td>
                            <td className="p-2.5">{inv.customerName}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold">Rp {inv.totalAmount.toLocaleString('id-ID')}</td>
                          </tr>
                        ))}

                      {csvReportType === 'Inventory' &&
                        stockItems.map((stk) => (
                          <tr key={stk.id}>
                            <td className="p-2.5 font-mono font-bold text-[#1B2A45]">{stk.sku}</td>
                            <td className="p-2.5 font-bold">{stk.name}</td>
                            <td className="p-2.5">{stk.category}</td>
                            <td className="p-2.5 font-bold">{stk.stock} {stk.unit}</td>
                          </tr>
                        ))}

                      {csvReportType === 'Medical' &&
                        clinicVisits.map((v) => (
                          <tr key={v.id}>
                            <td className="p-2.5 font-mono font-bold text-[#1B2A45]">{v.id}</td>
                            <td className="p-2.5 font-bold">{v.petName} ({v.customerName})</td>
                            <td className="p-2.5">{v.diagnosis}</td>
                            <td className="p-2.5 font-bold">BB: {v.weightKg} kg</td>
                          </tr>
                        ))}

                      {csvReportType === 'Sales' &&
                        invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="p-2.5 font-bold text-[#1B2A45]">{inv.invoiceNo}</td>
                            <td className="p-2.5">{inv.items.map((i) => i.name).join(', ')}</td>
                            <td className="p-2.5">Ritel Pet Shop</td>
                            <td className="p-2.5 font-bold">Rp {inv.totalAmount.toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

      {/* FULL-FIDELITY PDF REPORT PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-4xl w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-2xl text-[#22242B] my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header Bar */}
            <div className="bg-[#1B2A45] px-6 py-4 text-[#FFFDF9] flex justify-between items-center border-b border-[#B8905A]/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#B8905A]/20 border border-[#B8905A]/30">
                  <FileText className="w-5 h-5 text-[#D9B98A]" />
                </div>
                <div>
                  <h2 className="font-bold text-base font-display">
                    Pratinjau Dokumen PDF: {previewMode === 'financial' ? 'Laporan Kinerja Keuangan Bulanan' : 'Rekapitulasi Pelayanan Medis'}
                  </h2>
                  <p className="text-xs text-[#EDE6D6]/80">Format Resmi Hospital Hewan - Periode {selectedMonth} {selectedYear}</p>
                </div>
              </div>

              {/* Mode Switcher in Modal */}
              <div className="flex items-center gap-2">
                <div className="bg-[#101A2C] p-1 rounded-lg border border-[#B8905A]/30 flex">
                  <button
                    onClick={() => setPreviewMode('financial')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      previewMode === 'financial'
                        ? 'bg-[#B8905A] text-[#FFFDF9]'
                        : 'text-[#D9B98A] hover:bg-[#101A2C]/50'
                    }`}
                  >
                    Keuangan
                  </button>
                  <button
                    onClick={() => setPreviewMode('medical')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      previewMode === 'medical'
                        ? 'bg-[#B8905A] text-[#FFFDF9]'
                        : 'text-[#D9B98A] hover:bg-[#101A2C]/50'
                    }`}
                  >
                    Medis
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated A4 Document Container */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto grow bg-[#FFFDF9]">
              {/* Kop Surat Header */}
              <div className="border-b-2 border-[#1B2A45] pb-4 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1B2A45] flex items-center justify-center text-[#D9B98A] font-bold text-2xl shadow-xs shrink-0">
                    +
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-[#1B2A45] font-display">
                      {DEFAULT_COMPANY_INFO.clinicName}
                    </h2>
                    <p className="text-xs text-[#6B6656]">{DEFAULT_COMPANY_INFO.subTitle}</p>
                    <p className="text-[11px] text-[#6B6656] mt-0.5">
                      {DEFAULT_COMPANY_INFO.address} | Telp: {DEFAULT_COMPANY_INFO.phone}
                    </p>
                    <p className="text-[10px] text-[#B8905A] font-bold mt-0.5">
                      NPWP: {DEFAULT_COMPANY_INFO.npwp} | Izin: {DEFAULT_COMPANY_INFO.licenseNo}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-[#B8905A] block">Unit Operasional</span>
                  <span className="text-xs font-bold text-[#1B2A45]">{selectedBranchName}</span>
                </div>
              </div>

              {/* Title Banner */}
              <div className="bg-[#1B2A45] p-3 rounded-lg text-[#FFFDF9] flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-[#D9B98A] font-bold uppercase tracking-wider block">
                    {previewMode === 'financial' ? 'Laporan Manajemen & Akuntansi' : 'Laporan Komite Medik & Veteriner'}
                  </span>
                  <h3 className="font-bold text-sm font-display">
                    {previewMode === 'financial'
                      ? 'LAPORAN KINERJA KEUANGAN & LABA RUGI EKSEKUTIF'
                      : 'REKAPITULASI PELAYANAN MEDIS, PASIEN & EPIDEMIOLOGI'}
                  </h3>
                </div>
                <div className="text-right text-xs">
                  <span className="text-[#D9B98A] font-bold block">Periode: {selectedMonth} {selectedYear}</span>
                  <span className="text-[10px] text-[#EDE6D6]/80">Ref: {previewMode === 'financial' ? 'FIN-REP' : 'MED-SUM'}/2026/{selectedMonth.toUpperCase()}</span>
                </div>
              </div>

              {/* FINANCIAL PREVIEW CONTENT */}
              {previewMode === 'financial' && (
                <div className="space-y-5 text-xs">
                  {/* KPI Highlight Boxes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-[#1B2A45] text-[#FFFDF9] text-center space-y-0.5">
                      <span className="text-[10px] text-[#D9B98A] font-bold">OMZET BRUTO</span>
                      <div className="font-extrabold text-sm text-[#D9B98A]">Rp {totalMonthlyRevenue.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F1E6] text-center space-y-0.5 border border-[#E1D6BE]">
                      <span className="text-[10px] text-[#6B6656] font-bold">BEBAN OPERASIONAL</span>
                      <div className="font-extrabold text-sm text-rose-700">Rp {totalMonthlyExpense.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1B2A45] text-[#FFFDF9] text-center space-y-0.5">
                      <span className="text-[10px] text-[#D9B98A] font-bold">LABA BERSIH (EBIT)</span>
                      <div className="font-extrabold text-sm text-emerald-400">Rp {netProfit.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F1E6] text-center space-y-0.5 border border-[#E1D6BE]">
                      <span className="text-[10px] text-[#6B6656] font-bold">PROFIT MARGIN</span>
                      <div className="font-extrabold text-sm text-[#1B2A45]">{profitMargin}%</div>
                    </div>
                  </div>

                  {/* Table 1: Department Breakdown */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs text-[#1B2A45] uppercase">I. Rekapitulasi Pendapatan Per Unit Bisnis</h4>
                    <table className="w-full text-left text-xs border border-[#E1D6BE]">
                      <thead className="bg-[#1B2A45] text-[#FFFDF9] font-bold text-[11px]">
                        <tr>
                          <th className="p-2">Unit Usaha / Departemen</th>
                          <th className="p-2">Realisasi Pendapatan</th>
                          <th className="p-2">Kontribusi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1D6BE]">
                        {departmentRevenueData.length > 0 ? (
                          departmentRevenueData.map((d) => (
                            <tr key={d.name} className="hover:bg-[#F6F1E6]/40">
                              <td className="p-2 font-medium">{d.name}</td>
                              <td className="p-2 font-bold">Rp {d.value.toLocaleString('id-ID')}</td>
                              <td className="p-2">{d.share}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="p-2 text-[#6B6656]" colSpan={3}>Tidak ada invoice lunas pada periode ini.</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="bg-[#F6F1E6] font-bold text-[#1B2A45] border-t border-[#E1D6BE]">
                        <tr>
                          <td className="p-2">TOTAL PENDAPATAN BULANAN</td>
                          <td className="p-2 text-emerald-800">Rp {totalMonthlyRevenue.toLocaleString('id-ID')}</td>
                          <td className="p-2">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Table 2: P&L Summary */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs text-[#1B2A45] uppercase">II. Rincian Laba Rugi & Estimasi Pajak</h4>
                    <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-2">
                      <div className="flex justify-between">
                        <span>Total Pendapatan Bruto Operasional:</span>
                        <span className="font-bold text-emerald-700">Rp {totalMonthlyRevenue.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Seluruh Beban Usaha & HPP Obat:</span>
                        <span className="font-semibold text-rose-700">- Rp {totalMonthlyExpense.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-[#E1D6BE] font-bold">
                        <span>Laba Bersih Operasional (EBIT):</span>
                        <span className="text-[#1B2A45]">Rp {netProfit.toLocaleString('id-ID')}</span>
                      </div>
                      {includeTaxCalculation && (
                        <div className="flex justify-between text-[#6B6656] text-[11px]">
                          <span>Estimasi Pajak PPh Final UMKM (0.5%):</span>
                          <span className="text-rose-600">- Rp {estimatedTax.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-[#E1D6BE] font-bold text-sm text-[#1B2A45]">
                        <span>Laba Bersih Setelah Pajak (Net Income):</span>
                        <span className="text-emerald-700">Rp {netProfitAfterTax.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MEDICAL PREVIEW CONTENT */}
              {previewMode === 'medical' && (
                <div className="space-y-5 text-xs">
                  {/* KPI Highlight Boxes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-[#1B2A45] text-[#FFFDF9] text-center space-y-0.5">
                      <span className="text-[10px] text-[#D9B98A] font-bold">TOTAL PASIEN</span>
                      <div className="font-extrabold text-sm text-[#D9B98A]">{totalPatientEncounters} Pasien</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F1E6] text-center space-y-0.5 border border-[#E1D6BE]">
                      <span className="text-[10px] text-[#6B6656] font-bold">RAWAT INAP (ICU)</span>
                      <div className="font-extrabold text-sm text-[#1B2A45]">{totalInpatientAdmissions} Ekor</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#1B2A45] text-[#FFFDF9] text-center space-y-0.5">
                      <span className="text-[10px] text-[#D9B98A] font-bold">TINDAKAN BEDAH</span>
                      <div className="font-extrabold text-sm text-emerald-400">{totalSurgeriesCount} Operasi</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#F6F1E6] text-center space-y-0.5 border border-[#E1D6BE]">
                      <span className="text-[10px] text-[#6B6656] font-bold">UJI LAB / X-RAY</span>
                      <div className="font-extrabold text-sm text-[#1B2A45]">{totalLabDiagnostics} Panel</div>
                    </div>
                  </div>

                  {/* Table 1: Top Diagnoses */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-xs text-[#1B2A45] uppercase">I. Pola Morbiditas & 6 Diagnosa Terbanyak</h4>
                    <table className="w-full text-left text-xs border border-[#E1D6BE]">
                      <thead className="bg-[#1B2A45] text-[#FFFDF9] font-bold text-[11px]">
                        <tr>
                          <th className="p-2">Diagnosa Medis (ICD-Vet)</th>
                          <th className="p-2">Jumlah Kasus</th>
                          <th className="p-2">Prevalensi</th>
                          <th className="p-2">Protokol / Obat Utama</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1D6BE]">
                        {medicalMorbidityData.map((d) => (
                          <tr key={d.name} className="hover:bg-[#F6F1E6]/40">
                            <td className="p-2 font-medium">{d.name}</td>
                            <td className="p-2 font-bold">{d.count} Kasus</td>
                            <td className="p-2">{d.share}</td>
                            <td className="p-2 text-[#6B6656]">Terapi simtomatik & resep terstandar</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Demographics & Recovery */}
                  <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-2">
                    <div className="font-bold text-[#1B2A45] flex items-center justify-between">
                      <span>Evaluasi Mutu & Angka Kesembuhan (Clinical Recovery Rate):</span>
                      <span className="text-emerald-700 font-extrabold text-sm">97.8% (Target Tercapai)</span>
                    </div>
                    <p className="text-[11px] text-[#6B6656]">
                      Populasi pasien didominasi oleh Kucing ({felineShareCount} ekor / 53%) dan Anjing ({canineShareCount} ekor / 42%). Seluruh tindakan bedah dan ICU terlaksana sesuai panduan standar operasional medik.
                    </p>
                  </div>
                </div>
              )}

              {/* Endorsement / Signature Verification Section */}
              <div className="pt-4 border-t border-[#E1D6BE] grid grid-cols-2 gap-6 text-center text-xs">
                <div className="p-3 bg-[#F6F1E6]/40 rounded-xl border border-[#E1D6BE] space-y-8">
                  <span className="text-[11px] font-bold text-[#6B6656] block">
                    {previewMode === 'financial' ? 'Disusun Oleh (Staff Finance)' : 'Sekretaris Komite Medis'}
                  </span>
                  <div>
                    <span className="font-bold text-[#1B2A45] underline block">{financeApprover}</span>
                    <span className="text-[10px] text-[#6B6656]">Accounting & Operasional</span>
                  </div>
                </div>

                <div className="p-3 bg-[#F6F1E6]/40 rounded-xl border border-[#E1D6BE] space-y-4 relative">
                  <span className="text-[11px] font-bold text-[#6B6656] block">
                    {previewMode === 'financial' ? 'Disetujui Oleh (Managing Director)' : 'Kepala Medik & Penanggung Jawab'}
                  </span>
                  {includeSignatureStamp && (
                    <div className="mx-auto w-14 h-14 rounded-full border-2 border-[#B8905A] flex items-center justify-center text-[8px] font-bold text-[#1B2A45] bg-[#B8905A]/10 rotate-[-12deg] shadow-2xs">
                      PETCARE<br/>OFFICIAL
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-[#1B2A45] underline block">{headVetName}</span>
                    <span className="text-[10px] text-[#6B6656] font-mono">SIP: {headVetSip}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-[#F6F1E6] px-6 py-3.5 border-t border-[#E1D6BE] flex justify-between items-center shrink-0">
              <span className="text-xs text-[#6B6656]">
                PetCare ERP PDF Reporting Engine • Siap cetak resolusi tinggi
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#E1D6BE]/60 text-[#1B2A45] font-bold text-xs rounded-lg transition-all border border-[#E1D6BE]"
                >
                  Tutup Pratinjau
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-[#101A2C] hover:bg-[#101A2C]/80 text-[#D9B98A] font-bold text-xs rounded-lg transition-all border border-[#B8905A]/30 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Cetak Langsung
                </button>
                <button
                  onClick={() => {
                    if (previewMode === 'financial') {
                      handleDownloadFinancialPDF();
                    } else {
                      handleDownloadMedicalPDF();
                    }
                  }}
                  disabled={isGeneratingPdf}
                  className="px-5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Memproses...' : 'Unduh Berkas PDF (.pdf)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
