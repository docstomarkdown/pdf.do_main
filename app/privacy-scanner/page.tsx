import { PrivacyScannerTool } from "@/components/tool/PrivacyScannerTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("privacy-scanner")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><PrivacyScannerTool /></ToolPage>);
}
