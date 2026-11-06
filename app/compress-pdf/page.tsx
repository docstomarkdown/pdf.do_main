import type { Metadata } from "next";
import { ToolPage } from "@/components/tool/ToolPage";
import { CompressTool } from "@/components/tool/CompressTool";
import { SizeLinks } from "@/components/tool/SizeLinks";
import { getTool } from "@/lib/tools";

const tool = getTool("compress-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool} extra={<SizeLinks />}><CompressTool /></ToolPage>);
}
