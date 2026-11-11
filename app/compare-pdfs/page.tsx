import { CompareTool } from "@/components/tool/CompareTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("compare-pdfs")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><CompareTool /></ToolPage>);
}
