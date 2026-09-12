import React, { useState } from 'react';
import {
  Truck,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Package,
  Calendar,
  User,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Send,
  Printer
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { StockMutationTransfer, StockItem } from '../../types';

interface StockMutationModalProps {
  onClose: () => void;
}

export const StockMutationModal: React.FC<StockMutationModalProps> = ({ onClose }) => {
  const { stockItems = [], branches = [], addAuditLog, addStockMovement, updateStockItem } = useData();
  const { addToast } = useToast();

  const [sourceBranchId, setSourceBranchId] = useState<string>(branches[0]?.id || 'b1');
  const [destBranchId, setDestBranchId] = useState<string>(branches[1]?.id || 'b2');
  const [driverName, setDriverName] = useState<string>('Agus Supriyadi (Kurir Internal)');
  const [vehiclePlate, setVehiclePlate] = useState<string>('B 9482 KVM (Blind Van)');
  const [transferNotes, setTransferNotes] = useState<string>('Transfer stok pemenuhan reorder point pakan dan antibiotik klinik cabang.');

  const [transferItems, setTransferItems] = useState<
    Array<{
      itemId: string;
      itemName: string;
      sku: string;
      quantity: number;
      unit: string;
      batchNumber: string;
    }>
  >([
    {
      itemId: stockItems[0]?.id || '1',
      itemName: stockItems[0]?.name || 'Royal Canin Recovery 195g',
      sku: stockItems[0]?.sku || 'RC-REC-01',
      quantity: 12,
      unit: stockItems[0]?.unit || 'Kaleng',
      batchNumber: stockItems[0]?.batchNumber || 'B-9982'
    }
  ]);

  const sourceBranch = branches.find((b) => b.id === sourceBranchId) || branches[0];
  const destBranch = branches.find((b) => b.id === destBranchId) || branches[1] || branches[0];

  const handleAddItem = () => {
    const defaultItem = stockItems[0];
    if (!defaultItem) return;
    setTransferItems((prev) => [
      ...prev,
      {
        itemId: defaultItem.id,
        itemName: defaultItem.name,
        sku: defaultItem.sku,
        quantity: 5,
        unit: defaultItem.unit,
        batchNumber: defaultItem.batchNumber || 'BATCH-01'
      }
    ]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = stockItems.find((s) => s.id === itemId);
    if (!selected) return;
    setTransferItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        itemId: selected.id,
        itemName: selected.name,
        sku: selected.sku,
        quantity: 1,
        unit: selected.unit,
        batchNumber: selected.batchNumber || 'BATCH-01'
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setTransferItems((prev) => {
      const copy = [...prev];
      copy[index].quantity = Math.max(1, qty);
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setTransferItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitTransfer = () => {
    if (sourceBranchId === destBranchId) {
      addToast('Cabang asal dan cabang tujuan tidak boleh sama!', 'error');
      return;
    }
    if (transferItems.length === 0) {
      addToast('Tambahkan minimal 1 item untuk transfer mutasi!', 'error');
      return;
    }

    // Validasi stok cukup sebelum surat jalan diterbitkan. Catatan: StockItem
    // saat ini belum punya kartu stok per-cabang (hanya per-gudang), jadi
    // kuantitas dikurangi dari kartu stok pusat yang dipilih — supaya jumlah
    // yang dimutasi benar-benar keluar dari stok yang tercatat, bukan cuma
    // tercatat di log tanpa mengubah stok sama sekali.
    for (const it of transferItems) {
      const stock = stockItems.find((s) => s.id === it.itemId);
      if (!stock || stock.stock < it.quantity) {
        addToast(`Stok ${it.itemName} tidak mencukupi untuk mutasi (tersedia: ${stock?.stock ?? 0} ${it.unit}).`, 'error');
        return;
      }
    }

    const transferNo = `MUT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const suratJalanNo = `SJ-${transferNo}`;

    // Kurangi stok & catat pergerakan
    transferItems.forEach((it) => {
      const stock = stockItems.find((s) => s.id === it.itemId);
      if (stock && updateStockItem) {
        updateStockItem(stock.id, { stock: stock.stock - it.quantity });
      }
      if (addStockMovement) {
        addStockMovement({
          itemId: it.itemId,
          itemName: it.itemName,
          type: 'Transfer',
          quantity: it.quantity,
          fromWarehouse: sourceBranch?.name || 'Gudang Asal',
          toWarehouse: destBranch?.name || 'Gudang Tujuan',
          referenceNo: suratJalanNo,
          operator: 'Logistik Pusat'
        });
      }
    });

    if (addAuditLog) {
      addAuditLog({
        userName: 'Logistik Pusat',
        userRole: 'admin',
        action: 'Tambah',
        module: 'Inventaris / Mutasi',
        target: `Surat Jalan Mutasi ${suratJalanNo}`,
        details: `Mutasi stok antar cabang ${sourceBranch?.name} ➔ ${destBranch?.name} dengan ${transferItems.length} item berhasil diterbitkan.`
      });
    }

    addToast(`Surat Jalan Mutasi ${suratJalanNo} berhasil dibuat dan dikirim ke Cabang ${destBranch?.name}!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#B8905A]/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#1E3050] text-white px-5 py-4 flex items-center justify-between border-b border-[#B8905A]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display">
                  Mutasi & Transfer Stok Antar Cabang
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40">
                  Surat Jalan Digital
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE]/80">
                Penerbitan surat jalan transfer stok barang, obat, atau pakan antar gudang dan cabang klinik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#E1D6BE]/70 hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#101A2C]">
          {/* Branch Source & Destination Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
                Cabang Asal Pengirim (Gudang Sumber):
              </label>
              <select
                value={sourceBranchId}
                onChange={(e) => setSourceBranchId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.address})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Cabang Tujuan Penerima (Gudang Target):
              </label>
              <select
                value={destBranchId}
                onChange={(e) => setDestBranchId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.address})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Driver & Logistics Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Kurir / Driver Ekspedisi</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kendaraan & No. Polisi</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
              />
            </div>
          </div>

          {/* Item Table List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#B8905A]" />
                Daftar Barang yang Dimutasi:
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-[#B8905A] hover:text-[#9E7848] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Baris Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Produk / Barang</th>
                    <th className="p-3 w-28">Jumlah (Qty)</th>
                    <th className="p-3 w-24">Satuan</th>
                    <th className="p-3 w-32">Batch No</th>
                    <th className="p-3 w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {transferItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <select
                          value={item.itemId}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900"
                        >
                          {stockItems.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (Stok: {s.stock} {s.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-indigo-700 text-center"
                        />
                      </td>
                      <td className="p-2.5 text-slate-700 font-semibold">{item.unit}</td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTransferItems((prev) => {
                              const copy = [...prev];
                              copy[idx].batchNumber = val;
                              return copy;
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={transferItems.length === 1}
                          className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Pengiriman</label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmitTransfer}
            className="px-6 py-2.5 bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#B8905A] text-white font-black rounded-xl text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-400" />
            Terbitkan Surat Jalan & Kirim Barang
          </button>
        </div>
      </div>
    </div>
  );
};
