import { AddTextTool } from "@/components/tool/AddTextTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("add-text")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><AddTextTool /></ToolPage>);
}
