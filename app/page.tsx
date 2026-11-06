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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">PDF tools that run in your browser</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-700">
          Merge, compress and tidy PDFs without sending them anywhere. No account, no watermark.
        </p>
        <div className="mx-auto mt-8 max-w-xl text-left"><ToolSearch /></div>
      </section>

      <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {promises.map((p) => (
          <li key={p.title} className="flex gap-3">
            <Icon name={p.icon} className="mt-0.5 h-6 w-6 shrink-0 text-indigo-700" />
            <div>
              <p className="font-semibold text-slate-900">{p.title}</p>
              <p className="text-sm text-slate-700">{p.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-14 space-y-12">
        {toolsByCategory().map((c) => (
          <section key={c.id} aria-labelledby={`cat-${c.id}`}>
            <div className="mb-4">
              <h2 id={`cat-${c.id}`} className="text-2xl font-bold tracking-tight text-slate-900">{c.name}</h2>
              <p className="text-slate-700">{c.blurb}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {c.tools.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
            </ul>
            {c.id === "compress" && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-slate-800">Or compress straight to a size</p>
                <ul className="flex flex-wrap gap-2">
                  {presetPages().map((t) => (
                    <li key={t.slug}>
                      <Link href={`/${t.slug}`} className="inline-block rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-800 hover:bg-indigo-100 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
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
