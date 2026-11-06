import type { Metadata } from "next";
import { PdfToMarkdownTool } from "@/components/tool/PdfToMarkdownTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-to-markdown")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><PdfToMarkdownTool /></ToolPage>);
}
