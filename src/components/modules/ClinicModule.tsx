import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { DoseCalculator } from '../common/DoseCalculator';
import { VitalSignsSummary } from '../clinic/VitalSignsSummary';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';
import { InformedConsentModal } from '../clinic/InformedConsentModal';
import { PetHealthPassportModal } from '../clinic/PetHealthPassportModal';
import { TriageUrgencyBadge } from '../clinic/TriageUrgencyBadge';
import { TriageUrgencyModal } from '../clinic/TriageUrgencyModal';
import { useAutoSaveDraft } from '../../hooks/useAutoSaveDraft';
import { authHeaders } from '../../utils/authToken';
import { NavModule } from '../layout/Sidebar';
import {
  Stethoscope,
  Activity,
  FileSignature,
  Pill,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  User,
  Clock,
  Plus,
  Save,
  PenTool,
  RotateCcw,
  Eye,
  FileText,
  Trash2,
  Check,
  HeartPulse,
  Search,
  Calendar,
  Printer,
  ClipboardList,
  ShieldAlert,
  ChevronRight,
  Bot,
  RefreshCw,
  Zap,
  History,
  ArrowRight,
  Info
} from 'lucide-react';

interface ClinicModuleProps {
  activeModule?: NavModule;
}

interface SoapDraftData {
  chiefComplaint: string;
  hpi: string;
  tempC: number;
  hr: number;
  rr: number;
  weightKg: number;
  examNotes: string;
  diagnosis: string;
  diffDiag: string;
  severity: 'Ringan' | 'Sedang' | 'Berat' | 'Kritis';
  prescribedList: { drugId: string; drugName: string; dosage: string; frequency: string; durationDays: number; qty: number }[];
  bodyNotes: Record<string, string>;
  signedName: string;
  selectedTemplateId: string;
  selectedTreatments: string[];
}

// Sample ICD-10 Veterinary Catalogue
const ICD10_VET_CATALOG = [
  { code: 'K29.7', name: 'Gastritis Akut / Intoleransi Pakan', category: 'Pencernaan', diff: 'Pankreatitis, Cacingan, Intoksikasi' },
  { code: 'A28.1', name: 'Feline Upper Respiratory Infection (Flu Kucing)', category: 'Respirasi', diff: 'Calicivirus, Herpesvirus, Chlamydia' },
  { code: 'H60.9', name: 'Otitis Externa (Infeksi Telinga)', category: 'THT', diff: 'Ear Mite Otodectes, Infeksi Jamur Malassezia' },
  { code: 'L24.9', name: 'Flea Allergy Dermatitis / Pyoderma', category: 'Dermatologi', diff: 'Scabies, Ringworm Microsporum, Atopi' },
  { code: 'N30.0', name: 'Feline Lower Urinary Tract Disease (FLUTD)', category: 'Urologi', diff: 'Urolithiasis Struvit, Sistitis Idiopatik' },
  { code: 'N18.9', name: 'Chronic Kidney Disease (CKD)', category: 'Nefrologi', diff: 'Acute Kidney Injury, Pyelonephritis' },
  { code: 'B86', name: 'Scabies / Mange Sarcoptes', category: 'Parasitologi', diff: 'Demodex, Dermatofitosis' },
  { code: 'T14.9', name: 'Trauma & Vulnus Laceratum (Luka Sobek)', category: 'Bedah / Trauma', diff: 'Fraktur Tulang, Perdarahan Internal' },
  { code: 'E11.9', name: 'Diabetes Mellitus Canine/Feline', category: 'Endokrin', diff: 'Ketoasidosis, Cushing Disease' },
  { code: 'K05.1', name: 'Gingivitis & Periodontitis Ringan', category: 'Gigi & Mulut', diff: 'FORL (Feline Odontoclastic Resorptive Lesion)' }
];

// Sample Medical Procedures / Actions Catalog
const MEDICAL_PROCEDURES = [
  { id: 'proc1', name: 'Terapi Cairan / Infus IV (Ringer Lactate)', price: 150000 },
  { id: 'proc2', name: 'Injeksi Antibiotik / Antiinflamasi', price: 75000 },
  { id: 'proc3', name: 'Nebulizer & Terapi Inhalasi', price: 90000 },
  { id: 'proc4', name: 'Pembersihan Telinga & Irigasi Otik', price: 60000 },
  { id: 'proc5', name: 'Pemasangan Kateter Urin / Flushing', price: 250000 },
  { id: 'proc6', name: 'Pembersihan & Jahit Luka (Minor Surgery)', price: 350000 }
];

export const ClinicModule: React.FC<ClinicModuleProps> = ({ activeModule }) => {
  const {
    clinicVisits = [],
    pets = [],
    drugs = [],
    saveSOAPNote,
    dispenseDrug,
    addInvoice,
    eFormTemplates = [],
    eFormSubmissions = [],
    addEFormSubmission,
    updateVisitStatus,
    updateClinicVisit,
    carePlans = [],
    addCarePlan,
    toggleCarePlanTask,
    medicalRecords = [],
    soapNotes = [],
    inpatients = []
  } = useData();

  const { addToast } = useToast();

  const [selectedVisitId, setSelectedVisitId] = useState<string>(clinicVisits[0]?.id || '');
  // Guard tombol Simpan SOAP: klik ganda / re-select visit yang sudah
  // 'Selesai' sebelumnya bisa memicu dispenseDrug & addInvoice dobel untuk
  // kunjungan yang sama karena tidak ada pengecekan status/in-flight.
  const [isSavingSOAP, setIsSavingSOAP] = useState(false);

  // Tab state synced with activeModule
  const [activeTab, setActiveTab] = useState<'soap' | 'vitals' | 'anatomical' | 'carePlan' | 'eform'>(
    activeModule === 'carePlan' ? 'carePlan' : activeModule === 'eForms' ? 'eform' : 'soap'
  );

  useEffect(() => {
    if (activeModule === 'carePlan') setActiveTab('carePlan');
    else if (activeModule === 'eForms') setActiveTab('eform');
    else if (activeModule === 'clinic') setActiveTab('soap');
  }, [activeModule]);

  const selectedVisit = clinicVisits.find((v) => v.id === selectedVisitId) || clinicVisits[0];
  const selectedPet = pets.find((p) => p.id === selectedVisit?.petId);

  // Default initial values for current selected visit & pet
  const defaultSoapValues: SoapDraftData = {
    chiefComplaint: selectedVisit?.complaint || '',
    hpi: 'Nafsu makan menurun sejak 2 hari lalu, agak lemas.',
    tempC: 38.5,
    hr: 110,
    rr: 28,
    weightKg: selectedPet?.weightKg || 4.2,
    examNotes: 'Auskultasi paru bersih, turgor kulit normal, selaput lendir merah muda.',
    diagnosis: 'Gastritis Akut Mild',
    diffDiag: 'Pankreatitis, Intoleransi Pakan',
    severity: 'Ringan',
    prescribedList: [
      { drugId: drugs[0]?.id || 'd1', drugName: drugs[0]?.name || 'Amoxicillin 250mg', dosage: '1/2 tablet', frequency: '2x1 hari sesudah makan', durationDays: 5, qty: 5 }
    ],
    bodyNotes: {
      Telinga: 'Bebas tungau ear mite, bersih',
      'Gigi & Mulut': 'Tartar ringan pada premolar atas kanan',
      Abdomen: 'Palpasi abdomen sedikit tegang/sensitif'
    },
    signedName: selectedVisit?.customerName || '',
    selectedTemplateId: eFormTemplates[0]?.id || 'ef1',
    selectedTreatments: ['proc1', 'proc2']
  };

  // Debounced LocalStorage Auto-Save Hook
  const storageKey = selectedVisitId ? `petcare_clinic_soap_draft_${selectedVisitId}` : 'petcare_clinic_soap_draft_default';
  const {
    draft: soapDraft,
    setDraft: setSoapDraft,
    clearDraft
  } = useAutoSaveDraft<SoapDraftData>(storageKey, defaultSoapValues, 500);

  const updateDraft = (fields: Partial<SoapDraftData>) => {
    setSoapDraft((prev) => ({ ...prev, ...fields }));
  };

  // ICD-10 Modal & Filter
  const [showIcdModal, setShowIcdModal] = useState(false);
  const [icdSearchTerm, setIcdSearchTerm] = useState('');

  // Drug Prescription State
  const [selectedDrugId, setSelectedDrugId] = useState<string>(drugs[0]?.id || '');
  const [dosageInput, setDosageInput] = useState<string>('1 tablet');
  const [freqInput, setFreqInput] = useState<string>('2x1 hari');
  const [daysInput, setDaysInput] = useState<number>(5);

  // Anatomical Body Map Selection
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);

  // E-Form Signature Pad State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasConsentSignature, setHasConsentSignature] = useState(false);

  // Care Plan Creation Modal
  const [showAddCarePlanModal, setShowAddCarePlanModal] = useState(false);
  const [cpTitle, setCpTitle] = useState('Rencana Rehabilitasi & Terapi Pasca Operasi');
  const [cpDiagnosis, setCpDiagnosis] = useState('Pasca Operasi Steril / Laparotomi');
  const [cpEndDate, setCpEndDate] = useState('2026-08-25');
  const [cpTasksText, setCpTasksText] = useState("Pemberian Antibiotik Harian\nPembersihan Jahitan & Betadine\nKontrol Ulang Hari Ke-7\nDiet Lunak Mudah Dicerna");

  // Selected E-Form Preview Modal
  const [viewConsentItem, setViewConsentItem] = useState<any | null>(null);

  // New Clinical Feature Modals
  const [showInformedConsentModal, setShowInformedConsentModal] = useState(false);
  const [showPetPassportModal, setShowPetPassportModal] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);

  // AI Medical History to SOAP Modal State
  const [showAiSoapModal, setShowAiSoapModal] = useState(false);
  const [isAiSoapLoading, setIsAiSoapLoading] = useState(false);
  const [aiSoapUnstructuredInput, setAiSoapUnstructuredInput] = useState('');
  const [aiSoapAnalysis, setAiSoapAnalysis] = useState<any | null>(null);

  const openAiSoapModal = () => {
    // Generate compilation of past EMR for this patient
    const petId = selectedVisit?.petId;
    const pet = pets.find((p) => p.id === petId);

    const pastRecords = medicalRecords.filter((m) => m.petId === petId);
    const pastVisits = clinicVisits.filter((v) => v.petId === petId && v.id !== selectedVisit?.id);
    const pastSoaps = soapNotes.filter((s) => s.petId === petId);
    const pastInpatients = inpatients.filter((i) => i.petId === petId);

    let summary = `[Identitas Pasien]: ${pet?.name || selectedVisit?.petName || 'Pasien'} (${pet?.species || selectedVisit?.species || 'Kucing'} - ${pet?.breed || 'Domestic'})\n`;
    summary += `[Alergi Obat/Pakan]: ${pet?.allergies || 'Tidak ada riwayat alergi yang dilaporkan'}\n`;
    summary += `[Keluhan Kunjungan Saat Ini]: ${selectedVisit?.complaint || soapDraft.chiefComplaint || 'Pemeriksaan rutin'}\n\n`;

    if (pastVisits.length > 0) {
      summary += `--- RIWAYAT KUNJUNGAN LALU ---\n`;
      pastVisits.forEach((v) => {
        summary += `• Tanggal ${v.queuedAt}: Keluhan "${v.complaint}" (Dokter: ${v.doctorName})\n`;
      });
      summary += `\n`;
    }

    if (pastSoaps.length > 0) {
      summary += `--- REKAM MEDIS & SOAP TERDAHULU ---\n`;
      pastSoaps.forEach((s) => {
        summary += `• [${s.date}] Diagnosis: ${s.workingDiagnosis} | Terapi: ${s.medicationPlan}\n`;
      });
      summary += `\n`;
    }

    if (pastRecords.length > 0) {
      summary += `--- CATATAN TINDAKAN EMR ---\n`;
      pastRecords.forEach((r) => {
        summary += `• [${r.date}] ${r.title}: ${r.description}\n`;
      });
      summary += `\n`;
    }

    if (pastInpatients.length > 0) {
      summary += `--- RIWAYAT RAWAT INAP ---\n`;
      pastInpatients.forEach((inp) => {
        summary += `• Rawat Inap No ${inp.inpatientNo}: ${inp.diagnosis} (${inp.status})\n`;
      });
      summary += `\n`;
    }

    summary += `[Catatan Anamnesis / Observasi Tambahan]: Pemilik mengeluhkan gejala kambuhan sejak 2 hari terakhir.`;

    setAiSoapUnstructuredInput(summary);
    setAiSoapAnalysis(null);
    setShowAiSoapModal(true);
  };

  const handleRunAiSoapAnalysis = async () => {
    if (!aiSoapUnstructuredInput.trim()) {
      addToast('Masukkan teks riwayat medis terlebih dahulu.', 'error');
      return;
    }
    setIsAiSoapLoading(true);

    const pet = pets.find((p) => p.id === selectedVisit?.petId);

    try {
      const res = await fetch('/api/ai/analyze-history-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          petInfo: {
            name: pet?.name || selectedVisit?.petName || 'Pasien',
            species: pet?.species || selectedVisit?.species || 'Kucing',
            breed: pet?.breed || 'Domestic',
            birthDate: pet?.birthDate || '2023-01-01',
            weightKg: pet?.weightKg || soapDraft.weightKg || 4.0,
            allergies: pet?.allergies || 'Tidak ada riwayat alergi',
            customerName: pet?.customerName || selectedVisit?.customerName || 'Pemilik'
          },
          unstructuredHistoryText: aiSoapUnstructuredInput,
          currentComplaint: selectedVisit?.complaint || soapDraft.chiefComplaint || 'Pemeriksaan klinis'
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAiSoapAnalysis(json.data);
        addToast('Sintesis SOAP dari riwayat medis berhasil di-generate AI!', 'success');
      } else {
        throw new Error('Gagal memproses data AI');
      }
    } catch (err) {
      console.error(err);
      addToast('Terjadi kesalahan memproses AI. Menggunakan format cadangan.', 'error');
    } finally {
      setIsAiSoapLoading(false);
    }
  };

  const handleApplyAiSoapToDraft = () => {
    if (!aiSoapAnalysis) return;

    // Map suggested drugs to store catalogue
    const newPrescriptions = (aiSoapAnalysis.plan.suggestedDrugs || []).map((d: any) => {
      const foundDrug = drugs.find(
        (dr) =>
          dr.name.toLowerCase().includes(d.drugName.toLowerCase()) ||
          d.drugName.toLowerCase().includes(dr.name.toLowerCase())
      );
      return {
        drugId: foundDrug?.id || drugs[0]?.id || 'd1',
        drugName: foundDrug?.name || d.drugName,
        dosage: d.dosage || '1 tablet',
        frequency: d.frequency || '2x1 hari',
        durationDays: d.durationDays || 5,
        qty: Math.max(2, (d.durationDays || 5) * 2)
      };
    });

    updateDraft({
      chiefComplaint: aiSoapAnalysis.chiefComplaint || soapDraft.chiefComplaint,
      hpi: aiSoapAnalysis.subjective?.historyOfPresentIllness || soapDraft.hpi,
      tempC: aiSoapAnalysis.objective?.suggestedTempC || soapDraft.tempC,
      hr: aiSoapAnalysis.objective?.suggestedHr || soapDraft.hr,
      rr: aiSoapAnalysis.objective?.suggestedRr || soapDraft.rr,
      weightKg: aiSoapAnalysis.objective?.suggestedWeightKg || soapDraft.weightKg,
      examNotes: `${aiSoapAnalysis.objective?.physicalExamFocus || ''} | ${aiSoapAnalysis.subjective?.pastMedicalHistorySummary || ''}`.trim(),
      diagnosis: aiSoapAnalysis.assessment?.workingDiagnosis || soapDraft.diagnosis,
      diffDiag: aiSoapAnalysis.assessment?.differentialDiagnosis || soapDraft.diffDiag,
      severity: aiSoapAnalysis.assessment?.severity || soapDraft.severity,
      bodyNotes: aiSoapAnalysis.objective?.anatomicalFindings || soapDraft.bodyNotes,
      prescribedList: newPrescriptions.length > 0 ? newPrescriptions : soapDraft.prescribedList
    });

    setShowAiSoapModal(false);
    addToast('Seluruh hasil ringkasan SOAP AI berhasil diterapkan ke form SOAP pasien ini!', 'success');
  };

  const handleApplyTriageSuggestion = (result: any) => {
    let mappedSeverity: 'Kritis' | 'Berat' | 'Sedang' | 'Ringan' = 'Sedang';
    if (result.level === 'P1') mappedSeverity = 'Kritis';
    else if (result.level === 'P2') mappedSeverity = 'Berat';
    else if (result.level === 'P3') mappedSeverity = 'Sedang';
    else mappedSeverity = 'Ringan';

    updateDraft({
      severity: mappedSeverity
    });

    if (selectedVisit?.id) {
      updateClinicVisit(selectedVisit.id, {
        triageUrgency: result.level,
        triageRationale: result.triageRationale,
        triageScore: result.severityScore
      }).catch((err: any) => addToast(err?.message || 'Gagal menyimpan hasil triase ke server.', 'error'));
    }

    addToast(
      `Saran Triase AI (${result.level} - ${result.label}) berhasil diterapkan! Indikator Urgensi Pasien & Keparahan SOAP diperbarui.`,
      'success'
    );
  };

  const addDrugToPrescription = () => {
    const drug = drugs.find((d) => d.id === selectedDrugId);
    if (!drug) return;
    if (drug.stock <= 0) {
      addToast(`Stok ${drug.name} sedang habis!`, 'error');
      return;
    }
    const newPrescription = {
      drugId: drug.id,
      drugName: drug.name,
      dosage: dosageInput,
      frequency: freqInput,
      durationDays: daysInput,
      qty: Math.ceil(daysInput * 2)
    };
    updateDraft({
      prescribedList: [...soapDraft.prescribedList, newPrescription]
    });
    addToast(`${drug.name} ditambahkan ke resep.`, 'success');
  };

  const handleApplyCalculatedDose = (presc: {
    drugName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    qty: number;
    notes?: string;
  }) => {
    const foundDrug = drugs.find(
      (dr) =>
        dr.name.toLowerCase().includes(presc.drugName.toLowerCase()) ||
        presc.drugName.toLowerCase().includes(dr.name.toLowerCase())
    );
    const newPrescription = {
      drugId: foundDrug?.id || drugs[0]?.id || 'd1',
      drugName: foundDrug?.name || presc.drugName,
      dosage: presc.dosage,
      frequency: presc.frequency,
      durationDays: presc.durationDays,
      qty: presc.qty
    };
    updateDraft({
      prescribedList: [...soapDraft.prescribedList, newPrescription]
    });
  };

  const removeDrugFromPrescription = (index: number) => {
    const newList = soapDraft.prescribedList.filter((_, i) => i !== index);
    updateDraft({ prescribedList: newList });
  };

  const toggleProcedure = (procId: string) => {
    const exists = soapDraft.selectedTreatments.includes(procId);
    let updated: string[];
    if (exists) {
      updated = soapDraft.selectedTreatments.filter((id) => id !== procId);
    } else {
      updated = [...soapDraft.selectedTreatments, procId];
    }
    updateDraft({ selectedTreatments: updated });
  };

  const handleSelectIcdCode = (item: typeof ICD10_VET_CATALOG[0]) => {
    updateDraft({
      diagnosis: `[${item.code}] ${item.name}`,
      diffDiag: item.diff
    });
    setShowIcdModal(false);
    addToast(`Diagnosis ICD-10 [${item.code}] berhasil dipilih.`, 'info');
  };

  const handleSaveSOAP = async () => {
    if (!selectedVisit || isSavingSOAP) return;
    if (selectedVisit.status === 'Selesai') {
      addToast('Kunjungan ini sudah Selesai & tertagih. Pilih pasien lain dari Antrean.', 'warning');
      return;
    }
    setIsSavingSOAP(true);
    try {
    // Save SOAP Note
    saveSOAPNote({
      visitId: selectedVisit.id,
      petId: selectedVisit.petId,
      doctorId: selectedVisit.doctorId,
      doctorName: selectedVisit.doctorName,
      date: new Date().toISOString().substring(0, 10),
      chiefComplaint: soapDraft.chiefComplaint,
      historyOfPresentIllness: soapDraft.hpi,
      temperatureC: soapDraft.tempC,
      heartRate: soapDraft.hr,
      respiratoryRate: soapDraft.rr,
      weightKg: soapDraft.weightKg,
      physicalExamNotes: `${soapDraft.examNotes} | Catatan anatomi: ${Object.entries(soapDraft.bodyNotes)
        .map(([part, note]) => `${part}: ${note}`)
        .join('; ')}`,
      workingDiagnosis: soapDraft.diagnosis,
      differentialDiagnosis: soapDraft.diffDiag,
      severityScore: soapDraft.severity,
      medicationPlan: soapDraft.prescribedList.map((p) => `${p.drugName} (${p.dosage} - ${p.frequency})`).join(', '),
      prescribedDrugs: soapDraft.prescribedList,
      investigationInstructions: 'Follow-up jika tidak ada nafsu makan dalam 3 hari',
      patientEducation: 'Berikan makanan lunak basah porsi kecil tapi sering.',
      isFinalized: true
    });

    // Dispense drugs from stock
    soapDraft.prescribedList.forEach((p) => {
      dispenseDrug(p.drugId, p.qty);
    });

    // Tindakan medis yang dicentang dokter (label UI-nya sendiri bilang
    // "Masuk Billing Klinik") sebelumnya cuma disimpan ke draft lokal dan
    // hilang begitu SOAP disimpan — tidak pernah benar-benar ditagihkan.
    // Sekarang diteruskan sebagai invoice 'Belum Dibayar' ke Kasir (dokter
    // tidak menagih langsung; pelunasan tetap lewat Billing & Kasir seperti
    // alur normal, memakai processPayment yang sama).
    const treatmentItems = soapDraft.selectedTreatments
      .map((id) => MEDICAL_PROCEDURES.find((proc) => proc.id === id))
      .filter((proc): proc is (typeof MEDICAL_PROCEDURES)[number] => !!proc)
      .map((proc) => ({
        id: 'inv_item_' + Date.now() + Math.random(),
        category: 'Klinik',
        name: proc.name,
        quantity: 1,
        unitPrice: proc.price,
        totalPrice: proc.price
      }));

    if (treatmentItems.length > 0) {
      const subtotal = treatmentItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await addInvoice({
        customerId: selectedVisit.customerId,
        customerName: selectedVisit.customerName,
        petName: selectedVisit.petName,
        items: treatmentItems,
        subtotal,
        discountAmount: 0,
        totalAmount: subtotal,
        paidAmount: 0,
        paymentMethod: 'Tunai',
        status: 'Belum Dibayar',
        loyaltyPointsEarned: 0,
        cashierName: selectedVisit.doctorName || 'Dokter'
      });
      addToast(`Tagihan tindakan medis Rp ${subtotal.toLocaleString('id-ID')} untuk ${selectedVisit.petName} diteruskan ke Kasir.`, 'success');
    }

    // Mark visit finished
    await updateVisitStatus(selectedVisit.id, 'Selesai');

    // Clear auto-saved draft from localStorage after successful submission
    clearDraft();

    addToast(`SOAP Note untuk ${selectedVisit.petName} tersimpan & draft lokal telah dibersihkan.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Gagal menyimpan SOAP Note ke server.', 'error');
    } finally {
      setIsSavingSOAP(false);
    }
  };

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.strokeStyle = '#1B2A45';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasConsentSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasConsentSignature(false);
  };

  const handleSaveConsent = () => {
    // Sebelumnya tab ini bisa menyimpan status 'Ditandatangani' walau kanvas
    // kosong (beda dari InformedConsentModal yang mewajibkan tanda tangan
    // terisi) — signatureData jadi data URL kosong/transparan tapi status
    // tetap mengklaim sudah ditandatangani.
    if (!hasConsentSignature) {
      addToast('Harap bubuhkan tanda tangan digital pada kotak yang tersedia sebelum menyimpan persetujuan.', 'error');
      return;
    }

    const template = eFormTemplates.find((t) => t.id === soapDraft.selectedTemplateId) || eFormTemplates[0];
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL() : '';

    addEFormSubmission({
      templateId: template.id,
      templateTitle: template.title,
      petName: selectedVisit?.petName || 'Pasien',
      customerName: soapDraft.signedName || selectedVisit?.customerName || 'Pemilik',
      status: 'Ditandatangani',
      fieldValues: {
        tanggal: new Date().toLocaleDateString('id-ID'),
        namaPemilik: soapDraft.signedName || selectedVisit?.customerName || 'Pemilik',
        persetujuan: true
      },
      signatureData
    });

    addToast(`Informed Consent ${template.title} berhasil ditandatangani digital!`, 'success');
  };

  const handleCreateCarePlan = () => {
    if (!selectedPet) {
      addToast('Pilih pasien terlebih dahulu.', 'error');
      return;
    }
    const lines = cpTasksText.split('\n').filter((l) => l.trim().length > 0);
    const tasks = lines.map((l, idx) => ({
      id: `cpt_${Date.now()}_${idx}`,
      type: 'Obat' as const,
      title: l.trim(),
      dueDate: new Date(Date.now() + idx * 86400000).toISOString().substring(0, 10),
      isCompleted: false
    }));

    addCarePlan({
      petId: selectedPet.id,
      petName: selectedPet.name,
      customerName: selectedPet.customerName,
      doctorName: selectedVisit?.doctorName || 'Drh. Anisa',
      title: cpTitle,
      diagnosis: cpDiagnosis,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: cpEndDate,
      status: 'Aktif',
      tasks
    });

    setShowAddCarePlanModal(false);
    addToast(`Rencana Care Plan "${cpTitle}" untuk ${selectedPet.name} berhasil ditambahkan!`, 'success');
  };

  const filteredIcdCatalog = ICD10_VET_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(icdSearchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(icdSearchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(icdSearchTerm.toLowerCase())
  );

  const headerContent =
    activeTab === 'carePlan'
      ? {
          icon: HeartPulse,
          title: 'Rencana Care Plan Medis & Rehabilitasi Pasien',
          description: 'Program terapi jangka panjang, milestone rehabilitasi pasca-operasi, dan pengobatan penyakit kronis pasien.',
          badges: [
            { label: `${carePlans.length} Program Care Plan`, variant: 'gold' as const },
            { label: `${carePlans.filter(cp => cp.status === 'Aktif').length} Sedang Berjalan`, variant: 'emerald' as const, icon: Activity, pulse: true }
          ]
        }
      : activeTab === 'eform'
      ? {
          icon: FileSignature,
          title: 'E-Form Consent & Tanda Tangan Digital',
          description: 'Persetujuan tindakan medis, anestesi, dan operasi dengan tanda tangan digital pemilik hewan.',
          badges: [
            { label: `${eFormSubmissions.length} Formulir Tersimpan`, variant: 'gold' as const }
          ]
        }
      : {
          icon: Stethoscope,
          title: 'Pemeriksaan Klinik & Posologi Veteriner',
          description: 'Sistem rekam medis terintegrasi: EMR SOAP, katalog ICD-10 Vet, peta anatomi, kalkulator dosis presisi, & care plan.',
          badges: [
            { label: 'EMR Medis Aktif', variant: 'emerald' as const, icon: Activity, pulse: true },
            { label: `${clinicVisits.filter(v => v.status === 'Sedang Diperiksa').length} Antrean Aktif`, variant: 'gold' as const }
          ]
        };

  return (
    <div className="space-y-5">
      {/* Standardized Header */}
      <SystemNotificationHeader
        icon={headerContent.icon}
        title={headerContent.title}
        description={headerContent.description}
        badges={headerContent.badges}
        tabs={[
          { id: 'soap', label: 'SOAP & Diagnosa', icon: Stethoscope },
          { id: 'vitals', label: 'Tanda Vital (Sparklines)', icon: Activity },
          { id: 'anatomical', label: 'Peta Anatomi', icon: Eye },
          { id: 'carePlan', label: 'Care Plan Medis', icon: HeartPulse, count: carePlans.length },
          { id: 'eform', label: 'Digital Consent', icon: FileSignature }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        stats={[
          { label: 'Total Pasien Hari Ini', value: clinicVisits.length, variant: 'default' },
          { label: 'Sedang Diperiksa', value: clinicVisits.filter(v => v.status === 'Sedang Diperiksa').length, variant: 'amber' },
          { label: 'Selesai Dilayani', value: clinicVisits.filter(v => v.status === 'Selesai').length, variant: 'emerald' }
        ]}
      />

      {/* Select Active Clinic Patient - Dropdown List Format */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5 shrink-0">
            <User className="w-4 h-4 text-[#B8905A]" /> Dropdown Antrean Pasien Klinik:
          </label>

          <div className="relative flex-1 max-w-xl">
            <select
              value={selectedVisitId}
              onChange={(e) => setSelectedVisitId(e.target.value)}
              className="w-full bg-[#F6F1E6] hover:bg-white text-[#1B2A45] text-xs font-bold rounded-xl px-3.5 py-2.5 border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] shadow-2xs transition-all cursor-pointer"
            >
              {clinicVisits.map((v) => (
                <option key={v.id} value={v.id}>
                  Antrean #{v.queueNo}: {v.petName} ({v.petSpecies || 'Pasien'}) • Pemilik: {v.customerName} • Status: [{v.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Patient Banner Snapshot */}
        {selectedVisit && (
          <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E1D6BE]/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1B2A45] text-amber-300 font-mono font-black flex items-center justify-center text-xs shadow-2xs">
                #{selectedVisit.queueNo}
              </div>
              <div>
                <p className="font-bold text-[#1B2A45]">
                  {selectedVisit.petName} <span className="font-normal text-[#6B6656]">({selectedVisit.petSpecies || 'Anjing / Kucing'})</span>
                </p>
                <p className="text-[11px] text-[#6B6656]">
                  Pemilik: <strong className="text-[#1B2A45]">{selectedVisit.customerName}</strong> • Keluhan: {selectedVisit.complaint || 'Pemeriksaan Rutin'}
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {selectedPet && (
                <TriageUrgencyBadge
                  pet={selectedPet}
                  clinicVisit={selectedVisit}
                  draftSoap={soapDraft}
                  soapNote={soapNotes.find((s) => s.petId === selectedPet.id || s.visitId === selectedVisit.id)}
                  onApplyTriage={handleApplyTriageSuggestion}
                  onClick={() => setShowTriageModal(true)}
                />
              )}

              <button
                type="button"
                onClick={() => setShowInformedConsentModal(true)}
                className="px-2.5 py-1.5 bg-[#FFFDF9] hover:bg-[#B8905A]/15 text-[#1B2A45] hover:text-[#9E7848] border border-[#E1D6BE] hover:border-[#B8905A] rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Buka Persetujuan Tindakan Medis (Informed Consent E-Signature)"
              >
                <PenTool className="w-3.5 h-3.5 text-[#B8905A]" />
                <span>Informed Consent</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPetPassportModal(true)}
                className="px-2.5 py-1.5 bg-[#FFFDF9] hover:bg-emerald-50 text-[#1B2A45] hover:text-emerald-800 border border-[#E1D6BE] hover:border-emerald-400 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Buka Paspor Kesehatan Digital Pasien Ini"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paspor Kesehatan</span>
              </button>

              <span className="text-[11px] text-[#6B6656]">Dokter: <strong className="text-[#1B2A45]">{selectedVisit.doctorName || 'drh. Ananda'}</strong></span>
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                  selectedVisit.status === 'Sedang Diperiksa'
                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                    : selectedVisit.status === 'Selesai'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                ● {selectedVisit.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Active Tab View */}
      {activeTab === 'soap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: SOAP Editor */}
          <div className="lg:col-span-2 space-y-5">
            {/* AI Assistant Quick Trigger Banner */}
            <div className="bg-[#1B2A45] text-[#FFFDF9] rounded-xl p-4 border border-[#B8905A]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B8905A]/20 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#D9B98A] flex items-center gap-1.5 font-display">
                    AI Medical History Synthesizer (Gemini 3.7)
                  </h4>
                  <p className="text-[11px] text-[#EDE6D6]/80">
                    Otomatisasikan ringkasan rekam jejak, vitalitas, diagnosis ICD-10, & peresepan obat dari riwayat pasien {selectedVisit?.petName || 'ini'}.
                  </p>
                </div>
              </div>

              <button
                onClick={openAiSoapModal}
                className="px-3.5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" /> Analisis Riwayat Medis AI
              </button>
            </div>

            {/* Vital Signs Sparklines Summary Component */}
            <VitalSignsSummary
              petId={selectedVisit?.petId}
              petName={selectedVisit?.petName}
              species={selectedVisit?.petSpecies || selectedPet?.species}
              currentDraftVitals={{
                tempC: soapDraft.tempC,
                hr: soapDraft.hr,
                rr: soapDraft.rr,
                weightKg: soapDraft.weightKg
              }}
              onApplyVitalsToDraft={(v) => updateDraft(v)}
            />

            {/* Subjective & Vitals */}
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#B8905A]" /> S (Subjective) & O (Objective Vitals)
                </h3>
                <span className="text-xs text-[#6B6656] font-medium">
                  Dokter: {selectedVisit?.doctorName || 'Drh. Anisa'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1B2A45] block mb-1">Keluhan Utama</label>
                  <input
                    type="text"
                    value={soapDraft.chiefComplaint}
                    onChange={(e) => updateDraft({ chiefComplaint: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] focus:outline-none focus:border-[#B8905A]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1B2A45] block mb-1">Riwayat Penyakit (HPI)</label>
                  <input
                    type="text"
                    value={soapDraft.hpi}
                    onChange={(e) => updateDraft({ hpi: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] focus:outline-none focus:border-[#B8905A]"
                  />
                </div>
              </div>

              {/* Vital Signs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F6F1E6]/50 p-3 rounded-lg border border-[#E1D6BE]">
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block">Suhu (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={soapDraft.tempC}
                    onChange={(e) => updateDraft({ tempC: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2 mt-1 rounded bg-[#FFFDF9] border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block">Detak Jantung (BPM)</label>
                  <input
                    type="number"
                    value={soapDraft.hr}
                    onChange={(e) => updateDraft({ hr: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2 mt-1 rounded bg-[#FFFDF9] border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block">Laju Napas (RR)</label>
                  <input
                    type="number"
                    value={soapDraft.rr}
                    onChange={(e) => updateDraft({ rr: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2 mt-1 rounded bg-[#FFFDF9] border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#6B6656] block">Berat Badan (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={soapDraft.weightKg}
                    onChange={(e) => updateDraft({ weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-bold p-2 mt-1 rounded bg-[#FFFDF9] border border-[#E1D6BE] text-[#1B2A45]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1B2A45] block mb-1">Catatan Pemeriksaan Fisik</label>
                <textarea
                  rows={2}
                  value={soapDraft.examNotes}
                  onChange={(e) => updateDraft({ examNotes: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] focus:outline-none focus:border-[#B8905A]"
                />
              </div>
            </div>

            {/* Assessment & ICD-10 Picker */}
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
                <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#B8905A]" /> A (Assessment) & Katalog ICD-10 Vet
                </h3>
                <button
                  onClick={() => setShowIcdModal(true)}
                  className="px-3 py-1 bg-[#1B2A45] text-[#D9B98A] hover:bg-[#101A2C] text-xs font-bold rounded-lg border border-[#B8905A]/30 flex items-center gap-1 transition-all"
                >
                  <Search className="w-3.5 h-3.5" /> Cari ICD-10 Vet
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-[#1B2A45] block mb-1">Diagnosis Kerja</label>
                  <input
                    type="text"
                    value={soapDraft.diagnosis}
                    onChange={(e) => updateDraft({ diagnosis: e.target.value })}
                    placeholder="Contoh: [K29.7] Gastritis Akut"
                    className="w-full text-xs p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] font-bold text-[#1B2A45]"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-semibold text-[#1B2A45] block mb-1">Diagnosis Banding</label>
                  <input
                    type="text"
                    value={soapDraft.diffDiag}
                    onChange={(e) => updateDraft({ diffDiag: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE]"
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#1B2A45] block">Tingkat Keparahan</label>
                    <button
                      type="button"
                      onClick={() => setShowTriageModal(true)}
                      className="text-[10px] text-[#B8905A] hover:text-[#9E7848] font-bold flex items-center gap-1 cursor-pointer"
                      title="Buka Saran Triase AI & Otomatis Isi Indikator Urgensi"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" /> Saran Triase AI
                    </button>
                  </div>
                  <select
                    value={soapDraft.severity}
                    onChange={(e) => updateDraft({ severity: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] font-bold text-[#1B2A45]"
                  >
                    <option value="Ringan">Ringan (P4 Routine)</option>
                    <option value="Sedang">Sedang (P3 Semi-Urgent)</option>
                    <option value="Berat">Berat (P2 Urgent)</option>
                    <option value="Kritis">Kritis (P1 Emergency)</option>
                  </select>
                </div>
              </div>

              {/* Medical Procedures Checklist */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-[#1B2A45] block">
                  Pilih Tindakan Medis / Operasional (Masuk Billing Klinik):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MEDICAL_PROCEDURES.map((proc) => {
                    const isChecked = soapDraft.selectedTreatments.includes(proc.id);
                    return (
                      <button
                        type="button"
                        key={proc.id}
                        onClick={() => toggleProcedure(proc.id)}
                        className={`p-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-all ${
                          isChecked
                            ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45] font-bold shadow-2xs'
                            : 'bg-[#F6F1E6] text-[#22242B] border-[#E1D6BE] hover:border-[#B8905A]'
                        }`}
                      >
                        <span className="truncate">{proc.name}</span>
                        <span className={`text-[11px] shrink-0 font-bold ${isChecked ? 'text-[#D9B98A]' : 'text-[#6B6656]'}`}>
                          Rp {proc.price.toLocaleString('id-ID')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resep Dokter & Potong Stok */}
              <div className="bg-[#F6F1E6]/60 p-4 rounded-xl border border-[#E1D6BE] space-y-3">
                <h4 className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-[#B8905A]" /> Resep Obat & Potong Stok Apotek
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-[#6B6656]">Pilih Obat Farmasi</label>
                    <select
                      value={selectedDrugId}
                      onChange={(e) => setSelectedDrugId(e.target.value)}
                      className="w-full text-xs p-2 rounded bg-[#FFFDF9] border border-[#E1D6BE]"
                    >
                      {drugs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Stok: {d.stock} {d.unit}) - Rp {d.unitPrice.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#6B6656]">Dosis / Aturan</label>
                    <input
                      type="text"
                      value={dosageInput}
                      onChange={(e) => setDosageInput(e.target.value)}
                      className="w-full text-xs p-2 rounded bg-[#FFFDF9] border border-[#E1D6BE]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addDrugToPrescription}
                      className="w-full py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Obat
                    </button>
                  </div>
                </div>

                {/* Table Prescribed */}
                <div className="divide-y divide-[#E1D6BE] border border-[#E1D6BE] rounded-lg bg-[#FFFDF9]">
                  {soapDraft.prescribedList.map((p, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-[#1B2A45]">{p.drugName}</p>
                        <p className="text-[10px] text-[#6B6656]">
                          Dosis: {p.dosage} | Aturan: {p.frequency} ({p.durationDays} hari)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold px-2 py-0.5 rounded bg-[#1B2A45] text-[#D9B98A] text-[10px]">
                          Qty: {p.qty}
                        </span>
                        <button
                          onClick={() => removeDrugFromPrescription(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Hapus obat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={handleSaveSOAP}
                  disabled={isSavingSOAP || selectedVisit?.status === 'Selesai'}
                  className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] disabled:opacity-50 disabled:cursor-not-allowed text-[#FFFDF9] text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#D9B98A]" />
                  {isSavingSOAP ? 'Menyimpan...' : 'Simpan SOAP & Potong Stok Farmasi'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Patient Summary & Quick Dose Helper */}
          <div className="space-y-5">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
                Profil Pasien Diperiksa
              </h3>
              {selectedPet ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#6B6656]">Nama Pasien:</span>
                    <span className="font-bold text-[#1B2A45]">{selectedPet.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6656]">Spesies / Ras:</span>
                    <span className="font-semibold text-[#22242B]">
                      {selectedPet.species} ({selectedPet.breed})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6656]">Umur & Berat:</span>
                    <span className="font-semibold text-[#22242B]">{selectedPet.weightKg} Kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6656]">Pemilik:</span>
                    <span className="font-bold text-[#1B2A45]">{selectedPet.customerName}</span>
                  </div>
                  {selectedPet.allergies && (
                    <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Alergi: {selectedPet.allergies}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#6B6656]">Pilih antrean pasien di atas.</p>
              )}
            </div>

            {/* Quick Dose Calculator Card */}
            <DoseCalculator
              defaultWeightKg={soapDraft.weightKg || selectedPet?.weightKg || 4.2}
              defaultSpecies={selectedVisit?.petSpecies || selectedPet?.species || 'Anjing'}
              patientName={selectedVisit?.petName || selectedPet?.name}
              patientId={selectedPet?.id || selectedVisit?.petId}
              currentPrescriptions={soapDraft.prescribedList}
              onApplyToPrescription={handleApplyCalculatedDose}
            />
          </div>
        </div>
      )}

      {/* Vital Signs Sparkline Dashboard Tab */}
      {activeTab === 'vitals' && (
        <div className="space-y-5">
          <VitalSignsSummary
            petId={selectedVisit?.petId}
            petName={selectedVisit?.petName}
            species={selectedVisit?.petSpecies || selectedPet?.species}
            currentDraftVitals={{
              tempC: soapDraft.tempC,
              hr: soapDraft.hr,
              rr: soapDraft.rr,
              weightKg: soapDraft.weightKg
            }}
            onApplyVitalsToDraft={(v) => {
              updateDraft(v);
              setActiveTab('soap');
            }}
          />

          {/* Clinical Insights & Species Physiological Reference Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <h4 className="font-bold text-xs text-[#1B2A45] font-display flex items-center gap-1.5 border-b border-[#E1D6BE] pb-2">
                <Info className="w-4 h-4 text-[#B8905A]" /> Standar Fisiologis Hewan Kecil (Small Animal Vitals Reference)
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#F6F1E6]/70 border border-[#E1D6BE] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#1B2A45]">Anjing (Canine):</span>
                    <p className="text-[11px] text-[#6B6656]">Suhu: 37.8 - 39.2 °C | HR: 70 - 140 BPM | RR: 18 - 34 RPM</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#1B2A45] text-[#D9B98A] px-2 py-0.5 rounded">
                    Canis lupus
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F6F1E6]/70 border border-[#E1D6BE] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#1B2A45]">Kucing (Feline):</span>
                    <p className="text-[11px] text-[#6B6656]">Suhu: 38.1 - 39.2 °C | HR: 140 - 220 BPM | RR: 20 - 40 RPM</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#1B2A45] text-[#D9B98A] px-2 py-0.5 rounded">
                    Felis catus
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <h4 className="font-bold text-xs text-[#1B2A45] font-display flex items-center gap-1.5 border-b border-[#E1D6BE] pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Tanda Peringatan Klinis (Red Flag Protocol)
              </h4>
              <ul className="text-xs text-[#22242B] space-y-2 list-disc list-inside">
                <li><strong className="text-rose-700">Demam Tinggi (&gt; 39.5°C):</strong> Evaluasi infeksi sistemik, sepsis, atau heat stroke.</li>
                <li><strong className="text-blue-700">Hipotermia (&lt; 37.5°C):</strong> Indikasi syok sirkulasi, koma miksedema, atau dehidrasi berat.</li>
                <li><strong className="text-rose-700">Takikardia Ekstrem:</strong> Nyeri akut, dehidrasi derajat sedang-berat, atau aritmia.</li>
                <li><strong className="text-amber-800">Penurunan Berat Badan &gt;10%:</strong> Skrining penyakit metabolik (CKD, DM, hipertiroid).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Anatomical Body Map Tab */}
      {activeTab === 'anatomical' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <Activity className="w-4 h-4 text-[#B8905A]" /> Visual Peta Anatomi & Organ Pasien ({selectedPet?.species || 'Hewan'})
            </h3>

            {/* Interactive Anatomical Map Diagram */}
            <div className="relative w-full h-72 bg-[#101A2C] rounded-xl p-4 flex flex-col items-center justify-center border border-[#B8905A]/30 overflow-hidden text-[#FFFDF9]">
              <div className="absolute top-3 left-3 text-[11px] text-[#D9B98A] font-mono font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" /> Interactive Anatomical Diagnostic Canvas
              </div>

              {/* Silhouette Overlay */}
              <div className="relative w-full max-w-md h-44 flex items-center justify-center">
                <svg className="w-full h-full opacity-40" viewBox="0 0 400 200">
                  <path
                    d="M 50 100 Q 100 40 200 60 T 350 90 Q 380 120 350 150 T 200 160 T 50 100 Z"
                    fill="none"
                    stroke="#D9B98A"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                </svg>

                {/* Hotspots */}
                <button
                  onClick={() => setSelectedBodyPart('Mata & Kepala')}
                  className="absolute top-8 left-16 px-2 py-1 rounded bg-[#B8905A] text-white text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
                >
                  Kepala / Mata
                </button>

                <button
                  onClick={() => setSelectedBodyPart('Telinga')}
                  className="absolute top-4 left-28 px-2 py-1 rounded bg-[#7A3030] text-white text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
                >
                  Telinga
                </button>

                <button
                  onClick={() => setSelectedBodyPart('Toraks & Jantung')}
                  className="absolute top-14 left-36 px-2 py-1 rounded bg-[#1B2A45] text-[#D9B98A] border border-[#D9B98A] text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
                >
                  Toraks / Jantung
                </button>

                <button
                  onClick={() => setSelectedBodyPart('Abdomen')}
                  className="absolute top-20 left-52 px-2 py-1 rounded bg-[#B8905A] text-white text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
                >
                  Abdomen / Pencernaan
                </button>

                <button
                  onClick={() => setSelectedBodyPart('Tulang Belakang & Ekor')}
                  className="absolute top-10 right-20 px-2 py-1 rounded bg-[#6B6656] text-white text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
                >
                  Spine & Ekor
                </button>

                <button
                  onClick={() => setSelectedBodyPart('Kaki & Persendian')}
                  className="absolute bottom-4 left-40 px-2 py-1 rounded bg-[#101A2C] border border-[#B8905A] text-[#D9B98A] text-[10px] font-bold shadow-md hover:scale-110 transition-transform"
                >
                  Persendian Kaki
                </button>
              </div>

              <p className="text-[11px] text-[#EDE6D6]/70 mt-2">
                Klik pada hotspot area tubuh di atas untuk menambahkan catatan klinis fisik.
              </p>
            </div>

            {/* Note Editor for selected body part */}
            {selectedBodyPart && (
              <div className="p-4 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1B2A45]">
                    Catatan Area: <span className="text-[#B8905A]">{selectedBodyPart}</span>
                  </span>
                  <button
                    onClick={() => setSelectedBodyPart(null)}
                    className="text-[10px] text-rose-700 font-bold"
                  >
                    Tutup
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={soapDraft.bodyNotes[selectedBodyPart] || ''}
                  onChange={(e) =>
                    updateDraft({
                      bodyNotes: { ...soapDraft.bodyNotes, [selectedBodyPart]: e.target.value }
                    })
                  }
                  placeholder={`Tulis hasil temuan auskultasi/palpasi area ${selectedBodyPart}...`}
                  className="w-full text-xs p-2.5 rounded-lg bg-[#FFFDF9] border border-[#E1D6BE]"
                />
              </div>
            )}
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Ringkasan Temuan Organ
            </h3>
            <div className="space-y-2">
              {Object.entries(soapDraft.bodyNotes).map(([part, note]) => (
                <div key={part} className="p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] text-xs">
                  <p className="font-bold text-[#1B2A45] text-[11px]">{part}</p>
                  <p className="text-[#6B6656] text-[11px] mt-0.5">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Care Plan Tab */}
      {activeTab === 'carePlan' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#B8905A]" /> Rencana Care Plan Medis & Rehabilitasi Pasien
              </h3>
              <p className="text-xs text-[#6B6656]">
                Kelola program terapi jangka panjang, milestone rehabilitasi pasca-operasi, dan pengobatan penyakit kronis.
              </p>
            </div>
            <button
              onClick={() => setShowAddCarePlanModal(true)}
              className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4 text-[#D9B98A]" /> Buat Care Plan Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {carePlans.map((cp) => (
              <div key={cp.id} className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between border-b border-[#E1D6BE] pb-3">
                  <div>
                    <span className="text-[10px] font-mono bg-[#1B2A45] text-[#D9B98A] px-2 py-0.5 rounded font-bold">
                      {cp.planNo}
                    </span>
                    <h4 className="font-bold text-sm text-[#1B2A45] mt-1">{cp.title}</h4>
                    <p className="text-xs text-[#6B6656]">
                      Pasien: <strong>{cp.petName}</strong> ({cp.customerName}) | Dokter: {cp.doctorName}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    {cp.status}
                  </span>
                </div>

                <div className="bg-[#F6F1E6]/60 p-3 rounded-lg border border-[#E1D6BE] text-xs">
                  <p className="font-semibold text-[#1B2A45]">Diagnosis Terkait: {cp.diagnosis}</p>
                  <p className="text-[11px] text-[#6B6656] mt-0.5">
                    Periode: {cp.startDate} s/d {cp.endDate}
                  </p>
                </div>

                {/* Milestone Checklist Tasks */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#1B2A45] block">Tugas & Milestone Harian:</label>
                  <div className="space-y-1.5">
                    {cp.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleCarePlanTask(cp.id, task.id)}
                        className={`p-2.5 rounded-lg text-xs font-medium border flex items-center justify-between cursor-pointer transition-all ${
                          task.isCompleted
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 line-through opacity-80'
                            : 'bg-[#FFFDF9] text-[#22242B] border-[#E1D6BE] hover:border-[#B8905A]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              task.isCompleted ? 'bg-emerald-600 text-white border-emerald-600' : 'border-[#6B6656]'
                            }`}
                          >
                            {task.isCompleted && <Check className="w-3 h-3" />}
                          </div>
                          <span>{task.title}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-[#6B6656]">{task.dueDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E-Form Consent Tab */}
      {activeTab === 'eform' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-2">
              <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-[#B8905A]" /> Digital Informed Consent & Signature
              </h3>
              <select
                value={soapDraft.selectedTemplateId}
                onChange={(e) => updateDraft({ selectedTemplateId: e.target.value })}
                className="text-xs p-2 rounded bg-[#F6F1E6] border border-[#E1D6BE] font-bold text-[#1B2A45]"
              >
                {eFormTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Preview Document */}
            <div className="p-4 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] space-y-3 text-xs text-[#22242B]">
              <h4 className="font-bold text-sm text-[#1B2A45] text-center uppercase tracking-wider">
                SURAT PERNYATAAN PERSETUJUAN TINDAKAN MEDIS (INFORMED CONSENT)
              </h4>
              <p className="leading-relaxed text-[11px]">
                Saya yang bertanda tangan di bawah ini, <strong>{soapDraft.signedName || '[Nama Pemilik]'}</strong>, pemilik/penanggung jawab dari hewan <strong>{selectedVisit?.petName || '[Nama Pasien]'}</strong> ({selectedVisit?.petSpecies}), menyatakan menyetujui prosedur medis/operatif yang direkomendasikan oleh tim dokter hewan PetCare ERP setelah menerima penjelasan mengenai manfaat dan risiko tindakan.
              </p>

              <div>
                <label className="text-xs font-bold text-[#1B2A45] block mb-1">Nama Penandatangan / Pemilik</label>
                <input
                  type="text"
                  value={soapDraft.signedName}
                  onChange={(e) => updateDraft({ signedName: e.target.value })}
                  className="w-full text-xs p-2 rounded bg-[#FFFDF9] border border-[#E1D6BE]"
                />
              </div>

              {/* Signature Canvas Pad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1B2A45] flex items-center gap-1">
                    <PenTool className="w-3.5 h-3.5 text-[#B8905A]" /> Tanda Tangan Digital Pemilik (Gunakan Mouse/Touch):
                  </label>
                  <button
                    onClick={clearCanvas}
                    className="text-[10px] text-rose-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Hapus Coretan
                  </button>
                </div>

                <div className="border-2 border-dashed border-[#B8905A]/50 rounded-xl bg-[#FFFDF9] p-1 flex justify-center">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair touch-none bg-white rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveConsent}
                  className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Simpan Informed Consent Digital
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider border-b border-[#E1D6BE] pb-2">
              Informed Consent Terdaftar ({eFormSubmissions.length})
            </h3>
            <div className="space-y-2">
              {eFormSubmissions.map((sub) => (
                <div key={sub.id} className="p-3 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#1B2A45]">
                    <span>{sub.templateTitle}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px]">
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B6656]">
                    Pasien: {sub.petName} | Pemilik: {sub.customerName}
                  </p>
                  <p className="text-[10px] text-[#6B6656]">Tanggal: {sub.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ICD-10 Vet Search Modal */}
      {showIcdModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIcdModal(false);
          }}
        >
          <div 
            className="max-w-2xl w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <Search className="w-5 h-5 text-[#B8905A]" /> Katalog Diagnosa ICD-10 Veterinary
              </h3>
              <button
                onClick={() => setShowIcdModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#6B6656] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode ICD-10, nama penyakit (contoh: Gastritis, Flu, Kidney)..."
                value={icdSearchTerm}
                onChange={(e) => setIcdSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg focus:outline-none focus:border-[#B8905A]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredIcdCatalog.map((item) => (
                <div
                  key={item.code}
                  onClick={() => handleSelectIcdCode(item)}
                  className="p-3 rounded-xl bg-[#F6F1E6] hover:bg-[#1B2A45] hover:text-[#FFFDF9] border border-[#E1D6BE] text-xs cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#B8905A] group-hover:text-[#D9B98A]">
                      [{item.code}]
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#E1D6BE] text-[#1B2A45] font-semibold group-hover:bg-[#B8905A] group-hover:text-white">
                      {item.category}
                    </span>
                  </div>
                  <p className="font-bold text-[#1B2A45] group-hover:text-[#FFFDF9] text-sm mt-1">{item.name}</p>
                  <p className="text-[11px] text-[#6B6656] group-hover:text-[#EDE6D6]/80 mt-0.5">
                    Diagnosa Banding: {item.diff}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Care Plan Modal */}
      {showAddCarePlanModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddCarePlanModal(false);
          }}
        >
          <div 
            className="max-w-lg w-full bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-3">
              <h3 className="font-bold text-base text-[#1B2A45] font-display flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#B8905A]" /> Buat Rencana Care Plan Baru
              </h3>
              <button
                onClick={() => setShowAddCarePlanModal(false)}
                className="text-xs font-bold text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Judul Care Plan</label>
                <input
                  type="text"
                  value={cpTitle}
                  onChange={(e) => setCpTitle(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE] font-bold text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Diagnosis Kerja</label>
                <input
                  type="text"
                  value={cpDiagnosis}
                  onChange={(e) => setCpDiagnosis(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Tanggal Selesai Program</label>
                <input
                  type="date"
                  value={cpEndDate}
                  onChange={(e) => setCpEndDate(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1B2A45] block mb-1">Daftar Tugas / Milestone (1 Tugas per Baris)</label>
                <textarea
                  rows={4}
                  value={cpTasksText}
                  onChange={(e) => setCpTasksText(e.target.value)}
                  className="w-full p-2.5 bg-[#F6F1E6] rounded-lg border border-[#E1D6BE]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCreateCarePlan}
                  className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-lg shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D9B98A]" /> Simpan Care Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI MEDICAL HISTORY SOAP SYNTHESIZER MODAL */}
      {showAiSoapModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiSoapModal(false);
          }}
        >
          <div 
            className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#1B2A45] text-[#FFFDF9] border-b border-[#B8905A]/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#B8905A]/20 border border-[#B8905A]/40 flex items-center justify-center text-[#D9B98A]">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#FFFDF9] font-display flex items-center gap-2">
                    AI Clinical SOAP Synthesizer
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B8905A]/30 text-[#D9B98A] border border-[#B8905A]/40 font-mono">
                      Gemini 3.7
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#EDE6D6]/80">
                    Pasien: {selectedVisit?.petName} ({selectedVisit?.species}) • Pemilik: {selectedVisit?.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiSoapModal(false)}
                className="w-8 h-8 rounded-lg bg-[#101A2C] text-[#EDE6D6] hover:bg-[#B8905A] hover:text-[#FFFDF9] flex items-center justify-center text-sm font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Input Area */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#B8905A]" /> Rekam Riwayat Medis Pasien (Terkompilasi Otomatis):
                  </label>
                  <span className="text-[11px] text-[#6B6656]">Dapat diedit / ditambahkan catatan manual</span>
                </div>
                <textarea
                  rows={6}
                  value={aiSoapUnstructuredInput}
                  onChange={(e) => setAiSoapUnstructuredInput(e.target.value)}
                  placeholder="Tempel catatan EMR bebas atau laporan pemilik..."
                  className="w-full p-3 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] font-mono text-xs text-[#22242B] focus:outline-none focus:border-[#B8905A] leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleRunAiSoapAnalysis}
                    disabled={isAiSoapLoading}
                    className="px-5 py-2.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    {isAiSoapLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#D9B98A]" /> Menganalisis dengan AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#D9B98A]" /> Jalankan Analisis & Sintesis SOAP
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Analysis Result Display */}
              {aiSoapAnalysis && (
                <div className="space-y-4 border-t border-[#E1D6BE] pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ringkasan Usulan Clinical SOAP
                    </h4>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Siap Diterapkan
                    </span>
                  </div>

                  {/* S-O-A-P Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* S */}
                    <div className="p-3.5 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-1.5">
                      <span className="font-bold text-[#1B2A45] block border-b border-[#E1D6BE] pb-1">
                        S (Subjective)
                      </span>
                      <p>
                        <strong className="text-[#1B2A45]">Keluhan:</strong> {aiSoapAnalysis.chiefComplaint}
                      </p>
                      <p>
                        <strong className="text-[#1B2A45]">HPI:</strong>{' '}
                        {aiSoapAnalysis.subjective?.historyOfPresentIllness}
                      </p>
                      <p>
                        <strong className="text-[#1B2A45]">Ringkasan Masa Lalu:</strong>{' '}
                        {aiSoapAnalysis.subjective?.pastMedicalHistorySummary}
                      </p>
                    </div>

                    {/* O */}
                    <div className="p-3.5 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-1.5">
                      <span className="font-bold text-[#1B2A45] block border-b border-[#E1D6BE] pb-1">
                        O (Objective Vitals & Exam)
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#1B2A45] bg-[#FFFDF9] p-1.5 rounded border border-[#E1D6BE]">
                        <span>Suhu: {aiSoapAnalysis.objective?.suggestedTempC}°C</span> •
                        <span>HR: {aiSoapAnalysis.objective?.suggestedHr} bpm</span> •
                        <span>RR: {aiSoapAnalysis.objective?.suggestedRr} rpm</span> •
                        <span>BB: {aiSoapAnalysis.objective?.suggestedWeightKg} kg</span>
                      </div>
                      <p>
                        <strong className="text-[#1B2A45]">Fokus Fisik:</strong>{' '}
                        {aiSoapAnalysis.objective?.physicalExamFocus}
                      </p>
                    </div>

                    {/* A */}
                    <div className="p-3.5 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-1.5">
                      <span className="font-bold text-[#1B2A45] block border-b border-[#E1D6BE] pb-1">
                        A (Assessment)
                      </span>
                      <p className="font-bold text-sm text-[#1B2A45]">
                        {aiSoapAnalysis.assessment?.workingDiagnosis}{' '}
                        <span className="text-xs font-mono font-normal text-[#6B6656]">
                          [{aiSoapAnalysis.assessment?.suggestedIcdCode || 'K29.7'}]
                        </span>
                      </p>
                      <p>
                        <strong className="text-[#1B2A45]">Diff Diagnosis:</strong>{' '}
                        {aiSoapAnalysis.assessment?.differentialDiagnosis}
                      </p>
                    </div>

                    {/* P */}
                    <div className="p-3.5 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-1.5">
                      <span className="font-bold text-[#1B2A45] block border-b border-[#E1D6BE] pb-1">
                        P (Plan & Resep Obat)
                      </span>
                      <p>
                        <strong className="text-[#1B2A45]">Terapi:</strong>{' '}
                        {aiSoapAnalysis.plan?.medicationPlanSummary}
                      </p>
                      {aiSoapAnalysis.plan?.suggestedDrugs?.length > 0 && (
                        <p className="text-[11px] text-[#6B6656]">
                          <strong>Resep Disarankan:</strong>{' '}
                          {aiSoapAnalysis.plan.suggestedDrugs.map((d: any) => d.drugName).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F6F1E6] border-t border-[#E1D6BE] flex justify-between items-center shrink-0">
              <button
                onClick={() => setShowAiSoapModal(false)}
                className="px-4 py-2 bg-[#FFFDF9] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] font-bold rounded-lg text-xs transition-all"
              >
                Tutup
              </button>

              {aiSoapAnalysis && (
                <button
                  onClick={handleApplyAiSoapToDraft}
                  className="px-5 py-2 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" /> Terapkan ke Form SOAP Pasien Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Informed Consent Digital E-Signature Modal */}
      {showInformedConsentModal && (
        <InformedConsentModal
          onClose={() => setShowInformedConsentModal(false)}
          defaultPetId={selectedVisit?.petId}
          defaultDoctorName={selectedVisit?.doctorName}
        />
      )}

      {/* Pet Health Passport Digital Modal */}
      {showPetPassportModal && (
        <PetHealthPassportModal
          onClose={() => setShowPetPassportModal(false)}
          defaultPetId={selectedVisit?.petId}
        />
      )}

      {/* AI Triage Urgency Modal */}
      {showTriageModal && selectedPet && (
        <TriageUrgencyModal
          isOpen={true}
          onClose={() => setShowTriageModal(false)}
          pet={selectedPet}
          clinicVisit={selectedVisit}
          draftSoap={soapDraft}
          soapNote={soapNotes.find((s) => s.petId === selectedPet.id || s.visitId === selectedVisit.id)}
          onApplyTriage={handleApplyTriageSuggestion}
        />
      )}
    </div>
  );
};
