import type { Metadata } from "next";
import { ToolPage } from "@/components/tool/ToolPage";
import { PagesTool } from "@/components/tool/PagesTool";
import { getTool } from "@/lib/tools";

const tool = getTool("delete-pdf-pages")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><PagesTool mode="delete" /></ToolPage>);
}
