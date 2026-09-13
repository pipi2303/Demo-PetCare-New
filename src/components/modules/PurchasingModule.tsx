import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import {
  Truck,
  ShoppingCart,
  Plus,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  Clock,
  Package,
  Trash2,
  Search,
  Check,
  ChevronRight,
  Receipt
} from 'lucide-react';

export const PurchasingModule: React.FC = () => {
  const {
    stockItems = [],
    suppliers = [],
    purchaseOrders = [],
    addPurchaseOrder,
    receivePurchaseOrder,
    addSupplier,
    deleteSupplier
  } = useData();

  const { addToast } = useToast();
  const { can } = usePermissions();
  const canDeleteSupplier = can('purchasing', 'delete');

  const [activeTab, setActiveTab] = useState<'po' | 'suppliers'>('po');
  const [searchQuery, setSearchQuery] = useState('');

  // New PO Modal state
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [poNotes, setPoNotes] = useState('');
  const [poLineItems, setPoLineItems] = useState([
    { itemName: stockItems[0]?.name || 'Royal Canin Adult 2kg', quantity: 10, unit: 'Bag', unitPrice: stockItems[0]?.purchasePrice || 180000 }
  ]);

  // New Supplier Modal state
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCategory, setSupCategory] = useState('Obat & Medis');

  // Low stock calculation
  const lowStockItems = stockItems.filter((i) => i.stock <= i.minStock);

  // Auto-Generate PO for all low stock items
  const handleAutoGeneratePO = () => {
    if (lowStockItems.length === 0) {
      addToast('Semua stok barang & obat saat ini dalam kondisi aman.', 'info');
      return;
    }

    const supplier = suppliers[0];
    const itemsToOrder = lowStockItems.map((item) => {
      const reorderQty = Math.max(item.minStock * 2, 10);
      return {
        itemName: item.name,
        quantity: reorderQty,
        unit: item.unit,
        unitPrice: item.purchasePrice,
        total: reorderQty * item.purchasePrice
      };
    });

    const totalAmount = itemsToOrder.reduce((sum, i) => sum + i.total, 0);

    addPurchaseOrder({
      supplierName: supplier?.name || 'PT Medika Veteriner Utama',
      items: itemsToOrder,
      totalAmount,
      notes: `Auto-generated Re-Order untuk ${lowStockItems.length} item stok kritis.`
    });

    addToast(`Purchase Order (PO) otomatis dibuat senilai Rp ${totalAmount.toLocaleString('id-ID')}!`, 'success');
  };

  // Add line item in PO Modal
  const handleAddLineItem = () => {
    setPoLineItems([
      ...poLineItems,
      { itemName: stockItems[0]?.name || 'Produk', quantity: 5, unit: 'Pcs', unitPrice: 100000 }
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    setPoLineItems(poLineItems.filter((_, i) => i !== index));
  };

  // Submit Manual PO
  const handleCreateManualPO = () => {
    const supplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
    const itemsFormatted = poLineItems.map((i) => ({
      itemName: i.itemName,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice
    }));

    const totalAmount = itemsFormatted.reduce((sum, i) => sum + i.total, 0);

    addPurchaseOrder({
      supplierName: supplier.name,
      items: itemsFormatted,
      totalAmount,
      notes: poNotes || 'Pembelian rutin inventaris klinik'
    });

    setShowNewPoModal(false);
    setPoNotes('');
    addToast(`Purchase Order baru ke ${supplier.name} berhasil diterbitkan!`, 'success');
  };

  // Receive Goods (GRN) — guard klik-ganda: `po.status` berubah lewat
  // state React yang async, jadi klik ganda sebelum re-render bisa memicu
  // receivePurchaseOrder dua kali & menambah stok dobel untuk PO yang sama.
  const [receivingPoIds, setReceivingPoIds] = useState<Set<string>>(new Set());
  const handleReceivePO = (poId: string, poNo: string) => {
    if (receivingPoIds.has(poId)) return;
    setReceivingPoIds((prev) => new Set(prev).add(poId));
    receivePurchaseOrder(poId);
    addToast(`Barang untuk PO #${poNo} berhasil diterima! Stok otomatis bertambah di gudang.`, 'success');
  };

  // Add Supplier
  const handleAddSupplierSubmit = () => {
    if (!supName) {
      addToast('Nama supplier wajib diisi.', 'error');
      return;
    }
    addSupplier({
      name: supName,
      contactPerson: supContact || 'Staf Sales',
      phone: supPhone || '08123456789',
      email: supEmail || 'sales@supplier.com',
      address: supAddress || 'Jakarta',
      category: supCategory
    });

    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setShowNewSupplierModal(false);
    addToast(`Supplier vendor "${supName}" berhasil ditambahkan!`, 'success');
  };

  // Filtered POs
  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.poNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Truck}
        title="Purchasing (PO), Penerimaan Barang & Direktori Supplier"
        description="Auto-generate PO stok kritis 1-click, konfirmasi penerimaan barang (GRN), dan manajemen daftar vendor supplier."
        badges={[
          { label: 'Pengadaan & Vendor', variant: 'gold' },
          { label: `${purchaseOrders.length} PO Terbit`, variant: 'blue' },
          { label: `${suppliers.length} Supplier Mitra`, variant: 'emerald' }
        ]}
        tabs={[
          { id: 'po', label: 'Purchase Orders', icon: ShoppingCart, count: purchaseOrders.length },
          { id: 'suppliers', label: 'Vendor Supplier', icon: Building2, count: suppliers.length }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {activeTab === 'po' && (
        <div className="space-y-5">
          {/* Low stock alert banner */}
          {lowStockItems.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-[#1B2A45]">
                    Peringatan Re-Order: {lowStockItems.length} Item Membutuhkan Pembelian Ulang!
                  </h4>
                  <p className="text-[#6B6656] text-[11px]">
                    Termasuk: {lowStockItems.map((i) => i.name).join(', ')}.
                  </p>
                </div>
              </div>

              <button
                onClick={handleAutoGeneratePO}
                className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 shrink-0 transition-all"
              >
                <ShoppingCart className="w-4 h-4 text-[#D9B98A]" /> Auto-Generate PO (1-Click)
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B6656]" />
              <input
                type="text"
                placeholder="Cari nomor PO atau supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] focus:outline-hidden font-medium"
              />
            </div>

            <button
              onClick={() => setShowNewPoModal(true)}
              className="px-4 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" /> Buat Purchase Order Baru
            </button>
          </div>

          {/* PO List Cards */}
          <div className="space-y-3">
            {filteredPOs.map((po) => {
              const isReceived = po.status === 'Diterima';
              return (
                <div
                  key={po.id}
                  className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#E1D6BE] pb-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-[#1B2A45] font-mono">{po.poNo}</span>
                      <span className="font-bold text-[#1B2A45]">{po.supplierName}</span>
                      <span className="text-[10px] text-[#6B6656]">Dibuat: {po.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                          isReceived
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {po.status}
                      </span>
                      <span className="font-extrabold text-sm text-[#1B2A45]">
                        Rp {po.totalAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px] uppercase">
                        <tr>
                          <th className="p-2">Nama Barang</th>
                          <th className="p-2">Kuantitas</th>
                          <th className="p-2">Harga Satuan</th>
                          <th className="p-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E1D6BE]">
                        {po.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold text-[#1B2A45]">{item.itemName}</td>
                            <td className="p-2 text-[#22242B]">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-2 text-[#6B6656]">
                              Rp {item.unitPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="p-2 font-bold text-[#1B2A45]">
                              Rp {item.total.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {po.notes && (
                    <p className="text-[11px] text-[#6B6656] italic">Catatan PO: {po.notes}</p>
                  )}

                  {/* Actions */}
                  {!isReceived && (
                    <div className="pt-2 border-t border-[#E1D6BE]/60 flex justify-end">
                      <button
                        onClick={() => handleReceivePO(po.id, po.poNo)}
                        disabled={receivingPoIds.has(po.id)}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Konfirmasi Penerimaan Barang (GRN)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Supplier Directory Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#B8905A]" /> Direktori Vendor & Supplier Terdaftar
            </h3>

            <button
              onClick={() => setShowNewSupplierModal(true)}
              className="px-3.5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Supplier Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3 relative flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                    <div>
                      <span className="text-[10px] font-mono text-[#B8905A] font-bold">{sup.code}</span>
                      <h4 className="font-bold text-sm text-[#1B2A45]">{sup.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#1B2A45] text-[#D9B98A] text-[10px] font-bold">
                      {sup.category}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#22242B]">
                    <div className="flex items-center gap-2 text-[#6B6656]">
                      <Phone className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>{sup.contactPerson} ({sup.phone})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6B6656]">
                      <Mail className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>{sup.email}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[#6B6656]">
                      <MapPin className="w-3.5 h-3.5 text-[#B8905A] shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{sup.address}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E1D6BE] flex justify-between items-center text-xs">
                  <span className="text-[10px] text-[#6B6656] font-medium">Syarat Pembayaran: TOP 30 Hari</span>
                  <button
                    onClick={() => {
                      if (!canDeleteSupplier) {
                        addToast('Akun/grup Anda tidak memiliki hak "Hapus" untuk Purchasing. Hubungi Owner/Admin.', 'error');
                        return;
                      }
                      if (!window.confirm(`Hapus supplier "${sup.name}"? PO yang sudah tercatat dari supplier ini tidak akan otomatis terhapus.`)) return;
                      deleteSupplier(sup.id);
                      addToast(`Supplier ${sup.name} berhasil dihapus.`, 'info');
                    }}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    title="Hapus Supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal New PO */}
      {showNewPoModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewPoModal(false);
          }}
        >
          <div 
            className="max-w-lg w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#B8905A]" /> Terbitkan Purchase Order Manual
              </h3>
              <button
                onClick={() => setShowNewPoModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Pilih Vendor Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#1B2A45]">Daftar Baris Barang PO</label>
                  <button
                    onClick={handleAddLineItem}
                    className="text-[11px] font-bold text-[#B8905A] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambah Baris
                  </button>
                </div>

                {poLineItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={item.itemName}
                        onChange={(e) => {
                          const name = e.target.value;
                          const found = stockItems.find((s) => s.name === name);
                          const updated = [...poLineItems];
                          updated[idx].itemName = name;
                          if (found) updated[idx].unitPrice = found.purchasePrice;
                          setPoLineItems(updated);
                        }}
                        className="flex-1 p-2 bg-[#FFFDF9] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                      >
                        {stockItems.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveLineItem(idx)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-[#6B6656]">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...poLineItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setPoLineItems(updated);
                          }}
                          className="w-full p-1.5 bg-[#FFFDF9] rounded border border-[#E1D6BE] font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6B6656]">Satuan</label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => {
                            const updated = [...poLineItems];
                            updated[idx].unit = e.target.value;
                            setPoLineItems(updated);
                          }}
                          className="w-full p-1.5 bg-[#FFFDF9] rounded border border-[#E1D6BE]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#6B6656]">Harga Beli (Rp)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...poLineItems];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setPoLineItems(updated);
                          }}
                          className="w-full p-1.5 bg-[#FFFDF9] rounded border border-[#E1D6BE] font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Catatan / Keterangan Pembelian</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Misal: Mohon pengiriman sebelum akhir minggu..."
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <button
                onClick={handleCreateManualPO}
                className="w-full py-3 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Terbitkan PO Resmi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal New Supplier */}
      {showNewSupplierModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewSupplierModal(false);
          }}
        >
          <div 
            className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#B8905A]" /> Tambah Supplier Vendor Baru
              </h3>
              <button
                onClick={() => setShowNewSupplierModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Perusahaan Supplier</label>
                <input
                  type="text"
                  placeholder="PT Medika Veteriner..."
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Alamat Email Sales</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Alamat Kantor / Gudang Supplier</label>
                <textarea
                  rows={2}
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <button
                onClick={handleAddSupplierSubmit}
                className="w-full py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Simpan Data Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
