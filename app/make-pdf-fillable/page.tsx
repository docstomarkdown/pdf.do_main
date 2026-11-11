import type { Metadata } from "next";
import { FillableTool } from "@/components/tool/FillableTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("make-pdf-fillable")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><FillableTool /></ToolPage>);
}
