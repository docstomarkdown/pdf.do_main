import { ToolPage } from "@/components/tool/ToolPage";
import { CompressTool } from "@/components/tool/CompressTool";
import { SizeLinks } from "@/components/tool/SizeLinks";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("compress-pdf")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool} extra={<SizeLinks />}><CompressTool /></ToolPage>);
}
