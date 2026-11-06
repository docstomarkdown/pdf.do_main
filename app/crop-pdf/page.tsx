import type { Metadata } from "next";
import { CropTool } from "@/components/tool/CropTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("crop-pdf")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><CropTool /></ToolPage>);
}
