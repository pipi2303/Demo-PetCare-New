const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'shots_roles');
fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCOUNTS = [
  { email: 'ananda@petcare.id', expectName: 'drh. Ananda Putri', role: 'dokter' },
  { email: 'ani@petcare.id', expectName: 'Ani Lestari', role: 'kasir' },
  { email: 'binta@petcare.id', expectName: 'Binta Amalia', role: 'groomer' },
  { email: 'admin@petcare.id', expectName: 'Admin Sistem', role: 'admin' },
  { email: 'owner.petshop@petcare.id', expectName: 'Rendra Pratama', role: 'owner_petshop' },
];
const PASSWORD = 'petcare123';

const CRASH_MARKERS = [
  'Something went wrong',
  'Terjadi kesalahan',
  'Cannot read propert',
  'is not a function',
  'is not defined',
  'Unexpected token',
  'ChunkLoadError',
];

async function openUserDropdown(page) {
  // Header.tsx has TWO [data-dropdown-container] wrappers: notifications bell
  // (1st in DOM) and the user-role badge (2nd) — must target the 2nd one.
  return page.evaluate(() => {
    const containers = document.querySelectorAll('[data-dropdown-container="true"]');
    const btn = containers[1]?.querySelector('button');
    if (btn) { btn.click(); return true; }
    return false;
  });
}

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

async function getSidebarLabels(page) {
  const raw = await page.evaluate(() => {
    const nav = document.querySelector('aside');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('button')).map((b) => b.textContent.trim()).filter(Boolean);
  });
  // Drop group-header toggle buttons (all-caps titles like "BERANDA", "SISTEM")
  // and any stray numeric-only text (low-stock badge count rendered alone).
  return raw.filter((t) => t.length > 1 && !/^\d+$/.test(t) && t !== t.toUpperCase());
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1000 },
  });
  const page = await browser.newPage();

  let currentErrors = [];
  let current4xx = [];
  page.on('console', (msg) => { if (msg.type() === 'error') currentErrors.push(msg.text().slice(0, 300)); });
  page.on('pageerror', (err) => currentErrors.push('PAGEERROR: ' + String(err).slice(0, 300)));
  page.on('response', (res) => {
    if (res.status() >= 400 && res.url().includes('/api/')) current4xx.push(`${res.status()} ${res.url().replace(BASE_URL, '')}`);
  });

  const allReports = {};

  for (const acc of ACCOUNTS) {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    await openUserDropdown(page);
    await new Promise((r) => setTimeout(r, 300));
    const opened = await clickText(page, 'Buka Layar Login & Otorisasi');
    if (!opened) {
      console.error(`!!! Could not open login screen for ${acc.email}`);
    }
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate((email) => {
      const input = document.querySelector('#login-input-email');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, email);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, acc.email);
    await page.evaluate((pw) => {
      const input = document.querySelector('input[type="password"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, pw);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, PASSWORD);
    await clickText(page, 'Masuk ke Dashboard ERP');
    await new Promise((r) => setTimeout(r, 1500));

    const bodyText = await page.evaluate(() => document.body.innerText);
    const loginOk = bodyText.includes(acc.expectName);
    const sidebarLabels = await getSidebarLabels(page);

    const roleReport = {
      account: acc.email,
      role: acc.role,
      loginOk,
      sidebarModuleCount: sidebarLabels.length,
      modules: [],
    };

    if (!loginOk) {
      roleReport.loginBodySnippet = bodyText.slice(0, 300);
      allReports[acc.role] = roleReport;
      await page.screenshot({ path: path.join(OUT_DIR, `${acc.role}_LOGIN_FAIL.png`) });
      continue;
    }

    for (const label of sidebarLabels) {
      currentErrors = [];
      current4xx = [];
      const clicked = await clickText(page, label);
      await new Promise((r) => setTimeout(r, 900));
      let txt = '';
      try { txt = await page.evaluate(() => document.body.innerText); } catch (e) {}
      const crash = CRASH_MARKERS.filter((m) => txt.includes(m));
      const entry = { label, clicked, errors: [...currentErrors], api4xx5xx: [...current4xx], bodyChars: txt.length, crashMarkers: crash };
      roleReport.modules.push(entry);
      if (!clicked || crash.length || entry.errors.length || entry.api4xx5xx.length || txt.length < 200) {
        try { await page.screenshot({ path: path.join(OUT_DIR, `${acc.role}_${label.replace(/[^a-z0-9]/gi, '_')}.png`) }); } catch (e) {}
      }
    }

    allReports[acc.role] = roleReport;

    // logout for next account
    await openUserDropdown(page);
    await new Promise((r) => setTimeout(r, 300));
    await clickText(page, 'Keluar dari Akun (Logout)');
    await new Promise((r) => setTimeout(r, 500));
  }

  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'report_roles.json'), JSON.stringify(allReports, null, 2));

  console.log('\n=== MULTI-ROLE SMOKE TEST SUMMARY ===');
  for (const role of Object.keys(allReports)) {
    const r = allReports[role];
    if (!r.loginOk) {
      console.log(`[LOGIN-FAIL] ${role} (${r.account})`);
      continue;
    }
    console.log(`\n-- ${role} (${r.account}) — ${r.sidebarModuleCount} sidebar items --`);
    for (const m of r.modules) {
      const flags = [];
      if (!m.clicked) flags.push('NOT-FOUND');
      if (m.crashMarkers.length) flags.push('CRASH:' + m.crashMarkers.join(','));
      if (m.errors.length) flags.push(`console-errors:${m.errors.length}`);
      if (m.api4xx5xx.length) flags.push(`api-errors:${m.api4xx5xx.join(';')}`);
      if (m.bodyChars < 200) flags.push('THIN');
      console.log(`  [${flags.length ? 'FLAG' : 'OK  '}] ${m.label.padEnd(28)} ${flags.join(' | ')}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
