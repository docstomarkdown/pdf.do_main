// Licence gate (foundations.md section 6). Walks the dependency closure of the
// packages whose code ships to the browser and fails on copyleft that would
// reach the site (AGPL, GPL, SSPL). Build-time tooling is not checked: it is
// not distributed to visitors.
import fs from "node:fs";
import path from "node:path";

// lucide-react (icons) and sonner (toasts) added 2026-11-06: both permissive, no runtime dependencies. See the
// dependency rule in AGENTS.md; reasons are in the commit message that adds them. fflate (ZIP, MIT, no dependencies)
// was already inside pdf-lib; it is now a direct dependency because the ZIP worker loads it on its own.
const SHIPPED = ["@fontsource/google-sans", "@cantoo/pdf-lib", "pdfjs-dist", "@neslinesli93/qpdf-wasm", "lucide-react", "sonner", "fflate", "signature_pad", "diff"];
const BAD = /\b(AGPL|GPL|SSPL|BUSL)\b|Commons Clause/i;
const seen = new Map();

function read(name) {
  const p = path.join("node_modules", name, "package.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
}
function walk(name) {
  if (seen.has(name)) return;
  const pkg = read(name);
  if (!pkg) { seen.set(name, { version: "?", license: "NOT INSTALLED" }); return; }
  const license = typeof pkg.license === "string" ? pkg.license : pkg.license?.type ?? "UNKNOWN";
  seen.set(name, { version: pkg.version, license });
  for (const dep of Object.keys(pkg.dependencies ?? {})) walk(dep);
}
SHIPPED.forEach(walk);

let failed = false;
for (const [name, { version, license }] of [...seen].sort()) {
  const bad = BAD.test(license) && !/LGPL/i.test(license);
  const unknown = /UNKNOWN|NOT INSTALLED|SEE LICENSE/i.test(license);
  if (bad || unknown) failed = true;
  console.log(`${bad ? "FAIL" : unknown ? "CHECK" : "ok  "}  ${name}@${version}  ${license}`);
}
console.log(failed ? "\nLicence gate FAILED" : `\nLicence gate passed (${seen.size} shipped packages)`);
// The font ships from @fontsource/google-sans (in SHIPPED above, since 2026-11-13). Its licence also needs the copyright line and
// the licence text on the licences page; fail if either is missing.
const page = fs.readFileSync("app/licences/page.tsx", "utf8");
for (const needle of ["Google Sans", "The Google Sans Project Authors", "SIL OPEN FONT LICENSE Version 1.1"]) {
  if (!page.includes(needle)) { console.log(`FAIL  app/licences/page.tsx does not contain "${needle}"`); failed = true; }
}
process.exit(failed ? 1 : 0);
