import fs from "node:fs";
import path from "node:path";

/**
 * The light theme's colours, read from app/globals.css when the site is built. For the one place that cannot use a
 * class or a CSS variable: the pictures drawn for link previews (app/og). Colours still live in globals.css and
 * nowhere else; this only reads them. Not for the browser.
 */
let cache: Record<string, string> | undefined;

export function lightTokens(): Record<string, string> {
  if (cache) return cache;
  const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
  const start = css.indexOf("@theme static {");
  const end = css.indexOf("\n}", start);
  if (start < 0 || end < 0) throw new Error("lib/tokens.ts: the light token list (@theme static) was not found in app/globals.css");
  const tokens: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--color-([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return (cache = tokens);
}

/** One token's value; a missing name stops the build instead of drawing the wrong colour. */
export function token(name: string): string {
  const value = lightTokens()[name];
  if (!value) throw new Error(`lib/tokens.ts: no colour token named "${name}" in app/globals.css`);
  return value;
}

/** An OKLCH colour as #rrggbb (the pictures cannot read the OKLCH form). The hue replaces the one in the value. */
function oklchToHex(value: string, hue: number): string {
  const m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+[\d.]+/);
  if (!m) throw new Error(`lib/tokens.ts: "${value}" is not an OKLCH colour`);
  const [L, C] = [Number(m[1]), Number(m[2])];
  const a = C * Math.cos((hue * Math.PI) / 180);
  const b = C * Math.sin((hue * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s];
  const byte = (x: number) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.max(x, 0) ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  };
  return `#${lin.map(byte).join("")}`;
}

/**
 * A group of tools' tint and ink for the link-preview pictures: the two recipe colours (`--color-cat-tint`, `--color-cat-ink`)
 * with the group's hue from its `.cat-<id>` class, all in app/globals.css, so the pictures follow the page.
 */
export function categoryColours(id: string): { tint: string; ink: string } {
  const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
  const m = css.match(new RegExp(`\\.cat-${id}\\s*\\{\\s*--cat-hue:\\s*([\\d.]+)`));
  if (!m) throw new Error(`lib/tokens.ts: no hue for the group "${id}" (.cat-${id} in app/globals.css)`);
  return { tint: oklchToHex(token("cat-tint"), Number(m[1])), ink: oklchToHex(token("cat-ink"), Number(m[1])) };
}
