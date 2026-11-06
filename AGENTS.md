# pdf.do — agent rules

PDF tools that run entirely in the visitor's browser: Next.js 16 (App Router, static export), React 19,
Tailwind 4, TypeScript (strict), Playwright. These rules apply to any coding agent working in this repo and
are binding.

## Branches and deploys — read first

- **Vercel deploys `main` to production**, and the domain points at it. Pushing `main` puts the site live.
  `main` still serves the old coming-soon page (kept here in `coming-soon/`).
- **Work on `app`.** Never push `main`. Don't push `app` either unless the owner says so: every pushed
  branch gets a Vercel preview deployment.
- **Commit only when asked.** No pushes, no merges to `main`, no GitHub settings changes (rename, visibility,
  integrations). Going live is a decision the owner makes deliberately.
- The app ships with `noindex` (`app/layout.tsx`). Remove it only as part of that go-live step.

## Commands

```bash
npm ci
npm run fixtures                      # test PDFs into fixtures/ (gitignored)
node scripts/make-jpeg-fixture.mjs    # the already-JPEG scan fixture (uses Chromium)
npm run dev                           # http://localhost:3000
npm run build                         # static export into out/
npm test                              # builds fresh, serves on :4174, runs Playwright on Chromium, WebKit and a phone-sized WebKit
npm run lint
npm run licenses                      # licence gate for everything shipped to the browser
```

`.claude/launch.json` defines `pdf-do-dev` (port 3000) and `pdf-do-export` (port 4173, the production export for looking at by hand). Tests use their own port and always rebuild, so they can never run against a stale build.

## Next.js 16

This is not the Next.js in your training data. Before using an API from memory, read the matching page under
`node_modules/next/dist/docs/` (`01-app` is the App Router). Static export means: no middleware, no
`redirects()`/`rewrites()`/`headers()` in `next.config.ts`, no route handlers, no server actions, no image
optimisation. Don't add them; if one seems necessary, stop and ask.

## Architecture rules

- **Static export** (`output: "export"` in `next.config.ts`). The same build must run on any static host. No server
  features, no environment secrets, no API calls.
- **Engines run in Web Workers**, never the main thread. They live as classic workers in `public/engines/*.worker.js`
  (no bundler involved) and are called through `lib/worker-rpc.ts` and the typed wrappers in `lib/engines.ts`. One
  fresh worker per job; cancel by terminating it. The one exception is pdf.js rendering in
  `lib/raster-compress.ts`, which uses pdf.js's own worker for parsing.
- **Self-host everything.** Engine files are copied from `node_modules` into `public/engines/vendor/` by
  `npm run prepare-assets` (generated and gitignored; don't edit or commit it). No third-party CDN, font host,
  analytics or script, ever, without the owner's approval.
- **Load lazily, per tool.** A tool page must not download another tool's engine. Keep landing pages light.
- **Single-threaded WASM only.** Multi-threaded WASM needs cross-origin isolation (COOP/COEP), which blocks ad
  iframes. Don't pick engines that need `SharedArrayBuffer`.
- **Big files are an iPhone problem.** iOS Safari kills tabs under memory pressure without a catchable error. Process
  in bounded chunks, don't hold several copies of a file, and say so in the UI when a file is too large. Real-device
  testing has not been done yet.

## Privacy is a tested claim

The site says files are processed in the browser and not uploaded. That must stay true and stay tested.

- Every tool test asserts the browser made **no request outside its own origin**, workers included
  (`watchOutbound` in `tests/tools.spec.ts`). Copy that assertion into any new tool test.
- Never send file contents, names or sizes anywhere. Never log them to the console in committed code.
- Don't add any feature that calls an external service (AI, OCR cloud, sharing) without the owner's approval; it
  would break the claim and the test.

## Dependencies and licences

- **No copyleft in anything that ships to the browser.** `npm run licenses` fails on AGPL, GPL and SSPL. MuPDF.js
  and Ghostscript are deliberately not used (AGPL). Don't add them.
- Before adding a dependency, check its licence, its size, and whether it ships to the browser; record the reason in
  the pull request or commit message. Extend `SHIPPED` in `scripts/check-licenses.mjs` for anything new that ships.
- PDF library: `@cantoo/pdf-lib`, the maintained fork. Upstream `pdf-lib` has had no release since 2021, so don't
  swap it in. Keep pdf-lib behind our own interface (`lib/engines.ts`, the worker files) so it can be replaced.
- Gotchas already hit: pdf.js 6 tears down through the loading task (`task.destroy()`), not the document;
  `page.render` takes `canvas` and `viewport`; with TypeScript 6, type buffers as `Uint8Array<ArrayBuffer>` or
  `new Blob([bytes])` fails to compile.

## Honest messages

What the UI says must be what happened. The first version of Smart compress said "images optimised" on a file it
had not shrunk. Now it says what actually occurred and points to Target size. Keep that standard:

- Report real before/after sizes, and say so when nothing was saved.
- Say when a mode changes the file's nature (Target size turns pages into images, so text is no longer selectable).
- Don't claim "lossless", "secure", "encrypted" or "private" beyond what the code and tests show.
- Errors name the problem in plain words (password-protected, too many pages), never a stack trace.

## Structure

- `lib/tools.ts` is the **single source of truth** for tool pages: name, copy, steps, FAQ, related tools, category. The
  home page, header menu, footer, search, related links and the compress-size pages are all generated from it. Never
  hard-code a tool list anywhere else.
- `components/ui/` holds primitives (`Button`/`ButtonLink`, `Alert`, `Progress`, `OptionCards`, `SelectField`/`TextField`,
  `Icon`). `components/site/` is the chrome (`Header`, `Footer`, `ToolSearch`, `ToolCard`). `components/tool/` is what
  tools are built from (`ToolPage`, `FileDrop`, `ResultPanel`, `PagePicker`, and the tools themselves).
- `lib/handoff.ts` passes a result file to the next tool **in memory only** (no storage, lost on reload). `ResultPanel`
  uses it for "Keep going with this file". Don't persist files anywhere.
- `app/[slug]/page.tsx` renders registry entries that have `presetBytes` (the compress-size pages). Static export needs
  every path listed in `generateStaticParams` and `dynamicParams = false`.
- The site shows only tools that exist. There is no "coming soon" listing.

## UX rules

- **Use the primitives.** No one-off buttons, alerts or progress bars. Colours come from the existing palette (indigo for
  action, emerald for success, red for destructive); keep text contrast at WCAG AA or better.
- **One obvious next step.** An empty tool shows the drop zone; once a file is chosen the drop zone shrinks to
  "Choose a different file" and the options and one primary action take over. A finished tool shows the result panel:
  download first, then "Keep going with this file".
- **Phones first.** Primary actions are full width on phones, at least 44 px tall, and the main action stays on screen
  (see the sticky bar in `PagesTool`). Nothing may scroll sideways; `tests/mobile.spec.ts` checks it.
- **Accessibility floor.** Real labels on every control, visible focus rings, `role="status"`/`"alert"` for progress
  and errors, native radios and details elements, hidden file inputs `aria-hidden`. `tests/a11y.spec.ts` runs axe
  (WCAG 2 A/AA) on every page; it finds roughly a third of problems, so it is a floor, not a verdict.
- **Light only.** Dark mode is the owner's decision, and everything is built to make it cheap later.
- **Copy:** plain words, no hype, no claims the code does not back (see Honest messages). Sentence case.

## Adding a tool

1. Add an entry to `lib/tools.ts` (copy, steps, FAQ, related). Write the FAQ answers from what the tool actually does.
2. Engine operation: add an `op` to an existing worker in `public/engines/` (or a new worker file), with a typed
   wrapper in `lib/engines.ts`. Reject unsupported input (encrypted, too large) with a readable message.
3. Page: `app/<slug>/page.tsx` as a server component using `ToolPage`, plus a client component in `components/tool/`.
   Reuse `FileDrop`, `Progress`, `Alert`, `ResultPanel`; accept a handed-over file the way `CompressTool` does.
4. Tests: real fixtures, output checked by re-reading the file (page count, text via pdf.js, size), the
   no-outbound-request assertion, both browsers, plus a phone check if the layout is new. Add the page to the axe list.
5. If it needs a new fixture, generate it in `scripts/` (deterministic); don't commit binary PDFs.
6. Update the tools table and the known limits in `README.md`.

## Testing and definition of done

- Tests run against the production export, the artefact that ships. Don't weaken an assertion to make a test pass,
  and don't commit `.only`. If a test fails, find the cause. One WebKit home-page test failed once and was never
  reproduced; treat any repeat as real.
- UI changes are verified in the browser pane and shown with a screenshot at desktop and phone width.
  The site is light-only for now; adding dark mode is a decision for the owner.
- Done means: `npm run lint`, `npm run licenses` and `npm test` (Chromium and WebKit) all pass, and the README
  stays accurate.

## Content and names

- No ads, analytics, cookie banners or accounts yet; don't add them. `app/how-it-works/page.tsx` states that the site collects
  nothing; if that ever changes, update that page in the same change.
- No translations until the owner decides on internationalisation (subfolder routes such as `/id/...`).
- Don't name other companies' products (Adobe, iLovePDF, Smallpdf and so on) in page copy without review; plain
  descriptions ("PDF editors") are fine.
- Page plans and strategy are kept outside this repo. Ask for the current plan instead of guessing which pages to
  build next.
