import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Trash2,
  Syringe,
  Package,
  Calendar,
  Home,
  CreditCard,
  Settings,
  Sparkles,
  Check,
  Smartphone,
  Filter,
  Plus,
  ShoppingCart,
  X,
  Eye,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { AppNotification } from '../../types';
import { QuickPOModal, QuickPOLineItem } from '../common/QuickPOModal';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { generateAllCriticalSuppliesForecast } from '../../utils/inventoryForecaster';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';

interface NotificationsModuleProps {
  setActiveModule?: (module: string) => void;
}

export const NotificationsModule: React.FC<NotificationsModuleProps> = ({ setActiveModule }) => {
  const { notifications = [], markNotificationRead, addNotification, branches = [], activeBranchId, stockItems = [], pets = [], customers = [] } = useData();
  const { addToast } = useToast();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedNotifForDetail, setSelectedNotifForDetail] = useState<AppNotification | null>(null);

  // Quick PO Modal state for Stock Notifications
  const [isQuickPOModalOpen, setIsQuickPOModalOpen] = useState(false);
  const [quickPOItems, setQuickPOItems] = useState<QuickPOLineItem[]>([]);
  const [quickPOTitle, setQuickPOTitle] = useState<string>('');
  const [quickPONotes, setQuickPONotes] = useState<string>('');

  // Close active modals on Escape key
  useEffect(() => {
    const hasActiveModal = showBroadcastModal || selectedNotifForDetail !== null;
    if (!hasActiveModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowBroadcastModal(false);
        setSelectedNotifForDetail(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBroadcastModal, selectedNotifForDetail]);

  // Handle Quick PO from Notification
  const handleOpenQuickPOFromNotif = (notif: AppNotification) => {
    // Attempt to match stock item from notif title/message
    const matchedStock = stockItems.find((s) =>
      notif.message.toLowerCase().includes(s.name.toLowerCase()) ||
      notif.title.toLowerCase().includes(s.name.toLowerCase()) ||
      (s.sku && notif.message.toLowerCase().includes(s.sku.toLowerCase()))
    );

    let itemsForPO: QuickPOLineItem[] = [];

    if (matchedStock) {
      const reorderQty = Math.max(matchedStock.minStock * 2, 10);
      itemsForPO = [
        {
          itemName: `${matchedStock.name} [${matchedStock.sku}]`,
          sku: matchedStock.sku,
          category: matchedStock.category,
          currentStock: matchedStock.stock,
          stockoutHorizonDays: matchedStock.stock <= matchedStock.minStock ? 3 : 6,
          quantity: reorderQty,
          unit: matchedStock.unit,
          unitPrice: matchedStock.purchasePrice,
          total: reorderQty * matchedStock.purchasePrice
        }
      ];
    } else {
      // Find critical low stock items or use predictive forecast
      const criticalForecast = generateAllCriticalSuppliesForecast(stockItems, 'pancaroba_hujan', 0, 0.98);
      const criticals = criticalForecast.items.filter(i => i.stockoutHorizonDays <= 7);

      if (criticals.length > 0) {
        itemsForPO = criticals.map(i => ({
          itemName: `${i.name} [${i.sku}]`,
          sku: i.sku,
          category: i.category,
          currentStock: i.currentStock,
          stockoutHorizonDays: i.stockoutHorizonDays,
          quantity: i.suggestedReorderQty,
          unit: i.unit,
          unitPrice: i.unitPrice,
          total: i.suggestedReorderQty * i.unitPrice
        }));
      } else {
        const defaultItem = stockItems.find(s => s.stock <= s.minStock) || stockItems[0];
        itemsForPO = [
          {
            itemName: defaultItem ? `${defaultItem.name} [${defaultItem.sku}]` : 'Amoxicillin 250mg [MED-AMX-250]',
            sku: defaultItem?.sku || 'MED-AMX-250',
            category: defaultItem?.category || 'Obat',
            currentStock: defaultItem?.stock ?? 12,
            stockoutHorizonDays: 4,
            quantity: 20,
            unit: defaultItem?.unit || 'Tablet',
            unitPrice: defaultItem?.purchasePrice || 3500,
            total: 20 * (defaultItem?.purchasePrice || 3500)
          }
        ];
      }
    }

    setQuickPOItems(itemsForPO);
    setQuickPOTitle(`Quick Purchase Order — ${notif.title}`);
    setQuickPONotes(`[NOTIF ALERT REORDER] Berdasarkan notifikasi klinik: "${notif.message}". Segera proses pengiriman.`);
    setIsQuickPOModalOpen(true);
  };

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState<'Tinggi' | 'Sedang' | 'Rendah'>('Sedang');
  const [broadcastType, setBroadcastType] = useState<AppNotification['type']>('Sistem');

  // Fallback initial notifications if empty
  const defaultNotifications: AppNotification[] = [
    {
      id: 'notif-1',
      title: 'Jadwal Booster Vaksinasi Rabies',
      message: 'Kucing Milo (Pemilik: Budi Santoso) jatuh tempo vaksinasi booster tahunan dalam 3 hari.',
      type: 'Vaksin',
      priority: 'Tinggi',
      createdAt: '2026-08-13 09:30',
      isRead: false
    },
    {
      id: 'notif-2',
      title: 'Peringatan Stok Obat Menipis',
      message: 'Amoxicillin 250mg tersisa 12 tablet (di bawah batas minimum stok 20 tablet). Segera buat PO.',
      type: 'Stok',
      priority: 'Tinggi',
      createdAt: '2026-08-13 08:15',
      isRead: false
    },
    {
      id: 'notif-3',
      title: 'Janji Temu Poli Bedah Hari Ini',
      message: 'Anjing Bruno terjadwal operasi steril pukul 14:00 WIB bersama Drh. Ratna Permata.',
      type: 'Booking',
      priority: 'Sedang',
      createdAt: '2026-08-13 07:45',
      isRead: true
    },
    {
      id: 'notif-4',
      title: 'Check-In Pet Hotel Presidential Suite',
      message: 'Kucing Luna telah check-in di Room VIP-A2 untuk durasi menginap 3 hari.',
      type: 'Hotel',
      priority: 'Rendah',
      createdAt: '2026-08-12 16:20',
      isRead: true
    }
  ];

  const allNotifications = notifications.length > 0 ? notifications : defaultNotifications;

  const filteredNotifications = allNotifications.filter((n) => {
    const matchType = filterType === 'all' || n.type === filterType;
    const matchRead =
      filterRead === 'all' || (filterRead === 'unread' && !n.isRead) || (filterRead === 'read' && n.isRead);
    return matchType && matchRead;
  });

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    allNotifications.forEach((n) => {
      if (!n.isRead) markNotificationRead(n.id);
    });
    addToast('Seluruh notifikasi telah ditandai sebagai dibaca.', 'success');
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      addToast('Judul dan pesan notifikasi wajib diisi!', 'warning');
      return;
    }

    addNotification({
      title: broadcastTitle,
      message: broadcastMessage,
      type: broadcastType,
      priority: broadcastPriority
    });

    setShowBroadcastModal(false);
    setBroadcastTitle('');
    setBroadcastMessage('');
    addToast('Notifikasi siaran internal klinik berhasil dikirim!', 'success');
  };

  // AppNotification tidak menyimpan customerId/petId, hanya teks bebas (mis. "Milo (Andri
  // Santoso) dijadwalkan..."), jadi nomor WA pemilik dicari dengan mencocokkan nama hewan
  // yang disebut di judul/pesan notifikasi terhadap data pets & customers asli di Master Data.
  const resolveNotificationContact = (n: AppNotification): { phone: string; ownerName: string; petName: string } | null => {
    const haystack = `${n.title} ${n.message}`.toLowerCase();
    const matchedPet = pets.find((p) => p.name && haystack.includes(p.name.toLowerCase()));
    if (!matchedPet) return null;
    const owner = customers.find((c) => c.id === matchedPet.customerId);
    if (!owner?.phone) return null;
    return { phone: owner.phone, ownerName: owner.name, petName: matchedPet.name };
  };

  const handleSendWhatsAppAlert = async (n: AppNotification) => {
    const contact = resolveNotificationContact(n);
    if (!contact) {
      addToast('Tidak dapat menemukan nomor WA pemilik dari notifikasi ini. Cek data pelanggan & hewan di Master Data.', 'warning');
      return;
    }

    addToast(`Mengirim pesan WhatsApp pengingat untuk: "${n.title}"...`, 'info');
    const message = `Halo Kak ${contact.ownerName}, mengingatkan: ${n.message}`;
    const outcome = await sendWhatsAppNotification(contact.phone, message);
    addToast(
      outcome.auto
        ? `Pesan WhatsApp otomatis berhasil dikirim ke ${contact.ownerName} (pemilik ${contact.petName})!`
        : `Tautan WhatsApp ke ${contact.ownerName} (pemilik ${contact.petName}) dibuka di tab baru.`,
      'success'
    );
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'Vaksin':
        return <Syringe className="w-4 h-4 text-purple-600" />;
      case 'Stok':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'Booking':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'Hotel':
        return <Home className="w-4 h-4 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#B8905A]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Bell}
        title="Pusat Notifikasi & Dispatcher Peringatan Klinik"
        description="Peringatan stok obat, jadwal vaksin pasien, broadcast darurat WhatsApp, dan log sistem klinik."
        badges={[
          unreadCount > 0 ? (
            <span key="unread" className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              {unreadCount} Belum Dibaca
            </span>
          ) : (
            <span key="read" className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Semua Terbaca
            </span>
          ),
          { label: `${notifications.length} Total Pesan`, variant: 'gold' }
        ]}
        actions={
          <>
            <button
              onClick={handleMarkAllAsRead}
              className="px-3 py-1.5 bg-[#101A2C]/80 hover:bg-[#101A2C] text-[#EDE6D6] font-bold text-xs rounded-lg border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer hover:border-white/30 shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tandai Semua Dibaca</span>
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:from-[#c79e65] hover:to-[#ae8652] text-[#101A2C] font-extrabold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kirim Peringatan Siaran</span>
            </button>
          </>
        }
      />

      {/* Main Container */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#E1D6BE]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#1B2A45] text-white shadow-2xs'
                  : 'bg-[#F6F1E6] text-[#1B2A45] hover:bg-[#E1D6BE]'
              }`}
            >
              Semua Jenis ({allNotifications.length})
            </button>

            <button
              onClick={() => setFilterType('Vaksin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'Vaksin'
                  ? 'bg-[#1B2A45] text-white shadow-2xs'
                  : 'bg-[#F6F1E6] text-[#1B2A45] hover:bg-[#E1D6BE]'
              }`}
            >
              <Syringe className="w-3.5 h-3.5 text-purple-600" />
              <span>Vaksinasi</span>
            </button>

            <button
              onClick={() => setFilterType('Stok')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'Stok'
                  ? 'bg-[#1B2A45] text-white shadow-2xs'
                  : 'bg-[#F6F1E6] text-[#1B2A45] hover:bg-[#E1D6BE]'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              <span>Stok Obat</span>
            </button>

            <button
              onClick={() => setFilterType('Booking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'Booking'
                  ? 'bg-[#1B2A45] text-white shadow-2xs'
                  : 'bg-[#F6F1E6] text-[#1B2A45] hover:bg-[#E1D6BE]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Booking</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value as any)}
              className="px-3 py-1.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45]"
            >
              <option value="all">Semua Status Baca</option>
              <option value="unread">Hanya Belum Dibaca</option>
              <option value="read">Hanya Sudah Dibaca</option>
            </select>
          </div>
        </div>          {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-[#6B6656] bg-[#FAF7F0] rounded-xl border border-[#E1D6BE]">
              Tidak ada notifikasi aktif untuk kategori ini.
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => setSelectedNotifForDetail(notif)}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:shadow-md ${
                  !notif.isRead
                    ? 'bg-[#FFF9EE] border-amber-300 ring-1 ring-amber-400/20 hover:border-amber-400'
                    : 'bg-white border-[#E1D6BE] hover:border-[#B8905A]/60'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs text-[#1B2A45] hover:text-[#B8905A] transition-colors flex items-center gap-1.5">
                        <span>{notif.title}</span>
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        notif.priority === 'Tinggi'
                          ? 'bg-rose-500/15 text-rose-700 border-rose-500/30'
                          : 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                      }`}>
                        Prioritas {notif.priority}
                      </span>
                      {!notif.isRead && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold uppercase shadow-2xs">
                          Baru
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B6656] leading-relaxed line-clamp-2">{notif.message}</p>
                    <span className="text-[10px] text-[#8C7A5B] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#B8905A]" />
                      {notif.createdAt}
                    </span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNotifForDetail(notif);
                    }}
                    className="px-2.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-lg border border-[#E1D6BE] flex items-center gap-1 cursor-pointer transition-colors"
                    title="Lihat Rincian Lengkap"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#B8905A]" />
                    <span className="hidden sm:inline">Detail</span>
                  </button>

                  {notif.type === 'Vaksin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendWhatsAppAlert(notif);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </button>
                  )}

                  {/* Quick PO Button for Inventory Warning Notifications */}
                  {(notif.type === 'Stok' || notif.title.toLowerCase().includes('stok') || notif.message.toLowerCase().includes('stok') || notif.message.toLowerCase().includes('obat')) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuickPOFromNotif(notif);
                      }}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Buka Purchase Order otomatis terisi untuk pasokan ini"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-amber-300" />
                      <span>Quick PO</span>
                    </button>
                  )}

                  {!notif.isRead ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markNotificationRead(notif.id);
                        addToast('Notifikasi ditandai dibaca.', 'success');
                      }}
                      className="px-3 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold text-xs rounded-lg border border-[#E1D6BE] cursor-pointer transition-colors"
                    >
                      Tandai Dibaca
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#6B6656] flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
                      <Check className="w-3 h-3 text-emerald-600" /> Terbaca
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Broadcast (Click Outside Anywhere to Close) */}
      {showBroadcastModal && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowBroadcastModal(false);
            }
          }}
        >
          <div
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#B8905A]/20 flex items-center justify-center text-[#B8905A]">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1B2A45] font-display">
                    Kirim Peringatan Siaran Internal
                  </h3>
                  <p className="text-[10px] text-[#6B6656]">Klik di luar modal atau tekan ESC untuk menutup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="w-7 h-7 rounded-lg bg-[#F6F1E6] hover:bg-rose-100 text-[#6B6656] hover:text-rose-700 flex items-center justify-center cursor-pointer transition-colors"
                title="Tutup Modal (ESC / Klik Luar)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Judul Peringatan</label>
                <input
                  type="text"
                  placeholder="Contoh: Rapat Koordinasi Dokter & Staf 17:00"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Kategori</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                  >
                    <option value="Sistem">Sistem Operasional</option>
                    <option value="Vaksin">Vaksinasi</option>
                    <option value="Stok">Stok Farmasi</option>
                    <option value="Booking">Booking & Janji Temu</option>
                    <option value="Hotel">Pet Hotel</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Prioritas</label>
                  <select
                    value={broadcastPriority}
                    onChange={(e) => setBroadcastPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                  >
                    <option value="Tinggi">Tinggi (Kritis)</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Isi Pesan Peringatan</label>
                <textarea
                  rows={3}
                  placeholder="Ketik rincian pesan untuk staf..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-[#8C7A5B] flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#E1D6BE]/40 rounded font-mono text-[9px]">ESC</kbd> Batal
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBroadcastModal(false)}
                    className="px-4 py-2 bg-[#E1D6BE]/60 text-[#1B2A45] font-bold rounded-xl hover:bg-[#E1D6BE] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] font-extrabold rounded-xl shadow-md cursor-pointer"
                  >
                    Kirim Notifikasi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Notifikasi (Click Outside Anywhere to Close) */}
      {selectedNotifForDetail && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedNotifForDetail(null);
            }
          }}
        >
          <div
            className="bg-[#FFFDF9] rounded-2xl border-2 border-[#E1D6BE] max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 cursor-default overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#1B2A45] p-4 text-[#FFFDF9] flex items-center justify-between border-b border-[#B8905A]/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#B8905A]/20 text-[#D9B98A] border border-[#B8905A]/40">
                  {getTypeIcon(selectedNotifForDetail.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B8905A]/30 text-[#D9B98A]">
                      Kategori {selectedNotifForDetail.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedNotifForDetail.priority === 'Tinggi'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                        : 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                    }`}>
                      Prioritas {selectedNotifForDetail.priority}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-[#FFFDF9] font-display mt-0.5">
                    {selectedNotifForDetail.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotifForDetail(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Tutup (ESC / Klik di luar)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] space-y-2">
                <span className="text-[11px] font-bold text-[#1B2A45] block">Isi Pesan Notifikasi:</span>
                <p className="text-xs text-[#22242B] leading-relaxed whitespace-pre-line font-medium">
                  {selectedNotifForDetail.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white border border-[#E1D6BE]">
                  <span className="text-[#6B6656] block text-[10px]">Waktu Tercatat:</span>
                  <span className="font-bold text-[#1B2A45] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#B8905A]" />
                    {selectedNotifForDetail.createdAt}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-[#E1D6BE]">
                  <span className="text-[#6B6656] block text-[10px]">Status Pembacaan:</span>
                  <span className="font-bold text-[#1B2A45] flex items-center gap-1 mt-0.5">
                    {selectedNotifForDetail.isRead ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sudah Dibaca
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Belum Dibaca
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E1D6BE]">
                <span className="text-[10px] text-[#8C7A5B] flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-[#E1D6BE]/40 rounded font-mono text-[9px]">ESC</kbd> Tutup jendela
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {!selectedNotifForDetail.isRead && (
                    <button
                      type="button"
                      onClick={() => {
                        markNotificationRead(selectedNotifForDetail.id);
                        setSelectedNotifForDetail(prev => prev ? { ...prev, isRead: true } : null);
                        addToast('Notifikasi ditandai telah dibaca.', 'success');
                      }}
                      className="px-3 py-2 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-bold rounded-xl border border-[#E1D6BE] cursor-pointer"
                    >
                      Tandai Dibaca
                    </button>
                  )}

                  {selectedNotifForDetail.type === 'Vaksin' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSendWhatsAppAlert(selectedNotifForDetail);
                        setSelectedNotifForDetail(null);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Kirim WA Pengingat</span>
                    </button>
                  )}

                  {(selectedNotifForDetail.type === 'Stok' || selectedNotifForDetail.title.toLowerCase().includes('stok') || selectedNotifForDetail.message.toLowerCase().includes('stok') || selectedNotifForDetail.message.toLowerCase().includes('obat')) && (
                    <button
                      type="button"
                      onClick={() => {
                        const notif = selectedNotifForDetail;
                        setSelectedNotifForDetail(null);
                        handleOpenQuickPOFromNotif(notif);
                      }}
                      className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-amber-300" />
                      <span>Buka Quick PO</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedNotifForDetail(null)}
                    className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
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
    </div>
  );
};
