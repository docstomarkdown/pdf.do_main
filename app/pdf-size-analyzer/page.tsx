import type { Metadata } from "next";
import { SizeAnalyzerTool } from "@/components/tool/SizeAnalyzerTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-size-analyzer")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SizeAnalyzerTool /></ToolPage>);
}
