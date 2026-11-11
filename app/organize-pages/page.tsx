import { OrganizeTool } from "@/components/tool/OrganizeTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("organize-pages")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><OrganizeTool /></ToolPage>);
}
