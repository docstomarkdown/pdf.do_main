import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ToolSearch } from "@/components/site/ToolSearch";
import { ToolCard } from "@/components/site/ToolCard";
import { presetPages, toolsByCategory } from "@/lib/tools";

const promises = [
  { icon: "shield" as const, title: "Stays on your device", text: "Your files are processed in your browser tab and are not uploaded." },
  { icon: "check" as const, title: "No sign-up, no watermark", text: "Open a tool, use it, download the result." },
  { icon: "lock" as const, title: "Check it yourself", text: "The how-it-works page shows how to confirm that nothing is sent." },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="display">PDF tools that run in your browser</h1>
        <p className="lead mx-auto mt-5 max-w-2xl">
          Merge, split, convert, edit and protect PDFs without sending them anywhere. No account, no watermark.
        </p>
        <div className="mx-auto mt-8 max-w-xl text-left"><ToolSearch /></div>
      </section>

      <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {promises.map((p) => (
          <li key={p.title} className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-action-soft text-action-ink"><Icon name={p.icon} className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-sm text-ink-2">{p.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-14 space-y-12">
        {toolsByCategory().map((c) => (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <div className="mb-4">
              <h2 id={`cat-${c.id}`} className="section-title">{c.name}</h2>
              <p className="text-ink-2">{c.blurb}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {c.tools.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
            </ul>
            {c.id === "compress" && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold">Or compress straight to a size</p>
                <ul className="flex flex-wrap gap-2">
                  {presetPages().map((t) => (
                    <li key={t.slug}>
                      <Link href={`/${t.slug}`} className="pill-link">
                        {t.name.replace("Compress PDF to ", "")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
