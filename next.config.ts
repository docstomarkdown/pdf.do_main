import type { NextConfig } from "next";

// Static export: no server features, so the same build runs on Cloudflare,
// Vercel or any static host. Keep it that way until a host is chosen.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: { root: __dirname },
};

export default nextConfig;
