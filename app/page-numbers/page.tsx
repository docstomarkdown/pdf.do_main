import type { Metadata } from "next";
import { PageNumbersTool } from "@/components/tool/PageNumbersTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("page-numbers")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><PageNumbersTool /></ToolPage>);
}
