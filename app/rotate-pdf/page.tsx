import { RotateTool } from "@/components/tool/RotateTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("rotate-pdf")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><RotateTool /></ToolPage>);
}
