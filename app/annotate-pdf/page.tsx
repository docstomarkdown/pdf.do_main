import type { Metadata } from "next";
import { AnnotateTool } from "@/components/tool/AnnotateTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("annotate-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><AnnotateTool /></ToolPage>);
}
