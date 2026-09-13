const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'shots');
fs.mkdirSync(OUT_DIR, { recursive: true });

// All sidebar nav modules with their visible labels (from src/components/layout/Sidebar.tsx)
const MODULES = [
  ['dashboard', 'Dashboard Utama'],
  ['masterData', 'Pelanggan & Master'],
  ['booking', 'Booking & Antrian'],
  ['grooming', 'Grooming Salon'],
  ['petHotel', 'Pet Hotel Boarding'],
  ['telehealth', 'Telehealth Video'],
  ['ambulance', 'Ambulance Rescue'],
  ['clinic', 'Pemeriksaan Klinik'],
  ['emr', 'Rekam Medis (EMR)'],
  ['vaccination', 'Vaksinasi & Paspor'],
  ['pharmacy', 'Apotek & Lab'],
  ['carePlan', 'Rencana Care Plan'],
  ['eForms', 'E-Form Consent'],
  ['patientGallery', 'Galeri Foto Pasien'],
  ['petShop', 'Pet Shop (POS)'],
  ['inventory', 'Stok & Gudang'],
  ['purchasing', 'Purchasing (PO)'],
  ['billing', 'Billing & Kasir'],
  ['finance', 'Buku Kas & Keuangan'],
  ['hrm', 'SDM & Shift Kerja'],
  ['crm', 'CRM & Member Loyalty'],
  ['reports', 'Laporan & Eksekutif'],
  ['aiAssistant', 'AI Vet Assistant'],
  ['notifications', 'Notifikasi'],
  ['systemGroups', 'Grup & Hak Akses'],
  ['branches', 'Cabang Klinik'],
  ['auditLog', 'Audit Log Sistem'],
  ['settings', 'Pengaturan Sistem'],
  ['tenantAdmin', 'SaaS Superadmin'],
];

const CRASH_MARKERS = [
  'Something went wrong',
  'Terjadi kesalahan',
  'Cannot read propert',
  'is not a function',
  'is not defined',
  'Unexpected token',
  'ChunkLoadError',
];

async function clickText(page, text) {
  const el = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button, a, div, span'));
    return all.find((e) => e.textContent && e.textContent.trim() === t && e.offsetParent !== null);
  }, text);
  const elm = el.asElement();
  if (elm) {
    await elm.click();
    return true;
  }
  return false;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1000 }
  });
  const page = await browser.newPage();

  const report = [];
  let currentErrors = [];
  let current404s = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') currentErrors.push(msg.text().slice(0, 300));
  });
  page.on('pageerror', (err) => {
    currentErrors.push('PAGEERROR: ' + String(err).slice(0, 300));
  });
  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && url.includes('/api/')) {
      current404s.push(`${status} ${url.replace(BASE_URL, '')}`);
    }
  });

  // The app renders a full "browse without login" demo dashboard by default
  // (no auth required) — the real LoginScreen only opens when explicitly
  // triggered from the header user-dropdown's "Buka Layar Login & Otorisasi"
  // button. Open it, then log in as superadmin (has access to every module
  // per modulePermissions.ts) so the sidebar shows the complete module set.
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await clickText(page, 'Owner Klinik');
  await new Promise((r) => setTimeout(r, 300));
  const openedLogin = await clickText(page, 'Buka Layar Login & Otorisasi');
  if (!openedLogin) {
    console.error('!!! Could not find "Buka Layar Login & Otorisasi" button.');
  }
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const input = document.querySelector('#login-input-email');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'superadmin@petcare.co.id');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      console.error('LOGIN EMAIL INPUT NOT FOUND');
    }
  });
  await page.evaluate(() => {
    const input = document.querySelector('input[type="password"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'petcare123');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await clickText(page, 'Masuk ke Dashboard ERP');
  await new Promise((r) => setTimeout(r, 1800));

  const loginErrors = [...currentErrors];
  const loginText = await page.evaluate(() => document.body.innerText);
  if (!loginText.includes('Super Admin Multi-Tenant')) {
    console.error('!!! LOGIN AS SUPERADMIN FAILED — body does not contain "Super Admin Multi-Tenant". Aborting.');
    console.error(loginText.slice(0, 500));
    await browser.close();
    process.exit(1);
  }
  report.push({
    module: '_login',
    label: 'Login (superadmin)',
    clicked: true,
    errors: loginErrors,
    api4xx5xx: [...current404s],
    bodyChars: loginText.length,
    crashMarkers: CRASH_MARKERS.filter((m) => loginText.includes(m)),
  });
  currentErrors = [];
  current404s = [];

  for (const [id, label] of MODULES) {
    currentErrors = [];
    current404s = [];
    const clicked = await clickText(page, label);
    await new Promise((r) => setTimeout(r, 1000));
    let bodyText = '';
    try {
      bodyText = await page.evaluate(() => document.body.innerText);
    } catch (e) {
      bodyText = '';
    }
    const foundCrash = CRASH_MARKERS.filter((m) => bodyText.includes(m));
    const entry = {
      module: id,
      label,
      clicked,
      errors: [...currentErrors],
      api4xx5xx: [...current404s],
      bodyChars: bodyText.length,
      crashMarkers: foundCrash,
    };
    report.push(entry);
    // Screenshot only if something looks off, to keep output small
    if (!clicked || foundCrash.length > 0 || entry.errors.length > 0 || bodyText.length < 200) {
      try {
        await page.screenshot({ path: path.join(OUT_DIR, `${id}.png`) });
      } catch (e) {}
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n=== SMOKE TEST SUMMARY ===');
  for (const r of report) {
    const flags = [];
    if (!r.clicked) flags.push('NOT-FOUND-IN-SIDEBAR');
    if (r.crashMarkers.length) flags.push('CRASH:' + r.crashMarkers.join(','));
    if (r.errors.length) flags.push(`console-errors:${r.errors.length}`);
    if (r.api4xx5xx.length) flags.push(`api-errors:${r.api4xx5xx.length}`);
    if (r.bodyChars < 200) flags.push('THIN-CONTENT');
    console.log(`[${flags.length ? 'FLAG' : 'OK  '}] ${r.module.padEnd(16)} ${r.label.padEnd(28)} ${flags.join(' | ')}`);
  }
  console.log('\nFull JSON report: report.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
