import { ButtonLink } from "@/components/ui/Button";
import { ToolCard } from "@/components/site/ToolCard";
import { toolsByCategory } from "@/lib/tools";

export default function NotFound() {
  const tools = toolsByCategory().flatMap((c) => c.tools);
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">That page doesn&rsquo;t exist</h1>
      <p className="mt-3 text-lg text-ink-2">Try one of the tools instead.</p>
      <ul className="mt-8 grid gap-4 text-left sm:grid-cols-2">
        {tools.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
      </ul>
      <div className="mt-8"><ButtonLink href="/" variant="secondary" icon="home">Back to all tools</ButtonLink></div>
    </div>
  );
}
