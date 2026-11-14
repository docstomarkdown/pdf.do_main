import { SplitBySizeTool } from "@/components/tool/SplitBySizeTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf-by-size")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><SplitBySizeTool /></ToolPage>);
}
