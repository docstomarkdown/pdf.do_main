// Colour gate. Every colour in this app lives in app/globals.css, as a token or as a component class
// (.btn-primary, .alert-error and so on). Components carry layout and classes only, never a colour.
// This script fails when a source file contains a raw Tailwind palette class (bg-indigo-600), a white or
// black class, a hex value, or a colour function. Files not yet moved onto tokens are listed in LEGACY;
// that list may only shrink. Never add a file to it.
import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "lib"];
const SOURCE = /\.(tsx|ts|jsx|js|mjs)$/;

// Files still carrying raw colours, to be moved onto tokens when their blocks are rebuilt (build set B).
const LEGACY = new Set([]);

// Not theme colours: a PDF page is drawn on white paper whatever the theme.
const EXEMPT = new Set(["lib/raster-compress.ts", "lib/use-pdf-document.ts"]);

const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTIL = "bg|text|border|border-[trblxyse]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|shadow|decoration|inset-ring";
const rules = [
  ["raw palette class", new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:${UTIL})-(?:${PALETTE})-\\d{2,3}(?:/\\d+)?(?![\\w-])`, "g")],
  ["white or black class", new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|divide|shadow)-(?:white|black)(?:/\\d+)?(?![\\w-])`, "g")],
  ["hex colour", /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g],
  ["colour function", /\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(/g],
];

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (SOURCE.test(entry.name)) yield p;
  }
}

let failed = false;
let legacyFiles = 0;
const stale = [];
for (const file of ROOTS.flatMap((r) => [...walk(r)]).sort()) {
  if (EXEMPT.has(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const found = [];
  for (const [label, re] of rules) for (const m of text.matchAll(re)) found.push(`${label}: ${m[0]}`);
  const legacy = LEGACY.has(file);
  if (legacy && found.length === 0) stale.push(file);
  if (found.length === 0) continue;
  if (legacy) { legacyFiles++; continue; }
  failed = true;
  console.log(`FAIL  ${file}  (${found.length})`);
  for (const f of [...new Set(found)].slice(0, 6)) console.log(`        ${f}`);
}
for (const f of stale) console.log(`NOTE  ${f} is clean now: remove it from LEGACY`);

// The token lists in app/globals.css must agree: light twice (the default and .scheme-light), dark twice
// (the explicit scope and the device-setting media query). A token missing from one would silently fall
// back to the wrong theme.
const css = fs.readFileSync("app/globals.css", "utf8");
function tokensIn(startMarker) {
  const at = css.indexOf(startMarker);
  if (at < 0) return null;
  const open = css.indexOf("{", at);
  let depth = 0, end = open;
  for (; end < css.length; end++) {
    if (css[end] === "{") depth++;
    else if (css[end] === "}" && --depth === 0) break;
  }
  const map = new Map();
  for (const m of css.slice(open, end).matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) map.set(m[1], m[2].trim());
  return map;
}
const lists = {
  "light (@theme static)": tokensIn("@theme static {"),
  "light (.scheme-light)": tokensIn(".scheme-light {"),
  "dark (.scheme-dark)": tokensIn(".scheme-dark,\n:root[data-theme=\"dark\"] {"),
  "dark (device setting)": tokensIn(":root[data-theme=\"system\"] {"),
};
const names = Object.keys(lists);
for (const n of names) if (!lists[n] || lists[n].size === 0) { failed = true; console.log(`FAIL  app/globals.css: no tokens found in ${n}`); }
if (names.every((n) => lists[n])) {
  const [lightA, lightB, darkA, darkB] = names.map((n) => lists[n]);
  const all = new Set([...lightA.keys(), ...lightB.keys(), ...darkA.keys(), ...darkB.keys()]);
  let tokenProblems = 0;
  const bad = (message) => { failed = true; tokenProblems++; console.log(`FAIL  app/globals.css: ${message}`); };
  for (const token of all) {
    for (const n of names) if (!lists[n].has(token)) bad(`--color-${token} is missing from ${n}`);
    if (lightA.get(token) !== lightB.get(token)) bad(`--color-${token} differs between the two light lists`);
    if (darkA.get(token) !== darkB.get(token)) bad(`--color-${token} differs between the two dark lists`);
  }
  if (tokenProblems === 0) console.log(`Token lists agree: ${all.size} tokens, each in four places`);
}
console.log(failed
  ? "\nColour gate FAILED: move the colour into app/globals.css (a token or a component class)."
  : `\nColour gate passed (${legacyFiles} legacy file${legacyFiles === 1 ? "" : "s"} still to move onto tokens)`);
process.exit(failed ? 1 : 0);
