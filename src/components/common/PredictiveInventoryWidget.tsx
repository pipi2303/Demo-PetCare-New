import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  calculateSupplyForecast,
  generateAllCriticalSuppliesForecast,
  createPurchaseOrderFromForecast,
  CRITICAL_MEDICAL_SUPPLIES_CONFIG,
  SupplyForecastMetric,
  SeasonScenario,
} from '../../utils/inventoryForecaster';
import { QuickPOModal } from './QuickPOModal';
import {
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Package,
  Activity,
  Flame,
  ShieldAlert,
  Sliders,
  Check,
  Calendar,
  Layers,
  Info
} from 'lucide-react';

interface PredictiveInventoryWidgetProps {
  setActiveModule?: (module: string) => void;
}

export const PredictiveInventoryWidget: React.FC<PredictiveInventoryWidgetProps> = ({ setActiveModule }) => {
  const { stockItems = [], suppliers = [], addPurchaseOrder } = useData();
  const { addToast } = useToast();
  // Single source of truth for role/permission resolution (see usePermissions.ts) —
  // replaces the ad-hoc `user.role === 'owner_petshop'` check that used to live here
  // (which, unlike every other isPetshop check in the app, didn't treat 'kasir' as petshop too).
  const { role: userRole, isPetshop } = usePermissions();

  const [selectedScenario, setSelectedScenario] = useState<SeasonScenario>('pancaroba_hujan');
  const [filterMode, setFilterMode] = useState<'critical7' | 'all' | 'watch' | 'healthy'>('critical7');
  const [expandedItemSku, setExpandedItemSku] = useState<string | null>(null);
  const [isCreatingPO, setIsCreatingPO] = useState<boolean>(false);

  // Quick PO Pre-fill Modal state
  const [isQuickPOModalOpen, setIsQuickPOModalOpen] = useState<boolean>(false);
  const [quickPOItems, setQuickPOItems] = useState<SupplyForecastMetric[]>([]);
  const [quickPOTitle, setQuickPOTitle] = useState<string>('');
  const [quickPONotes, setQuickPONotes] = useState<string>('');

  // Generate predictive calculation based on current stockItems and consumption rates
  const forecastSummary = useMemo(() => {
    return generateAllCriticalSuppliesForecast(stockItems, selectedScenario, 0, 0.98, userRole);
  }, [stockItems, selectedScenario, userRole]);

  // Supplies running out within 7 days
  const itemsUnder7Days = useMemo(() => {
    return forecastSummary.items.filter((item) => item.stockoutHorizonDays <= 7);
  }, [forecastSummary]);

  // Filtered items based on user selection
  const displayedItems = useMemo(() => {
    switch (filterMode) {
      case 'critical7':
        return itemsUnder7Days;
      case 'watch':
        return forecastSummary.items.filter(
          (i) => i.stockoutHorizonDays > 7 && i.stockoutHorizonDays <= 14
        );
      case 'healthy':
        return forecastSummary.items.filter((i) => i.stockoutHorizonDays > 14);
      case 'all':
      default:
        return forecastSummary.items;
    }
  }, [forecastSummary, filterMode, itemsUnder7Days]);

  // Quick action: Open pre-filled PO Form Modal for a single critical item
  const handleOpenQuickPOForSingleItem = (item: SupplyForecastMetric) => {
    setQuickPOItems([item]);
    setQuickPOTitle(`Quick Purchase Order — ${item.name} (${item.sku})`);
    setQuickPONotes(
      `[PREDICTIVE QUICK PO] Reorder darurat pasokan kritis: ${item.name} diprediksi habis dalam ${item.stockoutHorizonDays} hari (${item.currentStock} ${item.unit} tersisa vs laju konsumsi ${item.adjustedDailyDemand} ${item.unit}/hari). Indikasi Klinis: ${item.clinicalIndication}`
    );
    setIsQuickPOModalOpen(true);
  };

  // Quick action: Open pre-filled PO Form Modal for ALL items under 7 days
  const handleOpenQuickPOForAllCritical = () => {
    if (itemsUnder7Days.length === 0) {
      addToast('Semua pasokan medis saat ini dalam batas aman (> 7 hari).', 'info');
      return;
    }

    setQuickPOItems(itemsUnder7Days);
    setQuickPOTitle(`Quick PO Massal — ${itemsUnder7Days.length} Pasokan Kritis (< 7 Hari)`);
    setQuickPONotes(
      `[PREDICTIVE BATCH QUICK PO] Pemesanan otomatis untuk ${itemsUnder7Days.length} pasokan medis berisiko habis dalam < 7 hari (${itemsUnder7Days.map(i => `${i.name} [${i.stockoutHorizonDays} hari]`).join(', ')}). Prioritas pengiriman ekspres ke apotek rawat inap klinik.`
    );
    setIsQuickPOModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#E1D6BE] shadow-md overflow-hidden transition-all duration-200">
      {/* Header Banner with Warning Icon & Live Telemetry Badge */}
      <div className="bg-gradient-to-r from-[#1B2A45] via-[#223659] to-[#1B2A45] p-4 sm:p-5 text-[#FFFDF9] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#B8905A]/40">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative shrink-0 mt-0.5 sm:mt-0">
            <div className="w-11 h-11 rounded-xl bg-rose-600/90 text-white flex items-center justify-center shadow-lg border border-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            {itemsUnder7Days.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-black text-white items-center justify-center">
                  {itemsUnder7Days.length}
                </span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[#FFFDF9]">
                {isPetshop ? 'Predictive Retail & Supply Warning' : 'Predictive Medical Supply Warning'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Analisis Burn Rate 7-Hari
              </span>
            </div>
            <p className="text-xs text-[#FFFDF9]/80 mt-0.5">
              {isPetshop
                ? 'Deteksi dini risiko kehabisan stok fast-moving toko (pakan, pasir, vitamin) berbasis laju penjualan POS kasir'
                : 'Deteksi dini risiko kehabisan obat & cairan medis darurat berbasis laju konsumsi harian dan tren musiman klinik'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Seasonality Scenario Switcher */}
          <div className="flex items-center gap-1.5 bg-[#101A2C] px-3 py-1.5 rounded-xl border border-[#E1D6BE]/30 text-xs">
            <Sliders className="w-3.5 h-3.5 text-[#E1D6BE]" />
            <span className="text-[11px] text-[#FFFDF9]/70 font-medium hidden sm:inline">Skenario:</span>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as SeasonScenario)}
              className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
            >
              <option value="pancaroba_hujan" className="bg-[#1B2A45] text-white">Pancaroba / Hujan (+45% GI & Kulit)</option>
              <option value="wabah_gi_parvo" className="bg-[#1B2A45] text-white">Wabah Parvo / GI (+120% Cairan & Injeksi)</option>
              <option value="liburan_boarding" className="bg-[#1B2A45] text-white">Liburan / Boarding (+35% Vaksin/Pakan)</option>
              <option value="kemarau_normal" className="bg-[#1B2A45] text-white">Kemarau / Normal Baseline</option>
            </select>
          </div>

          {setActiveModule && (
            <button
              onClick={() => setActiveModule('inventory')}
              className="px-3 py-1.5 bg-[#E1D6BE] text-[#1B2A45] hover:bg-[#B8905A] rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
            >
              <span>Detail Forecast</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Critical Stockout Notification Callout Banner */}
      <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E1D6BE]/70 space-y-3">
        {itemsUnder7Days.length > 0 ? (
          <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-200 text-rose-800 shrink-0 mt-0.5">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-rose-900 tracking-tight">
                    PERINGATAN LOGISTIK KRITIS: {itemsUnder7Days.length} {isPetshop ? 'Produk Toko' : 'Pasokan Medis'} Berisiko Habis &lt; 7 Hari
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black border border-rose-300">
                    Tindakan Segera Diperlukan
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  {isPetshop
                    ? 'Berdasarkan rata-rata laju transaksi kasir POS saat ini, produk berikut '
                    : 'Berdasarkan rata-rata laju konsumsi pasien & rawat inap saat ini, pasokan berikut '}
                  <span className="font-bold underline">
                    {itemsUnder7Days.map((i) => `${i.name} (~${i.stockoutHorizonDays} hari)`).join(', ')}
                  </span>{' '}
                  akan habis sebelum jadwal pengiriman supplier standar tiba jika pemesanan tidak dilakukan hari ini.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleOpenQuickPOForAllCritical}
                className="w-full md:w-auto px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                title="Buka form Purchase Order otomatis terisi untuk semua pasokan kritis"
              >
                <ShoppingCart className="w-4 h-4 text-amber-300" />
                <span>Quick PO ({itemsUnder7Days.length} Item Kritis)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-200 text-emerald-800">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-emerald-900">
                  Semua Pasokan Medis Kritis Berada dalam Batas Aman (&gt; 7 Hari Runway)
                </h4>
                <p className="text-[11px] text-emerald-800">
                  Stok cairan infus, anestesi, dan obat emergensi mencukupi untuk operasional klinik minggu ini.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs & Quick KPI Counter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterMode('critical7')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterMode === 'critical7'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-100/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Habis &lt; 7 Hari ({itemsUnder7Days.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('watch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterMode === 'watch'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Waspada 7–14 Hari ({forecastSummary.watchListCount})</span>
            </button>

            <button
              onClick={() => setFilterMode('healthy')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterMode === 'healthy'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aman &gt; 14 Hari ({forecastSummary.healthyCount})</span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#1B2A45] text-white shadow-xs'
                  : 'bg-white text-[#1B2A45] border border-[#E1D6BE] hover:bg-[#F6F1E6]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua ({forecastSummary.totalCriticalItemsTracked})</span>
            </button>
          </div>

          <div className="text-[11px] text-[#6B6656] font-medium flex items-center gap-1 self-end sm:self-auto">
            <span>Indeks Kesehatan Stok Medis:</span>
            <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
              forecastSummary.overallStockHealthIndex >= 70
                ? 'bg-emerald-100 text-emerald-800'
                : forecastSummary.overallStockHealthIndex >= 40
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {forecastSummary.overallStockHealthIndex}%
            </span>
          </div>
        </div>
      </div>

      {/* Supplies Card Grid */}
      <div className="p-4 sm:p-5 bg-white">
        {displayedItems.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF7F2] rounded-xl border border-dashed border-[#E1D6BE] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-[#1B2A45]">Tidak ada pasokan dalam kategori ini</p>
            <p className="text-xs text-[#6B6656]">Silakan pilih filter lain untuk melihat pasokan medis lainnya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {displayedItems.map((item) => {
              const isCritical7 = item.stockoutHorizonDays <= 7;
              const isUrgent3 = item.stockoutHorizonDays <= 3;
              const isExpanded = expandedItemSku === item.sku;

              // Runway progress (0 to 14 days)
              const runwayPercent = Math.min(100, Math.round((item.stockoutHorizonDays / 14) * 100));

              return (
                <div
                  key={item.sku}
                  className={`rounded-xl border transition-all duration-200 flex flex-col justify-between p-3.5 sm:p-4 shadow-2xs ${
                    isUrgent3
                      ? 'bg-rose-50/70 border-rose-400 hover:border-rose-600'
                      : isCritical7
                      ? 'bg-amber-50/60 border-amber-300 hover:border-amber-500'
                      : 'bg-[#FAF7F2] border-[#E1D6BE] hover:border-[#1B2A45]/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Item Header & Warning Icon */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B8905A] bg-[#E1D6BE]/30 px-2 py-0.5 rounded-md border border-[#E1D6BE]/60 inline-block">
                          {item.category}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-[#1B2A45] leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono text-[#6B6656]">SKU: {item.sku}</span>
                      </div>

                      {/* Warning or Status Badge */}
                      {isCritical7 ? (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 shrink-0 border ${
                            isUrgent3
                              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                              : 'bg-amber-500 text-white border-amber-600'
                          }`}
                          title={`Habis dalam ${item.stockoutHorizonDays} hari`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.stockoutHorizonDays} Hari</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          {item.stockoutHorizonDays} Hari
                        </span>
                      )}
                    </div>

                    {/* Stock vs Consumption Rate Metrics */}
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-[#E1D6BE]/60 text-xs">
                      <div>
                        <span className="text-[10px] text-[#6B6656] block">Sisa Stok Fisik</span>
                        <span className={`font-black text-sm ${isCritical7 ? 'text-rose-700' : 'text-[#1B2A45]'}`}>
                          {item.currentStock} {item.unit}
                        </span>
                        <span className="text-[9px] text-[#6B6656] block">
                          Min Aman: {item.safetyStock} {item.unit}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#6B6656] block">Laju Konsumsi</span>
                        <span className="font-black text-sm text-[#1B2A45] flex items-center gap-1">
                          {item.adjustedDailyDemand} <span className="text-[10px] font-normal">{item.unit}/hari</span>
                        </span>
                        <span className="text-[9px] text-amber-700 font-semibold block">
                          Lead Time: {item.leadTimeDays} hari
                        </span>
                      </div>
                    </div>

                    {/* Visual Runway Depletion Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-[#6B6656]">
                        <span>Runway Ketahanan Stok</span>
                        <span className="font-bold text-[#1B2A45]">
                          {item.stockoutHorizonDays <= 7 ? '⚠️ Zona Kritis' : '✓ Normal'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
                        {/* 7-day warning marker line at 50% (7/14 days) */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                          style={{ left: '50%' }}
                          title="Batas 7 Hari Kritis"
                        />
                        <div
                          className={`h-full rounded-full transition-all ${
                            isUrgent3
                              ? 'bg-rose-600'
                              : isCritical7
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${runwayPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-[#6B6656]">
                        <span>0 Hari</span>
                        <span className="font-bold text-rose-600">Ambang 7 Hari</span>
                        <span>14+ Hari</span>
                      </div>
                    </div>

                    {/* Clinical Indication Details (Collapsible or Preview) */}
                    <div className="text-[11px] text-[#6B6656] bg-[#FAF7F2] p-2 rounded-lg border border-[#E1D6BE]/40 space-y-1">
                      <p className="line-clamp-2 text-[#1B2A45]/90">
                        <span className="font-bold text-[#1B2A45]">Indikasi:</span> {item.clinicalIndication}
                      </p>
                      {isCritical7 && (
                        <p className="text-rose-800 text-[10px] font-semibold flex items-center gap-1">
                          <AlertOctagon className="w-3 h-3 shrink-0" />
                          <span>Dampak: {item.riskOfStockout}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reorder Recommendation & Instant PO Trigger */}
                  <div className="pt-3 mt-3 border-t border-[#E1D6BE]/60 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-[#6B6656]">
                      <span className="block">Saran Order: <strong className="text-[#1B2A45]">{item.suggestedReorderQty} {item.unit}</strong></span>
                      <span className="text-[9px] text-[#6B6656] truncate max-w-[120px] block">
                        Rp {(item.suggestedReorderQty * item.unitPrice).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenQuickPOForSingleItem(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs ${
                        isCritical7
                          ? 'bg-rose-700 hover:bg-rose-800 text-white'
                          : 'bg-[#1B2A45] hover:bg-[#101A2C] text-white'
                      }`}
                      title={`Buka Quick PO pre-filled untuk ${item.name}`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Quick PO</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info & Quick Stats Bar */}
      <div className="bg-[#FAF7F2] px-4 py-3 border-t border-[#E1D6BE] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B6656]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#B8905A] shrink-0" />
          <span>
            Model peramalan memperhitungkan <strong>Safety Stock (Z=2.05 / 98% Service Level)</strong>, lead time supplier, dan riwayat pemakaian SOAP rawat inap.
          </span>
        </div>

        {setActiveModule && (
          <button
            onClick={() => setActiveModule('inventory')}
            className="text-xs font-bold text-[#1B2A45] hover:text-[#B8905A] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Buka Modul Inventory &amp; Logistik Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick PO Pre-filled Form Modal */}
      <QuickPOModal
        isOpen={isQuickPOModalOpen}
        onClose={() => setIsQuickPOModalOpen(false)}
        initialItems={quickPOItems}
        customTitle={quickPOTitle}
        customNotes={quickPONotes}
        setActiveModule={setActiveModule}
      />
    </div>
  );
};
