import type { Metadata } from "next";
import { ExtractImagesTool } from "@/components/tool/ExtractImagesTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("extract-images")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><ExtractImagesTool /></ToolPage>);
}
