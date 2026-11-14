import { PdfToImageTool } from "@/components/tool/PdfToImageTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("pdf-to-jpg")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><PdfToImageTool format="jpg" /></ToolPage>);
}
