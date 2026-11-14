import { BatesTool } from "@/components/tool/BatesTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("bates-numbering")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><BatesTool /></ToolPage>);
}
