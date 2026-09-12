import React, { useState } from 'react';
import {
  Camera,
  X,
  Share2,
  CheckCircle2,
  Heart,
  Utensils,
  Sparkles,
  Thermometer,
  Pill,
  Smile,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Clock,
  Printer
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { sendWhatsAppNotification } from '../../utils/sendWhatsApp';
import { useToast } from '../../context/ToastContext';
import { DailyPetJournal, Pet, Customer } from '../../types';

interface DailyPetDiaryModalProps {
  onClose: () => void;
  defaultPetId?: string;
  defaultServiceType?: 'Pet Hotel' | 'Grooming' | 'Rawat Inap';
}

export const DailyPetDiaryModal: React.FC<DailyPetDiaryModalProps> = ({
  onClose,
  defaultPetId,
  defaultServiceType = 'Pet Hotel'
}) => {
  const { pets = [], customers = [], addAuditLog, addMedicalRecord } = useData();
  const { addToast } = useToast();

  const [selectedPetId, setSelectedPetId] = useState<string>(defaultPetId || pets[0]?.id || '');
  const [serviceType, setServiceType] = useState<'Pet Hotel' | 'Grooming' | 'Rawat Inap'>(defaultServiceType);

  const currentPet = pets.find((p) => p.id === selectedPetId) || pets[0];
  const currentOwner = customers.find((c) => c.id === currentPet?.customerId) || customers[0];

  const [appetite, setAppetite] = useState<DailyPetJournal['appetite']>('Sangat Lahap');
  const [urination, setUrination] = useState<DailyPetJournal['urination']>('Lancar & Normal');
  const [defecation, setDefecation] = useState<DailyPetJournal['defecation']>('Padat Normal');
  const [mood, setMood] = useState<DailyPetJournal['mood']>('Aktif Ceria');
  const [temperatureC, setTemperatureC] = useState<number>(38.5);
  const [medicationGiven, setMedicationGiven] = useState<string>('Vitamin Nutri-plus Gel & Probiotik');
  const [staffNotes, setStaffNotes] = useState<string>(
    'Anabul sangat aktif bermain di play area, porsi makan habis bersih, dan bulu sudah disisir rapi wangi lavender.'
  );
  const [staffName, setStaffName] = useState<string>('Ns. Siti Rahma (Care Specialist)');
  const [customPhone, setCustomPhone] = useState<string>(currentOwner?.phone || '081234567890');

  // Photo preset selector
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80'
  );
  // Guard klik-ganda — handler async (menunggu sendWhatsAppNotification)
  // tapi addMedicalRecord/addAuditLog jalan sinkron sebelum await, jadi
  // klik ganda tanpa ini bisa menduplikasi rekam medis & audit log untuk
  // jurnal harian yang sama, termasuk flag "PERLU PERHATIAN DOKTER".
  const [isSendingDiary, setIsSendingDiary] = useState(false);

  const photoOptions = [
    { label: 'Kucing Bermain Ceria', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80' },
    { label: 'Anjing Santai Manja', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80' },
    { label: 'Makan Lahap Bersih', url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80' },
    { label: 'Grooming Spa Bersih', url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80' }
  ];

  const handleSendWhatsApp = async () => {
    if (isSendingDiary) return;
    setIsSendingDiary(true);
    const dateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const message =
      `📸 *JURNAL HARIAN ANABUL (DAILY PET DIARY)* 🐾\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Halo Kak *${currentOwner?.name || 'Owner'}*! Berikut kabar terkini anabul tersayang *${currentPet?.name}* di *${serviceType} PetCare*:\n\n` +
      `📅 *Hari/Tanggal:* ${dateStr}\n` +
      `🍽️ *Nafsu Makan:* ${appetite} (Porsi habis)\n` +
      `💧 *Buang Air Kecil (Pipis):* ${urination}\n` +
      `💩 *Buang Air Besar (Pup):* ${defecation}\n` +
      `✨ *Mood & Aktivitas:* ${mood}\n` +
      `🌡️ *Suhu Tubuh:* ${temperatureC}°C (Normal Sehat)\n` +
      (medicationGiven ? `💊 *Perawatan/Vitamin:* ${medicationGiven}\n` : '') +
      `\n📝 *Catatan Caretaker (${staffName}):*\n` +
      `"${staffNotes}"\n\n` +
      `🖼️ *Lihat Foto Terbaru:* ${selectedPhoto}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💖 _Anabul Anda kami rawat dengan penuh kasih sayang seperti keluarga sendiri!_`;

    // Sebelumnya jurnal harian ini hanya dikirim sebagai teks WhatsApp lalu
    // hilang — addMedicalRecord sudah di-destructure dari context tapi tak
    // pernah dipanggil. Tanda bahaya (mis. diare, tidak mau makan, lemas)
    // yang dicatat staf boarding tidak pernah terlihat dokter di EMR pasien
    // nanti. Sekarang disimpan permanen ke rekam medis pasien juga.
    const warningFlags: string[] = [];
    if (defecation === 'Diare') warningFlags.push('BAB diare/cair');
    if (appetite === 'Tidak Mau Makan') warningFlags.push('tidak mau makan');
    if (mood === 'Lemas') warningFlags.push('lemas');
    if (urination === 'Keruh / Tidak Lancar') warningFlags.push('urin keruh/tidak lancar');
    const warningPrefix = warningFlags.length > 0 ? `⚠️ PERLU PERHATIAN DOKTER (${warningFlags.join(', ')}). ` : '';

    if (addMedicalRecord && currentPet) {
      addMedicalRecord({
        petId: currentPet.id,
        date: new Date().toISOString().substring(0, 10),
        type: serviceType === 'Grooming' ? 'Grooming' : serviceType === 'Rawat Inap' ? 'Rawat Inap' : 'Kunjungan',
        title: `Jurnal Harian ${serviceType} - ${currentPet.name}`,
        description: `${warningPrefix}Nafsu makan: ${appetite}. BAK: ${urination}. BAB: ${defecation}. Mood: ${mood}. Suhu: ${temperatureC}°C. ${medicationGiven ? `Obat/vitamin: ${medicationGiven}. ` : ''}Catatan caretaker: ${staffNotes}`,
        performedBy: staffName,
        attachments: [selectedPhoto]
      });
    }

    const outcome = await sendWhatsAppNotification(customPhone, message);

    if (addAuditLog) {
      addAuditLog(
        'Tambah',
        'Pet Hotel / CRM',
        `Jurnal Harian ${currentPet?.name}`,
        `Jurnal harian foto ${serviceType} untuk ${currentPet?.name} disimpan ke EMR & dikirimkan ke WhatsApp pemilik (${customPhone}).`,
        { userName: staffName, userRole: 'perawat', severity: warningFlags.length > 0 ? 'Warning' : 'Info' }
      );
    }

    addToast(
      outcome.auto
        ? `Jurnal Harian ${currentPet?.name} terkirim otomatis ke WhatsApp pemilik.`
        : `Membuka WhatsApp untuk mengirimkan Jurnal Harian ${currentPet?.name}...`,
      outcome.auto ? 'success' : 'info'
    );
    setIsSendingDiary(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#B8905A]/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#101A2C] via-[#16233B] to-[#1E3050] text-white px-5 py-4 flex items-center justify-between border-b border-[#B8905A]/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] rounded-xl font-black shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display">
                  Daily Pet Diary & Photo Journal WhatsApp
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Laporan Harian Hotel & Grooming
                </span>
              </div>
              <p className="text-xs text-[#E1D6BE]/80">
                Kirimkan update kondisi makan, poop/pee, mood, dan foto harian langsung ke WhatsApp pemilik anabul dalam 1 klik.
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#101A2C]">
          {/* Patient and Service Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Pasien Anabul</label>
              <select
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
              >
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.species} • {p.customerName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Layanan Perawatan</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-[#B8905A]"
              >
                <option value="Pet Hotel">Pet Hotel / Penitipan Anabul</option>
                <option value="Rawat Inap">Rawat Inap Medis / Opname</option>
                <option value="Grooming">Grooming Salon & Spa</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Tujuan (Pemilik)</label>
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
              />
            </div>
          </div>

          {/* Daily Health & Behavior Checklists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <Utensils className="w-4 h-4 text-amber-600" />
                Nafsu Makan Anabul Hari Ini:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Sangat Lahap', 'Normal', 'Kurang', 'Tidak Mau Makan'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAppetite(opt)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      appetite === opt
                        ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt}</span>
                    {appetite === opt && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <Smile className="w-4 h-4 text-emerald-600" />
                Mood & Perilaku Aktivitas:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Aktif Ceria', 'Tenang & Santai', 'Gelisah / Takut', 'Lemas'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMood(opt)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                      mood === opt
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{opt}</span>
                    {mood === opt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <span>💧</span> Status Buang Air Kecil (Pipis):
              </label>
              <select
                value={urination}
                onChange={(e) => setUrination(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
              >
                <option value="Lancar & Normal">Lancar & Kuning Cerah Normal</option>
                <option value="Jarang">Jarang / Sedikit</option>
                <option value="Keruh / Tidak Lancar">Keruh / Tidak Lancar (Perlu Pantauan)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <span>💩</span> Status Buang Air Besar (Pup):
              </label>
              <select
                value={defecation}
                onChange={(e) => setDefecation(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
              >
                <option value="Padat Normal">Padat & Bagus Normal</option>
                <option value="Lembek">Agak Lembek</option>
                <option value="Diare">Diare / Cair (Lapor Dokter)</option>
                <option value="Belum BAB">Belum BAB Hari Ini</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                Suhu Tubuh (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={temperatureC}
                onChange={(e) => setTemperatureC(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Pill className="w-3.5 h-3.5 text-blue-500" />
                Vitamin / Obat yang Diberikan:
              </label>
              <input
                type="text"
                value={medicationGiven}
                onChange={(e) => setMedicationGiven(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Photo Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#B8905A]" />
              Pilih Foto Anabul Hari Ini yang Akan Terlampir:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photoOptions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhoto(item.url)}
                  className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative group ${
                    selectedPhoto === item.url ? 'border-[#B8905A] ring-2 ring-[#B8905A]/40' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} alt={item.label} className="w-full h-20 object-cover" />
                  <div className="p-1.5 bg-white text-[10px] font-bold text-slate-800 truncate text-center">
                    {item.label}
                  </div>
                  {selectedPhoto === item.url && (
                    <div className="absolute top-1 right-1 bg-[#B8905A] text-[#101A2C] rounded-full p-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Caretaker Notes */}
          <div>
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Pesan Khusus Dari Staf Perawat / Caretaker ({staffName}):
            </label>
            <textarea
              rows={2}
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8905A]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Format pesan otomatis disesuaikan dengan template premium WhatsApp PetCare.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isSendingDiary}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>{isSendingDiary ? 'Mengirim...' : 'Kirim Jurnal Foto ke WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
