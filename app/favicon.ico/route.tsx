import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Browsers and many apps ask for /favicon.ico whether or not the page names an icon. With no such file the request fell
// through to app/[slug] (the compress-size pages and the posts), which can only serve the addresses it lists, so `next
// dev` answered with an error and the live site with a 404. This draws the browser-tab icon (app/icon.svg) once, when the
// site is built, as a 48 px picture. It is PNG data under the .ico name, which every current browser reads. Written out
// as a plain file, like /apple-touch-icon.png beside it.
export const dynamic = "force-static";

export async function GET() {
  const svg = await readFile(path.join(process.cwd(), "app", "icon.svg"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a picture at build time, not shown on a page */}
        <img src={`data:image/svg+xml;base64,${svg.toString("base64")}`} width={48} height={48} alt="" />
      </div>
    ),
    { width: 48, height: 48 },
  );
}
