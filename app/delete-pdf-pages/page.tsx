import { ToolPage } from "@/components/tool/ToolPage";
import { PagesTool } from "@/components/tool/PagesTool";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("delete-pdf-pages")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><PagesTool mode="delete" /></ToolPage>);
}
