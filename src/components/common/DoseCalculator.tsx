import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  X,
  Sparkles,
  Info,
  Pill,
  Scale,
  Syringe,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  Sliders,
  ShieldCheck,
  AlertOctagon,
  Flame,
  Activity,
  Database,
  User,
  History,
  FileText,
  Calendar,
  Stethoscope,
  TrendingUp,
  Tag,
  Ban,
  Hourglass,
  Layers,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import * as Types from '../../types';
import {
  SpeciesCategory,
  SPECIES_PRESETS,
  DRUG_PROTOCOLS,
  DrugProtocol,
  normalizeSpeciesToCategory,
  getSpeciesPresetId,
  evaluateDoseSafety,
  SafetyEvaluationResult,
  detectDrugContraindications,
  ActivePrescriptionItem,
  DetectedContraindication,
  DRUG_INTERACTION_RULES
} from '../../data/veterinaryDrugProtocols';
import { DoseTimelineView } from './DoseTimelineView';

// Re-export for compatibility
export { SPECIES_PRESETS, DRUG_PROTOCOLS, normalizeSpeciesToCategory, getSpeciesPresetId };
export type { DrugProtocol };

export interface EMRPatientWeightRecord {
  weightKg: number;
  date: string;
  source: 'soap_note' | 'master_profile' | 'vitals_draft';
  sourceTitle: string;
  doctorName?: string;
  visitId?: string;
  diagnosis?: string;
}

export interface DoseCalculatorProps {
  onClose?: () => void;
  defaultWeightKg?: number;
  defaultSpecies?: SpeciesCategory | string;
  patientName?: string;
  patientId?: string;
  currentPrescriptions?: Array<{
    drugId?: string;
    drugName: string;
    dosage?: string;
    frequency?: string;
    durationDays?: number;
    qty?: number;
    notes?: string;
  }>;
  onApplyToPrescription?: (drug: {
    drugName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    qty: number;
    notes?: string;
  }) => void;
  onSaveToEMR?: (record: {
    petId: string;
    petName: string;
    drugName: string;
    dosage: string;
    frequency: string;
    durationDays: number;
    route: string;
    weightKg: number;
    notes: string;
  }) => void;
  className?: string;
}

export const DoseCalculator: React.FC<DoseCalculatorProps> = ({
  onClose,
  defaultWeightKg = 4.2,
  defaultSpecies = 'Anjing',
  patientName,
  patientId,
  currentPrescriptions = [],
  onApplyToPrescription,
  onSaveToEMR,
  className = ''
}) => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const { pets = [], soapNotes = [], customers = [], medicalRecords = [], addMedicalRecord, updatePet } = useData();

  // Selected EMR Patient State
  const [selectedPetId, setSelectedPetId] = useState<string>(() => {
    if (patientId) return patientId;
    if (patientName) {
      const match = pets.find((p) => p.name.toLowerCase() === patientName.toLowerCase());
      if (match) return match.id;
    }
    return '';
  });

  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [showWeightHistory, setShowWeightHistory] = useState<boolean>(false);
  const [showActivePrescriptionsDrawer, setShowActivePrescriptionsDrawer] = useState<boolean>(false);
  const [showEMRHistoryDrawer, setShowEMRHistoryDrawer] = useState<boolean>(false);
  const [isSavedToEMR, setIsSavedToEMR] = useState<boolean>(false);
  // Guard klik-ganda — isSavedToEMR di atas murni kosmetik (label tombol,
  // auto-reset 4 detik), tidak pernah dicek sebagai guard. executeSaveToEMR
  // dipanggil dari 2 titik (tombol langsung & modal konfirmasi kontraindikasi)
  // dan sepenuhnya sinkron memanggil addMedicalRecord — tanpa ref ini, klik
  // ganda menggandakan entri rekam medis untuk satu pencatatan dosis yang sama.
  const isSavingToEMRRef = React.useRef(false);
  const [lastSavedEMRInfo, setLastSavedEMRInfo] = useState<{
    timestamp: string;
    petName: string;
    drugName: string;
    dosage: string;
  } | null>(null);
  const [pendingActionAfterModal, setPendingActionAfterModal] = useState<'apply' | 'save_emr' | null>(null);
  const [lastAutoFilledTimestamp, setLastAutoFilledTimestamp] = useState<string | null>(null);

  // Custom/Simulated Home Medication items added for interaction testing
  const [simulatedPrescriptions, setSimulatedPrescriptions] = useState<ActivePrescriptionItem[]>([]);
  const [newSimulatedDrugInput, setNewSimulatedDrugInput] = useState<string>('');

  // Contraindication Override Confirmation Modal State
  const [showContraindicationModal, setShowContraindicationModal] = useState<boolean>(false);

  // Mandatory Species Selector State
  const [selectedSpeciesPresetId, setSelectedSpeciesPresetId] = useState<string>(() =>
    getSpeciesPresetId(defaultSpecies)
  );
  const [species, setSpecies] = useState<SpeciesCategory>(() =>
    normalizeSpeciesToCategory(defaultSpecies)
  );

  // Patient Weight State
  const [weightKg, setWeightKg] = useState<number>(defaultWeightKg > 0 ? defaultWeightKg : 4.2);

  // Selected Drug Protocol
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(DRUG_PROTOCOLS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Custom Dose per kg (mg/kg) - dynamic based on species
  const [customDoseMgKg, setCustomDoseMgKg] = useState<number>(() => {
    const p = DRUG_PROTOCOLS[0];
    const initialCategory = normalizeSpeciesToCategory(defaultSpecies);
    return p.speciesProfiles[initialCategory]?.standardMgKg || 15;
  });

  // Concentration in mg/mL
  const [customConcentration, setCustomConcentration] = useState<number>(
    DRUG_PROTOCOLS[0].defaultConcentrationMgPerMl || 50
  );

  // UI Views & Catalog
  const [activeView, setActiveView] = useState<'calculator' | 'timeline' | 'catalog'>('calculator');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Find active selected pet from EMR
  const activeEMRPet = useMemo(() => {
    if (!selectedPetId) return null;
    return pets.find((p) => p.id === selectedPetId) || null;
  }, [selectedPetId, pets]);

  // Extract all weight records for the active pet from SOAP Notes & Master Profile
  const petEMRWeightData = useMemo(() => {
    if (!activeEMRPet) return null;

    // Retrieve all SOAP notes for this pet with recorded weightKg
    const patientSoaps = soapNotes
      .filter((s) => s.petId === activeEMRPet.id && typeof s.weightKg === 'number' && s.weightKg > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const history: EMRPatientWeightRecord[] = [];

    // Add SOAP notes to history
    patientSoaps.forEach((soap) => {
      history.push({
        weightKg: soap.weightKg!,
        date: soap.date,
        source: 'soap_note',
        sourceTitle: `SOAP Note (${soap.date})`,
        doctorName: soap.doctorName,
        visitId: soap.visitId,
        diagnosis: soap.workingDiagnosis
      });
    });

    // Also include master profile registration weight if distinct
    if (activeEMRPet.weightKg && activeEMRPet.weightKg > 0) {
      const alreadyHas = history.some(
        (h) => Math.abs(h.weightKg - activeEMRPet.weightKg) < 0.01 && h.date === activeEMRPet.createdAt
      );
      if (!alreadyHas) {
        history.push({
          weightKg: activeEMRPet.weightKg,
          date: activeEMRPet.createdAt || 'Registrasi',
          source: 'master_profile',
          sourceTitle: 'Master Profil Pasien',
          doctorName: 'PetCare Registry'
        });
      }
    }

    // Determine the latest recorded weight
    const latestRecord: EMRPatientWeightRecord =
      history.length > 0
        ? history[0]
        : {
            weightKg: activeEMRPet.weightKg || defaultWeightKg || 4.2,
            date: activeEMRPet.createdAt || 'Master EMR',
            source: 'master_profile',
            sourceTitle: 'Master Profil Pasien',
            doctorName: 'PetCare Registry'
          };

    return {
      pet: activeEMRPet,
      latestRecord,
      history,
      allergies: activeEMRPet.allergies ? activeEMRPet.allergies.split(',').map((a) => a.trim()) : []
    };
  }, [activeEMRPet, soapNotes, defaultWeightKg]);

  // Aggregate all Active Prescriptions for this Patient from EMR & Current Consultation Draft
  const patientActivePrescriptions = useMemo<ActivePrescriptionItem[]>(() => {
    const list: ActivePrescriptionItem[] = [];
    const seenNames = new Set<string>();

    // 1. Current active consultation draft prescriptions (passed via prop from active SOAP draft)
    if (currentPrescriptions && currentPrescriptions.length > 0) {
      currentPrescriptions.forEach((p) => {
        if (p.drugName && p.drugName.trim()) {
          const key = p.drugName.trim().toLowerCase();
          if (!seenNames.has(key)) {
            seenNames.add(key);
            list.push({
              drugName: p.drugName,
              dosage: p.dosage || 'Dosis draft',
              frequency: p.frequency || 'Jadwal draft',
              durationDays: p.durationDays,
              source: 'Resep SOAP Draft (Konsultasi Aktif)',
              notes: p.notes
            });
          }
        }
      });
    }

    // 2. Prescriptions from patient's previous SOAP notes in EMR
    if (activeEMRPet) {
      const patientSoaps = soapNotes
        .filter((s) => s.petId === activeEMRPet.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Check recent SOAP notes (last 3 visits)
      patientSoaps.slice(0, 3).forEach((soap) => {
        if (Array.isArray(soap.prescribedDrugs) && soap.prescribedDrugs.length > 0) {
          soap.prescribedDrugs.forEach((d) => {
            if (d.drugName && d.drugName.trim()) {
              const key = d.drugName.trim().toLowerCase();
              if (!seenNames.has(key)) {
                seenNames.add(key);
                list.push({
                  drugName: d.drugName,
                  dosage: d.dosage,
                  frequency: d.frequency,
                  durationDays: d.durationDays,
                  date: soap.date,
                  doctorName: soap.doctorName,
                  source: `SOAP Note (${soap.date})`
                });
              }
            }
          });
        }
      });
    }

    // 3. User-added simulated/external co-medications
    simulatedPrescriptions.forEach((sp) => {
      if (sp.drugName && sp.drugName.trim()) {
        const key = sp.drugName.trim().toLowerCase();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          list.push(sp);
        }
      }
    });

    return list;
  }, [currentPrescriptions, activeEMRPet, soapNotes, simulatedPrescriptions]);

  // Auto-fill logic when patientId or patientName props change from parent
  useEffect(() => {
    if (patientId) {
      setSelectedPetId(patientId);
    } else if (patientName) {
      const match = pets.find((p) => p.name.toLowerCase() === patientName.toLowerCase());
      if (match) {
        setSelectedPetId(match.id);
      }
    }
  }, [patientId, patientName, pets]);

  // Sync weight and species when activeEMRPet changes
  useEffect(() => {
    if (petEMRWeightData) {
      const { pet, latestRecord } = petEMRWeightData;

      // Auto-fill the latest recorded weight from EMR
      if (latestRecord.weightKg > 0) {
        setWeightKg(latestRecord.weightKg);
        setLastAutoFilledTimestamp(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }

      // Auto-fill the species from EMR
      if (pet.species) {
        const category = normalizeSpeciesToCategory(pet.species);
        const presetId = getSpeciesPresetId(pet.species);
        setSelectedSpeciesPresetId(presetId);
        setSpecies(category);

        // Adjust custom dose to this species standard
        const curr = DRUG_PROTOCOLS.find((p) => p.id === selectedProtocolId);
        if (curr) {
          const prof = curr.speciesProfiles[category] || curr.speciesProfiles['Anjing'];
          setCustomDoseMgKg(prof.standardMgKg);
        }
      }
    }
  }, [petEMRWeightData, selectedProtocolId]);

  // Direct prop synchronization for fallback/standalone usages
  useEffect(() => {
    if (!selectedPetId && defaultWeightKg > 0) {
      setWeightKg(defaultWeightKg);
    }
  }, [defaultWeightKg, selectedPetId]);

  useEffect(() => {
    if (!selectedPetId && defaultSpecies) {
      const presetId = getSpeciesPresetId(defaultSpecies);
      const category = normalizeSpeciesToCategory(defaultSpecies);
      setSelectedSpeciesPresetId(presetId);
      setSpecies(category);

      const curr = DRUG_PROTOCOLS.find((p) => p.id === selectedProtocolId);
      if (curr) {
        const prof = curr.speciesProfiles[category] || curr.speciesProfiles['Anjing'];
        setCustomDoseMgKg(prof.standardMgKg);
      }
    }
  }, [defaultSpecies, selectedProtocolId, selectedPetId]);

  const currentProtocol = useMemo(() => {
    return DRUG_PROTOCOLS.find((p) => p.id === selectedProtocolId) || DRUG_PROTOCOLS[0];
  }, [selectedProtocolId]);

  // Current species safety profile
  const currentSpeciesProfile = useMemo(() => {
    return (
      currentProtocol.speciesProfiles[species] ||
      currentProtocol.speciesProfiles['Anjing']
    );
  }, [currentProtocol, species]);

  const currentSpeciesPreset = useMemo(() => {
    return (
      SPECIES_PRESETS.find((p) => p.id === selectedSpeciesPresetId) ||
      SPECIES_PRESETS[0]
    );
  }, [selectedSpeciesPresetId]);

  // Detect real-time Contraindications between Current Protocol and Patient's Active Prescriptions
  const detectedContraindications = useMemo<DetectedContraindication[]>(() => {
    return detectDrugContraindications(currentProtocol, patientActivePrescriptions);
  }, [currentProtocol, patientActivePrescriptions]);

  const fatalContraindications = useMemo(() => {
    return detectedContraindications.filter((c) => c.severity === 'contraindicated');
  }, [detectedContraindications]);

  const majorContraindications = useMemo(() => {
    return detectedContraindications.filter((c) => c.severity === 'major_warning');
  }, [detectedContraindications]);

  const moderateContraindications = useMemo(() => {
    return detectedContraindications.filter((c) => c.severity === 'moderate_caution');
  }, [detectedContraindications]);

  // Check for allergy conflict with active EMR patient
  const allergyWarning = useMemo(() => {
    if (!petEMRWeightData || !petEMRWeightData.allergies.length) return null;
    const drugNameLower = currentProtocol.name.toLowerCase();
    const genericLower = currentProtocol.genericName.toLowerCase();

    for (const allergy of petEMRWeightData.allergies) {
      const alLower = allergy.toLowerCase();
      if (
        alLower &&
        (drugNameLower.includes(alLower) ||
          genericLower.includes(alLower) ||
          alLower.includes(drugNameLower) ||
          alLower.includes(genericLower))
      ) {
        return allergy;
      }
    }
    return null;
  }, [petEMRWeightData, currentProtocol]);

  // Handle Patient Selection Change from UI Dropdown
  const handleSelectPatient = (petId: string) => {
    if (!petId) {
      setSelectedPetId('');
      addToast('Beralih ke mode kalkulator manual (Tanpa tautan EMR).', 'info');
      return;
    }

    const pet = pets.find((p) => p.id === petId);
    if (!pet) return;

    setSelectedPetId(pet.id);

    // Find latest weight for this pet
    const patientSoaps = soapNotes
      .filter((s) => s.petId === pet.id && typeof s.weightKg === 'number' && s.weightKg > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const latestW = patientSoaps.length > 0 ? patientSoaps[0].weightKg! : pet.weightKg || 4.2;
    const latestSource =
      patientSoaps.length > 0
        ? `SOAP Note ${patientSoaps[0].date} (drh. ${patientSoaps[0].doctorName})`
        : `Master Profil Pasien`;

    setWeightKg(latestW);
    setLastAutoFilledTimestamp(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));

    // Auto-sync Species
    const category = normalizeSpeciesToCategory(pet.species);
    const presetId = getSpeciesPresetId(pet.species);
    setSelectedSpeciesPresetId(presetId);
    setSpecies(category);

    // Adjust dose per kg to target species standard
    const prof = currentProtocol.speciesProfiles[category] || currentProtocol.speciesProfiles['Anjing'];
    setCustomDoseMgKg(prof.standardMgKg);

    addToast(
      `⚡ Auto-fill EMR: Pasien "${pet.name}" (${pet.species}) terhubung. Bobot ${latestW} kg dimuat dari ${latestSource}.`,
      'success'
    );
  };

  // Re-sync with latest EMR weight on demand
  const handleResyncEMRWeight = () => {
    if (!petEMRWeightData) return;
    const latestW = petEMRWeightData.latestRecord.weightKg;
    setWeightKg(latestW);
    setLastAutoFilledTimestamp(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    addToast(
      `Bobot berhasil disinkronkan ulang dengan EMR: ${latestW} kg (${petEMRWeightData.latestRecord.sourceTitle})`,
      'success'
    );
  };

  // Handle Species Change via Mandatory Dropdown
  const handleSpeciesChange = (newSpeciesId: string) => {
    setSelectedSpeciesPresetId(newSpeciesId);
    const preset = SPECIES_PRESETS.find((p) => p.id === newSpeciesId);
    if (preset) {
      setSpecies(preset.category);
      // Automatically adjust the target dose to this species standard recommendation
      const prof = currentProtocol.speciesProfiles[preset.category] || currentProtocol.speciesProfiles['Anjing'];
      setCustomDoseMgKg(prof.standardMgKg);

      if (prof.contraindicated) {
        addToast(
          `⚠️ Perhatian: ${currentProtocol.name} memiliki KONTRAINDIKASI untuk ${preset.name}!`,
          'warning'
        );
      } else {
        addToast(
          `Rentang keamanan dosis diperbarui untuk spesies ${preset.name} (${prof.minMgKg} - ${prof.maxMgKg} mg/kg).`,
          'info'
        );
      }
    }
  };

  // Handle Protocol switch
  const handleProtocolSelect = (id: string) => {
    setSelectedProtocolId(id);
    const p = DRUG_PROTOCOLS.find((item) => item.id === id);
    if (p) {
      if (p.defaultConcentrationMgPerMl) {
        setCustomConcentration(p.defaultConcentrationMgPerMl);
      }
      const prof = p.speciesProfiles[species] || p.speciesProfiles['Anjing'];
      setCustomDoseMgKg(prof.standardMgKg);
    }
  };

  // Calculation Math
  const rawDoseMg = weightKg * customDoseMgKg;
  const isMaxCapped = Boolean(
    currentSpeciesProfile.maxTotalMg && rawDoseMg > currentSpeciesProfile.maxTotalMg
  );
  const finalDoseMg = isMaxCapped ? currentSpeciesProfile.maxTotalMg! : rawDoseMg;
  const volumeMl = customConcentration > 0 ? finalDoseMg / customConcentration : 0;

  // Real-time Safety Evaluation
  const safetyEvaluation: SafetyEvaluationResult = useMemo(() => {
    return evaluateDoseSafety(currentProtocol, species, customDoseMgKg, finalDoseMg);
  }, [currentProtocol, species, customDoseMgKg, finalDoseMg]);

  // Formatted Posology Text
  const currentDisplayName = activeEMRPet?.name || patientName || 'Pasien';
  const contraindicationSummary = useMemo(() => {
    if (detectedContraindications.length === 0) {
      return '🛡️ STATUS RESEP AKTIF: Aman (Tidak ditemukan kontraindikasi dengan riwayat resep EMR)';
    }
    const lines = detectedContraindications.map(
      (c) =>
        `⚠️ [${c.severity.toUpperCase()}] Konflik dengan: ${c.activePrescription.drugName} -> ${c.interactionRule.mechanism} (Rekomendasi: ${c.interactionRule.recommendation})`
    );
    return `🚨 PERINGATAN KONTRAINDIKASI TERDETEKSI (${detectedContraindications.length}):\n` + lines.join('\n');
  }, [detectedContraindications]);

  const posologySummaryText = `[POSOLOGI VETERINER PETCARE]
Pasien: ${currentDisplayName} - ${species} (BB: ${weightKg} kg)${
    petEMRWeightData ? ` [Sumber EMR: ${petEMRWeightData.latestRecord.sourceTitle}]` : ''
  }
Spesies Wajib Terpilih: ${currentSpeciesPreset.label}
Obat: ${currentProtocol.name} (${currentProtocol.category})
Dosis Terpilih: ${customDoseMgKg} mg/kg [Rentang Aman Spesies: ${currentSpeciesProfile.minMgKg} - ${currentSpeciesProfile.maxMgKg} mg/kg]
Status Keamanan Dosis: ${safetyEvaluation.statusLabel}
Total Dosis: ${finalDoseMg.toFixed(2)} mg ${isMaxCapped ? `(Dibatasi Batas Maksimal: ${currentSpeciesProfile.maxTotalMg} mg)` : ''}
Sediaan Cair: ${volumeMl.toFixed(2)} mL (Konsentrasi ${customConcentration} mg/mL)
Rute & Frekuensi: ${currentSpeciesProfile.route} | ${currentSpeciesProfile.frequency} | Durasi ${currentSpeciesProfile.durationDays} hari
${contraindicationSummary}
Catatan Klinis: ${currentSpeciesProfile.clinicalAdvice || currentSpeciesProfile.specialWarning || 'Gunakan sesuai petunjuk dokter hewan'}`;

  const handleCopyPosology = () => {
    navigator.clipboard.writeText(posologySummaryText);
    setCopied(true);
    addToast('Posologi dosis obat & status interaksi berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSimulatedDrug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSimulatedDrugInput.trim()) return;
    const name = newSimulatedDrugInput.trim();
    setSimulatedPrescriptions((prev) => [
      ...prev,
      {
        drugName: name,
        dosage: 'Dosis uji',
        frequency: '1x sehari',
        source: 'Obat Tambahan / Simulasi Khusus'
      }
    ]);
    setNewSimulatedDrugInput('');
    addToast(`Obat "${name}" ditambahkan ke daftar uji interaksi aktif.`, 'info');
  };

  const handleRemoveSimulatedDrug = (index: number) => {
    setSimulatedPrescriptions((prev) => prev.filter((_, i) => i !== index));
    addToast('Obat simulasi dihapus dari daftar evaluasi interaksi.', 'info');
  };

  // Filter all EMR Medical Records for the active patient
  const petMedicalRecords = useMemo(() => {
    if (!selectedPetId) return [];
    return medicalRecords
      .filter((mr) => mr.petId === selectedPetId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPetId, medicalRecords]);

  const handleApplyPrescription = () => {
    if (currentSpeciesProfile.contraindicated) {
      addToast(
        `Dilarang menerapkan resep: ${currentProtocol.name} KONTRAINDIKASI MUTLAK untuk ${species}!`,
        'error'
      );
      return;
    }

    // If fatal drug-drug contraindication is detected, show confirmation modal
    if (fatalContraindications.length > 0) {
      setPendingActionAfterModal('apply');
      setShowContraindicationModal(true);
      return;
    }

    executeApplyPrescription();
  };

  const executeApplyPrescription = () => {
    if (allergyWarning) {
      addToast(
        `⚠️ Peringatan Alergi: Pasien memiliki riwayat alergi "${allergyWarning}". Mohon periksa kembali resep!`,
        'warning'
      );
    }

    if (majorContraindications.length > 0) {
      addToast(
        `⚠️ Perhatian: Terdapat ${majorContraindications.length} peringatan interaksi obat mayor dengan resep aktif pasien!`,
        'warning'
      );
    }

    if (onApplyToPrescription) {
      const dosageFormatted =
        volumeMl > 0 && currentProtocol.suggestedUnit === 'mL'
          ? `${volumeMl.toFixed(2)} mL (${finalDoseMg.toFixed(1)} mg)`
          : `${finalDoseMg.toFixed(1)} mg (${customDoseMgKg} mg/kg)`;

      onApplyToPrescription({
        drugName: currentProtocol.name,
        dosage: dosageFormatted,
        frequency: currentSpeciesProfile.frequency,
        durationDays: currentSpeciesProfile.durationDays,
        qty: Math.max(
          1,
          Math.ceil(
            currentSpeciesProfile.durationDays *
              (currentSpeciesProfile.frequency.includes('2x') || currentSpeciesProfile.frequency.includes('q12h')
                ? 2
                : currentSpeciesProfile.frequency.includes('3x') || currentSpeciesProfile.frequency.includes('q8h')
                ? 3
                : 1)
          )
        ),
        notes: `[${species}] ${currentSpeciesProfile.clinicalAdvice || currentSpeciesProfile.route}`
      });
      addToast(`${currentProtocol.name} berhasil ditambahkan ke resep SOAP!`, 'success');
    }
  };

  const handleSaveToEMR = () => {
    if (!activeEMRPet) {
      addToast(
        '⚠️ Pasien EMR Belum Dipilih: Silakan pilih pasien dari database EMR di bagian atas untuk mencatat rekam terapi.',
        'warning'
      );
      const el = document.getElementById('emr-patient-autofill-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (currentSpeciesProfile.contraindicated) {
      addToast(
        `⛔ Dilarang mencatat ke EMR: ${currentProtocol.name} KONTRAINDIKASI MUTLAK untuk spesies ${species}!`,
        'error'
      );
      return;
    }

    // If fatal drug-drug contraindication is detected, show confirmation modal first
    if (fatalContraindications.length > 0) {
      setPendingActionAfterModal('save_emr');
      setShowContraindicationModal(true);
      return;
    }

    executeSaveToEMR();
  };

  const executeSaveToEMR = () => {
    if (!activeEMRPet || isSavingToEMRRef.current) return;
    isSavingToEMRRef.current = true;

    if (allergyWarning) {
      addToast(
        `⚠️ Peringatan Alergi: Pasien memiliki riwayat alergi "${allergyWarning}". Mohon verifikasi toleransi klinis!`,
        'warning'
      );
    }

    if (majorContraindications.length > 0) {
      addToast(
        `⚠️ Perhatian: Terdapat ${majorContraindications.length} peringatan interaksi obat mayor dengan resep aktif pasien!`,
        'warning'
      );
    }

    const dosageFormatted =
      volumeMl > 0 && currentProtocol.suggestedUnit === 'mL'
        ? `${volumeMl.toFixed(2)} mL (${finalDoseMg.toFixed(1)} mg)`
        : `${finalDoseMg.toFixed(1)} mg (${customDoseMgKg} mg/kg)`;

    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const doctorName = user?.name || 'Dokter Penanggung Jawab';

    const contraSummary = detectedContraindications.length > 0
      ? `${detectedContraindications.length} Peringatan Interaksi (${detectedContraindications.map(c => `${c.activePrescription.drugName} [${c.severity}]`).join(', ')})`
      : 'Aman / Tidak terdeteksi interaksi mayor';

    const emrTitle = `Terapi Obat: ${currentProtocol.name} (${dosageFormatted})`;
    const emrDescription = [
      `📋 LOG REKAM PEMBERIAN OBAT (VET DOSE CALCULATOR)`,
      `• Pasien: ${activeEMRPet.name} (${species}, ${activeEMRPet.breed || '-'}, BB: ${weightKg} kg, Pemilik: ${activeEMRPet.customerName || '-'})`,
      `• Nama Obat: ${currentProtocol.name} (${currentProtocol.category})`,
      `• Dosis Terkalkulasi: ${dosageFormatted} (Target Posologi: ${customDoseMgKg} mg/kg)`,
      `• Konsentrasi Sediaan: ${customConcentration} mg/mL | Volume: ${volumeMl > 0 ? volumeMl.toFixed(2) + ' mL' : 'Sediaan Padat/Tablet'}`,
      `• Rute Pemberian: ${currentSpeciesProfile.route}`,
      `• Frekuensi & Aturan: ${currentSpeciesProfile.frequency} (selama ${currentSpeciesProfile.durationDays} hari)`,
      `• Indikasi Klinis: ${currentProtocol.indications.join(', ')}`,
      `• Petunjuk Klinis: ${currentSpeciesProfile.clinicalAdvice || currentSpeciesProfile.specialWarning || 'Sesuai advis klinis dokter'}`,
      `• Evaluasi Keamanan: ${safetyEvaluation.statusLabel} (${safetyEvaluation.description})`,
      `• Status Interaksi: ${contraSummary}`,
      `• Waktu Pencatatan: ${dateStr} ${timeStr} WIB oleh ${doctorName}`
    ].join('\n');

    // 1. Add Medical Record to DataContext
    if (addMedicalRecord) {
      addMedicalRecord({
        petId: activeEMRPet.id,
        date: dateStr,
        type: 'Tindakan',
        title: emrTitle,
        description: emrDescription,
        performedBy: doctorName,
        attachments: []
      });
    }

    // 2. Sync weight to pet profile if altered
    if (updatePet && activeEMRPet.weightKg !== weightKg && weightKg > 0) {
      updatePet(activeEMRPet.id, { weightKg }).catch(() => {
        // Non-blocking: EMR record & callback below tetap jalan walau sync bobot ke profil pasien gagal.
      });
    }

    // 3. Trigger parent callback if provided
    if (onSaveToEMR) {
      onSaveToEMR({
        petId: activeEMRPet.id,
        petName: activeEMRPet.name,
        drugName: currentProtocol.name,
        dosage: dosageFormatted,
        frequency: currentSpeciesProfile.frequency,
        durationDays: currentSpeciesProfile.durationDays,
        route: currentSpeciesProfile.route,
        weightKg: weightKg,
        notes: `[${species}] ${currentSpeciesProfile.clinicalAdvice || currentSpeciesProfile.route}`
      });
    }

    // 4. If also running alongside SOAP prescription draft, sync it
    if (onApplyToPrescription) {
      onApplyToPrescription({
        drugName: currentProtocol.name,
        dosage: dosageFormatted,
        frequency: currentSpeciesProfile.frequency,
        durationDays: currentSpeciesProfile.durationDays,
        qty: Math.max(
          1,
          Math.ceil(
            currentSpeciesProfile.durationDays *
              (currentSpeciesProfile.frequency.includes('2x') || currentSpeciesProfile.frequency.includes('q12h')
                ? 2
                : currentSpeciesProfile.frequency.includes('3x') || currentSpeciesProfile.frequency.includes('q8h')
                ? 3
                : 1)
          )
        ),
        notes: `[${species}] ${currentSpeciesProfile.clinicalAdvice || currentSpeciesProfile.route}`
      });
    }

    // 5. Update UI state & feedback
    setIsSavedToEMR(true);
    setLastSavedEMRInfo({
      timestamp: timeStr,
      petName: activeEMRPet.name,
      drugName: currentProtocol.name,
      dosage: dosageFormatted
    });

    setTimeout(() => {
      setIsSavedToEMR(false);
      isSavingToEMRRef.current = false;
    }, 4000);

    addToast(
      `✓ Dosis & protokol ${currentProtocol.name} (${dosageFormatted}) berhasil disimpan ke Rekam Medis (EMR) pasien ${activeEMRPet.name}!`,
      'success'
    );
  };

  // Filtered protocols for catalog
  const filteredProtocols = useMemo(() => {
    return DRUG_PROTOCOLS.filter((p) => {
      const matchesCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const prof = p.speciesProfiles[species] || p.speciesProfiles['Anjing'];
      const matchesSearch =
        catalogSearch.trim() === '' ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.genericName.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (prof.clinicalAdvice && prof.clinicalAdvice.toLowerCase().includes(catalogSearch.toLowerCase())) ||
        (prof.specialWarning && prof.specialWarning.toLowerCase().includes(catalogSearch.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, catalogSearch, species]);

  // Filtered pets for quick search
  const filteredPetsForSelect = useMemo(() => {
    if (!patientSearchQuery.trim()) return pets;
    const q = patientSearchQuery.toLowerCase();
    return pets.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q)
    );
  }, [pets, patientSearchQuery]);

  const categories = ['Semua', 'Antibiotik', 'Analgesik', 'Antiemetik', 'Antiparasit', 'Kortikosteroid', 'Lainnya'];

  return (
    <div
      id="dose-calculator-card"
      className={`bg-[#FFFDF9] border border-[#E1D6BE] rounded-2xl shadow-sm text-[#1B2A45] overflow-hidden ${className}`}
    >
      {/* Header Bar - Clear, Professional & Clinical */}
      <div className="bg-[#1B2A45] text-[#FFFDF9] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#B8905A]/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#B8905A]/25 border border-[#B8905A]/50 flex items-center justify-center text-[#D9B98A] shrink-0 shadow-inner">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-[#FFFDF9] font-display truncate">
                Kalkulator Dosis & Posologi Veteriner
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#B8905A]/20 text-[#D9B98A] border border-[#B8905A]/40 shrink-0 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Auto-Fill EMR</span>
              </span>
            </div>
            <p className="text-[11px] text-[#EDE6D6]/80 hidden sm:block truncate">
              Kalkulasi posologi otomatis dengan penarikan riwayat bobot rekam medis (EMR) dan penyesuaian rentang aman per spesies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="hidden sm:flex items-center bg-[#101A2C] p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('calculator')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'calculator'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-sm'
                  : 'text-[#D9B98A] hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Kalkulator</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('timeline')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'timeline'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-sm'
                  : 'text-[#D9B98A] hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline 24 Jam</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('catalog')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'catalog'
                  ? 'bg-[#B8905A] text-[#101A2C] shadow-sm'
                  : 'text-[#D9B98A] hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Indeks Obat ({DRUG_PROTOCOLS.length})</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
              title="Tutup Kalkulator"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="sm:hidden flex border-b border-[#E1D6BE] bg-[#F6F1E6]/60">
        <button
          type="button"
          onClick={() => setActiveView('calculator')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 ${
            activeView === 'calculator'
              ? 'border-[#B8905A] text-[#1B2A45] bg-[#FFFDF9]'
              : 'border-transparent text-[#6B6656]'
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-[#B8905A]" />
          <span>Kalkulator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('timeline')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 ${
            activeView === 'timeline'
              ? 'border-[#B8905A] text-[#1B2A45] bg-[#FFFDF9]'
              : 'border-transparent text-[#6B6656]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#B8905A]" />
          <span>Timeline 24h</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('catalog')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 flex items-center justify-center gap-1.5 ${
            activeView === 'catalog'
              ? 'border-[#B8905A] text-[#1B2A45] bg-[#FFFDF9]'
              : 'border-transparent text-[#6B6656]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-[#B8905A]" />
          <span>Indeks ({DRUG_PROTOCOLS.length})</span>
        </button>
      </div>

      {/* VIEW 1: MAIN CALCULATOR */}
      {activeView === 'calculator' && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* STEP 0: EMR PATIENT AUTO-FILL INTEGRATION BAR */}
          <div
            id="emr-patient-autofill-section"
            className="bg-gradient-to-r from-[#1B2A45]/5 via-[#B8905A]/10 to-[#FAF7F2] p-3.5 sm:p-4 rounded-2xl border border-[#B8905A]/50 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1B2A45] text-[#D9B98A] flex items-center justify-center shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#1B2A45] flex items-center gap-1.5">
                    <span>Integrasi Auto-Fill Rekam Medis (EMR)</span>
                    <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300">
                      Live Sync
                    </span>
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#6B6656]">
                    Pilih nama pasien atau nomor rekam medis untuk menarik data bobot terakhir & spesies secara otomatis.
                  </p>
                </div>
              </div>

              {activeEMRPet && petEMRWeightData && (
                <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={handleResyncEMRWeight}
                    className="px-2.5 py-1 bg-white hover:bg-[#F6F1E6] text-[#1B2A45] text-[11px] font-bold rounded-lg border border-[#E1D6BE] shadow-2xs cursor-pointer flex items-center gap-1 transition-colors"
                    title="Tarik ulang data bobot terakhir dari EMR"
                  >
                    <RefreshCw className="w-3 h-3 text-[#B8905A]" />
                    <span>Sync Bobot EMR</span>
                  </button>

                  {petEMRWeightData.history.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowWeightHistory(!showWeightHistory)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-2xs cursor-pointer flex items-center gap-1 transition-colors ${
                        showWeightHistory
                          ? 'bg-[#1B2A45] text-white border-[#1B2A45]'
                          : 'bg-white hover:bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                      }`}
                    >
                      <History className="w-3 h-3 text-[#B8905A]" />
                      <span>Riwayat Timbang ({petEMRWeightData.history.length})</span>
                    </button>
                  )}

                  {/* Active Prescriptions / Interaction Checker Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowActivePrescriptionsDrawer(!showActivePrescriptionsDrawer)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all ${
                      showActivePrescriptionsDrawer
                        ? 'bg-[#1B2A45] text-white border-[#1B2A45]'
                        : detectedContraindications.length > 0
                        ? 'bg-rose-100 text-rose-800 border-rose-400 animate-pulse'
                        : 'bg-white hover:bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                    }`}
                  >
                    <Pill className={`w-3.5 h-3.5 ${detectedContraindications.length > 0 ? 'text-rose-600' : 'text-[#B8905A]'}`} />
                    <span>Resep Aktif ({patientActivePrescriptions.length})</span>
                    {detectedContraindications.length > 0 ? (
                      <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-black rounded-full">
                        {detectedContraindications.length} Konflik!
                      </span>
                    ) : patientActivePrescriptions.length > 0 ? (
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                        ✓ Aman
                      </span>
                    ) : null}
                  </button>

                  {/* EMR Medical Records / Treatment History Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowEMRHistoryDrawer(!showEMRHistoryDrawer)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all ${
                      showEMRHistoryDrawer
                        ? 'bg-[#1B2A45] text-white border-[#1B2A45]'
                        : isSavedToEMR
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white hover:bg-[#F6F1E6] text-[#1B2A45] border-[#E1D6BE]'
                    }`}
                    title="Lihat riwayat catatan medis & terapi EMR pasien"
                  >
                    <Database className={`w-3.5 h-3.5 ${isSavedToEMR || showEMRHistoryDrawer ? 'text-white' : 'text-[#B8905A]'}`} />
                    <span>Catatan Terapi EMR ({petMedicalRecords.length})</span>
                    {isSavedToEMR && (
                      <span className="px-1.5 py-0.2 bg-white text-emerald-800 text-[9px] font-black rounded-full animate-bounce">
                        ✓ Baru
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Live notification badge when drug is saved to EMR */}
            {lastSavedEMRInfo && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-emerald-900 animate-fade-in shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Tersimpan di EMR: <strong>{lastSavedEMRInfo.drugName}</strong> ({lastSavedEMRInfo.dosage}) untuk <strong>{lastSavedEMRInfo.petName}</strong> pukul {lastSavedEMRInfo.timestamp} WIB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEMRHistoryDrawer(true)}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shrink-0 ml-2"
                >
                  Lihat Log EMR
                </button>
              </div>
            )}

            {/* Patient Selector Dropdown & Quick Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-8">
                <div className="relative">
                  <select
                    id="emr-patient-select"
                    value={selectedPetId}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                    className="w-full bg-white border-2 border-[#B8905A]/70 hover:border-[#B8905A] rounded-xl pl-9 pr-10 py-2 text-xs sm:text-sm text-[#1B2A45] font-bold focus:outline-none focus:ring-2 focus:ring-[#B8905A]/40 shadow-xs cursor-pointer appearance-none truncate"
                  >
                    <option value="">-- Mode Manual (Ketik Bebas / Tanpa Pasien EMR) --</option>
                    {filteredPetsForSelect.map((pet) => {
                      // Find latest weight for display preview
                      const soaps = soapNotes.filter((s) => s.petId === pet.id && s.weightKg && s.weightKg > 0);
                      const displayW = soaps.length > 0 ? soaps[0].weightKg : pet.weightKg;
                      return (
                        <option key={pet.id} value={pet.id}>
                          [ID: {pet.id}] {pet.name} — {pet.species} ({pet.breed}) • Pemilik: {pet.customerName} • BB EMR: {displayW} kg
                        </option>
                      );
                    })}
                  </select>
                  <User className="w-4 h-4 text-[#B8905A] absolute left-3 top-2.5 pointer-events-none" />
                  <ChevronDown className="w-4 h-4 text-[#B8905A] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Search filter for long patient lists */}
              <div className="sm:col-span-4">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6B6656] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari ID / Nama / Pemilik..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#E1D6BE] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                  />
                  {patientSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPatientSearchQuery('')}
                      className="absolute right-2.5 top-2 text-[#6B6656] hover:text-black cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick 1-Click Patient Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              <span className="text-[10px] font-bold text-[#6B6656] uppercase tracking-wider shrink-0 mr-0.5">
                Pasien Terdaftar:
              </span>
              {pets.slice(0, 6).map((p) => {
                const isCurrent = p.id === selectedPetId;
                const soaps = soapNotes.filter((s) => s.petId === p.id && s.weightKg && s.weightKg > 0);
                const displayW = soaps.length > 0 ? soaps[0].weightKg : p.weightKg;
                return (
                  <button
                    key={`quick-pet-${p.id}`}
                    type="button"
                    onClick={() => handleSelectPatient(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isCurrent
                        ? 'bg-[#1B2A45] text-white shadow-xs scale-102 ring-1 ring-[#1B2A45]'
                        : 'bg-white text-[#1B2A45] border border-[#E1D6BE] hover:bg-[#F6F1E6]'
                    }`}
                  >
                    <span>{p.species === 'Anjing' ? '🐕' : p.species === 'Kucing' ? '🐈' : p.species === 'Kelinci' ? '🐇' : '🐾'}</span>
                    <span>{p.name}</span>
                    <span className="text-[10px] font-mono opacity-80">({displayW} kg)</span>
                  </button>
                );
              })}
            </div>

            {/* ACTIVE EMR AUTO-FILL INFO BANNER */}
            {activeEMRPet && petEMRWeightData && (
              <div className="bg-white rounded-xl p-3 border border-[#B8905A]/40 space-y-2 text-xs shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E1D6BE]/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-[#1B2A45]">
                      Pasien Terhubung: <strong className="text-[#9E7848]">{activeEMRPet.name}</strong> ({activeEMRPet.breed} - {activeEMRPet.species})
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                      ID: {activeEMRPet.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#6B6656]">Pemilik: <strong>{activeEMRPet.customerName}</strong></span>
                    {lastAutoFilledTimestamp && (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        ✓ Disinkronkan pukul {lastAutoFilledTimestamp}
                      </span>
                    )}
                  </div>
                </div>

                {/* EMR Weight Source Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 bg-[#FAF7F2] p-2 rounded-lg border border-[#E1D6BE]/70">
                    <Scale className="w-4 h-4 text-[#B8905A] shrink-0" />
                    <div>
                      <span className="text-[#6B6656] block text-[10px]">Bobot Terakhir Tercatat di EMR:</span>
                      <div className="flex items-baseline gap-1">
                        <strong className="text-sm font-black text-[#1B2A45] font-mono">
                          {petEMRWeightData.latestRecord.weightKg} kg
                        </strong>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          (Ditarik otomatis ke kalkulator)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-[#FAF7F2] p-2 rounded-lg border border-[#E1D6BE]/70">
                    <FileText className="w-4 h-4 text-[#1B2A45] shrink-0" />
                    <div>
                      <span className="text-[#6B6656] block text-[10px]">Sumber & Tanggal Rekam Medis:</span>
                      <span className="font-semibold text-[#1B2A45]">
                        {petEMRWeightData.latestRecord.sourceTitle}
                        {petEMRWeightData.latestRecord.doctorName ? ` • ${petEMRWeightData.latestRecord.doctorName}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Patient Allergy Alert Banner if recorded in EMR */}
                {activeEMRPet.allergies && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                      allergyWarning
                        ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold animate-pulse'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${allergyWarning ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div className="leading-snug">
                      <strong>Riwayat Alergi Pasien (EMR): </strong>
                      <span>{activeEMRPet.allergies}</span>
                      {allergyWarning && (
                        <p className="mt-1 text-rose-700 font-black">
                          ⚠️ PERINGATAN: Obat terpilih ({currentProtocol.name}) berpotensi kontraindikasi dengan riwayat alergi pasien!
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Collapsible Active Prescriptions & Drug Interaction Manager Drawer */}
                {showActivePrescriptionsDrawer && (
                  <div className="mt-2 pt-2 border-t border-[#E1D6BE] space-y-2 animate-fade-in bg-[#FAF7F2] p-3 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-[#B8905A]" />
                        <span className="font-bold text-xs text-[#1B2A45]">
                          Daftar Obat Aktif Pasien (EMR & Resep Berjalan):
                        </span>
                      </div>
                      <span className="text-[10px] text-[#6B6656]">
                        {patientActivePrescriptions.length} obat terdeteksi
                      </span>
                    </div>

                    {patientActivePrescriptions.length === 0 ? (
                      <div className="p-3 text-center bg-white rounded-lg border border-dashed border-[#E1D6BE] text-[#6B6656] text-xs">
                        Belum ada riwayat resep aktif untuk pasien ini. Anda dapat menambahkan obat simulasi di bawah untuk menguji interaksi obat.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {patientActivePrescriptions.map((rx, idx) => {
                          // Check if this item conflicts with currentProtocol
                          const isConflicting = detectedContraindications.some(
                            (c) => c.activePrescription.drugName.toLowerCase() === rx.drugName.toLowerCase()
                          );
                          return (
                            <div
                              key={`active-rx-${idx}`}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                isConflicting
                                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                                  : 'bg-white border-[#E1D6BE] text-[#1B2A45]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isConflicting ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                                <div className="min-w-0 truncate">
                                  <span className="font-bold">{rx.drugName}</span>
                                  {rx.dosage && <span className="text-[11px] text-[#6B6656] ml-1 font-mono">({rx.dosage})</span>}
                                  {rx.frequency && <span className="text-[10px] text-[#9E7848] ml-1">[{rx.frequency}]</span>}
                                  <span className="text-[9px] block text-[#6B6656] truncate">
                                    Sumber: {rx.source} {rx.prescribedDate ? `• ${rx.prescribedDate}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {isConflicting ? (
                                  <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[9px] rounded-full uppercase flex items-center gap-1 shadow-xs">
                                    <AlertOctagon className="w-2.5 h-2.5" />
                                    <span>Konflik!</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded border border-emerald-200">
                                    Kompatibel
                                  </span>
                                )}

                                {rx.source.includes('Simulasi') && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSimulatedDrug(idx - (patientActivePrescriptions.length - simulatedPrescriptions.length))}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Hapus obat simulasi"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Add Custom / Simulated Medication Form */}
                    <form onSubmit={handleAddSimulatedDrug} className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="Uji obat lain (cth: Dexamethasone, Meloxicam, Tramadol, Ketoconazole)..."
                        value={newSimulatedDrugInput}
                        onChange={(e) => setNewSimulatedDrugInput(e.target.value)}
                        className="flex-1 bg-white border border-[#E1D6BE] rounded-lg px-2.5 py-1 text-xs text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
                      />
                      <button
                        type="submit"
                        disabled={!newSimulatedDrugInput.trim()}
                        className="px-2.5 py-1 bg-[#1B2A45] text-white text-xs font-bold rounded-lg hover:bg-[#2A3F64] disabled:opacity-50 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Uji</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Collapsible Weight History Timeline */}
                {showWeightHistory && petEMRWeightData.history.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#E1D6BE] space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#1B2A45]">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#B8905A]" />
                        <span>Riwayat Penimbangan Pasien di Rekam Medis:</span>
                      </span>
                      <span className="text-[10px] text-[#6B6656]">
                        {petEMRWeightData.history.length} catatan ditemukan
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {petEMRWeightData.history.map((rec, idx) => (
                        <div
                          key={`rec-${idx}`}
                          onClick={() => {
                            setWeightKg(rec.weightKg);
                            addToast(`Bobot kalkulator diset ke ${rec.weightKg} kg (${rec.date}).`, 'info');
                          }}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            weightKg === rec.weightKg
                              ? 'bg-[#1B2A45] text-white border-[#1B2A45] shadow-2xs'
                              : 'bg-[#FAF7F2] hover:bg-[#E1D6BE]/40 text-[#1B2A45] border-[#E1D6BE]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-sm">{rec.weightKg} kg</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${weightKg === rec.weightKg ? 'bg-[#B8905A] text-white' : 'bg-white text-[#6B6656]'}`}>
                              {idx === 0 ? 'Terbaru' : rec.date}
                            </span>
                          </div>
                          <p className={`text-[10px] mt-0.5 truncate ${weightKg === rec.weightKg ? 'text-[#EDE6D6]' : 'text-[#6B6656]'}`}>
                            {rec.sourceTitle}
                          </p>
                          {rec.diagnosis && (
                            <p className={`text-[9px] italic truncate mt-0.5 ${weightKg === rec.weightKg ? 'text-amber-200' : 'text-slate-600'}`}>
                              Diag: {rec.diagnosis}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collapsible EMR Treatment & Medical Records History Drawer */}
                {showEMRHistoryDrawer && (
                  <div className="mt-2 pt-2 border-t border-[#E1D6BE] space-y-2 animate-fade-in bg-white/80 p-3 rounded-xl border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-[#B8905A]" />
                        <span className="font-bold text-xs text-[#1B2A45]">
                          Catatan Rekam Medis & Terapi EMR ({activeEMRPet.name}):
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEMRHistoryDrawer(false)}
                        className="text-[#6B6656] hover:text-[#1B2A45] p-1 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {petMedicalRecords.length === 0 ? (
                      <div className="p-3 text-center bg-[#FAF7F2] rounded-lg border border-dashed border-[#E1D6BE] text-[#6B6656] text-xs">
                        Belum ada catatan tindakan atau terapi yang tersimpan di EMR untuk pasien ini. Klik &quot;Simpan ke EMR&quot; di bawah untuk mencatat terapi pertama!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {petMedicalRecords.map((mr, idx) => {
                          const isDrugLog = mr.title.includes('Terapi') || mr.title.includes('Obat');
                          const isCurrentDrug = mr.title.toLowerCase().includes(currentProtocol.name.toLowerCase());
                          return (
                            <div
                              key={`emr-mr-${mr.id || idx}`}
                              className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                                isCurrentDrug
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
                                  : 'bg-[#FAF7F2] border-[#E1D6BE] text-[#1B2A45]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs flex items-center gap-1 truncate">
                                  {isDrugLog ? <Pill className="w-3.5 h-3.5 text-[#B8905A] shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[#6B6656] shrink-0" />}
                                  <span className="truncate">{mr.title}</span>
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isCurrentDrug && (
                                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white font-bold text-[9px] rounded">
                                      Obat Ini
                                    </span>
                                  )}
                                  <span className="text-[10px] text-[#6B6656] font-mono bg-white px-1.5 py-0.2 rounded border border-[#E1D6BE]">
                                    {mr.date}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-[#6B6656] line-clamp-2 whitespace-pre-line leading-relaxed">
                                {mr.description}
                              </p>
                              {mr.performedBy && (
                                <p className="text-[9px] text-[#9E7848] font-semibold">
                                  Oleh: {mr.performedBy}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 1: MANDATORY SPECIES SELECTOR & WEIGHT SECTION */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border-2 border-[#B8905A]/40 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1D6BE] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1B2A45] text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span className="font-bold text-xs sm:text-sm text-[#1B2A45] flex items-center gap-1">
                  <span>Pilihan Spesies Pasien</span>
                  <span className="text-rose-600 font-bold">* Wajib</span>
                </span>
                {activeEMRPet ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-bold border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>EMR: {activeEMRPet.name} ({activeEMRPet.species})</span>
                  </span>
                ) : patientName ? (
                  <span className="px-2 py-0.5 bg-[#1B2A45]/10 text-[#1B2A45] rounded-md text-[11px] font-semibold">
                    Pasien: {patientName}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#6B6656] font-medium">Spesies Aktif:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentSpeciesPreset.badgeColor}`}>
                  {currentSpeciesPreset.emoji} {currentSpeciesPreset.name}
                </span>
              </div>
            </div>

            {/* Main Mandatory Dropdown & Quick Badges */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              {/* Mandatory Dropdown */}
              <div className="lg:col-span-6 space-y-1">
                <label
                  htmlFor="mandatory-species-dropdown"
                  className="text-[11px] font-bold text-[#1B2A45] flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-[#B8905A]" />
                    <span>Pilih Taksonomi / Spesies Hewan:</span>
                  </span>
                  <span className="text-[10px] text-[#9E7848] font-semibold italic">
                    {currentSpeciesPreset.scientificName}
                  </span>
                </label>

                <div className="relative">
                  <select
                    id="mandatory-species-dropdown"
                    value={selectedSpeciesPresetId}
                    onChange={(e) => handleSpeciesChange(e.target.value)}
                    className="w-full bg-white border-2 border-[#B8905A] rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-[#1B2A45] font-black focus:outline-none focus:ring-2 focus:ring-[#B8905A]/40 shadow-xs cursor-pointer appearance-none"
                  >
                    {SPECIES_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-[#B8905A] absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Weight Input Box */}
              <div className="lg:col-span-6 space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="patient-weight-input" className="text-[11px] font-bold text-[#1B2A45] flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-[#B8905A]" />
                    <span>2. Bobot Badan (kg):</span>
                  </label>
                  {petEMRWeightData ? (
                    <button
                      type="button"
                      onClick={handleResyncEMRWeight}
                      className="text-[10px] text-[#B8905A] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      title="Kembalikan ke berat terakhir di rekam medis EMR"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> EMR ({petEMRWeightData.latestRecord.weightKg} kg)
                    </button>
                  ) : defaultWeightKg ? (
                    <button
                      type="button"
                      onClick={() => setWeightKg(defaultWeightKg)}
                      className="text-[10px] text-[#B8905A] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      title="Kembalikan ke berat awal pasien"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Pasien ({defaultWeightKg} kg)
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      id="patient-weight-input"
                      type="number"
                      step="0.1"
                      min="0.01"
                      max="200"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                      className="w-full bg-white border border-[#E1D6BE] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#1B2A45] font-black focus:outline-none focus:border-[#B8905A] shadow-2xs pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#6B6656]">kg</span>
                  </div>

                  {/* Quick Weight Adjusters */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[
                      { label: '+0.5', val: 0.5 },
                      { label: '+1.0', val: 1.0 },
                      { label: '+2.0', val: 2.0 }
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setWeightKg((w) => +(Math.max(0.1, w + btn.val)).toFixed(2))}
                        className="px-2 py-2 bg-white hover:bg-[#E1D6BE]/60 text-[#1B2A45] text-[11px] font-bold rounded-lg border border-[#E1D6BE] cursor-pointer transition-colors shadow-2xs"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Species Switcher Buttons */}
            <div className="pt-1 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-bold text-[#6B6656] uppercase tracking-wider shrink-0 mr-1">
                Pintasan Cepat:
              </span>
              {SPECIES_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedSpeciesPresetId;
                return (
                  <button
                    key={`quick-${preset.id}`}
                    type="button"
                    onClick={() => handleSpeciesChange(preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-[#1B2A45] text-white shadow-xs scale-102 ring-1 ring-[#1B2A45]'
                        : 'bg-white text-[#1B2A45] border border-[#E1D6BE] hover:bg-[#F6F1E6]'
                    }`}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Species Metabolic Note */}
            <div className="p-2.5 bg-white rounded-xl border border-[#E1D6BE] text-[11px] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#B8905A] shrink-0 mt-0.5" />
              <p className="text-[#6B6656] leading-relaxed">
                <strong className="text-[#1B2A45]">Karakteristik Spesies {species}: </strong>
                {currentSpeciesPreset.description}
              </p>
            </div>
          </div>

          {/* STEP 2: DRUG PROTOCOL SELECTOR */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label htmlFor="drug-protocol-selector" className="text-[11px] font-bold text-[#1B2A45] flex items-center gap-1.5">
                <Syringe className="w-3.5 h-3.5 text-[#B8905A]" />
                <span>3. Pilih Protokol Obat Farmakologis:</span>
              </label>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#1B2A45] text-white'
                        : 'bg-[#F6F1E6] text-[#6B6656] hover:bg-[#E1D6BE]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <select
                id="drug-protocol-selector"
                value={selectedProtocolId}
                onChange={(e) => handleProtocolSelect(e.target.value)}
                className="w-full bg-white border border-[#E1D6BE] rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-[#1B2A45] font-bold focus:outline-none focus:border-[#B8905A] shadow-2xs cursor-pointer appearance-none"
              >
                {filteredProtocols.map((p) => {
                  const prof = p.speciesProfiles[species] || p.speciesProfiles['Anjing'];
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.category}] — {prof.contraindicated ? '⛔ KONTRAINDIKASI PADA SPESIES INI' : `Standar: ${prof.standardMgKg} mg/kg (Rentang: ${prof.minMgKg}-${prof.maxMgKg} mg/kg)`}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-[#6B6656] absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* REAL-TIME DRUG-DRUG CONTRAINDICATION & INTERACTION ALERT SYSTEM */}
          {detectedContraindications.length > 0 ? (
            <div
              id="drug-interaction-warning-banner"
              className={`p-4 rounded-2xl border-2 shadow-xs space-y-3 animate-fade-in ${
                fatalContraindications.length > 0
                  ? 'bg-rose-50 border-rose-500 text-rose-950'
                  : 'bg-amber-50 border-amber-500 text-amber-950'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10">
                <div className="flex items-center gap-2">
                  {fatalContraindications.length > 0 ? (
                    <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                      <AlertOctagon className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
                      <span>
                        {fatalContraindications.length > 0
                          ? '🚨 PERINGATAN KONTRAINDIKASI OBAT MUTLAK TERDETEKSI'
                          : '⚠️ PERINGATAN INTERAKSI OBAT EMR TERDETEKSI'}
                      </span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-black uppercase text-white ${
                          fatalContraindications.length > 0 ? 'bg-rose-600' : 'bg-amber-600'
                        }`}
                      >
                        {detectedContraindications.length} Konflik
                      </span>
                    </h4>
                    <p className="text-[11px] opacity-90">
                      Obat yang sedang dihitung ({currentProtocol.name}) berkonflik dengan obat yang tercatat pada riwayat resep aktif pasien di EMR.
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 border border-black/10 self-start sm:self-auto font-mono">
                  Pasien: {currentDisplayName}
                </span>
              </div>

              {/* List of Detected Interactions */}
              <div className="space-y-2.5">
                {detectedContraindications.map((item, idx) => {
                  const isFatal = item.severity === 'contraindicated';
                  const isMajor = item.severity === 'major_warning';
                  return (
                    <div
                      key={`contraindication-card-${idx}`}
                      className={`p-3 rounded-xl border shadow-2xs space-y-2 ${
                        isFatal
                          ? 'bg-white border-rose-400 ring-1 ring-rose-300'
                          : isMajor
                          ? 'bg-white border-orange-300'
                          : 'bg-white border-amber-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 ${
                              isFatal
                                ? 'bg-rose-600 text-white animate-pulse'
                                : isMajor
                                ? 'bg-orange-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>
                              {isFatal
                                ? 'KONTRAINDIKASI MUTLAK'
                                : isMajor
                                ? 'PERINGATAN MAYOR'
                                : 'PERHATIAN MODERAT'}
                            </span>
                          </span>

                          <span className="text-xs font-black text-[#1B2A45]">
                            {currentProtocol.name} <span className="text-rose-600 font-extrabold font-mono">⚔️</span> {item.activePrescription.drugName}
                          </span>
                        </div>

                        <span className="text-[10px] text-[#6B6656] bg-slate-100 px-2 py-0.5 rounded font-medium truncate">
                          Sumber: {item.activePrescription.source}
                        </span>
                      </div>

                      {/* Mechanism & Pathophysiology */}
                      <div className="text-xs space-y-1">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] font-bold text-rose-700 uppercase shrink-0 mt-0.5">
                            Mekanisme Bahaya:
                          </span>
                          <p className="text-slate-800 leading-snug font-medium">
                            {item.interactionRule.mechanism}
                          </p>
                        </div>

                        {/* Recommendation */}
                        <div className="flex items-start gap-1.5 bg-[#FAF7F2] p-2 rounded-lg border border-[#E1D6BE]/80">
                          <Info className="w-3.5 h-3.5 text-[#B8905A] shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-snug">
                            <strong className="text-[#1B2A45]">Rekomendasi Klinis: </strong>
                            <span className="text-slate-700">{item.interactionRule.recommendation}</span>
                          </div>
                        </div>

                        {/* Washout Period Badge */}
                        {item.interactionRule.washoutPeriod && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-bold text-[#6B6656] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#B8905A]" />
                              <span>Wajib Jeda Bebas Obat (Wash-out Period):</span>
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 font-mono">
                              ⏳ {item.interactionRule.washoutPeriod}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : patientActivePrescriptions.length > 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs flex items-center justify-between gap-2 text-emerald-950 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-[#1B2A45]">
                    Skrining Interaksi Obat EMR: Bebas Kontraindikasi
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    {currentProtocol.name} kompatibel dan aman dikombinasikan dengan {patientActivePrescriptions.length} obat aktif pasien ({patientActivePrescriptions.map((p) => p.drugName).join(', ')}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActivePrescriptionsDrawer(true)}
                className="px-2 py-1 text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 rounded-lg hover:bg-emerald-100 cursor-pointer shrink-0"
              >
                Lihat Resep Aktif
              </button>
            </div>
          ) : null}

          {/* STEP 3: AUTOMATIC SPECIES SAFETY RANGE BAR & DOSE ADJUSTER */}
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E1D6BE] p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1D6BE] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#B8905A]" />
                <span className="font-bold text-xs sm:text-sm text-[#1B2A45]">
                  Rentang Keamanan Terapeutik ({species}):
                </span>
              </div>

              {currentSpeciesProfile.contraindicated ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>KONTRAINDIKASI MUTLAK</span>
                </span>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="text-[#6B6656]">Batas Aman:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-mono">
                    {currentSpeciesProfile.minMgKg} - {currentSpeciesProfile.maxMgKg} mg/kg
                  </span>
                  {currentSpeciesProfile.maxTotalMg && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Plafon: {currentSpeciesProfile.maxTotalMg} mg
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CONTRAINDICATION BANNER (if applicable) */}
            {currentSpeciesProfile.contraindicated ? (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-rose-700 text-sm">
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>PERINGATAN KONTRAINDIKASI SPESIES {species.toUpperCase()}!</span>
                </div>
                <p className="leading-relaxed font-semibold">
                  {currentSpeciesProfile.contraindicationReason}
                </p>
                {currentSpeciesProfile.specialWarning && (
                  <p className="text-[11px] text-rose-800 bg-rose-100 p-2 rounded-lg border border-rose-200">
                    💡 Rekomendasi: {currentSpeciesProfile.specialWarning}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Visual Safety Window Meter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-amber-600">Sub-terapeutik (&lt; {currentSpeciesProfile.minMgKg} mg/kg)</span>
                    <span className="text-emerald-700 font-extrabold">
                      Jendela Terapeutik Aman ({currentSpeciesProfile.minMgKg} - {currentSpeciesProfile.maxMgKg} mg/kg)
                    </span>
                    <span className="text-rose-600">Overdosis / Toksik (&gt; {currentSpeciesProfile.maxMgKg} mg/kg)</span>
                  </div>

                  {/* Safety Visual Bar */}
                  <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden flex border border-[#E1D6BE]">
                    {/* Zone 1: Sub-therapeutic (Yellow) */}
                    <div
                      className="h-full bg-amber-400/80 border-r border-white/40 flex items-center justify-center text-[9px] font-bold text-amber-900"
                      style={{ width: '25%' }}
                      title="Zona Sub-terapeutik"
                    >
                      Rendah
                    </div>

                    {/* Zone 2: Safe Therapeutic Window (Green) */}
                    <div
                      className="h-full bg-emerald-500 flex items-center justify-center text-[9px] font-black text-white"
                      style={{ width: '50%' }}
                      title="Rentang Aman Optimal"
                    >
                      ★ Zona Aman Terapeutik
                    </div>

                    {/* Zone 3: Warning High (Orange) */}
                    <div
                      className="h-full bg-orange-400 border-r border-white/40 flex items-center justify-center text-[9px] font-bold text-orange-950"
                      style={{ width: '15%' }}
                      title="Dosis Tinggi / Waspada"
                    >
                      Tinggi
                    </div>

                    {/* Zone 4: Overdose / Danger (Red) */}
                    <div
                      className="h-full bg-rose-600 flex items-center justify-center text-[9px] font-black text-white"
                      style={{ width: '10%' }}
                      title="Bahaya Toksisitas"
                    >
                      Toksik
                    </div>
                  </div>
                </div>

                {/* Dose Selection Buttons & Custom Dose Slider */}
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E1D6BE] space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#B8905A]" />
                      <span>Atur Dosis Diberikan (mg/kg):</span>
                    </span>

                    {/* Preset Safety Range Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setCustomDoseMgKg(currentSpeciesProfile.minMgKg)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          customDoseMgKg === currentSpeciesProfile.minMgKg
                            ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                            : 'bg-white text-[#6B6656] border-[#E1D6BE] hover:bg-[#F6F1E6]'
                        }`}
                      >
                        Min Aman ({currentSpeciesProfile.minMgKg})
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomDoseMgKg(currentSpeciesProfile.standardMgKg)}
                        className={`px-3 py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                          customDoseMgKg === currentSpeciesProfile.standardMgKg
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        ★ Standar ({currentSpeciesProfile.standardMgKg})
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomDoseMgKg(currentSpeciesProfile.maxMgKg)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                          customDoseMgKg === currentSpeciesProfile.maxMgKg
                            ? 'bg-orange-100 text-orange-900 border-orange-400 shadow-xs'
                            : 'bg-white text-[#6B6656] border-[#E1D6BE] hover:bg-[#F6F1E6]'
                        }`}
                      >
                        Maks Aman ({currentSpeciesProfile.maxMgKg})
                      </button>
                    </div>
                  </div>

                  {/* Range Slider & Manual Input */}
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={Math.max(0.01, +(currentSpeciesProfile.minMgKg * 0.5).toFixed(2))}
                      max={+(currentSpeciesProfile.maxMgKg * 1.8).toFixed(2)}
                      step={currentSpeciesProfile.standardMgKg < 1 ? 0.01 : 0.5}
                      value={customDoseMgKg}
                      onChange={(e) => setCustomDoseMgKg(parseFloat(e.target.value) || currentSpeciesProfile.standardMgKg)}
                      className="flex-1 accent-[#B8905A] cursor-pointer"
                    />

                    <div className="flex items-center gap-1 bg-white border border-[#E1D6BE] rounded-lg px-2 py-1 shadow-2xs">
                      <input
                        type="number"
                        step={currentSpeciesProfile.standardMgKg < 1 ? 0.01 : 0.5}
                        min="0.01"
                        value={customDoseMgKg}
                        onChange={(e) => setCustomDoseMgKg(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                        className="w-16 text-center text-xs font-black text-[#1B2A45] focus:outline-none"
                      />
                      <span className="text-[10px] font-bold text-[#6B6656]">mg/kg</span>
                    </div>
                  </div>

                  {/* Real-time Dynamic Safety Evaluation Feedback Box */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${safetyEvaluation.bgClass} ${safetyEvaluation.borderClass} ${safetyEvaluation.textClass}`}
                  >
                    {safetyEvaluation.status === 'optimal' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {safetyEvaluation.status === 'underdose' && (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    {safetyEvaluation.status === 'warning_high' && (
                      <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    )}
                    {safetyEvaluation.status === 'overdose_danger' && (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.2 rounded text-[10px] ${safetyEvaluation.badgeClass}`}>
                          {safetyEvaluation.statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-white/90">
                        {safetyEvaluation.description}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Liquid Concentration Setting */}
            <div className="bg-[#FAF7F2] rounded-xl border border-[#E1D6BE] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#B8905A]" />
                <span className="font-semibold text-[#1B2A45]">Konsentrasi Sediaan Cair / Injeksi:</span>
                <span className="text-[10px] text-[#6B6656] font-normal">(untuk kalkulasi volume mL)</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[1.5, 2, 5, 10, 20, 50, 62.5, 100].map((conc) => (
                  <button
                    key={conc}
                    type="button"
                    onClick={() => setCustomConcentration(conc)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                      customConcentration === conc
                        ? 'bg-[#1B2A45] text-white border-[#1B2A45]'
                        : 'bg-white text-[#6B6656] border-[#E1D6BE] hover:bg-[#F6F1E6]'
                    }`}
                  >
                    {conc} mg/mL
                  </button>
                ))}

                <div className="flex items-center gap-1 bg-white border border-[#E1D6BE] rounded-md px-1.5 py-0.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={customConcentration}
                    onChange={(e) => setCustomConcentration(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-12 text-center text-xs font-bold text-[#1B2A45] focus:outline-none"
                  />
                  <span className="text-[9px] text-[#6B6656] font-bold">mg/mL</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CALCULATION RESULT CARD */}
          <div className="bg-[#1B2A45] text-[#FFFDF9] rounded-2xl p-4 sm:p-5 border border-[#B8905A]/40 shadow-sm space-y-4">
            {/* Header of Results */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#B8905A] text-[#101A2C] text-[10px] font-black uppercase tracking-wider">
                  Hasil Posologi Terhitung
                </span>
                <span className="text-sm font-bold text-[#EDE6D6] truncate max-w-xs">
                  {currentProtocol.name}
                </span>
              </div>

              <div className="text-xs text-[#D9B98A] font-mono font-bold">
                {customDoseMgKg} mg/kg × {weightKg} kg = {rawDoseMg.toFixed(2)} mg
              </div>
            </div>

            {/* 3 Core Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Metric 1: Total Active Dose */}
              <div className="bg-[#101A2C] p-3.5 rounded-xl border border-[#B8905A]/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#D9B98A] uppercase font-bold tracking-wider block">
                    Total Dosis Aktif
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                      {finalDoseMg.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-[#EDE6D6]">mg</span>
                  </div>
                </div>
                {isMaxCapped ? (
                  <span className="text-[10px] text-rose-300 font-bold mt-1.5 block">
                    ⚠️ Dibatasi batas max: {currentSpeciesProfile.maxTotalMg} mg
                  </span>
                ) : (
                  <span className="text-[10px] text-[#EDE6D6]/70 mt-1.5 block">
                    Dosis: {customDoseMgKg} mg/kg ({species})
                  </span>
                )}
              </div>

              {/* Metric 2: Liquid Volume */}
              <div className="bg-[#101A2C] p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">
                    Volume Sediaan Cair
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                      {volumeMl.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-[#EDE6D6]">mL</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-200/70 mt-1.5 block">
                  Konsentrasi {customConcentration} mg/mL
                </span>
              </div>

              {/* Metric 3: Route & Frequency */}
              <div className="bg-[#101A2C] p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-[#EDE6D6]/80 uppercase font-bold tracking-wider block">
                    Rute & Frekuensi Spesies
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white mt-1 leading-snug">
                    {currentSpeciesProfile.route}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('timeline')}
                  className="mt-1.5 flex items-center justify-between gap-1 text-[10px] font-bold text-[#D9B98A] bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg border border-white/10 cursor-pointer transition-colors w-full"
                  title="Lihat Timeline Interval 24 Jam"
                >
                  <span className="flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 text-[#B8905A] shrink-0" />
                    <span>{currentSpeciesProfile.frequency} ({currentSpeciesProfile.durationDays} hari)</span>
                  </span>
                  <span className="text-[9px] text-amber-300 font-mono shrink-0">Timeline 24h ➜</span>
                </button>
              </div>
            </div>

            {/* Species Clinical Advice */}
            {currentSpeciesProfile.clinicalAdvice && (
              <div className="bg-white/10 rounded-xl p-3 text-xs text-[#FFFDF9] flex items-start gap-2.5 border border-white/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-[#D9B98A]">Petunjuk Klinis untuk {species}: </strong>
                  <span className="text-white/95">{currentSpeciesProfile.clinicalAdvice}</span>
                </div>
              </div>
            )}

            {/* Species Special Warning */}
            {currentSpeciesProfile.specialWarning && (
              <div className="bg-amber-950/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5 border border-amber-500/40">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-amber-300">Peringatan Khusus {species}: </strong>
                  <span>{currentSpeciesProfile.specialWarning}</span>
                </div>
              </div>
            )}

            {/* Global Drug Warnings */}
            {currentProtocol.globalWarnings && currentProtocol.globalWarnings.length > 0 && (
              <div className="bg-white/5 rounded-xl p-2.5 text-[10px] text-[#EDE6D6]/80 space-y-0.5 border border-white/10">
                <strong className="text-[#D9B98A] block">Catatan Tambahan & Penyimpanan:</strong>
                <ul className="list-disc pl-4 space-y-0.5">
                  {currentProtocol.globalWarnings.map((w, idx) => (
                    <li key={`gw-${idx}`}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
              <span className="text-[10px] text-[#EDE6D6]/70 italic text-center sm:text-left">
                * Wewenang dan penyesuaian dosis klinis akhir tetap berada di bawah tanggung jawab dokter hewan penanggung jawab.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveView('timeline')}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-[#B8905A]/20 hover:bg-[#B8905A]/35 text-[#D9B98A] hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-[#B8905A]/40 cursor-pointer transition-colors shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 text-[#D9B98A]" />
                  <span>Timeline 24 Jam</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyPosology}
                  className="flex-1 sm:flex-initial px-3.5 py-2 bg-white/10 hover:bg-white/20 text-[#FFFDF9] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-white/20 cursor-pointer transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#D9B98A]" />
                      <span>Salin Posologi</span>
                    </>
                  )}
                </button>

                {/* Primary Save to EMR Action Button */}
                <button
                  type="button"
                  onClick={handleSaveToEMR}
                  disabled={currentSpeciesProfile.contraindicated || isSavedToEMR}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                    currentSpeciesProfile.contraindicated
                      ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                      : isSavedToEMR
                      ? 'bg-emerald-600 text-white cursor-not-allowed shadow-emerald-500/20'
                      : 'bg-emerald-600/90 hover:bg-emerald-600 text-white cursor-pointer hover:shadow-xs'
                  }`}
                  title="Simpan dosis terhitung & posologi ke Rekam Medis (EMR) pasien"
                >
                  {isSavedToEMR ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Tersimpan ke EMR ✓</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Simpan ke EMR</span>
                    </>
                  )}
                </button>

                {onApplyToPrescription && (
                  <button
                    type="button"
                    onClick={handleApplyPrescription}
                    disabled={currentSpeciesProfile.contraindicated}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                      currentSpeciesProfile.contraindicated
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                        : 'bg-[#B8905A] hover:bg-[#9E7848] text-[#101A2C] cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Terapkan ke Resep SOAP</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 24-HOUR VERTICAL TIMELINE VIEW */}
      {activeView === 'timeline' && (
        <div className="p-4 sm:p-5 animate-fade-in">
          <DoseTimelineView
            protocol={currentProtocol}
            species={species}
            speciesProfile={currentSpeciesProfile}
            patientName={currentDisplayName}
            weightKg={weightKg}
            doseMg={finalDoseMg}
            volumeMl={volumeMl}
            concentration={customConcentration}
            customDoseMgKg={customDoseMgKg}
            isMaxCapped={isMaxCapped}
            onApplyToPrescription={onApplyToPrescription ? handleApplyPrescription : undefined}
            onSaveToEMR={handleSaveToEMR}
            isSavedToEMR={isSavedToEMR}
            onBackToCalculator={() => setActiveView('calculator')}
          />
        </div>
      )}

      {/* VIEW 3: DRUG PROTOCOLS CATALOG & INDEX */}
      {activeView === 'catalog' && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#6B6656] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari obat, indikasi, atau aksi..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#E1D6BE] text-[#1B2A45] focus:outline-none focus:border-[#B8905A]"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#1B2A45] text-white'
                      : 'bg-[#F6F1E6] text-[#6B6656] hover:bg-[#E1D6BE]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Protocols Reference List for current species */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
            {filteredProtocols.map((p) => {
              const isSelected = p.id === selectedProtocolId;
              const prof = p.speciesProfiles[species] || p.speciesProfiles['Anjing'];
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    prof.contraindicated
                      ? 'bg-rose-50/70 border-rose-200'
                      : isSelected
                      ? 'bg-[#FFFDF9] border-[#B8905A] shadow-xs ring-1 ring-[#B8905A]'
                      : 'bg-[#F6F1E6]/40 border-[#E1D6BE] hover:bg-white hover:border-[#B8905A]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-[#1B2A45] text-[#D9B98A] uppercase">
                          {p.category}
                        </span>
                        {prof.contraindicated && (
                          <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-rose-600 text-white">
                            KONTRAINDIKASI {species.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-[#1B2A45] mt-1 font-display">{p.name}</h4>
                      <p className="text-[10px] text-[#6B6656] italic">{p.brandExamples}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          handleProtocolSelect(p.id);
                          setActiveView('timeline');
                        }}
                        className="px-2 py-1 bg-[#1B2A45]/10 hover:bg-[#1B2A45]/20 text-[#1B2A45] text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title="Lihat Timeline 24 Jam"
                      >
                        <Clock className="w-3 h-3 text-[#B8905A]" />
                        <span className="hidden sm:inline">Timeline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleProtocolSelect(p.id);
                          setActiveView('calculator');
                        }}
                        className="px-2.5 py-1 bg-[#B8905A] hover:bg-[#9E7848] text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Hitung</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 text-[11px] space-y-1 bg-white/70 p-2 rounded-lg border border-[#E1D6BE]">
                    <div className="flex justify-between text-[#6B6656]">
                      <span>Rentang Aman ({species}):</span>
                      <span className="font-mono font-bold text-[#1B2A45]">
                        {prof.contraindicated ? 'DILARANG' : `${prof.minMgKg} - ${prof.maxMgKg} mg/kg`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#6B6656]">
                      <span>Rute & Frekuensi:</span>
                      <span className="font-semibold text-[#1B2A45]">{prof.route} ({prof.frequency})</span>
                    </div>
                    {prof.clinicalAdvice && (
                      <p className="text-[10px] text-[#22242B] mt-1 pt-1 border-t border-[#E1D6BE] line-clamp-2">
                        <strong>Catatan {species}:</strong> {prof.clinicalAdvice}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FATAL CONTRAINDICATION OVERRIDE CONFIRMATION MODAL */}
      {showContraindicationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#FFFDF9] border-2 border-rose-500 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="bg-rose-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base font-display">
                    Peringatan Kontraindikasi Medis Mutlak
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    Konflik farmakologis terdeteksi antara resep aktif & obat terpilih
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowContraindicationModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-[#1B2A45] max-h-[75vh] overflow-y-auto">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span>Pasien: <strong>{currentDisplayName}</strong> ({species})</span>
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] uppercase font-mono">
                    Tingkat Bahaya: Kritis
                  </span>
                </div>
                <p className="text-rose-800 text-[11px] leading-relaxed">
                  Penerapan obat <strong>{currentProtocol.name}</strong> secara bersamaan atau tanpa jeda waktu yang cukup dengan obat aktif pasien dapat memicu komplikasi toksisitas atau efek samping fatal:
                </p>
              </div>

              {/* List of Fatal/Major Conflicts */}
              <div className="space-y-2">
                {fatalContraindications.map((c, i) => (
                  <div key={`modal-fatal-${i}`} className="p-3 bg-white rounded-xl border border-rose-300 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-rose-700">
                        ⚔️ {currentProtocol.name} vs {c.activePrescription.drugName}
                      </span>
                      <span className="text-[10px] text-[#6B6656] bg-slate-100 px-2 py-0.5 rounded">
                        {c.activePrescription.source}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      <strong>Mekanisme:</strong> {c.interactionRule.mechanism}
                    </p>
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <strong>Rekomendasi:</strong> {c.interactionRule.recommendation}
                    </div>
                    {c.interactionRule.washoutPeriod && (
                      <p className="text-[10px] font-bold text-rose-800">
                        ⏳ Jeda Wajib (Wash-out): {c.interactionRule.washoutPeriod}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Clinical Responsibility Notice */}
              <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E1D6BE] text-[11px] text-[#6B6656] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[#B8905A] shrink-0 mt-0.5" />
                <p>
                  Dengan melakukan override, dokter hewan penanggung jawab menyatakan telah mempertimbangkan rasio manfaat-risiko klinis serta pengawasan intensif terhadap pasien.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-[#F6F1E6]/70 px-5 py-3.5 border-t border-[#E1D6BE] flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowContraindicationModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-[#1B2A45] hover:bg-[#2A3F64] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Batalkan & Pilih Obat Lain
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowContraindicationModal(false);
                  if (pendingActionAfterModal === 'save_emr') {
                    executeSaveToEMR();
                  } else {
                    executeApplyPrescription();
                  }
                  addToast(`Tindakan dilanjutkan dengan konfirmasi override kontraindikasi oleh dokter hewan.`, 'warning');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl border border-rose-300 cursor-pointer transition-colors"
              >
                Override Dokter Hewan (Tetap {pendingActionAfterModal === 'save_emr' ? 'Simpan ke EMR' : 'Terapkan'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
