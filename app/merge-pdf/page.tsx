import type { Metadata } from "next";
import { ToolPage } from "@/components/tool/ToolPage";
import { MergeTool } from "@/components/tool/MergeTool";
import { getTool } from "@/lib/tools";

const tool = getTool("merge-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><MergeTool /></ToolPage>);
}
