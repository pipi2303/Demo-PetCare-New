const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'img');
const BASE_URL = 'http://localhost:3000';

async function shot(page, name) {
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT_DIR, name), type: 'png' });
  console.log('saved', name);
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

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1600, height: 1000 }
  });
  const page = await browser.newPage();

  // 1. Login / Landing screen
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  await shot(page, '01_login.png');

  // Login as owner klinik (demo seed account, see server/authService.ts DEFAULT_PASSWORD)
  await page.evaluate(() => {
    const input = document.querySelector('input[type="email"], input[placeholder*="Email"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'owner.klinik@petcare.id');
      input.dispatchEvent(new Event('input', { bubbles: true }));
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
  await new Promise((r) => setTimeout(r, 1500));
  await shot(page, '02_dashboard.png');

  // Sidebar navigation targets: [label, filename]
  const navTargets = [
    ['Booking & Antrian', '03_booking.png'],
    ['Rekam Medis (EMR)', '04_rekam_medis.png'],
    ['Apotek & Lab', '05_apotek.png'],
    ['Vaksinasi & Paspor', '06_vaksinasi.png'],
    ['Stok & Gudang', '07_stok_gudang.png'],
    ['Billing & Kasir', '08_billing.png'],
  ];

  for (const [label, filename] of navTargets) {
    const clicked = await clickText(page, label);
    if (clicked) {
      await new Promise((r) => setTimeout(r, 1200));
      await shot(page, filename);
    } else {
      console.log('nav not found:', label);
    }
  }

  // Lock screen with PIN/password toggle
  await clickText(page, 'Owner Klinik');
  await new Promise((r) => setTimeout(r, 400));
  const lockClicked = await clickText(page, 'Kunci Sekarang');
  if (lockClicked) {
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, '09_lockscreen_pin.png');
    await clickText(page, 'Kata Sandi');
    await new Promise((r) => setTimeout(r, 400));
    await shot(page, '10_lockscreen_password.png');
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
