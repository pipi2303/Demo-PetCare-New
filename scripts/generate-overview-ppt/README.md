# Generate Overview PPT

Generates `PetCare_ERP_Overview.pptx` — a slide deck covering features, process
flow, and live screenshots of the running app.

## Usage

```bash
cd scripts/generate-overview-ppt
npm install
npm run dev   # from repo root, in another terminal: make sure the app is running on http://localhost:3000
npm run generate
```

- `capture.js` drives a local Chrome install (via `puppeteer-core`, no bundled
  Chromium download) to log into the running app with the seeded demo owner
  account and screenshot key screens into `img/`.
- `build.js` reads those screenshots plus a set of hand-authored feature/flow
  slides and assembles `PetCare_ERP_Overview.pptx` with `pptxgenjs`.

Both scripts can be run independently: re-run `capture.js` alone after a UI
change to refresh screenshots, then `build.js` to rebuild the deck without
re-capturing.

`img/` and the generated `.pptx` are gitignored — only the generator scripts
are tracked.
