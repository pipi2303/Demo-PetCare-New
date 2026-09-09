import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';
import { Reminder, Customer } from '../../types';
import {
  MessageSquare,
  Send,
  Bell,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  Filter,
  Phone,
  Search,
  Plus,
  HeartHandshake,
  DollarSign,
  Gift,
  FileText,
  AlertCircle,
  X,
  Star
} from 'lucide-react';

export const CRMModule: React.FC = () => {
  const {
    reminders = [],
    addReminder,
    updateReminderStatus,
    deleteReminder,
    customers = [],
    adjustCustomerPoints,
    pets = [],
    clinicVisits = [],
    invoices = []
  } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'reminders' | 'broadcast' | 'customer360'>('reminders');

  // Reminders Filter
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // New Reminder State
  const [custName, setCustName] = useState(customers[0]?.name || '');
  const [custPhone, setCustPhone] = useState(customers[0]?.phone || '081234567890');
  const [petName, setPetName] = useState(pets[0]?.name || 'Milo');
  const [reminderTitle, setReminderTitle] = useState('Vaksinasi Rabies Tahunan');
  const [reminderType, setReminderType] = useState<'Vaksin' | 'Kontrol Ulang' | 'Grooming' | 'Ulang Tahun'>('Vaksin');
  const [dueDate, setDueDate] = useState(new Date().toISOString().substring(0, 10));

  // Broadcast State
  const [broadcastTarget, setBroadcastTarget] = useState<'Semua' | 'Silver' | 'Gold' | 'Platinum' | 'Anjing' | 'Kucing'>('Semua');
  const [broadcastTemplate, setBroadcastTemplate] = useState(
    'Halo Kak {NAMA}! 🐾 PetCare ERP memberikan promo spesial diskon 20% untuk paket Premium Grooming anabul kesayangan Kakak ({NAMA_HEWAN}) minggu ini. Hubungi kami untuk reservasi!'
  );

  // Customer 360 State
  const [selectedCustId, setSelectedCustId] = useState<string>(customers[0]?.id || '');
  const [pointAdjustment, setPointAdjustment] = useState<number>(100);
  const [pointReason, setPointReason] = useState<string>('Bonus Ulang Tahun / Promotion');
  const [crmNotes, setCrmNotes] = useState<Record<string, string>>({
    c1: 'Pelanggan VIP Platinum. Selalu meminta slot pagi jam 09:00 dengan drh. Ananda.',
    c2: 'Anabul Max agak rewel dengan suara petir, perlu ditempatkan di ruang tenang.'
  });
  const [newCrmNoteInput, setNewCrmNoteInput] = useState('');

  const handleSendWA = async (phone: string, text: string) => {
    const outcome = await sendWhatsAppNotification(phone, text);
    addToast(
      outcome.auto ? `Pesan WhatsApp terkirim otomatis ke ${phone}.` : `Membuka WhatsApp Web ke ${phone}...`,
      outcome.auto ? 'success' : 'info'
    );
  };

  const handleCreateReminder = () => {
    if (!custName || !custPhone || !petName || !reminderTitle) {
      addToast('Harap lengkapi semua data pengingat!', 'error');
      return;
    }
    addReminder({
      customerName: custName,
      customerPhone: custPhone,
      petName,
      title: reminderTitle,
      type: reminderType,
      dueDate,
      status: 'Menunggu'
    });
    addToast(`Pengingat ${reminderType} untuk ${custName} (${petName}) berhasil ditambahkan.`, 'success');
  };

  // Broadcast Templates
  const setPresetTemplate = (preset: string) => {
    if (preset === 'grooming') {
      setBroadcastTemplate('Halo Kak {NAMA}! ✂️ Sudah 30 hari sejak grooming terakhir {NAMA_HEWAN}. Dapatkan potongan Rp 25.000 untuk Paket Grooming Medicated di PetCare minggu ini!');
    } else if (preset === 'vaccine') {
      setBroadcastTemplate('Halo Kak {NAMA}! 🩺 Penting! Jadwal vaksin tahunan {NAMA_HEWAN} sudah dekat. Amankan kesehatan anabul dengan booking slot konsultasi vaksinasi via WhatsApp.');
    } else if (preset === 'hotel') {
      setBroadcastTemplate('Halo Kak {NAMA}! 🏨 Liburan panjang semakin dekat. Dapatkan slot Pet Hotel VIP ber-AC & CCTV 24 jam untuk {NAMA_HEWAN}. Pesan sekarang sebelum kuota habis!');
    } else if (preset === 'birthday') {
      setBroadcastTemplate('Selamat Ulang Tahun untuk {NAMA_HEWAN}! 🎂 PetCare memberikan hadiah +100 Poin Loyalitas & Voucher Diskon 15% untuk Kak {NAMA}.');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustId) || customers[0];
  const customerPets = pets.filter((p) => p.customerId === selectedCustomer?.id);
  const customerVisits = clinicVisits.filter((v) => v.customerId === selectedCustomer?.id);
  const customerInvoices = invoices.filter((inv) => inv.customerId === selectedCustomer?.id);

  const handleAdjustPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    adjustCustomerPoints(selectedCustomer.id, pointAdjustment, pointReason);
    addToast(`Poin loyalitas ${selectedCustomer.name} berhasil disesuaikan (${pointAdjustment > 0 ? '+' : ''}${pointAdjustment})!`, 'success');
  };

  const handleAddCrmNote = () => {
    if (!newCrmNoteInput.trim() || !selectedCustomer) return;
    const currentNote = crmNotes[selectedCustomer.id] || '';
    const updated = currentNote ? `${currentNote}\n[${new Date().toISOString().substring(0, 10)}] ${newCrmNoteInput}` : `[${new Date().toISOString().substring(0, 10)}] ${newCrmNoteInput}`;
    setCrmNotes({ ...crmNotes, [selectedCustomer.id]: updated });
    setNewCrmNoteInput('');
    addToast('Catatan CRM pelanggan berhasil disimpan!', 'success');
  };

  // Filtered Reminders
  const filteredReminders = reminders.filter((r) => {
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <div className="bg-[#1B2A45] rounded-xl p-5 text-[#FFFDF9] border border-[#E1D6BE]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#E1D6BE]/20 text-[#E1D6BE] border border-[#E1D6BE]/30 text-[11px] font-bold uppercase tracking-wider">
            CRM & Customer Engagement Center
          </span>
          <h2 className="text-xl font-bold mt-1 text-[#FFFDF9]">
            CRM Pelanggan, Broadcast WA & Pengingat Otomatis
          </h2>
          <p className="text-xs text-[#FFFDF9]/80 mt-0.5">
            Pengelolaan retensi klien 360°, poin loyalitas member, pengingat vaksin & broadcast WhatsApp terintegrasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'reminders'
                ? 'bg-[#E1D6BE] text-[#1B2A45] shadow-xs'
                : 'bg-[#101A2C] text-[#FFFDF9] border border-[#E1D6BE]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <Bell className="w-4 h-4" /> Pengingat Otomatis
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'broadcast'
                ? 'bg-[#E1D6BE] text-[#1B2A45] shadow-xs'
                : 'bg-[#101A2C] text-[#FFFDF9] border border-[#E1D6BE]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <Send className="w-4 h-4" /> WA Broadcast
          </button>

          <button
            onClick={() => setActiveTab('customer360')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'customer360'
                ? 'bg-[#E1D6BE] text-[#1B2A45] shadow-xs'
                : 'bg-[#101A2C] text-[#FFFDF9] border border-[#E1D6BE]/30 hover:bg-[#101A2C]/80'
            }`}
          >
            <HeartHandshake className="w-4 h-4" /> Profil Pelanggan 360°
          </button>
        </div>
      </div>

      {/* TAB 1: AUTOMATED REMINDERS */}
      {activeTab === 'reminders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-[#1B2A45]">
                  <Filter className="w-4 h-4" /> Filter Jenis:
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg px-2.5 py-1.5 text-[#1B2A45] font-semibold"
                >
                  <option value="All">Semua Jenis</option>
                  <option value="Vaksin">Vaksinasi</option>
                  <option value="Kontrol Ulang">Kontrol Ulang</option>
                  <option value="Grooming">Grooming</option>
                  <option value="Ulang Tahun">Ulang Tahun</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg px-2.5 py-1.5 text-[#1B2A45] font-semibold"
                >
                  <option value="All">Semua Status</option>
                  <option value="Menunggu">Menunggu Kirim</option>
                  <option value="Terkirim">Terkirim WA</option>
                  <option value="Dikonfirmasi">Dikonfirmasi</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <span className="font-bold text-[#1B2A45] text-xs">
                {filteredReminders.length} Pengingat
              </span>
            </div>

            {/* List of Reminders */}
            <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-[#1B2A45] border-b border-[#E1D6BE] pb-2 flex items-center justify-between">
                <span>List Pengingat Layanan & WhatsApp Triggers</span>
                <span className="text-xs text-[#1B2A45]/60 font-normal">Sistem Otomatis PetCare ERP</span>
              </h3>

              <div className="divide-y divide-[#E1D6BE]/60">
                {filteredReminders.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#1B2A45]/60 font-medium">
                    Tidak ada jadwal pengingat sesuai filter.
                  </p>
                ) : (
                  filteredReminders.map((r) => {
                    const defaultMessage = `Halo Kak ${r.customerName}! 🐾 Mengingatkan jadwal ${r.type} (${r.title}) untuk ${r.petName} pada tanggal ${r.dueDate}. Silakan balas pesan ini untuk reservasi slot antrean di PetCare ERP!`;

                    return (
                      <div key={r.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1B2A45] text-sm">{r.petName}</span>
                            <span className="text-[#1B2A45]/70 font-medium">({r.customerName})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.type === 'Vaksin'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.type === 'Kontrol Ulang'
                                  ? 'bg-sky-100 text-sky-800'
                                  : r.type === 'Grooming'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {r.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'Terkirim'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'Dikonfirmasi'
                                  ? 'bg-sky-100 text-sky-800'
                                  : r.status === 'Selesai'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <p className="text-[#1B2A45] font-semibold">{r.title}</p>
                          <p className="text-[11px] text-[#1B2A45]/70 flex items-center gap-2">
                            <span>📅 Jatuh Tempo: <strong>{r.dueDate}</strong></span>
                            <span>📱 WA: <strong>{r.customerPhone}</strong></span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              updateReminderStatus(r.id, 'Terkirim');
                              handleSendWA(r.customerPhone, defaultMessage);
                            }}
                            className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#E1D6BE]" /> Kirim WA
                          </button>

                          {r.status === 'Terkirim' && (
                            <button
                              onClick={() => {
                                updateReminderStatus(r.id, 'Dikonfirmasi');
                                addToast(`Pengingat ${r.petName} dikonfirmasi oleh pemilik!`, 'success');
                              }}
                              className="px-2.5 py-1.5 bg-sky-100 text-sky-800 hover:bg-sky-200 font-bold text-xs rounded-lg"
                            >
                              Konfirmasi
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm('Hapus jadwal pengingat ini?')) {
                                deleteReminder(r.id);
                                addToast('Pengingat dihapus.', 'info');
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Form Create Reminder */}
          <div className="bg-white rounded-xl border border-[#E1D6BE] p-4 shadow-xs space-y-3 h-fit">
            <h3 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider border-b border-[#E1D6BE] pb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#1B2A45]" /> Buat Pengingat Baru
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Pelanggan</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">No. WhatsApp Active</label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Pasien / Anabul</label>
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jenis Pengingat</label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value as any)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                >
                  <option value="Vaksin">Vaksinasi</option>
                  <option value="Kontrol Ulang">Kontrol Ulang</option>
                  <option value="Grooming">Grooming 30-Hari</option>
                  <option value="Ulang Tahun">Ulang Tahun Anabul</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Judul / Catatan Pengingat</label>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-medium text-[#1B2A45]"
                />
              </div>

              <button
                onClick={handleCreateReminder}
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all mt-2"
              >
                Simpan Jadwal Pengingat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST & PROMOTION */}
      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-xl border border-[#E1D6BE] p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1B2A45]" /> WA Broadcast & Campaign Center
              </h3>
              <p className="text-xs text-[#1B2A45]/70">Kirim promosi personal ke segmen pelanggan spesifik</p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B2A45] bg-[#F6F1E6] px-3 py-1.5 rounded-lg border border-[#E1D6BE]">
              <Users className="w-4 h-4" /> Target Pelanggan: {
                broadcastTarget === 'Semua' ? customers.length :
                ['Silver', 'Gold', 'Platinum'].includes(broadcastTarget) ? customers.filter((c) => c.membershipTier === broadcastTarget).length :
                pets.filter((p) => p.species === broadcastTarget).length
              } Kontak
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-[#1B2A45]">Pilih Template Promosi Siap Pakai:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPresetTemplate('grooming')}
                className="px-3 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-semibold rounded-lg border border-[#E1D6BE]"
              >
                ✂️ Promo Grooming 30-Hari
              </button>
              <button
                onClick={() => setPresetTemplate('vaccine')}
                className="px-3 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-semibold rounded-lg border border-[#E1D6BE]"
              >
                🩺 Pengingat Vaksin Booster
              </button>
              <button
                onClick={() => setPresetTemplate('hotel')}
                className="px-3 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-semibold rounded-lg border border-[#E1D6BE]"
              >
                🏨 Slot Pet Hotel Liburan
              </button>
              <button
                onClick={() => setPresetTemplate('birthday')}
                className="px-3 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] font-semibold rounded-lg border border-[#E1D6BE]"
              >
                🎂 Hadiah Poin Ulang Tahun
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-[#1B2A45] block mb-1">Target Segmentasi</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as any)}
                className="w-full p-2.5 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-bold text-[#1B2A45]"
              >
                <option value="Semua">Semua Member ({customers.length})</option>
                <option value="Silver">Member Silver Tier</option>
                <option value="Gold">Member Gold Tier</option>
                <option value="Platinum">Member Platinum Tier</option>
                <option value="Anjing">Pemilik Anjing</option>
                <option value="Kucing">Pemilik Kucing</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-bold text-[#1B2A45] block mb-1">Template Pesan WA Broadcast</label>
              <textarea
                rows={4}
                value={broadcastTemplate}
                onChange={(e) => setBroadcastTemplate(e.target.value)}
                className="w-full p-2.5 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg focus:outline-none focus:border-[#1B2A45] font-medium text-[#1B2A45]"
              />
              <p className="text-[10px] text-[#1B2A45]/70 mt-1">
                Tag Otomatis: <code className="bg-[#E1D6BE] px-1 rounded font-bold text-[#1B2A45]">{'{NAMA}'}</code> = Nama Pemilik | <code className="bg-[#E1D6BE] px-1 rounded font-bold text-[#1B2A45]">{'{NAMA_HEWAN}'}</code> = Nama Anabul
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E1D6BE]/60 flex justify-end">
            <button
              onClick={() => {
                const sample = customers[0];
                if (!sample) return;
                const samplePet = pets.find((p) => p.customerId === sample.id);
                const msg = broadcastTemplate
                  .replace('{NAMA}', sample.name)
                  .replace('{NAMA_HEWAN}', samplePet?.name || 'Milo');
                handleSendWA(sample.phone, msg);
                addToast(`Broadcast WhatsApp diluncurkan untuk ${customers.length} penerima target!`, 'success');
              }}
              className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4 text-[#E1D6BE]" /> Meluncurkan Broadcast WA
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER 360 & LOYALTY */}
      {activeTab === 'customer360' && (
        <div className="space-y-6">
          {/* Customer Selector */}
          <div className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="font-bold text-[#1B2A45] shrink-0">Pilih Profil Klien:</span>
              <select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="w-full sm:w-64 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] font-bold"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.membershipTier} Member • {c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-bold text-xs">
                🎖️ {selectedCustomer?.membershipTier} Tier Member
              </span>
              <span className="px-3 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-full font-bold text-xs">
                ⭐ {selectedCustomer?.loyaltyPoints} Poin
              </span>
            </div>
          </div>

          {/* Customer 360 Details */}
          {selectedCustomer && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Col: Customer Overview & Registered Pets */}
              <div className="lg:col-span-2 space-y-4">
                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-[#E1D6BE] shadow-2xs">
                    <p className="text-[10px] font-bold text-[#1B2A45]/60 uppercase">Lifetime Value (LTV)</p>
                    <p className="text-base font-black text-[#1B2A45] mt-1">
                      Rp {(selectedCustomer.totalSpent || 0).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#E1D6BE] shadow-2xs">
                    <p className="text-[10px] font-bold text-[#1B2A45]/60 uppercase">Jumlah Anabul</p>
                    <p className="text-base font-black text-[#1B2A45] mt-1">
                      {customerPets.length} Ekor Registered
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#E1D6BE] shadow-2xs">
                    <p className="text-[10px] font-bold text-[#1B2A45]/60 uppercase">Total Kunjungan</p>
                    <p className="text-base font-black text-[#1B2A45] mt-1">
                      {customerVisits.length} Sesi Klinik
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-[#E1D6BE] shadow-2xs">
                    <p className="text-[10px] font-bold text-[#1B2A45]/60 uppercase">Total Invoices</p>
                    <p className="text-base font-black text-[#1B2A45] mt-1">
                      {customerInvoices.length} Transaksi
                    </p>
                  </div>
                </div>

                {/* Pets List */}
                <div className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
                    Anabul Peliharaan Terdaftar ({customerPets.length})
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {customerPets.map((p) => (
                      <div key={p.id} className="bg-[#F6F1E6]/50 p-3 rounded-lg border border-[#E1D6BE] flex items-center gap-3">
                        <img
                          src={p.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200'}
                          alt={p.name}
                          className="w-12 h-12 rounded-lg object-cover border border-[#E1D6BE]"
                        />
                        <div className="text-xs space-y-0.5">
                          <h5 className="font-bold text-[#1B2A45]">{p.name}</h5>
                          <p className="text-[11px] text-[#1B2A45]/70">{p.species} • {p.breed}</p>
                          <p className="text-[10px] font-mono text-[#1B2A45]/80">MC: {p.microchipNo}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CRM Notes Log */}
                <div className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs space-y-3">
                  <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
                    Catatan Khusus Klien (CRM Interaction History)
                  </h4>

                  <div className="bg-[#F6F1E6] p-3 rounded-lg border border-[#E1D6BE] text-xs font-mono text-[#1B2A45] whitespace-pre-line leading-relaxed min-h-20">
                    {crmNotes[selectedCustomer.id] || 'Belum ada catatan khusus untuk pelanggan ini.'}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      value={newCrmNoteInput}
                      onChange={(e) => setNewCrmNoteInput(e.target.value)}
                      placeholder="Tambah catatan interaksi baru (misal: 'Pemilik minta reminder via WA harian')..."
                      className="flex-1 bg-white border border-[#E1D6BE] rounded-lg px-3 py-2 text-[#1B2A45] focus:outline-none"
                    />
                    <button
                      onClick={handleAddCrmNote}
                      className="px-3 py-2 bg-[#1B2A45] text-[#FFFDF9] font-bold rounded-lg hover:bg-[#101A2C]"
                    >
                      Simpan Note
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Col: Loyalty Points Manager */}
              <div className="bg-white p-4 rounded-xl border border-[#E1D6BE] shadow-xs space-y-4 h-fit">
                <h4 className="font-bold text-xs text-[#1B2A45] uppercase tracking-wider border-b border-[#E1D6BE] pb-2 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#1B2A45]" /> Kelola Poin Loyalitas Member
                </h4>

                <div className="bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE] text-center space-y-1">
                  <p className="text-[10px] text-[#1B2A45]/70 uppercase font-bold">Saldo Poin Klien</p>
                  <p className="text-2xl font-black text-[#1B2A45]">{selectedCustomer.loyaltyPoints} Pts</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">1 Poin = Rp 100 Diskon Kasir</p>
                </div>

                <form onSubmit={handleAdjustPoints} className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">
                      Penyesuaian Poin (+ / -)
                    </label>
                    <input
                      type="number"
                      value={pointAdjustment}
                      onChange={(e) => setPointAdjustment(Number(e.target.value))}
                      className="w-full p-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-bold text-[#1B2A45]"
                    />
                    <p className="text-[10px] text-[#1B2A45]/60 mt-0.5">Gunakan angka positif (+) untuk tambah, minus (-) untuk potong/tukarkan.</p>
                  </div>

                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">
                      Alasan Penyesuaian
                    </label>
                    <input
                      type="text"
                      required
                      value={pointReason}
                      onChange={(e) => setPointReason(e.target.value)}
                      className="w-full p-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium text-[#1B2A45]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-2xs transition-all"
                  >
                    Eksekusi Penyesuaian Poin
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
