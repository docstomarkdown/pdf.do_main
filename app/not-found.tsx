import { ButtonLink } from "@/components/ui/Button";
import { ToolCard } from "@/components/site/ToolCard";
import { ToolSearch } from "@/components/site/ToolSearch";
import { toolsByCategory } from "@/lib/tools";

export default function NotFound() {
  const tools = toolsByCategory().flatMap((c) => c.tools);
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">That page doesn&rsquo;t exist</h1>
      <p className="mt-3 text-lg text-ink-2">Search for a tool, or pick one from the list.</p>
      {/* The ways out come first: the search and the way home used to sit under all the cards. */}
      <div className="mx-auto mt-6 max-w-xl text-left"><ToolSearch /></div>
      <div className="mt-5"><ButtonLink href="/" variant="secondary" icon="home">Back to the home page</ButtonLink></div>
      <ul className="mt-10 grid gap-4 text-left sm:grid-cols-2">
        {tools.map((t) => (<li key={t.slug}><ToolCard tool={t} /></li>))}
      </ul>
    </div>
  );
}
