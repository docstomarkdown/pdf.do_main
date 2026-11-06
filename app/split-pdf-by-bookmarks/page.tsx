import type { Metadata } from "next";
import { SplitBookmarksTool } from "@/components/tool/SplitBookmarksTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf-by-bookmarks")!;
export const metadata: Metadata = { title: tool.name, description: tool.intro };

export default function Page() {
  return (<ToolPage tool={tool}><SplitBookmarksTool /></ToolPage>);
}
