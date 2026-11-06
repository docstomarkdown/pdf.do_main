import type { Metadata } from "next";
import { MetadataTool } from "@/components/tool/MetadataTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("edit-pdf-metadata")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><MetadataTool /></ToolPage>);
}
