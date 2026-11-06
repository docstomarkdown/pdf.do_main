# pdf.do

PDF tools that run entirely in the browser. Work in progress.

The live domain still serves the "coming soon" page, which is kept in
`coming-soon/`. **Vercel deploys `main` to production**, so application work
happens on the `app` branch and is merged only as a deliberate go-live step.
The app is built with `noindex` until then.

## Run

```bash
npm ci
npm run fixtures                       # test PDFs into fixtures/ (gitignored)
node scripts/make-jpeg-fixture.mjs     # an already-JPEG scan fixture (needs Chromium)
npm run dev                            # http://localhost:3000
npm test                               # builds fresh on :4174, runs Playwright on Chromium, WebKit and a phone-sized WebKit
npm run licenses                       # licence gate for everything shipped to the browser
```

## Tools

| Tool | Engine | Notes |
|---|---|---|
| Merge PDF | `@cantoo/pdf-lib` in a Web Worker | reorder, per-file page counts, rejects password-protected files |
| Compress PDF, Smart | qpdf WASM (`--optimize-images`) in a Web Worker | text stays selectable; only recompresses non-JPEG images |
| Compress PDF, Target size | pdf.js render, JPEG quality/DPI search, pdf-lib assembly | turns pages into images, so text is no longer selectable; says so |
| Compress PDF to 100 KB to 10 MB | the same tool, preselected | nine pages generated from `lib/tools.ts` |
| Delete PDF pages, Extract PDF pages | pdf-lib in a Web Worker, pdf.js thumbnails | click pages or type a range; one component, two modes |

Results can be handed to the next tool in memory ("Keep going with this file"), without a second upload.

## Design rules

- Static export (`output: "export"`), so it runs on any static host. No server features.
- Every engine is self-hosted under `public/engines/`, runs in a Web Worker, and loads
  lazily per tool. No third-party CDN.
- The privacy claim is tested: every test asserts the browser made no request outside
  its own origin, workers included.
- No copyleft engines. `npm run licenses` fails on AGPL/GPL/SSPL in anything shipped.

See `AGENTS.md` for the full working rules.

## Known limits

- Password-protected PDFs are rejected, not decrypted.
- Merge uses pdf-lib `copyPages`; bookmarks and interactive form fields are untested.
- Target-size mode is capped at 100 pages and renders on the main thread.
- Not tested: a real iPhone, files over ~10 MB, CJK or RTL fonts, malformed PDFs.
- Target-size results differ across browsers (different JPEG encoders).
- The meta CSP only governs the page; worker network access needs response headers
  once the host is chosen.
