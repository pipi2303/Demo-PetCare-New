import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { AIForecastingView } from './AIForecastingView';
import { InventoryAuditAssistant } from './InventoryAuditAssistant';
import { InventoryVelocityHeatmap } from '../inventory/InventoryVelocityHeatmap';
import { StockItem } from '../../types';
import { QuickPOModal, QuickPOLineItem } from '../common/QuickPOModal';
import { StockMutationModal } from '../inventory/StockMutationModal';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRightLeft,
  Plus,
  CheckCircle2,
  Building2,
  RefreshCw,
  FileText,
  Search,
  SlidersHorizontal,
  History,
  Boxes,
  Check,
  X,
  Sparkles,
  Bot,
  TrendingUp,
  Activity,
  Flame,
  Tag,
  Clock,
  ExternalLink,
  Percent,
  Calendar,
  ShieldAlert,
  ClipboardCheck
} from 'lucide-react';

interface InventoryModuleProps {
  activeModule?: string;
  setActiveModule?: (module: string) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ activeModule, setActiveModule }) => {
  const {
    stockItems = [],
    suppliers = [],
    purchaseOrders = [],
    stockMovements = [],
    addStockItem,
    updateStockItem,
    addStockMovement,
    addPurchaseOrder
  } = useData();

  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'stock' | 'heatmap' | 'auditAssistant' | 'movements' | 'transfer' | 'aiForecast'>(
    'stock'
  );
  const [showVelocityHeatmapWidget, setShowVelocityHeatmapWidget] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Expiration calculation helper
  const getDaysUntilExpiry = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const now = new Date();
    const exp = new Date(expiryDateStr);
    const diffTime = exp.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Low stock calculation
  const lowStockItems = stockItems.filter((item) => item.stock <= item.minStock);

  // Expiring within 30 days items
  const expiringItems = stockItems.filter((item) => {
    if (!item.expiryDate) return false;
    const days = getDaysUntilExpiry(item.expiryDate);
    return days !== null && days <= 30;
  });

  const clearanceDiscountValue = 35; // Default 35% discount for clearance sale

  // Toggle single item clearance sale
  const handleToggleClearanceSale = (item: StockItem, discountPercent: number = clearanceDiscountValue) => {
    if (item.isClearanceSale) {
      updateStockItem(item.id, {
        isClearanceSale: false,
        clearanceDiscountPercent: undefined
      });
      addToast(`Promo Clearance Sale untuk ${item.name} dinonaktifkan.`, 'info');
    } else {
      updateStockItem(item.id, {
        isClearanceSale: true,
        clearanceDiscountPercent: discountPercent
      });
      addToast(
        `⚡ Promo Clearance Sale (Diskon ${discountPercent}%) berhasil diaktifkan untuk "${item.name}" di PetShop POS!`,
        'success'
      );
    }
  };

  // Apply bulk clearance sale discount for all expiring items
  const handleApplyBulkClearanceSale = (discountPercent: number = clearanceDiscountValue) => {
    if (expiringItems.length === 0) {
      addToast('Tidak ada barang yang mendekati tanggal kadaluarsa.', 'info');
      return;
    }

    expiringItems.forEach((item) => {
      updateStockItem(item.id, {
        isClearanceSale: true,
        clearanceDiscountPercent: discountPercent
      });
    });

    addToast(
      `⚡ Berhasil mengaktifkan 'Clearance Sale' (${discountPercent}% OFF) untuk ${expiringItems.length} produk kadaluarsa di PetShop POS!`,
      'success'
    );
  };

  // Stock Opname Modal state
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [opnameStockId, setOpnameStockId] = useState(stockItems[0]?.id || '');
  const [actualPhysicalQty, setActualPhysicalQty] = useState<number>(0);
  const [opnameNotes, setOpnameNotes] = useState('');

  // Transfer state
  const [selectedStockId, setSelectedStockId] = useState(stockItems[0]?.id || '');
  const [fromWh, setFromWh] = useState('Gudang Utama');
  const [toWh, setToWh] = useState('Apotek');
  const [transferQty, setTransferQty] = useState(5);
  const [showStockMutationModal, setShowStockMutationModal] = useState(false);

  // Add Item Modal state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'Makanan' | 'Vitamin' | 'Mainan' | 'Kandang' | 'Aksesoris' | 'Pasir Kucing' | 'Obat' | 'Vaksin'>('Makanan');
  const [newItemWarehouse, setNewItemWarehouse] = useState<'Gudang Utama' | 'Apotek' | 'Grooming Supply' | 'Pet Shop'>('Gudang Utama');
  const [newItemStock, setNewItemStock] = useState(20);
  const [newItemMinStock, setNewItemMinStock] = useState(5);
  const [newItemUnit, setNewItemUnit] = useState('Pcs');
  const [newItemBuyPrice, setNewItemBuyPrice] = useState(50000);
  const [newItemSellPrice, setNewItemSellPrice] = useState(75000);
  const [newItemExpiryDate, setNewItemExpiryDate] = useState('');
  const [newItemBatchNumber, setNewItemBatchNumber] = useState('');

  // Quick PO Modal state
  const [isQuickPOModalOpen, setIsQuickPOModalOpen] = useState(false);
  const [quickPOItems, setQuickPOItems] = useState<QuickPOLineItem[]>([]);
  const [quickPOTitle, setQuickPOTitle] = useState<string>('');
  const [quickPONotes, setQuickPONotes] = useState<string>('');

  const handleOpenQuickPOForLowStock = () => {
    if (lowStockItems.length === 0) {
      addToast('Semua item stok berada dalam batas aman.', 'info');
      return;
    }

    const itemsForPO: QuickPOLineItem[] = lowStockItems.map((item) => {
      const reorderQty = Math.max(item.minStock * 2, 10);
      return {
        itemName: `${item.name} [${item.sku}]`,
        sku: item.sku,
        category: item.category,
        currentStock: item.stock,
        stockoutHorizonDays: item.stock <= item.minStock ? 3 : 6,
        quantity: reorderQty,
        unit: item.unit,
        unitPrice: item.purchasePrice,
        total: reorderQty * item.purchasePrice
      };
    });

    setQuickPOItems(itemsForPO);
    setQuickPOTitle(`Quick PO — ${lowStockItems.length} Item Stok Menipis`);
    setQuickPONotes(
      `[INVENTORY REORDER ALERT] Pemesanan otomatis untuk ${lowStockItems.length} item inventaris di bawah batas minimum stok (${lowStockItems.map(i => `${i.name} [sisa ${i.stock} ${i.unit}]`).join(', ')}). Mohon segera diproses.`
    );
    setIsQuickPOModalOpen(true);
  };

  const handleOpenQuickPOForSingleItem = (item: StockItem) => {
    const reorderQty = Math.max(item.minStock * 2, 10);
    const lineItem: QuickPOLineItem = {
      itemName: `${item.name} [${item.sku}]`,
      sku: item.sku,
      category: item.category,
      currentStock: item.stock,
      stockoutHorizonDays: item.stock <= item.minStock ? 3 : 14,
      quantity: reorderQty,
      unit: item.unit,
      unitPrice: item.purchasePrice,
      total: reorderQty * item.purchasePrice
    };
    setQuickPOItems([lineItem]);
    setQuickPOTitle(`Quick PO — Reorder Cepat: ${item.name}`);
    setQuickPONotes(
      `[VELOCITY REORDER] Pemesanan stok cepat untuk item berkecepatan tinggi "${item.name}" (SKU: ${item.sku}). Stok saat ini: ${item.stock} ${item.unit}.`
    );
    setIsQuickPOModalOpen(true);
  };

  const categories = ['Semua', '⚡ Kadaluarsa < 30 Hari', 'Makanan', 'Pasir Kucing', 'Vitamin', 'Obat', 'Aksesoris', 'Mainan', 'Kandang'];

  // Filtered stock list
  const filteredStock = stockItems.filter((item) => {
    let matchCat = true;
    if (selectedCategory === '⚡ Kadaluarsa < 30 Hari') {
      const days = getDaysUntilExpiry(item.expiryDate);
      matchCat = days !== null && days <= 30;
    } else if (selectedCategory !== 'Semua') {
      matchCat = item.category === selectedCategory;
    }

    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Execute Stock Opname Adjustment
  const handleExecuteOpname = () => {
    const targetItem = stockItems.find((s) => s.id === opnameStockId);
    if (!targetItem) return;

    const diff = actualPhysicalQty - targetItem.stock;

    // 1. Update stock
    updateStockItem(targetItem.id, { stock: actualPhysicalQty });

    // 2. Add Stock Movement entry
    addStockMovement({
      itemId: targetItem.id,
      itemName: targetItem.name,
      type: 'Opname',
      quantity: Math.abs(diff),
      referenceNo: 'OPN-' + Date.now().toString().slice(-6),
      operator: 'Kepala Gudang & Logistik'
    });

    setShowOpnameModal(false);
    setOpnameNotes('');
    addToast(
      `Stock Opname ${targetItem.name} disesuaikan ke ${actualPhysicalQty} ${targetItem.unit} (Selisih: ${diff > 0 ? '+' : ''}${diff}).`,
      'success'
    );
  };

  // Execute Stock Transfer
  const handleExecuteTransfer = () => {
    const stock = stockItems.find((s) => s.id === selectedStockId);
    if (!stock) return;

    if (stock.stock < transferQty) {
      addToast(`Stok ${stock.name} tidak mencukupi untuk ditransfer (${stock.stock} ${stock.unit}).`, 'error');
      return;
    }

    // Deduct stock from source warehouse
    updateStockItem(stock.id, { stock: stock.stock - transferQty });

    // Record movement
    addStockMovement({
      itemId: stock.id,
      itemName: stock.name,
      type: 'Transfer',
      quantity: transferQty,
      fromWarehouse: fromWh,
      toWarehouse: toWh,
      referenceNo: 'TRF-' + Date.now().toString().slice(-6),
      operator: 'Staf Gudang Logistik'
    });

    addToast(`Transfer ${transferQty} ${stock.unit} ${stock.name} dari ${fromWh} ke ${toWh} berhasil.`, 'success');
  };

  // Add New Stock Item
  const handleAddItemSubmit = () => {
    if (!newItemName) {
      addToast('Nama barang / obat wajib diisi.', 'error');
      return;
    }

    addStockItem({
      name: newItemName,
      category: newItemCategory,
      warehouse: newItemWarehouse,
      stock: newItemStock,
      minStock: newItemMinStock,
      unit: newItemUnit,
      purchasePrice: newItemBuyPrice,
      sellingPrice: newItemSellPrice,
      supplierName: suppliers[0]?.name || 'PT Medika Veteriner Utama',
      expiryDate: newItemExpiryDate || undefined,
      batchNumber: newItemBatchNumber || undefined
    });

    setShowAddItemModal(false);
    setNewItemName('');
    setNewItemExpiryDate('');
    setNewItemBatchNumber('');
    addToast(`Barang baru "${newItemName}" berhasil ditambahkan ke inventaris!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#1B2A45] rounded-xl p-5 text-[#FFFDF9] border border-[#B8905A]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40 text-[11px] font-semibold uppercase tracking-wider">
              Stok & Manajemen Logistik Multi-Gudang
            </span>
            {expiringItems.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-extrabold flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3 text-rose-400" />
                {expiringItems.length} Item Kadaluarsa &lt; 30 Hari
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold mt-1 text-[#FFFDF9] font-display">
            Monitoring Stok, Stock Opname & Mutasi Transfer Cabang
          </h2>
          <p className="text-xs text-[#EDE6D6]/80 mt-0.5">
            Peringatan stok minimum real-time, audit fisik Stock Opname, log mutasi persediaan & transfer antar gudang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'heatmap'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md font-extrabold'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#15233B]'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            Heatmap Velocity
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 text-[9px] font-extrabold uppercase">
              Fast/Slow
            </span>
          </button>
          <button
            onClick={() => setActiveTab('auditAssistant')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'auditAssistant'
                ? 'bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] shadow-md font-extrabold'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#15233B]'
            }`}
          >
            <Bot className="w-4 h-4 text-[#D9B98A]" />
            AI Audit Asisten
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 text-[9px] font-extrabold uppercase animate-pulse">
              Audit
            </span>
          </button>
          <button
            onClick={() => setActiveTab('aiForecast')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'aiForecast'
                ? 'bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#FFFDF9] shadow-md'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/40 hover:bg-[#15233B]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#D9B98A]" />
            AI Peramalan & ROP
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'stock'
                ? 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <Package className="w-4 h-4" /> Monitoring Stok
          </button>
          <button
            onClick={() => {
              const firstItem = stockItems[0];
              if (firstItem) setActualPhysicalQty(firstItem.stock);
              setShowOpnameModal(true);
            }}
            className="px-3.5 py-2 bg-[#101A2C] hover:bg-[#101A2C]/80 text-[#D9B98A] border border-[#B8905A]/30 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Manual Opname
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <History className="w-4 h-4" /> Log Mutasi
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'transfer'
                ? 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                : 'bg-[#101A2C] text-[#D9B98A] border border-[#B8905A]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" /> Transfer Cabang
          </button>
          <button
            onClick={() => setShowStockMutationModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:brightness-110 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Buat Mutasi & Surat Jalan Digital Resmi Antar Cabang / Gudang"
          >
            <FileText className="w-4 h-4 text-emerald-300" />
            <span>Mutasi & Surat Jalan</span>
          </button>
        </div>
      </div>

      {activeTab === 'auditAssistant' && <InventoryAuditAssistant />}

      {activeTab === 'aiForecast' && <AIForecastingView />}

      {activeTab === 'heatmap' && (
        <InventoryVelocityHeatmap
          stockItems={stockItems}
          stockMovements={stockMovements}
          onOpenQuickPO={handleOpenQuickPOForSingleItem}
          onApplyClearanceDiscount={handleToggleClearanceSale}
        />
      )}

      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Velocity Heatmap Dashboard Widget */}
          <InventoryVelocityHeatmap
            stockItems={stockItems}
            stockMovements={stockMovements}
            onOpenQuickPO={handleOpenQuickPOForSingleItem}
            onApplyClearanceDiscount={handleToggleClearanceSale}
          />
          {/* Visual Alert Badge Card: Expiring Items within 30 days & 1-Click Clearance Sale */}
          {expiringItems.length > 0 && (
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-rose-950 via-[#1B2A45] to-[#101A2C] border border-rose-500/40 text-[#FFFDF9] shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                    <Flame className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[10px] font-black uppercase tracking-wider">
                        Peringatan Kadaluarsa Kritis
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        {expiringItems.length} Produk Akan Kadaluarsa &le; 30 Hari
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-[#FFFDF9] font-display mt-1">
                      Perlindungan Margin: Segera Luncurkan Promo "Clearance Sale" di Kasir PetShop POS
                    </h3>
                    <p className="text-xs text-[#EDE6D6]/80 mt-0.5 max-w-2xl">
                      Cegah kerugian persediaan kadaluarsa dengan memberikan diskon clearance langsung di sistem kasir PetShop POS.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleApplyBulkClearanceSale(clearanceDiscountValue)}
                    className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 transition-all"
                  >
                    <Tag className="w-4 h-4" />
                    <span>1-Click Diskon Clearance Massal ({clearanceDiscountValue}% OFF)</span>
                  </button>

                  {setActiveModule && (
                    <button
                      onClick={() => setActiveModule('petShop')}
                      className="px-3.5 py-2.5 bg-[#101A2C] hover:bg-[#15233B] text-[#D9B98A] border border-[#B8905A]/40 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-4 h-4 text-[#D9B98A]" />
                      <span>Buka Kasir PetShop POS</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expiring items quick chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-rose-500/20">
                {expiringItems.map((item) => {
                  const daysLeft = getDaysUntilExpiry(item.expiryDate);
                  const isClearance = item.isClearanceSale;
                  const discountedPrice = Math.round(item.sellingPrice * (1 - clearanceDiscountValue / 100));

                  return (
                    <div
                      key={item.id}
                      className="bg-[#101A2C]/90 rounded-xl p-3 border border-rose-500/30 flex flex-col justify-between gap-2.5 text-xs shadow-inner"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-[#D9B98A] font-bold">{item.sku}</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-extrabold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysLeft !== null && daysLeft <= 0 ? 'Kadaluarsa Hari Ini' : `${daysLeft} hari lagi`}
                          </span>
                        </div>
                        <p className="font-bold text-[#FFFDF9] line-clamp-1">{item.name}</p>
                        <div className="flex items-center justify-between text-[11px] text-[#EDE6D6]/70">
                          <span>Sisa Stok: <strong className="text-[#FFFDF9]">{item.stock} {item.unit}</strong></span>
                          <span>Exp: <strong className="text-rose-300">{item.expiryDate}</strong></span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400 line-through leading-none">
                            Rp {item.sellingPrice.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs font-black text-amber-300">
                            Rp {discountedPrice.toLocaleString('id-ID')} <span className="text-[9px] font-normal text-rose-300">(-{clearanceDiscountValue}%)</span>
                          </p>
                        </div>

                        <button
                          onClick={() => handleToggleClearanceSale(item, clearanceDiscountValue)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                            isClearance
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                          }`}
                        >
                          {isClearance ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Clearance Aktif</span>
                            </>
                          ) : (
                            <>
                              <Tag className="w-3.5 h-3.5" />
                              <span>+ Clearance Sale</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Inventory Audit Assistant Teaser Widget */}
          <div className="p-4.5 rounded-2xl bg-gradient-to-r from-[#101A2C] via-[#1B2A45] to-[#152338] border border-[#B8905A]/40 text-[#FFFDF9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-[#FFFDF9] font-display">
                    Asisten Audit Inventaris & Deteksi Deviasi Penjualan Kasir
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    Live Audit Engine
                  </span>
                </div>
                <p className="text-xs text-[#EDE6D6]/80 mt-0.5">
                  AI mengaudit perbedaan antara mutasi kasir otomatis dan perhitungan fisik rak gudang, memberikan rekomendasi <strong>'Reconcile Now'</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('auditAssistant')}
              className="px-4 py-2 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-110 text-[#101A2C] font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" /> Buka Audit Assistant
            </button>
          </div>

          {/* AI Smart Forecast Teaser Widget */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1B2A45] to-[#243B60] border border-[#B8905A]/40 text-[#FFFDF9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#B8905A]/30 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A] shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-[#FFFDF9] font-display">
                    AI Reorder Point (ROP) & Peramalan Pasokan Medis Kritis
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    Auto-Model Aktif
                  </span>
                </div>
                <p className="text-xs text-[#EDE6D6]/80 mt-0.5">
                  Model menghitung lonjakan musiman (+45% antibiotik & cairan infus) dan memproyeksikan sisa stok sebelum kehabisan.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('aiForecast')}
              className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" /> Buka Analisis AI Lengkap
            </button>
          </div>

          {/* Minimum Stock Alert Box */}
          {lowStockItems.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-[#1B2A45]">
                    Peringatan: {lowStockItems.length} Item Stok Berada Di Bawah Batas Minimum!
                  </h4>
                  <p className="text-[#6B6656] text-[11px]">
                    Item seperti {lowStockItems.map((i) => i.name).join(', ')} memerlukan re-order ke supplier.
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenQuickPOForLowStock}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                title="Buka form Purchase Order otomatis terisi untuk semua item stok menipis"
              >
                <ShoppingCart className="w-4 h-4 text-amber-300" />
                <span>Quick PO ({lowStockItems.length} Item Menipis)</span>
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B6656]" />
                <input
                  type="text"
                  placeholder="Cari SKU / nama barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#1B2A45] text-[#FFFDF9]'
                        : cat.includes('Kadaluarsa')
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#E1D6BE]/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowAddItemModal(true)}
              className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Tambah Item Barang Baru
            </button>
          </div>

          {/* Stock Table */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
              <h3 className="font-bold text-sm text-[#1B2A45] font-display">
                Katalog Inventaris & Stok Gudang ({filteredStock.length} Item)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#22242B]">
                <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">SKU / Nama Barang</th>
                    <th className="p-2.5">Kategori</th>
                    <th className="p-2.5">Lokasi Gudang</th>
                    <th className="p-2.5">Sisa Stok</th>
                    <th className="p-2.5">Min. Stok</th>
                    <th className="p-2.5">Kadaluarsa / Batch</th>
                    <th className="p-2.5">Harga Beli</th>
                    <th className="p-2.5">Harga Jual</th>
                    <th className="p-2.5 text-center">Promo POS / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1D6BE]">
                  {filteredStock.map((item) => {
                    const isLow = item.stock <= item.minStock;
                    const daysLeft = getDaysUntilExpiry(item.expiryDate);
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 30;
                    const isClearance = item.isClearanceSale;

                    return (
                      <tr key={item.id} className={isExpiringSoon ? 'bg-rose-50/40 font-medium' : isLow ? 'bg-amber-50/50 font-medium' : ''}>
                        <td className="p-2.5 font-bold text-[#1B2A45]">
                          {item.name}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#6B6656] font-mono font-normal">{item.sku}</span>
                            {item.batchNumber && (
                              <span className="text-[9px] text-[#B8905A] font-mono bg-[#B8905A]/10 px-1 rounded">
                                {item.batchNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">{item.category}</td>
                        <td className="p-2.5">{item.warehouse}</td>
                        <td className="p-2.5 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              isLow ? 'bg-rose-100 text-rose-800 font-extrabold' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td className="p-2.5 text-[#6B6656]">
                          {item.minStock} {item.unit}
                        </td>
                        <td className="p-2.5">
                          {item.expiryDate ? (
                            <div className="space-y-0.5">
                              <span className="font-mono text-[11px] text-[#1B2A45] block">{item.expiryDate}</span>
                              {isExpiringSoon ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200">
                                  <Clock className="w-2.5 h-2.5" />
                                  {daysLeft <= 0 ? 'Hari Ini' : `${daysLeft} hr lagi`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  Aman ({daysLeft} hr)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5">Rp {item.purchasePrice.toLocaleString('id-ID')}</td>
                        <td className="p-2.5">
                          {isClearance ? (
                            <div>
                              <span className="line-through text-slate-400 text-[10px] block">
                                Rp {item.sellingPrice.toLocaleString('id-ID')}
                              </span>
                              <span className="font-black text-rose-600">
                                Rp {Math.round(item.sellingPrice * (1 - (item.clearanceDiscountPercent || clearanceDiscountValue) / 100)).toLocaleString('id-ID')}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-[#1B2A45]">
                              Rp {item.sellingPrice.toLocaleString('id-ID')}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {isExpiringSoon ? (
                              <button
                                onClick={() => handleToggleClearanceSale(item, clearanceDiscountValue)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                                  isClearance
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-2xs'
                                }`}
                              >
                                {isClearance ? (
                                  <>
                                    <Check className="w-3 h-3" /> Clearance -{item.clearanceDiscountPercent || clearanceDiscountValue}%
                                  </>
                                ) : (
                                  <>
                                    <Tag className="w-3 h-3" /> + Clearance Sale
                                  </>
                                )}
                              </button>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Menipis
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Normal
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Movements Log Tab */}
      {activeTab === 'movements' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
          <h3 className="font-bold text-sm text-[#1B2A45] font-display border-b border-[#E1D6BE] pb-2 flex items-center gap-2">
            <History className="w-4 h-4 text-[#B8905A]" /> Riwayat Log Mutasi Persediaan (Stock Movements)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2">No. Referensi</th>
                  <th className="p-2">Tanggal</th>
                  <th className="p-2">Nama Barang</th>
                  <th className="p-2">Tipe Mutasi</th>
                  <th className="p-2">Jumlah</th>
                  <th className="p-2">Asal → Tujuan</th>
                  <th className="p-2">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1D6BE]">
                {stockMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td className="p-2 font-mono font-bold text-[#B8905A]">{mov.referenceNo}</td>
                    <td className="p-2 text-[#6B6656]">{mov.date}</td>
                    <td className="p-2 font-bold text-[#1B2A45]">{mov.itemName}</td>
                    <td className="p-2 font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          mov.type === 'Masuk'
                            ? 'bg-emerald-100 text-emerald-800'
                            : mov.type === 'Keluar'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {mov.type}
                      </span>
                    </td>
                    <td className="p-2 font-bold">{mov.quantity}</td>
                    <td className="p-2 text-[#6B6656]">
                      {mov.fromWarehouse || 'Gudang Utama'} → {mov.toWarehouse || 'Gudang Tujuan'}
                    </td>
                    <td className="p-2 text-[#6B6656]">{mov.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Tab */}
      {activeTab === 'transfer' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-[#1B2A45] font-display border-b border-[#E1D6BE] pb-2 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#B8905A]" /> Transfer Stok Antar Gudang / Cabang
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">Pilih Item Barang</label>
              <select
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
              >
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Tersedia: {item.stock} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">Jumlah Transfer</label>
              <input
                type="number"
                min="1"
                value={transferQty}
                onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
              />
            </div>

            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">Dari Gudang (Asal)</label>
              <select
                value={fromWh}
                onChange={(e) => setFromWh(e.target.value)}
                className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
              >
                <option value="Gudang Utama">Gudang Utama</option>
                <option value="Pet Shop">Pet Shop</option>
                <option value="Apotek">Apotek</option>
                <option value="Grooming Supply">Grooming Supply</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">Ke Gudang (Tujuan)</label>
              <select
                value={toWh}
                onChange={(e) => setToWh(e.target.value)}
                className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
              >
                <option value="Apotek">Apotek</option>
                <option value="Pet Shop">Pet Shop</option>
                <option value="Gudang Utama">Gudang Utama</option>
                <option value="Grooming Supply">Grooming Supply</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleExecuteTransfer}
              className="px-5 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" /> Proses Transfer Stok
            </button>
          </div>
        </div>
      )}

      {/* Stock Opname Modal */}
      {showOpnameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#B8905A]" /> Penyesuaian Stock Opname Fisik
              </h3>
              <button
                onClick={() => setShowOpnameModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Item Barang</label>
                <select
                  value={opnameStockId}
                  onChange={(e) => {
                    setOpnameStockId(e.target.value);
                    const item = stockItems.find((s) => s.id === e.target.value);
                    if (item) setActualPhysicalQty(item.stock);
                  }}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                >
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Sistem: {item.stock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jumlah Fisik Sebenarnya (Audit)</label>
                <input
                  type="number"
                  value={actualPhysicalQty}
                  onChange={(e) => setActualPhysicalQty(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Catatan Opname</label>
                <textarea
                  rows={2}
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  placeholder="Keterangan selisih fisik..."
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <button
                onClick={handleExecuteOpname}
                className="w-full py-3 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Simpan Penyesuaian Opname
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddItemModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#B8905A]" /> Tambah Master Barang / Stok Baru
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Produk / Barang</label>
                <input
                  type="text"
                  placeholder="Contoh: Royal Canin Kitten 1.5kg"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Kategori</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Pasir Kucing">Pasir Kucing</option>
                    <option value="Vitamin">Vitamin</option>
                    <option value="Obat">Obat</option>
                    <option value="Aksesoris">Aksesoris</option>
                    <option value="Mainan">Mainan</option>
                    <option value="Kandang">Kandang</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Lokasi Gudang</label>
                  <select
                    value={newItemWarehouse}
                    onChange={(e) => setNewItemWarehouse(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  >
                    <option value="Gudang Utama">Gudang Utama</option>
                    <option value="Apotek">Apotek</option>
                    <option value="Pet Shop">Pet Shop</option>
                    <option value="Grooming Supply">Grooming Supply</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Min. Stok</label>
                  <input
                    type="number"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Satuan</label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    value={newItemBuyPrice}
                    onChange={(e) => setNewItemBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={newItemSellPrice}
                    onChange={(e) => setNewItemSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Tanggal Kadaluarsa (Exp Date)</label>
                  <input
                    type="date"
                    value={newItemExpiryDate}
                    onChange={(e) => setNewItemExpiryDate(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">No. Batch / Lot</label>
                  <input
                    type="text"
                    placeholder="Contoh: LOT-2026-X"
                    value={newItemBatchNumber}
                    onChange={(e) => setNewItemBatchNumber(e.target.value)}
                    className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleAddItemSubmit}
                className="w-full py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Simpan Item Barang
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick PO Pre-filled Modal */}
      <QuickPOModal
        isOpen={isQuickPOModalOpen}
        onClose={() => setIsQuickPOModalOpen(false)}
        initialItems={quickPOItems}
        customTitle={quickPOTitle}
        customNotes={quickPONotes}
        setActiveModule={setActiveModule}
      />

      {/* Stock Mutation & Digital Waybill Modal */}
      {showStockMutationModal && (
        <StockMutationModal onClose={() => setShowStockMutationModal(false)} />
      )}
    </div>
  );
};
