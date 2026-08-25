import React, { useState } from 'react';
import { Pet, ClinicVisit, SOAPNote, MedicalRecord, Inpatient, TriageUrgencyResult } from '../../types';
import { computeClientTriageUrgency } from '../../utils/aiTriageUrgency';
import { TriageUrgencyModal, DraftSoapInput } from './TriageUrgencyModal';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, Sparkles } from 'lucide-react';

interface TriageUrgencyBadgeProps {
  pet: Pet;
  visit?: ClinicVisit;
  clinicVisit?: ClinicVisit;
  soapNote?: SOAPNote;
  draftSoap?: DraftSoapInput;
  medicalRecords?: MedicalRecord[];
  inpatient?: Inpatient;
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnClick?: boolean;
  onNavigateToClinic?: () => void;
  onApplyTriage?: (result: TriageUrgencyResult) => void;
  onClick?: () => void;
  className?: string;
}

export const TriageUrgencyBadge: React.FC<TriageUrgencyBadgeProps> = ({
  pet,
  visit,
  clinicVisit,
  soapNote,
  draftSoap,
  medicalRecords = [],
  inpatient,
  size = 'md',
  showDetailsOnClick = true,
  onNavigateToClinic,
  onApplyTriage,
  onClick,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const activeVisit = visit || clinicVisit;

  // Synthesize dynamic SOAP Note combining draft and saved data if draft exists
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

  // Compute triage urgency
  const result: TriageUrgencyResult = computeClientTriageUrgency(
    pet,
    activeVisit,
    effectiveSoapNote,
    medicalRecords,
    inpatient
  );

  const getBadgeStyle = () => {
    switch (result.level) {
      case 'P1':
        return {
          container: 'bg-rose-500/15 border-rose-500/60 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25',
          dot: 'bg-rose-500 animate-ping',
          solidDot: 'bg-rose-600',
          icon: ShieldAlert,
          iconColor: 'text-rose-600 dark:text-rose-400',
          pulseBadge: true,
          label: 'P1 - Kritis'
        };
      case 'P2':
        return {
          container: 'bg-amber-500/15 border-amber-500/60 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25',
          dot: 'bg-amber-500 animate-ping',
          solidDot: 'bg-amber-600',
          icon: AlertTriangle,
          iconColor: 'text-amber-600 dark:text-amber-400',
          pulseBadge: true,
          label: 'P2 - Mendesak'
        };
      case 'P3':
        return {
          container: 'bg-yellow-500/15 border-yellow-500/60 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-500/25',
          dot: '',
          solidDot: 'bg-yellow-500',
          icon: Clock,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          pulseBadge: false,
          label: 'P3 - Semi-Mendesak'
        };
      default:
        return {
          container: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25',
          dot: '',
          solidDot: 'bg-emerald-500',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          pulseBadge: false,
          label: 'P4 - Rutin'
        };
    }
  };

  const style = getBadgeStyle();
  const Icon = style.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-xs font-bold gap-2'
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      return;
    }
    if (showDetailsOnClick) {
      e.stopPropagation();
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={`Triage AI: ${result.label} (Score: ${result.severityScore}/100) - ${result.triageRationale || 'Klik untuk lihat analisis EMR & Saran Triase AI'}`}
        className={`inline-flex items-center rounded-full font-bold border transition-all cursor-pointer shadow-2xs ${sizeClasses[size]} ${style.container} ${className}`}
      >
        <span className="relative flex h-2 w-2">
          {style.pulseBadge && (
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.solidDot}`} />
        </span>

        <Icon className={`w-3.5 h-3.5 ${style.iconColor} shrink-0`} />

        <span className="truncate">{style.label}</span>

        <span className="font-mono text-[10px] opacity-75 border-l border-current/30 pl-1 ml-0.5">
          {result.severityScore}
        </span>

        <Sparkles className="w-2.5 h-2.5 opacity-60 text-amber-500 ml-0.5" />
      </button>

      {/* Detail Modal */}
      {isModalOpen && (
        <TriageUrgencyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pet={pet}
          visit={activeVisit}
          soapNote={soapNote}
          draftSoap={draftSoap}
          medicalRecords={medicalRecords}
          inpatient={inpatient}
          initialResult={result}
          onNavigateToClinic={onNavigateToClinic}
          onApplyTriage={onApplyTriage}
        />
      )}
    </>
  );
};
