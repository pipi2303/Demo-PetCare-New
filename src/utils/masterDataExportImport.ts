import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AppSettings, Customer, MembershipTier, Pet } from '../types';
import { applyPageFooters, DEFAULT_COMPANY_INFO, formatNumber, formatRupiah } from './pdfBuilder';

export interface StagedClientRow {
  rowIndex: number;
  selected: boolean;
  name: string;
  phone: string;
  email: string;
  nik: string;
  gender: 'L' | 'P';
  membershipTier: MembershipTier;
  address: string;
  status: 'valid' | 'duplicate' | 'error';
  messages: string[];
  existingCustomerId?: string;
}

export interface StagedPatientRow {
  rowIndex: number;
  selected: boolean;
  name: string;
  species: Pet['species'];
  breed: string;
  gender: 'Jantan' | 'Betina';
  color: string;
  birthDate: string;
  weightKg: number;
  sterilized: boolean;
  microchipNo: string;
  allergies: string;
  notes: string;
  ownerIdentifier: string;
  ownerNameInput: string;
  ownerPhoneInput: string;
  resolvedCustomerId?: string;
  resolvedCustomerName?: string;
  willAutoCreateOwner: boolean;
  status: 'valid' | 'duplicate' | 'error';
  messages: string[];
}

export function normalizePhoneDigits(phone: string | undefined | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('62')) {
    digits = '0' + digits.slice(2);
  } else if (digits.startsWith('8')) {
    digits = '0' + digits;
  }
  return digits;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ============================================================================
// 1. BULK EXPORT: CSV
// ============================================================================

export function exportClientsToCSV(
  customers: Customer[],
  pets: Pet[],
  filenamePrefix = 'Master_Data_Pelanggan_PetCare'
): void {
  const headers = [
    'ID Pelanggan',
    'Nama Lengkap',
    'No. Telepon / WhatsApp',
    'Email',
    'NIK',
    'Gender',
    'Membership Tier',
    'Poin Loyalitas',
    'Total Transaksi (Rp)',
    'Jumlah Hewan',
    'Daftar Pasien Hewan',
    'Alamat Lengkap',
    'Tanggal Registrasi',
  ];

  const rows = customers.map((c) => {
    const ownedPets = pets.filter((p) => p.customerId === c.id);
    const petNames = ownedPets.map((p) => `${p.name} (${p.species})`).join('; ');
    return [
      c.id,
      c.name,
      c.phone,
      c.email || '-',
      c.nik || '-',
      c.gender || 'L',
      c.membershipTier,
      c.loyaltyPoints ?? 0,
      c.totalSpent ?? 0,
      ownedPets.length || c.petCount || 0,
      petNames || '-',
      c.address || '-',
      c.createdAt || '-',
    ];
  });

  const csvBody = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  // Include UTF-8 BOM so Microsoft Excel opens Indonesian characters & columns cleanly
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().substring(0, 10);
  triggerBlobDownload(blob, `${filenamePrefix}_${dateStr}.csv`);
}

export function exportPatientsToCSV(
  pets: Pet[],
  customers: Customer[],
  filenamePrefix = 'Master_Data_Pasien_Hewan_PetCare'
): void {
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const headers = [
    'ID Pasien',
    'Nama Hewan',
    'Spesies',
    'Ras / Breed',
    'Gender',
    'Warna',
    'Tanggal Lahir',
    'Berat Badan (kg)',
    'Status Steril',
    'No. Microchip',
    'Alergi & Kontraindikasi',
    'ID Pemilik',
    'Nama Pemilik',
    'No. WhatsApp Pemilik',
    'Catatan Medis',
    'Tanggal Registrasi',
  ];

  const rows = pets.map((p) => {
    const owner = customerMap.get(p.customerId);
    return [
      p.id,
      p.name,
      p.species,
      p.breed || '-',
      p.gender,
      p.color || '-',
      p.birthDate || '-',
      p.weightKg ?? 0,
      p.sterilized ? 'Sudah Steril' : 'Belum Steril',
      p.microchipNo || '-',
      p.allergies || 'Tidak Ada',
      p.customerId,
      owner?.name || p.customerName || '-',
      owner?.phone || '-',
      p.notes || '-',
      p.createdAt || '-',
    ];
  });

  const csvBody = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().substring(0, 10);
  triggerBlobDownload(blob, `${filenamePrefix}_${dateStr}.csv`);
}

// ============================================================================
// 2. BULK EXPORT: EXCEL (.XLSX)
// ============================================================================

export function exportMasterDataToExcel(
  mode: 'customers' | 'pets' | 'both',
  customers: Customer[],
  pets: Pet[],
  filenamePrefix = 'Backup_Master_Data_PetCare'
): void {
  const wb = XLSX.utils.book_new();
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  if (mode === 'customers' || mode === 'both') {
    const clientData = customers.map((c, idx) => {
      const ownedPets = pets.filter((p) => p.customerId === c.id);
      return {
        No: idx + 1,
        'ID Pelanggan': c.id,
        'Nama Lengkap': c.name,
        'No. WhatsApp': c.phone,
        Email: c.email || '-',
        NIK: c.nik || '-',
        Gender: c.gender || 'L',
        'Membership Tier': c.membershipTier,
        'Poin Loyalitas': c.loyaltyPoints ?? 0,
        'Total Transaksi (Rp)': c.totalSpent ?? 0,
        'Jumlah Hewan': ownedPets.length || c.petCount || 0,
        'Daftar Pasien Hewan': ownedPets.map((p) => `${p.name} (${p.species})`).join(', ') || '-',
        'Alamat Lengkap': c.address || '-',
        'Tanggal Registrasi': c.createdAt || '-',
      };
    });
    const wsClients = XLSX.utils.json_to_sheet(clientData);
    wsClients['!cols'] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 8 },
      { wch: 15 },
      { wch: 14 },
      { wch: 18 },
      { wch: 13 },
      { wch: 28 },
      { wch: 34 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsClients, 'Data_Pelanggan');
  }

  if (mode === 'pets' || mode === 'both') {
    const petData = pets.map((p, idx) => {
      const owner = customerMap.get(p.customerId);
      return {
        No: idx + 1,
        'ID Pasien': p.id,
        'Nama Hewan': p.name,
        Spesies: p.species,
        'Ras / Breed': p.breed || '-',
        Gender: p.gender,
        Warna: p.color || '-',
        'Tanggal Lahir': p.birthDate || '-',
        'Berat (kg)': p.weightKg ?? 0,
        'Status Steril': p.sterilized ? 'Ya' : 'Tidak',
        'No. Microchip': p.microchipNo || '-',
        Alergi: p.allergies || 'Tidak Ada',
        'ID Pemilik': p.customerId,
        'Nama Pemilik': owner?.name || p.customerName || '-',
        'No. WA Pemilik': owner?.phone || '-',
        'Catatan Medis': p.notes || '-',
        'Tanggal Registrasi': p.createdAt || '-',
      };
    });
    const wsPets = XLSX.utils.json_to_sheet(petData);
    wsPets['!cols'] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 18 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 11 },
      { wch: 12 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
      { wch: 22 },
      { wch: 16 },
      { wch: 28 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPets, 'Data_Pasien_Hewan');
  }

  const dateStr = new Date().toISOString().substring(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStr}.xlsx`);
}

// ============================================================================
// 3. BULK EXPORT: OFFICIAL PDF REPORT (CLIENTS & PATIENTS)
// ============================================================================

function drawOfficialHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  appSettings?: AppSettings
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const clinicName = appSettings?.clinicName || DEFAULT_COMPANY_INFO.clinicName;
  const clinicSlogan = appSettings?.slogan || DEFAULT_COMPANY_INFO.subTitle;
  const clinicAddress = appSettings?.clinicAddress || DEFAULT_COMPANY_INFO.address;
  const clinicPhone = appSettings?.clinicPhone || DEFAULT_COMPANY_INFO.phone;
  const clinicEmail = appSettings?.clinicEmail || DEFAULT_COMPANY_INFO.email;
  const sipNo = appSettings?.sipNumber || DEFAULT_COMPANY_INFO.licenseNo;

  // Navy header banner
  doc.setFillColor(27, 42, 69);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent line
  doc.setFillColor(184, 144, 90);
  doc.rect(0, 28, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 253, 249);
  doc.text(clinicName.toUpperCase(), 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(217, 185, 138);
  doc.text(clinicSlogan, 14, 15.5);

  doc.setFontSize(7.5);
  doc.setTextColor(237, 230, 214);
  doc.text(`${clinicAddress} | Telp: ${clinicPhone} | Email: ${clinicEmail}`, 14, 21);
  doc.text(`Izin Operasional / SIP: ${sipNo}`, 14, 25.5);

  // Right side document badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 253, 249);
  doc.text(title, pageWidth - 14, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(217, 185, 138);
  doc.text(subtitle, pageWidth - 14, 16.5, { align: 'right' });

  const printedAt = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(237, 230, 214);
  doc.text(`Dicetak: ${printedAt}`, pageWidth - 14, 23, { align: 'right' });

  return 35;
}

export function exportClientsToPDF(
  customers: Customer[],
  pets: Pet[],
  appSettings?: AppSettings,
  filterInfo = 'Semua Data Pelanggan'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawOfficialHeader(
    doc,
    'LAPORAN MASTER DATA PELANGGAN (KLIEN)',
    `Cakupan: ${filterInfo} (${customers.length} Rekam)`,
    appSettings
  );

  // Summary KPI Strip
  const totalRevenue = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const totalPetsLinked = customers.reduce(
    (acc, c) => acc + (pets.filter((p) => p.customerId === c.id).length || c.petCount || 0),
    0
  );
  const platinumCount = customers.filter((c) => c.membershipTier === 'Platinum').length;
  const goldCount = customers.filter((c) => c.membershipTier === 'Gold').length;
  const silverCount = customers.filter((c) => c.membershipTier === 'Silver').length;

  const kpis = [
    { label: 'TOTAL PELANGGAN', value: `${formatNumber(customers.length)} Klien` },
    { label: 'DISTRIBUSI TIER', value: `Platinum: ${platinumCount} | Gold: ${goldCount} | Silver: ${silverCount}` },
    { label: 'TOTAL PASIEN TERKAIT', value: `${formatNumber(totalPetsLinked)} Ekor Hewan` },
    { label: 'AKUMULASI TRANSAKSI', value: formatRupiah(totalRevenue) },
  ];

  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 28 - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(246, 241, 230);
    doc.setDrawColor(225, 214, 190);
    doc.roundedRect(x, startY, boxWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 102, 86);
    doc.text(kpi.label, x + 3, startY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(27, 42, 69);
    doc.text(kpi.value, x + 3, startY + 11);
  });

  const tableRows = customers.map((c, idx) => {
    const ownedPets = pets.filter((p) => p.customerId === c.id);
    const petListStr =
      ownedPets.length > 0
        ? ownedPets.map((p) => `${p.name} (${p.species})`).join(', ')
        : `${c.petCount || 0} hewan`;
    return [
      String(idx + 1),
      c.name,
      c.phone,
      c.email || '-',
      c.nik || '-',
      c.membershipTier,
      formatNumber(c.loyaltyPoints || 0),
      formatRupiah(c.totalSpent || 0),
      petListStr,
      c.address || '-',
    ];
  });

  autoTable(doc, {
    startY: startY + 18,
    head: [
      [
        'No',
        'Nama Pelanggan',
        'No. WhatsApp',
        'Email',
        'NIK',
        'Tier',
        'Poin',
        'Total Transaksi',
        'Pasien Hewan',
        'Alamat',
      ],
    ],
    body: tableRows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [27, 42, 69],
      lineColor: [225, 214, 190],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [27, 42, 69],
      textColor: [255, 253, 249],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [252, 249, 242],
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 34, fontStyle: 'bold' },
      2: { cellWidth: 25 },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 28, halign: 'right' },
      8: { cellWidth: 38 },
      9: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  applyPageFooters(doc);
  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`Laporan_Master_Pelanggan_PetCare_${dateStr}.pdf`);
}

export function exportPatientsToPDF(
  pets: Pet[],
  customers: Customer[],
  appSettings?: AppSettings,
  filterInfo = 'Semua Data Pasien Hewan'
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const startY = drawOfficialHeader(
    doc,
    'LAPORAN MASTER DATA PASIEN HEWAN (EMR REGISTRY)',
    `Cakupan: ${filterInfo} (${pets.length} Pasien)`,
    appSettings
  );

  const dogCount = pets.filter((p) => p.species === 'Anjing').length;
  const catCount = pets.filter((p) => p.species === 'Kucing').length;
  const otherCount = pets.length - dogCount - catCount;
  const sterileCount = pets.filter((p) => p.sterilized).length;
  const allergyCount = pets.filter(
    (p) => p.allergies && p.allergies.trim() !== '' && p.allergies.toLowerCase() !== 'tidak ada'
  ).length;

  const kpis = [
    { label: 'TOTAL PASIEN HEWAN', value: `${formatNumber(pets.length)} Ekor` },
    { label: 'KOMPOSISI SPESIES', value: `Anjing: ${dogCount} | Kucing: ${catCount} | Lain: ${otherCount}` },
    { label: 'STATUS STERILISASI', value: `${sterileCount} Sudah Steril (${pets.length ? Math.round((sterileCount / pets.length) * 100) : 0}%)` },
    { label: 'PERINGATAN ALERGI OBAT/PAKAN', value: `${allergyCount} Pasien Memiliki Alergi` },
  ];

  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 28 - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(246, 241, 230);
    doc.setDrawColor(225, 214, 190);
    doc.roundedRect(x, startY, boxWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 102, 86);
    doc.text(kpi.label, x + 3, startY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(27, 42, 69);
    doc.text(kpi.value, x + 3, startY + 11);
  });

  const tableRows = pets.map((p, idx) => {
    const owner = customerMap.get(p.customerId);
    return [
      String(idx + 1),
      p.name,
      p.species,
      p.breed || '-',
      p.gender,
      `${p.weightKg ?? 0} kg`,
      p.sterilized ? 'Steril' : 'Belum',
      p.microchipNo || '-',
      p.allergies || 'Tidak Ada',
      owner?.name || p.customerName || '-',
      owner?.phone || '-',
    ];
  });

  autoTable(doc, {
    startY: startY + 18,
    head: [
      [
        'No',
        'Nama Pasien',
        'Spesies',
        'Ras / Breed',
        'Gender',
        'Berat',
        'Steril',
        'No. Microchip',
        'Alergi / Kontraindikasi',
        'Nama Pemilik',
        'No. WA Pemilik',
      ],
    ],
    body: tableRows,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [27, 42, 69],
      lineColor: [225, 214, 190],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [27, 42, 69],
      textColor: [255, 253, 249],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [252, 249, 242],
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 28 },
      8: { cellWidth: 42 },
      9: { cellWidth: 34 },
      10: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  applyPageFooters(doc);
  const dateStr = new Date().toISOString().substring(0, 10);
  doc.save(`Laporan_Master_Pasien_Hewan_PetCare_${dateStr}.pdf`);
}

// ============================================================================
// 4. STANDARDIZED EXCEL / CSV TEMPLATES FOR BULK IMPORT
// ============================================================================

export const SAMPLE_CLIENT_IMPORT_ROWS = [
  {
    'Nama Lengkap *': 'drg. Clarissa Halim',
    'No WhatsApp *': '081298765432',
    Email: 'clarissa.halim@email.com',
    NIK: '3174015506900001',
    'Gender (L/P)': 'P',
    'Membership Tier': 'Gold',
    'Alamat Lengkap': 'Jl. Gunawarman No. 45, Kebayoran Baru, Jakarta Selatan',
  },
  {
    'Nama Lengkap *': 'Hendra Wijaya Kusuma',
    'No WhatsApp *': '081388776655',
    Email: 'hendra.wk@email.com',
    NIK: '3174021208850004',
    'Gender (L/P)': 'L',
    'Membership Tier': 'Silver',
    'Alamat Lengkap': 'Jl. Cipete Raya No. 19, Cilandak, Jakarta Selatan',
  },
  {
    'Nama Lengkap *': 'Nadya Prameswari',
    'No WhatsApp *': '081122334455',
    Email: 'nadya.prameswari@email.com',
    NIK: '3174082411920002',
    'Gender (L/P)': 'P',
    'Membership Tier': 'Platinum',
    'Alamat Lengkap': 'Apartemen Senopati Suites Tower B Lt. 18, Jakarta Selatan',
  },
];

export function getSamplePatientImportRows(existingCustomers: Customer[]) {
  const firstOwner = existingCustomers[0];
  const secondOwner = existingCustomers[1] || existingCustomers[0];
  return [
    {
      'Nama Hewan *': 'Mochi',
      'Spesies *': 'Kucing',
      'Ras / Breed *': 'Scottish Fold',
      'Gender (Jantan/Betina) *': 'Betina',
      Warna: 'Putih Abu-abu',
      'Tanggal Lahir (YYYY-MM-DD)': '2023-05-14',
      'Berat (kg)': 3.8,
      'Steril (Ya/Tidak)': 'Ya',
      'No Microchip': 'MC-900112233441',
      Alergi: 'Tidak Ada',
      'Catatan Medis': 'Vaksin Tricat lengkap, rutin deworming 3 bulan sekali',
      'No WA Pemilik / ID Pemilik *': firstOwner?.phone || '081234567890',
      'Nama Pemilik *': firstOwner?.name || 'Budi Santoso',
    },
    {
      'Nama Hewan *': 'Thor',
      'Spesies *': 'Anjing',
      'Ras / Breed *': 'Siberian Husky',
      'Gender (Jantan/Betina) *': 'Jantan',
      Warna: 'Hitam Putih',
      'Tanggal Lahir (YYYY-MM-DD)': '2022-09-20',
      'Berat (kg)': 22.5,
      'Steril (Ya/Tidak)': 'Ya',
      'No Microchip': 'MC-900112233442',
      Alergi: 'Alergi Daging Sapi',
      'Catatan Medis': 'Sensitif suhu panas, riwayat dermatitis ringan',
      'No WA Pemilik / ID Pemilik *': secondOwner?.phone || '081298765432',
      'Nama Pemilik *': secondOwner?.name || 'Siti Aminah',
    },
    {
      'Nama Hewan *': 'Coco',
      'Spesies *': 'Anjing',
      'Ras / Breed *': 'Toy Poodle',
      'Gender (Jantan/Betina) *': 'Betina',
      Warna: 'Apricot',
      'Tanggal Lahir (YYYY-MM-DD)': '2024-01-10',
      'Berat (kg)': 4.2,
      'Steril (Ya/Tidak)': 'Tidak',
      'No Microchip': 'MC-900112233443',
      Alergi: 'Alergi Amoxicillin',
      'Catatan Medis': 'Pemilik baru registrasi bersamaan dengan pasien',
      'No WA Pemilik / ID Pemilik *': '081298765432',
      'Nama Pemilik *': 'drg. Clarissa Halim',
    },
  ];
}

export function downloadClientImportTemplate(format: 'xlsx' | 'csv' = 'xlsx'): void {
  if (format === 'csv') {
    const headers = Object.keys(SAMPLE_CLIENT_IMPORT_ROWS[0]);
    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...SAMPLE_CLIENT_IMPORT_ROWS.map((row) =>
        headers.map((h) => escapeCsvCell((row as Record<string, any>)[h])).join(',')
      ),
    ].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    triggerBlobDownload(blob, 'Template_Import_Pelanggan_PetCare.csv');
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(SAMPLE_CLIENT_IMPORT_ROWS);
  wsData['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 28 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 46 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Template_Pelanggan');

  const guideRows = [
    { Kolom: 'Nama Lengkap *', Status: 'WAJIB', Keterangan: 'Nama lengkap pemilik hewan / klien (Contoh: drg. Clarissa Halim)' },
    { Kolom: 'No WhatsApp *', Status: 'WAJIB', Keterangan: 'Nomor HP/WhatsApp aktif (Contoh: 081298765432 atau +6281298765432)' },
    { Kolom: 'Email', Status: 'Opsional', Keterangan: 'Alamat email untuk pengiriman invoice & hasil lab PDF' },
    { Kolom: 'NIK', Status: 'Opsional', Keterangan: '16 digit Nomor Induk Kependudukan untuk persetujuan tindakan medis' },
    { Kolom: 'Gender (L/P)', Status: 'Opsional', Keterangan: 'Isi L (Laki-laki) atau P (Perempuan). Default: L' },
    { Kolom: 'Membership Tier', Status: 'Opsional', Keterangan: 'Pilihan: Silver, Gold, atau Platinum. Default: Silver' },
    { Kolom: 'Alamat Lengkap', Status: 'Opsional', Keterangan: 'Alamat domisili untuk layanan penjemputan Ambulance Rescue / Pet Hotel' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 68 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Pengisian');

  XLSX.writeFile(wb, 'Template_Import_Pelanggan_PetCare.xlsx');
}

export function downloadPatientImportTemplate(
  format: 'xlsx' | 'csv' = 'xlsx',
  existingCustomers: Customer[] = []
): void {
  const sampleRows = getSamplePatientImportRows(existingCustomers);

  if (format === 'csv') {
    const headers = Object.keys(sampleRows[0]);
    const csvLines = [
      headers.map(escapeCsvCell).join(','),
      ...sampleRows.map((row) =>
        headers.map((h) => escapeCsvCell((row as Record<string, any>)[h])).join(',')
      ),
    ].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvLines], { type: 'text/csv;charset=utf-8;' });
    triggerBlobDownload(blob, 'Template_Import_Pasien_Hewan_PetCare.csv');
    return;
  }

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(sampleRows);
  wsData['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 36 },
    { wch: 26 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Template_Pasien_Hewan');

  if (existingCustomers.length > 0) {
    const refRows = existingCustomers.map((c) => ({
      'ID Pelanggan': c.id,
      'Nama Pemilik': c.name,
      'No WhatsApp': c.phone,
      Email: c.email || '-',
      Tier: c.membershipTier,
    }));
    const wsRef = XLSX.utils.json_to_sheet(refRows);
    wsRef['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 18 }, { wch: 26 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi_Pelanggan_Aktif');
  }

  const guideRows = [
    { Kolom: 'Nama Hewan *', Status: 'WAJIB', Keterangan: 'Nama panggilan pasien hewan (Contoh: Mochi, Thor)' },
    { Kolom: 'Spesies *', Status: 'WAJIB', Keterangan: 'Pilihan: Anjing, Kucing, Kelinci, Burung, Reptil, atau Lainnya' },
    { Kolom: 'Ras / Breed *', Status: 'WAJIB', Keterangan: 'Nama ras hewan (Contoh: Scottish Fold, Golden Retriever, Domestik)' },
    { Kolom: 'Gender (Jantan/Betina) *', Status: 'WAJIB', Keterangan: 'Pilihan: Jantan atau Betina (mendukung juga M/F)' },
    { Kolom: 'Warna', Status: 'Opsional', Keterangan: 'Warna rambut/bulu/kulit dominan' },
    { Kolom: 'Tanggal Lahir (YYYY-MM-DD)', Status: 'Opsional', Keterangan: 'Format YYYY-MM-DD (Contoh: 2023-05-14)' },
    { Kolom: 'Berat (kg)', Status: 'Opsional', Keterangan: 'Angka berat badan dalam kilogram (Contoh: 4.2)' },
    { Kolom: 'Steril (Ya/Tidak)', Status: 'Opsional', Keterangan: 'Isi Ya / Sudah jika sudah disteril, atau Tidak / Belum' },
    { Kolom: 'No Microchip', Status: 'Opsional', Keterangan: 'Nomor microchip ISO (otomatis dibuatkan jika dikosongkan)' },
    { Kolom: 'Alergi', Status: 'Opsional', Keterangan: 'Riwayat alergi obat/makanan penting untuk skrining EMR (Default: Tidak Ada)' },
    { Kolom: 'Catatan Medis', Status: 'Opsional', Keterangan: 'Catatan tambahan perilaku atau riwayat penyakit kronis' },
    {
      Kolom: 'No WA Pemilik / ID Pemilik *',
      Status: 'WAJIB',
      Keterangan: 'Nomor WhatsApp pemilik atau ID Pelanggan untuk menghubungkan hewan ke pemiliknya secara otomatis',
    },
    {
      Kolom: 'Nama Pemilik *',
      Status: 'WAJIB',
      Keterangan: 'Nama pemilik. Jika pemilik belum terdaftar di sistem namun No WA & Nama Pemilik diisi, sistem akan mendaftarkan pemilik baru secara otomatis!',
    },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 76 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Pengisian');

  XLSX.writeFile(wb, 'Template_Import_Pasien_Hewan_PetCare.xlsx');
}

// ============================================================================
// 5. EXCEL / CSV PARSING & VALIDATION ENGINE
// ============================================================================

function getFieldByAliases(row: Record<string, any>, aliases: string[]): string {
  const normalizedKeys = Object.keys(row).map((k) => ({
    original: k,
    clean: k
      .toLowerCase()
      .replace(/\*/g, '')
      .replace(/[^a-z0-9]/g, ''),
  }));

  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = normalizedKeys.find(
      (nk) => nk.clean === cleanAlias || nk.clean.includes(cleanAlias)
    );
    if (found && row[found.original] !== undefined && row[found.original] !== null) {
      return String(row[found.original]).trim();
    }
  }
  return '';
}

export async function parseUploadedSpreadsheet(file: File): Promise<Record<string, any>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
}

export function validateClientImportRows(
  rawRows: Record<string, any>[],
  existingCustomers: Customer[]
): StagedClientRow[] {
  const seenPhonesInBatch = new Set<string>();

  return rawRows
    .map((raw, idx) => {
      const name = getFieldByAliases(raw, ['namalengkap', 'namapelanggan', 'nama', 'name', 'fullname', 'clientname']);
      const phone = getFieldByAliases(raw, ['nowhatsapp', 'notelepon', 'telepon', 'whatsapp', 'phone', 'hp', 'nohp', 'wa']);
      const email = getFieldByAliases(raw, ['email', 'surel']);
      const nik = getFieldByAliases(raw, ['nik', 'noktp', 'ktp']);
      const rawGender = getFieldByAliases(raw, ['gender', 'jeniskelamin', 'jk', 'kelamin']).toUpperCase();
      const rawTier = getFieldByAliases(raw, ['membershiptier', 'tier', 'member', 'level']);
      const address = getFieldByAliases(raw, ['alamatlengkap', 'alamat', 'address', 'domisili']);

      const gender: 'L' | 'P' =
        rawGender.startsWith('P') || rawGender.startsWith('F') || rawGender.includes('WANITA') || rawGender.includes('PEREMPUAN')
          ? 'P'
          : 'L';

      let membershipTier: MembershipTier = 'Silver';
      if (/platinum/i.test(rawTier)) membershipTier = 'Platinum';
      else if (/gold/i.test(rawTier)) membershipTier = 'Gold';

      const messages: string[] = [];
      let status: StagedClientRow['status'] = 'valid';

      if (!name) {
        status = 'error';
        messages.push('Nama Lengkap wajib diisi');
      }
      const normPhone = normalizePhoneDigits(phone);
      if (!phone || normPhone.length < 8) {
        status = 'error';
        messages.push('No. WhatsApp / Telepon tidak valid (min. 8 digit)');
      }

      // Check duplicate in existing database
      const existingMatch = existingCustomers.find(
        (c) =>
          (normPhone && normalizePhoneDigits(c.phone) === normPhone) ||
          (nik && c.nik && c.nik.trim() === nik.trim()) ||
          c.name.trim().toLowerCase() === name.toLowerCase()
      );

      if (status !== 'error') {
        if (existingMatch) {
          status = 'duplicate';
          messages.push(`Terdeteksi mirip/duplikat dengan pelanggan: ${existingMatch.name} (${existingMatch.phone})`);
        } else if (normPhone && seenPhonesInBatch.has(normPhone)) {
          status = 'duplicate';
          messages.push('Nomor WhatsApp ganda di dalam file yang sama');
        }
      }

      if (normPhone) seenPhonesInBatch.add(normPhone);
      if (messages.length === 0) {
        messages.push('Siap didaftarkan ke Master Pelanggan');
      }

      return {
        rowIndex: idx + 1,
        selected: status === 'valid',
        name,
        phone,
        email,
        nik,
        gender,
        membershipTier,
        address,
        status,
        messages,
        existingCustomerId: existingMatch?.id,
      };
    })
    .filter((r) => r.name || r.phone || r.email || r.address);
}

function normalizeSpecies(raw: string): Pet['species'] {
  const s = raw.toLowerCase().trim();
  if (s.includes('anjing') || s.includes('dog') || s.includes('canine')) return 'Anjing';
  if (s.includes('kucing') || s.includes('cat') || s.includes('feline')) return 'Kucing';
  if (s.includes('kelinci') || s.includes('rabbit')) return 'Kelinci';
  if (s.includes('burung') || s.includes('bird') || s.includes('aves')) return 'Burung';
  if (s.includes('reptil') || s.includes('iguana') || s.includes('kura') || s.includes('ular')) return 'Reptil';
  if (s === 'anjing' || s === 'kucing' || s === 'kelinci' || s === 'burung' || s === 'reptil') {
    return (s.charAt(0).toUpperCase() + s.slice(1)) as Pet['species'];
  }
  return 'Lainnya';
}

function normalizeBirthDate(raw: string): string {
  if (!raw) return '2023-01-01';
  // If ISO YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  // If DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().substring(0, 10);
  }
  return '2023-01-01';
}

export function validatePatientImportRows(
  rawRows: Record<string, any>[],
  existingCustomers: Customer[],
  existingPets: Pet[]
): StagedPatientRow[] {
  return rawRows
    .map((raw, idx) => {
      const name = getFieldByAliases(raw, ['namahewan', 'namapasien', 'petname', 'nama', 'name']);
      const rawSpecies = getFieldByAliases(raw, ['spesies', 'species', 'jenishewan', 'jenis']);
      const breed = getFieldByAliases(raw, ['rasbreed', 'ras', 'breed']) || 'Domestik';
      const rawGender = getFieldByAliases(raw, ['gender', 'jeniskelamin', 'kelamin']);
      const color = getFieldByAliases(raw, ['warna', 'color', 'warnabulu']) || 'Cokelat';
      const rawBirthDate = getFieldByAliases(raw, ['tanggallahir', 'birthdate', 'tgllahir', 'dob']);
      const rawWeight = getFieldByAliases(raw, ['berat', 'weight', 'beratbadan', 'beratkg']);
      const rawSteril = getFieldByAliases(raw, ['steril', 'sterilized', 'statussteril']);
      const microchipNo =
        getFieldByAliases(raw, ['nomicrochip', 'microchip', 'chip']) ||
        `MC-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      const allergies = getFieldByAliases(raw, ['alergi', 'allergies', 'kontraindikasi']) || 'Tidak Ada';
      const notes = getFieldByAliases(raw, ['catatanmedis', 'catatan', 'notes', 'keterangan']);
      const ownerIdentifier = getFieldByAliases(raw, [
        'nowapemilikidpemilik',
        'nowapemilik',
        'idpemilik',
        'teleponpemilik',
        'ownerphone',
        'customerid',
      ]);
      const ownerNameInput = getFieldByAliases(raw, ['namapemilik', 'pemilik', 'ownername', 'customername']);

      const species = normalizeSpecies(rawSpecies || 'Kucing');
      const gender: 'Jantan' | 'Betina' =
        /betina|female|^f$|^b$/i.test(rawGender.trim()) ? 'Betina' : 'Jantan';
      const birthDate = normalizeBirthDate(rawBirthDate);
      const weightKg = Math.max(0.1, parseFloat(String(rawWeight).replace(',', '.')) || 3.5);
      const sterilized = /ya|yes|true|sudah|steril|1/i.test(rawSteril.trim());

      // Match owner by ID, normalized phone, or exact name
      const normOwnerPhone = normalizePhoneDigits(ownerIdentifier);
      const matchedCustomer = existingCustomers.find(
        (c) =>
          (ownerIdentifier && c.id.toLowerCase() === ownerIdentifier.toLowerCase()) ||
          (normOwnerPhone.length >= 8 && normalizePhoneDigits(c.phone) === normOwnerPhone) ||
          (ownerNameInput && c.name.trim().toLowerCase() === ownerNameInput.trim().toLowerCase())
      );

      let resolvedCustomerId = matchedCustomer?.id;
      let resolvedCustomerName = matchedCustomer?.name;
      let willAutoCreateOwner = false;

      const messages: string[] = [];
      let status: StagedPatientRow['status'] = 'valid';

      if (!name) {
        status = 'error';
        messages.push('Nama Hewan wajib diisi');
      }

      if (!matchedCustomer) {
        if (ownerNameInput && normOwnerPhone.length >= 8) {
          willAutoCreateOwner = true;
          resolvedCustomerName = ownerNameInput;
          messages.push(`Pemilik baru "${ownerNameInput}" (${ownerIdentifier}) akan otomatis dibuatkan`);
        } else {
          status = 'error';
          messages.push(
            'Pemilik tidak ditemukan. Isi ID/No. WA Pemilik yang terdaftar atau lengkapi Nama Pemilik + No. WA (min. 8 digit) untuk buat pemilik baru otomatis'
          );
        }
      } else {
        messages.push(`Terhubung ke pemilik: ${matchedCustomer.name} (${matchedCustomer.phone})`);
      }

      // Check duplicate pet
      const duplicatePet = existingPets.find(
        (p) =>
          (microchipNo &&
            p.microchipNo &&
            !microchipNo.startsWith('MC-') &&
            p.microchipNo.toLowerCase() === microchipNo.toLowerCase()) ||
          (matchedCustomer &&
            p.customerId === matchedCustomer.id &&
            p.name.trim().toLowerCase() === name.trim().toLowerCase() &&
            p.species === species)
      );

      if (status !== 'error' && duplicatePet) {
        status = 'duplicate';
        messages.unshift(
          `Pasien "${duplicatePet.name}" (${duplicatePet.species}) sudah terdaftar pada pemilik ${duplicatePet.customerName}`
        );
      }

      return {
        rowIndex: idx + 1,
        selected: status === 'valid',
        name,
        species,
        breed,
        gender,
        color,
        birthDate,
        weightKg,
        sterilized,
        microchipNo,
        allergies,
        notes,
        ownerIdentifier,
        ownerNameInput,
        ownerPhoneInput: normOwnerPhone || ownerIdentifier,
        resolvedCustomerId,
        resolvedCustomerName,
        willAutoCreateOwner,
        status,
        messages,
      };
    })
    .filter((r) => r.name || r.ownerIdentifier || r.ownerNameInput);
}
