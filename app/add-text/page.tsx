import type { Metadata } from "next";
import { AddTextTool } from "@/components/tool/AddTextTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("add-text")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><AddTextTool /></ToolPage>);
}
