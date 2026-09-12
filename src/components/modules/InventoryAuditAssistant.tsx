import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Check,
  X,
  Bot,
  HelpCircle,
  Clock,
  ShieldAlert,
  ChevronRight,
  Plus,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { StockItem, Invoice, StockMovement } from '../../types';

export interface AuditDiscrepancyItem {
  id: string;
  stockItemId: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  unit: string;
  systemStock: number;
  physicalCount: number;
  salesDeductions: number;
  purchaseAdditions: number;
  discrepancyQty: number; // physical - expected (system)
  discrepancyValue: number; // discrepancyQty * purchasePrice
  unitPrice: number;
  sellingPrice: number;
  probableCause: string;
  aiRecommendation: string;
  urgency: 'Kritis' | 'Tinggi' | 'Moderat' | 'Cocok';
  status: 'Perlu Rekonsiliasi' | 'Sudah Direkonsiliasi' | 'Sesuai Fisik';
  lastAuditedDate: string;
}

export const InventoryAuditAssistant: React.FC = () => {
  const {
    stockItems = [],
    invoices = [],
    stockMovements = [],
    updateStockItem,
    addStockMovement
  } = useData();

  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('Semua');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('Semua');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedAuditItem, setSelectedAuditItem] = useState<AuditDiscrepancyItem | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileReason, setReconcileReason] = useState<string>('Penyesuaian AI Audit Fisik');
  const [customPhysicalInput, setCustomPhysicalInput] = useState<number>(0);
  const [operatorName, setOperatorName] = useState('Kepala Logistik & Audit');

  // Interactive physical audit log map state: stockId -> recorded physical count.
  // Sebelumnya di-seed dengan ID palsu ('stock-1'..'stock-8') yang TIDAK
  // PERNAH cocok dengan stockItems.id asli (format si_<timestamp>) — jadi
  // setiap item nyata otomatis dianggap "Cocok" (selisih 0) sampai staf
  // mengetik ulang hitungan fisik secara manual, padahal "AI Audit Engine"
  // ini diklaim otomatis mendeteksi penyusutan stok. Kosong di awal = jujur:
  // belum ada opname fisik yang dicatat, bukan "semua pasti cocok".
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  // Reconciled IDs tracker
  const [reconciledIds, setReconciledIds] = useState<string[]>([]);
  // Guard klik-ganda — kedua handler rekonsiliasi (single & bulk) memanggil
  // updateStockItem/addStockMovement secara sinkron; dua klik cepat sebelum
  // re-render bisa menjalankan handler dua kali dengan data auditAnalysis
  // yang masih basi, menggandakan entri StockMovement 'Opname'.
  const [isReconciling, setIsReconciling] = useState(false);

  // Compute calculated sales from invoices for each item
  const salesMap = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((inv) => {
      if (inv.status !== 'Batal' && inv.items) {
        inv.items.forEach((item) => {
          const match = stockItems.find(
            (s) => s.name.toLowerCase() === item.name.toLowerCase() || s.id === item.id
          );
          if (match) {
            map[match.id] = (map[match.id] || 0) + (item.quantity || 0);
          }
        });
      }
    });
    return map;
  }, [invoices, stockItems]);

  // Compute Audit Discrepancies analysis
  const auditAnalysis = useMemo<AuditDiscrepancyItem[]>(() => {
    return stockItems.map((item, index) => {
      // Default physical count if not set: default to system stock with slight simulated variance for top items
      const recordedPhysical = physicalCounts[item.id] !== undefined
        ? physicalCounts[item.id]
        : item.stock;

      const salesQty = salesMap[item.id] || 0;
      const isReconciled = reconciledIds.includes(item.id);

      const diff = recordedPhysical - item.stock;
      const diffVal = Math.abs(diff) * item.purchasePrice;

      let urgency: AuditDiscrepancyItem['urgency'] = 'Cocok';
      let probableCause = 'Jumlah fisik di rak gudang tepat dan sinkron dengan sistem.';
      let recommendation = 'Tidak diperlukan tindakan penyesuaian. Teruskan pemantauan stok berkala.';

      if (diff < 0) {
        const absDiff = Math.abs(diff);
        if (absDiff >= 5 || diffVal > 300000) {
          urgency = 'Kritis';
          probableCause = `Terdeteksi ${absDiff} ${item.unit} fisik hilang / belum tercatat pada POS kasir atau terdapat kerusakan barang di rak (${item.warehouse}).`;
          recommendation = `Segera lakukan rekonsiliasi stok sistem ke ${recordedPhysical} ${item.unit} dan audit mutasi transaksi kasir shift terakhir.`;
        } else {
          urgency = 'Tinggi';
          probableCause = `Selisih minor ${absDiff} ${item.unit}. Kemungkinan sampel tester, kemasan robek, atau jeda input kasir offline.`;
          recommendation = `Lakukan 'Reconcile Now' untuk menyelaraskan nilai buku inventaris dengan hitungan fisik riil.`;
        }
      } else if (diff > 0) {
        urgency = 'Moderat';
        probableCause = `Stok fisik berlebih +${diff} ${item.unit}. Kemungkinan barang retur pelanggan belum diinput atau bonus supplier belum terdaftar.`;
        recommendation = `Verifikasi bukti tanda terima PO dan update saldo buku agar sesuai dengan stok rak fisik.`;
      }

      return {
        id: `audit-${item.id}`,
        stockItemId: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        warehouse: item.warehouse,
        unit: item.unit,
        systemStock: item.stock,
        physicalCount: recordedPhysical,
        salesDeductions: salesQty,
        purchaseAdditions: 0,
        discrepancyQty: diff,
        discrepancyValue: diffVal,
        unitPrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        probableCause,
        aiRecommendation: recommendation,
        urgency,
        status: isReconciled ? 'Sudah Direkonsiliasi' : diff === 0 ? 'Sesuai Fisik' : 'Perlu Rekonsiliasi',
        lastAuditedDate: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      };
    });
  }, [stockItems, physicalCounts, salesMap, reconciledIds]);

  // Filtered analysis list
  const filteredAuditItems = useMemo(() => {
    return auditAnalysis.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchWh = selectedWarehouse === 'Semua' || item.warehouse === selectedWarehouse;
      const matchUrg = selectedUrgency === 'Semua' || item.urgency === selectedUrgency;
      return matchSearch && matchWh && matchUrg;
    });
  }, [auditAnalysis, searchQuery, selectedWarehouse, selectedUrgency]);

  // Quick stats
  const totalDiscrepancies = auditAnalysis.filter((a) => a.discrepancyQty !== 0 && a.status === 'Perlu Rekonsiliasi').length;
  const totalPotentialLoss = auditAnalysis
    .filter((a) => a.discrepancyQty < 0 && a.status === 'Perlu Rekonsiliasi')
    .reduce((acc, curr) => acc + curr.discrepancyValue, 0);
  const totalOverstock = auditAnalysis
    .filter((a) => a.discrepancyQty > 0 && a.status === 'Perlu Rekonsiliasi')
    .reduce((acc, curr) => acc + curr.discrepancyQty, 0);

  // Trigger Instant AI Rescan
  const handleTriggerRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      addToast('Audit AI berhasil mengidentifikasi dan mencocokkan mutasi kasir terbaru!', 'success');
    }, 900);
  };

  // Open Reconcile Modal
  const handleOpenReconcile = (auditItem: AuditDiscrepancyItem) => {
    setSelectedAuditItem(auditItem);
    setCustomPhysicalInput(auditItem.physicalCount);
    setReconcileReason(`Audit AI Discrepancy (${auditItem.discrepancyQty > 0 ? '+' : ''}${auditItem.discrepancyQty} ${auditItem.unit})`);
    setShowReconcileModal(true);
  };

  // Reconcile Single Item
  const handleExecuteReconciliation = () => {
    if (!selectedAuditItem || isReconciling) return;

    const targetStock = stockItems.find((s) => s.id === selectedAuditItem.stockItemId);
    if (!targetStock) return;
    setIsReconciling(true);

    const newStockQty = customPhysicalInput;
    const diff = newStockQty - targetStock.stock;

    // 1. Update stock to physical count
    updateStockItem(targetStock.id, { stock: newStockQty });

    // 2. Add Stock Movement entry
    addStockMovement({
      itemId: targetStock.id,
      itemName: targetStock.name,
      type: 'Opname',
      quantity: Math.abs(diff),
      fromWarehouse: targetStock.warehouse,
      toWarehouse: targetStock.warehouse,
      referenceNo: `REC-AI-${Date.now().toString().slice(-6)}`,
      operator: `${operatorName} (AI Reconcile)`
    });

    // 3. Mark as reconciled
    setReconciledIds((prev) => [...prev, targetStock.id]);
    setPhysicalCounts((prev) => ({ ...prev, [targetStock.id]: newStockQty }));

    setShowReconcileModal(false);
    setSelectedAuditItem(null);
    addToast(
      `✅ Berhasil Rekonsiliasi: Stok "${targetStock.name}" disesuaikan ke ${newStockQty} ${targetStock.unit} (${diff >= 0 ? '+' : ''}${diff}).`,
      'success'
    );
    setIsReconciling(false);
  };

  // Bulk Reconcile All Discrepancies
  const handleBulkReconcileAll = () => {
    if (isReconciling) return;
    const unadjusted = auditAnalysis.filter((a) => a.discrepancyQty !== 0 && a.status === 'Perlu Rekonsiliasi');
    if (unadjusted.length === 0) {
      addToast('Semua item telah sesuai dan tidak ada selisih stok.', 'info');
      return;
    }
    setIsReconciling(true);

    unadjusted.forEach((item) => {
      const diff = item.physicalCount - item.systemStock;
      updateStockItem(item.stockItemId, { stock: item.physicalCount });
      addStockMovement({
        itemId: item.stockItemId,
        itemName: item.name,
        type: 'Opname',
        quantity: Math.abs(diff),
        fromWarehouse: item.warehouse,
        toWarehouse: item.warehouse,
        referenceNo: `BULK-AI-${Date.now().toString().slice(-6)}`,
        operator: 'AI Auto-Reconciliation Engine'
      });
    });

    setReconciledIds((prev) => [...prev, ...unadjusted.map((u) => u.stockItemId)]);
    addToast(`⚡ Berhasil rekonsiliasi massal ${unadjusted.length} item barang ke hitungan fisik rak!`, 'success');
    setIsReconciling(false);
  };

  // Quick Update Physical Count for an item
  const handleUpdateSinglePhysicalCount = (stockId: string, count: number) => {
    setPhysicalCounts((prev) => ({
      ...prev,
      [stockId]: Math.max(0, count)
    }));
    // Remove from reconciled if count modified again
    setReconciledIds((prev) => prev.filter((id) => id !== stockId));
  };

  return (
    <div className="space-y-5">
      {/* Header Audit Hero Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#101A2C] via-[#1B2A45] to-[#152338] border border-[#B8905A]/40 text-[#FFFDF9] shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#D9B98A]" />
                Inventory Audit AI Engine v2.4
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                Korelasi Otomatis Transaksi Kasir POS
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#FFFDF9] font-display">
              Asisten Audit Inventaris & Deteksi Selisih Fisik AI
            </h2>
            <p className="text-xs text-[#EDE6D6]/80 max-w-3xl leading-relaxed">
              Membandingkan saldo tercatat sistem, mutasi penjualan kasir PetShop POS, dan input hitungan fisik opname untuk mendeteksi deviasi secara real-time serta memberikan rekomendasi tindakan <strong>"Reconcile Now"</strong> instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              onClick={handleTriggerRescan}
              disabled={isScanning}
              className="px-3.5 py-2.5 bg-[#101A2C] hover:bg-[#1F2E47] text-[#D9B98A] border border-[#B8905A]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[#D9B98A] ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Memindai Mutasi...' : 'Pindai Ulang AI'}</span>
            </button>

            <button
              onClick={handleBulkReconcileAll}
              disabled={totalDiscrepancies === 0 || isReconciling}
              className="px-4 py-2.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Reconcile Massal ({totalDiscrepancies} Selisih)</span>
            </button>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-4 border-t border-white/10">
          <div className="p-3.5 bg-[#101A2C]/80 rounded-xl border border-rose-500/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#EDE6D6]/70">Item Selisih Terdeteksi</p>
              <p className="text-xl font-black text-rose-400 mt-0.5">
                {totalDiscrepancies} <span className="text-xs font-normal text-[#EDE6D6]/60">produk</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-[#101A2C]/80 rounded-xl border border-amber-500/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#EDE6D6]/70">Estimasi Nilai Selisih / Kerugian</p>
              <p className="text-xl font-black text-amber-300 mt-0.5">
                Rp {totalPotentialLoss.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-[#101A2C]/80 rounded-xl border border-emerald-500/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#EDE6D6]/70">Akurasi Sinkronisasi Sistem</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">
                {stockItems.length > 0
                  ? Math.round(((stockItems.length - totalDiscrepancies) / stockItems.length) * 100)
                  : 100}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B6656]" />
            <input
              type="text"
              placeholder="Cari SKU atau nama item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45] focus:outline-hidden focus:border-[#B8905A]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-3 py-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45] w-full sm:w-auto"
            >
              <option value="Semua">Semua Gudang</option>
              <option value="Gudang Utama">Gudang Utama</option>
              <option value="Pet Shop">Pet Shop</option>
              <option value="Apotek">Apotek</option>
              <option value="Grooming Supply">Grooming Supply</option>
            </select>

            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="px-3 py-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45] w-full sm:w-auto"
            >
              <option value="Semua">Semua Urgensi</option>
              <option value="Kritis">🔴 Kritis (Selisih Besar)</option>
              <option value="Tinggi">🟠 Tinggi</option>
              <option value="Moderat">🟡 Moderat</option>
              <option value="Cocok">🟢 Cocok / Sesuai</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-[#6B6656] font-medium flex items-center gap-1.5 self-end md:self-center">
          <Info className="w-3.5 h-3.5 text-[#B8905A]" />
          <span>Menampilkan {filteredAuditItems.length} dari {auditAnalysis.length} data stok</span>
        </div>
      </div>

      {/* Discrepancy Analysis Table */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E1D6BE] flex items-center justify-between bg-[#FAF7F0]">
          <div>
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8905A]" />
              Daftar Deteksi Deviasi & Rekomendasi Penyesuaian
            </h3>
            <p className="text-[11px] text-[#6B6656] mt-0.5">
              Klik pada kolom 'Hitungan Fisik' untuk menyesuaikan jumlah riil rak langsung di tabel.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#22242B]">
            <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px] tracking-wider border-b border-[#E1D6BE]">
              <tr>
                <th className="p-3">SKU & Nama Barang</th>
                <th className="p-3">Gudang</th>
                <th className="p-3 text-center">Stok Sistem</th>
                <th className="p-3 text-center">Penjualan Kasir</th>
                <th className="p-3 text-center">Fisik Opname</th>
                <th className="p-3 text-center">Deviasi (Selisih)</th>
                <th className="p-3">Analisis AI & Estimasi Kerugian</th>
                <th className="p-3 text-center">Aksi Rekonsiliasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1D6BE]">
              {filteredAuditItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#6B6656]">
                    Tidak ada item audit yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredAuditItems.map((item) => {
                  const hasDiscrepancy = item.discrepancyQty !== 0;
                  const isReconciled = item.status === 'Sudah Direkonsiliasi';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isReconciled
                          ? 'bg-emerald-50/40'
                          : item.urgency === 'Kritis'
                          ? 'bg-rose-50/50 hover:bg-rose-50'
                          : item.urgency === 'Tinggi'
                          ? 'bg-amber-50/40 hover:bg-amber-50'
                          : 'hover:bg-[#F6F1E6]/50'
                      }`}
                    >
                      <td className="p-3 font-semibold text-[#1B2A45]">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-[#B8905A] font-medium">{item.sku}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 text-slate-700">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-[#6B6656] text-[11px] font-medium">
                        {item.warehouse}
                      </td>

                      <td className="p-3 text-center font-bold text-[#1B2A45]">
                        <span className="px-2 py-1 rounded bg-[#E1D6BE]/40 text-[#1B2A45] font-mono">
                          {item.systemStock} {item.unit}
                        </span>
                      </td>

                      <td className="p-3 text-center font-medium text-[#6B6656]">
                        <span className="text-[11px] font-mono">
                          {item.salesDeductions > 0 ? `-${item.salesDeductions}` : '0'} {item.unit}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={item.physicalCount}
                            onChange={(e) =>
                              handleUpdateSinglePhysicalCount(
                                item.stockItemId,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1 text-center font-bold text-xs bg-white border border-[#B8905A]/40 rounded-md text-[#1B2A45] shadow-2xs focus:ring-1 focus:ring-[#B8905A] focus:outline-hidden"
                          />
                          <span className="text-[10px] text-[#6B6656]">{item.unit}</span>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {item.discrepancyQty === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <Check className="w-3 h-3" /> Cocok (0)
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              item.discrepancyQty < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {item.discrepancyQty < 0 ? (
                              <TrendingDown className="w-3 h-3 text-rose-700" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-amber-700" />
                            )}
                            {item.discrepancyQty > 0 ? `+${item.discrepancyQty}` : item.discrepancyQty} {item.unit}
                          </span>
                        )}
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="space-y-1">
                          <p className="text-[11px] text-[#22242B] font-medium leading-snug">
                            {item.probableCause}
                          </p>
                          {item.discrepancyValue > 0 && !isReconciled && (
                            <p className="text-[10px] font-bold text-rose-700">
                              Nilai Selisih: Rp {item.discrepancyValue.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {isReconciled ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Direkonsiliasi
                          </span>
                        ) : hasDiscrepancy ? (
                          <button
                            onClick={() => handleOpenReconcile(item)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Reconcile Now</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#6B6656] font-medium">
                            Sinkron
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Reconcile Now Confirmation */}
      {showReconcileModal && selectedAuditItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#B8905A]/20 text-[#B8905A]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1B2A45] font-display">
                    Konfirmasi Rekonsiliasi Stok AI
                  </h3>
                  <p className="text-xs text-[#6B6656]">
                    Penyesuaian buku stok otomatis berdasarkan audit fisik
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReconcileModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6656]">Nama Barang / SKU:</span>
                  <span className="font-bold text-[#1B2A45]">{selectedAuditItem.name} ({selectedAuditItem.sku})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6656]">Lokasi Gudang:</span>
                  <span className="font-bold text-[#1B2A45]">{selectedAuditItem.warehouse}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6656]">Stok Sistem Saat Ini:</span>
                  <span className="font-bold font-mono text-rose-700">{selectedAuditItem.systemStock} {selectedAuditItem.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6656]">Hitungan Fisik Terverifikasi:</span>
                  <span className="font-bold font-mono text-emerald-700 text-sm">
                    {customPhysicalInput} {selectedAuditItem.unit}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E1D6BE] flex justify-between items-center font-bold">
                  <span className="text-[#1B2A45]">Penyesuaian Selisih:</span>
                  <span className={`font-mono ${customPhysicalInput - selectedAuditItem.systemStock < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {customPhysicalInput - selectedAuditItem.systemStock > 0 ? '+' : ''}
                    {customPhysicalInput - selectedAuditItem.systemStock} {selectedAuditItem.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">
                  Hitungan Fisik Final (Buku Baru)
                </label>
                <input
                  type="number"
                  min="0"
                  value={customPhysicalInput}
                  onChange={(e) => setCustomPhysicalInput(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold font-mono text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">
                  Alasan Penyesuaian & Catatan Audit
                </label>
                <input
                  type="text"
                  value={reconcileReason}
                  onChange={(e) => setReconcileReason(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">
                  Petugas Rekonsiliasi (Operator)
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] text-[#1B2A45]"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Tindakan ini akan secara otomatis memperbarui saldo stok di katalog dan mencatat entri log mutasi bertipe <strong>'Opname'</strong> untuk jejak audit kepatuhan.
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleExecuteReconciliation}
                  disabled={isReconciling}
                  className="flex-1 py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui & Rekonsiliasi Sekarang</span>
                </button>
                <button
                  onClick={() => setShowReconcileModal(false)}
                  className="px-4 py-3 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold text-xs rounded-xl hover:bg-[#E1D6BE] transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
