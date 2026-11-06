import type { Metadata } from "next";
import { SplitTool } from "@/components/tool/SplitTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SplitTool /></ToolPage>);
}
