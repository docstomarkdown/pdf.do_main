import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: { default: "pdf.do — PDF tools that run in your browser", template: "%s · pdf.do" },
  description: "Merge, compress and edit PDFs without uploading them. Processing happens in your browser.",
  // Prototype: not for indexing. Remove only as part of a go-live decision.
  robots: { index: false, follow: false },
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
    <html lang="en">
      <head>{process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={csp} />}</head>
      <body className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-indigo-700 focus:shadow-lg">
          Skip to content
        </a>
        <Header />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
