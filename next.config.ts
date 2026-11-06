import type { NextConfig } from "next";

// The component gallery (app/gallery/page.gallery.tsx) is a development page. It is only a route when
// "gallery.tsx" is a page extension: in `next dev`, or when the build is asked for it with GALLERY=1.
// A plain `next build` leaves it out, so it never reaches the live export.
const withGallery = process.env.GALLERY === "1" || process.env.NODE_ENV !== "production";

// Static export: no server features, so the same build runs on Cloudflare,
// Vercel or any static host. Keep it that way until a host is chosen.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: { root: __dirname },
  pageExtensions: withGallery ? ["tsx", "ts", "jsx", "js", "gallery.tsx"] : ["tsx", "ts", "jsx", "js"],
};

export default nextConfig;
