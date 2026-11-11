import type { Metadata } from "next";
import { Google_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LiveRegion } from "@/components/ui/LiveRegion";
import { NotifierHost } from "@/components/ui/Notifier";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Google Sans, served from our own origin: next/font downloads it at build time and the browser never contacts
// Google. This is an approved exception to the no-third-party-font-host rule (owner decision 2026-11-06).
// Next has no size metrics for Google Sans, so it cannot build an adjusted fallback font; saying so here keeps the
// build quiet and the choice visible. Only the Latin subset is preloaded; a character outside it (such as the
// arrow in "9.1 MB → 643 KB") loads its own small file on demand.
const googleSans = Google_Sans({ subsets: ["latin"], variable: "--font-google-sans", display: "swap", adjustFontFallback: false });

export const metadata: Metadata = {
  // Makes whole addresses out of the paths that pages give for their canonical link and their preview picture.
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // What a page that sets nothing of its own is shared with (the not-found page). Every real page sets its own
  // through pageMeta() in lib/seo.ts, with its own address, title and picture.
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB", title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION, images: [{ url: "/og/home.png", width: 1200, height: 630, alt: SITE_TAGLINE }] },
  twitter: { card: "summary_large_image" },
  // Both icons are named here: listing one stops Next from adding the other by itself. The browser-tab icon is the
  // drawing in app/icon.svg; the home-screen icon is drawn from it when the site is built (app/apple-touch-icon.png).
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
