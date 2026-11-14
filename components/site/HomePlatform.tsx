import type { ReactNode } from "react";
import { DocRow, DocSearch, Hit } from "@/components/site/DocRow";
import { Logo } from "@/components/site/Logo";
import { FactRow, Feature, SectionHead } from "@/components/site/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SOURCE_NAMES, SourceBadge, type Source } from "@/components/ui/SourceBadge";

/*
 * The home page's platform sections (the minimal look approved on 2026-11-13), built from the shared parts in
 * components/site/Section.tsx and DocRow.tsx. Since 2026-11-14 the page says what pdf.do is as a context layer: the
 * layer between a person's work (chats, documents) and whichever AI they use, not another place to store files. They show
 * a product that is not live yet, so app/page.tsx renders them only in the platform preview (PLATFORM_PREVIEW in
 * lib/site.ts). Everything in the pictures is made-up sample content.
 */

/** A lead of short sentences, each its own paragraph, so a long sentence that wraps still reads as one. */
function Lines({ children }: { children: string[] }) {
  return <>{children.map((t, i) => <span key={t} className={i ? "mt-2.5 block" : "block"}>{t}</span>)}</>;
}

/** A rounded chip with a source's badge, as used across the pictures. */
function SourceChip({ source, children }: { source?: Source; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-surface px-2.5 py-1.5 text-[0.82rem]">
      {source && <SourceBadge source={source} small />}{children}
    </span>
  );
}

/** The first screen: context is the new layer, and pdf.do is yours. */
export function PlatformHero() {
  return (
    <section className="relative pt-6 text-center sm:pt-12">
      {/* The name, once, above the claim: the header carries the mark, this is where a first-time visitor reads it. */}
      <p className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line-soft py-1.5 pl-2.5 pr-3 text-[0.8rem] text-ink-2 sm:gap-2 sm:pr-3.5 sm:text-sm">
        <Logo className="h-5 w-5 text-logo" />
        <b className="text-ink">pdf<span className="text-logo">.do</span></b>
        <span aria-hidden="true" className="text-ink-3">·</span>
        Context is the new layer
      </p>
      <h1 className="display mx-auto mt-6 max-w-[16ch]">The <span className="mark-hl">context layer</span> for your AI work</h1>
      <p className="lead mx-auto mt-6 max-w-2xl">
        pdf.do keeps your chats, documents and decisions in one layer that ChatGPT, Claude and Gemini can all draw on. Every
        new conversation starts from what you already know, not from a blank page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="#tools" size="lg">Start free</ButtonLink>
        <ButtonLink href="#layer" size="lg" variant="secondary">See how it works</ButtonLink>
      </div>
      <p className="mt-3 text-sm text-ink-3">Free to start · works with any AI · nothing used to train AI</p>

      <LayerPicture />
    </section>
  );
}

/** Three bands: the AI on top, your work underneath, and pdf.do as the layer between them. */
function LayerPicture() {
  const arrows = (
    <svg className="doodle mx-auto my-2 h-7 w-16" viewBox="0 0 64 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 26V4M15 10l7-7 7 7" /><path d="M42 2v22M35 18l7 7 7-7" />
    </svg>
  );
  return (
    <div className="mx-auto mt-14 max-w-3xl text-left" aria-hidden="true">
      <Band label="Your AI, whichever you use today">
        <SourceChip source="gpt">ChatGPT</SourceChip><SourceChip source="claude">Claude</SourceChip>
        <SourceChip source="gemini">Gemini</SourceChip><SourceChip>Any app that speaks MCP</SourceChip>
      </Band>
      {arrows}
      <Card className="border-action p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <b>pdf.do <span className="font-normal text-ink-3">· your context</span></b>
          <span className="text-xs text-ink-3">1,284 chats · 442 documents · linked</span>
        </div>
        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3">
          {[
            ["Decisions", "Drop the annual discount", "claude", "Claude · 14 Mar · message 41"],
            ["Drafts", "Pricing memo, version 3", "word", "Word · from that chat"],
            ["Sources", "Board update, March", "pdf", "PDF · page 3"],
          ].map(([kind, what, src, from]) => (
            <div key={kind} className="soft rounded-xl p-3">
              <p className="kicker text-xs">{kind}</p>
              <p className="mt-1 text-[0.9rem] font-medium">{what}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><SourceBadge source={src as Source} small />{from}</p>
            </div>
          ))}
        </div>
      </Card>
      {arrows}
      <Band label="Your work, wherever it happened">
        <SourceChip source="gpt">Chats</SourceChip><SourceChip source="word">Word files</SourceChip>
        <SourceChip source="pdf">PDFs</SourceChip><SourceChip source="md">Notes</SourceChip>
      </Band>
    </div>
  );
}

function Band({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-4 py-3">
      <p className="text-xs text-ink-3">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Scattered across apps: each AI only sees the chat in front of it. */
function ScatterPicture() {
  const items: [Source, string, string, string, string][] = [["gpt", "Launch plan", "4%", "6px", "-3deg"], ["claude", "Investor email draft", "40%", "34px", "2deg"], ["word", "Proposal_final_v7.docx", "8%", "82px", "1.5deg"], ["gemini", "Market sizing", "48%", "118px", "-2deg"], ["pdf", "Signed contract.pdf", "2%", "160px", "-1deg"]];
  return (
    <div className="mt-10 grid items-center gap-7 md:grid-cols-[1fr_auto_1fr]" aria-hidden="true">
      <div className="relative h-56">
        {items.map(([src, name, left, top, tilt]) => (
          <Card key={name} className="scatter-item absolute flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm" style={{ left, top, ["--tilt" as string]: tilt }}>
            <SourceBadge source={src} />{name}
          </Card>
        ))}
      </div>
      <svg className="doodle mx-auto w-14 rotate-90 md:rotate-0" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h52M44 3l10 9-10 9" /></svg>
      <Card className="p-4 text-[0.9rem]">
        <div className="soft ml-auto w-fit max-w-[90%] rounded-2xl px-3.5 py-2.5">Write the investor update for March</div>
        <div className="mt-2.5 max-w-[92%] px-1 text-ink-2">
          Happy to help. Could you share your revenue, what changed in pricing, and anything the board already knows?
        </div>
        <p className="mt-3 border-t border-line-soft pt-3 text-xs text-ink-3">A new chat, starting from nothing. Again.</p>
      </Card>
    </div>
  );
}

/** Capture: every source, kept whole. */
function SourcesPicture() {
  const ways: [Source, string][] = [["gpt", "extension or export"], ["claude", "extension"], ["gemini", "extension"], ["word", "upload"], ["pdf", "upload"], ["md", "upload"]];
  return (
    <Card className="p-4" aria-hidden="true">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ways.map(([src, how]) => (
          <div key={src} className="flex items-center gap-2.5 rounded-xl border border-line-soft p-3 text-sm">
            <SourceBadge source={src} /><span>{SOURCE_NAMES[src]}<span className="block text-xs text-ink-3">{how}</span></span>
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-line-soft pt-3.5 text-xs text-ink-2">
        {["62 messages", "4 images", "2 code blocks", "1 table", "14 Mar 2025"].map((k) => <span key={k} className="soft rounded-full px-2.5 py-1">{k}</span>)}
      </div>
    </Card>
  );
}

/** Connect: one document and the trail of context around it. */
function TrailPicture() {
  const trail: [string, Source, string, string][] = [
    ["Started in", "claude", "Pricing the Pro plan", "Claude · 14 Mar · message 41"],
    ["Checked against", "gpt", "Churn numbers, Q1", "ChatGPT · 2 Mar"],
    ["Written up as", "word", "Pricing memo, version 3", "Word · 18 Mar"],
    ["Signed off in", "pdf", "Board update, March", "PDF · page 3 · 28 Mar"],
  ];
  return (
    <Card className="p-4" aria-hidden="true">
      <p className="kicker text-xs">Decision</p>
      <p className="mt-1 font-semibold">Drop the annual discount, offer a 7-day pass</p>
      <ol className="mt-4 grid gap-3 border-l-2 border-line-soft pl-4">
        {trail.map(([how, src, name, meta]) => (
          <li key={name} className="text-[0.88rem]">
            <span className="text-xs text-ink-3">{how}</span>
            <span className="mt-0.5 flex items-center gap-2"><SourceBadge source={src} small /><b className="font-medium">{name}</b></span>
            <span className="block text-xs text-ink-3">{meta}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/** Use: any AI answers from your context, with its sources. */
function UsePicture() {
  const cites: [Source, string][] = [["claude", "Pricing the Pro plan · message 41"], ["pdf", "Board update, March · page 3"], ["gpt", "Churn numbers, Q1 · message 12"]];
  return (
    <Card className="p-4 text-[0.92rem]" aria-hidden="true">
      <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
        {(["gpt", "claude", "gemini"] as const).map((s, i) => (
          <span key={s} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${i === 1 ? "border-ink" : "border-line-soft text-ink-3"}`}><SourceBadge source={s} small />{SOURCE_NAMES[s]}</span>
        ))}
      </div>
      <div className="soft ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2.5">Write the investor update for March</div>
      <div className="my-2.5 flex items-center gap-2 text-xs text-ink-3"><span className="h-3.5 w-3.5 rounded border-2 border-ink" />pdf.do · read 3 items from Fundraise 2026</div>
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line-soft px-3.5 py-2.5">
        March: we dropped the annual discount <sup className="kicker">1</sup>, which the board approved <sup className="kicker">2</sup>,
        after annual plans made up most refunds <sup className="kicker">3</sup>…
        <div className="mt-2.5 grid gap-1.5 text-xs text-ink-2">
          {cites.map(([src, t], i) => (
            <span key={t} className="inline-flex items-center gap-2 rounded-lg border border-line-soft px-2 py-1.5"><b className="kicker">{i + 1}</b><SourceBadge source={src} small />{t}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** The workspace: a search across every source, and a chat open at the message it found. */
function ProductPicture() {
  const sources: [string, string, Source | null][] = [["Everything", "1,284", null], ["ChatGPT", "512", "gpt"], ["Claude", "238", "claude"], ["Gemini", "92", "gemini"], ["Documents", "442", "word"]];
  return (
    <Card className="mx-auto mt-12 overflow-hidden text-left" aria-hidden="true">
      <div className="flex items-center gap-1.5 border-b border-line-soft px-3.5 py-2.5">
        <span className="dot-chrome" /><span className="dot-chrome" /><span className="dot-chrome" />
        <span className="ml-2.5 text-xs text-ink-3">app.pdf.do</span>
      </div>
      <div className="grid min-h-[26rem] md:grid-cols-[11.5rem_1fr_1.1fr]">
        <div className="hidden border-r border-line-soft p-2.5 text-[0.84rem] md:block">
          {sources.map(([name, n, src], i) => (
            <div key={name} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${i === 0 ? "soft font-semibold" : "text-ink-2"}`}>
              {src && <SourceBadge source={src} small />}{name}<span className="ml-auto text-xs text-ink-3">{n}</span>
            </div>
          ))}
          <div className="mx-1 my-2.5 border-t border-line-soft" />
          <div className="px-2.5 py-1 text-xs text-ink-3">Collections</div>
          {["Fundraise 2026", "Client: Northwind", "Book, chapter 4"].map((c) => <div key={c} className="rounded-lg px-2.5 py-1.5 text-ink-2">{c}</div>)}
        </div>
        <div className="border-line-soft p-3.5 md:border-r">
          <DocSearch>why did we drop the annual discount</DocSearch>
          <div className="mb-2 flex flex-wrap gap-1.5 text-[0.72rem]">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-canvas">All</span>
            {["Chats", "Documents", "2025"].map((f) => <span key={f} className="rounded-full border border-line-soft px-2.5 py-0.5 text-ink-2">{f}</span>)}
          </div>
          <DocRow selected source="claude" name="Pricing the Pro plan" meta="Claude · 14 Mar 2025 · 62 messages" match={<>…<Hit>dropping the annual discount</Hit> because refunds took most of it…</>} />
          <DocRow source="word" name="Pricing memo v3.docx" meta="Word · 18 Mar 2025" match={<>…we no longer offer an <Hit>annual discount</Hit>…</>} />
          <DocRow source="gpt" name="Churn numbers, Q1" meta="ChatGPT · 2 Mar 2025" match={<>…refund requests by plan, <Hit>annual</Hit> vs monthly…</>} />
          <DocRow source="pdf" name="Board update, March.pdf" meta="PDF · page 3" match={<>…pricing: <Hit>annual discount</Hit> removed…</>} />
        </div>
        <div className="soft hidden p-4 text-[0.84rem] md:block">
          <div className="flex items-center gap-2"><SourceBadge source="claude" /><b className="text-[0.95rem]">Pricing the Pro plan</b></div>
          <div className="mb-3 ml-8 mt-0.5 text-xs text-ink-3">Claude · 14 March 2025 · kept with images and code</div>
          <div className="mb-2 ml-auto w-fit max-w-[92%] rounded-2xl border border-line-soft bg-surface px-3 py-2">Refunds are mostly yearly buyers. Should we keep the discount?</div>
          <div className="mb-2 max-w-[92%] px-3 py-2">Looking at the 41 refunds you pasted, 29 were annual plans bought with the discount…</div>
          <div className="hit mb-2 max-w-[92%] rounded-2xl px-3 py-2">I&apos;d suggest <Hit>dropping the annual discount</Hit> because refunds took most of it, and offering a 7-day pass instead.</div>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
            {([["word", "Pricing memo v3"], ["gpt", "Churn numbers, Q1"]] as const).map(([s, t]) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-surface px-2 py-1 text-xs text-ink-2"><SourceBadge source={s} small />{t}</span>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
            {["Make a Word file", "Sign as PDF", "Ask about this"].map((a) => <span key={a} className="rounded-lg border border-line bg-surface px-2 py-1">{a}</span>)}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** The problem, then the layer in three steps: capture, connect, use. */
export function PlatformStory() {
  return (
    <>
      <section className="mt-28" aria-labelledby="problem">
        <SectionHead center id="problem" kicker="The problem" title="Every new chat starts from zero"
          lead="The plan is in ChatGPT, the draft in Claude, the final version in Word, the signed copy in a PDF. Each AI sees only the chat in front of it, so you explain the same background again and again." />
        <ScatterPicture />
      </section>

      <section id="layer" className="mt-28" aria-labelledby="layer-title">
        <SectionHead center id="layer-title" kicker="How the layer works" title="Capture once. Use it in every AI."
          lead="pdf.do sits between your work and your AI. It gathers what you make, keeps where each piece came from, and hands the right context to whichever AI you open." />
      </section>
      <Feature space="mt-16" anchor="ai-chats" id="capture" kicker="1 · Capture" title="Everything you work on becomes context"
        lead={<Lines>{["Save any chat from ChatGPT, Claude or Gemini in one click.", "Bring in old chats from an export, and your Word files and PDFs.", "Every message, image and table is kept as it was."]}</Lines>}
        picture={<SourcesPicture />} />
      <Feature pictureFirst id="connect" kicker="2 · Connect" title="Kept with where it came from"
        lead={<Lines>{["A file in a drive forgets its story.", "In pdf.do, a decision stays linked to its chat, its drafts and the signed PDF.", "Each one opens at the exact message or page."]}</Lines>}
        picture={<TrailPicture />} />
      <Feature id="use" kicker="3 · Use" title="Any AI can draw on it, with sources"
        lead={<Lines>{["Connect pdf.do to Claude, ChatGPT or any app that speaks MCP.", "Ask for an update, and it is written from your own work.", "Every claim links to its source, and you choose what each AI can read."]}</Lines>}
        picture={<UsePicture />} />
    </>
  );
}

/** Why a layer and not a drive, and the workspace itself. */
export function PlatformMore() {
  return (
    <>
      <section className="mt-28" aria-labelledby="not-a-drive">
        <SectionHead center id="not-a-drive" kicker="Not another drive" title="A layer, not a folder of files"
          lead="Storage keeps files. A context layer keeps what they mean, and makes it usable." />
        <FactRow facts={[
          { title: "Outlives every model", text: "Models change every few months. Your context moves with you to the next one." },
          { title: "Keeps the why", text: "Decisions stay linked to the conversation and the documents behind them." },
          { title: "Grows as you work", text: "Each saved chat, signed PDF and new version adds to it. Nothing to file." },
          { title: "One place to act", text: "Search, then turn a chat into Word, sign, fill or merge, right where it is." },
        ]} />
        <ProductPicture />
      </section>
    </>
  );
}

/** Trust and control, said plainly, then the last call to start. */
export function PlatformTrust() {
  return (
    <>
      <section className="mt-28" aria-labelledby="control">
        <SectionHead center id="control" title="Your context, under your control" />
        <FactRow facts={[
          { title: "Private", text: "Stored encrypted. Never read by people, never used to train AI." },
          { title: "You decide what AI sees", text: "Connect one collection or all of it. Disconnect any time." },
          { title: "Yours to take", text: "Export everything, any time, as Word, PDF or Markdown." },
        ]} />
      </section>
      <section className="mt-32 text-center" aria-labelledby="end">
        <h2 id="end" className="section-title mx-auto max-w-[20ch]">Stop starting every chat from zero</h2>
        <div className="mt-8"><ButtonLink href="#tools" size="lg">Start free</ButtonLink></div>
        <p className="mt-3 text-sm text-ink-3">Works with ChatGPT, Claude and Gemini · Word and PDF</p>
      </section>
    </>
  );
}
