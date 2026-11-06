import type { Metadata } from "next";
import { WatermarkTool } from "@/components/tool/WatermarkTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("add-watermark")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><WatermarkTool /></ToolPage>);
}
