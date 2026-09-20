import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useAutoSaveDraft } from '../../hooks/useAutoSaveDraft';
import { NavModule } from '../layout/Sidebar';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { MedicalHistoryTimeline } from '../medical/MedicalHistoryTimeline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  FileImage,
  TrendingUp,
  Upload,
  FileText,
  Plus,
  Microscope,
  CheckCircle2,
  AlertCircle,
  Eye,
  Download,
  Save,
  RotateCcw,
  Pill,
  Camera,
  Calendar,
  Clock,
  Printer,
  Check,
  Search,
  Sliders,
  Sparkles,
  AlertTriangle,
  User,
  ShieldAlert
} from 'lucide-react';

interface DiagnosticsModuleProps {
  activeModule?: NavModule;
}

interface DiagDraftData {
  labType: 'Rontgen X-Ray' | 'Darah Lengkap' | 'USG Abdomen' | 'Urinalisis';
  labNotes: string;
  hbValue: string;
  wbcValue: string;
  pltValue: string;
  sgptValue: string;
  newWeight: string;
  newWeightDate: string;
  compoundName: string;
  compoundWeightKg: number;
  compoundDosePerKg: number;
  compoundTotalCapsules: number;
}

export const DiagnosticsModule: React.FC<DiagnosticsModuleProps> = ({ activeModule }) => {
  const {
    pets = [],
    soapNotes = [],
    labTests = [],
    vacHistories = [],
    patientPhotos = [],
    drugs = [],
    invoices = [],
    addPatientPhoto,
    addLabTest,
    updateLabResult,
    updatePet,
    dispenseDrug,
    addMedicalRecord
  } = useData();

  const { addToast } = useToast();

  const [selectedPetId, setSelectedPetId] = useState<string>(() => {
    return localStorage.getItem('petcare_selected_pet_id') || pets[0]?.id || '';
  });

  useEffect(() => {
    const stored = localStorage.getItem('petcare_selected_pet_id');
    if (stored && pets.some((p) => p.id === stored)) {
      setSelectedPetId(stored);
    }
  }, [activeModule, pets]);

  const handleSelectPet = (id: string) => {
    setSelectedPetId(id);
    localStorage.setItem('petcare_selected_pet_id', id);
  };

  // Tab state synced with activeModule
  const [activeTab, setActiveTab] = useState<'timeline' | 'emr' | 'pharmacy' | 'lab' | 'gallery' | 'weight'>(
    activeModule === 'emr'
      ? 'emr'
      : activeModule === 'pharmacy'
      ? 'pharmacy'
      : activeModule === 'patientGallery'
      ? 'gallery'
      : 'timeline'
  );

  // Sub-view toggles for rich exploration
  const [emrViewMode, setEmrViewMode] = useState<'timeline' | 'soap'>('timeline');
  const [galleryViewMode, setGalleryViewMode] = useState<'photos' | 'timeline'>('photos');

  useEffect(() => {
    if (activeModule === 'emr') setActiveTab('emr');
    else if (activeModule === 'pharmacy') setActiveTab('pharmacy');
    else if (activeModule === 'patientGallery') setActiveTab('gallery');
  }, [activeModule]);

  // Manual weight entries dicatat per pasien (id hewan) — sebelumnya
  // weightLogs adalah satu array contoh yang dibagi SEMUA pasien (ganti
  // pasien, grafik tetap sama), dan entri baru tidak pernah tertaut ke
  // pasien manapun. Ditambah baris asli dari SOAP (kunjungan sungguhan,
  // sudah tertaut petId) di bawah, setelah selectedPet diketahui.
  const [manualWeightLogsByPet, setManualWeightLogsByPet] = useState<Record<string, { date: string; weight: number }[]>>({});

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];

  const weightLogs = useMemo(() => {
    if (!selectedPet) return [];
    const fromVisits = soapNotes
      .filter((s) => s.petId === selectedPet.id && typeof s.weightKg === 'number')
      .map((s) => ({ date: s.date, weight: s.weightKg as number }));
    const manual = manualWeightLogsByPet[selectedPet.id] || [];
    return [...fromVisits, ...manual].sort((a, b) => a.date.localeCompare(b.date));
  }, [soapNotes, selectedPet, manualWeightLogsByPet]);

  const defaultDiagValues: DiagDraftData = {
    labType: 'Rontgen X-Ray',
    labNotes: 'Pemeriksaan kondisi paru & struktur tulang pasca kecelakaan ringan.',
    hbValue: '13.5',
    wbcValue: '17.2',
    pltValue: '280',
    sgptValue: '42',
    newWeight: '',
    newWeightDate: new Date().toISOString().substring(0, 10),
    compoundName: 'Puyer Batuk & Antiinflamasi',
    compoundWeightKg: selectedPet?.weightKg || 4.5,
    compoundDosePerKg: 10,
    compoundTotalCapsules: 10
  };

  // Debounced LocalStorage Auto-Save
  const storageKey = selectedPetId ? `petcare_emr_diag_draft_${selectedPetId}` : 'petcare_emr_diag_draft_default';
  const {
    draft: diagDraft,
    setDraft: setDiagDraft,
    isSaving,
    lastSavedAt,
    hasRestoredDraft,
    clearDraft,
    discardDraft
  } = useAutoSaveDraft<DiagDraftData>(storageKey, defaultDiagValues, 500);

  const updateDraft = (fields: Partial<DiagDraftData>) => {
    setDiagDraft((prev) => ({ ...prev, ...fields }));
  };

  // Gallery Filters
  const [galleryCategory, setGalleryCategory] = useState<string>('Semua');
  const [newPhotoCategory, setNewPhotoCategory] = useState<'Kunjungan' | 'Grooming' | 'Sebelum' | 'Sesudah' | 'Lab' | 'Lainnya'>('Sebelum');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80');

  // Pharmacy Prescription Fulfillment Queue — sebelumnya 3 entri contoh
  // hardcoded, sama sekali terputus dari resep nyata yang dibuat dokter di
  // SOAP (ClinicModule). Sekarang diturunkan langsung dari soapNotes yang
  // punya resep (prescribedDrugs), digabung dengan data pasien sungguhan.
  // Status racik (Menunggu/Disiapkan/Siap/Selesai) masih status kerja lokal
  // (bukan diagnosa/data medis), disimpan per soapNoteId di komponen ini.
  const [rxStatusMap, setRxStatusMap] = useState<Record<string, string>>({});
  const prescriptionQueue = useMemo(() => {
    return soapNotes
      .filter((s) => s.prescribedDrugs && s.prescribedDrugs.length > 0)
      .slice(0, 15)
      .map((s) => {
        const rxPet = pets.find((p) => p.id === s.petId);
        return {
          id: s.id,
          patientName: rxPet?.name || 'Pasien',
          customerName: rxPet?.customerName || '-',
          items: s.prescribedDrugs.map((d) => `${d.drugName} (${d.dosage})`).join(', '),
          status: rxStatusMap[s.id] || 'Menunggu Racik',
          doctor: s.doctorName,
          time: s.date
        };
      });
  }, [soapNotes, pets, rxStatusMap]);

  const previewImg = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80';

  const handleAddWeight = () => {
    if (!selectedPet) return;
    if (!diagDraft.newWeight || isNaN(parseFloat(diagDraft.newWeight))) {
      addToast('Masukkan angka berat badan yang valid.', 'error');
      return;
    }
    const val = parseFloat(diagDraft.newWeight);
    setManualWeightLogsByPet((prev) => ({
      ...prev,
      [selectedPet.id]: [...(prev[selectedPet.id] || []), { date: diagDraft.newWeightDate, weight: val }]
    }));
    updatePet(selectedPet.id, { weightKg: val }).catch((err: any) =>
      addToast(err?.message || 'Gagal menyimpan berat badan ke profil pasien.', 'error')
    );
    updateDraft({ newWeight: '' });
    addToast(`Berhasil mencatat berat badan ${val} kg untuk ${selectedPet.name}.`, 'success');
  };

  // Sebelumnya cuma toast — addLabTest sudah di-destructure dari context tapi
  // tak pernah dipanggil, jadi hasil lab yang "diunggah" dokter hilang begitu
  // tab ditinggalkan. Sekarang benar-benar tersimpan sebagai LabTest, dengan
  // hasil hematologi (kalau jenis pemeriksaannya Darah Lengkap) diambil dari
  // 4 kolom yang sekarang bisa diedit di tabel pratinjau, bukan angka tetap.
  const handleUploadLabResult = () => {
    if (!selectedPet) return;
    const latestDoctor = petSoaps[0]?.doctorName || 'Tim Medis';

    const results =
      diagDraft.labType === 'Darah Lengkap'
        ? [
            { parameter: 'Hemoglobin (Hb)', value: `${diagDraft.hbValue} g/dL`, unit: 'g/dL', referenceRange: '12.0 - 18.0 g/dL' },
            { parameter: 'Leukosit (WBC)', value: `${diagDraft.wbcValue} x10³/µL`, unit: 'x10³/µL', referenceRange: '5.5 - 16.5 x10³/µL' },
            { parameter: 'Trombosit (PLT)', value: `${diagDraft.pltValue} x10³/µL`, unit: 'x10³/µL', referenceRange: '200 - 500 x10³/µL' },
            { parameter: 'SGPT / ALT', value: `${diagDraft.sgptValue} U/L`, unit: 'U/L', referenceRange: '10 - 100 U/L' }
          ]
        : undefined;

    const newTest = addLabTest({
      petId: selectedPet.id,
      petName: selectedPet.name,
      customerName: selectedPet.customerName,
      testName: diagDraft.labType,
      orderedBy: latestDoctor,
      notes: diagDraft.labNotes
    });
    updateLabResult(newTest.id, results, diagDraft.labNotes);

    addToast(`Hasil laboratorium (${diagDraft.labType}) untuk ${selectedPet.name} tersimpan ke EMR (${newTest.testNo}).`, 'success');
  };

  // Sebelumnya cuma toast — kalkulasi dosis racikan hilang begitu etiket
  // "dicetak", tidak pernah masuk rekam medis. Sekarang dicatat sebagai
  // MedicalRecord seperti resep Telehealth & hasil lab yang sudah diperbaiki.
  const handlePrintCompoundLabel = () => {
    if (!selectedPet) return;
    const totalMg = diagDraft.compoundWeightKg * diagDraft.compoundDosePerKg * diagDraft.compoundTotalCapsules;
    const perCapsuleMg = diagDraft.compoundWeightKg * diagDraft.compoundDosePerKg;
    addMedicalRecord({
      petId: selectedPet.id,
      date: new Date().toISOString().substring(0, 10),
      type: 'Tindakan',
      title: `Obat Racikan - ${diagDraft.compoundName}`,
      description: `${diagDraft.compoundTotalCapsules} bungkus, ${perCapsuleMg.toFixed(1)} mg/bungkus (total ${totalMg.toFixed(1)} mg) untuk BB ${diagDraft.compoundWeightKg} kg.`,
      performedBy: petSoaps[0]?.doctorName || 'Tim Medis'
    });
    addToast(`Etiket obat racikan "${diagDraft.compoundName}" dicetak & tercatat ke rekam medis.`, 'success');
  };

  const handleAddPhoto = () => {
    if (!selectedPet) return;
    addPatientPhoto({
      petId: selectedPet.id,
      petName: selectedPet.name,
      category: newPhotoCategory,
      photoUrl: newPhotoUrl,
      caption: newPhotoCaption || `Foto klinis ${newPhotoCategory} - ${selectedPet.name}`,
      takenAt: new Date().toISOString().substring(0, 10),
      takenBy: 'Drh. Anisa'
    });
    setNewPhotoCaption('');
    addToast(`Foto klinis baru untuk ${selectedPet.name} berhasil ditambahkan ke galeri!`, 'success');
  };

  const updatePrescriptionStatus = (id: string, newStatus: string) => {
    setRxStatusMap((prev) => ({ ...prev, [id]: newStatus }));
    addToast(`Status resep obat diubah menjadi ${newStatus}.`, 'info');
  };

  // Filtered Patient EMR History
  const petSoaps = soapNotes.filter((s) => s.petId === selectedPet?.id);
  const petLabs = labTests.filter((l) => l.petId === selectedPet?.id);
  const petVacs = vacHistories.filter((v) => v.petId === selectedPet?.id);
  const petPhotos = patientPhotos.filter((p) => p.petId === selectedPet?.id || galleryCategory === 'Semua');

  const filteredPhotos = galleryCategory === 'Semua'
    ? patientPhotos
    : patientPhotos.filter((p) => p.category === galleryCategory);

  return (
    <div className="space-y-5">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Activity}
        title="Rekam Medis 360°, Apotek Racikan & Galeri Foto Pasien"
        description="Pencatatan riwayat medis terintegrasi, pemenuhan resep apotek & racikan puyer, pengujian lab serta galeri dokumentasi visual pasien."
        badges={[
          { label: 'EMR & Apotek Terpadu', variant: 'gold' },
          { label: `${prescriptionQueue.filter(p => p.status === 'Menunggu Racik').length} Antrean Racik`, variant: 'rose' },
          { label: `${labTests.length} Uji Lab`, variant: 'blue' }
        ]}
        tabs={[
          { id: 'timeline', label: 'Timeline Medis Kronologis', icon: Sparkles },
          { id: 'emr', label: 'EMR & SOAP Dokter', icon: FileText },
          { id: 'pharmacy', label: 'Apotek & Racikan', icon: Pill, count: prescriptionQueue.filter(p => p.status === 'Menunggu Racik').length },
          { id: 'lab', label: 'Laboratorium & X-Ray', icon: Microscope, count: labTests.length },
          { id: 'gallery', label: 'Galeri Foto Pasien', icon: Camera },
          { id: 'weight', label: 'Kurva Berat', icon: TrendingUp }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Select Active Pet */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#B8905A]" />
          <span className="text-xs font-bold text-[#1B2A45]">Pasien Terpilih:</span>
          <select
            value={selectedPetId}
            onChange={(e) => handleSelectPet(e.target.value)}
            className="text-xs p-2 rounded bg-[#F6F1E6] border border-[#E1D6BE] font-bold text-[#1B2A45]"
          >
            {pets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.species} - {p.customerName})
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-[#6B6656] font-medium">
          Spesies: <strong className="text-[#1B2A45]">{selectedPet?.species} ({selectedPet?.breed})</strong> | Berat: <strong className="text-emerald-700">{selectedPet?.weightKg} Kg</strong>
        </span>
      </div>

      {/* LocalStorage Auto-Save Banner */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] px-4 py-2.5 shadow-2xs flex items-center justify-between text-xs font-semibold text-[#1B2A45]">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isSaving ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="font-bold text-[#1B2A45]">
              {isSaving ? 'Menyimpan draft EMR ke LocalStorage...' : 'Auto-Save EMR LocalStorage Aktif'}
            </p>
            <p className="text-[11px] text-[#6B6656] font-normal">
              {lastSavedAt ? (
                <>
                  Draft interpretasi lab & data penimbangan tersimpan otomatis pukul <span className="font-bold text-emerald-800">{lastSavedAt}</span>.
                </>
              ) : (
                'Setiap ketikan pada interpretasi lab & penimbangan tersimpan otomatis ke LocalStorage.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRestoredDraft && (
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 shrink-0">
              Draft Tersimpan Dimuat
            </span>
          )}
          {hasRestoredDraft && (
            <button
              onClick={discardDraft}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shrink-0"
              title="Reset ke data awal"
            >
              <RotateCcw className="w-3 h-3" /> Reset Draft
            </button>
          )}
        </div>
      </div>

      {/* 0. Dedicated Visual Medical History Timeline (Vaccines, Surgeries, Lab) */}
      {activeTab === 'timeline' && (
        <MedicalHistoryTimeline
          selectedPetId={selectedPetId}
          onSelectPet={handleSelectPet}
        />
      )}

      {/* 1. EMR Timeline 360° */}
      {activeTab === 'emr' && selectedPet && (
        <div className="space-y-4">
          {/* Sub-view switcher for EMR */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1B2A45]">Tampilan EMR:</span>
              <button
                onClick={() => setEmrViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  emrViewMode === 'timeline'
                    ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                    : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#EAE2D1] border border-[#E1D6BE]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D9B98A]" />
                <span>Timeline Medis Kronologis (Vaksin, Bedah, Lab)</span>
              </button>
              <button
                onClick={() => setEmrViewMode('soap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  emrViewMode === 'soap'
                    ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                    : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#EAE2D1] border border-[#E1D6BE]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Catatan SOAP & Kunjungan Dokter</span>
              </button>
            </div>
            <button
              onClick={() => addToast(`Mencetak Ringkasan EMR Resmi untuk ${selectedPet.name}...`, 'info')}
              className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg border border-[#B8905A]/30 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#D9B98A]" /> Cetak Ringkasan EMR
            </button>
          </div>

          {emrViewMode === 'timeline' ? (
            <MedicalHistoryTimeline
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
              showPetSelector={false}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#B8905A]" /> Catatan Kunjungan SOAP: {selectedPet.name}
                    </h3>
                  </div>

                  {/* SOAP Visits */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#1B2A45] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#B8905A]" /> Riwayat Kunjungan & Catatan SOAP Dokter:
                    </h4>

                    {petSoaps.length > 0 ? (
                      petSoaps.map((s) => (
                        <div key={s.id} className="p-4 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-[#1B2A45]">
                            <span className="text-sm">{s.workingDiagnosis}</span>
                            <span className="text-[10px] bg-[#1B2A45] text-[#D9B98A] px-2 py-0.5 rounded">
                              {s.date} • {s.doctorName}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#22242B]">
                            <p><strong>Keluhan:</strong> {s.chiefComplaint}</p>
                            <p><strong>Vitals:</strong> {s.temperatureC}°C, {s.weightKg}kg</p>
                          </div>
                          <p className="text-[11px] text-[#6B6656]"><strong>Fisik:</strong> {s.physicalExamNotes}</p>
                          <div className="p-2 rounded bg-[#FFFDF9] border border-[#E1D6BE] text-[11px] font-semibold text-[#1B2A45]">
                            <strong>Resep Obat:</strong> {s.medicationPlan || 'Tidak ada resep'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#6B6656]">Belum ada riwayat SOAP tercatat untuk pasien ini.</p>
                    )}
                  </div>

                  {/* Vaccine History */}
                  <div className="space-y-2 pt-2 border-t border-[#E1D6BE]">
                    <h4 className="text-xs font-bold text-[#1B2A45]">Riwayat Vaksinasi Pasien:</h4>
                    {petVacs.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] text-xs flex justify-between">
                        <div>
                          <p className="font-bold text-[#1B2A45]">{v.vaccineName}</p>
                          <p className="text-[10px] text-[#6B6656]">Diberikan: {v.givenDate} | Batch: {v.batchNumber}</p>
                        </div>
                        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-2 py-1 rounded">
                          Booster: {v.nextDueDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-4">
                <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
                  Ringkasan Profil Pasien
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-[#6B6656]">Nama Pasien:</span><span className="font-bold text-[#1B2A45]">{selectedPet.name}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6656]">Spesies / Ras:</span><span className="font-semibold text-[#22242B]">{selectedPet.species} ({selectedPet.breed})</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6656]">Berat Badan:</span><span className="font-semibold text-[#22242B]">{selectedPet.weightKg} Kg</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6656]">Pemilik:</span><span className="font-bold text-[#1B2A45]">{selectedPet.customerName}</span></div>
                  <div className="flex justify-between"><span className="text-[#6B6656]">Microchip:</span><span className="font-mono text-[10px] text-[#B8905A]">{selectedPet.microchipNo || '9810981002341'}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Pharmacy & Compound Drug Calculator */}
      {activeTab === 'pharmacy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Pharmacy Prescription Queue */}
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <Pill className="w-4 h-4 text-[#B8905A]" /> Antrean Penyiapan Resep Apotek Klinik
                </h3>
                <span className="text-xs text-[#6B6656] font-medium">Petugas Apotek: Farmasis Rahma</span>
              </div>

              <div className="space-y-3">
                {prescriptionQueue.map((rx) => (
                  <div key={rx.id} className="p-3.5 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#1B2A45]">{rx.patientName}</span>
                        <span className="text-[10px] text-[#6B6656]">({rx.customerName})</span>
                        <span className="text-[10px] font-mono text-[#B8905A]">Jam {rx.time}</span>
                      </div>
                      <p className="text-[11px] text-[#22242B] mt-1"><strong>Item Resep:</strong> {rx.items}</p>
                      <p className="text-[10px] text-[#6B6656]">Dokter Penanggung Jawab: {rx.doctor}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={rx.status}
                        onChange={(e) => updatePrescriptionStatus(rx.id, e.target.value)}
                        className="text-xs p-1.5 rounded bg-[#FFFDF9] border border-[#E1D6BE] font-bold text-[#1B2A45]"
                      >
                        <option value="Menunggu Racik">Menunggu Racik</option>
                        <option value="Sedang Disiapkan">Sedang Disiapkan</option>
                        <option value="Siap Diserahkan">Siap Diserahkan</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drug Stock Alert Table */}
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-3">
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
                <AlertTriangle className="w-4 h-4 text-[#B8905A]" /> Stok Obat Apotek & Peringatan Kadaluarsa
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Kode</th>
                      <th className="p-2">Nama Obat</th>
                      <th className="p-2">Kategori</th>
                      <th className="p-2">Sisa Stok</th>
                      <th className="p-2">Kadaluarsa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1D6BE]">
                    {drugs.map((d) => (
                      <tr key={d.id}>
                        <td className="p-2 font-mono font-bold text-[#B8905A]">{d.code}</td>
                        <td className="p-2 font-bold text-[#1B2A45]">{d.name}</td>
                        <td className="p-2 text-[#6B6656]">{d.category}</td>
                        <td className="p-2 font-bold">
                          <span className={d.stock <= d.minStock ? 'text-rose-700' : 'text-emerald-700'}>
                            {d.stock} {d.unit}
                          </span>
                        </td>
                        <td className="p-2 text-[#6B6656]">{d.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Compound Drug Calculator */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Kalkulator Obat Racikan / Puyer
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Nama Formula Racikan</label>
                <input
                  type="text"
                  value={diagDraft.compoundName}
                  onChange={(e) => updateDraft({ compoundName: e.target.value })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Berat Pasien (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={diagDraft.compoundWeightKg}
                  onChange={(e) => updateDraft({ compoundWeightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Dosis (mg / Kg BB)</label>
                <input
                  type="number"
                  value={diagDraft.compoundDosePerKg}
                  onChange={(e) => updateDraft({ compoundDosePerKg: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jumlah Bungkus / Kapsul</label>
                <input
                  type="number"
                  value={diagDraft.compoundTotalCapsules}
                  onChange={(e) => updateDraft({ compoundTotalCapsules: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div className="p-3 bg-[#1B2A45] text-[#FFFDF9] rounded-xl border border-[#B8905A]/40 space-y-1">
                <p className="text-[10px] text-[#D9B98A] font-bold uppercase">Hasil Kalkulasi Dosis Racikan:</p>
                <p className="text-sm font-bold">
                  Total Bahan Obat: {(diagDraft.compoundWeightKg * diagDraft.compoundDosePerKg * diagDraft.compoundTotalCapsules).toFixed(1)} mg
                </p>
                <p className="text-[11px] text-[#EDE6D6]/80">
                  Dosis per bungkus: {(diagDraft.compoundWeightKg * diagDraft.compoundDosePerKg).toFixed(1)} mg / bungkus
                </p>
              </div>

              <button
                onClick={handlePrintCompoundLabel}
                className="w-full py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Etiket Racikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Laboratory & X-Ray */}
      {activeTab === 'lab' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Lab / Radiologi Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-[#B8905A]" /> Citra Radiologi & Hasil Hematologi ({selectedPet?.name})
                </h3>
                {petLabs.length > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {petLabs.length} Hasil Tersimpan
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-[#F6F1E6] text-[#6B6656] font-bold text-[10px] border border-[#E1D6BE]">
                    Belum Ada Hasil Tersimpan
                  </span>
                )}
              </div>

              {/* Sample X-Ray Image Viewer */}
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-white space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Pemeriksaan: {diagDraft.labType}</span>
                  <span>Tanggal: 11 Agustus 2026</span>
                </div>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                  <img
                    src={previewImg}
                    alt="Radiology Scan"
                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2.5 py-1 rounded text-[10px] text-emerald-400 font-mono">
                    DICOM Viewer • Contrast 100%
                  </div>
                </div>
              </div>

              {/* Blood Lab Parameter Table — hanya relevan kalau jenis
                  pemeriksaan yang sedang dipilih adalah Darah Lengkap.
                  Sebelumnya tabel hematologi ini selalu tampil apa pun jenis
                  pemeriksaannya (Rontgen/USG/Urinalisis), menyesatkan. */}
              {diagDraft.labType === 'Darah Lengkap' && (
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs text-[#1B2A45]">Hasil Darah Lengkap (Hematologi)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#22242B]">
                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Parameter</th>
                        <th className="p-2">Hasil</th>
                        <th className="p-2">Nilai Rujukan Normal</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE]">
                      <tr>
                        <td className="p-2 font-semibold">Hemoglobin (Hb)</td>
                        <td className="p-2">
                          <input
                            value={diagDraft.hbValue}
                            onChange={(e) => updateDraft({ hbValue: e.target.value })}
                            className="w-20 p-1 bg-[#F6F1E6] border border-[#E1D6BE] rounded font-bold text-[#1B2A45]"
                          /> g/dL
                        </td>
                        <td className="p-2 text-[#6B6656]">12.0 - 18.0 g/dL</td>
                        <td className="p-2"><span className="text-emerald-700 font-bold">Normal</span></td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold">Leukosit (WBC)</td>
                        <td className="p-2">
                          <input
                            value={diagDraft.wbcValue}
                            onChange={(e) => updateDraft({ wbcValue: e.target.value })}
                            className="w-20 p-1 bg-[#F6F1E6] border border-[#E1D6BE] rounded font-bold text-amber-700"
                          /> x10³/µL
                        </td>
                        <td className="p-2 text-[#6B6656]">5.5 - 16.5 x10³/µL</td>
                        <td className="p-2"><span className="text-amber-700 font-bold">Sedikit Tinggi</span></td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold">Trombosit (PLT)</td>
                        <td className="p-2">
                          <input
                            value={diagDraft.pltValue}
                            onChange={(e) => updateDraft({ pltValue: e.target.value })}
                            className="w-20 p-1 bg-[#F6F1E6] border border-[#E1D6BE] rounded font-bold text-[#1B2A45]"
                          /> x10³/µL
                        </td>
                        <td className="p-2 text-[#6B6656]">200 - 500 x10³/µL</td>
                        <td className="p-2"><span className="text-emerald-700 font-bold">Normal</span></td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold">SGPT / ALT (Fungsi Hati)</td>
                        <td className="p-2">
                          <input
                            value={diagDraft.sgptValue}
                            onChange={(e) => updateDraft({ sgptValue: e.target.value })}
                            className="w-20 p-1 bg-[#F6F1E6] border border-[#E1D6BE] rounded font-bold text-[#1B2A45]"
                          /> U/L
                        </td>
                        <td className="p-2 text-[#6B6656]">10 - 100 U/L</td>
                        <td className="p-2"><span className="text-emerald-700 font-bold">Normal</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Riwayat hasil lab tersimpan — sebelumnya petLabs dihitung
                  tapi tak pernah dirender di tab ini, jadi staf harus pindah
                  ke tab Timeline untuk melihat hasil yang baru diunggah. */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs text-[#1B2A45]">Riwayat Hasil Lab & Radiologi Tersimpan</h4>
                {petLabs.length > 0 ? (
                  <div className="space-y-2">
                    {petLabs.map((lab) => (
                      <div key={lab.id} className="p-3 bg-[#F6F1E6]/60 border border-[#E1D6BE] rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1B2A45]">{lab.testName} • {lab.testNo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lab.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {lab.status}
                          </span>
                        </div>
                        <p className="text-[#6B6656]">Diminta oleh {lab.orderedBy} • {lab.orderedAt}</p>
                        {lab.results && lab.results.length > 0 && (
                          <p className="text-[#22242B]">
                            {lab.results.map((r) => `${r.parameter}: ${r.value}`).join(' • ')}
                          </p>
                        )}
                        {lab.notes && <p className="text-[#6B6656] italic">"{lab.notes}"</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#6B6656]">Belum ada hasil lab/radiologi tersimpan untuk pasien ini.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Upload Form */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-4">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Unggah Dokumen Lab / Radiologi
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Jenis Pemeriksaan</label>
                <select
                  value={diagDraft.labType}
                  onChange={(e) => updateDraft({ labType: e.target.value as any })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                >
                  <option value="Rontgen X-Ray">Rontgen X-Ray</option>
                  <option value="Darah Lengkap">Darah Lengkap (Hematologi)</option>
                  <option value="USG Abdomen">USG Abdomen</option>
                  <option value="Urinalisis">Urinalisis / Sitologi</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Catatan Interpretasi Medis</label>
                <textarea
                  rows={3}
                  value={diagDraft.labNotes}
                  onChange={(e) => updateDraft({ labNotes: e.target.value })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div className="p-4 border-2 border-dashed border-[#B8905A]/40 rounded-xl bg-[#F6F1E6]/50 text-center space-y-2">
                <Upload className="w-6 h-6 mx-auto text-[#B8905A]" />
                <p className="text-[11px] font-bold text-[#1B2A45]">Tarik file DICOM / JPEG / PDF di sini</p>
                <p className="text-[9px] text-[#6B6656]">Maksimal file 15 MB</p>
              </div>

              <button
                onClick={handleUploadLabResult}
                className="w-full py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-[#D9B98A]" /> Unggah Hasil Laboratorium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Patient Photo Gallery / Medical Timeline */}
      {activeTab === 'gallery' && (
        <div className="space-y-5">
          {/* Gallery vs Timeline View Mode Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1B2A45]">Mode Tampilan Galeri:</span>
              <button
                onClick={() => setGalleryViewMode('photos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  galleryViewMode === 'photos'
                    ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                    : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#EAE2D1] border border-[#E1D6BE]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Dokumentasi Foto Pasien</span>
              </button>
              <button
                onClick={() => setGalleryViewMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  galleryViewMode === 'timeline'
                    ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                    : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#EAE2D1] border border-[#E1D6BE]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D9B98A]" />
                <span>Medical History Timeline (Vaksin, Bedah, Lab)</span>
              </button>
            </div>
            <span className="text-xs text-[#6B6656] font-medium">
              Pasien: <strong className="text-[#1B2A45]">{selectedPet?.name}</strong>
            </span>
          </div>

          {galleryViewMode === 'timeline' ? (
            <MedicalHistoryTimeline
              selectedPetId={selectedPetId}
              onSelectPet={handleSelectPet}
              showPetSelector={false}
            />
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#B8905A]" />
                  <span className="text-xs font-bold text-[#1B2A45]">Kategori Foto:</span>
                  {['Semua', 'Kunjungan', 'Grooming', 'Sebelum', 'Sesudah', 'Lab'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setGalleryCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        galleryCategory === cat
                          ? 'bg-[#1B2A45] text-[#FFFDF9]'
                          : 'bg-[#F6F1E6] text-[#22242B] border border-[#E1D6BE]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPhotos.map((photo) => (
                  <div key={photo.id} className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] overflow-hidden shadow-2xs space-y-2">
                    <div className="aspect-square bg-slate-900 overflow-hidden relative">
                      <img src={photo.photoUrl} alt={photo.caption} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      <span className="absolute top-2 left-2 bg-[#1B2A45] text-[#D9B98A] text-[9px] px-2 py-0.5 rounded font-bold">
                        {photo.category}
                      </span>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <p className="font-bold text-[#1B2A45] truncate">{photo.caption}</p>
                      <p className="text-[10px] text-[#6B6656]">Pasien: {photo.petName} | {photo.takenAt}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload New Photo Form */}
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
                <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
                  Tambah Foto Klinis Pasien Baru
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Kategori</label>
                    <select
                      value={newPhotoCategory}
                      onChange={(e) => setNewPhotoCategory(e.target.value as any)}
                      className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                    >
                      <option value="Kunjungan">Kunjungan</option>
                      <option value="Grooming">Grooming</option>
                      <option value="Sebelum">Sebelum (Pre-Op)</option>
                      <option value="Sesudah">Sesudah (Post-Op)</option>
                      <option value="Lab">Lab / X-Ray</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Keterangan / Caption</label>
                    <input
                      type="text"
                      value={newPhotoCaption}
                      onChange={(e) => setNewPhotoCaption(e.target.value)}
                      placeholder="Contoh: Kondisi luka hari ke-3 pasca operasi"
                      className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddPhoto}
                      className="w-full py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-[#D9B98A]" /> Tambah ke Galeri
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. Weight Chart */}
      {activeTab === 'weight' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B8905A]" /> Kurva Riwayat Berat Badan Pasien ({selectedPet?.name})
              </h3>
              <span className="text-xs font-bold text-[#1B2A45]">
                Saat Ini: <strong className="text-emerald-700">{weightLogs[weightLogs.length - 1]?.weight} kg</strong>
              </span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightLogs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1D6BE" />
                  <XAxis dataKey="date" stroke="#6B6656" fontSize={11} />
                  <YAxis stroke="#6B6656" fontSize={11} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1B2A45', borderColor: '#B8905A', color: '#FFFDF9', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="weight" name="Berat (Kg)" stroke="#B8905A" strokeWidth={3} dot={{ r: 5, fill: '#1B2A45' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Catat Penimbangan Baru
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tanggal Timbang</label>
                <input
                  type="date"
                  value={diagDraft.newWeightDate}
                  onChange={(e) => updateDraft({ newWeightDate: e.target.value })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Berat Badan (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Contoh: 5.4"
                  value={diagDraft.newWeight}
                  onChange={(e) => updateDraft({ newWeight: e.target.value })}
                  className="w-full p-2 bg-[#F6F1E6] rounded border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <button
                onClick={handleAddWeight}
                className="w-full py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Simpan Data Berat Badan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
