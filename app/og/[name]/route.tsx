import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { createElement } from "react";
import { iconShapes, type IconName } from "@/components/ui/Icon";
import { getPosts } from "@/lib/content";
import { SHARE_SIZE } from "@/lib/seo";
import { SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { token } from "@/lib/tokens";
import { CATEGORIES, TOOLS, getTool, type CategoryId } from "@/lib/tools";

// The pictures that link previews show (Open Graph and X cards), one for every page that has none of its own:
// /og/home.png, /og/merge-pdf.png, /og/<a post's name>.png and so on. They are drawn here from each page's title when the
// site is built and written out as plain PNG files, so there is nothing to design or export by hand when a tool or a
// post is added, and no server draws anything for a visitor. lib/seo.ts points each page at its picture.
// Colours are read from app/globals.css (lib/tokens.ts), the font is the site's own, and the icon is the tool's.
export const dynamic = "force-static";
export const dynamicParams = false;

type Card = { key: string; label?: string; title: string; text: string; icon?: IconName; group?: CategoryId; /** The home page: a tile for each group of tools. */ groups?: boolean };

async function cards(): Promise<Card[]> {
  const posts = await getPosts();
  return [
    { key: "home", title: SITE_TAGLINE, text: "Merge, split, convert, edit and protect PDFs. No account, no watermark.", groups: true },
    ...TOOLS.map((t) => ({ key: t.slug, label: CATEGORIES[t.category].name, title: t.name, text: t.short, icon: t.icon, group: t.category })),
    { key: "how-it-works", label: "About", title: "How it works and your privacy", text: "What happens to your files, and how to check it yourself.", icon: "shield" as const },
    { key: "licences", label: "About", title: "Licences", text: "The open-source software and the font this site is built with.", icon: "text" as const },
    { key: "blog", label: "Blog", title: "Short guides on working with PDFs", text: "Making them smaller, taking them apart, and keeping what is in them private.", icon: "text" as const },
    // A post with its own picture uses that one (lib/seo.ts), so none is drawn for it.
    ...posts.filter((p) => !p.image).map((p) => {
      const tool = p.tool ? getTool(p.tool) : undefined;
      return { key: p.slug, label: "Blog", title: p.title, text: p.description, icon: tool?.icon ?? ("text" as const), group: tool?.category };
    }),
  ];
}

export async function generateStaticParams() {
  return (await cards()).map((c) => ({ name: `${c.key}.png` }));
}

// The font is the site's own (Google Sans, OFL), from the @fontsource package: the drawing library reads WOFF, and
// next/font keeps only WOFF2. Read once, when the first picture is drawn.
const FONT_DIR = path.join(process.cwd(), "node_modules", "@fontsource", "google-sans", "files");

/**
 * The drawing library's font reader stops on one kind of entry in Google Sans's table of letter substitutions (GSUB,
 * which holds ligatures such as "fi"): "lookupType: 7 is not yet supported". It skips any table whose name it does not
 * know, so the copy handed to it has that one name changed, in memory only. The file on disk is untouched, spacing
 * between letters (a different table) still applies, and the only loss is joined-up "fi" and "fl" in these pictures.
 * A WOFF file starts with a 44-byte header and then one 20-byte entry per table, each beginning with its name.
 */
function withoutSubstitutions(file: Buffer): Buffer {
  const copy = Buffer.from(file);
  const tables = copy.readUInt16BE(12);
  for (let i = 0; i < tables; i++) {
    const at = 44 + i * 20;
    if (copy.toString("latin1", at, at + 4) === "GSUB") copy.write("gsub", at, "latin1");
  }
  return copy;
}

const fonts = Promise.all(
  ([400, 500, 700] as const).map(async (weight) => ({
    name: "Google Sans",
    data: withoutSubstitutions(await readFile(path.join(FONT_DIR, `google-sans-latin-${weight}-normal.woff`))),
    weight,
    style: "normal" as const,
  })),
);

/** One of the site's icons, drawn from its shapes: an icon component cannot be rendered into a picture here. */
function Glyph({ name, size, color }: { name: IconName; size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      {iconShapes(name).map(([tag, { key, ...attributes }], i) => createElement(tag, { ...attributes, key: key ?? i }))}
    </svg>
  );
}

// Long titles step down in size so that nothing is ever cut off.
const titleSize = (title: string) => (title.length <= 18 ? 96 : title.length <= 30 ? 80 : title.length <= 46 ? 64 : 54);

function Picture({ card }: { card: Card }) {
  const tint = card.group ? token(`cat-${card.group}-bg`) : token("action-soft");
  const ink = card.group ? token(`cat-${card.group}-ink`) : token("action-ink");
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 44, backgroundColor: token("canvas"), backgroundImage: `linear-gradient(180deg, ${token("wash")}, ${token("canvas")} 55%)`, fontFamily: "Google Sans", color: token("ink") }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 56px", borderRadius: 36, border: `2px solid ${token("line-soft")}`, backgroundColor: token("surface"), boxShadow: `0 24px 60px -30px ${token("shadow")}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span>pdf</span><span style={{ color: token("action") }}>.do</span>
          </div>
          {card.label && (
            <div style={{ display: "flex", padding: "10px 24px", borderRadius: 999, backgroundColor: tint, color: ink, fontSize: 24, fontWeight: 500 }}>{card.label}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          {card.icon && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 136, height: 136, flexShrink: 0, borderRadius: 34, backgroundColor: tint }}>
              <Glyph name={card.icon} size={68} color={ink} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: titleSize(card.title), fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.03em" }}>{card.title}</div>
            <div style={{ marginTop: 20, fontSize: 30, lineHeight: 1.35, color: token("ink-2"), display: "block", lineClamp: 2 }}>{card.text}</div>
            {card.groups && (
              <div style={{ display: "flex", gap: 18, marginTop: 34 }}>
                {(Object.keys(CATEGORIES) as CategoryId[]).map((id) => (
                  <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 76, height: 76, borderRadius: 20, backgroundColor: token(`cat-${id}-bg`) }}>
                    <Glyph name={CATEGORIES[id].icon} size={38} color={token(`cat-${id}-ink`)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24, color: token("ink-2") }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Glyph name="shield" size={30} color={token("success")} />
            <span>Runs in your browser. Your files are not uploaded.</span>
          </div>
          <span style={{ color: token("ink-3") }}>{new URL(SITE_URL).host}</span>
        </div>
      </div>
    </div>
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const card = (await cards()).find((c) => `${c.key}.png` === name);
  if (!card) return new Response("Not found", { status: 404 });
  return new ImageResponse(<Picture card={card} />, { ...SHARE_SIZE, fonts: await fonts });
}
