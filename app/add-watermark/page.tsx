import { WatermarkTool } from "@/components/tool/WatermarkTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("add-watermark")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><WatermarkTool /></ToolPage>);
}
