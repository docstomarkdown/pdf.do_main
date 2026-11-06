import type { Metadata } from "next";
import { SplitHalfTool } from "@/components/tool/SplitHalfTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf-in-half")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SplitHalfTool /></ToolPage>);
}
