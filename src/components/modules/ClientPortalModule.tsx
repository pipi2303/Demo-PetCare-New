import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { CctvMonitor } from '../common/CctvMonitor';
import { NavModule } from '../layout/Sidebar';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import {
  Award,
  QrCode,
  Share2,
  Tv,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  User,
  Heart,
  Plus,
  Syringe,
  Bug,
  Sparkles,
  FileText
} from 'lucide-react';

interface ClientPortalModuleProps {
  activeModule?: NavModule;
}

export const ClientPortalModule: React.FC<ClientPortalModuleProps> = ({ activeModule }) => {
  const { pets = [], vacHistories = [], addVacHistory, dewormingRecords = [], addDewormingRecord } = useData();
  const { addToast } = useToast();

  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'passport' | 'deworming' | 'cctv'>('passport');

  const selectedPet = (pets || []).find((p) => p.id === selectedPetId) || (pets || [])[0];
  const petVacHistory = (vacHistories || []).filter((v) => v.petId === selectedPet?.id);

  // New Vaccination Record Modal State
  const [showAddVacModal, setShowAddVacModal] = useState(false);
  const [vacName, setVacName] = useState('Vaksin Tricat Trio (FVRCP)');
  const [vacBatch, setVacBatch] = useState('BATCH-2026-X9');
  const [vacDoctor, setVacDoctor] = useState('Drh. Anisa');
  const [vacNextDue, setVacNextDue] = useState('2027-08-11');

  // Riwayat obat cacing & anti-parasit pasien yang sedang dipilih —
  // sebelumnya array contoh lokal, sama untuk semua pasien, tanpa tombol
  // tambah. Sekarang dari koleksi dewormingRecords sungguhan, difilter per
  // pasien, dengan modal pencatatan baru (mirip pola "Catat Vaksinasi").
  const petDewormingLogs = dewormingRecords.filter((d) => d.petId === selectedPet?.id);

  const [showAddDewormingModal, setShowAddDewormingModal] = useState(false);
  const [dwMedicine, setDwMedicine] = useState('Drontal Cat (Praziquantel/Pyrantel)');
  const [dwDosage, setDwDosage] = useState('1 tablet');
  const [dwGivenBy, setDwGivenBy] = useState('Drh. Anisa');
  const [dwNextDue, setDwNextDue] = useState('2026-11-10');

  const handleAddDeworming = () => {
    if (!selectedPet) return;
    addDewormingRecord({
      petId: selectedPet.id,
      date: new Date().toISOString().substring(0, 10),
      medicineName: dwMedicine,
      dosage: dwDosage,
      givenBy: dwGivenBy,
      nextDueDate: dwNextDue
    });
    setShowAddDewormingModal(false);
    addToast(`Catatan pemberian ${dwMedicine} untuk ${selectedPet.name} berhasil disimpan!`, 'success');
  };

  const handleSharePassport = () => {
    navigator.clipboard.writeText(`https://petcare.id/passport/${selectedPet?.id}`);
    addToast(`Link Paspor Digital untuk ${selectedPet?.name} berhasil disalin ke clipboard!`, 'success');
  };

  const handleAddVaccine = () => {
    if (!selectedPet) return;
    const certNo = `CERT-VAC-${Date.now().toString().slice(-6)}`;
    addVacHistory({
      petId: selectedPet.id,
      petName: selectedPet.name,
      customerName: selectedPet.customerName,
      vaccineName: vacName,
      givenDate: new Date().toISOString().substring(0, 10),
      nextDueDate: vacNextDue,
      doctorName: vacDoctor,
      batchNumber: vacBatch,
      expiryDate: '2028-05-30',
      certificateNo: certNo
    });
    setShowAddVacModal(false);
    addToast(`Sertifikat Vaksinasi ${vacName} (${certNo}) untuk ${selectedPet.name} berhasil diterbitkan!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Award}
        title="Sertifikat Vaksinasi, Paspor Digital & Anti-Parasit"
        description="Penerbitan paspor digital hewan terverifikasi QR, pencatatan sertifikat vaksin resmi, obat cacing/kutu & live streaming CCTV."
        badges={[
          { label: 'Paspor Digital & Vaksinasi', variant: 'gold' },
          { label: `${pets.length} Pasien Terdaftar`, variant: 'blue' },
          { label: 'Verifikasi QR Code Aktif', variant: 'emerald' }
        ]}
        tabs={[
          { id: 'passport', label: 'Paspor Digital & Vaksin', icon: Award },
          { id: 'deworming', label: 'Obat Cacing & Kutu', icon: Bug },
          { id: 'cctv', label: 'Live CCTV', icon: Tv }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Select Active Pet */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#B8905A]" />
          <span className="text-xs font-bold text-[#1B2A45]">Pilih Anabul Pasien:</span>
          <select
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="text-xs p-2 rounded bg-[#F6F1E6] border border-[#E1D6BE] font-bold text-[#1B2A45]"
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.species} - {p.customerName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'deworming' ? (
            <button
              onClick={() => setShowAddDewormingModal(true)}
              className="px-3.5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Catat Obat Cacing/Kutu
            </button>
          ) : (
            <button
              onClick={() => setShowAddVacModal(true)}
              className="px-3.5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Catat Vaksinasi Baru
            </button>
          )}
          {activeTab === 'passport' && (
            <button
              onClick={handleSharePassport}
              className="px-3.5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-[#D9B98A]" /> Bagikan Link Paspor
            </button>
          )}
        </div>
      </div>

      {activeTab === 'passport' && selectedPet && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Digital Passport Card */}
          <div className="md:col-span-1 bg-gradient-to-b from-[#1B2A45] to-[#101A2C] rounded-2xl p-5 text-[#FFFDF9] border border-[#B8905A]/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#B8905A]/30 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D9B98A]" />
                <span className="text-xs font-bold tracking-wider text-[#D9B98A] uppercase">
                  PETCARE OFFICIAL PASSPORT
                </span>
              </div>
              <span className="text-[10px] font-mono bg-[#B8905A]/30 px-2 py-0.5 rounded text-[#D9B98A]">
                ID: {selectedPet.id}
              </span>
            </div>

            {/* Pet Photo Avatar */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-24 h-24 rounded-full bg-[#101A2C] border-2 border-[#D9B98A] p-1 flex items-center justify-center overflow-hidden shadow-lg">
                <img
                  src={
                    selectedPet.photoUrl ||
                    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80'
                  }
                  alt={selectedPet.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <h3 className="text-xl font-extrabold text-[#FFFDF9] font-display">{selectedPet.name}</h3>
              <p className="text-xs text-[#D9B98A] font-medium">
                {selectedPet.species} • {selectedPet.breed}
              </p>
            </div>

            <div className="bg-[#101A2C]/80 rounded-xl p-3 border border-[#B8905A]/20 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#EDE6D6]/70">Microchip No:</span>
                <span className="font-mono font-bold text-[#D9B98A]">
                  {selectedPet.microchipNo || '9810981002341'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#EDE6D6]/70">Gender / Steril:</span>
                <span className="font-semibold text-[#FFFDF9]">
                  {selectedPet.gender} ({selectedPet.sterilized ? 'Steril' : 'Belum'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#EDE6D6]/70">Pemilik Terdaftar:</span>
                <span className="font-bold text-[#D9B98A]">{selectedPet.customerName}</span>
              </div>
            </div>

            {/* QR Code Passport */}
            <div className="bg-white p-3 rounded-xl flex items-center justify-between text-slate-900">
              <div className="text-left">
                <p className="text-[11px] font-bold">Paspor Digital Valid</p>
                <p className="text-[9px] text-slate-500">Scan untuk verifikasi medis di klinik</p>
              </div>
              <QrCode className="w-10 h-10 text-[#1B2A45]" />
            </div>
          </div>

          {/* Vaccination & Medical Passport History */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-sm text-[#1B2A45] font-display border-b border-[#E1D6BE] pb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#B8905A]" /> Sertifikat & Riwayat Vaksinasi Resmi ({petVacHistory.length})
              </h3>

              {petVacHistory.length > 0 ? (
                <div className="space-y-3">
                  {petVacHistory.map((v) => (
                    <div key={v.id} className="p-3.5 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1B2A45] text-sm">{v.vaccineName}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                          Sertifikat #{v.certificateNo}
                        </span>
                      </div>
                      <p className="text-[#6B6656] text-[11px]">
                        Diberikan: {v.givenDate} oleh {v.doctorName} | Batch: {v.batchNumber}
                      </p>
                      <p className="text-[11px] font-bold text-[#B8905A]">
                        Jadwal Booster Berikutnya: {v.nextDueDate}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B6656]">Belum ada data riwayat vaksinasi terdaftar untuk pasien ini.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deworming & Ectoparasite Tab */}
      {activeTab === 'deworming' && (
        <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
          <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
            <Bug className="w-4 h-4 text-[#B8905A]" /> Catatan Pemberian Obat Cacing & Anti-Kutu / Parasit
          </h3>

          <div className="space-y-3">
            {petDewormingLogs.length > 0 ? (
              petDewormingLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#1B2A45] text-sm">{log.medicineName}</p>
                    <p className="text-[11px] text-[#6B6656]">Diberikan: {log.date} oleh {log.givenBy} | Dosis: {log.dosage}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#1B2A45] text-[#D9B98A] font-bold rounded text-[10px]">
                    Pemberian Berikutnya: {log.nextDueDate}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6B6656]">Belum ada catatan pemberian obat cacing/anti-parasit untuk pasien ini.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cctv' && (
        <div className="bg-[#101A2C] rounded-2xl p-5 border border-[#B8905A]/30 text-[#FFFDF9] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-[#D9B98A] font-display flex items-center gap-2">
              <Tv className="w-4 h-4 text-[#B8905A]" /> CCTV Monitoring Kandang Pet Hotel & Inpatient ({selectedPet?.name})
            </h3>
            <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Live
            </span>
          </div>

          <CctvMonitor />
        </div>
      )}

      {/* Add Vaccine Modal */}
      {showAddVacModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Syringe className="w-5 h-5 text-[#B8905A]" /> Catat Vaksinasi Resmi
              </h3>
              <button
                onClick={() => setShowAddVacModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jenis Vaksin</label>
                <input
                  type="text"
                  value={vacName}
                  onChange={(e) => setVacName(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nomor Batch / Lot Produsen</label>
                <input
                  type="text"
                  value={vacBatch}
                  onChange={(e) => setVacBatch(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Dokter Hewan Pelaksana</label>
                <input
                  type="text"
                  value={vacDoctor}
                  onChange={(e) => setVacDoctor(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jadwal Booster Berikutnya</label>
                <input
                  type="date"
                  value={vacNextDue}
                  onChange={(e) => setVacNextDue(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleAddVaccine}
                  className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Terbitkan Sertifikat Vaksin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Deworming Modal */}
      {showAddDewormingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Bug className="w-5 h-5 text-[#B8905A]" /> Catat Obat Cacing & Anti-Kutu
              </h3>
              <button
                onClick={() => setShowAddDewormingModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Obat / Spot-on</label>
                <input
                  type="text"
                  value={dwMedicine}
                  onChange={(e) => setDwMedicine(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Dosis</label>
                <input
                  type="text"
                  value={dwDosage}
                  onChange={(e) => setDwDosage(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Diberikan Oleh</label>
                <input
                  type="text"
                  value={dwGivenBy}
                  onChange={(e) => setDwGivenBy(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jadwal Pemberian Berikutnya</label>
                <input
                  type="date"
                  value={dwNextDue}
                  onChange={(e) => setDwNextDue(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleAddDeworming}
                  className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
