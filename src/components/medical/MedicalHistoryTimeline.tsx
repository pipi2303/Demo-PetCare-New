import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import {
  Syringe,
  Microscope,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Activity,
  HeartPulse,
  Eye,
  X,
  Layers,
  Tag,
  Stethoscope,
  Scissors
} from 'lucide-react';
import { Pet, VacHistory, SurgicalProcedure, LabTest } from '../../types';

export type TimelineCategory = 'ALL' | 'VACCINATION' | 'SURGERY' | 'LAB';
export type TimeHorizon = 'ALL' | '30DAYS' | '6MONTHS' | '1YEAR';

export interface TimelineMilestone {
  id: string;
  category: 'VACCINATION' | 'SURGERY' | 'LAB';
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  subtitle: string;
  doctor: string;
  status: string;
  isImportant?: boolean;
  rawVaccine?: VacHistory;
  rawSurgery?: SurgicalProcedure;
  rawLab?: LabTest;
}

interface MedicalHistoryTimelineProps {
  selectedPetId?: string;
  onSelectPet?: (petId: string) => void;
  showPetSelector?: boolean;
  className?: string;
}

export const MedicalHistoryTimeline: React.FC<MedicalHistoryTimelineProps> = ({
  selectedPetId,
  onSelectPet,
  showPetSelector = true,
  className = ''
}) => {
  const {
    pets = [],
    customers = [],
    vacHistories = [],
    surgicalProcedures = [],
    labTests = [],
    addVacHistory,
    addSurgicalProcedure,
    addLabTest
  } = useData();
  const { addToast } = useToast();

  // Internal active pet state if not provided or fallback
  const [internalPetId, setInternalPetId] = useState<string>(
    selectedPetId || (pets[0]?.id ?? 'p1')
  );

  const activePetId = selectedPetId || internalPetId;
  const currentPet = pets.find((p) => p.id === activePetId) || pets[0];
  const petOwner = customers.find((c) => c.id === currentPet?.customerId);

  // Filters and sorting
  const [categoryFilter, setCategoryFilter] = useState<TimelineCategory>('ALL');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedMilestone, setSelectedMilestone] = useState<TimelineMilestone | null>(null);

  // Quick Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<'VACCINATION' | 'SURGERY' | 'LAB'>('VACCINATION');

  // Form states for Quick Add
  const [vacForm, setVacForm] = useState({
    vaccineName: 'Rabies Defensor 3 Booster',
    givenDate: new Date().toISOString().substring(0, 10),
    nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    doctorName: 'drh. Ananda Putri',
    batchNumber: 'RB-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
    expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    certificateNo: 'CERT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)
  });

  const [surgForm, setSurgForm] = useState({
    procedureName: 'Dental Scaling & Polishing',
    category: 'Dental' as SurgicalProcedure['category'],
    date: new Date().toISOString().substring(0, 10),
    startTime: '10:00',
    endTime: '11:00',
    leadSurgeon: 'drh. Budi Setiawan, Sp.NV',
    anesthetist: 'Paramedik Surya',
    anesthesiaProtocol: 'Premed: Butorphanol, Induksi: Propofol, Maintenance: Isoflurane 1.5%',
    asaScore: 'ASA I' as NonNullable<SurgicalProcedure['asaScore']>,
    findings: 'Kalkulus derajat 2 supragingiva dan subgingiva dibersihkan sempurna.',
    postOpNotes: 'Gingiva sehat, tidak ada gigi yang diekstraksi. Pasien sadar baik.',
    sutureRemovalDate: 'Tidak perlu'
  });

  const [labForm, setLabForm] = useState({
    testName: 'Profil Darah Lengkap (Hematologi CBC)',
    orderedBy: 'drh. Ananda Putri',
    orderedAt: new Date().toISOString().substring(0, 10) + ' 09:30',
    notes: 'Pemeriksaan rutin evaluasi respon terapi.',
    paramHb: '14.2',
    paramWbc: '12.5',
    paramPlt: '320',
    paramAlt: '45'
  });

  // Consolidate chronological milestones for current pet
  const allMilestones: TimelineMilestone[] = useMemo(() => {
    if (!currentPet) return [];

    const milestones: TimelineMilestone[] = [];

    // 1. Vaccinations
    const petVacs = vacHistories.filter((v) => v.petId === currentPet.id);
    petVacs.forEach((v) => {
      milestones.push({
        id: `vac_${v.id}`,
        category: 'VACCINATION',
        date: v.givenDate,
        title: v.vaccineName,
        subtitle: `Batch: ${v.batchNumber} • Sertifikat: ${v.certificateNo}`,
        doctor: v.doctorName,
        status: 'Diberikan',
        isImportant: v.vaccineName.toLowerCase().includes('rabies'),
        rawVaccine: v
      });
    });

    // 2. Surgical Procedures
    const petSurgs = surgicalProcedures.filter((s) => s.petId === currentPet.id);
    petSurgs.forEach((s) => {
      milestones.push({
        id: `surg_${s.id}`,
        category: 'SURGERY',
        date: s.date,
        time: s.startTime,
        title: s.procedureName,
        subtitle: `Kategori: ${s.category} • ${s.asaScore || 'ASA I'} • ${s.status}`,
        doctor: s.leadSurgeon,
        status: s.status,
        isImportant: true,
        rawSurgery: s
      });
    });

    // 3. Lab Tests
    const petLabs = labTests.filter((l) => l.petId === currentPet.id);
    petLabs.forEach((l) => {
      const dateStr = l.orderedAt ? l.orderedAt.substring(0, 10) : l.completedAt ? l.completedAt.substring(0, 10) : '2026-08-10';
      milestones.push({
        id: `lab_${l.id}`,
        category: 'LAB',
        date: dateStr,
        time: l.orderedAt && l.orderedAt.includes(' ') ? l.orderedAt.split(' ')[1] : undefined,
        title: l.testName,
        subtitle: `${l.testNo} • Status: ${l.status}`,
        doctor: l.orderedBy,
        status: l.status,
        isImportant: l.results?.some((r) => r.isCritical),
        rawLab: l
      });
    });

    return milestones;
  }, [currentPet, vacHistories, surgicalProcedures, labTests]);

  // Filter and sort milestones
  const filteredMilestones = useMemo(() => {
    let result = [...allMilestones];

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter((m) => m.category === categoryFilter);
    }

    // Time horizon filter
    if (timeHorizon !== 'ALL') {
      const now = new Date();
      let threshold = new Date();
      if (timeHorizon === '30DAYS') threshold.setDate(now.getDate() - 30);
      else if (timeHorizon === '6MONTHS') threshold.setMonth(now.getMonth() - 6);
      else if (timeHorizon === '1YEAR') threshold.setFullYear(now.getFullYear() - 1);

      result = result.filter((m) => new Date(m.date) >= threshold);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.subtitle.toLowerCase().includes(q) ||
          m.doctor.toLowerCase().includes(q) ||
          m.date.includes(q) ||
          (m.rawSurgery?.findings && m.rawSurgery.findings.toLowerCase().includes(q)) ||
          (m.rawLab?.notes && m.rawLab.notes.toLowerCase().includes(q))
      );
    }

    // Sort order
    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [allMilestones, categoryFilter, timeHorizon, searchQuery, sortOrder]);

  // Group milestones by Year & Month for organized clinical timeline view
  const groupedMilestones = useMemo<Record<string, TimelineMilestone[]>>(() => {
    const groups: Record<string, TimelineMilestone[]> = {};
    filteredMilestones.forEach((m) => {
      const dateObj = new Date(m.date);
      const year = isNaN(dateObj.getTime()) ? '2026' : dateObj.getFullYear().toString();
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const month = isNaN(dateObj.getTime()) ? 'Agustus' : monthNames[dateObj.getMonth()];
      const key = `${year} • ${month}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filteredMilestones]);

  // Handle switching pet
  const handleSelectPet = (id: string) => {
    setInternalPetId(id);
    if (onSelectPet) onSelectPet(id);
    localStorage.setItem('petcare_selected_pet_id', id);
  };

  // Submit Quick Add Form
  const handleSaveQuickAdd = () => {
    if (!currentPet) return;

    if (addType === 'VACCINATION') {
      addVacHistory({
        petId: currentPet.id,
        petName: currentPet.name,
        customerName: currentPet.customerName,
        vaccineName: vacForm.vaccineName,
        givenDate: vacForm.givenDate,
        nextDueDate: vacForm.nextDueDate,
        doctorName: vacForm.doctorName,
        batchNumber: vacForm.batchNumber,
        expiryDate: vacForm.expiryDate,
        certificateNo: vacForm.certificateNo
      });
      addToast(`Vaksinasi "${vacForm.vaccineName}" berhasil dicatat ke timeline medis ${currentPet.name}!`, 'success');
    } else if (addType === 'SURGERY') {
      addSurgicalProcedure({
        petId: currentPet.id,
        petName: currentPet.name,
        customerName: currentPet.customerName,
        procedureName: surgForm.procedureName,
        category: surgForm.category,
        date: surgForm.date,
        startTime: surgForm.startTime,
        endTime: surgForm.endTime,
        leadSurgeon: surgForm.leadSurgeon,
        anesthetist: surgForm.anesthetist,
        anesthesiaProtocol: surgForm.anesthesiaProtocol,
        asaScore: surgForm.asaScore,
        status: 'Selesai',
        findings: surgForm.findings,
        postOpNotes: surgForm.postOpNotes,
        sutureRemovalDate: surgForm.sutureRemovalDate
      });
      addToast(`Prosedur bedah "${surgForm.procedureName}" berhasil ditambahkan ke timeline ${currentPet.name}!`, 'success');
    } else if (addType === 'LAB') {
      addLabTest({
        petId: currentPet.id,
        petName: currentPet.name,
        customerName: currentPet.customerName,
        testName: labForm.testName,
        orderedBy: labForm.orderedBy,
        completedAt: new Date().toISOString().substring(0, 10) + ' 11:30',
        notes: labForm.notes,
        results: [
          { parameter: 'Hemoglobin (Hb)', value: labForm.paramHb, unit: 'g/dL', referenceRange: '12.0 - 18.0' },
          { parameter: 'Leukosit (WBC)', value: labForm.paramWbc, unit: '10^3/uL', referenceRange: '6.0 - 17.0' },
          { parameter: 'Trombosit (PLT)', value: labForm.paramPlt, unit: '10^3/uL', referenceRange: '200 - 500' },
          { parameter: 'SGPT / ALT', value: labForm.paramAlt, unit: 'U/L', referenceRange: '10 - 100' }
        ]
      });
      addToast(`Hasil uji laboratorium "${labForm.testName}" berhasil ditambahkan ke timeline ${currentPet.name}!`, 'success');
    }

    setIsAddModalOpen(false);
  };

  // Print Timeline
  const handlePrintTimeline = () => {
    addToast(`Menyiapkan lembar cetak Rekam Medis Kronologis untuk ${currentPet?.name}...`, 'info');
    window.print();
  };

  // Counts for quick badges
  const vacCount = allMilestones.filter((m) => m.category === 'VACCINATION').length;
  const surgCount = allMilestones.filter((m) => m.category === 'SURGERY').length;
  const labCount = allMilestones.filter((m) => m.category === 'LAB').length;

  return (
    <div className={`space-y-5 ${className}`}>
      {/* 1. Header & Patient Profile Banner */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#E1D6BE]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B2A45] to-[#2B3D5E] text-[#D9B98A] flex items-center justify-center font-display font-bold text-xl shadow-xs shrink-0">
              {currentPet?.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#1B2A45] font-display">
                  Riwayat Medis Kronologis: {currentPet?.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F6F1E6] border border-[#E1D6BE] text-xs font-semibold text-[#1B2A45]">
                  {currentPet?.species} • {currentPet?.breed}
                </span>
                {currentPet?.sterilized && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    Steril ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B6656] mt-0.5">
                Pemilik: <strong className="text-[#1B2A45]">{currentPet?.customerName}</strong> ({petOwner?.phone || '0812-xxxx-xxxx'}) • Berat: <strong className="text-emerald-700">{currentPet?.weightKg} kg</strong> • Microchip: <span className="font-mono text-[#B8905A]">{currentPet?.microchipNo || '985141002341829'}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons & Pet Selector */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            {showPetSelector && (
              <div className="flex items-center gap-2 bg-[#F6F1E6] px-3 py-1.5 rounded-xl border border-[#E1D6BE]">
                <User className="w-3.5 h-3.5 text-[#B8905A]" />
                <span className="text-xs font-bold text-[#1B2A45]">Pasien:</span>
                <select
                  value={activePetId}
                  onChange={(e) => handleSelectPet(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#1B2A45] focus:outline-hidden cursor-pointer"
                >
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.species})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-xl border border-[#B8905A]/30 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#D9B98A]" /> Catat Entri Medis
            </button>

            <button
              onClick={handlePrintTimeline}
              className="px-3 py-2 bg-[#FFFDF9] hover:bg-[#F6F1E6] text-[#1B2A45] text-xs font-bold rounded-xl border border-[#E1D6BE] flex items-center gap-1.5 transition-all shadow-2xs"
              title="Cetak Rekam Medis Kronologis"
            >
              <Printer className="w-3.5 h-3.5 text-[#6B6656]" /> Cetak
            </button>
          </div>
        </div>

        {/* Clinical Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <Syringe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Vaksinasi</p>
              <p className="text-base font-extrabold text-emerald-950 font-display">{vacCount} Entri</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Operasi / Bedah</p>
              <p className="text-base font-extrabold text-rose-950 font-display">{surgCount} Prosedur</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
              <Microscope className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">Uji Lab & Rontgen</p>
              <p className="text-base font-extrabold text-sky-950 font-display">{labCount} Pemeriksaan</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F6F1E6] border border-[#E1D6BE] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#EAE2D1] text-[#1B2A45] shrink-0">
              <Layers className="w-4 h-4 text-[#B8905A]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6656]">Total Riwayat</p>
              <p className="text-base font-extrabold text-[#1B2A45] font-display">{allMilestones.length} Milestones</p>
            </div>
          </div>
        </div>

        {/* Allergy Alert Warning if applicable */}
        {currentPet?.allergies && currentPet.allergies !== 'Tidak ada' && (
          <div className="mt-3.5 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Peringatan Alergi Pasien:</strong> {currentPet.allergies} (Hindari premedikasi atau terapi kontraindikasi).
            </span>
          </div>
        )}
      </div>

      {/* 2. Interactive Controls & Category Filter Bar */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'ALL'
                  ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-xs'
                  : 'bg-[#F6F1E6] text-[#22242B] hover:bg-[#EAE2D1] border border-[#E1D6BE]'
              }`}
            >
              <span>Semua Kategori</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{allMilestones.length}</span>
            </button>

            <button
              onClick={() => setCategoryFilter('VACCINATION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'VACCINATION'
                  ? 'bg-emerald-700 text-[#FFFDF9] shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              <span>Vaksinasi</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-bold">{vacCount}</span>
            </button>

            <button
              onClick={() => setCategoryFilter('SURGERY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'SURGERY'
                  ? 'bg-rose-700 text-[#FFFDF9] shadow-xs'
                  : 'bg-rose-50 text-rose-900 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Prosedur Bedah</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-bold">{surgCount}</span>
            </button>

            <button
              onClick={() => setCategoryFilter('LAB')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoryFilter === 'LAB'
                  ? 'bg-sky-700 text-[#FFFDF9] shadow-xs'
                  : 'bg-sky-50 text-sky-900 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>Hasil Lab</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-bold">{labCount}</span>
            </button>
          </div>

          {/* Time Horizon & Sort Order */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#F6F1E6] p-1 rounded-xl border border-[#E1D6BE]">
              <button
                onClick={() => setTimeHorizon('ALL')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  timeHorizon === 'ALL' ? 'bg-[#1B2A45] text-white' : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
              >
                Semua Waktu
              </button>
              <button
                onClick={() => setTimeHorizon('1YEAR')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  timeHorizon === '1YEAR' ? 'bg-[#1B2A45] text-white' : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
              >
                1 Thn
              </button>
              <button
                onClick={() => setTimeHorizon('6MONTHS')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  timeHorizon === '6MONTHS' ? 'bg-[#1B2A45] text-white' : 'text-[#6B6656] hover:text-[#1B2A45]'
                }`}
              >
                6 Bln
              </button>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 bg-[#F6F1E6] hover:bg-[#EAE2D1] text-[#1B2A45] text-xs font-bold rounded-xl border border-[#E1D6BE] flex items-center gap-1 transition-all"
              title={`Urutkan: ${sortOrder === 'desc' ? 'Terbaru ke Terlama' : 'Terlama ke Terbaru'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#B8905A]" />
              <span className="text-[11px]">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#B8905A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari vaksin (Rabies, DHPPi), bedah (steril, fraktur, dental), atau parameter lab (Hb, leukosit, ALT)..."
            className="w-full pl-9 pr-8 py-2 bg-[#F6F1E6] text-xs text-[#1B2A45] rounded-xl border border-[#E1D6BE] focus:outline-hidden focus:border-[#B8905A] font-medium placeholder:text-[#6B6656]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6656] hover:text-[#1B2A45]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Visual Chronological Ribbon / Mini-Map */}
      {filteredMilestones.length > 0 && (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-4 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#B8905A]" /> Alur Garis Waktu Kronologis (Mini-Map)
            </h3>
            <span className="text-[11px] text-[#6B6656] font-medium">
              Menampilkan {filteredMilestones.length} peristiwa klinis
            </span>
          </div>

          <div className="overflow-x-auto pb-2 pt-3">
            <div className="flex items-center min-w-max gap-3 px-2 relative">
              {/* Connecting baseline bar */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#E1D6BE] -translate-y-1/2 z-0" />

              {filteredMilestones.map((m, idx) => {
                const isVac = m.category === 'VACCINATION';
                const isSurg = m.category === 'SURGERY';
                const isLab = m.category === 'LAB';

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMilestone(m)}
                    className="group relative z-10 flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1"
                  >
                    <span className="text-[10px] font-bold text-[#6B6656] group-hover:text-[#1B2A45] mb-1 whitespace-nowrap">
                      {m.date}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all shadow-xs ${
                        isVac
                          ? 'bg-emerald-600 text-white border-emerald-300 group-hover:bg-emerald-700'
                          : isSurg
                          ? 'bg-rose-600 text-white border-rose-300 group-hover:bg-rose-700'
                          : 'bg-sky-600 text-white border-sky-300 group-hover:bg-sky-700'
                      }`}
                    >
                      {isVac && <Syringe className="w-4 h-4" />}
                      {isSurg && <HeartPulse className="w-4 h-4" />}
                      {isLab && <Microscope className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] font-bold text-[#1B2A45] mt-1 max-w-[90px] truncate text-center">
                      {m.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Visual Chronological Timeline Stream */}
      {Object.keys(groupedMilestones).length > 0 ? (
        <div className="space-y-6">
          {(Object.entries(groupedMilestones) as [string, TimelineMilestone[]][]).map(([groupTitle, milestones]) => (
            <div key={groupTitle} className="space-y-4">
              {/* Month/Year Divider Anchor */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1 rounded-full bg-[#1B2A45] text-[#D9B98A] text-xs font-bold font-display shadow-2xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#B8905A]" />
                  <span>{groupTitle}</span>
                </div>
                <div className="h-px bg-[#E1D6BE] grow" />
                <span className="text-[11px] text-[#6B6656] font-semibold">
                  {milestones.length} Prosedur & Catatan
                </span>
              </div>

              {/* Milestones Cards with Left Timeline Indicator */}
              <div className="relative pl-6 space-y-4 border-l-2 border-[#E1D6BE] ml-4">
                {milestones.map((m) => {
                  const isVac = m.category === 'VACCINATION';
                  const isSurg = m.category === 'SURGERY';
                  const isLab = m.category === 'LAB';

                  return (
                    <div key={m.id} className="relative group">
                      {/* Timeline Node Bullet */}
                      <div
                        className={`absolute -left-[33px] top-4 w-5 h-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center ${
                          isVac
                            ? 'bg-emerald-600 text-white'
                            : isSurg
                            ? 'bg-rose-600 text-white'
                            : 'bg-sky-600 text-white'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Main Milestone Card */}
                      <div
                        className={`rounded-2xl border transition-all p-4.5 bg-[#FFFDF9] shadow-2xs hover:shadow-md ${
                          isVac
                            ? 'border-emerald-200/90 hover:border-emerald-400'
                            : isSurg
                            ? 'border-rose-200/90 hover:border-rose-400'
                            : 'border-sky-200/90 hover:border-sky-400'
                        }`}
                      >
                        {/* Top Header of Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E1D6BE]">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                                isVac
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isSurg
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {isVac && <Syringe className="w-4 h-4" />}
                              {isSurg && <Scissors className="w-4 h-4" />}
                              {isLab && <Microscope className="w-4 h-4" />}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    isVac
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isSurg
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {isVac ? 'Vaksinasi Pasien' : isSurg ? 'Prosedur Bedah & Operasi' : 'Uji Laboratorium / Radiologi'}
                                </span>
                                {m.isImportant && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded">
                                    ★ Penting
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-[#1B2A45] font-display mt-0.5">
                                {m.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs font-mono font-bold text-[#1B2A45] bg-[#F6F1E6] px-2.5 py-1 rounded-lg border border-[#E1D6BE] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#B8905A]" />
                              {m.date} {m.time ? `• ${m.time}` : ''}
                            </span>
                            <button
                              onClick={() => setSelectedMilestone(m)}
                              className="px-2.5 py-1 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="w-3 h-3 text-[#D9B98A]" /> Detail
                            </button>
                          </div>
                        </div>

                        {/* Card Content Specific to Type */}
                        <div className="pt-3 text-xs space-y-2.5">
                          {/* 1. VACCINATION SPECIFIC DETAILS */}
                          {isVac && m.rawVaccine && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-[#F6F1E6]/70 p-3 rounded-xl border border-[#E1D6BE]">
                              <div>
                                <p className="text-[10px] text-[#6B6656] font-medium">Batch & Kedaluwarsa:</p>
                                <p className="font-bold text-[#1B2A45]">{m.rawVaccine.batchNumber}</p>
                                <p className="text-[10px] text-[#6B6656]">Exp: {m.rawVaccine.expiryDate}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6B6656] font-medium">Sertifikat Digital:</p>
                                <p className="font-mono font-bold text-[#B8905A]">{m.rawVaccine.certificateNo}</p>
                                <p className="text-[10px] text-emerald-700 font-bold">Terdaftar Resmi</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#6B6656] font-medium">Jadwal Booster Berikutnya:</p>
                                <p className="font-bold text-emerald-800 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {m.rawVaccine.nextDueDate}
                                </p>
                                <p className="text-[10px] text-[#6B6656]">Dokter: {m.rawVaccine.doctorName}</p>
                              </div>
                            </div>
                          )}

                          {/* 2. SURGICAL SPECIFIC DETAILS */}
                          {isSurg && m.rawSurgery && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                                <div>
                                  <p className="text-[10px] text-[#6B6656] font-medium">Kategori Operasi & ASA:</p>
                                  <p className="font-bold text-[#1B2A45]">{m.rawSurgery.category}</p>
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                    Skor: {m.rawSurgery.asaScore || 'ASA I'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#6B6656] font-medium">Tim Bedah & Anestesi:</p>
                                  <p className="font-bold text-[#1B2A45]">{m.rawSurgery.leadSurgeon}</p>
                                  <p className="text-[10px] text-[#6B6656]">Anestetis: {m.rawSurgery.anesthetist}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-[#6B6656] font-medium">Pelepasan Jahitan:</p>
                                  <p className="font-bold text-[#1B2A45]">{m.rawSurgery.sutureRemovalDate || 'Tidak perlu'}</p>
                                  <p className="text-[10px] text-emerald-700 font-bold">Status: {m.rawSurgery.status}</p>
                                </div>
                              </div>

                              {m.rawSurgery.findings && (
                                <p className="text-[11px] text-[#22242B] bg-[#F6F1E6] p-2.5 rounded-lg border border-[#E1D6BE]">
                                  <strong>Temuan Klinis Intraoperatif:</strong> {m.rawSurgery.findings}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 3. LAB SPECIFIC DETAILS */}
                          {isLab && m.rawLab && (
                            <div className="space-y-2">
                              {m.rawLab.results && m.rawLab.results.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px] border border-[#E1D6BE] rounded-xl overflow-hidden">
                                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px]">
                                      <tr>
                                        <th className="p-2">Parameter Lab</th>
                                        <th className="p-2">Hasil Uji</th>
                                        <th className="p-2">Nilai Rujukan Normal</th>
                                        <th className="p-2">Interpretasi</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E1D6BE] bg-white">
                                      {m.rawLab.results.map((res, i) => (
                                        <tr key={i} className={res.isCritical ? 'bg-amber-50/70 font-semibold' : ''}>
                                          <td className="p-2 font-medium text-[#1B2A45]">{res.parameter}</td>
                                          <td className="p-2 font-bold">
                                            <span className={res.isCritical ? 'text-amber-800' : 'text-emerald-700'}>
                                              {res.value} {res.unit}
                                            </span>
                                          </td>
                                          <td className="p-2 text-[#6B6656]">{res.referenceRange}</td>
                                          <td className="p-2">
                                            {res.isCritical ? (
                                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                                Abnormal
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                                Normal
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-[11px] text-[#6B6656] italic">Parameter terlampir pada dokumen DICOM / lembar lab resmi.</p>
                              )}

                              {m.rawLab.notes && (
                                <p className="text-[11px] text-[#22242B] bg-sky-50/70 p-2.5 rounded-lg border border-sky-200">
                                  <strong>Kesimpulan Dokter:</strong> {m.rawLab.notes}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Footer attribution */}
                          <div className="flex items-center justify-between text-[10px] text-[#6B6656] pt-1">
                            <span className="flex items-center gap-1">
                              <Stethoscope className="w-3 h-3 text-[#B8905A]" /> Penanggung Jawab: <strong className="text-[#1B2A45]">{m.doctor}</strong>
                            </span>
                            <span className="text-[#B8905A] font-semibold">Tervalidasi Sistem EMR ✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-8 text-center space-y-3">
          <FileText className="w-10 h-10 text-[#B8905A]/40 mx-auto" />
          <h4 className="text-sm font-bold text-[#1B2A45] font-display">Tidak Ada Riwayat Medis Ditemukan</h4>
          <p className="text-xs text-[#6B6656] max-w-md mx-auto">
            {searchQuery
              ? `Tidak ditemukan riwayat yang sesuai dengan kata kunci "${searchQuery}". Coba kata kunci lain atau bersihkan pencarian.`
              : `Belum ada riwayat medis tercatat untuk kategori terpilih pada pasien ${currentPet?.name}.`}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('ALL');
              setTimeHorizon('ALL');
            }}
            className="px-4 py-2 bg-[#F6F1E6] hover:bg-[#EAE2D1] text-[#1B2A45] text-xs font-bold rounded-xl border border-[#E1D6BE] transition-all"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* 5. Detail Inspection Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#E1D6BE] pb-3">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    selectedMilestone.category === 'VACCINATION'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedMilestone.category === 'SURGERY'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {selectedMilestone.category === 'VACCINATION'
                    ? 'Sertifikat Vaksinasi'
                    : selectedMilestone.category === 'SURGERY'
                    ? 'Laporan Bedah & Operasi'
                    : 'Hasil Uji Laboratorium'}
                </span>
                <h3 className="text-base font-bold text-[#1B2A45] font-display mt-1">
                  {selectedMilestone.title}
                </h3>
                <p className="text-xs text-[#6B6656]">
                  Pasien: <strong className="text-[#1B2A45]">{currentPet?.name}</strong> • Tanggal: <strong className="text-[#1B2A45]">{selectedMilestone.date}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-1.5 rounded-lg hover:bg-[#F6F1E6] text-[#6B6656] hover:text-[#1B2A45]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vaccine Details */}
            {selectedMilestone.category === 'VACCINATION' && selectedMilestone.rawVaccine && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                    <span className="font-bold text-emerald-900">Sertifikat Vaksinasi Hewan Resmi</span>
                    <span className="font-mono text-emerald-800 font-bold">{selectedMilestone.rawVaccine.certificateNo}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#1B2A45]">
                    <div><strong>Vaksin:</strong> {selectedMilestone.rawVaccine.vaccineName}</div>
                    <div><strong>Batch No:</strong> {selectedMilestone.rawVaccine.batchNumber}</div>
                    <div><strong>Tanggal Pemberian:</strong> {selectedMilestone.rawVaccine.givenDate}</div>
                    <div><strong>Kedaluwarsa Batch:</strong> {selectedMilestone.rawVaccine.expiryDate}</div>
                    <div><strong>Dokter Hewan:</strong> {selectedMilestone.rawVaccine.doctorName}</div>
                    <div><strong>Jatuh Tempo Booster:</strong> <span className="text-emerald-800 font-bold">{selectedMilestone.rawVaccine.nextDueDate}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Surgery Details */}
            {selectedMilestone.category === 'SURGERY' && selectedMilestone.rawSurgery && (
              <div className="space-y-3 text-xs">
                <div className="bg-rose-50/80 p-4 rounded-xl border border-rose-200 space-y-2">
                  <div className="flex justify-between items-center border-b border-rose-200 pb-2">
                    <span className="font-bold text-rose-900">Prosedur: {selectedMilestone.rawSurgery.procedureName}</span>
                    <span className="font-mono text-rose-800 font-bold">{selectedMilestone.rawSurgery.procedureNo}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[#1B2A45]">
                    <div><strong>Dokter Operator:</strong> {selectedMilestone.rawSurgery.leadSurgeon}</div>
                    <div><strong>Asisten Operator:</strong> {selectedMilestone.rawSurgery.assistantSurgeon || '-'}</div>
                    <div><strong>Anestetis:</strong> {selectedMilestone.rawSurgery.anesthetist}</div>
                    <div><strong>Skor Risiko:</strong> {selectedMilestone.rawSurgery.asaScore}</div>
                    <div><strong>Waktu:</strong> {selectedMilestone.rawSurgery.startTime || '10:00'} - {selectedMilestone.rawSurgery.endTime || '11:00'}</div>
                    <div><strong>Pelepasan Benang:</strong> {selectedMilestone.rawSurgery.sutureRemovalDate || 'Tidak perlu'}</div>
                  </div>
                </div>

                <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-1">
                  <p className="font-bold text-[#1B2A45]">Protokol Anestesi:</p>
                  <p className="text-[#22242B] font-mono text-[11px]">{selectedMilestone.rawSurgery.anesthesiaProtocol}</p>
                </div>

                {selectedMilestone.rawSurgery.findings && (
                  <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-1">
                    <p className="font-bold text-[#1B2A45]">Temuan Intraoperatif:</p>
                    <p className="text-[#22242B]">{selectedMilestone.rawSurgery.findings}</p>
                  </div>
                )}

                {selectedMilestone.rawSurgery.postOpNotes && (
                  <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] space-y-1">
                    <p className="font-bold text-[#1B2A45]">Catatan Pasca-Operasi & Pemulihan:</p>
                    <p className="text-[#22242B]">{selectedMilestone.rawSurgery.postOpNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Lab Details */}
            {selectedMilestone.category === 'LAB' && selectedMilestone.rawLab && (
              <div className="space-y-3 text-xs">
                <div className="bg-sky-50/80 p-4 rounded-xl border border-sky-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sky-950">{selectedMilestone.rawLab.testName}</h4>
                    <p className="text-[11px] text-[#6B6656]">Dokter Pengirim: {selectedMilestone.rawLab.orderedBy}</p>
                  </div>
                  <span className="font-mono text-sky-800 font-bold">{selectedMilestone.rawLab.testNo}</span>
                </div>

                {selectedMilestone.rawLab.results && selectedMilestone.rawLab.results.length > 0 && (
                  <table className="w-full text-left text-xs border border-[#E1D6BE] rounded-xl overflow-hidden">
                    <thead className="bg-[#F6F1E6] text-[#1B2A45] font-bold text-[10px]">
                      <tr>
                        <th className="p-2">Parameter</th>
                        <th className="p-2">Hasil</th>
                        <th className="p-2">Rujukan</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1D6BE]">
                      {selectedMilestone.rawLab.results.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-medium">{r.parameter}</td>
                          <td className="p-2 font-bold">{r.value} {r.unit}</td>
                          <td className="p-2 text-[#6B6656]">{r.referenceRange}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${r.isCritical ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {r.isCritical ? 'Tinggi' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selectedMilestone.rawLab.notes && (
                  <div className="p-3 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]">
                    <p className="font-bold text-[#1B2A45]">Interpretasi Klinis:</p>
                    <p className="text-[#22242B] mt-0.5">{selectedMilestone.rawLab.notes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E1D6BE]">
              <button
                onClick={() => setSelectedMilestone(null)}
                className="px-4 py-2 bg-[#F6F1E6] hover:bg-[#EAE2D1] text-[#1B2A45] text-xs font-bold rounded-xl border border-[#E1D6BE]"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  addToast(`Mencetak ringkasan dokumen "${selectedMilestone.title}"...`, 'info');
                  window.print();
                }}
                className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#D9B98A]" /> Cetak Dokumen Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Quick Add Milestone Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-[#E1D6BE] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1B2A45] font-display">
                  Catat Entri Medis Baru: {currentPet?.name}
                </h3>
                <p className="text-xs text-[#6B6656]">
                  Tambahkan vaksinasi, prosedur bedah, atau hasil lab langsung ke timeline kronologis pasien.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F6F1E6] text-[#6B6656] hover:text-[#1B2A45]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAddType('VACCINATION')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  addType === 'VACCINATION'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                }`}
              >
                <Syringe className="w-3.5 h-3.5" /> Vaksinasi
              </button>
              <button
                type="button"
                onClick={() => setAddType('SURGERY')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  addType === 'SURGERY'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" /> Bedah / Operasi
              </button>
              <button
                type="button"
                onClick={() => setAddType('LAB')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                  addType === 'LAB'
                    ? 'bg-sky-700 text-white border-sky-700'
                    : 'bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                }`}
              >
                <Microscope className="w-3.5 h-3.5" /> Hasil Lab
              </button>
            </div>

            {/* Vaccination Form */}
            {addType === 'VACCINATION' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Nama Vaksin</label>
                  <input
                    type="text"
                    value={vacForm.vaccineName}
                    onChange={(e) => setVacForm({ ...vacForm, vaccineName: e.target.value })}
                    className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Tanggal Pemberian</label>
                    <input
                      type="date"
                      value={vacForm.givenDate}
                      onChange={(e) => setVacForm({ ...vacForm, givenDate: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Jatuh Tempo Booster</label>
                    <input
                      type="date"
                      value={vacForm.nextDueDate}
                      onChange={(e) => setVacForm({ ...vacForm, nextDueDate: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Nomor Batch</label>
                    <input
                      type="text"
                      value={vacForm.batchNumber}
                      onChange={(e) => setVacForm({ ...vacForm, batchNumber: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Dokter Hewan</label>
                    <input
                      type="text"
                      value={vacForm.doctorName}
                      onChange={(e) => setVacForm({ ...vacForm, doctorName: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Surgery Form */}
            {addType === 'SURGERY' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Nama Prosedur Bedah</label>
                  <input
                    type="text"
                    value={surgForm.procedureName}
                    onChange={(e) => setSurgForm({ ...surgForm, procedureName: e.target.value })}
                    className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Kategori</label>
                    <select
                      value={surgForm.category}
                      onChange={(e) => setSurgForm({ ...surgForm, category: e.target.value as any })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold text-[#1B2A45]"
                    >
                      <option value="Sterilisasi">Sterilisasi</option>
                      <option value="Jaringan Lunak">Jaringan Lunak</option>
                      <option value="Dental">Dental</option>
                      <option value="Ortopedi">Ortopedi</option>
                      <option value="Onkologi">Onkologi</option>
                      <option value="Gawat Darurat">Gawat Darurat</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Tanggal Operasi</label>
                    <input
                      type="date"
                      value={surgForm.date}
                      onChange={(e) => setSurgForm({ ...surgForm, date: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Dokter Bedah Utama</label>
                    <input
                      type="text"
                      value={surgForm.leadSurgeon}
                      onChange={(e) => setSurgForm({ ...surgForm, leadSurgeon: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Skor ASA</label>
                    <select
                      value={surgForm.asaScore}
                      onChange={(e) => setSurgForm({ ...surgForm, asaScore: e.target.value as any })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-bold"
                    >
                      <option value="ASA I">ASA I (Normal)</option>
                      <option value="ASA II">ASA II (Penyakit Ringan)</option>
                      <option value="ASA III">ASA III (Sistemik Parah)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Temuan Intraoperatif & Hasil</label>
                  <textarea
                    rows={2}
                    value={surgForm.findings}
                    onChange={(e) => setSurgForm({ ...surgForm, findings: e.target.value })}
                    className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                  />
                </div>
              </div>
            )}

            {/* Lab Form */}
            {addType === 'LAB' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Nama Pengujian Lab</label>
                  <input
                    type="text"
                    value={labForm.testName}
                    onChange={(e) => setLabForm({ ...labForm, testName: e.target.value })}
                    className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE] font-semibold text-[#1B2A45]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Dokter Pemeriksa</label>
                    <input
                      type="text"
                      value={labForm.orderedBy}
                      onChange={(e) => setLabForm({ ...labForm, orderedBy: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block mb-1">Waktu Uji</label>
                    <input
                      type="text"
                      value={labForm.orderedAt}
                      onChange={(e) => setLabForm({ ...labForm, orderedAt: e.target.value })}
                      className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F6F1E6] p-3 rounded-xl border border-[#E1D6BE]">
                  <div>
                    <label className="font-bold text-[#1B2A45] block text-[10px]">Hb (g/dL)</label>
                    <input
                      type="text"
                      value={labForm.paramHb}
                      onChange={(e) => setLabForm({ ...labForm, paramHb: e.target.value })}
                      className="w-full p-1.5 bg-white rounded border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block text-[10px]">WBC (10³/µL)</label>
                    <input
                      type="text"
                      value={labForm.paramWbc}
                      onChange={(e) => setLabForm({ ...labForm, paramWbc: e.target.value })}
                      className="w-full p-1.5 bg-white rounded border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block text-[10px]">PLT (10³/µL)</label>
                    <input
                      type="text"
                      value={labForm.paramPlt}
                      onChange={(e) => setLabForm({ ...labForm, paramPlt: e.target.value })}
                      className="w-full p-1.5 bg-white rounded border border-[#E1D6BE]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1B2A45] block text-[10px]">ALT (U/L)</label>
                    <input
                      type="text"
                      value={labForm.paramAlt}
                      onChange={(e) => setLabForm({ ...labForm, paramAlt: e.target.value })}
                      className="w-full p-1.5 bg-white rounded border border-[#E1D6BE]"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold text-[#1B2A45] block mb-1">Catatan Interpretasi</label>
                  <textarea
                    rows={2}
                    value={labForm.notes}
                    onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                    className="w-full p-2 bg-[#F6F1E6] rounded-xl border border-[#E1D6BE]"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E1D6BE]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-[#F6F1E6] hover:bg-[#EAE2D1] text-[#1B2A45] text-xs font-bold rounded-xl border border-[#E1D6BE]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAdd}
                className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold rounded-xl shadow-xs"
              >
                Simpan ke Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
