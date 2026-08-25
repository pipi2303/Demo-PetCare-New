import React, { useState, useEffect } from 'react';
import { Pet, ClinicVisit, SOAPNote, MedicalRecord, Inpatient, TriageUrgencyResult, TriageUrgencyLevel } from '../../types';
import { analyzePetTriageWithGemini, computeClientTriageUrgency } from '../../utils/aiTriageUrgency';
import {
  ShieldAlert,
  AlertTriangle,
  HeartPulse,
  Activity,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  X,
  Stethoscope,
  FileText,
  Zap,
  ArrowRight,
  Sliders,
  Check
} from 'lucide-react';

export interface DraftSoapInput {
  chiefComplaint?: string;
  hpi?: string;
  tempC?: number;
  hr?: number;
  rr?: number;
  spO2?: number;
  weightKg?: number;
  examNotes?: string;
  diagnosis?: string;
  diffDiag?: string;
  severity?: 'Ringan' | 'Sedang' | 'Berat' | 'Kritis';
}

interface TriageUrgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet;
  visit?: ClinicVisit;
  clinicVisit?: ClinicVisit;
  soapNote?: SOAPNote;
  draftSoap?: DraftSoapInput;
  medicalRecords?: MedicalRecord[];
  inpatient?: Inpatient;
  initialResult?: TriageUrgencyResult;
  onNavigateToClinic?: () => void;
  onApplyTriage?: (result: TriageUrgencyResult) => void;
}

export const TriageUrgencyModal: React.FC<TriageUrgencyModalProps> = ({
  isOpen,
  onClose,
  pet,
  visit,
  clinicVisit,
  soapNote,
  draftSoap,
  medicalRecords = [],
  inpatient,
  initialResult,
  onNavigateToClinic,
  onApplyTriage
}) => {
  const activeVisit = visit || clinicVisit;

  // Synthesize dynamic SOAP Note combining draft and saved data
  const effectiveSoapNote: SOAPNote | undefined = draftSoap
    ? {
        id: soapNote?.id || 'draft_soap',
        visitId: activeVisit?.id || 'draft_visit',
        petId: pet.id,
        doctorId: activeVisit?.doctorId || 'doc_current',
        doctorName: activeVisit?.doctorName || 'Dokter Jaga',
        date: new Date().toISOString().substring(0, 10),
        chiefComplaint: draftSoap.chiefComplaint || activeVisit?.complaint || soapNote?.chiefComplaint || '',
        historyOfPresentIllness: draftSoap.hpi || soapNote?.historyOfPresentIllness || '',
        temperatureC: draftSoap.tempC ?? soapNote?.temperatureC,
        heartRate: draftSoap.hr ?? soapNote?.heartRate,
        respiratoryRate: draftSoap.rr ?? soapNote?.respiratoryRate,
        spO2: draftSoap.spO2 ?? soapNote?.spO2,
        weightKg: draftSoap.weightKg ?? soapNote?.weightKg ?? pet.weightKg,
        physicalExamNotes: draftSoap.examNotes || soapNote?.physicalExamNotes || '',
        workingDiagnosis: draftSoap.diagnosis || soapNote?.workingDiagnosis || '',
        differentialDiagnosis: draftSoap.diffDiag || soapNote?.differentialDiagnosis || '',
        severityScore: draftSoap.severity || soapNote?.severityScore,
        medicationPlan: soapNote?.medicationPlan || '',
        prescribedDrugs: soapNote?.prescribedDrugs || [],
        investigationInstructions: soapNote?.investigationInstructions || '',
        patientEducation: soapNote?.patientEducation || '',
        isFinalized: false
      }
    : soapNote;

  const defaultCalculated = initialResult || computeClientTriageUrgency(
    pet,
    activeVisit,
    effectiveSoapNote,
    medicalRecords,
    inpatient
  );

  const [triageData, setTriageData] = useState<TriageUrgencyResult>(defaultCalculated);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showOverrideMenu, setShowOverrideMenu] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  // Auto run Gemini analysis if opened or when draft inputs change
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      // Re-compute baseline client rule engine immediately
      const baseline = computeClientTriageUrgency(
        pet,
        activeVisit,
        effectiveSoapNote,
        medicalRecords,
        inpatient
      );
      setTriageData(baseline);

      // Trigger Gemini AI in the background for deeper justification
      const runAiAnalysis = async () => {
        setIsLoadingAi(true);
        try {
          const aiResult = await analyzePetTriageWithGemini(
            pet,
            activeVisit,
            effectiveSoapNote,
            medicalRecords
          );
          if (isMounted) {
            setTriageData(aiResult);
          }
        } catch (err) {
          console.warn('Gemini Triage suggestion failed, fallback used:', err);
        } finally {
          if (isMounted) setIsLoadingAi(false);
        }
      };

      runAiAnalysis();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, pet.id, activeVisit?.id, draftSoap?.chiefComplaint, draftSoap?.tempC, draftSoap?.hr, draftSoap?.rr, draftSoap?.diagnosis]);

  if (!isOpen) return null;

  const handleRefreshGeminiAnalysis = async () => {
    setIsLoadingAi(true);
    try {
      const refreshed = await analyzePetTriageWithGemini(
        pet,
        activeVisit,
        effectiveSoapNote,
        medicalRecords
      );
      setTriageData(refreshed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleManualOverride = (level: TriageUrgencyLevel) => {
    let score = 15;
    let label = 'P4 - NON-URGENT / RUTIN';
    let colorClass = 'text-emerald-700 dark:text-emerald-300';
    let bgClass = 'bg-emerald-500/15';
    let borderClass = 'border-emerald-500/40';
    let badgeClass = 'bg-emerald-600 text-white border-emerald-700';
    let summary = 'Kondisi sehat & stabil. Layanan preventif rutin.';
    let rationale = 'Penyesuaian manual oleh dokter jaga / petugas triase: Pasien dikategorikan Non-Urgent.';

    if (level === 'P1') {
      score = 90;
      label = 'P1 - KRITIS / RESUSITASI';
      colorClass = 'text-rose-700 dark:text-rose-300';
      bgClass = 'bg-rose-500/15';
      borderClass = 'border-rose-500/40';
      badgeClass = 'bg-rose-600 text-white border-rose-700 shadow-rose-500/30';
      summary = 'Kondisi gawat darurat mengancam nyawa. Memerlukan penanganan seketika (<5 menit).';
      rationale = 'Penyesuaian manual: Dokter mengklasifikasikan sebagai P1 (Resusitasi/Gawat Darurat Segera).';
    } else if (level === 'P2') {
      score = 70;
      label = 'P2 - SANGAT MENDESAK';
      colorClass = 'text-amber-700 dark:text-amber-300';
      bgClass = 'bg-amber-500/15';
      borderClass = 'border-amber-500/40';
      badgeClass = 'bg-amber-600 text-white border-amber-700 shadow-amber-500/30';
      summary = 'Kondisi berpotensi memburuk cepat. Diperiksa dokter dalam <15-30 menit.';
      rationale = 'Penyesuaian manual: Dokter mengklasifikasikan sebagai P2 (Sangat Mendesak).';
    } else if (level === 'P3') {
      score = 45;
      label = 'P3 - SEMI-MENDESAK';
      colorClass = 'text-yellow-800 dark:text-yellow-200';
      bgClass = 'bg-yellow-500/15';
      borderClass = 'border-yellow-500/40';
      badgeClass = 'bg-yellow-500 text-slate-900 border-yellow-600';
      summary = 'Kondisi stabil dengan keluhan klinis ringan-sedang. Waktu tunggu 30-60 menit.';
      rationale = 'Penyesuaian manual: Dokter mengklasifikasikan sebagai P3 (Semi-Mendesak).';
    }

    setTriageData({
      ...triageData,
      level,
      label,
      severityScore: score,
      colorClass,
      bgClass,
      borderClass,
      badgeClass,
      summary,
      triageRationale: rationale,
      analyzedAt: new Date().toISOString(),
      source: 'clinical_rule_engine'
    });
    setShowOverrideMenu(false);
  };

  const handleApplyToEmrAndUrgency = () => {
    if (onApplyTriage) {
      onApplyTriage(triageData);
      setAppliedFeedback(true);
      setTimeout(() => {
        setAppliedFeedback(false);
        onClose();
      }, 700);
    } else {
      onClose();
    }
  };

  const getUrgencyConfig = (level: string) => {
    switch (level) {
      case 'P1':
        return {
          headerBg: 'bg-gradient-to-r from-rose-950 via-rose-900 to-[#1B2A45]',
          border: 'border-rose-500/50',
          accent: 'text-rose-400',
          badge: 'bg-rose-600 text-white',
          pulse: true,
          icon: ShieldAlert,
          title: 'PRIORITAS 1: RESUSITASI / KRITIS (EMERGENCY)',
          subtitle: 'Ancaman langsung terhadap integritas jalan napas, sirkulasi, atau status neurologis.',
          timeframe: 'SEGERA (< 5 Menit)',
          colorIndicator: 'bg-rose-500'
        };
      case 'P2':
        return {
          headerBg: 'bg-gradient-to-r from-amber-950 via-amber-900 to-[#1B2A45]',
          border: 'border-amber-500/50',
          accent: 'text-amber-400',
          badge: 'bg-amber-600 text-white',
          pulse: true,
          icon: AlertTriangle,
          title: 'PRIORITAS 2: SANGAT MENDESAK (URGENT)',
          subtitle: 'Kondisi klinis akut berpotensi memburuk cepat jika tidak ditangani segera.',
          timeframe: '< 15 - 30 Menit',
          colorIndicator: 'bg-amber-500'
        };
      case 'P3':
        return {
          headerBg: 'bg-gradient-to-r from-yellow-950 via-yellow-900 to-[#1B2A45]',
          border: 'border-yellow-500/50',
          accent: 'text-yellow-400',
          badge: 'bg-yellow-500 text-slate-900',
          pulse: false,
          icon: Clock,
          title: 'PRIORITAS 3: SEMI-MENDESAK (SEMI-URGENT)',
          subtitle: 'Kondisi stabil dengan gejala sub-akut tanpa ancaman kegawatdaruratan langsung.',
          timeframe: '30 - 60 Menit',
          colorIndicator: 'bg-yellow-400'
        };
      default:
        return {
          headerBg: 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-[#1B2A45]',
          border: 'border-emerald-500/50',
          accent: 'text-emerald-400',
          badge: 'bg-emerald-600 text-white',
          pulse: false,
          icon: CheckCircle2,
          title: 'PRIORITAS 4: NON-URGENT / RUTIN (ROUTINE)',
          subtitle: 'Pemeriksaan rutin terencana, tindakan preventif, vaksinasi berkala.',
          timeframe: 'Elektif (> 60 Menit)',
          colorIndicator: 'bg-emerald-500'
        };
    }
  };

  const config = getUrgencyConfig(triageData.level);
  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] dark:bg-[#15233B] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E1D6BE] dark:border-[#B8905A]/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Color-Coded Header Banner */}
        <div className={`${config.headerBg} p-5 text-white border-b ${config.border} relative shrink-0`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5 pr-8">
            <div className={`p-3 rounded-2xl bg-white/15 border border-white/20 ${config.accent} shrink-0 shadow-inner`}>
              <IconComponent className={`w-7 h-7 ${config.pulse ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase ${config.badge} shadow-xs`}>
                  {triageData.level} • {triageData.label.split('-')[1]?.trim() || triageData.label}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-[11px] font-bold">
                  Target Respon: {config.timeframe}
                </span>
                {triageData.source === 'ai_gemini' ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Analisis Gemini 3.7 AI
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-400/30 text-[10px] font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3 text-blue-300" /> Clinical Rule Engine (ECC)
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black font-display text-white mt-1.5">
                {config.title}
              </h3>
              <p className="text-xs text-white/80 mt-0.5">
                {config.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Patient Profile Quick Strip */}
        <div className="bg-[#F6F1E6] dark:bg-[#101A2C] px-5 py-3 border-b border-[#E1D6BE] dark:border-[#B8905A]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <img
              src={pet.photoUrl || 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200'}
              alt={pet.name}
              className="w-8 h-8 rounded-lg object-cover border border-[#E1D6BE]"
            />
            <div>
              <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9]">{pet.name}</span>
              <span className="text-[#6B6656] dark:text-[#EDE6D6]/70 ml-1">
                ({pet.species} • {pet.breed}) • Pemilik: {pet.customerName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#6B6656] dark:text-[#EDE6D6]/70">
              Berat: <strong className="text-[#1B2A45] dark:text-[#FFFDF9]">{effectiveSoapNote?.weightKg || pet.weightKg} kg</strong>
            </span>
            {pet.allergies && (
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                Alergi: {pet.allergies}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-[#22242B] dark:text-[#EDE6D6]">
          {/* AI Justification Card - Key User Requirement */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/30 dark:border-amber-500/40 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-500" /> Justifikasi & Rasional Prioritas AI (Clinical Justification)
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.badge}`}>
                Tingkat: {triageData.level}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#1B2A45] dark:text-[#FFFDF9] leading-relaxed">
              {triageData.triageRationale || 'Berdasarkan komparasi data EMR, tanda vital, dan pola keluhan utama, pasien dikategorikan dalam tingkat urgensi ini.'}
            </p>
            {draftSoap?.chiefComplaint && (
              <div className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70 bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-[#E1D6BE]/60">
                <strong>Catatan EMR Dianalisis:</strong> &quot;{draftSoap.chiefComplaint}&quot;
                {draftSoap.diagnosis && ` • Diagnosis: ${draftSoap.diagnosis}`}
                {draftSoap.tempC ? ` • Suhu: ${draftSoap.tempC}°C` : ''}
              </div>
            )}
          </div>

          {/* Severity Score Meter */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1B2A45] border border-[#E1D6BE] dark:border-[#B8905A]/30 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#B8905A]" /> Indeks Keparahan Gejala (Clinical Severity Score)
              </span>
              <span className="font-mono font-black text-sm text-[#1B2A45] dark:text-[#FFFDF9]">
                {triageData.severityScore} / 100
              </span>
            </div>
            {/* Visual Bar */}
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 flex">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  triageData.severityScore >= 75
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/50'
                    : triageData.severityScore >= 50
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/50'
                    : triageData.severityScore >= 30
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500'
                }`}
                style={{ width: `${triageData.severityScore}%` }}
              />
            </div>
            <p className="text-[11px] text-[#6B6656] dark:text-[#EDE6D6]/70 italic">
              {triageData.summary}
            </p>
          </div>

          {/* Symptom Triggers Detected from EMR */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#1B2A45] border border-[#E1D6BE] dark:border-[#B8905A]/30 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#B8905A]" /> Pemicu Gejala Terdeteksi dari Catatan EMR
              </h4>
              <button
                type="button"
                onClick={() => setShowOverrideMenu(!showOverrideMenu)}
                className="text-[10px] text-[#B8905A] hover:underline font-bold flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" /> Ubah Manual Prioritas
              </button>
            </div>

            {/* Manual Override Selection Pill Bar */}
            {showOverrideMenu && (
              <div className="p-2.5 rounded-lg bg-[#F6F1E6] dark:bg-[#101A2C] border border-[#B8905A]/40 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-[#1B2A45] dark:text-[#FFFDF9]">Pilih Level:</span>
                {(['P1', 'P2', 'P3', 'P4'] as TriageUrgencyLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleManualOverride(lvl)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                      triageData.level === lvl
                        ? 'bg-[#1B2A45] text-[#D9B98A] border-[#1B2A45]'
                        : 'bg-white text-[#1B2A45] border-[#E1D6BE] hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {triageData.symptomTriggers.map((trig, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
                    triageData.level === 'P1'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                      : triageData.level === 'P2'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : 'bg-[#F6F1E6] dark:bg-[#101A2C] text-[#1B2A45] dark:text-[#EDE6D6] border-[#E1D6BE]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {trig}
                </span>
              ))}
            </div>
          </div>

          {/* Vital Signs Grid if Available */}
          {triageData.vitalFlags.length > 0 && (
            <div className="p-4 rounded-xl bg-white dark:bg-[#1B2A45] border border-[#E1D6BE] dark:border-[#B8905A]/30 shadow-2xs space-y-2">
              <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-500" /> Parameter Tanda Vital & Ambang Batas
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {triageData.vitalFlags.map((v, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                      v.status === 'critical'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-100'
                        : v.status === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-100'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-100'
                    }`}
                  >
                    <span className="text-[10px] font-semibold opacity-80">{v.parameter}</span>
                    <span className="text-sm font-bold font-mono mt-0.5">{v.value}</span>
                    <span className="text-[9px] font-black uppercase mt-1">
                      {v.status === 'critical' ? '🔴 Kritis' : v.status === 'warning' ? '🟠 Waspada' : '🟢 Normal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Immediate Action Protocol */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] dark:bg-[#101A2C] border border-[#E1D6BE] dark:border-[#B8905A]/30 space-y-2">
            <h4 className="font-bold text-[#1B2A45] dark:text-[#FFFDF9] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Rekomendasi Protokol Penanganan Segera
            </h4>
            <ul className="space-y-1.5 pt-1">
              {triageData.recommendedActions.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-medium text-[#1B2A45] dark:text-[#FFFDF9]">{act}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions with Apply / Populate Urgency Button */}
        <div className="bg-[#F6F1E6] dark:bg-[#101A2C] px-5 py-3.5 border-t border-[#E1D6BE] dark:border-[#B8905A]/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefreshGeminiAnalysis}
            disabled={isLoadingAi}
            className="px-3.5 py-2 bg-white dark:bg-[#15233B] hover:bg-[#FAF7F2] text-[#1B2A45] dark:text-[#FFFDF9] border border-[#E1D6BE] dark:border-[#B8905A]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isLoadingAi ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Menganalisis Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Analisis Ulang dengan Gemini AI</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-[#15233B] text-[#6B6656] dark:text-[#EDE6D6] border border-[#E1D6BE] rounded-xl text-xs font-bold hover:bg-[#FAF7F2] transition-all cursor-pointer"
            >
              Tutup
            </button>

            {onApplyTriage && (
              <button
                type="button"
                onClick={handleApplyToEmrAndUrgency}
                disabled={appliedFeedback}
                className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {appliedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Tingkat Urgensi Diterapkan!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Adopsi Saran & Terapkan Urgensi</span>
                  </>
                )}
              </button>
            )}

            {onNavigateToClinic && !onApplyTriage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToClinic();
                }}
                className="px-4 py-2 bg-[#1B2A45] hover:bg-[#101A2C] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-amber-400" />
                <span>Buka EMR SOAP Pasien Ini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
