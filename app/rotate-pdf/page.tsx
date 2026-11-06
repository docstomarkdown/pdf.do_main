import type { Metadata } from "next";
import { RotateTool } from "@/components/tool/RotateTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("rotate-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><RotateTool /></ToolPage>);
}
