import type { Metadata } from "next";
import { OrganizeTool } from "@/components/tool/OrganizeTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("organize-pages")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><OrganizeTool /></ToolPage>);
}
