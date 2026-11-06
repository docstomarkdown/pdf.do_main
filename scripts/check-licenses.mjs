// Licence gate (foundations.md section 6). Walks the dependency closure of the
// packages whose code ships to the browser and fails on copyleft that would
// reach the site (AGPL, GPL, SSPL). Build-time tooling is not checked: it is
// not distributed to visitors.
import fs from "node:fs";
import path from "node:path";

const SHIPPED = ["@cantoo/pdf-lib", "pdfjs-dist", "@neslinesli93/qpdf-wasm"];
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
process.exit(failed ? 1 : 0);
