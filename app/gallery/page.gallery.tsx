import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";

// A development page. Next only treats a file named page.gallery.tsx as a route when next.config.ts adds
// "gallery.tsx" to pageExtensions, which it does in `next dev` and when GALLERY=1. The live build leaves it out.
export const metadata: Metadata = { title: "Component gallery" };

export default function GalleryPage() {
  return <Gallery />;
}
