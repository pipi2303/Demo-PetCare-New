import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  QrCode,
  Syringe,
  ShieldCheck,
  Award,
  Calendar,
  Share2,
  Printer,
  Heart,
  AlertCircle,
  Sparkles,
  Download,
  Phone,
  CheckCircle2,
  Clock,
  Pill,
  Fingerprint
} from 'lucide-react';
import QRCode from 'qrcode';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Pet, Customer, VacHistory, DewormingRecord } from '../../types';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';

interface PetHealthPassportModalProps {
  onClose: () => void;
  defaultPetId?: string;
}

export const PetHealthPassportModal: React.FC<PetHealthPassportModalProps> = ({
  onClose,
  defaultPetId
}) => {
  const { pets = [], customers = [], vacHistories = [], dewormingRecords = [], medicalRecords = [] } = useData();
  const { addToast } = useToast();

  const [selectedPetId, setSelectedPetId] = useState<string>(defaultPetId || pets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'passport' | 'vaccines' | 'parasites' | 'medical'>('passport');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const currentPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const currentOwner = customers.find((c) => c.id === currentPet?.customerId) || customers[0];

  const petVaccines = vacHistories.filter((v) => v.petId === currentPet?.id);
  const petDewormings = dewormingRecords.filter((d) => d.petId === currentPet?.id);
  const petMedicals = medicalRecords.filter((m) => m.petId === currentPet?.id);

  // Generate QR Code for Passport Verification
  useEffect(() => {
    if (!currentPet) return;
    const verificationData = JSON.stringify({
      passportNo: `VET-PASSPORT-${currentPet.id.toUpperCase()}`,
      microchipId: `98514100${currentPet.id.padStart(4, '0')}`,
      petName: currentPet.name,
      species: currentPet.species,
      breed: currentPet.breed,
      owner: currentOwner?.name,
      phone: currentOwner?.phone,
      rabiesStatus: 'Vaksin Rabies Aktif (Valid s/d 2027)',
      issuedBy: 'PetCare Central Veterinary Hospital'
    });

    QRCode.toDataURL(verificationData, {
      width: 220,
      margin: 1,
      color: {
        dark: '#101A2C',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error(err));
  }, [currentPet, currentOwner]);

  const handleShareWhatsApp = async () => {
    if (!currentOwner?.phone) {
      addToast('Nomor telepon pemilik hewan tidak ditemukan!', 'error');
      return;
    }
    const message =
      `📘 *BUKU PASPOR KESEHATAN DIGITAL RESMI*\n` +
      `🐾 *Nama Anabul:* ${currentPet?.name} (${currentPet?.species} - ${currentPet?.breed})\n` +
      `👤 *Pemilik:* ${currentOwner?.name}\n` +
      `🏷️ *No. Paspor:* VET-PASSPORT-${currentPet?.id.toUpperCase()}\n` +
      `📍 *Microchip ID:* 98514100${currentPet?.id.padStart(4, '0')}\n\n` +
      `💉 *Status Vaksinasi Terkini:*\n` +
      (petVaccines.length > 0
        ? petVaccines.map((v) => `• ${v.vaccineName}: ${v.givenDate} (Booster: ${v.nextDueDate})`).join('\n')
        : `• Terverifikasi Vaksin Inti (Tricat & Rabies Aktif)`) +
      `\n\n🛡️ *Klinik Penerbit:* PetCare Hospital & Clinic ERP\n` +
      `_Tunjukkan pesan/QR ini saat bepergian, penitipan hotel anabul, atau check-in klinik!_`;

    const outcome = await sendWhatsAppNotification(currentOwner.phone, message);
    addToast(
      outcome.auto
        ? `Paspor Kesehatan ${currentPet?.name} terkirim otomatis ke WhatsApp pemilik.`
        : `Membuka WhatsApp untuk mengirimkan Paspor Kesehatan ${currentPet?.name}...`,
      outcome.auto ? 'success' : 'info'
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#B8905A]/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#1E3050] text-white px-5 py-4 flex items-center justify-between border-b border-[#B8905A]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display">
                  Buku Paspor Kesehatan Digital (Pet Health Passport)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40">
                  Resmi Terverifikasi
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE]/80">
                Dokumen rekam vaksinasi, microchip ID, kartu deworming & riwayat klinis yang dapat dibagikan langsung ke pemilik anabul.
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

        {/* Pet Selector & Navigation Tabs */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600 shrink-0">Pilih Pasien:</span>
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A] w-full sm:w-64"
            >
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species} • {p.customerName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('passport')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'passport'
                  ? 'bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Paspor Utama
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vaccines')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'vaccines'
                  ? 'bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Vaksinasi ({petVaccines.length > 0 ? petVaccines.length : 3})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parasites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'parasites'
                  ? 'bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Obat Cacing & Kutu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('medical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'medical'
                  ? 'bg-gradient-to-r from-[#101A2C] to-[#1E3050] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Catatan Klinis
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {activeTab === 'passport' && (
            <div className="space-y-6">
              {/* Luxury Passport Card */}
              <div className="bg-gradient-to-br from-[#101A2C] via-[#16233B] to-[#1E3050] text-white p-6 rounded-2xl border-2 border-[#B8905A]/60 shadow-xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
                  <Award className="w-80 h-80 text-[#B8905A]" />
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  {/* Pet Photo & Bio */}
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#B8905A] to-[#D9B98A] p-1 shadow-lg shrink-0">
                      <div className="w-full h-full rounded-xl bg-[#101A2C] flex items-center justify-center text-4xl">
                        {currentPet?.species === 'Kucing' ? '🐱' : currentPet?.species === 'Anjing' ? '🐶' : '🐾'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-white font-display">{currentPet?.name}</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {currentPet?.gender} • {currentPet?.sterilized ? 'Steril (Ya)' : 'Belum Steril'}
                        </span>
                      </div>
                      <p className="text-xs text-[#E1D6BE] mt-0.5 font-medium">
                        {currentPet?.species} • {currentPet?.breed} • Warna: {currentPet?.color || 'Bicolor'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#E1D6BE]/80">
                        <span>🎂 Usia: {currentPet?.birthDate ? `${new Date().getFullYear() - new Date(currentPet.birthDate).getFullYear()} Tahun` : '2 Tahun'}</span>
                        <span>⚖️ Berat: <strong>{currentPet?.weightKg || 4.2} kg</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Verification Box */}
                  <div className="bg-white p-3 rounded-2xl shadow-md flex flex-col items-center shrink-0 border border-[#B8905A]/40 text-[#101A2C]">
                    {qrCodeUrl && (
                      <img src={qrCodeUrl} alt="Passport QR" className="w-24 h-24 object-contain rounded-lg" />
                    )}
                    <span className="text-[10px] font-mono font-bold mt-1 text-slate-600">Scan Verifikasi Digital</span>
                  </div>
                </div>

                {/* Passport IDs Bar */}
                <div className="mt-6 pt-4 border-t border-[#B8905A]/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[#E1D6BE]/70 block font-semibold">NO. PASPOR RESMI:</span>
                    <span className="font-mono font-bold text-[#D9B98A]">VET-PASSPORT-{currentPet?.id.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E1D6BE]/70 block font-semibold">MICROCHIP RFID ID:</span>
                    <span className="font-mono font-bold text-white flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-[#B8905A]" />
                      98514100{currentPet?.id.padStart(4, '0')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E1D6BE]/70 block font-semibold">NAMA PEMILIK:</span>
                    <span className="font-bold text-white">{currentOwner?.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#E1D6BE]/70 block font-semibold">NO. TELEPON OWNER:</span>
                    <span className="font-bold text-white">{currentOwner?.phone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Status Badges Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">Status Vaksinasi Rabies</h4>
                    <p className="text-xs text-emerald-700 font-semibold">Aktif & Terlindungi (Valid 2027)</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500 text-white rounded-xl font-bold">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-950">Pencegahan Cacing & Kutu</h4>
                    <p className="text-xs text-blue-700 font-semibold">Rutin Tiap 3 Bulan (Bulan Lalu)</p>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500 text-white rounded-xl font-bold">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-purple-950">Catatan Alergi Pasien</h4>
                    <p className="text-xs text-purple-700 font-semibold">Tidak Ada Riwayat Alergi Obat</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vaccines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Syringe className="w-4 h-4 text-[#B8905A]" />
                  Buku Catatan Vaksinasi Pasien ({currentPet?.name})
                </h4>
                <span className="text-xs text-slate-500 font-medium">Sesuai Standar Protokol WSAVA</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Nama Vaksin</th>
                      <th className="p-3">Tanggal Diberikan</th>
                      <th className="p-3">Jadwal Booster</th>
                      <th className="p-3">Batch & Expiry</th>
                      <th className="p-3">Dokter Hewan (SIP)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {petVaccines.length > 0 ? (
                      petVaccines.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{v.vaccineName}</td>
                          <td className="p-3 text-slate-700">{v.givenDate}</td>
                          <td className="p-3 font-bold text-indigo-600">{v.nextDueDate}</td>
                          <td className="p-3 text-slate-600 font-mono text-[11px]">{v.batchNumber} (Exp: {v.expiryDate})</td>
                          <td className="p-3 text-slate-700">{v.doctorName}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Lengkap
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-slate-500" colSpan={6}>
                          Belum ada riwayat vaksinasi tercatat untuk pasien ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'parasites' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-[#B8905A]" />
                Riwayat Pengobatan Cacing & Ectoparasite (Kutu/Tungau)
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Nama Obat / Spot-on</th>
                      <th className="p-3">Tanggal Pemberian</th>
                      <th className="p-3">Dosis</th>
                      <th className="p-3">Pemberi Obat</th>
                      <th className="p-3">Jadwal Ulang Berikutnya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {petDewormings.length > 0 ? (
                      petDewormings.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{d.medicineName}</td>
                          <td className="p-3 text-slate-700">{d.date}</td>
                          <td className="p-3 text-slate-700">{d.dosage}</td>
                          <td className="p-3 text-slate-700">{d.givenBy}</td>
                          <td className="p-3 font-bold text-indigo-600">{d.nextDueDate}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-slate-500" colSpan={5}>
                          Belum ada riwayat pemberian obat cacing/anti-parasit untuk pasien ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#B8905A]" />
                Ringkasan Rekam Medis & Riwayat Perawatan Terakhir
              </h4>

              <div className="space-y-3">
                {petMedicals.length > 0 ? (
                  petMedicals.map((m, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{m.title}</span>
                        <span className="text-slate-500">{m.date} • Oleh {m.performedBy}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                    Belum ada rekam medis tercatat untuk pasien ini.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Paspor tersinkronisasi otomatis dengan Database Cloud ERP Rumah Sakit Hewan.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Cetak Paspor</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan ke WhatsApp Owner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
