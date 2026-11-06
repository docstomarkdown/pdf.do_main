import type { Metadata } from "next";
import { PrivacyScannerTool } from "@/components/tool/PrivacyScannerTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("privacy-scanner")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><PrivacyScannerTool /></ToolPage>);
}
