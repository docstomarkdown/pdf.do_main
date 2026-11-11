import { PdfToMarkdownTool } from "@/components/tool/PdfToMarkdownTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-to-markdown")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><PdfToMarkdownTool /></ToolPage>);
}
