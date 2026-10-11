# Smoke Test

Automated navigation smoke test against the running app at `http://localhost:3000`.
Drives a local Chrome install (via `puppeteer-core`, no bundled Chromium
download), logs in, clicks through every sidebar module, and flags:

- uncaught console errors / page errors
- failed `/api/*` requests (status >= 400)
- crash markers in the rendered text (`Cannot read propert...`, `Something
  went wrong`, etc.)
- suspiciously thin page content (possible blank/broken render)

## Scripts

- **`smoke.js`** — logs in as the seeded `superadmin@petcare.co.id` account
  (has access to every module per `src/constants/modulePermissions.ts`) and
  walks the full sidebar in one pass. Writes `report.json`.
- **`smoke_roles.js`** — logs in as five different staff roles (dokter,
  kasir, groomer, admin, owner_petshop) in turn and walks each role's
  *visible* sidebar, to catch both rendering bugs and role-permission
  regressions (a module wrongly shown/hidden for a role). Writes
  `report_roles.json`.

Both only screenshot a module when something is actually flagged (into
`shots/` / `shots_roles/`), to keep output small on a clean run.

## Usage

```bash
cd scripts/smoke-test
npm install
# in another terminal, from the repo root: npm run dev
npm run smoke        # single pass as superadmin, every module
npm run smoke:roles  # multi-role pass, permission-aware
```

Requires a local Chrome install at the default Windows path
(`C:\Program Files\Google\Chrome\Application\chrome.exe`) — edit
`CHROME_PATH` at the top of each script if yours lives elsewhere.

All seeded demo accounts share the same default password (`petcare123`, see
`server/authService.ts` `DEFAULT_PASSWORD`).

`shots*/` and `report*.json` are gitignored — only the scripts are tracked.
