# pdf.do

PDF tools that run entirely in the browser. Work in progress.

The live domain still serves the "coming soon" page, which is kept in
`coming-soon/`. **Vercel deploys `main` to production**, so application work
happens on the `app` branch and is merged only on the owner's say-so. The app has been live on `main` since 2026-11-06, with noindex.
Until then it says `noindex, nofollow` in a meta tag on every page and in an `X-Robots-Tag` response header (`vercel.json`, `public/_headers`).

## Run

```bash
npm ci
npm run fixtures                       # test PDFs into fixtures/ (gitignored)
node scripts/make-jpeg-fixture.mjs     # an already-JPEG scan fixture (needs Chromium)
npm run dev                            # http://localhost:3000
npm test                               # builds fresh on :4174, runs Playwright on Chromium, WebKit and a phone-sized WebKit
npm run lint                           # eslint, then the colour gate (every colour lives in app/globals.css)
npm run licenses                       # licence gate for everything shipped to the browser
npm run test:gallery                   # builds with GALLERY=1, serves on :4175, tests the component gallery
```

The component gallery (`/gallery`) shows every UI block in light and dark side by side. It exists in `npm run dev` and in a
`GALLERY=1` build, and is left out of the live build.

## Tools

| Tool | Engine | Notes |
|---|---|---|
| Merge PDF | `@cantoo/pdf-lib` in a Web Worker | reorder, per-file page counts, rejects password-protected files |
| Compress PDF, Smart | qpdf WASM (`--optimize-images`) in a Web Worker | text stays selectable; only recompresses non-JPEG images |
| Compress PDF, Target size | pdf.js render, JPEG quality/DPI search, pdf-lib assembly | turns pages into images, so text is no longer selectable; says so |
| Compress PDF to 100 KB to 10 MB | the same tool, preselected | nine pages generated from `lib/tools.ts` |
| Delete PDF pages, Extract PDF pages | pdf-lib in a Web Worker, pdf.js thumbnails | click pages or type a range; one component, two modes |
| Split PDF | pdf-lib in a Web Worker, fflate ZIP in a second worker | a file per page, per typed range, or in equal parts; at most 500 files; every file plus one ZIP |
| Rotate PDF | pdf-lib (page rotation) | thumbnails turn as you press; adds to a page's existing rotation |
| Add page numbers | pdf-lib, Helvetica | live preview; ten styles of position and format; skip a cover; works on pages that are already turned |
| Bates numbering | the same page engine, Helvetica | prefix, a number padded with zeros (3 to 10 digits), suffix; live preview; all pages or a typed range; reports the range written and the number to start the next file from; one file at a time; a character the font cannot write is refused, never swapped |
| Edit PDF metadata | pdf-lib (document information) | title, author, subject, keywords, creator, producer; says when an XMP block exists and leaves it alone |
| Images to PDF | pdf-lib; canvas for WebP, GIF, BMP | JPEG and PNG are embedded as they are (a JPEG is never recompressed); sideways phone photos are put upright; no HEIC |
| PDF to JPG, PDF to PNG | pdf.js render, canvas encode, fflate ZIP | 72, 150 or 300 dpi; a page too big for the browser (about 16 million pixels) is drawn smaller and the result says so |
| Extract text | pdf.js text content | plain text with line breaks; names pages that have none (scans); no OCR yet |
| Encrypt PDF, Remove PDF password, Unlock PDF | qpdf WASM in a Web Worker | AES-256 with one password; removing needs the password (nothing guesses or cracks); Unlock lifts restrictions from a file that opens freely; the password stays in the worker |
| Organise pages | pdf-lib; the page grid with undo and redo | move, turn and delete with buttons; no dragging yet |
| Split PDF in half | pdf-lib (page boxes) | each page cut in two (left and right, or top and bottom) or the document in two files; follows turned pages; the cut half stays hidden in the file |
| Crop PDF | pdf-lib (page boxes) | four sliders with a shaded preview, all pages or a typed range; the cut-off area is hidden, not deleted, and the page says so |
| Split PDF by size, by bookmarks | pdf-lib; pdf.js outline | by size packs pages in order under a limit (binary search on trial saves); by bookmarks uses top-level bookmarks only |
| PDF size analyzer | pdf-lib stream walk | pictures, fonts, page content, other data, and "the rest" (an upper bound, said on the page) |
| Text to PDF | pdf-lib standard fonts | Latin letters only; other characters become "?" and are counted; text files up to 5 MB |
| Extract images | pdf.js operator list, canvas PNG | saved as PNG; pictures under 32 px are left out; a logo on every page is saved once per page |
| Add watermark | pdf-lib | text only; drag on the preview or place with the grid; colour, size, strength and angle; follows turned pages |
| Sign PDF | pdf-lib; `signature_pad` for drawing | draw, type or upload a signature and place it; a picture of a signature, not a digital signature (the page says so); an uploaded photo has its paper taken out on a canvas (by brightness, with a slider), or is used as it is when nothing darker than the paper is found |
| Add image to PDF | pdf-lib (the same placing as Sign) | one picture per run, on this page, every page or typed pages; drag, grid, nudge and a width slider; JPEG and PNG go in as they are, WebP, GIF and BMP as PNG |
| Fill PDF form | pdf-lib forms | text, tick boxes, choices; option to make entries permanent; says when a PDF has no fields |
| Repair PDF | pdf-lib reads object by object, qpdf checks | rebuilds a broken index; says when the original could not be read as it was; cannot recover missing data |
| Scan to PDF, HEIC to PDF | the Images to PDF tool | scan opens the phone camera first; HEIC only where the browser can open it (Safari) |
| PDF to Markdown | pdf.js text with sizes | headings, lists and paragraphs are guessed; tables and columns are not recognised |
| PDF privacy scanner | pdf-lib stream and dictionary walk | names, XMP, GPS in pictures, attachments, scripts, comments, links, layers, earlier versions; reads only; a clear result is not a guarantee |
| Compare PDFs | pdf.js text, `diff` | page by page text diff; pictures and layout are not compared |

Results can be handed to the next tool in memory ("Keep going with this file"), without a second upload.

## Blog

Posts are Markdown files in `content/blog/`; `content/README.md` says how to write one. Preview with `npm run dev` (drafts show
there); `npm run build` checks every post and stops with a list of problems if one breaks a rule. Pages are `/blog`, `/blog/<slug>`
and `/blog/tags/<tag>`. No RSS feed or sitemap yet.

## Design rules

- Static export (`output: "export"`), so it runs on any static host. No server features.
- Every engine is self-hosted under `public/engines/`, runs in a Web Worker, and loads
  lazily per tool. No third-party CDN.
- The privacy claim is tested: every test asserts the browser made no request outside
  its own origin, workers included.
- No copyleft engines. `npm run licenses` fails on AGPL/GPL/SSPL in anything shipped.
- Every colour is a token with a light and a dark value, or a component class, in `app/globals.css`; components carry
  none. `npm run lint` enforces it. The font, Google Sans, is served from this site's own origin.

See `AGENTS.md` for the full working rules.

## Known limits

- Password-protected PDFs are rejected, not decrypted.
- Merge uses pdf-lib `copyPages`; bookmarks and interactive form fields are untested.
- Target-size mode is capped at 100 pages and renders on the main thread.
- Not tested: a real iPhone, files over ~10 MB, CJK or RTL fonts, malformed PDFs.
- Target-size results differ across browsers (different JPEG encoders).
- PDF to JPG and PNG draw pages on the main thread, one at a time; very long documents are untested. Extract text has no OCR, so scans give no text.
- Images to PDF cannot read HEIC (browsers cannot). The upright-photo fix relies on the browser applying a JPEG's own orientation.
- Not built: OCR, Markdown to PDF, HTML to PDF, the redaction checker and the workflow builder (see `strategy/01-web-tool-map.md` for why), and the format pages of Images to PDF.
- Repair PDF relies on pdf-lib's tolerant reader: qpdf's own recovery did not work in the WASM build (exit 2 on a damaged index), so qpdf is used only to say whether the original was readable.
- Page numbers use Helvetica only; the preview is close to, not exactly, where the engine puts the number (within a point or two).
- Bates numbering works on one file at a time (no single sequence across several files in one run), writes Latin letters, digits and common punctuation only, has no colour or font choice, and shares the page-number preview's one-or-two-point tolerance.
- The paper remover in Sign judges by brightness alone: the paper must be lighter than the ink. Lined or coloured paper, hard shadows and pale pencil can leave marks or thin the strokes, and the slider is the only control. Photos are scaled to 1600 px on the long side.
- Add image places one picture per run, has no opacity or rotation, and the picture cannot be taken off afterwards.
- The meta CSP only governs the page; worker network access needs response headers
  once the host is chosen.
