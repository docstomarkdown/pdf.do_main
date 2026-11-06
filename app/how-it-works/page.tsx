import type { Metadata } from "next";
import { TextLink } from "@/components/ui/TextLink";

export const metadata: Metadata = {
  title: "How it works and your privacy",
  description: "What happens to your files on pdf.do, how to check it yourself, and what the tools cannot do yet.",
};

const h2 = "mt-10 text-2xl font-bold tracking-tight";
const p = "mt-3 leading-relaxed";

// This page describes the site as it is today: no analytics, no ads, no cookies. If any of those are
// added, this page must be updated in the same change (see AGENTS.md).
export default function HowItWorks() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works and your privacy</h1>
      <p className={p}>pdf.do does the work on your own device. This page explains what that means, and how you can check it.</p>

      <h2 className={h2}>What happens to your file</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-6 leading-relaxed">
        <li>You choose a file. Your browser reads it into memory in this tab. It is not sent anywhere.</li>
        <li>A small program running in the background of the same tab does the job: merging, splitting, converting, editing or protecting.</li>
        <li>The result is created in memory and offered to you as a download.</li>
        <li>Close the tab and it is gone. Nothing is saved on a server, because there is no server involved in the work.</li>
      </ol>

      <h2 className={h2}>Check it yourself</h2>
      <p className={p}>
        Open your browser&rsquo;s developer tools, go to the Network tab, run a tool, and look at the requests. You will see the
        page and the tool&rsquo;s own program files load, and nothing that carries your file. This site&rsquo;s tests make the same check on every tool.
      </p>

      <h2 className={h2}>What the site collects</h2>
      <p className={p}>Right now: nothing. There are no accounts, no analytics, no advertising and no cookies. If that changes, this page will change first.</p>

      <h2 className={h2}>Limits to know about</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
        <li>Your device&rsquo;s memory is the limit. Very large files can fail, especially on phones.</li>
        <li>A PDF that needs a password to open cannot be used by the other tools until its password is removed. Remove PDF password does that, and you need the password: nothing here guesses or cracks passwords.</li>
        <li>Scanned PDFs are pictures, not text, so tools that read text find none. Reading text from pictures (OCR) is not built yet.</li>
        <li>Compressing to a size can turn pages into images when optimising alone is not enough. The tool tells you when it does, and the text is then no longer selectable.</li>
        <li>This is an early version. Check important results before you send them.</li>
      </ul>

      <h2 className={h2}>What it is built with</h2>
      <p className={p}>
        Open-source libraries with permissive licences, such as pdf-lib (a maintained fork), PDF.js and qpdf compiled to WebAssembly, and the open font Google Sans.
        Nothing with a copyleft licence is included in what your browser downloads. <TextLink href="/licences">The licences are listed here</TextLink>.
      </p>

      <p className="mt-10"><TextLink href="/">Back to the tools</TextLink></p>
    </article>
  );
}
