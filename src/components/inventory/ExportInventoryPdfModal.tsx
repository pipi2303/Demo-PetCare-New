import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Download,
  X,
  Building2,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  Printer,
  TrendingDown,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';
import { generateInventoryStockAndDepletionPdf, InventoryPdfReportOptions } from '../../utils/inventoryPdfReportGenerator';
import { calculateInventoryDepletionAndPoSuggestions } from '../../utils/stockDepletionCalculator';

interface ExportInventoryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWarehouse?: string;
  defaultCategory?: string;
}

export const ExportInventoryPdfModal: React.FC<ExportInventoryPdfModalProps> = ({
  isOpen,
  onClose,
  defaultWarehouse = 'Semua',
  defaultCategory = 'Semua'
}) => {
  const { stockItems = [], stockMovements = [] } = useData();
  const { addToast } = useToast();

  const [warehouseFilter, setWarehouseFilter] = useState<string>(defaultWarehouse);
  const [categoryFilter, setCategoryFilter] = useState<string>(defaultCategory);
  const [periodMonth, setPeriodMonth] = useState<string>('September');
  const [periodYear, setPeriodYear] = useState<number>(2026);
  const [includeDepletionAnalysis, setIncludeDepletionAnalysis] = useState<boolean>(true);
  const [includeAiPoSuggestions, setIncludeAiPoSuggestions] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);

  const [preparedByName, setPreparedByName] = useState<string>('Bambang Wijaya, S.Farm., Apt.');
  const [preparedByTitle, setPreparedByTitle] = useState<string>('Kepala Gudang & Farmasi Logistik');
  const [reviewedByName, setReviewedByName] = useState<string>('drh. Hendra Setiawan, M.Sc.');
  const [reviewedByTitle, setReviewedByTitle] = useState<string>('Manajer Operasional & Medis');
  const [approvedByName, setApprovedByName] = useState<string>('drh. Sarah Maharani, Ph.D.');
  const [approvedByTitle, setApprovedByTitle] = useState<string>('Direktur Utama Rumah Sakit Hewan');

  const [managementNotes, setManagementNotes] = useState<string>(
    'Laporan inventaris berkala untuk tinjauan manajemen eksekutif. Pemesanan ulang yang direkomendasikan sistem AI wajib divalidasi ketersediaan anggarannya sebelum penandatanganan PO resmi ke distributor farmasi.'
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  // Compute live preview metrics for the modal header
  const previewSummary = calculateInventoryDepletionAndPoSuggestions(stockItems, stockMovements, {
    warehouseFilter,
    categoryFilter,
    targetCoverageDays: 25,
    serviceLevelZScore: 1.65
  });

  const handleExportPdf = () => {
    setIsGenerating(true);
    try {
      const options: InventoryPdfReportOptions = {
        periodMonth,
        periodYear,
        warehouseFilter,
        categoryFilter,
        includeDepletionAnalysis,
        includeAiPoSuggestions,
        includeSignatures,
        preparedByName,
        preparedByTitle,
        reviewedByName,
        reviewedByTitle,
        approvedByName,
        approvedByTitle,
        managementNotes
      };

      const doc = generateInventoryStockAndDepletionPdf(stockItems, stockMovements, options);
      const filename = `Laporan_Stok_Tren_Depresi_${warehouseFilter.replace(/\s+/g, '_')}_${periodMonth}_${periodYear}.pdf`;
      doc.save(filename);

      addToast({
        title: 'Ekspor PDF Berhasil',
        description: `Laporan resmi manajemen "${filename}" berhasil diunduh.`,
        type: 'success'
      });
      onClose();
    } catch (err: any) {
      console.error('Export PDF error:', err);
      addToast({
        title: 'Gagal Ekspor PDF',
        description: err.message || 'Terjadi kendala saat menyusun dokumen PDF.',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#1B2A45] to-[#24375A] text-white flex items-center justify-between border-b border-[#B8905A]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8905A]/20 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Ekspor PDF Laporan Stok & Tren Depresi</h3>
              <p className="text-xs text-slate-300">Format resmi eksekutif untuk tinjauan direksi & audit manajemen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Live Summary Stats */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Teranalisis</span>
              <span className="text-base font-bold text-[#1B2A45]">{previewSummary.totalSkus} SKU</span>
              <span className="text-[11px] text-slate-400 block truncate">Valuasi: Rp {Math.round(previewSummary.totalInventoryValuation).toLocaleString('id-ID')}</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Bawah Safety Stock</span>
              <span className={`text-base font-bold ${previewSummary.itemsBelowSafetyStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {previewSummary.itemsBelowSafetyStockCount} Item
              </span>
              <span className="text-[11px] text-slate-400 block">{previewSummary.criticalUrgencyCount} Kritis Mendesak</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Konsumsi 30 Hari</span>
              <span className="text-base font-bold text-[#1B2A45]">{previewSummary.totalUnitsDepleted30d} Unit</span>
              <span className="text-[11px] text-slate-400 block">{previewSummary.avgHospitalDailyBurn} unit/hari</span>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Lingkup Gudang / Lokasi</label>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#1B2A45] focus:outline-none"
              >
                <option value="Semua">Seluruh Gudang & Depo (Semua)</option>
                <option value="Gudang Utama">Gudang Utama</option>
                <option value="Apotek">Apotek / Farmasi Medis</option>
                <option value="Grooming Supply">Grooming Supply</option>
                <option value="Pet Shop">Pet Shop Retail</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Kategori Barang</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-[#1B2A45] focus:outline-none"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Obat">Obat & Farmasi</option>
                <option value="Vaksin">Vaksin & Biologik</option>
                <option value="Makanan">Makanan & Nutrisi</option>
                <option value="Vitamin">Vitamin & Suplemen</option>
                <option value="Pasir Kucing">Pasir Kucing</option>
                <option value="Aksesoris">Aksesoris & Peralatan</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Bulan Pelaporan</label>
              <input
                type="text"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B2A45] focus:outline-none"
                placeholder="Contoh: September"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Tahun</label>
              <input
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1B2A45] focus:outline-none"
              />
            </div>
          </div>

          {/* Section Inclusions */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Bagian Dokumen yang Disertakan</span>
            
            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeDepletionAnalysis}
                onChange={(e) => setIncludeDepletionAnalysis(e.target.checked)}
                className="rounded text-[#1B2A45] focus:ring-[#1B2A45] h-4 w-4"
              />
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-800 block">Tabel 2: Analisis Tren Depresi 30 Hari & Kecepatan Burn Rate</span>
                <span className="text-[11px] text-slate-500">Menyertakan stok 30 hari lalu, persentase penurunan, laju burn harian, dan estimasi sisa hari pasokan.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeAiPoSuggestions}
                onChange={(e) => setIncludeAiPoSuggestions(e.target.checked)}
                className="rounded text-[#1B2A45] focus:ring-[#1B2A45] h-4 w-4"
              />
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-800 block">Tabel 3: Rekomendasi Kuantitas PO Berbasis AI & Safety Stock</span>
                <span className="text-[11px] text-slate-500">Menyertakan usulan pemesanan cerdas, estimasi biaya PO, nama pemasok, dan justifikasi klinis.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-[#1B2A45] focus:ring-[#1B2A45] h-4 w-4"
              />
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-800 block">Kolom Tanda Tangan & Stempel Resmi Verifikasi</span>
                <span className="text-[11px] text-slate-500">Tiga tingkatan persetujuan: Logistik, Manajer Medis, dan Direktur Utama.</span>
              </div>
            </label>
          </div>

          {/* Signers Configuration */}
          {includeSignatures && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Otoritas Penandatangan</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Dibuat Oleh (Logistik)</span>
                  <input
                    type="text"
                    value={preparedByName}
                    onChange={(e) => setPreparedByName(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white mb-1"
                  />
                  <input
                    type="text"
                    value={preparedByTitle}
                    onChange={(e) => setPreparedByTitle(e.target.value)}
                    className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Ditinjau Oleh (Manajer)</span>
                  <input
                    type="text"
                    value={reviewedByName}
                    onChange={(e) => setReviewedByName(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white mb-1"
                  />
                  <input
                    type="text"
                    value={reviewedByTitle}
                    onChange={(e) => setReviewedByTitle(e.target.value)}
                    className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Disetujui Oleh (Direktur)</span>
                  <input
                    type="text"
                    value={approvedByName}
                    onChange={(e) => setApprovedByName(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white mb-1"
                  />
                  <input
                    type="text"
                    value={approvedByTitle}
                    onChange={(e) => setApprovedByTitle(e.target.value)}
                    className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 bg-white text-slate-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Management Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Catatan & Instruksi Khusus Manajemen</label>
            <textarea
              rows={2}
              value={managementNotes}
              onChange={(e) => setManagementNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#1B2A45] focus:outline-none text-slate-700"
              placeholder="Masukkan instruksi khusus atau catatan audit eksekutif..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Format PDF A4 Portrait Siap Cetak & Kirim Email</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2A45] hover:bg-[#24375A] text-white font-medium text-xs shadow-md shadow-[#1B2A45]/20 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#B8905A]" />
              <span>{isGenerating ? 'Menyusun Dokumen...' : 'Unduh Laporan PDF Resmi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
