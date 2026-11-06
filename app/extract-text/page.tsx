import type { Metadata } from "next";
import { ExtractTextTool } from "@/components/tool/ExtractTextTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("extract-text")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><ExtractTextTool /></ToolPage>);
}
