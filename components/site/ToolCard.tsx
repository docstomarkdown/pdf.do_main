import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-400 hover:shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100">
        <Icon name={tool.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold text-slate-900">{tool.name}</span>
        <span className="mt-1 block text-sm text-slate-600">{tool.short}</span>
      </span>
    </Link>
  );
}
