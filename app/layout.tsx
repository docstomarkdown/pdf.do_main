import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LiveRegion } from "@/components/ui/LiveRegion";
import { NotifierHost } from "@/components/ui/Notifier";

// Google Sans, served from our own origin: next/font downloads it at build time and the browser never contacts
// Google. This is an approved exception to the no-third-party-font-host rule (owner decision 2026-11-06).
// Next has no size metrics for Google Sans, so it cannot build an adjusted fallback font; saying so here keeps the
// build quiet and the choice visible. Only the Latin subset is preloaded; a character outside it (such as the
// arrow in "9.1 MB → 643 KB") loads its own small file on demand.
const googleSans = Google_Sans({ subsets: ["latin"], variable: "--font-google-sans", display: "swap", adjustFontFallback: false });

export const metadata: Metadata = {
  title: { default: "pdf.do — PDF tools that run in your browser", template: "%s · pdf.do" },
  description: "Merge, split, convert, edit and protect PDFs without uploading them. Processing happens in your browser.",
  // Prototype: not for indexing. Three layers say so, and all three go together at go-live: this tag, the X-Robots-Tag
  // header in vercel.json (Vercel) and public/_headers (Cloudflare Pages, Netlify). tests/noindex.spec.ts checks all three.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

// A meta CSP is host-agnostic, so it works on any static host. It only governs the page itself; worker
// network access needs response headers once a host is chosen (the tests assert no outbound requests regardless).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme="system": the page follows the device's light or dark setting (decisions/0007). Every file is on tokens.
    <html lang="en" data-theme="system" className={googleSans.variable}>
      <head>{process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={csp} />}</head>
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="skip-link sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:font-semibold focus:shadow-lg">
          Skip to content
        </a>
        <Header />
        <main id="main" className="app-region mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
        <Footer />
        <LiveRegion />
        <NotifierHost />
      </body>
    </html>
  );
}
