import type { Metadata } from "next";
import { SecurityTool } from "@/components/tool/SecurityTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("encrypt-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SecurityTool mode="encrypt" /></ToolPage>);
}
