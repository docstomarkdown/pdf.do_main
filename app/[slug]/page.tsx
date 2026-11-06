import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/tool/ToolPage";
import { CompressTool } from "@/components/tool/CompressTool";
import { SizeLinks } from "@/components/tool/SizeLinks";
import { getTool, presetPages } from "@/lib/tools";

// Pages generated from the registry: today, the compress-size pages. Static export needs every
// path listed up front, and anything else is a 404 (not a runtime lookup).
export const dynamicParams = false;
export function generateStaticParams() {
  return presetPages().map((t) => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool ? { title: tool.name, description: tool.intro } : {};
}

export default async function Page({ params }: Props) {
  const tool = getTool((await params).slug);
  if (!tool || !tool.presetBytes) notFound();
  return (
    <ToolPage tool={tool} extra={<SizeLinks current={tool.slug} />}>
      <CompressTool presetBytes={tool.presetBytes} />
    </ToolPage>
  );
}
