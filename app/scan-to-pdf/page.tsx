import type { Metadata } from "next";
import { ImagesToPdfTool } from "@/components/tool/ImagesToPdfTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("scan-to-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><ImagesToPdfTool variant="scan" /></ToolPage>);
}
