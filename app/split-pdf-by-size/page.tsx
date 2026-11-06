import type { Metadata } from "next";
import { SplitBySizeTool } from "@/components/tool/SplitBySizeTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf-by-size")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SplitBySizeTool /></ToolPage>);
}
