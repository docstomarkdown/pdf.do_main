import { ImageResponse } from "next/og";
import { Logo } from "@/components/site/Logo";
import { token } from "@/lib/tokens";

// The icon a phone shows when the site is added to its home screen, and that some apps show beside a pasted link.
// Drawn when the site is built: the logo (lib/logo.ts) in petrol (the logo token) on a full white square, because phones cut the
// corners themselves and the logo never sits in a block of colour. It is a route with a file name, not Next's `apple-icon`
// convention, because that one is written out with no ".png" and a plain file host would not know what it is.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: token("surface") }}>
        <Logo size={124} color={token("logo")} />
      </div>
    ),
    { width: 180, height: 180 },
  );
}
