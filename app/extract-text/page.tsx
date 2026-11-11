import { ExtractTextTool } from "@/components/tool/ExtractTextTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("extract-text")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><ExtractTextTool /></ToolPage>);
}
