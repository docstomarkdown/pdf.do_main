import type { Metadata } from "next";
import { BatesTool } from "@/components/tool/BatesTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("bates-numbering")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><BatesTool /></ToolPage>);
}
