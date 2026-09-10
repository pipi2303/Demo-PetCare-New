import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { authHeaders } from '../../utils/authToken';
import {
  calculateSupplyForecast,
  generateAllCriticalSuppliesForecast,
  createPurchaseOrderFromForecast,
  CRITICAL_MEDICAL_SUPPLIES_CONFIG,
  SupplyForecastMetric,
  SeasonScenario,
  ClinicalCategory,
  GeminiForecastingInsights,
} from '../../utils/inventoryForecaster';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  RefreshCw,
  Sliders,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Info,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Bot,
  Activity,
  Flame,
  Zap,
  Filter,
  Check,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

export const AIForecastingView: React.FC = () => {
  const {
    stockItems = [],
    suppliers = [],
    purchaseOrders = [],
    addPurchaseOrder,
    updateStockItem,
    inpatients = [],
    doctorBookings = []
  } = useData();

  const { addToast } = useToast();

  // Model Controls State
  const [seasonScenario, setSeasonScenario] = useState<SeasonScenario>('pancaroba_hujan');
  const [leadTimeBufferDays, setLeadTimeBufferDays] = useState<number>(1);
  const [serviceLevelTarget, setServiceLevelTarget] = useState<number>(0.98); // 98%
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');
  const [selectedItemSku, setSelectedItemSku] = useState<string>('MED-RL-500'); // Default selected for chart
  const [selectedItemCheckboxes, setSelectedItemCheckboxes] = useState<Record<string, boolean>>({});

  // Gemini Deep Dive AI Insights State
  const [isLoadingGemini, setIsLoadingGemini] = useState<boolean>(false);
  const [geminiInsights, setGeminiInsights] = useState<GeminiForecastingInsights | null>(null);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showPoConfirmModal, setShowPoConfirmModal] = useState<boolean>(false);
  const [poPreviewData, setPoPreviewData] = useState<any>(null);

  // Compute Forecast Summary
  const forecastSummary = generateAllCriticalSuppliesForecast(
    stockItems,
    seasonScenario,
    leadTimeBufferDays,
    serviceLevelTarget
  );

  // Initialize selected checkboxes for critical and high urgency items
  useEffect(() => {
    const initialSelection: Record<string, boolean> = {};
    forecastSummary.items.forEach((item) => {
      if (item.urgency === 'Kritis' || item.urgency === 'Tinggi') {
        initialSelection[item.sku] = true;
      }
    });
    setSelectedItemCheckboxes(initialSelection);
  }, [seasonScenario, leadTimeBufferDays, serviceLevelTarget]);

  // Filtered items
  const filteredItems = forecastSummary.items.filter((item) => {
    if (selectedCategoryFilter === 'Semua') return true;
    return item.category === selectedCategoryFilter;
  });

  // Currently focused item for detailed chart
  const activeFocusItem =
    forecastSummary.items.find((i) => i.sku === selectedItemSku) || forecastSummary.items[0];

  // Toggle Item Checkbox for PO
  const toggleItemCheckbox = (sku: string) => {
    setSelectedItemCheckboxes((prev) => ({
      ...prev,
      [sku]: !prev[sku]
    }));
  };

  // Toggle Select All
  const handleSelectAll = (select: boolean) => {
    const nextSelection: Record<string, boolean> = {};
    filteredItems.forEach((item) => {
      nextSelection[item.sku] = select;
    });
    setSelectedItemCheckboxes(nextSelection);
  };

  // 1-Click Sync Dynamic ROP to Master stockItems
  const handleSyncRopToMaster = () => {
    let syncedCount = 0;
    forecastSummary.items.forEach((forecast) => {
      const match = stockItems.find(
        (s) =>
          s.sku.toLowerCase() === forecast.sku.toLowerCase() ||
          s.name.toLowerCase().includes(forecast.name.toLowerCase().slice(0, 10))
      );
      if (match) {
        updateStockItem(match.id, { minStock: forecast.reorderPoint });
        syncedCount++;
      }
    });

    addToast(
      `Berhasil memperbarui ${syncedCount} item Min. Stok di master inventaris sesuai kalkulasi ROP musiman AI!`,
      'success'
    );
  };

  // Prepare & Preview Auto PO
  const handlePrepareAutoPo = () => {
    const targetItems = forecastSummary.items.filter(
      (item) => selectedItemCheckboxes[item.sku]
    );

    if (targetItems.length === 0) {
      addToast('Pilih setidaknya 1 item medis untuk membuat Purchase Order.', 'warning');
      return;
    }

    const preferredSupplier = suppliers[1]?.name || 'PharmaVet Nusantara';
    const poPayload = createPurchaseOrderFromForecast(targetItems, preferredSupplier);
    setPoPreviewData(poPayload);
    setShowPoConfirmModal(true);
  };

  // Confirm and Save Auto PO to DataContext
  const handleConfirmAutoPo = () => {
    if (!poPreviewData) return;

    addPurchaseOrder({
      supplierName: poPreviewData.supplierName,
      items: poPreviewData.items,
      totalAmount: poPreviewData.totalAmount,
      notes: poPreviewData.notes
    });

    setShowPoConfirmModal(false);
    addToast(
      `Purchase Order (${poPreviewData.items.length} item) senilai Rp ${poPreviewData.totalAmount.toLocaleString('id-ID')} berhasil diterbitkan ke ${poPreviewData.supplierName}!`,
      'success'
    );
  };

  // Fetch Gemini AI Deep Clinical Supply Insights
  const handleFetchGeminiInsights = async () => {
    setIsLoadingGemini(true);
    setShowAiModal(true);

    try {
      const scheduledSurgeries = doctorBookings.filter(
        (b) => b.complaint.toLowerCase().includes('operasi') || b.complaint.toLowerCase().includes('steril')
      ).length || 3;

      const response = await fetch('/api/ai/forecast-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          seasonScenario,
          criticalItems: forecastSummary.items.map((i) => ({
            sku: i.sku,
            name: i.name,
            category: i.category,
            currentStock: i.currentStock,
            unit: i.unit,
            adjustedDailyDemand: i.adjustedDailyDemand,
            reorderPoint: i.reorderPoint,
            safetyStock: i.safetyStock,
            suggestedReorderQty: i.suggestedReorderQty,
            stockoutHorizonDays: i.stockoutHorizonDays,
            urgency: i.urgency,
            totalEstimatedCost: i.totalEstimatedCost
          })),
          activeInpatientsCount: inpatients.length || 1,
          scheduledSurgeriesCount: scheduledSurgeries,
          leadTimeBufferDays
        })
      });

      const json = await response.json();
      if (json.success && json.data) {
        setGeminiInsights(json.data);
      } else {
        throw new Error(json.error || 'Gagal memuat insight AI');
      }
    } catch (err: any) {
      console.error('AI Forecast Fetch Error:', err);
      addToast('Memuat rekomendasi AI lokal fallback.', 'info');
    } finally {
      setIsLoadingGemini(false);
    }
  };

  const categoriesList = [
    'Semua',
    'Cairan & Infus IV',
    'Anestesi & Sedasi',
    'Emergency & Resusitasi',
    'Antibiotik & Farmasi',
    'Vaksin & Biologik',
    'Alat Bedah & Habis Pakai',
    'Reagen Diagnostik & Rapid Kit'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / AI Header */}
      <div className="bg-gradient-to-r from-[#1B2A45] via-[#243B60] to-[#101A2C] rounded-2xl p-6 text-[#FFFDF9] border border-[#B8905A]/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B8905A]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/50 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#D9B98A] animate-pulse" />
                AI-Driven Inventory Forecasting & Seasonal ROP
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                <Activity className="w-3 h-3" /> Model Preskriptif Aktif
              </span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#FFFDF9] font-display">
              Peramalan Konsumsi & Titik Pemesanan Ulang Pasokan Medis Kritis
            </h1>
            <p className="text-xs lg:text-sm text-[#EDE6D6]/90 max-w-3xl leading-relaxed">
              Menganalisis riwayat mutasi obat, tren epidemiologi musiman, variasi lead time distributor, serta tingkat okupansi rawat inap & bedah untuk merekomendasikan Reorder Point (ROP), Safety Stock, dan kuantitas pemesanan optimal secara otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleFetchGeminiInsights}
              className="px-4 py-2.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#A57F4A] hover:to-[#8C683B] text-[#FFFDF9] rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Bot className="w-4 h-4 text-[#FFFDF9]" />
              Analisis Epidemiologi AI
            </button>
            <button
              onClick={handleSyncRopToMaster}
              className="px-4 py-2.5 bg-[#101A2C] hover:bg-[#15233B] text-[#D9B98A] border border-[#B8905A]/40 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Terapkan ROP ke Master
            </button>
          </div>
        </div>

        {/* Realtime KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#B8905A]/20">
          <div className="bg-[#101A2C]/60 backdrop-blur-xs rounded-xl p-3.5 border border-[#B8905A]/20">
            <div className="text-[11px] font-medium text-[#EDE6D6]/70 flex items-center justify-between">
              <span>Indeks Keamanan Stok</span>
              <ShieldAlert className="w-3.5 h-3.5 text-[#D9B98A]" />
            </div>
            <div className="text-xl font-bold text-[#FFFDF9] mt-1 flex items-baseline gap-1.5">
              <span>{forecastSummary.overallStockHealthIndex}%</span>
              <span className="text-[10px] text-emerald-400 font-medium">
                ({forecastSummary.totalCriticalItemsTracked} Item Kritis)
              </span>
            </div>
          </div>

          <div className="bg-[#101A2C]/60 backdrop-blur-xs rounded-xl p-3.5 border border-red-500/30">
            <div className="text-[11px] font-medium text-red-300 flex items-center justify-between">
              <span>Stok Kritis / Emergency</span>
              <Flame className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-xl font-bold text-red-400 mt-1 flex items-baseline gap-1.5">
              <span>{forecastSummary.criticalStockoutAlertsCount} Item</span>
              <span className="text-[10px] text-red-300 font-medium">Sisa &lt; 5 Hari</span>
            </div>
          </div>

          <div className="bg-[#101A2C]/60 backdrop-blur-xs rounded-xl p-3.5 border border-amber-500/30">
            <div className="text-[11px] font-medium text-amber-300 flex items-center justify-between">
              <span>Wajib Reorder (ROP)</span>
              <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span>{forecastSummary.criticalStockoutAlertsCount + forecastSummary.urgentReorderCount} Item</span>
              <span className="text-[10px] text-amber-300 font-medium">Ambang ROP</span>
            </div>
          </div>

          <div className="bg-[#101A2C]/60 backdrop-blur-xs rounded-xl p-3.5 border border-[#B8905A]/20">
            <div className="text-[11px] font-medium text-[#EDE6D6]/70 flex items-center justify-between">
              <span>Estimasi Anggaran PO</span>
              <DollarSign className="w-3.5 h-3.5 text-[#D9B98A]" />
            </div>
            <div className="text-xl font-bold text-[#D9B98A] mt-1">
              Rp {forecastSummary.estimatedTotalReorderCost.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Model Controls: Seasonality & Lead Time Sensitivity Simulation */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#E1D6BE]/70 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#B8905A]/20 flex items-center justify-center text-[#B8905A]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45] font-display">
                Parameter Musiman & Variabel Ketidakpastian Pasokan (Simulation Engine)
              </h3>
              <p className="text-xs text-[#6B6656]">
                Sesuaikan skenario tren musiman dan penyangga lead time distributor untuk mengkalkulasi ulang safety stock dan ROP secara real-time.
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-[#B8905A] bg-[#B8905A]/10 px-3 py-1 rounded-full border border-[#B8905A]/30">
            Skenario Aktif: {forecastSummary.seasonScenarioName.split('(')[0]}
          </div>
        </div>

        {/* Season Scenario Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => setSeasonScenario('pancaroba_hujan')}
            className={`p-3.5 rounded-xl border text-left transition-all relative ${
              seasonScenario === 'pancaroba_hujan'
                ? 'bg-[#1B2A45] border-[#B8905A] text-[#FFFDF9] shadow-sm'
                : 'bg-[#F6F1E6]/50 border-[#E1D6BE] text-[#22242B] hover:bg-[#F6F1E6]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold">🌧️ Pancaroba & Musim Hujan</span>
              {seasonScenario === 'pancaroba_hujan' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </div>
            <p className={`text-[11px] line-clamp-2 ${seasonScenario === 'pancaroba_hujan' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'}`}>
              +45% Antibiotik, +40% Cairan Infus RL, +35% Kulit/Otitis akibat kelembaban.
            </p>
          </button>

          <button
            onClick={() => setSeasonScenario('liburan_boarding')}
            className={`p-3.5 rounded-xl border text-left transition-all relative ${
              seasonScenario === 'liburan_boarding'
                ? 'bg-[#1B2A45] border-[#B8905A] text-[#FFFDF9] shadow-sm'
                : 'bg-[#F6F1E6]/50 border-[#E1D6BE] text-[#22242B] hover:bg-[#F6F1E6]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold">🏖️ Musim Liburan & Boarding</span>
              {seasonScenario === 'liburan_boarding' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </div>
            <p className={`text-[11px] line-clamp-2 ${seasonScenario === 'liburan_boarding' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'}`}>
              +65% Vaksin Rabies & Tricat, +35% Anestesi Sterilisasi sebelum penitipan.
            </p>
          </button>

          <button
            onClick={() => setSeasonScenario('kemarau_normal')}
            className={`p-3.5 rounded-xl border text-left transition-all relative ${
              seasonScenario === 'kemarau_normal'
                ? 'bg-[#1B2A45] border-[#B8905A] text-[#FFFDF9] shadow-sm'
                : 'bg-[#F6F1E6]/50 border-[#E1D6BE] text-[#22242B] hover:bg-[#F6F1E6]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold">☀️ Kemarau & Normal Baseline</span>
              {seasonScenario === 'kemarau_normal' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </div>
            <p className={`text-[11px] line-clamp-2 ${seasonScenario === 'kemarau_normal' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'}`}>
              Laju konsumsi standar baseline tanpa lonjakan anomali iklim atau wabah.
            </p>
          </button>

          <button
            onClick={() => setSeasonScenario('wabah_gi_parvo')}
            className={`p-3.5 rounded-xl border text-left transition-all relative ${
              seasonScenario === 'wabah_gi_parvo'
                ? 'bg-[#1B2A45] border-[#B8905A] text-[#FFFDF9] shadow-sm'
                : 'bg-[#F6F1E6]/50 border-[#E1D6BE] text-[#22242B] hover:bg-[#F6F1E6]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-red-500">⚠️ Waspada Wabah Parvo/GI</span>
              {seasonScenario === 'wabah_gi_parvo' && (
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
              )}
            </div>
            <p className={`text-[11px] line-clamp-2 ${seasonScenario === 'wabah_gi_parvo' ? 'text-[#EDE6D6]/80' : 'text-[#6B6656]'}`}>
              +120% Ringer Lactate & Maropitant, +180% Rapid Test Kit antigen CPV/CCV.
            </p>
          </button>
        </div>

        {/* Sliders for Lead Time Buffer & Service Level */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <div className="bg-[#F6F1E6]/60 rounded-xl p-3.5 border border-[#E1D6BE]/70">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#1B2A45]">
                Penyangga Keterlambatan Pengiriman Distributor (Lead Time Buffer)
              </span>
              <span className="font-bold text-[#B8905A] bg-[#FFFDF9] px-2 py-0.5 rounded-md border border-[#E1D6BE]">
                +{leadTimeBufferDays} Hari
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="7"
              step="1"
              value={leadTimeBufferDays}
              onChange={(e) => setLeadTimeBufferDays(Number(e.target.value))}
              className="w-full accent-[#B8905A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6B6656] mt-1">
              <span>Sesuai Kontrak (0 Hari)</span>
              <span>Buffer Sedang (+3 Hari)</span>
              <span>Buffer Ekstrem (+7 Hari)</span>
            </div>
          </div>

          <div className="bg-[#F6F1E6]/60 rounded-xl p-3.5 border border-[#E1D6BE]/70">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#1B2A45]">
                Target Service Level Proteksi Stok Medis (Z-Score Safety Factor)
              </span>
              <span className="font-bold text-[#B8905A] bg-[#FFFDF9] px-2 py-0.5 rounded-md border border-[#E1D6BE]">
                {(serviceLevelTarget * 100).toFixed(1)}% (Z = {serviceLevelTarget >= 0.99 ? '2.33' : serviceLevelTarget >= 0.98 ? '2.05' : '1.65'})
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0.90, 0.95, 0.98, 0.999].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setServiceLevelTarget(lvl)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    serviceLevelTarget === lvl
                      ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45]'
                      : 'bg-[#FFFDF9] text-[#22242B] border-[#E1D6BE] hover:bg-[#F6F1E6]'
                  }`}
                >
                  {lvl === 0.999 ? '99.9% (Zero)' : `${lvl * 100}%`}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#6B6656] mt-1.5">
              Tingkat proteksi 98-99.9% disarankan untuk obat emergency ICU, cairan infus, dan anestesi bedah.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Trajectory Chart & Item Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recharts Dynamic 90-Day Trajectory Curve */}
        <div className="lg:col-span-2 bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1D6BE] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8905A]"></span>
                <h3 className="font-bold text-sm text-[#1B2A45] font-display">
                  Kurva Proyeksi Penurunan Stok & Ambang ROP (90 Hari Kedepan)
                </h3>
              </div>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Item terpilih: <span className="font-bold text-[#1B2A45]">{activeFocusItem.name}</span> ({activeFocusItem.sku})
              </p>
            </div>

            {/* Item Dropdown for chart */}
            <div className="flex items-center gap-2">
              <select
                value={selectedItemSku}
                onChange={(e) => setSelectedItemSku(e.target.value)}
                className="text-xs font-bold bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg px-3 py-1.5 text-[#1B2A45]"
              >
                {forecastSummary.items.map((i) => (
                  <option key={i.sku} value={i.sku}>
                    [{i.urgency.toUpperCase()}] {i.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics of Active Focus Item */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#F6F1E6]/60 border border-[#E1D6BE]/70">
              <div className="text-[10px] text-[#6B6656]">Sisa Stok Sekarang</div>
              <div className="font-bold text-base text-[#1B2A45]">
                {activeFocusItem.currentStock} {activeFocusItem.unit}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F6F1E6]/60 border border-[#E1D6BE]/70">
              <div className="text-[10px] text-[#6B6656]">Laju Terpakai / Hari</div>
              <div className="font-bold text-base text-[#B8905A]">
                {activeFocusItem.adjustedDailyDemand} {activeFocusItem.unit}/hari
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F6F1E6]/60 border border-[#E1D6BE]/70">
              <div className="text-[10px] text-[#6B6656]">Reorder Point (ROP)</div>
              <div className="font-bold text-base text-amber-600">
                {activeFocusItem.reorderPoint} {activeFocusItem.unit}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[#F6F1E6]/60 border border-[#E1D6BE]/70">
              <div className="text-[10px] text-[#6B6656]">Safety Stock (SS)</div>
              <div className="font-bold text-base text-emerald-600">
                {activeFocusItem.safetyStock} {activeFocusItem.unit}
              </div>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeFocusItem.projectedTrajectory}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorStockWithoutPO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorStockWithPO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#6B6656' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6B6656' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1B2A45',
                    color: '#FFFDF9',
                    borderRadius: '8px',
                    border: '1px solid #B8905A',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine
                  y={activeFocusItem.reorderPoint}
                  label={{ value: `ROP: ${activeFocusItem.reorderPoint}`, fill: '#D97706', fontSize: 10 }}
                  stroke="#D97706"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={activeFocusItem.safetyStock}
                  label={{ value: `Safety: ${activeFocusItem.safetyStock}`, fill: '#10B981', fontSize: 10 }}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                />
                <Area
                  type="monotone"
                  dataKey="projectedStockWithoutPO"
                  name="Stok Tanpa PO (Stockout Risk)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorStockWithoutPO)"
                />
                <Area
                  type="monotone"
                  dataKey="projectedStockWithPO"
                  name="Stok Dengan Auto-PO"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorStockWithPO)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#22242B]">
              <span className="font-bold text-[#1B2A45]">Analisis Waktu Habis (Stockout Horizon): </span>
              Stok saat ini ({activeFocusItem.currentStock} {activeFocusItem.unit}) diproyeksikan habis total dalam{' '}
              <span className="font-bold text-red-600">{activeFocusItem.stockoutHorizonDays} hari</span> operasional. Dengan lead time supplier {activeFocusItem.leadTimeDays} hari, rilis PO darurat batch {activeFocusItem.suggestedReorderQty} {activeFocusItem.unit} harus dilakukan hari ini untuk menghindari kehabisan stok.
            </div>
          </div>
        </div>

        {/* Right Col: Historical Actual vs AI Predicted Demand (6 Months) */}
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#E1D6BE] pb-3">
              <TrendingUp className="w-4 h-4 text-[#B8905A]" />
              <div>
                <h3 className="font-bold text-sm text-[#1B2A45] font-display">
                  Riwayat & Presisi Model Peramalan
                </h3>
                <p className="text-[11px] text-[#6B6656]">
                  Konsumsi Aktual vs Prediksi Model (6 Bulan Terakhir)
                </p>
              </div>
            </div>

            <div className="h-52 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeFocusItem.historicalDemand}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" vertical={false} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: '#6B6656' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6B6656' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1B2A45',
                      color: '#FFFDF9',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="actual" name="Konsumsi Aktual" fill="#1B2A45" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" name="Prediksi AI" fill="#B8905A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-[#E1D6BE]">
            <div className="text-xs font-bold text-[#1B2A45]">Indikasi Klinis & Risiko:</div>
            <div className="text-[11px] text-[#6B6656] bg-[#F6F1E6] p-2.5 rounded-lg border border-[#E1D6BE]/70">
              <div className="font-semibold text-[#1B2A45] mb-0.5">Indikasi:</div>
              {activeFocusItem.clinicalIndication}
              <div className="font-semibold text-red-600 mt-1.5 mb-0.5">Risiko Kekosongan:</div>
              {activeFocusItem.riskOfStockout}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Medical Supplies AI Matrix Table */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
        {/* Table Filter & Action Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-[#E1D6BE] pb-3">
          <div>
            <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
              <span>Matriks Peramalan & Rekomendasi Reorder Pasokan Medis Kritis</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1B2A45] text-[#FFFDF9] text-xs font-mono">
                {filteredItems.length} Item
              </span>
            </h3>
            <p className="text-xs text-[#6B6656]">
              Perhitungan dinamis berbasis Reorder Point (ROP) = (Laju Harian × Lead Time) + Safety Stock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] text-xs font-bold rounded-lg border border-[#E1D6BE]"
            >
              Pilih Semua
            </button>
            <button
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] text-xs font-bold rounded-lg border border-[#E1D6BE]"
            >
              Batal Pilih
            </button>
            <button
              onClick={handlePrepareAutoPo}
              className="px-4 py-1.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Buat PO Otomatis Terpilih ({Object.values(selectedItemCheckboxes).filter(Boolean).length})
            </button>
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategoryFilter === cat
                  ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                  : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#E1D6BE]/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#22242B]">
            <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3 w-8">
                  <span className="sr-only">Pilih</span>
                </th>
                <th className="p-3">SKU & Pasokan Medis Kritis</th>
                <th className="p-3">Kategori Klinis</th>
                <th className="p-3 text-center">Sisa Stok</th>
                <th className="p-3 text-center">Laju Harian</th>
                <th className="p-3 text-center">Lead Time</th>
                <th className="p-3 text-center">Safety Stock</th>
                <th className="p-3 text-center">Ambang ROP</th>
                <th className="p-3 text-center">Sisa Hari</th>
                <th className="p-3 text-center">Rekomendasi PO</th>
                <th className="p-3 text-center">Urgensi</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BE]/60">
              {filteredItems.map((item) => {
                const isSelected = !!selectedItemCheckboxes[item.sku];
                const isItemActive = selectedItemSku === item.sku;

                return (
                  <tr
                    key={item.sku}
                    className={`hover:bg-[#F6F1E6]/40 transition-colors ${
                      isItemActive ? 'bg-[#B8905A]/5 font-medium' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemCheckbox(item.sku)}
                        className="w-4 h-4 rounded-md accent-[#B8905A] cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#1B2A45] hover:text-[#B8905A] cursor-pointer" onClick={() => setSelectedItemSku(item.sku)}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#6B6656] font-mono mt-0.5">
                          <span>{item.sku}</span>
                          <span>•</span>
                          <span>{item.supplierName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#1B2A45]/10 text-[#1B2A45] text-[10px] font-semibold whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-sm">
                      <span className={item.currentStock <= item.safetyStock ? 'text-red-600 font-extrabold' : 'text-[#1B2A45]'}>
                        {item.currentStock}
                      </span>
                      <span className="text-[10px] text-[#6B6656] ml-1 font-normal">{item.unit}</span>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className="text-amber-700 font-semibold">{item.adjustedDailyDemand}</span>
                      <span className="text-[10px] text-[#6B6656] block">/hari</span>
                    </td>
                    <td className="p-3 text-center font-mono text-[#6B6656]">
                      {item.leadTimeDays} hari
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-emerald-700">
                      {item.safetyStock} {item.unit}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-amber-600">
                      {item.reorderPoint} {item.unit}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded-md text-[11px] ${
                            item.stockoutHorizonDays <= 4
                              ? 'bg-red-500/20 text-red-600'
                              : item.stockoutHorizonDays <= 10
                              ? 'bg-amber-500/20 text-amber-700'
                              : 'bg-emerald-500/20 text-emerald-700'
                          }`}
                        >
                          {item.stockoutHorizonDays} hari
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="font-bold text-[#1B2A45]">
                        +{item.suggestedReorderQty} {item.unit}
                      </div>
                      <div className="text-[10px] text-[#6B6656]">
                        Rp {item.totalEstimatedCost.toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          item.urgency === 'Kritis'
                            ? 'bg-red-600 text-white animate-pulse'
                            : item.urgency === 'Tinggi'
                            ? 'bg-amber-500 text-white'
                            : item.urgency === 'Waspada'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.urgency === 'Kritis' && <Flame className="w-3 h-3" />}
                        {item.urgency}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedItemSku(item.sku);
                          const singlePayload = createPurchaseOrderFromForecast([item], item.supplierName);
                          setPoPreviewData(singlePayload);
                          setShowPoConfirmModal(true);
                        }}
                        className="px-2.5 py-1 bg-[#1B2A45] hover:bg-[#B8905A] text-[#FFFDF9] rounded-lg text-[11px] font-bold transition-colors"
                      >
                        1-Click PO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Auto PO Generation */}
      {showPoConfirmModal && poPreviewData && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPoConfirmModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] max-w-2xl w-full p-6 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#B8905A]" />
                <h3 className="font-bold text-base text-[#1B2A45] font-display">
                  Konfirmasi Penerbitan Purchase Order Otomatis (AI Reorder)
                </h3>
              </div>
              <button
                onClick={() => setShowPoConfirmModal(false)}
                className="text-[#6B6656] hover:text-[#1B2A45] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#F6F1E6] p-3 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6B6656]">Target Distributor:</span>
                  <span className="font-bold text-[#1B2A45]">{poPreviewData.supplierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6656]">Total Item Medis:</span>
                  <span className="font-bold text-[#1B2A45]">{poPreviewData.items.length} Item</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6656]">Estimasi Total Nilai Tagihan:</span>
                  <span className="font-bold text-[#B8905A] text-sm">
                    Rp {poPreviewData.totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-[#E1D6BE] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Item Medis</th>
                      <th className="p-2.5 text-center">Qty Pesan</th>
                      <th className="p-2.5 text-right">Harga Satuan</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1D6BE]">
                    {poPreviewData.items.map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F6F1E6]/40">
                        <td className="p-2.5 font-medium">{line.itemName}</td>
                        <td className="p-2.5 text-center font-bold font-mono">
                          {line.quantity} {line.unit}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          Rp {line.unitPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-right font-bold font-mono text-[#1B2A45]">
                          Rp {line.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-[#6B6656]">
                *Purchase Order ini akan langsung didaftarkan ke modul Purchasing & Pengadaan ERP berstatus Draft untuk disetujui Manajer Logistik & Keuangan.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E1D6BE]">
              <button
                onClick={() => setShowPoConfirmModal(false)}
                className="px-4 py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmAutoPo}
                className="px-5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" /> Terbitkan & Kirim PO Resmi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini Deep Dive AI Insights Modal */}
      {showAiModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#B8905A]/40 max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A45] to-[#B8905A] flex items-center justify-center text-[#FFFDF9]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1B2A45] font-display">
                    Laporan Analisis Epidemiologi & Rekomendasi Pengadaan Gemini AI
                  </h3>
                  <p className="text-xs text-[#6B6656]">
                    Korelasi klinis beban penyakit musiman terhadap rantai pasok medis veteriner
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-[#6B6656] hover:text-[#1B2A45] text-sm"
              >
                ✕
              </button>
            </div>

            {isLoadingGemini ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#B8905A] animate-spin" />
                <p className="text-xs font-bold text-[#1B2A45]">
                  Gemini sedang menyintesis riwayat konsumsi, okupansi ICU, dan proyeksi musiman...
                </p>
              </div>
            ) : geminiInsights ? (
              <div className="space-y-4 text-xs">
                {/* Executive Summary */}
                <div className="bg-[#1B2A45] text-[#FFFDF9] p-4 rounded-xl border border-[#B8905A]/30 space-y-1.5">
                  <div className="text-xs font-bold text-[#D9B98A] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Ringkasan Eksekutif AI
                  </div>
                  <p className="text-xs text-[#EDE6D6] leading-relaxed">
                    {geminiInsights.executiveSummary}
                  </p>
                </div>

                {/* Epidemiological Risk Factors */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#1B2A45] flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-red-500" />
                    Faktor Risiko Epidemiologi & Tren Penyakit Hewan:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {geminiInsights.epidemiologicalRiskFactors.map((risk, idx) => (
                      <div
                        key={idx}
                        className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] text-[#22242B]"
                      >
                        <span className="font-bold text-[#B8905A] mr-1.5">•</span>
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Priority Rankings */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#1B2A45] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-600" />
                    Prioritas Pengadaan Pasokan Medis Kritis:
                  </h4>
                  <div className="space-y-2">
                    {geminiInsights.clinicalPriorityRankings.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#FFFDF9] p-3.5 rounded-xl border border-[#E1D6BE] shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1B2A45] text-xs">
                            {idx + 1}. {item.name} [{item.sku}]
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            Tindakan Segera
                          </span>
                        </div>
                        <p className="text-[#6B6656] text-[11px]">{item.priorityReason}</p>
                        <div className="text-emerald-700 font-semibold text-[11px] pt-1">
                          👉 Rekomendasi: {item.immediateAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplier Optimization */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#1B2A45] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    Strategi Mitigasi Rantai Pasok & Negosiasi Distributor:
                  </h4>
                  <div className="bg-[#F6F1E6] p-3.5 rounded-xl border border-[#E1D6BE] space-y-1.5">
                    {geminiInsights.supplierOptimizationAdvice.map((adv, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[#22242B]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget Impact */}
                <div className="p-3.5 bg-[#B8905A]/10 rounded-xl border border-[#B8905A]/30 text-[#1B2A45]">
                  <span className="font-bold">Analisis Efisiensi Anggaran: </span>
                  {geminiInsights.budgetImpactAnalysis}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-[#E1D6BE]">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2 bg-[#1B2A45] hover:bg-[#243B60] text-[#FFFDF9] font-bold text-xs rounded-xl"
              >
                Tutup Laporan AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
