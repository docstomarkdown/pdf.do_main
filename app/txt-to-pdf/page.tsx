import type { Metadata } from "next";
import { TextToPdfTool } from "@/components/tool/TextToPdfTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("txt-to-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><TextToPdfTool /></ToolPage>);
}
