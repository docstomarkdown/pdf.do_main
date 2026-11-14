import { TextLink } from "@/components/ui/TextLink";
import { ToolSearch } from "@/components/site/ToolSearch";
import { ToolChips, ToolGroups } from "@/components/site/ToolGroups";
import { FactRow, SectionHead } from "@/components/site/Section";
import { PlatformHero, PlatformMore, PlatformStory, PlatformTrust } from "@/components/site/HomePlatform";
import { JsonLd } from "@/components/blog/JsonLd";
import { pageMeta } from "@/lib/seo";
import { toolsByCategory } from "@/lib/tools";
import { PLATFORM_PREVIEW, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const metadata = pageMeta({ path: "/", title: SITE_TAGLINE, description: SITE_DESCRIPTION, wholeTitle: `${SITE_NAME} — ${SITE_TAGLINE}` });

const TOOL_COUNT = toolsByCategory().reduce((n, c) => n + c.tools.length, 0);

// The tools most people come for, under the search.
const POPULAR = ["merge-pdf", "sign-pdf", "fill-pdf-form", "compress-pdf", "split-pdf", "pdf-to-jpg", "images-to-pdf", "add-watermark"];

/** The search and the most-used tools. */
function Start() {
  return (
    <>
      <div className="mx-auto mt-8 max-w-xl text-left"><ToolSearch /></div>
      <div className="mt-6"><ToolChips slugs={POPULAR} label="Popular tools" /></div>
    </>
  );
}

export default function Home() {
  return (
    <div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, inLanguage: "en" }} />

      {PLATFORM_PREVIEW ? (
        // The platform preview (lib/site.ts): the whole product, with the tools as one part of it.
        <>
          <PlatformHero />
          <PlatformStory />
          <PlatformMore />
          {/* The tools are a part of the product, not the front of it: one line and a few of the most used. */}
          <section id="tools" className="mt-28 text-center" aria-labelledby="tools-title">
            <SectionHead center id="tools-title" kicker="Built in" title="Work on any document, right where it is"
              lead={<>Merge, sign, fill, compress and convert, with {TOOL_COUNT} free PDF tools that run in your browser. Use them on a kept file, or on their own with no account.</>} />
            <div className="mt-7"><ToolChips slugs={POPULAR} label="Popular tools" /></div>
            <p className="mt-5"><TextLink href="/tools">See all {TOOL_COUNT} PDF tools</TextLink></p>
          </section>
          <PlatformTrust />
        </>
      ) : (
        // The live home page: the tools, in the minimal look.
        <>
          <section id="tools" className="mx-auto max-w-3xl pt-4 text-center sm:pt-10">
            <h1 className="display">Do anything with a <span className="mark-hl">PDF</span></h1>
            <p className="lead mx-auto mt-6 max-w-2xl">
              Merge, compress, sign, fill and convert PDFs for free. Everything runs in your browser: no upload, no account,
              no watermark.
            </p>
            <Start />
          </section>
          <ToolGroups />
          <section className="mt-24" aria-labelledby="plainly">
            <SectionHead center id="plainly" title="Your files, plainly" />
            <FactRow facts={[
              { icon: "shield", title: "Runs on your device", text: "Merging, compressing or signing happens in your browser tab. Nothing is uploaded." },
              { icon: "check", title: "No sign-up, no watermark", text: "Open a tool, use it, download the result." },
              // The fact that sends you to a page links to it.
              { icon: "lock", title: "Check it yourself", text: <>The <TextLink href="/how-it-works" className="tap">how-it-works page</TextLink> shows how to confirm that nothing is sent.</> },
            ]} />
          </section>
        </>
      )}
    </div>
  );
}
