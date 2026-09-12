import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { SmartPatientCheckInModal } from '../common/SmartPatientCheckInModal';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';
import {
  QrCode,
  Camera,
  Ticket,
  Printer,
  Send,
  CheckCircle2,
  Bell,
  Search,
  UserCheck,
  Smartphone,
  Tv,
  Clock,
  Zap
} from 'lucide-react';

export const KioskQueueModule: React.FC = () => {
  const { clinicVisits, addClinicVisit, pets, customers, employees = [] } = useData();
  const onDutyDoctor = employees.find((e) => e.role === 'Dokter Hewan' && e.status === 'Aktif');
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'kiosk' | 'notify'>('kiosk');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [selectedQueuePatientId, setSelectedQueuePatientId] = useState<string>(clinicVisits[0]?.id || '');

  // Kiosk Search & Checkin state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [complaint, setComplaint] = useState('Pemeriksaan Rutin & Konsultasi Sehat');
  const [printedTicket, setPrintedTicket] = useState<any>(null);

  const handleSearchCustomer = () => {
    const cust = customers.find((c) => c.phone.includes(phoneSearch) || c.name.toLowerCase().includes(phoneSearch.toLowerCase()));
    if (!cust) {
      addToast('Pelanggan tidak ditemukan. Silakan hubungi resepsionis.', 'error');
      return;
    }
    setSelectedCustomer(cust);
    const pet = pets.find((p) => p.customerId === cust.id) || pets[0];
    setSelectedPet(pet);
    addToast(`Pelanggan teridentifikasi: ${cust.name} (${pet?.name || 'Pasien'})`, 'success');
  };

  const handlePrintTicket = () => {
    if (!selectedCustomer || !selectedPet) {
      addToast('Pilih pasien terlebih dahulu.', 'error');
      return;
    }

    const newVisit = addClinicVisit({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      petId: selectedPet.id,
      petName: selectedPet.name,
      petSpecies: selectedPet.species,
      petBreed: selectedPet.breed,
      doctorId: onDutyDoctor?.id || 'unassigned',
      doctorName: onDutyDoctor?.name || 'Menunggu Penugasan Dokter',
      complaint
    });

    setPrintedTicket(newVisit);
    addToast(`Tiket antrean A-${newVisit.queueNo.toString().padStart(3, '0')} berhasil dicetak!`, 'success');
  };

  const handleSendWANotify = async (visit: any) => {
    // Catatan: sebelumnya nomor tujuan hardcoded ke satu angka contoh untuk semua pasien.
    // Sekarang diambil dari data pelanggan asli (customers) berdasarkan customerId pada visit.
    const customerPhone = customers.find((c) => c.id === visit.customerId)?.phone;
    if (!customerPhone) {
      addToast(`Nomor WhatsApp ${visit.customerName} tidak ditemukan di data pelanggan.`, 'error');
      return;
    }
    const text = `Halo Kak ${visit.customerName}! 🐾 Antrean anabul ${visit.petName} (Nomor A-${visit.queueNo.toString().padStart(3, '0')}) tersisa 2 nomor lagi. Mohon bersiap menuju ke ruang periksa ${visit.doctorName || 'dokter jaga'}. Terima kasih!`;
    const outcome = await sendWhatsAppNotification(customerPhone, text);
    addToast(
      outcome.auto
        ? `Notifikasi estimasi antrean WA terkirim otomatis ke ${visit.customerName}.`
        : `Notifikasi estimasi antrean WA dikirim ke ${visit.customerName}...`,
      outcome.auto ? 'success' : 'info'
    );
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Ticket}
        title="Self Check-In Kiosk & Trigger Notifikasi WA"
        description="Layar Anjungan Mandiri untuk cetak tiket antrean pasien dan otomatisasi pengiriman pesan WhatsApp saat nomor antrean mendekat."
        badges={[
          { label: 'Anjungan Mandiri & Antrean', variant: 'gold' },
          { label: `${clinicVisits.length} Antrean Hari Ini`, variant: 'blue' },
          { label: 'WhatsApp Gateway Online', variant: 'emerald' }
        ]}
        tabs={[
          { id: 'kiosk', label: 'Kiosk Check-In', icon: Ticket },
          { id: 'notify', label: 'Trigger Notifikasi WA', icon: Bell }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {activeTab === 'kiosk' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Touchscreen Kiosk UI */}
          <div className="bg-[#FFFDF9] rounded-2xl border-2 border-[#B8905A] p-6 shadow-xl space-y-5 text-center">
            <div className="border-b border-[#E1D6BE] pb-3">
              <span className="px-3 py-1 rounded-full bg-[#1B2A45] text-[#D9B98A] text-[10px] font-bold uppercase tracking-wider">
                ANJUNGAN MANDIRI CHECK-IN
              </span>
              <h3 className="text-lg font-extrabold text-[#1B2A45] font-display mt-2">Selamat Datang di PetCare ERP</h3>
              <p className="text-xs text-[#6B6656]">Masukkan No. HP / Nama Pelanggan atau Scan QR Paspor Digital</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik No. HP (mis. 081234567890)"
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="w-full text-center p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45] text-sm focus:outline-none focus:border-[#B8905A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSearchCustomer}
                  className="py-3 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-[#D9B98A]" /> Cari No. HP
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="py-3 bg-gradient-to-r from-[#B8905A] to-[#9E7848] text-[#101A2C] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-[#101A2C]" /> Scan QR Pasien
                </button>
              </div>
            </div>

            {selectedCustomer && (
              <div className="bg-[#F6F1E6] rounded-xl p-4 border border-[#E1D6BE] text-left text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#1B2A45]">{selectedCustomer.name}</span>
                  <span className="px-2 py-0.5 rounded bg-[#B8905A]/20 text-[#B8905A] font-bold text-[10px]">
                    {selectedCustomer.membershipTier} Member
                  </span>
                </div>
                <div className="text-[#6B6656]">
                  Anabul: <strong className="text-[#1B2A45]">{selectedPet?.name} ({selectedPet?.species})</strong>
                </div>

                <div className="pt-2">
                  <label className="font-semibold text-[#1B2A45] block mb-1">Keluhan / Tujuan Kedatangan</label>
                  <input
                    type="text"
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="w-full p-2 bg-white rounded border border-[#E1D6BE]"
                  />
                </div>

                <button
                  onClick={handlePrintTicket}
                  className="w-full py-3 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all mt-3 flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Cetak Tiket Antrean Sekarang
                </button>
              </div>
            )}
          </div>

          {/* Ticket Print Preview Thermal */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-6 shadow-md flex flex-col justify-between">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2 flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#B8905A]" /> Simulasi Thermal Ticket Print
            </h3>

            {printedTicket ? (
              <div className="my-auto bg-[#F6F1E6] p-6 rounded-xl border border-dashed border-[#B8905A] text-center space-y-3 font-mono text-[#1B2A45]">
                <p className="text-xs font-bold uppercase">KLINIK HEWAN PETCARE ERP</p>
                <p className="text-[10px] text-[#6B6656]">Jl. Senopati No. 88, Jakarta Selatan</p>
                <div className="border-t border-b border-gray-300 py-3 my-2">
                  <span className="text-[10px] text-[#6B6656] uppercase block">NOMOR ANTREAN ANDA</span>
                  <p className="text-4xl font-extrabold text-[#1B2A45] mt-1">
                    A-{printedTicket.queueNo.toString().padStart(3, '0')}
                  </p>
                </div>
                <div className="text-xs text-left space-y-1">
                  <p>Pasien: <strong>{printedTicket.petName}</strong></p>
                  <p>Pemilik: <strong>{printedTicket.customerName}</strong></p>
                  <p>Dokter: <strong>{printedTicket.doctorName}</strong></p>
                  <p className="text-[10px] text-gray-500 pt-2 text-center">Simpan tiket ini untuk panggilan antrean</p>
                </div>
              </div>
            ) : (
              <div className="my-auto text-center py-12 text-[#6B6656] text-xs space-y-2">
                <Ticket className="w-12 h-12 mx-auto text-[#E1D6BE]" />
                <p>Belum ada tiket antrean yang dicetak.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notify' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#B8905A]" /> Monitoring Panggilan & WhatsApp Auto-Reminder
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Sistem Aktif (Live Queue)
            </span>
          </div>

          {/* Quick Dropdown Patient Queue Selector */}
          <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E1D6BE] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5 shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#B8905A]" /> Dropdown Antrean Pasien:
            </label>
            <div className="flex-1 max-w-lg">
              <select
                value={selectedQueuePatientId}
                onChange={(e) => setSelectedQueuePatientId(e.target.value)}
                className="w-full bg-white text-[#1B2A45] text-xs font-bold rounded-lg px-3 py-2 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] shadow-2xs cursor-pointer"
              >
                {clinicVisits.map((v) => (
                  <option key={v.id} value={v.id}>
                    Antrean #{v.queueNo}: {v.petName} ({v.petSpecies || 'Pasien'}) • {v.customerName} [Status: {v.status}]
                  </option>
                ))}
              </select>
            </div>
            {selectedQueuePatientId && (
              <button
                type="button"
                onClick={() => {
                  const visit = clinicVisits.find((v) => v.id === selectedQueuePatientId);
                  if (visit) handleSendWANotify(visit);
                }}
                className="px-3.5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-white" /> Kirim Reminder WA Pasien Ini
              </button>
            )}
          </div>

          <div className="divide-y divide-[#E1D6BE]">
            {clinicVisits.map((v) => (
              <div key={v.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#1B2A45] text-base font-mono">
                      A-{v.queueNo.toString().padStart(3, '0')}
                    </span>
                    <span className="font-bold text-[#1B2A45]">{v.petName}</span>
                    <span className="text-[#6B6656]">({v.customerName})</span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                        v.status === 'Menunggu' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B6656] mt-0.5">Dokter: {v.doctorName} | Keluhan: {v.complaint}</p>
                </div>

                <button
                  onClick={() => handleSendWANotify(v)}
                  className="px-3.5 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#D9B98A]" /> Kirim Pesan WA (Sisa 2 Antrean)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Patient QR Check-in Modal */}
      <SmartPatientCheckInModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
};
