import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Building2,
  Calendar,
  Truck,
  Plus,
  Trash2,
  FileText,
  X,
  Clock,
  Package,
  Sparkles,
  DollarSign,
  ChevronRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { SupplyForecastMetric } from '../../utils/inventoryForecaster';

export interface QuickPOLineItem {
  itemName: string;
  sku?: string;
  category?: string;
  currentStock?: number;
  stockoutHorizonDays?: number;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface QuickPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: SupplyForecastMetric[] | QuickPOLineItem[];
  defaultSupplierName?: string;
  customTitle?: string;
  customNotes?: string;
  setActiveModule?: (module: string) => void;
}

export const QuickPOModal: React.FC<QuickPOModalProps> = ({
  isOpen,
  onClose,
  initialItems = [],
  defaultSupplierName = 'PharmaVet Nusantara',
  customTitle,
  customNotes,
  setActiveModule
}) => {
  const { suppliers = [], stockItems = [], addPurchaseOrder } = useData();
  const { addToast } = useToast();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [targetWarehouse, setTargetWarehouse] = useState<'Apotek' | 'Gudang Utama' | 'Grooming Supply'>('Apotek');
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [poNotes, setPoNotes] = useState<string>('');
  const [items, setItems] = useState<QuickPOLineItem[]>([]);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<number>(3);

  // Initialize and populate form when modal opens or initialItems change
  useEffect(() => {
    if (!isOpen) return;

    // Set initial supplier
    const matchedSupplier = suppliers.find(
      (s) => s.name.toLowerCase() === defaultSupplierName.toLowerCase()
    ) || suppliers[0];
    if (matchedSupplier) {
      setSelectedSupplierId(matchedSupplier.id);
    }

    // Format line items from initialItems
    if (initialItems.length > 0) {
      const formatted: QuickPOLineItem[] = initialItems.map((item: any) => {
        const qty = item.suggestedReorderQty || item.quantity || 10;
        const price = item.unitPrice || item.purchasePrice || 50000;
        return {
          itemName: item.name ? `${item.name}${item.sku ? ` [${item.sku}]` : ''}` : item.itemName || 'Medical Item',
          sku: item.sku || '',
          category: item.category || 'Farmasi Medis',
          currentStock: item.currentStock ?? item.stock ?? undefined,
          stockoutHorizonDays: item.stockoutHorizonDays ?? undefined,
          quantity: qty,
          unit: item.unit || 'Unit',
          unitPrice: price,
          total: qty * price
        };
      });
      setItems(formatted);
    } else {
      // Default fallback item if empty
      const defaultStock = stockItems[0];
      setItems([
        {
          itemName: defaultStock?.name || 'Ringer Lactate Infusion 500ml [MED-RL-500]',
          sku: defaultStock?.sku || 'MED-RL-500',
          category: 'Cairan & Infus IV',
          currentStock: defaultStock?.stock ?? 4,
          stockoutHorizonDays: 2,
          quantity: 20,
          unit: defaultStock?.unit || 'Kolf',
          unitPrice: defaultStock?.purchasePrice || 28000,
          total: 20 * (defaultStock?.purchasePrice || 28000)
        }
      ]);
    }

    // Auto-generate note
    if (customNotes) {
      setPoNotes(customNotes);
    } else {
      const criticalCount = initialItems.length;
      setPoNotes(
        `[PREDICTIVE QUICK PO] Pemesanan darurat otomatis untuk ${criticalCount} pasokan medis kritis dengan estimasi stok habis < 7 hari. Mohon prioritas pengiriman ekspres ke klinik.`
      );
    }
  }, [isOpen, initialItems, defaultSupplierName, customNotes, suppliers, stockItems]);

  // Escape key handler to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = includeTax ? Math.round(subtotal * 0.11) : 0;
  const grandTotal = subtotal + taxAmount;

  const handleQuantityChange = (index: number, newQty: number) => {
    const validQty = Math.max(1, newQty || 1);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity: validQty, total: validQty * item.unitPrice }
          : item
      )
    );
  };

  const handleUnitPriceChange = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice || 0);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, unitPrice: validPrice, total: item.quantity * validPrice }
          : item
      )
    );
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      addToast('PO harus memiliki minimal 1 item pasokan.', 'warning');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = () => {
    const fallbackStock = stockItems.find((s) => !items.some((i) => i.sku === s.sku)) || stockItems[0];
    const newItem: QuickPOLineItem = {
      itemName: fallbackStock ? `${fallbackStock.name} [${fallbackStock.sku}]` : 'Amoxicillin Trihydrate Inj 100ml',
      sku: fallbackStock?.sku || 'MED-AMX-100',
      category: fallbackStock?.category || 'Obat',
      currentStock: fallbackStock?.stock || 5,
      quantity: 10,
      unit: fallbackStock?.unit || 'Vial',
      unitPrice: fallbackStock?.purchasePrice || 85000,
      total: 10 * (fallbackStock?.purchasePrice || 85000)
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleSubmitPO = (redirectToPurchasing: boolean = false) => {
    if (items.length === 0) {
      addToast('Daftar item tidak boleh kosong.', 'error');
      return;
    }

    const supplierName = currentSupplier?.name || defaultSupplierName || 'PharmaVet Nusantara';

    const formattedItems = items.map((i) => ({
      itemName: i.itemName,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice
    }));

    addPurchaseOrder({
      supplierName,
      items: formattedItems,
      totalAmount: grandTotal,
      notes: `${poNotes}${includeTax ? ' (Termasuk PPN 11%)' : ''} [Gudang Tujuan: ${targetWarehouse}]`
    });

    addToast(
      `✓ Purchase Order Cepat (PO) berhasil diterbitkan ke ${supplierName} senilai Rp ${grandTotal.toLocaleString('id-ID')}!`,
      'success'
    );

    onClose();

    if (redirectToPurchasing && setActiveModule) {
      setActiveModule('purchasing');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E1D6BE] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#1B2A45] via-[#223659] to-[#1B2A45] px-5 py-4 text-white flex items-center justify-between border-b border-[#B8905A]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-[#1B2A45] flex items-center justify-center font-black shadow-md border border-amber-300 shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {customTitle || 'Quick Purchase Order (PO) Form — Pre-filled Critical Supplies'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-400/50 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-300" /> Auto Pre-filled
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Formulir PO terisi otomatis berdasarkan hasil peramalan pasokan medis kritis berisiko habis dalam 7 hari.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Supplier & Warehouse Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-[#FAF7F2] p-4 rounded-xl border border-[#E1D6BE]">
            <div>
              <label className="font-bold text-[#1B2A45] block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#B8905A]" /> Vendor / Supplier Utama
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full p-2.5 bg-white rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45] focus:outline-none focus:ring-2 focus:ring-[#1B2A45]/30 cursor-pointer"
              >
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.category || 'Vendor Medis'})
                  </option>
                ))}
              </select>
              {currentSupplier && (
                <p className="text-[10px] text-[#6B6656] mt-1 truncate">
                  Kontak: {currentSupplier.contactPerson} ({currentSupplier.phone})
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-[#1B2A45] block mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#B8905A]" /> Gudang Destinasi
              </label>
              <select
                value={targetWarehouse}
                onChange={(e) => setTargetWarehouse(e.target.value as any)}
                className="w-full p-2.5 bg-white rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-none focus:ring-2 focus:ring-[#1B2A45]/30 cursor-pointer"
              >
                <option value="Apotek">Apotek & Farmasi Rawat Inap</option>
                <option value="Gudang Utama">Gudang Utama Logistik</option>
                <option value="Grooming Supply">Grooming & Salon Supply</option>
              </select>
              <p className="text-[10px] text-[#6B6656] mt-1">Stok akan langsung masuk ke gudang ini setelah GRN.</p>
            </div>

            <div>
              <label className="font-bold text-[#1B2A45] block mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#B8905A]" /> Estimasi Pengiriman (Lead Time)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={estimatedDeliveryDays}
                  onChange={(e) => setEstimatedDeliveryDays(parseInt(e.target.value) || 1)}
                  className="w-20 p-2.5 bg-white rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45] text-center"
                />
                <span className="text-xs font-semibold text-[#1B2A45]">Hari Kerja</span>
              </div>
              <p className="text-[10px] text-rose-700 font-semibold mt-1">
                Target tiba sebelum stok kritis habis (buffer aman).
              </p>
            </div>
          </div>

          {/* Pre-filled Critical Items List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-[#1B2A45] tracking-tight">
                  Daftar Pasokan Kritis yang Diorder ({items.length} Item)
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                  Pre-filled Otomatis
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-2.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-[#E1D6BE] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item Lain</span>
              </button>
            </div>

            {/* Table */}
            <div className="border border-[#E1D6BE] rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1B2A45] text-[#FFFDF9] text-[11px] font-bold">
                    <tr>
                      <th className="p-2.5 pl-3">Item Medis & Status Kritis</th>
                      <th className="p-2.5 text-center">Sisa Stok</th>
                      <th className="p-2.5 text-center w-28">Jumlah Pesan</th>
                      <th className="p-2.5 text-center">Satuan</th>
                      <th className="p-2.5 text-right">Harga Satuan (Rp)</th>
                      <th className="p-2.5 text-right">Subtotal (Rp)</th>
                      <th className="p-2.5 text-center w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1D6BE]/60">
                    {items.map((item, idx) => {
                      const isUnder7Days = item.stockoutHorizonDays !== undefined && item.stockoutHorizonDays <= 7;
                      return (
                        <tr key={idx} className="hover:bg-[#FAF7F2] transition-colors">
                          <td className="p-2.5 pl-3">
                            <div className="font-bold text-[#1B2A45]">{item.itemName}</div>
                            <div className="flex items-center gap-2 text-[10px] text-[#6B6656] mt-0.5">
                              {item.category && (
                                <span className="bg-[#E1D6BE]/40 px-1.5 py-0.5 rounded text-[#1B2A45] font-medium">
                                  {item.category}
                                </span>
                              )}
                              {isUnder7Days && (
                                <span className="text-rose-700 font-bold flex items-center gap-0.5">
                                  <AlertOctagon className="w-3 h-3" />
                                  Habis dlm ~{item.stockoutHorizonDays} hari
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-2.5 text-center font-mono font-bold text-[#1B2A45]">
                            {item.currentStock !== undefined ? (
                              <span className={item.currentStock <= 5 ? 'text-rose-700 font-black' : 'text-[#1B2A45]'}>
                                {item.currentStock} {item.unit}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>

                          <td className="p-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-black flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                                className="w-12 p-1 bg-white border border-[#E1D6BE] rounded text-center font-bold text-[#1B2A45]"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-black flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="p-2.5 text-center font-semibold text-[#6B6656]">
                            {item.unit}
                          </td>

                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={item.unitPrice}
                              onChange={(e) => handleUnitPriceChange(idx, parseInt(e.target.value) || 0)}
                              className="w-24 p-1 bg-white border border-[#E1D6BE] rounded text-right font-mono font-semibold text-[#1B2A45]"
                            />
                          </td>

                          <td className="p-2.5 text-right font-mono font-bold text-[#1B2A45]">
                            Rp {(item.quantity * item.unitPrice).toLocaleString('id-ID')}
                          </td>

                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              title="Hapus baris item"
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notes & Justification */}
          <div>
            <label className="font-bold text-[#1B2A45] block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#B8905A]" /> Catatan PO & Justifikasi Medis Kritis
            </label>
            <textarea
              rows={2}
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-[#E1D6BE] text-[#1B2A45] font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1B2A45]/30"
              placeholder="Catatan untuk vendor supplier atau bagian gudang..."
            />
          </div>

          {/* Calculation & Summary Box */}
          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E1D6BE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTax}
                  onChange={(e) => setIncludeTax(e.target.checked)}
                  className="rounded border-[#E1D6BE] text-[#1B2A45] focus:ring-[#1B2A45]"
                />
                <span className="font-bold text-xs text-[#1B2A45]">Kenakan Pajak Pertambahan Nilai (PPN 11%)</span>
              </label>
              <p className="text-[11px] text-[#6B6656]">
                Total {items.length} jenis item pasokan ({items.reduce((sum, i) => sum + i.quantity, 0)} total unit).
              </p>
            </div>

            <div className="w-full sm:w-auto text-right space-y-1 bg-white p-3 rounded-lg border border-[#E1D6BE]/80 min-w-[240px]">
              <div className="flex justify-between text-[11px] text-[#6B6656]">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-[#1B2A45]">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              {includeTax && (
                <div className="flex justify-between text-[11px] text-amber-800">
                  <span>PPN 11%:</span>
                  <span className="font-mono font-bold">Rp {taxAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#1B2A45] pt-1 border-t border-[#E1D6BE]">
                <span>Total PO:</span>
                <span className="font-mono text-emerald-800">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF7F2] px-5 py-3.5 border-t border-[#E1D6BE] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#6B6656] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#B8905A] shrink-0" />
            <span>PO akan langsung tercatat dengan status <strong>Draft</strong> pada modul Purchasing.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-[#1B2A45] font-bold text-xs rounded-xl border border-[#E1D6BE] transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => handleSubmitPO(false)}
              className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <span>Terbitkan &amp; Simpan PO</span>
            </button>

            {setActiveModule && (
              <button
                type="button"
                onClick={() => handleSubmitPO(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Simpan &amp; Buka Purchasing</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
