import type { Metadata } from "next";
import { PdfToImageTool } from "@/components/tool/PdfToImageTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-to-jpg")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><PdfToImageTool format="jpg" /></ToolPage>);
}
