import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem, StockMovement } from '../types';
import {
  calculateInventoryDepletionAndPoSuggestions,
  InventoryDepletionSummary,
  StockDepletionAnalysisItem
} from './stockDepletionCalculator';

export interface InventoryPdfReportOptions {
  periodMonth?: string;
  periodYear?: number;
  warehouseFilter?: string;
  categoryFilter?: string;
  includeDepletionAnalysis?: boolean;
  includeAiPoSuggestions?: boolean;
  includeSignatures?: boolean;
  preparedByName?: string;
  preparedByTitle?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  approvedByName?: string;
  approvedByTitle?: string;
  managementNotes?: string;
  customDocNumber?: string;
}

const formatRupiah = (num: number): string => {
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
};

const formatNumber = (num: number): string => {
  return Math.round(num).toLocaleString('id-ID');
};

/**
 * Generates an executive-ready, professionally formatted PDF report
 * containing the current inventory stock status, 30-day depletion trends,
 * and AI-suggested purchase order quantities.
 */
export function generateInventoryStockAndDepletionPdf(
  stockItems: StockItem[],
  stockMovements: StockMovement[] = [],
  options: InventoryPdfReportOptions = {}
): jsPDF {
  const {
    periodMonth = 'September',
    periodYear = 2026,
    warehouseFilter = 'Semua',
    categoryFilter = 'Semua',
    includeDepletionAnalysis = true,
    includeAiPoSuggestions = true,
    includeSignatures = true,
    preparedByName = 'Bambang Wijaya, S.Farm., Apt.',
    preparedByTitle = 'Kepala Gudang & Farmasi Logistik',
    reviewedByName = 'drh. Hendra Setiawan, M.Sc.',
    reviewedByTitle = 'Manajer Operasional & Medis',
    approvedByName = 'drh. Sarah Maharani, Ph.D.',
    approvedByTitle = 'Direktur Utama Rumah Sakit Hewan',
    managementNotes = 'Laporan inventaris berkala untuk tinjauan manajemen eksekutif. Pemesanan ulang yang direkomendasikan sistem AI wajib divalidasi ketersediaan anggarannya sebelum penandatanganan PO resmi ke distributor farmasi.',
    customDocNumber
  } = options;

  // Compute 30-day depletion & AI PO metrics
  const summary: InventoryDepletionSummary = calculateInventoryDepletionAndPoSuggestions(
    stockItems,
    stockMovements,
    {
      categoryFilter,
      warehouseFilter,
      targetCoverageDays: 25,
      serviceLevelZScore: 1.65
    }
  );

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const docRef = customDocNumber || `INV-MGMT-${periodYear}${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}-${Math.floor(1000 + Math.random() * 9000)}`;
  const printedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Official Letterhead (Kop Surat Resmi)
  const drawHeader = () => {
    // Top Accent Bars (Navy & Gold dual tone)
    doc.setFillColor(27, 42, 69); // #1B2A45
    doc.rect(0, 0, pageWidth, 5.5, 'F');
    doc.setFillColor(184, 144, 90); // #B8905A
    doc.rect(0, 5.5, pageWidth, 2, 'F');

    // Clinic Emblem Shield Graphic
    doc.setFillColor(27, 42, 69);
    doc.roundedRect(14, 11, 16, 16, 2.5, 2.5, 'F');
    doc.setFillColor(184, 144, 90);
    doc.circle(22, 19, 4.5, 'F');
    doc.setTextColor(255, 253, 249);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('+', 22, 20.3, { align: 'center' });

    // Clinic Name & Corporate Metadata
    doc.setTextColor(27, 42, 69);
    doc.setFontSize(12.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PETCARE VETERINARY HOSPITAL & CLINIC', 34, 16);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 102, 86);
    doc.text('Pusat Pelayanan Medis Veteriner Terpadu, Rawat Inap & Logistik Farmasi Modern', 34, 20);
    doc.text('Jl. Senopati Raya No. 88, Kebayoran Baru, Jakarta Selatan | Telp: (021) 555-8899', 34, 23.5);
    doc.text('Izin Operasional: IZIN-KLINIK-VET/DKPKP/2024/0981 | NPWP: 01.234.567.8-012.000', 34, 27);

    // Operational Scope Badge on Top-Right
    doc.setFillColor(246, 241, 230);
    doc.setDrawColor(225, 214, 190);
    doc.roundedRect(pageWidth - 62, 12, 48, 14, 2, 2, 'FD');
    doc.setTextColor(184, 144, 90);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LINGKUP GUDANG:', pageWidth - 38, 16.5, { align: 'center' });
    doc.setTextColor(27, 42, 69);
    doc.setFontSize(7.5);
    doc.text(warehouseFilter === 'Semua' ? 'Seluruh Gudang & Depo' : warehouseFilter, pageWidth - 38, 22, { align: 'center' });

    // Dual Divider
    doc.setDrawColor(27, 42, 69);
    doc.setLineWidth(0.7);
    doc.line(14, 30.5, pageWidth - 14, 30.5);
    doc.setDrawColor(184, 144, 90);
    doc.setLineWidth(0.3);
    doc.line(14, 31.6, pageWidth - 14, 31.6);

    // Title Banner
    doc.setFillColor(27, 42, 69);
    doc.roundedRect(14, 34, pageWidth - 28, 14, 2, 2, 'F');

    doc.setTextColor(217, 185, 138);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN MANAJEMEN EKSEKUTIF • DIVISI LOGISTIK & FARMASI', 19, 39);

    doc.setTextColor(255, 253, 249);
    doc.setFontSize(10);
    doc.text('LAPORAN STATUS STOK & ANALISIS TREN DEPRESI 30 HARI', 19, 44.5);

    doc.setTextColor(217, 185, 138);
    doc.setFontSize(7.5);
    doc.text(`Periode: ${periodMonth} ${periodYear}`, pageWidth - 19, 39, { align: 'right' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`No. Ref: ${docRef} | Tanggal Cetak: ${printedDate}`, pageWidth - 19, 44.5, { align: 'right' });
  };

  drawHeader();

  // 2. Executive Management Summary KPI Cards (6 Key Indicators)
  let curY = 52;
  const cardWidth = (pageWidth - 28 - 10) / 3; // 3 columns
  const cardHeight = 16.5;

  const kpis = [
    {
      title: 'TOTAL VALUASI ASET STOK',
      value: formatRupiah(summary.totalInventoryValuation),
      sub: `${summary.totalSkus} SKU terdaftar aktif`,
      bgColor: [254, 253, 250],
      borderColor: [225, 214, 190],
      valColor: [27, 42, 69]
    },
    {
      title: 'STOK DI BAWAH SAFETY LEVEL',
      value: `${summary.itemsBelowSafetyStockCount} Item Menipis`,
      sub: `${summary.criticalUrgencyCount} Kritis • ${summary.highUrgencyCount} Perlu Reorder`,
      bgColor: summary.itemsBelowSafetyStockCount > 0 ? [254, 242, 242] : [240, 253, 244],
      borderColor: summary.itemsBelowSafetyStockCount > 0 ? [252, 165, 165] : [134, 239, 172],
      valColor: summary.itemsBelowSafetyStockCount > 0 ? [185, 28, 28] : [21, 128, 61]
    },
    {
      title: 'KONSUMSI 30 HARI (BURN RATE)',
      value: `${formatNumber(summary.totalUnitsDepleted30d)} Unit`,
      sub: `Laju Rata-rata: ${summary.avgHospitalDailyBurn} unit/hari`,
      bgColor: [254, 253, 250],
      borderColor: [225, 214, 190],
      valColor: [27, 42, 69]
    },
    {
      title: 'INDEKS KESEHATAN INVENTARIS',
      value: `${summary.stockHealthScore}%`,
      sub: summary.stockHealthScore >= 80 ? 'Status Sangat Baik' : summary.stockHealthScore >= 60 ? 'Perlu Pengawasan' : 'Tindakan Mendesak',
      bgColor: summary.stockHealthScore >= 75 ? [240, 253, 244] : [255, 251, 235],
      borderColor: summary.stockHealthScore >= 75 ? [134, 239, 172] : [253, 230, 138],
      valColor: summary.stockHealthScore >= 75 ? [21, 128, 61] : [180, 83, 9]
    },
    {
      title: 'ESTIMASI ANGGARAN PO AI',
      value: formatRupiah(summary.totalSuggestedPoCost),
      sub: `Untuk ${summary.totalSuggestedPoUnits} unit kebutuhan reorder`,
      bgColor: [254, 253, 250],
      borderColor: [225, 214, 190],
      valColor: [184, 144, 90]
    },
    {
      title: 'TARGET BUFFER SAFETY COVERAGE',
      value: '25 Hari Pasokan',
      sub: 'Service Level Proteksi 95% (Z=1.65)',
      bgColor: [254, 253, 250],
      borderColor: [225, 214, 190],
      valColor: [27, 42, 69]
    }
  ];

  kpis.forEach((kpi, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 14 + col * (cardWidth + 5);
    const y = curY + row * (cardHeight + 4);

    doc.setFillColor(kpi.bgColor[0], kpi.bgColor[1], kpi.bgColor[2]);
    doc.setDrawColor(kpi.borderColor[0], kpi.borderColor[1], kpi.borderColor[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, cardWidth, cardHeight, 1.8, 1.8, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 102, 86);
    doc.text(kpi.title, x + 3.5, y + 4.5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.valColor[0], kpi.valColor[1], kpi.valColor[2]);
    doc.text(kpi.value, x + 3.5, y + 9.5);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 102, 86);
    doc.text(kpi.sub, x + 3.5, y + 13.5);
  });

  curY += (cardHeight + 4) * 2 + 3;

  // 3. Section Title: TABEL 1 - STATUS STOK TERKINI & VALUASI
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 42, 69);
  doc.text('1. STATUS STOK TERKINI & VALUASI ASET INVENTARIS', 14, curY);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 102, 86);
  doc.text(`Kategori: ${categoryFilter} | Gudang: ${warehouseFilter} | Total Item: ${summary.totalSkus}`, pageWidth - 14, curY, { align: 'right' });
  curY += 2.5;

  const stockTableData = summary.items.map((item, idx) => {
    const totalValuation = item.currentStock * item.purchasePrice;
    let statusLabel = 'AMAN';
    if (item.currentStock <= 0) statusLabel = 'HABIS';
    else if (item.currentStock <= item.safetyStock) statusLabel = 'DI BAWAH SAFETY';
    else if (item.currentStock <= item.reorderPoint) statusLabel = 'PERLU REORDER';

    return [
      (idx + 1).toString(),
      `${item.name}\nSKU: ${item.sku}`,
      `${item.category}\n${item.warehouse}`,
      `${item.currentStock} ${item.unit}`,
      `${item.safetyStock} ${item.unit}`,
      formatRupiah(item.purchasePrice),
      formatRupiah(totalValuation),
      statusLabel
    ];
  });

  autoTable(doc, {
    startY: curY,
    head: [
      ['No', 'Nama Barang & SKU', 'Kategori / Gudang', 'Stok Ada', 'Safety Stock', 'Harga Beli', 'Nilai Valuasi', 'Status']
    ],
    body: stockTableData,
    theme: 'plain',
    headStyles: {
      fillColor: [27, 42, 69],
      textColor: [255, 253, 249],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [34, 36, 43],
      cellPadding: 1.8,
      lineColor: [225, 214, 190],
      lineWidth: 0.15
    },
    alternateRowStyles: {
      fillColor: [250, 247, 240]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { cellWidth: 42 },
      2: { cellWidth: 26 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text === 'HABIS') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 226, 226];
        } else if (text === 'DI BAWAH SAFETY') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (text === 'PERLU REORDER') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
        } else {
          data.cell.styles.textColor = [21, 128, 61];
        }
      }
    },
    margin: { left: 14, right: 14 }
  });

  let lastTableY = (doc as any).lastAutoTable?.finalY || curY + 40;

  // 4. Section Title: TABEL 2 - ANALISIS TREN DEPRESI 30 HARI & VELOCITY
  if (includeDepletionAnalysis) {
    // Check page break necessity
    if (lastTableY > pageHeight - 75) {
      doc.addPage();
      drawHeader();
      lastTableY = 52;
    } else {
      lastTableY += 7;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 69);
    doc.text('2. ANALISIS TREN DEPRESI STOK 30 HARI & KECEPATAN PENGELUARAN', 14, lastTableY);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 102, 86);
    doc.text('Menampilkan laju konsumsi harian (Burn Rate), estimasi sisa hari pasokan, dan probabilitas risiko kehabisan stok', 14, lastTableY + 4);
    lastTableY += 6;

    const depletionTableData = summary.items.map((item, idx) => {
      return [
        (idx + 1).toString(),
        `${item.name}\n[${item.sku}]`,
        `${Math.round(item.startStock30d)} ${item.unit}`,
        `${item.currentStock} ${item.unit}`,
        `${item.totalDepleted30d} ${item.unit}`,
        `${item.avgDailyBurn} ${item.unit}/hari`,
        `${item.depletionPercent30d}%`,
        item.stockoutHorizonDays > 90 ? '> 90 Hari' : `${item.stockoutHorizonDays} Hari`,
        `${item.stockoutRiskPercent}%`,
        item.urgency.toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: lastTableY,
      head: [
        ['No', 'Nama & SKU', 'Stok 30H Lalu', 'Stok Kini', 'Total Keluar', 'Burn Rate', '% Depresi', 'Sisa Pasokan', 'Risiko', 'Urgensi']
      ],
      body: depletionTableData,
      theme: 'plain',
      headStyles: {
        fillColor: [184, 144, 90], // Gold
        textColor: [27, 42, 69],
        fontStyle: 'bold',
        fontSize: 6.2,
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 6.0,
        textColor: [34, 36, 43],
        cellPadding: 1.8,
        lineColor: [225, 214, 190],
        lineWidth: 0.15
      },
      alternateRowStyles: {
        fillColor: [250, 247, 240]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 6 },
        1: { cellWidth: 42 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 14 },
        7: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
        8: { halign: 'center', cellWidth: 14 },
        9: { halign: 'center', fontStyle: 'bold', cellWidth: 17 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 9) {
          const val = String(data.cell.raw);
          if (val === 'KRITIS') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 226, 226];
          } else if (val === 'TINGGI') {
            data.cell.styles.textColor = [194, 65, 12];
            data.cell.styles.fillColor = [255, 237, 213];
          } else if (val === 'WASPADA') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [254, 243, 199];
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    lastTableY = (doc as any).lastAutoTable?.finalY || lastTableY + 40;
  }

  // 5. Section Title: TABEL 3 - REKOMENDASI PEMESANAN PO BERBASIS AI
  if (includeAiPoSuggestions) {
    if (lastTableY > pageHeight - 85) {
      doc.addPage();
      drawHeader();
      lastTableY = 52;
    } else {
      lastTableY += 7;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 69);
    doc.text('3. REKOMENDASI KUANTITAS PURCHASE ORDER (PO) BERBASIS AI', 14, lastTableY);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 102, 86);
    doc.text('Formula kalkulasi: Defisit Safety Stock + Target Siklus Pasokan 25 Hari berdasarkan laju burn rate 30 hari', 14, lastTableY + 4);
    lastTableY += 6;

    // Filter items that require reorder or are in watch list
    const poCandidates = summary.items.filter((i) => i.isReorderNeeded || i.suggestedPoQty > 0);

    const poTableData = poCandidates.map((item, idx) => {
      return [
        (idx + 1).toString(),
        `${item.name}\nSKU: ${item.sku}`,
        `${item.safetyStock} ${item.unit}`,
        `${item.reorderPoint} ${item.unit}`,
        `${item.currentStock} ${item.unit}`,
        `${item.suggestedPoQty} ${item.unit}`,
        formatRupiah(item.suggestedPoCost),
        item.supplierName,
        item.aiRationale
      ];
    });

    autoTable(doc, {
      startY: lastTableY,
      head: [
        ['No', 'Item Rekomendasi & SKU', 'Safety Stock', 'Titik ROP', 'Stok Ada', 'Saran Qty PO', 'Estimasi Biaya', 'Pemasok', 'Dasar Pertimbangan AI & Klinis']
      ],
      body: poTableData.length > 0 ? poTableData : [['-', 'Semua stok dalam batas aman', '-', '-', '-', '0', 'Rp 0', '-', 'Tidak diperlukan pengadaan darurat saat ini.']],
      theme: 'plain',
      headStyles: {
        fillColor: [27, 42, 69],
        textColor: [217, 185, 138],
        fontStyle: 'bold',
        fontSize: 6.2,
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 6.0,
        textColor: [34, 36, 43],
        cellPadding: 1.8,
        lineColor: [225, 214, 190],
        lineWidth: 0.15
      },
      alternateRowStyles: {
        fillColor: [250, 247, 240]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 6 },
        1: { cellWidth: 32 },
        2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'center', fontStyle: 'bold', textColor: [184, 144, 90], cellWidth: 16 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
        7: { cellWidth: 22 },
        8: { cellWidth: 44 }
      },
      margin: { left: 14, right: 14 }
    });

    lastTableY = (doc as any).lastAutoTable?.finalY || lastTableY + 40;
  }

  // 6. Management Notes & Executive Review Remarks
  if (lastTableY > pageHeight - 55) {
    doc.addPage();
    drawHeader();
    lastTableY = 52;
  } else {
    lastTableY += 6;
  }

  doc.setFillColor(254, 253, 250);
  doc.setDrawColor(225, 214, 190);
  doc.roundedRect(14, lastTableY, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(27, 42, 69);
  doc.text('CATATAN & INSTRUKSI DIREKSI MANAJEMEN:', 18, lastTableY + 4.5);

  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 102, 86);
  const splitNotes = doc.splitTextToSize(managementNotes, pageWidth - 36);
  doc.text(splitNotes, 18, lastTableY + 8.5);

  lastTableY += 21;

  // 7. Executive Signatures Block (3-Tier Corporate Sign-Off)
  if (includeSignatures) {
    if (lastTableY > pageHeight - 42) {
      doc.addPage();
      drawHeader();
      lastTableY = 52;
    }

    const signBoxWidth = (pageWidth - 28 - 12) / 3;
    const signBoxHeight = 30;

    const signers = [
      {
        role: 'DIBUAT OLEH (LOGISTIK)',
        name: preparedByName,
        title: preparedByTitle
      },
      {
        role: 'DITINJAU OLEH (OPERASIONAL)',
        name: reviewedByName,
        title: reviewedByTitle
      },
      {
        role: 'DISETUJUI OLEH (DIREKSI)',
        name: approvedByName,
        title: approvedByTitle
      }
    ];

    signers.forEach((s, idx) => {
      const x = 14 + idx * (signBoxWidth + 6);

      doc.setFillColor(254, 253, 250);
      doc.setDrawColor(225, 214, 190);
      doc.roundedRect(x, lastTableY, signBoxWidth, signBoxHeight, 2, 2, 'FD');

      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 102, 86);
      doc.text(s.role, x + signBoxWidth / 2, lastTableY + 4.5, { align: 'center' });

      // Simulated Signature Line
      doc.setDrawColor(225, 214, 190);
      doc.line(x + 6, lastTableY + 20, x + signBoxWidth - 6, lastTableY + 20);

      // Digital Stamp Seal Graphic for Director
      if (idx === 2) {
        doc.setDrawColor(184, 144, 90);
        doc.circle(x + signBoxWidth / 2, lastTableY + 14, 4.5, 'S');
        doc.setFontSize(4.5);
        doc.setTextColor(184, 144, 90);
        doc.text('VERIFIED', x + signBoxWidth / 2, lastTableY + 14.5, { align: 'center' });
      }

      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 42, 69);
      doc.text(s.name, x + signBoxWidth / 2, lastTableY + 24, { align: 'center' });

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 102, 86);
      doc.text(s.title, x + signBoxWidth / 2, lastTableY + 27.5, { align: 'center' });
    });
  }

  // 8. Footer & Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom accent bar
    doc.setFillColor(27, 42, 69);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

    doc.setFontSize(6.0);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(217, 185, 138);
    doc.text(
      `PetCare Veterinary Hospital ERP • Dokumen Rahasia Internal Manajemen • Hal ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 1.8,
      { align: 'center' }
    );
  }

  return doc;
}
