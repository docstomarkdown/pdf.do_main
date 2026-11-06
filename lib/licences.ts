import fs from "node:fs";
import path from "node:path";

// Runs when the site is built (a server component reads it), never in the browser. It lists every package whose code a visitor's
// browser downloads, with its licence and the licence text the package carries, so the licences page is never out of date.
// Keep this list in step with SHIPPED in scripts/check-licenses.mjs, plus the framework itself.
const SHIPPED = ["next", "react", "react-dom", "@cantoo/pdf-lib", "pdfjs-dist", "@neslinesli93/qpdf-wasm", "lucide-react", "sonner", "fflate", "signature_pad", "diff"];

export type Licence = { name: string; version: string; license: string; text: string };

function read(name: string): { version: string; license: string; dependencies: string[]; dir: string } | null {
  const dir = path.join(process.cwd(), "node_modules", name);
  const file = path.join(dir, "package.json");
  if (!fs.existsSync(file)) return null;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  const license = typeof pkg.license === "string" ? pkg.license : pkg.license?.type ?? "See the package";
  return { version: pkg.version, license, dependencies: Object.keys(pkg.dependencies ?? {}), dir };
}

function licenceText(dir: string): string {
  const file = fs.readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
  return file ? fs.readFileSync(path.join(dir, file), "utf8").trim() : "";
}

/** The shipped packages and what they need in turn, sorted by name. The framework's own build tooling is not shipped and is not listed. */
export function shippedLicences(): Licence[] {
  const seen = new Map<string, Licence>();
  const walk = (name: string, top: boolean) => {
    if (seen.has(name)) return;
    const pkg = read(name);
    if (!pkg) return;
    seen.set(name, { name, version: pkg.version, license: pkg.license, text: licenceText(pkg.dir) });
    // Next and React are listed for themselves; their build-time dependencies do not reach the browser.
    if (!top || (name !== "next" && name !== "react-dom")) pkg.dependencies.forEach((d) => walk(d, false));
  };
  SHIPPED.forEach((n) => walk(n, true));
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}
