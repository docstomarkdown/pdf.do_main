import type { Metadata } from "next";
import { AddImageTool } from "@/components/tool/AddImageTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("add-image")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><AddImageTool /></ToolPage>);
}
