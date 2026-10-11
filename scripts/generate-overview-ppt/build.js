const pptxgen = require('pptxgenjs');
const path = require('path');

const IMG = (f) => path.join(__dirname, 'img', f);

// Brand palette (from the PetCare-New UI)
const NAVY = '1B2A45';
const NAVY_DARK = '101A2C';
const NAVY_DEEP = '0B1322';
const GOLD = 'B8905A';
const GOLD_DARK = '9E7848';
const CREAM = 'FFFDF9';
const CREAM_ALT = 'F6F1E6';
const BORDER = 'E1D6BE';
const TEXT_MUTED = '6B6656';
const GREEN = '2E7D5B';

const pptx = new pptxgen();
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'WIDE';
pptx.author = 'PetCare ERP';
pptx.company = 'PetCare Enterprise Cloud';
pptx.title = 'PetCare ERP - Overview';

const FONT = 'Georgia';
const FONT_BODY = 'Calibri';

function bgSlide(slide, color = CREAM) {
  slide.background = { color };
}

function footer(slide, pageLabel) {
  slide.addShape('rect', { x: 0, y: 7.16, w: 13.333, h: 0.34, fill: { color: NAVY_DARK } });
  slide.addText('PetCare ERP  •  Sistem Manajemen Klinik, RS Hewan & Pet Shop Terpadu', {
    x: 0.5, y: 7.16, w: 9, h: 0.34, fontFace: FONT_BODY, fontSize: 9, color: CREAM_ALT, valign: 'middle'
  });
  slide.addText(pageLabel, {
    x: 11.5, y: 7.16, w: 1.4, h: 0.34, fontFace: FONT_BODY, fontSize: 9, color: GOLD, align: 'right', valign: 'middle', bold: true
  });
}

function sectionHeader(slide, eyebrow, title) {
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 1.3, fill: { color: NAVY_DARK } });
  slide.addShape('rect', { x: 0, y: 1.3, w: 13.333, h: 0.04, fill: { color: GOLD } });
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.6, y: 0.2, w: 10, h: 0.32, fontFace: FONT_BODY, fontSize: 11, color: GOLD, bold: true, charSpacing: 2
  });
  slide.addText(title, {
    x: 0.6, y: 0.5, w: 12, h: 0.7, fontFace: FONT, fontSize: 28, color: CREAM, bold: true
  });
}

// ---------- Slide 1: Title ----------
{
  const s = pptx.addSlide();
  s.background = { color: NAVY_DARK };
  // Decorative bar
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } });
  s.addShape('rect', { x: 0.9, y: 2.55, w: 0.9, h: 0.9, fill: { color: GOLD }, rectRadius: 0.18, shadow: { type: 'outer', color: '000000', opacity: 0.35, blur: 8, offset: 3, angle: 90 } });
  s.addText('P', { x: 0.9, y: 2.55, w: 0.9, h: 0.9, fontFace: FONT, fontSize: 34, bold: true, color: NAVY_DARK, align: 'center', valign: 'middle' });

  s.addText('PETCARE ENTERPRISE CLOUD', {
    x: 2.1, y: 2.6, w: 9, h: 0.35, fontFace: FONT_BODY, fontSize: 13, color: GOLD, bold: true, charSpacing: 3
  });
  s.addText('PetCare ERP', {
    x: 0.9, y: 3.05, w: 11, h: 1.3, fontFace: FONT, fontSize: 54, color: CREAM, bold: true
  });
  s.addText('Sistem Manajemen Klinik, Rumah Sakit Hewan & Pet Shop Terpadu', {
    x: 0.9, y: 4.15, w: 10.5, h: 0.55, fontFace: FONT_BODY, fontSize: 18, color: CREAM_ALT
  });
  s.addText('Fitur  •  Alur Proses  •  Tampilan Aplikasi', {
    x: 0.9, y: 4.75, w: 10.5, h: 0.4, fontFace: FONT_BODY, fontSize: 13, color: GOLD, italic: true
  });

  s.addShape('line', { x: 0.9, y: 6.55, w: 4.2, h: 0, line: { color: '2A3A57', width: 1 } });
  s.addText('Rekam Medis Elektronik  •  Apotek & Farmasi  •  Booking & Antrian  •  Kasir POS  •  Multi-Cabang', {
    x: 0.9, y: 6.65, w: 11, h: 0.5, fontFace: FONT_BODY, fontSize: 11, color: '8B93A6'
  });
}

// ---------- Slide 2: Ringkasan ----------
{
  const s = pptx.addSlide();
  bgSlide(s);
  sectionHeader(s, 'Ringkasan', 'Satu Platform untuk Seluruh Operasional Klinik');
  s.addText(
    'PetCare ERP menyatukan layanan medis, farmasi, logistik, dan keuangan dalam satu sistem — dirancang untuk klinik hewan, rumah sakit hewan, dan pet shop yang beroperasi lintas cabang.',
    { x: 0.6, y: 1.65, w: 12.1, h: 0.7, fontFace: FONT_BODY, fontSize: 14, color: NAVY, italic: true }
  );

  const stats = [
    ['28+', 'Modul Operasional'],
    ['4', 'Model Kepemilikan Tenant'],
    ['11', 'Peran & Level Akses'],
    ['100%', 'Data Tersimpan Otomatis'],
  ];
  const cardW = 2.85, gap = 0.25, startX = 0.6, y = 2.6, h = 1.5;
  stats.forEach((st, i) => {
    const x = startX + i * (cardW + gap);
    s.addShape('roundRect', { x, y, w: cardW, h, rectRadius: 0.12, fill: { color: CREAM_ALT }, line: { color: BORDER, width: 1 } });
    s.addText(st[0], { x, y: y + 0.18, w: cardW, h: 0.7, align: 'center', fontFace: FONT, fontSize: 30, bold: true, color: GOLD_DARK });
    s.addText(st[1], { x, y: y + 0.95, w: cardW, h: 0.45, align: 'center', fontFace: FONT_BODY, fontSize: 11, bold: true, color: NAVY });
  });

  const pillars = [
    ['Medis & Farmasi', 'Rekam medis elektronik (EMR), resep racikan, apotek, vaksinasi, & rencana perawatan.'],
    ['Layanan Pelanggan', 'Booking & antrian, telehealth video, ambulance rescue, dan kios check-in mandiri.'],
    ['Penjualan & Logistik', 'Kasir POS, stok & gudang, purchasing, hingga billing terintegrasi.'],
    ['Manajemen & Keamanan', 'Buku kas, SDM & shift, CRM, serta otentikasi multi-peran dengan PIN/QR/kata sandi.'],
  ];
  const pw = 2.85, py = 4.35, ph = 2.1;
  pillars.forEach((p, i) => {
    const x = startX + i * (pw + gap);
    s.addShape('roundRect', { x, y: py, w: pw, h: ph, rectRadius: 0.12, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addShape('rect', { x, y: py, w: pw, h: 0.06, fill: { color: GOLD } });
    s.addText(p[0], { x: x + 0.18, y: py + 0.22, w: pw - 0.36, h: 0.55, fontFace: FONT, fontSize: 14, bold: true, color: CREAM });
    s.addText(p[1], { x: x + 0.18, y: py + 0.8, w: pw - 0.36, h: 1.2, fontFace: FONT_BODY, fontSize: 10.5, color: CREAM_ALT, lineSpacingMultiple: 1.15 });
  });

  footer(s, '02');
}

// ---------- Slide 3: Fitur Utama (grid) ----------
{
  const s = pptx.addSlide();
  bgSlide(s);
  sectionHeader(s, 'Fitur Utama', 'Modul Lengkap per Area Operasional');

  const groups = [
    { title: 'Layanan', color: GOLD_DARK, items: ['Booking & Antrian (drag & drop)', 'Telehealth Video', 'Ambulance Rescue'] },
    { title: 'Medis & Farmasi', color: GREEN, items: ['Rekam Medis (EMR) 360°', 'Vaksinasi & Paspor Hewan', 'Apotek & Lab / Racikan', 'Rencana Care Plan', 'E-Form Consent', 'Galeri Foto Pasien'] },
    { title: 'Penjualan & Logistik', color: '4A6FA5', items: ['Stok & Gudang', 'Purchasing (PO)', 'Billing & Kasir POS'] },
    { title: 'Manajemen', color: '8B5FA6', items: ['Buku Kas & Keuangan', 'SDM & Shift Kerja', 'CRM & Broadcast WA', 'Tenant & Cabang'] },
    { title: 'Keamanan & Akses', color: 'B34D4D', items: ['Login Password / PIN / QR Shift', 'Lock Aplikasi Otomatis (idle)', 'Unlock via PIN atau Kata Sandi', 'Ganti PIN Mandiri'] },
    { title: 'Data Master', color: '3D7A7A', items: ['Pelanggan & Master Data', 'Multi-Cabang & Multi-Tenant'] },
  ];

  const cols = 3, cw = 4.0, ch = 2.45, gx = 0.15, gy = 0.15, startX = 0.5, startY = 1.65;
  groups.forEach((g, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (cw + gx), y = startY + row * (ch + gy);
    s.addShape('roundRect', { x, y, w: cw, h: ch, rectRadius: 0.1, fill: { color: CREAM_ALT }, line: { color: BORDER, width: 1 } });
    s.addShape('roundRect', { x: x + 0.18, y: y + 0.18, w: 0.22, h: 0.22, rectRadius: 0.06, fill: { color: g.color } });
    s.addText(g.title, { x: x + 0.5, y: y + 0.13, w: cw - 0.7, h: 0.35, fontFace: FONT, fontSize: 14, bold: true, color: NAVY });
    const bulletText = g.items.map((it) => ({ text: it, options: { bullet: { code: '2022', indent: 12 }, breakLine: true, color: NAVY, fontSize: 10.5 } }));
    s.addText(bulletText, { x: x + 0.28, y: y + 0.58, w: cw - 0.5, h: ch - 0.7, fontFace: FONT_BODY, lineSpacingMultiple: 1.12, valign: 'top' });
  });

  footer(s, '03');
}

// ---------- Slide 4: Alur Proses - Kunjungan Pasien ----------
{
  const s = pptx.addSlide();
  bgSlide(s);
  sectionHeader(s, 'Alur Proses', 'Perjalanan Kunjungan Pasien (Front Office → Farmasi → Kasir)');

  const steps = [
    ['1', 'Booking', 'Pemilik hewan booking janji temu online / kios check-in mandiri.'],
    ['2', 'Check-In', 'Smart QR Check-In & antrian poliklinik otomatis tercatat.'],
    ['3', 'Pemeriksaan', 'Dokter memeriksa & mencatat SOAP di modul Pemeriksaan Klinik.'],
    ['4', 'Rekam Medis', 'Riwayat, vaksin, lab & resep tersimpan di EMR 360° pasien.'],
    ['5', 'Apotek', 'Resep racikan diproses, stok otomatis berkurang di Gudang.'],
    ['6', 'Billing', 'Tagihan konsolidasi tindakan + obat diselesaikan di Kasir POS.'],
  ];

  const n = steps.length, gap = 0.18, boxW = (12.2 - gap * (n - 1)) / n, y = 2.1, boxH = 3.1, startX = 0.57;
  steps.forEach((st, i) => {
    const x = startX + i * (boxW + gap);
    s.addShape('roundRect', { x, y, w: boxW, h: boxH, rectRadius: 0.1, fill: { color: i % 2 === 0 ? NAVY : NAVY_DEEP } });
    s.addShape('ellipse', { x: x + boxW / 2 - 0.28, y: y + 0.22, w: 0.56, h: 0.56, fill: { color: GOLD } });
    s.addText(st[0], { x: x + boxW / 2 - 0.28, y: y + 0.22, w: 0.56, h: 0.56, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 20, bold: true, color: NAVY_DARK });
    s.addText(st[1], { x: x + 0.12, y: y + 0.95, w: boxW - 0.24, h: 0.4, align: 'center', fontFace: FONT, fontSize: 13, bold: true, color: CREAM });
    s.addText(st[2], { x: x + 0.14, y: y + 1.4, w: boxW - 0.28, h: boxH - 1.55, align: 'center', fontFace: FONT_BODY, fontSize: 9.5, color: CREAM_ALT, lineSpacingMultiple: 1.15 });
    if (i < n - 1) {
      s.addText('→', { x: x + boxW - 0.02, y: y + boxH / 2 - 0.25, w: gap + 0.3, h: 0.5, align: 'center', valign: 'middle', fontFace: FONT_BODY, fontSize: 18, bold: true, color: GOLD });
    }
  });

  s.addText('Setiap tahap tercatat real-time dan terhubung — tidak ada input data ganda antar modul.', {
    x: 0.6, y: 5.55, w: 12.1, h: 0.5, fontFace: FONT_BODY, fontSize: 12, italic: true, color: TEXT_MUTED
  });

  footer(s, '04');
}

// ---------- Slide 5: Alur Proses - Keamanan Sesi Staf ----------
{
  const s = pptx.addSlide();
  bgSlide(s);
  sectionHeader(s, 'Alur Proses', 'Otentikasi & Keamanan Sesi Staf');

  const steps = [
    ['Login', 'Masuk pakai kata sandi, PIN shift 4-digit, atau QR shift — sesuai kecepatan yang dibutuhkan staf.'],
    ['Sesi Aktif', 'Server memverifikasi peran & cabang; token sesi berlaku selama staf aktif memakai aplikasi.'],
    ['Idle → Terkunci', 'Tanpa aktivitas, aplikasi otomatis terkunci (Lock Screen) — data tetap aman di baliknya.'],
    ['Unlock Fleksibel', 'Staf memilih membuka kembali lewat PIN cepat ATAU kata sandi akun — sesuai preferensi.'],
  ];

  const y0 = 1.85, rowH = 1.15;
  steps.forEach((st, i) => {
    const y = y0 + i * rowH;
    s.addShape('roundRect', { x: 0.6, y, w: 0.5, h: 0.5, rectRadius: 0.25, fill: { color: GOLD } });
    s.addText(String(i + 1), { x: 0.6, y, w: 0.5, h: 0.5, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 16, bold: true, color: NAVY_DARK });
    if (i < steps.length - 1) {
      s.addShape('line', { x: 0.85, y: y + 0.5, w: 0, h: rowH - 0.5, line: { color: BORDER, width: 2, dashType: 'dash' } });
    }
    s.addShape('roundRect', { x: 1.35, y: y - 0.05, w: 10.6, h: 0.95, rectRadius: 0.08, fill: { color: CREAM_ALT }, line: { color: BORDER, width: 1 } });
    s.addText(st[0], { x: 1.6, y: y - 0.05, w: 2.6, h: 0.95, valign: 'middle', fontFace: FONT, fontSize: 14, bold: true, color: NAVY });
    s.addText(st[1], { x: 4.3, y: y - 0.05, w: 7.5, h: 0.95, valign: 'middle', fontFace: FONT_BODY, fontSize: 11, color: NAVY });
  });

  s.addShape('roundRect', { x: 0.6, y: y0 + 4 * rowH + 0.05, w: 11.35, h: 0.55, rectRadius: 0.08, fill: { color: NAVY_DARK } });
  s.addText('Baru:  toggle PIN / Kata Sandi di Lock Screen + fitur "Ganti PIN Saya" mandiri (digerbang kata sandi akun).', {
    x: 0.9, y: y0 + 4 * rowH + 0.05, w: 10.8, h: 0.55, valign: 'middle', fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: GOLD
  });

  footer(s, '05');
}

// ---------- Screenshot slides ----------
function screenshotSlide(pageNum, eyebrow, title, desc, imgFile, imgOpts = {}) {
  const s = pptx.addSlide();
  bgSlide(s);
  sectionHeader(s, eyebrow, title);
  s.addText(desc, { x: 0.6, y: 1.62, w: 12.1, h: 0.5, fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_MUTED, italic: true });

  const frameX = 0.9, frameY = 2.25, frameW = 11.55, frameH = 4.75;
  s.addShape('roundRect', { x: frameX - 0.06, y: frameY - 0.06, w: frameW + 0.12, h: frameH + 0.12, rectRadius: 0.08, fill: { color: NAVY_DARK }, shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 10, offset: 4, angle: 90 } });
  s.addImage(Object.assign({ path: IMG(imgFile), x: frameX, y: frameY, w: frameW, h: frameH, sizing: { type: 'contain', w: frameW, h: frameH } }, imgOpts));

  footer(s, pageNum);
  return s;
}

screenshotSlide('06', 'Tampilan Aplikasi', 'Dashboard Eksekutif', 'Ringkasan operasional real-time: antrian, pasien, omzet medis, dan tren pendapatan harian.', '02_dashboard.png');
screenshotSlide('07', 'Tampilan Aplikasi', 'Booking & Antrian Layanan', 'Kalender drag & drop, matrix dokter, dan kios check-in untuk seluruh layanan (poli, grooming, hotel, telehealth).', '03_booking.png');
screenshotSlide('08', 'Tampilan Aplikasi', 'Rekam Medis Elektronik (EMR)', 'Riwayat medis kronologis, SOAP dokter, alergi, dan timeline vaksinasi/bedah/lab dalam satu layar.', '04_rekam_medis.png');
screenshotSlide('09', 'Tampilan Aplikasi', 'Stok & Gudang', 'Pemantauan stok obat & barang lintas cabang, lengkap dengan status kadaluarsa dan permintaan restock.', '07_stok_gudang.png');
screenshotSlide('10', 'Tampilan Aplikasi', 'Billing & Kasir POS', 'Penyelesaian tagihan tindakan medis dan penjualan retail dalam satu alur kasir terpadu.', '08_billing.png');

// ---------- Slide 11: Keamanan (before/after pin/password) ----------
{
  const s = pptx.addSlide();
  bgSlide(s);
  sectionHeader(s, 'Tampilan Aplikasi', 'Lock Screen — Unlock via PIN atau Kata Sandi');
  s.addText('Fitur baru: staf dapat memilih metode unlock yang paling nyaman tanpa mengorbankan keamanan sesi.', {
    x: 0.6, y: 1.62, w: 12.1, h: 0.5, fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_MUTED, italic: true
  });

  const fw = 5.65, fh = 4.7, y = 2.25;
  const x1 = 0.9, x2 = 6.78;
  [ [x1, '09_lockscreen_pin.png', 'Mode PIN (cepat, 4-digit)'],
    [x2, '10_lockscreen_password.png', 'Mode Kata Sandi (alternatif)'] ].forEach(([x, img, label]) => {
    s.addShape('roundRect', { x: x - 0.06, y: y - 0.06, w: fw + 0.12, h: fh + 0.12, rectRadius: 0.08, fill: { color: NAVY_DEEP }, shadow: { type: 'outer', color: '000000', opacity: 0.25, blur: 10, offset: 4, angle: 90 } });
    s.addImage({ path: IMG(img), x, y, w: fw, h: fh, sizing: { type: 'contain', w: fw, h: fh } });
    s.addShape('roundRect', { x, y: y + fh + 0.14, w: fw, h: 0.4, rectRadius: 0.06, fill: { color: GOLD } });
    s.addText(label, { x, y: y + fh + 0.14, w: fw, h: 0.4, align: 'center', valign: 'middle', fontFace: FONT_BODY, fontSize: 11.5, bold: true, color: NAVY_DARK });
  });

  footer(s, '11');
}

// ---------- Slide 12: Closing ----------
{
  const s = pptx.addSlide();
  s.background = { color: NAVY_DARK };
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: GOLD } });
  s.addText('Terima Kasih', { x: 0.9, y: 2.7, w: 11, h: 1, fontFace: FONT, fontSize: 42, bold: true, color: CREAM });
  s.addText('PetCare ERP — Mengelola klinik, rumah sakit hewan, dan pet shop dalam satu platform terpadu.', {
    x: 0.9, y: 3.6, w: 10.5, h: 0.6, fontFace: FONT_BODY, fontSize: 15, color: CREAM_ALT
  });
  s.addShape('line', { x: 0.9, y: 4.5, w: 4.2, h: 0, line: { color: '2A3A57', width: 1 } });
  s.addText('info@intramedika.co.id', { x: 0.9, y: 4.65, w: 6, h: 0.4, fontFace: FONT_BODY, fontSize: 12, color: GOLD });
}

pptx.writeFile({ fileName: path.join(__dirname, 'PetCare_ERP_Overview.pptx') }).then((f) => {
  console.log('written:', f);
});
