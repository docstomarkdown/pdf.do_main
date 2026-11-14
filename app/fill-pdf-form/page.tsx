import { FormTool } from "@/components/tool/FormTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("fill-pdf-form")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><FormTool /></ToolPage>);
}
