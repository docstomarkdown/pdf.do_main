import { FillableTool } from "@/components/tool/FillableTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("make-pdf-fillable")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><FillableTool /></ToolPage>);
}
