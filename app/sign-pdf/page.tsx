import type { Metadata } from "next";
import { SignTool } from "@/components/tool/SignTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("sign-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SignTool /></ToolPage>);
}
