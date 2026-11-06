import type { Metadata } from "next";
import { CompareTool } from "@/components/tool/CompareTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("compare-pdfs")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><CompareTool /></ToolPage>);
}
