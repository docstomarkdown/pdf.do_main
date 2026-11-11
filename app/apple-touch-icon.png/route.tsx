import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { token } from "@/lib/tokens";

// The icon a phone shows when the site is added to its home screen, and that some apps show beside a pasted link.
// Drawn when the site is built from the same drawing as the browser-tab icon (app/icon.svg), on a full square of the
// brand colour because phones cut the corners themselves. It is a route with a file name, not Next's `apple-icon`
// convention, because that one is written out with no ".png" and a plain file host would not know what it is.
export const dynamic = "force-static";

export async function GET() {
  const svg = await readFile(path.join(process.cwd(), "app", "icon.svg"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: token("focus") }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn into a picture at build time, not shown on a page */}
        <img src={`data:image/svg+xml;base64,${svg.toString("base64")}`} width={180} height={180} alt="" />
      </div>
    ),
    { width: 180, height: 180 },
  );
}
