import { CropTool } from "@/components/tool/CropTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("crop-pdf")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><CropTool /></ToolPage>);
}
