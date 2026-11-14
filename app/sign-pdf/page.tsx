import { SignTool } from "@/components/tool/SignTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("sign-pdf")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><SignTool /></ToolPage>);
}
