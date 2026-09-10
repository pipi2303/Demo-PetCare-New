import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { authHeaders } from '../../utils/authToken';
import {
  Bot,
  Send,
  Sparkles,
  Calculator,
  FileText,
  AlertTriangle,
  BookOpen,
  Copy,
  CheckCircle2,
  RefreshCw,
  Zap,
  Stethoscope,
  Pill,
  HeartPulse,
  User,
  Brain,
  MessageSquare,
  ShieldAlert,
  Printer,
  ChevronRight,
  ArrowRight,
  Database,
  History,
  FileSearch,
  Activity,
  Calendar,
  Save,
  Check,
  Scale,
  Eye,
  Info,
  X,
  ExternalLink,
  ShieldCheck,
  Syringe,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckSquare
} from 'lucide-react';
import { MiloEmrDossierModal } from '../common/MiloEmrDossierModal';
import { SystemNotificationHeader } from '../common/SystemNotificationHeader';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SoapAnalysisResult {
  chiefComplaint: string;
  subjective: {
    historyOfPresentIllness: string;
    pastMedicalHistorySummary: string;
    ownerObservations: string;
    chronicityAndRecurrence: string;
  };
  objective: {
    suggestedTempC: number;
    suggestedHr: number;
    suggestedRr: number;
    suggestedWeightKg: number;
    physicalExamFocus: string;
    anatomicalFindings: Record<string, string>;
  };
  assessment: {
    workingDiagnosis: string;
    suggestedIcdCode: string;
    differentialDiagnosis: string;
    severity: 'Ringan' | 'Sedang' | 'Berat' | 'Kritis';
    clinicalRisksAndAllergies: string[];
  };
  plan: {
    medicationPlanSummary: string;
    suggestedDrugs: Array<{
      drugName: string;
      dosage: string;
      frequency: string;
      durationDays: number;
      indication: string;
    }>;
    diagnosticsRecommended: string;
    monitoringAndFollowUp: string;
    clientEducationNotes: string;
  };
  conciseSoapSummaryText: string;
}

interface AIAssistantModuleProps {
  setActiveModule?: (module: any) => void;
}

export const AIAssistantModule: React.FC<AIAssistantModuleProps> = ({ setActiveModule }) => {
  const {
    pets = [],
    clinicVisits = [],
    soapNotes = [],
    medicalRecords = [],
    inpatients = [],
    vacHistories = [],
    dischargeNotes = [],
    stockItems = [],
    invoices = [],
    drugs = [],
    addMedicalRecord
  } = useData();

  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'historySoap' | 'chat' | 'calculator' | 'soap' | 'triage' | 'education'>('historySoap');

  // ==========================================
  // UNSTRUCTURED HISTORY -> CLINICAL SOAP STATE
  // ==========================================
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id || 'p1');
  const [currentVisitComplaint, setCurrentVisitComplaint] = useState('Muntah air berbusa 2x dan nafsu makan menurun');
  const [unstructuredHistoryText, setUnstructuredHistoryText] = useState(
    `[Catatan Pemeriksaan Lalu - 11/08/2026]: Pasien datang untuk vaksinasi rabies & keluhan gatal telinga kanan. Ditemukan otitis externa dextra ringan, diberi tetes Otopain 2x sehari. Riwayat alergi dilaporkan: Alergi Amoxicillin dan pakan berbahan dasar daging ayam.\n\n[Riwayat Rawat Jalan 6 Bulan Lalu]: Pernah mengalami gastritis akut pasca pergantian pakan mendadak. Muntah lendir kekuningan 3x, nafsu makan turun drastis selama 2 hari. Respon baik terhadap terapi suportif sucralfate dan diet gastrointestinal basah.\n\n[Observasi Pemilik Terkini]: Sejak 2 hari terakhir Milo kembali lemas, menolak makan dry food, hanya mau minum sedikit air. Tadi pagi muntah busa putih 2 kali. Perut tampak sensitif saat dielus di bagian ulu hati.`
  );
  const [isAnalyzingHistory, setIsAnalyzingHistory] = useState(false);
  const [historySoapResult, setHistorySoapResult] = useState<SoapAnalysisResult | null>(null);
  const [activeSoapSectionTab, setActiveSoapSectionTab] = useState<'all' | 'S' | 'O' | 'A' | 'P'>('all');
  const [isSavedToEmr, setIsSavedToEmr] = useState(false);
  const [isMiloModalOpen, setIsMiloModalOpen] = useState(false);

  // ==========================================
  // CHAT STATE
  // ==========================================
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Halo! Saya **PetCare AI Vet Assistant**. Saya siap membantu Anda menganalisis riwayat medis pasien, menyusun ringkasan **Clinical SOAP** presisi, menghitung dosis obat, melakukan triase darurat, serta memberikan wawasan operasional klinik berdasarkan data terkini.\n\nSilakan pilih menu di atas atau ajukan pertanyaan klinis langsung!',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // DOSAGE CALCULATOR STATE
  // ==========================================
  const [calcSpecies, setCalcSpecies] = useState<'Kucing' | 'Anjing' | 'Kelinci' | 'Musang'>('Anjing');
  const [calcWeight, setCalcWeight] = useState<number>(28.5);
  const [calcDrug, setCalcDrug] = useState<string>('Amoxicillin + Clavulanate');
  const [calcDoseMgKg, setCalcDoseMgKg] = useState<number>(12.5);
  const [calcConcentration, setCalcConcentration] = useState<number>(50);
  const [calcResult, setCalcResult] = useState<{
    totalDoseMg: number;
    volumeOrTab: number;
    unit: string;
    frequency: string;
    note: string;
  } | null>(null);

  // ==========================================
  // SOAP QUICK GENERATOR STATE
  // ==========================================
  const [soapPatientName, setSoapPatientName] = useState('Milo (Anjing Golden Retriever)');
  const [soapRawNotes, setSoapRawNotes] = useState(
    'Milo (Anjing Golden, 28.5 kg) muntah lendir berbusa 2x sejak kemarin pasca makan sisa makanan di halaman. Suhu 38.8 C, HR 98 bpm, CRT 2 detik, turgor kulit agak lambat, nyeri tekan epigastrik saat dipalpasi. Riwayat alergi amoxicillin terdokumentasi.'
  );
  const [generatedSoap, setGeneratedSoap] = useState<string>('');
  const [isSoapLoading, setIsSoapLoading] = useState(false);

  // ==========================================
  // TRIAGE STATE
  // ==========================================
  const [triageSymptoms, setTriageSymptoms] = useState('Napas terengah-engah, lidah kebiruan (sianosis), lemas tidak bisa berdiri setelah tertabrak.');
  const [triageResult, setTriageResult] = useState<string>('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);

  // ==========================================
  // EDUCATION GENERATOR STATE
  // ==========================================
  const [eduTopic, setEduTopic] = useState('Perawatan Diet Gastrointestinal & Pencegahan Gastritis Rekuren');
  const [eduPetName, setEduPetName] = useState('Milo (Pemilik: Andri Santoso)');
  const [generatedEduText, setGeneratedEduText] = useState('');
  const [isEduLoading, setIsEduLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) || pets[0];

  // Core History Analysis Runner
  const executeHistoryAnalysis = async (textToAnalyze?: string, complaintOverride?: string, petIdOverride?: string) => {
    const targetPetId = petIdOverride || selectedPetId;
    const pet = pets.find((p) => p.id === targetPetId) || selectedPet;
    const historyText = textToAnalyze !== undefined ? textToAnalyze : unstructuredHistoryText;
    const complaint = complaintOverride !== undefined ? complaintOverride : currentVisitComplaint;

    if (!historyText.trim()) {
      addToast('Masukkan teks riwayat medis terlebih dahulu.', 'error');
      return;
    }
    setIsAnalyzingHistory(true);
    setIsSavedToEmr(false);

    try {
      const res = await fetch('/api/ai/analyze-history-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          petInfo: {
            name: pet?.name || 'Milo',
            species: pet?.species || 'Anjing',
            breed: pet?.breed || 'Golden Retriever',
            birthDate: pet?.birthDate || '2022-03-10',
            weightKg: pet?.weightKg || 28.5,
            allergies: pet?.allergies || 'Alergi Amoxicillin, Daging Ayam',
            customerName: pet?.customerName || 'Andri Santoso'
          },
          unstructuredHistoryText: historyText,
          currentComplaint: complaint
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setHistorySoapResult(json.data);
        addToast(`Sintesis Clinical SOAP untuk ${pet.name} berhasil disusun AI!`, 'success');
      } else {
        throw new Error('Gagal memproses riwayat medis');
      }
    } catch (err: any) {
      console.error('History Analysis Error:', err);
      addToast('Gagal memproses riwayat medis. Menggunakan generator cadangan.', 'error');
    } finally {
      setIsAnalyzingHistory(false);
    }
  };

  // Dedicated Rich Loader for Example Patient MILO
  const handleLoadMiloEmr = (
    scenario: 'full' | 'gastritis' | 'otitis' | 'allergy' | 'wellness' = 'full',
    autoAnalyze: boolean = false
  ) => {
    const milo = pets.find((p) => p.name.toLowerCase() === 'milo' || p.id === 'p1') || pets[0];
    setSelectedPetId(milo.id);

    let compiled = '';
    let complaint = '';

    if (scenario === 'full') {
      complaint = 'Evaluasi komprehensif riwayat EMR: muntah busa intermiten, gatal telinga kanan, & kontrol pasca vaksinasi';
      compiled = `=== DOSSIER REKAM MEDIS LENGKAP: MILO (ANJING - GOLDEN RETRIEVER) ===
ID Pasien: ${milo.id} | Microchip: ${milo.microchipNo || '985141002341829'} | Tgl Lahir: 10/03/2022 (Usia: 4 Thn)
Pemilik: Andri Santoso (Member Platinum) | Kontak: 0812-8899-0011 | Alamat: Jl. Flamboyan No. 18, Jakarta Barat
Bobot Saat Ini: 28.5 kg (Trajektori: 26.9kg -> 27.5kg -> 27.8kg -> 28.2kg -> 28.5kg) | BCS: 5/9 (Ideal)
Status Reproduksi: Jantan Intak | Vaksinasi Terakhir: Defensor 3 (Rabies) tgl 11/08/2026

⚠️ PERINGATAN ALERGI & KONTRAINDIKASI OBAT TERCATAT:
1. Alergi Amoxicillin / Penicillin-Group: Pernah mengalami urtikaria & facial edema akut pasca terapi penisilin. KONTRAINDIKASI ABSOLUT: Amoxicillin, Clavamox, Ampicillin.
2. Alergi Pakan Daging Ayam: Memicu pruritus interdigital & pododermatitis. Direkomendasikan diet lambung berbasis novel protein / hydrolyzed.

--- KRONOLOGI KUNJUNGAN & TINDAKAN HISTORIS ---
• [11/08/2026] Kunjungan Rawat Jalan (drh. Ananda Putri):
  - Keluhan: Gatal telinga kanan, serumen kecokelatan berbau asam.
  - Vitals: Suhu 38.6°C, HR 98 bpm, RR 24 rpm, BB 28.5 kg.
  - Diagnosis: Otitis Externa Dextra Ringan.
  - Terapi: Tetes Otopain 3 tetes 2x/hari selama 5 hari + Pemberian Vaksin Defensor 3 (Rabies) IM dosis tunggal.
  - Respon: Gejala otitis teratasi baik, telinga kembali bersih.

• [18/05/2026] Kontrol Rutin & Wellness Check (drh. Ananda Putri):
  - Evaluasi: BCS 5/9, bobot 28.2 kg, auskultasi jantung/paru bersih, tidak ada murmur. Diberikan suplemen Omega-3.

• [10/02/2026] Kunjungan Darurat - Episode Gastritis Akut & Indigesti:
  - Anamnesis: Pasien mengais sampah dan menelan sisa tulang. Muntah busa & cairan empedu kekuningan 3x, lesu, anoreksia.
  - Vitals: Suhu 38.9°C, HR 110 bpm, RR 28 rpm, BB 27.8 kg, turgor kulit melambat, nyeri palpasi epigastrik.
  - Terapi: Sucralfate sirup 5 mL 2x1 hari ac + puasa pakan padat 8 jam. Pasien pulih dalam 48 jam.

• [04/11/2025] Imunisasi Tahunan:
  - Vaksin Nobivac DHPPi+L Subkutan (Batch: V-2025-88). Kondisi bugar, BB 27.5 kg.

• [10/08/2025] Registrasi Awal & Microchipping:
  - Pemasangan microchip ISO #985141002341829. Pemberian Drontal Plus 2 tablet oral.

--- KELUHAN SAAT INI DARI PEMILIK (ANDRI SANTOSO) ---
"Milo tadi pagi kembali muntah air berbusa putih 2 kali dan nafsu makan tampak menurun. Pemilik khawatir episode gastritis kambuh kembali karena kemarin sempat bermain di halaman belakang."`;
    } else if (scenario === 'gastritis') {
      complaint = 'Muntah air berbusa 2x, lesu & nafsu makan turun sejak kemarin pasca makan sisa makanan di halaman';
      compiled = `=== REKAM MEDIS MILO: EPISODE GASTRITIS AKUT & INDIGESTI ===
Pasien: MILO (Golden Retriever, 28.5 kg, Jantan 4 Thn) | Pemilik: Andri Santoso
Riwayat Alergi: Alergi Amoxicillin (Hipersensitivitas Tipe I) & Pakan Daging Ayam

[Riwayat Kunjungan Sebelumnya]:
- Pasien memiliki kecenderungan mengais sisa makanan/tulang saat bermain tanpa pengawasan.
- Pada 10/02/2026 pernah dirawat jalan dengan diagnosis Gastritis Akut pasca indigesti sisa tulang. Respon terapi sangat baik terhadap Sucralfate sirup 5 ml ac & Ranitidine/Gastroprotektor.

[Gejala Terkini]:
- Muntah busa putih bercampur lendir 2 kali sejak pagi ini.
- Nafsu makan drop 80%, menolak dry food, minum masih mau sedikit.
- Postur agak membungkuk (guarding posture), palpasi cranial abdomen terasa tegang dan sensitif.
- Suhu tubuh 38.8 °C, CRT 2 detik, turgor kulit sedikit lambat (~5% dehidrasi ringan).`;
    } else if (scenario === 'otitis') {
      complaint = 'Gatal telinga kanan berulang, sering menggosokkan kepala ke karpet pasca mandi';
      compiled = `=== REKAM MEDIS MILO: EVALUASI OTITIS EXTERNA DEXTRA & STATUS VAKSIN ===
Pasien: MILO (Golden Retriever, 28.5 kg) | Pemilik: Andri Santoso
Riwayat Vaksin: Defensor 3 Rabies (11/08/2026), DHPPi+L (04/11/2025)

[Riwayat Klinis]:
- Pada 11/08/2026 terdiagnosis Otitis Externa Dextra pasca mandi air. Telah diterapi dengan Otopain tetes telinga selama 5 hari.
- Daun telinga kanan terkadang lembap dan kemerahan jika tidak dikeringkan secara seksama.

[Gejala Terkini]:
- Pemilik mengamati Milo sering menggelengkan kepala (head shaking) dan menggaruk daun telinga kanan dengan kaki belakang.
- Tampak sedikit eksudat serumen kecokelatan dengan bau asam khas Malassezia pada meatus akustikus eksternus dexter.`;
    } else if (scenario === 'allergy') {
      complaint = 'Screening keamanan obat & konfirmasi alergi penisilin/amoxicillin sebelum peresepan';
      compiled = `=== REKAM MEDIS MILO: SCREENING ALERGI OBAT & KONTRAINDIKASI ===
Pasien: MILO (Golden Retriever, 28.5 kg) | Pemilik: Andri Santoso

⚠️ PERINGATAN RESIKO KLINIS KRITIS:
- Pasien Milo memiliki riwayat reaksi alergi parah (anafilaksis / facial angioedema & urtikaria akut) terhadap Amoxicillin dan derivat beta-laktam penisilin.
- Riwayat dietetik: Alergi protein daging ayam (memicu pruritus dan pododermatitis).

[Instruksi Peresepan Aman]:
- DILARANG MERESEPKAN: Amoxicillin, Amoxicillin-Clavulanate, Ampicillin, Penicillin G/V.
- PILIHAN ALTERNATIF AMAN: Cefalexin (golongan sefalosporin generasi 1), Enrofloxacin (fluorokuinolon), Metronidazole, atau Doxycycline.`;
    } else {
      complaint = 'Pemeriksaan kesehatan berkala & evaluasi trajektori berat badan (BCS 5/9)';
      compiled = `=== REKAM MEDIS MILO: GENERAL WELLNESS & WEIGHT MONITORING ===
Pasien: MILO (Golden Retriever, 28.5 kg, 4 Thn) | Microchip: #985141002341829
Trajektori Berat Badan:
- 10/08/2025: 26.9 kg (Pendaftaran Awal)
- 04/11/2025: 27.5 kg (Vaksinasi)
- 10/02/2026: 27.8 kg (Pasca Gastritis)
- 18/05/2026: 28.2 kg (Check Up)
- 11/08/2026: 28.5 kg (Terkini - BCS 5/9 Ideal)

Status Kesehatan Umum:
Auskultasi jantung paru bersih, tidak ada murmur atau wheezing. Turgor kulit elastis < 2 detik. Gigi dan gusi sehat dengan kalkulus minimal.`;
    }

    setCurrentVisitComplaint(complaint);
    setUnstructuredHistoryText(compiled);
    setIsSavedToEmr(false);

    // Also sync values to dosage calculator and education
    setCalcSpecies('Anjing');
    setCalcWeight(28.5);
    setEduPetName('Milo (Pemilik: Andri Santoso)');

    addToast(`Data EMR Contoh Pasien Milo (${scenario.toUpperCase()}) berhasil dimuat!`, 'success');

    if (autoAnalyze) {
      executeHistoryAnalysis(compiled, complaint, milo.id);
    }
  };

  // Auto load unstructured history from database for a selected pet
  const handleAutoLoadPetHistory = (petId: string) => {
    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    if (pet.name.toLowerCase() === 'milo' || petId === 'p1') {
      handleLoadMiloEmr('full', false);
      return;
    }

    setSelectedPetId(petId);

    const pastRecords = medicalRecords.filter((m) => m.petId === petId);
    const pastVisits = clinicVisits.filter((v) => v.petId === petId);
    const pastSoaps = soapNotes.filter((s) => s.petId === petId);
    const pastInpatients = inpatients.filter((i) => i.petId === petId);
    const pastDischarges = dischargeNotes.filter((d) => d.petId === petId);
    const pastVaccines = vacHistories.filter((v) => v.petId === petId);

    let compiled = `=== REKAM JEJAK EMR TERPADU: ${pet.name.toUpperCase()} (${pet.species} - ${pet.breed}) ===\n`;
    compiled += `Pemilik: ${pet.customerName} | Bobot Saat Ini: ${pet.weightKg} kg | Tgl Lahir: ${pet.birthDate}\n`;
    compiled += `Riwayat Alergi Tercatat: ${pet.allergies || 'Tidak ada riwayat alergi yang dicatat'}\n`;
    compiled += `Catatan Khusus Pasien: ${pet.notes || 'Pasien kooperatif'}\n\n`;

    if (pastVisits.length > 0) {
      compiled += `--- KUNJUNGAN & KELUHAN KLINIK SEBELUMNYA ---\n`;
      pastVisits.forEach((v) => {
        compiled += `• [${v.queuedAt || 'Kunjungan'}] No: ${v.visitNo} - Keluhan: "${v.complaint}" (Status: ${v.status}, Dokter: ${v.doctorName})\n`;
      });
      compiled += `\n`;
    }

    if (pastSoaps.length > 0) {
      compiled += `--- DIAGNOSIS & SOAP TERDAHULU ---\n`;
      pastSoaps.forEach((s) => {
        compiled += `• Tanggal ${s.date}: Diagnosis: ${s.workingDiagnosis} (Diff: ${s.differentialDiagnosis || '-'}). Suhu: ${s.temperatureC}°C, HR: ${s.heartRate} bpm, BB: ${s.weightKg} kg. Terapi: ${s.medicationPlan}\n`;
      });
      compiled += `\n`;
    }

    if (pastRecords.length > 0) {
      compiled += `--- CATATAN TINDAKAN & LOG MEDIS ---\n`;
      pastRecords.forEach((r) => {
        compiled += `• [${r.date}] ${r.type} - ${r.title}: "${r.description}" (Oleh: ${r.performedBy})\n`;
      });
      compiled += `\n`;
    }

    if (pastInpatients.length > 0) {
      compiled += `--- RIWAYAT RAWAT INAP (OPNAME) ---\n`;
      pastInpatients.forEach((inp) => {
        compiled += `• No Inap: ${inp.inpatientNo} - Diagnosis: ${inp.diagnosis} di ${inp.cageNo}. Diet: ${inp.dietInstructions}. Status: ${inp.status}\n`;
      });
      compiled += `\n`;
    }

    if (pastDischarges.length > 0) {
      compiled += `--- INSTRUKSI PULANG & HOMECARE ---\n`;
      pastDischarges.forEach((d) => {
        compiled += `• Diagnosis Akhir: ${d.finalDiagnosis}. Obat Pulang: ${d.homeMedications}. Perawatan: ${d.homeCareInstructions}\n`;
      });
      compiled += `\n`;
    }

    if (pastVaccines.length > 0) {
      compiled += `--- HISTORI VAKSINASI & IMUNISASI ---\n`;
      pastVaccines.forEach((vac) => {
        compiled += `• Vaksin: ${vac.vaccineName} diberikan tgl ${vac.givenDate} (Batch: ${vac.batchNumber})\n`;
      });
      compiled += `\n`;
    }

    compiled += `[Catatan Observasi Tambahan dari Owner]: Pemilik melaporkan keluhan saat ini: "${currentVisitComplaint}".`;

    setUnstructuredHistoryText(compiled);
    setIsSavedToEmr(false);
    addToast(`Riwayat medis rekam jejak untuk ${pet.name} berhasil dimuat ke teks analisis.`, 'info');
  };

  // Preset Template Scenarios
  const loadPresetScenario = (scenario: 'gastritis' | 'skin' | 'otitis' | 'flutd' | 'respiratory') => {
    if (scenario === 'gastritis') {
      handleLoadMiloEmr('gastritis', false);
      return;
    } else if (scenario === 'skin') {
      const pet = pets.find((p) => p.name === 'Luna') || pets[0];
      setSelectedPetId(pet.id);
      setCurrentVisitComplaint('Gatal parah di area punggung, kulit merah & bulu rontok');
      setUnstructuredHistoryText(
        `[Identitas]: Luna (Kucing Persia) - BB: 4.2 kg - Alergi: Tidak ada alergi tercatat.\n\n[Riwayat 3 Bulan Lalu]: Pernah diobati karena Flea Allergy Dermatitis dan ektoparasit kutu pinjal. Sudah diberikan spot-on antiparasit.\n\n[Riwayat Terkini]: 1 minggu terakhir sering menggaruk punggung dan pangkal ekor hingga berdarah. Muncul keropeng kerak hitam dan kulit tampak eritema kemerahan. Pemilik sering memandikan dengan sampo manusia aroma wangi.`
      );
    } else if (scenario === 'otitis') {
      handleLoadMiloEmr('otitis', false);
      return;
    } else if (scenario === 'flutd') {
      const pet = pets.find((p) => p.name === 'Oreo') || pets[0];
      setSelectedPetId(pet.id);
      setCurrentVisitComplaint('Mengejan di litter box, kencing sedikit campur darah & menangis saat buang air');
      setUnstructuredHistoryText(
        `[Identitas]: Oreo (Kucing Jantan Steril) - BB: 3.8 kg.\n\n[Riwayat]: Diet dry food rendah kualitas tinggi magnesium. Kurang minum air putih. 2 hari ini bolak-balik litter box lebih dari 10 kali, hanya keluar beberapa tetes urin kemerahan (hematuria), palpasi kandung kemih teraba membesar tegang seukuran bola tenis.`
      );
    } else if (scenario === 'respiratory') {
      const pet = pets.find((p) => p.name === 'Max') || pets[0];
      setSelectedPetId(pet.id);
      setCurrentVisitComplaint('Napas mendengkur keras, stridor, batuk kering & cepat lelah saat cuaca panas');
      setUnstructuredHistoryText(
        `[Identitas]: Max (French Bulldog - Brakisefalik) - BB: 12.1 kg - Alergi: Suhu Panas.\n\n[Riwayat]: Stenotic nares bawaan ras brakisefalik. Sensitif terhadap hawa panas lembap. Napas berbunyi kasar saat diajak jalan siang hari, CRT 2 detik, mukosa merah muda cerah.`
      );
    }
    setHistorySoapResult(null);
    setIsSavedToEmr(false);
    addToast('Template skenario riwayat klinis berhasil dimuat.', 'info');
  };

  // Analyze Unstructured Medical History via Server Endpoint
  const handleAnalyzeMedicalHistory = async () => {
    executeHistoryAnalysis();
  };

  // Direct Transfer to ClinicModule
  const handleTransferToClinicModule = () => {
    if (!historySoapResult) {
      addToast('Buat analisis Clinical SOAP terlebih dahulu!', 'error');
      return;
    }

    // Match matching clinic visit or first visit
    const matchedVisit = clinicVisits.find((v) => v.petId === selectedPetId) || clinicVisits[0];
    const visitId = matchedVisit?.id || 'v1';

    // Map AI suggested drugs to clinic drug catalogue
    const mappedPrescriptions = historySoapResult.plan.suggestedDrugs.map((d) => {
      const foundDrug = drugs.find(
        (dr) =>
          dr.name.toLowerCase().includes(d.drugName.toLowerCase()) ||
          d.drugName.toLowerCase().includes(dr.name.toLowerCase())
      );
      return {
        drugId: foundDrug?.id || drugs[0]?.id || 'd1',
        drugName: foundDrug?.name || d.drugName,
        dosage: d.dosage || '1/2 tablet',
        frequency: d.frequency || '2x1 hari',
        durationDays: d.durationDays || 5,
        qty: Math.max(2, (d.durationDays || 5) * 2)
      };
    });

    const soapDraftToStore = {
      chiefComplaint: historySoapResult.chiefComplaint || currentVisitComplaint,
      hpi: historySoapResult.subjective.historyOfPresentIllness || 'Riwayat medis dievaluasi oleh AI.',
      tempC: historySoapResult.objective.suggestedTempC || 38.6,
      hr: historySoapResult.objective.suggestedHr || 110,
      rr: historySoapResult.objective.suggestedRr || 26,
      weightKg: historySoapResult.objective.suggestedWeightKg || selectedPet?.weightKg || 4.2,
      examNotes: `${historySoapResult.objective.physicalExamFocus} | Observasi owner: ${historySoapResult.subjective.ownerObservations}`,
      diagnosis: historySoapResult.assessment.workingDiagnosis,
      diffDiag: historySoapResult.assessment.differentialDiagnosis,
      severity: historySoapResult.assessment.severity || 'Sedang',
      prescribedList: mappedPrescriptions.length > 0 ? mappedPrescriptions : [
        {
          drugId: drugs[0]?.id || 'd1',
          drugName: drugs[0]?.name || 'Amoxicillin 250mg',
          dosage: '1/2 tablet',
          frequency: '2x1 hari sesudah makan',
          durationDays: 5,
          qty: 5
        }
      ],
      bodyNotes: historySoapResult.objective.anatomicalFindings || {
        Abdomen: 'Palpasi sesuai sintesis riwayat AI',
        Telinga: 'Evaluasi berkala'
      },
      signedName: selectedPet?.customerName || matchedVisit?.customerName || 'Pemilik',
      selectedTemplateId: 'ef1',
      selectedTreatments: ['proc1', 'proc2']
    };

    // Store in LocalStorage for ClinicModule auto-save hooks
    try {
      localStorage.setItem(`petcare_clinic_soap_draft_${visitId}`, JSON.stringify(soapDraftToStore));
      localStorage.setItem('petcare_clinic_soap_draft_default', JSON.stringify(soapDraftToStore));
      localStorage.setItem('petcare_clinic_soap_draft_latest_ai', JSON.stringify(soapDraftToStore));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    addToast(`Ringkasan SOAP AI untuk ${selectedPet?.name || 'Pasien'} berhasil disuntikkan ke Modul Pemeriksaan Klinik!`, 'success');

    if (setActiveModule) {
      setTimeout(() => {
        setActiveModule('clinic');
      }, 400);
    }
  };

  // Save AI SOAP synthesis directly to patient EMR history
  const handleSaveToEmrHistory = () => {
    if (!historySoapResult || !selectedPet) return;

    addMedicalRecord({
      petId: selectedPet.id,
      date: new Date().toISOString().substring(0, 10),
      type: 'Kunjungan',
      title: `AI Clinical SOAP: ${historySoapResult.assessment.workingDiagnosis}`,
      description: `[Keluhan]: ${historySoapResult.chiefComplaint} | [Sintesis S]: ${historySoapResult.subjective.historyOfPresentIllness} | [Assessment]: ${historySoapResult.assessment.workingDiagnosis} (Diff: ${historySoapResult.assessment.differentialDiagnosis}) | [Plan Terapi]: ${historySoapResult.plan.medicationPlanSummary}`,
      performedBy: 'PetCare AI Vet Assistant & Dokter'
    });

    setIsSavedToEmr(true);
    addToast(`Hasil analisis SOAP AI berhasil disimpan ke database Rekam Medis ${selectedPet.name}!`, 'success');
  };

  // Handle Dosage Calculation
  const handleCalculateDosage = () => {
    if (!calcWeight || calcWeight <= 0) {
      addToast('Masukkan berat badan hewan yang valid!', 'error');
      return;
    }
    const totalDoseMg = calcWeight * calcDoseMgKg;
    const volumeOrTab = totalDoseMg / (calcConcentration || 1);

    let frequency = '2x sehari (q12h) selama 5-7 hari';
    let note = 'Berikan sesudah makan. Monitor adanya efek samping pencernaan seperti diare ringan.';

    if (calcDrug.includes('Meloxicam')) {
      frequency = '1x sehari (q24h) sesudah makan';
      note = 'Perhatian: Pastikan hidrasi adekuat. Kontraindikasi pada pasien gagal ginjal kronis atau ulkus lambung.';
    } else if (calcDrug.includes('Ivermectin')) {
      frequency = 'Dosis tunggal, diulang 14 hari kemudian jika perlu';
      note = 'Gunakan dengan hati-hati pada anjing ras Collies/Shetland Sheepdog (mutasi gen ABCB1/MDR1).';
    }

    setCalcResult({
      totalDoseMg: parseFloat(totalDoseMg.toFixed(2)),
      volumeOrTab: parseFloat(volumeOrTab.toFixed(2)),
      unit: calcConcentration > 20 ? 'mL (Cair/Injeksi)' : 'Tablet/Kapsul',
      frequency,
      note
    });
    addToast('Kalkulasi dosis obat berhasil diproses!', 'success');
  };

  // Handle AI Chat Send
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setIsLoading(true);

    try {
      const clinicContext = {
        totalPatients: (pets || []).length,
        activeQueue: (clinicVisits || []).filter((q) => q.status !== 'Selesai' && q.status !== 'Batal').length,
        recentVisitsCount: (clinicVisits || []).length,
        lowStockAlerts: (stockItems || []).filter((s) => s.stock <= s.minStock).map((s) => s.name),
        todayRevenue: (invoices || []).reduce((acc, inv) => acc + (inv.totalAmount || 0), 0)
      };

      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          message: textToSend,
          context: clinicContext,
          history
        })
      });

      const data = await res.json();

      if (res.ok && data.response) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Gagal menerima respon AI');
      }
    } catch (err: any) {
      console.error('AI Chat Exception:', err);
      const fallbackResponse = `**[Mode Respon Cadangan AI]**\n\nTerima kasih atas pertanyaan Anda mengenai: *"${textToSend}"*.\n\n**Rekomendasi Klinis & Analisis:**\n- Pastikan anamnesis dan pemeriksaan fisik (Suhu, CRT, Frekuensi Napas, Denyut Jantung) dicatat secara lengkap di EMR.\n- Berdasarkan data klinik terkini, terdapat **${(clinicVisits || []).filter((q) => q.status !== 'Selesai' && q.status !== 'Batal').length} antrian aktif** dan **${(stockItems || []).filter((s) => s.stock <= s.minStock).length} item obat stok kritis**.\n- Untuk sintesis SOAP riwayat medis terstruktur, gunakan tab **"Analisis Riwayat Medis (SOAP)"**.`;

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Quick SOAP AI
  const handleGenerateSoap = async () => {
    if (!soapRawNotes.trim()) return;
    setIsSoapLoading(true);

    const prompt = `Tolong formatkan catatan mentah pemeriksaan fisik hewan berikut menjadi standar Rekam Medis SOAP (Subjective, Objective, Assessment, Plan) yang rapi, profesional, dan mudah dimasukkan ke EMR Klinik:
Pasien: ${soapPatientName}
Catatan Mentah: ${soapRawNotes}`;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      if (data.response) {
        setGeneratedSoap(data.response);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      setGeneratedSoap(`**SUBJECTIVE (S):**
- Pasien: ${soapPatientName}
- Keluhan utama: Muntah 2x sejak kemarin, anoreksia (tidak mau makan), letargi.

**OBJECTIVE (O):**
- Suhu: 39.2 °C (Mild Febrile)
- CRT: 2 detik
- Status Hidrasi: Dehidrasi ringan (~5%)
- Palpasi Abdomen: Ketegangan epigastrik / nyeri tekan ringan.

**ASSESSMENT (A):**
- Suspek Gastritis Akut dd/ Korpus Alienum Gastrointestinal, Intoleransi Makanan.

**PLAN (P):**
- **Diagnostik:** Darah Lengkap (CBC), Kimia Darah (ALT/BUN/CREA), Foto Rontgen Abdomen 2 posisi.
- **Terapi:** Fluid therapy RL i.v, Antiemetik (Maropitant Citrate / Ondansetron), Gastroprotektan (Sucralfate / Ranitidine).
- **Edukasi Owner:** Puasakan makanan padat 12 jam, berikan rehydrating solution.`);
    } finally {
      setIsSoapLoading(false);
    }
  };

  // Generate Triage AI
  const handleGenerateTriage = async () => {
    if (!triageSymptoms.trim()) return;
    setIsTriageLoading(true);

    const prompt = `Lakukan penilaian Triage Klinis Darurat Hewan untuk gejala berikut:
Gejala: "${triageSymptoms}"
Tentukan:
1. Tingkat Prioritas Triage (P1 RED - Emergency / P2 YELLOW - Urgent / P3 GREEN - Routine)
2. Kemungkinan Penyebab Utama / Diagnosis Banding
3. Tindakan Pertolongan Pertama Stabilisasi Immediat yang Harus Dilakukan Dokter/Perawat saat Kedatangan.`;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      if (data.response) {
        setTriageResult(data.response);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      setTriageResult(`🚨 **PRIORITAS TRIAGE: P1 - RED (EMERGENCY / DARURAT KRITIS)**

**Kondisi Pasien:** Distres Pernapasan Berat + Sianosis Hipoksia Pasca Trauma.

**Tindakan Immediat (Ruang ICU / Resusitasi):**
1. **Oksigenasi Darurat:** Pasang masker O2 flow-by atau masukkan ke dalam ruang oksigenasi terisolasi (Flow 4-6 L/menit).
2. **Pemeriksaan Jalan Napas (Airway):** Periksa sumbatan pada tenggorokan/trakea.
3. **Pemasangan Kateter Vena (IV Catheter):** Jalur akses infus darurat untuk krisis syok.
4. **Analgesia Trauma:** Evaluasi nyeri & syok pleura (suspek Pneumotoraks / Perdarahan Dalam).
5. **Jangan Lakukan Restraint Berlebihan:** Stres dapat memicu henti napas fatal.`);
    } finally {
      setIsTriageLoading(false);
    }
  };

  // Generate Client Education Text
  const handleGenerateEdu = async () => {
    setIsEduLoading(true);

    const prompt = `Buatkan lembar panduan edukasi pemilik hewan (Client Handout) yang ramah, profesional, dan mudah dipahami dalam Bahasa Indonesia untuk:
Hewan: ${eduPetName}
Topik: ${eduTopic}
Sertakan: Hal yang boleh dilakukan, pantangan, tanda bahaya yang harus segera kembali ke klinik, dan jadwal kontrol ulang.`;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      if (data.response) {
        setGeneratedEduText(data.response);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      setGeneratedEduText(`🐾 **PANDUAN PERAWATAN PASCA OPERASI UNTUK ${eduPetName.toUpperCase()}**

Terima kasih telah mempercayakan tindakan medis ${eduPetName} di **PetCare Veterinary Hospital**. Berikut petunjuk perawatan di rumah:

1. **Restraint & Lingkungan Tenang:**
   - Tempatkan ${eduPetName} di ruangan yang tenang, bersih, dan hangat selama 24-48 jam pertama.
   - Hindari melompat tinggi atau berlari kencang agar jahitan tidak terbuka.

2. **Perawatan Luka Jahitan:**
   - Selalu pasang **E-Collar (Corong Pelindung)** agar ${eduPetName} tidak menjilati atau menggigit bekas jahitan.
   - Jaga area bekas operasi tetap bersih dan KERING (jangan dimandikan selama 10-14 hari).

3. **Pemberian Obat:**
   - Habiskan obat antibiotik dan pereda nyeri yang diresepkan oleh dokter hewan sesuai jadwal.

4. **Tanda Bahaya (Segera Hubungi Klinik):**
   - Bekas jahitan bengkak berlebihan, berdarah, atau mengeluarkan cairan abnormal.
   - Pasien muntah terus-menerus, tidak mau minum >24 jam, atau gusi pucat.

📆 **Jadwal Kontrol Ulang & Lepas Jahitan:** 7 - 10 Hari Lagi.`);
    } finally {
      setIsEduLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Teks berhasil disalin ke clipboard!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Compact & Informative SystemNotificationHeader */}
      <SystemNotificationHeader
        icon={Bot}
        title="AI Vet Clinical Assistant & Medical History Summarizer"
        description="Analisis cerdas riwayat medis pasien menjadi ringkasan terstruktur untuk Clinical SOAP, kalkulator dosis obat, triase darurat, dan edukasi klien."
        badges={[
          { label: 'Gemini 3.7 AI & EMR Synthesizer', variant: 'gold', icon: Sparkles },
          { label: 'Active Clinical Engine', variant: 'emerald' }
        ]}
        tabs={[
          { id: 'historySoap', label: 'Analisis Riwayat SOAP', icon: History },
          { id: 'chat', label: 'Chat Konsultasi AI', icon: MessageSquare },
          { id: 'calculator', label: 'Dosis Obat Presisi', icon: Calculator },
          { id: 'soap', label: 'Quick SOAP', icon: FileText },
          { id: 'triage', label: 'Triase Darurat', icon: ShieldAlert },
          { id: 'education', label: 'Edukasi Owner', icon: BookOpen }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* ========================================================================= */}
      {/* TAB 1: UNSTRUCTURED MEDICAL HISTORY TO CLINICAL SOAP (MAIN REQUESTED FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'historySoap' && (
        <div className="space-y-6">
          {/* DEDICATED MILO EMR HERO & QUICK RELOAD BANNER */}
          <div className="bg-gradient-to-br from-[#1B2A45] to-[#101A2C] text-[#FFFDF9] rounded-2xl p-5 border-2 border-[#B8905A]/60 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#B8905A]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 pb-4 border-b border-[#B8905A]/30">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A] text-[#1B2A45] text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Pasien Contoh Utama
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[10px] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-400" /> Kontraindikasi: Amoxicillin & Ayam
                  </span>
                  <span className="text-[#D9B98A] text-xs font-mono">Microchip: #985141002341829</span>
                </div>
                <h3 className="text-xl font-bold font-display text-[#FFFDF9] flex items-center gap-2">
                  <span>🐕 MILO</span>
                  <span className="text-sm font-normal text-[#EDE6D6]/80 font-sans">
                    — Anjing Golden Retriever • 28.5 kg • 4 Tahun • Pemilik: Andri Santoso
                  </span>
                </h3>
                <p className="text-xs text-[#EDE6D6]/80 max-w-3xl leading-relaxed">
                  Fitur rekam jejak EMR Milo terpadu menggabungkan 5 kronologi kunjungan medis historis (Gastritis, Otitis Externa, Vaksinasi Rabies & DHPPi+L, Trajektori Bobot, serta Peringatan Alergi Obat Fatal).
                </p>
              </div>

              {/* Primary Milo Actions */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsMiloModalOpen(true)}
                  className="px-4 py-2.5 bg-[#FFFDF9] hover:bg-[#F6F1E6] text-[#1B2A45] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 border border-[#E1D6BE]"
                >
                  <Eye className="w-4 h-4 text-[#B8905A]" /> Buka Dossier Visual Milo
                </button>
                <button
                  onClick={() => handleLoadMiloEmr('full', true)}
                  disabled={isAnalyzingHistory}
                  className="px-4 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {isAnalyzingHistory ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Muat & Analisis AI Instan</span>
                </button>
              </div>
            </div>

            {/* Specialized Scenario Fast-Load Pills */}
            <div className="relative z-10 pt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#D9B98A] flex items-center gap-1 shrink-0">
                <History className="w-3.5 h-3.5" /> Muat Ulang Kasus Spesifik Milo:
              </span>
              <button
                onClick={() => handleLoadMiloEmr('full', false)}
                className="px-3 py-1.5 rounded-lg bg-[#101A2C] hover:bg-[#223659] text-[#FFFDF9] border border-[#B8905A]/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <span>📑 EMR Lengkap (Semua Riwayat)</span>
              </button>
              <button
                onClick={() => handleLoadMiloEmr('gastritis', false)}
                className="px-3 py-1.5 rounded-lg bg-[#101A2C] hover:bg-[#223659] text-[#FFFDF9] border border-[#B8905A]/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <span>🍜 Kasus Gastritis & Muntah Busa</span>
              </button>
              <button
                onClick={() => handleLoadMiloEmr('otitis', false)}
                className="px-3 py-1.5 rounded-lg bg-[#101A2C] hover:bg-[#223659] text-[#FFFDF9] border border-[#B8905A]/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <span>👂 Otitis Externa & Vaksin Rabies</span>
              </button>
              <button
                onClick={() => handleLoadMiloEmr('allergy', false)}
                className="px-3 py-1.5 rounded-lg bg-[#101A2C] hover:bg-[#223659] text-rose-300 border border-rose-400/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <span>⚠️ Screening Alergi Amoxicillin</span>
              </button>
              <button
                onClick={() => handleLoadMiloEmr('wellness', false)}
                className="px-3 py-1.5 rounded-lg bg-[#101A2C] hover:bg-[#223659] text-[#FFFDF9] border border-[#B8905A]/40 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <span>⚖️ Trajektori Berat & BCS 5/9</span>
              </button>
            </div>
          </div>

          {/* Patient Selector Bar & Other Patients */}
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#E1D6BE] pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#B8905A]" />
                <span className="text-xs font-bold text-[#1B2A45]">Pilih Profil Pasien Terdaftar:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {pets.map((p) => {
                  const isSelected = p.id === selectedPetId;
                  const isMilo = p.name.toLowerCase() === 'milo' || p.id === 'p1';
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleAutoLoadPetHistory(p.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1B2A45] text-[#FFFDF9] border-[#1B2A45] shadow-2xs'
                          : isMilo
                          ? 'bg-[#F6F1E6] text-[#1B2A45] border-[#B8905A] font-black'
                          : 'bg-[#F6F1E6] text-[#22242B] border-[#E1D6BE] hover:border-[#B8905A]'
                      }`}
                    >
                      {isMilo && <Sparkles className="w-3 h-3 text-[#B8905A]" />}
                      <span>{p.name}</span>
                      <span className="text-[10px] opacity-75">({p.species})</span>
                      {p.allergies && p.allergies !== 'Tidak ada' && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title={`Alergi: ${p.allergies}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Pet Info Summary Badge */}
            {selectedPet && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F1E6]/70 p-3 rounded-lg border border-[#E1D6BE] text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-[#6B6656] text-[10px] block">Pasien Aktif:</span>
                    <span className="font-bold text-[#1B2A45] text-sm flex items-center gap-1">
                      {selectedPet.name}
                      {selectedPet.name.toLowerCase() === 'milo' && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#B8905A] text-white rounded font-normal">Contoh Pasien</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6656] text-[10px] block">Spesies / Ras:</span>
                    <span className="font-semibold text-[#22242B]">
                      {selectedPet.species} ({selectedPet.breed})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6656] text-[10px] block">Bobot & Usia:</span>
                    <span className="font-semibold text-[#22242B]">{selectedPet.weightKg} kg</span>
                  </div>
                  <div>
                    <span className="text-[#6B6656] text-[10px] block">Pemilik:</span>
                    <span className="font-semibold text-[#22242B]">{selectedPet.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[#6B6656] text-[10px] block">Riwayat Alergi:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        selectedPet.allergies && selectedPet.allergies !== 'Tidak ada'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {selectedPet.allergies || 'Tidak ada riwayat alergi'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPet.name.toLowerCase() === 'milo' && (
                    <button
                      onClick={() => setIsMiloModalOpen(true)}
                      className="px-3 py-1.5 bg-[#FFFDF9] hover:bg-[#E1D6BE] text-[#1B2A45] text-xs font-bold rounded-lg border border-[#E1D6BE] flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#B8905A]" /> Dossier Milo
                    </button>
                  )}
                  <button
                    onClick={() => handleAutoLoadPetHistory(selectedPet.id)}
                    className="px-3 py-1.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#D9B98A] text-xs font-bold rounded-lg border border-[#B8905A]/40 flex items-center gap-1.5 transition-all shadow-2xs shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#D9B98A]" /> Muat Ulang EMR {selectedPet.name}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Skenario Templates for Other Pets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-[#6B6656] flex items-center gap-1 shrink-0">
                <FileSearch className="w-3.5 h-3.5 text-[#B8905A]" /> Skenario Pasien Lainnya:
              </span>
              <button
                onClick={() => loadPresetScenario('skin')}
                className="px-2.5 py-1 rounded bg-[#FFFDF9] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-medium transition-all"
              >
                🐱 Dermatitis & Alergi Kontak (Luna)
              </button>
              <button
                onClick={() => loadPresetScenario('respiratory')}
                className="px-2.5 py-1 rounded bg-[#FFFDF9] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-medium transition-all"
              >
                🐶 Sindrom Brakisefalik (Max)
              </button>
              <button
                onClick={() => loadPresetScenario('flutd')}
                className="px-2.5 py-1 rounded bg-[#FFFDF9] hover:bg-[#E1D6BE] text-[#1B2A45] border border-[#E1D6BE] text-[11px] font-medium transition-all"
              >
                🐾 Obstruksi FLUTD Kucing (Oreo)
              </button>
            </div>
          </div>

          {/* Two-Column Editor & Result Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Unstructured History Input */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                <div className="border-b border-[#E1D6BE] pb-2">
                  <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#B8905A]" /> Teks Riwayat Medis Mentah (Unstructured)
                  </h3>
                  <p className="text-[11px] text-[#6B6656] mt-0.5">
                    Masukkan catatan medis lama, transkrip konsultasi dokter, lembar rujukan luar, laporan lab terdahulu, atau rekaman anamnesis pemilik.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#1B2A45] font-bold mb-1">Keluhan Utama Kunjungan Hari Ini:</label>
                    <input
                      type="text"
                      value={currentVisitComplaint}
                      onChange={(e) => setCurrentVisitComplaint(e.target.value)}
                      placeholder="Contoh: Muntah air 2x dan penurunan nafsu makan..."
                      className="w-full p-2.5 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[#1B2A45] font-bold">
                        Rekam Medis Bebas & Log Histori Sebelumnya:
                      </label>
                      <span className="text-[10px] text-[#6B6656]">{unstructuredHistoryText.length} karakter</span>
                    </div>
                    <textarea
                      rows={12}
                      value={unstructuredHistoryText}
                      onChange={(e) => setUnstructuredHistoryText(e.target.value)}
                      placeholder="Tempel catatan EMR bebas, riwayat opname, daftar obat sebelumnya, hasil rontgen/lab lama..."
                      className="w-full p-3 rounded-lg bg-[#F6F1E6] border border-[#E1D6BE] text-xs text-[#22242B] font-mono leading-relaxed focus:outline-none focus:border-[#B8905A]"
                    />
                  </div>

                  <button
                    onClick={handleAnalyzeMedicalHistory}
                    disabled={isAnalyzingHistory}
                    className="w-full py-3.5 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isAnalyzingHistory ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#D9B98A]" /> Menganalisis Riwayat Medis via AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#D9B98A]" /> Analisis & Sintesis ke Clinical SOAP
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Structured Clinical SOAP Result */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1D6BE] pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-[#B8905A]" /> Rekomendasi Format 'Clinical SOAP'
                    </h3>
                    <p className="text-[11px] text-[#6B6656]">
                      Hasil sintesis terstruktur siap pakai untuk dimasukkan langsung ke Modul Pemeriksaan Klinik (ClinicModule).
                    </p>
                  </div>

                  {historySoapResult && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(historySoapResult.conciseSoapSummaryText)}
                        className="px-2.5 py-1.5 bg-[#F6F1E6] hover:bg-[#E1D6BE] text-[#1B2A45] text-[11px] font-bold rounded-lg border border-[#E1D6BE] transition-all flex items-center gap-1"
                        title="Salin teks SOAP lengkap"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#B8905A]" /> Salin
                      </button>
                      <button
                        onClick={handleSaveToEmrHistory}
                        disabled={isSavedToEmr}
                        className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                          isSavedToEmr
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-[#1B2A45] text-[#D9B98A] hover:bg-[#101A2C] border border-[#B8905A]/40'
                        }`}
                      >
                        {isSavedToEmr ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Save className="w-3.5 h-3.5" />}
                        {isSavedToEmr ? 'Tersimpan di EMR' : 'Simpan ke EMR'}
                      </button>
                    </div>
                  )}
                </div>

                {historySoapResult ? (
                  <div className="space-y-4">
                    {/* Allergy / Risk Alert Banner */}
                    {historySoapResult.assessment.clinicalRisksAndAllergies?.length > 0 && (
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-bold block text-amber-900">Perhatian Klinis & Peringatan Alergi:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90">
                            {historySoapResult.assessment.clinicalRisksAndAllergies.map((risk, idx) => (
                              <li key={idx}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Filter Pills for S-O-A-P */}
                    <div className="flex items-center gap-1.5 bg-[#F6F1E6] p-1 rounded-lg border border-[#E1D6BE] text-xs">
                      <button
                        onClick={() => setActiveSoapSectionTab('all')}
                        className={`px-3 py-1 rounded font-bold transition-all ${
                          activeSoapSectionTab === 'all'
                            ? 'bg-[#1B2A45] text-[#FFFDF9]'
                            : 'text-[#6B6656] hover:text-[#1B2A45]'
                        }`}
                      >
                        Semua SOAP
                      </button>
                      <button
                        onClick={() => setActiveSoapSectionTab('S')}
                        className={`px-3 py-1 rounded font-bold transition-all ${
                          activeSoapSectionTab === 'S'
                            ? 'bg-[#1B2A45] text-[#FFFDF9]'
                            : 'text-[#6B6656] hover:text-[#1B2A45]'
                        }`}
                      >
                        S (Subjective)
                      </button>
                      <button
                        onClick={() => setActiveSoapSectionTab('O')}
                        className={`px-3 py-1 rounded font-bold transition-all ${
                          activeSoapSectionTab === 'O'
                            ? 'bg-[#1B2A45] text-[#FFFDF9]'
                            : 'text-[#6B6656] hover:text-[#1B2A45]'
                        }`}
                      >
                        O (Objective)
                      </button>
                      <button
                        onClick={() => setActiveSoapSectionTab('A')}
                        className={`px-3 py-1 rounded font-bold transition-all ${
                          activeSoapSectionTab === 'A'
                            ? 'bg-[#1B2A45] text-[#FFFDF9]'
                            : 'text-[#6B6656] hover:text-[#1B2A45]'
                        }`}
                      >
                        A (Assessment)
                      </button>
                      <button
                        onClick={() => setActiveSoapSectionTab('P')}
                        className={`px-3 py-1 rounded font-bold transition-all ${
                          activeSoapSectionTab === 'P'
                            ? 'bg-[#1B2A45] text-[#FFFDF9]'
                            : 'text-[#6B6656] hover:text-[#1B2A45]'
                        }`}
                      >
                        P (Plan)
                      </button>
                    </div>

                    {/* SOAP Content Cards */}
                    <div className="space-y-3">
                      {/* SUBJECTIVE */}
                      {(activeSoapSectionTab === 'all' || activeSoapSectionTab === 'S') && (
                        <div className="p-4 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-1.5">
                            <span className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-[10px]">
                                S
                              </span>
                              Subjective (Anamnesis & Riwayat Penyakit)
                            </span>
                            <span className="text-[10px] text-[#6B6656] font-medium">
                              Keluhan: {historySoapResult.chiefComplaint}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[#22242B] pt-1">
                            <p>
                              <strong className="text-[#1B2A45]">Riwayat Penyakit Sekarang (HPI):</strong>{' '}
                              {historySoapResult.subjective.historyOfPresentIllness}
                            </p>
                            <p>
                              <strong className="text-[#1B2A45]">Sintesis Rekam Jejak Masa Lalu:</strong>{' '}
                              {historySoapResult.subjective.pastMedicalHistorySummary}
                            </p>
                            <p>
                              <strong className="text-[#1B2A45]">Observasi Owner (Nafsu Makan/Aktivitas):</strong>{' '}
                              {historySoapResult.subjective.ownerObservations}
                            </p>
                            {historySoapResult.subjective.chronicityAndRecurrence && (
                              <p className="text-[11px] text-[#7A3030] font-semibold bg-rose-50/50 p-1.5 rounded border border-rose-200">
                                ⏱️ Kronisitas / Rekurensi: {historySoapResult.subjective.chronicityAndRecurrence}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* OBJECTIVE */}
                      {(activeSoapSectionTab === 'all' || activeSoapSectionTab === 'O') && (
                        <div className="p-4 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-1.5">
                            <span className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-[10px]">
                                O
                              </span>
                              Objective (Tanda Vital Target & Temuan Fisik)
                            </span>
                          </div>

                          {/* Vital Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FFFDF9] p-2.5 rounded-lg border border-[#E1D6BE]">
                            <div>
                              <span className="text-[10px] text-[#6B6656] block font-semibold">Suhu Tubuh (°C)</span>
                              <span className="font-bold text-[#1B2A45] text-sm">
                                {historySoapResult.objective.suggestedTempC} °C
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#6B6656] block font-semibold">Detak Jantung (HR)</span>
                              <span className="font-bold text-[#1B2A45] text-sm">
                                {historySoapResult.objective.suggestedHr} bpm
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#6B6656] block font-semibold">Laju Napas (RR)</span>
                              <span className="font-bold text-[#1B2A45] text-sm">
                                {historySoapResult.objective.suggestedRr} rpm
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#6B6656] block font-semibold">Berat Badan (BB)</span>
                              <span className="font-bold text-[#1B2A45] text-sm">
                                {historySoapResult.objective.suggestedWeightKg} kg
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 text-[#22242B] pt-1">
                            <p>
                              <strong className="text-[#1B2A45]">Fokus Pemeriksaan Fisik:</strong>{' '}
                              {historySoapResult.objective.physicalExamFocus}
                            </p>
                            {historySoapResult.objective.anatomicalFindings && (
                              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {Object.entries(historySoapResult.objective.anatomicalFindings).map(([k, v]) => (
                                  <div key={k} className="p-2 bg-[#FFFDF9] rounded border border-[#E1D6BE] text-[11px]">
                                    <span className="font-bold text-[#1B2A45] block">{k}:</span>
                                    <span className="text-[#6B6656]">{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ASSESSMENT */}
                      {(activeSoapSectionTab === 'all' || activeSoapSectionTab === 'A') && (
                        <div className="p-4 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-1.5">
                            <span className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-[10px]">
                                A
                              </span>
                              Assessment (Diagnosis Kerja & ICD-10 Vet)
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                historySoapResult.assessment.severity === 'Kritis' ||
                                historySoapResult.assessment.severity === 'Berat'
                                  ? 'bg-rose-100 text-rose-800'
                                  : historySoapResult.assessment.severity === 'Sedang'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              Severity: {historySoapResult.assessment.severity}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[#22242B] pt-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#1B2A45] text-[#D9B98A] font-mono font-bold text-[11px]">
                                ICD: {historySoapResult.assessment.suggestedIcdCode || 'K29.7'}
                              </span>
                              <span className="font-bold text-sm text-[#1B2A45]">
                                {historySoapResult.assessment.workingDiagnosis}
                              </span>
                            </div>
                            <p>
                              <strong className="text-[#1B2A45]">Diagnosis Banding (Differential):</strong>{' '}
                              {historySoapResult.assessment.differentialDiagnosis}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* PLAN */}
                      {(activeSoapSectionTab === 'all' || activeSoapSectionTab === 'P') && (
                        <div className="p-4 rounded-xl bg-[#F6F1E6]/80 border border-[#E1D6BE] space-y-2.5 text-xs">
                          <div className="flex items-center justify-between border-b border-[#E1D6BE] pb-1.5">
                            <span className="font-bold text-[#1B2A45] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center font-bold text-[10px]">
                                P
                              </span>
                              Plan (Protokol Terapi, Resep Obat & Tindak Lanjut)
                            </span>
                          </div>

                          <div className="space-y-2 text-[#22242B]">
                            <p>
                              <strong className="text-[#1B2A45]">Rencana Terapi Medis:</strong>{' '}
                              {historySoapResult.plan.medicationPlanSummary}
                            </p>

                            {/* Suggested Drugs Table */}
                            {historySoapResult.plan.suggestedDrugs?.length > 0 && (
                              <div className="bg-[#FFFDF9] rounded-lg border border-[#E1D6BE] overflow-hidden">
                                <div className="bg-[#1B2A45] text-[#D9B98A] px-3 py-1.5 text-[11px] font-bold flex items-center justify-between">
                                  <span>Rekomendasi Resep Farmasi</span>
                                  <span>{historySoapResult.plan.suggestedDrugs.length} Item Obat</span>
                                </div>
                                <div className="divide-y divide-[#E1D6BE] text-[11px]">
                                  {historySoapResult.plan.suggestedDrugs.map((d, idx) => (
                                    <div key={idx} className="p-2.5 flex items-center justify-between">
                                      <div>
                                        <span className="font-bold text-[#1B2A45]">{d.drugName}</span>
                                        <span className="text-[#6B6656] block text-[10px]">
                                          Dosis: {d.dosage} | {d.frequency} ({d.durationDays} hari)
                                        </span>
                                      </div>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#F6F1E6] font-medium text-[#1B2A45] border border-[#E1D6BE]">
                                        {d.indication}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <p>
                              <strong className="text-[#1B2A45]">Pemeriksaan Diagnostik yang Disarankan:</strong>{' '}
                              {historySoapResult.plan.diagnosticsRecommended}
                            </p>
                            <p>
                              <strong className="text-[#1B2A45]">Instruksi Monitoring & Kontrol Ulang:</strong>{' '}
                              {historySoapResult.plan.monitoringAndFollowUp}
                            </p>
                            <p className="bg-[#FFFDF9] p-2.5 rounded-lg border border-[#E1D6BE] text-[11px] text-[#6B6656]">
                              <strong className="text-[#1B2A45] block mb-0.5">Edukasi Klien (Homecare):</strong>
                              {historySoapResult.plan.clientEducationNotes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Master Action Button to Direct Transfer into ClinicModule */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1B2A45] p-4 rounded-xl border border-[#B8905A]/40 text-[#FFFDF9]">
                      <div>
                        <p className="font-bold text-xs text-[#D9B98A] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Siap Digunakan di Modul Klinik
                        </p>
                        <p className="text-[11px] text-[#EDE6D6]/80">
                          Transfer seluruh data Subjective, Objective, Assessment, dan Resep obat ke form SOAP aktif.
                        </p>
                      </div>

                      <button
                        onClick={handleTransferToClinicModule}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#B8905A] hover:bg-[#9E7848] text-[#FFFDF9] text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
                      >
                        <ArrowRight className="w-4 h-4" /> Terapkan & Buka di Modul Klinik (ClinicModule)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-[#6B6656] text-xs space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#F6F1E6] border border-[#E1D6BE] flex items-center justify-center mx-auto text-[#B8905A]">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#1B2A45] text-sm">Belum Ada Analisis Riwayat Medis</p>
                    <p className="max-w-md mx-auto text-[#6B6656]">
                      Pilih pasien di sebelah kiri, muat data EMR otomatis atau tempel catatan rekam medis mentah, kemudian klik tombol <strong>"Analisis & Sintesis ke Clinical SOAP"</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI CHAT CONSULTATION */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Preset Actions Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-[#1B2A45] font-display uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E1D6BE] pb-2">
                <Zap className="w-4 h-4 text-[#B8905A]" /> Topik Pertanyaan Cepat
              </h3>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() =>
                    handleSendMessage('Berikan protokol penanganan medis darurat untuk kucing yang mengalami obstruksi uretra (FLUTD / Blok Urin).')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE]/60 text-[#1B2A45] font-medium transition-all border border-[#E1D6BE]/60"
                >
                  💊 Protocol FLUTD / Obstruksi Urin Kucing
                </button>
                <button
                  onClick={() =>
                    handleSendMessage('Bagaimana cara menghitung infus hestastarch / koloid & kristaloid pada syok hipovolemik anjing?')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE]/60 text-[#1B2A45] font-medium transition-all border border-[#E1D6BE]/60"
                >
                  💧 Kalkulasi Fluid Therapy & Shock Rate
                </button>
                <button
                  onClick={() =>
                    handleSendMessage('Berdasarkan data klinik saat ini, analisa performa antrian dan stok obat yang perlu segera di-reorder!')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE]/60 text-[#1B2A45] font-medium transition-all border border-[#E1D6BE]/60"
                >
                  📊 Analisis Stok Obat Kritis & Operasional
                </button>
                <button
                  onClick={() =>
                    handleSendMessage('Tuliskan draf pesan WhatsApp pengingat imunisasi Rabies tahunan yang profesional untuk pemilik hewan.')
                  }
                  className="w-full text-left p-2.5 rounded-lg bg-[#F6F1E6] hover:bg-[#E1D6BE]/60 text-[#1B2A45] font-medium transition-all border border-[#E1D6BE]/60"
                >
                  📲 Draf Pesan WA Edukasi Vaksin Rabies
                </button>
              </div>
            </div>

            {/* Context Widget */}
            <div className="bg-[#1B2A45] text-[#FFFDF9] rounded-xl p-4 border border-[#B8905A]/30 space-y-2.5 text-xs">
              <h4 className="font-bold text-[#D9B98A] font-display flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> Live Context ERP Injected
              </h4>
              <p className="text-[11px] text-[#EDE6D6]/80">
                AI terhubung langsung dengan basis data PetCare ERP Anda:
              </p>
              <ul className="space-y-1 text-[11px] text-[#EDE6D6] font-mono bg-[#101A2C] p-2.5 rounded-lg border border-[#B8905A]/20">
                <li>• Pasien Terdaftar: {(pets || []).length} anabul</li>
                <li>• Antrian Aktif: {(clinicVisits || []).filter((q) => q.status !== 'Selesai' && q.status !== 'Batal').length} pasien</li>
                <li>• Stok Kritis: {(stockItems || []).filter((s) => s.stock <= s.minStock).length} item</li>
              </ul>
            </div>
          </div>

          {/* Main Chat Window */}
          <div className="lg:col-span-3 bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] shadow-2xs flex flex-col h-[600px]">
            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      m.role === 'user'
                        ? 'bg-[#1B2A45] text-[#D9B98A]'
                        : 'bg-[#B8905A] text-[#FFFDF9] shadow-2xs'
                    }`}
                  >
                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[80%] space-y-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 text-[10px] text-[#6B6656] px-1">
                      <span className="font-bold text-[#1B2A45]">
                        {m.role === 'user' ? 'Anda (Dokter/Staf)' : 'PetCare AI Assistant'}
                      </span>
                      <span>• {m.timestamp}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                        m.role === 'user'
                          ? 'bg-[#1B2A45] text-[#FFFDF9] rounded-tr-none'
                          : 'bg-[#F6F1E6] text-[#22242B] border border-[#E1D6BE] rounded-tl-none font-sans'
                      }`}
                    >
                      {m.content}
                    </div>

                    {m.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(m.content)}
                        className="text-[10px] text-[#6B6656] hover:text-[#1B2A45] flex items-center gap-1 mt-1 px-1"
                      >
                        <Copy className="w-3 h-3" /> Salin Respon
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#B8905A] text-[#FFFDF9] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-[#F6F1E6] border border-[#E1D6BE] text-xs flex items-center gap-2 text-[#6B6656]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B8905A]" />
                    <span>PetCare AI sedang berpikir dan menganalisis...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-[#E1D6BE] bg-[#F6F1E6]/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ketik pertanyaan klinis, konsultasi kasus, atau analisa data klinik..."
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-[#FFFDF9] border border-[#E1D6BE] focus:outline-none focus:border-[#B8905A]"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="p-2.5 bg-[#1B2A45] hover:bg-[#101A2C] disabled:opacity-50 text-[#FFFDF9] rounded-xl transition-all shadow-2xs"
                >
                  <Send className="w-4 h-4 text-[#D9B98A]" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOSAGE CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <Calculator className="w-4 h-4 text-[#B8905A]" /> Parameter Dosis Obat Veteriner
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Spesies Pasien:</label>
                  <select
                    value={calcSpecies}
                    onChange={(e) => setCalcSpecies(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-bold text-xs"
                  >
                    <option value="Kucing">Kucing (Feline)</option>
                    <option value="Anjing">Anjing (Canine)</option>
                    <option value="Kelinci">Kelinci (Lagomorph)</option>
                    <option value="Musang">Musang / Ferret</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Berat Badan (Kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Pilih Formula / Jenis Obat:</label>
                <select
                  value={calcDrug}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCalcDrug(val);
                    if (val.includes('Amoxicillin')) {
                      setCalcDoseMgKg(12.5);
                      setCalcConcentration(50);
                    } else if (val.includes('Meloxicam')) {
                      setCalcDoseMgKg(0.1);
                      setCalcConcentration(1.5);
                    } else if (val.includes('Enrofloxacin')) {
                      setCalcDoseMgKg(5.0);
                      setCalcConcentration(50);
                    } else if (val.includes('Prednisolone')) {
                      setCalcDoseMgKg(1.0);
                      setCalcConcentration(5);
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium text-xs text-[#1B2A45]"
                >
                  <option value="Amoxicillin + Clavulanate">Amoxicillin + Clavulanate (Standar 12.5 mg/kg)</option>
                  <option value="Meloxicam NSAID">Meloxicam Anti-inflamasi (0.1 mg/kg)</option>
                  <option value="Enrofloxacin Antibiotik">Enrofloxacin Antibiotik (5 mg/kg)</option>
                  <option value="Prednisolone Steroid">Prednisolone Immuno-suppressive/Anti-inflammatory (1 mg/kg)</option>
                  <option value="Doxycycline">Doxycycline (10 mg/kg)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Target Dosis (mg/kg):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcDoseMgKg}
                    onChange={(e) => setCalcDoseMgKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[#6B6656] font-bold mb-1">Konsentrasi Sediaan (mg/mL atau mg/tab):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcConcentration}
                    onChange={(e) => setCalcConcentration(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-medium"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculateDosage}
                className="w-full py-3 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Calculator className="w-4 h-4 text-[#D9B98A]" /> Hitung Dosis Presisi Pasien
              </button>
            </div>
          </div>

          {/* Results Display */}
          <div className="space-y-4">
            {calcResult ? (
              <div className="bg-[#FFFDF9] rounded-xl border-2 border-[#B8905A] p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
                  <h4 className="font-extrabold text-sm text-[#1B2A45] font-display flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Hasil Kalkulasi Dosis Presisi
                  </h4>
                  <span className="px-2.5 py-0.5 rounded bg-[#1B2A45] text-[#D9B98A] text-[10px] font-mono font-bold">
                    {calcSpecies} • {calcWeight} kg
                  </span>
                </div>

                <div className="bg-[#F6F1E6] p-4 rounded-xl border border-[#E1D6BE] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6B6656] font-bold">Total Kebutuhan Obat (mg):</span>
                    <span className="text-base font-extrabold text-[#1B2A45]">{calcResult.totalDoseMg} mg</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-[#E1D6BE]">
                    <span className="text-[#6B6656] font-bold">Volume / Jumlah Sediaan Ditakar:</span>
                    <span className="text-lg font-extrabold text-[#1B2A45]">
                      {calcResult.volumeOrTab} {calcResult.unit}
                    </span>
                  </div>

                  <div className="text-xs pt-2 border-t border-[#E1D6BE]">
                    <span className="text-[#6B6656] font-bold block mb-0.5">Frekuensi & Durasi Pemberian:</span>
                    <span className="font-bold text-[#1B2A45]">{calcResult.frequency}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Peringatan Klinis AI:</span>
                    <p className="text-[11px] mt-0.5">{calcResult.note}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#F6F1E6] rounded-xl border border-dashed border-[#E1D6BE] p-8 text-center space-y-2 text-[#6B6656]">
                <Pill className="w-10 h-10 mx-auto text-[#B8905A]/60" />
                <p className="text-xs font-bold text-[#1B2A45]">Kalkulator Dosis Siap Digunakan</p>
                <p className="text-[11px]">Isi parameter berat badan dan obat di sebelah kiri lalu klik tombol kalkulasi.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: QUICK SOAP NOTE GENERATOR */}
      {/* ========================================================================= */}
      {activeTab === 'soap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <FileText className="w-4 h-4 text-[#B8905A]" /> Quick EMR SOAP Formatter
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Nama Pasien & Spesies:</label>
                <input
                  type="text"
                  value={soapPatientName}
                  onChange={(e) => setSoapPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-bold text-xs text-[#1B2A45]"
                />
              </div>

              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Catatan Mentah Anamnesis & Pemeriksaan Fisik:</label>
                <textarea
                  rows={6}
                  value={soapRawNotes}
                  onChange={(e) => setSoapRawNotes(e.target.value)}
                  placeholder="Masukkan keluhan, suhu, CRT, temuan palpasi, dll..."
                  className="w-full p-3 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg text-xs text-[#22242B] font-sans"
                />
              </div>

              <button
                onClick={handleGenerateSoap}
                disabled={isSoapLoading}
                className="w-full py-3 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSoapLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D9B98A]" /> Menyusun Format SOAP...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D9B98A]" /> Generate Format EMR SOAP Resmi
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
              <h4 className="font-bold text-sm text-[#1B2A45] font-display">Pratinjau Hasil SOAP EMR</h4>
              {generatedSoap && (
                <button
                  onClick={() => copyToClipboard(generatedSoap)}
                  className="px-3 py-1 bg-[#1B2A45] text-[#D9B98A] text-xs font-bold rounded-lg hover:bg-[#101A2C] transition-all flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin ke EMR
                </button>
              )}
            </div>

            {generatedSoap ? (
              <div className="p-4 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs font-mono text-[#22242B] whitespace-pre-line leading-relaxed h-[360px] overflow-y-auto">
                {generatedSoap}
              </div>
            ) : (
              <div className="p-12 text-center text-[#6B6656] text-xs space-y-2">
                <FileText className="w-10 h-10 mx-auto text-[#B8905A]/50" />
                <p>Klik tombol *"Generate Format EMR SOAP Resmi"* untuk menyusun rekam medis terstruktur.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EMERGENCY TRIAGE */}
      {/* ========================================================================= */}
      {activeTab === 'triage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Penilaian Triase Darurat Pasien
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Deskripsikan Gejala Klinis Pasien Kedatangan:</label>
                <textarea
                  rows={5}
                  value={triageSymptoms}
                  onChange={(e) => setTriageSymptoms(e.target.value)}
                  className="w-full p-3 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg text-xs text-[#22242B]"
                />
              </div>

              <button
                onClick={handleGenerateTriage}
                disabled={isTriageLoading}
                className="w-full py-3 bg-rose-800 hover:bg-rose-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isTriageLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Menganalisis Tingkat Kedaruratan...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" /> Jalankan Analisis Triage AI
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h4 className="font-bold text-sm text-[#1B2A45] font-display border-b border-[#E1D6BE] pb-2">
              Rekomendasi Protocol & Stabilisasi AI
            </h4>

            {triageResult ? (
              <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 text-xs text-[#22242B] whitespace-pre-line leading-relaxed">
                {triageResult}
              </div>
            ) : (
              <div className="p-12 text-center text-[#6B6656] text-xs space-y-2">
                <ShieldAlert className="w-10 h-10 mx-auto text-rose-400/50" />
                <p>Masukkan kondisi kegawatdaruratan hewan untuk memperoleh rekomendasi pertolongan pertama.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CLIENT EDUCATION */}
      {/* ========================================================================= */}
      {activeTab === 'education' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-sm text-[#1B2A45] font-display flex items-center gap-2 border-b border-[#E1D6BE] pb-2">
              <BookOpen className="w-4 h-4 text-[#B8905A]" /> Generator Materi Edukasi Pemilik Hewan
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Nama Anabul:</label>
                <input
                  type="text"
                  value={eduPetName}
                  onChange={(e) => setEduPetName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[#6B6656] font-bold mb-1">Pilih Topik Perawatan / Edukasi:</label>
                <select
                  value={eduTopic}
                  onChange={(e) => setEduTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F6F1E6] border border-[#E1D6BE] rounded-lg text-xs font-medium text-[#1B2A45]"
                >
                  <option value="Perawatan Pasca Operasi Steril (Ovariohisterektomi/Kastrasi)">
                    Perawatan Pasca Operasi Steril
                  </option>
                  <option value="Panduan Penanganan Demam & Pemulihan Parvovirus">
                    Panduan Pemulihan Virus Parvo / Panleukopenia
                  </option>
                  <option value="Diet Khusus Pasien Gagal Ginjal Kronis (CKD)">
                    Diet Khusus Pasien Gagal Ginjal Kronis
                  </option>
                  <option value="Pencegahan & Perawatan Infeksi Jamur Kulit (Ringworm)">
                    Pencegahan & Perawatan Jamur Kulit
                  </option>
                  <option value="Perawatan Kebersihan Gigi & Karang Gigi Anabul">
                    Perawatan Kebersihan Gigi & Gusi
                  </option>
                </select>
              </div>

              <button
                onClick={handleGenerateEdu}
                disabled={isEduLoading}
                className="w-full py-3 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isEduLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D9B98A]" /> Menyusun Panduan Klien...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 text-[#D9B98A]" /> Buatkan Panduan Edukasi Klien
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#FFFDF9] rounded-xl border border-[#E1D6BE] p-5 shadow-2xs space-y-4">
            <div className="flex justify-between items-center border-b border-[#E1D6BE] pb-2">
              <h4 className="font-bold text-sm text-[#1B2A45] font-display">Teks Panduan Edukasi Klien</h4>
              {generatedEduText && (
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generatedEduText)}
                    className="px-3 py-1 bg-[#1B2A45] text-[#D9B98A] text-xs font-bold rounded-lg hover:bg-[#101A2C] transition-all flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin WA
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-[#F6F1E6] text-[#1B2A45] border border-[#E1D6BE] text-xs font-bold rounded-lg hover:bg-[#E1D6BE]/60 transition-all flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak
                  </button>
                </div>
              )}
            </div>

            {generatedEduText ? (
              <div className="p-4 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] text-xs text-[#22242B] whitespace-pre-line leading-relaxed font-sans">
                {generatedEduText}
              </div>
            ) : (
              <div className="p-12 text-center text-[#6B6656] text-xs space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-[#B8905A]/50" />
                <p>Materi edukasi klien akan ditampilkan di sini untuk dikirim ke WhatsApp pemilik atau dicetak.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MILO EMR DOSSIER MODAL */}
      <MiloEmrDossierModal
        isOpen={isMiloModalOpen}
        onClose={() => setIsMiloModalOpen(false)}
        onLoadScenario={(scenario, autoAnalyze) => {
          handleLoadMiloEmr(scenario, autoAnalyze);
          setActiveTab('historySoap');
        }}
        onSwitchTab={(tab) => {
          setActiveTab(tab);
        }}
      />
    </div>
  );
};
