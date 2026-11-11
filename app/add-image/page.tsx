import { AddImageTool } from "@/components/tool/AddImageTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("add-image")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><AddImageTool /></ToolPage>);
}
