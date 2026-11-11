import { SplitBookmarksTool } from "@/components/tool/SplitBookmarksTool";
import { ToolPage } from "@/components/tool/ToolPage";
import { toolMeta } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const tool = getTool("split-pdf-by-bookmarks")!;
export const metadata = toolMeta(tool);

export default function Page() {
  return (<ToolPage tool={tool}><SplitBookmarksTool /></ToolPage>);
}
