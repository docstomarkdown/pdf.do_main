# pdf.do — agent rules

PDF tools that run entirely in the visitor's browser: Next.js 16 (App Router, static export), React 19,
Tailwind 4, TypeScript (strict), Playwright. These rules apply to any coding agent working in this repo and
are binding.

## Branches and deploys — read first

- **Vercel deploys `main` to production**, and the domain points at it. Pushing `main` puts the site live.
  `main` has served the app since 2026-11-06 (pull request 1, merged by the owner's instruction); the old coming-soon page is
  kept in `coming-soon/`. `vercel.json` carries the build settings (Next.js preset, `npm ci`, `npm run build`): the Vercel
  project was first made for a plain HTML site, and the repo's settings override that.
- **Work on `app`.** Never push `main`. Don't push `app` either unless the owner says so: every pushed
  branch gets a Vercel preview deployment.
- **Commit only when asked.** No pushes, no merges to `main`, no GitHub settings changes (rename, visibility,
  integrations). Going live is a decision the owner makes deliberately.
- **The app is not for search engines yet, in three layers:** the `noindex, nofollow` meta tag on every page
  (`app/layout.tsx`), and an `X-Robots-Tag: noindex, nofollow` response header from `vercel.json` (Vercel) and
  `public/_headers` (Cloudflare Pages, Netlify). `serve.json` sends the same header from the local test server.
  `tests/noindex.spec.ts` checks all of it. Remove all three together, only as part of the go-live step. There is no
  `robots.txt` on purpose: blocking crawling would stop a crawler from ever reading the noindex.

## Commands

```bash
npm ci
npm run fixtures                      # test PDFs into fixtures/ (gitignored)
node scripts/make-jpeg-fixture.mjs    # the already-JPEG scan fixture (uses Chromium)
npm run dev                           # http://localhost:3000
npm run build                         # static export into out/
npm test                              # builds fresh, serves on :4174, runs Playwright on Chromium, WebKit and a phone-sized WebKit
npm run lint                          # eslint, then the colour gate (scripts/check-colours.mjs)
npm run licenses                      # licence gate for everything shipped to the browser
npm run test:gallery                  # builds with GALLERY=1, serves on :4175, runs the component-gallery tests
```

`.claude/launch.json` defines `pdf-do-dev` (port 3000) and `pdf-do-export` (port 4173, the production export for looking at by hand). Tests use their own port and always rebuild, so they can never run against a stale build.

The component gallery (`/gallery`) is a development page. It exists in `npm run dev` and in a build made with `GALLERY=1`;
the live build leaves it out (`pageExtensions` in `next.config.ts`), and a test in `tests/` checks that. Don't run a
preview server on 4174 or 4175 while the tests run.

## Next.js 16

This is not the Next.js in your training data. Before using an API from memory, read the matching page under
`node_modules/next/dist/docs/` (`01-app` is the App Router). Static export means: no middleware, no
`redirects()`/`rewrites()`/`headers()` in `next.config.ts`, no route handlers that answer a visitor's request, no
server actions, no image optimisation. Don't add them; if one seems necessary, stop and ask. The one kind of route that
is fine is a `GET` marked `export const dynamic = "force-static"`: the build runs it once and writes its answer out as a
plain file (`/sitemap.xml`, `/robots.txt`, the link-preview pictures under `/og/`, `/apple-touch-icon.png`).

## Architecture rules

- **Static export** (`output: "export"` in `next.config.ts`). The same build must run on any static host. No server
  features, no environment secrets, no API calls.
- **Engines run in Web Workers**, never the main thread. They live as classic workers in `public/engines/*.worker.js`
  (no bundler involved) and are called through `lib/worker-rpc.ts` and the typed wrappers in `lib/engines.ts`. One
  fresh worker per job; cancel by terminating it. The one exception is pdf.js rendering in
  `lib/raster-compress.ts`, which uses pdf.js's own worker for parsing.
- **Self-host everything.** Engine files are copied from `node_modules` into `public/engines/vendor/` by
  `npm run prepare-assets` (generated and gitignored; don't edit or commit it). No third-party CDN, font host,
  analytics or script, ever, without the owner's approval. Approved exception (2026-11-06): Google Sans through
  `next/font/google`, which downloads the font at build time and serves it from our own origin. The browser never
  contacts Google, and `font-src 'self'` stays.
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

- **Don't build what a proven library already provides.** Before writing a component, hook, parser, codec, layout,
  drag-and-drop, toast, dialog, ZIP writer or any other behaviour, look for the browser's own element or a maintained
  library that does it, and use that. Build it ourselves only when nothing passes the checks below, and say in the commit
  or pull request which options were looked at and why each failed. A library is "proven" when it clears the checks in
  this section: permissive licence, still maintained (the pdf-lib lesson below), a size that suits what it does, works
  under static export and our CSP, and makes no network request. The library supplies behaviour; `components/ui` stays
  ours as the look and copy layer, so wrap a library in one of our primitives or a `lib/` interface (as with pdf-lib)
  instead of spreading its API through the tools. This governs new work: tested code that already works is not
  rewritten to match.
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
- `components/ui/` holds primitives: `Button`/`ButtonLink`, `IconButton`, `Chip`, `Segmented`, `OptionCards`, `Spinner`,
  `Progress`, `Alert`, `Badge`, `Card`, `Disclosure`, `Skeleton`, `Dialog`, `TextLink`, the fields (`Field`, `TextField`,
  `TextArea`, `SelectField`, `PasswordField`, `Slider`, `Checkbox`), `Icon`, and the notifier. Their colours and shapes are
  classes in `app/globals.css`. Icons come from `lucide-react` through `Icon` (add one to its list when a block needs it).
  Toasts: call `notify.status`, `notify.error` or `notify.progress` from `components/ui/Notifier`; Sonner loads on the first
  call, and a toast is never the only place something appears. `ActionBar` holds the one primary action (a sticky bar on a
  narrow container, inline on a wide one); `JobProgress` replaces it while a job runs; `DownloadButton`, `SizeComparison`,
  `EmptyState` and `ErrorBoundary` finish the set. `components/gallery/` is the dev-only gallery: add every new or changed
  block to it in all its states. Blocks lay themselves out from their container's width (`.app-region` on `<main>`).
  `components/site/` is the chrome (`Header`, `Footer`, `ToolSearch`, `ToolCard`). `components/tool/` is what tools are
  built from (`ToolPage`, `FileDrop`, `FileCard`, `FileList`, `RangeField`, `SelectionToolbar`, `ResultPanel`, `PagePicker`,
  and the tools themselves). The result blocks are there too. A tool that makes several files puts `MultiResult` (rows, each
  with its own download, and `DownloadAll`, the ZIP) inside `ResultPanel`, which then needs no single file; pictures use
  `ImageGallery` with `DownloadAll`; text uses `TextOutput` (read, `CopyButton`, download); a scan uses `ReportList`,
  `FactList` and `BreakdownBar`. Several outputs are zipped by `lib/use-zip.ts` in `public/engines/zip.worker.js` (fflate),
  with names from `lib/zip-names.ts`; `lib/use-object-urls.ts` makes and revokes the download links. The page stage is also there: `PagePreview` (one page drawn large, with turn and zoom),
  `PlacementOverlay` (a mark on the page, placed by percentages: drag, arrow keys, resize), `AnchorGrid` and `NudgePad` (the
  same placement by buttons), `PageGrid` (thumbnails you move, turn and delete with buttons) and `ThumbPaper` (the lazy
  thumbnail). Anything placed on a page goes inside `PagePreview` and is positioned in percent, never pixels. A tool that
  pairs a page with options wraps both in `.stage-split` (`app/globals.css`): the page on the left and the options on the
  right from 680 px of container width, one column below that, as the approved mocks show. The options go in `.stage-opts`
  (a container of its own) and paired fields in `.stage-fields`, which makes two columns only when the options column has
  room; `.stage-wide` spans both. The one primary action stays in an `ActionBar` under the two columns. A tool with a third
  part that must come first on a phone (Sign's signature box) adds `.stage-split-3` and the `.stage-make`, `.stage-page`
  and `.stage-rest` areas. Watermark, Page numbers, Crop and Sign are built this way; a new placement tool follows them.
- A tool's logic lives in three hooks: `useHandoff` (the file handed over by the previous tool), `useToolJob` (the life of
  one run: busy, status, progress, error, cancel, and the result's object URL, which it makes and revokes) and
  `useLeaveGuard` (the browser asks before closing while a job runs). Don't copy that scaffolding into a tool again.
  Tools that show pages use `usePdfDocument` (opens the PDF once; page sizes and cancellable renders) and `useThumbs`
  (thumbnails on demand, revoked on exit), and editors that undo use `useHistory`: `set` for a finished change, `preview`
  then `commit` for a drag or a slider. Don't open the same PDF in pdf.js a second time in one tool.
- **The blog is Markdown in `content/blog/`** (guide: `content/README.md`), read and checked at build time by `lib/content.ts`
  (unified, remark and rehype; they run on the server during the build and never reach the browser, so they are not in the
  licence gate's list). A post that breaks a rule fails `npm run build` with every problem listed: front matter, headings, raw
  HTML, pictures without alt text, links that lead nowhere, a tool that does not exist. Pages: `/blog` (the list), `/<slug>` for a
  post (a direct address, owner direction 2026-11-11: `app/[slug]/page.tsx` serves the compress-size pages and the posts, and a post
  named like a tool or a page fails the build) and `/blog/tags/<tag>`. Posts are English only and carry the site's `noindex` like every other page. `tests/content.spec.ts` tests
  the rules without a browser; `tests/blog.spec.ts` tests the pages. The blog's text styling is `@tailwindcss/typography` with every
  colour mapped to a token in `globals.css`, in the utilities layer (the plugin's colours live there, so a rule in the components
  layer would lose). `app/sitemap.ts` writes `/sitemap.xml` at build time (asked for by the owner, 2026-11-11): every tool, the pages about the site, the blog and its posts,
  with addresses in full from `lib/site.ts`; `tests/sitemap.spec.ts` opens every one. Not built, because it needs a static route handler and this file says to ask first: an RSS feed.
- `lib/handoff.ts` passes a result file to the next tool **in memory only** (no storage, lost on reload). `ResultPanel`
  uses it for "Keep going with this file". Don't persist files anywhere. A link to the same tool at another address (the
  size links under Compress) takes the chosen file along the same way: the tool calls `useHeldFile` and the link is a
  `CarryLink`. A result belongs to the options it was made with, so changing an option calls `job.reset()`.
- `app/[slug]/page.tsx` renders registry entries that have `presetBytes` (the compress-size pages). Static export needs
  every path listed in `generateStaticParams` and `dynamicParams = false`.
- The site shows only tools that exist. There is no "coming soon" listing.

## UX rules

- **Use the primitives.** No one-off buttons, alerts or progress bars: build from `components/ui`. Keep text contrast at
  WCAG AA or better in both themes, and the borders of controls at 3:1.
- **Colours live in `app/globals.css`, and nowhere else** (owner direction, 2026-11-06). Components carry layout utilities
  and class names only: no raw palette classes (`bg-indigo-600`), no `white` or `black` classes, no hex values or colour
  functions in TSX. A button's colours are `.btn-primary` and its kin in `globals.css`; a new look is a change to that one
  file. Use the semantic tokens (`bg-surface`, `text-ink-3`) or a component class, never a raw colour. `npm run lint`
  fails on a violation (`scripts/check-colours.mjs`). The script's legacy list is empty and must stay
  empty. Every token has a light and a dark value, written in four places that the same script keeps in step.
- **The look is a small system; use its parts** (owner direction, 2026-11-11). The page is the `canvas` colour and
  cards, fields and panels sit on it in `surface`. Headings use `.display` (home), `.title` (a page) and `.section-title`;
  an opening paragraph uses `.lead`; numbers that line up use `.nums`. Depth has three steps: `.lift-1` at rest, `.lift-2`
  raised, `.lift-3` floating. Each group of tools has its own colour: put `cat-<group id>` on a wrapper and what is inside
  reads `--cat-bg` and `--cat-ink` (`.tool-card-icon`, `.cat-ink`). Every tool has its own icon in `lib/tools.ts`; don't
  share one between two tools. The header stays at the top of the screen, so anything that scrolls to an element must
  leave room for it (`scroll-padding-top` on `html` does this for links). The approved mocks still show the earlier
  colours: take structure, states and copy from the mocks, and colour, type and depth from `globals.css`.
- **One obvious next step.** An empty tool shows the drop zone; once a file is chosen the drop zone shrinks to
  "Choose a different file" and the options and one primary action take over. A finished tool shows the result panel:
  download first, then "Keep going with this file".
- **Match the approved mocks.** Blocks and tool pages are built to match the owner's approved UI mocks (kept outside this
  repo; ask for the current ones): the same hierarchy, states, copy and behaviour, in both themes and at every width. Don't
  invent layouts or states. If something must differ, say why and have the mock updated first.
- **Phones first.** Primary actions are full width on phones, at least 44 px tall, and the main action stays on screen
  (see the sticky bar in `PagesTool`). Nothing may scroll sideways; `tests/mobile.spec.ts` checks it.
- **Responsive from the ground up.** Write CSS mobile first. Each block lays itself out from the width of its own
  container (container queries), not the viewport, so it works in any column, and uses no fixed pixel widths. Check 320,
  375, 768, 1024 and 1440 px, and 200% text zoom.
- **Accessibility floor.** Real labels on every control, visible focus rings, `role="status"`/`"alert"` for progress
  and errors, native radios and details elements, hidden file inputs `aria-hidden`. `tests/a11y.spec.ts` runs axe
  (WCAG 2 A/AA) on every page; it finds roughly a third of problems, so it is a floor, not a verdict.
- **Light and dark.** Both themes ship (decided 2026-11-06). The page follows the device setting; no theme choice is
  stored. Every colour is a token with a value for each theme, and tests and axe cover both. The site follows the device
  setting through `<html data-theme="system">` in `app/layout.tsx` (set 2026-11-06, when the last legacy file was moved onto
  tokens). The gallery shows both themes at once with `.scheme-light` and `.scheme-dark`, and `tests/dark.spec.ts` runs
  every page and each tool state with the device set to dark.
- **Copy:** plain words, no hype, no claims the code does not back (see Honest messages). Sentence case.

## Search engines and link previews

- **Every page describes itself through `pageMeta()` in `lib/seo.ts`** (a tool page through `toolMeta(tool)`): its title
  and description, its one true address (canonical), and the Open Graph and X card a pasted link is drawn from. Don't
  write a bare `{ title, description }`: `tests/seo.spec.ts` reads every built page and fails on one that lacks any of
  these. The site's name, address and one-line description are in `lib/site.ts`.
- **Every page has a picture for link previews, and none is made by hand.** A page with its own picture uses it (a
  post's `image` field, see `content/README.md`). Every other page gets one drawn from its title when the site is built,
  by `app/og/[name]/route.tsx`: `/og/home.png`, `/og/<tool slug>.png`, `/og/<post>.png`. A new tool or post needs
  nothing. A new page that is neither needs one line in `cards()` in that file, and the test says so if it is missing.
  The pictures take their colours from `app/globals.css` (through `lib/tokens.ts`), the site's font and the tool's icon.
- **Structured data says only what the page shows.** A tool page carries its breadcrumb, a free web application and its
  questions (from the registry, the same ones shown on the page); a post is an article; the home page names the site.
  Don't add ratings, reviews or counts the site does not have.
- **Whether search engines may list the site is a separate switch**, still off: the `noindex` tag (`app/layout.tsx`)
  and header (`vercel.json`, `public/_headers`), checked by `tests/noindex.spec.ts`. They come off together, at go-live,
  on the owner's word. `robots.txt` allows crawling on purpose: a crawler must fetch a page to see its `noindex`. Topic
  pages (`/blog/tags/...`) set their own `noindex` and keep it after go-live.

## Adding a tool

1. Add an entry to `lib/tools.ts` (copy, steps, FAQ, related). Write the FAQ answers from what the tool actually does.
2. Engine operation: add an `op` to an existing worker in `public/engines/` (pages, meta, images, text, analyze, privacy, security (qpdf), zip) or a new worker file, with a typed wrapper in `lib/engines.ts`. Probe an engine's real behaviour in a browser before relying on it: qpdf's exit codes and its recovery of damaged files did not match its documentation. Reject unsupported input (encrypted, too large) with a readable message.
3. Page: `app/<slug>/page.tsx` as a server component using `ToolPage`, with `export const metadata = toolMeta(tool)`, plus a client component in `components/tool/`. Start from `PdfTool` (the one-PDF shell: drop zone, hand-over, remount per file) and `usePageSelection` (thumbnails and typed ranges kept in step); a result of several files goes in `MultiResult`, pictures in `ImageGallery`, text in `TextOutput`.
   Assemble it from the blocks: `FileDrop` or `FileCard` or `FileList`, the options, an `ActionBar` with the one primary
   action (replaced by `JobProgress` while it runs), `Alert` for errors, and `ResultPanel`. Run the work through
   `useToolJob` and take a handed-over file with `useHandoff`, as `CompressTool` does.
4. Tests: real fixtures, output checked by re-reading the file (page count, text via pdf.js, size), the
   no-outbound-request assertion, both browsers, plus a phone check if the layout is new. Add the page to the axe list.
5. If it needs a new fixture, generate it in `scripts/` (deterministic); don't commit binary PDFs.
6. Update the tools table and the known limits in `README.md`.

## Testing and definition of done

- **Run only what the change needs** (owner direction, 2026-11-06). While iterating: `npx tsc --noEmit`, `npm run lint`, and the
  tests for the area touched. Run the whole set once before handing work over for commit, or when a change reaches every
  page (colours, layout, headers, a shared block). Don't rerun suites to see a flake go away; find the cause.
- Tests run against the production export, the artefact that ships. Don't weaken an assertion to make a test pass,
  and don't commit `.only`. If a test fails, find the cause. One WebKit home-page test failed once and was never
  reproduced; treat any repeat as real.
- A gallery specimen that builds files and grows when ready goes at the end of the page, after the toasts, and its
  `ResultPanel` is given `focusOnArrival={false}`: otherwise it scrolls the page and moves every control below it under the tests.
- Gallery tests that use `page.mouse`, or wait for thumbnails, scroll the specimen into view first
  (`scrollIntoViewIfNeeded()`): mouse coordinates are the viewport's, and thumbnails are only requested near the screen.
- UI changes are verified in the browser pane and shown with a screenshot at desktop and phone width.
  Show both themes.
- Done means: `npm run lint`, `npm run licenses` and `npm test` (Chromium and WebKit) all pass, `npm run test:gallery`
  too when a block in `components/ui` changed, and the README stays accurate.

## Content and names

- No ads, analytics, cookie banners or accounts yet; don't add them. `app/how-it-works/page.tsx` states that the site collects
  nothing; if that ever changes, update that page in the same change.
- No translations until the owner decides. Decided 2026-11-06: no per-language pages or subfolder routes (`/id/...`),
  and the blog and guides stay English only. A language choice on the same URLs, covering the tool interface and the page text around
  it, is decided in principle. The choice is remembered on the device (approved 2026-11-06): the language code only, under
  one `localStorage` key, written only when the visitor picks a language, with no automatic detection and nothing else
  stored. Wrap every storage call in try/catch so the page works when storage is blocked, and update
  `app/how-it-works/page.tsx` to say so in the same change. Nothing is translated until the owner approves the languages
  and a native-speaker review.
- Don't name other companies' products (Adobe, iLovePDF, Smallpdf and so on) in page copy without review; plain
  descriptions ("PDF editors") are fine.
- Page plans and strategy are kept outside this repo. Ask for the current plan instead of guessing which pages to
  build next.
