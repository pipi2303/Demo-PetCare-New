import { Pet, ClinicVisit, SOAPNote, MedicalRecord, Inpatient, TriageUrgencyResult, TriageUrgencyLevel } from '../types';
import { authHeaders } from './authToken';

/**
 * Intelligent Clinical Triage Engine for Veterinary Medicine
 * Implements standard Veterinary Triage List (VTL) & Manchester Triage System (MTS) adaptation for small animals.
 */

export function computeClientTriageUrgency(
  pet: Pet,
  visit?: ClinicVisit,
  soapNote?: SOAPNote,
  medicalRecords: MedicalRecord[] = [],
  inpatient?: Inpatient
): TriageUrgencyResult {
  const triggers: string[] = [];
  const vitalFlags: TriageUrgencyResult['vitalFlags'] = [];
  const recommendedActions: string[] = [];
  let score = 15; // Baseline healthy score (0-100)

  const complaint = (visit?.complaint || soapNote?.chiefComplaint || pet.allergies || '').toLowerCase();
  const hpi = (soapNote?.historyOfPresentIllness || '').toLowerCase();
  const examNotes = (soapNote?.physicalExamNotes || '').toLowerCase();
  const workingDiag = (soapNote?.workingDiagnosis || '').toLowerCase();
  const allText = `${complaint} ${hpi} ${examNotes} ${workingDiag} ${(pet.notes || '').toLowerCase()}`;

  // 1. Inpatient Status Check
  if (inpatient) {
    if (inpatient.status === 'Kritis') {
      score = Math.max(score, 92);
      triggers.push('Pasien Rawat Inap Kritis (Intensive Care)');
      recommendedActions.push('Monitoring tanda vital q1h (setiap 1 jam) & jalur IV aktif');
    } else if (inpatient.status === 'Stabil') {
      score = Math.max(score, 45);
    }
  }

  // 2. Vital Signs Evaluation (if recorded in SOAP)
  if (soapNote) {
    const isCat = pet.species === 'Kucing';
    const temp = soapNote.temperatureC;
    const hr = soapNote.heartRate;
    const rr = soapNote.respiratoryRate;
    const spo2 = soapNote.spO2;

    if (temp) {
      if (temp >= 40.5) {
        score += 35;
        triggers.push(`Hipertermia / Demam Ekstrem (${temp}°C)`);
        vitalFlags.push({ parameter: 'Suhu Tubuh', value: `${temp}°C`, status: 'critical' });
        recommendedActions.push('Active cooling & fluid therapy prevent shock');
      } else if (temp <= 36.0) {
        score += 40;
        triggers.push(`Hipotermia Kritis (<36.0°C / Syok: ${temp}°C)`);
        vitalFlags.push({ parameter: 'Suhu Tubuh', value: `${temp}°C`, status: 'critical' });
        recommendedActions.push('Penghangat eksternal (heating pad/lampu) & resusitasi');
      } else if (temp > 39.5) {
        score += 20;
        triggers.push(`Demam Febris (${temp}°C)`);
        vitalFlags.push({ parameter: 'Suhu Tubuh', value: `${temp}°C`, status: 'warning' });
      } else {
        vitalFlags.push({ parameter: 'Suhu Tubuh', value: `${temp}°C`, status: 'normal' });
      }
    }

    if (hr) {
      const isCriticalHr = isCat ? (hr < 100 || hr > 240) : (hr < 50 || hr > 190);
      const isWarningHr = isCat ? (hr < 140 || hr > 200) : (hr < 60 || hr > 160);
      if (isCriticalHr) {
        score += 35;
        triggers.push(`Aritmia / Heart Rate Kritis (${hr} bpm)`);
        vitalFlags.push({ parameter: 'Denyut Jantung', value: `${hr} bpm`, status: 'critical' });
        recommendedActions.push('EKG monitor & evaluasi perfusi / CRT');
      } else if (isWarningHr) {
        score += 15;
        vitalFlags.push({ parameter: 'Denyut Jantung', value: `${hr} bpm`, status: 'warning' });
      } else {
        vitalFlags.push({ parameter: 'Denyut Jantung', value: `${hr} bpm`, status: 'normal' });
      }
    }

    if (rr) {
      if (rr > 60 || rr < 12) {
        score += 35;
        triggers.push(`Dispnea / Laju Napas Kritis (${rr}x/menit)`);
        vitalFlags.push({ parameter: 'Laju Napas (RR)', value: `${rr}x/m`, status: 'critical' });
        recommendedActions.push('Oksigenasi darurat via cage/mask & posisikan sternal');
      } else if (rr > 40) {
        score += 15;
        vitalFlags.push({ parameter: 'Laju Napas (RR)', value: `${rr}x/m`, status: 'warning' });
      } else {
        vitalFlags.push({ parameter: 'Laju Napas (RR)', value: `${rr}x/m`, status: 'normal' });
      }
    }

    if (spo2 && spo2 < 92) {
      score += 40;
      triggers.push(`Hipoksemia Berat (SpO2 ${spo2}%)`);
      vitalFlags.push({ parameter: 'Saturasi O2', value: `${spo2}%`, status: 'critical' });
      recommendedActions.push('Segera pasang kanul O2 / inkubator oksigen');
    }

    if (soapNote.severityScore === 'Kritis') {
      score = Math.max(score, 90);
      triggers.push('Penilaian Dokter: Kritis (Severity Level Red)');
    } else if (soapNote.severityScore === 'Berat') {
      score = Math.max(score, 70);
      triggers.push('Penilaian Dokter: Berat (Severity Level Orange)');
    } else if (soapNote.severityScore === 'Sedang') {
      score = Math.max(score, 45);
    }
  }

  // 3. Clinical Symptom & Keyword Heuristic Parsing
  // P1 Keywords (Emergency - Resuscitation / Immediate)
  const p1Keywords = [
    { regex: /sianosis|lidah biru|gusi pucat pasang|tidak sadar|koma|collapse|kolaps/i, reason: 'Sianosis / Gangguan Perfusi Kritis' },
    { regex: /sesak napas|napas terengah|dyspnea|gasping|open mouth breathing/i, reason: 'Distres Respirasi / Sesak Akut' },
    { regex: /tertabrak|trauma berat|pendarahan hebat|arteri|fraktur terbuka/i, reason: 'Trauma Akut & Perdarahan Masif' },
    { regex: /kejang|seizure|status epileptikus/i, reason: 'Kejang Aktif / Neurologis Akut' },
    { regex: /tidak bisa kencing|retensi urin total|flutd tersumbat|distensi vesika/i, reason: 'Obstruksi Uretra Akut (Emergency FLUTD)' },
    { regex: /racun|intoksikasi|insektisida|bisa ular/i, reason: 'Intoksikasi / Keracunan Toksin Akut' },
    { regex: /gdv|torsi lambung|bloat/i, reason: 'Kecurigaan GDV / Dilatasi Lambung Akut' }
  ];

  // P2 Keywords (Urgent - 15 to 30 mins)
  const p2Keywords = [
    { regex: /muntah darah|hematemesis|diare berdarah|melena/i, reason: 'Gastroenteritis Hemoragik Akut' },
    { regex: /luka sobek|vulnus laceratum|luka gigit|abses pecah/i, reason: 'Vulnus Laceratum / Luka Dalam Aktif' },
    { regex: /dehidrasi berat|turgor buruk|lemas tidak bisa jalan/i, reason: 'Dehidrasi Berat & Kelemahan Sistemik' },
    { regex: /mata bengkak merah|ulkus kornea|glaukoma|prolapse bola mata/i, reason: 'Oftalmologi Akut (Risiko Kebutaan)' },
    { regex: /nyeri hebat|melolong|vokalisasi kesakitan|abdomen akut/i, reason: 'Nyeri Akut Derajat Tinggi' }
  ];

  // P3 Keywords (Semi-Urgent - 30 to 60 mins)
  const p3Keywords = [
    { regex: /nafsu makan turun|tidak mau makan|anoreksia 1 hari|kurang aktif/i, reason: 'Penurunan Nafsu Makan & Letargi Ringan' },
    { regex: /muntah|diare|mencret/i, reason: 'Gangguan Saluran Cerna Ringan-Sedang' },
    { regex: /otitis|telinga gatal|bau telinga|garuk kepala/i, reason: 'Infeksi Telinga / Otitis Eksterna' },
    { regex: /batuk|bersin|flu kucing|ingusan/i, reason: 'Gejala Saluran Napas Atas Ringan' },
    { regex: /pincang|kaki pincang|radang sendi/i, reason: 'Claudicatio / Gangguan Lokomotor' },
    { regex: /kulit gatal|scabies|jamur|ketombe|rontok/i, reason: 'Dermatitis / Masalah Kulit' }
  ];

  // Check P1
  for (const item of p1Keywords) {
    if (item.regex.test(allText)) {
      score += 45;
      if (!triggers.includes(item.reason)) triggers.push(item.reason);
    }
  }

  // Check P2
  for (const item of p2Keywords) {
    if (item.regex.test(allText)) {
      score += 25;
      if (!triggers.includes(item.reason)) triggers.push(item.reason);
    }
  }

  // Check P3
  for (const item of p3Keywords) {
    if (item.regex.test(allText)) {
      score += 15;
      if (!triggers.includes(item.reason)) triggers.push(item.reason);
    }
  }

  // Routine / Preventive check (Reduces score to P4)
  const isPreventive = /vaksin|rabies|booster|grooming|potong kuku|sehat|cek rutin|kontrol jahitan|deworming|obat cacing/i.test(allText) &&
    !triggers.some(t => t.includes('Kritis') || t.includes('Akut') || t.includes('Trauma'));

  if (isPreventive && score < 50) {
    score = Math.min(score, 20);
    if (triggers.length === 0) triggers.push('Pemeriksaan Rutin / Tindakan Preventif');
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(10, score));

  // Determine Triage Level
  let level: TriageUrgencyLevel;
  let label: string;
  let colorClass: string;
  let bgClass: string;
  let borderClass: string;
  let badgeClass: string;
  let summary: string;
  let triageRationale: string;

  if (score >= 75) {
    level = 'P1';
    label = 'P1 - KRITIS / RESUSITASI';
    colorClass = 'text-rose-700 dark:text-rose-300';
    bgClass = 'bg-rose-500/15';
    borderClass = 'border-rose-500/40';
    badgeClass = 'bg-rose-600 text-white border-rose-700 shadow-rose-500/30';
    summary = 'Kondisi gawat darurat mengancam nyawa. Memerlukan penanganan dokter seketika (<5 menit).';
    triageRationale = `Terdeteksi indikator bahaya tinggi: ${triggers.slice(0, 2).join(', ') || 'Tanda vital instabil'}. Pasien harus langsung dimasukkan ke meja tindakan darurat.`;
    if (recommendedActions.length === 0) {
      recommendedActions.push('Stabilisasi jalan napas & oksigenasi segera');
      recommendedActions.push('Pasang kateter IV & siap infus syok');
      recommendedActions.push('Notifikasi dokter jaga darurat');
    }
  } else if (score >= 50) {
    level = 'P2';
    label = 'P2 - SANGAT MENDESAK';
    colorClass = 'text-amber-700 dark:text-amber-300';
    bgClass = 'bg-amber-500/15';
    borderClass = 'border-amber-500/40';
    badgeClass = 'bg-amber-600 text-white border-amber-700 shadow-amber-500/30';
    summary = 'Kondisi berpotensi memburuk cepat. Diperiksa dokter dalam waktu <15-30 menit.';
    triageRationale = `Terdapat gejala akut yang memerlukan intervensi cepat: ${triggers.slice(0, 2).join(', ') || 'Nyeri akut / distres sedang'}.`;
    if (recommendedActions.length === 0) {
      recommendedActions.push('Pemeriksaan tanda vital lengkap (Suhu, CRT, RR, HR)');
      recommendedActions.push('Pemberian analgesik atau antiemetik sesuai advis');
      recommendedActions.push('Prioritaskan antrean sebelum pasien rutin');
    }
  } else if (score >= 30) {
    level = 'P3';
    label = 'P3 - SEMI-MENDESAK';
    colorClass = 'text-amber-800 dark:text-amber-200';
    bgClass = 'bg-yellow-500/15';
    borderClass = 'border-yellow-500/40';
    badgeClass = 'bg-yellow-500 text-slate-900 border-yellow-600';
    summary = 'Kondisi stabil dengan keluhan klinis ringan hingga sedang. Target waktu tunggu 30-60 menit.';
    triageRationale = `Pasien menunjukkan gejala klinis ringan: ${triggers.slice(0, 2).join(', ') || 'Keluhan umum non-kritis'}. Tanda vital stabil.`;
    if (recommendedActions.length === 0) {
      recommendedActions.push('Anamnesis detail riwayat makan & pola aktivitas');
      recommendedActions.push('Pemeriksaan fisik standar saat giliran antrean');
    }
  } else {
    level = 'P4';
    label = 'P4 - NON-URGENT / RUTIN';
    colorClass = 'text-emerald-700 dark:text-emerald-300';
    bgClass = 'bg-emerald-500/15';
    borderClass = 'border-emerald-500/40';
    badgeClass = 'bg-emerald-600 text-white border-emerald-700';
    summary = 'Kondisi sehat & stabil. Layanan terjadwal / preventif tanpa ancaman fisiologis.';
    triageRationale = 'Pasien datang untuk layanan terencana atau pemeriksaan preventif berkala.';
    if (recommendedActions.length === 0) {
      recommendedActions.push('Pemeriksaan suhu & berat badan sebelum vaksin/tindakan');
      recommendedActions.push('Edukasi pemilik mengenai jadwal vaksinasi & nutrisi');
    }
  }

  return {
    level,
    label,
    severityScore: score,
    colorClass,
    bgClass,
    borderClass,
    badgeClass,
    summary,
    symptomTriggers: triggers.length > 0 ? triggers : ['Pemeriksaan Fisik Umum'],
    vitalFlags,
    recommendedActions,
    triageRationale,
    analyzedAt: new Date().toISOString(),
    source: 'clinical_rule_engine'
  };
}

/**
 * Server-side Gemini AI Triage Analysis request
 */
export async function analyzePetTriageWithGemini(
  pet: Pet,
  visit?: ClinicVisit,
  soapNote?: SOAPNote,
  medicalRecords: MedicalRecord[] = []
): Promise<TriageUrgencyResult> {
  try {
    const payload = {
      petInfo: {
        id: pet.id,
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        birthDate: pet.birthDate,
        weightKg: pet.weightKg,
        allergies: pet.allergies
      },
      currentVisit: visit ? {
        complaint: visit.complaint,
        queueNo: visit.queueNo,
        status: visit.status
      } : null,
      latestSoap: soapNote ? {
        chiefComplaint: soapNote.chiefComplaint,
        hpi: soapNote.historyOfPresentIllness,
        vitals: {
          temp: soapNote.temperatureC,
          hr: soapNote.heartRate,
          rr: soapNote.respiratoryRate,
          spO2: soapNote.spO2
        },
        workingDiagnosis: soapNote.workingDiagnosis,
        severityScore: soapNote.severityScore,
        examNotes: soapNote.physicalExamNotes
      } : null,
      historySummary: medicalRecords.map(m => `[${m.date}] ${m.type}: ${m.title} - ${m.description}`).slice(0, 5)
    };

    const res = await fetch('/api/ai/triage-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return {
        ...json.data,
        source: 'ai_gemini',
        analyzedAt: new Date().toISOString()
      };
    }
    throw new Error(json.error || 'Fallback required');
  } catch (err) {
    console.warn('Using client-side clinical triage engine:', err);
    return computeClientTriageUrgency(pet, visit, soapNote, medicalRecords);
  }
}
