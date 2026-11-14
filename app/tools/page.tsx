import type { Metadata } from "next";
import { ToolSearch } from "@/components/site/ToolSearch";
import { ToolGroups } from "@/components/site/ToolGroups";
import { pageMeta } from "@/lib/seo";
import { toolsByCategory } from "@/lib/tools";

export const metadata: Metadata = pageMeta({
  path: "/tools",
  title: "PDF tools",
  description: "Every pdf.do tool in one list: merge, split, compress, sign, fill, convert and protect PDFs, all in your browser.",
});

const COUNT = toolsByCategory().reduce((n, c) => n + c.tools.length, 0);

/** Every tool, by group: the page the footer and the header's menu lead to. The home page does not list them. */
export default function Tools() {
  return (
    <div>
      <section className="mx-auto max-w-3xl pt-4 text-center sm:pt-10">
        <h1 className="title">PDF tools</h1>
        <p className="lead mx-auto mt-4 max-w-2xl">{COUNT} free tools. They run in your browser: nothing is uploaded, and there is no account or watermark.</p>
        <div className="mx-auto mt-8 max-w-xl text-left"><ToolSearch /></div>
      </section>
      <ToolGroups />
    </div>
  );
}
