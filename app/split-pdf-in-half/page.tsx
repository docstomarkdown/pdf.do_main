import { SplitHalfTool } from "@/components/tool/SplitHalfTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf-in-half")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><SplitHalfTool /></ToolPage>);
}
