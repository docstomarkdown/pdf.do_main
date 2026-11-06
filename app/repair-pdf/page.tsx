import type { Metadata } from "next";
import { RepairTool } from "@/components/tool/RepairTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("repair-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><RepairTool /></ToolPage>);
}
