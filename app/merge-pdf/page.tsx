import { ToolPage } from "@/components/tool/ToolPage";
import { MergeTool } from "@/components/tool/MergeTool";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("merge-pdf")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><MergeTool /></ToolPage>);
}
