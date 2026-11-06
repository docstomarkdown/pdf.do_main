import type { Metadata } from "next";
import { FormTool } from "@/components/tool/FormTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("fill-pdf-form")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><FormTool /></ToolPage>);
}
