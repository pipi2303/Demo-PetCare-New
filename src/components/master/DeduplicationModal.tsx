import React, { useState, useMemo } from 'react';
import {
  Customer,
  Pet,
  ClinicVisit,
  SOAPNote,
  MedicalRecord,
  VacHistory,
  LabTest,
  Invoice,
} from '../../types';
import {
  GitMerge,
  Users,
  Dog,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  FileText,
  Phone,
  Mail,
  Award,
  Stethoscope,
  Syringe,
  Microscope,
  X,
  ArrowRight,
  Check,
  PlusCircle,
} from 'lucide-react';

export interface DuplicateCustomerGroup {
  id: string;
  reason: string;
  confidence: number;
  records: Customer[];
  recommendedPrimaryId: string;
}

export interface DuplicatePetGroup {
  id: string;
  reason: string;
  confidence: number;
  records: Pet[];
  recommendedPrimaryId: string;
}

export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('8')) {
    digits = '0' + digits;
  }
  return digits;
}

export function normalizePersonName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(bpk|bapak|bp|ibu|bu|ny|tn|sdr|sdri|kak|dr|drh|ir|hj|h)\b\.?/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePetName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(jr|sr|ii|iii|anak|kucing|anjing|pet|duplikat|copy)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export function detectDuplicateCustomers(customers: Customer[]): DuplicateCustomerGroup[] {
  const n = customers.length;
  if (n < 2) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  const reasons = new Map<string, { reason: string; confidence: number }>();

  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  const union = (i: number, j: number, reason: string, confidence: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) {
      parent[rj] = ri;
    }
    const key = `${Math.min(ri, rj)}`;
    const prev = reasons.get(key);
    if (!prev || confidence > prev.confidence) {
      reasons.set(key, { reason, confidence });
    }
  };

  for (let i = 0; i < n; i++) {
    const ci = customers[i];
    const phoneI = normalizePhone(ci.phone);
    const nameI = normalizePersonName(ci.name);
    const emailI = (ci.email || '').trim().toLowerCase();
    const nikI = (ci.nik || '').replace(/\D/g, '');

    for (let j = i + 1; j < n; j++) {
      const cj = customers[j];
      const phoneJ = normalizePhone(cj.phone);
      const nameJ = normalizePersonName(cj.name);
      const emailJ = (cj.email || '').trim().toLowerCase();
      const nikJ = (cj.nik || '').replace(/\D/g, '');

      if (nikI && nikJ && nikI.length >= 8 && nikI === nikJ) {
        union(i, j, `NIK Identik (${nikI})`, 99);
        continue;
      }
      if (phoneI && phoneJ && phoneI.length >= 8 && phoneI === phoneJ) {
        union(i, j, `Nomor WhatsApp/Telepon Identik (${phoneI})`, 98);
        continue;
      }
      if (emailI && emailJ && emailI === emailJ) {
        union(i, j, `Alamat Email Identik (${emailI})`, 95);
        continue;
      }
      if (nameI && nameJ && nameI.length >= 4 && nameJ.length >= 4) {
        const sim = stringSimilarity(nameI, nameJ);
        if (sim >= 0.88) {
          union(i, j, `Kemiripan Nama Pelanggan (${Math.round(sim * 100)}%)`, Math.round(sim * 95));
        }
      }
    }
  }

  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = clusters.get(root) || [];
    list.push(i);
    clusters.set(root, list);
  }

  const groups: DuplicateCustomerGroup[] = [];
  clusters.forEach((indices, rootIdx) => {
    if (indices.length < 2) return;
    const records = indices.map((idx) => customers[idx]);
    // Recommend record with highest completeness + totalSpent + loyaltyPoints
    const scored = [...records].sort((a, b) => {
      const scoreA =
        (a.totalSpent || 0) +
        (a.loyaltyPoints || 0) * 100 +
        (a.petCount || 0) * 50000 +
        (a.email ? 10000 : 0) +
        (a.address ? 10000 : 0) +
        (a.nik ? 20000 : 0);
      const scoreB =
        (b.totalSpent || 0) +
        (b.loyaltyPoints || 0) * 100 +
        (b.petCount || 0) * 50000 +
        (b.email ? 10000 : 0) +
        (b.address ? 10000 : 0) +
        (b.nik ? 20000 : 0);
      return scoreB - scoreA;
    });

    const meta = reasons.get(String(rootIdx)) || {
      reason: 'Kemiripan Profil & Kontak Pelanggan',
      confidence: 92,
    };

    groups.push({
      id: `dup-cust-${records.map((r) => r.id).join('-')}`,
      reason: meta.reason,
      confidence: meta.confidence,
      records,
      recommendedPrimaryId: scored[0].id,
    });
  });

  return groups.sort((a, b) => b.confidence - a.confidence);
}

export function detectDuplicatePets(pets: Pet[], customers: Customer[]): DuplicatePetGroup[] {
  const n = pets.length;
  if (n < 2) return [];

  const custPhoneById = new Map<string, string>();
  customers.forEach((c) => custPhoneById.set(c.id, normalizePhone(c.phone)));

  const parent = Array.from({ length: n }, (_, i) => i);
  const reasons = new Map<string, { reason: string; confidence: number }>();

  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };

  const union = (i: number, j: number, reason: string, confidence: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) {
      parent[rj] = ri;
    }
    const key = `${Math.min(ri, rj)}`;
    const prev = reasons.get(key);
    if (!prev || confidence > prev.confidence) {
      reasons.set(key, { reason, confidence });
    }
  };

  for (let i = 0; i < n; i++) {
    const pi = pets[i];
    const chipI = (pi.microchipNo || '').trim().toUpperCase();
    const nameI = normalizePetName(pi.name);
    const ownerNameI = normalizePersonName(pi.customerName);
    const ownerPhoneI = custPhoneById.get(pi.customerId) || '';

    for (let j = i + 1; j < n; j++) {
      const pj = pets[j];
      const chipJ = (pj.microchipNo || '').trim().toUpperCase();
      const nameJ = normalizePetName(pj.name);
      const ownerNameJ = normalizePersonName(pj.customerName);
      const ownerPhoneJ = custPhoneById.get(pj.customerId) || '';

      if (chipI && chipJ && chipI.length >= 5 && chipI === chipJ) {
        union(i, j, `Nomor Microchip Identik (${chipI})`, 99);
        continue;
      }

      const sameOwner =
        pi.customerId === pj.customerId ||
        (ownerPhoneI && ownerPhoneJ && ownerPhoneI === ownerPhoneJ) ||
        (ownerNameI && ownerNameJ && stringSimilarity(ownerNameI, ownerNameJ) >= 0.88);

      if (sameOwner && pi.species === pj.species && nameI && nameJ) {
        const nameSim = stringSimilarity(nameI, nameJ);
        if (nameSim === 1) {
          union(
            i,
            j,
            `Nama Pasien "${pi.name}" & Spesies Sama pada Pemilik "${pi.customerName}"`,
            97
          );
        } else if (nameSim >= 0.8) {
          union(
            i,
            j,
            `Kemiripan Nama Pasien ("${pi.name}" vs "${pj.name}") pada Pemilik Sama`,
            90
          );
        }
      }
    }
  }

  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = clusters.get(root) || [];
    list.push(i);
    clusters.set(root, list);
  }

  const groups: DuplicatePetGroup[] = [];
  clusters.forEach((indices, rootIdx) => {
    if (indices.length < 2) return;
    const records = indices.map((idx) => pets[idx]);
    const scored = [...records].sort((a, b) => {
      const scoreA =
        (a.microchipNo ? 50 : 0) +
        (a.allergies && a.allergies.toLowerCase() !== 'tidak ada' ? 40 : 0) +
        (a.birthDate ? 20 : 0) +
        (a.weightKg > 0 ? 15 : 0) +
        (a.notes ? 10 : 0);
      const scoreB =
        (b.microchipNo ? 50 : 0) +
        (b.allergies && b.allergies.toLowerCase() !== 'tidak ada' ? 40 : 0) +
        (b.birthDate ? 20 : 0) +
        (b.weightKg > 0 ? 15 : 0) +
        (b.notes ? 10 : 0);
      return scoreB - scoreA;
    });

    const meta = reasons.get(String(rootIdx)) || {
      reason: 'Kemiripan Identitas Pasien & Pemilik',
      confidence: 92,
    };

    groups.push({
      id: `dup-pet-${records.map((r) => r.id).join('-')}`,
      reason: meta.reason,
      confidence: meta.confidence,
      records,
      recommendedPrimaryId: scored[0].id,
    });
  });

  return groups.sort((a, b) => b.confidence - a.confidence);
}

interface DeduplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'customers' | 'pets';
  customers: Customer[];
  pets: Pet[];
  clinicVisits: ClinicVisit[];
  soapNotes: SOAPNote[];
  medicalRecords: MedicalRecord[];
  vacHistories: VacHistory[];
  labTests: LabTest[];
  invoices: Invoice[];
  onMergeCustomers: (primaryId: string, duplicateIds: string[]) => Promise<Customer>;
  onMergePets: (primaryId: string, duplicateIds: string[]) => Promise<Pet>;
  onCreateSampleDuplicates: () => Promise<void>;
}

export const DeduplicationModal: React.FC<DeduplicationModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'customers',
  customers,
  pets,
  clinicVisits,
  soapNotes,
  medicalRecords,
  vacHistories,
  labTests,
  invoices,
  onMergeCustomers,
  onMergePets,
  onCreateSampleDuplicates,
}) => {
  const [activeMode, setActiveMode] = useState<'customers' | 'pets'>(initialMode);
  const [selectedPrimaryByGroup, setSelectedPrimaryByGroup] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedHistoryCount, setMergedHistoryCount] = useState(0);

  React.useEffect(() => {
    if (isOpen && initialMode) {
      setActiveMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const customerGroups = useMemo(() => detectDuplicateCustomers(customers), [customers]);
  const petGroups = useMemo(() => detectDuplicatePets(pets, customers), [pets, customers]);

  if (!isOpen) return null;

  const getPrimaryForGroup = (groupId: string, defaultId: string) =>
    selectedPrimaryByGroup[groupId] || defaultId;

  const getCustomerStats = (customerId: string) => {
    const ownedPets = pets.filter((p) => p.customerId === customerId).length;
    const visits = clinicVisits.filter((v) => v.customerId === customerId).length;
    const invs = invoices.filter((inv) => inv.customerId === customerId).length;
    return { ownedPets, visits, invs };
  };

  const getPetClinicalStats = (petId: string) => {
    const visits = clinicVisits.filter((v) => v.petId === petId).length;
    const soaps = soapNotes.filter((s) => s.petId === petId).length;
    const emrs = medicalRecords.filter((m) => m.petId === petId).length;
    const vacs = vacHistories.filter((vh) => vh.petId === petId).length;
    const labs = labTests.filter((lt) => lt.petId === petId).length;
    return {
      visits,
      soaps,
      emrs,
      vacs,
      labs,
      totalRecords: visits + soaps + emrs + vacs + labs,
    };
  };

  const handleMergeCustomerGroup = async (group: DuplicateCustomerGroup) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const primaryId = getPrimaryForGroup(group.id, group.recommendedPrimaryId);
      const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== primaryId);
      await onMergeCustomers(primaryId, duplicateIds);
      setMergedHistoryCount((c) => c + duplicateIds.length);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergePetGroup = async (group: DuplicatePetGroup) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const primaryId = getPrimaryForGroup(group.id, group.recommendedPrimaryId);
      const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== primaryId);
      await onMergePets(primaryId, duplicateIds);
      setMergedHistoryCount((c) => c + duplicateIds.length);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeAllInActiveTab = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (activeMode === 'customers') {
        for (const group of customerGroups) {
          const primaryId = getPrimaryForGroup(group.id, group.recommendedPrimaryId);
          const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== primaryId);
          await onMergeCustomers(primaryId, duplicateIds);
          setMergedHistoryCount((c) => c + duplicateIds.length);
        }
      } else {
        for (const group of petGroups) {
          const primaryId = getPrimaryForGroup(group.id, group.recommendedPrimaryId);
          const duplicateIds = group.records.map((r) => r.id).filter((id) => id !== primaryId);
          await onMergePets(primaryId, duplicateIds);
          setMergedHistoryCount((c) => c + duplicateIds.length);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const combineAllergiesPreview = (records: Pet[]) => {
    const ignore = new Set(['tidak ada', 'none', '-', 'nihil']);
    const seen = new Set<string>();
    const out: string[] = [];
    records.forEach((r) => {
      if (!r.allergies) return;
      r.allergies.split(/[,;]+/).forEach((part) => {
        const clean = part.trim();
        if (!clean) return;
        const lower = clean.toLowerCase();
        if (ignore.has(lower) || seen.has(lower)) return;
        seen.add(lower);
        out.push(clean);
      });
    });
    return out.length > 0 ? out.join(', ') : 'Tidak ada alergi tercatat';
  };

  const activeGroupsCount = activeMode === 'customers' ? customerGroups.length : petGroups.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#FFFDF9] border border-[#E1D6BE] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Dark Navy Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#1B2A45] via-[#16233B] to-[#101A2C] border-b border-[#B8905A]/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B8905A] to-[#9E7848] text-[#101A2C] flex items-center justify-center shadow-xs shrink-0">
              <GitMerge className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-[#FFFDF9]">
                Pusat Pembersihan Data Duplikat & Konsolidasi Rekam Medis
              </h3>
              <p className="text-xs text-[#EDE6D6]/80">
                Deteksi cerdas profil ganda, satukan riwayat SOAP, EMR, Vaksinasi, Lab, Alergi Obat & Poin Loyalitas ke satu rekam utama.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#101A2C] hover:bg-rose-950/70 text-[#EDE6D6] hover:text-rose-200 border border-white/15 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Toolbar: Mode Switcher + Batch Actions */}
        <div className="px-5 py-3 bg-[#F6F1E6] border-b border-[#E1D6BE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('customers')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === 'customers'
                  ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                  : 'bg-[#FFFDF9] text-[#1B2A45] border border-[#E1D6BE] hover:bg-[#EFE8D8]'
              }`}
            >
              <Users className="w-4 h-4 text-[#B8905A]" />
              <span>Duplikat Pelanggan</span>
              <span
                className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] ${
                  customerGroups.length > 0
                    ? 'bg-amber-500/20 text-amber-400 font-extrabold'
                    : 'bg-emerald-500/20 text-emerald-500'
                }`}
              >
                {customerGroups.length} Grup
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('pets')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === 'pets'
                  ? 'bg-[#1B2A45] text-[#FFFDF9] shadow-2xs'
                  : 'bg-[#FFFDF9] text-[#1B2A45] border border-[#E1D6BE] hover:bg-[#EFE8D8]'
              }`}
            >
              <Dog className="w-4 h-4 text-[#B8905A]" />
              <span>Duplikat Pasien Hewan</span>
              <span
                className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] ${
                  petGroups.length > 0
                    ? 'bg-rose-500/20 text-rose-400 font-extrabold'
                    : 'bg-emerald-500/20 text-emerald-500'
                }`}
              >
                {petGroups.length} Grup
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isProcessing}
              onClick={async () => {
                setIsProcessing(true);
                try {
                  await onCreateSampleDuplicates();
                } finally {
                  setIsProcessing(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE8D8] text-[#1B2A45] border border-[#E1D6BE] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Tambahkan sampel data pelanggan & pasien hewan duplikat untuk menguji fitur penggabungan"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#B8905A]" />
              <span>Simulasi Data Duplikat</span>
            </button>

            {activeGroupsCount > 0 && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleMergeAllInActiveTab}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#B8905A] to-[#9E7848] hover:brightness-105 text-[#101A2C] text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {isProcessing
                    ? 'Menggabungkan...'
                    : `Gabungkan Semua Otomatis (${activeGroupsCount} Grup)`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {mergedHistoryCount > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Berhasil membersihkan dan mengonsolidasikan <strong>{mergedHistoryCount}</strong> entri duplikat pada sesi ini. Seluruh riwayat medis telah dipindahkan ke rekam utama.
                </span>
              </div>
            </div>
          )}

          {/* CUSTOMERS DEDUPLICATION VIEW */}
          {activeMode === 'customers' && (
            <>
              {customerGroups.length === 0 ? (
                <div className="bg-[#FAF7F0] border border-[#E1D6BE] rounded-xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-[#1B2A45] font-display">
                      Basis Data Pelanggan Bersih (0 Duplikat Terdeteksi)
                    </h4>
                    <p className="text-xs text-[#6B6656]">
                      Seluruh {customers.length} profil pemilik hewan memiliki nomor telepon WhatsApp, NIK, dan identitas yang unik.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await onCreateSampleDuplicates();
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D9B98A]" />
                      <span>Buat Simulasi Duplikat untuk Uji Coba</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerGroups.map((group, idx) => {
                    const primaryId = getPrimaryForGroup(group.id, group.recommendedPrimaryId);
                    const primaryRecord =
                      group.records.find((r) => r.id === primaryId) || group.records[0];
                    const totalPoints = group.records.reduce(
                      (s, r) => s + (r.loyaltyPoints || 0),
                      0
                    );
                    const totalSpent = group.records.reduce(
                      (s, r) => s + (r.totalSpent || 0),
                      0
                    );
                    const totalOwnedPets = pets.filter((p) =>
                      group.records.some((r) => r.id === p.customerId)
                    ).length;

                    return (
                      <div
                        key={group.id}
                        className="bg-white rounded-xl border border-[#E1D6BE] shadow-2xs overflow-hidden"
                      >
                        {/* Group Header */}
                        <div className="px-4 py-2.5 bg-[#F6F1E6] border-b border-[#E1D6BE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#1B2A45] text-[#D9B98A] font-mono text-[11px] font-bold">
                              Grup #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              {group.reason}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800 border border-amber-500/30 text-[10px] font-bold">
                              Skor Kemiripan {group.confidence}%
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleMergeCustomerGroup(group)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <GitMerge className="w-3.5 h-3.5 text-[#D9B98A]" />
                            <span>Gabungkan {group.records.length} Profil Ini</span>
                          </button>
                        </div>

                        {/* Candidate Cards */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.records.map((cust) => {
                            const isPrimary = cust.id === primaryId;
                            const st = getCustomerStats(cust.id);
                            return (
                              <div
                                key={cust.id}
                                onClick={() =>
                                  setSelectedPrimaryByGroup((prev) => ({
                                    ...prev,
                                    [group.id]: cust.id,
                                  }))
                                }
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                                  isPrimary
                                    ? 'bg-[#FAF7F0] border-[#B8905A] ring-2 ring-[#B8905A]/30'
                                    : 'bg-white border-[#E1D6BE] hover:border-[#B8905A]/60 opacity-85'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                        isPrimary
                                          ? 'bg-[#1B2A45] text-[#D9B98A]'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {isPrimary ? (
                                        <>
                                          <Check className="w-3 h-3" /> REKAM UTAMA (MASTER)
                                        </>
                                      ) : (
                                        'DUPLIKAT (AKAN DIGABUNG)'
                                      )}
                                    </span>
                                    <span className="text-[11px] font-mono text-[#6B6656]">
                                      Terdaftar: {cust.createdAt}
                                    </span>
                                  </div>

                                  <div className="flex items-baseline justify-between gap-2">
                                    <h5 className="font-bold text-sm text-[#1B2A45]">{cust.name}</h5>
                                    <span className="text-[11px] font-bold text-[#B8905A]">
                                      Tier {cust.membershipTier}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#6B6656]">
                                    <span className="flex items-center gap-1 truncate">
                                      <Phone className="w-3 h-3 text-[#B8905A] shrink-0" />
                                      {cust.phone}
                                    </span>
                                    <span className="flex items-center gap-1 truncate">
                                      <Mail className="w-3 h-3 text-[#B8905A] shrink-0" />
                                      {cust.email || '-'}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-[#E1D6BE]/70 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-3 text-[#1B2A45] font-medium">
                                    <span>
                                      <strong>{st.ownedPets}</strong> Hewan
                                    </span>
                                    <span>
                                      <strong>{st.visits}</strong> Kunjungan
                                    </span>
                                    <span>
                                      <strong>{st.invs}</strong> Invoice
                                    </span>
                                  </div>
                                  <span className="font-mono font-bold text-emerald-700">
                                    {cust.loyaltyPoints} Poin
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Consolidated Preview Footer */}
                        <div className="px-4 py-2.5 bg-[#1B2A45]/5 border-t border-[#E1D6BE] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-[#1B2A45]">
                            <ArrowRight className="w-4 h-4 text-[#B8905A]" />
                            <span>
                              Hasil Konsolidasi ke <strong>{primaryRecord.name}</strong>:
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap font-semibold text-[#1B2A45]">
                            <span className="flex items-center gap-1">
                              <Dog className="w-3.5 h-3.5 text-[#B8905A]" />
                              {totalOwnedPets} Pasien Hewan Terhubung
                            </span>
                            <span className="flex items-center gap-1 text-emerald-700">
                              <Award className="w-3.5 h-3.5" />
                              Total {totalPoints} Poin Loyalitas
                            </span>
                            <span className="font-mono text-[#1B2A45]">
                              Akumulasi Rp {totalSpent.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* PETS DEDUPLICATION VIEW */}
          {activeMode === 'pets' && (
            <>
              {petGroups.length === 0 ? (
                <div className="bg-[#FAF7F0] border border-[#E1D6BE] rounded-xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-[#1B2A45] font-display">
                      Data Pasien Hewan & Rekam Medis Bersih (0 Duplikat)
                    </h4>
                    <p className="text-xs text-[#6B6656]">
                      Seluruh {pets.length} pasien hewan memiliki identitas microchip dan profil rekam medis yang tunggal dan akurat.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={async () => {
                        setIsProcessing(true);
                        try {
                          await onCreateSampleDuplicates();
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D9B98A]" />
                      <span>Buat Simulasi Duplikat untuk Uji Coba</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {petGroups.map((group, idx) => {
                    const primaryId = getPrimaryForGroup(group.id, group.recommendedPrimaryId);
                    const primaryPet =
                      group.records.find((r) => r.id === primaryId) || group.records[0];
                    const mergedAllergies = combineAllergiesPreview(group.records);
                    const totalClinicalRecords = group.records.reduce(
                      (sum, r) => sum + getPetClinicalStats(r.id).totalRecords,
                      0
                    );

                    return (
                      <div
                        key={group.id}
                        className="bg-white rounded-xl border border-[#E1D6BE] shadow-2xs overflow-hidden"
                      >
                        {/* Group Header */}
                        <div className="px-4 py-2.5 bg-[#F6F1E6] border-b border-[#E1D6BE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-[#1B2A45] text-[#D9B98A] font-mono text-[11px] font-bold">
                              Pasien #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-[#1B2A45] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              {group.reason}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-800 border border-rose-500/30 text-[10px] font-bold">
                              Akurasi Deteksi {group.confidence}%
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleMergePetGroup(group)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <GitMerge className="w-3.5 h-3.5 text-[#D9B98A]" />
                            <span>Satukan Rekam Medis ({group.records.length} Pasien)</span>
                          </button>
                        </div>

                        {/* Candidate Cards */}
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.records.map((pet) => {
                            const isPrimary = pet.id === primaryId;
                            const st = getPetClinicalStats(pet.id);
                            const hasAllergy =
                              pet.allergies &&
                              !['tidak ada', 'none', '-'].includes(pet.allergies.toLowerCase());

                            return (
                              <div
                                key={pet.id}
                                onClick={() =>
                                  setSelectedPrimaryByGroup((prev) => ({
                                    ...prev,
                                    [group.id]: pet.id,
                                  }))
                                }
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                                  isPrimary
                                    ? 'bg-[#FAF7F0] border-[#B8905A] ring-2 ring-[#B8905A]/30'
                                    : 'bg-white border-[#E1D6BE] hover:border-[#B8905A]/60 opacity-85'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                        isPrimary
                                          ? 'bg-[#1B2A45] text-[#D9B98A]'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {isPrimary ? (
                                        <>
                                          <Check className="w-3 h-3" /> REKAM MEDIS UTAMA
                                        </>
                                      ) : (
                                        'REKAM DUPLIKAT (DIGABUNG)'
                                      )}
                                    </span>
                                    <span className="text-[11px] font-mono text-[#6B6656]">
                                      Chip: {pet.microchipNo || 'Belum Ada'}
                                    </span>
                                  </div>

                                  <div className="flex items-baseline justify-between gap-2">
                                    <h5 className="font-bold text-sm text-[#1B2A45]">
                                      {pet.name}{' '}
                                      <span className="font-normal text-xs text-[#6B6656]">
                                        ({pet.species} • {pet.breed || '-'})
                                      </span>
                                    </h5>
                                    <span className="text-[11px] font-semibold text-[#1B2A45]">
                                      {pet.weightKg} Kg
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-[#6B6656]">
                                    Pemilik: <strong className="text-[#1B2A45]">{pet.customerName}</strong> • Lahir:{' '}
                                    {pet.birthDate || '-'}
                                  </p>

                                  <div
                                    className={`px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 border ${
                                      hasAllergy
                                        ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                                        : 'bg-[#F6F1E6] border-[#E1D6BE] text-[#6B6656]'
                                    }`}
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">
                                      Alergi: {pet.allergies || 'Tidak ada'}
                                    </span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-[#E1D6BE]/70 flex items-center justify-between text-[11px] text-[#1B2A45]">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Stethoscope className="w-3 h-3 text-[#B8905A]" />
                                      <strong>{st.visits + st.soaps}</strong> SOAP/Kunjungan
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-3 h-3 text-[#B8905A]" />
                                      <strong>{st.emrs}</strong> EMR
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Syringe className="w-3 h-3 text-[#B8905A]" />
                                      <strong>{st.vacs}</strong> Vaksin
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Microscope className="w-3 h-3 text-[#B8905A]" />
                                      <strong>{st.labs}</strong> Lab
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Consolidated Clinical Preview Footer */}
                        <div className="px-4 py-2.5 bg-[#1B2A45]/5 border-t border-[#E1D6BE] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 text-[#1B2A45]">
                            <ArrowRight className="w-4 h-4 text-[#B8905A]" />
                            <span>
                              Rekam Medis Terpadu pada <strong>{primaryPet.name}</strong>:
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap font-semibold">
                            <span className="text-rose-700 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Alergi Gabungan: {mergedAllergies}
                            </span>
                            <span className="text-[#1B2A45]">
                              • Total {totalClinicalRecords} Riwayat Klinis Disatukan
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#F6F1E6] border-t border-[#E1D6BE] flex items-center justify-between gap-3 shrink-0 text-xs">
          <span className="text-[#6B6656]">
            Tip: Klik salah satu kartu pada grup duplikat untuk mengganti pilihan <strong>Rekam Utama (Master)</strong> sebelum penggabungan.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1B2A45] hover:bg-[#101A2C] text-[#FFFDF9] font-bold cursor-pointer transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
