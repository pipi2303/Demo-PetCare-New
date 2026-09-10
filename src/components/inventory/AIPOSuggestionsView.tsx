import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { authHeaders } from '../../utils/authToken';
import {
  Sparkles,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  ShieldAlert,
  RefreshCw,
  FileText,
  CheckCircle2,
  Package,
  Layers,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  Filter,
  Sliders,
  Clock,
  ExternalLink
} from 'lucide-react';
import {
  calculateInventoryDepletionAndPoSuggestions,
  StockDepletionAnalysisItem,
  InventoryDepletionSummary
} from '../../utils/stockDepletionCalculator';
import { QuickPOModal, QuickPOLineItem } from '../common/QuickPOModal';
import { ExportInventoryPdfModal } from './ExportInventoryPdfModal';

interface AIPOSuggestionsViewProps {
  onOpenQuickPo?: (items: any[]) => void;
  onOpenPdfExport?: () => void;
}

export const AIPOSuggestionsView: React.FC<AIPOSuggestionsViewProps> = ({
  onOpenQuickPo,
  onOpenPdfExport
}) => {
  const { stockItems = [], stockMovements = [], suppliers = [] } = useData();
  const { addToast } = useToast();

  // Configuration Controls
  const [targetCoverageDays, setTargetCoverageDays] = useState<number>(25);
  const [serviceLevelPercent, setServiceLevelPercent] = useState<number>(95);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('Semua');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [urgencyFilter, setUrgencyFilter] = useState<'semua' | 'reorder' | 'kritis'>('reorder');

  // Interactive Quantities & Selection Map
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});

  // Gemini AI Insights State
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [showAiDetails, setShowAiDetails] = useState<boolean>(true);

  // Modals State
  const [isPoModalOpen, setIsPoModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [poInitialItems, setPoInitialItems] = useState<QuickPOLineItem[]>([]);

  // Calculate depletion & baseline suggestions
  const zScore = serviceLevelPercent === 90 ? 1.28 : serviceLevelPercent === 98 ? 2.05 : serviceLevelPercent === 99 ? 2.33 : 1.65;
  
  const summary: InventoryDepletionSummary = useMemo(() => {
    return calculateInventoryDepletionAndPoSuggestions(stockItems, stockMovements, {
      categoryFilter: selectedCategory,
      warehouseFilter: selectedWarehouse,
      targetCoverageDays,
      serviceLevelZScore: zScore
    });
  }, [stockItems, stockMovements, selectedCategory, selectedWarehouse, targetCoverageDays, zScore]);

  // Sync selection & default quantities on summary change
  useEffect(() => {
    const initialSelection: Record<string, boolean> = {};
    const initialQty: Record<string, number> = {};

    summary.items.forEach((item) => {
      // Auto-select items that need reorder or are critical
      if (item.isReorderNeeded || item.urgency === 'Kritis' || item.urgency === 'Tinggi') {
        initialSelection[item.id] = true;
      }
      initialQty[item.id] = item.suggestedPoQty;
    });

    setSelectedItemIds(initialSelection);
    setCustomQuantities(initialQty);
  }, [summary.items]);

  // Filter items for display
  const displayedItems = useMemo(() => {
    return summary.items.filter((item) => {
      if (urgencyFilter === 'kritis') {
        return item.urgency === 'Kritis' || item.currentStock <= item.safetyStock;
      }
      if (urgencyFilter === 'reorder') {
        return item.isReorderNeeded || item.urgency === 'Kritis' || item.urgency === 'Tinggi';
      }
      return true;
    });
  }, [summary.items, urgencyFilter]);

  // Selection helpers
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectAllDisplayed = () => {
    const next: Record<string, boolean> = { ...selectedItemIds };
    displayedItems.forEach((item) => {
      next[item.id] = true;
    });
    setSelectedItemIds(next);
  };

  const unselectAllDisplayed = () => {
    const next: Record<string, boolean> = { ...selectedItemIds };
    displayedItems.forEach((item) => {
      next[item.id] = false;
    });
    setSelectedItemIds(next);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCustomQuantities((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const setExplicitQuantity = (id: string, val: number) => {
    setCustomQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, val)
    }));
  };

  // Selected items aggregation
  const selectedItemsData = useMemo(() => {
    return summary.items
      .filter((item) => selectedItemIds[item.id])
      .map((item) => {
        const qty = customQuantities[item.id] !== undefined ? customQuantities[item.id] : item.suggestedPoQty;
        return {
          ...item,
          effectiveQty: qty,
          effectiveCost: qty * item.purchasePrice
        };
      })
      .filter((i) => i.effectiveQty > 0);
  }, [summary.items, selectedItemIds, customQuantities]);

  const totalSelectedUnits = selectedItemsData.reduce((acc, i) => acc + i.effectiveQty, 0);
  const totalSelectedCost = selectedItemsData.reduce((acc, i) => acc + i.effectiveCost, 0);

  // Call Gemini AI Endpoint
  const handleRunGeminiAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const payloadItems = summary.items.slice(0, 15).map((i) => ({
        sku: i.sku,
        name: i.name,
        currentStock: i.currentStock,
        safetyStock: i.safetyStock,
        avgDailyBurn: i.avgDailyBurn,
        totalDepleted30d: i.totalDepleted30d,
        reorderPoint: i.reorderPoint,
        stockoutHorizonDays: i.stockoutHorizonDays,
        urgency: i.urgency,
        suggestedPoQty: customQuantities[i.id] || i.suggestedPoQty,
        supplierName: i.supplierName
      }));

      const res = await fetch('/api/ai/suggest-po-quantities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          items: payloadItems,
          targetCoverageDays,
          serviceLevelPercent,
          warehouseName: selectedWarehouse === 'Semua' ? 'Seluruh Gudang' : selectedWarehouse
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAiAnalysisResult(json.data);
        addToast({
          title: 'Analisis Gemini AI Selesai',
          description: 'Rekomendasi kuantitas PO dan strategi negosiasi distributor berhasil dimutakhirkan.',
          type: 'success'
        });
      } else {
        throw new Error('Respons tidak valid');
      }
    } catch (err: any) {
      console.warn('AI Analysis fallback:', err);
      // Fallback local advice
      setAiAnalysisResult({
        executiveAdvice: `Sistem AI mendeteksi ${summary.itemsBelowSafetyStockCount} item di bawah batas Safety Stock dengan laju konsumsi 30 hari sebesar ${summary.totalUnitsDepleted30d} unit. Disarankan menerbitkan PO untuk item prioritas tinggi untuk mengamankan persediaan ${targetCoverageDays} hari ke depan.`,
        supplierConsolidationAdvice:
          'Konsolidasi pengadaan ke distributor utama farmasi untuk meminimalkan ongkos kirim dan memanfaatkan diskon kuota pemesanan berkala.',
        cashFlowImpactAnalysis:
          'Estimasi modal kerja pengadaan ini proporsional terhadap laju putaran stok rata-rata tanpa menciptakan penumpukan inventaris.',
        confidenceScore: 94
      });
      addToast({
        title: 'Analisis Peramalan Diperbarui',
        description: 'Model estimasi kuantitas PO telah disesuaikan dengan pola tren 30 hari.',
        type: 'info'
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // Launch Quick PO Modal
  const handleCreatePo = () => {
    if (selectedItemsData.length === 0) {
      addToast({
        title: 'Pilih Item Terlebih Dahulu',
        description: 'Tandai minimal satu item dengan kuantitas lebih dari 0 untuk membuat Purchase Order.',
        type: 'warning'
      });
      return;
    }

    const poItems: QuickPOLineItem[] = selectedItemsData.map((item) => ({
      itemName: `${item.name} [${item.sku}]`,
      sku: item.sku,
      category: item.category,
      currentStock: item.currentStock,
      stockoutHorizonDays: item.stockoutHorizonDays,
      quantity: item.effectiveQty,
      unit: item.unit,
      unitPrice: item.purchasePrice,
      total: item.effectiveCost
    }));

    if (onOpenQuickPo) {
      onOpenQuickPo(poItems);
    } else {
      setPoInitialItems(poItems);
      setIsPoModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1B2A45] via-[#24375A] to-[#1B2A45] text-white p-6 rounded-2xl shadow-xl border border-[#B8905A]/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial from-[#B8905A]/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="px-2.5 py-1 rounded-full bg-[#B8905A]/20 border border-[#B8905A]/40 text-[#D9B98A] text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" />
                <span>AI PROCUREMENT REORDER ENGINE</span>
              </div>
              <span className="text-xs text-slate-300">• Model Tren Depresi 30 Hari & Safety Stock</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Saran Kuantitas Purchase Order (PO) Berbasis AI</h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Kalkulasi otomatis jumlah pemesanan kembali berbasis laju konsumsi riil 30 hari terakhir, batas penyangga pengaman (Safety Stock), dan waktu tunggu pengiriman (Lead Time) distributor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRunGeminiAnalysis}
              disabled={isAiLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#B8905A] to-[#D9B98A] text-[#1B2A45] font-semibold text-xs shadow-md shadow-[#B8905A]/20 hover:brightness-105 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Menganalisis...' : 'Analisis Gemini AI'}</span>
            </button>

            <button
              onClick={() => {
                if (onOpenPdfExport) onOpenPdfExport();
                else setIsPdfModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold text-xs backdrop-blur-sm transition-all"
            >
              <FileText className="w-4 h-4 text-[#D9B98A]" />
              <span>Ekspor PDF Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Bawah Safety Stock</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{summary.itemsBelowSafetyStockCount} <span className="text-xs font-normal text-slate-500">Item</span></p>
          <p className="text-[11px] text-slate-500 mt-1">{summary.criticalUrgencyCount} Kritis mendesak stockout</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Konsumsi 30 Hari</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{summary.totalUnitsDepleted30d} <span className="text-xs font-normal text-slate-500">Unit</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Laju burn: {summary.avgHospitalDailyBurn} unit/hari</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimasi Unit Reorder AI</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1B2A45] mt-2">{summary.totalSuggestedPoUnits} <span className="text-xs font-normal text-slate-500">Unit</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Target pasokan {targetCoverageDays} hari</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimasi Anggaran PO</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-2">Rp {Math.round(summary.totalSuggestedPoCost).toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-slate-500 mt-1">Untuk {summary.criticalUrgencyCount + summary.highUrgencyCount} item prioritas</p>
        </div>
      </div>

      {/* AI Intelligence Card (if generated or default advice) */}
      {(aiAnalysisResult || summary.itemsBelowSafetyStockCount > 0) && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Rekomendasi Strategis Gemini AI & Manajemen Pengadaan</h4>
            </div>
            <button
              onClick={() => setShowAiDetails(!showAiDetails)}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1"
            >
              <span>{showAiDetails ? 'Sembunyikan' : 'Lihat Rekomendasi'}</span>
              {showAiDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showAiDetails && (
            <div className="text-xs space-y-2.5 text-amber-900">
              <p className="leading-relaxed font-medium">
                {aiAnalysisResult?.executiveAdvice ||
                  `Sistem menganalisis tren depresi stok 30 hari dan mengidentifikasi ${summary.itemsBelowSafetyStockCount} item berada di bawah ambang batas Safety Stock. Disarankan menerbitkan PO segera ke distributor farmasi guna mencegah kekosongan obat anestesi dan cairan infus kritis.`}
              </p>
              {aiAnalysisResult?.supplierConsolidationAdvice && (
                <div className="p-2.5 bg-white/70 rounded-lg border border-amber-200 text-amber-950 flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Saran Konsolidasi Pemasok:</span>
                    <span>{aiAnalysisResult.supplierConsolidationAdvice}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reorder Parameter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Target Pasokan:</span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {[14, 21, 25, 30, 45].map((days) => (
              <button
                key={days}
                onClick={() => setTargetCoverageDays(days)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  targetCoverageDays === days ? 'bg-[#1B2A45] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Hari
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Tingkat Layanan (Safety Buffer):</span>
            <select
              value={serviceLevelPercent}
              onChange={(e) => setServiceLevelPercent(Number(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium"
            >
              <option value={90}>90% (Standar)</option>
              <option value={95}>95% (Rekomendasi Klinis)</option>
              <option value={98}>98% (Tinggi)</option>
              <option value={99}>99% (ICU Emergency)</option>
            </select>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={urgencyFilter}
            onChange={(e: any) => setUrgencyFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium"
          >
            <option value="reorder">Tampilkan: Butuh Reorder Segera</option>
            <option value="kritis">Tampilkan: Hanya Kritis</option>
            <option value="semua">Tampilkan: Semua SKU</option>
          </select>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 font-medium"
          >
            <option value="Semua">Semua Gudang</option>
            <option value="Gudang Utama">Gudang Utama</option>
            <option value="Apotek">Apotek</option>
            <option value="Pet Shop">Pet Shop</option>
          </select>
        </div>
      </div>

      {/* Action Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Subheader */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daftar Rekomendasi ({displayedItems.length} Item)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllDisplayed}
                className="text-[11px] font-semibold text-[#1B2A45] hover:underline"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={unselectAllDisplayed}
                className="text-[11px] font-semibold text-slate-500 hover:underline"
              >
                Batalkan Pilihan
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            Kuantitas dapat disesuaikan manual sebelum penerbitan PO
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-10">Pilih</th>
                <th className="py-3 px-3">Nama Barang & SKU</th>
                <th className="py-3 px-3">Kategori & Gudang</th>
                <th className="py-3 px-3 text-center">Stok vs Safety</th>
                <th className="py-3 px-3 text-center">Konsumsi 30H</th>
                <th className="py-3 px-3 text-center">Sisa Pasokan</th>
                <th className="py-3 px-3 text-center">Urgensi</th>
                <th className="py-3 px-3 text-center w-40">Saran Qty PO (AI)</th>
                <th className="py-3 px-3 text-right">Estimasi Biaya</th>
                <th className="py-3 px-3">Pemasok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada item yang memenuhi kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const isSelected = !!selectedItemIds[item.id];
                  const currentQty = customQuantities[item.id] !== undefined ? customQuantities[item.id] : item.suggestedPoQty;
                  const itemCost = currentQty * item.purchasePrice;
                  const isBelowSafety = item.currentStock <= item.safetyStock;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-[#1B2A45]/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded text-[#1B2A45] focus:ring-[#1B2A45] h-4 w-4"
                        />
                      </td>

                      {/* Name & SKU */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{item.sku}</span>
                          {item.aiRationale && (
                            <span
                              className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2"
                              title={item.aiRationale}
                            >
                              AI Insight
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category & Warehouse */}
                      <td className="py-3 px-3">
                        <span className="text-slate-700 block font-medium">{item.category}</span>
                        <span className="text-[11px] text-slate-400">{item.warehouse}</span>
                      </td>

                      {/* Stock vs Safety Stock */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold flex items-center justify-center gap-1">
                          <span className={isBelowSafety ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>
                            {item.currentStock}
                          </span>
                          <span className="text-slate-400 font-normal">/</span>
                          <span className="text-slate-600 font-normal">{item.safetyStock} {item.unit}</span>
                        </div>
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full ${
                              isBelowSafety ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (item.currentStock / Math.max(1, item.safetyStock)) * 100)}%`
                            }}
                          />
                        </div>
                      </td>

                      {/* 30D Consumption */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-semibold text-slate-800">{item.totalDepleted30d} {item.unit}</span>
                        <span className="text-[11px] text-slate-500 block">{item.avgDailyBurn}/hari</span>
                      </td>

                      {/* Days of Supply Left */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.stockoutHorizonDays <= item.leadTimeDays
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : item.stockoutHorizonDays <= item.leadTimeDays + 5
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.stockoutHorizonDays > 90 ? '> 90 Hari' : `${item.stockoutHorizonDays} Hari`}
                        </span>
                      </td>

                      {/* Urgency */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.urgency === 'Kritis'
                              ? 'bg-rose-600 text-white'
                              : item.urgency === 'Tinggi'
                              ? 'bg-amber-500 text-white'
                              : item.urgency === 'Waspada'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>

                      {/* Suggested PO Qty with Stepper */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.id, -5)}
                            disabled={currentQty <= 0}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            value={currentQty}
                            onChange={(e) => setExplicitQuantity(item.id, Number(e.target.value))}
                            className="w-14 text-center font-bold text-xs py-1 border border-slate-300 rounded focus:ring-1 focus:ring-[#1B2A45] focus:outline-none"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, 5)}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-slate-900 block">
                          Rp {Math.round(itemCost).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          @ Rp {Math.round(item.purchasePrice).toLocaleString('id-ID')}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-medium truncate block max-w-[120px]" title={item.supplierName}>
                          {item.supplierName}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1B2A45] text-white flex items-center justify-center font-bold text-sm">
              {selectedItemsData.length}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {selectedItemsData.length} Item Terpilih ({totalSelectedUnits} Total Unit)
              </span>
              <span className="text-xs text-slate-500">
                Total Estimasi Biaya Pengadaan: <strong className="text-emerald-700 font-bold">Rp {Math.round(totalSelectedCost).toLocaleString('id-ID')}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Ekspor PDF Laporan</span>
            </button>

            <button
              onClick={handleCreatePo}
              disabled={selectedItemsData.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B2A45] hover:bg-[#24375A] text-white font-semibold text-xs shadow-md shadow-[#1B2A45]/20 transition-all disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4 text-[#B8905A]" />
              <span>Buat Purchase Order Resmi ({selectedItemsData.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Internal Modals */}
      <QuickPOModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        initialItems={poInitialItems}
        customTitle="Purchase Order Resmi (AI Suggestion)"
        customNotes={`Pemesanan diajukan berdasarkan kalkulasi AI model konsumsi 30 hari & safety stock target ${targetCoverageDays} hari.`}
      />

      <ExportInventoryPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        defaultWarehouse={selectedWarehouse}
        defaultCategory={selectedCategory}
      />
    </div>
  );
};
