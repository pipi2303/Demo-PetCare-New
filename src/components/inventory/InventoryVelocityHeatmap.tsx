import React, { useState, useMemo } from 'react';
import { StockItem, StockMovement } from '../../types';
import {
  Flame,
  Zap,
  Clock,
  AlertOctagon,
  Scale,
  Search,
  Filter,
  ShoppingCart,
  Tag,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
  Layers,
  Layers2,
  Package,
  Boxes,
  Store,
  Pill,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface InventoryVelocityHeatmapProps {
  stockItems: StockItem[];
  stockMovements?: StockMovement[];
  onOpenQuickPO?: (item: StockItem) => void;
  onApplyClearanceDiscount?: (item: StockItem) => void;
}

export type VelocityTier = 'ULTRA_FAST' | 'FAST' | 'MODERATE' | 'SLOW' | 'DEAD_STOCK';

export interface CalculatedItemVelocity {
  item: StockItem;
  monthlySalesQty: number;
  monthlyRevenue: number;
  velocityScore: number; // 0 to 100
  tier: VelocityTier;
  tierLabel: string;
  daysOfInventory: number; // DSI
  turnoverPerYear: number;
  capitalTiedUp: number;
  reorderUrgency: 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'OVERSTOCKED';
  recommendation: string;
  usedEstimate: boolean;
}

export const InventoryVelocityHeatmap: React.FC<InventoryVelocityHeatmapProps> = ({
  stockItems,
  stockMovements = [],
  onOpenQuickPO,
  onApplyClearanceDiscount
}) => {
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | 'PETSHOP' | 'PHARMACY'>('ALL');
  const [tierFilter, setTierFilter] = useState<VelocityTier | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID_HEATMAP' | 'QUADRANT' | 'TABLE'>('GRID_HEATMAP');
  const [selectedItemDetail, setSelectedItemDetail] = useState<CalculatedItemVelocity | null>(null);

  // Compute item velocity metrics
  const calculatedItems: CalculatedItemVelocity[] = useMemo(() => {
    return stockItems.map((item) => {
      // Riwayat mutasi keluar (penjualan) 30 hari terakhir. Sebelumnya
      // filter ini memakai m.stockItemId & m.notes — field yang tidak
      // pernah ada di StockMovement (field asli: itemId, tanpa notes) —
      // jadi cabang ini selalu kosong dan heatmap SELALU jatuh ke rumus
      // tebakan di bawah, untuk SETIAP item, kapan pun. Sekarang memakai
      // field yang benar & jendela 30 hari asli, bukan dikali 2.5 secara
      // sembarangan.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const outgoingMovements = stockMovements.filter(
        (m) => m.itemId === item.id && m.type === 'Keluar' && new Date(m.date) >= thirtyDaysAgo
      );

      const totalOutgoingQty = outgoingMovements.reduce((sum, m) => sum + m.quantity, 0);

      // Volume penjualan bulanan riil dari mutasi stok sungguhan.
      let monthlySalesQty = totalOutgoingQty;

      // Estimasi tebakan HANYA dipakai kalau memang belum ada riwayat mutasi
      // sama sekali untuk item ini (mis. produk baru) — ditandai jelas di
      // UI (lihat usedEstimate di bawah), bukan diam-diam menggantikan data
      // asli.
      const usedEstimate = monthlySalesQty === 0;
      if (monthlySalesQty === 0) {
        const nameLower = item.name.toLowerCase();
        const catLower = item.category.toLowerCase();
        if (catLower.includes('makanan') || nameLower.includes('cat food') || nameLower.includes('dog food') || nameLower.includes('royal')) {
          monthlySalesQty = Math.max(18, Math.round(item.stock * 1.6));
        } else if (catLower.includes('pasir') || nameLower.includes('bentonite') || nameLower.includes('pasir')) {
          monthlySalesQty = Math.max(25, Math.round(item.stock * 1.8));
        } else if (catLower.includes('antibiotik') || nameLower.includes('amoxicillin') || nameLower.includes('ceftriaxone')) {
          monthlySalesQty = Math.max(20, Math.round(item.stock * 1.4));
        } else if (nameLower.includes('vitamin') || nameLower.includes('nutri-plus') || nameLower.includes('shampoo')) {
          monthlySalesQty = Math.max(10, Math.round(item.stock * 0.9));
        } else if (nameLower.includes('kandang') || nameLower.includes('carrier') || nameLower.includes('bed')) {
          monthlySalesQty = Math.max(1, Math.round(item.stock * 0.15));
        } else if (nameLower.includes('orthopedic') || nameLower.includes('endoscopy') || nameLower.includes('implant')) {
          monthlySalesQty = Math.max(0, Math.round(item.stock * 0.05));
        } else {
          monthlySalesQty = Math.max(2, Math.round(item.stock * 0.5));
        }
      }

      const monthlyRevenue = monthlySalesQty * (item.sellingPrice || item.purchasePrice * 1.35);
      const capitalTiedUp = item.stock * item.purchasePrice;

      // Turnover & DSI calculations
      const dailySalesRate = Math.max(0.05, monthlySalesQty / 30);
      const daysOfInventory = Math.round(item.stock / dailySalesRate);
      const turnoverPerYear = Number(((monthlySalesQty * 12) / Math.max(1, item.stock)).toFixed(1));

      // Calculate 0-100 velocity score
      let velocityScore = Math.min(100, Math.round((monthlySalesQty / 30) * 50 + (turnoverPerYear / 12) * 50));
      if (item.stock > 0 && monthlySalesQty <= 1) velocityScore = Math.min(18, velocityScore);
      if (daysOfInventory > 120) velocityScore = Math.min(15, velocityScore);

      // Determine Velocity Tier
      let tier: VelocityTier;
      let tierLabel: string;
      let recommendation: string;

      if (velocityScore >= 75 || daysOfInventory <= 15) {
        tier = 'ULTRA_FAST';
        tierLabel = '🔥 Ultra Fast-Moving (A+)';
        recommendation = 'Tingkatkan reorder point & amankan kuota supplier grosir';
      } else if (velocityScore >= 55 || daysOfInventory <= 30) {
        tier = 'FAST';
        tierLabel = '⚡ Fast-Moving (A)';
        recommendation = 'Pertahankan buffer stok aman 14 hari, reorder rutin';
      } else if (velocityScore >= 35 || daysOfInventory <= 60) {
        tier = 'MODERATE';
        tierLabel = '⚖️ Steady / Normal (B)';
        recommendation = 'Stok seimbang, monitor fluktuasi mingguan';
      } else if (velocityScore >= 18 || daysOfInventory <= 100) {
        tier = 'SLOW';
        tierLabel = '⏳ Slow-Moving (C)';
        recommendation = 'Pertimbangkan promo bundling atau diskon kasir';
      } else {
        tier = 'DEAD_STOCK';
        tierLabel = '🛑 Dead Stock / Dormant (D)';
        recommendation = 'Likuidasi segera via clearance sale untuk lepas modal tertahan';
      }

      // Reorder Urgency
      let reorderUrgency: 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'OVERSTOCKED' = 'HEALTHY';
      if (item.stock <= 0) {
        reorderUrgency = 'CRITICAL';
      } else if (item.stock <= item.minStock) {
        reorderUrgency = 'WARNING';
      } else if (daysOfInventory > 120 && item.stock > item.minStock * 3) {
        reorderUrgency = 'OVERSTOCKED';
      }

      return {
        item,
        monthlySalesQty,
        monthlyRevenue,
        velocityScore,
        tier,
        tierLabel,
        daysOfInventory,
        turnoverPerYear,
        capitalTiedUp,
        reorderUrgency,
        recommendation,
        usedEstimate
      };
    });
  }, [stockItems, stockMovements]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return calculatedItems.filter((calc) => {
      // Department filter
      const isPharmacy = calc.item.warehouse?.toLowerCase().includes('apotek') ||
        calc.item.warehouse?.toLowerCase().includes('klinik') ||
        calc.item.category?.toLowerCase().includes('obat') ||
        calc.item.category?.toLowerCase().includes('vaksin') ||
        calc.item.category?.toLowerCase().includes('medis');

      if (departmentFilter === 'PETSHOP' && isPharmacy) return false;
      if (departmentFilter === 'PHARMACY' && !isPharmacy) return false;

      // Tier filter
      if (tierFilter !== 'ALL' && calc.tier !== tierFilter) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          calc.item.name.toLowerCase().includes(term) ||
          calc.item.sku.toLowerCase().includes(term) ||
          calc.item.category.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [calculatedItems, departmentFilter, tierFilter, searchTerm]);

  // Analytical Summary Aggregations
  const stats = useMemo(() => {
    const totalItems = calculatedItems.length;
    const fastItems = calculatedItems.filter((c) => c.tier === 'ULTRA_FAST' || c.tier === 'FAST');
    const slowItems = calculatedItems.filter((c) => c.tier === 'SLOW');
    const deadItems = calculatedItems.filter((c) => c.tier === 'DEAD_STOCK');

    const totalRevenue = calculatedItems.reduce((acc, c) => acc + c.monthlyRevenue, 0);
    const fastRevenue = fastItems.reduce((acc, c) => acc + c.monthlyRevenue, 0);
    const deadCapital = deadItems.reduce((acc, c) => acc + c.capitalTiedUp, 0);
    const slowCapital = slowItems.reduce((acc, c) => acc + c.capitalTiedUp, 0);

    const fastRevenuePct = totalRevenue > 0 ? Math.round((fastRevenue / totalRevenue) * 100) : 0;
    const fastCountPct = totalItems > 0 ? Math.round((fastItems.length / totalItems) * 100) : 0;

    return {
      totalItems,
      fastCount: fastItems.length,
      fastCountPct,
      fastRevenuePct,
      slowCount: slowItems.length,
      deadCount: deadItems.length,
      deadCapital,
      slowCapital,
      totalTiedUp: deadCapital + slowCapital
    };
  }, [calculatedItems]);

  const getHeatmapColor = (tier: VelocityTier, score: number) => {
    switch (tier) {
      case 'ULTRA_FAST':
        return 'bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 shadow-emerald-600/30';
      case 'FAST':
        return 'bg-teal-600 dark:bg-teal-600 text-white border-teal-500 hover:bg-teal-500 shadow-teal-600/20';
      case 'MODERATE':
        return 'bg-sky-600 dark:bg-sky-600 text-white border-sky-500 hover:bg-sky-500';
      case 'SLOW':
        return 'bg-amber-500 dark:bg-amber-600 text-slate-950 dark:text-white border-amber-400 hover:bg-amber-400';
      case 'DEAD_STOCK':
        return 'bg-rose-600 dark:bg-rose-700 text-white border-rose-500 hover:bg-rose-500 shadow-rose-600/30';
    }
  };

  return (
    <div className="bg-[#FFFDF9] dark:bg-[#15233B] rounded-2xl border border-[#E1D6BE] dark:border-[#B8905A]/30 p-5 shadow-2xs space-y-5">
      {/* Widget Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E1D6BE] dark:border-[#B8905A]/20 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#1B2A45] to-[#2B3F63] text-amber-300 border border-[#B8905A]/30 shadow-xs shrink-0">
            <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black font-display text-[#1B2A45] dark:text-[#FFFDF9]">
                Heatmap Perputaran Stok: Fast-Moving vs Slow-Moving
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#1B2A45] text-amber-300 text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Velocity Matrix
              </span>
            </div>
            <p className="text-xs text-[#6B6656] dark:text-[#EDE6D6]/70 mt-0.5">
              Analisis kecepatan rotasi stok Pet Shop & Farmasi Apotek untuk mencegah stockout & melikuidasi modal tertahan.
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#F6F1E6] dark:bg-[#101A2C] p-1 rounded-xl border border-[#E1D6BE] dark:border-[#B8905A]/30 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('GRID_HEATMAP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'GRID_HEATMAP'
                ? 'bg-[#1B2A45] text-amber-300 shadow-2xs'
                : 'text-[#6B6656] dark:text-[#EDE6D6]/70 hover:text-[#1B2A45]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Matrix Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('QUADRANT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'QUADRANT'
                ? 'bg-[#1B2A45] text-amber-300 shadow-2xs'
                : 'text-[#6B6656] dark:text-[#EDE6D6]/70 hover:text-[#1B2A45]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Kuadran Velocity</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-[#1B2A45] text-amber-300 shadow-2xs'
                : 'text-[#6B6656] dark:text-[#EDE6D6]/70 hover:text-[#1B2A45]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Daftar Detail</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-[11px] font-bold">Fast-Moving (A/A+)</span>
            <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-display text-emerald-900 dark:text-emerald-100">
              {stats.fastCount} SKU
            </span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              ({stats.fastCountPct}% SKU)
            </span>
          </div>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
            Menyumbang ~{stats.fastRevenuePct}% total omzet penjualan.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/20 border border-sky-200 dark:border-sky-800/40">
          <div className="flex items-center justify-between text-sky-800 dark:text-sky-300">
            <span className="text-[11px] font-bold">Steady / Normal (B)</span>
            <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-display text-sky-900 dark:text-sky-100">
              {calculatedItems.filter((c) => c.tier === 'MODERATE').length} SKU
            </span>
          </div>
          <p className="text-[10px] text-sky-700 dark:text-sky-400 mt-0.5">
            Rotasi stabil (DSI 30-60 hari), stok optimal.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/40">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
            <span className="text-[11px] font-bold">Slow-Moving (C)</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-display text-amber-900 dark:text-amber-100">
              {stats.slowCount} SKU
            </span>
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
            Modal tertahan: <strong>Rp {stats.slowCapital.toLocaleString('id-ID')}</strong>
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/20 border border-rose-200 dark:border-rose-800/40">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
            <span className="text-[11px] font-bold">Dead Stock (D)</span>
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-display text-rose-900 dark:text-rose-100">
              {stats.deadCount} SKU
            </span>
          </div>
          <p className="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5">
            Modal macet: <strong>Rp {stats.deadCapital.toLocaleString('id-ID')}</strong>
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Department / Category Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setDepartmentFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              departmentFilter === 'ALL'
                ? 'bg-[#1B2A45] text-amber-300 border-[#1B2A45]'
                : 'bg-white dark:bg-[#101A2C] text-[#6B6656] dark:text-[#EDE6D6]/70 border-[#E1D6BE] dark:border-[#B8905A]/30 hover:bg-[#FAF7F2]'
            }`}
          >
            Semua Departemen ({calculatedItems.length})
          </button>

          <button
            type="button"
            onClick={() => setDepartmentFilter('PETSHOP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              departmentFilter === 'PETSHOP'
                ? 'bg-[#1B2A45] text-amber-300 border-[#1B2A45]'
                : 'bg-white dark:bg-[#101A2C] text-[#6B6656] dark:text-[#EDE6D6]/70 border-[#E1D6BE] dark:border-[#B8905A]/30 hover:bg-[#FAF7F2]'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Pet Shop & Retail</span>
          </button>

          <button
            type="button"
            onClick={() => setDepartmentFilter('PHARMACY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              departmentFilter === 'PHARMACY'
                ? 'bg-[#1B2A45] text-amber-300 border-[#1B2A45]'
                : 'bg-white dark:bg-[#101A2C] text-[#6B6656] dark:text-[#EDE6D6]/70 border-[#E1D6BE] dark:border-[#B8905A]/30 hover:bg-[#FAF7F2]'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-emerald-400" />
            <span>Farmasi & Apotek Klinik</span>
          </button>
        </div>

        {/* Tier Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as any)}
            className="bg-white dark:bg-[#101A2C] text-[#1B2A45] dark:text-[#FFFDF9] text-xs font-bold rounded-xl px-3 py-1.5 border border-[#E1D6BE] dark:border-[#B8905A]/30 focus:outline-hidden focus:border-[#B8905A] cursor-pointer"
          >
            <option value="ALL">Semua Tingkat Velocity</option>
            <option value="ULTRA_FAST">🔥 Ultra Fast-Moving (A+)</option>
            <option value="FAST">⚡ Fast-Moving (A)</option>
            <option value="MODERATE">⚖️ Steady / Normal (B)</option>
            <option value="SLOW">⏳ Slow-Moving (C)</option>
            <option value="DEAD_STOCK">🛑 Dead Stock (D)</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6656]" />
            <input
              type="text"
              placeholder="Cari SKU atau nama item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#101A2C] text-[#1B2A45] dark:text-[#FFFDF9] text-xs rounded-xl border border-[#E1D6BE] dark:border-[#B8905A]/30 focus:outline-hidden focus:border-[#B8905A] w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Heatmap Legend Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] bg-[#FAF7F2] dark:bg-[#101A2C] p-2.5 rounded-xl border border-[#E1D6BE]/70 dark:border-[#B8905A]/20">
        <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-amber-500" /> Skala Intensitas Velocity:
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block shadow-2xs" /> Ultra-Fast (&ge;75)
          </span>
          <span className="flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-300">
            <span className="w-3 h-3 rounded-md bg-teal-600 inline-block shadow-2xs" /> Fast (55-74)
          </span>
          <span className="flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300">
            <span className="w-3 h-3 rounded-md bg-sky-600 inline-block shadow-2xs" /> Steady (35-54)
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
            <span className="w-3 h-3 rounded-md bg-amber-500 inline-block shadow-2xs" /> Slow-Moving (18-34)
          </span>
          <span className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300">
            <span className="w-3 h-3 rounded-md bg-rose-600 inline-block shadow-2xs" /> Dead Stock (&lt;18)
          </span>
        </div>
      </div>

      {/* MAIN VIEW MODE: Grid Heatmap Tiles */}
      {viewMode === 'GRID_HEATMAP' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {filteredItems.map((calc) => {
              const colorClass = getHeatmapColor(calc.tier, calc.velocityScore);
              return (
                <div
                  key={calc.item.id}
                  onClick={() => setSelectedItemDetail(calc)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-2xs ${colorClass}`}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between text-[10px] font-mono opacity-90">
                    <span className="truncate">{calc.item.sku}</span>
                    <span className="font-black bg-black/25 px-1.5 py-0.5 rounded">
                      {calc.velocityScore}
                    </span>
                  </div>

                  {/* Item Name */}
                  <div className="my-2">
                    <p className="font-bold text-xs leading-tight line-clamp-2" title={calc.item.name}>
                      {calc.item.name}
                    </p>
                    <p className="text-[10px] opacity-80 truncate mt-0.5">
                      {calc.item.warehouse || calc.item.category}
                    </p>
                  </div>

                  {/* Bottom Stats */}
                  <div className="pt-1.5 border-t border-white/20 text-[10px] flex items-center justify-between">
                    <span>Stok: <strong>{calc.item.stock} {calc.item.unit}</strong></span>
                    <span className="font-bold">
                      {calc.daysOfInventory > 999 ? '∞' : `${calc.daysOfInventory}d DSI`}
                    </span>
                  </div>

                  {/* Reorder warning dot */}
                  {calc.reorderUrgency === 'WARNING' && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                  )}
                  {calc.reorderUrgency === 'CRITICAL' && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-300 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#101A2C] rounded-xl border border-dashed border-[#E1D6BE] dark:border-[#B8905A]/30">
              <Package className="w-8 h-8 text-[#B8905A] mx-auto opacity-50 mb-2" />
              <p className="text-xs font-bold text-[#1B2A45] dark:text-[#FFFDF9]">
                Tidak ada item inventaris yang cocok dengan kriteria filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: 4-Quadrant Velocity Matrix */}
      {viewMode === 'QUADRANT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quadrant 1: Stars / Fast Moving High Margin */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-emerald-600" /> Kuadran 1: High Turnover / Star Items (A+)
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 text-[10px] font-bold">
                {calculatedItems.filter((c) => c.tier === 'ULTRA_FAST' || c.tier === 'FAST').length} Items
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              Rotasi tercepat (&lt;30 hari). Fokus: Hindari kehabisan stok, otomatisasi reorder buffer.
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {calculatedItems
                .filter((c) => c.tier === 'ULTRA_FAST' || c.tier === 'FAST')
                .map((calc) => (
                  <div
                    key={calc.item.id}
                    onClick={() => setSelectedItemDetail(calc)}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#15233B] border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs hover:border-emerald-500 cursor-pointer transition-all shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] truncate max-w-xs">{calc.item.name}</p>
                      <p className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/70">
                        {calc.monthlySalesQty} unit/bln • Omzet: Rp {calc.monthlyRevenue.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {calc.daysOfInventory} hari DSI
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quadrant 2: Steady / Workhorse Items */}
          <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-300 dark:border-sky-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-sky-900 dark:text-sky-100 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-sky-600" /> Kuadran 2: Steady & Predictable (B)
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-100 text-[10px] font-bold">
                {calculatedItems.filter((c) => c.tier === 'MODERATE').length} Items
              </span>
            </div>
            <p className="text-[11px] text-sky-800 dark:text-sky-300">
              Rotasi normal terprediksi (DSI 30-60 hari). Jaga kuota safety stock standar.
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {calculatedItems
                .filter((c) => c.tier === 'MODERATE')
                .map((calc) => (
                  <div
                    key={calc.item.id}
                    onClick={() => setSelectedItemDetail(calc)}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#15233B] border border-sky-200 dark:border-sky-800 flex items-center justify-between gap-2 text-xs hover:border-sky-500 cursor-pointer transition-all shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] truncate max-w-xs">{calc.item.name}</p>
                      <p className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/70">
                        {calc.monthlySalesQty} unit/bln • Stok: {calc.item.stock} {calc.item.unit}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">
                      {calc.daysOfInventory} hari DSI
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Quadrant 3: Slow Moving / Overstock Risk */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" /> Kuadran 3: Slow-Moving / Overstocked (C)
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[10px] font-bold">
                {calculatedItems.filter((c) => c.tier === 'SLOW').length} Items
              </span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Rotasi lambat (&gt;60 hari). Strategi: bundling dengan item fast-moving atau promo kasir.
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {calculatedItems
                .filter((c) => c.tier === 'SLOW')
                .map((calc) => (
                  <div
                    key={calc.item.id}
                    onClick={() => setSelectedItemDetail(calc)}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#15233B] border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 text-xs hover:border-amber-500 cursor-pointer transition-all shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] truncate max-w-xs">{calc.item.name}</p>
                      <p className="text-[10px] text-amber-800 dark:text-amber-300">
                        Modal tertahan: Rp {calc.capitalTiedUp.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      {calc.daysOfInventory} hari DSI
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Quadrant 4: Dead Stock / Liquidation Target */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-rose-900 dark:text-rose-100 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" /> Kuadran 4: Dead Stock / Liquidation Needed (D)
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 text-[10px] font-bold">
                {calculatedItems.filter((c) => c.tier === 'DEAD_STOCK').length} Items
              </span>
            </div>
            <p className="text-[11px] text-rose-800 dark:text-rose-300">
              Tidak ada pergerakan &gt;90 hari. Target: Flash clearance sale 30-50% untuk cairkan dana.
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {calculatedItems
                .filter((c) => c.tier === 'DEAD_STOCK')
                .map((calc) => (
                  <div
                    key={calc.item.id}
                    onClick={() => setSelectedItemDetail(calc)}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#15233B] border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 text-xs hover:border-rose-500 cursor-pointer transition-all shadow-2xs"
                  >
                    <div>
                      <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] truncate max-w-xs">{calc.item.name}</p>
                      <p className="text-[10px] text-rose-800 dark:text-rose-300">
                        Macet: Rp {calc.capitalTiedUp.toLocaleString('id-ID')} • Sisa {calc.item.stock} {calc.item.unit}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 shrink-0">
                      Clearance
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE: Detailed Ranking Table */}
      {viewMode === 'TABLE' && (
        <div className="overflow-x-auto rounded-xl border border-[#E1D6BE] dark:border-[#B8905A]/30">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] dark:bg-[#101A2C] text-[#6B6656] dark:text-[#EDE6D6]/70 border-b border-[#E1D6BE] dark:border-[#B8905A]/30">
              <tr>
                <th className="p-3 font-bold">SKU & Nama Item</th>
                <th className="p-3 font-bold">Kategori / Dep.</th>
                <th className="p-3 font-bold">Stok Saat Ini</th>
                <th className="p-3 font-bold">Penjualan / Bln</th>
                <th className="p-3 font-bold">DSI (Hari Stok)</th>
                <th className="p-3 font-bold">Velocity Tier</th>
                <th className="p-3 font-bold">Rekomendasi</th>
                <th className="p-3 font-bold text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BE]/60 dark:divide-[#B8905A]/20 bg-white dark:bg-[#15233B]">
              {filteredItems.map((calc) => (
                <tr key={calc.item.id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#101A2C]/60 transition-colors">
                  <td className="p-3">
                    <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9]">{calc.item.name}</p>
                    <span className="font-mono text-[10px] text-[#6B6656]">{calc.item.sku}</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-[#F6F1E6] dark:bg-[#101A2C] text-[#1B2A45] dark:text-[#EDE6D6] text-[10px] font-semibold">
                      {calc.item.warehouse || calc.item.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`font-bold ${calc.item.stock <= calc.item.minStock ? 'text-rose-600 dark:text-rose-400' : 'text-[#1B2A45] dark:text-[#FFFDF9]'}`}>
                      {calc.item.stock} {calc.item.unit}
                    </span>
                    <span className="text-[10px] text-[#6B6656] block">Min: {calc.item.minStock}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-[#1B2A45] dark:text-[#FFFDF9]">
                    {calc.monthlySalesQty} unit
                  </td>
                  <td className="p-3 font-mono">
                    <span className={`font-bold ${calc.daysOfInventory <= 20 ? 'text-emerald-600' : calc.daysOfInventory > 90 ? 'text-rose-600' : 'text-[#1B2A45] dark:text-[#FFFDF9]'}`}>
                      {calc.daysOfInventory > 999 ? '∞' : `${calc.daysOfInventory} hari`}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${
                        calc.tier === 'ULTRA_FAST'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : calc.tier === 'FAST'
                          ? 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200'
                          : calc.tier === 'MODERATE'
                          ? 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200'
                          : calc.tier === 'SLOW'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200'
                          : 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200'
                      }`}
                    >
                      {calc.tierLabel}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70 max-w-xs">
                    {calc.recommendation}
                  </td>
                  <td className="p-3 text-center">
                    {calc.tier === 'ULTRA_FAST' || calc.tier === 'FAST' ? (
                      <button
                        type="button"
                        onClick={() => onOpenQuickPO && onOpenQuickPO(calc.item)}
                        className="px-2.5 py-1 bg-[#1B2A45] hover:bg-[#101A2C] text-amber-300 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        title="Buat Purchase Order Cepat"
                      >
                        <ShoppingCart className="w-3 h-3" /> Reorder
                      </button>
                    ) : calc.tier === 'DEAD_STOCK' || calc.tier === 'SLOW' ? (
                      <button
                        type="button"
                        onClick={() => onApplyClearanceDiscount && onApplyClearanceDiscount(calc.item)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        title="Aktifkan Promo Clearance Sale"
                      >
                        <Tag className="w-3 h-3" /> Clearance
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedItemDetail(calc)}
                        className="px-2.5 py-1 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        Detail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Velocity Detail Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FFFDF9] dark:bg-[#15233B] w-full max-w-lg rounded-2xl shadow-2xl border border-[#E1D6BE] dark:border-[#B8905A]/30 overflow-hidden space-y-4 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#F6F1E6] dark:bg-[#101A2C] text-[#6B6656] dark:text-[#EDE6D6]/70">
                    {selectedItemDetail.item.sku} • {selectedItemDetail.item.warehouse}
                  </span>
                  {selectedItemDetail.usedEstimate ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Estimasi — belum ada riwayat penjualan tercatat
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Dari data penjualan 30 hari riil
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#1B2A45] dark:text-[#FFFDF9] mt-1">
                  {selectedItemDetail.item.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded-lg text-[#6B6656] hover:bg-[#FAF7F2] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Velocity Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE]/70 dark:border-[#B8905A]/20">
                <span className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/70">Velocity Tier</span>
                <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] mt-0.5">{selectedItemDetail.tierLabel}</p>
                <span className="text-[10px] text-amber-600 font-bold">Skor: {selectedItemDetail.velocityScore}/100</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE]/70 dark:border-[#B8905A]/20">
                <span className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/70">Days Sales of Inventory (DSI)</span>
                <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] mt-0.5">{selectedItemDetail.daysOfInventory} Hari</p>
                <span className="text-[10px] text-[#6B6656]">{selectedItemDetail.turnoverPerYear}x putaran/tahun</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE]/70 dark:border-[#B8905A]/20">
                <span className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/70">Stok Saat Ini vs Min</span>
                <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] mt-0.5">
                  {selectedItemDetail.item.stock} {selectedItemDetail.item.unit} (Min: {selectedItemDetail.item.minStock})
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE]/70 dark:border-[#B8905A]/20">
                <span className="text-[10px] text-[#6B6656] dark:text-[#EDE6D6]/70">Estimasi Penjualan Bulanan</span>
                <p className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] mt-0.5">
                  {selectedItemDetail.monthlySalesQty} unit (~Rp {selectedItemDetail.monthlyRevenue.toLocaleString('id-ID')})
                </p>
              </div>
            </div>

            {/* Strategic Advice */}
            <div className="p-3.5 rounded-xl bg-[#F6F1E6] dark:bg-[#101A2C] border border-[#E1D6BE] dark:border-[#B8905A]/30 space-y-1 text-xs">
              <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Rekomendasi Pengadaan & Promosi:
              </span>
              <p className="text-[#6B6656] dark:text-[#EDE6D6]/80 leading-relaxed">
                {selectedItemDetail.recommendation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 bg-white dark:bg-[#15233B] text-[#6B6656] dark:text-[#EDE6D6] border border-[#E1D6BE] rounded-xl text-xs font-bold hover:bg-[#FAF7F2] cursor-pointer"
              >
                Tutup
              </button>

              {onOpenQuickPO && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenQuickPO(selectedItemDetail.item);
                    setSelectedItemDetail(null);
                  }}
                  className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-amber-300 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Buat Purchase Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
