import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Tool } from "@/lib/tools";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link href={`/${tool.slug}`} className={`tool-card cat-${tool.category}`}>
      <span className="tool-card-icon">
        <Icon name={tool.icon} className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold tracking-tight">{tool.name}</span>
        <span className="mt-1 block text-sm text-ink-3">{tool.short}</span>
      </span>
    </Link>
  );
}
