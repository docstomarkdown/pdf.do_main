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
